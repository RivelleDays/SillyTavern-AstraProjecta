import { afterEach, describe, expect, test, vi } from "vitest";

import {
	CHAT_BACKGROUND_APPEARANCE_CHANGE_EVENT,
	CHAT_BACKGROUND_BLUR_DEFAULT_PX,
	CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT,
	createChatBackgroundAppearanceStore,
} from "@/packages/core/st/chat-background-appearance";

function setSillyTavernContext(context: Record<string, unknown>) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function createContext(overrides: Record<string, unknown> = {}) {
	return {
		extensionSettings: {},
		saveSettingsDebounced: vi.fn(),
		...overrides,
	};
}

describe("chat background appearance store", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("returns default blur and opacity when settings are empty", () => {
		setSillyTavernContext(createContext());
		const store = createChatBackgroundAppearanceStore();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				blurPx: CHAT_BACKGROUND_BLUR_DEFAULT_PX,
				opacityPercent: CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT,
			}),
		);
	});

	test("clamps out-of-range values read from existing settings", () => {
		setSillyTavernContext(
			createContext({
				extensionSettings: {
					astra_projecta: {
						chatBackgroundAppearance: {
							blurPx: 999,
							opacityPercent: -10,
							version: 1,
						},
					},
				},
			}),
		);
		const store = createChatBackgroundAppearanceStore();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({ blurPx: 5, opacityPercent: 0 }),
		);
	});

	test("falls back to defaults when stored values are malformed", () => {
		setSillyTavernContext(
			createContext({
				extensionSettings: {
					astra_projecta: {
						chatBackgroundAppearance: {
							blurPx: "nope",
							opacityPercent: null,
						},
					},
				},
			}),
		);
		const store = createChatBackgroundAppearanceStore();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				blurPx: CHAT_BACKGROUND_BLUR_DEFAULT_PX,
				opacityPercent: CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT,
			}),
		);
	});

	test("setBlurPx clamps, persists, and notifies subscribers", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatBackgroundAppearanceStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.setBlurPx(999);

		expect(store.getSnapshot().blurPx).toBe(5);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(
			(
				context.extensionSettings as Record<
					string,
					Record<string, unknown>
				>
			).astra_projecta.chatBackgroundAppearance,
		).toEqual(expect.objectContaining({ blurPx: 5 }));
	});

	test("setOpacityPercent clamps and persists", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatBackgroundAppearanceStore();

		store.setOpacityPercent(-50);

		expect(store.getSnapshot().opacityPercent).toBe(0);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
	});

	test("setAppearance clamps, persists once, and notifies subscribers once", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatBackgroundAppearanceStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.setAppearance({ blurPx: 999, opacityPercent: -50 });

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({ blurPx: 5, opacityPercent: 0 }),
		);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(
			(
				context.extensionSettings as Record<
					string,
					Record<string, unknown>
				>
			).astra_projecta.chatBackgroundAppearance,
		).toEqual(expect.objectContaining({ blurPx: 5, opacityPercent: 0 }));
	});

	test("resetBlur and resetOpacity restore defaults", () => {
		setSillyTavernContext(createContext());
		const store = createChatBackgroundAppearanceStore();
		store.setBlurPx(5);
		store.setOpacityPercent(0);

		store.resetBlur();
		store.resetOpacity();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				blurPx: CHAT_BACKGROUND_BLUR_DEFAULT_PX,
				opacityPercent: CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT,
			}),
		);
	});

	test("dispose stops notifying subscribers", () => {
		setSillyTavernContext(createContext());
		const store = createChatBackgroundAppearanceStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.dispose();
		store.setBlurPx(3);

		expect(listener).not.toHaveBeenCalled();
	});

	test("syncs across store instances via the shared change event", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const storeA = createChatBackgroundAppearanceStore();
		const storeB = createChatBackgroundAppearanceStore();
		const listenerB = vi.fn();
		storeB.subscribe(listenerB);

		storeA.setBlurPx(4);

		expect(listenerB).toHaveBeenCalledTimes(1);
		expect(storeB.getSnapshot().blurPx).toBe(4);

		storeA.dispose();
		storeB.dispose();
	});

	test("dispatches the documented change event name", () => {
		setSillyTavernContext(createContext());
		const changeListener = vi.fn();
		window.addEventListener(
			CHAT_BACKGROUND_APPEARANCE_CHANGE_EVENT,
			changeListener,
		);
		const store = createChatBackgroundAppearanceStore();

		store.setBlurPx(1);

		expect(changeListener).toHaveBeenCalledTimes(1);
		store.dispose();
		window.removeEventListener(
			CHAT_BACKGROUND_APPEARANCE_CHANGE_EVENT,
			changeListener,
		);
	});
});
