import * as React from "react";

import { translateAstra } from "@/packages/core/i18n";
import type { ActivateChatEntity } from "@/packages/core/st/chat-catalog";
import {
	createCurrentChatIdentityStore,
	type CurrentChatIdentitySnapshot,
	type CurrentChatIdentityStore,
} from "@/packages/core/st/chat-identity";
import {
	createScopedChatCatalogStore,
	type ScopedChatCatalogStore,
} from "@/packages/core/st/current-chat-catalog";
import {
	createChatCategoryStore,
	type ChatCategoryStore,
} from "@/packages/core/st/chat-categories";
import {
	FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE,
	FAVORITE_CHAT_ENTITY_GLOBAL_SCOPE_VALUE,
	isFavoriteChatEntityScopeValue,
	parseFavoriteChatEntityScopeValue,
	type FavoriteChatEntitiesStore,
} from "@/packages/core/st/favorite-chat-entities";
import {
	AstraMainInterfaceScopeStrip,
	type AstraMainInterfaceScopeValue,
} from "@/packages/features/astra-main-interface/AstraMainInterfaceScopeStrip";
import {
	DEFAULT_GLOBAL_ASTRA_MAIN_INTERFACE_TAB_VALUE,
	GlobalAstraMainInterface,
	getGlobalAstraMainInterfaceRouteKey,
	getGlobalAstraMainInterfaceRoutes,
	type GlobalAstraMainInterfaceTabValue,
} from "@/packages/features/astra-main-interface/global/GlobalAstraMainInterface";
import type { GlobalChatListPageProps } from "@/packages/features/astra-main-interface/global/GlobalChatListPage";
import {
	CurrentContextPage,
	DEFAULT_CURRENT_CONTEXT_TAB_VALUE,
	getCurrentContextRouteKey,
	getCurrentContextRoutes,
	type CurrentContextTabValue,
} from "@/packages/features/astra-main-interface/current-context/CurrentContextPage";
import type { CurrentChatListPageProps } from "@/packages/features/astra-main-interface/current-context/CurrentChatListPage";
import {
	DEFAULT_FAVORITE_CONTEXT_TAB_VALUE,
	FavoriteContextPage,
	getFavoriteContextRouteKey,
	getFavoriteContextRoutes,
	type FavoriteContextTabValue,
} from "@/packages/features/astra-main-interface/favorite-context/FavoriteContextPage";

export type AstraMainInterfaceSectionValue = AstraMainInterfaceScopeValue;

export interface AstraMainInterfaceProps
	extends GlobalChatListPageProps, CurrentChatListPageProps {
	activateChatEntity?: ActivateChatEntity;
	activeSection?: AstraMainInterfaceSectionValue;
	chatCategoryStore?: ChatCategoryStore;
	currentChatIdentityStore?: CurrentChatIdentityStore;
	favoriteChatEntitiesStore?: FavoriteChatEntitiesStore | null;
	onActiveSectionChange?(value: AstraMainInterfaceSectionValue): void;
	secondaryTabsListFramePortalTarget?: HTMLElement | null;
	showSectionTabs?: boolean;
	scopedChatCatalogStore?: ScopedChatCatalogStore | null;
}

export interface AstraMainInterfaceSectionTabsProps {
	className?: string;
	currentContextLabel?: string;
	onValueChange(value: AstraMainInterfaceSectionValue): void;
	value: AstraMainInterfaceSectionValue;
}

function isAstraMainInterfaceSectionValue(
	value: string,
): value is AstraMainInterfaceSectionValue {
	return (
		value === FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE ||
		value === FAVORITE_CHAT_ENTITY_GLOBAL_SCOPE_VALUE ||
		isFavoriteChatEntityScopeValue(value)
	);
}

