import { describe, expect, test } from "vitest";

import { SILLYTAVERN_INTERFACE_ROUTES } from "@/app/shared/sillytavern-interface";
import { SILLYTAVERN_INTERFACE_ROUTE_ICON_SOURCES } from "@/packages/features/sillytavern-interface/icons/registry";
import {
	MOBILE_CHAT_MAIN_MENU_TILES,
	splitMobileChatMainMenuTileLabel,
} from "@/packages/features/chat-session/send-form/main-menu/tiles";

describe("MOBILE_CHAT_MAIN_MENU_TILES", () => {
	test("maps every tile iconKey to a centralized SVG source entry", () => {
		expect(MOBILE_CHAT_MAIN_MENU_TILES).toHaveLength(6);

			for (const tile of MOBILE_CHAT_MAIN_MENU_TILES) {
				expect(tile.iconKey).toBeTruthy();
				expect(
					SILLYTAVERN_INTERFACE_ROUTE_ICON_SOURCES[tile.iconKey],
				).toContain("<svg");
				expect(
					SILLYTAVERN_INTERFACE_ROUTE_ICON_SOURCES[tile.iconKey],
				).toContain("viewBox=");
			}
	});

	test("defines unique stable wrapper ids for every tile", () => {
		const wrapperIds = new Set<string>();
		const expectedWrapperIds = {
			"ai-settings": "main-menu-ai",
			backgrounds: "main-menu-backgrounds",
			"character-management": "main-menu-characters",
			extensions: "main-menu-extensions",
			lorebook: "main-menu-lorebook",
			"user-settings": "main-menu-user",
		} as const;

		for (const tile of MOBILE_CHAT_MAIN_MENU_TILES) {
			expect(tile.wrapperId).toBe(expectedWrapperIds[tile.key]);
			wrapperIds.add(tile.wrapperId);
		}

		expect(wrapperIds.size).toBe(MOBILE_CHAT_MAIN_MENU_TILES.length);
	});

	test("keeps approved label split metadata for the static tile layout", () => {
		const expectedLabelLines = {
			"ai-settings": [1, 1],
			backgrounds: [1],
			"character-management": [1, 1],
			extensions: [1],
			lorebook: [1],
			"user-settings": [1, 1],
		} as const;

		for (const tile of MOBILE_CHAT_MAIN_MENU_TILES) {
			expect(tile.labelLines).toEqual(expectedLabelLines[tile.key]);
		}
	});

	test("maps every tile to the matching SillyTavern interface route", () => {
		const expectedPageKeys = {
			"ai-settings": SILLYTAVERN_INTERFACE_ROUTES.aiSettings,
			backgrounds: SILLYTAVERN_INTERFACE_ROUTES.backgrounds,
			"character-management":
				SILLYTAVERN_INTERFACE_ROUTES.characterManagement,
			extensions: SILLYTAVERN_INTERFACE_ROUTES.extensions,
			lorebook: SILLYTAVERN_INTERFACE_ROUTES.lorebook,
			"user-settings": SILLYTAVERN_INTERFACE_ROUTES.userSettings,
		} as const;

		for (const tile of MOBILE_CHAT_MAIN_MENU_TILES) {
			expect(tile.sillyTavernInterfacePageKey).toBe(
				expectedPageKeys[tile.key],
			);
		}
	});

	test("splits labels only when the requested word counts line up", () => {
		expect(splitMobileChatMainMenuTileLabel("AI Settings", [1, 1])).toEqual(
			["AI", "Settings"],
		);
		expect(
			splitMobileChatMainMenuTileLabel("Character Management", [1, 1]),
		).toEqual(["Character", "Management"]);
		expect(splitMobileChatMainMenuTileLabel("Lorebook", [1])).toEqual([
			"Lorebook",
		]);
		expect(splitMobileChatMainMenuTileLabel("Too Many Words", [1])).toEqual(
			["Too Many Words"],
		);
	});
});
