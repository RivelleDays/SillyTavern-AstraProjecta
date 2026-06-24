import {
	resolveGroupChatAvatar,
	resolveThumbnailUrl,
} from "@/packages/core/st/chat-avatar";
import { getStContext } from "@/packages/core/st/context";
import type {
	ChatCatalogCacheStatus,
	ChatCatalogEntry,
	ChatCatalogEntryKind,
	ChatCatalogSortMode,
	ChatCatalogStatus,
} from "@/packages/core/st/chat-catalog";
import {
	asTrimmedIdentifier,
	asTrimmedString,
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	normalizeChatId,
	readContextSafe,
	resolveEventTypes,
} from "@/packages/core/st/shared";
import {
	formatStAbsoluteTimestamp,
	parseStTimestampToMs,
} from "@/packages/core/st/timestamps";

type Listener = () => void;
type FetchLike = typeof fetch;

type CharacterLike = Record<string, unknown> & {
	avatar?: unknown;
	avatar_url?: unknown;
	chat?: unknown;
	name?: unknown;
};

type GroupLike = Record<string, unknown> & {
	avatar_url?: unknown;
	chat_id?: unknown;
	disabled_members?: unknown;
	id?: unknown;
	members?: unknown;
	name?: unknown;
};

type SearchChatLike = Record<string, unknown> & {
	chat_items?: unknown;
	file_id?: unknown;
	file_name?: unknown;
	file_size?: unknown;
	last_mes?: unknown;
	mes?: unknown;
	message_count?: unknown;
	preview_message?: unknown;
};

type StCurrentChatCatalogContextLike = Record<string, unknown> & {
	characterId?: unknown;
	characters?: unknown;
	chatId?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	getCurrentChatId?: () => unknown;
	getRequestHeaders?: () => unknown;
	getThumbnailUrl?: (type: string, fileName: string) => unknown;
	groupId?: unknown;
	groups?: unknown;
};

type CachePayload = {
	entries: ChatCatalogEntry[];
	scopeKey: string;
	timestamp: number;
	version: 1;
};

type CreateCurrentChatCatalogStoreOptions = {
	fetchImpl?: FetchLike;
	now?: () => number;
	storage?: Storage | null;
};

type CacheReadResult = {
	cacheStatus: Exclude<ChatCatalogCacheStatus, "empty">;
	entries: ChatCatalogEntry[];
	timestamp: number;
};

export type CurrentChatCatalogActiveEntity = {
	activeChatId: string;
	avatarUrl: string;
	characterId?: number | null;
	entityId: string;
	entityName: string;
	groupAvatarUrls?: string[];
	kind: ChatCatalogEntryKind;
	requestAvatarUrl: string | null;
	requestGroupId: string | null;
	scopeKey: `${ChatCatalogEntryKind}:${string}`;
};

export type CurrentChatCatalogEntityScope = {
	entityId: string;
	kind: ChatCatalogEntryKind;
};

export interface CurrentChatCatalogSnapshot {
	activeEntity: CurrentChatCatalogActiveEntity | null;
	cacheStatus: ChatCatalogCacheStatus;
	entries: ChatCatalogEntry[];
	errorMessage: string;
	status: ChatCatalogStatus;
	updatedAt: number | null;
}

