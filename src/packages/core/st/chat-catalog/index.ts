import {
	resolveGroupChatAvatar,
	resolveThumbnailUrl,
} from "@/packages/core/st/chat-avatar";
import { getStContext } from "@/packages/core/st/context";
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
import {
	defaultUnstableChatCatalogInternals,
} from "@/packages/core/st/chat-catalog/unstable-st-internals";

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
	id?: unknown;
	members?: unknown;
	name?: unknown;
};

type RecentChatLike = Record<string, unknown> & {
	avatar?: unknown;
	chat_items?: unknown;
	file_id?: unknown;
	file_name?: unknown;
	file_size?: unknown;
	group?: unknown;
	last_mes?: unknown;
	mes?: unknown;
};

type StChatCatalogContextLike = Record<string, unknown> & {
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
	executeSlashCommandsWithOptions?: (
		text: string,
		options?: Record<string, unknown>,
	) => unknown;
	openCharacterChat?: (chatId: string) => unknown;
	openGroupChat?: (groupId: string, chatId: string) => unknown;
	saveSettingsDebounced?: () => unknown;
	selectCharacterById?: (
		characterId: number,
		options?: { switchMenu?: boolean },
	) => unknown;
};

type ResolvedCharacter = {
	character: CharacterLike;
	characterId: number | null;
	entityId: string;
};

type ChatCatalogLookup = {
	charactersByAvatar: Map<string, ResolvedCharacter>;
	groupsById: Map<string, GroupLike>;
};

type CachePayload = {
	entries: ChatCatalogEntry[];
	timestamp: number;
	version: 1;
};

type CreateChatCatalogStoreOptions = {
	fetchImpl?: FetchLike;
	now?: () => number;
	storage?: Storage | null;
};

type ReadCacheOptions = {
	now?: number;
	storage?: Storage | null;
};

type WriteCacheOptions = {
	entries: ChatCatalogEntry[];
	now?: number;
	storage?: Storage | null;
};

export const CHAT_CATALOG_CACHE_KEY =
	"astra_projecta:astra-main-interface:global-chat-catalog:v1";
export const CHAT_CATALOG_CACHE_STALE_MS = 5 * 60 * 1000;

const TARGET_FIRST_CONTEXT_WAIT_ATTEMPTS = 40;
const TARGET_FIRST_CONTEXT_WAIT_MS = 25;

export type ChatCatalogEntryKind = "character" | "group";

export type ChatCatalogSortMode =
	| "most-recent"
	| "oldest"
	| "entity-asc"
	| "entity-desc"
	| "most-messages"
	| "least-messages";

export type ChatCatalogCacheStatus = "empty" | "fresh" | "stale";

export type ChatCatalogStatus = "loading" | "ready" | "refreshing" | "error";

export interface ChatCatalogEntry {
	avatarUrl: string;
	characterId?: number | null;
	chatId: string;
	entityId: string;
	entityName: string;
	fileName: string;
	fileSize: string;
	groupAvatarUrls?: string[];
	isCurrent?: boolean;
	key: `${ChatCatalogEntryKind}:${string}:${string}`;
	kind: ChatCatalogEntryKind;
	lastMessageAt: number | null;
	lastMessageLabel: string;
	lastMessagePreview: string;
	messageCount: number | null;
}

export interface ChatCatalogCacheReadResult {
	cacheStatus: Exclude<ChatCatalogCacheStatus, "empty">;
	entries: ChatCatalogEntry[];
	timestamp: number;
}

export interface ChatCatalogSnapshot {
	cacheStatus: ChatCatalogCacheStatus;
	entries: ChatCatalogEntry[];
	errorMessage: string;
	status: ChatCatalogStatus;
	updatedAt: number | null;
}

export interface ChatCatalogStore {
	dispose(): void;
	getSnapshot(): ChatCatalogSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

export type OpenChatCatalogResult =
	| {
			alreadyCurrent?: true;
			ok: true;
	  }
	| {
			ok: false;
			reason:
				| "ambiguous-group"
				| "api-unavailable"
				| "context-unavailable"
				| "invalid-entry"
				| "open-failed";
	  };

export type OpenChatCatalogEntry = (
	entry: ChatCatalogEntry,
) => Promise<OpenChatCatalogResult>;

export type ChatCatalogExportFormat = "jsonl" | "txt";

export type ExportChatCatalogResult =
	| {
			fileName: string;
			ok: true;
	  }
	| {
			message?: string;
			ok: false;
			reason:
				| "context-unavailable"
				| "download-failed"
				| "export-failed"
				| "invalid-entry"
				| "network-error";
	  };

export type ExportChatCatalogEntry = (
	entry: ChatCatalogEntry,
	format: ChatCatalogExportFormat,
) => Promise<ExportChatCatalogResult>;

export type RenameChatCatalogResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			reason:
				| "api-unavailable"
				| "invalid-entry"
				| "invalid-name"
				| "rename-failed";
	  };

export type RenameChatCatalogEntry = (
	entry: ChatCatalogEntry,
	newFileName: string,
) => Promise<RenameChatCatalogResult>;

export type DeleteChatCatalogResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			reason: "api-unavailable" | "delete-failed" | "invalid-entry";
	  };

export type DeleteChatCatalogEntry = (
	entry: ChatCatalogEntry,
) => Promise<DeleteChatCatalogResult>;

