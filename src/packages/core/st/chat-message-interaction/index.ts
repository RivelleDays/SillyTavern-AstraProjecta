import { getStContext } from "@/packages/core/st/context";
import { isRecord, readContextSafe } from "@/packages/core/st/shared";

type Listener = () => void;

type StChatMessageInteractionContextLike = Record<string, unknown> & {
	extensionSettings?: unknown;
	saveSettingsDebounced?: () => unknown;
};

export const CHAT_MESSAGE_INTERACTION_CHANGE_EVENT =
	"astra-projecta:chat-message-interaction-changed";
export const CHAT_MESSAGE_INTERACTION_SETTINGS_KEY = "chatMessageInteraction";
export const CHAT_MESSAGE_INTERACTION_MODULE_KEY = "astra_projecta";

export const CHAT_MESSAGE_LONG_PRESS_ACTION_OPTIONS = [
	"disabled",
	"message-actions",
	"edit-message",
] as const;
export const CHAT_MESSAGE_LONG_PRESS_ACTION_DEFAULT = "disabled";

export type ChatMessageLongPressAction =
	(typeof CHAT_MESSAGE_LONG_PRESS_ACTION_OPTIONS)[number];

type ChatMessageInteractionRoot = {
	longPressAction: ChatMessageLongPressAction;
	version: 1;
};

export interface ChatMessageInteractionSnapshot {
	longPressAction: ChatMessageLongPressAction;
	updatedAt: number;
}

export interface ChatMessageInteractionInput {
	longPressAction: ChatMessageLongPressAction;
}

export interface ChatMessageInteractionStore {
	dispose(): void;
	getSnapshot(): ChatMessageInteractionSnapshot;
	setInteraction(value: ChatMessageInteractionInput): void;
	setLongPressAction(value: ChatMessageLongPressAction): void;
	subscribe(listener: Listener): () => void;
}

export interface CreateChatMessageInteractionStoreOptions {
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

function normalizeRoot(raw: unknown): ChatMessageInteractionRoot {
	const record = isRecord(raw) ? raw : {};

	return {
		longPressAction: normalizeOption(
			record.longPressAction,
			CHAT_MESSAGE_LONG_PRESS_ACTION_OPTIONS,
			CHAT_MESSAGE_LONG_PRESS_ACTION_DEFAULT,
		),
		version: 1,
	};
}

function resolveSettingsRoot(
	context: StChatMessageInteractionContextLike | null,
): ChatMessageInteractionRoot | null {
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

	if (!isRecord(extensionSettings[CHAT_MESSAGE_INTERACTION_MODULE_KEY])) {
		extensionSettings[CHAT_MESSAGE_INTERACTION_MODULE_KEY] = {};
	}

	const moduleSettings = extensionSettings[
		CHAT_MESSAGE_INTERACTION_MODULE_KEY
	] as Record<string, unknown>;
	const root = normalizeRoot(
		moduleSettings[CHAT_MESSAGE_INTERACTION_SETTINGS_KEY],
	);
	moduleSettings[CHAT_MESSAGE_INTERACTION_SETTINGS_KEY] = root;
	return root;
}

function createDefaultRoot(): ChatMessageInteractionRoot {
	return {
		longPressAction: CHAT_MESSAGE_LONG_PRESS_ACTION_DEFAULT,
		version: 1,
	};
}

export function createChatMessageInteractionStore({
	eventTarget = typeof window === "undefined" ? undefined : window,
	getContext = getStContext,
	now = Date.now,
}: CreateChatMessageInteractionStoreOptions = {}): ChatMessageInteractionStore {
	const listeners = new Set<Listener>();
	let disposed = false;
	let isDispatchingChange = false;
	let snapshotCache: ChatMessageInteractionSnapshot | null = null;
	let updatedAt = now();

	function getRootAndContext(): {
		context: StChatMessageInteractionContextLike | null;
		root: ChatMessageInteractionRoot;
	} {
		const context =
			readContextSafe<StChatMessageInteractionContextLike>(getContext);
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
			CHAT_MESSAGE_INTERACTION_CHANGE_EVENT,
			handleExternalChange,
		);
	} catch {
		// Cross-surface sync is best-effort.
	}

	function persist(context: StChatMessageInteractionContextLike | null) {
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
				new CustomEvent(CHAT_MESSAGE_INTERACTION_CHANGE_EVENT),
			);
		} catch {
			// Cross-window notification is best-effort.
		} finally {
			isDispatchingChange = false;
		}
	}

	function writeRoot(nextRoot: ChatMessageInteractionRoot) {
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
			extensionSettings[CHAT_MESSAGE_INTERACTION_MODULE_KEY],
		)
			? (extensionSettings[CHAT_MESSAGE_INTERACTION_MODULE_KEY] as Record<
					string,
					unknown
				>)
			: {};

		moduleSettings[CHAT_MESSAGE_INTERACTION_SETTINGS_KEY] = nextRoot;
		extensionSettings[CHAT_MESSAGE_INTERACTION_MODULE_KEY] = moduleSettings;
		persist(context);
	}

	function setInteraction(value: ChatMessageInteractionInput) {
		const { root } = getRootAndContext();
		writeRoot({
			...root,
			longPressAction: normalizeOption(
				value.longPressAction,
				CHAT_MESSAGE_LONG_PRESS_ACTION_OPTIONS,
				CHAT_MESSAGE_LONG_PRESS_ACTION_DEFAULT,
			),
		});
	}

	function setLongPressAction(value: ChatMessageLongPressAction) {
		setInteraction({
			longPressAction: value,
		});
	}

	return {
		dispose() {
			disposed = true;
			listeners.clear();

			try {
				eventTarget?.removeEventListener(
					CHAT_MESSAGE_INTERACTION_CHANGE_EVENT,
					handleExternalChange,
				);
			} catch {
				// Best-effort cleanup.
			}
		},

		getSnapshot(): ChatMessageInteractionSnapshot {
			if (snapshotCache) {
				return snapshotCache;
			}

			const { root } = getRootAndContext();
			snapshotCache = {
				longPressAction: root.longPressAction,
				updatedAt,
			};
			return snapshotCache;
		},

		setInteraction,
		setLongPressAction,

		subscribe(listener: Listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
