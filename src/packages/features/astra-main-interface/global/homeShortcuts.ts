import {
	SILLYTAVERN_INTERFACE_ROUTES,
	type SillyTavernInterfaceRouteIconKey,
	type SillyTavernInterfaceRouteKey,
} from "@/app/shared/sillytavern-interface";
import type { I18nKey } from "@/types/i18n";

export interface GlobalHomeShortcutDescriptor {
	iconKey: SillyTavernInterfaceRouteIconKey;
	key: string;
	labelKey: I18nKey;
	labelLines: readonly number[];
	routeKey: SillyTavernInterfaceRouteKey;
}

export const GLOBAL_HOME_SHORTCUTS = [
	{
		iconKey: "ai-settings",
		key: "ai-settings",
		labelKey: "astraMainInterface.home.shortcuts.aiSettings",
		labelLines: [1, 1],
		routeKey: SILLYTAVERN_INTERFACE_ROUTES.aiSettings,
	},
	{
		iconKey: "user-settings",
		key: "user-settings",
		labelKey: "astraMainInterface.home.shortcuts.userSettings",
		labelLines: [1, 1],
		routeKey: SILLYTAVERN_INTERFACE_ROUTES.userSettings,
	},
	{
		iconKey: "lorebook",
		key: "lorebook",
		labelKey: "astraMainInterface.home.shortcuts.lorebook",
		labelLines: [1],
		routeKey: SILLYTAVERN_INTERFACE_ROUTES.lorebook,
	},
	{
		iconKey: "extensions",
		key: "extensions",
		labelKey: "astraMainInterface.home.shortcuts.extensions",
		labelLines: [1],
		routeKey: SILLYTAVERN_INTERFACE_ROUTES.extensions,
	},
	{
		iconKey: "backgrounds",
		key: "backgrounds",
		labelKey: "astraMainInterface.home.shortcuts.backgrounds",
		labelLines: [1],
		routeKey: SILLYTAVERN_INTERFACE_ROUTES.backgrounds,
	},
	{
		iconKey: "character-management",
		key: "character-management",
		labelKey: "astraMainInterface.home.shortcuts.characterManagement",
		labelLines: [1, 1],
		routeKey: SILLYTAVERN_INTERFACE_ROUTES.characterManagement,
	},
] as const satisfies readonly GlobalHomeShortcutDescriptor[];

export function splitGlobalHomeShortcutLabel(
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
