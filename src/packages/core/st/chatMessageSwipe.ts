import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type Listener = () => void;

type ChatMessageLike = Record<string, unknown> & {
	extra?: unknown;
	is_system?: unknown;
	is_user?: unknown;
	swipe_id?: unknown;
	swipes?: unknown;
};

type SwipeApiLike = {
	isAllowed?: () => boolean;
	left?: (event?: unknown, params?: Record<string, unknown>) => unknown;
	right?: (event?: unknown, params?: Record<string, unknown>) => unknown;
	state?: () => unknown;
	to?: (
		event: unknown,
		direction: "left" | "right",
		params?: Record<string, unknown>,
	) => unknown;
};

type StContextLike = Record<string, unknown> & {
	chat?: unknown;
	chatMetadata?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	swipe?: unknown;
};

export type ChatMessageSwipeStatus = "idle" | "ready";

export interface ChatMessageSwipeSnapshot {
	canSwipeNext: boolean;
	canSwipePrevious: boolean;
	currentIndex: number;
	isNativeSwipeBusy: boolean;
	messageId: number | null;
	status: ChatMessageSwipeStatus;
	total: number;
	updatedAt: number;
}

export interface ChatMessageSwipeStore {
	dispose(): void;
	getSnapshot(): ChatMessageSwipeSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
	swipeNext(): Promise<boolean>;
	swipePrevious(): Promise<boolean>;
}

const SWIPE_EVENT_KEYS = [
	"CHAT_CHANGED",
	"CHARACTER_MESSAGE_RENDERED",
	"GENERATION_AFTER_COMMANDS",
	"GENERATION_ENDED",
	"GENERATION_STOPPED",
	"GROUP_WRAPPER_FINISHED",
	"GROUP_WRAPPER_STARTED",
	"MESSAGE_DELETED",
	"MESSAGE_EDITED",
	"MESSAGE_SWIPE_DELETED",
	"MESSAGE_SWIPED",
	"MESSAGE_UPDATED",
	"USER_MESSAGE_RENDERED",
] as const satisfies readonly (keyof EventTypesLike)[];

function resolveContextSafe(): StContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context) ? (context as StContextLike) : null;
	} catch {
		return null;
	}
}

function createIdleSnapshot(now: () => number): ChatMessageSwipeSnapshot {
	return {
		canSwipeNext: false,
		canSwipePrevious: false,
		currentIndex: 0,
		isNativeSwipeBusy: false,
		messageId: null,
		status: "idle",
		total: 1,
		updatedAt: now(),
	};
}

function asSwipeApi(value: unknown): SwipeApiLike | null {
	return isRecord(value) ? (value as SwipeApiLike) : null;
}

function isNativeSwipeAllowed(swipeApi: SwipeApiLike | null): boolean {
	if (typeof swipeApi?.isAllowed !== "function") {
		return true;
	}

	try {
		return swipeApi.isAllowed();
	} catch {
		return false;
	}
}

function readNativeSwipeState(swipeApi: SwipeApiLike | null): string | null {
	if (typeof swipeApi?.state !== "function") {
		return null;
	}

	try {
		const state = swipeApi.state();
		return typeof state === "string" ? state : null;
	} catch {
		return null;
	}
}

function isNativeSwipeBusy(swipeApi: SwipeApiLike | null): boolean {
	return readNativeSwipeState(swipeApi) === "swiping";
}

function asChatMessage(value: unknown): ChatMessageLike | null {
	return isRecord(value) ? (value as ChatMessageLike) : null;
}

function isSwipeableLastMessage(message: ChatMessageLike | null): boolean {
	if (!message || message.is_user === true) {
		return false;
	}

	const extra = isRecord(message.extra) ? message.extra : null;

	return extra?.isSmallSys !== true && extra?.swipeable !== false;
}

function isChatTainted(context: StContextLike | null): boolean {
	const chatMetadata = isRecord(context?.chatMetadata)
		? context.chatMetadata
		: null;

	return chatMetadata?.tainted === true;
}

function clampIndex(index: unknown, total: number): number {
	const parsed =
		typeof index === "number" && Number.isInteger(index) ? index : 0;

	return Math.min(total - 1, Math.max(0, parsed));
}

function areSnapshotsEqual(
	previous: ChatMessageSwipeSnapshot,
	next: ChatMessageSwipeSnapshot,
): boolean {
	return (
		previous.canSwipeNext === next.canSwipeNext &&
		previous.canSwipePrevious === next.canSwipePrevious &&
		previous.currentIndex === next.currentIndex &&
		previous.isNativeSwipeBusy === next.isNativeSwipeBusy &&
		previous.messageId === next.messageId &&
		previous.status === next.status &&
		previous.total === next.total
	);
}