function createEmptySnapshot(): ChatCatalogSnapshot {
	return {
		cacheStatus: "empty",
		entries: [],
		errorMessage: "",
		status: "loading",
		updatedAt: null,
	};
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

function normalizeChatActionName(value: unknown): string {
	return normalizeChatId(value);
}

function normalizeFileName(value: unknown, chatId: string): string {
	const fileName = asTrimmedString(value);
	return fileName || (chatId ? `${chatId}.jsonl` : "");
}

function waitForNextContextProbe(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, TARGET_FIRST_CONTEXT_WAIT_MS);
	});
}

async function waitForContextMatch(
	getContext: () => unknown,
	isMatch: (context: StChatCatalogContextLike) => boolean,
): Promise<StChatCatalogContextLike | null> {
	for (
		let attempt = 0;
		attempt < TARGET_FIRST_CONTEXT_WAIT_ATTEMPTS;
		attempt += 1
	) {
		const context = readContextSafe<StChatCatalogContextLike>(getContext);
		if (context && isMatch(context)) {
			return context;
		}

		if (attempt < TARGET_FIRST_CONTEXT_WAIT_ATTEMPTS - 1) {
			await waitForNextContextProbe();
		}
	}

	return null;
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

function resolveRequestHeaders(
	context: StChatCatalogContextLike | null,
): Record<string, string> {
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

function resolveExportRequestHeaders(
	context: StChatCatalogContextLike | null,
): Record<string, string> {
	return {
		...resolveRequestHeaders(context),
		Accept: "application/json",
	};
}

function resolveCharacterExportAvatar(
	entry: ChatCatalogEntry,
	context: StChatCatalogContextLike,
): string | null {
	if (entry.kind !== "character") {
		return null;
	}

	if (!Array.isArray(context.characters)) {
		return null;
	}

	const characterId =
		typeof entry.characterId === "number"
			? entry.characterId
			: asNullableInteger(entry.entityId);
	if (characterId === null) {
		return null;
	}

	const character = context.characters[characterId];
	if (!isRecord(character)) {
		return null;
	}

	return (
		asTrimmedString((character as CharacterLike).avatar) ||
		asTrimmedString((character as CharacterLike).avatar_url) ||
		null
	);
}

function downloadWithBrowserFallback(
	content: string,
	fileName: string,
	mimeType: string,
) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);

	try {
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = fileName;
		anchor.click();
	} finally {
		URL.revokeObjectURL(url);
	}
}

function characterAvatarMatches(
	character: CharacterLike,
	avatarFileName: string,
): boolean {
	const candidates = [
		asTrimmedString(character.avatar),
		asTrimmedString(character.avatar_url),
	].filter(Boolean);

	return candidates.includes(avatarFileName);
}

function addCharacterLookupEntry(
	charactersByAvatar: Map<string, ResolvedCharacter>,
	character: CharacterLike,
	entityId: string,
	characterId: number | null,
) {
	const resolvedCharacter: ResolvedCharacter = {
		character,
		characterId,
		entityId,
	};
	const avatarCandidates = [
		asTrimmedString(character.avatar),
		asTrimmedString(character.avatar_url),
	].filter(Boolean);

	for (const avatarFileName of avatarCandidates) {
		if (!charactersByAvatar.has(avatarFileName)) {
			charactersByAvatar.set(avatarFileName, resolvedCharacter);
		}
	}
}

function buildCharactersByAvatar(
	context: StChatCatalogContextLike,
): Map<string, ResolvedCharacter> {
	const charactersByAvatar = new Map<string, ResolvedCharacter>();
	const characters = context.characters;

	if (Array.isArray(characters)) {
		characters.forEach((candidate, index) => {
			if (!isRecord(candidate)) {
				return;
			}

			addCharacterLookupEntry(
				charactersByAvatar,
				candidate as CharacterLike,
				String(index),
				index,
			);
		});
		return charactersByAvatar;
	}

	if (isRecord(characters)) {
		for (const [key, candidate] of Object.entries(characters)) {
			if (!isRecord(candidate)) {
				continue;
			}

			addCharacterLookupEntry(
				charactersByAvatar,
				candidate as CharacterLike,
				key,
				asNullableInteger(key),
			);
		}
	}

	return charactersByAvatar;
}

function addGroupLookupEntry(
	groupsById: Map<string, GroupLike>,
	groupId: unknown,
	group: GroupLike,
	overwrite = false,
) {
	const normalizedGroupId = asTrimmedIdentifier(groupId);
	if (!normalizedGroupId) {
		return;
	}

	if (overwrite || !groupsById.has(normalizedGroupId)) {
		groupsById.set(normalizedGroupId, group);
	}
}

function buildGroupsById(
	context: StChatCatalogContextLike,
): Map<string, GroupLike> {
	const groupsById = new Map<string, GroupLike>();
	const groups = context.groups;

	if (Array.isArray(groups)) {
		for (const candidate of groups) {
			if (!isRecord(candidate)) {
				continue;
			}

			const group = candidate as GroupLike;
			addGroupLookupEntry(groupsById, group.id, group);
		}
		return groupsById;
	}

	if (isRecord(groups)) {
		const groupEntries = Object.entries(groups).filter(
			(entry): entry is [string, GroupLike] => isRecord(entry[1]),
		);

		for (const [key, group] of groupEntries) {
			addGroupLookupEntry(groupsById, key, group, true);
		}

		for (const [, group] of groupEntries) {
			addGroupLookupEntry(groupsById, group.id, group);
		}
	}

	return groupsById;
}

function buildChatCatalogLookup(
	context: StChatCatalogContextLike,
): ChatCatalogLookup {
	return {
		charactersByAvatar: buildCharactersByAvatar(context),
		groupsById: buildGroupsById(context),
	};
}

