import { getStContext } from "@/packages/core/st/context";
import {
	asIndex,
	asPath,
	asRevisionList,
	asRevisionNode,
	readRevisionRoots,
} from "@/packages/core/st/chat-message-revisions/storage";
import {
	asTrimmedString,
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type Listener = () => void;

type ChatMessageRevisionHistoryLike = Record<string, unknown> & {
	astra_projecta?: unknown;
	continueHistory?: unknown;
	is_system?: unknown;
	is_user?: unknown;
	mes?: unknown;
	name?: unknown;
	swipe_id?: unknown;
	swipes?: unknown;
};

type StContextLike = Record<string, unknown> & {
	chat?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
};

export interface ChatMessageRevisionHistoryItem {
	avatarUrl: string;
	hasHistory: boolean;
	messageDisplayId: string;
	messageId: number;
	senderName: string;
	swipeIndex: number;
	swipeTotal: number;
}

export type ChatMessageRevisionHistorySnapshot =
	ChatMessageRevisionHistoryItem[];

export interface ChatMessageRevisionHistoryStore {
	dispose(): void;
	getSnapshot(): ChatMessageRevisionHistorySnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

const REVISION_HISTORY_EVENT_KEYS = [
	"CHAT_CHANGED",
	"CHARACTER_MESSAGE_RENDERED",
	"GENERATION_STOPPED",
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

function asChatMessage(value: unknown): ChatMessageRevisionHistoryLike | null {
	return isRecord(value) ? (value as ChatMessageRevisionHistoryLike) : null;
}

function clampIndex(index: number, total: number): number {
	return Math.min(total - 1, Math.max(0, index));
}

function readDocumentRef(documentRef?: Document | null): Document | null {
	if (documentRef) {
		return documentRef;
	}

	return typeof document === "undefined" ? null : document;
}

function resolveMessageElement(
	documentRef: Document | null,
	messageId: number,
): Element | null {
	return (
		documentRef?.querySelector(`#chat .mes[mesid="${messageId}"]`) ?? null
	);
}

function resolveMessageDisplayId(
	messageElement: Element | null,
	messageId: number,
): string {
	const domText = messageElement?.querySelector(".mesIDDisplay")?.textContent;
	const normalizedDomText = asTrimmedString(domText);

	return normalizedDomText || `#${messageId}`;
}

function resolveAvatarUrl(
	message: ChatMessageRevisionHistoryLike,
	messageElement: Element | null,
): string {
	const image = messageElement?.querySelector(
		".mesAvatarWrapper img, .mes_avatar img, .avatar img",
	);
	if (image instanceof HTMLImageElement) {
		const imageUrl =
			asTrimmedString(image.currentSrc) || asTrimmedString(image.src);
		if (imageUrl) {
			return imageUrl;
		}
	}

	const candidates = [
		message.avatarUrl,
		message.avatar,
		message.character_avatar,
		message.ch_avatar,
		message.img,
		message.avatar_url,
		message.avatarId,
		message.avatar_file,
		message.avatarFile,
	];

	return candidates.map(asTrimmedString).find(Boolean) ?? "";
}

function resolveDomSenderName(messageElement: Element | null): string {
	const nameText = asTrimmedString(
		messageElement?.querySelector(".name_text")?.textContent,
	);
	if (nameText) {
		return nameText;
	}

	const nameElement = messageElement?.querySelector(".ch_name");
	if (!nameElement) {
		return "";
	}

	const clone = nameElement.cloneNode(true);
	if (!(clone instanceof Element)) {
		return "";
	}

	clone
		.querySelectorAll(
			".astra-mesModel, .timestamp, .timestamp-icon, .mes_buttons",
		)
		.forEach((element) => element.remove());
	return asTrimmedString(clone.textContent);
}

function resolveSenderName(
	message: ChatMessageRevisionHistoryLike,
	messageElement: Element | null,
): string {
	const messageName = asTrimmedString(message.name);
	if (messageName) {
		return messageName;
	}

	const domName = resolveDomSenderName(messageElement);
	if (domName) {
		return domName;
	}

	if (message.is_system === true) {
		return "System";
	}

	return message.is_user === true ? "User" : "Character";
}

function hasRevisionHistoryForCurrentSwipe(
	message: ChatMessageRevisionHistoryLike,
	swipeIndex: number,
	swipeTotal: number,
): boolean {
	if (swipeTotal > 1) {
		return true;
	}

	const history = asRevisionList(readRevisionRoots(message));
	const root = asRevisionNode(history?.[swipeIndex]);
	if (!root) {
		return false;
	}

	const activePath = asPath(root.active);
	const hasActiveChild =
		activePath.length > 1 && activePath[0] === swipeIndex;
	const hasChildRevisions = (asRevisionList(root.swipes)?.length ?? 0) > 0;

	return hasActiveChild || hasChildRevisions;
}

function createHistoryItem({
	documentRef,
	message,
	messageId,
}: {
	documentRef: Document | null;
	message: ChatMessageRevisionHistoryLike;
	messageId: number;
}): ChatMessageRevisionHistoryItem | null {
	const swipeTotal =
		Array.isArray(message.swipes) && message.swipes.length > 0
			? message.swipes.length
			: 1;
	const swipeIndex = clampIndex(asIndex(message.swipe_id), swipeTotal);
	const hasHistory = hasRevisionHistoryForCurrentSwipe(
		message,
		swipeIndex,
		swipeTotal,
	);

	if (!hasHistory) {
		return null;
	}

	const messageElement = resolveMessageElement(documentRef, messageId);

	return {
		avatarUrl: resolveAvatarUrl(message, messageElement),
		hasHistory,
		messageDisplayId: resolveMessageDisplayId(messageElement, messageId),
		messageId,
		senderName: resolveSenderName(message, messageElement),
		swipeIndex,
		swipeTotal,
	};
}

function areSnapshotsEqual(
	previous: ChatMessageRevisionHistorySnapshot,
	next: ChatMessageRevisionHistorySnapshot,
): boolean {
	if (previous.length !== next.length) {
		return false;
	}

	return previous.every((item, index) => {
		const nextItem = next[index];
		return (
			item.avatarUrl === nextItem.avatarUrl &&
			item.hasHistory === nextItem.hasHistory &&
			item.messageDisplayId === nextItem.messageDisplayId &&
			item.messageId === nextItem.messageId &&
			item.senderName === nextItem.senderName &&
			item.swipeIndex === nextItem.swipeIndex &&
			item.swipeTotal === nextItem.swipeTotal
		);
	});
}

export function readChatMessageRevisionHistorySnapshot({
	context = resolveContextSafe(),
	documentRef,
}: {
	context?: StContextLike | null;
	documentRef?: Document | null;
} = {}): ChatMessageRevisionHistorySnapshot {
	const chat = Array.isArray(context?.chat) ? context.chat : [];
	const resolvedDocumentRef = readDocumentRef(documentRef);
	const items: ChatMessageRevisionHistoryItem[] = [];

	chat.forEach((entry, messageId) => {
		const message = asChatMessage(entry);
		if (!message) {
			return;
		}

		const item = createHistoryItem({
			documentRef: resolvedDocumentRef,
			message,
			messageId,
		});
		if (item) {
			items.push(item);
		}
	});

	return items;
}

export function createChatMessageRevisionHistoryStore({
	documentRef,
}: {
	documentRef?: Document | null;
} = {}): ChatMessageRevisionHistoryStore {
	const listeners = new Set<Listener>();
	const context = resolveContextSafe();
	const eventSource = context?.eventSource ?? null;
	const eventTypes = context ? resolveEventTypes(context) : {};
	let disposed = false;
	let snapshot = readChatMessageRevisionHistorySnapshot({
		context,
		documentRef,
	});

	const emit = () => {
		for (const listener of listeners) {
			listener();
		}
	};

	const refresh = () => {
		if (disposed) {
			return;
		}

		const nextSnapshot = readChatMessageRevisionHistorySnapshot({
			documentRef,
		});
		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			snapshot = nextSnapshot;
			return;
		}

		snapshot = nextSnapshot;
		emit();
	};

	const attachedEvents: string[] = [];
	if (eventSource) {
		for (const key of REVISION_HISTORY_EVENT_KEYS) {
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
	};
}
