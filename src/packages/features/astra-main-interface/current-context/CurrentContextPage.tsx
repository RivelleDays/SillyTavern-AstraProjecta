import * as React from "react";

import {
	AstraSmoothTabs,
	type AstraSmoothTabItem,
} from "@/components/ui/astra/smooth-tabs";
import { ScrollArea } from "@/components/ui/astra/scroll-area";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import {
	createCurrentChatCatalogStore,
	type CurrentChatCatalogStore,
} from "@/packages/core/st/current-chat-catalog";
import { openChatCatalogEntry } from "@/packages/core/st/chat-catalog";
import { ChatCategoryManagerPage } from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryUi";
import {
	CurrentChatListPage,
	type CurrentChatListPageProps,
} from "@/packages/features/astra-main-interface/current-context/CurrentChatListPage";
import type { AstraMainInterfaceRouteDescriptor } from "@/packages/features/astra-main-interface/routes";
import { useChatCatalogEntryOpenController } from "@/packages/features/astra-main-interface/chat-list/useChatCatalogEntryOpenController";
import type { I18nKey } from "@/types/i18n";

export type CurrentContextTabValue = "current-categories" | "current-chats";

export const DEFAULT_CURRENT_CONTEXT_TAB_VALUE: CurrentContextTabValue =
	"current-chats";

const CURRENT_CONTEXT_ROUTE_DESCRIPTORS = [
	{
		key: "current-context-chats",
		tabValue: "current-chats",
		titleKey: "astraMainInterface.currentContext.tabs.chats" as I18nKey,
	},
	{
		key: "current-context-categories",
		tabValue: "current-categories",
		titleKey:
			"astraMainInterface.currentContext.tabs.categories" as I18nKey,
	},
] as const satisfies readonly (AstraMainInterfaceRouteDescriptor & {
	tabValue: CurrentContextTabValue;
})[];

export interface CurrentContextPageProps extends CurrentChatListPageProps {
	activeTab: CurrentContextTabValue;
	chatCategoryStore: ChatCategoryStore;
	listFramePortalTarget?: HTMLElement | null;
	onActiveTabChange(value: CurrentContextTabValue): void;
}

function isCurrentContextTabValue(
	value: string,
): value is CurrentContextTabValue {
	return value === "current-categories" || value === "current-chats";
}

export function getCurrentContextRoutes(): AstraMainInterfaceRouteDescriptor[] {
	return CURRENT_CONTEXT_ROUTE_DESCRIPTORS.map(({ key, titleKey }) => ({
		key,
		titleKey,
	}));
}

export function getCurrentContextRouteKey(value: CurrentContextTabValue) {
	return (
		CURRENT_CONTEXT_ROUTE_DESCRIPTORS.find(
			(descriptor) => descriptor.tabValue === value,
		)?.key ?? CURRENT_CONTEXT_ROUTE_DESCRIPTORS[0].key
	);
}

function handleCurrentTabPanelWheel(event: React.WheelEvent<HTMLDivElement>) {
	if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
		event.stopPropagation();
	}
}

function CurrentTabPanelScroll({ children }: { children: React.ReactNode }) {
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
				onWheel={handleCurrentTabPanelWheel}
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

function useCurrentPageChatCatalogStore(
	injectedStore?: CurrentChatCatalogStore,
) {
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

function CurrentContextCategoriesPage({
	chatCategoryStore,
	currentChatCatalogStore,
	onRequestClose,
	openCurrentChat = (entry) => openChatCatalogEntry(entry),
}: {
	chatCategoryStore: ChatCategoryStore;
	currentChatCatalogStore: CurrentChatCatalogStore;
	onRequestClose?: () => void;
	openCurrentChat?: CurrentContextPageProps["openCurrentChat"];
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
				ownerScope={ownerScope}
				variant="current"
				onOpenEntry={openCurrentChatWithFeedback}
			/>
		</>
	);
}

export function CurrentContextPage({
	activeTab,
	chatCategoryStore,
	currentChatCatalogStore,
	listFramePortalTarget,
	onActiveTabChange,
	...chatListProps
}: CurrentContextPageProps) {
	const resolvedCurrentChatCatalogStore = useCurrentPageChatCatalogStore(
		currentChatCatalogStore,
	);
	const items: AstraSmoothTabItem<CurrentContextTabValue>[] = [
		{
			content: (
				<CurrentTabPanelScroll>
					<div
						className="astra-main-interface__tab-panel"
						data-route="current-context-chats"
					>
						<CurrentChatListPage
							{...chatListProps}
							chatCategoryStore={chatCategoryStore}
							currentChatCatalogStore={
								resolvedCurrentChatCatalogStore
							}
						/>
					</div>
				</CurrentTabPanelScroll>
			),
			label: translateAstra(
				"astraMainInterface.currentContext.tabs.chats",
			),
			panelProps: {
				"data-route": "current-context-chats",
			},
			value: "current-chats",
		},
		{
			content: (
				<CurrentTabPanelScroll>
					<div
						className="astra-main-interface__tab-panel astra-main-interface__tab-panel--categories"
						data-route="current-context-categories"
					>
						<CurrentContextCategoriesPage
							chatCategoryStore={chatCategoryStore}
							currentChatCatalogStore={
								resolvedCurrentChatCatalogStore
							}
							onRequestClose={chatListProps.onRequestClose}
							openCurrentChat={chatListProps.openCurrentChat}
						/>
					</div>
				</CurrentTabPanelScroll>
			),
			label: translateAstra(
				"astraMainInterface.currentContext.tabs.categories",
			),
			panelClassName:
				"astra-main-interface__category-tab-panel astra-main-interface__current-context-category-tab-panel",
			panelProps: {
				"data-route": "current-context-categories",
			},
			value: "current-categories",
		},
	];
	const handleTabChange = React.useCallback(
		(nextValue: string) => {
			if (!isCurrentContextTabValue(nextValue)) {
				return;
			}

			onActiveTabChange(nextValue);
		},
		[onActiveTabChange],
	);

	return (
		<AstraSmoothTabs
			ariaLabel={translateAstra(
				"astraMainInterface.currentContext.tabs.label",
			)}
			className="astra-main-interface__secondary-tabs astra-main-interface__current-context-tabs"
			items={items}
			listFramePortalTarget={listFramePortalTarget}
			value={activeTab}
			viewportMode="fill"
			onValueChange={handleTabChange}
		/>
	);
}
