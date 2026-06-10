import { describe, expect, test, vi } from "vitest";

import { SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY } from "@/packages/features/sillytavern-interface/contracts/dom";
import {
	SILLYTAVERN_INTERFACE_ROUTES,
	DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
	isDefaultSillyTavernInterfacePageKey,
	persistStoredSillyTavernInterfacePageKey,
	readStoredSillyTavernInterfacePageKey,
} from "@/packages/features/sillytavern-interface/routes/registry";

describe("SillyTavern interface active route storage", () => {
	test("recognizes default descriptor page keys only", () => {
		expect(
			isDefaultSillyTavernInterfacePageKey(
				SILLYTAVERN_INTERFACE_ROUTES.personaManagement,
			),
		).toBe(true);
		expect(isDefaultSillyTavernInterfacePageKey("connection-profile")).toBe(
			true,
		);
		expect(
			isDefaultSillyTavernInterfacePageKey("advanced-formatting"),
		).toBe(true);
		expect(isDefaultSillyTavernInterfacePageKey("missing-page")).toBe(
			false,
		);
		expect(isDefaultSillyTavernInterfacePageKey(null)).toBe(false);
	});

	test("reads a valid stored page key and falls back for invalid or unavailable storage", () => {
		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			SILLYTAVERN_INTERFACE_ROUTES.personaManagement,
		);

		expect(readStoredSillyTavernInterfacePageKey(window.localStorage)).toBe(
			SILLYTAVERN_INTERFACE_ROUTES.personaManagement,
		);

		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			"missing-page",
		);

		expect(readStoredSillyTavernInterfacePageKey(window.localStorage)).toBe(
			DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
		);

		window.localStorage.removeItem(
			SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
		);

		expect(readStoredSillyTavernInterfacePageKey(window.localStorage)).toBe(
			DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
		);

		expect(readStoredSillyTavernInterfacePageKey(null)).toBe(
			DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
		);

		const blockedStorage = {
			getItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(readStoredSillyTavernInterfacePageKey(blockedStorage)).toBe(
			DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
		);
	});

	test("persists valid page keys and ignores invalid keys or storage failures", () => {
		persistStoredSillyTavernInterfacePageKey(
			window.localStorage,
			SILLYTAVERN_INTERFACE_ROUTES.userSettings,
		);

		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			),
		).toBe(SILLYTAVERN_INTERFACE_ROUTES.userSettings);

		persistStoredSillyTavernInterfacePageKey(
			window.localStorage,
			"missing-page",
		);

		expect(
			window.localStorage.getItem(
				SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			),
		).toBe(SILLYTAVERN_INTERFACE_ROUTES.userSettings);

		const blockedStorage = {
			setItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(() => {
			persistStoredSillyTavernInterfacePageKey(
				blockedStorage,
				SILLYTAVERN_INTERFACE_ROUTES.backgrounds,
			);
		}).not.toThrow();
	});
});
