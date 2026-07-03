import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";

export interface MobileChatScrollFeature {
	dispose(): void;
	mount(): void;
	unmount(): void;
}

type RequestAnimationFrame = (callback: FrameRequestCallback) => number;
type CancelAnimationFrame = (handle: number) => void;
type ResizeObserverConstructor = typeof ResizeObserver;
type ChatScrollWindowLike = {
	cancelAnimationFrame?: CancelAnimationFrame;
	requestAnimationFrame?: RequestAnimationFrame;
};

const CHAT_SCROLL_ATTRIBUTE = "data-astra-projecta-chat-scroll";
const CHAT_SCROLL_ATTRIBUTE_VALUE = "native";
const CHAT_TRANSCRIPT_CLASS = "mobile-chat-transcript";
const CHAT_SCROLL_Y_START_ATTRIBUTE = "data-astra-projecta-chat-scroll-y-start";
const CHAT_SCROLL_Y_END_ATTRIBUTE = "data-astra-projecta-chat-scroll-y-end";
const CHAT_SCROLL_EDGE_EPSILON = 0.5;
const DEFAULT_SETTLE_DURATION_MS = 240;
const FALLBACK_CHAT_CHANGED_EVENT = "chat_id_changed";
const FALLBACK_CHAT_LOADED_EVENT = "chatLoaded";
const FALLBACK_GENERATION_ENDED_EVENT = "generation_ended";
const FALLBACK_GENERATION_STOPPED_EVENT = "generation_stopped";
// Distance from the bottom edge still treated as "reading the latest message";
// larger gaps mean the user scrolled up on purpose and must not be yanked down.
const GENERATION_STICK_BOTTOM_THRESHOLD_PX = 48;

function resolveChatElement(documentRef: Document): HTMLElement | null {
	return documentRef.getElementById("chat");
}

function setBooleanAttribute(
	element: HTMLElement,
	attribute: string,
	value: boolean,
) {
	if (value) {
		element.setAttribute(attribute, "");
		return;
	}

	element.removeAttribute(attribute);
}

function clearChatScrollFadeAttributes(chatElement: HTMLElement) {
	chatElement.removeAttribute(CHAT_SCROLL_Y_START_ATTRIBUTE);
	chatElement.removeAttribute(CHAT_SCROLL_Y_END_ATTRIBUTE);
}

function syncChatScrollFadeAttributes(chatElement: HTMLElement | null) {
	if (!chatElement) {
		return;
	}

	const maxScrollTop = Math.max(
		0,
		chatElement.scrollHeight - chatElement.clientHeight,
	);
	const scrollTop = Math.min(
		maxScrollTop,
		Math.max(0, chatElement.scrollTop),
	);
	const hasOverflowY = maxScrollTop > CHAT_SCROLL_EDGE_EPSILON;

	setBooleanAttribute(
		chatElement,
		CHAT_SCROLL_Y_START_ATTRIBUTE,
		hasOverflowY && scrollTop > CHAT_SCROLL_EDGE_EPSILON,
	);
	setBooleanAttribute(
		chatElement,
		CHAT_SCROLL_Y_END_ATTRIBUTE,
		hasOverflowY && maxScrollTop - scrollTop > CHAT_SCROLL_EDGE_EPSILON,
	);
}

function resolveStContextSafe(): Record<string, unknown> | null {
	try {
		const context = getStContext();
		return isRecord(context) ? context : null;
	} catch {
		return null;
	}
}

function resolveEventSource(
	context: Record<string, unknown> | null,
): EventSourceLike | null {
	return context &&
		isRecord(context.eventSource) &&
		typeof context.eventSource.on === "function" &&
		typeof context.eventSource.removeListener === "function"
		? (context.eventSource as EventSourceLike)
		: null;
}

function resolveFrameScheduler({
	requestAnimationFrame,
	windowRef,
}: {
	requestAnimationFrame?: RequestAnimationFrame;
	windowRef?: ChatScrollWindowLike;
}): RequestAnimationFrame {
	if (requestAnimationFrame) {
		return requestAnimationFrame;
	}

	return windowRef?.requestAnimationFrame
		? windowRef.requestAnimationFrame.bind(windowRef)
		: (callback) =>
				globalThis.setTimeout(
					() => callback(Date.now()),
					0,
				) as unknown as number;
}