export interface CurrentChatCatalogStore {
	dispose(): void;
	getSnapshot(): CurrentChatCatalogSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

export interface ScopedChatCatalogStore extends CurrentChatCatalogStore {
	setEntity(entity: CurrentChatCatalogEntityScope | null): void;
}

export const CURRENT_CHAT_CATALOG_CACHE_KEY_PREFIX =
	"astra_projecta:astra-main-interface:current-chat-catalog:v1";
export const CURRENT_CHAT_CATALOG_CACHE_STALE_MS = 5 * 60 * 1000;

const JSONL_EXTENSION_PATTERN = /\.jsonl$/i;

function asNullableInteger(value: unknown): number | null {
	if (typeof value === "number" && Number.isInteger(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number.parseInt(value, 10);
		return Number.isInteger(parsed) ? parsed : null;
	}

	return null;
}

function normalizeFileName(value: unknown, chatId: string): string {
	const fileName = asTrimmedString(value);
	if (!fileName) {
		return chatId ? `${chatId}.jsonl` : "";
	}

	return JSONL_EXTENSION_PATTERN.test(fileName)
		? fileName
		: `${fileName}.jsonl`;
}

function resolveStorage(storage?: Storage | null): Storage | null {
	if (storage !== undefined) {
		return storage;
	}

	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		return null;
	}
}

function resolveRequestHeaders(
	context: StCurrentChatCatalogContextLike | null,
): Record<string, string> {
	if (!context || typeof context.getRequestHeaders !== "function") {
		return {
			"Content-Type": "application/json",
		};
	}

	try {
		const headers = context.getRequestHeaders();
		if (!isRecord(headers)) {
			return {
				"Content-Type": "application/json",
			};
		}

		return {
			...Object.fromEntries(
				Object.entries(headers).flatMap(([key, value]) => {
					if (typeof value === "string") {
						return [[key, value] as const];
					}

					if (
						typeof value === "number" ||
						typeof value === "boolean"
					) {
						return [[key, String(value)] as const];
					}

					return [];
				}),
			),
			"Content-Type": "application/json",
		};
	} catch {
		return {
			"Content-Type": "application/json",
		};
	}
}

function resolveCharacter(
	context: StCurrentChatCatalogContextLike,
	characterId: number,
): CharacterLike | null {
	const characters = context.characters;

	if (Array.isArray(characters) && isRecord(characters[characterId])) {
		return characters[characterId] as CharacterLike;
	}

	if (isRecord(characters)) {
		const directCharacter = characters[String(characterId)];
		return isRecord(directCharacter)
			? (directCharacter as CharacterLike)
			: null;
	}

	return null;
}

function resolveCharacterByEntityId(
	context: StCurrentChatCatalogContextLike,
	entityId: string,
): {
	character: CharacterLike;
	characterId: number | null;
} | null {
	const characterId = asNullableInteger(entityId);

	if (characterId !== null) {
		const character = resolveCharacter(context, characterId);
		return character ? { character, characterId } : null;
	}

	const characters = context.characters;
	if (isRecord(characters) && isRecord(characters[entityId])) {
		return {
			character: characters[entityId] as CharacterLike,
			characterId: null,
		};
	}

	return null;
}

function resolveCharacterByAvatar(
	context: StCurrentChatCatalogContextLike,
	avatarFileName: string,
): CharacterLike | null {
	const characters = context.characters;
	const matchesAvatar = (candidate: CharacterLike) =>
		asTrimmedString(candidate.avatar) === avatarFileName ||
		asTrimmedString(candidate.avatar_url) === avatarFileName;

	if (Array.isArray(characters)) {
		const match = characters.find(
			(candidate) =>
				isRecord(candidate) &&
				matchesAvatar(candidate as CharacterLike),
		);
		return isRecord(match) ? (match as CharacterLike) : null;
	}

	if (isRecord(characters)) {
		for (const candidate of Object.values(characters)) {
			if (
				isRecord(candidate) &&
				matchesAvatar(candidate as CharacterLike)
			) {
				return candidate as CharacterLike;
			}
		}
	}

	return null;
}

function resolveGroup(
	context: StCurrentChatCatalogContextLike,
	groupId: string,
): GroupLike | null {
	const groups = context.groups;

	if (Array.isArray(groups)) {
		const match = groups.find(
			(group) =>
				isRecord(group) &&
				asTrimmedIdentifier((group as GroupLike).id) === groupId,
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
				asTrimmedIdentifier((candidate as GroupLike).id) === groupId
			) {
				return candidate as GroupLike;
			}
		}
	}

	return null;
}

function resolveCurrentChatId(
	context: StCurrentChatCatalogContextLike,
	character: CharacterLike | null,
	group: GroupLike | null,
): string {
	if (typeof context.getCurrentChatId === "function") {
		try {
			const currentChatId = normalizeChatId(context.getCurrentChatId());
			if (currentChatId) {
				return currentChatId;
			}
		} catch {
			// Fall through to entity metadata.
		}
	}

	const contextChatId = normalizeChatId(context.chatId);
	if (contextChatId) {
		return contextChatId;
	}

	return normalizeChatId(character?.chat) || normalizeChatId(group?.chat_id);
}

