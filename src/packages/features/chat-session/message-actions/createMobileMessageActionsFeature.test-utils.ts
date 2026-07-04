import { act, fireEvent, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { CHAT_MESSAGE_INTERACTION_CHANGE_EVENT } from "@/packages/core/st/chat-message-interaction";
import type { ChatMessageRevisionHistoryStore } from "@/packages/core/st/chatMessageRevisionHistory";
import type { ChatMessageRevisionStore } from "@/packages/core/st/chatMessageRevision";
import type { ChatMessageSwipeStore } from "@/packages/core/st/chatMessageSwipe";

const ASTRA_DRAWER_EXIT_MS = 500;
type TestMessageLongPressAction =
	| "disabled"
	| "edit-message"
	| "message-actions";

export function createSwipeStoreStub(
	initialSnapshot: ReturnType<ChatMessageSwipeStore["getSnapshot"]>,
) {
	let listener: (() => void) | null = null;
	let snapshot = initialSnapshot;

	return {
		dispatch(nextSnapshot: typeof snapshot) {
			snapshot = nextSnapshot;
			listener?.();
		},
		store: {
			dispose: vi.fn(),
			getSnapshot: vi.fn(() => snapshot),
			refresh: vi.fn(),
			subscribe: vi.fn((nextListener: () => void) => {
				listener = nextListener;
				return () => {
					listener = null;
				};
			}),
			swipeNext: vi.fn(),
			swipePrevious: vi.fn(),
		} satisfies ChatMessageSwipeStore,
	};
}

export function createRevisionStoreStub(
	initialSnapshot: ReturnType<ChatMessageRevisionStore["getSnapshot"]>,
) {
	let listener: (() => void) | null = null;
	let snapshot = initialSnapshot;

	return {
		dispatch(nextSnapshot: typeof snapshot) {
			snapshot = nextSnapshot;
			listener?.();
		},
		store: {
			continueLastMessage: vi.fn(),
			dispose: vi.fn(),
			getSnapshot: vi.fn(() => snapshot),
			refresh: vi.fn(),
			regenerateLastRevision: vi.fn(),
			subscribe: vi.fn((nextListener: () => void) => {
				listener = nextListener;
				return () => {
					listener = null;
				};
			}),
			undoLastRevision: vi.fn(),
		} satisfies ChatMessageRevisionStore,
	};
}

export function createHistoryStoreStub(
	initialSnapshot: ReturnType<ChatMessageRevisionHistoryStore["getSnapshot"]>,
) {
	let listener: (() => void) | null = null;
	let snapshot = initialSnapshot;

	return {
		dispatch(nextSnapshot: typeof snapshot) {
			snapshot = nextSnapshot;
			listener?.();
		},
		store: {
			dispose: vi.fn(),
			getSnapshot: vi.fn(() => snapshot),
			refresh: vi.fn(),
			subscribe: vi.fn((nextListener: () => void) => {
				listener = nextListener;
				return () => {
					listener = null;
				};
			}),
		} satisfies ChatMessageRevisionHistoryStore,
	};
}

export function mockMatchMedia(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => ({
			addEventListener: vi.fn(),
			matches,
			removeEventListener: vi.fn(),
		})),
		writable: true,
	});
}

export function getMessageText(message: HTMLElement): HTMLElement {
	const messageText = message.querySelector(".mes_text");
	if (!(messageText instanceof HTMLElement)) {
		throw new Error("Expected message to include .mes_text");
	}

	return messageText;
}

export async function fireMessageTextLongPress(
	message: HTMLElement,
	{
		durationMs = 360,
		moveTo,
	}: {
		durationMs?: number;
		moveTo?: { clientX: number; clientY: number };
	} = {},
) {
	const messageText = getMessageText(message);

	vi.useFakeTimers();
	try {
		fireEvent.pointerDown(messageText, {
			clientX: 8,
			clientY: 12,
			pointerId: 1,
			pointerType: "touch",
		});
		if (moveTo) {
			fireEvent.pointerMove(messageText, {
				clientX: moveTo.clientX,
				clientY: moveTo.clientY,
				pointerId: 1,
				pointerType: "touch",
			});
		}
		await act(async () => {
			vi.advanceTimersByTime(durationMs);
		});
		fireEvent.pointerUp(messageText, {
			clientX: moveTo?.clientX ?? 8,
			clientY: moveTo?.clientY ?? 12,
			pointerId: 1,
			pointerType: "touch",
		});
	} finally {
		vi.useRealTimers();
	}
}

