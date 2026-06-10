import { getStContext } from "@/packages/core/st/context";
import {
	asIndex,
	asPath,
	asRevisionList,
	asRevisionNode,
	readRevisionRoots,
} from "@/packages/core/st/chat-message-revisions/storage";
import { translateAstra } from "@/packages/core/i18n";
import { isRecord } from "@/packages/core/st/shared";

type AstraRevisionKind = "continue" | "edit" | "origin" | "regenerate";
type RevisionKind = AstraRevisionKind | "nativeSwipe";

type RevisionNodeLike = Record<string, unknown> & {
	active?: unknown;
	createdAt?: unknown;
	fullText?: unknown;
	kind?: unknown;
	mes?: unknown;
	swipes?: unknown;
};

type ChatMessageRevisionTreeLike = Record<string, unknown> & {
	astra_projecta?: unknown;
	continueHistory?: unknown;
	mes?: unknown;
	swipe_id?: unknown;
	swipes?: unknown;
};

type StContextLike = Record<string, unknown> & {
	chat?: unknown;
};

export type ChatMessageRevisionTreeStatus = "idle" | "ready";

export interface ChatMessageRevisionTreeNode {
	children: ChatMessageRevisionTreeNode[];
	compactText: string;
	createdAt: number | null;
	fullText: string;
	kind: RevisionKind;
	path: number[];
	text: string;
}

export interface ChatMessageRevisionTreeSnapshot {
	activeFullText: string;
	activePath: number[];
	displayRoots: ChatMessageRevisionTreeNode[];
	hasHistory: boolean;
	messageId: number;
	root: ChatMessageRevisionTreeNode | null;
	roots: ChatMessageRevisionTreeNode[];
	status: ChatMessageRevisionTreeStatus;
	swipeIndex: number;
}

function resolveContextSafe(): StContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context) ? (context as StContextLike) : null;
	} catch {
		return null;
	}
}

function asChatMessage(value: unknown): ChatMessageRevisionTreeLike | null {
	return isRecord(value) ? (value as ChatMessageRevisionTreeLike) : null;
}

function asRevisionKind(
	value: unknown,
	fallback: AstraRevisionKind,
): AstraRevisionKind {
	return value === "continue" ||
		value === "edit" ||
		value === "origin" ||
		value === "regenerate"
		? value
		: fallback;
}

