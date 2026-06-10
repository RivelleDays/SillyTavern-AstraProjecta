import { afterEach, describe, expect, test, vi } from "vitest";

import { createMobileChatScrollFeature } from "@/packages/features/chat-session/chat-scroll/createMobileChatScrollFeature";

type Listener = (...args: unknown[]) => void;

class EventSourceStub {
	listeners = new Map<string, Set<Listener>>();

	emit(event: string, ...args: unknown[]) {
		for (const listener of this.listeners.get(event) ?? []) {
			listener(...args);
		}
	}

	listenerCount(event: string) {
		return this.listeners.get(event)?.size ?? 0;
	}

	on(event: string, listener: Listener) {
		const listeners = this.listeners.get(event) ?? new Set<Listener>();
		listeners.add(listener);
		this.listeners.set(event, listeners);
	}

	removeListener(event: string, listener: Listener) {
		this.listeners.get(event)?.delete(listener);
	}
}

function installChatMetrics(
	chat: HTMLElement,
	scrollHeight: number | (() => number),
) {
	Object.defineProperty(chat, "scrollHeight", {
		configurable: true,
		get: () =>
			typeof scrollHeight === "function" ? scrollHeight() : scrollHeight,
	});
	Object.defineProperty(chat, "clientHeight", {
		configurable: true,
		get: () => 320,
	});
}

function installAnimationFrame() {
	const callbacks: FrameRequestCallback[] = [];
	const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
		callbacks.push(callback);
		return callbacks.length;
	});
	const cancelAnimationFrame = vi.fn((id: number) => {
		callbacks[id - 1] = () => undefined;
	});

	return {
		cancelAnimationFrame,
		flushFrames() {
			const pending = callbacks.splice(0);
			for (const callback of pending) {
				callback(0);
			}
		},
		requestAnimationFrame,
	};
}

describe("createMobileChatScrollFeature", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	test("marks and unmarks the native #chat scroll container", () => {
		document.body.innerHTML = '<div id="chat"></div>';
		const feature = createMobileChatScrollFeature({
			documentRef: document,
		});

		feature.mount();

		expect(document.getElementById("chat")).toHaveAttribute(
			"data-astra-projecta-chat-scroll",
			"native",
		);

		feature.unmount();

		expect(document.getElementById("chat")).not.toHaveAttribute(
			"data-astra-projecta-chat-scroll",
		);
	});

	test("updates top and bottom fade attributes from native #chat scroll position", () => {
		document.body.innerHTML = '<div id="chat"></div>';
		const chat = document.getElementById("chat") as HTMLElement;
		installChatMetrics(chat, 1000);
		const frame = installAnimationFrame();
		const feature = createMobileChatScrollFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			requestAnimationFrame: frame.requestAnimationFrame,
		});

		feature.mount();

		expect(chat).not.toHaveAttribute(
			"data-astra-projecta-chat-scroll-y-start",
		);
		expect(chat).toHaveAttribute("data-astra-projecta-chat-scroll-y-end");

		chat.scrollTop = 240;
		chat.dispatchEvent(new Event("scroll"));
		frame.flushFrames();

		expect(chat).toHaveAttribute("data-astra-projecta-chat-scroll-y-start");
		expect(chat).toHaveAttribute("data-astra-projecta-chat-scroll-y-end");

		chat.scrollTop = 680;
		chat.dispatchEvent(new Event("scroll"));
		frame.flushFrames();

		expect(chat).toHaveAttribute("data-astra-projecta-chat-scroll-y-start");
		expect(chat).not.toHaveAttribute(
			"data-astra-projecta-chat-scroll-y-end",
		);

		feature.unmount();

		expect(chat).not.toHaveAttribute(
			"data-astra-projecta-chat-scroll-y-start",
		);
		expect(chat).not.toHaveAttribute(
			"data-astra-projecta-chat-scroll-y-end",
		);
	});

	test("subscribes to chat load and change events and removes listeners on dispose", () => {
		document.body.innerHTML = '<div id="chat"></div>';
		const eventSource = new EventSourceStub();
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			documentRef: document,
		});

		feature.mount();

		expect(eventSource.listenerCount("chat_changed")).toBe(1);
		expect(eventSource.listenerCount("chat_loaded")).toBe(1);

		feature.dispose();

		expect(eventSource.listenerCount("chat_changed")).toBe(0);
		expect(eventSource.listenerCount("chat_loaded")).toBe(0);
	});

	test("coalesces chat events and scrolls #chat to the bottom on the next frame", () => {
		document.body.innerHTML = '<div id="chat"></div>';
		const chat = document.getElementById("chat") as HTMLElement;
		installChatMetrics(chat, 1200);
		const eventSource = new EventSourceStub();
		const frame = installAnimationFrame();
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			requestAnimationFrame: frame.requestAnimationFrame,
		});

		feature.mount();
		eventSource.emit("chat_loaded");
		eventSource.emit("chat_changed");

		expect(frame.requestAnimationFrame).toHaveBeenCalledTimes(1);
		expect(chat.scrollTop).toBe(0);

		frame.flushFrames();

		expect(chat.scrollTop).toBe(1200);
	});

	test("keeps bottom alignment during the post-chat-change settle window", () => {
		vi.useFakeTimers();
		document.body.innerHTML = '<div id="chat"></div>';
		const chat = document.getElementById("chat") as HTMLElement;
		let scrollHeight = 900;
		installChatMetrics(chat, () => scrollHeight);
		const eventSource = new EventSourceStub();
		const frame = installAnimationFrame();
		let resizeCallback: ResizeObserverCallback | null = null;
		const resizeObserver = {
			disconnect: vi.fn(),
			observe: vi.fn(),
			unobserve: vi.fn(),
		};
		const ResizeObserverStub = vi.fn((callback: ResizeObserverCallback) => {
			resizeCallback = callback;
			return resizeObserver;
		});
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			requestAnimationFrame: frame.requestAnimationFrame,
			ResizeObserver: ResizeObserverStub,
			settleDurationMs: 120,
		});

		feature.mount();
		eventSource.emit("chat_changed");
		frame.flushFrames();

		expect(chat.scrollTop).toBe(900);
		expect(ResizeObserverStub).toHaveBeenCalledTimes(1);
		expect(resizeObserver.observe).toHaveBeenCalledWith(chat);

		scrollHeight = 1260;
		const observedResizeCallback =
			resizeCallback as unknown as ResizeObserverCallback;
		observedResizeCallback([], resizeObserver as unknown as ResizeObserver);
		frame.flushFrames();

		expect(chat.scrollTop).toBe(1260);

		vi.advanceTimersByTime(120);

		expect(resizeObserver.disconnect).toHaveBeenCalledTimes(1);
	});

	test("does not throw when #chat or SillyTavern context is unavailable", () => {
		const feature = createMobileChatScrollFeature({
			documentRef: document,
		});

		expect(() => feature.mount()).not.toThrow();
		expect(() => feature.unmount()).not.toThrow();
	});
});
