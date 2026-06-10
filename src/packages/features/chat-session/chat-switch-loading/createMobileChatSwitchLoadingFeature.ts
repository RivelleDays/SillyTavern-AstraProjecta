import { translateAstra } from "@/packages/core/i18n";
import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";
import {
	showChatSwitchLoadingOverlay,
	type ChatSwitchLoadingOverlayHandle,
} from "@/packages/features/chat-session/chat-switch-loading/chatSwitchLoadingOverlay";

export interface ChatSwitchLoadingAttempt {
	cancel(): Promise<void>;
}

export interface MobileChatSwitchLoadingFeature {
	beginAstraChatSwitch(label?: string): ChatSwitchLoadingAttempt;
	dispose(): void;
	handleChatChanged(): void;
	mount(): void;
	unmount(): void;
}

type RequestAnimationFrame = (callback: FrameRequestCallback) => number;
type CancelAnimationFrame = (handle: number) => void;
type ResizeObserverConstructor = typeof ResizeObserver;
type ChatSwitchLoadingWindowLike = {
	cancelAnimationFrame?: CancelAnimationFrame;
	requestAnimationFrame?: RequestAnimationFrame;
};

const DEFAULT_MINIMUM_VISIBLE_MS = 180;
const DEFAULT_OVERLAY_EXIT_DURATION_MS = 180;
const DEFAULT_QUIET_FRAME_COUNT = 2;
const DEFAULT_SETTLE_TIMEOUT_MS = 1200;
const FALLBACK_APP_READY_EVENT = "app_ready";
const FALLBACK_CHAT_CHANGED_EVENT = "chat_id_changed";

let activeFeature: MobileChatSwitchLoadingFeature | null = null;

function createNoopAttempt(): ChatSwitchLoadingAttempt {
	return {
		async cancel() {
			return undefined;
		},
	};
}

function resolveContextSafe(): Record<string, unknown> | null {
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

function asTrimmedSignaturePart(value: unknown): string {
	if (typeof value === "string") {
		return value.trim();
	}

	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}

	return "";
}

function resolveCurrentChatId(context: Record<string, unknown>): string {
	if (typeof context.getCurrentChatId === "function") {
		try {
			const currentChatId = asTrimmedSignaturePart(
				context.getCurrentChatId(),
			);
			if (currentChatId) {
				return currentChatId;
			}
		} catch {
			// Fall through to context.chatId.
		}
	}

	return asTrimmedSignaturePart(context.chatId);
}

function resolveActiveChatSignature(): string | null {
	const context = resolveContextSafe();
	if (!context) {
		return null;
	}

	const chatId = resolveCurrentChatId(context);
	if (!chatId) {
		return null;
	}

	const groupId = asTrimmedSignaturePart(context.groupId);
	if (groupId) {
		return `group:${groupId}:${chatId}`;
	}

	const characterId = asTrimmedSignaturePart(context.characterId);
	if (characterId) {
		return `character:${characterId}:${chatId}`;
	}

	return `chat:${chatId}`;
}

