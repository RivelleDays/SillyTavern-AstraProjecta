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

function readActiveMessageText(message: ChatMessageSearchMessageLike): string {
	const swipeId = message.swipe_id;
	if (
		typeof swipeId === "number" &&
		Number.isInteger(swipeId) &&
		Array.isArray(message.swipes) &&
		typeof message.swipes[swipeId] === "string"
	) {
		return message.swipes[swipeId];
	}

	return typeof message.mes === "string" ? message.mes : "";
}

export function readCurrentChatMessageSearchMessages(): ChatMessageSearchMessage[] {
	const context = readContextSafe<ChatMessageSearchContextLike>();
	const chat = Array.isArray(context?.chat) ? context.chat : [];

	return chat.map((message, messageId) => ({
		mes: isRecord(message)
			? readActiveMessageText(message as ChatMessageSearchMessageLike)
			: "",
		messageId,
	}));
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
	_options: CreateDefaultChatMessageSearchStoreOptions = {},
): ChatMessageSearchStore {
	return createChatMessageSearchStore({
		readMessages: readCurrentChatMessageSearchMessages,
		saveTextEdits: saveCurrentChatMessageSearchTextEdits,
		subscribeToChatChanges: subscribeToCurrentChatMessageSearchChanges,
	});
}
