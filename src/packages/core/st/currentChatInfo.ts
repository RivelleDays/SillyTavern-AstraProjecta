import { EXTENSION_LOG_PREFIX } from "@/packages/core/constants";
import { getStContext } from "@/packages/core/st/context";
import {
	asTrimmedIdentifier,
	asTrimmedString,
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	normalizeChatId,
	queueMicrotaskSafe,
	resolveEventTypes,
} from "@/packages/core/st/shared";
import { parseStTimestampToMs } from "@/packages/core/st/timestamps";

type Listener = () => void;

type MessageLike = Record<string, unknown> & {
	extra?: unknown;
	is_system?: unknown;
	is_user?: unknown;
	mes?: unknown;
	send_date?: unknown;
};

type CharacterLike = Record<string, unknown> & {
	avatar?: unknown;
	avatar_url?: unknown;
	chat?: unknown;
};

type GroupLike = Record<string, unknown> & {
	chat_id?: unknown;
	id?: unknown;
};

type CharacterChatInfoLike = Record<string, unknown> & {
	file_id?: unknown;
	file_name?: unknown;
	file_size?: unknown;
	last_mes?: unknown;
};

type GroupChatInfoLike = Record<string, unknown> & {
	file_size?: unknown;
	last_mes?: unknown;
};

type StContextLike = Record<string, unknown> & {
	characterId?: unknown;
	characters?: unknown;
	chat?: unknown;
	chatId?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	getCurrentChatId?: () => unknown;
	getRequestHeaders?: () => unknown;
	groupId?: unknown;
	groups?: unknown;
};

type RemoteChatDescriptor =
	| {
			avatarUrl: string;
			chatId: string;
			kind: "character";
	  }
	| {
			chatId: string;
			kind: "group";
	  };

type ResolvedCurrentChatInfoState = {
	chatKey: string | null;
	context: StContextLike | null;
	descriptor: RemoteChatDescriptor | null;
	snapshot: CurrentChatInfoSnapshot;
};

type CachedRemoteChatInfo = Pick<
	CurrentChatInfoSnapshot,
	"fileSize" | "lastUpdatedAt"
>;

type RefreshOptions = {
	invalidateActiveCache: boolean;
	remoteDelayMs: number | null;
};

type FetchLike = typeof fetch;

const REMOTE_REFRESH_SHORT_DEBOUNCE_MS = 120;
const REMOTE_REFRESH_LONG_DEBOUNCE_MS = 400;
const BOOTSTRAP_RETRY_DELAYS_MS = [120, 400, 1200, 2400] as const;
const REMOTE_RETRY_DELAYS_MS = [600, 1600, 4000] as const;

export type CurrentChatInfoMetadataStatus =
	| "idle"
	| "pending"
	| "ready"
	| "stale"
	| "unavailable";

export type CurrentChatInfoMetadataReason =
	| "context-not-ready"
	| "http-error"
	| "network-error"
	| "invalid-payload";

export interface CurrentChatInfoSnapshot {
	dominantModel: string;
	fileSize: string;
	hasActiveChat: boolean;
	lastMessagePreview: string;
	lastUpdatedAt: number | null;
	metadataReason: CurrentChatInfoMetadataReason | null;
	metadataStatus: CurrentChatInfoMetadataStatus;
	messageCount: number | null;
	modelCounts: Record<string, number>;
	updatedAt: number;
}

export interface CurrentChatInfoStore {
	dispose(): void;
	getSnapshot(): CurrentChatInfoSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

function createEmptySnapshot({
	metadataReason = null,
	metadataStatus = "idle",
}: {
	metadataReason?: CurrentChatInfoMetadataReason | null;
	metadataStatus?: CurrentChatInfoMetadataStatus;
} = {}): CurrentChatInfoSnapshot {
	return {
		dominantModel: "",
		fileSize: "",
		hasActiveChat: false,
		lastMessagePreview: "",
		lastUpdatedAt: null,
		metadataReason,
		metadataStatus,
		messageCount: null,
		modelCounts: {},
		updatedAt: 0,
	};
}

function asNullableInteger(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number.parseInt(value, 10);
		if (Number.isInteger(parsed)) {
			return parsed;
		}
	}

	return null;
}

function extractModelName(value: unknown): string {
	const rawModel = asTrimmedString(value);
	if (!rawModel) {
		return "";
	}

	const segments = rawModel.split("/").filter(Boolean);
	return segments.at(-1) ?? rawModel;
}

