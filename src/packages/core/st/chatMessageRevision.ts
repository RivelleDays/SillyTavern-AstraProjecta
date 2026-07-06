import { getStContext } from "@/packages/core/st/context";
import {
	type RenderedMessageContent,
	renderMessageContent,
	writeRenderedMessageContent,
} from "@/packages/core/st/chatMessageRendering";
import {
	cleanupDerivedRevisionFields,
	ensureWritableRevisionRoots,
	readRevisionRoots,
} from "@/packages/core/st/chat-message-revisions/storage";
import {
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";
import { createRevisionBaselineTracker } from "@/packages/core/st/chat-message-revisions/baseline";
import {
	clearRevisionGenerationTransaction,
	getRevisionGenerationTransactionForMessage,
	startRevisionGenerationTransaction,
} from "@/packages/core/st/chat-message-revisions/generationTransaction";
import { rebaseRevisionRootToNativeSwipeIndex } from "@/packages/core/st/chat-message-revisions/rootRebase";

type Listener = () => void;

type RevisionKind = "continue" | "edit" | "origin" | "regenerate";

type RevisionNode = Record<string, unknown> & {
	active?: unknown;
	createdAt?: unknown;
	fullText?: unknown;
	kind?: unknown;
	mes?: unknown;
	parent?: unknown;
	swipes?: unknown;
};

type ChatMessageRevisionLike = Record<string, unknown> & {
	_astraContinueCachedText?: unknown;
	astra_projecta?: unknown;
	continueHistory?: unknown;
	continueSwipe?: unknown;
	continueSwipeId?: unknown;
	extra?: unknown;
	is_system?: unknown;
	is_user?: unknown;
	mes?: unknown;
	name?: unknown;
	swipe_id?: unknown;
	swipes?: unknown;
};

type GenerateLike = (type: string) => unknown | Promise<unknown>;

type StContextLike = Record<string, unknown> & {
	chat?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	Generate?: unknown;
	generate?: unknown;
	messageFormatting?: unknown;
	saveChatConditional?: unknown;
	substituteParams?: unknown;
};

export type ChatMessageRevisionStatus = "idle" | "ready";

export interface ChatMessageRevisionSnapshot {
	canContinue: boolean;
	canRegenerate: boolean;
	canUndo: boolean;
	isBusy: boolean;
	messageId: number | null;
	status: ChatMessageRevisionStatus;
	updatedAt: number;
}

export interface ChatMessageRevisionStore {
	continueLastMessage(): Promise<boolean>;
	dispose(): void;
	getSnapshot(): ChatMessageRevisionSnapshot;
	refresh(): void;
	regenerateLastRevision(): Promise<boolean>;
	subscribe(listener: Listener): () => void;
	undoLastRevision(): Promise<boolean>;
}

const REVISION_EVENT_KEYS = [
	"CHAT_CHANGED",
	"CHARACTER_MESSAGE_RENDERED",
	"GENERATION_STARTED",
	"GENERATION_STOPPED",
	"MESSAGE_DELETED",
	"MESSAGE_EDITED",
	"MESSAGE_SWIPE_DELETED",
	"MESSAGE_SWIPED",
	"MESSAGE_UPDATED",
	"USER_MESSAGE_RENDERED",
] as const satisfies readonly (keyof EventTypesLike)[];

const REVISION_KIND = {
	CONTINUE: "continue",
	EDIT: "edit",
	ORIGIN: "origin",
	REGENERATE: "regenerate",
} as const satisfies Record<string, RevisionKind>;

let isListeningForGeneration = false;
let pendingStopListen = false;
let skipNextEditHandling = false;
let startMessageText = "";
const baselineTracker = createRevisionBaselineTracker<ChatMessageRevisionLike>({
	asMessage: asChatMessage,
	isValidMessageText,
	readMessageTextFromDom,
});

function resolveContextSafe(): StContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context) ? (context as StContextLike) : null;
	} catch {
		return null;
	}
}

function createIdleSnapshot(now: () => number): ChatMessageRevisionSnapshot {
	return {
		canContinue: false,
		canRegenerate: false,
		canUndo: false,
		isBusy: false,
		messageId: null,
		status: "idle",
		updatedAt: now(),
	};
}

function asChatMessage(value: unknown): ChatMessageRevisionLike | null {
	return isRecord(value) ? (value as ChatMessageRevisionLike) : null;
}

function asRevisionNode(value: unknown): RevisionNode | null {
	return isRecord(value) ? (value as RevisionNode) : null;
}

function asRevisionList(value: unknown): RevisionNode[] | null {
	if (!Array.isArray(value)) {
		return null;
	}

	return value as RevisionNode[];
}

function asIndex(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: fallback;
}

function asPath(value: unknown): number[] {
	return Array.isArray(value)
		? value.filter(
				(item): item is number =>
					typeof item === "number" &&
					Number.isInteger(item) &&
					item >= 0,
			)
		: [];
}

function isValidMessageText(text: unknown): text is string {
	return (
		typeof text === "string" &&
		text.trim().length > 0 &&
		text.trim() !== "..."
	);
}

function isActionableLastMessage(message: ChatMessageRevisionLike | null) {
	if (!message || message.is_user === true) {
		return false;
	}

	const extra = isRecord(message.extra) ? message.extra : null;
	return extra?.isSmallSys !== true && extra?.swipeable !== false;
}

function getGenerate(context: StContextLike | null): GenerateLike | null {
	if (typeof context?.Generate === "function") {
		return context.Generate as GenerateLike;
	}

	if (typeof context?.generate === "function") {
		return context.generate as GenerateLike;
	}

	const globalGenerate = (
		globalThis as typeof globalThis & {
			Generate?: unknown;
		}
	).Generate;

	return typeof globalGenerate === "function"
		? (globalGenerate as GenerateLike)
		: null;
}

