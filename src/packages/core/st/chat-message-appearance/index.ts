import { getStContext } from "@/packages/core/st/context";
import { isRecord, readContextSafe } from "@/packages/core/st/shared";

type Listener = () => void;

type StChatMessageAppearanceContextLike = Record<string, unknown> & {
	extensionSettings?: unknown;
	saveSettingsDebounced?: () => unknown;
};

export const CHAT_MESSAGE_APPEARANCE_CHANGE_EVENT =
	"astra-projecta:chat-message-appearance-changed";
export const CHAT_MESSAGE_APPEARANCE_SETTINGS_KEY = "chatMessageAppearance";
export const CHAT_MESSAGE_APPEARANCE_MODULE_KEY = "astra_projecta";

export const CHAT_MESSAGE_LINE_HEIGHT_OPTIONS = ["sm", "md", "lg"] as const;
export const CHAT_MESSAGE_LINE_HEIGHT_DEFAULT = "md";

export const CHAT_MESSAGE_TEXT_ALIGN_OPTIONS = [
	"start",
	"center",
	"end",
	"justify",
] as const;
export const CHAT_MESSAGE_TEXT_ALIGN_DEFAULT = "start";

export type ChatMessageLineHeight =
	(typeof CHAT_MESSAGE_LINE_HEIGHT_OPTIONS)[number];
export type ChatMessageTextAlign =
	(typeof CHAT_MESSAGE_TEXT_ALIGN_OPTIONS)[number];

type ChatMessageAppearanceRoot = {
	lineHeight: ChatMessageLineHeight;
	textAlign: ChatMessageTextAlign;
	version: 1;
};

export interface ChatMessageAppearanceSnapshot {
	lineHeight: ChatMessageLineHeight;
	textAlign: ChatMessageTextAlign;
	updatedAt: number;
}

export interface ChatMessageAppearanceInput {
	lineHeight: ChatMessageLineHeight;
	textAlign: ChatMessageTextAlign;
}

export interface ChatMessageAppearanceStore {
	dispose(): void;
	getSnapshot(): ChatMessageAppearanceSnapshot;
	setAppearance(value: ChatMessageAppearanceInput): void;
	subscribe(listener: Listener): () => void;
}

export interface CreateChatMessageAppearanceStoreOptions {
	eventTarget?: EventTarget;
	getContext?: () => unknown;
	now?: () => number;
}

function normalizeOption<Option extends string>(
	value: unknown,
	options: readonly Option[],
	fallback: Option,
): Option {
	return options.includes(value as Option) ? (value as Option) : fallback;
}

function normalizeRoot(raw: unknown): ChatMessageAppearanceRoot {
	const record = isRecord(raw) ? raw : {};

	return {
		lineHeight: normalizeOption(
			record.lineHeight,
			CHAT_MESSAGE_LINE_HEIGHT_OPTIONS,
			CHAT_MESSAGE_LINE_HEIGHT_DEFAULT,
		),
		textAlign: normalizeOption(
			record.textAlign,
			CHAT_MESSAGE_TEXT_ALIGN_OPTIONS,
			CHAT_MESSAGE_TEXT_ALIGN_DEFAULT,
		),
		version: 1,
	};
}

function resolveSettingsRoot(
	context: StChatMessageAppearanceContextLike | null,
): ChatMessageAppearanceRoot | null {
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

	if (!isRecord(extensionSettings[CHAT_MESSAGE_APPEARANCE_MODULE_KEY])) {
		extensionSettings[CHAT_MESSAGE_APPEARANCE_MODULE_KEY] = {};
	}

	const moduleSettings = extensionSettings[
		CHAT_MESSAGE_APPEARANCE_MODULE_KEY
	] as Record<string, unknown>;
	const root = normalizeRoot(
		moduleSettings[CHAT_MESSAGE_APPEARANCE_SETTINGS_KEY],
	);
	moduleSettings[CHAT_MESSAGE_APPEARANCE_SETTINGS_KEY] = root;
	return root;
}

function createDefaultRoot(): ChatMessageAppearanceRoot {
	return {
		lineHeight: CHAT_MESSAGE_LINE_HEIGHT_DEFAULT,
		textAlign: CHAT_MESSAGE_TEXT_ALIGN_DEFAULT,
		version: 1,
	};
}

export function createChatMessageAppearanceStore({
	eventTarget = typeof window === "undefined" ? undefined : window,
	getContext = getStContext,
	now = Date.now,
}: CreateChatMessageAppearanceStoreOptions = {}): ChatMessageAppearanceStore {
	const listeners = new Set<Listener>();
	let disposed = false;
	let isDispatchingChange = false;
	let snapshotCache: ChatMessageAppearanceSnapshot | null = null;
	let updatedAt = now();

	function getRootAndContext(): {
		context: StChatMessageAppearanceContextLike | null;
		root: ChatMessageAppearanceRoot;
	} {
		const context =
			readContextSafe<StChatMessageAppearanceContextLike>(getContext);
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
			CHAT_MESSAGE_APPEARANCE_CHANGE_EVENT,
			handleExternalChange,
		);
	} catch {
		// Cross-surface sync is best-effort.
	}

	function persist(context: StChatMessageAppearanceContextLike | null) {
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
				new CustomEvent(CHAT_MESSAGE_APPEARANCE_CHANGE_EVENT),
			);
		} catch {
			// Cross-window notification is best-effort.
		} finally {
			isDispatchingChange = false;
		}
	}

	function writeRoot(nextRoot: ChatMessageAppearanceRoot) {
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
			extensionSettings[CHAT_MESSAGE_APPEARANCE_MODULE_KEY],
		)
			? (extensionSettings[CHAT_MESSAGE_APPEARANCE_MODULE_KEY] as Record<
					string,
					unknown
				>)
			: {};

		moduleSettings[CHAT_MESSAGE_APPEARANCE_SETTINGS_KEY] = nextRoot;
		extensionSettings[CHAT_MESSAGE_APPEARANCE_MODULE_KEY] = moduleSettings;
		persist(context);
	}

	function setAppearance(value: ChatMessageAppearanceInput) {
		const { root } = getRootAndContext();
		writeRoot({
			...root,
			lineHeight: normalizeOption(
				value.lineHeight,
				CHAT_MESSAGE_LINE_HEIGHT_OPTIONS,
				CHAT_MESSAGE_LINE_HEIGHT_DEFAULT,
			),
			textAlign: normalizeOption(
				value.textAlign,
				CHAT_MESSAGE_TEXT_ALIGN_OPTIONS,
				CHAT_MESSAGE_TEXT_ALIGN_DEFAULT,
			),
		});
	}

	return {
		dispose() {
			disposed = true;
			listeners.clear();

			try {
				eventTarget?.removeEventListener(
					CHAT_MESSAGE_APPEARANCE_CHANGE_EVENT,
					handleExternalChange,
				);
			} catch {
				// Best-effort cleanup.
			}
		},

		getSnapshot(): ChatMessageAppearanceSnapshot {
			if (snapshotCache) {
				return snapshotCache;
			}

			const { root } = getRootAndContext();
			snapshotCache = {
				lineHeight: root.lineHeight,
				textAlign: root.textAlign,
				updatedAt,
			};
			return snapshotCache;
		},

		setAppearance,

		subscribe(listener: Listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
