import { isRecord } from "@/packages/core/st/shared";

export type ChatAvatarCharacterLike = Record<string, unknown> & {
	avatar?: unknown;
	avatar_url?: unknown;
};

export type ChatAvatarGroupLike = Record<string, unknown> & {
	avatar_url?: unknown;
	disabled_members?: unknown;
	members?: unknown;
};

export type ChatAvatarContextLike = Record<string, unknown> & {
	characters?: unknown;
	getThumbnailUrl?: (type: string, fileName: string) => unknown;
};

export type ChatAvatarSource =
	| "character-thumbnail"
	| "character-avatar-url"
	| "group-custom-avatar"
	| "group-member-thumbnail"
	| "fallback";

export interface ResolvedChatAvatar {
	avatarSource: ChatAvatarSource;
	avatarUrl: string;
	groupAvatarUrls: string[];
	groupMemberAvatarIds: string[];
}

export interface ResolveGroupChatAvatarOptions {
	avatarRevision?: number;
	excludeDisabledMembers?: boolean;
	resolveCharacterByAvatarId?: (
		avatarId: string,
	) => ChatAvatarCharacterLike | null;
}

export interface ResolveCharacterChatAvatarOptions {
	avatarRevision?: number;
}

const DEFAULT_CHAT_AVATAR = "/img/five.png";
const AVATAR_REVISION_QUERY_PARAM = "astra_avatar_revision";
const GROUP_DEFAULT_AVATAR_PATTERNS = [
	/^\/?img\/ai\d+\.png$/i,
	/^\/?img\/five\.png$/i,
] as const;
const MAX_GROUP_AVATAR_URLS = 4;

function asTrimmedString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

export function normalizeImageUrl(value: unknown): string {
	const trimmed = asTrimmedString(value);
	if (!trimmed) {
		return "";
	}

	if (
		trimmed.startsWith("data:") ||
		trimmed.startsWith("blob:") ||
		/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
	) {
		return trimmed;
	}

	if (trimmed.startsWith("//")) {
		const protocol =
			typeof window !== "undefined" && window.location?.protocol
				? window.location.protocol
				: "https:";
		return `${protocol}${trimmed}`;
	}

	if (trimmed.startsWith("/")) {
		return trimmed;
	}

	return `/${trimmed}`;
}

