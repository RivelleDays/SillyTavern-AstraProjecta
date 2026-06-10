import * as React from "react";

import {
	BookText,
	Bot,
	Box,
	Image,
	Plug2,
	Settings,
	Sparkle,
	Type,
	VenetianMask,
} from "@/components/ui/shared/icons";
import type { LucideIcon } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	LEGACY_SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_ADVANCED_FORMATTING_HOST_ID,
	SILLYTAVERN_INTERFACE_AI_RESPONSE_CONFIGURATION_HOST_ID,
	SILLYTAVERN_INTERFACE_BACKGROUNDS_HOST_ID,
	SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_HOST_ID,
	SILLYTAVERN_INTERFACE_CONNECTION_PROFILE_HOST_ID,
	SILLYTAVERN_INTERFACE_EXTENSIONS_HOST_ID,
	SILLYTAVERN_INTERFACE_LOREBOOK_HOST_ID,
	SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_HOST_ID,
	SILLYTAVERN_INTERFACE_PROMPT_MANAGER_POPUP_HOST_ID,
	SILLYTAVERN_INTERFACE_USER_SETTINGS_HOST_ID,
} from "@/packages/features/sillytavern-interface/contracts/dom";
import { CharacterManagementPage } from "@/packages/features/sillytavern-interface/tools/character-management/CharacterManagementPage";
import { NativeCompanionHost } from "@/packages/features/sillytavern-interface/sillytavern-hosts/NativeCompanionHost";
import { NativeDrawerPage } from "@/packages/features/sillytavern-interface/sillytavern-hosts/NativeDrawerPage";
import { PersonaManagementPage } from "@/packages/features/sillytavern-interface/tools/persona-management/PersonaManagementPage";
import type {
	SillyTavernInterfacePageDescriptor,
	SillyTavernInterfacePageHeaderIcon,
	SillyTavernInterfacePageMainNavigationItem,
	SillyTavernInterfacePageNavigationItem,
} from "@/packages/features/sillytavern-interface/routes/types";
import type { I18nKey } from "@/types/i18n";

interface SillyTavernInterfacePageRouteDefinition {
	bodyOverlay?: () => React.ReactNode;
	descriptionKey: I18nKey;
	docsHref: string;
	headerIcon: SillyTavernInterfacePageHeaderIcon;
	icon: LucideIcon;
	key: string;
	render?: () => React.ReactNode;
	summaryKey: I18nKey;
	titleKey: I18nKey;
}

export const DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY =
	"ai-response-configuration";
export const SILLYTAVERN_INTERFACE_ROUTES = {
	aiSettings: DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
	backgrounds: "backgrounds",
	characterManagement: "character-management",
	extensions: "extensions",
	lorebook: "worlds-lorebooks",
	personaManagement: "persona-management",
	userSettings: "user-settings",
} as const;
export type SillyTavernInterfaceRouteKey =
	(typeof SILLYTAVERN_INTERFACE_ROUTES)[keyof typeof SILLYTAVERN_INTERFACE_ROUTES];

