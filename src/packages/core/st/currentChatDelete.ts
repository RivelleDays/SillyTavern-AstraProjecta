import { getStContext } from "@/packages/core/st/context";
import { normalizeChatFileName } from "@/packages/core/st/currentChatRename";
import {
	asTrimmedIdentifier,
	asTrimmedString,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";
import { parseStTimestampToMs } from "@/packages/core/st/timestamps";

type FetchLike = typeof fetch;

type StDeleteContextLike = Record<string, unknown> & {
	characterId?: unknown;
	characters?: unknown;
	chatId?: unknown;
	eventSource?: unknown;
	eventTypes?: unknown;
	event_types?: unknown;
	getCurrentChatId?: () => unknown;
	getRequestHeaders?: () => unknown;
	groupId?: unknown;
	groups?: unknown;
	openCharacterChat?: unknown;
	openGroupChat?: unknown;
};

type CharacterLike = Record<string, unknown> & {
	avatar?: unknown;
	avatar_url?: unknown;
	chat?: unknown;
	name?: unknown;
};

type GroupLike = Record<string, unknown> & {
	chat_id?: unknown;
	chats?: unknown;
	id?: unknown;
};

type CharacterChatDescriptor = Record<string, unknown> & {
	file_name?: unknown;
	last_mes?: unknown;
};

type DeleteContextHeaders = Record<string, string>;

export interface DeleteCurrentChatInput {
	expectedFileName: string;
	fetchImpl?: FetchLike;
}

export type DeleteCurrentChatScope = "character" | "group";

export type DeleteCurrentChatResult =
	| {
			deletedFileName: string;
			ok: true;
			replacementFileName: string;
			scope: DeleteCurrentChatScope;
	  }
	| {
			ok: false;
			reason:
				| "api-unavailable"
				| "no-active-chat"
				| "chat-changed"
				| "delete-failed"
				| "invalid-payload"
				| "replacement-failed";
	  };

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

function createHumanizedChatId(timestamp = Date.now()): string {
	const date = new Date(timestamp);
	const year = String(date.getFullYear()).padStart(4, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");
	const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

	return `${year}-${month}-${day}@${hours}h${minutes}m${seconds}s${milliseconds}ms`;
}

function resolveContextSafe(): StDeleteContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context) ? (context as StDeleteContextLike) : null;
	} catch {
		return null;
	}
}

