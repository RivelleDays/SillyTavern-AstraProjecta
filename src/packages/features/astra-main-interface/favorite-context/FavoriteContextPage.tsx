import * as React from "react";

import {
	AstraSmoothTabs,
	type AstraSmoothTabItem,
} from "@/components/ui/astra/smooth-tabs";
import { ScrollArea } from "@/components/ui/astra/scroll-area";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import {
	deleteChatCatalogEntry,
	exportChatCatalogEntry,
	openChatCatalogEntry,
	renameChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import type { CurrentChatCatalogStore } from "@/packages/core/st/current-chat-catalog";
import { ChatCategoryManagerPage } from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryUi";
import { ChatCatalogRowOverlays } from "@/packages/features/astra-main-interface/chat-list/ChatCatalogRowOverlays";
import { useChatCatalogEntryOpenController } from "@/packages/features/astra-main-interface/chat-list/useChatCatalogEntryOpenController";
import { useChatCatalogRowOverlayController } from "@/packages/features/astra-main-interface/chat-list/useChatCatalogRowOverlayController";
import {
	CurrentChatListPage,
	type CurrentChatListPageProps,
} from "@/packages/features/astra-main-interface/current-context/CurrentChatListPage";
import type { AstraMainInterfaceRouteDescriptor } from "@/packages/features/astra-main-interface/routes";
import type { I18nKey } from "@/types/i18n";

export type FavoriteContextTabValue = "favorite-categories" | "favorite-chats";

export const DEFAULT_FAVORITE_CONTEXT_TAB_VALUE: FavoriteContextTabValue =
	"favorite-chats";

const FAVORITE_CONTEXT_ROUTE_DESCRIPTORS = [
	{
		key: "favorite-character-chats",
		tabValue: "favorite-chats",
		titleKey: "astraMainInterface.favorite.tabs.chats" as I18nKey,
	},
	{
		key: "favorite-character-categories",
		tabValue: "favorite-categories",
		titleKey: "astraMainInterface.favorite.tabs.categories" as I18nKey,
	},
	{
		key: "favorite-group-chats",
		tabValue: "favorite-chats",
		titleKey: "astraMainInterface.favorite.tabs.chats" as I18nKey,
	},
	{
		key: "favorite-group-categories",
		tabValue: "favorite-categories",
		titleKey: "astraMainInterface.favorite.tabs.categories" as I18nKey,
	},
] as const satisfies readonly (AstraMainInterfaceRouteDescriptor & {
	tabValue: FavoriteContextTabValue;
})[];

export interface FavoriteContextPageProps extends CurrentChatListPageProps {
	activeTab: FavoriteContextTabValue;
	chatCategoryStore: ChatCategoryStore;
	currentChatCatalogStore: CurrentChatCatalogStore;
	listFramePortalTarget?: HTMLElement | null;
	onActiveTabChange(value: FavoriteContextTabValue): void;
}

function isFavoriteContextTabValue(
	value: string,
): value is FavoriteContextTabValue {
	return value === "favorite-categories" || value === "favorite-chats";
}

export function getFavoriteContextRoutes(): AstraMainInterfaceRouteDescriptor[] {
	return FAVORITE_CONTEXT_ROUTE_DESCRIPTORS.map(({ key, titleKey }) => ({
		key,
		titleKey,
	}));
}

export function getFavoriteContextRouteKey({
	kind,
	value,
}: {
	kind: "character" | "group";
	value: FavoriteContextTabValue;
}) {
	return (
		FAVORITE_CONTEXT_ROUTE_DESCRIPTORS.find(
			(descriptor) =>
				descriptor.tabValue === value &&
				descriptor.key.startsWith(`favorite-${kind}-`),
		)?.key ?? `favorite-${kind}-chats`
	);
}

function handleFavoriteTabPanelWheel(event: React.WheelEvent<HTMLDivElement>) {
	if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
		event.stopPropagation();
	}
}

function FavoriteTabPanelScroll({ children }: { children: React.ReactNode }) {
	return (
		<ScrollArea.Root
			className="astra-main-interface__tab-scroll-area"
			data-astra-scroll-affordance="surface"
		>
			<ScrollArea.Viewport
				className="astra-main-interface__tab-scroll-viewport"
				data-astra-scroll-axis="vertical"
				style={{
					overflowX: "hidden",
					overflowY: "scroll",
					touchAction: "pan-y",
				}}
				onWheel={handleFavoriteTabPanelWheel}
			>
				<ScrollArea.Content
					className="astra-main-interface__tab-scroll-content"
					data-astra-scroll-content-width="bounded"
					style={{
						minWidth: 0,
						width: "100%",
					}}
				>
					{children}
				</ScrollArea.Content>
			</ScrollArea.Viewport>
			<ScrollArea.Scrollbar
				className="astra-main-interface__tab-scrollbar"
				data-astra-smooth-tabs-swipe-ignore={true}
				keepMounted={true}
				orientation="vertical"
			>
				<ScrollArea.Thumb />
			</ScrollArea.Scrollbar>
			<ScrollArea.Corner />
		</ScrollArea.Root>
	);
}