const AI_SETTINGS_CHILD_PAGES = [
	{
		descriptionKey:
			"sillyTavernInterface.page.aiResponseConfiguration.description",
		docsHref: "https://docs.sillytavern.app/usage/prompts/prompt-manager/",
		headerIcon: {
			iconKey: "ai-settings",
			kind: "main-menu-svg",
		},
		icon: Bot,
		key: DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
		render: () => (
			<NativeDrawerPage
				hostId={SILLYTAVERN_INTERFACE_AI_RESPONSE_CONFIGURATION_HOST_ID}
				missingMessageKey="sillyTavernInterface.page.aiResponseConfiguration.missingNativeDrawer"
				sourceId="left-nav-panel"
			/>
		),
		bodyOverlay: () => (
			<NativeCompanionHost
				hostId={SILLYTAVERN_INTERFACE_PROMPT_MANAGER_POPUP_HOST_ID}
				normalizeOpenDrawerVisibility={true}
				sourceId="completion_prompt_manager_popup"
			/>
		),
		summaryKey: "sillyTavernInterface.page.aiResponseConfiguration.summary",
		titleKey: "sillyTavernInterface.page.aiResponseConfiguration.title",
	},
	{
		descriptionKey:
			"sillyTavernInterface.page.connectionProfile.description",
		docsHref:
			"https://docs.sillytavern.app/usage/core-concepts/connection-profiles/",
		headerIcon: {
			icon: Plug2,
			kind: "lucide",
		},
		icon: Plug2,
		key: "connection-profile",
		render: () => (
			<NativeDrawerPage
				hostId={SILLYTAVERN_INTERFACE_CONNECTION_PROFILE_HOST_ID}
				missingMessageKey="sillyTavernInterface.page.connectionProfile.missingNativeDrawer"
				sourceId="rm_api_block"
			/>
		),
		summaryKey: "sillyTavernInterface.page.connectionProfile.summary",
		titleKey: "sillyTavernInterface.page.connectionProfile.title",
	},
	{
		descriptionKey:
			"sillyTavernInterface.page.advancedFormatting.description",
		docsHref:
			"https://docs.sillytavern.app/usage/core-concepts/advancedformatting/",
		headerIcon: {
			icon: Type,
			kind: "lucide",
		},
		icon: Type,
		key: "advanced-formatting",
		render: () => (
			<NativeDrawerPage
				hostId={SILLYTAVERN_INTERFACE_ADVANCED_FORMATTING_HOST_ID}
				missingMessageKey="sillyTavernInterface.page.advancedFormatting.missingNativeDrawer"
				sourceId="AdvancedFormatting"
			/>
		),
		summaryKey: "sillyTavernInterface.page.advancedFormatting.summary",
		titleKey: "sillyTavernInterface.page.advancedFormatting.title",
	},
] as const satisfies readonly SillyTavernInterfacePageRouteDefinition[];