function hasTimestampPayload(value: unknown): boolean {
	if (typeof value === "number" && Number.isFinite(value)) {
		return true;
	}

	if (typeof value !== "string") {
		return false;
	}

	return value.trim() !== "";
}

function shallowEqualRecord(
	previous: Record<string, number>,
	next: Record<string, number>,
): boolean {
	const previousEntries = Object.entries(previous);
	const nextEntries = Object.entries(next);

	if (previousEntries.length !== nextEntries.length) {
		return false;
	}

	for (const [key, value] of previousEntries) {
		if (next[key] !== value) {
			return false;
		}
	}

	return true;
}

function snapshotsEqual(
	previous: CurrentChatInfoSnapshot,
	next: CurrentChatInfoSnapshot,
): boolean {
	return (
		previous.hasActiveChat === next.hasActiveChat &&
		previous.messageCount === next.messageCount &&
		previous.fileSize === next.fileSize &&
		previous.lastMessagePreview === next.lastMessagePreview &&
		previous.lastUpdatedAt === next.lastUpdatedAt &&
		previous.metadataReason === next.metadataReason &&
		previous.metadataStatus === next.metadataStatus &&
		previous.dominantModel === next.dominantModel &&
		shallowEqualRecord(previous.modelCounts, next.modelCounts)
	);
}

function resolveContextSafe(): StContextLike | null {
	try {
		return getStContext() as StContextLike;
	} catch {
		return null;
	}
}

function resolveCharacter(
	context: StContextLike,
	characterId: number,
): CharacterLike | null {
	const characters = context.characters;

	if (Array.isArray(characters)) {
		const character = characters[characterId];
		return isRecord(character) ? (character as CharacterLike) : null;
	}

	if (isRecord(characters)) {
		const directCharacter = characters[String(characterId)];
		if (isRecord(directCharacter)) {
			return directCharacter as CharacterLike;
		}
	}

	return null;
}

function resolveGroup(
	context: StContextLike,
	groupId: string,
): GroupLike | null {
	const groups = context.groups;

	if (Array.isArray(groups)) {
		const match = groups.find(
			(group) =>
				isRecord(group) && asTrimmedIdentifier(group.id) === groupId,
		);
		return isRecord(match) ? (match as GroupLike) : null;
	}

	if (isRecord(groups)) {
		const directGroup = groups[groupId];
		if (isRecord(directGroup)) {
			return directGroup as GroupLike;
		}

		for (const candidate of Object.values(groups)) {
			if (
				isRecord(candidate) &&
				asTrimmedIdentifier(candidate.id) === groupId
			) {
				return candidate as GroupLike;
			}
		}
	}

	return null;
}

function resolveChatId(
	context: StContextLike | null,
	character: CharacterLike | null,
	group: GroupLike | null,
): string {
	if (context && typeof context.getCurrentChatId === "function") {
		try {
			const currentChatId = normalizeChatId(context.getCurrentChatId());
			if (currentChatId) {
				return currentChatId;
			}
		} catch {
			// Ignore getCurrentChatId failures and continue falling back.
		}
	}

	const contextChatId = normalizeChatId(context?.chatId);
	if (contextChatId) {
		return contextChatId;
	}

	const characterChatId = normalizeChatId(character?.chat);
	if (characterChatId) {
		return characterChatId;
	}

	return normalizeChatId(group?.chat_id);
}

function resolveActiveChatDescriptor(
	context: StContextLike | null,
): RemoteChatDescriptor | null {
	if (!context) {
		return null;
	}

	const groupId = asTrimmedIdentifier(context.groupId);
	if (groupId) {
		const group = resolveGroup(context, groupId);
		const chatId = resolveChatId(context, null, group);
		if (chatId) {
			return {
				chatId,
				kind: "group",
			};
		}
	}

	const characterId = asNullableInteger(context.characterId);
	if (characterId === null) {
		return null;
	}

	const character = resolveCharacter(context, characterId);
	const avatarUrl =
		asTrimmedString(character?.avatar) ||
		asTrimmedString(character?.avatar_url);
	const chatId = resolveChatId(context, character, null);

	if (!avatarUrl || !chatId) {
		return null;
	}

	return {
		avatarUrl,
		chatId,
		kind: "character",
	};
}

