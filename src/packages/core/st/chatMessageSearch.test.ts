import { afterEach, describe, expect, test, vi } from "vitest";

import {
	readCurrentChatMessageSearchMessages,
	saveCurrentChatMessageSearchTextEdits,
	subscribeToCurrentChatMessageSearchChanges,
} from "@/packages/core/st/chatMessageSearch";

type Listener = (...args: unknown[]) => void;

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
