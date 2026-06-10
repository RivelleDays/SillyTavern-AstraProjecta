import { describe, expect, test, vi } from "vitest";

import {
	createChatMessageSwipeStore,
	readChatMessageSwipeSnapshot,
	swipeNext,
	swipePrevious,
} from "@/packages/core/st/chatMessageSwipe";

type Listener = (...args: unknown[]) => void;

function createEventSourceStub() {
	const listeners = new Map<string, Set<Listener>>();

	return {
		emit(event: string, ...args: unknown[]) {
			const activeListeners = listeners.get(event);
			if (!activeListeners) {
				return;
			}

			for (const listener of activeListeners) {
				listener(...args);
			}
		},
		listenerCount(event: string) {
			return listeners.get(event)?.size ?? 0;
		},
		on(event: string, listener: Listener) {
			const activeListeners = listeners.get(event) ?? new Set<Listener>();
			activeListeners.add(listener);
			listeners.set(event, activeListeners);
		},
		removeListener(event: string, listener: Listener) {
			listeners.get(event)?.delete(listener);
		},
	};
}

function setSillyTavernContext(context: unknown | { current: unknown }) {
	const contextRef =
		typeof context === "object" && context !== null && "current" in context
			? context
			: { current: context };

	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => contextRef.current,
	};
}