function countAssistantModels(chat: unknown): {
	dominantModel: string;
	modelCounts: Record<string, number>;
} {
	if (!Array.isArray(chat)) {
		return {
			dominantModel: "",
			modelCounts: {},
		};
	}

	const counts = new Map<string, number>();

	for (const entry of chat) {
		if (!isRecord(entry)) {
			continue;
		}

		const message = entry as MessageLike;
		if (message.is_user || message.is_system) {
			continue;
		}

		const extra = isRecord(message.extra) ? message.extra : null;
		const modelId = asTrimmedString(extra?.model);
		if (!modelId) {
			continue;
		}

		counts.set(modelId, (counts.get(modelId) ?? 0) + 1);
	}

	let dominantModel = "";
	let dominantCount = -1;

	for (const [modelId, count] of counts.entries()) {
		if (count > dominantCount) {
			dominantCount = count;
			dominantModel = extractModelName(modelId);
		}
	}

	return {
		dominantModel,
		modelCounts: Object.fromEntries(counts.entries()),
	};
}

function resolveLocalLastUpdatedAt(chat: unknown): number | null {
	if (!Array.isArray(chat)) {
		return null;
	}

	for (let index = chat.length - 1; index >= 0; index -= 1) {
		const entry = chat[index];
		if (!isRecord(entry)) {
			continue;
		}

		const timestamp = parseStTimestampToMs(
			(entry as MessageLike).send_date,
		);
		if (timestamp !== null) {
			return timestamp;
		}
	}

	return null;
}

function resolveLocalLastMessagePreview(chat: unknown): string {
	if (!Array.isArray(chat)) {
		return "";
	}

	for (let index = chat.length - 1; index >= 0; index -= 1) {
		const entry = chat[index];
		if (!isRecord(entry)) {
			continue;
		}

		const message = entry as MessageLike;
		if (message.is_system) {
			continue;
		}

		const preview = asTrimmedString(message.mes);
		if (preview) {
			return preview;
		}
	}

	return "";
}

function resolveCurrentChatInfoState(): ResolvedCurrentChatInfoState {
	const context = resolveContextSafe();
	const descriptor = resolveActiveChatDescriptor(context);

	if (!descriptor) {
		return {
			chatKey: null,
			context,
			descriptor: null,
			snapshot:
				context === null
					? createEmptySnapshot({
							metadataReason: "context-not-ready",
							metadataStatus: "pending",
						})
					: createEmptySnapshot(),
		};
	}

	const messageCount = Array.isArray(context?.chat) ? context.chat.length : 0;
	const { dominantModel, modelCounts } = countAssistantModels(context?.chat);
	const lastMessagePreview = resolveLocalLastMessagePreview(context?.chat);
	const lastUpdatedAt = resolveLocalLastUpdatedAt(context?.chat);

	return {
		chatKey: `${descriptor.kind}:${descriptor.chatId}`,
		context,
		descriptor,
		snapshot: {
			dominantModel,
			fileSize: "",
			hasActiveChat: true,
			lastMessagePreview,
			lastUpdatedAt,
			metadataReason: null,
			metadataStatus: "pending",
			messageCount,
			modelCounts,
			updatedAt: 0,
		},
	};
}

function normalizeHeaders(value: unknown): Record<string, string> {
	if (typeof Headers !== "undefined" && value instanceof Headers) {
		return Object.fromEntries(value.entries());
	}

	if (!isRecord(value)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(value).flatMap(([key, headerValue]) => {
			if (typeof headerValue === "string") {
				return [[key, headerValue] as const];
			}

			if (
				typeof headerValue === "number" ||
				typeof headerValue === "boolean"
			) {
				return [[key, String(headerValue)] as const];
			}

			return [];
		}),
	);
}

function resolveRequestHeaders(context: StContextLike | null) {
	if (!context || typeof context.getRequestHeaders !== "function") {
		return {
			"Content-Type": "application/json",
		};
	}

	try {
		return {
			...normalizeHeaders(context.getRequestHeaders()),
			"Content-Type": "application/json",
		};
	} catch {
		return {
			"Content-Type": "application/json",
		};
	}
}

async function readResponseJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

type RemoteChatInfoFailure = {
	endpoint: string;
	ok: false;
	reason: Exclude<CurrentChatInfoMetadataReason, "context-not-ready">;
	status?: number;
	statusText?: string;
};

type RemoteChatInfoSuccess<TData = CachedRemoteChatInfo> = {
	data: TData;
	endpoint: string;
	ok: true;
};

