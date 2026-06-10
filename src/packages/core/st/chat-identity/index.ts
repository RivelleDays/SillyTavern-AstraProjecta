import {
	getFallbackChatAvatarUrl,
	resolveCharacterChatAvatar,
	resolveGroupChatAvatar,
	type ChatAvatarCharacterLike,
	type ChatAvatarContextLike,
	type ChatAvatarGroupLike,
	type ChatAvatarSource,
} from "@/packages/core/st/chat-avatar";
import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	queueMicrotaskSafe,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type Listener = () => void;

type CharacterLike = ChatAvatarCharacterLike & {
	chat?: unknown;
	name?: unknown;
};

type GroupLike = ChatAvatarGroupLike & {
	chat_id?: unknown;
	id?: unknown;
	name?: unknown;
};

type StContextLike = ChatAvatarContextLike & {
	characterId?: unknown;
	chatId?: unknown;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	getCurrentChatId?: () => unknown;
	groupId?: unknown;
	groups?: unknown;
	name2?: unknown;
};

type EventListener = (...args: unknown[]) => void;

type ResolvedChatIdentityState = {
	groupMemberAvatarIds: string[];
	snapshot: CurrentChatIdentitySnapshot;
};

export type CurrentChatIdentityKind = "character" | "group" | "none";

export type CurrentChatIdentityAvatarSource = ChatAvatarSource;

export interface CurrentChatIdentitySnapshot {
	avatarSource: CurrentChatIdentityAvatarSource;
	characterId: number | null;
	chatFileName: string;
	entityName: string;
	groupAvatarUrls: string[];
	groupId: string | null;
	hasActiveChat: boolean;
	kind: CurrentChatIdentityKind;
	thumbnailUrl: string;
	updatedAt: number;
}

export interface CurrentChatIdentityStore {
	dispose(): void;
	getSnapshot(): CurrentChatIdentitySnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

function asTrimmedString(value: unknown): string {
	if (typeof value !== "string") {
		return "";
	}

	return value.trim();
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
		const direct = characters[String(characterId)];
		if (isRecord(direct)) {
			return direct as CharacterLike;
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
			(group) => isRecord(group) && asTrimmedString(group.id) === groupId,
		);
		return isRecord(match) ? (match as GroupLike) : null;
	}

	if (isRecord(groups)) {
		const direct = groups[groupId];
		if (isRecord(direct)) {
			return direct as GroupLike;
		}

		for (const candidate of Object.values(groups)) {
			if (
				isRecord(candidate) &&
				asTrimmedString(candidate.id) === groupId
			) {
				return candidate as GroupLike;
			}
		}
	}

	return null;
}

function resolveChatFileName(
	context: StContextLike | null,
	character: CharacterLike | null,
	group: GroupLike | null,
): string {
	const contextChatId = asTrimmedString(context?.chatId);
	if (contextChatId) {
		return contextChatId;
	}

	if (context && typeof context.getCurrentChatId === "function") {
		try {
			const currentChatId = asTrimmedString(context.getCurrentChatId());
			if (currentChatId) {
				return currentChatId;
			}
		} catch {
			// Fall through to entity-backed chat file names.
		}
	}

	const characterChat = asTrimmedString(character?.chat);
	if (characterChat) {
		return characterChat;
	}

	return asTrimmedString(group?.chat_id);
}

function resolveEntityName(
	context: StContextLike | null,
	character: CharacterLike | null,
	group: GroupLike | null,
	groupId: string | null,
): string {
	const resolvedName =
		asTrimmedString(group?.name) || asTrimmedString(character?.name);
	if (resolvedName) {
		return resolvedName;
	}

	const contextName = asTrimmedString(context?.name2);
	if (contextName) {
		return contextName;
	}

	return groupId ?? "";
}

function createEmptySnapshot(): CurrentChatIdentitySnapshot {
	return {
		avatarSource: "fallback",
		characterId: null,
		chatFileName: "",
		entityName: "",
		groupAvatarUrls: [],
		groupId: null,
		hasActiveChat: false,
		kind: "none",
		thumbnailUrl: getFallbackChatAvatarUrl(),
		updatedAt: Date.now(),
	};
}