describe("chat message swipe adapter", () => {
	const idleSnapshot = {
		canSwipeNext: false,
		canSwipePrevious: false,
		currentIndex: 0,
		isNativeSwipeBusy: false,
		messageId: null,
		status: "idle" as const,
		total: 1,
		updatedAt: 0,
	};

	test("reports the last non-user message as ready with a clamped swipe counter", () => {
		setSillyTavernContext({
			chat: [
				{ is_user: true, mes: "hello" },
				{
					extra: {},
					is_user: false,
					swipe_id: 5,
					swipes: ["first", "second"],
				},
			],
			swipe: {
				isAllowed: () => true,
				to: vi.fn(),
			},
		});

		expect(readChatMessageSwipeSnapshot()).toEqual({
			canSwipeNext: true,
			canSwipePrevious: true,
			currentIndex: 1,
			isNativeSwipeBusy: false,
			messageId: 1,
			status: "ready",
			total: 2,
			updatedAt: 0,
		});
	});

	test("stays idle for empty, user, non-last, small-system, and disabled messages", () => {
		setSillyTavernContext({
			chat: [],
			swipe: { isAllowed: () => true, to: vi.fn() },
		});
		expect(readChatMessageSwipeSnapshot()).toEqual(idleSnapshot);

		setSillyTavernContext({
			chat: [{ is_user: true }],
			swipe: { isAllowed: () => true, to: vi.fn() },
		});
		expect(readChatMessageSwipeSnapshot()).toEqual(idleSnapshot);

		setSillyTavernContext({
			chat: [
				{ is_user: false, swipes: ["first", "second"] },
				{ is_user: true },
			],
			swipe: { isAllowed: () => true, to: vi.fn() },
		});
		expect(readChatMessageSwipeSnapshot()).toEqual(idleSnapshot);

		setSillyTavernContext({
			chat: [{ extra: { isSmallSys: true }, is_user: false }],
			swipe: { isAllowed: () => true, to: vi.fn() },
		});
		expect(readChatMessageSwipeSnapshot()).toEqual(idleSnapshot);

		setSillyTavernContext({
			chat: [{ extra: { swipeable: false }, is_user: false }],
			swipe: { isAllowed: () => true, to: vi.fn() },
		});
		expect(readChatMessageSwipeSnapshot()).toEqual(idleSnapshot);

		setSillyTavernContext({
			chat: [{ is_user: false }],
			swipe: { isAllowed: () => false, to: vi.fn() },
		});
		expect(readChatMessageSwipeSnapshot()).toEqual(idleSnapshot);
	});

	test("hides the swipe pager for a pristine first greeting with one swipe", () => {
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					swipe_id: 0,
					swipes: ["Greeting"],
				},
			],
			chatMetadata: {},
			swipe: { isAllowed: () => true, to: vi.fn() },
		});

		expect(readChatMessageSwipeSnapshot()).toEqual(idleSnapshot);
	});

	test("keeps pristine first greetings with alternate greetings swipeable", () => {
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					swipe_id: 0,
					swipes: ["Greeting", "Alternate greeting"],
				},
			],
			chatMetadata: {},
			swipe: { isAllowed: () => true, to: vi.fn() },
		});

		expect(readChatMessageSwipeSnapshot()).toEqual({
			canSwipeNext: true,
			canSwipePrevious: true,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: 0,
			status: "ready",
			total: 2,
			updatedAt: 0,
		});
	});

	test("keeps tainted single assistant messages ready for native regenerate", async () => {
		const to = vi.fn();
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					swipe_id: 0,
					swipes: ["Regenerable response"],
				},
			],
			chatMetadata: { tainted: true },
			swipe: { isAllowed: () => true, to },
		});

		expect(readChatMessageSwipeSnapshot()).toEqual({
			canSwipeNext: true,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: 0,
			status: "ready",
			total: 1,
			updatedAt: 0,
		});

		await expect(swipePrevious()).resolves.toBe(false);
		await expect(swipeNext()).resolves.toBe(true);
		expect(to).toHaveBeenCalledTimes(1);
		expect(to).toHaveBeenCalledWith(null, "right", { forceMesId: 0 });
	});

	test("hides single non-regenerating system messages", () => {
		setSillyTavernContext({
			chat: [
				{
					is_system: true,
					is_user: false,
					swipe_id: 0,
					swipes: ["System message"],
				},
			],
			chatMetadata: { tainted: true },
			swipe: { isAllowed: () => true, to: vi.fn() },
		});

		expect(readChatMessageSwipeSnapshot()).toEqual(idleSnapshot);
	});

	test("calls the native swipe API with the target message id and direction", async () => {
		const to = vi.fn();
		setSillyTavernContext({
			chat: [
				{ is_user: true },
				{
					is_user: false,
					swipe_id: 1,
					swipes: ["first", "second"],
				},
			],
			swipe: {
				isAllowed: () => true,
				to,
			},
		});

		await swipePrevious();
		await swipeNext();

		expect(to).toHaveBeenNthCalledWith(1, null, "left", {
			forceMesId: 1,
		});
		expect(to).toHaveBeenNthCalledWith(2, null, "right", {
			forceMesId: 1,
		});
	});

	test("keeps the last message ready while native swipe is busy", () => {
		setSillyTavernContext({
			chat: [
				{
					is_user: false,
					swipe_id: 1,
					swipes: ["first", "second", "third"],
				},
			],
			swipe: {
				isAllowed: () => false,
				state: () => "swiping",
				to: vi.fn(),
			},
		});

		expect(readChatMessageSwipeSnapshot()).toEqual({
			canSwipeNext: true,
			canSwipePrevious: true,
			currentIndex: 1,
			isNativeSwipeBusy: true,
			messageId: 0,
			status: "ready",
			total: 3,
			updatedAt: 0,
		});
	});

	test("does not trigger another native swipe while native swipe is busy", async () => {
		const to = vi.fn();
		setSillyTavernContext({
			chat: [{ is_user: false, swipes: ["first", "second"] }],
			swipe: {
				isAllowed: () => false,
				state: () => "swiping",
				to,
			},
		});

		await expect(swipeNext()).resolves.toBe(false);
		await expect(swipePrevious()).resolves.toBe(false);

		expect(to).not.toHaveBeenCalled();
	});

	test("store swipe methods refresh after the native swipe settles", async () => {
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				chat: [
					{
						is_user: false,
						swipe_id: 0,
						swipes: ["first", "second"],
					},
				],
				swipe: {
					isAllowed: () => true,
					to: vi.fn(async () => {
						contextRef.current = {
							...contextRef.current,
							chat: [
								{
									is_user: false,
									swipe_id: 1,
									swipes: ["first", "second"],
								},
							],
						};
					}),
				},
			},
		};
		setSillyTavernContext(contextRef);
		const listener = vi.fn();
		const store = createChatMessageSwipeStore({ now: () => 10 });

		store.subscribe(listener);
		await expect(store.swipeNext()).resolves.toBe(true);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			currentIndex: 1,
			isNativeSwipeBusy: false,
			status: "ready",
			total: 2,
		});
	});

	test("refreshes subscribers on SillyTavern swipe events and removes listeners on dispose", () => {
		const eventSource = createEventSourceStub();
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				chat: [{ is_user: false, swipes: ["first"] }],
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHARACTER_MESSAGE_RENDERED: "character_message_rendered",
					GENERATION_STARTED: "generation_started",
					GENERATION_STOPPED: "generation_stopped",
					MESSAGE_DELETED: "message_deleted",
					MESSAGE_EDITED: "message_edited",
					MESSAGE_SWIPE_DELETED: "message_swipe_deleted",
					MESSAGE_SWIPED: "message_swiped",
					MESSAGE_UPDATED: "message_updated",
					USER_MESSAGE_RENDERED: "user_message_rendered",
				},
				swipe: { isAllowed: () => true, to: vi.fn() },
			},
		};
		setSillyTavernContext(contextRef);
		const listener = vi.fn();
		const store = createChatMessageSwipeStore();

		store.subscribe(listener);
		expect(eventSource.listenerCount("message_swiped")).toBe(1);

		contextRef.current = {
			...contextRef.current,
			chat: [
				{
					is_user: false,
					swipe_id: 1,
					swipes: ["first", "second"],
				},
			],
		};
		eventSource.emit("message_swiped", 0);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			currentIndex: 1,
			isNativeSwipeBusy: false,
			status: "ready",
			total: 2,
		});

		store.dispose();
		expect(eventSource.listenerCount("message_swiped")).toBe(0);

		eventSource.emit("message_swiped", 0);
		expect(listener).toHaveBeenCalledTimes(1);
	});
});