function isGenerationBusy(): boolean {
	const stopButton = document.querySelector(".mes_stop");
	if (!(stopButton instanceof HTMLElement)) {
		return false;
	}

	return stopButton.offsetHeight !== 0 || stopButton.offsetWidth !== 0;
}

function markRevisionMetadata(
	revision: RevisionNode | null,
	kind: RevisionKind,
): void {
	if (!revision) {
		return;
	}

	if (!revision.kind) {
		revision.kind = kind;
	}

	if (typeof revision.createdAt !== "number") {
		revision.createdAt = Date.now();
	}
}

function ensureRevisionShape(
	revision: RevisionNode,
	kind: RevisionKind,
): RevisionNode {
	if (!Array.isArray(revision.swipes)) {
		revision.swipes = [];
	}

	if (!Array.isArray(revision.parent)) {
		revision.parent = [];
	}

	markRevisionMetadata(revision, kind);
	return revision;
}

function cacheMessageText(message: ChatMessageRevisionLike | null): void {
	cleanupDerivedRevisionFields(message);
}

function readMessageTextFromDom(messageId: number): string {
	const target = document.querySelector(
		`#chat .mes[mesid="${messageId}"] .mes_text`,
	);

	return target?.textContent ?? "";
}

function getEffectiveMessageText(
	message: ChatMessageRevisionLike | null,
	messageId: number,
): string {
	if (isValidMessageText(message?.mes)) {
		return message.mes;
	}

	const domText = readMessageTextFromDom(messageId);
	if (isValidMessageText(domText)) {
		if (message) {
			message.mes = domText;
		}
		return domText;
	}

	return "";
}

function createOriginRevision(text: string): RevisionNode {
	return {
		active: null,
		createdAt: Date.now(),
		fullText: text,
		kind: REVISION_KIND.ORIGIN,
		mes: text,
		parent: [],
		swipes: [],
	};
}

function resolveRootText(
	message: ChatMessageRevisionLike,
	rootIndex: number,
	messageId: number,
): string {
	if (
		Array.isArray(message.swipes) &&
		isValidMessageText(message.swipes[rootIndex])
	) {
		return message.swipes[rootIndex];
	}

	return getEffectiveMessageText(message, messageId);
}

function readHistoryRoots(
	message: ChatMessageRevisionLike | null,
): RevisionNode[] | null {
	return asRevisionList(readRevisionRoots(message));
}

function createInitialRevisionRoots(
	message: ChatMessageRevisionLike,
	messageId: number,
	rootIndex: number,
): RevisionNode[] {
	const firstObservedTexts = baselineTracker.readFirstObservedMessageTexts(
		message,
		messageId,
	);
	const sourceSwipes =
		Array.isArray(message.swipes) && message.swipes.length > 0
			? message.swipes
			: [getEffectiveMessageText(message, messageId)];
	const rootTotal = Math.max(
		sourceSwipes.length,
		firstObservedTexts.length,
		1,
	);

	return Array.from({ length: rootTotal }, (_, index) => {
		const firstObservedText = firstObservedTexts[index];
		const currentText = sourceSwipes[index];
		return createOriginRevision(
			isValidMessageText(firstObservedText)
				? firstObservedText
				: isValidMessageText(currentText)
					? currentText
					: index === rootIndex
						? getEffectiveMessageText(message, messageId)
						: "",
		);
	});
}

function ensureWritableHistoryRoots(
	message: ChatMessageRevisionLike,
	messageId: number,
): RevisionNode[] {
	const rootIndex = asIndex(message.swipe_id);
	return ensureWritableRevisionRoots(message, () =>
		createInitialRevisionRoots(message, messageId, rootIndex),
	) as RevisionNode[];
}

function ensureContinueData(
	message: ChatMessageRevisionLike | null,
	messageId: number,
): void {
	if (!message) {
		return;
	}

	const rootIndex = asIndex(message.swipe_id);
	const history = ensureWritableHistoryRoots(message, messageId);

	if (!history[rootIndex]) {
		history[rootIndex] = createOriginRevision(
			resolveRootText(message, rootIndex, messageId),
		);
	}

	const rootRevision = ensureRevisionShape(
		history[rootIndex],
		REVISION_KIND.ORIGIN,
	);
	const rootText = resolveRootText(message, rootIndex, messageId);
	if (!isValidMessageText(rootRevision.mes) && isValidMessageText(rootText)) {
		rootRevision.mes = rootText;
	}
	if (
		!isValidMessageText(rootRevision.fullText) &&
		isValidMessageText(rootText)
	) {
		rootRevision.fullText = rootText;
	}

	const activePath = asPath(rootRevision.active);
	rootRevision.active =
		activePath.length > 0 && activePath[0] === rootIndex
			? activePath
			: [rootIndex];

	let swipes: RevisionNode[] | null = history;
	let targetRevision: RevisionNode | null = null;
	const validPath: number[] = [];

	for (const index of asPath(rootRevision.active)) {
		const candidate = asRevisionNode(swipes?.[index]);
		if (!candidate) {
			break;
		}

		ensureRevisionShape(
			candidate,
			validPath.length === 0
				? REVISION_KIND.ORIGIN
				: REVISION_KIND.CONTINUE,
		);
		targetRevision = candidate;
		validPath.push(index);
		swipes = asRevisionList(candidate.swipes);
	}

	if (!targetRevision) {
		targetRevision = rootRevision;
		validPath.push(rootIndex);
	}

	rootRevision.active = validPath;

	cacheMessageText(message);
}