function resolveCurrentChatIdentityState({
	avatarRevision = 0,
}: {
	avatarRevision?: number;
	compositeSize?: number;
	documentRef?: Document;
} = {}): ResolvedChatIdentityState {
	const context = resolveContextSafe();
	const groupId = asTrimmedString(context?.groupId) || null;
	const characterId = asNullableInteger(context?.characterId);
	const group = context && groupId ? resolveGroup(context, groupId) : null;
	const character =
		context && group == null && characterId != null
			? resolveCharacter(context, characterId)
			: null;
	const chatFileName = resolveChatFileName(context, character, group);

	if (!chatFileName) {
		return {
			groupMemberAvatarIds: [],
			snapshot: createEmptySnapshot(),
		};
	}

	const entityName = resolveEntityName(context, character, group, groupId);

	if (group && groupId) {
		const groupAvatar = resolveGroupChatAvatar(context, group, {
			avatarRevision,
		});
		return {
			groupMemberAvatarIds: groupAvatar.groupMemberAvatarIds,
			snapshot: {
				avatarSource: groupAvatar.avatarSource,
				characterId: null,
				chatFileName,
				entityName,
				groupAvatarUrls: groupAvatar.groupAvatarUrls,
				groupId,
				hasActiveChat: true,
				kind: "group",
				thumbnailUrl: groupAvatar.avatarUrl,
				updatedAt: Date.now(),
			},
		};
	}

	if (character && characterId != null) {
		const characterAvatar = resolveCharacterChatAvatar(context, character, {
			avatarRevision,
		});
		return {
			groupMemberAvatarIds: [],
			snapshot: {
				avatarSource: characterAvatar.avatarSource,
				characterId,
				chatFileName,
				entityName,
				groupAvatarUrls: [],
				groupId: null,
				hasActiveChat: true,
				kind: "character",
				thumbnailUrl: characterAvatar.avatarUrl,
				updatedAt: Date.now(),
			},
		};
	}

	return {
		groupMemberAvatarIds: [],
		snapshot: {
			avatarSource: "fallback",
			characterId: null,
			chatFileName,
			entityName,
			groupAvatarUrls: [],
			groupId: null,
			hasActiveChat: true,
			kind: "none",
			thumbnailUrl: getFallbackChatAvatarUrl(),
			updatedAt: Date.now(),
		},
	};
}

function stringArraysEqual(left: string[], right: string[]): boolean {
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}

function snapshotsEqual(
	left: CurrentChatIdentitySnapshot,
	right: CurrentChatIdentitySnapshot,
): boolean {
	return (
		left.avatarSource === right.avatarSource &&
		left.characterId === right.characterId &&
		left.chatFileName === right.chatFileName &&
		left.entityName === right.entityName &&
		stringArraysEqual(left.groupAvatarUrls, right.groupAvatarUrls) &&
		left.groupId === right.groupId &&
		left.hasActiveChat === right.hasActiveChat &&
		left.kind === right.kind &&
		left.thumbnailUrl === right.thumbnailUrl
	);
}

function snapshotsShareGroupChat(
	left: CurrentChatIdentitySnapshot,
	right: CurrentChatIdentitySnapshot,
): boolean {
	return (
		left.kind === "group" &&
		right.kind === "group" &&
		left.groupId === right.groupId &&
		left.chatFileName === right.chatFileName
	);
}

function resolveCharacterEditPayload(args: unknown[]): {
	avatarId: string;
	characterId: number | null;
	hasIdentity: boolean;
} {
	const eventPayload = args.find(isRecord) ?? null;
	const detail = isRecord(eventPayload?.detail)
		? eventPayload.detail
		: eventPayload;
	if (!isRecord(detail)) {
		return {
			avatarId: "",
			characterId: null,
			hasIdentity: false,
		};
	}

	const character = isRecord(detail.character) ? detail.character : detail;
	const characterId = asNullableInteger(
		detail.id ?? detail.characterId ?? detail.chid,
	);
	const avatarId =
		asTrimmedString(character.avatar) ||
		asTrimmedString(character.avatar_url);

	return {
		avatarId,
		characterId,
		hasIdentity: characterId != null || Boolean(avatarId),
	};
}

function resolveCharacterAvatarId(
	context: StContextLike | null,
	characterId: number,
): string {
	if (!context) {
		return "";
	}

	const character = resolveCharacter(context, characterId);
	return (
		asTrimmedString(character?.avatar) ||
		asTrimmedString(character?.avatar_url)
	);
}

