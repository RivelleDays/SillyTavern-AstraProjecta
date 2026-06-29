import {
	collectChatMessageSearchMatches,
	type ChatMessageSearchMatch,
	type ChatMessageSearchMessage,
} from "@/packages/features/chat-session/message-search/matching";

type Listener = () => void;

export interface ChatMessageSearchStoreTextEdit {
	messageId: number;
	messageText: string;
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
}

type ReplacementOperation = ReplacementOperationItem[];

const DEFAULT_SAVE_TEXT_EDITS: ChatMessageSearchStoreSaveTextEdits = async () => ({
	ok: false,
	reason: "api-unavailable",
});

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
): string | null {
	const message = messages.find((item) => item.messageId === messageId);
	return typeof message?.mes === "string" ? message.mes : null;
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
			options: {
				caseSensitive: snapshot.caseSensitive,
				wholeWord: snapshot.wholeWord,
			},
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

		setSnapshot((current) => ({ ...current, isBusy: true }));
		const edits = operation.map((item) => ({
			messageId: item.messageId,
			messageText: direction === "undo" ? item.before : item.after,
		}));
		const result = await saveTextEdits({ edits });
		if (!result.ok) {
			setSnapshot((current) => ({ ...current, isBusy: false }));
			return false;
		}

		setSnapshot((current) => ({ ...current, isBusy: false }));
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
			if (snapshot.matchCount === 0) {
				return false;
			}

			const replacementsByMessage = new Map<number, ChatMessageSearchMatch[]>();
			for (const match of snapshot.matches) {
				const messageMatches =
					replacementsByMessage.get(match.messageId) ?? [];
				messageMatches.push(match);
				replacementsByMessage.set(match.messageId, messageMatches);
			}

			const operation: ReplacementOperation = [];
			for (const message of messages) {
				const messageMatches = replacementsByMessage.get(
					message.messageId,
				);
				const before =
					typeof message.mes === "string" ? message.mes : null;
				if (!before || !messageMatches) {
					continue;
				}

				const after = [...messageMatches]
					.sort((left, right) => right.start - left.start)
					.reduce(
						(nextText, match) =>
							replaceRange({
								end: match.end,
								replacement: snapshot.replaceText,
								start: match.start,
								text: nextText,
							}),
						before,
					);
				if (after !== before) {
					operation.push({
						after,
						before,
						messageId: message.messageId,
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
			if (!match) {
				return false;
			}

			const before = findMessageText(messages, match.messageId);
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
				{ after, before, messageId: match.messageId },
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
			snapshot = { ...snapshot, caseSensitive: value };
			refreshAndEmit(0);
		},
		setQuery(value: string) {
			snapshot = { ...snapshot, query: value };
			refreshAndEmit(0);
		},
		setReplaceOpen(value: boolean) {
			setSnapshot((current) => ({ ...current, isReplaceOpen: value }));
		},
		setReplaceText(value: string) {
			setSnapshot((current) => ({ ...current, replaceText: value }));
		},
		setWholeWord(value: boolean) {
			snapshot = { ...snapshot, wholeWord: value };
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