function resolveGroupAvatarUrls(
	context: StCurrentChatCatalogContextLike,
	group: GroupLike,
): {
	avatarUrl: string;
	groupAvatarUrls: string[];
} {
	const groupAvatar = resolveGroupChatAvatar(context, group, {
		resolveCharacterByAvatarId: (avatarFileName) =>
			resolveCharacterByAvatar(context, avatarFileName),
	});

	return {
		avatarUrl: groupAvatar.avatarUrl,
		groupAvatarUrls: groupAvatar.groupAvatarUrls,
	};
}

function resolveActiveEntity(
	context: StCurrentChatCatalogContextLike | null,
): CurrentChatCatalogActiveEntity | null {
	if (!context) {
		return null;
	}

	const groupId = asTrimmedIdentifier(context.groupId);
	if (groupId) {
		const group = resolveGroup(context, groupId);
		if (!group) {
			return null;
		}

		const entityName =
			asTrimmedString(group.name) ||
			asTrimmedIdentifier(group.id) ||
			groupId;
		const groupAvatar = resolveGroupAvatarUrls(context, group);
		return {
			activeChatId: resolveCurrentChatId(context, null, group),
			avatarUrl: groupAvatar.avatarUrl,
			entityId: groupId,
			entityName,
			groupAvatarUrls: groupAvatar.groupAvatarUrls,
			kind: "group",
			requestAvatarUrl: null,
			requestGroupId: groupId,
			scopeKey: `group:${groupId}`,
		};
	}

	const characterId = asNullableInteger(context.characterId);
	if (characterId === null) {
		return null;
	}

	const character = resolveCharacter(context, characterId);
	if (!character) {
		return null;
	}

	const avatarFileName =
		asTrimmedString(character.avatar) ||
		asTrimmedString(character.avatar_url);
	if (!avatarFileName) {
		return null;
	}

	const entityId = String(characterId);
	return {
		activeChatId: resolveCurrentChatId(context, character, null),
		avatarUrl: resolveThumbnailUrl(context, "avatar", avatarFileName),
		characterId,
		entityId,
		entityName:
			asTrimmedString(character.name) || avatarFileName || entityId,
		kind: "character",
		requestAvatarUrl: avatarFileName,
		requestGroupId: null,
		scopeKey: `character:${entityId}`,
	};
}

function isContextEntityActive(
	context: StCurrentChatCatalogContextLike,
	entity: CurrentChatCatalogEntityScope,
): boolean {
	if (entity.kind === "group") {
		return asTrimmedIdentifier(context.groupId) === entity.entityId;
	}

	const characterId = asNullableInteger(context.characterId);
	return characterId !== null && String(characterId) === entity.entityId;
}

function resolveScopedEntity(
	context: StCurrentChatCatalogContextLike | null,
	entity: CurrentChatCatalogEntityScope | null,
): CurrentChatCatalogActiveEntity | null {
	if (!context || !entity) {
		return null;
	}

	const entityId = asTrimmedIdentifier(entity.entityId);
	if (!entityId) {
		return null;
	}

	if (entity.kind === "group") {
		const group = resolveGroup(context, entityId);
		if (!group) {
			return null;
		}

		const groupAvatar = resolveGroupAvatarUrls(context, group);
		const activeChatId = isContextEntityActive(context, {
			entityId,
			kind: "group",
		})
			? resolveCurrentChatId(context, null, group)
			: "";

		return {
			activeChatId,
			avatarUrl: groupAvatar.avatarUrl,
			entityId,
			entityName:
				asTrimmedString(group.name) ||
				asTrimmedIdentifier(group.id) ||
				entityId,
			groupAvatarUrls: groupAvatar.groupAvatarUrls,
			kind: "group",
			requestAvatarUrl: null,
			requestGroupId: entityId,
			scopeKey: `group:${entityId}`,
		};
	}

	const resolvedCharacter = resolveCharacterByEntityId(context, entityId);
	if (!resolvedCharacter) {
		return null;
	}

	const avatarFileName =
		asTrimmedString(resolvedCharacter.character.avatar) ||
		asTrimmedString(resolvedCharacter.character.avatar_url);
	if (!avatarFileName) {
		return null;
	}

	const activeChatId = isContextEntityActive(context, {
		entityId,
		kind: "character",
	})
		? resolveCurrentChatId(context, resolvedCharacter.character, null)
		: "";

	return {
		activeChatId,
		avatarUrl: resolveThumbnailUrl(context, "avatar", avatarFileName),
		characterId: resolvedCharacter.characterId,
		entityId,
		entityName:
			asTrimmedString(resolvedCharacter.character.name) ||
			avatarFileName ||
			entityId,
		kind: "character",
		requestAvatarUrl: avatarFileName,
		requestGroupId: null,
		scopeKey: `character:${entityId}`,
	};
}

