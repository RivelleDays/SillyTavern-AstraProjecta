import { afterEach, describe, expect, test, vi } from "vitest";

import { createMobileChatSwitchLoadingFeature } from "@/packages/features/chat-session/chat-switch-loading";

type Listener = (...args: unknown[]) => void;

class EventSourceStub {
	private listeners = new Map<string, Set<Listener>>();

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

function installAnimationFrameQueue() {
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
		flushFrame() {
			const callback = callbacks.shift();
			callback?.(0);
		},
		flushFrames(limit = 20) {
			let count = 0;
			while (callbacks.length > 0 && count < limit) {
				this.flushFrame();
				count += 1;
			}
		},
		get pendingFrameCount() {
			return callbacks.length;
		},
		requestAnimationFrame,
	};
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

function installResizeObserver() {
	let callback: ResizeObserverCallback | null = null;
	const observer = {
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	};
	const ResizeObserverStub = vi.fn((nextCallback: ResizeObserverCallback) => {
		callback = nextCallback;
		return observer;
	});

	return {
		emit() {
			callback?.([], observer as unknown as ResizeObserver);
		},
		observer,
		ResizeObserverStub,
	};
}

function setSillyTavernContext(context: unknown) {
	const contextRef =
		typeof context === "object" && context !== null && "current" in context
			? (context as { current: unknown })
			: { current: context };

	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => contextRef.current,
	};
}

function renderReadyChat({
	messageCount = 1,
	scrollHeight = 900,
}: {
	messageCount?: number;
	scrollHeight?: number;
} = {}) {
	document.body.innerHTML = `
		<div id="sheld">
			<div id="chat">
				${Array.from({ length: messageCount }, (_, index) => {
					const timestamp =
						index === 0 ? '<small class="timestamp"></small>' : "";
					const timestampMeta =
						index === 0
							? '<div class="astra-mesMeta__time"></div>'
							: "";
					return `
						<div class="mes" mesid="${index}">
							<div class="mesAvatarWrapper"></div>
							<div class="astra-mesHeader"></div>
							<div class="mes_block">
								<div class="ch_name"></div>
								${timestamp}
							</div>
							<div class="astra-mesMeta">
								${timestampMeta}
							</div>
							<div class="astra-mesActions" data-astra-component="mes-actions" data-astra-slot="footer">
								<div class="astra-mesActions__left">
									<div class="astra-mesActions__leftDefault">
										<div class="astra-mesActions__moreHost"></div>
									</div>
								</div>
							</div>
						</div>
					`;
				}).join("")}
			</div>
		</div>
	`;
	const chat = document.getElementById("chat") as HTMLElement;
	installChatMetrics(chat, scrollHeight);
	return chat;
}

