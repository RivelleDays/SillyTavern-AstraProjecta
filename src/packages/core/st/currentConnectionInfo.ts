import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	queueMicrotaskSafe,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type Listener = () => void;

type ChatCompletionSettingsLike = Record<string, unknown> & {
	chat_completion_source?: unknown;
};

type TextCompletionSettingsLike = Record<string, unknown> & {
	aphrodite_model?: unknown;
	custom_model?: unknown;
	dreamgen_model?: unknown;
	featherless_model?: unknown;
	generic_model?: unknown;
	infermaticai_model?: unknown;
	llamacpp_model?: unknown;
	mancer_model?: unknown;
	ollama_model?: unknown;
	openrouter_model?: unknown;
	tabby_model?: unknown;
	togetherai_model?: unknown;
	type?: unknown;
	vllm_model?: unknown;
};

type SlashCommandLike = {
	callback?: (
		args: Record<string, string>,
		text: string,
	) => unknown | Promise<unknown>;
};

type SlashCommandParserLike = {
	commands?: Record<string, SlashCommandLike>;
};

type StContextLike = Record<string, unknown> & {
	chatCompletionSettings?: ChatCompletionSettingsLike;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	getChatCompletionModel?: () => unknown;
	mainApi?: unknown;
	onlineStatus?: unknown;
	SlashCommandParser?: SlashCommandParserLike;
	textCompletionSettings?: TextCompletionSettingsLike;
};

const GENERIC_CONNECTED_STATUSES = new Set([
	"connected",
	"status check bypassed",
]);

const TEXTGEN_TYPE_MODEL_KEY_BY_TYPE = {
	aphrodite: "aphrodite_model",
	dreamgen: "dreamgen_model",
	featherless: "featherless_model",
	generic: "generic_model",
	infermaticai: "infermaticai_model",
	llamacpp: "llamacpp_model",
	mancer: "mancer_model",
	ollama: "ollama_model",
	openrouter: "openrouter_model",
	tabby: "tabby_model",
	togetherai: "togetherai_model",
	vllm: "vllm_model",
} as const;

export type CurrentConnectionInfoStatus = "ready" | "unavailable";

export interface CurrentConnectionInfoSnapshot {
	apiIconKey: string;
	apiLabel: string;
	hasActiveConnection: boolean;
	modelIconKey: string;
	modelLabel: string;
	status: CurrentConnectionInfoStatus;
	updatedAt: number;
}