function hydrateContinueState(
	message: ChatMessageRevisionLike | null,
	messageId: number,
): void {
	ensureContinueData(message, messageId);
}

function findRevisionByPath(
	message: ChatMessageRevisionLike | null,
	path: number[],
): RevisionNode | null {
	const history = readHistoryRoots(message);
	if (!history || path.length === 0) {
		return null;
	}

	let swipes: RevisionNode[] | null = history;
	let revision: RevisionNode | null = null;

	for (const index of path) {
		revision = asRevisionNode(swipes?.[index]);
		if (!revision) {
			return null;
		}
		swipes = asRevisionList(revision.swipes);
	}

	return revision;
}

function getTextForPath(
	message: ChatMessageRevisionLike,
	path: number[],
): string {
	const history = readHistoryRoots(message);
	if (!history || path.length === 0) {
		return "";
	}

	let swipes: RevisionNode[] | null = history;
	let text = "";

	for (const index of path) {
		const revision = asRevisionNode(swipes?.[index]);
		if (!revision) {
			break;
		}

		text += typeof revision.mes === "string" ? revision.mes : "";
		swipes = asRevisionList(revision.swipes);
	}

	return text;
}

function getTextForPathWithFull(
	message: ChatMessageRevisionLike,
	path: number[],
): string {
	const revision = findRevisionByPath(message, path);
	return typeof revision?.fullText === "string"
		? revision.fullText
		: getTextForPath(message, path);
}

function syncActiveSwipeText(
	message: ChatMessageRevisionLike,
	rootIndex: number,
	text: string,
): void {
	if (
		Array.isArray(message.swipes) &&
		rootIndex >= 0 &&
		rootIndex < message.swipes.length
	) {
		message.swipes[rootIndex] = text;
	}
}

function isRootReplacementRevision(
	revision: RevisionNode | null,
	rootIndex: number,
): boolean {
	if (!revision) {
		return false;
	}

	const parentPath = asPath(revision.parent);
	if (parentPath.length !== 1 || parentPath[0] !== rootIndex) {
		return false;
	}

	const kind = revision.kind;
	if (kind !== REVISION_KIND.REGENERATE && kind !== REVISION_KIND.EDIT) {
		return false;
	}

	return (
		typeof revision.fullText === "string" &&
		typeof revision.mes === "string" &&
		revision.fullText === revision.mes
	);
}

function pathStartsWithRootReplacement(
	message: ChatMessageRevisionLike,
	path: number[],
	rootIndex: number,
): boolean {
	if (path.length < 2 || path[0] !== rootIndex) {
		return false;
	}

	return isRootReplacementRevision(
		findRevisionByPath(message, [rootIndex, path[1]]),
		rootIndex,
	);
}

function substituteMessageText(
	raw: string,
	context: StContextLike | null,
): string {
	const substitute =
		typeof context?.substituteParams === "function"
			? (context.substituteParams as (value: string) => string)
			: (value: string) => value;

	return substitute(raw);
}

function renderRevisionMessageContent(
	raw: string,
	message: ChatMessageRevisionLike,
	context: StContextLike | null,
	messageId: number,
): RenderedMessageContent {
	return renderMessageContent({
		context,
		message,
		messageId,
		text: substituteMessageText(raw, context),
	});
}

function updateMessageDom(
	messageId: number,
	content: RenderedMessageContent,
	documentRef = document,
): void {
	const target = documentRef.querySelector(
		`#chat .mes[mesid="${messageId}"] .mes_text`,
	);
	if (target) {
		writeRenderedMessageContent(target, content);
	}
}

function saveChat(context: StContextLike | null): void {
	if (typeof context?.saveChatConditional === "function") {
		context.saveChatConditional();
	}
}

function emitMessageEdited(
	context: StContextLike | null,
	messageId: number,
): void {
	const eventTypes = context ? resolveEventTypes(context) : {};
	const eventName = eventTypes.MESSAGE_EDITED;

	if (!eventName) {
		return;
	}

	skipNextEditHandling = true;
	void context?.eventSource?.emit?.(eventName, messageId);
}

function emitMessageSwiped(
	context: StContextLike | null,
	messageId: number,
): void {
	const eventTypes = context ? resolveEventTypes(context) : {};
	const eventName = eventTypes.MESSAGE_SWIPED;

	if (!eventName) {
		return;
	}

	void context?.eventSource?.emit?.(eventName, messageId);
}

function resolveMessageTarget(
	context: StContextLike | null,
	messageId?: number,
): {
	chat: unknown[];
	message: ChatMessageRevisionLike | null;
	messageId: number | null;
} {
	const chat = Array.isArray(context?.chat) ? context.chat : [];

	if (
		typeof messageId === "number" &&
		Number.isInteger(messageId) &&
		messageId >= 0 &&
		messageId < chat.length
	) {
		return {
			chat,
			message: asChatMessage(chat[messageId]),
			messageId,
		};
	}

	if (!chat.length) {
		return { chat, message: null, messageId: null };
	}

	const lastMessageId = chat.length - 1;
	return {
		chat,
		message: asChatMessage(chat[lastMessageId]),
		messageId: lastMessageId,
	};
}

