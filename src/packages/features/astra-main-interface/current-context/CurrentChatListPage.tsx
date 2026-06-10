import * as React from "react";

import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import {
	deleteChatCatalogEntry,
	exportChatCatalogEntry,
	openChatCatalogEntry,
	renameChatCatalogEntry,
	type DeleteChatCatalogEntry,
	type ExportChatCatalogEntry,
	type OpenChatCatalogEntry,
	type RenameChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import {
	createCurrentChatCatalogStore,
	filterCurrentChatCatalogEntries,
	sortCurrentChatCatalogEntries,
	type CurrentChatCatalogStore,
} from "@/packages/core/st/current-chat-catalog";
import {
	ChatListExperience,
	type ChatListCopy,
} from "@/packages/features/astra-main-interface/chat-list/ChatListExperience";
import {
	persistStoredCurrentChatMenuShowAvatars,
	persistStoredCurrentChatMenuPreviewLineCount,
	persistStoredCurrentChatMenuSortMode,
	readStoredCurrentChatMenuShowAvatars,
	readStoredCurrentChatMenuPreviewLineCount,
	readStoredCurrentChatMenuSortMode,
} from "@/packages/features/astra-main-interface/chat-list/chatMenuDisplayPreferences";

export type CurrentChatListCopyVariant = "current-context" | "favorite";

const CURRENT_CHAT_LIST_COPY: Record<CurrentChatListCopyVariant, ChatListCopy> =
	{
		"current-context": {
			controlsDescription:
				"astraMainInterface.currentContext.chats.controls.description",
			controlsTitle:
				"astraMainInterface.currentContext.chats.controls.title",
			controlsTrigger:
				"astraMainInterface.currentContext.chats.controls.trigger",
			emptyDescription:
				"astraMainInterface.currentContext.chats.empty.description",
			emptySearch: "astraMainInterface.currentContext.chats.emptySearch",
			emptySearchDescription:
				"astraMainInterface.currentContext.chats.emptySearch.description",
			emptyTitle: "astraMainInterface.currentContext.chats.empty.title",
			listLabel: "astraMainInterface.currentContext.chats.listLabel",
			searchClear: "astraMainInterface.currentContext.chats.search.clear",
			searchLabel: "astraMainInterface.currentContext.chats.search.label",
			searchPlaceholder:
				"astraMainInterface.currentContext.chats.search.placeholder",
		},
		favorite: {
			controlsDescription:
				"astraMainInterface.favorite.chats.controls.description",
			controlsTitle: "astraMainInterface.favorite.chats.controls.title",
			controlsTrigger:
				"astraMainInterface.favorite.chats.controls.trigger",
			emptyDescription:
				"astraMainInterface.favorite.chats.empty.description",
			emptySearch: "astraMainInterface.favorite.chats.emptySearch",
			emptySearchDescription:
				"astraMainInterface.favorite.chats.emptySearch.description",
			emptyTitle: "astraMainInterface.favorite.chats.empty.title",
			listLabel: "astraMainInterface.favorite.chats.listLabel",
			searchClear: "astraMainInterface.favorite.chats.search.clear",
			searchLabel: "astraMainInterface.favorite.chats.search.label",
			searchPlaceholder:
				"astraMainInterface.favorite.chats.search.placeholder",
		},
	};

export interface CurrentChatListPageProps {
	chatCategoryStore?: ChatCategoryStore;
	copyVariant?: CurrentChatListCopyVariant;
	currentChatCatalogStore?: CurrentChatCatalogStore;
	deleteCurrentChat?: DeleteChatCatalogEntry;
	exportCurrentChat?: ExportChatCatalogEntry;
	onRequestClose?: () => void;
	openCurrentChat?: OpenChatCatalogEntry;
	renameCurrentChat?: RenameChatCatalogEntry;
}

function useCurrentChatCatalogStore(injectedStore?: CurrentChatCatalogStore) {
	const store = React.useMemo(
		() => injectedStore ?? createCurrentChatCatalogStore(),
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

export function CurrentChatListPage({
	chatCategoryStore,
	copyVariant = "current-context",
	currentChatCatalogStore,
	deleteCurrentChat = (entry) => deleteChatCatalogEntry(entry),
	exportCurrentChat = (entry, format) =>
		exportChatCatalogEntry(entry, format),
	onRequestClose,
	openCurrentChat = (entry) => openChatCatalogEntry(entry),
	renameCurrentChat = (entry, newFileName) =>
		renameChatCatalogEntry(entry, newFileName),
}: CurrentChatListPageProps = {}) {
	const store = useCurrentChatCatalogStore(currentChatCatalogStore);

	return (
		<ChatListExperience
			chatCategoryStore={chatCategoryStore}
			copy={CURRENT_CHAT_LIST_COPY[copyVariant]}
			deleteChat={deleteCurrentChat}
			exportChat={exportCurrentChat}
			filterEntries={filterCurrentChatCatalogEntries}
			listClassName="astra-main-interface__current-chat-list"
			listItemClassName="astra-main-interface__current-chat-list-item"
			openChat={openCurrentChat}
			persistPreviewLineCount={
				persistStoredCurrentChatMenuPreviewLineCount
			}
			persistShowAvatars={persistStoredCurrentChatMenuShowAvatars}
			persistSortMode={persistStoredCurrentChatMenuSortMode}
			readPreviewLineCount={readStoredCurrentChatMenuPreviewLineCount}
			readShowAvatars={readStoredCurrentChatMenuShowAvatars}
			readSortMode={readStoredCurrentChatMenuSortMode}
			refreshOnExportSuccess={true}
			refreshOnOpenSuccess={true}
			renameChat={renameCurrentChat}
			rowVariant="current"
			showAvatarToggle={true}
			sortEntries={sortCurrentChatCatalogEntries}
			store={store}
			onRequestClose={onRequestClose}
		/>
	);
}
