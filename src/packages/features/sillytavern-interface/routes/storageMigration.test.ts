import { beforeEach, describe, expect, test } from "vitest";

import {
	LEGACY_SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
	LEGACY_SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
	LEGACY_SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
	LEGACY_SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
} from "@/packages/features/sillytavern-interface/contracts/dom";
import {
	SILLYTAVERN_INTERFACE_ROUTES,
	readStoredSillyTavernInterfacePageKey,
} from "@/packages/features/sillytavern-interface/routes/registry";
import {
	readStoredAiSettingsPageKey,
	readStoredCharacterManagementTabValue,
	readStoredPersonaManagementTabValue,
} from "@/packages/features/sillytavern-interface/routes/subheaderStorage";

describe("SillyTavern interface storage migration", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test("prefers the new active page key and leaves a stale legacy value untouched", () => {
		window.localStorage.setItem(
			LEGACY_SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			SILLYTAVERN_INTERFACE_ROUTES.personaManagement,
		);
		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			SILLYTAVERN_INTERFACE_ROUTES.userSettings,
		);

		expect(readStoredSillyTavernInterfacePageKey(window.localStorage)).toBe(
			SILLYTAVERN_INTERFACE_ROUTES.userSettings,
		);
		expect(
			window.localStorage.getItem(
				LEGACY_SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			),
		).toBe(SILLYTAVERN_INTERFACE_ROUTES.personaManagement);
	});

	test("migrates a valid legacy active page key to the new key", () => {
		window.localStorage.setItem(
			LEGACY_SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			SILLYTAVERN_INTERFACE_ROUTES.characterManagement,
		);

		expect(readStoredSillyTavernInterfacePageKey(window.localStorage)).toBe(
			SILLYTAVERN_INTERFACE_ROUTES.characterManagement,
		);
		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			),
		).toBe(SILLYTAVERN_INTERFACE_ROUTES.characterManagement);
	});

	test("does not migrate an invalid legacy active page key", () => {
		window.localStorage.setItem(
			LEGACY_SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			"missing-page",
		);

		expect(readStoredSillyTavernInterfacePageKey(window.localStorage)).toBe(
			"ai-response-configuration",
		);
		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			),
		).toBeNull();
	});

	test("migrates valid legacy subheader and tab storage keys", () => {
		window.localStorage.setItem(
			LEGACY_SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
			"connection-profile",
		);
		window.localStorage.setItem(
			LEGACY_SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			"edit",
		);
		window.localStorage.setItem(
			LEGACY_SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			"images",
		);

		expect(readStoredAiSettingsPageKey(window.localStorage)).toBe(
			"connection-profile",
		);
		expect(readStoredPersonaManagementTabValue(window.localStorage)).toBe(
			"edit",
		);
		expect(
			readStoredCharacterManagementTabValue({
				canOpenEditTab: true,
				storage: window.localStorage,
			}),
		).toBe("images");
		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
			),
		).toBe("connection-profile");
		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			),
		).toBe("edit");
		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			),
		).toBe("images");
	});
});