function applyPathToMessage(
	context: StContextLike | null,
	messageId: number,
	path: number[],
	options: { rootMode?: "native" | "revision" } = {},
): boolean {
	if (isGenerationBusy()) {
		return false;
	}

	const { message } = resolveMessageTarget(context, messageId);
	if (!message || path.length === 0) {
		return false;
	}

	hydrateContinueState(message, messageId);

	const rootIndex = path[0];
	const history = readHistoryRoots(message);
	if (!history) {
		return false;
	}

	const rootRevision = asRevisionNode(history[rootIndex]);
	if (!rootRevision) {
		return false;
	}

	if (path.length === 1 && options.rootMode !== "revision") {
		const storedRootText =
			typeof rootRevision.fullText === "string"
				? rootRevision.fullText
				: typeof rootRevision.mes === "string"
					? rootRevision.mes
					: "";
		const nativeSwipeText =
			Array.isArray(message.swipes) &&
			isValidMessageText(message.swipes[rootIndex])
				? message.swipes[rootIndex]
				: "";
		const text =
			(isValidMessageText(storedRootText) ? storedRootText : "") ||
			nativeSwipeText ||
			(typeof rootRevision.fullText === "string"
				? rootRevision.fullText
				: getTextForPathWithFull(message, path));

		if (!isValidMessageText(text)) {
			return false;
		}

		message.swipe_id = rootIndex;
		message.mes = text;
		syncActiveSwipeText(message, rootIndex, text);
		rootRevision.active = [rootIndex];
		rootRevision.fullText =
			typeof rootRevision.fullText === "string"
				? rootRevision.fullText
				: text;
		rootRevision.mes =
			typeof rootRevision.mes === "string" ? rootRevision.mes : text;
		markRevisionMetadata(rootRevision, REVISION_KIND.ORIGIN);

		updateMessageDom(
			messageId,
			renderRevisionMessageContent(text, message, context, messageId),
		);
		saveChat(context);
		emitMessageSwiped(context, messageId);
		emitMessageEdited(context, messageId);
		cacheMessageText(message);
		return true;
	}

	const targetRevision = findRevisionByPath(message, path);
	if (!targetRevision) {
		return false;
	}

	const text = getTextForPathWithFull(message, path);

	message.mes = text;
	message.swipe_id = rootIndex;

	if (history?.[rootIndex]) {
		history[rootIndex].active = [...path];
	}
	syncActiveSwipeText(message, rootIndex, text);

	targetRevision.fullText = text;
	markRevisionMetadata(
		targetRevision,
		(targetRevision.kind as RevisionKind | undefined) ??
			REVISION_KIND.CONTINUE,
	);

	updateMessageDom(
		messageId,
		renderRevisionMessageContent(text, message, context, messageId),
	);
	saveChat(context);
	emitMessageEdited(context, messageId);
	cacheMessageText(message);
	return true;
}

async function triggerGenerate(
	context: StContextLike | null,
	type: "continue" | "swipe",
): Promise<boolean> {
	const generate = getGenerate(context);
	if (!generate) {
		return false;
	}

	await generate(type);
	return true;
}

async function regenerateLastRevisionNative(
	messageId?: number,
): Promise<boolean> {
	const context = resolveContextSafe();
	if (isGenerationBusy()) {
		return false;
	}

	const { message, messageId: resolvedMessageId } = resolveMessageTarget(
		context,
		messageId,
	);
	if (
		!message ||
		resolvedMessageId === null ||
		!isActionableLastMessage(message)
	) {
		return false;
	}

	hydrateContinueState(message, resolvedMessageId);

	const rootIndex = asIndex(message.swipe_id);
	const history = readHistoryRoots(message);
	const activePath = asPath(history?.[rootIndex]?.active);
	const normalizedPath =
		activePath.length > 0 && activePath[0] === rootIndex
			? activePath
			: [rootIndex];
	const activeRevision = findRevisionByPath(message, normalizedPath);
	const isActiveRootReplacement =
		normalizedPath.length === 2 &&
		isRootReplacementRevision(activeRevision, rootIndex);

	if (normalizedPath.length <= 1 || isActiveRootReplacement) {
		const rootText =
			getTextForPathWithFull(message, [rootIndex]) ||
			getEffectiveMessageText(message, resolvedMessageId);
		const rootRevision = history?.[rootIndex];
		const previousChildCount =
			asRevisionList(rootRevision?.swipes)?.length ?? 0;

		if (rootRevision) {
			rootRevision.mes = rootText;
			rootRevision.fullText = rootText;
			rootRevision.active = [rootIndex];
			markRevisionMetadata(rootRevision, REVISION_KIND.ORIGIN);
		}

		message.mes = rootText;
		updateMessageDom(
			resolvedMessageId,
			renderRevisionMessageContent(
				`${rootText} ...`,
				message,
				context,
				resolvedMessageId,
			),
		);
		cacheMessageText(message);
		startRevisionGenerationTransaction({
			messageId: resolvedMessageId,
			mode: "root",
			parentPath: [rootIndex],
			previousChildCount,
			rootIndex,
			startText: "",
		});
		const didGenerate = await triggerGenerate(context, "swipe");
		if (!didGenerate) {
			clearRevisionGenerationTransaction();
		}
		if (didGenerate) {
			const didFinalize = finalizeRootRegenerate({
				context,
				message,
				messageId: resolvedMessageId,
				previousChildCount,
				rootIndex,
				rootText,
			});
			if (didFinalize) {
				clearRevisionGenerationTransaction();
			}
		}
		return didGenerate;
	}

	const targetPath = normalizedPath.slice(0, -1);
	const targetRevision =
		findRevisionByPath(message, targetPath) ?? history?.[rootIndex] ?? null;
	const text = getTextForPathWithFull(message, targetPath);

	message.mes = text;

	if (history?.[rootIndex]) {
		history[rootIndex].active = [...targetPath];
	}

	if (targetRevision) {
		targetRevision.fullText = text;
		markRevisionMetadata(
			targetRevision,
			(targetRevision.kind as RevisionKind | undefined) ??
				REVISION_KIND.CONTINUE,
		);
	}

	updateMessageDom(
		resolvedMessageId,
		renderRevisionMessageContent(
			`${text} ...`,
			message,
			context,
			resolvedMessageId,
		),
	);
	cacheMessageText(message);
	startRevisionGenerationTransaction({
		messageId: resolvedMessageId,
		mode: "child",
		parentPath: targetPath,
		previousChildCount: asRevisionList(targetRevision?.swipes)?.length ?? 0,
		rootIndex,
		startText: text,
	});
	const didGenerate = await triggerGenerate(context, "continue");
	if (!didGenerate) {
		clearRevisionGenerationTransaction();
	}
	return didGenerate;
}

