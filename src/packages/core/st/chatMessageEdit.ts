import { getStContext } from "@/packages/core/st/context";
import {
	renderMessageContent,
	writeRenderedMessageContent,
} from "@/packages/core/st/chatMessageRendering";
import {
	asTrimmedString,
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type ChatMessageEditLike = Record<string, unknown> & {
	extra?: unknown;
	is_system?: unknown;
	is_user?: unknown;
	mes?: unknown;
	name?: unknown;
	send_date?: unknown;
	swipe_id?: unknown;
	swipes?: unknown;
};

type StContextLike = Record<string, unknown> & {
	chat?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	messageFormatting?: unknown;
	powerUserSettings?: unknown;
	printMessages?: unknown;
	saveChat?: unknown;
	saveChatConditional?: unknown;
	substituteParams?: unknown;
	updateMessageBlock?: unknown;
};

export type ChatMessageMoveDirection = "down" | "up";

export interface ChatMessageEditDraft {
	canCopy: boolean;
	canMoveDown: boolean;
	canMoveUp: boolean;
	hasReasoning: boolean;
	messageId: number;
	messageText: string;
	reasoningText: string;
}

export interface ChatMessageEditDraftInput {
	messageId: number;
}

export interface ChatMessageEditSaveInput {
	hasReasoning: boolean;
	messageId: number;
	messageText: string;
	reasoningText: string;
}

export interface ChatMessageMoveInput {
	direction: ChatMessageMoveDirection;
	messageId: number;
}

export type ChatMessageEditFailureReason =
	| "api-unavailable"
	| "invalid-message-id"
	| "move-unavailable"
	| "save-failed";

type ChatMessageEditFailureResult = {
	ok: false;
	reason: ChatMessageEditFailureReason;
};

export type ReadChatMessageEditDraftResult =
	| {
			draft: ChatMessageEditDraft;
			ok: true;
	  }
	| ChatMessageEditFailureResult;

export type ChatMessageEditMutationResult =
	| {
			messageId: number;
			ok: true;
	  }
	| ChatMessageEditFailureResult;

type ResolvedMessageTarget = {
	chat: unknown[];
	context: StContextLike;
	message: ChatMessageEditLike;
	messageId: number;
};

type ReasoningChange = "deleted" | "edited" | null;

function resolveContextSafe(): StContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context) ? (context as StContextLike) : null;
	} catch {
		return null;
	}
}

function asChatMessage(value: unknown): ChatMessageEditLike | null {
	return isRecord(value) ? (value as ChatMessageEditLike) : null;
}

function isValidMessageId(chat: unknown[], messageId: number): boolean {
	return (
		Number.isInteger(messageId) &&
		messageId >= 0 &&
		messageId < chat.length
	);
}