type RemoteChatInfoResult = RemoteChatInfoFailure | RemoteChatInfoSuccess;

function matchCharacterChatInfo(
	chatInfo: CharacterChatInfoLike,
	activeChatId: string,
): boolean {
	const candidateIds = [
		normalizeChatId(chatInfo.file_id),
		normalizeChatId(chatInfo.file_name),
	];

	return candidateIds.includes(activeChatId);
}

async function fetchCharacterChatInfo({
	activeChatId,
	avatarUrl,
	context,
	fetchImpl,
}: {
	activeChatId: string;
	avatarUrl: string;
	context: StContextLike | null;
	fetchImpl: FetchLike;
}): Promise<
	RemoteChatInfoSuccess<CharacterChatInfoLike> | RemoteChatInfoFailure
> {
	const endpoint = "/api/characters/chats";
	let response: Response;

	try {
		response = await fetchImpl(endpoint, {
			body: JSON.stringify({ avatar_url: avatarUrl }),
			headers: resolveRequestHeaders(context),
			method: "POST",
		});
	} catch {
		return {
			endpoint,
			ok: false,
			reason: "network-error",
		};
	}

	if (!response.ok) {
		return {
			endpoint,
			ok: false,
			reason: "http-error",
			status: response.status,
			statusText: response.statusText,
		};
	}

	const payload = await readResponseJson(response);
	if (!Array.isArray(payload)) {
		return {
			endpoint,
			ok: false,
			reason: "invalid-payload",
		};
	}

	const match = payload.find(
		(entry) =>
			isRecord(entry) &&
			matchCharacterChatInfo(
				entry as CharacterChatInfoLike,
				activeChatId,
			),
	);

	if (!isRecord(match)) {
		return {
			endpoint,
			ok: false,
			reason: "invalid-payload",
		};
	}

	return {
		data: match as CharacterChatInfoLike,
		endpoint,
		ok: true,
	};
}

async function fetchGroupChatInfo({
	activeChatId,
	context,
	fetchImpl,
}: {
	activeChatId: string;
	context: StContextLike | null;
	fetchImpl: FetchLike;
}): Promise<RemoteChatInfoSuccess<GroupChatInfoLike> | RemoteChatInfoFailure> {
	const endpoint = "/api/chats/group/info";
	let response: Response;

	try {
		response = await fetchImpl(endpoint, {
			body: JSON.stringify({ id: activeChatId }),
			headers: resolveRequestHeaders(context),
			method: "POST",
		});
	} catch {
		return {
			endpoint,
			ok: false,
			reason: "network-error",
		};
	}

	if (!response.ok) {
		return {
			endpoint,
			ok: false,
			reason: "http-error",
			status: response.status,
			statusText: response.statusText,
		};
	}

	const payload = await readResponseJson(response);
	if (!isRecord(payload)) {
		return {
			endpoint,
			ok: false,
			reason: "invalid-payload",
		};
	}

	return {
		data: payload as GroupChatInfoLike,
		endpoint,
		ok: true,
	};
}

async function fetchRemoteChatInfo({
	descriptor,
	fetchImpl,
}: {
	descriptor: RemoteChatDescriptor;
	fetchImpl: FetchLike;
}): Promise<RemoteChatInfoResult> {
	const context = resolveContextSafe();
	const remoteInfo =
		descriptor.kind === "character"
			? await fetchCharacterChatInfo({
					activeChatId: descriptor.chatId,
					avatarUrl: descriptor.avatarUrl,
					context,
					fetchImpl,
				})
			: await fetchGroupChatInfo({
					activeChatId: descriptor.chatId,
					context,
					fetchImpl,
				});

	if (!remoteInfo.ok) {
		return remoteInfo;
	}

	const rawLastUpdatedAt = remoteInfo.data.last_mes;
	const parsedLastUpdatedAt = parseStTimestampToMs(rawLastUpdatedAt);
	if (hasTimestampPayload(rawLastUpdatedAt) && parsedLastUpdatedAt === null) {
		return {
			endpoint: remoteInfo.endpoint,
			ok: false,
			reason: "invalid-payload",
		};
	}

	return {
		data: {
			fileSize: asTrimmedString(remoteInfo.data.file_size),
			lastUpdatedAt: parsedLastUpdatedAt,
		},
		endpoint: remoteInfo.endpoint,
		ok: true,
	};
}