async function undoLastRevisionNative(messageId?: number): Promise<boolean> {
	const context = resolveContextSafe();
	if (isGenerationBusy()) {
		return false;
	}

	const { message, messageId: resolvedMessageId } = resolveMessageTarget(
		context,
		messageId,
	);
	if (
		!message ||
		resolvedMessageId === null ||
		!isActionableLastMessage(message)
	) {
		return false;
	}

	hydrateContinueState(message, resolvedMessageId);

	const rootIndex = asIndex(message.swipe_id);
	const history = readHistoryRoots(message);
	const activePath = asPath(history?.[rootIndex]?.active);
	const normalizedPath =
		activePath.length > 0 && activePath[0] === rootIndex
			? activePath
			: [rootIndex];
	if (normalizedPath.length <= 1) {
		return false;
	}

	return applyPathToMessage(
		context,
		resolvedMessageId,
		normalizedPath.slice(0, -1),
		{ rootMode: "revision" },
	);
}

async function continueLastMessageNative(messageId?: number): Promise<boolean> {
	const context = resolveContextSafe();
	if (isGenerationBusy()) {
		return false;
	}

	const { message, messageId: resolvedMessageId } = resolveMessageTarget(
		context,
		messageId,
	);
	if (
		!message ||
		resolvedMessageId === null ||
		!isActionableLastMessage(message)
	) {
		return false;
	}

	return triggerGenerate(context, "continue");
}

function handleGenerationStarted(
	type: unknown,
	_namedArgs: unknown,
	dryRun: unknown,
): void {
	if (
		dryRun === true ||
		(type !== "continue" && type !== "normal" && type !== "swipe")
	) {
		return;
	}

	const context = resolveContextSafe();
	const { chat, message, messageId } = resolveMessageTarget(context);
	if (!chat.length || !message || messageId === null) {
		return;
	}

	baselineTracker.seedMessageBaseline(message, messageId);
	hydrateContinueState(message, messageId);
	if (type === "continue") {
		isListeningForGeneration = true;
		startMessageText = getEffectiveMessageText(message, messageId);
	} else if (type === "swipe") {
		isListeningForGeneration = true;
		startMessageText = "";
	}
	pendingStopListen = false;
}

function handleGenerationStopped(): void {
	pendingStopListen = isListeningForGeneration;
	isListeningForGeneration = false;
}

function pushRevisionChild(
	message: ChatMessageRevisionLike,
	parentPath: number[],
	revision: RevisionNode,
): boolean {
	const history = readHistoryRoots(message);
	if (!history) {
		return false;
	}

	let targetList: RevisionNode[] | null = history;
	for (const index of parentPath) {
		const parentRevision = asRevisionNode(targetList?.[index]);
		if (!parentRevision) {
			return false;
		}
		ensureRevisionShape(parentRevision, REVISION_KIND.CONTINUE);
		targetList = asRevisionList(parentRevision.swipes);
	}

	if (!targetList) {
		return false;
	}

	targetList.push(revision);

	const rootIndex = parentPath[0] ?? asIndex(message.swipe_id);
	if (history[rootIndex]) {
		history[rootIndex].active = [...parentPath, targetList.length - 1];
	}

	cleanupDerivedRevisionFields(message);
	return true;
}

function finalizeRootRegenerate({
	context,
	message,
	messageId,
	previousChildCount,
	rootIndex,
	rootText,
}: {
	context: StContextLike | null;
	message: ChatMessageRevisionLike;
	messageId: number;
	previousChildCount: number;
	rootIndex: number;
	rootText: string;
}): boolean {
	const effectiveText = getEffectiveMessageText(message, messageId);
	if (!isValidMessageText(effectiveText) || effectiveText === rootText) {
		return false;
	}

	const rootRevision = asRevisionNode(readHistoryRoots(message)?.[rootIndex]);
	const childRevisions = asRevisionList(rootRevision?.swipes);
	if (!rootRevision || !childRevisions) {
		return false;
	}

	for (
		let index = previousChildCount;
		index < childRevisions.length;
		index += 1
	) {
		const childRevision = asRevisionNode(childRevisions[index]);
		if (
			childRevision?.kind === REVISION_KIND.REGENERATE &&
			childRevision.fullText === effectiveText
		) {
			rootRevision.active = [rootIndex, index];
			message.mes = effectiveText;
			syncActiveSwipeText(message, rootIndex, effectiveText);
			cacheMessageText(message);
			return true;
		}
	}

	const revision: RevisionNode = {
		createdAt: Date.now(),
		fullText: effectiveText,
		kind: REVISION_KIND.REGENERATE,
		mes: effectiveText,
		parent: [rootIndex],
		swipes: [],
	};

	pushRevisionChild(message, [rootIndex], revision);
	message.mes = effectiveText;
	syncActiveSwipeText(message, rootIndex, effectiveText);
	cacheMessageText(message);
	saveChat(context);
	return true;
}

