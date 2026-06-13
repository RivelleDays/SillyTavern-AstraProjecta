import type { I18nKey } from "@/types/i18n";
import {
	SILLYTAVERN_INTERFACE_ROUTES,
	type SillyTavernInterfaceRouteIconKey,
	type SillyTavernInterfaceRouteKey,
} from "@/app/shared/sillytavern-interface";

function buildMobileChatMainMenuTileWrapperId(key: string) {
	const wrapperIds = {
		"ai-settings": "main-menu-ai",
		backgrounds: "main-menu-backgrounds",
		"character-management": "main-menu-characters",
		extensions: "main-menu-extensions",
		lorebook: "main-menu-lorebook",
		"user-settings": "main-menu-user",
	} as const;

	return wrapperIds[key as keyof typeof wrapperIds] ?? `main-menu-${key}`;
}

export interface MobileChatMainMenuTileDescriptor {
	iconKey: SillyTavernInterfaceRouteIconKey;
	key: string;
	labelKey: I18nKey;
	labelLines: readonly number[];
	sillyTavernInterfacePageKey: SillyTavernInterfaceRouteKey;
	wrapperId: string;
}

export const MOBILE_CHAT_MAIN_MENU_TILES = [
	{
		iconKey: "ai-settings",
		key: "ai-settings",
		labelKey: "sendForm.mainMenu.tile.aiSettings",
		labelLines: [1, 1],
		sillyTavernInterfacePageKey: SILLYTAVERN_INTERFACE_ROUTES.aiSettings,
		wrapperId: buildMobileChatMainMenuTileWrapperId("ai-settings"),
	},
	{
		iconKey: "user-settings",
		key: "user-settings",
		labelKey: "sendForm.mainMenu.tile.userSettings",
		labelLines: [1, 1],
		sillyTavernInterfacePageKey: SILLYTAVERN_INTERFACE_ROUTES.userSettings,
		wrapperId: buildMobileChatMainMenuTileWrapperId("user-settings"),
	},
	{
		iconKey: "lorebook",
		key: "lorebook",
		labelKey: "sendForm.mainMenu.tile.lorebook",
		labelLines: [1],
		sillyTavernInterfacePageKey: SILLYTAVERN_INTERFACE_ROUTES.lorebook,
		wrapperId: buildMobileChatMainMenuTileWrapperId("lorebook"),
	},
	{
		iconKey: "extensions",
		key: "extensions",
		labelKey: "sendForm.mainMenu.tile.extensions",
		labelLines: [1],
		sillyTavernInterfacePageKey: SILLYTAVERN_INTERFACE_ROUTES.extensions,
		wrapperId: buildMobileChatMainMenuTileWrapperId("extensions"),
	},
	{
		iconKey: "backgrounds",
		key: "backgrounds",
		labelKey: "sendForm.mainMenu.tile.backgrounds",
		labelLines: [1],
		sillyTavernInterfacePageKey: SILLYTAVERN_INTERFACE_ROUTES.backgrounds,
		wrapperId: buildMobileChatMainMenuTileWrapperId("backgrounds"),
	},
	{
		iconKey: "character-management",
		key: "character-management",
		labelKey: "sendForm.mainMenu.tile.characterManagement",
		labelLines: [1, 1],
		sillyTavernInterfacePageKey:
			SILLYTAVERN_INTERFACE_ROUTES.characterManagement,
		wrapperId: buildMobileChatMainMenuTileWrapperId("character-management"),
	},
] as const satisfies readonly MobileChatMainMenuTileDescriptor[];

export function splitMobileChatMainMenuTileLabel(
	label: string,
	labelLines: readonly number[],
) {
	const words = label.trim().split(/\s+/).filter(Boolean);

	if (
		words.length === 0 ||
		labelLines.length === 0 ||
		labelLines.some((count) => count < 1) ||
		labelLines.reduce((sum, count) => sum + count, 0) !== words.length
	) {
		return [label];
	}

	const lines: string[] = [];
	let wordIndex = 0;

	for (const count of labelLines) {
		lines.push(words.slice(wordIndex, wordIndex + count).join(" "));
		wordIndex += count;
	}

	return lines;
}
