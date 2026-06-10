import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	queueMicrotaskSafe,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type Listener = () => void;

type PersonaDescriptorLike = Record<string, unknown> & {
	title?: unknown;
};

type PowerUserSettingsLike = Record<string, unknown> & {
	default_persona?: unknown;
	persona_descriptions?: unknown;
	personas?: unknown;
};

type StContextLike = Record<string, unknown> & {
	chat?: unknown[];
	chatMetadata?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	getThumbnailUrl?: (type: string, value: string) => string;
	name1?: unknown;
	powerUserSettings?: unknown;
};

type EventListener = (...args: unknown[]) => void;

const PERSONA_LIST_SELECTOR_CANDIDATES = [
	"#user_avatar_block .avatar-container.selected[data-avatar-id]",
	".avatar-container.selected[data-avatar-id]",
] as const;

const PERSONA_FALLBACK_THUMBNAIL = "/img/ai4.png";
const AVATAR_REVISION_QUERY_PARAM = "astra_avatar_revision";

const RECENT_USER_MESSAGE_AVATAR_KEYS = [
	"force_avatar",
	"avatarUrl",
	"avatar_url",
	"avatar",
	"user_avatar",
	"original_avatar",
	"ch_avatar",
] as const;

export type CurrentUserAvatarSource =
	| "selected-persona"
	| "chat-metadata-persona"
	| "default-persona"
	| "recent-user-message"
	| "none";

export interface CurrentUserAvatarSnapshot {
	displayName: string;
	personaId: string | null;
	personaName: string;
	personaTitle: string;
	source: CurrentUserAvatarSource;
	thumbnailUrl: string;
	updatedAt: number;
}