function handleMessageRendered(messageId: unknown): void {
	const resolvedMessageId =
		typeof messageId === "number" && Number.isInteger(messageId)
			? messageId
			: undefined;
	const context = resolveContextSafe();
	const { message, messageId: targetMessageId } = resolveMessageTarget(
		context,
		resolvedMessageId,
	);
	if (!message || targetMessageId === null) {
		return;
	}

	baselineTracker.seedMessageBaseline(message, targetMessageId);
	hydrateContinueState(message, targetMessageId);

	const effectiveText = getEffectiveMessageText(message, targetMessageId);
	if (isValidMessageText(effectiveText)) {
		message.mes = effectiveText;
	}

	const listening = isListeningForGeneration || pendingStopListen;
	if (listening) {
		const generationTransaction =
			getRevisionGenerationTransactionForMessage(targetMessageId);
		const expectedStartText =
			generationTransaction?.mode === "child"
				? generationTransaction.startText
				: startMessageText;
		if (
			effectiveText === expectedStartText ||
			!isValidMessageText(effectiveText)
		) {
			return;
		}

		isListeningForGeneration = false;
		pendingStopListen = false;

		if (expectedStartText === "") {
			const rootIndex =
				generationTransaction?.mode === "root"
					? generationTransaction.rootIndex
					: asIndex(message.swipe_id);
			const rootRevision = readHistoryRoots(message)?.[rootIndex];
			if (rootRevision && generationTransaction?.mode === "root") {
				const childRevisions = asRevisionList(rootRevision.swipes);
				const existingIndex = childRevisions?.findIndex(
					(revision, index) =>
						index >= generationTransaction.previousChildCount &&
						revision.kind === REVISION_KIND.REGENERATE &&
						revision.fullText === effectiveText,
				);
				if (typeof existingIndex === "number" && existingIndex >= 0) {
					rootRevision.active = [rootIndex, existingIndex];
				} else {
					const revision: RevisionNode = {
						createdAt: Date.now(),
						fullText: effectiveText,
						kind: REVISION_KIND.REGENERATE,
						mes: effectiveText,
						parent: [rootIndex],
						swipes: [],
					};
					pushRevisionChild(message, [rootIndex], revision);
				}
				syncActiveSwipeText(message, rootIndex, effectiveText);
				clearRevisionGenerationTransaction();
			} else if (rootRevision) {
				rootRevision.mes = effectiveText;
				rootRevision.fullText = effectiveText;
				markRevisionMetadata(rootRevision, REVISION_KIND.CONTINUE);
				syncActiveSwipeText(message, rootIndex, effectiveText);
			}
		} else {
			const delta = effectiveText.startsWith(expectedStartText)
				? effectiveText.slice(expectedStartText.length)
				: effectiveText;
			const rootIndex = asIndex(message.swipe_id);
			const rootRevision = readHistoryRoots(message)?.[rootIndex];
			const activePath = asPath(rootRevision?.active);
			const parentPath =
				generationTransaction?.mode === "child"
					? generationTransaction.parentPath
					: activePath.length > 0 && activePath[0] === rootIndex
						? activePath
						: [rootIndex];
			const revision: RevisionNode = {
				createdAt: Date.now(),
				fullText: effectiveText,
				kind:
					generationTransaction?.mode === "child"
						? REVISION_KIND.REGENERATE
						: REVISION_KIND.CONTINUE,
				mes: delta,
				parent: parentPath,
				swipes: [],
			};

			pushRevisionChild(message, parentPath, revision);
			syncActiveSwipeText(
				message,
				parentPath[0] ?? asIndex(message.swipe_id),
				effectiveText,
			);
			if (generationTransaction?.mode === "child") {
				clearRevisionGenerationTransaction();
			}
		}
	}

	const rootIndex = asIndex(message.swipe_id);
	const history = readHistoryRoots(message);
	const rootRevision = history?.[rootIndex];
	const activePath = asPath(rootRevision?.active);
	const normalizedPath =
		activePath.length > 0 && activePath[0] === rootIndex
			? activePath
			: [rootIndex];
	const currentText = getTextForPath(message, normalizedPath);

	if (
		isValidMessageText(message.mes) &&
		message.mes.length > currentText.length
	) {
		const delta = message.mes.slice(currentText.length);
		if (delta) {
			const revision: RevisionNode = {
				createdAt: Date.now(),
				fullText: message.mes,
				kind: REVISION_KIND.CONTINUE,
				mes: delta,
				parent: normalizedPath,
				swipes: [],
			};
			pushRevisionChild(message, normalizedPath, revision);
		}
	}

	const updatedPath = asPath(rootRevision?.active);
	const activeRevision = findRevisionByPath(message, updatedPath);
	if (activeRevision) {
		const activeFullText = getTextForPathWithFull(message, updatedPath);
		if (!isValidMessageText(activeRevision.fullText)) {
			activeRevision.fullText = activeFullText;
		}
		markRevisionMetadata(
			activeRevision,
			(activeRevision.kind as RevisionKind | undefined) ??
				REVISION_KIND.CONTINUE,
		);
		if (isValidMessageText(activeFullText)) {
			syncActiveSwipeText(message, rootIndex, activeFullText);
		}
	}

	cacheMessageText(message);
	saveChat(context);
}

