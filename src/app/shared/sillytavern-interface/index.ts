export const DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY =
	"ai-response-configuration";

export const SILLYTAVERN_INTERFACE_ROUTES = {
	aiSettings: DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
	backgrounds: "backgrounds",
	characterManagement: "character-management",
	extensions: "extensions",
	lorebook: "worlds-lorebooks",
	personaManagement: "persona-management",
	userSettings: "user-settings",
} as const;

export type SillyTavernInterfaceRouteKey =
	(typeof SILLYTAVERN_INTERFACE_ROUTES)[keyof typeof SILLYTAVERN_INTERFACE_ROUTES];

export const SILLYTAVERN_INTERFACE_ROUTE_ICON_KEYS = [
	"ai-settings",
	"backgrounds",
	"character-management",
	"extensions",
	"lorebook",
	"user-settings",
] as const;

export type SillyTavernInterfaceRouteIconKey =
	(typeof SILLYTAVERN_INTERFACE_ROUTE_ICON_KEYS)[number];