export function setMessageLongPressActionPreferenceForTests(
	longPressAction: TestMessageLongPressAction,
) {
	const getContext = (
		globalThis as {
			SillyTavern?: { getContext?: () => unknown };
		}
	).SillyTavern?.getContext;
	const context = getContext?.();
	if (!context || typeof context !== "object") {
		return;
	}

	const contextRecord = context as Record<string, unknown>;
	if (
		!contextRecord.extensionSettings ||
		typeof contextRecord.extensionSettings !== "object"
	) {
		contextRecord.extensionSettings = {};
	}

	const extensionSettings = contextRecord.extensionSettings as Record<
		string,
		unknown
	>;
	if (
		!extensionSettings.astra_projecta ||
		typeof extensionSettings.astra_projecta !== "object"
	) {
		extensionSettings.astra_projecta = {};
	}

	(
		extensionSettings.astra_projecta as Record<string, unknown>
	).chatMessageInteraction = {
		longPressAction,
		version: 1,
	};

	window.dispatchEvent(
		new CustomEvent(CHAT_MESSAGE_INTERACTION_CHANGE_EVENT),
	);
}

export async function openMoreActionsDrawerForMessage(message: HTMLElement) {
	setMessageLongPressActionPreferenceForTests("message-actions");
	await fireMessageTextLongPress(message);

	return screen.findByRole("dialog", {
		name: "Message Actions",
	});
}

export async function openRevisionHistoryDrawerForMessage(
	message: HTMLElement,
	frame?: { flushFrames(): void },
) {
	const moreDialog = await openMoreActionsDrawerForMessage(message);
	fireEvent.click(
		within(moreDialog).getByRole("button", {
			name: "Revision history",
		}),
	);
	frame?.flushFrames();

	return screen.findByRole("dialog", {
		name: "Message Revision History",
	});
}

export async function waitForDrawerExitAnimation() {
	await act(async () => {
		await new Promise((resolve) => {
			window.setTimeout(resolve, ASTRA_DRAWER_EXIT_MS);
		});
	});
}

export function installAnimationFrameQueue() {
	const callbacks: FrameRequestCallback[] = [];
	const originalRequestAnimationFrame = window.requestAnimationFrame;
	const originalCancelAnimationFrame = window.cancelAnimationFrame;
	const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
		callbacks.push(callback);
		return callbacks.length;
	});
	const cancelAnimationFrame = vi.fn((handle: number) => {
		callbacks[handle - 1] = () => {};
	});

	Object.defineProperty(window, "requestAnimationFrame", {
		configurable: true,
		value: requestAnimationFrame,
		writable: true,
	});
	Object.defineProperty(window, "cancelAnimationFrame", {
		configurable: true,
		value: cancelAnimationFrame,
		writable: true,
	});

	return {
		cancelAnimationFrame,
		flushFrames() {
			const scheduledCallbacks = callbacks.splice(0);
			for (const callback of scheduledCallbacks) {
				callback(0);
			}
		},
		requestAnimationFrame,
		restore() {
			Object.defineProperty(window, "requestAnimationFrame", {
				configurable: true,
				value: originalRequestAnimationFrame,
				writable: true,
			});
			Object.defineProperty(window, "cancelAnimationFrame", {
				configurable: true,
				value: originalCancelAnimationFrame,
				writable: true,
			});
		},
	};
}

export function setSillyTavernContext(context: unknown | { current: unknown }) {
	const contextRef =
		typeof context === "object" && context !== null && "current" in context
			? context
			: { current: context };

	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => contextRef.current,
	};
}

export function readAstraRevisionRoots(message: unknown): Array<{
	active?: number[];
}> {
	return (
		(
			message as {
				astra_projecta?: {
					revisionHistory?: {
						roots?: Array<{ active?: number[] }>;
					};
				};
			}
		).astra_projecta?.revisionHistory?.roots ?? []
	);
}
