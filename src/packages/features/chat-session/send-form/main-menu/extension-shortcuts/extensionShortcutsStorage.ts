import { MOBILE_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_EXPANDED_STORAGE_KEY } from "@/packages/features/chat-session/send-form/contracts/dom";

export function readStoredExtensionShortcutsExpanded(
	storage: Storage | null | undefined,
): boolean {
	if (!storage) {
		return true;
	}

	try {
		const storedValue = storage.getItem(
			MOBILE_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_EXPANDED_STORAGE_KEY,
		);
		if (storedValue === "false") {
			return false;
		}

		if (storedValue === "true") {
			return true;
		}
	} catch {
		return true;
	}

	return true;
}

export function persistStoredExtensionShortcutsExpanded(
	storage: Storage | null | undefined,
	isExpanded: boolean,
): void {
	if (!storage) {
		return;
	}

	try {
		storage.setItem(
			MOBILE_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_EXPANDED_STORAGE_KEY,
			String(isExpanded),
		);
	} catch {
		// Keep the in-memory preference active when browser storage is blocked.
	}
}
