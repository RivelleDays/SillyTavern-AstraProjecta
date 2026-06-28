import { getStContext } from "@/packages/core/st/context";
import { isRecord, readContextSafe } from "@/packages/core/st/shared";

type Listener = () => void;

type StChatBackgroundAppearanceContextLike = Record<string, unknown> & {
	extensionSettings?: unknown;
	saveSettingsDebounced?: () => unknown;
};

type ChatBackgroundAppearanceRoot = {
	blurPx: number;
	opacityPercent: number;
	version: 1;
};

export const CHAT_BACKGROUND_APPEARANCE_CHANGE_EVENT =
	"astra-projecta:chat-background-appearance-changed";
export const CHAT_BACKGROUND_APPEARANCE_SETTINGS_KEY =
	"chatBackgroundAppearance";
export const CHAT_BACKGROUND_APPEARANCE_MODULE_KEY = "astra_projecta";

export const CHAT_BACKGROUND_BLUR_MIN_PX = 0;
export const CHAT_BACKGROUND_BLUR_MAX_PX = 5;
export const CHAT_BACKGROUND_BLUR_STEP_PX = 1;
export const CHAT_BACKGROUND_BLUR_DEFAULT_PX = 2;

export const CHAT_BACKGROUND_OPACITY_MIN_PERCENT = 0;
export const CHAT_BACKGROUND_OPACITY_MAX_PERCENT = 100;
export const CHAT_BACKGROUND_OPACITY_STEP_PERCENT = 5;
export const CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT = 80;

export interface ChatBackgroundAppearanceSnapshot {
	blurPx: number;
	opacityPercent: number;
	updatedAt: number;
}

export interface ChatBackgroundAppearanceInput {
	blurPx: number;
	opacityPercent: number;
}

export interface ChatBackgroundAppearanceStore {
	dispose(): void;
	getSnapshot(): ChatBackgroundAppearanceSnapshot;
	resetBlur(): void;
	resetOpacity(): void;
	setAppearance(value: ChatBackgroundAppearanceInput): void;
	setBlurPx(value: number): void;
	setOpacityPercent(value: number): void;
	subscribe(listener: Listener): () => void;
}

