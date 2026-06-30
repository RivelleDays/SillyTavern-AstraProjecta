import { batchSaveChatMessageTextEdits } from "@/packages/core/st/chatMessageEdit";
import {
	isRecord,
	readContextSafe,
	resolveEventTypes,
	type EventSourceLike,
	type EventTypesLike,
} from "@/packages/core/st/shared";
import {
	createChatMessageSearchStore,
	type ChatMessageSearchPreferences,
	type ChatMessageSearchStore,
	type ChatMessageSearchStoreSaveTextEdits,
	type ChatMessageSearchStoreTextEdit,
} from "@/packages/features/chat-session/message-search/store";
import type { ChatMessageSearchMessage } from "@/packages/features/chat-session/message-search/matching";

type ChatMessageSearchContextLike = Record<string, unknown> & {
	chat?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
};

type ChatMessageSearchMessageLike = Record<string, unknown> & {
	mes?: unknown;
	swipe_id?: unknown;
	swipes?: unknown;
};

export interface CreateDefaultChatMessageSearchStoreOptions {
	documentRef?: Document;
}

export const CHAT_MESSAGE_SEARCH_CASE_SENSITIVE_STORAGE_KEY =
	"astra_projecta.chat_message_search.case_sensitive";
export const CHAT_MESSAGE_SEARCH_WHOLE_WORD_STORAGE_KEY =
	"astra_projecta.chat_message_search.whole_word";
export const CHAT_MESSAGE_SEARCH_REPLACE_VISIBLE_STORAGE_KEY =
	"astra_projecta.chat_message_search.replace_visible";

function resolveChatMessageSearchPreferenceStorage(
	documentRef?: Document,
): Storage | null {
	try {
		if (documentRef?.defaultView?.localStorage) {
			return documentRef.defaultView.localStorage;
		}

		return typeof window === "undefined" ? null : window.localStorage;
	} catch {
		return null;
	}
}

function readStoredBooleanPreference(
	storage: Storage | null | undefined,
	key: string,
	fallbackValue: boolean,
): boolean {
	if (!storage) {
		return fallbackValue;
	}

	try {
		const storedValue = storage.getItem(key);
		if (storedValue === "true") {
			return true;
		}

		if (storedValue === "false") {
			return false;
		}
	} catch {
		return fallbackValue;
	}

	return fallbackValue;
}

function persistStoredBooleanPreference(
	storage: Storage | null | undefined,
	key: string,
	value: boolean,
): void {
	if (!storage) {
		return;
	}

	try {
		storage.setItem(key, String(value));
	} catch {
		// Keep the in-memory preference active when browser storage is blocked.
	}
}

export function readStoredChatMessageSearchPreferences(
	storage: Storage | null | undefined,
): ChatMessageSearchPreferences {
	return {
		caseSensitive: readStoredBooleanPreference(
			storage,
			CHAT_MESSAGE_SEARCH_CASE_SENSITIVE_STORAGE_KEY,
			false,
		),
		replaceVisible: readStoredBooleanPreference(
			storage,
			CHAT_MESSAGE_SEARCH_REPLACE_VISIBLE_STORAGE_KEY,
			false,
		),
		wholeWord: readStoredBooleanPreference(
			storage,
			CHAT_MESSAGE_SEARCH_WHOLE_WORD_STORAGE_KEY,
			false,
		),
	};
}

export function persistStoredChatMessageSearchPreferences(
	storage: Storage | null | undefined,
	preferences: ChatMessageSearchPreferences,
): void {
	persistStoredBooleanPreference(
		storage,
		CHAT_MESSAGE_SEARCH_CASE_SENSITIVE_STORAGE_KEY,
		preferences.caseSensitive,
	);
	persistStoredBooleanPreference(
		storage,
		CHAT_MESSAGE_SEARCH_WHOLE_WORD_STORAGE_KEY,
		preferences.wholeWord,
	);
	persistStoredBooleanPreference(
		storage,
		CHAT_MESSAGE_SEARCH_REPLACE_VISIBLE_STORAGE_KEY,
		preferences.replaceVisible,
	);
}

function readActiveMessage(
	message: ChatMessageSearchMessageLike,
): Pick<ChatMessageSearchMessage, "mes" | "swipeId"> {
	const swipeId = message.swipe_id;
	if (
		typeof swipeId === "number" &&
		Number.isInteger(swipeId) &&
		Array.isArray(message.swipes) &&
		typeof message.swipes[swipeId] === "string"
	) {
		return {
			mes: message.swipes[swipeId],
			swipeId,
		};
	}

	return {
		mes: typeof message.mes === "string" ? message.mes : "",
		swipeId: null,
	};
}

export function readCurrentChatMessageSearchMessages(): ChatMessageSearchMessage[] {
	const context = readContextSafe<ChatMessageSearchContextLike>();
	const chat = Array.isArray(context?.chat) ? context.chat : [];

	return chat.map((message, messageId) => {
		const activeMessage = isRecord(message)
			? readActiveMessage(message as ChatMessageSearchMessageLike)
			: { mes: "", swipeId: null };

		return {
			...activeMessage,
			messageId,
		};
	});
}

export const saveCurrentChatMessageSearchTextEdits: ChatMessageSearchStoreSaveTextEdits =
	async ({ edits }: { edits: ChatMessageSearchStoreTextEdit[] }) =>
		batchSaveChatMessageTextEdits({ edits });

export function subscribeToCurrentChatMessageSearchChanges(
	listener: () => void,
): () => void {
	const context = readContextSafe<ChatMessageSearchContextLike>();
	const eventSource = context?.eventSource;
	if (!eventSource) {
		return () => undefined;
	}

	const eventTypes = resolveEventTypes(context);
	const events = [eventTypes.CHAT_CHANGED, eventTypes.CHAT_LOADED].filter(
		(eventName): eventName is string => typeof eventName === "string",
	);

	for (const eventName of events) {
		eventSource.on(eventName, listener);
	}

	return () => {
		for (const eventName of events) {
			eventSource.removeListener(eventName, listener);
		}
	};
}

export function createDefaultChatMessageSearchStore(
	options: CreateDefaultChatMessageSearchStoreOptions = {},
): ChatMessageSearchStore {
	const preferenceStorage = resolveChatMessageSearchPreferenceStorage(
		options.documentRef,
	);

	return createChatMessageSearchStore({
		initialPreferences:
			readStoredChatMessageSearchPreferences(preferenceStorage),
		onPreferencesChange: (preferences) => {
			persistStoredChatMessageSearchPreferences(
				preferenceStorage,
				preferences,
			);
		},
		readMessages: readCurrentChatMessageSearchMessages,
		saveTextEdits: saveCurrentChatMessageSearchTextEdits,
		subscribeToChatChanges: subscribeToCurrentChatMessageSearchChanges,
	});
}