export function readChatMessageSwipeSnapshot({
	context = resolveContextSafe(),
	now = () => 0,
}: {
	context?: StContextLike | null;
	now?: () => number;
} = {}): ChatMessageSwipeSnapshot {
	const chat = Array.isArray(context?.chat) ? context.chat : [];
	const swipeApi = asSwipeApi(context?.swipe);

	if (!chat.length) {
		return createIdleSnapshot(now);
	}

	const nativeSwipeBusy = isNativeSwipeBusy(swipeApi);
	if (!isNativeSwipeAllowed(swipeApi) && !nativeSwipeBusy) {
		return createIdleSnapshot(now);
	}

	const messageId = chat.length - 1;
	const message = asChatMessage(chat[messageId]);

	if (!isSwipeableLastMessage(message)) {
		return createIdleSnapshot(now);
	}

	const total =
		Array.isArray(message?.swipes) && message.swipes.length > 0
			? message.swipes.length
			: 1;
	const currentIndex = clampIndex(message?.swipe_id, total);
	const hasMultipleSwipes = total > 1;
	const isPristineFirstGreeting = messageId === 0 && !isChatTainted(context);
	const canSwipePrevious = hasMultipleSwipes;
	const canSwipeNext =
		hasMultipleSwipes ||
		(message?.is_system !== true && !isPristineFirstGreeting);

	if (!canSwipeNext && !canSwipePrevious) {
		return createIdleSnapshot(now);
	}

	return {
		canSwipeNext,
		canSwipePrevious,
		currentIndex,
		isNativeSwipeBusy: nativeSwipeBusy,
		messageId,
		status: "ready",
		total,
		updatedAt: now(),
	};
}

async function triggerNativeSwipe(
	direction: "left" | "right",
): Promise<boolean> {
	const context = resolveContextSafe();
	const snapshot = readChatMessageSwipeSnapshot({ context });

	if (
		snapshot.status !== "ready" ||
		snapshot.messageId === null ||
		snapshot.isNativeSwipeBusy ||
		(direction === "left"
			? !snapshot.canSwipePrevious
			: !snapshot.canSwipeNext)
	) {
		return false;
	}

	const swipeApi = asSwipeApi(context?.swipe);
	const params = { forceMesId: snapshot.messageId };

	if (typeof swipeApi?.to === "function") {
		await swipeApi.to(null, direction, params);
		return true;
	}

	const fallback = direction === "left" ? swipeApi?.left : swipeApi?.right;

	if (typeof fallback === "function") {
		await fallback(null, params);
		return true;
	}

	return false;
}

function swipePreviousNative(): Promise<boolean> {
	return triggerNativeSwipe("left");
}

function swipeNextNative(): Promise<boolean> {
	return triggerNativeSwipe("right");
}

export function swipePrevious(): Promise<boolean> {
	return swipePreviousNative();
}

export function swipeNext(): Promise<boolean> {
	return swipeNextNative();
}

export function createChatMessageSwipeStore({
	now = Date.now,
}: {
	now?: () => number;
} = {}): ChatMessageSwipeStore {
	const listeners = new Set<Listener>();
	const context = resolveContextSafe();
	const eventSource = context?.eventSource ?? null;
	const eventTypes = context ? resolveEventTypes(context) : {};
	let disposed = false;
	let snapshot = readChatMessageSwipeSnapshot({ context, now });

	const emit = () => {
		for (const listener of listeners) {
			listener();
		}
	};

	const refresh = () => {
		if (disposed) {
			return;
		}

		const nextSnapshot = readChatMessageSwipeSnapshot({ now });
		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			snapshot = nextSnapshot;
			return;
		}

		snapshot = nextSnapshot;
		emit();
	};

	const swipeAndRefresh = async (
		action: () => Promise<boolean>,
	): Promise<boolean> => {
		try {
			return await action();
		} finally {
			refresh();
		}
	};

	const attachedEvents: string[] = [];
	if (eventSource) {
		for (const key of SWIPE_EVENT_KEYS) {
			const eventName = eventTypes[key];
			if (eventName) {
				eventSource.on(eventName, refresh);
				attachedEvents.push(eventName);
			}
		}
	}

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			listeners.clear();

			if (!eventSource) {
				return;
			}

			for (const eventName of attachedEvents) {
				eventSource.removeListener(eventName, refresh);
			}
		},
		getSnapshot() {
			return snapshot;
		},
		refresh,
		subscribe(listener) {
			if (disposed) {
				return () => {};
			}

			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
		swipeNext() {
			return swipeAndRefresh(swipeNextNative);
		},
		swipePrevious() {
			return swipeAndRefresh(swipePreviousNative);
		},
	};
}