export interface CurrentConnectionInfoStore {
	dispose(): void;
	getSnapshot(): CurrentConnectionInfoSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

function asTrimmedString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function resolveContextSafe(): StContextLike | null {
	try {
		return getStContext() as StContextLike;
	} catch {
		return null;
	}
}

function createSnapshot({
	apiIconKey = "",
	apiLabel = "",
	hasActiveConnection = false,
	modelIconKey = "",
	modelLabel = "",
	now,
	status = "unavailable",
}: {
	apiIconKey?: string;
	apiLabel?: string;
	hasActiveConnection?: boolean;
	modelIconKey?: string;
	modelLabel?: string;
	now: () => number;
	status?: CurrentConnectionInfoStatus;
}): CurrentConnectionInfoSnapshot {
	return {
		apiIconKey,
		apiLabel,
		hasActiveConnection,
		modelIconKey,
		modelLabel,
		status,
		updatedAt: now(),
	};
}

function isConnectedStatus(value: string): boolean {
	if (!value) {
		return false;
	}

	return value.toLowerCase() !== "no_connection";
}

function normalizeProviderIconKey(
	mainApi: string,
	context: StContextLike | null,
): string {
	if (mainApi === "openai") {
		const source = asTrimmedString(
			context?.chatCompletionSettings?.chat_completion_source,
		);
		return source || "openai";
	}

	if (mainApi === "textgenerationwebui") {
		const type = asTrimmedString(context?.textCompletionSettings?.type);
		if (!type) {
			return "textgenerationwebui";
		}

		return type === "ooba" ? "textgenerationwebui" : type;
	}

	return mainApi;
}

function resolveTextCompletionModel(
	settings: TextCompletionSettingsLike | null,
): string {
	const type = asTrimmedString(settings?.type);
	if (!type) {
		return "";
	}

	if (type === "ooba") {
		return asTrimmedString(settings?.custom_model);
	}

	if (type === "huggingface") {
		return "tgi";
	}

	const key =
		TEXTGEN_TYPE_MODEL_KEY_BY_TYPE[
			type as keyof typeof TEXTGEN_TYPE_MODEL_KEY_BY_TYPE
		];
	if (!key) {
		return "";
	}

	return asTrimmedString(settings?.[key]);
}

function resolveModelFromContext(context: StContextLike | null): string {
	const mainApi = asTrimmedString(context?.mainApi);

	if (
		mainApi === "openai" &&
		typeof context?.getChatCompletionModel === "function"
	) {
		try {
			return asTrimmedString(context.getChatCompletionModel());
		} catch {
			return "";
		}
	}

	if (mainApi === "textgenerationwebui") {
		const settings = isRecord(context?.textCompletionSettings)
			? (context?.textCompletionSettings as TextCompletionSettingsLike)
			: null;
		return resolveTextCompletionModel(settings);
	}

	return "";
}

function looksLikeResolvedModel(value: string): boolean {
	if (!value) {
		return false;
	}

	return !GENERIC_CONNECTED_STATUSES.has(value.toLowerCase());
}

function deriveOpenRouterVendor(modelLabel: string): string {
	const segments = modelLabel.split("/").filter(Boolean);
	if (segments.length === 0) {
		return "";
	}

	if (segments[0] === "openrouter") {
		return segments[1] === "auto" ? "" : (segments[1] ?? "");
	}

	return segments.length >= 2 ? segments[0] : "";
}

function readSelectOptionLabel({
	optionValue,
	selectId,
}: {
	optionValue: string;
	selectId: string;
}): string {
	if (typeof document === "undefined") {
		return "";
	}

	const select = document.getElementById(selectId);
	if (!(select instanceof HTMLSelectElement)) {
		return "";
	}

	const option = Array.from(select.options).find(
		(candidate) => candidate.value === optionValue,
	);

	return asTrimmedString(option?.textContent);
}

function formatProviderDisplayLabel(value: string): string {
	if (!value) {
		return "";
	}

	return value
		.split(/[_-]+/)
		.filter(Boolean)
		.map((segment) => {
			const [firstCharacter = "", ...rest] = segment;
			return `${firstCharacter.toUpperCase()}${rest.join("")}`;
		})
		.join(" ");
}

function resolveProviderLabel({
	apiIconKey,
	mainApi,
	modelLabel,
}: {
	apiIconKey: string;
	mainApi: string;
	modelLabel: string;
}): string {
	if (mainApi === "openai") {
		const baseLabel =
			readSelectOptionLabel({
				optionValue: apiIconKey,
				selectId: "chat_completion_source",
			}) || apiIconKey;

		if (apiIconKey === "openrouter") {
			const vendor = formatProviderDisplayLabel(
				deriveOpenRouterVendor(modelLabel),
			);
			return vendor ? `${baseLabel} / ${vendor}` : baseLabel;
		}

		return baseLabel;
	}

	if (apiIconKey === "openrouter") {
		const vendor = deriveOpenRouterVendor(modelLabel);
		return vendor ? `openrouter/${vendor}` : "openrouter";
	}

	return apiIconKey;
}

function resolveModelIconKey({
	apiIconKey,
	apiLabel,
	modelLabel,
}: {
	apiIconKey: string;
	apiLabel: string;
	modelLabel: string;
}): string {
	const haystack = `${apiLabel} ${modelLabel}`.toLowerCase();

	if (haystack.includes("claude") || haystack.includes("anthropic")) {
		return "claude";
	}

	if (haystack.includes("deepseek")) {
		return "deepseek";
	}

	if (
		haystack.includes("gpt") ||
		haystack.includes("chatgpt") ||
		/(^|\W)o[134](\W|$)/.test(haystack)
	) {
		return "openai";
	}

	if (
		haystack.includes("gemini") ||
		haystack.includes("google") ||
		apiIconKey === "vertexai"
	) {
		return "vertexai";
	}

	if (haystack.includes("grok") || haystack.includes("xai")) {
		return "xai";
	}

	if (haystack.includes("mistral") || haystack.includes("mixtral")) {
		return "mistralai";
	}

	if (haystack.includes("cohere") || haystack.includes("command")) {
		return "cohere";
	}

	if (haystack.includes("ai21") || haystack.includes("jamba")) {
		return "ai21";
	}

	if (haystack.includes("perplexity") || haystack.includes("sonar")) {
		return "perplexity";
	}

	return apiIconKey;
}

type SnapshotOptions = {
	fallbackModelLabel?: string;
	now?: () => number;
};

// Public ST adapter contract:
// - consumes getContext(), mainApi, onlineStatus, chatCompletionSettings,
//   textCompletionSettings, getChatCompletionModel(), eventSource/eventTypes,
//   and SlashCommandParser.commands.model when the live model is not exposed
//   synchronously
// - returns an unavailable snapshot on missing or invalid data so the feature
//   layer can hide the row without leaving stale connection details visible
function readSnapshotFromContext(
	context: StContextLike | null,
	{ fallbackModelLabel = "", now = Date.now }: SnapshotOptions = {},
): CurrentConnectionInfoSnapshot {
	const mainApi = asTrimmedString(context?.mainApi);
	const onlineStatus = asTrimmedString(context?.onlineStatus);

	if (!mainApi || !isConnectedStatus(onlineStatus)) {
		return createSnapshot({ now });
	}

	const modelFromContext = resolveModelFromContext(context);
	const modelLabel = modelFromContext || asTrimmedString(fallbackModelLabel);
	if (!looksLikeResolvedModel(modelLabel)) {
		return createSnapshot({ now });
	}

	const apiIconKey = normalizeProviderIconKey(mainApi, context);
	const apiLabel = resolveProviderLabel({
		apiIconKey,
		mainApi,
		modelLabel,
	});
	const modelIconKey = resolveModelIconKey({
		apiIconKey,
		apiLabel,
		modelLabel,
	});

	if (!apiIconKey || !apiLabel) {
		return createSnapshot({ now });
	}

	return createSnapshot({
		apiIconKey,
		apiLabel,
		hasActiveConnection: true,
		modelIconKey,
		modelLabel,
		now,
		status: "ready",
	});
}

async function resolveModelFromSlashCommand(
	context: StContextLike | null,
): Promise<string> {
	const callback = context?.SlashCommandParser?.commands?.model?.callback;
	if (typeof callback !== "function") {
		return "";
	}

	try {
		const result = await callback({ quiet: "true" }, "");
		return asTrimmedString(result);
	} catch {
		return "";
	}
}

function snapshotsEqual(
	previous: CurrentConnectionInfoSnapshot,
	next: CurrentConnectionInfoSnapshot,
): boolean {
	return (
		previous.apiIconKey === next.apiIconKey &&
		previous.apiLabel === next.apiLabel &&
		previous.hasActiveConnection === next.hasActiveConnection &&
		previous.modelIconKey === next.modelIconKey &&
		previous.modelLabel === next.modelLabel &&
		previous.status === next.status
	);
}

export function readCurrentConnectionInfoSnapshot(
	options: SnapshotOptions = {},
): CurrentConnectionInfoSnapshot {
	return readSnapshotFromContext(resolveContextSafe(), options);
}

export function createCurrentConnectionInfoStore({
	now = Date.now,
}: {
	now?: () => number;
} = {}): CurrentConnectionInfoStore {
	let snapshot = readCurrentConnectionInfoSnapshot({ now });
	let disposed = false;
	let refreshToken = 0;
	let isRefreshQueued = false;
	const listeners = new Set<Listener>();
	const context = resolveContextSafe();
	const eventSource = context?.eventSource;
	const eventTypes = context ? resolveEventTypes(context) : {};

	function emitIfChanged(nextSnapshot: CurrentConnectionInfoSnapshot) {
		if (snapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
		listeners.forEach((listener) => {
			listener();
		});
	}

	function refresh() {
		const activeContext = resolveContextSafe();
		const currentToken = ++refreshToken;
		const syncSnapshot = readSnapshotFromContext(activeContext, { now });
		emitIfChanged(syncSnapshot);

		if (syncSnapshot.hasActiveConnection) {
			return;
		}

		void resolveModelFromSlashCommand(activeContext).then((modelLabel) => {
			if (disposed || currentToken !== refreshToken || !modelLabel) {
				return;
			}

			const nextSnapshot = readSnapshotFromContext(activeContext, {
				fallbackModelLabel: modelLabel,
				now,
			});
			emitIfChanged(nextSnapshot);
		});
	}

	function queueRefresh() {
		if (disposed || isRefreshQueued) {
			return;
		}

		isRefreshQueued = true;
		queueMicrotaskSafe(() => {
			isRefreshQueued = false;
			refresh();
		});
	}

	const boundEvents = [
		eventTypes.APP_READY,
		eventTypes.CHATCOMPLETION_MODEL_CHANGED,
		eventTypes.CHATCOMPLETION_SOURCE_CHANGED,
		eventTypes.CONNECTION_PROFILE_LOADED,
		eventTypes.MAIN_API_CHANGED,
		eventTypes.ONLINE_STATUS_CHANGED,
		eventTypes.SETTINGS_UPDATED,
	].filter((eventName): eventName is string => typeof eventName === "string");

	if (eventSource) {
		for (const eventName of boundEvents) {
			eventSource.on(eventName, queueRefresh);
		}
	}

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			if (eventSource) {
				for (const eventName of boundEvents) {
					eventSource.removeListener(eventName, queueRefresh);
				}
			}
			listeners.clear();
		},
		getSnapshot() {
			return snapshot;
		},
		refresh,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