export function appendAvatarRevision(
	url: string,
	avatarRevision: number,
): string {
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

export function getFallbackChatAvatarUrl(): string {
	const globalScope = globalThis as typeof globalThis & {
		default_avatar?: unknown;
	};

	return normalizeImageUrl(globalScope.default_avatar) || DEFAULT_CHAT_AVATAR;
}

export function resolveThumbnailUrl(
	context: ChatAvatarContextLike | null,
	type: string,
	fileName: string,
	avatarRevision = 0,
): string {
	if (!type || !fileName) {
		return "";
	}

	if (context && typeof context.getThumbnailUrl === "function") {
		try {
			const thumbnailUrl = normalizeImageUrl(
				context.getThumbnailUrl(type, fileName),
			);
			if (thumbnailUrl) {
				return appendAvatarRevision(thumbnailUrl, avatarRevision);
			}
		} catch {
			// Fall through to the deterministic thumbnail route.
		}
	}

	return appendAvatarRevision(
		`/thumbnail?type=${type}&file=${encodeURIComponent(fileName)}`,
		avatarRevision,
	);
}

function isCustomGroupAvatarUrl(url: string): boolean {
	if (!url) {
		return false;
	}

	const normalizedUrl = url.toLowerCase();
	if (normalizedUrl === getFallbackChatAvatarUrl().toLowerCase()) {
		return false;
	}

	if (
		GROUP_DEFAULT_AVATAR_PATTERNS.some((pattern) =>
			pattern.test(normalizedUrl),
		)
	) {
		return false;
	}

	return (
		normalizedUrl.startsWith("data:") ||
		normalizedUrl.startsWith("blob:") ||
		/^[a-z][a-z0-9+.-]*:\/\//i.test(normalizedUrl) ||
		normalizedUrl.startsWith("/user/") ||
		normalizedUrl.startsWith("user/") ||
		normalizedUrl.startsWith("/groups/") ||
		normalizedUrl.startsWith("groups/")
	);
}

function resolveCharacterByAvatarId(
	context: ChatAvatarContextLike | null,
	avatarId: string,
): ChatAvatarCharacterLike | null {
	if (!context || !avatarId) {
		return null;
	}

	const characters = context.characters;
	if (Array.isArray(characters)) {
		const match = characters.find(
			(candidate) =>
				isRecord(candidate) &&
				(asTrimmedString(
					(candidate as ChatAvatarCharacterLike).avatar,
				) === avatarId ||
					asTrimmedString(
						(candidate as ChatAvatarCharacterLike).avatar_url,
					) === avatarId),
		);
		return isRecord(match) ? (match as ChatAvatarCharacterLike) : null;
	}

	if (isRecord(characters)) {
		for (const candidate of Object.values(characters)) {
			if (
				isRecord(candidate) &&
				(asTrimmedString(
					(candidate as ChatAvatarCharacterLike).avatar,
				) === avatarId ||
					asTrimmedString(
						(candidate as ChatAvatarCharacterLike).avatar_url,
					) === avatarId)
			) {
				return candidate as ChatAvatarCharacterLike;
			}
		}
	}

	return null;
}

export function resolveCharacterChatAvatar(
	context: ChatAvatarContextLike | null,
	character: ChatAvatarCharacterLike,
	{ avatarRevision = 0 }: ResolveCharacterChatAvatarOptions = {},
): ResolvedChatAvatar {
	const avatarFileId = asTrimmedString(character.avatar);
	if (avatarFileId && avatarFileId !== "none") {
		const thumbnailUrl = resolveThumbnailUrl(
			context,
			"avatar",
			avatarFileId,
			avatarRevision,
		);
		if (thumbnailUrl) {
			return {
				avatarSource: "character-thumbnail",
				avatarUrl: thumbnailUrl,
				groupAvatarUrls: [],
				groupMemberAvatarIds: [],
			};
		}
	}

	const avatarUrl = normalizeImageUrl(character.avatar_url);
	if (avatarUrl) {
		return {
			avatarSource: "character-avatar-url",
			avatarUrl: appendAvatarRevision(avatarUrl, avatarRevision),
			groupAvatarUrls: [],
			groupMemberAvatarIds: [],
		};
	}

	return {
		avatarSource: "fallback",
		avatarUrl: getFallbackChatAvatarUrl(),
		groupAvatarUrls: [],
		groupMemberAvatarIds: [],
	};
}

export function resolveGroupChatAvatar(
	context: ChatAvatarContextLike | null,
	group: ChatAvatarGroupLike,
	{
		avatarRevision = 0,
		excludeDisabledMembers = false,
		resolveCharacterByAvatarId: resolveCharacter = (avatarId: string) =>
			resolveCharacterByAvatarId(context, avatarId),
	}: ResolveGroupChatAvatarOptions = {},
): ResolvedChatAvatar {
	const groupAvatarUrl = normalizeImageUrl(group.avatar_url);
	if (isCustomGroupAvatarUrl(groupAvatarUrl)) {
		return {
			avatarSource: "group-custom-avatar",
			avatarUrl: appendAvatarRevision(groupAvatarUrl, avatarRevision),
			groupAvatarUrls: [],
			groupMemberAvatarIds: [],
		};
	}

	const members = Array.isArray(group.members) ? group.members : [];
	const disabledMembers = new Set(
		excludeDisabledMembers && Array.isArray(group.disabled_members)
			? group.disabled_members.map(asTrimmedString)
			: [],
	);
	const seen = new Set<string>();
	const groupAvatarUrls: string[] = [];
	const groupMemberAvatarIds: string[] = [];

	for (const member of members) {
		const avatarId = asTrimmedString(member);
		if (!avatarId || seen.has(avatarId) || disabledMembers.has(avatarId)) {
			continue;
		}

		const character = resolveCharacter(avatarId);
		const resolvedAvatarFileName =
			asTrimmedString(character?.avatar) || avatarId;
		if (!resolvedAvatarFileName || resolvedAvatarFileName === "none") {
			continue;
		}

		seen.add(avatarId);
		groupMemberAvatarIds.push(avatarId);
		groupAvatarUrls.push(
			resolveThumbnailUrl(
				context,
				"avatar",
				resolvedAvatarFileName,
				avatarRevision,
			),
		);

		if (groupAvatarUrls.length === MAX_GROUP_AVATAR_URLS) {
			break;
		}
	}

	if (groupAvatarUrls.length > 0) {
		return {
			avatarSource: "group-member-thumbnail",
			avatarUrl: groupAvatarUrls[0],
			groupAvatarUrls,
			groupMemberAvatarIds,
		};
	}

	return {
		avatarSource: "fallback",
		avatarUrl: groupAvatarUrl || getFallbackChatAvatarUrl(),
		groupAvatarUrls: [],
		groupMemberAvatarIds: [],
	};
}
