import * as React from "react";

import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import {
	createChatCatalogStore,
	deleteChatCatalogEntry,
	exportChatCatalogEntry,
	openChatCatalogEntry,
	renameChatCatalogEntry,
	type ChatCatalogStore,
	type DeleteChatCatalogEntry,
	type ExportChatCatalogEntry,
	type OpenChatCatalogEntry,
	type RenameChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import {
	ChatCategoryManagerPage,
	GLOBAL_CATEGORY_TREE_INDENT,
} from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryUi";
import { ChatCatalogRowOverlays } from "@/packages/features/astra-main-interface/chat-list/ChatCatalogRowOverlays";
import { useChatCatalogRowOverlayController } from "@/packages/features/astra-main-interface/chat-list/useChatCatalogRowOverlayController";
import { useChatCatalogEntryOpenController } from "@/packages/features/astra-main-interface/chat-list/useChatCatalogEntryOpenController";

export { GLOBAL_CATEGORY_TREE_INDENT };

export interface GlobalChatCategoriesPageProps {
	chatCatalogStore?: ChatCatalogStore;
	chatCategoryStore: ChatCategoryStore;
	deleteChat?: DeleteChatCatalogEntry;
	exportChat?: ExportChatCatalogEntry;
	onRequestClose?: () => void;
	openChat?: OpenChatCatalogEntry;
	renameChat?: RenameChatCatalogEntry;
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
	deleteChat = (entry) => deleteChatCatalogEntry(entry),
	exportChat = (entry, format) => exportChatCatalogEntry(entry, format),
	onRequestClose,
	openChat = (entry) => openChatCatalogEntry(entry),
	renameChat = (entry, newFileName) =>
		renameChatCatalogEntry(entry, newFileName),
}: GlobalChatCategoriesPageProps) {
	const store = useChatCatalogStore(chatCatalogStore);
	const rowOverlayController = useChatCatalogRowOverlayController();
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
				activeChatActionsEntryKey={
					rowOverlayController.activeActionsEntryKey
				}
				chatCategoryStore={chatCategoryStore}
				entries={snapshot.entries}
				isLoading={snapshot.status === "loading"}
				openEntryDisabled={openingKey !== null}
				variant="global"
				onOpenChatActions={rowOverlayController.openActions}
				onOpenEntry={openChatWithFeedback}
			/>
			<ChatCatalogRowOverlays
				chatCategoryStore={chatCategoryStore}
				controller={rowOverlayController}
				deleteChat={deleteChat}
				exportChat={exportChat}
				openEntry={openChatWithFeedback}
				openEntryDisabled={openingKey !== null}
				renameChat={renameChat}
				onSuccess={() => {
					store.refresh();
				}}
			/>
		</>
	);
}