export interface CurrentUserAvatarStore {
	dispose(): void;
	getSnapshot(): CurrentUserAvatarSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

function asTrimmedString(value: unknown): string {
	if (typeof value !== "string") {
		return "";
	}

	return value.trim();
}

function readSelectedPersonaId(documentRef: Document): string {
	for (const selector of PERSONA_LIST_SELECTOR_CANDIDATES) {
		const match = documentRef.querySelector(selector);
		if (!(match instanceof HTMLElement)) {
			continue;
		}

		const personaId = asTrimmedString(match.dataset.avatarId);
		if (personaId) {
			return personaId;
		}
	}

	return "";
}

function readChatMetadataPersonaId(context: StContextLike): string {
	const metadata = isRecord(context.chatMetadata)
		? context.chatMetadata
		: null;
	return asTrimmedString(metadata?.persona);
}

function readDefaultPersonaId(context: StContextLike): string {
	const settings = isRecord(context.powerUserSettings)
		? (context.powerUserSettings as PowerUserSettingsLike)
		: null;
	return asTrimmedString(settings?.default_persona);
}

function readCurrentUserDisplayName(context: StContextLike | null): string {
	return asTrimmedString(context?.name1);
}

function readPersonaName(
	context: StContextLike | null,
	personaId: string | null,
): string {
	if (!context || !personaId) {
		return "";
	}

	const settings = isRecord(context.powerUserSettings)
		? (context.powerUserSettings as PowerUserSettingsLike)
		: null;
	const personas = isRecord(settings?.personas) ? settings.personas : null;

	return asTrimmedString(personas?.[personaId]);
}

function readPersonaTitle(
	context: StContextLike | null,
	personaId: string | null,
): string {
	if (!context || !personaId) {
		return "";
	}

	const settings = isRecord(context.powerUserSettings)
		? (context.powerUserSettings as PowerUserSettingsLike)
		: null;
	const descriptors = isRecord(settings?.persona_descriptions)
		? settings.persona_descriptions
		: null;
	const descriptor = isRecord(descriptors?.[personaId])
		? (descriptors[personaId] as PersonaDescriptorLike)
		: null;

	return asTrimmedString(descriptor?.title);
}

function readRecentUserMessageAvatarUrl(context: StContextLike): string {
	const chat = Array.isArray(context.chat) ? context.chat : [];

	for (let index = chat.length - 1; index >= 0; index -= 1) {
		const message = chat[index];
		if (!isRecord(message) || message.is_user !== true) {
			continue;
		}

		for (const key of RECENT_USER_MESSAGE_AVATAR_KEYS) {
			const candidate = asTrimmedString(message[key]);
			if (candidate) {
				return candidate;
			}
		}
	}

	return "";
}

function resolvePersonaThumbnailUrl(
	context: StContextLike | null,
	personaId: string,
	avatarRevision: number,
): string {
	if (!personaId) {
		return "";
	}

	if (context && typeof context.getThumbnailUrl === "function") {
		try {
			const url = asTrimmedString(
				context.getThumbnailUrl("persona", personaId),
			);
			if (url) {
				return appendAvatarRevision(url, avatarRevision);
			}
		} catch {
			// Fall through to the deterministic thumbnail URL.
		}
	}

	return appendAvatarRevision(
		`/thumbnail?type=persona&file=${encodeURIComponent(personaId)}`,
		avatarRevision,
	);
}

function resolveContextSafe(): StContextLike | null {
	try {
		return getStContext() as StContextLike;
	} catch {
		return null;
	}
}

function isPersonaMutationTarget(node: Node): boolean {
	if (!(node instanceof Element)) {
		return false;
	}

	if (node.id === "user_avatar_block") {
		return true;
	}

	if (node.matches(".avatar-container")) {
		return true;
	}

	if (node.matches("#user_avatar_block *")) {
		return true;
	}

	return node.closest("#user_avatar_block") != null;
}

function appendAvatarRevision(url: string, avatarRevision: number): string {
	if (
		!url ||
		avatarRevision <= 0 ||
		url.startsWith("data:") ||
		url.startsWith("blob:")
	) {
		return url;
	}

	const hashIndex = url.indexOf("#");
	const baseUrl = hashIndex === -1 ? url : url.slice(0, hashIndex);
	const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
	const separator = baseUrl.includes("?") ? "&" : "?";

	return `${baseUrl}${separator}${AVATAR_REVISION_QUERY_PARAM}=${encodeURIComponent(String(avatarRevision))}${hash}`;
}

function snapshotsEqual(
	a: CurrentUserAvatarSnapshot,
	b: CurrentUserAvatarSnapshot,
): boolean {
	return (
		a.displayName === b.displayName &&
		a.personaId === b.personaId &&
		a.personaName === b.personaName &&
		a.personaTitle === b.personaTitle &&
		a.source === b.source &&
		a.thumbnailUrl === b.thumbnailUrl
	);
}

export function readCurrentUserAvatarSnapshot({
	avatarRevision = 0,
	documentRef = document,
}: {
	avatarRevision?: number;
	documentRef?: Document;
} = {}): CurrentUserAvatarSnapshot {
	const context = resolveContextSafe();
	const displayName = readCurrentUserDisplayName(context);

	const selectedPersonaId = readSelectedPersonaId(documentRef);
	if (selectedPersonaId) {
		return {
			displayName,
			personaId: selectedPersonaId,
			personaName: readPersonaName(context, selectedPersonaId),
			personaTitle: readPersonaTitle(context, selectedPersonaId),
			source: "selected-persona",
			thumbnailUrl:
				resolvePersonaThumbnailUrl(
					context,
					selectedPersonaId,
					avatarRevision,
				) || PERSONA_FALLBACK_THUMBNAIL,
			updatedAt: Date.now(),
		};
	}

	const chatMetadataPersonaId = context
		? readChatMetadataPersonaId(context)
		: "";
	if (chatMetadataPersonaId && context) {
		return {
			displayName,
			personaId: chatMetadataPersonaId,
			personaName: readPersonaName(context, chatMetadataPersonaId),
			personaTitle: readPersonaTitle(context, chatMetadataPersonaId),
			source: "chat-metadata-persona",
			thumbnailUrl:
				resolvePersonaThumbnailUrl(
					context,
					chatMetadataPersonaId,
					avatarRevision,
				) || PERSONA_FALLBACK_THUMBNAIL,
			updatedAt: Date.now(),
		};
	}

	const defaultPersonaId = context ? readDefaultPersonaId(context) : "";
	if (defaultPersonaId && context) {
		return {
			displayName,
			personaId: defaultPersonaId,
			personaName: readPersonaName(context, defaultPersonaId),
			personaTitle: readPersonaTitle(context, defaultPersonaId),
			source: "default-persona",
			thumbnailUrl:
				resolvePersonaThumbnailUrl(
					context,
					defaultPersonaId,
					avatarRevision,
				) || PERSONA_FALLBACK_THUMBNAIL,
			updatedAt: Date.now(),
		};
	}

	const recentUserMessageAvatarUrl = context
		? readRecentUserMessageAvatarUrl(context)
		: "";
	if (recentUserMessageAvatarUrl) {
		return {
			displayName,
			personaId: null,
			personaName: "",
			personaTitle: "",
			source: "recent-user-message",
			thumbnailUrl: recentUserMessageAvatarUrl,
			updatedAt: Date.now(),
		};
	}

	return {
		displayName,
		personaId: null,
		personaName: "",
		personaTitle: "",
		source: "none",
		thumbnailUrl: PERSONA_FALLBACK_THUMBNAIL,
		updatedAt: Date.now(),
	};
}

export function createCurrentUserAvatarStore({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): CurrentUserAvatarStore {
	const context = resolveContextSafe();
	const eventSource = isRecord(context?.eventSource)
		? (context.eventSource as EventSourceLike)
		: null;
	const eventTypes = context ? resolveEventTypes(context) : {};
	const listeners = new Set<Listener>();

	const eventRefreshHandler = () => {
		scheduleRefresh();
	};

	const avatarRevisionRefreshHandler = () => {
		avatarRevision += 1;
		scheduleRefresh();
	};

	let avatarRevision = 0;
	let snapshot = readCurrentUserAvatarSnapshot({
		avatarRevision,
		documentRef,
	});
	let disposed = false;
	let isRefreshQueued = false;
	let bodyObserver: MutationObserver | null = null;
	let personaListObserver: MutationObserver | null = null;
	let activeEventListeners: Array<{
		eventName: string;
		listener: EventListener;
	}> = [];

	function notifyListeners() {
		for (const listener of listeners) {
			listener();
		}
	}

	function refresh() {
		if (disposed) {
			return;
		}

		const nextSnapshot = readCurrentUserAvatarSnapshot({
			avatarRevision,
			documentRef,
		});
		if (snapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
		notifyListeners();
	}

	function scheduleRefresh() {
		if (disposed || isRefreshQueued) {
			return;
		}

		isRefreshQueued = true;
		queueMicrotaskSafe(() => {
			isRefreshQueued = false;
			refresh();
		});
	}

	if (eventSource) {
		const refreshEventNameCandidates = [
			eventTypes.APP_READY,
			eventTypes.CHAT_CHANGED,
			eventTypes.CHAT_LOADED,
			eventTypes.MESSAGE_SENT,
			eventTypes.SETTINGS_UPDATED,
			eventTypes.PERSONA_CHANGED,
			eventTypes.PERSONA_RENAMED,
		];
		const avatarRevisionEventNameCandidates = [eventTypes.PERSONA_UPDATED];

		const bindEventListener = (
			eventName: string | undefined,
			listener: EventListener,
		) => {
			if (!eventName) {
				return;
			}

			eventSource.on(eventName, listener);
			activeEventListeners.push({ eventName, listener });
		};

		for (const eventName of Array.from(
			new Set(refreshEventNameCandidates),
		)) {
			bindEventListener(eventName, eventRefreshHandler);
		}

		for (const eventName of Array.from(
			new Set(avatarRevisionEventNameCandidates),
		)) {
			bindEventListener(eventName, avatarRevisionRefreshHandler);
		}
	}

	const bindPersonaListObserver = () => {
		personaListObserver?.disconnect();
		personaListObserver = null;

		const personaList = documentRef.getElementById("user_avatar_block");
		if (!(personaList instanceof HTMLElement)) {
			return;
		}

		personaListObserver = new MutationObserver((mutations) => {
			if (
				!mutations.some((mutation) => {
					if (isPersonaMutationTarget(mutation.target)) {
						return true;
					}

					if (mutation.type !== "childList") {
						return false;
					}

					for (const node of mutation.addedNodes) {
						if (isPersonaMutationTarget(node)) {
							return true;
						}
					}

					for (const node of mutation.removedNodes) {
						if (isPersonaMutationTarget(node)) {
							return true;
						}
					}

					return false;
				})
			) {
				return;
			}

			avatarRevision += 1;
			scheduleRefresh();
		});

		personaListObserver.observe(personaList, {
			attributeFilter: ["class", "data-avatar-id", "src"],
			attributes: true,
			childList: true,
			subtree: true,
		});
	};

	if (documentRef.body) {
		bindPersonaListObserver();

		bodyObserver = new MutationObserver((mutations) => {
			if (!mutations.some((mutation) => mutation.type === "childList")) {
				return;
			}

			if (
				!mutations.some((mutation) => {
					for (const node of mutation.addedNodes) {
						if (isPersonaMutationTarget(node)) {
							return true;
						}
					}

					for (const node of mutation.removedNodes) {
						if (isPersonaMutationTarget(node)) {
							return true;
						}
					}

					return false;
				})
			) {
				return;
			}

			bindPersonaListObserver();
			avatarRevision += 1;
			scheduleRefresh();
		});

		bodyObserver.observe(documentRef.body, {
			childList: true,
			subtree: true,
		});
	}

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			listeners.clear();
			bodyObserver?.disconnect();
			bodyObserver = null;
			personaListObserver?.disconnect();
			personaListObserver = null;

			if (!eventSource) {
				return;
			}

			for (const { eventName, listener } of activeEventListeners) {
				eventSource.removeListener(eventName, listener);
			}

			activeEventListeners = [];
		},
		getSnapshot() {
			return snapshot;
		},
		refresh,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