export function readCurrentChatIdentitySnapshot({
	compositeSize: _compositeSize,
	documentRef: _documentRef = document,
}: {
	compositeSize?: number;
	documentRef?: Document;
} = {}): CurrentChatIdentitySnapshot {
	return resolveCurrentChatIdentityState({
		avatarRevision: 0,
	}).snapshot;
}

export function createCurrentChatIdentityStore({
	compositeSize: _compositeSize,
	documentRef: _documentRef = document,
}: {
	compositeSize?: number;
	documentRef?: Document;
} = {}): CurrentChatIdentityStore {
	const initialContext = resolveContextSafe();
	const eventSource = isRecord(initialContext?.eventSource)
		? (initialContext.eventSource as EventSourceLike)
		: null;
	const eventTypes = initialContext ? resolveEventTypes(initialContext) : {};
	const listeners = new Set<Listener>();

	let avatarRevision = 0;
	let currentState = resolveCurrentChatIdentityState({
		avatarRevision,
	});
	let snapshot = currentState.snapshot;
	let disposed = false;
	let isRefreshQueued = false;
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

		const nextState = resolveCurrentChatIdentityState({
			avatarRevision,
		});

		currentState = nextState;
		if (!snapshotsEqual(snapshot, nextState.snapshot)) {
			snapshot = nextState.snapshot;
			notifyListeners();
		}
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

	function getActiveGroupMemberAvatarIds(): Set<string> {
		const memberAvatarIds = new Set(currentState.groupMemberAvatarIds);
		const latestState = resolveCurrentChatIdentityState({
			avatarRevision,
		});

		if (snapshotsShareGroupChat(snapshot, latestState.snapshot)) {
			for (const avatarId of latestState.groupMemberAvatarIds) {
				memberAvatarIds.add(avatarId);
			}
		}

		return memberAvatarIds;
	}

	function shouldRefreshAvatarRevisionForCharacterEdit(
		args: unknown[],
	): boolean {
		if (snapshot.kind !== "character" && snapshot.kind !== "group") {
			return false;
		}

		const editPayload = resolveCharacterEditPayload(args);
		if (!editPayload.hasIdentity) {
			return true;
		}

		if (snapshot.kind === "character") {
			if (editPayload.characterId != null) {
				return editPayload.characterId === snapshot.characterId;
			}

			return true;
		}

		const activeGroupMemberAvatarIds = getActiveGroupMemberAvatarIds();
		if (editPayload.avatarId) {
			return activeGroupMemberAvatarIds.has(editPayload.avatarId);
		}

		if (editPayload.characterId != null) {
			const characterAvatarId = resolveCharacterAvatarId(
				resolveContextSafe(),
				editPayload.characterId,
			);
			return characterAvatarId
				? activeGroupMemberAvatarIds.has(characterAvatarId)
				: true;
		}

		return true;
	}

	function scheduleCharacterAvatarRevisionRefresh(...args: unknown[]) {
		if (!shouldRefreshAvatarRevisionForCharacterEdit(args)) {
			return;
		}

		avatarRevision += 1;
		scheduleRefresh();
	}

	function scheduleGroupAvatarRevisionRefresh() {
		if (snapshot.kind !== "group") {
			return;
		}

		avatarRevision += 1;
		scheduleRefresh();
	}

	if (eventSource) {
		const refreshEventNameCandidates = [
			eventTypes.APP_READY,
			eventTypes.CHAT_CHANGED,
			eventTypes.CHAT_DELETED,
			eventTypes.CHAT_LOADED,
			eventTypes.CHAT_RENAMED,
			eventTypes.CHARACTER_RENAMED,
			eventTypes.GROUP_CHAT_CREATED,
			eventTypes.GROUP_CHAT_DELETED,
			eventTypes.SETTINGS_UPDATED,
		];
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
			bindEventListener(eventName, scheduleRefresh);
		}

		bindEventListener(
			eventTypes.CHARACTER_EDITED,
			scheduleCharacterAvatarRevisionRefresh,
		);
		bindEventListener(
			eventTypes.GROUP_UPDATED,
			scheduleGroupAvatarRevisionRefresh,
		);
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