function resolveMessageCount(value: unknown): number | null {
	const count = asNullableInteger(value);
	return count !== null && count >= 0 ? count : null;
}

function normalizePreview(value: unknown): string {
	const preview = asTrimmedString(value);
	if (
		preview === "[The chat is empty]" ||
		preview === "[The message is empty]"
	) {
		return "";
	}

	return preview;
}

function normalizeEntryForEntity(
	chat: SearchChatLike,
	entity: CurrentChatCatalogActiveEntity,
): ChatCatalogEntry | null {
	const chatId =
		normalizeChatId(chat.file_name) || normalizeChatId(chat.file_id);
	if (!chatId) {
		return null;
	}

	const lastMessageAt = parseStTimestampToMs(chat.last_mes);
	const fileName = normalizeFileName(chat.file_name, chatId);
	const entry: ChatCatalogEntry = {
		avatarUrl: entity.avatarUrl,
		chatId,
		entityId: entity.entityId,
		entityName: entity.entityName,
		fileName,
		fileSize: asTrimmedString(chat.file_size),
		isCurrent: entity.activeChatId === chatId,
		key: `${entity.kind}:${entity.entityId}:${chatId}`,
		kind: entity.kind,
		lastMessageAt,
		lastMessageLabel: formatStAbsoluteTimestamp(lastMessageAt),
		lastMessagePreview: normalizePreview(chat.preview_message ?? chat.mes),
		messageCount: resolveMessageCount(
			chat.message_count ?? chat.chat_items,
		),
	};

	if (entity.kind === "character") {
		entry.characterId = entity.characterId ?? null;
	}

	if (entity.kind === "group") {
		entry.groupAvatarUrls = entity.groupAvatarUrls ?? [];
	}

	return entry;
}

function normalizeEntriesForEntity(
	payload: unknown,
	entity: CurrentChatCatalogActiveEntity | null,
): ChatCatalogEntry[] {
	if (!Array.isArray(payload) || !entity) {
		return [];
	}

	return payload.flatMap((entry) => {
		if (!isRecord(entry)) {
			return [];
		}

		const normalizedEntry = normalizeEntryForEntity(
			entry as SearchChatLike,
			entity,
		);
		return normalizedEntry ? [normalizedEntry] : [];
	});
}

export function normalizeCurrentChatCatalogEntries(
	payload: unknown,
	context = readContextSafe<StCurrentChatCatalogContextLike>(),
): ChatCatalogEntry[] {
	return normalizeEntriesForEntity(payload, resolveActiveEntity(context));
}

export function filterCurrentChatCatalogEntries(
	entries: ChatCatalogEntry[],
	query: string,
): ChatCatalogEntry[] {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	if (!normalizedQuery) {
		return entries;
	}

	return entries.filter((entry) =>
		[entry.chatId, entry.fileName, entry.lastMessagePreview]
			.join(" ")
			.toLocaleLowerCase()
			.includes(normalizedQuery),
	);
}

function compareEntryKeys(
	left: ChatCatalogEntry,
	right: ChatCatalogEntry,
): number {
	return left.key.localeCompare(right.key);
}

function compareNullableNumber(
	left: number | null,
	right: number | null,
	direction: "asc" | "desc",
): number {
	const leftValue =
		left ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : 0);
	const rightValue =
		right ?? (direction === "asc" ? Number.MAX_SAFE_INTEGER : 0);

	return direction === "asc"
		? leftValue - rightValue
		: rightValue - leftValue;
}

