import aiSettings from "@/packages/features/sillytavern-interface/icons/ai-settings.svg?raw";
import backgrounds from "@/packages/features/sillytavern-interface/icons/backgrounds.svg?raw";
import characterManagement from "@/packages/features/sillytavern-interface/icons/character-management.svg?raw";
import extensions from "@/packages/features/sillytavern-interface/icons/extensions.svg?raw";
import lorebook from "@/packages/features/sillytavern-interface/icons/lorebook.svg?raw";
import userSettings from "@/packages/features/sillytavern-interface/icons/user-settings.svg?raw";

// AI Settings icon source: user-provided sample SVG from the approved faithful tile reference.
// MingCute icons by MingCute Design, licensed under Apache 2.0.
// Source set: User Settings, Lorebook, Extensions, Backgrounds, Character Management.

export const SILLYTAVERN_INTERFACE_ROUTE_ICON_SOURCES = {
	"ai-settings": aiSettings,
	backgrounds,
	"character-management": characterManagement,
	extensions,
	lorebook,
	"user-settings": userSettings,
} as const;

export const MOBILE_CHAT_MAIN_MENU_TILE_ICON_SOURCES =
	SILLYTAVERN_INTERFACE_ROUTE_ICON_SOURCES;

export type SillyTavernInterfaceRouteIconKey =
	keyof typeof SILLYTAVERN_INTERFACE_ROUTE_ICON_SOURCES;
export type MobileChatMainMenuTileIconKey = SillyTavernInterfaceRouteIconKey;
