import { afterEach, describe, expect, test, vi } from "vitest";

import {
	CHAT_MESSAGE_INTERACTION_CHANGE_EVENT,
	CHAT_MESSAGE_LONG_PRESS_ACTION_DEFAULT,
	createChatMessageInteractionStore,
} from "@/packages/core/st/chat-message-interaction";

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

describe("chat message interaction store", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("returns disabled long press action by default", () => {
		setSillyTavernContext(createContext());
		const store = createChatMessageInteractionStore();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				longPressAction: CHAT_MESSAGE_LONG_PRESS_ACTION_DEFAULT,
			}),
		);
	});

	test("reads a valid stored long press action", () => {
		setSillyTavernContext(
			createContext({
				extensionSettings: {
					astra_projecta: {
						chatMessageInteraction: {
							longPressAction: "edit-message",
							version: 1,
						},
					},
				},
			}),
		);
		const store = createChatMessageInteractionStore();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				longPressAction: "edit-message",
			}),
		);
	});

	test("falls back to disabled when stored long press action is invalid", () => {
		setSillyTavernContext(
			createContext({
				extensionSettings: {
					astra_projecta: {
						chatMessageInteraction: {
							longPressAction: "native-copy",
							version: 1,
						},
					},
				},
			}),
		);
		const store = createChatMessageInteractionStore();

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				longPressAction: CHAT_MESSAGE_LONG_PRESS_ACTION_DEFAULT,
			}),
		);
	});

	test("setInteraction normalizes, persists once, and notifies subscribers once", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatMessageInteractionStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.setInteraction({
			longPressAction: "message-actions",
		});

		expect(store.getSnapshot()).toEqual(
			expect.objectContaining({
				longPressAction: "message-actions",
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
			).astra_projecta.chatMessageInteraction,
		).toEqual(
			expect.objectContaining({
				longPressAction: "message-actions",
				version: 1,
			}),
		);
	});

	test("dispose stops notifying subscribers", () => {
		setSillyTavernContext(createContext());
		const store = createChatMessageInteractionStore();
		const listener = vi.fn();
		store.subscribe(listener);

		store.dispose();
		store.setInteraction({
			longPressAction: "edit-message",
		});

		expect(listener).not.toHaveBeenCalled();
	});

	test("syncs across store instances via the shared change event", () => {
		setSillyTavernContext(createContext());
		const storeA = createChatMessageInteractionStore();
		const storeB = createChatMessageInteractionStore();
		const listenerB = vi.fn();
		storeB.subscribe(listenerB);

		storeA.setInteraction({
			longPressAction: "edit-message",
		});

		expect(listenerB).toHaveBeenCalledTimes(1);
		expect(storeB.getSnapshot()).toEqual(
			expect.objectContaining({
				longPressAction: "edit-message",
			}),
		);

		storeA.dispose();
		storeB.dispose();
	});

	test("dispatches the documented change event name", () => {
		setSillyTavernContext(createContext());
		const changeListener = vi.fn();
		window.addEventListener(
			CHAT_MESSAGE_INTERACTION_CHANGE_EVENT,
			changeListener,
		);
		const store = createChatMessageInteractionStore();

		store.setInteraction({
			longPressAction: "message-actions",
		});

		expect(changeListener).toHaveBeenCalledTimes(1);
		store.dispose();
		window.removeEventListener(
			CHAT_MESSAGE_INTERACTION_CHANGE_EVENT,
			changeListener,
		);
	});
});