function handleMessageEdited(messageId: unknown): void {
	const resolvedMessageId =
		typeof messageId === "number" && Number.isInteger(messageId)
			? messageId
			: undefined;
	const context = resolveContextSafe();
	const { message, messageId: targetMessageId } = resolveMessageTarget(
		context,
		resolvedMessageId,
	);
	if (!message || targetMessageId === null) {
		return;
	}

	if (skipNextEditHandling) {
		skipNextEditHandling = false;
		cacheMessageText(message);
		return;
	}

	baselineTracker.seedMessageBaseline(message, targetMessageId);
	hydrateContinueState(message, targetMessageId);

	const history = readHistoryRoots(message);
	const rootIndex = asIndex(message.swipe_id);
	const activePath = asPath(history?.[rootIndex]?.active);
	const normalizedPath =
		activePath.length > 0 && activePath[0] === rootIndex
			? activePath
			: [rootIndex];

	if (
		pathStartsWithRootReplacement(message, normalizedPath, rootIndex) &&
		isValidMessageText(message.mes)
	) {
		const activeFullText = getTextForPathWithFull(message, normalizedPath);
		if (
			isValidMessageText(activeFullText) &&
			message.mes !== activeFullText
		) {
			const newRevision: RevisionNode = {
				createdAt: Date.now(),
				fullText: message.mes,
				kind: REVISION_KIND.EDIT,
				mes: message.mes.startsWith(activeFullText)
					? message.mes.slice(activeFullText.length)
					: message.mes,
				parent: normalizedPath,
				swipes: [],
			};
			pushRevisionChild(message, normalizedPath, newRevision);
			if (history?.[rootIndex]) {
				markRevisionMetadata(history[rootIndex], REVISION_KIND.ORIGIN);
			}
			syncActiveSwipeText(message, rootIndex, message.mes);
			cacheMessageText(message);
			saveChat(context);
			return;
		}
	}

	let swipes: RevisionNode[] | null = history;
	let text = "";
	const nextActivePath: number[] = [];

	for (const index of normalizedPath) {
		const revision = asRevisionNode(swipes?.[index]);
		if (!revision || !swipes) {
			break;
		}

		const nextText = `${text}${typeof revision.mes === "string" ? revision.mes : ""}`;
		if (
			isValidMessageText(message.mes) &&
			!message.mes.startsWith(nextText) &&
			!(asPath(revision.parent).length === 0 && nextText === "")
		) {
			const newRevision: RevisionNode = {
				createdAt: Date.now(),
				fullText: message.mes,
				kind: REVISION_KIND.EDIT,
				mes: message.mes.slice(text.length),
				parent: [...asPath(revision.parent)],
				swipes: [],
			};

			const parentPath = asPath(newRevision.parent);
			if (parentPath.length === 0) {
				newRevision.parent = [rootIndex];
				const childList = asRevisionList(revision.swipes);
				childList?.push(newRevision);
				const newIndex = (childList?.length ?? 1) - 1;
				if (history?.[rootIndex]) {
					history[rootIndex].active = [rootIndex, newIndex];
				}
			} else {
				const newIndex = swipes.length;
				swipes.push(newRevision);
				nextActivePath.push(newIndex);
				if (history?.[rootIndex]) {
					history[rootIndex].active = [...nextActivePath];
				}
			}
			text = message.mes;
			break;
		}

		nextActivePath.push(index);
		swipes = asRevisionList(revision.swipes);
		text = nextText;
	}

	if (isValidMessageText(message.mes) && text.length < message.mes.length) {
		const updatedParentPath = asPath(history?.[rootIndex]?.active);
		const parentPath =
			updatedParentPath.length > 0 && updatedParentPath[0] === rootIndex
				? updatedParentPath
				: normalizedPath;
		const newRevision: RevisionNode = {
			createdAt: Date.now(),
			fullText: message.mes,
			kind: REVISION_KIND.EDIT,
			mes: message.mes.slice(text.length),
			parent: parentPath,
			swipes: [],
		};
		pushRevisionChild(message, parentPath, newRevision);
	}

	const updatedPath = asPath(history?.[rootIndex]?.active);
	const activeRevision = findRevisionByPath(message, updatedPath);
	if (activeRevision && isValidMessageText(message.mes)) {
		activeRevision.fullText = message.mes;
		markRevisionMetadata(activeRevision, REVISION_KIND.EDIT);
	}
	if (history?.[rootIndex]) {
		markRevisionMetadata(history[rootIndex], REVISION_KIND.ORIGIN);
	}

	cacheMessageText(message);
	saveChat(context);
}

function handleSwipe(messageId: unknown): void {
	const resolvedMessageId =
		typeof messageId === "number" && Number.isInteger(messageId)
			? messageId
			: undefined;
	const context = resolveContextSafe();
	const { message, messageId: targetMessageId } = resolveMessageTarget(
		context,
		resolvedMessageId,
	);
	if (!message || targetMessageId === null) {
		return;
	}

	cleanupDerivedRevisionFields(message);
}

function handleChatChanged(): void {
	isListeningForGeneration = false;
	pendingStopListen = false;
	clearRevisionGenerationTransaction();
	startMessageText = "";
}

function handleSwipeDeleted(...args: unknown[]): void {
	const messageId = args.find(
		(value): value is number =>
			typeof value === "number" && Number.isInteger(value) && value >= 0,
	);
	const deletedSwipeIndex =
		typeof args[1] === "number" && Number.isInteger(args[1]) && args[1] >= 0
			? args[1]
			: null;

	if (messageId === undefined || deletedSwipeIndex === null) {
		return;
	}

	const context = resolveContextSafe();
	const { message, messageId: resolvedMessageId } = resolveMessageTarget(
		context,
		messageId,
	);
	if (!message || resolvedMessageId === null) {
		return;
	}

	if (!readHistoryRoots(message)) {
		cleanupDerivedRevisionFields(message);
		return;
	}

	const history = ensureWritableHistoryRoots(message, resolvedMessageId);
	if (deletedSwipeIndex >= history.length) {
		cleanupDerivedRevisionFields(message);
		return;
	}

	history.splice(deletedSwipeIndex, 1);
	history.forEach((rootRevision, rootIndex) => {
		rebaseRevisionRootToNativeSwipeIndex(rootRevision, rootIndex);
	});
	cleanupDerivedRevisionFields(message);
}

