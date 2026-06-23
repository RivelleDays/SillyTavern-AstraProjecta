import * as React from "react";

import {
	AstraSmoothTabs,
	type AstraSmoothTabItem,
} from "@/components/ui/astra/smooth-tabs";
import { ScrollArea } from "@/components/ui/astra/scroll-area";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import {
	createChatCatalogStore,
	type ChatCatalogStore,
} from "@/packages/core/st/chat-catalog";
import { GlobalChatCategoriesPage } from "@/packages/features/astra-main-interface/global/GlobalChatCategoriesPage";
import {
	GlobalChatListPage,
	type GlobalChatListPageProps,
} from "@/packages/features/astra-main-interface/global/GlobalChatListPage";
import type { AstraMainInterfaceRouteDescriptor } from "@/packages/features/astra-main-interface/routes";
import type { I18nKey } from "@/types/i18n";

export type GlobalAstraMainInterfaceTabValue = "categories" | "chats";

export const DEFAULT_GLOBAL_ASTRA_MAIN_INTERFACE_TAB_VALUE: GlobalAstraMainInterfaceTabValue =
	"chats";

const GLOBAL_ASTRA_MAIN_INTERFACE_ROUTE_DESCRIPTORS = [
	{
		key: "global-chats",
		tabValue: "chats",
		titleKey: "astraMainInterface.global.tabs.chats" as I18nKey,
	},
	{
		key: "global-categories",
		tabValue: "categories",
		titleKey: "astraMainInterface.global.tabs.categories" as I18nKey,
	},
] as const satisfies readonly (AstraMainInterfaceRouteDescriptor & {
	tabValue: GlobalAstraMainInterfaceTabValue;
})[];

export interface GlobalAstraMainInterfaceProps extends GlobalChatListPageProps {
	activeTab: GlobalAstraMainInterfaceTabValue;
	chatCategoryStore: ChatCategoryStore;
	listFramePortalTarget?: HTMLElement | null;
	onActiveTabChange(value: GlobalAstraMainInterfaceTabValue): void;
}

function isGlobalAstraMainInterfaceTabValue(
	value: string,
): value is GlobalAstraMainInterfaceTabValue {
	return value === "categories" || value === "chats";
}

export function getGlobalAstraMainInterfaceRoutes(): AstraMainInterfaceRouteDescriptor[] {
	return GLOBAL_ASTRA_MAIN_INTERFACE_ROUTE_DESCRIPTORS.map(
		({ key, titleKey }) => ({
			key,
			titleKey,
		}),
	);
}

export function getGlobalAstraMainInterfaceRouteKey(
	value: GlobalAstraMainInterfaceTabValue,
) {
	return (
		GLOBAL_ASTRA_MAIN_INTERFACE_ROUTE_DESCRIPTORS.find(
			(descriptor) => descriptor.tabValue === value,
		)?.key ?? GLOBAL_ASTRA_MAIN_INTERFACE_ROUTE_DESCRIPTORS[0].key
	);
}

function handleGlobalTabPanelWheel(event: React.WheelEvent<HTMLDivElement>) {
	if (Math.abs(event.deltaY) >= Math.abs(event.deltaX)) {
		event.stopPropagation();
	}
}

function GlobalTabPanelScroll({ children }: { children: React.ReactNode }) {
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
				onWheel={handleGlobalTabPanelWheel}
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

function useGlobalChatCatalogStore(injectedStore?: ChatCatalogStore) {
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

export function GlobalAstraMainInterface({
	activeTab,
	chatCategoryStore,
	listFramePortalTarget,
	onActiveTabChange,
	...chatListProps
}: GlobalAstraMainInterfaceProps) {
	const chatCatalogStore = useGlobalChatCatalogStore(
		chatListProps.chatCatalogStore,
	);
	const items: AstraSmoothTabItem<GlobalAstraMainInterfaceTabValue>[] = [
		{
			content: (
				<GlobalTabPanelScroll>
					<div
						className="astra-main-interface__tab-panel"
						data-route="global-chats"
					>
						<GlobalChatListPage
							{...chatListProps}
							chatCatalogStore={chatCatalogStore}
							chatCategoryStore={chatCategoryStore}
						/>
					</div>
				</GlobalTabPanelScroll>
			),
			label: translateAstra("astraMainInterface.global.tabs.chats"),
			panelProps: {
				"data-route": "global-chats",
			},
			value: "chats",
		},
		{
			content: (
				<GlobalTabPanelScroll>
					<div
						className="astra-main-interface__tab-panel astra-main-interface__tab-panel--categories"
						data-route="global-categories"
					>
						<GlobalChatCategoriesPage
							chatCatalogStore={chatCatalogStore}
							chatCategoryStore={chatCategoryStore}
							deleteChat={chatListProps.deleteChat}
							exportChat={chatListProps.exportChat}
							onRequestClose={chatListProps.onRequestClose}
							openChat={chatListProps.openChat}
							renameChat={chatListProps.renameChat}
						/>
					</div>
				</GlobalTabPanelScroll>
			),
			label: translateAstra("astraMainInterface.global.tabs.categories"),
			panelClassName:
				"astra-main-interface__category-tab-panel astra-main-interface__global-category-tab-panel",
			panelProps: {
				"data-route": "global-categories",
			},
			value: "categories",
		},
	];
	const handleTabChange = React.useCallback(
		(nextValue: string) => {
			if (!isGlobalAstraMainInterfaceTabValue(nextValue)) {
				return;
			}

			onActiveTabChange(nextValue);
		},
		[onActiveTabChange],
	);

	return (
		<AstraSmoothTabs
			ariaLabel={translateAstra("astraMainInterface.global.tabs.label")}
			className="astra-main-interface__secondary-tabs astra-main-interface__global-tabs"
			items={items}
			listFramePortalTarget={listFramePortalTarget}
			value={activeTab}
			viewportMode="fill"
			onValueChange={handleTabChange}
		/>
	);
}
