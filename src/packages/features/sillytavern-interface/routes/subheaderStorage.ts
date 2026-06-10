import {
	LEGACY_SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
	LEGACY_SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
	LEGACY_SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
} from "@/packages/features/sillytavern-interface/contracts/dom";

const AI_SETTINGS_PAGE_KEYS = [
	"advanced-formatting",
	"ai-response-configuration",
	"connection-profile",
] as const;
const CHARACTER_MANAGEMENT_TAB_VALUES = [
	"advanced",
	"cards",
	"edit",
	"images",
] as const;
const PERSONA_MANAGEMENT_TAB_VALUES = ["personas", "edit"] as const;

type AiSettingsPageKey = (typeof AI_SETTINGS_PAGE_KEYS)[number];
export type StoredCharacterManagementTabValue =
	(typeof CHARACTER_MANAGEMENT_TAB_VALUES)[number];
export type StoredPersonaManagementTabValue =
	(typeof PERSONA_MANAGEMENT_TAB_VALUES)[number];

export function isAiSettingsPageKey(
	value: unknown,
): value is AiSettingsPageKey {
	return (
		typeof value === "string" &&
		AI_SETTINGS_PAGE_KEYS.includes(value as AiSettingsPageKey)
	);
}

export function isStoredCharacterManagementTabValue(
	value: unknown,
): value is StoredCharacterManagementTabValue {
	return (
		typeof value === "string" &&
		CHARACTER_MANAGEMENT_TAB_VALUES.includes(
			value as StoredCharacterManagementTabValue,
		)
	);
}

export function isStoredPersonaManagementTabValue(
	value: unknown,
): value is StoredPersonaManagementTabValue {
	return (
		typeof value === "string" &&
		PERSONA_MANAGEMENT_TAB_VALUES.includes(
			value as StoredPersonaManagementTabValue,
		)
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

function tryPersistStoredString(storage: Storage, key: string, value: string) {
	try {
		storage.setItem(key, value);
	} catch {
		// Keep the current in-memory route when browser storage is unavailable.
	}
}

function readStoredMigratedString({
	isValidValue,
	legacyKey,
	storage,
	storageKey,
}: {
	isValidValue(value: unknown): value is string;
	legacyKey: string;
	storage?: Storage | null;
	storageKey: string;
}) {
	const storedValue = readStoredString(storage, storageKey);
	if (isValidValue(storedValue)) {
		return storedValue;
	}

	const legacyStoredValue = readStoredString(storage, legacyKey);
	if (storage && isValidValue(legacyStoredValue)) {
		tryPersistStoredString(storage, storageKey, legacyStoredValue);
		return legacyStoredValue;
	}

	return null;
}

export function readStoredAiSettingsPageKey(
	storage?: Storage | null,
): AiSettingsPageKey {
	const storedValue = readStoredMigratedString({
		isValidValue: isAiSettingsPageKey,
		legacyKey:
			LEGACY_SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
		storage,
		storageKey:
			SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
	});

	return isAiSettingsPageKey(storedValue)
		? storedValue
		: "ai-response-configuration";
}

export function persistStoredAiSettingsPageKey(
	storage: Storage | null | undefined,
	pageKey: string,
) {
	if (!storage || !isAiSettingsPageKey(pageKey)) {
		return;
	}

	tryPersistStoredString(
		storage,
		SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
		pageKey,
	);
}

export function readStoredPersonaManagementTabValue(
	storage?: Storage | null,
): StoredPersonaManagementTabValue {
	const storedValue = readStoredMigratedString({
		isValidValue: isStoredPersonaManagementTabValue,
		legacyKey:
			LEGACY_SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
		storage,
		storageKey:
			SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
	});

	return isStoredPersonaManagementTabValue(storedValue)
		? storedValue
		: "personas";
}

export function persistStoredPersonaManagementTabValue(
	storage: Storage | null | undefined,
	value: StoredPersonaManagementTabValue,
) {
	if (!storage || !isStoredPersonaManagementTabValue(value)) {
		return;
	}

	tryPersistStoredString(
		storage,
		SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
		value,
	);
}

export function readStoredCharacterManagementTabValue({
	canOpenEditTab,
	canOpenGalleryTab = true,
	storage,
}: {
	canOpenEditTab: boolean;
	canOpenGalleryTab?: boolean;
	storage?: Storage | null;
}): StoredCharacterManagementTabValue {
	const storedValue = readMaybeStoredCharacterManagementTabValue(storage);

	if (!storedValue) {
		return "cards";
	}

	if (storedValue === "edit" && !canOpenEditTab) {
		return "cards";
	}

	if (storedValue === "images" && !canOpenGalleryTab) {
		return "cards";
	}

	return storedValue;
}

export function readMaybeStoredCharacterManagementTabValue(
	storage?: Storage | null,
): StoredCharacterManagementTabValue | null {
	const storedValue = readStoredMigratedString({
		isValidValue: isStoredCharacterManagementTabValue,
		legacyKey:
			LEGACY_SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
		storage,
		storageKey:
			SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
	});

	return isStoredCharacterManagementTabValue(storedValue)
		? storedValue
		: null;
}

export function persistStoredCharacterManagementTabValue(
	storage: Storage | null | undefined,
	value: StoredCharacterManagementTabValue,
) {
	if (!storage || !isStoredCharacterManagementTabValue(value)) {
		return;
	}

	tryPersistStoredString(
		storage,
		SILLYTAVERN_INTERFACE_CHARACTER_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
		value,
	);
}