export function sortCurrentChatCatalogEntries(
	entries: ChatCatalogEntry[],
	sortMode: ChatCatalogSortMode,
): ChatCatalogEntry[] {
	return [...entries].sort((left, right) => {
		let result = 0;

		switch (sortMode) {
			case "entity-asc":
				result =
					left.chatId.localeCompare(right.chatId) ||
					left.fileName.localeCompare(right.fileName);
				break;
			case "entity-desc":
				result =
					right.chatId.localeCompare(left.chatId) ||
					right.fileName.localeCompare(left.fileName);
				break;
			case "least-messages":
				result = compareNullableNumber(
					left.messageCount,
					right.messageCount,
					"asc",
				);
				break;
			case "most-messages":
				result = compareNullableNumber(
					left.messageCount,
					right.messageCount,
					"desc",
				);
				break;
			case "oldest":
				result = compareNullableNumber(
					left.lastMessageAt,
					right.lastMessageAt,
					"asc",
				);
				break;
			case "most-recent":
			default:
				result = compareNullableNumber(
					left.lastMessageAt,
					right.lastMessageAt,
					"desc",
				);
				break;
		}

		return result === 0 ? compareEntryKeys(left, right) : result;
	});
}

function isChatCatalogEntry(value: unknown): value is ChatCatalogEntry {
	if (!isRecord(value)) {
		return false;
	}

	return (
		(value.kind === "character" || value.kind === "group") &&
		typeof value.key === "string" &&
		typeof value.chatId === "string" &&
		typeof value.entityId === "string" &&
		typeof value.entityName === "string" &&
		typeof value.fileName === "string"
	);
}

function getCacheKey(entity: CurrentChatCatalogActiveEntity): string {
	return `${CURRENT_CHAT_CATALOG_CACHE_KEY_PREFIX}:${encodeURIComponent(
		entity.scopeKey,
	)}`;
}

function readCache({
	entity,
	now,
	storage,
}: {
	entity: CurrentChatCatalogActiveEntity;
	now: number;
	storage: Storage | null;
}): CacheReadResult | null {
	if (!storage) {
		return null;
	}

	const cacheKey = getCacheKey(entity);
	const rawPayload = storage.getItem(cacheKey);
	if (!rawPayload) {
		return null;
	}

	let payload: unknown;
	try {
		payload = JSON.parse(rawPayload);
	} catch {
		storage.removeItem(cacheKey);
		return null;
	}

	if (
		!isRecord(payload) ||
		payload.version !== 1 ||
		payload.scopeKey !== entity.scopeKey ||
		typeof payload.timestamp !== "number" ||
		!Array.isArray(payload.entries)
	) {
		storage.removeItem(cacheKey);
		return null;
	}

	const entries = payload.entries.filter(isChatCatalogEntry);
	return {
		cacheStatus:
			now - payload.timestamp <= CURRENT_CHAT_CATALOG_CACHE_STALE_MS
				? "fresh"
				: "stale",
		entries,
		timestamp: payload.timestamp,
	};
}

function toCacheableEntry(entry: ChatCatalogEntry): ChatCatalogEntry {
	const cacheableEntry = { ...entry };
	delete cacheableEntry.isCurrent;
	return cacheableEntry;
}

function writeCache({
	entries,
	entity,
	now,
	storage,
}: {
	entries: ChatCatalogEntry[];
	entity: CurrentChatCatalogActiveEntity;
	now: number;
	storage: Storage | null;
}) {
	if (!storage) {
		return;
	}

	const payload: CachePayload = {
		entries: entries.map(toCacheableEntry),
		scopeKey: entity.scopeKey,
		timestamp: now,
		version: 1,
	};

	try {
		storage.setItem(getCacheKey(entity), JSON.stringify(payload));
	} catch {
		// Storage failures should not block the live chat list.
	}
}

function markCurrentEntries(
	entries: ChatCatalogEntry[],
	entity: CurrentChatCatalogActiveEntity,
): ChatCatalogEntry[] {
	return entries.map((entry) => {
		const isCurrent =
			entry.kind === entity.kind &&
			entry.entityId === entity.entityId &&
			entry.chatId === entity.activeChatId;
		return entry.isCurrent === isCurrent
			? entry
			: {
					...entry,
					isCurrent,
				};
	});
}

function createSnapshot({
	activeEntity,
	cacheStatus = "empty",
	entries = [],
	errorMessage = "",
	status,
	updatedAt = null,
}: {
	activeEntity: CurrentChatCatalogActiveEntity | null;
	cacheStatus?: ChatCatalogCacheStatus;
	entries?: ChatCatalogEntry[];
	errorMessage?: string;
	status: ChatCatalogStatus;
	updatedAt?: number | null;
}): CurrentChatCatalogSnapshot {
	return {
		activeEntity,
		cacheStatus,
		entries,
		errorMessage,
		status,
		updatedAt,
	};
}

