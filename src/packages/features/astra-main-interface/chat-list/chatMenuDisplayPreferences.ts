import type { ChatCatalogSortMode } from "@/packages/core/st/chat-catalog";

export const CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY =
	"astra_projecta.astra_main_interface.chat_menu.preview_lines";
export const CHAT_MENU_SHOW_AVATARS_STORAGE_KEY =
	"astra_projecta.astra_main_interface.chat_menu.show_avatars";
export const CHAT_MENU_SORT_MODE_STORAGE_KEY =
	"astra_projecta.astra_main_interface.chat_menu.sort_mode";
export const CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY =
	"astra_projecta.astra_main_interface.current_chat_menu.preview_lines";
export const CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY =
	"astra_projecta.astra_main_interface.current_chat_menu.show_avatars";
export const CURRENT_CHAT_MENU_SORT_MODE_STORAGE_KEY =
	"astra_projecta.astra_main_interface.current_chat_menu.sort_mode";

export const CHAT_MENU_PREVIEW_LINE_COUNTS = [0, 1, 2, 3] as const;
export type ChatMenuPreviewLineCount =
	(typeof CHAT_MENU_PREVIEW_LINE_COUNTS)[number];
export const CHAT_MENU_SORT_MODES: readonly ChatCatalogSortMode[] = [
	"most-recent",
	"oldest",
	"entity-asc",
	"entity-desc",
	"most-messages",
	"least-messages",
] as const;

const DEFAULT_CHAT_MENU_PREVIEW_LINE_COUNT: ChatMenuPreviewLineCount = 2;
const DEFAULT_CHAT_MENU_SHOW_AVATARS = true;
const DEFAULT_CHAT_MENU_SORT_MODE: ChatCatalogSortMode = "most-recent";
const DEFAULT_CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT: ChatMenuPreviewLineCount = 2;
const DEFAULT_CURRENT_CHAT_MENU_SHOW_AVATARS = true;
const DEFAULT_CURRENT_CHAT_MENU_SORT_MODE: ChatCatalogSortMode = "most-recent";

export function isChatMenuPreviewLineCount(
	value: unknown,
): value is ChatMenuPreviewLineCount {
	return (
		typeof value === "number" &&
		CHAT_MENU_PREVIEW_LINE_COUNTS.includes(
			value as ChatMenuPreviewLineCount,
		)
	);
}

export function isChatMenuSortMode(
	value: unknown,
): value is ChatCatalogSortMode {
	return (
		typeof value === "string" &&
		CHAT_MENU_SORT_MODES.includes(value as ChatCatalogSortMode)
	);
}

function readStoredString(storage: Storage | null | undefined, key: string) {
	if (!storage) {
		return null;
	}

	try {
		return storage.getItem(key);
	} catch {
		return null;
	}
}

function tryPersistStoredString(
	storage: Storage | null | undefined,
	key: string,
	value: string,
) {
	if (!storage) {
		return;
	}

	try {
		storage.setItem(key, value);
	} catch {
		// Keep the in-memory preference active when browser storage is blocked.
	}
}

export function readStoredChatMenuPreviewLineCount(
	storage?: Storage | null,
): ChatMenuPreviewLineCount {
	const storedValue = readStoredString(
		storage,
		CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
	);
	const parsedValue = storedValue === null ? Number.NaN : Number(storedValue);

	return isChatMenuPreviewLineCount(parsedValue)
		? parsedValue
		: DEFAULT_CHAT_MENU_PREVIEW_LINE_COUNT;
}

export function persistStoredChatMenuPreviewLineCount(
	storage: Storage | null | undefined,
	lineCount: unknown,
) {
	if (!isChatMenuPreviewLineCount(lineCount)) {
		return;
	}

	tryPersistStoredString(
		storage,
		CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
		String(lineCount),
	);
}

export function readStoredChatMenuShowAvatars(
	storage?: Storage | null,
): boolean {
	const storedValue = readStoredString(
		storage,
		CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
	);

	if (storedValue === "false") {
		return false;
	}

	if (storedValue === "true") {
		return true;
	}

	return DEFAULT_CHAT_MENU_SHOW_AVATARS;
}

export function persistStoredChatMenuShowAvatars(
	storage: Storage | null | undefined,
	showAvatars: boolean,
) {
	tryPersistStoredString(
		storage,
		CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
		String(showAvatars),
	);
}

export function readStoredChatMenuSortMode(
	storage?: Storage | null,
): ChatCatalogSortMode {
	const storedValue = readStoredString(
		storage,
		CHAT_MENU_SORT_MODE_STORAGE_KEY,
	);

	return isChatMenuSortMode(storedValue)
		? storedValue
		: DEFAULT_CHAT_MENU_SORT_MODE;
}

export function persistStoredChatMenuSortMode(
	storage: Storage | null | undefined,
	sortMode: unknown,
) {
	if (!isChatMenuSortMode(sortMode)) {
		return;
	}

	tryPersistStoredString(storage, CHAT_MENU_SORT_MODE_STORAGE_KEY, sortMode);
}

export function readStoredCurrentChatMenuPreviewLineCount(
	storage?: Storage | null,
): ChatMenuPreviewLineCount {
	const storedValue = readStoredString(
		storage,
		CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
	);
	const parsedValue = storedValue === null ? Number.NaN : Number(storedValue);

	return isChatMenuPreviewLineCount(parsedValue)
		? parsedValue
		: DEFAULT_CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT;
}

export function persistStoredCurrentChatMenuPreviewLineCount(
	storage: Storage | null | undefined,
	lineCount: unknown,
) {
	if (!isChatMenuPreviewLineCount(lineCount)) {
		return;
	}

	tryPersistStoredString(
		storage,
		CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
		String(lineCount),
	);
}

export function readStoredCurrentChatMenuShowAvatars(
	storage?: Storage | null,
): boolean {
	const storedValue = readStoredString(
		storage,
		CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
	);

	if (storedValue === "false") {
		return false;
	}

	if (storedValue === "true") {
		return true;
	}

	return DEFAULT_CURRENT_CHAT_MENU_SHOW_AVATARS;
}

export function persistStoredCurrentChatMenuShowAvatars(
	storage: Storage | null | undefined,
	showAvatars: boolean,
) {
	tryPersistStoredString(
		storage,
		CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
		String(showAvatars),
	);
}

export function readStoredCurrentChatMenuSortMode(
	storage?: Storage | null,
): ChatCatalogSortMode {
	const storedValue = readStoredString(
		storage,
		CURRENT_CHAT_MENU_SORT_MODE_STORAGE_KEY,
	);

	return isChatMenuSortMode(storedValue)
		? storedValue
		: DEFAULT_CURRENT_CHAT_MENU_SORT_MODE;
}

export function persistStoredCurrentChatMenuSortMode(
	storage: Storage | null | undefined,
	sortMode: unknown,
) {
	if (!isChatMenuSortMode(sortMode)) {
		return;
	}

	tryPersistStoredString(
		storage,
		CURRENT_CHAT_MENU_SORT_MODE_STORAGE_KEY,
		sortMode,
	);
}