function mergeLastUpdatedAt({
	localLastUpdatedAt,
	preservedLastUpdatedAt,
	remoteLastUpdatedAt,
}: {
	localLastUpdatedAt: number | null;
	preservedLastUpdatedAt: number | null;
	remoteLastUpdatedAt?: number | null;
}): number | null {
	const candidates = [
		localLastUpdatedAt,
		preservedLastUpdatedAt,
		remoteLastUpdatedAt ?? null,
	];
	let nextLastUpdatedAt: number | null = null;

	for (const candidate of candidates) {
		if (candidate === null || !Number.isFinite(candidate)) {
			continue;
		}

		nextLastUpdatedAt =
			nextLastUpdatedAt === null
				? candidate
				: Math.max(nextLastUpdatedAt, candidate);
	}

	return nextLastUpdatedAt;
}

function mergeFileSize({
	cachedFileSize,
	isSameChat,
	preservedFileSize,
}: {
	cachedFileSize: string;
	isSameChat: boolean;
	preservedFileSize: string;
}): string {
	if (isSameChat && preservedFileSize) {
		return preservedFileSize;
	}

	return cachedFileSize || preservedFileSize || "";
}

function hasUsableMetadata({
	fileSize,
	lastUpdatedAt,
}: Pick<CurrentChatInfoSnapshot, "fileSize" | "lastUpdatedAt">): boolean {
	return Boolean(fileSize) || lastUpdatedAt !== null;
}

