import {
	collectChatMessageSearchMatches,
	type ChatMessageSearchMatch,
	type ChatMessageSearchMessage,
} from "@/packages/features/chat-session/message-search/matching";

type Listener = () => void;

export interface ChatMessageSearchStoreTextEdit {
	messageId: number;
	messageText: string;
	swipeId: number | null;
}

export type ChatMessageSearchStoreSaveTextEdits = (input: {
	edits: ChatMessageSearchStoreTextEdit[];
}) => Promise<
	| {
			messageIds: number[];
			ok: true;
	  }
	| {
			ok: false;
			reason: string;
	  }
>;

export interface ChatMessageSearchSnapshot {
	activeMatch: ChatMessageSearchMatch | null;
	activeMatchIndex: number;
	canNavigate: boolean;
	canRedo: boolean;
	canReplace: boolean;
	canUndo: boolean;
	caseSensitive: boolean;
	isBusy: boolean;
	isOpen: boolean;
	isReplaceOpen: boolean;
	lastReplaceFailureReason: string | null;
	matchCount: number;
	matches: ChatMessageSearchMatch[];
	query: string;
	replaceText: string;
	wholeWord: boolean;
}

export interface ChatMessageSearchStore {
	close(): void;
	dispose(): void;
	getSnapshot(): ChatMessageSearchSnapshot;
	goToNext(): void;
	goToPrevious(): void;
	open(): void;
	redo(): Promise<boolean>;
	refresh(): void;
	replaceAll(): Promise<boolean>;
	replaceCurrent(): Promise<boolean>;
	resetForChatChange(): void;
	setCaseSensitive(value: boolean): void;
	setQuery(value: string): void;
	setReplaceOpen(value: boolean): void;
	setReplaceText(value: string): void;
	setWholeWord(value: boolean): void;
	subscribe(listener: Listener): () => void;
	undo(): Promise<boolean>;
}

export interface CreateChatMessageSearchStoreOptions {
	readMessages?: () => ChatMessageSearchMessage[];
	saveTextEdits?: ChatMessageSearchStoreSaveTextEdits;
	subscribeToChatChanges?: (listener: Listener) => () => void;
}

interface ReplacementOperationItem {
	after: string;
	before: string;
	messageId: number;
	swipeId: number | null;
}

type ReplacementOperation = ReplacementOperationItem[];

const DEFAULT_SAVE_TEXT_EDITS: ChatMessageSearchStoreSaveTextEdits = async () => ({
	ok: false,
	reason: "api-unavailable",
});
const REPLACE_FAILURE_LOG_PREFIX =
	"[AstraProjecta] Chat message replacement failed.";

function createEmptySnapshot(): ChatMessageSearchSnapshot {
	return {
		activeMatch: null,
		activeMatchIndex: -1,
		canNavigate: false,
		canRedo: false,
		canReplace: false,
		canUndo: false,
		caseSensitive: false,
		isBusy: false,
		isOpen: false,
		isReplaceOpen: false,
		lastReplaceFailureReason: null,
		matchCount: 0,
		matches: [],
		query: "",
		replaceText: "",
		wholeWord: false,
	};
}

