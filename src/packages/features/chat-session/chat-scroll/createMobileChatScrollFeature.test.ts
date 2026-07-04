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

async function flushMutationObservers() {
	await Promise.resolve();
	await Promise.resolve();
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
		expect(document.getElementById("chat")).toHaveClass(
			"mobile-chat-transcript",
		);

		feature.unmount();

		expect(document.getElementById("chat")).not.toHaveAttribute(
			"data-astra-projecta-chat-scroll",
		);
		expect(document.getElementById("chat")).not.toHaveClass(
			"mobile-chat-transcript",
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

	test("subscribes to generation settled events and removes listeners on dispose", () => {
		document.body.innerHTML = '<div id="chat"></div>';
		const eventSource = new EventSourceStub();
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
					GENERATION_ENDED: "generation_ended",
					GENERATION_STOPPED: "generation_stopped",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			documentRef: document,
		});

		feature.mount();

		expect(eventSource.listenerCount("generation_ended")).toBe(1);
		expect(eventSource.listenerCount("generation_stopped")).toBe(1);

		feature.dispose();

		expect(eventSource.listenerCount("generation_ended")).toBe(0);
		expect(eventSource.listenerCount("generation_stopped")).toBe(0);
	});

	test.each(["generation_ended", "generation_stopped"])(
		"keeps #chat pinned to the bottom on %s when the user is already at the bottom",
		(generationEventName) => {
			vi.useFakeTimers();
			document.body.innerHTML =
				'<div id="chat"><div class="mes"></div></div>';
			const chat = document.getElementById("chat") as HTMLElement;
			const lastMessage = chat.lastElementChild as HTMLElement;
			let scrollHeight = 1000;
			installChatMetrics(chat, () => scrollHeight);
			const eventSource = new EventSourceStub();
			const frame = installAnimationFrame();
			let resizeCallback: ResizeObserverCallback | null = null;
			const resizeObserver = {
				disconnect: vi.fn(),
				observe: vi.fn(),
				unobserve: vi.fn(),
			};
			const ResizeObserverStub = vi.fn(
				(callback: ResizeObserverCallback) => {
					resizeCallback = callback;
					return resizeObserver;
				},
			);
			vi.stubGlobal("SillyTavern", {
				getContext: () => ({
					eventSource,
					eventTypes: {
						CHAT_CHANGED: "chat_changed",
						CHAT_LOADED: "chat_loaded",
						GENERATION_ENDED: "generation_ended",
						GENERATION_STOPPED: "generation_stopped",
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
			chat.scrollTop = 680;
			eventSource.emit(generationEventName);

			expect(resizeObserver.observe).toHaveBeenCalledWith(chat);
			expect(resizeObserver.observe).toHaveBeenCalledWith(lastMessage);

			scrollHeight = 1046;
			frame.flushFrames();

			expect(chat.scrollTop).toBe(1046);

			scrollHeight = 1100;
			const observedResizeCallback =
				resizeCallback as unknown as ResizeObserverCallback;
			observedResizeCallback(
				[],
				resizeObserver as unknown as ResizeObserver,
			);
			frame.flushFrames();

			expect(chat.scrollTop).toBe(1100);
		},
	);

	test("keeps bottom alignment when message actions render into an existing footer host after generation settles", async () => {
		vi.useFakeTimers();
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes">
					<div class="mes_block"></div>
					<div class="astra-mesActions" data-astra-component="mes-actions" data-astra-slot="footer"></div>
				</div>
			</div>
		`;
		const chat = document.getElementById("chat") as HTMLElement;
		const actionHost = document.querySelector(
			".astra-mesActions",
		) as HTMLElement;
		let isActionRendered = false;
		installChatMetrics(chat, () => (isActionRendered ? 1120 : 1000));
		const eventSource = new EventSourceStub();
		const frame = installAnimationFrame();
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
					GENERATION_ENDED: "generation_ended",
					GENERATION_STOPPED: "generation_stopped",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			requestAnimationFrame: frame.requestAnimationFrame,
			settleDurationMs: 120,
		});

		feature.mount();
		chat.scrollTop = 680;
		eventSource.emit("generation_ended");
		frame.flushFrames();

		expect(chat.scrollTop).toBe(1000);

		isActionRendered = true;
		actionHost.append(document.createElement("button"));
		await flushMutationObservers();
		frame.flushFrames();

		expect(chat.scrollTop).toBe(1120);

		feature.dispose();
	});

	test("keeps generation bottom alignment active for late iOS footer layout", async () => {
		vi.useFakeTimers();
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes">
					<div class="mes_block"></div>
					<div class="astra-mesActions" data-astra-component="mes-actions" data-astra-slot="footer"></div>
				</div>
			</div>
		`;
		const chat = document.getElementById("chat") as HTMLElement;
		const actionHost = document.querySelector(
			".astra-mesActions",
		) as HTMLElement;
		let isActionRendered = false;
		installChatMetrics(chat, () => (isActionRendered ? 1120 : 1000));
		const eventSource = new EventSourceStub();
		const frame = installAnimationFrame();
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					GENERATION_ENDED: "generation_ended",
					GENERATION_STOPPED: "generation_stopped",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			requestAnimationFrame: frame.requestAnimationFrame,
		});

		feature.mount();
		chat.scrollTop = 680;
		eventSource.emit("generation_ended");
		frame.flushFrames();
		vi.advanceTimersByTime(700);

		expect(chat.scrollTop).toBe(1000);

		isActionRendered = true;
		actionHost.append(document.createElement("button"));
		await flushMutationObservers();
		frame.flushFrames();

		expect(chat.scrollTop).toBe(1120);

		feature.dispose();
	});

	test("stops generation bottom alignment after the extended settle window", async () => {
		vi.useFakeTimers();
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes">
					<div class="mes_block"></div>
					<div class="astra-mesActions" data-astra-component="mes-actions" data-astra-slot="footer"></div>
				</div>
			</div>
		`;
		const chat = document.getElementById("chat") as HTMLElement;
		const actionHost = document.querySelector(
			".astra-mesActions",
		) as HTMLElement;
		let isActionRendered = false;
		installChatMetrics(chat, () => (isActionRendered ? 1120 : 1000));
		const eventSource = new EventSourceStub();
		const frame = installAnimationFrame();
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					GENERATION_ENDED: "generation_ended",
					GENERATION_STOPPED: "generation_stopped",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			requestAnimationFrame: frame.requestAnimationFrame,
		});

		feature.mount();
		chat.scrollTop = 680;
		eventSource.emit("generation_ended");
		frame.flushFrames();
		vi.advanceTimersByTime(900);

		expect(chat.scrollTop).toBe(1000);

		isActionRendered = true;
		actionHost.append(document.createElement("button"));
		await flushMutationObservers();
		frame.flushFrames();

		expect(chat.scrollTop).toBe(1000);

		feature.dispose();
	});

	test("leaves the scroll position alone after generation when reading earlier messages", () => {
		document.body.innerHTML =
			'<div id="chat"><div class="mes"></div></div>';
		const chat = document.getElementById("chat") as HTMLElement;
		let scrollHeight = 1000;
		installChatMetrics(chat, () => scrollHeight);
		const eventSource = new EventSourceStub();
		const frame = installAnimationFrame();
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
					GENERATION_ENDED: "generation_ended",
					GENERATION_STOPPED: "generation_stopped",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			requestAnimationFrame: frame.requestAnimationFrame,
		});

		feature.mount();
		chat.scrollTop = 200;
		eventSource.emit("generation_ended");
		scrollHeight = 1046;
		frame.flushFrames();

		expect(chat.scrollTop).toBe(200);
	});

	test("does not restore bottom alignment from late footer mutations after the user scrolls up during generation settle", async () => {
		vi.useFakeTimers();
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes">
					<div class="mes_block"></div>
					<div class="astra-mesActions" data-astra-component="mes-actions" data-astra-slot="footer"></div>
				</div>
			</div>
		`;
		const chat = document.getElementById("chat") as HTMLElement;
		const actionHost = document.querySelector(
			".astra-mesActions",
		) as HTMLElement;
		let isActionRendered = false;
		installChatMetrics(chat, () => (isActionRendered ? 1120 : 1000));
		const eventSource = new EventSourceStub();
		const frame = installAnimationFrame();
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
					GENERATION_ENDED: "generation_ended",
					GENERATION_STOPPED: "generation_stopped",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			requestAnimationFrame: frame.requestAnimationFrame,
			settleDurationMs: 120,
		});

		feature.mount();
		chat.scrollTop = 680;
		eventSource.emit("generation_ended");
		chat.scrollTop = 200;
		chat.dispatchEvent(new Event("scroll"));

		isActionRendered = true;
		actionHost.append(document.createElement("button"));
		await flushMutationObservers();
		frame.flushFrames();

		expect(chat.scrollTop).toBe(200);

		feature.dispose();
	});

	test("disconnects the settle mutation observer on dispose", () => {
		vi.useFakeTimers();
		document.body.innerHTML =
			'<div id="chat"><div class="mes"></div></div>';
		const chat = document.getElementById("chat") as HTMLElement;
		installChatMetrics(chat, 1000);
		const eventSource = new EventSourceStub();
		const disconnect = vi.fn();
		const observe = vi.fn();
		const MutationObserverStub = vi.fn(() => ({
			disconnect,
			observe,
			takeRecords: vi.fn(),
		}));
		const originalMutationObserver = window.MutationObserver;
		Object.defineProperty(window, "MutationObserver", {
			configurable: true,
			value: MutationObserverStub,
			writable: true,
		});
		vi.stubGlobal("SillyTavern", {
			getContext: () => ({
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
					GENERATION_ENDED: "generation_ended",
					GENERATION_STOPPED: "generation_stopped",
				},
			}),
		});
		const feature = createMobileChatScrollFeature({
			documentRef: document,
			settleDurationMs: 120,
		});

		try {
			feature.mount();
			chat.scrollTop = 680;
			eventSource.emit("generation_ended");

			expect(MutationObserverStub).toHaveBeenCalledTimes(1);
			expect(observe).toHaveBeenCalledWith(chat, {
				childList: true,
				subtree: true,
			});

			feature.dispose();

			expect(disconnect).toHaveBeenCalledTimes(1);
		} finally {
			Object.defineProperty(window, "MutationObserver", {
				configurable: true,
				value: originalMutationObserver,
				writable: true,
			});
		}
	});

	test("does not throw when #chat or SillyTavern context is unavailable", () => {
		const feature = createMobileChatScrollFeature({
			documentRef: document,
		});

		expect(() => feature.mount()).not.toThrow();
		expect(() => feature.unmount()).not.toThrow();
	});
});