function resolveFrameCanceller({
	cancelAnimationFrame,
	windowRef,
}: {
	cancelAnimationFrame?: CancelAnimationFrame;
	windowRef?: ChatScrollWindowLike;
}): CancelAnimationFrame {
	if (cancelAnimationFrame) {
		return cancelAnimationFrame;
	}

	return windowRef?.cancelAnimationFrame
		? windowRef.cancelAnimationFrame.bind(windowRef)
		: (handle) => globalThis.clearTimeout(handle);
}

function resolveResizeObserver(
	ResizeObserverOverride: ResizeObserverConstructor | undefined,
): ResizeObserverConstructor | null {
	if (ResizeObserverOverride) {
		return ResizeObserverOverride;
	}

	return typeof ResizeObserver === "function" ? ResizeObserver : null;
}

export function createMobileChatScrollFeature({
	cancelAnimationFrame,
	documentRef = document,
	requestAnimationFrame,
	ResizeObserver: ResizeObserverOverride,
	settleDurationMs = DEFAULT_SETTLE_DURATION_MS,
	windowRef = window,
}: {
	cancelAnimationFrame?: CancelAnimationFrame;
	documentRef?: Document;
	requestAnimationFrame?: RequestAnimationFrame;
	ResizeObserver?: ResizeObserverConstructor;
	settleDurationMs?: number;
	windowRef?: ChatScrollWindowLike;
} = {}): MobileChatScrollFeature {
	const scheduleFrame = resolveFrameScheduler({
		requestAnimationFrame,
		windowRef,
	});
	const cancelFrame = resolveFrameCanceller({
		cancelAnimationFrame,
		windowRef,
	});
	const ResizeObserverCtor = resolveResizeObserver(ResizeObserverOverride);

	let activeEventBindings: Array<{
		eventName: string;
		handler: () => void;
	}> = [];
	let animationFrameId: number | null = null;
	let fadeAnimationFrameId: number | null = null;
	let boundChatElement: HTMLElement | null = null;
	let eventSource: EventSourceLike | null = null;
	let isMounted = false;
	let resizeObserver: ResizeObserver | null = null;
	let settleTimeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

	function markChatElement(chatElement: HTMLElement) {
		chatElement.setAttribute(
			CHAT_SCROLL_ATTRIBUTE,
			CHAT_SCROLL_ATTRIBUTE_VALUE,
		);
		chatElement.classList.add(CHAT_TRANSCRIPT_CLASS);
	}

	function clearChatElementContract(chatElement: HTMLElement) {
		if (
			chatElement.getAttribute(CHAT_SCROLL_ATTRIBUTE) ===
			CHAT_SCROLL_ATTRIBUTE_VALUE
		) {
			chatElement.removeAttribute(CHAT_SCROLL_ATTRIBUTE);
		}
		chatElement.classList.remove(CHAT_TRANSCRIPT_CLASS);
		clearChatScrollFadeAttributes(chatElement);
	}

	function cancelScheduledScroll() {
		if (animationFrameId !== null) {
			cancelFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	function cancelScheduledFadeSync() {
		if (fadeAnimationFrameId !== null) {
			cancelFrame(fadeAnimationFrameId);
			fadeAnimationFrameId = null;
		}
	}

	function syncChatScrollFadeOnFrame() {
		fadeAnimationFrameId = null;
		syncChatScrollFadeAttributes(boundChatElement);
	}

	function scheduleChatScrollFadeSync() {
		if (!isMounted || fadeAnimationFrameId !== null) {
			return;
		}

		fadeAnimationFrameId = scheduleFrame(syncChatScrollFadeOnFrame);
	}

	function handleNativeChatScroll() {
		scheduleChatScrollFadeSync();
	}

	function detachChatElement() {
		if (!boundChatElement) {
			return;
		}

		boundChatElement.removeEventListener("scroll", handleNativeChatScroll);
		clearChatElementContract(boundChatElement);
		boundChatElement = null;
	}

	function attachChatElement() {
		const chatElement = resolveChatElement(documentRef);
		if (!chatElement) {
			detachChatElement();
			return null;
		}

		if (boundChatElement && boundChatElement !== chatElement) {
			detachChatElement();
		}

		if (!boundChatElement) {
			chatElement.addEventListener("scroll", handleNativeChatScroll, {
				passive: true,
			});
			boundChatElement = chatElement;
		}

		markChatElement(chatElement);
		syncChatScrollFadeAttributes(chatElement);
		return chatElement;
	}

	function scrollChatToBottom() {
		animationFrameId = null;
		const chatElement = attachChatElement();
		if (!chatElement) {
			return;
		}

		chatElement.scrollTop = chatElement.scrollHeight;
		syncChatScrollFadeAttributes(chatElement);
	}

	function scheduleScrollToBottom() {
		if (!isMounted || animationFrameId !== null) {
			return;
		}

		animationFrameId = scheduleFrame(scrollChatToBottom);
	}

	function stopSettleWindow() {
		if (settleTimeoutId !== null) {
			globalThis.clearTimeout(settleTimeoutId);
			settleTimeoutId = null;
		}

		resizeObserver?.disconnect();
		resizeObserver = null;
	}

	function startSettleWindow() {
		stopSettleWindow();

		const chatElement = attachChatElement();
		if (!chatElement) {
			return;
		}

		if (ResizeObserverCtor) {
			resizeObserver = new ResizeObserverCtor(scheduleScrollToBottom);
			resizeObserver.observe(chatElement);
			// The container box stays fixed while late content (message action
			// footers, final message formatting) grows the last message, so
			// watch that node too while the settle window is open.
			const lastChatChild = chatElement.lastElementChild;
			if (lastChatChild) {
				resizeObserver.observe(lastChatChild);
			}
		}

		settleTimeoutId = globalThis.setTimeout(
			stopSettleWindow,
			settleDurationMs,
		);
	}

	function handleChatChanged() {
		attachChatElement();
		startSettleWindow();
		scheduleScrollToBottom();
	}

	function isChatNearBottom(chatElement: HTMLElement): boolean {
		return (
			chatElement.scrollHeight -
				chatElement.scrollTop -
				chatElement.clientHeight <=
			GENERATION_STICK_BOTTOM_THRESHOLD_PX
		);
	}

	function handleGenerationSettled() {
		const chatElement = attachChatElement();
		if (!chatElement || !isChatNearBottom(chatElement)) {
			return;
		}

		startSettleWindow();
		scheduleScrollToBottom();
	}

	function subscribeChatEvents() {
		const context = resolveStContextSafe();
		eventSource = resolveEventSource(context);
		if (!eventSource || !context) {
			return;
		}

		const eventTypes = resolveEventTypes(context);
		activeEventBindings = [
			{
				eventName: eventTypes.CHAT_CHANGED ?? FALLBACK_CHAT_CHANGED_EVENT,
				handler: handleChatChanged,
			},
			{
				eventName: eventTypes.CHAT_LOADED ?? FALLBACK_CHAT_LOADED_EVENT,
				handler: handleChatChanged,
			},
			{
				eventName:
					eventTypes.GENERATION_ENDED ?? FALLBACK_GENERATION_ENDED_EVENT,
				handler: handleGenerationSettled,
			},
			{
				eventName:
					eventTypes.GENERATION_STOPPED ??
					FALLBACK_GENERATION_STOPPED_EVENT,
				handler: handleGenerationSettled,
			},
		].filter((binding) => Boolean(binding.eventName));

		for (const { eventName, handler } of activeEventBindings) {
			eventSource.on(eventName, handler);
		}
	}

	function unsubscribeChatEvents() {
		if (!eventSource) {
			activeEventBindings = [];
			return;
		}

		for (const { eventName, handler } of activeEventBindings) {
			eventSource.removeListener(eventName, handler);
		}
		activeEventBindings = [];
		eventSource = null;
	}

	function mount() {
		if (isMounted) {
			return;
		}

		isMounted = true;
		attachChatElement();
		subscribeChatEvents();
	}

	function unmount() {
		if (!isMounted) {
			return;
		}

		isMounted = false;
		unsubscribeChatEvents();
		stopSettleWindow();
		cancelScheduledScroll();
		cancelScheduledFadeSync();
		detachChatElement();
	}

	return {
		dispose: unmount,
		mount,
		unmount,
	};
}