function FavoriteContextCategoriesPage({
	chatCategoryStore,
	currentChatCatalogStore,
	deleteCurrentChat = (entry) => deleteChatCatalogEntry(entry),
	exportCurrentChat = (entry, format) =>
		exportChatCatalogEntry(entry, format),
	onRequestClose,
	openCurrentChat = (entry) => openChatCatalogEntry(entry),
	renameCurrentChat = (entry, newFileName) =>
		renameChatCatalogEntry(entry, newFileName),
}: {
	chatCategoryStore: ChatCategoryStore;
	currentChatCatalogStore: CurrentChatCatalogStore;
	deleteCurrentChat?: FavoriteContextPageProps["deleteCurrentChat"];
	exportCurrentChat?: FavoriteContextPageProps["exportCurrentChat"];
	onRequestClose?: () => void;
	openCurrentChat?: FavoriteContextPageProps["openCurrentChat"];
	renameCurrentChat?: FavoriteContextPageProps["renameCurrentChat"];
}) {
	const snapshot = React.useSyncExternalStore(
		currentChatCatalogStore.subscribe,
		currentChatCatalogStore.getSnapshot,
		currentChatCatalogStore.getSnapshot,
	);
	const ownerScope = snapshot.activeEntity
		? {
				label: snapshot.activeEntity.entityName,
				ownerId: snapshot.activeEntity.entityId,
				ownerType: snapshot.activeEntity.kind,
			}
		: null;
	const {
		openEntry: openCurrentChatWithFeedback,
		openError,
		openingKey,
	} = useChatCatalogEntryOpenController({
		onOpenSuccess: () => {
			currentChatCatalogStore.refresh();
		},
		onRequestClose,
		openEntry: openCurrentChat,
	});
	const rowOverlayController = useChatCatalogRowOverlayController();

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
				ownerScope={ownerScope}
				variant="favorite"
				onOpenChatActions={rowOverlayController.openActions}
				onOpenEntry={openCurrentChatWithFeedback}
			/>
			<ChatCatalogRowOverlays
				chatCategoryStore={chatCategoryStore}
				controller={rowOverlayController}
				deleteChat={deleteCurrentChat}
				exportChat={exportCurrentChat}
				openEntry={openCurrentChatWithFeedback}
				openEntryDisabled={openingKey !== null}
				renameChat={renameCurrentChat}
				onSuccess={() => {
					currentChatCatalogStore.refresh();
				}}
			/>
		</>
	);
}

export function FavoriteContextPage({
	activeTab,
	chatCategoryStore,
	currentChatCatalogStore,
	listFramePortalTarget,
	onActiveTabChange,
	...chatListProps
}: FavoriteContextPageProps) {
	const items: AstraSmoothTabItem<FavoriteContextTabValue>[] = [
		{
			content: (
				<FavoriteTabPanelScroll>
					<div
						className="astra-main-interface__tab-panel"
						data-route="favorite-chats"
					>
						<CurrentChatListPage
							{...chatListProps}
							chatCategoryStore={chatCategoryStore}
							copyVariant="favorite"
							currentChatCatalogStore={currentChatCatalogStore}
						/>
					</div>
				</FavoriteTabPanelScroll>
			),
			label: translateAstra("astraMainInterface.favorite.tabs.chats"),
			panelProps: {
				"data-route": "favorite-chats",
			},
			value: "favorite-chats",
		},
		{
			content: (
				<FavoriteTabPanelScroll>
					<div
						className="astra-main-interface__tab-panel astra-main-interface__tab-panel--categories"
						data-route="favorite-categories"
					>
						<FavoriteContextCategoriesPage
							chatCategoryStore={chatCategoryStore}
							currentChatCatalogStore={currentChatCatalogStore}
							deleteCurrentChat={chatListProps.deleteCurrentChat}
							exportCurrentChat={chatListProps.exportCurrentChat}
							onRequestClose={chatListProps.onRequestClose}
							openCurrentChat={chatListProps.openCurrentChat}
							renameCurrentChat={chatListProps.renameCurrentChat}
						/>
					</div>
				</FavoriteTabPanelScroll>
			),
			label: translateAstra(
				"astraMainInterface.favorite.tabs.categories",
			),
			panelClassName:
				"astra-main-interface__category-tab-panel astra-main-interface__favorite-category-tab-panel",
			panelProps: {
				"data-route": "favorite-categories",
			},
			value: "favorite-categories",
		},
	];
	const handleTabChange = React.useCallback(
		(nextValue: string) => {
			if (!isFavoriteContextTabValue(nextValue)) {
				return;
			}

			onActiveTabChange(nextValue);
		},
		[onActiveTabChange],
	);

	return (
		<AstraSmoothTabs
			ariaLabel={translateAstra("astraMainInterface.favorite.tabs.label")}
			className="astra-main-interface__secondary-tabs astra-main-interface__favorite-tabs"
			items={items}
			listFramePortalTarget={listFramePortalTarget}
			value={activeTab}
			viewportMode="fill"
			onValueChange={handleTabChange}
		/>
	);
}
