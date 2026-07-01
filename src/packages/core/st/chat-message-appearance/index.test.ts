import { afterEach, describe, expect, test, vi } from "vitest";

import {
	CHAT_MESSAGE_APPEARANCE_CHANGE_EVENT,
	CHAT_MESSAGE_LINE_HEIGHT_DEFAULT,
	CHAT_MESSAGE_SHOW_TIMELINE_DEFAULT,
	CHAT_MESSAGE_TEXT_ALIGN_DEFAULT,
	createChatMessageAppearanceStore,
} from "@/packages/core/st/chat-message-appearance";

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

describe("chat message appearance store", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("returns default line height and text align when settings are empty", () => {
		setSillyTavernContext(createContext());
		const store = createChatMessageAppearanceStore();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				lineHeight: CHAT_MESSAGE_LINE_HEIGHT_DEFAULT,
				showTimeline: CHAT_MESSAGE_SHOW_TIMELINE_DEFAULT,
				textAlign: CHAT_MESSAGE_TEXT_ALIGN_DEFAULT,
			}),
		);
	});

	test("reads valid stored options", () => {
		setSillyTavernContext(
			createContext({
				extensionSettings: {
					astra_projecta: {
						chatMessageAppearance: {
							lineHeight: "lg",
							showTimeline: false,
							textAlign: "center",
							version: 1,
						},
					},
				},
			}),
		);
		const store = createChatMessageAppearanceStore();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				lineHeight: "lg",
				showTimeline: false,
				textAlign: "center",
			}),
		);
	});

	test("falls back to defaults when stored values are invalid options", () => {
		setSillyTavernContext(
			createContext({
				extensionSettings: {
					astra_projecta: {
						chatMessageAppearance: {
							lineHeight: "huge",
							showTimeline: "nope",
							textAlign: 42,
						},
					},
				},
			}),
		);
		const store = createChatMessageAppearanceStore();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				lineHeight: CHAT_MESSAGE_LINE_HEIGHT_DEFAULT,
				showTimeline: CHAT_MESSAGE_SHOW_TIMELINE_DEFAULT,
				textAlign: CHAT_MESSAGE_TEXT_ALIGN_DEFAULT,
			}),
		);
	});

	test("setAppearance normalizes, persists once, and notifies subscribers once", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatMessageAppearanceStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.setAppearance({
			lineHeight: "sm",
			showTimeline: false,
			textAlign: "justify",
		});

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				lineHeight: "sm",
				showTimeline: false,
				textAlign: "justify",
			}),
		);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(
			(
				context.extensionSettings as Record<
					string,
					Record<string, unknown>
				>
		).astra_projecta.chatMessageAppearance,
		).toEqual(
			expect.objectContaining({
				lineHeight: "sm",
				showTimeline: false,
				textAlign: "justify",
			}),
		);
	});

	test("setAppearance coerces invalid options to defaults before persisting", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatMessageAppearanceStore();

		store.setAppearance({
			lineHeight: "nope" as never,
			showTimeline: "hidden" as never,
			textAlign: "diagonal" as never,
		});

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				lineHeight: CHAT_MESSAGE_LINE_HEIGHT_DEFAULT,
				showTimeline: CHAT_MESSAGE_SHOW_TIMELINE_DEFAULT,
				textAlign: CHAT_MESSAGE_TEXT_ALIGN_DEFAULT,
			}),
		);
	});

	test("dispose stops notifying subscribers", () => {
		setSillyTavernContext(createContext());
		const store = createChatMessageAppearanceStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.dispose();
		store.setAppearance({
			lineHeight: "lg",
			showTimeline: false,
			textAlign: "end",
		});

		expect(listener).not.toHaveBeenCalled();
	});

	test("syncs across store instances via the shared change event", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const storeA = createChatMessageAppearanceStore();
		const storeB = createChatMessageAppearanceStore();
		const listenerB = vi.fn();
		storeB.subscribe(listenerB);

		storeA.setAppearance({
			lineHeight: "lg",
			showTimeline: false,
			textAlign: "end",
		});

		expect(listenerB).toHaveBeenCalledTimes(1);
		expect(storeB.getSnapshot()).toEqual(
			expect.objectContaining({
				lineHeight: "lg",
				showTimeline: false,
				textAlign: "end",
			}),
		);

		storeA.dispose();
		storeB.dispose();
	});

	test("dispatches the documented change event name", () => {
		setSillyTavernContext(createContext());
		const changeListener = vi.fn();
		window.addEventListener(
			CHAT_MESSAGE_APPEARANCE_CHANGE_EVENT,
			changeListener,
		);
		const store = createChatMessageAppearanceStore();

		store.setAppearance({
			lineHeight: "sm",
			showTimeline: false,
			textAlign: "center",
		});

		expect(changeListener).toHaveBeenCalledTimes(1);
		store.dispose();
		window.removeEventListener(
			CHAT_MESSAGE_APPEARANCE_CHANGE_EVENT,
			changeListener,
		);
	});
});
