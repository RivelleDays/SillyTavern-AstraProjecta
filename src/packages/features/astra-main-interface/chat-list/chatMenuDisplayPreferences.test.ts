import { describe, expect, test, vi } from "vitest";

import {
	CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
	CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
	CHAT_MENU_SORT_MODE_STORAGE_KEY,
	CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
	CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
	CURRENT_CHAT_MENU_SORT_MODE_STORAGE_KEY,
	persistStoredCurrentChatMenuShowAvatars,
	persistStoredCurrentChatMenuPreviewLineCount,
	persistStoredCurrentChatMenuSortMode,
	persistStoredChatMenuPreviewLineCount,
	persistStoredChatMenuShowAvatars,
	persistStoredChatMenuSortMode,
	readStoredCurrentChatMenuShowAvatars,
	readStoredCurrentChatMenuPreviewLineCount,
	readStoredCurrentChatMenuSortMode,
	readStoredChatMenuPreviewLineCount,
	readStoredChatMenuShowAvatars,
	readStoredChatMenuSortMode,
} from "@/packages/features/astra-main-interface/chat-list/chatMenuDisplayPreferences";

describe("chat menu display preferences", () => {
	test("reads valid preview line counts and falls back for invalid or unavailable storage", () => {
		window.localStorage.setItem(
			CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			"3",
		);

		expect(readStoredChatMenuPreviewLineCount(window.localStorage)).toBe(3);

		window.localStorage.setItem(
			CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			"4",
		);

		expect(readStoredChatMenuPreviewLineCount(window.localStorage)).toBe(2);
		expect(readStoredChatMenuPreviewLineCount(null)).toBe(2);

		const blockedStorage = {
			getItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(readStoredChatMenuPreviewLineCount(blockedStorage)).toBe(2);
	});

	test("persists valid preview line counts and ignores invalid values or storage failures", () => {
		persistStoredChatMenuPreviewLineCount(window.localStorage, 0);

		expect(
			window.localStorage.getItem(
				CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			),
		).toBe("0");

		persistStoredChatMenuPreviewLineCount(window.localStorage, 3);

		expect(
			window.localStorage.getItem(
				CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			),
		).toBe("3");

		persistStoredChatMenuPreviewLineCount(window.localStorage, 4);

		expect(
			window.localStorage.getItem(
				CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			),
		).toBe("3");

		const blockedStorage = {
			setItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(() => {
			persistStoredChatMenuPreviewLineCount(blockedStorage, 1);
		}).not.toThrow();
	});

	test("reads and persists avatar visibility with safe fallbacks", () => {
		window.localStorage.setItem(
			CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			"false",
		);

		expect(readStoredChatMenuShowAvatars(window.localStorage)).toBe(false);

		window.localStorage.setItem(CHAT_MENU_SHOW_AVATARS_STORAGE_KEY, "true");

		expect(readStoredChatMenuShowAvatars(window.localStorage)).toBe(true);

		window.localStorage.setItem(CHAT_MENU_SHOW_AVATARS_STORAGE_KEY, "nope");

		expect(readStoredChatMenuShowAvatars(window.localStorage)).toBe(true);
		expect(readStoredChatMenuShowAvatars(null)).toBe(true);

		persistStoredChatMenuShowAvatars(window.localStorage, false);

		expect(
			window.localStorage.getItem(CHAT_MENU_SHOW_AVATARS_STORAGE_KEY),
		).toBe("false");

		const blockedStorage = {
			getItem: vi.fn(() => {
				throw new Error("blocked");
			}),
			setItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(readStoredChatMenuShowAvatars(blockedStorage)).toBe(true);
		expect(() => {
			persistStoredChatMenuShowAvatars(blockedStorage, true);
		}).not.toThrow();
	});

	test("reads and persists sort mode with safe fallbacks", () => {
		window.localStorage.setItem(
			CHAT_MENU_SORT_MODE_STORAGE_KEY,
			"entity-asc",
		);

		expect(readStoredChatMenuSortMode(window.localStorage)).toBe(
			"entity-asc",
		);

		window.localStorage.setItem(
			CHAT_MENU_SORT_MODE_STORAGE_KEY,
			"least-messages",
		);

		expect(readStoredChatMenuSortMode(window.localStorage)).toBe(
			"least-messages",
		);

		window.localStorage.setItem(CHAT_MENU_SORT_MODE_STORAGE_KEY, "invalid");

		expect(readStoredChatMenuSortMode(window.localStorage)).toBe(
			"most-recent",
		);
		expect(readStoredChatMenuSortMode(null)).toBe("most-recent");

		persistStoredChatMenuSortMode(window.localStorage, "entity-desc");

		expect(
			window.localStorage.getItem(CHAT_MENU_SORT_MODE_STORAGE_KEY),
		).toBe("entity-desc");

		persistStoredChatMenuSortMode(window.localStorage, "invalid");

		expect(
			window.localStorage.getItem(CHAT_MENU_SORT_MODE_STORAGE_KEY),
		).toBe("entity-desc");

		const blockedStorage = {
			getItem: vi.fn(() => {
				throw new Error("blocked");
			}),
			setItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(readStoredChatMenuSortMode(blockedStorage)).toBe("most-recent");
		expect(() => {
			persistStoredChatMenuSortMode(blockedStorage, "oldest");
		}).not.toThrow();
	});

	test("reads and persists current chat menu preferences independently", () => {
		window.localStorage.setItem(CHAT_MENU_SORT_MODE_STORAGE_KEY, "oldest");
		window.localStorage.setItem(
			CURRENT_CHAT_MENU_SORT_MODE_STORAGE_KEY,
			"entity-desc",
		);
		window.localStorage.setItem(
			CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			"false",
		);
		window.localStorage.setItem(
			CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			"true",
		);
		window.localStorage.setItem(
			CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			"1",
		);
		window.localStorage.setItem(
			CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			"3",
		);

		expect(readStoredChatMenuSortMode(window.localStorage)).toBe("oldest");
		expect(readStoredCurrentChatMenuSortMode(window.localStorage)).toBe(
			"entity-desc",
		);
		expect(readStoredChatMenuPreviewLineCount(window.localStorage)).toBe(1);
		expect(
			readStoredCurrentChatMenuPreviewLineCount(window.localStorage),
		).toBe(3);
		expect(readStoredChatMenuShowAvatars(window.localStorage)).toBe(false);
		expect(readStoredCurrentChatMenuShowAvatars(window.localStorage)).toBe(
			true,
		);

		persistStoredCurrentChatMenuSortMode(
			window.localStorage,
			"most-recent",
		);
		persistStoredCurrentChatMenuPreviewLineCount(window.localStorage, 0);
		persistStoredCurrentChatMenuShowAvatars(window.localStorage, false);

		expect(
			window.localStorage.getItem(CHAT_MENU_SORT_MODE_STORAGE_KEY),
		).toBe("oldest");
		expect(
			window.localStorage.getItem(
				CURRENT_CHAT_MENU_SORT_MODE_STORAGE_KEY,
			),
		).toBe("most-recent");
		expect(
			window.localStorage.getItem(
				CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			),
		).toBe("1");
		expect(
			window.localStorage.getItem(
				CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			),
		).toBe("0");
		expect(
			window.localStorage.getItem(CHAT_MENU_SHOW_AVATARS_STORAGE_KEY),
		).toBe("false");
		expect(
			window.localStorage.getItem(
				CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			),
		).toBe("false");
	});

	test("reads and persists current avatar visibility with safe fallbacks", () => {
		window.localStorage.setItem(
			CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			"false",
		);

		expect(readStoredCurrentChatMenuShowAvatars(window.localStorage)).toBe(
			false,
		);

		window.localStorage.setItem(
			CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			"true",
		);

		expect(readStoredCurrentChatMenuShowAvatars(window.localStorage)).toBe(
			true,
		);

		window.localStorage.setItem(
			CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			"nope",
		);

		expect(readStoredCurrentChatMenuShowAvatars(window.localStorage)).toBe(
			true,
		);
		expect(readStoredCurrentChatMenuShowAvatars(null)).toBe(true);

		persistStoredCurrentChatMenuShowAvatars(window.localStorage, false);

		expect(
			window.localStorage.getItem(
				CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			),
		).toBe("false");

		const blockedStorage = {
			getItem: vi.fn(() => {
				throw new Error("blocked");
			}),
			setItem: vi.fn(() => {
				throw new Error("blocked");
			}),
		} as unknown as Storage;

		expect(readStoredCurrentChatMenuShowAvatars(blockedStorage)).toBe(true);
		expect(() => {
			persistStoredCurrentChatMenuShowAvatars(blockedStorage, true);
		}).not.toThrow();
	});
});
