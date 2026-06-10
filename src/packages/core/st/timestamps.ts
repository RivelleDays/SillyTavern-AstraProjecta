import { getStContext } from "@/packages/core/st/context";

type MomentLike = {
	format?: (pattern: string) => unknown;
	valueOf?: () => unknown;
};

type TimestampContextLike = {
	timestampToMoment?: (value: unknown) => MomentLike | null | undefined;
};

type TimestampFormatOptions = {
	locale?: Intl.LocalesArgument;
};

const ABSOLUTE_TIMESTAMP_PATTERN = "YYYY/MM/DD hh:mm A";
const TIME_ONLY_TIMESTAMP_PATTERN = "LT";
const DATE_DIVIDER_TIMESTAMP_PATTERN = "LL";
const ST_LANGUAGE_STORAGE_KEY = "language";
const ST_UI_LANGUAGE_SELECT_ID = "ui_language_select";

function padDatePart(value: number): string {
	return String(value).padStart(2, "0");
}

function formatDateFallback(date: Date): string {
	const year = date.getFullYear();
	const month = padDatePart(date.getMonth() + 1);
	const day = padDatePart(date.getDate());
	const hours = date.getHours();
	const minutes = padDatePart(date.getMinutes());
	const meridiem = hours >= 12 ? "PM" : "AM";
	const twelveHour = hours % 12 || 12;

	return `${year}/${month}/${day} ${padDatePart(twelveHour)}:${minutes} ${meridiem}`;
}

function formatIntlDate(
	value: unknown,
	options: TimestampFormatOptions,
	formatOptions: Intl.DateTimeFormatOptions,
): string {
	const parsedTimestamp = parseStTimestampToMs(value);
	if (parsedTimestamp === null) {
		return "";
	}

	try {
		return new Intl.DateTimeFormat(
			resolveStUiLocale(options.locale),
			formatOptions,
		).format(new Date(parsedTimestamp));
	} catch {
		return new Intl.DateTimeFormat(undefined, formatOptions).format(
			new Date(parsedTimestamp),
		);
	}
}

function normalizeLocaleValue(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

function getSelectedStUiLanguage(): string | undefined {
	try {
		if (typeof document === "undefined") {
			return undefined;
		}

		const languageSelect = document.getElementById(ST_UI_LANGUAGE_SELECT_ID);
		const isLanguageInput =
			(typeof HTMLSelectElement !== "undefined" &&
				languageSelect instanceof HTMLSelectElement) ||
			(typeof HTMLInputElement !== "undefined" &&
				languageSelect instanceof HTMLInputElement);

		if (isLanguageInput) {
			return normalizeLocaleValue(languageSelect.value);
		}

		return normalizeLocaleValue(languageSelect?.getAttribute("value"));
	} catch {
		return undefined;
	}
}

function getStoredStUiLanguage(): string | undefined {
	try {
		if (typeof localStorage === "undefined") {
			return undefined;
		}

		return normalizeLocaleValue(
			localStorage.getItem(ST_LANGUAGE_STORAGE_KEY),
		);
	} catch {
		return undefined;
	}
}

function getDocumentLanguage(): string | undefined {
	try {
		if (typeof document === "undefined") {
			return undefined;
		}

		return normalizeLocaleValue(document.documentElement.lang);
	} catch {
		return undefined;
	}
}

function getNavigatorLanguage(): string | undefined {
	try {
		if (typeof navigator === "undefined") {
			return undefined;
		}

		const navigatorWithUserLanguage = navigator as Navigator & {
			userLanguage?: string;
		};

		return (
			normalizeLocaleValue(navigator.language) ??
			normalizeLocaleValue(navigatorWithUserLanguage.userLanguage)
		);
	} catch {
		return undefined;
	}
}

function resolveStUiLocale(
	explicitLocale: Intl.LocalesArgument | undefined,
): Intl.LocalesArgument | undefined {
	if (explicitLocale !== undefined) {
		return explicitLocale;
	}

	return (
		getSelectedStUiLanguage() ??
		getStoredStUiLanguage() ??
		getDocumentLanguage() ??
		getNavigatorLanguage()
	);
}

function resolveTimestampToMoment() {
	try {
		const context = getStContext() as TimestampContextLike;
		return typeof context.timestampToMoment === "function"
			? context.timestampToMoment
			: null;
	} catch {
		return null;
	}
}

export function parseStTimestampToMs(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) {
			return null;
		}

		const numericValue = Number(trimmed);
		if (Number.isFinite(numericValue)) {
			return numericValue;
		}

		const timestampToMoment = resolveTimestampToMoment();
		if (timestampToMoment) {
			try {
				const momentLike = timestampToMoment(trimmed);
				const momentValue = momentLike?.valueOf?.();
				const parsedMomentValue =
					typeof momentValue === "number"
						? momentValue
						: Number(momentValue);

				if (Number.isFinite(parsedMomentValue)) {
					return parsedMomentValue;
				}
			} catch {
				// Fall through to the local Date fallback.
			}
		}

		const parsed = Date.parse(trimmed);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

export function formatStAbsoluteTimestamp(
	value: number | string | null,
): string {
	if (value === null || value === "") {
		return "";
	}

	const timestampToMoment = resolveTimestampToMoment();
	if (timestampToMoment) {
		try {
			const momentLike = timestampToMoment(value);
			const formatted = momentLike?.format?.(ABSOLUTE_TIMESTAMP_PATTERN);
			if (typeof formatted === "string" && formatted.trim()) {
				return formatted;
			}
		} catch {
			// Fall through to the local Date fallback.
		}
	}

	const parsedTimestamp = parseStTimestampToMs(value);
	if (parsedTimestamp === null) {
		return "";
	}

	return formatDateFallback(new Date(parsedTimestamp));
}

function formatSillyTavernMomentTimestamp(
	value: unknown,
	pattern: string,
): string {
	if (parseStTimestampToMs(value) === null) {
		return "";
	}

	const timestampToMoment = resolveTimestampToMoment();
	if (!timestampToMoment) {
		return "";
	}

	try {
		const formatted = timestampToMoment(value)?.format?.(pattern);
		if (
			typeof formatted === "string" &&
			formatted.trim() &&
			formatted !== "Invalid date"
		) {
			return formatted;
		}
	} catch {
		return "";
	}

	return "";
}

export function formatStTimestampTimeOnly(
	value: unknown,
	options: TimestampFormatOptions = {},
): string {
	const stFormatted = formatSillyTavernMomentTimestamp(
		value,
		TIME_ONLY_TIMESTAMP_PATTERN,
	);
	if (stFormatted) {
		return stFormatted;
	}

	return formatIntlDate(value, options, {
		hour: "numeric",
		minute: "2-digit",
	});
}

export function formatStTimestampDateDivider(
	value: unknown,
	options: TimestampFormatOptions = {},
): string {
	const stFormatted = formatSillyTavernMomentTimestamp(
		value,
		DATE_DIVIDER_TIMESTAMP_PATTERN,
	);
	if (stFormatted) {
		return stFormatted;
	}

	return formatIntlDate(value, options, {
		dateStyle: "long",
	});
}

export function getStTimestampLocalDateKey(value: unknown): string {
	const parsedTimestamp = parseStTimestampToMs(value);
	if (parsedTimestamp === null) {
		return "";
	}

	const date = new Date(parsedTimestamp);
	return [
		date.getFullYear(),
		padDatePart(date.getMonth() + 1),
		padDatePart(date.getDate()),
	].join("-");
}
