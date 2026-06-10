import englishCatalog from "../../../locales/en.json";

import { getStContext } from "@/packages/core/st/context";
import type { I18nKey } from "@/types/i18n";

interface StI18nContextLike {
	translate?: unknown;
}

const ENGLISH_CATALOG = englishCatalog as Record<I18nKey, string>;

function resolveTranslate() {
	try {
		const context = getStContext() as StI18nContextLike;
		return typeof context.translate === "function"
			? context.translate
			: null;
	} catch {
		return null;
	}
}

export function translateAstra(key: I18nKey): string {
	const fallbackText = ENGLISH_CATALOG[key];
	const translate = resolveTranslate();

	if (!translate) {
		return fallbackText;
	}

	try {
		return translate(fallbackText, key);
	} catch {
		return fallbackText;
	}
}
