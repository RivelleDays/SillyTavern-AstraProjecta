import {
	resolveCharacterChatAvatar,
	resolveGroupChatAvatar,
	type ChatAvatarCharacterLike,
	type ChatAvatarContextLike,
	type ChatAvatarGroupLike,
} from "@/packages/core/st/chat-avatar";
import type {
	ChatCatalogEntry,
	ChatCatalogStore,
} from "@/packages/core/st/chat-catalog";
import { getStContext } from "@/packages/core/st/context";
import {
	asTrimmedIdentifier,
	asTrimmedString,
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	queueMicrotaskSafe,
	readContextSafe,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type Listener = () => void;
type FavoriteChatEntitiesEventListener = (...args: unknown[]) => void;

type CharacterLike = ChatAvatarCharacterLike & {
	chat_size?: unknown;
	data?: unknown;
	fav?: unknown;
	name?: unknown;
};

type GroupLike = ChatAvatarGroupLike & {
	chat_size?: unknown;
	fav?: unknown;
	id?: unknown;
	name?: unknown;
};

type StFavoriteChatEntitiesContextLike = ChatAvatarContextLike & {
	characterId?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	groupId?: unknown;
	groups?: unknown;
};

type FavoriteChatEntityStats = {
	chatCount: number;
	latestMessageAt: number | null;
	totalMessageCount: number;
};

type FavoriteChatEntityCandidate = {
	characterId?: number | null;
	chatSize: number;
	entityId: string;
	groupAvatarUrls: string[];
	kind: FavoriteChatEntityKind;
	name: string;
	sourceIndex: number;
	thumbnailUrl: string;
};

type SortableFavoriteChatEntity = {
	chatSize: number;
	entity: FavoriteChatEntity;
	sourceIndex: number;
};

export const FAVORITE_CHAT_ENTITIES_DEFAULT_LIMIT = 25;
export const FAVORITE_CHAT_ENTITY_GLOBAL_SCOPE_VALUE = "global";
export const FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE =
	"current-context";

export type FavoriteChatEntityKind = "character" | "group";
export type FavoriteChatEntityScopeValue =
	`favorite:${FavoriteChatEntityKind}:${string}`;
export type FavoriteChatEntityPinnedScopeValue =
	| typeof FAVORITE_CHAT_ENTITY_GLOBAL_SCOPE_VALUE
	| typeof FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE;
export type FavoriteChatEntityNavigationScopeValue =
	| FavoriteChatEntityPinnedScopeValue
	| FavoriteChatEntityScopeValue;

export interface ParsedFavoriteChatEntityScopeValue {
	entityId: string;
	kind: FavoriteChatEntityKind;
}

export interface FavoriteChatEntity {
	avatarUrl: string;
	characterId?: number | null;
	chatCount: number;
	entityId: string;
	entityName: string;
	groupAvatarUrls: string[];
	kind: FavoriteChatEntityKind;
	latestMessageAt: number | null;
	scopeValue: FavoriteChatEntityScopeValue;
	totalMessageCount: number;
}

export interface FavoriteChatEntitiesSnapshot {
	currentScopeValue: FavoriteChatEntityScopeValue | null;
	entities: FavoriteChatEntity[];
	excludedCurrentEntity: FavoriteChatEntity | null;
	limit: number;
	totalFavoriteCount: number;
	updatedAt: number;
}

export interface ReadFavoriteChatEntitiesSnapshotOptions {
	chatCatalogEntries?: readonly ChatCatalogEntry[];
	context?: StFavoriteChatEntitiesContextLike | null;
	getContext?: () => unknown;
	limit?: number;
	now?: () => number;
}

export interface FavoriteChatEntitiesStore {
	dispose(): void;
	getSnapshot(): FavoriteChatEntitiesSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

export interface CreateFavoriteChatEntitiesStoreOptions {
	chatCatalogStore?: ChatCatalogStore;
	limit?: number;
	now?: () => number;
}

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

function isFavoriteValue(value: unknown): boolean {
	return value === true || value === "true";
}

function readCharacterExtensionFavorite(character: CharacterLike): unknown {
	if (!isRecord(character.data) || !isRecord(character.data.extensions)) {
		return undefined;
	}

	return character.data.extensions.fav;
}

export function isFavoriteCharacter(character: CharacterLike | null): boolean {
	if (!character) {
		return false;
	}

	return (
		isFavoriteValue(character.fav) ||
		isFavoriteValue(readCharacterExtensionFavorite(character))
	);
}

export function isFavoriteGroup(group: GroupLike | null): boolean {
	return Boolean(group && isFavoriteValue(group.fav));
}

export function createFavoriteChatEntityScopeValue(
	kind: FavoriteChatEntityKind,
	entityId: string,
): FavoriteChatEntityScopeValue {
	return `favorite:${kind}:${entityId}`;
}

export function parseFavoriteChatEntityScopeValue(
	value: string,
): ParsedFavoriteChatEntityScopeValue | null {
	const match = /^favorite:(character|group):(.+)$/.exec(value);
	if (!match) {
		return null;
	}

	return {
		entityId: match[2],
		kind: match[1] as FavoriteChatEntityKind,
	};
}

export function isFavoriteChatEntityScopeValue(
	value: string,
): value is FavoriteChatEntityScopeValue {
	return parseFavoriteChatEntityScopeValue(value) !== null;
}

function normalizeLimit(value: number | undefined): number {
	if (value === undefined) {
		return FAVORITE_CHAT_ENTITIES_DEFAULT_LIMIT;
	}

	if (!Number.isFinite(value) || value <= 0) {
		return 0;
	}

	return Math.floor(value);
}

function normalizeNativeChatSize(value: unknown): number {
	const numericValue =
		typeof value === "number"
			? value
			: typeof value === "string" && value.trim() !== ""
				? Number(value)
				: 0;

	return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

function collectCharacters(context: StFavoriteChatEntitiesContextLike): Array<{
	character: CharacterLike;
	characterId: number | null;
	entityId: string;
	sourceIndex: number;
}> {
	const characters = context.characters;

	if (Array.isArray(characters)) {
		return characters.flatMap((candidate, index) =>
			isRecord(candidate)
				? [
						{
							character: candidate as CharacterLike,
							characterId: index,
							entityId: String(index),
							sourceIndex: index,
						},
					]
				: [],
		);
	}

	if (!isRecord(characters)) {
		return [];
	}

	return Object.entries(characters).flatMap(([entityId, candidate], index) =>
		isRecord(candidate)
			? [
					{
						character: candidate as CharacterLike,
						characterId: asNullableInteger(entityId),
						entityId,
						sourceIndex: index,
					},
				]
			: [],
	);
}

function collectGroups(context: StFavoriteChatEntitiesContextLike): Array<{
	entityId: string;
	group: GroupLike;
	sourceIndex: number;
}> {
	const groups = context.groups;

	if (Array.isArray(groups)) {
		return groups.flatMap((candidate, index) => {
			if (!isRecord(candidate)) {
				return [];
			}

			const group = candidate as GroupLike;
			const entityId = asTrimmedIdentifier(group.id);
			return entityId ? [{ entityId, group, sourceIndex: index }] : [];
		});
	}

	if (!isRecord(groups)) {
		return [];
	}

	return Object.entries(groups).flatMap(([key, candidate], index) => {
		if (!isRecord(candidate)) {
			return [];
		}

		const group = candidate as GroupLike;
		const entityId = asTrimmedIdentifier(group.id) || key;
		return entityId ? [{ entityId, group, sourceIndex: index }] : [];
	});
}

function buildCharactersByAvatar(
	context: StFavoriteChatEntitiesContextLike,
): Map<string, CharacterLike> {
	const charactersByAvatar = new Map<string, CharacterLike>();

	for (const { character } of collectCharacters(context)) {
		const avatarCandidates = [
			asTrimmedString(character.avatar),
			asTrimmedString(character.avatar_url),
		].filter(Boolean);

		for (const avatarId of avatarCandidates) {
			if (!charactersByAvatar.has(avatarId)) {
				charactersByAvatar.set(avatarId, character);
			}
		}
	}

	return charactersByAvatar;
}

function collectFavoriteCandidates(
	context: StFavoriteChatEntitiesContextLike | null,
): FavoriteChatEntityCandidate[] {
	if (!context) {
		return [];
	}

	const charactersByAvatar = buildCharactersByAvatar(context);
	const collectedCharacters = collectCharacters(context);
	const collectedGroups = collectGroups(context);
	const groupSourceIndexOffset = collectedCharacters.length;
	const favoriteCharacters = collectedCharacters
		.filter(({ character }) => isFavoriteCharacter(character))
		.map(({ character, characterId, entityId, sourceIndex }) => {
			const avatar = resolveCharacterChatAvatar(context, character);
			return {
				characterId,
				chatSize: normalizeNativeChatSize(character.chat_size),
				entityId,
				groupAvatarUrls: [],
				kind: "character" as const,
				name:
					asTrimmedString(character.name) ||
					asTrimmedString(character.avatar) ||
					entityId,
				sourceIndex,
				thumbnailUrl: avatar.avatarUrl,
			};
		});
	const favoriteGroups = collectedGroups
		.filter(({ group }) => isFavoriteGroup(group))
		.map(({ entityId, group, sourceIndex }) => {
			const avatar = resolveGroupChatAvatar(context, group, {
				resolveCharacterByAvatarId: (avatarId) =>
					charactersByAvatar.get(avatarId) ?? null,
			});
			return {
				chatSize: normalizeNativeChatSize(group.chat_size),
				entityId,
				groupAvatarUrls: avatar.groupAvatarUrls,
				kind: "group" as const,
				name:
					asTrimmedString(group.name) ||
					asTrimmedIdentifier(group.id) ||
					entityId,
				sourceIndex: groupSourceIndexOffset + sourceIndex,
				thumbnailUrl: avatar.avatarUrl,
			};
		});

	return [...favoriteCharacters, ...favoriteGroups];
}

function getStatsKey(kind: FavoriteChatEntityKind, entityId: string): string {
	return `${kind}:${entityId}`;
}

function aggregateChatCatalogStats(
	entries: readonly ChatCatalogEntry[],
): Map<string, FavoriteChatEntityStats> {
	const statsByEntity = new Map<string, FavoriteChatEntityStats>();

	for (const entry of entries) {
		const key = getStatsKey(entry.kind, entry.entityId);
		const existing = statsByEntity.get(key) ?? {
			chatCount: 0,
			latestMessageAt: null,
			totalMessageCount: 0,
		};
		const messageCount =
			typeof entry.messageCount === "number" && entry.messageCount > 0
				? entry.messageCount
				: 0;
		const latestMessageAt =
			typeof entry.lastMessageAt === "number"
				? Math.max(existing.latestMessageAt ?? 0, entry.lastMessageAt)
				: existing.latestMessageAt;

		statsByEntity.set(key, {
			chatCount: existing.chatCount + 1,
			latestMessageAt,
			totalMessageCount: existing.totalMessageCount + messageCount,
		});
	}

	return statsByEntity;
}

function resolveCurrentScopeValue(
	context: StFavoriteChatEntitiesContextLike | null,
): FavoriteChatEntityScopeValue | null {
	if (!context) {
		return null;
	}

	const groupId = asTrimmedIdentifier(context.groupId);
	if (groupId) {
		return createFavoriteChatEntityScopeValue("group", groupId);
	}

	const characterId = asNullableInteger(context.characterId);
	if (characterId !== null) {
		return createFavoriteChatEntityScopeValue(
			"character",
			String(characterId),
		);
	}

	return null;
}

function toFavoriteChatEntity(
	candidate: FavoriteChatEntityCandidate,
	stats: FavoriteChatEntityStats | undefined,
): FavoriteChatEntity {
	return {
		avatarUrl: candidate.thumbnailUrl,
		characterId: candidate.characterId,
		chatCount: stats?.chatCount ?? 0,
		entityId: candidate.entityId,
		entityName: candidate.name,
		groupAvatarUrls: candidate.groupAvatarUrls,
		kind: candidate.kind,
		latestMessageAt: stats?.latestMessageAt ?? null,
		scopeValue: createFavoriteChatEntityScopeValue(
			candidate.kind,
			candidate.entityId,
		),
		totalMessageCount: stats?.totalMessageCount ?? 0,
	};
}

function compareSortableFavoriteChatEntities(
	left: SortableFavoriteChatEntity,
	right: SortableFavoriteChatEntity,
): number {
	return (
		right.chatSize - left.chatSize ||
		left.sourceIndex - right.sourceIndex ||
		left.entity.scopeValue.localeCompare(right.entity.scopeValue)
	);
}

function snapshotsEqual(
	left: FavoriteChatEntitiesSnapshot,
	right: FavoriteChatEntitiesSnapshot,
): boolean {
	return (
		left.currentScopeValue === right.currentScopeValue &&
		left.limit === right.limit &&
		left.totalFavoriteCount === right.totalFavoriteCount &&
		entitiesEqual(left.entities, right.entities) &&
		entityEqual(left.excludedCurrentEntity, right.excludedCurrentEntity)
	);
}

function entityEqual(
	left: FavoriteChatEntity | null,
	right: FavoriteChatEntity | null,
): boolean {
	if (left === right) {
		return true;
	}

	if (!left || !right) {
		return false;
	}

	return (
		left.avatarUrl === right.avatarUrl &&
		left.characterId === right.characterId &&
		left.chatCount === right.chatCount &&
		left.entityId === right.entityId &&
		left.entityName === right.entityName &&
		arraysEqual(left.groupAvatarUrls, right.groupAvatarUrls) &&
		left.kind === right.kind &&
		left.latestMessageAt === right.latestMessageAt &&
		left.scopeValue === right.scopeValue &&
		left.totalMessageCount === right.totalMessageCount
	);
}

function entitiesEqual(
	left: FavoriteChatEntity[],
	right: FavoriteChatEntity[],
): boolean {
	return (
		left.length === right.length &&
		left.every((entity, index) => entityEqual(entity, right[index]))
	);
}

function arraysEqual(left: string[], right: string[]): boolean {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}

function buildRefreshEventNames(eventTypes: EventTypesLike): string[] {
	return [
		eventTypes.APP_READY,
		eventTypes.CHAT_CHANGED,
		eventTypes.CHAT_DELETED,
		eventTypes.CHAT_RENAMED,
		eventTypes.CHARACTER_EDITED,
		eventTypes.CHARACTER_RENAMED,
		eventTypes.GROUP_CHAT_CREATED,
		eventTypes.GROUP_CHAT_DELETED,
		eventTypes.GROUP_UPDATED,
		eventTypes.SETTINGS_UPDATED,
	].filter((eventName): eventName is string => Boolean(eventName));
}

export function readFavoriteChatEntitiesSnapshot({
	chatCatalogEntries = [],
	context: providedContext,
	getContext,
	limit,
	now = Date.now,
}: ReadFavoriteChatEntitiesSnapshotOptions = {}): FavoriteChatEntitiesSnapshot {
	const resolvedLimit = normalizeLimit(limit);
	const context =
		providedContext === undefined
			? readContextSafe<StFavoriteChatEntitiesContextLike>(getContext)
			: providedContext;
	const statsByEntity = aggregateChatCatalogStats(chatCatalogEntries);
	const currentScopeValue = resolveCurrentScopeValue(context);
	const sortedFavorites = collectFavoriteCandidates(context)
		.map((candidate) => ({
			chatSize: candidate.chatSize,
			entity: toFavoriteChatEntity(
				candidate,
				statsByEntity.get(
					getStatsKey(candidate.kind, candidate.entityId),
				),
			),
			sourceIndex: candidate.sourceIndex,
		}))
		.sort(compareSortableFavoriteChatEntities)
		.map(({ entity }) => entity);
	const visibleEntities = sortedFavorites.slice(0, resolvedLimit);

	return {
		currentScopeValue,
		entities: visibleEntities,
		excludedCurrentEntity: null,
		limit: resolvedLimit,
		totalFavoriteCount: sortedFavorites.length,
		updatedAt: now(),
	};
}

export function createFavoriteChatEntitiesStore({
	chatCatalogStore,
	limit,
	now = Date.now,
}: CreateFavoriteChatEntitiesStoreOptions = {}): FavoriteChatEntitiesStore {
	const listeners = new Set<Listener>();
	const initialContext = readContextSafe<StFavoriteChatEntitiesContextLike>();
	const eventSource =
		initialContext && isRecord(initialContext.eventSource)
			? (initialContext.eventSource as EventSourceLike)
			: null;
	const eventTypes = initialContext ? resolveEventTypes(initialContext) : {};
	let chatCatalogEntries = chatCatalogStore?.getSnapshot().entries ?? [];
	let snapshot = readFavoriteChatEntitiesSnapshot({
		chatCatalogEntries,
		limit,
		now,
	});
	let disposed = false;
	let isRefreshQueued = false;
	let activeEventListeners: Array<{
		eventName: string;
		listener: FavoriteChatEntitiesEventListener;
	}> = [];

	function notifyListeners() {
		for (const listener of listeners) {
			listener();
		}
	}

	function publish(nextSnapshot: FavoriteChatEntitiesSnapshot) {
		if (snapshotsEqual(snapshot, nextSnapshot)) {
			snapshot = nextSnapshot;
			return;
		}

		snapshot = nextSnapshot;
		notifyListeners();
	}

	function refresh() {
		if (disposed) {
			return;
		}

		chatCatalogEntries = chatCatalogStore?.getSnapshot().entries ?? [];
		publish(
			readFavoriteChatEntitiesSnapshot({
				chatCatalogEntries,
				limit,
				now,
			}),
		);
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

	const unsubscribeChatCatalog = chatCatalogStore?.subscribe(scheduleRefresh);

	if (eventSource) {
		activeEventListeners = Array.from(
			new Set(buildRefreshEventNames(eventTypes)),
		).map((eventName) => {
			const listener = () => {
				scheduleRefresh();
			};
			eventSource.on(eventName, listener);

			return {
				eventName,
				listener,
			};
		});
	}

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			listeners.clear();
			unsubscribeChatCatalog?.();

			if (eventSource) {
				for (const { eventName, listener } of activeEventListeners) {
					eventSource.removeListener(eventName, listener);
				}
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
