export const ST_ENDPOINTS = {
	characterChats: "/api/characters/chats",
	chatDelete: "/api/chats/delete",
	chatExport: "/api/chats/export",
	chatSearch: "/api/chats/search",
	groupDelete: "/api/chats/group/delete",
	groupEdit: "/api/groups/edit",
	groupInfo: "/api/chats/group/info",
	recentChats: "/api/chats/recent",
	tokenizerOpenAiCount: "/api/tokenizers/openai/count",
} as const;

export type StEndpoint = (typeof ST_ENDPOINTS)[keyof typeof ST_ENDPOINTS];
