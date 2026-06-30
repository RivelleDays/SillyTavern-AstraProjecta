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
	lastReplaceFailureReason: string | null;
	matchCount: number;
	matches: ChatMessageSearchMatch[];
	query: string;
	replaceVisible: boolean;
	replaceText: string;
	wholeWord: boolean;
}

export interface ChatMessageSearchPreferences {
	caseSensitive: boolean;
	replaceVisible: boolean;
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
	setReplaceVisible(value: boolean): void;
	setReplaceText(value: string): void;
	setWholeWord(value: boolean): void;
	subscribe(listener: Listener): () => void;
	undo(): Promise<boolean>;
}

export interface CreateChatMessageSearchStoreOptions {
	initialPreferences?: Partial<ChatMessageSearchPreferences>;
	onPreferencesChange?: (preferences: ChatMessageSearchPreferences) => void;
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

const DEFAULT_SAVE_TEXT_EDITS: ChatMessageSearchStoreSaveTextEdits =
	async () => ({
		ok: false,
		reason: "api-unavailable",
	});
const DEFAULT_SEARCH_PREFERENCES: ChatMessageSearchPreferences = {
	caseSensitive: false,
	replaceVisible: false,
	wholeWord: false,
};
const REPLACE_FAILURE_LOG_PREFIX =
	"[AstraProjecta] Chat message replacement failed.";

function normalizeSearchPreferences(
	preferences: Partial<ChatMessageSearchPreferences> | undefined,
): ChatMessageSearchPreferences {
	return {
		caseSensitive: preferences?.caseSensitive === true,
		replaceVisible: preferences?.replaceVisible === true,
		wholeWord: preferences?.wholeWord === true,
	};
}

function createEmptySnapshot(
	preferences: ChatMessageSearchPreferences = DEFAULT_SEARCH_PREFERENCES,
): ChatMessageSearchSnapshot {
	return {
		activeMatch: null,
		activeMatchIndex: -1,
		canNavigate: false,
		canRedo: false,
		canReplace: false,
		canUndo: false,
		caseSensitive: preferences.caseSensitive,
		isBusy: false,
		isOpen: false,
		lastReplaceFailureReason: null,
		matchCount: 0,
		matches: [],
		query: "",
		replaceVisible: preferences.replaceVisible,
		replaceText: "",
		wholeWord: preferences.wholeWord,
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
	return {
		caseSensitive: snapshot.caseSensitive,
		wholeWord: snapshot.wholeWord,
	};
}

function logReplaceFailure(reason: string): void {
	console.warn(REPLACE_FAILURE_LOG_PREFIX, reason);
}

export function createChatMessageSearchStore({
	initialPreferences,
	onPreferencesChange,
	readMessages = () => [],
	saveTextEdits = DEFAULT_SAVE_TEXT_EDITS,
	subscribeToChatChanges,
}: CreateChatMessageSearchStoreOptions = {}): ChatMessageSearchStore {
	const listeners = new Set<Listener>();
	let preferences = normalizeSearchPreferences(initialPreferences);
	let disposed = false;
	let messages: ChatMessageSearchMessage[] = [];
	let snapshot = createEmptySnapshot(preferences);
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
		updater: (
			current: ChatMessageSearchSnapshot,
		) => ChatMessageSearchSnapshot,
	): void {
		snapshot = updater(snapshot);
		emit();
	}

	function recomputeMatches(
		activeMatchIndex = snapshot.activeMatchIndex,
	): void {
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

	function refreshAndEmit(
		activeMatchIndex = snapshot.activeMatchIndex,
	): void {
		recomputeMatches(activeMatchIndex);
		emit();
	}

	function resetSession(nextOpen: boolean): void {
		undoStack = [];
		redoStack = [];
		snapshot = {
			...createEmptySnapshot(preferences),
			isOpen: nextOpen,
		};
		messages = [];
		if (nextOpen) {
			recomputeMatches(0);
		}
		emit();
	}

	function notifyPreferencesChange(): void {
		onPreferencesChange?.({ ...preferences });
	}

	function updatePreferences(
		nextPreferences: ChatMessageSearchPreferences,
		shouldRecomputeMatches: boolean,
	): void {
		preferences = nextPreferences;
		snapshot = {
			...snapshot,
			caseSensitive: preferences.caseSensitive,
			lastReplaceFailureReason: null,
			replaceVisible: preferences.replaceVisible,
			wholeWord: preferences.wholeWord,
		};
		notifyPreferencesChange();

		if (shouldRecomputeMatches) {
			refreshAndEmit(0);
			return;
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
			if (snapshot.matches.length === 0) {
				return false;
			}

			const groups = new Map<
				string,
				{
					matches: ChatMessageSearchMatch[];
					messageId: number;
					swipeId: number | null;
				}
			>();
			for (const match of snapshot.matches) {
				const key = `${match.messageId}:${match.swipeId}`;
				const existing = groups.get(key);
				if (existing) {
					existing.matches.push(match);
				} else {
					groups.set(key, {
						matches: [match],
						messageId: match.messageId,
						swipeId: match.swipeId,
					});
				}
			}

			const operation: ReplacementOperation = [];
			for (const {
				matches: groupMatches,
				messageId,
				swipeId,
			} of groups.values()) {
				const before = findMessageText(messages, messageId, swipeId);
				if (before === null) {
					continue;
				}

				let after = before;
				for (const match of [...groupMatches].sort(
					(left, right) => right.start - left.start,
				)) {
					after = replaceRange({
						end: match.end,
						replacement: snapshot.replaceText,
						start: match.start,
						text: after,
					});
				}

				if (after !== before) {
					operation.push({ after, before, messageId, swipeId });
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
			updatePreferences(
				{
					...preferences,
					caseSensitive: value,
				},
				true,
			);
		},
		setQuery(value: string) {
			snapshot = {
				...snapshot,
				lastReplaceFailureReason: null,
				query: value,
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
		setReplaceVisible(value: boolean) {
			updatePreferences(
				{
					...preferences,
					replaceVisible: value,
				},
				false,
			);
		},
		setWholeWord(value: boolean) {
			updatePreferences(
				{
					...preferences,
					wholeWord: value,
				},
				true,
			);
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