const TOP_LEVEL_PAGES = [
	{
		descriptionKey: "sillyTavernInterface.page.userSettings.description",
		docsHref: "https://docs.sillytavern.app/usage/user-settings/",
		headerIcon: {
			iconKey: "user-settings",
			kind: "main-menu-svg",
		},
		icon: Settings,
		key: "user-settings",
		render: () => (
			<NativeDrawerPage
				hostId={SILLYTAVERN_INTERFACE_USER_SETTINGS_HOST_ID}
				missingMessageKey="sillyTavernInterface.page.userSettings.missingNativeDrawer"
				sourceId="user-settings-block"
			/>
		),
		summaryKey: "sillyTavernInterface.page.userSettings.summary",
		titleKey: "sillyTavernInterface.page.userSettings.title",
	},
	{
		descriptionKey: "sillyTavernInterface.page.worldsLorebooks.description",
		docsHref: "https://docs.sillytavern.app/usage/core-concepts/worldinfo/",
		headerIcon: {
			iconKey: "lorebook",
			kind: "main-menu-svg",
		},
		icon: BookText,
		key: "worlds-lorebooks",
		render: () => (
			<NativeDrawerPage
				hostId={SILLYTAVERN_INTERFACE_LOREBOOK_HOST_ID}
				missingMessageKey="sillyTavernInterface.page.worldsLorebooks.missingNativeDrawer"
				sourceId="WorldInfo"
			/>
		),
		summaryKey: "sillyTavernInterface.page.worldsLorebooks.summary",
		titleKey: "sillyTavernInterface.page.worldsLorebooks.title",
	},
	{
		descriptionKey: "sillyTavernInterface.page.backgrounds.description",
		docsHref: "https://docs.sillytavern.app/usage/",
		headerIcon: {
			iconKey: "backgrounds",
			kind: "main-menu-svg",
		},
		icon: Image,
		key: "backgrounds",
		render: () => (
			<NativeDrawerPage
				hostId={SILLYTAVERN_INTERFACE_BACKGROUNDS_HOST_ID}
				missingMessageKey="sillyTavernInterface.page.backgrounds.missingNativeDrawer"
				sourceId="Backgrounds"
			/>
		),
		summaryKey: "sillyTavernInterface.page.backgrounds.summary",
		titleKey: "sillyTavernInterface.page.backgrounds.title",
	},
	{
		descriptionKey: "sillyTavernInterface.page.extensions.description",
		docsHref: "https://docs.sillytavern.app/extensions/",
		headerIcon: {
			iconKey: "extensions",
			kind: "main-menu-svg",
		},
		icon: Box,
		key: "extensions",
		render: () => (
			<NativeDrawerPage
				hostId={SILLYTAVERN_INTERFACE_EXTENSIONS_HOST_ID}
				missingMessageKey="sillyTavernInterface.page.extensions.missingNativeDrawer"
				sourceId="rm_extensions_block"
			/>
		),
		summaryKey: "sillyTavernInterface.page.extensions.summary",
		titleKey: "sillyTavernInterface.page.extensions.title",
	},
	{
		descriptionKey:
			"sillyTavernInterface.page.personaManagement.description",
		docsHref: "https://docs.sillytavern.app/usage/core-concepts/personas/",
		headerIcon: {
			kind: "current-user-avatar",
		},
		icon: VenetianMask,
		key: "persona-management",
		render: () => (
			<PersonaManagementPage
				hostId={SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_HOST_ID}
				missingMessageKey="sillyTavernInterface.page.personaManagement.missingNativeDrawer"
			/>
		),
		summaryKey: "sillyTavernInterface.page.personaManagement.summary",
		titleKey: "sillyTavernInterface.page.personaManagement.title",
	},
	{
		descriptionKey:
			"sillyTavernInterface.page.characterManagement.description",
		docsHref: "https://docs.sillytavern.app/usage/characters/",
		headerIcon: {
			fallbackIconKey: "character-management",
			kind: "current-chat-avatar",
		},
		icon: Sparkle,
		key: "character-management",
		render: () => (
			<CharacterManagementPage
				hostId={SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_HOST_ID}
				missingGalleryMessageKey="sillyTavernInterface.page.characterManagement.missingNativeGallery"
				missingMessageKey="sillyTavernInterface.page.characterManagement.missingNativeDrawer"
			/>
		),
		summaryKey: "sillyTavernInterface.page.characterManagement.summary",
		titleKey: "sillyTavernInterface.page.characterManagement.title",
	},
] as const satisfies readonly SillyTavernInterfacePageRouteDefinition[];

const DEFAULT_ROUTE_PAGES = [
	...AI_SETTINGS_CHILD_PAGES,
	...TOP_LEVEL_PAGES,
] as const satisfies readonly SillyTavernInterfacePageRouteDefinition[];
const DEFAULT_ROUTE_PAGE_KEYS = new Set<string>(
	DEFAULT_ROUTE_PAGES.map((page) => page.key),
);

export function isDefaultSillyTavernInterfacePageKey(
	value: unknown,
): value is string {
	return typeof value === "string" && DEFAULT_ROUTE_PAGE_KEYS.has(value);
}

function readStoredString(storage: Storage, key: string) {
	try {
		return storage.getItem(key);
	} catch {
		return null;
	}
}

function tryPersistStoredString(storage: Storage, key: string, value: string) {
	try {
		storage.setItem(key, value);
	} catch {
		// Keep the in-memory route active when browser storage is unavailable.
	}
}