function getActiveRouteKey({
	activeCurrentContextTab,
	activeFavoriteContextTab,
	activeGlobalTab,
	activeSection,
}: {
	activeCurrentContextTab: CurrentContextTabValue;
	activeFavoriteContextTab: FavoriteContextTabValue;
	activeGlobalTab: GlobalAstraMainInterfaceTabValue;
	activeSection: AstraMainInterfaceSectionValue;
}) {
	if (activeSection === FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE) {
		return getCurrentContextRouteKey(activeCurrentContextTab);
	}

	const favoriteScope = parseFavoriteChatEntityScopeValue(activeSection);
	if (favoriteScope) {
		return getFavoriteContextRouteKey({
			kind: favoriteScope.kind,
			value: activeFavoriteContextTab,
		});
	}

	return getGlobalAstraMainInterfaceRouteKey(activeGlobalTab);
}

function useCurrentChatIdentityStore(injectedStore?: CurrentChatIdentityStore) {
	const store = React.useMemo(
		() => injectedStore ?? createCurrentChatIdentityStore(),
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

function useScopedChatCatalogStore(
	injectedStore?: ScopedChatCatalogStore | null,
) {
	const store = React.useMemo(
		() => injectedStore ?? createScopedChatCatalogStore(),
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

function useChatCategoryStore(injectedStore?: ChatCategoryStore) {
	const store = React.useMemo(
		() => injectedStore ?? createChatCategoryStore(),
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

function resolveCurrentContextLabel(snapshot: CurrentChatIdentitySnapshot) {
	const entityName = snapshot.entityName.trim();

	if (snapshot.hasActiveChat && entityName) {
		return entityName;
	}

	return translateAstra("astraMainInterface.sections.currentContext");
}

export function getAstraMainInterfaceRoutes() {
	return [
		...getGlobalAstraMainInterfaceRoutes(),
		...getCurrentContextRoutes(),
		...getFavoriteContextRoutes(),
	];
}

export function AstraMainInterfaceSectionTabs({
	className,
	currentContextLabel,
	onValueChange,
	value,
}: AstraMainInterfaceSectionTabsProps) {
	const resolvedCurrentContextLabel =
		currentContextLabel?.trim() ||
		translateAstra("astraMainInterface.sections.currentContext");
	const currentIdentitySnapshot: CurrentChatIdentitySnapshot = {
		avatarSource: "fallback",
		characterId: null,
		chatFileName: "",
		entityName: resolvedCurrentContextLabel,
		groupAvatarUrls: [],
		groupId: null,
		hasActiveChat: Boolean(currentContextLabel?.trim()),
		kind: "none",
		thumbnailUrl: "",
		updatedAt: 0,
	};

	return (
		<AstraMainInterfaceScopeStrip
			className={className}
			currentIdentitySnapshot={currentIdentitySnapshot}
			value={value}
			onValueChange={(nextValue) => {
				if (isAstraMainInterfaceSectionValue(nextValue)) {
					onValueChange(nextValue);
				}
			}}
		/>
	);
}

export function AstraMainInterface({
	activateChatEntity,
	activeSection: controlledActiveSection,
	chatCategoryStore: injectedChatCategoryStore,
	currentChatIdentityStore,
	currentChatCatalogStore,
	deleteCurrentChat,
	exportCurrentChat,
	favoriteChatEntitiesStore,
	onRequestClose,
	openCurrentChat,
	onActiveSectionChange,
	renameCurrentChat,
	secondaryTabsListFramePortalTarget,
	showSectionTabs = true,
	scopedChatCatalogStore,
	...globalProps
}: AstraMainInterfaceProps = {}) {
	const identityStore = useCurrentChatIdentityStore(currentChatIdentityStore);
	const scopedStore = useScopedChatCatalogStore(scopedChatCatalogStore);
	const chatCategoryStore = useChatCategoryStore(injectedChatCategoryStore);
	const currentIdentitySnapshot = React.useSyncExternalStore(
		identityStore.subscribe,
		identityStore.getSnapshot,
		identityStore.getSnapshot,
	);
	const [uncontrolledActiveSection, setUncontrolledActiveSection] =
		React.useState<AstraMainInterfaceSectionValue>("global");
	const [activeGlobalTab, setActiveGlobalTab] =
		React.useState<GlobalAstraMainInterfaceTabValue>(
			DEFAULT_GLOBAL_ASTRA_MAIN_INTERFACE_TAB_VALUE,
		);
	const [activeCurrentContextTab, setActiveCurrentContextTab] =
		React.useState<CurrentContextTabValue>(
			DEFAULT_CURRENT_CONTEXT_TAB_VALUE,
		);
	const [activeFavoriteContextTab, setActiveFavoriteContextTab] =
		React.useState<FavoriteContextTabValue>(
			DEFAULT_FAVORITE_CONTEXT_TAB_VALUE,
		);
	const activeSection = controlledActiveSection ?? uncontrolledActiveSection;
	const favoriteScope = React.useMemo(
		() => parseFavoriteChatEntityScopeValue(activeSection),
		[activeSection],
	);
	const activeRouteKey = getActiveRouteKey({
		activeCurrentContextTab,
		activeFavoriteContextTab,
		activeGlobalTab,
		activeSection,
	});

	const handleSectionChange = React.useCallback(
		(nextValue: AstraMainInterfaceSectionValue) => {
			if (controlledActiveSection === undefined) {
				setUncontrolledActiveSection(nextValue);
			}

			onActiveSectionChange?.(nextValue);
		},
		[controlledActiveSection, onActiveSectionChange],
	);

	React.useEffect(() => {
		scopedStore.setEntity(favoriteScope);
	}, [favoriteScope?.entityId, favoriteScope?.kind, scopedStore]);

	return (
		<section
			aria-label={translateAstra("astraMainInterface.title")}
			className="astra-main-interface"
			data-route={activeRouteKey}
		>
			{showSectionTabs ? (
				<AstraMainInterfaceScopeStrip
					activateChatEntity={activateChatEntity}
					currentIdentitySnapshot={currentIdentitySnapshot}
					favoriteChatEntitiesStore={favoriteChatEntitiesStore}
					value={activeSection}
					onValueChange={handleSectionChange}
				/>
			) : null}

			{activeSection === FAVORITE_CHAT_ENTITY_GLOBAL_SCOPE_VALUE ? (
				<GlobalAstraMainInterface
					{...globalProps}
					activeTab={activeGlobalTab}
					chatCategoryStore={chatCategoryStore}
					listFramePortalTarget={secondaryTabsListFramePortalTarget}
					onRequestClose={onRequestClose}
					onActiveTabChange={setActiveGlobalTab}
				/>
			) : activeSection ===
			  FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE ? (
				<CurrentContextPage
					activeTab={activeCurrentContextTab}
					chatCategoryStore={chatCategoryStore}
					currentChatCatalogStore={currentChatCatalogStore}
					deleteCurrentChat={deleteCurrentChat}
					exportCurrentChat={exportCurrentChat}
					listFramePortalTarget={secondaryTabsListFramePortalTarget}
					openCurrentChat={openCurrentChat}
					renameCurrentChat={renameCurrentChat}
					onRequestClose={onRequestClose}
					onActiveTabChange={setActiveCurrentContextTab}
				/>
			) : favoriteScope ? (
				<FavoriteContextPage
					activeTab={activeFavoriteContextTab}
					chatCategoryStore={chatCategoryStore}
					currentChatCatalogStore={scopedStore}
					deleteCurrentChat={deleteCurrentChat}
					exportCurrentChat={exportCurrentChat}
					listFramePortalTarget={secondaryTabsListFramePortalTarget}
					openCurrentChat={openCurrentChat}
					renameCurrentChat={renameCurrentChat}
					onRequestClose={onRequestClose}
					onActiveTabChange={setActiveFavoriteContextTab}
				/>
			) : null}
		</section>
	);
}
