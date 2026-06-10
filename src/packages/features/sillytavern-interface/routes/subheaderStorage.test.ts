import { describe, expect, test, vi } from "vitest";

import {
	SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
} from "@/packages/features/sillytavern-interface/contracts/dom";
import {
	persistStoredAiSettingsPageKey,
	persistStoredCharacterManagementTabValue,
	persistStoredPersonaManagementTabValue,
	readStoredAiSettingsPageKey,
	readStoredCharacterManagementTabValue,
	readStoredPersonaManagementTabValue,
} from "@/packages/features/sillytavern-interface/routes/subheaderStorage";

describe("SillyTavern interface subheader storage", () => {
	test("reads a valid stored AI Settings subheader page key and falls back for invalid or unavailable storage", () => {
		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
			"advanced-formatting",
		);

		expect(readStoredAiSettingsPageKey(window.localStorage)).toBe(
			"advanced-formatting",
		);

		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
			"missing-page",
		);

		expect(readStoredAiSettingsPageKey(window.localStorage)).toBe(
			"ai-response-configuration",
		);
		expect(readStoredAiSettingsPageKey(null)).toBe(
			"ai-response-configuration",
		);

		const blockedStorage = {
			getItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(readStoredAiSettingsPageKey(blockedStorage)).toBe(
			"ai-response-configuration",
		);
	});

	test("persists valid AI Settings subheader page keys and ignores invalid keys or storage failures", () => {
		persistStoredAiSettingsPageKey(
			window.localStorage,
			"connection-profile",
		);

		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
			),
		).toBe("connection-profile");

		persistStoredAiSettingsPageKey(window.localStorage, "missing-page");

		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
			),
		).toBe("connection-profile");

		const blockedStorage = {
			setItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(() => {
			persistStoredAiSettingsPageKey(
				blockedStorage,
				"advanced-formatting",
			);
		}).not.toThrow();
	});

	test("reads a valid stored Persona Management tab and falls back when the stored value is invalid or unavailable", () => {
		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			"edit",
		);

		expect(readStoredPersonaManagementTabValue(window.localStorage)).toBe(
			"edit",
		);

		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			"missing-tab",
		);

		expect(readStoredPersonaManagementTabValue(window.localStorage)).toBe(
			"personas",
		);
		expect(readStoredPersonaManagementTabValue(null)).toBe("personas");

		const blockedStorage = {
			getItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(readStoredPersonaManagementTabValue(blockedStorage)).toBe(
			"personas",
		);
	});

	test("persists valid Persona Management tabs and ignores invalid tabs or storage failures", () => {
		persistStoredPersonaManagementTabValue(window.localStorage, "edit");

		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			),
		).toBe("edit");

		persistStoredPersonaManagementTabValue(
			window.localStorage,
			"missing-tab" as never,
		);

		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			),
		).toBe("edit");

		const blockedStorage = {
			setItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(() => {
			persistStoredPersonaManagementTabValue(blockedStorage, "personas");
		}).not.toThrow();
	});

	test("reads a valid stored Character Management tab and falls back when the stored value is invalid or unavailable", () => {
		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			"images",
		);

		expect(
			readStoredCharacterManagementTabValue({
				canOpenEditTab: true,
				storage: window.localStorage,
			}),
		).toBe("images");

		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			"missing-tab",
		);

		expect(
			readStoredCharacterManagementTabValue({
				canOpenEditTab: true,
				storage: window.localStorage,
			}),
		).toBe("cards");
		expect(
			readStoredCharacterManagementTabValue({
				canOpenEditTab: true,
				storage: null,
			}),
		).toBe("cards");

		const blockedStorage = {
			getItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(
			readStoredCharacterManagementTabValue({
				canOpenEditTab: true,
				storage: blockedStorage,
			}),
		).toBe("cards");
	});

	test("falls back from stored Edit to Cards when Character Management edit is unavailable", () => {
		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			"edit",
		);

		expect(
			readStoredCharacterManagementTabValue({
				canOpenEditTab: false,
				storage: window.localStorage,
			}),
		).toBe("cards");
	});

	test("falls back from stored Gallery to Cards when Character Management gallery is unavailable", () => {
		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			"images",
		);

		expect(
			readStoredCharacterManagementTabValue({
				canOpenEditTab: true,
				canOpenGalleryTab: false,
				storage: window.localStorage,
			}),
		).toBe("cards");
	});

	test("persists valid Character Management tabs and ignores invalid tabs or storage failures", () => {
		persistStoredCharacterManagementTabValue(window.localStorage, "images");

		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			),
		).toBe("images");

		persistStoredCharacterManagementTabValue(
			window.localStorage,
			"missing-tab" as never,
		);

		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
			),
		).toBe("images");

		const blockedStorage = {
			setItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(() => {
			persistStoredCharacterManagementTabValue(blockedStorage, "cards");
		}).not.toThrow();
	});
});