export interface CreateChatBackgroundAppearanceStoreOptions {
	eventTarget?: EventTarget;
	getContext?: () => unknown;
	now?: () => number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function asFiniteNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeRoot(raw: unknown): ChatBackgroundAppearanceRoot {
	const record = isRecord(raw) ? raw : {};

	return {
		blurPx: clamp(
			asFiniteNumber(record.blurPx) ?? CHAT_BACKGROUND_BLUR_DEFAULT_PX,
			CHAT_BACKGROUND_BLUR_MIN_PX,
			CHAT_BACKGROUND_BLUR_MAX_PX,
		),
		opacityPercent: clamp(
			asFiniteNumber(record.opacityPercent) ??
				CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT,
			CHAT_BACKGROUND_OPACITY_MIN_PERCENT,
			CHAT_BACKGROUND_OPACITY_MAX_PERCENT,
		),
		version: 1,
	};
}

function resolveSettingsRoot(
	context: StChatBackgroundAppearanceContextLike | null,
): ChatBackgroundAppearanceRoot | null {
	if (!context) {
		return null;
	}

	if (!isRecord(context.extensionSettings)) {
		context.extensionSettings = {};
	}

	const extensionSettings = context.extensionSettings as Record<
		string,
		unknown
	>;

	if (!isRecord(extensionSettings[CHAT_BACKGROUND_APPEARANCE_MODULE_KEY])) {
		extensionSettings[CHAT_BACKGROUND_APPEARANCE_MODULE_KEY] = {};
	}

	const moduleSettings = extensionSettings[
		CHAT_BACKGROUND_APPEARANCE_MODULE_KEY
	] as Record<string, unknown>;
	const root = normalizeRoot(
		moduleSettings[CHAT_BACKGROUND_APPEARANCE_SETTINGS_KEY],
	);
	moduleSettings[CHAT_BACKGROUND_APPEARANCE_SETTINGS_KEY] = root;
	return root;
}

function createDefaultRoot(): ChatBackgroundAppearanceRoot {
	return {
		blurPx: CHAT_BACKGROUND_BLUR_DEFAULT_PX,
		opacityPercent: CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT,
		version: 1,
	};
}

export function createChatBackgroundAppearanceStore({
	eventTarget = typeof window === "undefined" ? undefined : window,
	getContext = getStContext,
	now = Date.now,
}: CreateChatBackgroundAppearanceStoreOptions = {}): ChatBackgroundAppearanceStore {
	const listeners = new Set<Listener>();
	let disposed = false;
	let isDispatchingChange = false;
	let snapshotCache: ChatBackgroundAppearanceSnapshot | null = null;
	let updatedAt = now();

	function getRootAndContext(): {
		context: StChatBackgroundAppearanceContextLike | null;
		root: ChatBackgroundAppearanceRoot;
	} {
		const context =
			readContextSafe<StChatBackgroundAppearanceContextLike>(getContext);
		const root = resolveSettingsRoot(context) ?? createDefaultRoot();
		return { context, root };
	}

	function notify() {
		if (disposed) {
			return;
		}

		for (const listener of listeners) {
			listener();
		}
	}

	function handleExternalChange() {
		if (isDispatchingChange) {
			return;
		}

		updatedAt = now();
		snapshotCache = null;
		notify();
	}

	try {
		eventTarget?.addEventListener(
			CHAT_BACKGROUND_APPEARANCE_CHANGE_EVENT,
			handleExternalChange,
		);
	} catch {
		// Cross-surface sync is best-effort.
	}

	function persist(context: StChatBackgroundAppearanceContextLike | null) {
		updatedAt = now();
		snapshotCache = null;

		try {
			context?.saveSettingsDebounced?.();
		} catch {
			// Settings writes are best-effort from extension UI.
		}

		notify();

		try {
			isDispatchingChange = true;
			eventTarget?.dispatchEvent(
				new CustomEvent(CHAT_BACKGROUND_APPEARANCE_CHANGE_EVENT),
			);
		} catch {
			// Cross-window notification is best-effort.
		} finally {
			isDispatchingChange = false;
		}
	}

	function writeRoot(nextRoot: ChatBackgroundAppearanceRoot) {
		const { context } = getRootAndContext();
		if (!context) {
			return;
		}

		if (!isRecord(context.extensionSettings)) {
			context.extensionSettings = {};
		}

		const extensionSettings = context.extensionSettings as Record<
			string,
			unknown
		>;
		const moduleSettings = isRecord(
			extensionSettings[CHAT_BACKGROUND_APPEARANCE_MODULE_KEY],
		)
			? (extensionSettings[
					CHAT_BACKGROUND_APPEARANCE_MODULE_KEY
				] as Record<string, unknown>)
			: {};

		moduleSettings[CHAT_BACKGROUND_APPEARANCE_SETTINGS_KEY] = nextRoot;
		extensionSettings[CHAT_BACKGROUND_APPEARANCE_MODULE_KEY] =
			moduleSettings;
		persist(context);
	}

	function setAppearance(value: ChatBackgroundAppearanceInput) {
		const { root } = getRootAndContext();
		writeRoot({
			...root,
			blurPx: clamp(
				value.blurPx,
				CHAT_BACKGROUND_BLUR_MIN_PX,
				CHAT_BACKGROUND_BLUR_MAX_PX,
			),
			opacityPercent: clamp(
				value.opacityPercent,
				CHAT_BACKGROUND_OPACITY_MIN_PERCENT,
				CHAT_BACKGROUND_OPACITY_MAX_PERCENT,
			),
		});
	}

	function setBlurPx(value: number) {
		const { root } = getRootAndContext();
		setAppearance({
			opacityPercent: root.opacityPercent,
			blurPx: value,
		});
	}

	function setOpacityPercent(value: number) {
		const { root } = getRootAndContext();
		setAppearance({
			...root,
			opacityPercent: value,
		});
	}

	return {
		dispose() {
			disposed = true;
			listeners.clear();

			try {
				eventTarget?.removeEventListener(
					CHAT_BACKGROUND_APPEARANCE_CHANGE_EVENT,
					handleExternalChange,
				);
			} catch {
				// Best-effort cleanup.
			}
		},

		getSnapshot(): ChatBackgroundAppearanceSnapshot {
			if (snapshotCache) {
				return snapshotCache;
			}

			const { root } = getRootAndContext();
			snapshotCache = {
				blurPx: root.blurPx,
				opacityPercent: root.opacityPercent,
				updatedAt,
			};
			return snapshotCache;
		},

		resetBlur() {
			setBlurPx(CHAT_BACKGROUND_BLUR_DEFAULT_PX);
		},

		resetOpacity() {
			setOpacityPercent(CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT);
		},

		setAppearance,
		setBlurPx,
		setOpacityPercent,

		subscribe(listener: Listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