describe("createMobileChatSwitchLoadingFeature", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		document.body.innerHTML = "";
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
	});

	test("does not show on native CHAT_CHANGED before APP_READY", () => {
		vi.useFakeTimers();
		const eventSource = new EventSourceStub();
		const contextRef = {
			current: {
				chatId: "chapter-1",
				characterId: 0,
				eventSource,
				eventTypes: {
					APP_READY: "app_ready",
					CHAT_CHANGED: "chat_changed",
				},
				groupId: null,
				getCurrentChatId() {
					return this.chatId;
				},
			},
		};
		setSillyTavernContext(contextRef);
		renderReadyChat();
		const frame = installAnimationFrameQueue();
		const resize = installResizeObserver();
		const feature = createMobileChatSwitchLoadingFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			minimumVisibleMs: 180,
			overlayExitDurationMs: 0,
			quietFrameCount: 2,
			requestAnimationFrame: frame.requestAnimationFrame,
			ResizeObserver: resize.ResizeObserverStub,
			settleTimeoutMs: 1200,
		});

		feature.mount();
		eventSource.emit("chat_changed");
		frame.flushFrames();
		vi.advanceTimersByTime(1200);

		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).not.toBeInTheDocument();
		expect(frame.requestAnimationFrame).not.toHaveBeenCalled();
		expect(resize.ResizeObserverStub).not.toHaveBeenCalled();

		feature.dispose();
		expect(eventSource.listenerCount("app_ready")).toBe(0);
		expect(eventSource.listenerCount("chat_changed")).toBe(0);
	});

	test("does not show on APP_READY-era CHAT_CHANGED for the already-active chat", () => {
		vi.useFakeTimers();
		const eventSource = new EventSourceStub();
		const contextRef = {
			current: {
				chatId: "chapter-1",
				characterId: 0,
				eventSource,
				eventTypes: {
					APP_READY: "app_ready",
					CHAT_CHANGED: "chat_changed",
				},
				groupId: null,
				getCurrentChatId() {
					return this.chatId;
				},
			},
		};
		setSillyTavernContext(contextRef);
		renderReadyChat();
		const frame = installAnimationFrameQueue();
		const feature = createMobileChatSwitchLoadingFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			minimumVisibleMs: 180,
			overlayExitDurationMs: 0,
			quietFrameCount: 2,
			requestAnimationFrame: frame.requestAnimationFrame,
			settleTimeoutMs: 1200,
		});

		feature.mount();
		eventSource.emit("app_ready");
		eventSource.emit("chat_changed");
		frame.flushFrames();
		vi.advanceTimersByTime(1200);

		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).not.toBeInTheDocument();
		expect(frame.requestAnimationFrame).not.toHaveBeenCalled();

		feature.dispose();
	});

	test("shows on APP_READY-era native CHAT_CHANGED for a different active chat, scrolls to bottom, waits for Astra message DOM readiness, then hides", async () => {
		vi.useFakeTimers();
		const eventSource = new EventSourceStub();
		const contextRef = {
			current: {
				chatId: "chapter-1",
				characterId: 0,
				eventSource,
				eventTypes: {
					APP_READY: "app_ready",
					CHAT_CHANGED: "chat_changed",
				},
				groupId: null,
				getCurrentChatId() {
					return this.chatId;
				},
			},
		};
		setSillyTavernContext(contextRef);
		document.body.innerHTML = `
			<div id="sheld">
				<div id="chat">
					<div class="mes" mesid="0">
						<div class="mesAvatarWrapper"></div>
						<div class="mes_block">
							<div class="ch_name"></div>
							<small class="timestamp"></small>
						</div>
					</div>
				</div>
			</div>
		`;
		const chat = document.getElementById("chat") as HTMLElement;
		installChatMetrics(chat, 800);
		const frame = installAnimationFrameQueue();
		const resize = installResizeObserver();
		const feature = createMobileChatSwitchLoadingFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			minimumVisibleMs: 180,
			overlayExitDurationMs: 0,
			quietFrameCount: 2,
			requestAnimationFrame: frame.requestAnimationFrame,
			ResizeObserver: resize.ResizeObserverStub,
			settleTimeoutMs: 1200,
		});

		feature.mount();
		eventSource.emit("app_ready");
		contextRef.current = {
			...contextRef.current,
			chatId: "chapter-2",
		};
		eventSource.emit("chat_changed");
		frame.flushFrame();

		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).toBeInTheDocument();
		expect(chat.scrollTop).toBe(800);

		chat.querySelector(".mes")?.insertAdjacentHTML(
			"afterbegin",
			'<div class="astra-mesHeader"></div>',
		);
		chat.querySelector(".mes_block")?.insertAdjacentHTML(
			"afterend",
			'<div class="astra-mesMeta"><div class="astra-mesMeta__time"></div></div>',
		);
		chat.querySelector(".mes")?.insertAdjacentHTML(
			"beforeend",
			`
				<div class="astra-mesActions" data-astra-component="mes-actions" data-astra-slot="footer">
					<div class="astra-mesActions__left">
						<div class="astra-mesActions__leftDefault">
							<div class="astra-mesActions__moreHost"></div>
						</div>
					</div>
				</div>
			`,
		);
		vi.advanceTimersByTime(179);
		frame.flushFrames();

		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).toBeInTheDocument();

		vi.advanceTimersByTime(1);
		frame.flushFrames();
		await Promise.resolve();

		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).not.toBeInTheDocument();

		feature.dispose();
		expect(eventSource.listenerCount("chat_changed")).toBe(0);
		expect(resize.observer.disconnect).toHaveBeenCalled();
	});

	test("shows after APP_READY when the active chat signature cannot be resolved", async () => {
		vi.useFakeTimers();
		const eventSource = new EventSourceStub();
		setSillyTavernContext({
			eventSource,
			eventTypes: {
				APP_READY: "app_ready",
				CHAT_CHANGED: "chat_changed",
			},
		});
		const chat = renderReadyChat({ scrollHeight: 800 });
		const frame = installAnimationFrameQueue();
		const feature = createMobileChatSwitchLoadingFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			minimumVisibleMs: 180,
			overlayExitDurationMs: 0,
			quietFrameCount: 2,
			requestAnimationFrame: frame.requestAnimationFrame,
			settleTimeoutMs: 1200,
		});

		feature.mount();
		eventSource.emit("app_ready");
		eventSource.emit("chat_changed");
		vi.advanceTimersByTime(180);
		frame.flushFrames();
		await Promise.resolve();

		expect(chat.scrollTop).toBe(800);
		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).not.toBeInTheDocument();

		feature.dispose();
	});

	test("keeps an Astra-started overlay until CHAT_CHANGED and DOM settle complete", async () => {
		vi.useFakeTimers();
		const eventSource = new EventSourceStub();
		setSillyTavernContext({
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
		});
		const chat = renderReadyChat({ scrollHeight: 1020 });
		const frame = installAnimationFrameQueue();
		const feature = createMobileChatSwitchLoadingFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			minimumVisibleMs: 180,
			overlayExitDurationMs: 0,
			quietFrameCount: 2,
			requestAnimationFrame: frame.requestAnimationFrame,
			settleTimeoutMs: 1200,
		});

		feature.mount();
		const attempt = feature.beginAstraChatSwitch("Opening chat...");

		expect(
			document.querySelectorAll(".astra-chat-switch-loading-overlay"),
		).toHaveLength(1);

		vi.advanceTimersByTime(1200);
		frame.flushFrames();
		await Promise.resolve();

		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).toBeInTheDocument();

		eventSource.emit("chat_changed");
		vi.advanceTimersByTime(180);
		frame.flushFrames();
		await Promise.resolve();

		expect(chat.scrollTop).toBe(1020);
		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).not.toBeInTheDocument();

		await expect(attempt.cancel()).resolves.toBeUndefined();
		feature.dispose();
	});

	test("reuses a single overlay for duplicate switches and ignores stale cancel calls", async () => {
		vi.useFakeTimers();
		const eventSource = new EventSourceStub();
		setSillyTavernContext({
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
		});
		renderReadyChat();
		const frame = installAnimationFrameQueue();
		const feature = createMobileChatSwitchLoadingFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			minimumVisibleMs: 180,
			overlayExitDurationMs: 0,
			quietFrameCount: 2,
			requestAnimationFrame: frame.requestAnimationFrame,
			settleTimeoutMs: 1200,
		});

		feature.mount();
		const firstAttempt = feature.beginAstraChatSwitch("Opening chat...");
		const secondAttempt = feature.beginAstraChatSwitch("Opening chat...");
		eventSource.emit("chat_changed");

		expect(
			document.querySelectorAll(".astra-chat-switch-loading-overlay"),
		).toHaveLength(1);

		await firstAttempt.cancel();

		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).toBeInTheDocument();

		await secondAttempt.cancel();

		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).not.toBeInTheDocument();

		feature.dispose();
	});

	test("settles zero-message chats and no-ops cleanly without context or chat", async () => {
		vi.useFakeTimers();
		document.body.innerHTML = `
			<div id="sheld">
				<div id="chat"></div>
			</div>
		`;
		const frame = installAnimationFrameQueue();
		const feature = createMobileChatSwitchLoadingFeature({
			cancelAnimationFrame: frame.cancelAnimationFrame,
			documentRef: document,
			minimumVisibleMs: 180,
			overlayExitDurationMs: 0,
			quietFrameCount: 2,
			requestAnimationFrame: frame.requestAnimationFrame,
			settleTimeoutMs: 1200,
		});

		expect(() => feature.mount()).not.toThrow();
		const attempt = feature.beginAstraChatSwitch("Opening chat...");
		feature.handleChatChanged();
		vi.advanceTimersByTime(180);
		frame.flushFrames();
		await Promise.resolve();

		expect(
			document.querySelector(".astra-chat-switch-loading-overlay"),
		).not.toBeInTheDocument();

		document.body.innerHTML = "";
		await expect(attempt.cancel()).resolves.toBeUndefined();
		expect(() => feature.dispose()).not.toThrow();
	});
});