export function readStoredSillyTavernInterfacePageKey(
	storage?: Storage | null,
): string {
	if (!storage) {
		return DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY;
	}

	const storedValue = readStoredString(
		storage,
		SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
	);
	if (isDefaultSillyTavernInterfacePageKey(storedValue)) {
		return storedValue;
	}

	const legacyStoredValue = readStoredString(
		storage,
		LEGACY_SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
	);
	if (isDefaultSillyTavernInterfacePageKey(legacyStoredValue)) {
		tryPersistStoredString(
			storage,
			SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			legacyStoredValue,
		);
		return legacyStoredValue;
	}

	return DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY;
}

export function persistStoredSillyTavernInterfacePageKey(
	storage: Storage | null | undefined,
	pageKey: string,
) {
	if (!storage || !isDefaultSillyTavernInterfacePageKey(pageKey)) {
		return;
	}

	tryPersistStoredString(
		storage,
		SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
		pageKey,
	);
}

const DEFAULT_MAIN_NAVIGATION_ITEMS = [
	{
		activePageKeys: AI_SETTINGS_CHILD_PAGES.map((page) => page.key),
		icon: Bot,
		key: "ai-settings",
		labelKey: "sillyTavernInterface.mainNav.aiSettings",
		pageKey: DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
	},
	{
		icon: Settings,
		key: "user-settings",
		labelKey: "sillyTavernInterface.mainNav.userSettings",
		pageKey: "user-settings",
	},
	{
		icon: BookText,
		key: "lorebook",
		labelKey: "sillyTavernInterface.mainNav.lorebook",
		pageKey: "worlds-lorebooks",
	},
	{
		icon: Box,
		key: "extensions",
		labelKey: "sillyTavernInterface.mainNav.extensions",
		pageKey: "extensions",
	},
	{
		icon: Image,
		key: "backgrounds",
		labelKey: "sillyTavernInterface.mainNav.backgrounds",
		pageKey: "backgrounds",
	},
	{
		icon: VenetianMask,
		key: "persona",
		labelKey: "sillyTavernInterface.mainNav.persona",
		pageKey: "persona-management",
	},
	{
		icon: Sparkle,
		key: "character",
		labelKey: "sillyTavernInterface.mainNav.character",
		pageKey: "character-management",
	},
] as const satisfies readonly (Omit<
	SillyTavernInterfacePageMainNavigationItem,
	"label"
> & {
	labelKey: I18nKey;
})[];

function createDescriptor({
	bodyOverlay,
	descriptionKey,
	docsHref,
	headerIcon,
	icon,
	key,
	render,
	summaryKey,
	titleKey,
}: SillyTavernInterfacePageRouteDefinition): SillyTavernInterfacePageDescriptor {
	return {
		bodyOverlay,
		docsHref,
		headerIcon,
		headerSummary: translateAstra(summaryKey),
		icon,
		key,
		render:
			render ??
			(() => (
				<p className="sillytavern-interface__placeholder-copy">
					{translateAstra(descriptionKey)}
				</p>
			)),
		title: translateAstra(titleKey),
	};
}

function createNavigationPageItem({
	icon,
	key,
	titleKey,
}: SillyTavernInterfacePageRouteDefinition): SillyTavernInterfacePageNavigationItem {
	return {
		icon,
		key,
		label: translateAstra(titleKey),
		pageKey: key,
		type: "page",
	};
}

export function getDefaultSillyTavernInterfacePageDescriptors(): SillyTavernInterfacePageDescriptor[] {
	return DEFAULT_ROUTE_PAGES.map(createDescriptor);
}

export function getDefaultSillyTavernInterfacePageNavigationItems(): SillyTavernInterfacePageNavigationItem[] {
	return DEFAULT_ROUTE_PAGES.map(createNavigationPageItem);
}

export function getDefaultSillyTavernInterfacePageMainNavigationItems(): SillyTavernInterfacePageMainNavigationItem[] {
	return DEFAULT_MAIN_NAVIGATION_ITEMS.map(({ labelKey, ...item }) => ({
		...item,
		label: translateAstra(labelKey),
	}));
}