function replaceRange({
	end,
	replacement,
	start,
	text,
}: {
	end: number;
	replacement: string;
	start: number;
	text: string;
}): string {
	return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

function findMessageText(
	messages: ChatMessageSearchMessage[],
	messageId: number,
	swipeId: number | null,
): string | null {
	const message = messages.find(
		(item) => item.messageId === messageId && item.swipeId === swipeId,
	);
	return typeof message?.mes === "string" ? message.mes : null;
}

function getSearchOptions(snapshot: ChatMessageSearchSnapshot): {
	caseSensitive: boolean;
	wholeWord: boolean;
} {
	if (snapshot.isReplaceOpen) {
		return {
			caseSensitive: true,
			wholeWord: false,
		};
	}

	return {
		caseSensitive: snapshot.caseSensitive,
		wholeWord: snapshot.wholeWord,
	};
}

function logReplaceFailure(reason: string): void {
	console.warn(REPLACE_FAILURE_LOG_PREFIX, reason);
}

export function createChatMessageSearchStore({
	readMessages = () => [],
	saveTextEdits = DEFAULT_SAVE_TEXT_EDITS,
	subscribeToChatChanges,
}: CreateChatMessageSearchStoreOptions = {}): ChatMessageSearchStore {
	const listeners = new Set<Listener>();
	let disposed = false;
	let messages: ChatMessageSearchMessage[] = [];
	let snapshot = createEmptySnapshot();
	let undoStack: ReplacementOperation[] = [];
	let redoStack: ReplacementOperation[] = [];
	let unsubscribeChatChanges: (() => void) | null = null;

	function emit(): void {
		if (disposed) {
			return;
		}

		for (const listener of listeners) {
			listener();
		}
	}

	function setSnapshot(
		updater: (current: ChatMessageSearchSnapshot) => ChatMessageSearchSnapshot,
	): void {
		snapshot = updater(snapshot);
		emit();
	}

	function recomputeMatches(activeMatchIndex = snapshot.activeMatchIndex): void {
		messages = readMessages();
		const matches = collectChatMessageSearchMatches({
			messages,
			options: getSearchOptions(snapshot),
			query: snapshot.query,
		});
		const nextActiveMatchIndex =
			matches.length === 0
				? -1
				: Math.min(Math.max(0, activeMatchIndex), matches.length - 1);

		snapshot = {
			...snapshot,
			activeMatch: matches[nextActiveMatchIndex] ?? null,
			activeMatchIndex: nextActiveMatchIndex,
			canNavigate: matches.length > 0,
			canReplace: matches.length > 0,
			canRedo: redoStack.length > 0,
			canUndo: undoStack.length > 0,
			matchCount: matches.length,
			matches,
		};
	}

	function refreshAndEmit(activeMatchIndex = snapshot.activeMatchIndex): void {
		recomputeMatches(activeMatchIndex);
		emit();
	}

	function resetSession(nextOpen: boolean): void {
		undoStack = [];
		redoStack = [];
		snapshot = {
			...createEmptySnapshot(),
			isOpen: nextOpen,
		};
		messages = [];
		if (nextOpen) {
			recomputeMatches(0);
		}
		emit();
	}

	unsubscribeChatChanges =
		subscribeToChatChanges?.(() => {
			resetSession(false);
		}) ?? null;

	async function saveOperation(
		operation: ReplacementOperation,
		direction: "redo" | "undo",
	): Promise<boolean> {
		if (operation.length === 0 || snapshot.isBusy) {
			return false;
		}

		setSnapshot((current) => ({
			...current,
			isBusy: true,
			lastReplaceFailureReason: null,
		}));
		const edits = operation.map((item) => ({
			messageId: item.messageId,
			messageText: direction === "undo" ? item.before : item.after,
			swipeId: item.swipeId,
		}));
		let result: Awaited<ReturnType<ChatMessageSearchStoreSaveTextEdits>>;
		try {
			result = await saveTextEdits({ edits });
		} catch {
			logReplaceFailure("exception");
			setSnapshot((current) => ({
				...current,
				isBusy: false,
				lastReplaceFailureReason: "exception",
			}));
			return false;
		}

		if (!result.ok) {
			logReplaceFailure(result.reason);
			setSnapshot((current) => ({
				...current,
				isBusy: false,
				lastReplaceFailureReason: result.reason,
			}));
			return false;
		}

		setSnapshot((current) => ({
			...current,
			isBusy: false,
			lastReplaceFailureReason: null,
		}));
		refreshAndEmit();
		return true;
	}

	return {
		close() {
			resetSession(false);
		},
		dispose() {
			disposed = true;
			unsubscribeChatChanges?.();
			unsubscribeChatChanges = null;
			listeners.clear();
			undoStack = [];
			redoStack = [];
			messages = [];
		},
		getSnapshot() {
			return snapshot;
		},
		goToNext() {
			if (snapshot.matchCount === 0) {
				return;
			}

			refreshAndEmit(
				(snapshot.activeMatchIndex + 1) % snapshot.matchCount,
			);
		},
		goToPrevious() {
			if (snapshot.matchCount === 0) {
				return;
			}

			refreshAndEmit(
				(snapshot.activeMatchIndex - 1 + snapshot.matchCount) %
					snapshot.matchCount,
			);
		},
		open() {
			resetSession(true);
		},
		async redo() {
			const operation = redoStack.pop();
			if (!operation) {
				return false;
			}

			const saved = await saveOperation(operation, "redo");
			if (!saved) {
				redoStack.push(operation);
				refreshAndEmit();
				return false;
			}

			undoStack.push(operation);
			refreshAndEmit();
			return true;
		},
		refresh() {
			refreshAndEmit();
		},
		async replaceAll() {
			const query = snapshot.query;
			if (!query || snapshot.matchCount === 0) {
				return false;
			}

			const operation: ReplacementOperation = [];
			for (const message of messages) {
				const before =
					typeof message.mes === "string" ? message.mes : null;
				if (before === null || !before.includes(query)) {
					continue;
				}

				const after = before.replaceAll(query, snapshot.replaceText);
				if (after !== before) {
					operation.push({
						after,
						before,
						messageId: message.messageId,
						swipeId: message.swipeId,
					});
				}
			}

			const saved = await saveOperation(operation, "redo");
			if (!saved) {
				return false;
			}

			undoStack.push(operation);
			redoStack = [];
			refreshAndEmit();
			return true;
		},
		async replaceCurrent() {
			const match = snapshot.activeMatch;
			if (!match || match.text !== snapshot.query) {
				return false;
			}

			const before = findMessageText(
				messages,
				match.messageId,
				match.swipeId,
			);
			if (before === null) {
				return false;
			}

			const after = replaceRange({
				end: match.end,
				replacement: snapshot.replaceText,
				start: match.start,
				text: before,
			});
			if (after === before) {
				return false;
			}

			const operation: ReplacementOperation = [
				{
					after,
					before,
					messageId: match.messageId,
					swipeId: match.swipeId,
				},
			];
			const saved = await saveOperation(operation, "redo");
			if (!saved) {
				return false;
			}

			undoStack.push(operation);
			redoStack = [];
			refreshAndEmit(snapshot.activeMatchIndex);
			return true;
		},
		resetForChatChange() {
			resetSession(false);
		},
		setCaseSensitive(value: boolean) {
			snapshot = snapshot.isReplaceOpen
				? {
						...snapshot,
						caseSensitive: true,
						lastReplaceFailureReason: null,
						wholeWord: false,
					}
				: {
						...snapshot,
						caseSensitive: value,
						lastReplaceFailureReason: null,
					};
			refreshAndEmit(0);
		},
		setQuery(value: string) {
			snapshot = { ...snapshot, lastReplaceFailureReason: null, query: value };
			refreshAndEmit(0);
		},
		setReplaceOpen(value: boolean) {
			snapshot = {
				...snapshot,
				caseSensitive: value ? true : snapshot.caseSensitive,
				isReplaceOpen: value,
				lastReplaceFailureReason: null,
				wholeWord: value ? false : snapshot.wholeWord,
			};
			refreshAndEmit(0);
		},
		setReplaceText(value: string) {
			setSnapshot((current) => ({
				...current,
				lastReplaceFailureReason: null,
				replaceText: value,
			}));
		},
		setWholeWord(value: boolean) {
			snapshot = snapshot.isReplaceOpen
				? {
						...snapshot,
						caseSensitive: true,
						lastReplaceFailureReason: null,
						wholeWord: false,
					}
				: {
						...snapshot,
						lastReplaceFailureReason: null,
						wholeWord: value,
					};
			refreshAndEmit(0);
		},
		subscribe(listener: Listener) {
			if (disposed) {
				return () => undefined;
			}

			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		async undo() {
			const operation = undoStack.pop();
			if (!operation) {
				return false;
			}

			const saved = await saveOperation(operation, "undo");
			if (!saved) {
				undoStack.push(operation);
				refreshAndEmit();
				return false;
			}

			redoStack.push(operation);
			refreshAndEmit();
			return true;
		},
	};
}