function asText(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function findCommonPrefixLength(first: string, second: string): number {
	const limit = Math.min(first.length, second.length);
	let index = 0;

	while (index < limit && first[index] === second[index]) {
		index += 1;
	}

	return index;
}

function findCommonSuffixLength({
	first,
	prefixLength,
	second,
}: {
	first: string;
	prefixLength: number;
	second: string;
}): number {
	const limit = Math.min(
		first.length - prefixLength,
		second.length - prefixLength,
	);
	let offset = 0;

	while (
		offset < limit &&
		first[first.length - 1 - offset] === second[second.length - 1 - offset]
	) {
		offset += 1;
	}

	return offset;
}

function isAsciiWordCharacter(value: string | undefined): boolean {
	return typeof value === "string" && /^[A-Za-z0-9_]$/.test(value);
}

function isAsciiWordBoundary(text: string, index: number): boolean {
	if (index <= 0 || index >= text.length) {
		return true;
	}

	return !(
		isAsciiWordCharacter(text[index - 1]) &&
		isAsciiWordCharacter(text[index])
	);
}

function normalizePrefixLength({
	first,
	prefixLength,
	second,
}: {
	first: string;
	prefixLength: number;
	second: string;
}): number {
	if (
		isAsciiWordBoundary(first, prefixLength) &&
		isAsciiWordBoundary(second, prefixLength)
	) {
		return prefixLength;
	}

	return 0;
}

function normalizeSuffixLength({
	first,
	prefixLength,
	second,
	suffixLength,
}: {
	first: string;
	prefixLength: number;
	second: string;
	suffixLength: number;
}): number {
	if (suffixLength === 0) {
		return 0;
	}

	const firstIndex = first.length - suffixLength;
	const secondIndex = second.length - suffixLength;
	if (
		firstIndex < prefixLength ||
		secondIndex < prefixLength ||
		!isAsciiWordBoundary(first, firstIndex) ||
		!isAsciiWordBoundary(second, secondIndex)
	) {
		return 0;
	}

	return suffixLength;
}

function resolveRemovedTextLabel(): string {
	return translateAstra("messageActions.revisionHistory.compact.removedText");
}

function resolveWhitespaceChangeLabel(): string {
	return translateAstra(
		"messageActions.revisionHistory.compact.whitespaceChange",
	);
}

function resolveCompactText({
	fallbackText,
	fullText,
	parentText,
}: {
	fallbackText: string;
	fullText: string;
	parentText: string;
}): string {
	if (!parentText) {
		return fullText || fallbackText;
	}

	const meaningfulFallback =
		fallbackText.trim().length > 0 ? fallbackText.trimStart() : "";

	if (fullText.startsWith(parentText)) {
		const appendedText = fullText.slice(parentText.length);
		if (appendedText.trim().length > 0) {
			return appendedText.trimStart();
		}

		if (fullText !== parentText) {
			return resolveWhitespaceChangeLabel();
		}

		return meaningfulFallback || fullText;
	}

	const prefixLength = normalizePrefixLength({
		first: parentText,
		prefixLength: findCommonPrefixLength(parentText, fullText),
		second: fullText,
	});
	const suffixLength = normalizeSuffixLength({
		first: parentText,
		prefixLength,
		second: fullText,
		suffixLength: findCommonSuffixLength({
			first: parentText,
			prefixLength,
			second: fullText,
		}),
	});
	const compactText = fullText.slice(
		prefixLength,
		fullText.length - suffixLength,
	);

	if (compactText.trim().length > 0) {
		return compactText.trimStart();
	}

	if (parentText !== fullText) {
		return fullText.length < parentText.length
			? resolveRemovedTextLabel()
			: resolveWhitespaceChangeLabel();
	}

	return meaningfulFallback || fullText || fallbackText;
}

function createIdleSnapshot({
	messageId,
	swipeIndex,
}: {
	messageId: number;
	swipeIndex: number;
}): ChatMessageRevisionTreeSnapshot {
	return {
		activeFullText: "",
		activePath: [],
		displayRoots: [],
		hasHistory: false,
		messageId,
		root: null,
		roots: [],
		status: "idle",
		swipeIndex,
	};
}

function buildRevisionChildNode({
	fallbackKind,
	parentText,
	path,
	revision,
}: {
	fallbackKind: AstraRevisionKind;
	parentText: string;
	path: number[];
	revision: RevisionNodeLike;
}): ChatMessageRevisionTreeNode {
	const text = asText(revision.mes);
	const computedFullText = `${parentText}${text}`;
	const fullText = asText(revision.fullText) || computedFullText;
	const kind = asRevisionKind(revision.kind, fallbackKind);
	const children = asRevisionList(revision.swipes) ?? [];
	const compactText = resolveCompactText({
		fallbackText: text,
		fullText,
		parentText,
	});

	return {
		children: children.map((child, index) =>
			buildRevisionChildNode({
				fallbackKind: "continue",
				parentText: fullText,
				path: [...path, index],
				revision: child,
			}),
		),
		compactText,
		createdAt:
			typeof revision.createdAt === "number" ? revision.createdAt : null,
		fullText,
		kind,
		path,
		text,
	};
}

function resolveRootFullText({
	message,
	rootIndex,
	rootRevision,
}: {
	message: ChatMessageRevisionTreeLike;
	rootIndex: number;
	rootRevision: RevisionNodeLike | null;
}): string {
	const storedRootText =
		asText(rootRevision?.fullText) || asText(rootRevision?.mes);
	if (storedRootText) {
		return storedRootText;
	}

	const nativeSwipe = Array.isArray(message.swipes)
		? asText(message.swipes[rootIndex])
		: "";
	if (nativeSwipe) {
		return nativeSwipe;
	}

	return (
		asText(rootRevision?.fullText) ||
		asText(rootRevision?.mes) ||
		(rootIndex === asIndex(message.swipe_id) ? asText(message.mes) : "")
	);
}

function resolveRootBaseText(rootRevision: RevisionNodeLike | null): string {
	return asText(rootRevision?.fullText) || asText(rootRevision?.mes);
}

function buildNativeSwipeRootNode({
	message,
	path,
	rootRevision,
}: {
	message: ChatMessageRevisionTreeLike;
	path: number[];
	rootRevision: RevisionNodeLike | null;
}): ChatMessageRevisionTreeNode {
	const rootIndex = path[0] ?? 0;
	const fullText = resolveRootFullText({ message, rootIndex, rootRevision });
	const parentText = resolveRootBaseText(rootRevision) || fullText;
	const children = asRevisionList(rootRevision?.swipes) ?? [];

	return {
		children: children.map((child, index) =>
			buildRevisionChildNode({
				fallbackKind: "continue",
				parentText,
				path: [...path, index],
				revision: child,
			}),
		),
		compactText: fullText,
		createdAt:
			typeof rootRevision?.createdAt === "number"
				? rootRevision.createdAt
				: null,
		fullText,
		kind: "nativeSwipe",
		path,
		text: fullText,
	};
}

function isRootReplacementDisplayNode(
	node: ChatMessageRevisionTreeNode,
): boolean {
	return (
		node.path.length === 2 &&
		(node.kind === "regenerate" || node.kind === "edit") &&
		Boolean(node.fullText) &&
		node.fullText === node.text
	);
}

function cloneTreeNodeWithChildren(
	node: ChatMessageRevisionTreeNode,
	children: ChatMessageRevisionTreeNode[],
): ChatMessageRevisionTreeNode {
	return {
		...node,
		children,
	};
}

function buildDisplayRoots(
	root: ChatMessageRevisionTreeNode | null,
): ChatMessageRevisionTreeNode[] {
	if (!root) {
		return [];
	}

	const promotedRoots: ChatMessageRevisionTreeNode[] = [];
	const nestedChildren: ChatMessageRevisionTreeNode[] = [];

	for (const child of root.children) {
		if (isRootReplacementDisplayNode(child)) {
			promotedRoots.push(child);
		} else {
			nestedChildren.push(child);
		}
	}

	return [cloneTreeNodeWithChildren(root, nestedChildren), ...promotedRoots];
}

function findNodeByPath(
	node: ChatMessageRevisionTreeNode,
	path: number[],
): ChatMessageRevisionTreeNode | null {
	if (
		node.path.length === path.length &&
		node.path.every((value, index) => value === path[index])
	) {
		return node;
	}

	for (const child of node.children) {
		const match = findNodeByPath(child, path);
		if (match) {
			return match;
		}
	}

	return null;
}

function countNativeSwipes(message: ChatMessageRevisionTreeLike): number {
	return Array.isArray(message.swipes) && message.swipes.length > 0
		? message.swipes.length
		: 0;
}

function hasAstraRevisionChildren(root: RevisionNodeLike | null): boolean {
	const activePath = asPath(root?.active);
	return (
		activePath.length > 1 || (asRevisionList(root?.swipes)?.length ?? 0) > 0
	);
}

export function readChatMessageRevisionTreeSnapshot({
	context = resolveContextSafe(),
	messageId,
	swipeIndex,
}: {
	context?: StContextLike | null;
	messageId: number;
	swipeIndex: number;
}): ChatMessageRevisionTreeSnapshot {
	const chat = Array.isArray(context?.chat) ? context.chat : [];
	const message = asChatMessage(chat[messageId]);
	const revisionRoots = asRevisionList(readRevisionRoots(message)) ?? [];

	if (!message) {
		return createIdleSnapshot({ messageId, swipeIndex });
	}

	const nativeSwipeTotal = countNativeSwipes(message);
	const rootTotal = Math.max(nativeSwipeTotal, revisionRoots.length);
	const rootRevisions = revisionRoots.map((root) => asRevisionNode(root));
	const hasNativeSwipeHistory = nativeSwipeTotal > 1;
	const hasAnyAstraHistory = rootRevisions.some(hasAstraRevisionChildren);
	const hasHistory = hasNativeSwipeHistory || hasAnyAstraHistory;

	if (!hasHistory || rootTotal === 0) {
		return createIdleSnapshot({ messageId, swipeIndex });
	}

	const roots = Array.from({ length: rootTotal }, (_, index) =>
		buildNativeSwipeRootNode({
			message,
			path: [index],
			rootRevision: rootRevisions[index] ?? null,
		}),
	);
	const normalizedSwipeIndex = Math.min(
		roots.length - 1,
		Math.max(0, swipeIndex),
	);
	const selectedRootRevision = rootRevisions[normalizedSwipeIndex] ?? null;
	const selectedActivePath = asPath(selectedRootRevision?.active);
	const activePath =
		selectedActivePath.length > 0 &&
		selectedActivePath[0] === normalizedSwipeIndex
			? selectedActivePath
			: [normalizedSwipeIndex];
	const root = roots[normalizedSwipeIndex] ?? null;
	const activeNode = root ? (findNodeByPath(root, activePath) ?? root) : null;
	const displayRoots = buildDisplayRoots(root);

	return {
		activeFullText: activeNode?.fullText ?? "",
		activePath,
		displayRoots,
		hasHistory,
		messageId,
		root,
		roots,
		status: "ready",
		swipeIndex: normalizedSwipeIndex,
	};
}