async function fetchCurrentChatCatalogEntries({
	entity,
	fetchImpl,
	context,
}: {
	context: StCurrentChatCatalogContextLike | null;
	entity: CurrentChatCatalogActiveEntity;
	fetchImpl: FetchLike;
}): Promise<ChatCatalogEntry[]> {
	let response: Response;

	try {
		response = await fetchImpl("/api/chats/search", {
			body: JSON.stringify({
				avatar_url: entity.requestAvatarUrl,
				group_id: entity.requestGroupId,
				query: "",
			}),
			headers: resolveRequestHeaders(context),
			method: "POST",
		});
	} catch {
		throw new Error("network-error");
	}

	if (!response.ok) {
		throw new Error("http-error");
	}

	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		throw new Error("invalid-payload");
	}

	return normalizeEntriesForEntity(payload, entity);
}

function buildRefreshEventNames(eventTypes: EventTypesLike): string[] {
	return [
		eventTypes.APP_READY,
		eventTypes.CHAT_CHANGED,
		eventTypes.CHAT_DELETED,
		eventTypes.CHAT_LOADED,
		eventTypes.CHAT_RENAMED,
		eventTypes.GROUP_UPDATED,
		eventTypes.GROUP_CHAT_CREATED,
		eventTypes.GROUP_CHAT_DELETED,
		eventTypes.MESSAGE_SENT,
		eventTypes.MESSAGE_RECEIVED,
		eventTypes.MESSAGE_EDITED,
		eventTypes.MESSAGE_DELETED,
	].filter((eventName): eventName is string => Boolean(eventName));
}

