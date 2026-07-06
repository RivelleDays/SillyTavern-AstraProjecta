import {
	asPath,
	asRevisionList,
	type AstraRevisionNode,
} from "@/packages/core/st/chat-message-revisions/storage";

function rewriteRootPath(path: unknown, rootIndex: number): number[] {
	const normalizedPath = asPath(path);
	if (!normalizedPath.length) {
		return [];
	}

	return [rootIndex, ...normalizedPath.slice(1)];
}

function rebaseRevisionNodeRoot(
	revision: AstraRevisionNode,
	rootIndex: number,
): void {
	const parentPath = asPath(revision.parent);
	revision.parent = parentPath.length
		? [rootIndex, ...parentPath.slice(1)]
		: parentPath;

	const activePath = asPath(revision.active);
	if (activePath.length) {
		revision.active = [rootIndex, ...activePath.slice(1)];
	}

	for (const child of asRevisionList(revision.swipes) ?? []) {
		rebaseRevisionNodeRoot(child, rootIndex);
	}
}

export function rebaseRevisionRootToNativeSwipeIndex(
	rootRevision: AstraRevisionNode,
	rootIndex: number,
): void {
	rootRevision.parent = [];
	const activePath = rewriteRootPath(rootRevision.active, rootIndex);
	rootRevision.active = activePath.length ? activePath : [rootIndex];

	for (const child of asRevisionList(rootRevision.swipes) ?? []) {
		rebaseRevisionNodeRoot(child, rootIndex);
	}
}
