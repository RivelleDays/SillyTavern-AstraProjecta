import { afterEach, describe, expect, test, vi } from "vitest";

import {
	createDefaultChatMessageSearchStore,
	readCurrentChatMessageSearchMessages,
	saveCurrentChatMessageSearchTextEdits,
	subscribeToCurrentChatMessageSearchChanges,
} from "@/packages/core/st/chatMessageSearch";

type Listener = (...args: unknown[]) => void;

type TestMessage = {
	extra?: Record<string, unknown>;
	is_user?: boolean;
	mes?: string;
	name?: string;
	swipe_id?: number;
	swipes?: string[];
};

function createEventSourceStub() {
	const listeners = new Map<string, Set<Listener>>();

	return {
		emit(event: string) {
			listeners.get(event)?.forEach((listener) => {
				listener();
			});
		},
		listenerCount(event: string) {
			return listeners.get(event)?.size ?? 0;
		},
		on(event: string, listener: Listener) {
			const active = listeners.get(event) ?? new Set<Listener>();
			active.add(listener);
			listeners.set(event, active);
		},
		removeListener(event: string, listener: Listener) {
			listeners.get(event)?.delete(listener);
		},
	};
}

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("chat message search SillyTavern adapter", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("reads message body text and prefers the active swipe text", () => {
		setSillyTavernContext({
			chat: [
				{ mes: "base" },
				{ mes: "first", swipe_id: 1, swipes: ["first", "active"] },
				{ mes: 123 },
			],
		});

		expect(readCurrentChatMessageSearchMessages()).toEqual([
			{ mes: "base", messageId: 0, swipeId: null },
			{ mes: "active", messageId: 1, swipeId: 1 },
			{ mes: "", messageId: 2, swipeId: null },
		]);
	});

	test("saves replacement text to only the active swipe", async () => {
		const saveChat = vi.fn(async () => undefined);
		const chat = [
			{
				mes: "visible cat",
				swipe_id: 1,
				swipes: ["hidden cat", "visible cat"],
			},
		];
		setSillyTavernContext({ chat, saveChat });

		const messages = readCurrentChatMessageSearchMessages();
		expect(messages).toEqual([
			{ mes: "visible cat", messageId: 0, swipeId: 1 },
		]);

		await expect(
			saveCurrentChatMessageSearchTextEdits({
				edits: [
					{
						messageId: messages[0].messageId,
						messageText: "visible dog",
						swipeId: messages[0].swipeId,
					},
				],
			}),
		).resolves.toEqual({ messageIds: [0], ok: true });

		expect(chat[0].mes).toBe("visible dog");
		expect(chat[0].swipes).toEqual(["hidden cat", "visible dog"]);
		expect(saveChat).toHaveBeenCalledTimes(1);
	});

	test("default store replaces all matches through the SillyTavern edit adapter", async () => {
		const saveChat = vi.fn(async () => undefined);
		const updateMessageBlock = vi.fn();
		const eventSource = { emit: vi.fn(async () => undefined) };
		const chat: TestMessage[] = [
			{
				extra: {
					display_text: "Translated cat cat",
					reasoning_display_text: "Translated reasoning",
				},
				is_user: false,
				mes: "cat cat",
				name: "Assistant",
				swipe_id: 0,
				swipes: ["cat cat"],
			},
			{
				is_user: false,
				mes: "visible cat",
				name: "Assistant",
				swipe_id: 1,
				swipes: ["hidden cat", "visible cat"],
			},
			{ is_user: true, mes: "no match" },
		];
		setSillyTavernContext({
			chat,
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_UPDATED: "message_updated",
			},
			powerUserSettings: { trim_spaces: false },
			saveChat,
			substituteParams: (value: string) => value,
			updateMessageBlock,
		});
		const store = createDefaultChatMessageSearchStore();

		store.open();
		store.setQuery("cat");
		store.setReplaceText("dog");

		await expect(store.replaceAll()).resolves.toBe(true);

		expect(chat[0].mes).toBe("dog dog");
		expect(chat[0].swipes).toEqual(["dog dog"]);
		expect(chat[0].extra?.display_text).toBeUndefined();
		expect(chat[0].extra?.reasoning_display_text).toBe(
			"Translated reasoning",
		);
		expect(chat[1].mes).toBe("visible dog");
		expect(chat[1].swipes).toEqual(["hidden cat", "visible dog"]);
		expect(chat[2].mes).toBe("no match");
		expect(updateMessageBlock).toHaveBeenCalledWith(0, chat[0]);
		expect(updateMessageBlock).toHaveBeenCalledWith(1, chat[1]);
		expect(saveChat).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			canUndo: true,
			matchCount: 0,
		});

		store.dispose();
	});

	test("subscribes to chat load and change events with cleanup", () => {
		const eventSource = createEventSourceStub();
		const listener = vi.fn();
		setSillyTavernContext({
			eventSource,
			event_types: {
				CHAT_CHANGED: "chat_changed",
				CHAT_LOADED: "chat_loaded",
			},
		});

		const unsubscribe = subscribeToCurrentChatMessageSearchChanges(listener);
		expect(eventSource.listenerCount("chat_changed")).toBe(1);
		expect(eventSource.listenerCount("chat_loaded")).toBe(1);

		eventSource.emit("chat_changed");
		eventSource.emit("chat_loaded");
		expect(listener).toHaveBeenCalledTimes(2);

		unsubscribe();
		eventSource.emit("chat_changed");
		expect(listener).toHaveBeenCalledTimes(2);
		expect(eventSource.listenerCount("chat_changed")).toBe(0);
		expect(eventSource.listenerCount("chat_loaded")).toBe(0);
	});
});
