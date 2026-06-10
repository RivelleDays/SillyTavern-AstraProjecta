import { isRecord } from "@/packages/core/st/shared";

export type AstraRevisionKind = "continue" | "edit" | "origin" | "regenerate";

export type AstraRevisionNode = Record<string, unknown> & {
	active?: unknown;
	createdAt?: unknown;
	fullText?: unknown;
	kind?: unknown;
	mes?: unknown;
	parent?: unknown;
	swipes?: unknown;
};

export type AstraRevisionMessage = Record<string, unknown> & {
	_astraContinueCachedText?: unknown;
	astra_projecta?: unknown;
	continueHistory?: unknown;
	continueSwipe?: unknown;
	continueSwipeId?: unknown;
};

type AstraProjectaScope = Record<string, unknown> & {
	revisionHistory?: unknown;
};

type AstraRevisionHistoryScope = Record<string, unknown> & {
	roots?: unknown;
};

export function asRevisionNode(value: unknown): AstraRevisionNode | null {
	return isRecord(value) ? (value as AstraRevisionNode) : null;
}

export function asRevisionList(value: unknown): AstraRevisionNode[] | null {
	return Array.isArray(value) ? (value as AstraRevisionNode[]) : null;
}

export function asIndex(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0
		? value
		: fallback;
}

export function asPath(value: unknown): number[] {
	return Array.isArray(value)
		? value.filter(
				(item): item is number =>
					typeof item === "number" &&
					Number.isInteger(item) &&
					item >= 0,
			)
		: [];
}

function cloneRevisionNode(node: AstraRevisionNode): AstraRevisionNode {
	const clone: AstraRevisionNode = { ...node };
	const children = asRevisionList(node.swipes);
	clone.swipes = children ? children.map(cloneRevisionNode) : [];
	clone.parent = asPath(node.parent);
	clone.active = Array.isArray(node.active)
		? asPath(node.active)
		: node.active;
	return clone;
}

function cloneRevisionRoots(roots: AstraRevisionNode[]): AstraRevisionNode[] {
	return roots.map(cloneRevisionNode);
}

function getAstraProjectaScope(
	message: AstraRevisionMessage,
	create: boolean,
): AstraProjectaScope | null {
	if (isRecord(message.astra_projecta)) {
		return message.astra_projecta as AstraProjectaScope;
	}

	if (!create) {
		return null;
	}

	const scope: AstraProjectaScope = {};
	message.astra_projecta = scope;
	return scope;
}

function getRevisionHistoryScope(
	message: AstraRevisionMessage,
	create: boolean,
): AstraRevisionHistoryScope | null {
	const scope = getAstraProjectaScope(message, create);
	if (!scope) {
		return null;
	}

	if (isRecord(scope.revisionHistory)) {
		return scope.revisionHistory as AstraRevisionHistoryScope;
	}

	if (!create) {
		return null;
	}

	const revisionHistory: AstraRevisionHistoryScope = {};
	scope.revisionHistory = revisionHistory;
	return revisionHistory;
}

export function readNamespacedRevisionRoots(
	message: AstraRevisionMessage | null,
): AstraRevisionNode[] | null {
	if (!message) {
		return null;
	}

	return asRevisionList(getRevisionHistoryScope(message, false)?.roots);
}

export function readLegacyRevisionRoots(
	message: AstraRevisionMessage | null,
): AstraRevisionNode[] | null {
	return asRevisionList(message?.continueHistory);
}

export function readRevisionRoots(
	message: AstraRevisionMessage | null,
): AstraRevisionNode[] | null {
	return (
		readNamespacedRevisionRoots(message) ?? readLegacyRevisionRoots(message)
	);
}

export function writeNamespacedRevisionRoots(
	message: AstraRevisionMessage,
	roots: AstraRevisionNode[],
): AstraRevisionNode[] {
	const revisionHistory = getRevisionHistoryScope(message, true);
	if (revisionHistory) {
		revisionHistory.roots = roots;
	}
	cleanupDerivedRevisionFields(message);
	return roots;
}

export function ensureWritableRevisionRoots(
	message: AstraRevisionMessage,
	createRoots: () => AstraRevisionNode[],
): AstraRevisionNode[] {
	const existingRoots = readNamespacedRevisionRoots(message);
	if (existingRoots) {
		cleanupDerivedRevisionFields(message);
		return existingRoots;
	}

	const legacyRoots = readLegacyRevisionRoots(message);
	return writeNamespacedRevisionRoots(
		message,
		legacyRoots ? cloneRevisionRoots(legacyRoots) : createRoots(),
	);
}

export function cleanupDerivedRevisionFields(
	message: AstraRevisionMessage | null,
): void {
	if (!message) {
		return;
	}

	delete message.continueSwipe;
	delete message.continueSwipeId;
	delete message._astraContinueCachedText;
}
