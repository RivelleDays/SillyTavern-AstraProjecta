import { afterEach, describe, expect, test, vi } from "vitest";

import {
	readCurrentChatMessageSearchMessages,
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
			{ mes: "base", messageId: 0 },
			{ mes: "active", messageId: 1 },
			{ mes: "", messageId: 2 },
		]);
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
