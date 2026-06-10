import * as React from "react";

import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import {
	createChatCatalogStore,
	deleteChatCatalogEntry,
	exportChatCatalogEntry,
	filterChatCatalogEntries,
	openChatCatalogEntry,
	renameChatCatalogEntry,
	sortChatCatalogEntries,
	type ChatCatalogStore,
	type DeleteChatCatalogEntry,
	type ExportChatCatalogEntry,
	type OpenChatCatalogEntry,
	type RenameChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import {
	ChatListExperience,
	type ChatListCopy,
} from "@/packages/features/astra-main-interface/chat-list/ChatListExperience";
import {
	persistStoredChatMenuPreviewLineCount,
	persistStoredChatMenuShowAvatars,
	persistStoredChatMenuSortMode,
	readStoredChatMenuPreviewLineCount,
	readStoredChatMenuShowAvatars,
	readStoredChatMenuSortMode,
} from "@/packages/features/astra-main-interface/chat-list/chatMenuDisplayPreferences";

export interface GlobalChatListPageProps {
	chatCatalogStore?: ChatCatalogStore;
	chatCategoryStore?: ChatCategoryStore;
	deleteChat?: DeleteChatCatalogEntry;
	exportChat?: ExportChatCatalogEntry;
	onRequestClose?: () => void;
	openChat?: OpenChatCatalogEntry;
	renameChat?: RenameChatCatalogEntry;
}

const GLOBAL_CHAT_LIST_COPY: ChatListCopy = {
	controlsDescription: "astraMainInterface.chatMenu.controls.description",
	controlsTitle: "astraMainInterface.chatMenu.controls.title",
	controlsTrigger: "astraMainInterface.chatMenu.controls.trigger",
	emptyDescription: "astraMainInterface.chatMenu.empty.description",
	emptySearch: "astraMainInterface.chatMenu.emptySearch",
	emptySearchDescription:
		"astraMainInterface.chatMenu.emptySearch.description",
	emptyTitle: "astraMainInterface.chatMenu.empty",
	listLabel: "astraMainInterface.chatMenu.listLabel",
	searchClear: "astraMainInterface.chatMenu.search.clear",
	searchLabel: "astraMainInterface.chatMenu.search.label",
	searchPlaceholder: "astraMainInterface.chatMenu.search.placeholder",
};

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

export function GlobalChatListPage({
	chatCatalogStore,
	chatCategoryStore,
	deleteChat = (entry) => deleteChatCatalogEntry(entry),
	exportChat = (entry, format) => exportChatCatalogEntry(entry, format),
	onRequestClose,
	openChat = (entry) => openChatCatalogEntry(entry),
	renameChat = (entry, newFileName) =>
		renameChatCatalogEntry(entry, newFileName),
}: GlobalChatListPageProps = {}) {
	const store = useChatCatalogStore(chatCatalogStore);

	return (
		<ChatListExperience
			chatCategoryStore={chatCategoryStore}
			copy={GLOBAL_CHAT_LIST_COPY}
			deleteChat={deleteChat}
			exportChat={exportChat}
			filterEntries={filterChatCatalogEntries}
			openChat={openChat}
			persistPreviewLineCount={persistStoredChatMenuPreviewLineCount}
			persistShowAvatars={persistStoredChatMenuShowAvatars}
			persistSortMode={persistStoredChatMenuSortMode}
			readPreviewLineCount={readStoredChatMenuPreviewLineCount}
			readShowAvatars={readStoredChatMenuShowAvatars}
			readSortMode={readStoredChatMenuSortMode}
			renameChat={renameChat}
			rowVariant="global"
			showAvatarToggle={true}
			sortEntries={sortChatCatalogEntries}
			store={store}
			onRequestClose={onRequestClose}
		/>
	);
}