function buildRefreshPolicies(eventTypes: EventTypesLike): Array<{
	eventName: string;
	options: RefreshOptions;
}> {
	const policies: Array<{
		eventName: string;
		options: RefreshOptions;
	}> = [
		{
			eventName: eventTypes.APP_READY ?? "",
			options: {
				invalidateActiveCache: false,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.CHAT_CHANGED ?? "",
			options: {
				invalidateActiveCache: false,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.CHAT_DELETED ?? "",
			options: {
				invalidateActiveCache: true,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.CHAT_LOADED ?? "",
			options: {
				invalidateActiveCache: false,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.CHAT_RENAMED ?? "",
			options: {
				invalidateActiveCache: true,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.GROUP_UPDATED ?? "",
			options: {
				invalidateActiveCache: true,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.GROUP_CHAT_CREATED ?? "",
			options: {
				invalidateActiveCache: true,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.GROUP_CHAT_DELETED ?? "",
			options: {
				invalidateActiveCache: true,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.MESSAGE_SENT ?? "",
			options: {
				invalidateActiveCache: false,
				remoteDelayMs: REMOTE_REFRESH_LONG_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.MESSAGE_RECEIVED ?? "",
			options: {
				invalidateActiveCache: false,
				remoteDelayMs: REMOTE_REFRESH_LONG_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.MESSAGE_EDITED ?? "",
			options: {
				invalidateActiveCache: false,
				remoteDelayMs: REMOTE_REFRESH_LONG_DEBOUNCE_MS,
			},
		},
		{
			eventName: eventTypes.MESSAGE_DELETED ?? "",
			options: {
				invalidateActiveCache: false,
				remoteDelayMs: REMOTE_REFRESH_LONG_DEBOUNCE_MS,
			},
		},
	];

	return policies.filter((eventPolicy) => Boolean(eventPolicy.eventName));
}

export function readCurrentChatInfoSnapshot(): CurrentChatInfoSnapshot {
	return resolveCurrentChatInfoState().snapshot;
}

export function createCurrentChatInfoStore({
	fetchImpl = fetch,
}: {
	fetchImpl?: FetchLike;
} = {}): CurrentChatInfoStore {
	const listeners = new Set<Listener>();
	const metadataCache = new Map<string, CachedRemoteChatInfo>();

	let snapshot = resolveCurrentChatInfoState().snapshot;
	let disposed = false;
	let isRefreshQueued = false;
	let queuedRefreshOptions: RefreshOptions | null = null;
	let activeEventListeners: Array<{
		eventName: string;
		listener: () => void;
	}> = [];
	let activeEventNamesSignature = "";
	let activeEventSource: EventSourceLike | null = null;
	let activeChatKey: string | null = null;
	let activeFailureSignature: string | null = null;
	let bootstrapRetryIndex = 0;
	let bootstrapRetryTimeout: ReturnType<typeof setTimeout> | null = null;
	let remoteRequestToken = 0;
	let remoteRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

	function notifyListeners() {
		for (const listener of listeners) {
			listener();
		}
	}

	function clearRemoteRefreshTimeout() {
		if (remoteRefreshTimeout !== null) {
			clearTimeout(remoteRefreshTimeout);
			remoteRefreshTimeout = null;
		}
	}

	function cancelOutstandingRemoteSync() {
		clearRemoteRefreshTimeout();
		remoteRequestToken += 1;
	}

	function clearBootstrapRetryTimeout() {
		if (bootstrapRetryTimeout !== null) {
			clearTimeout(bootstrapRetryTimeout);
			bootstrapRetryTimeout = null;
		}
	}

	function resetBootstrapRetry() {
		clearBootstrapRetryTimeout();
		bootstrapRetryIndex = 0;
	}

	function scheduleBootstrapRetry() {
		if (disposed || bootstrapRetryTimeout !== null) {
			return;
		}

		const delayMs = BOOTSTRAP_RETRY_DELAYS_MS[bootstrapRetryIndex];
		if (delayMs === undefined) {
			return;
		}

		bootstrapRetryIndex += 1;
		bootstrapRetryTimeout = setTimeout(() => {
			bootstrapRetryTimeout = null;
			refreshWithOptions({
				invalidateActiveCache: false,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			});
		}, delayMs);
	}

	function getCachedRemoteChatInfo(
		chatKey: string | null,
	): CachedRemoteChatInfo | null {
		if (!chatKey) {
			return null;
		}

		return metadataCache.get(chatKey) ?? null;
	}

	function clearCachedRemoteChatInfo(chatKey: string | null) {
		if (!chatKey) {
			return;
		}

		metadataCache.delete(chatKey);
	}

	function mergeRefreshOptions(
		previous: RefreshOptions | null,
		next: RefreshOptions,
	): RefreshOptions {
		if (!previous) {
			return next;
		}

		const previousDelay = previous.remoteDelayMs;
		const nextDelay = next.remoteDelayMs;
		const remoteDelayMs =
			previousDelay === null
				? nextDelay
				: nextDelay === null
					? previousDelay
					: Math.min(previousDelay, nextDelay);

		return {
			invalidateActiveCache:
				previous.invalidateActiveCache || next.invalidateActiveCache,
			remoteDelayMs,
		};
	}

	function publishSnapshot(nextSnapshot: CurrentChatInfoSnapshot) {
		if (snapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = {
			...nextSnapshot,
			updatedAt: Date.now(),
		};
		notifyListeners();
	}

	function removeActiveEventListeners() {
		if (activeEventSource) {
			for (const { eventName, listener } of activeEventListeners) {
				activeEventSource.removeListener(eventName, listener);
			}
		}

		activeEventListeners = [];
		activeEventNamesSignature = "";
		activeEventSource = null;
	}

	function syncRuntimeBindings(context: StContextLike | null): boolean {
		const nextEventSource = isRecord(context?.eventSource)
			? (context.eventSource as EventSourceLike)
			: null;
		const nextPolicies = context
			? buildRefreshPolicies(resolveEventTypes(context))
			: [];
		const nextSignature = nextPolicies
			.map(({ eventName }) => eventName)
			.join("|");
		if (!nextEventSource || !nextSignature) {
			removeActiveEventListeners();
			return false;
		}

		if (
			nextEventSource === activeEventSource &&
			nextSignature === activeEventNamesSignature
		) {
			return true;
		}

		removeActiveEventListeners();
		activeEventSource = nextEventSource;
		activeEventNamesSignature = nextSignature;
		activeEventListeners = nextPolicies.map(({ eventName, options }) => {
			const listener = () => {
				scheduleRefresh(options);
			};

			nextEventSource.on(eventName, listener);

			return {
				eventName,
				listener,
			};
		});

		return true;
	}

	function resolvePublishedMetadataState({
		cachedRemoteChatInfo,
		isRuntimeReady,
		isSameChat,
		nextState,
	}: {
		cachedRemoteChatInfo: CachedRemoteChatInfo | null;
		isRuntimeReady: boolean;
		isSameChat: boolean;
		nextState: ResolvedCurrentChatInfoState;
	}): Pick<CurrentChatInfoSnapshot, "metadataReason" | "metadataStatus"> {
		if (
			!isRuntimeReady ||
			nextState.snapshot.metadataReason === "context-not-ready"
		) {
			return {
				metadataReason: "context-not-ready",
				metadataStatus: "pending",
			};
		}

		if (!nextState.snapshot.hasActiveChat) {
			return {
				metadataReason: null,
				metadataStatus: "idle",
			};
		}

		if (
			cachedRemoteChatInfo ||
			(isSameChat && snapshot.metadataStatus === "ready")
		) {
			return {
				metadataReason: null,
				metadataStatus: "ready",
			};
		}

		if (
			isSameChat &&
			(snapshot.metadataStatus === "stale" ||
				snapshot.metadataStatus === "unavailable")
		) {
			return {
				metadataReason: snapshot.metadataReason,
				metadataStatus: snapshot.metadataStatus,
			};
		}

		return {
			metadataReason: null,
			metadataStatus: "pending",
		};
	}

	function logRemoteMetadataFailure({
		attempt,
		chatKey,
		descriptor,
		endpoint,
		reason,
		status,
		statusText,
	}: {
		attempt: number;
		chatKey: string;
		descriptor: RemoteChatDescriptor;
		endpoint: string;
		reason: Exclude<CurrentChatInfoMetadataReason, "context-not-ready">;
		status?: number;
		statusText?: string;
	}) {
		const signature = `${chatKey}:${reason}:${status ?? "none"}`;
		if (signature === activeFailureSignature) {
			return;
		}

		activeFailureSignature = signature;
		console.warn(
			`${EXTENSION_LOG_PREFIX} Failed to refresh current chat info metadata.`,
			{
				attempt,
				chatId: descriptor.chatId,
				chatKey,
				endpoint,
				kind: descriptor.kind,
				reason,
				status,
				statusText,
			},
		);
	}

	function scheduleRemoteSync({
		attempt,
		chatKey,
		descriptor,
		delayMs,
		localLastUpdatedAt,
	}: {
		attempt: number;
		chatKey: string | null;
		descriptor: RemoteChatDescriptor | null;
		delayMs: number | null;
		localLastUpdatedAt: number | null;
	}) {
		cancelOutstandingRemoteSync();

		if (!descriptor || !chatKey || delayMs === null) {
			return;
		}

		const requestToken = remoteRequestToken;
		remoteRefreshTimeout = setTimeout(() => {
			remoteRefreshTimeout = null;
			const runtimeReady = syncRuntimeBindings(resolveContextSafe());

			if (!runtimeReady) {
				refreshWithOptions({
					invalidateActiveCache: false,
					remoteDelayMs: null,
				});
				scheduleBootstrapRetry();
				return;
			}

			void syncRemoteChatInfo({
				attempt,
				chatKey,
				descriptor,
				localLastUpdatedAt,
				requestToken,
			});
		}, delayMs);
	}

	async function syncRemoteChatInfo({
		attempt,
		chatKey,
		descriptor,
		localLastUpdatedAt,
		requestToken,
	}: {
		attempt: number;
		chatKey: string;
		descriptor: RemoteChatDescriptor;
		localLastUpdatedAt: number | null;
		requestToken: number;
	}) {
		const remoteResult = await fetchRemoteChatInfo({
			descriptor,
			fetchImpl,
		});

		if (
			disposed ||
			requestToken !== remoteRequestToken ||
			chatKey !== activeChatKey
		) {
			return;
		}

		if (remoteResult.ok) {
			metadataCache.set(chatKey, remoteResult.data);
			activeFailureSignature = null;

			publishSnapshot({
				...snapshot,
				fileSize: remoteResult.data.fileSize || snapshot.fileSize,
				lastUpdatedAt: mergeLastUpdatedAt({
					localLastUpdatedAt,
					preservedLastUpdatedAt: snapshot.lastUpdatedAt,
					remoteLastUpdatedAt: remoteResult.data.lastUpdatedAt,
				}),
				metadataReason: null,
				metadataStatus: "ready",
				updatedAt: snapshot.updatedAt,
			});
			return;
		}

		const nextLastUpdatedAt = mergeLastUpdatedAt({
			localLastUpdatedAt,
			preservedLastUpdatedAt: snapshot.lastUpdatedAt,
		});
		const nextFileSize = snapshot.fileSize;

		logRemoteMetadataFailure({
			attempt,
			chatKey,
			descriptor,
			endpoint: remoteResult.endpoint,
			reason: remoteResult.reason,
			status: remoteResult.status,
			statusText: remoteResult.statusText,
		});

		publishSnapshot({
			...snapshot,
			fileSize: nextFileSize,
			lastUpdatedAt: nextLastUpdatedAt,
			metadataReason: remoteResult.reason,
			metadataStatus: hasUsableMetadata({
				fileSize: nextFileSize,
				lastUpdatedAt: nextLastUpdatedAt,
			})
				? "stale"
				: "unavailable",
			updatedAt: snapshot.updatedAt,
		});

		const nextRetryDelayMs = REMOTE_RETRY_DELAYS_MS[attempt - 1];
		if (nextRetryDelayMs === undefined) {
			return;
		}

		scheduleRemoteSync({
			attempt: attempt + 1,
			chatKey,
			descriptor,
			delayMs: nextRetryDelayMs,
			localLastUpdatedAt,
		});
	}

	function refreshWithOptions({
		invalidateActiveCache,
		remoteDelayMs,
	}: RefreshOptions) {
		if (disposed) {
			return;
		}

		const nextState = resolveCurrentChatInfoState();
		const isSameChat =
			nextState.chatKey !== null && nextState.chatKey === activeChatKey;
		const previousChatKey = activeChatKey;
		const isRuntimeReady = syncRuntimeBindings(nextState.context);

		if (previousChatKey !== nextState.chatKey) {
			activeFailureSignature = null;
			cancelOutstandingRemoteSync();
		}

		if (invalidateActiveCache) {
			clearCachedRemoteChatInfo(previousChatKey);
			clearCachedRemoteChatInfo(nextState.chatKey);
		}

		const cachedRemoteChatInfo = getCachedRemoteChatInfo(nextState.chatKey);
		const nextFileSize = mergeFileSize({
			cachedFileSize: cachedRemoteChatInfo?.fileSize ?? "",
			isSameChat,
			preservedFileSize: isSameChat ? snapshot.fileSize : "",
		});
		const nextLastUpdatedAt = mergeLastUpdatedAt({
			localLastUpdatedAt: nextState.snapshot.lastUpdatedAt,
			preservedLastUpdatedAt: isSameChat ? snapshot.lastUpdatedAt : null,
			remoteLastUpdatedAt: cachedRemoteChatInfo?.lastUpdatedAt,
		});
		const nextMetadataState = resolvePublishedMetadataState({
			cachedRemoteChatInfo,
			isRuntimeReady,
			isSameChat,
			nextState,
		});
		const nextSnapshot: CurrentChatInfoSnapshot = {
			...nextState.snapshot,
			fileSize: nextFileSize,
			lastUpdatedAt: nextLastUpdatedAt,
			metadataReason: nextMetadataState.metadataReason,
			metadataStatus: nextMetadataState.metadataStatus,
			updatedAt: snapshot.updatedAt,
		};

		activeChatKey = nextState.chatKey;
		publishSnapshot(nextSnapshot);

		if (!isRuntimeReady) {
			cancelOutstandingRemoteSync();
			scheduleBootstrapRetry();
			return;
		}

		resetBootstrapRetry();
		scheduleRemoteSync({
			attempt: 1,
			chatKey: nextState.chatKey,
			descriptor: nextState.descriptor,
			delayMs: remoteDelayMs,
			localLastUpdatedAt: nextState.snapshot.lastUpdatedAt,
		});
	}

	function refresh() {
		cancelOutstandingRemoteSync();
		resetBootstrapRetry();
		refreshWithOptions({
			invalidateActiveCache: false,
			remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
		});
	}

	function scheduleRefresh(nextOptions: RefreshOptions) {
		if (disposed || isRefreshQueued) {
			queuedRefreshOptions = mergeRefreshOptions(
				queuedRefreshOptions,
				nextOptions,
			);
			if (disposed) {
				queuedRefreshOptions = null;
			}
			return;
		}

		queuedRefreshOptions = mergeRefreshOptions(
			queuedRefreshOptions,
			nextOptions,
		);
		isRefreshQueued = true;
		queueMicrotaskSafe(() => {
			isRefreshQueued = false;
			const activeOptions = queuedRefreshOptions ?? {
				invalidateActiveCache: false,
				remoteDelayMs: REMOTE_REFRESH_SHORT_DEBOUNCE_MS,
			};
			queuedRefreshOptions = null;
			refreshWithOptions(activeOptions);
		});
	}

	refresh();

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			listeners.clear();
			cancelOutstandingRemoteSync();
			clearBootstrapRetryTimeout();
			queuedRefreshOptions = null;
			removeActiveEventListeners();
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