function resolveFrameScheduler({
	requestAnimationFrame,
	windowRef,
}: {
	requestAnimationFrame?: RequestAnimationFrame;
	windowRef?: ChatSwitchLoadingWindowLike;
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
	windowRef?: ChatSwitchLoadingWindowLike;
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

function resolveNativeChatElement(documentRef: Document): HTMLElement | null {
	return documentRef.getElementById("chat");
}

function hasNormalHeaderSources(messageElement: Element): boolean {
	return Boolean(
		messageElement.querySelector(".mesAvatarWrapper") &&
		messageElement.querySelector(".ch_name"),
	);
}

function isMessageHeaderReady(messageElement: Element): boolean {
	if (!hasNormalHeaderSources(messageElement)) {
		return true;
	}

	const header = messageElement.querySelector(":scope > .astra-mesHeader");
	if (!header) {
		return false;
	}

	const timestamp = messageElement.querySelector(".timestamp");
	if (!timestamp) {
		return true;
	}

	return Boolean(
		messageElement.querySelector(
			":scope > .astra-mesMeta .astra-mesMeta__time",
		),
	);
}

function isMessageActionsReady(messageElement: Element): boolean {
	const actionContainer = messageElement.querySelector(
		":scope > .astra-mesActions[data-astra-component='mes-actions'][data-astra-slot='footer']",
	);
	if (!actionContainer) {
		return false;
	}

	return Boolean(
		actionContainer.querySelector(".astra-mesActions__moreHost"),
	);
}

function isChatDomReady(chatElement: HTMLElement): boolean {
	const messageElements = Array.from(
		chatElement.querySelectorAll(".mes[mesid]"),
	);

	return messageElements.every(
		(messageElement) =>
			isMessageHeaderReady(messageElement) &&
			isMessageActionsReady(messageElement),
	);
}

function buildChatDomSignature(chatElement: HTMLElement): string {
	return [
		chatElement.scrollHeight,
		chatElement.querySelectorAll(".mes[mesid]").length,
		chatElement.querySelectorAll(".astra-mesHeader").length,
		chatElement.querySelectorAll(".astra-mesMeta__time").length,
		chatElement.querySelectorAll(".astra-mesActions").length,
		chatElement.querySelectorAll(".astra-mesActions__moreHost").length,
	].join(":");
}

export function beginAstraChatSwitch(
	label = translateAstra("astraMainInterface.chatMenu.opening"),
): ChatSwitchLoadingAttempt {
	if (activeFeature) {
		return activeFeature.beginAstraChatSwitch(label);
	}

	const overlayHandle = showChatSwitchLoadingOverlay({ label });
	return {
		cancel() {
			return overlayHandle.hide();
		},
	};
}

export function createMobileChatSwitchLoadingFeature({
	cancelAnimationFrame,
	documentRef = document,
	minimumVisibleMs = DEFAULT_MINIMUM_VISIBLE_MS,
	overlayExitDurationMs = DEFAULT_OVERLAY_EXIT_DURATION_MS,
	quietFrameCount = DEFAULT_QUIET_FRAME_COUNT,
	requestAnimationFrame,
	ResizeObserver: ResizeObserverOverride,
	settleTimeoutMs = DEFAULT_SETTLE_TIMEOUT_MS,
	windowRef = window,
}: {
	cancelAnimationFrame?: CancelAnimationFrame;
	documentRef?: Document;
	minimumVisibleMs?: number;
	overlayExitDurationMs?: number;
	quietFrameCount?: number;
	requestAnimationFrame?: RequestAnimationFrame;
	ResizeObserver?: ResizeObserverConstructor;
	settleTimeoutMs?: number;
	windowRef?: ChatSwitchLoadingWindowLike;
} = {}): MobileChatSwitchLoadingFeature {
	const scheduleFrame = resolveFrameScheduler({
		requestAnimationFrame,
		windowRef,
	});
	const cancelFrame = resolveFrameCanceller({
		cancelAnimationFrame,
		windowRef,
	});
	const ResizeObserverCtor = resolveResizeObserver(ResizeObserverOverride);

	let appReadyEventName: string | null = null;
	let activeChatSignature: string | null = null;
	let activeEventName: string | null = null;
	let activeOverlayHandle: ChatSwitchLoadingOverlayHandle | null = null;
	let activeToken = 0;
	let eventSource: EventSourceLike | null = null;
	let frameId: number | null = null;
	let isAppReady = false;
	let isMounted = false;
	let lastChatSignature = "";
	let minimumVisibleTimeoutId: ReturnType<
		typeof globalThis.setTimeout
	> | null = null;
	let mutationObserver: MutationObserver | null = null;
	let quietFrames = 0;
	let resizeObserver: ResizeObserver | null = null;
	let settleTimeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
	let startedAt = 0;
	let switchObserved = false;

	function now() {
		return Date.now();
	}

	function cancelSettleFrame() {
		if (frameId !== null) {
			cancelFrame(frameId);
			frameId = null;
		}
	}

	function clearMinimumVisibleTimer() {
		if (minimumVisibleTimeoutId !== null) {
			globalThis.clearTimeout(minimumVisibleTimeoutId);
			minimumVisibleTimeoutId = null;
		}
	}

	function clearSettleTimeout() {
		if (settleTimeoutId !== null) {
			globalThis.clearTimeout(settleTimeoutId);
			settleTimeoutId = null;
		}
	}

	function disconnectSettlingObservers() {
		mutationObserver?.disconnect();
		mutationObserver = null;
		resizeObserver?.disconnect();
		resizeObserver = null;
	}

	function clearSettleState() {
		clearMinimumVisibleTimer();
		clearSettleTimeout();
		cancelSettleFrame();
		disconnectSettlingObservers();
		lastChatSignature = "";
		quietFrames = 0;
		switchObserved = false;
	}

	function hideActiveOverlay(token: number): Promise<void> {
		if (token !== activeToken) {
			return Promise.resolve();
		}

		clearSettleState();
		const overlayHandle = activeOverlayHandle;
		activeOverlayHandle = null;
		return overlayHandle?.hide() ?? Promise.resolve();
	}

	function requestHideForToken(token: number) {
		if (token !== activeToken || !activeOverlayHandle) {
			return;
		}

		const elapsedMs = Math.max(0, now() - startedAt);
		const remainingVisibleMs = minimumVisibleMs - elapsedMs;
		if (remainingVisibleMs > 0) {
			if (minimumVisibleTimeoutId === null) {
				minimumVisibleTimeoutId = globalThis.setTimeout(() => {
					minimumVisibleTimeoutId = null;
					requestHideForToken(token);
				}, remainingVisibleMs);
			}
			return;
		}

		void hideActiveOverlay(token);
	}

	function ensureOverlay(label: string): number {
		activeToken += 1;
		const token = activeToken;
		startedAt = now();
		if (!activeOverlayHandle) {
			activeOverlayHandle = showChatSwitchLoadingOverlay({
				documentRef,
				exitDurationMs: overlayExitDurationMs,
				label,
			});
		}
		return token;
	}

	function scrollChatToBottom(chatElement: HTMLElement) {
		chatElement.scrollTop = chatElement.scrollHeight;
	}

	function scheduleSettleFrame() {
		if (!activeOverlayHandle || !switchObserved || frameId !== null) {
			return;
		}

		frameId = scheduleFrame(runSettleFrame);
	}

	function markChatDomUnsettled() {
		quietFrames = 0;
		scheduleSettleFrame();
	}

	function runSettleFrame() {
		frameId = null;
		if (!activeOverlayHandle || !switchObserved) {
			return;
		}

		const token = activeToken;
		const chatElement = resolveNativeChatElement(documentRef);
		if (!chatElement) {
			requestHideForToken(token);
			return;
		}

		scrollChatToBottom(chatElement);

		if (!isChatDomReady(chatElement)) {
			lastChatSignature = "";
			quietFrames = 0;
			scheduleSettleFrame();
			return;
		}

		const nextSignature = buildChatDomSignature(chatElement);
		if (nextSignature === lastChatSignature) {
			quietFrames += 1;
		} else {
			lastChatSignature = nextSignature;
			quietFrames = 1;
		}

		if (quietFrames >= quietFrameCount) {
			requestHideForToken(token);
			return;
		}

		scheduleSettleFrame();
	}

	function startSettleObservers() {
		disconnectSettlingObservers();

		const chatElement = resolveNativeChatElement(documentRef);
		if (!chatElement) {
			return;
		}

		const view = documentRef.defaultView;
		if (view?.MutationObserver) {
			mutationObserver = new view.MutationObserver(markChatDomUnsettled);
			mutationObserver.observe(chatElement, {
				childList: true,
				subtree: true,
			});
		}

		if (ResizeObserverCtor) {
			resizeObserver = new ResizeObserverCtor(markChatDomUnsettled);
			resizeObserver.observe(chatElement);
		}
	}

	function beginChatSwitch(label: string) {
		const token = ensureOverlay(label);
		clearMinimumVisibleTimer();
		clearSettleTimeout();
		cancelSettleFrame();
		disconnectSettlingObservers();
		lastChatSignature = "";
		quietFrames = 0;
		switchObserved = false;
		return token;
	}

	function handleAppReady() {
		isAppReady = true;
		activeChatSignature = resolveActiveChatSignature();
	}

	function handleChatChanged() {
		const label = translateAstra("astraMainInterface.chatMenu.opening");
		const nextActiveChatSignature = resolveActiveChatSignature();
		const hasActiveOverlay = Boolean(activeOverlayHandle);

		if (!hasActiveOverlay) {
			if (!isAppReady) {
				if (nextActiveChatSignature) {
					activeChatSignature = nextActiveChatSignature;
				}
				return;
			}

			if (
				nextActiveChatSignature &&
				activeChatSignature &&
				nextActiveChatSignature === activeChatSignature
			) {
				activeChatSignature = nextActiveChatSignature;
				return;
			}
		}

		if (nextActiveChatSignature) {
			activeChatSignature = nextActiveChatSignature;
		}

		const token = activeOverlayHandle
			? activeToken
			: beginChatSwitch(label);
		switchObserved = true;
		lastChatSignature = "";
		quietFrames = 0;
		startSettleObservers();
		clearSettleTimeout();
		settleTimeoutId = globalThis.setTimeout(() => {
			requestHideForToken(token);
		}, settleTimeoutMs);
		scheduleSettleFrame();
	}

	function subscribeChatChangedEvent() {
		const context = resolveContextSafe();
		eventSource = resolveEventSource(context);
		if (!context || !eventSource) {
			return;
		}

		const eventTypes = resolveEventTypes(context);
		appReadyEventName = eventTypes.APP_READY ?? FALLBACK_APP_READY_EVENT;
		activeEventName =
			eventTypes.CHAT_CHANGED ?? FALLBACK_CHAT_CHANGED_EVENT;
		eventSource.on(appReadyEventName, handleAppReady);
		eventSource.on(activeEventName, handleChatChanged);
	}

	function unsubscribeChatChangedEvent() {
		if (eventSource && activeEventName) {
			eventSource.removeListener(activeEventName, handleChatChanged);
		}
		if (eventSource && appReadyEventName) {
			eventSource.removeListener(appReadyEventName, handleAppReady);
		}
		eventSource = null;
		activeEventName = null;
		appReadyEventName = null;
	}

	const feature: MobileChatSwitchLoadingFeature = {
		beginAstraChatSwitch(label) {
			const token = beginChatSwitch(
				label ?? translateAstra("astraMainInterface.chatMenu.opening"),
			);
			return {
				cancel() {
					return hideActiveOverlay(token);
				},
			};
		},
		dispose() {
			feature.unmount();
		},
		handleChatChanged,
		mount() {
			if (isMounted) {
				return;
			}

			isMounted = true;
			activeFeature = feature;
			subscribeChatChangedEvent();
		},
		unmount() {
			if (!isMounted) {
				return;
			}

			isMounted = false;
			unsubscribeChatChangedEvent();
			if (activeFeature === feature) {
				activeFeature = null;
			}
			isAppReady = false;
			activeChatSignature = null;
			clearSettleState();
			const overlayHandle = activeOverlayHandle;
			activeOverlayHandle = null;
			void overlayHandle?.hide();
		},
	};

	return feature;
}