function resolveCharacterByAvatar(
	context: StChatCatalogContextLike,
	avatarFileName: string,
	lookup?: ChatCatalogLookup,
): ResolvedCharacter | null {
	const indexedCharacter = lookup?.charactersByAvatar.get(avatarFileName);
	if (indexedCharacter) {
		return indexedCharacter;
	}

	const characters = context.characters;

	if (Array.isArray(characters)) {
		const matchIndex = characters.findIndex(
			(candidate) =>
				isRecord(candidate) &&
				characterAvatarMatches(
					candidate as CharacterLike,
					avatarFileName,
				),
		);

		if (matchIndex >= 0 && isRecord(characters[matchIndex])) {
			return {
				character: characters[matchIndex] as CharacterLike,
				characterId: matchIndex,
				entityId: String(matchIndex),
			};
		}
	}

	if (isRecord(characters)) {
		for (const [key, candidate] of Object.entries(characters)) {
			if (
				isRecord(candidate) &&
				characterAvatarMatches(
					candidate as CharacterLike,
					avatarFileName,
				)
			) {
				return {
					character: candidate as CharacterLike,
					characterId: asNullableInteger(key),
					entityId: key,
				};
			}
		}
	}

	return null;
}

function resolveCharacterById(
	context: StChatCatalogContextLike,
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

function resolveGroup(
	context: StChatCatalogContextLike,
	groupId: string,
	lookup?: ChatCatalogLookup,
): GroupLike | null {
	const indexedGroup = lookup?.groupsById.get(groupId);
	if (indexedGroup) {
		return indexedGroup;
	}

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

function findNativeGroupSelectElement(groupId: string): HTMLElement | null {
	if (typeof document === "undefined") {
		return null;
	}

	const groupRows = document.querySelectorAll(".group_select");
	for (const groupRow of Array.from(groupRows)) {
		if (!(groupRow instanceof HTMLElement)) {
			continue;
		}

		const rowGroupId =
			groupRow.getAttribute("data-chid") ??
			groupRow.getAttribute("data-grid");
		if (rowGroupId === groupId) {
			return groupRow;
		}
	}

	return null;
}

function triggerNativeGroupSelectElement(groupElement: HTMLElement): void {
	const globalJQuery = (globalThis as { jQuery?: unknown; $?: unknown })
		.jQuery;
	const globalDollar = (globalThis as { jQuery?: unknown; $?: unknown }).$;
	const jquery = globalJQuery ?? globalDollar;

	if (typeof jquery === "function") {
		const wrapped = jquery(groupElement) as { trigger?: unknown };
		if (typeof wrapped.trigger === "function") {
			wrapped.trigger("click");
			return;
		}
	}

	groupElement.click();
}

function findNativeCharacterSelectElement(
	characterId: number,
): HTMLElement | null {
	if (typeof document === "undefined") {
		return null;
	}

	const characterRows = document.querySelectorAll(".character_select");
	for (const characterRow of Array.from(characterRows)) {
		if (!(characterRow instanceof HTMLElement)) {
			continue;
		}

		const rowCharacterId = characterRow.getAttribute("data-chid");
		if (rowCharacterId === String(characterId)) {
			return characterRow;
		}
	}

	const directRow = document.getElementById(`CharID${characterId}`);
	return directRow instanceof HTMLElement ? directRow : null;
}

function triggerNativeCharacterSelectElement(
	characterElement: HTMLElement,
): void {
	const globalJQuery = (globalThis as { jQuery?: unknown; $?: unknown })
		.jQuery;
	const globalDollar = (globalThis as { jQuery?: unknown; $?: unknown }).$;
	const jquery = globalJQuery ?? globalDollar;

	if (typeof jquery === "function") {
		const wrapped = jquery(characterElement) as { trigger?: unknown };
		if (typeof wrapped.trigger === "function") {
			wrapped.trigger("click");
			return;
		}
	}

	characterElement.click();
}

function resolveCharacterByAvatarId(
	context: StChatCatalogContextLike,
	avatarFileName: string,
	lookup?: ChatCatalogLookup,
): CharacterLike | null {
	const indexedCharacter = resolveCharacterByAvatar(
		context,
		avatarFileName,
		lookup,
	);
	if (indexedCharacter) {
		return indexedCharacter.character;
	}

	const characters = context.characters;

	if (Array.isArray(characters)) {
		const match = characters.find(
			(candidate) =>
				isRecord(candidate) &&
				characterAvatarMatches(
					candidate as CharacterLike,
					avatarFileName,
				),
		);

		return isRecord(match) ? (match as CharacterLike) : null;
	}

	if (isRecord(characters)) {
		for (const candidate of Object.values(characters)) {
			if (
				isRecord(candidate) &&
				characterAvatarMatches(
					candidate as CharacterLike,
					avatarFileName,
				)
			) {
				return candidate as CharacterLike;
			}
		}
	}

	return null;
}

function resolveGroupAvatarUrls(
	context: StChatCatalogContextLike,
	group: GroupLike,
	lookup?: ChatCatalogLookup,
): {
	avatarUrl: string;
	groupAvatarUrls: string[];
} {
	const groupAvatar = resolveGroupChatAvatar(context, group, {
		resolveCharacterByAvatarId: (avatarFileName) =>
			resolveCharacterByAvatarId(context, avatarFileName, lookup),
	});

	return {
		avatarUrl: groupAvatar.avatarUrl,
		groupAvatarUrls: groupAvatar.groupAvatarUrls,
	};
}

function resolveMessageCount(value: unknown): number | null {
	const count = asNullableInteger(value);
	return count !== null && count >= 0 ? count : null;
}

function normalizeRecentChatEntry(
	chat: RecentChatLike,
	context: StChatCatalogContextLike,
	lookup?: ChatCatalogLookup,
): ChatCatalogEntry | null {
	const chatId =
		normalizeChatId(chat.file_name) || normalizeChatId(chat.file_id);
	if (!chatId) {
		return null;
	}

	const fileName = normalizeFileName(chat.file_name, chatId);
	const groupId = asTrimmedIdentifier(chat.group);
	const lastMessageAt = parseStTimestampToMs(chat.last_mes);
	const lastMessageLabel = formatStAbsoluteTimestamp(lastMessageAt);

	if (groupId) {
		const group = resolveGroup(context, groupId, lookup);
		if (!group) {
			return null;
		}

		const entityName =
			asTrimmedString(group.name) || asTrimmedString(group.id) || groupId;
		const groupAvatar = resolveGroupAvatarUrls(context, group, lookup);
		return {
			avatarUrl: groupAvatar.avatarUrl,
			chatId,
			entityId: groupId,
			entityName,
			fileName,
			fileSize: asTrimmedString(chat.file_size),
			groupAvatarUrls: groupAvatar.groupAvatarUrls,
			isCurrent: isCurrentGroupChatEntry(context, groupId, chatId),
			key: `group:${groupId}:${chatId}`,
			kind: "group",
			lastMessageAt,
			lastMessageLabel,
			lastMessagePreview: asTrimmedString(chat.mes),
			messageCount: resolveMessageCount(chat.chat_items),
		};
	}

	const avatarFileName = asTrimmedString(chat.avatar);
	if (!avatarFileName) {
		return null;
	}

	const resolvedCharacter = resolveCharacterByAvatar(
		context,
		avatarFileName,
		lookup,
	);
	if (!resolvedCharacter) {
		return null;
	}

	const entityName =
		asTrimmedString(resolvedCharacter.character.name) ||
		asTrimmedString(resolvedCharacter.character.avatar) ||
		resolvedCharacter.entityId;

	return {
		avatarUrl: resolveThumbnailUrl(context, "avatar", avatarFileName),
		characterId: resolvedCharacter.characterId,
		chatId,
		entityId: resolvedCharacter.entityId,
		entityName,
		fileName,
		fileSize: asTrimmedString(chat.file_size),
		isCurrent: isCurrentCharacterChatEntry(
			context,
			resolvedCharacter.characterId,
			chatId,
		),
		key: `character:${resolvedCharacter.entityId}:${chatId}`,
		kind: "character",
		lastMessageAt,
		lastMessageLabel,
		lastMessagePreview: asTrimmedString(chat.mes),
		messageCount: resolveMessageCount(chat.chat_items),
	};
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

function resolveCurrentChatId(context: StChatCatalogContextLike): string {
	if (typeof context.getCurrentChatId === "function") {
		try {
			const currentChatId = normalizeChatId(context.getCurrentChatId());
			if (currentChatId) {
				return currentChatId;
			}
		} catch {
			// Fall through to chatId.
		}
	}

	return normalizeChatId(context.chatId);
}

function isCurrentGroupChatEntry(
	context: StChatCatalogContextLike,
	groupId: string,
	chatId: string,
): boolean {
	return (
		asTrimmedIdentifier(context.groupId) === groupId &&
		resolveCurrentChatId(context) === chatId
	);
}

function isCurrentCharacterChatEntry(
	context: StChatCatalogContextLike,
	characterId: number | null,
	chatId: string,
): boolean {
	return (
		characterId !== null &&
		asNullableInteger(context.characterId) === characterId &&
		resolveCurrentChatId(context) === chatId
	);
}

function isActiveCharacterContext(
	context: StChatCatalogContextLike,
	characterId: number,
): boolean {
	return (
		!asTrimmedIdentifier(context.groupId) &&
		asNullableInteger(context.characterId) === characterId
	);
}

function isActiveCharacterChatContext(
	context: StChatCatalogContextLike,
	characterId: number,
	chatId: string,
): boolean {
	return (
		isActiveCharacterContext(context, characterId) &&
		resolveCurrentChatId(context) === chatId
	);
}

function persistActiveChatSelection(context: StChatCatalogContextLike): void {
	try {
		if (typeof context.saveSettingsDebounced === "function") {
			context.saveSettingsDebounced();
		}
	} catch {
		// A settings debounce failure should not block an already verified activation.
	}
}

function isCurrentChatCatalogEntry(
	entry: ChatCatalogEntry,
	context: StChatCatalogContextLike,
): boolean {
	if (entry.kind === "group") {
		return isCurrentGroupChatEntry(context, entry.entityId, entry.chatId);
	}

	const characterId =
		typeof entry.characterId === "number"
			? entry.characterId
			: asNullableInteger(entry.entityId);

	return isCurrentCharacterChatEntry(context, characterId, entry.chatId);
}

function markCurrentChatCatalogEntries(
	entries: ChatCatalogEntry[],
	context = readContextSafe<StChatCatalogContextLike>(),
): ChatCatalogEntry[] {
	return entries.map((entry) => {
		const isCurrent = context
			? isCurrentChatCatalogEntry(entry, context)
			: false;

		return entry.isCurrent === isCurrent
			? entry
			: {
					...entry,
					isCurrent,
				};
	});
}

function toCacheableChatCatalogEntry(
	entry: ChatCatalogEntry,
): ChatCatalogEntry {
	const cacheableEntry = { ...entry };
	delete cacheableEntry.isCurrent;
	return cacheableEntry;
}

function collectGroups(context: StChatCatalogContextLike): GroupLike[] {
	if (Array.isArray(context.groups)) {
		return context.groups.filter(isRecord) as GroupLike[];
	}

	if (isRecord(context.groups)) {
		return Object.values(context.groups).filter(isRecord) as GroupLike[];
	}

	return [];
}

function normalizeGroupNameForMatch(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase();
}

function resolveGroupActivationName(
	context: StChatCatalogContextLike,
	groupId: string,
	fallbackName: string,
):
	| { name: string; ok: true }
	| { ok: false; reason: "ambiguous-group" | "invalid-entry" } {
	const group = resolveGroup(context, groupId);
	const name = asTrimmedString(group?.name) || fallbackName.trim();
	if (!name) {
		return {
			ok: false,
			reason: "invalid-entry",
		};
	}

	const normalizedName = normalizeGroupNameForMatch(name);
	const matchingGroupIds = collectGroups(context)
		.filter(
			(candidate) =>
				normalizeGroupNameForMatch(asTrimmedString(candidate.name)) ===
				normalizedName,
		)
		.map((candidate) => asTrimmedIdentifier(candidate.id))
		.filter(Boolean);
	const uniqueMatchingGroupIds = Array.from(new Set(matchingGroupIds));

	if (
		uniqueMatchingGroupIds.length > 1 ||
		(uniqueMatchingGroupIds.length === 1 &&
			uniqueMatchingGroupIds[0] !== groupId)
	) {
		return {
			ok: false,
			reason: "ambiguous-group",
		};
	}

	return {
		name,
		ok: true,
	};
}

function quoteSlashCommandArgument(value: string): string {
	return JSON.stringify(value);
}

function slashResultFailed(result: unknown): boolean {
	return (
		isRecord(result) &&
		(result.isError === true || result.isAborted === true)
	);
}

async function activateGroupThroughPublicApi(
	context: StChatCatalogContextLike,
	groupId: string,
	fallbackName: string,
	getContext: () => unknown,
): Promise<
	| { context: StChatCatalogContextLike; ok: true }
	| {
			ok: false;
			reason:
				| "ambiguous-group"
				| "api-unavailable"
				| "invalid-entry"
				| "open-failed";
	  }
> {
	if (asTrimmedIdentifier(context.groupId) === groupId) {
		return {
			context,
			ok: true,
		};
	}

	if (typeof context.executeSlashCommandsWithOptions !== "function") {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	const activationName = resolveGroupActivationName(
		context,
		groupId,
		fallbackName,
	);
	if (!activationName.ok) {
		return activationName;
	}

	try {
		const result = await context.executeSlashCommandsWithOptions(
			`/go ${quoteSlashCommandArgument(activationName.name)}`,
			{
				handleExecutionErrors: false,
				handleParserErrors: false,
				source: "astra-projecta",
			},
		);

		if (slashResultFailed(result)) {
			return {
				ok: false,
				reason: "open-failed",
			};
		}
	} catch {
		return {
			ok: false,
			reason: "open-failed",
		};
	}

	const nextContext =
		readContextSafe<StChatCatalogContextLike>(getContext);
	if (!nextContext || asTrimmedIdentifier(nextContext.groupId) !== groupId) {
		return {
			ok: false,
			reason: "open-failed",
		};
	}

	persistActiveChatSelection(nextContext);

	return {
		context: nextContext,
		ok: true,
	};
}

async function activateGroupThroughNativeRowTargetFirst(
	context: StChatCatalogContextLike,
	groupId: string,
	chatId: string,
	getContext: () => unknown,
): Promise<
	| { context: StChatCatalogContextLike; ok: true }
	| {
			ok: false;
			reason: "api-unavailable" | "open-failed";
	  }
> {
	if (asTrimmedIdentifier(context.groupId) === groupId) {
		return {
			context,
			ok: true,
		};
	}

	const group = resolveGroup(context, groupId);
	const groupElement = findNativeGroupSelectElement(groupId);
	if (!group || !groupElement) {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	const previousChatId = group.chat_id;
	let activatedGroup = false;

	try {
		group.chat_id = chatId;
		triggerNativeGroupSelectElement(groupElement);

		const activeContext = await waitForContextMatch(
			getContext,
			(nextContext) =>
				asTrimmedIdentifier(nextContext.groupId) === groupId &&
				resolveCurrentChatId(nextContext) === chatId,
		);
		if (!activeContext) {
			return {
				ok: false,
				reason: "open-failed",
			};
		}

		activatedGroup = true;
		return {
			context: activeContext,
			ok: true,
		};
	} catch {
		return {
			ok: false,
			reason: "open-failed",
		};
	} finally {
		if (!activatedGroup) {
			group.chat_id = previousChatId;
		}
	}
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

export function normalizeRecentChatCatalogEntries(
	payload: unknown,
	context = readContextSafe<StChatCatalogContextLike>(),
): ChatCatalogEntry[] {
	if (!Array.isArray(payload) || !context) {
		return [];
	}

	const lookup = buildChatCatalogLookup(context);

	return payload.flatMap((entry) => {
		if (!isRecord(entry)) {
			return [];
		}

		const normalizedEntry = normalizeRecentChatEntry(
			entry as RecentChatLike,
			context,
			lookup,
		);
		return normalizedEntry ? [normalizedEntry] : [];
	});
}

export function filterChatCatalogEntries(
	entries: ChatCatalogEntry[],
	query: string,
): ChatCatalogEntry[] {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	if (!normalizedQuery) {
		return entries;
	}

	return entries.filter((entry) =>
		[
			entry.entityName,
			entry.chatId,
			entry.fileName,
			entry.lastMessagePreview,
		]
			.join(" ")
			.toLocaleLowerCase()
			.includes(normalizedQuery),
	);
}

export function sortChatCatalogEntries(
	entries: ChatCatalogEntry[],
	sortMode: ChatCatalogSortMode,
): ChatCatalogEntry[] {
	return [...entries].sort((left, right) => {
		let result = 0;

		switch (sortMode) {
			case "entity-asc":
				result = left.entityName.localeCompare(right.entityName);
				break;
			case "entity-desc":
				result = right.entityName.localeCompare(left.entityName);
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

export function readChatCatalogCache({
	now = Date.now(),
	storage,
}: ReadCacheOptions = {}): ChatCatalogCacheReadResult | null {
	const resolvedStorage = resolveStorage(storage);
	if (!resolvedStorage) {
		return null;
	}

	const rawPayload = resolvedStorage.getItem(CHAT_CATALOG_CACHE_KEY);
	if (!rawPayload) {
		return null;
	}

	let payload: unknown;
	try {
		payload = JSON.parse(rawPayload);
	} catch {
		resolvedStorage.removeItem(CHAT_CATALOG_CACHE_KEY);
		return null;
	}

	if (
		!isRecord(payload) ||
		payload.version !== 1 ||
		typeof payload.timestamp !== "number" ||
		!Array.isArray(payload.entries)
	) {
		resolvedStorage.removeItem(CHAT_CATALOG_CACHE_KEY);
		return null;
	}

	const entries = payload.entries.filter(isChatCatalogEntry);
	return {
		cacheStatus:
			now - payload.timestamp <= CHAT_CATALOG_CACHE_STALE_MS
				? "fresh"
				: "stale",
		entries,
		timestamp: payload.timestamp,
	};
}

export function writeChatCatalogCache({
	entries,
	now = Date.now(),
	storage,
}: WriteCacheOptions) {
	const resolvedStorage = resolveStorage(storage);
	if (!resolvedStorage) {
		return;
	}

	const payload: CachePayload = {
		entries: entries.map(toCacheableChatCatalogEntry),
		timestamp: now,
		version: 1,
	};

	try {
		resolvedStorage.setItem(
			CHAT_CATALOG_CACHE_KEY,
			JSON.stringify(payload),
		);
	} catch {
		// Storage can be unavailable or quota-limited; the live fetch result remains valid.
	}
}

async function fetchRecentChatCatalogEntries({
	fetchImpl,
}: {
	fetchImpl: FetchLike;
}): Promise<ChatCatalogEntry[]> {
	const context = readContextSafe<StChatCatalogContextLike>();
	let response: Response;

	try {
		response = await fetchImpl("/api/chats/recent", {
			body: JSON.stringify({}),
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

	return normalizeRecentChatCatalogEntries(payload, context);
}

export function createChatCatalogStore({
	fetchImpl = fetch,
	now = Date.now,
	storage,
}: CreateChatCatalogStoreOptions = {}): ChatCatalogStore {
	const listeners = new Set<Listener>();
	const resolvedStorage = resolveStorage(storage);
	const cachedCatalog = readChatCatalogCache({
		now: now(),
		storage: resolvedStorage,
	});
	let disposed = false;
	let requestToken = 0;
	let snapshot: ChatCatalogSnapshot = cachedCatalog
		? {
				cacheStatus: cachedCatalog.cacheStatus,
				entries: markCurrentChatCatalogEntries(cachedCatalog.entries),
				errorMessage: "",
				status:
					cachedCatalog.cacheStatus === "fresh"
						? "ready"
						: "refreshing",
				updatedAt: cachedCatalog.timestamp,
			}
		: createEmptySnapshot();
	let activeEventSource: EventSourceLike | null = null;
	let activeEventListeners: Array<{
		eventName: string;
		listener: Listener;
	}> = [];

	function notifyListeners() {
		for (const listener of listeners) {
			listener();
		}
	}

	function publish(nextSnapshot: ChatCatalogSnapshot) {
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
		const context = readContextSafe<StChatCatalogContextLike>();
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

	async function runRemoteRefresh(activeRequestToken: number) {
		try {
			const entries = await fetchRecentChatCatalogEntries({ fetchImpl });
			if (disposed || activeRequestToken !== requestToken) {
				return;
			}

			const updatedAt = now();
			writeChatCatalogCache({
				entries,
				now: updatedAt,
				storage: resolvedStorage,
			});
			publish({
				cacheStatus: "fresh",
				entries: markCurrentChatCatalogEntries(entries),
				errorMessage: "",
				status: "ready",
				updatedAt,
			});
		} catch {
			if (disposed || activeRequestToken !== requestToken) {
				return;
			}

			publish({
				...snapshot,
				errorMessage: "Failed to load chats.",
				status: "error",
			});
		}
	}

	function refresh() {
		if (disposed) {
			return;
		}

		requestToken += 1;
		const activeRequestToken = requestToken;
		publish({
			...snapshot,
			entries: markCurrentChatCatalogEntries(snapshot.entries),
			errorMessage: "",
			status: snapshot.entries.length > 0 ? "refreshing" : "loading",
		});
		void runRemoteRefresh(activeRequestToken);
	}

	syncEventListeners();

	if (!cachedCatalog || cachedCatalog.cacheStatus === "stale") {
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

export async function exportChatCatalogEntry(
	entry: ChatCatalogEntry,
	format: ChatCatalogExportFormat,
): Promise<ExportChatCatalogResult> {
	const context = readContextSafe<StChatCatalogContextLike>();
	if (!context) {
		return {
			ok: false,
			reason: "context-unavailable",
		};
	}

	const chatId = asTrimmedIdentifier(entry.chatId);
	if (!chatId) {
		return {
			ok: false,
			reason: "invalid-entry",
		};
	}

	const exportFormat: ChatCatalogExportFormat =
		format === "jsonl" ? "jsonl" : "txt";
	const fileName = `${chatId}.${exportFormat}`;
	const payload = {
		avatar_url:
			entry.kind === "group"
				? null
				: resolveCharacterExportAvatar(entry, context),
		exportfilename: fileName,
		file: `${chatId}.jsonl`,
		format: exportFormat,
		is_group: entry.kind === "group",
	};

	let response: Response;
	try {
		response = await fetch("/api/chats/export", {
			body: JSON.stringify(payload),
			headers: resolveExportRequestHeaders(context),
			method: "POST",
		});
	} catch {
		return {
			ok: false,
			reason: "network-error",
		};
	}

	let data: unknown = {};
	try {
		data = await response.json();
	} catch {
		data = {};
	}

	if (!response.ok) {
		return {
			message: isRecord(data) ? asTrimmedString(data.message) : "",
			ok: false,
			reason: "export-failed",
		};
	}

	const content = isRecord(data) ? String(data.result ?? "") : "";
	const mimeType =
		exportFormat === "txt" ? "text/plain" : "application/octet-stream";

	try {
		downloadWithBrowserFallback(content, fileName, mimeType);
	} catch {
		return {
			ok: false,
			reason: "download-failed",
		};
	}

	return {
		fileName,
		ok: true,
	};
}

export async function renameChatCatalogEntry(
	entry: ChatCatalogEntry,
	newFileName: string,
): Promise<RenameChatCatalogResult> {
	const oldName = normalizeChatActionName(entry.chatId);
	const nextName = normalizeChatActionName(newFileName);
	if (!oldName || !nextName || oldName === nextName) {
		return {
			ok: false,
			reason: "invalid-name",
		};
	}

	const entityId = asTrimmedIdentifier(entry.entityId);
	if (!entityId) {
		return {
			ok: false,
			reason: "invalid-entry",
		};
	}

	const characterId =
		entry.kind === "group"
			? undefined
			: typeof entry.characterId === "number"
				? entry.characterId
				: (asNullableInteger(entityId) ?? entityId);

	return defaultUnstableChatCatalogInternals.renameChat({
		characterId,
		entityId,
		kind: entry.kind,
		newName: nextName,
		oldName,
	});
}

export async function deleteChatCatalogEntry(
	entry: ChatCatalogEntry,
): Promise<DeleteChatCatalogResult> {
	const chatId = normalizeChatActionName(entry.chatId);
	const entityId = asTrimmedIdentifier(entry.entityId);
	if (!chatId || !entityId) {
		return {
			ok: false,
			reason: "invalid-entry",
		};
	}

	return defaultUnstableChatCatalogInternals.deleteChat({
		chatId,
		entityId,
		kind: entry.kind,
	});
}

async function openInactiveCharacterChatTargetFirst(
	context: StChatCatalogContextLike,
	characterId: number,
	chatId: string,
	getContext: () => unknown,
): Promise<
	| { context: StChatCatalogContextLike; ok: true }
	| {
			ok: false;
			reason: "api-unavailable" | "open-failed";
	  }
> {
	const character = resolveCharacterById(context, characterId);
	const characterElement = findNativeCharacterSelectElement(characterId);
	if (!character || !characterElement) {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	const previousChatId = character.chat;
	let activatedCharacter = false;

	try {
		character.chat = chatId;
		triggerNativeCharacterSelectElement(characterElement);

		const activeContext = await waitForContextMatch(
			getContext,
			(nextContext) =>
				isActiveCharacterContext(nextContext, characterId),
		);
		if (!activeContext) {
			return {
				ok: false,
				reason: "open-failed",
			};
		}

		activatedCharacter = true;
		return {
			context: activeContext,
			ok: true,
		};
	} catch {
		return {
			ok: false,
			reason: "open-failed",
		};
	} finally {
		if (!activatedCharacter) {
			character.chat = previousChatId;
		}
	}
}

async function activateCharacterThroughPublicApi(
	context: StChatCatalogContextLike,
	characterId: number,
	chatId: string,
	fallbackName: string,
	getContext: () => unknown,
): Promise<
	| { context: StChatCatalogContextLike; ok: true }
	| {
			ok: false;
			reason: "api-unavailable" | "invalid-entry" | "open-failed";
	  }
> {
	if (isActiveCharacterContext(context, characterId)) {
		return {
			context,
			ok: true,
		};
	}

	if (typeof context.executeSlashCommandsWithOptions !== "function") {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	const character = resolveCharacterById(context, characterId);
	if (!character) {
		return {
			ok: false,
			reason: "invalid-entry",
		};
	}

	const activationKey =
		asTrimmedString(character.avatar) ||
		asTrimmedString(character.avatar_url) ||
		asTrimmedString(character.name) ||
		fallbackName.trim();
	if (!activationKey) {
		return {
			ok: false,
			reason: "invalid-entry",
		};
	}

	const previousChatId = character.chat;
	let activatedCharacter = false;

	try {
		character.chat = chatId;
		const result = await context.executeSlashCommandsWithOptions(
			`/go ${quoteSlashCommandArgument(activationKey)}`,
			{
				handleExecutionErrors: false,
				handleParserErrors: false,
				source: "astra-projecta",
			},
		);

		if (slashResultFailed(result)) {
			return {
				ok: false,
				reason: "open-failed",
			};
		}

		const activeContext = await waitForContextMatch(
			getContext,
			(nextContext) =>
				isActiveCharacterContext(nextContext, characterId),
		);
		if (!activeContext) {
			return {
				ok: false,
				reason: "open-failed",
			};
		}

		activatedCharacter = true;
		persistActiveChatSelection(activeContext);

		return {
			context: activeContext,
			ok: true,
		};
	} catch {
		return {
			ok: false,
			reason: "open-failed",
		};
	} finally {
		if (!activatedCharacter) {
			character.chat = previousChatId;
		}
	}
}

async function openCharacterChatInActiveContext(
	activeContext: StChatCatalogContextLike,
	characterId: number,
	chatId: string,
	getContext: () => unknown,
): Promise<OpenChatCatalogResult> {
	if (resolveCurrentChatId(activeContext) === chatId) {
		persistActiveChatSelection(activeContext);
		return {
			ok: true,
		};
	}

	if (typeof activeContext.openCharacterChat !== "function") {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	try {
		await activeContext.openCharacterChat(chatId);
	} catch {
		return {
			ok: false,
			reason: "open-failed",
		};
	}

	const verifiedContext =
		(await waitForContextMatch(getContext, (nextContext) =>
			isActiveCharacterChatContext(nextContext, characterId, chatId),
		)) ?? readContextSafe<StChatCatalogContextLike>(getContext);

	if (
		!verifiedContext ||
		!isActiveCharacterChatContext(verifiedContext, characterId, chatId)
	) {
		return {
			ok: false,
			reason: "open-failed",
		};
	}

	persistActiveChatSelection(verifiedContext);
	return {
		ok: true,
	};
}

export async function openChatCatalogEntry(
	entry: ChatCatalogEntry,
): Promise<OpenChatCatalogResult> {
	const context = readContextSafe<StChatCatalogContextLike>();
	if (!context) {
		return {
			ok: false,
			reason: "context-unavailable",
		};
	}

	const currentChatId = resolveCurrentChatId(context);

	if (entry.kind === "group") {
		const groupId = asTrimmedIdentifier(entry.entityId);
		if (!groupId || !entry.chatId) {
			return {
				ok: false,
				reason: "invalid-entry",
			};
		}

		const isTargetGroupActive =
			asTrimmedIdentifier(context.groupId) === groupId;
		if (isTargetGroupActive && currentChatId === entry.chatId) {
			return {
				alreadyCurrent: true,
				ok: true,
			};
		}

		let activeGroupResult:
			| { context: StChatCatalogContextLike; ok: true }
			| {
					ok: false;
					reason:
						| "ambiguous-group"
						| "api-unavailable"
						| "invalid-entry"
						| "open-failed";
			  } = isTargetGroupActive
			? ({
					context,
					ok: true,
				} as const)
			: await activateGroupThroughNativeRowTargetFirst(
					context,
					groupId,
					entry.chatId,
					getStContext,
				);
		if (!activeGroupResult.ok) {
			const fallbackGroupResult = await activateGroupThroughPublicApi(
				context,
				groupId,
				entry.entityName,
				getStContext,
			);
			activeGroupResult = fallbackGroupResult.ok
				? fallbackGroupResult
				: activeGroupResult.reason === "open-failed"
					? activeGroupResult
					: fallbackGroupResult;
		}
		if (!activeGroupResult.ok) {
			return {
				ok: false,
				reason: activeGroupResult.reason,
			};
		}

		const activeContext = activeGroupResult.context;
		if (resolveCurrentChatId(activeContext) === entry.chatId) {
			return {
				ok: true,
			};
		}

		if (typeof activeContext.openGroupChat !== "function") {
			return {
				ok: false,
				reason: "api-unavailable",
			};
		}

		try {
			await activeContext.openGroupChat(groupId, entry.chatId);
			return {
				ok: true,
			};
		} catch {
			return {
				ok: false,
				reason: "open-failed",
			};
		}
	}

	const characterId =
		typeof entry.characterId === "number"
			? entry.characterId
			: asNullableInteger(entry.entityId);
	if (characterId === null || !entry.chatId) {
		return {
			ok: false,
			reason: "invalid-entry",
		};
	}

	const isTargetCharacterActive = isActiveCharacterContext(
		context,
		characterId,
	);

	if (isTargetCharacterActive && currentChatId === entry.chatId) {
		return {
			alreadyCurrent: true,
			ok: true,
		};
	}

	if (!isTargetCharacterActive) {
		let activeCharacterResult:
			| { context: StChatCatalogContextLike; ok: true }
			| {
					ok: false;
					reason:
						| "api-unavailable"
						| "invalid-entry"
						| "open-failed";
			  } = await openInactiveCharacterChatTargetFirst(
			context,
			characterId,
			entry.chatId,
			getStContext,
		);

		if (!activeCharacterResult.ok) {
			const fallbackCharacterResult =
				await activateCharacterThroughPublicApi(
					context,
					characterId,
					entry.chatId,
					entry.entityName,
					getStContext,
				);
			activeCharacterResult = fallbackCharacterResult.ok
				? fallbackCharacterResult
				: activeCharacterResult.reason === "open-failed"
					? activeCharacterResult
					: fallbackCharacterResult;
		}

		if (!activeCharacterResult.ok) {
			return {
				ok: false,
				reason: activeCharacterResult.reason,
			};
		}

		return openCharacterChatInActiveContext(
			activeCharacterResult.context,
			characterId,
			entry.chatId,
			getStContext,
		);
	}

	try {
		if (typeof context.openCharacterChat !== "function") {
			return {
				ok: false,
				reason: "api-unavailable",
			};
		}

		await context.openCharacterChat(entry.chatId);
		return {
			ok: true,
		};
	} catch {
		return {
			ok: false,
			reason: "open-failed",
		};
	}
}
