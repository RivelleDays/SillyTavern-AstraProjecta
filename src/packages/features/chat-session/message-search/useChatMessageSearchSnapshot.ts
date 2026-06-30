import * as React from "react";

import type {
	ChatMessageSearchSnapshot,
	ChatMessageSearchStore,
} from "@/packages/features/chat-session/message-search/store";

export function useChatMessageSearchSnapshot(
	store: ChatMessageSearchStore,
): ChatMessageSearchSnapshot {
	return React.useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot,
	);
}
