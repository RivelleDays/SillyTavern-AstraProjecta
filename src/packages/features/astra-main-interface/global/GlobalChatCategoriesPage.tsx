import * as React from "react";

import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import {
	createChatCatalogStore,
	openChatCatalogEntry,
	type ChatCatalogStore,
	type OpenChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import {
	ChatCategoryManagerPage,
	GLOBAL_CATEGORY_TREE_INDENT,
} from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryUi";
import { useChatCatalogEntryOpenController } from "@/packages/features/astra-main-interface/chat-list/useChatCatalogEntryOpenController";

export { GLOBAL_CATEGORY_TREE_INDENT };

export interface GlobalChatCategoriesPageProps {
	chatCatalogStore?: ChatCatalogStore;
	chatCategoryStore: ChatCategoryStore;
	onRequestClose?: () => void;
	openChat?: OpenChatCatalogEntry;
}

function useChatCatalogStore(injectedStore?: ChatCatalogStore) {
	const store = React.useMemo(
		() => injectedStore ?? createChatCatalogStore(),
		[injectedStore],
	);

	React.useEffect(() => {
		if (injectedStore) {
			return undefined;
		}

		return () => {
			store.dispose();
		};
	}, [injectedStore, store]);

	return store;
}

export function GlobalChatCategoriesPage({
	chatCatalogStore,
	chatCategoryStore,
	onRequestClose,
	openChat = (entry) => openChatCatalogEntry(entry),
}: GlobalChatCategoriesPageProps) {
	const store = useChatCatalogStore(chatCatalogStore);
	const snapshot = React.useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot,
	);
	const {
		openEntry: openChatWithFeedback,
		openError,
		openingKey,
	} = useChatCatalogEntryOpenController({
		onRequestClose,
		openEntry: openChat,
	});

	return (
		<>
			{openError ? (
				<div
					className="astra-main-interface__inline-error"
					role="alert"
				>
					{openError}
				</div>
			) : null}
			<ChatCategoryManagerPage
				chatCategoryStore={chatCategoryStore}
				entries={snapshot.entries}
				isLoading={snapshot.status === "loading"}
				openEntryDisabled={openingKey !== null}
				variant="global"
				onOpenEntry={openChatWithFeedback}
			/>
		</>
	);
}