function createEntityChatCatalogStore({
	fetchImpl = fetch,
	now = Date.now,
	resolveEntity,
	storage,
}: CreateCurrentChatCatalogStoreOptions & {
	resolveEntity(
		context: StCurrentChatCatalogContextLike | null,
	): CurrentChatCatalogActiveEntity | null;
}): CurrentChatCatalogStore {
	const listeners = new Set<Listener>();
	const resolvedStorage = resolveStorage(storage);
	let disposed = false;
	let requestToken = 0;
	let activeEventSource: EventSourceLike | null = null;
	let activeEventListeners: Array<{
		eventName: string;
		listener: Listener;
	}> = [];

	const initialContext =
		readContextSafe<StCurrentChatCatalogContextLike>();
	const initialEntity = resolveEntity(initialContext);
	const initialCache = initialEntity
		? readCache({
				entity: initialEntity,
				now: now(),
				storage: resolvedStorage,
			})
		: null;
	let snapshot: CurrentChatCatalogSnapshot = initialEntity
		? initialCache
			? createSnapshot({
					activeEntity: initialEntity,
					cacheStatus: initialCache.cacheStatus,
					entries: markCurrentEntries(
						initialCache.entries,
						initialEntity,
					),
					status:
						initialCache.cacheStatus === "fresh"
							? "ready"
							: "refreshing",
					updatedAt: initialCache.timestamp,
				})
			: createSnapshot({
					activeEntity: initialEntity,
					status: "loading",
				})
		: createSnapshot({
				activeEntity: null,
				status: "ready",
			});

	function notifyListeners() {
		for (const listener of listeners) {
			listener();
		}
	}

	function publish(nextSnapshot: CurrentChatCatalogSnapshot) {
		snapshot = nextSnapshot;
		notifyListeners();
	}

	function clearEventListeners() {
		if (activeEventSource) {
			for (const { eventName, listener } of activeEventListeners) {
				activeEventSource.removeListener(eventName, listener);
			}
		}

		activeEventListeners = [];
		activeEventSource = null;
	}

	function syncEventListeners() {
		const context = readContextSafe<StCurrentChatCatalogContextLike>();
		const nextEventSource =
			context && isRecord(context.eventSource)
				? (context.eventSource as EventSourceLike)
				: null;

		clearEventListeners();

		if (!context || !nextEventSource) {
			return;
		}

		activeEventSource = nextEventSource;
		activeEventListeners = buildRefreshEventNames(
			resolveEventTypes(context),
		).map((eventName) => {
			const listener = () => {
				refresh();
			};
			nextEventSource.on(eventName, listener);

			return {
				eventName,
				listener,
			};
		});
	}

	async function runRemoteRefresh(
		activeRequestToken: number,
		entity: CurrentChatCatalogActiveEntity,
		context: StCurrentChatCatalogContextLike | null,
	) {
		try {
			const entries = await fetchCurrentChatCatalogEntries({
				context,
				entity,
				fetchImpl,
			});
			const currentEntity = resolveEntity(
				readContextSafe<StCurrentChatCatalogContextLike>(),
			);
			if (
				disposed ||
				activeRequestToken !== requestToken ||
				currentEntity?.scopeKey !== entity.scopeKey
			) {
				return;
			}

			const updatedAt = now();
			writeCache({
				entries,
				entity: currentEntity,
				now: updatedAt,
				storage: resolvedStorage,
			});
			publish(
				createSnapshot({
					activeEntity: currentEntity,
					cacheStatus: "fresh",
					entries: markCurrentEntries(entries, currentEntity),
					status: "ready",
					updatedAt,
				}),
			);
		} catch {
			if (disposed || activeRequestToken !== requestToken) {
				return;
			}

			publish({
				...snapshot,
				errorMessage: "Failed to load current chats.",
				status: "error",
			});
		}
	}

	function refresh() {
		if (disposed) {
			return;
		}

		const context = readContextSafe<StCurrentChatCatalogContextLike>();
		const entity = resolveEntity(context);
		requestToken += 1;

		if (!entity) {
			publish(
				createSnapshot({
					activeEntity: null,
					status: "ready",
				}),
			);
			return;
		}

		const activeRequestToken = requestToken;
		const isSameEntity =
			snapshot.activeEntity?.scopeKey === entity.scopeKey;
		const cachedResult = isSameEntity
			? null
			: readCache({
					entity,
					now: now(),
					storage: resolvedStorage,
				});
		const entries = isSameEntity
			? markCurrentEntries(snapshot.entries, entity)
			: cachedResult
				? markCurrentEntries(cachedResult.entries, entity)
				: [];
		const cacheStatus = isSameEntity
			? entries.length > 0
				? snapshot.cacheStatus
				: "empty"
			: (cachedResult?.cacheStatus ?? "empty");

		publish(
			createSnapshot({
				activeEntity: entity,
				cacheStatus,
				entries,
				status:
					entries.length > 0 && cacheStatus === "fresh"
						? "ready"
						: entries.length > 0
							? "refreshing"
							: "loading",
				updatedAt: isSameEntity
					? snapshot.updatedAt
					: (cachedResult?.timestamp ?? null),
			}),
		);

		if (cachedResult?.cacheStatus === "fresh") {
			return;
		}

		void runRemoteRefresh(activeRequestToken, entity, context);
	}

	syncEventListeners();

	if (
		initialEntity &&
		(!initialCache || initialCache.cacheStatus === "stale")
	) {
		refresh();
	}

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			requestToken += 1;
			listeners.clear();
			clearEventListeners();
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

export function createCurrentChatCatalogStore(
	options: CreateCurrentChatCatalogStoreOptions = {},
): CurrentChatCatalogStore {
	return createEntityChatCatalogStore({
		...options,
		resolveEntity: resolveActiveEntity,
	});
}

function normalizeEntityScope(
	entity: CurrentChatCatalogEntityScope | null,
): CurrentChatCatalogEntityScope | null {
	if (!entity) {
		return null;
	}

	const entityId = asTrimmedIdentifier(entity.entityId);
	if (!entityId || (entity.kind !== "character" && entity.kind !== "group")) {
		return null;
	}

	return {
		entityId,
		kind: entity.kind,
	};
}

function entityScopesEqual(
	left: CurrentChatCatalogEntityScope | null,
	right: CurrentChatCatalogEntityScope | null,
): boolean {
	return left?.entityId === right?.entityId && left?.kind === right?.kind;
}

export function createScopedChatCatalogStore(
	options: CreateCurrentChatCatalogStoreOptions = {},
): ScopedChatCatalogStore {
	let targetEntity: CurrentChatCatalogEntityScope | null = null;
	const store = createEntityChatCatalogStore({
		...options,
		resolveEntity: (context) => resolveScopedEntity(context, targetEntity),
	});

	return {
		...store,
		setEntity(entity) {
			const normalizedEntity = normalizeEntityScope(entity);
			if (entityScopesEqual(targetEntity, normalizedEntity)) {
				return;
			}

			targetEntity = normalizedEntity;
			store.refresh();
		},
	};
}
