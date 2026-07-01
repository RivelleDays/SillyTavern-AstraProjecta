import { beforeEach, describe, expect, test } from "vitest";

import {
	persistStoredExtensionShortcutsExpanded,
	readStoredExtensionShortcutsExpanded,
} from "@/packages/features/chat-session/send-form/main-menu/extension-shortcuts/extensionShortcutsStorage";

describe("main-menu extension shortcuts storage", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test("defaults to expanded when no stored preference exists", () => {
		expect(readStoredExtensionShortcutsExpanded(window.localStorage)).toBe(
			true,
		);
	});

	test("round-trips collapsed and expanded preferences", () => {
		persistStoredExtensionShortcutsExpanded(window.localStorage, false);
		expect(readStoredExtensionShortcutsExpanded(window.localStorage)).toBe(
			false,
		);

		persistStoredExtensionShortcutsExpanded(window.localStorage, true);
		expect(readStoredExtensionShortcutsExpanded(window.localStorage)).toBe(
			true,
		);
	});

	test("falls back to expanded for invalid or unavailable browser storage", () => {
		window.localStorage.setItem(
			"astra_projecta.mobile_chat_main_menu.extension_shortcuts_expanded",
			"maybe",
		);
		expect(readStoredExtensionShortcutsExpanded(window.localStorage)).toBe(
			true,
		);

		const throwingStorage = {
			getItem() {
				throw new Error("storage blocked");
			},
			setItem() {
				throw new Error("storage blocked");
			},
		} as unknown as Storage;

		expect(readStoredExtensionShortcutsExpanded(throwingStorage)).toBe(
			true,
		);
		expect(() =>
			persistStoredExtensionShortcutsExpanded(throwingStorage, false),
		).not.toThrow();
	});
});