function resolveCharacter(
	context: StDeleteContextLike,
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
	context: StDeleteContextLike,
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

function resolveActiveChatId(
	context: StDeleteContextLike,
	character: CharacterLike | null,
	group: GroupLike | null,
): string {
	const contextChatId = normalizeChatFileName(
		asTrimmedString(context.chatId),
	);
	if (contextChatId) {
		return contextChatId;
	}

	if (typeof context.getCurrentChatId === "function") {
		try {
			const currentChatId = normalizeChatFileName(
				asTrimmedString(context.getCurrentChatId()),
			);
			if (currentChatId) {
				return currentChatId;
			}
		} catch {
			// Fall back to entity-backed chat identifiers.
		}
	}

	const characterChatId = normalizeChatFileName(
		asTrimmedString(character?.chat),
	);
	if (characterChatId) {
		return characterChatId;
	}

	return normalizeChatFileName(asTrimmedString(group?.chat_id));
}

function resolveCharacterAvatar(character: CharacterLike | null): string {
	const avatar = asTrimmedString(character?.avatar);
	if (avatar) {
		return avatar;
	}

	return asTrimmedString(character?.avatar_url);
}

function resolveJsonHeaders(
	context: StDeleteContextLike,
): DeleteContextHeaders | null {
	if (typeof context.getRequestHeaders !== "function") {
		return null;
	}

	let rawHeaders: unknown;
	try {
		rawHeaders = context.getRequestHeaders();
	} catch {
		return null;
	}

	const headers: DeleteContextHeaders = {
		"Content-Type": "application/json",
	};

	if (typeof Headers !== "undefined" && rawHeaders instanceof Headers) {
		rawHeaders.forEach((value, key) => {
			headers[key] = value;
		});
		return headers;
	}

	if (Array.isArray(rawHeaders)) {
		for (const entry of rawHeaders) {
			if (!Array.isArray(entry) || entry.length < 2) {
				continue;
			}

			const [key, value] = entry;
			if (typeof key === "string" && typeof value === "string") {
				headers[key] = value;
			}
		}
		return headers;
	}

	if (!isRecord(rawHeaders)) {
		return null;
	}

	for (const [key, value] of Object.entries(rawHeaders)) {
		if (typeof value === "string") {
			headers[key] = value;
		}
	}

	return headers;
}

function isCharacterChatDescriptor(
	value: unknown,
): value is CharacterChatDescriptor {
	return isRecord(value) && typeof value.file_name === "string";
}

function resolveCharacterChatsPayload(
	value: unknown,
): CharacterChatDescriptor[] | null {
	if (Array.isArray(value)) {
		return value.filter(isCharacterChatDescriptor);
	}

	if (isRecord(value)) {
		return Object.values(value).filter(isCharacterChatDescriptor);
	}

	return null;
}

async function emitDeletionEvent(
	context: StDeleteContextLike,
	scope: DeleteCurrentChatScope,
	deletedFileName: string,
) {
	if (
		!isRecord(context.eventSource) ||
		typeof context.eventSource.emit !== "function"
	) {
		return;
	}

	const eventTypes = resolveEventTypes(context);
	const eventName =
		scope === "group"
			? (eventTypes.GROUP_CHAT_DELETED ?? "group_chat_deleted")
			: (eventTypes.CHAT_DELETED ?? "chat_deleted");

	try {
		await context.eventSource.emit(eventName, deletedFileName);
	} catch {
		// Keep deletion successful even if event fan-out fails.
	}
}

async function deleteCharacterChat({
	activeChatId,
	character,
	context,
	fetchImpl,
	headers,
}: {
	activeChatId: string;
	character: CharacterLike;
	context: StDeleteContextLike;
	fetchImpl: FetchLike;
	headers: DeleteContextHeaders;
}): Promise<DeleteCurrentChatResult> {
	const avatarUrl = resolveCharacterAvatar(character);
	if (!avatarUrl || typeof context.openCharacterChat !== "function") {
		return {
			ok: false,
			reason: !avatarUrl ? "invalid-payload" : "api-unavailable",
		};
	}

	try {
		const response = await fetchImpl("/api/chats/delete", {
			body: JSON.stringify({
				avatar_url: avatarUrl,
				chatfile: `${activeChatId}.jsonl`,
			}),
			headers,
			method: "POST",
		});

		if (!response.ok) {
			return {
				ok: false,
				reason: "delete-failed",
			};
		}
	} catch {
		return {
			ok: false,
			reason: "delete-failed",
		};
	}

	let replacementFileName = createHumanizedChatId();

	try {
		const chatsResponse = await fetchImpl("/api/characters/chats", {
			body: JSON.stringify({
				avatar_url: avatarUrl,
			}),
			headers,
			method: "POST",
		});

		if (!chatsResponse.ok) {
			return {
				ok: false,
				reason: "replacement-failed",
			};
		}

		const chatsPayload = resolveCharacterChatsPayload(
			await chatsResponse.json(),
		);
		if (chatsPayload === null) {
			return {
				ok: false,
				reason: "invalid-payload",
			};
		}

		const remainingChats = chatsPayload
			.map((chat) => ({
				fileName: normalizeChatFileName(
					asTrimmedString(chat.file_name),
				),
				lastMessageAt: parseStTimestampToMs(chat.last_mes) ?? -1,
			}))
			.filter((chat) => chat.fileName && chat.fileName !== activeChatId)
			.sort((left, right) => right.lastMessageAt - left.lastMessageAt);

		if (remainingChats.length > 0) {
			replacementFileName = remainingChats[0].fileName;
		}
	} catch {
		return {
			ok: false,
			reason: "replacement-failed",
		};
	}

	try {
		await context.openCharacterChat(replacementFileName);
	} catch {
		return {
			ok: false,
			reason: "replacement-failed",
		};
	}

	await emitDeletionEvent(context, "character", activeChatId);

	return {
		deletedFileName: activeChatId,
		ok: true,
		replacementFileName,
		scope: "character",
	};
}

async function deleteGroupChat({
	activeChatId,
	context,
	fetchImpl,
	group,
	groupId,
	headers,
}: {
	activeChatId: string;
	context: StDeleteContextLike;
	fetchImpl: FetchLike;
	group: GroupLike;
	groupId: string;
	headers: DeleteContextHeaders;
}): Promise<DeleteCurrentChatResult> {
	if (typeof context.openGroupChat !== "function") {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	if (!Array.isArray(group.chats)) {
		return {
			ok: false,
			reason: "invalid-payload",
		};
	}

	const remainingChats = group.chats
		.map((chat) => normalizeChatFileName(asTrimmedString(chat)))
		.filter((chatId) => chatId && chatId !== activeChatId);

	try {
		const response = await fetchImpl("/api/chats/group/delete", {
			body: JSON.stringify({
				id: activeChatId,
			}),
			headers,
			method: "POST",
		});

		if (!response.ok) {
			return {
				ok: false,
				reason: "delete-failed",
			};
		}
	} catch {
		return {
			ok: false,
			reason: "delete-failed",
		};
	}

	let replacementFileName = remainingChats.at(-1) ?? createHumanizedChatId();

	if (remainingChats.length > 0) {
		group.chats = [...remainingChats];
		group.chat_id = replacementFileName;
	} else {
		const nextGroupPayload = {
			...group,
			chat_id: replacementFileName,
			chats: [replacementFileName],
		};

		try {
			const saveResponse = await fetchImpl("/api/groups/edit", {
				body: JSON.stringify(nextGroupPayload),
				headers,
				method: "POST",
			});

			if (!saveResponse.ok) {
				return {
					ok: false,
					reason: "replacement-failed",
				};
			}
		} catch {
			return {
				ok: false,
				reason: "replacement-failed",
			};
		}

		group.chats = [replacementFileName];
		group.chat_id = replacementFileName;
	}

	try {
		await context.openGroupChat(groupId, replacementFileName);
	} catch {
		return {
			ok: false,
			reason: "replacement-failed",
		};
	}

	await emitDeletionEvent(context, "group", activeChatId);

	return {
		deletedFileName: activeChatId,
		ok: true,
		replacementFileName,
		scope: "group",
	};
}

export async function deleteCurrentChat({
	expectedFileName,
	fetchImpl = fetch,
}: DeleteCurrentChatInput): Promise<DeleteCurrentChatResult> {
	const context = resolveContextSafe();
	if (!context) {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	const normalizedExpectedFileName = normalizeChatFileName(expectedFileName);
	if (!normalizedExpectedFileName) {
		return {
			ok: false,
			reason: "no-active-chat",
		};
	}

	const headers = resolveJsonHeaders(context);
	if (!headers) {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	const groupId = asTrimmedIdentifier(context.groupId);
	if (groupId) {
		const group = resolveGroup(context, groupId);
		if (!group) {
			return {
				ok: false,
				reason: "no-active-chat",
			};
		}

		const activeChatId = resolveActiveChatId(context, null, group);
		if (!activeChatId) {
			return {
				ok: false,
				reason: "no-active-chat",
			};
		}

		if (activeChatId !== normalizedExpectedFileName) {
			return {
				ok: false,
				reason: "chat-changed",
			};
		}

		return deleteGroupChat({
			activeChatId,
			context,
			fetchImpl,
			group,
			groupId,
			headers,
		});
	}

	const characterId = asNullableInteger(context.characterId);
	if (characterId === null) {
		return {
			ok: false,
			reason: "no-active-chat",
		};
	}

	const character = resolveCharacter(context, characterId);
	if (!character) {
		return {
			ok: false,
			reason: "no-active-chat",
		};
	}

	const activeChatId = resolveActiveChatId(context, character, null);
	if (!activeChatId) {
		return {
			ok: false,
			reason: "no-active-chat",
		};
	}

	if (activeChatId !== normalizedExpectedFileName) {
		return {
			ok: false,
			reason: "chat-changed",
		};
	}

	return deleteCharacterChat({
		activeChatId,
		character,
		context,
		fetchImpl,
		headers,
	});
}