function resolveMessageTarget(
	messageId: number,
): ResolvedMessageTarget | ChatMessageEditFailureResult {
	const context = resolveContextSafe();
	const chat = Array.isArray(context?.chat) ? context.chat : [];

	if (!context || !Array.isArray(context.chat)) {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	if (!isValidMessageId(chat, messageId)) {
		return {
			ok: false,
			reason: "invalid-message-id",
		};
	}

	const message = asChatMessage(chat[messageId]);
	if (!message) {
		return {
			ok: false,
			reason: "invalid-message-id",
		};
	}

	return {
		chat,
		context,
		message,
		messageId,
	};
}

function isResolvedMessageTarget(
	value: ResolvedMessageTarget | ChatMessageEditFailureResult,
): value is ResolvedMessageTarget {
	return "context" in value;
}

function substituteText(context: StContextLike, value: string): string {
	const substituteParams =
		typeof context.substituteParams === "function"
			? (context.substituteParams as (value: string) => string)
			: null;

	return substituteParams ? substituteParams(value) : value;
}

function shouldTrimMessageText(context: StContextLike): boolean {
	const powerUserSettings = isRecord(context.powerUserSettings)
		? context.powerUserSettings
		: null;

	return powerUserSettings?.trim_spaces === true;
}

function normalizeMessageText(context: StContextLike, value: string): string {
	const baseText = shouldTrimMessageText(context) ? value.trim() : value;
	return substituteText(context, baseText);
}

function normalizeReasoningText(context: StContextLike, value: string): string {
	return substituteText(context, value);
}

function ensureExtra(message: ChatMessageEditLike): Record<string, unknown> {
	if (!isRecord(message.extra)) {
		message.extra = {};
	}

	return message.extra as Record<string, unknown>;
}

function readReasoningText(message: ChatMessageEditLike): string {
	const extra = isRecord(message.extra) ? message.extra : null;
	return typeof extra?.reasoning === "string" ? extra.reasoning : "";
}

function writeReasoningDraft({
	context,
	hasReasoning,
	message,
	reasoningText,
}: {
	context: StContextLike;
	hasReasoning: boolean;
	message: ChatMessageEditLike;
	reasoningText: string;
}): ReasoningChange {
	const previousReasoning = readReasoningText(message);
	const nextReasoning = hasReasoning
		? normalizeReasoningText(context, reasoningText)
		: "";
	const shouldKeepReasoning = nextReasoning.trim().length > 0;

	if (!shouldKeepReasoning) {
		if (!previousReasoning && !isRecord(message.extra)) {
			return null;
		}

		const extra = ensureExtra(message);
		const hadReasoning =
			typeof extra.reasoning === "string" && extra.reasoning.length > 0;
		delete extra.reasoning;
		delete extra.reasoning_type;
		delete extra.reasoning_duration;
		return hadReasoning ? "deleted" : null;
	}

	const extra = ensureExtra(message);
	const hadReasoning =
		typeof extra.reasoning === "string" && extra.reasoning.length > 0;
	const didChange = extra.reasoning !== nextReasoning;
	extra.reasoning = nextReasoning;
	extra.reasoning_type = hadReasoning ? "edited" : "manual";

	return didChange ? "edited" : null;
}

function writeMessageTextDraft({
	context,
	message,
	messageText,
}: {
	context: StContextLike;
	message: ChatMessageEditLike;
	messageText: string;
}): string {
	const nextMessageText = normalizeMessageText(context, messageText);
	message.mes = nextMessageText;

	const swipeId = message.swipe_id;
	if (
		typeof swipeId === "number" &&
		Number.isInteger(swipeId) &&
		Array.isArray(message.swipes) &&
		typeof message.swipes[swipeId] === "string"
	) {
		message.swipes[swipeId] = nextMessageText;
	}

	return nextMessageText;
}

function writeDraftToMessage({
	context,
	hasReasoning,
	message,
	messageText,
	reasoningText,
}: ChatMessageEditSaveInput & {
	context: StContextLike;
	message: ChatMessageEditLike;
}): ReasoningChange {
	writeMessageTextDraft({ context, message, messageText });
	return writeReasoningDraft({
		context,
		hasReasoning,
		message,
		reasoningText,
	});
}

function updateMessageDomFallback({
	context,
	message,
	messageId,
}: {
	context: StContextLike;
	message: ChatMessageEditLike;
	messageId: number;
}): void {
	const target = document.querySelector(
		`#chat .mes[mesid="${messageId}"] .mes_text`,
	);
	if (!target) {
		return;
	}

	const text =
		typeof message.mes === "string"
			? message.mes
			: asTrimmedString(message.mes);
	writeRenderedMessageContent(
		target,
		renderMessageContent({
			context,
			message,
			messageId,
			text,
		}),
	);
}

function updateMessageBlock({
	context,
	message,
	messageId,
}: {
	context: StContextLike;
	message: ChatMessageEditLike;
	messageId: number;
}): void {
	if (typeof context.updateMessageBlock === "function") {
		(context.updateMessageBlock as (
			messageId: number,
			message: ChatMessageEditLike,
		) => void)(messageId, message);
		return;
	}

	updateMessageDomFallback({ context, message, messageId });
}

async function emitContextEvent(
	context: StContextLike,
	eventKey: keyof EventTypesLike,
	messageId: number,
) {
	const eventName = resolveEventTypes(context)[eventKey];
	if (!eventName) {
		return;
	}

	await context.eventSource?.emit?.(eventName, messageId);
}

async function saveChat(context: StContextLike): Promise<void> {
	const save =
		typeof context.saveChat === "function"
			? context.saveChat
			: typeof context.saveChatConditional === "function"
				? context.saveChatConditional
				: null;

	if (save) {
		await (save as () => unknown | Promise<unknown>)();
	}
}

async function redrawChat(context: StContextLike): Promise<void> {
	if (typeof context.printMessages !== "function") {
		return;
	}

	await (context.printMessages as () => unknown | Promise<unknown>)();
}

function cloneMessage(message: ChatMessageEditLike): ChatMessageEditLike {
	if (typeof structuredClone === "function") {
		return structuredClone(message) as ChatMessageEditLike;
	}

	return JSON.parse(JSON.stringify(message)) as ChatMessageEditLike;
}

export function readChatMessageEditDraft({
	messageId,
}: ChatMessageEditDraftInput): ReadChatMessageEditDraftResult {
	const target = resolveMessageTarget(messageId);
	if (!isResolvedMessageTarget(target)) {
		return target;
	}

	const reasoningText = readReasoningText(target.message);

	return {
		draft: {
			canCopy: true,
			canMoveDown: target.messageId < target.chat.length - 1,
			canMoveUp: target.messageId > 0,
			hasReasoning: reasoningText.length > 0,
			messageId: target.messageId,
			messageText:
				typeof target.message.mes === "string" ? target.message.mes : "",
			reasoningText,
		},
		ok: true,
	};
}

export async function saveChatMessageEdit({
	hasReasoning,
	messageId,
	messageText,
	reasoningText,
}: ChatMessageEditSaveInput): Promise<ChatMessageEditMutationResult> {
	const target = resolveMessageTarget(messageId);
	if (!isResolvedMessageTarget(target)) {
		return target;
	}

	try {
		const reasoningChange = writeDraftToMessage({
			context: target.context,
			hasReasoning,
			message: target.message,
			messageId: target.messageId,
			messageText,
			reasoningText,
		});

		await emitContextEvent(target.context, "MESSAGE_EDITED", target.messageId);
		updateMessageBlock({
			context: target.context,
			message: target.message,
			messageId: target.messageId,
		});

		if (reasoningChange === "edited") {
			await emitContextEvent(
				target.context,
				"MESSAGE_REASONING_EDITED",
				target.messageId,
			);
		} else if (reasoningChange === "deleted") {
			await emitContextEvent(
				target.context,
				"MESSAGE_REASONING_DELETED",
				target.messageId,
			);
		}

		await emitContextEvent(target.context, "MESSAGE_UPDATED", target.messageId);
		await saveChat(target.context);

		return {
			messageId: target.messageId,
			ok: true,
		};
	} catch {
		return {
			ok: false,
			reason: "save-failed",
		};
	}
}

export async function copyChatMessageFromDraft({
	hasReasoning,
	messageId,
	messageText,
	reasoningText,
}: ChatMessageEditSaveInput): Promise<ChatMessageEditMutationResult> {
	const target = resolveMessageTarget(messageId);
	if (!isResolvedMessageTarget(target)) {
		return target;
	}

	try {
		const clone = cloneMessage(target.message);
		writeDraftToMessage({
			context: target.context,
			hasReasoning,
			message: clone,
			messageId: target.messageId,
			messageText,
			reasoningText,
		});
		clone.send_date = Date.now();
		target.chat.splice(target.messageId + 1, 0, clone);

		await redrawChat(target.context);
		await saveChat(target.context);

		return {
			messageId: target.messageId + 1,
			ok: true,
		};
	} catch {
		return {
			ok: false,
			reason: "save-failed",
		};
	}
}

export async function moveChatMessage({
	direction,
	messageId,
}: ChatMessageMoveInput): Promise<ChatMessageEditMutationResult> {
	const target = resolveMessageTarget(messageId);
	if (!isResolvedMessageTarget(target)) {
		return target;
	}

	const nextMessageId =
		direction === "up" ? target.messageId - 1 : target.messageId + 1;
	if (!isValidMessageId(target.chat, nextMessageId)) {
		return {
			ok: false,
			reason: "move-unavailable",
		};
	}

	try {
		[target.chat[target.messageId], target.chat[nextMessageId]] = [
			target.chat[nextMessageId],
			target.chat[target.messageId],
		];

		await redrawChat(target.context);
		await saveChat(target.context);

		return {
			messageId: nextMessageId,
			ok: true,
		};
	} catch {
		return {
			ok: false,
			reason: "save-failed",
		};
	}
}
