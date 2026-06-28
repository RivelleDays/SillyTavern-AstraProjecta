import { MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY } from "@/packages/features/chat-session/send-form/contracts/dom";

/**
 * Shared, cross-feature source of truth for the chat input shortcuts toolbar
 * visibility preference. The send-form shell subscribes to render the toolbar;
 * the Chat Settings drawer drives it (live preview + Save/Cancel) from a
 * separate feature tree, so the value must live in a module singleton rather
 * than component state.
 *
 * Persistence stays on the existing localStorage key; `previewOverride` carries
 * an unsaved draft value so the toolbar can update live before Save.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let previewOverride: boolean | null = null;

function readStorage(): Storage | null {
	try {
		return globalThis.window?.localStorage ?? null;
	} catch {
		return null;
	}
}

function readPersistedVisibility(): boolean {
	const storage = readStorage();
	if (!storage) {
		return true;
	}

	try {
		const storedValue = storage.getItem(
			MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
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

function writePersistedVisibility(isVisible: boolean): void {
	const storage = readStorage();
	if (!storage) {
		return;
	}

	try {
		storage.setItem(
			MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
			String(isVisible),
		);
	} catch {
		// Ignore storage failures and keep the in-memory preference active.
	}
}

function emit(): void {
	for (const listener of listeners) {
		listener();
	}
}

export const shortcutsToolbarVisibilityStore = {
	subscribe(listener: Listener): () => void {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
	/** Effective visibility: the live draft preview when active, else persisted. */
	getSnapshot(): boolean {
		return previewOverride ?? readPersistedVisibility();
	},
	/** Persisted baseline, ignoring any active draft preview. */
	getPersisted(): boolean {
		return readPersistedVisibility();
	},
	/** Show a draft value live without persisting it. */
	setPreview(value: boolean): void {
		if (previewOverride === value) {
			return;
		}

		previewOverride = value;
		emit();
	},
	/** Persist a value and clear the draft preview. */
	commit(value: boolean): void {
		previewOverride = null;
		writePersistedVisibility(value);
		emit();
	},
	/** Drop the draft preview and fall back to the persisted value. */
	clearPreview(): void {
		if (previewOverride === null) {
			return;
		}

		previewOverride = null;
		emit();
	},
};