function handleRevisionEvent(
	key: (typeof REVISION_EVENT_KEYS)[number],
	...args: unknown[]
): void {
	switch (key) {
		case "CHAT_CHANGED":
			handleChatChanged();
			break;
		case "CHARACTER_MESSAGE_RENDERED":
		case "USER_MESSAGE_RENDERED":
			handleMessageRendered(args[0]);
			break;
		case "GENERATION_STARTED":
			handleGenerationStarted(args[0], args[1], args[2]);
			break;
		case "GENERATION_STOPPED":
			handleGenerationStopped();
			break;
		case "MESSAGE_EDITED":
			handleMessageEdited(args[0]);
			break;
		case "MESSAGE_SWIPE_DELETED":
			handleSwipeDeleted(...args);
			break;
		case "MESSAGE_SWIPED":
			handleSwipe(args[0]);
			break;
		case "MESSAGE_DELETED":
		case "MESSAGE_UPDATED":
			break;
	}
}

function areSnapshotsEqual(
	previous: ChatMessageRevisionSnapshot,
	next: ChatMessageRevisionSnapshot,
): boolean {
	return (
		previous.canContinue === next.canContinue &&
		previous.canRegenerate === next.canRegenerate &&
		previous.canUndo === next.canUndo &&
		previous.isBusy === next.isBusy &&
		previous.messageId === next.messageId &&
		previous.status === next.status
	);
}

export function readChatMessageRevisionSnapshot({
	context = resolveContextSafe(),
	now = () => 0,
}: {
	context?: StContextLike | null;
	now?: () => number;
} = {}): ChatMessageRevisionSnapshot {
	const chat = Array.isArray(context?.chat) ? context.chat : [];
	baselineTracker.seedChatBaselines(chat);
	if (!chat.length) {
		return createIdleSnapshot(now);
	}

	const messageId = chat.length - 1;
	const message = asChatMessage(chat[messageId]);
	if (!isActionableLastMessage(message)) {
		return createIdleSnapshot(now);
	}

	const busy = isGenerationBusy();
	const generate = getGenerate(context);
	const rootIndex = asIndex(message?.swipe_id);
	const rootRevision = readHistoryRoots(message)?.[rootIndex];
	const activePath = asPath(rootRevision?.active);
	const childRevisions = asRevisionList(rootRevision?.swipes);
	const hasHistory = activePath.length > 1 || Boolean(childRevisions?.length);

	return {
		canContinue: Boolean(generate),
		canRegenerate: Boolean(generate),
		canUndo: hasHistory,
		isBusy: busy,
		messageId,
		status: "ready",
		updatedAt: now(),
	};
}

export function undoLastRevision(): Promise<boolean> {
	return undoLastRevisionNative();
}

export function regenerateLastRevision(): Promise<boolean> {
	return regenerateLastRevisionNative();
}

export function continueLastMessage(): Promise<boolean> {
	return continueLastMessageNative();
}

export function applyChatMessageRevisionPath({
	messageId,
	path,
}: {
	messageId: number;
	path: number[];
}): boolean {
	return applyPathToMessage(resolveContextSafe(), messageId, path);
}

export function createChatMessageRevisionStore({
	now = Date.now,
}: {
	now?: () => number;
} = {}): ChatMessageRevisionStore {
	const listeners = new Set<Listener>();
	const context = resolveContextSafe();
	const eventSource = context?.eventSource ?? null;
	const eventTypes = context ? resolveEventTypes(context) : {};
	let disposed = false;
	let snapshot = readChatMessageRevisionSnapshot({ context, now });

	const emit = () => {
		for (const listener of listeners) {
			listener();
		}
	};

	const refresh = () => {
		if (disposed) {
			return;
		}

		const nextSnapshot = readChatMessageRevisionSnapshot({ now });
		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			snapshot = nextSnapshot;
			return;
		}

		snapshot = nextSnapshot;
		emit();
	};

	const attachedEvents: Array<{
		eventName: string;
		listener: (...args: unknown[]) => void;
	}> = [];

	if (
		eventSource &&
		typeof eventSource.on === "function" &&
		typeof eventSource.removeListener === "function"
	) {
		for (const key of REVISION_EVENT_KEYS) {
			const eventName = eventTypes[key];
			if (eventName) {
				const listener = (...args: unknown[]) => {
					handleRevisionEvent(key, ...args);
					refresh();
				};
				eventSource.on(eventName, listener);
				attachedEvents.push({ eventName, listener });
			}
		}
	}

	const actionAndRefresh = async (
		action: () => Promise<boolean>,
	): Promise<boolean> => {
		try {
			return await action();
		} finally {
			refresh();
		}
	};

	return {
		continueLastMessage() {
			return actionAndRefresh(continueLastMessageNative);
		},
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			listeners.clear();
			isListeningForGeneration = false;
			pendingStopListen = false;
			clearRevisionGenerationTransaction();
			skipNextEditHandling = false;
			startMessageText = "";

			if (!eventSource) {
				return;
			}

			for (const { eventName, listener } of attachedEvents) {
				eventSource.removeListener(eventName, listener);
			}
		},
		getSnapshot() {
			return snapshot;
		},
		refresh,
		regenerateLastRevision() {
			return actionAndRefresh(regenerateLastRevisionNative);
		},
		subscribe(listener) {
			if (disposed) {
				return () => {};
			}

			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		undoLastRevision() {
			return actionAndRefresh(undoLastRevisionNative);
		},
	};
}
