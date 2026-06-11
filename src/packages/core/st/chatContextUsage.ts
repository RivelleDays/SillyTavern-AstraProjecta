import { EXTENSION_LOG_PREFIX } from "@/packages/core/constants";
import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type Listener = () => void;

type ChatContextUsageBudget = {
	mainApi: string;
	maxContextTokens: number;
	promptBudgetTokens: number;
	reservedResponseTokens: number;
};

type ChatContextUsageDetailedBreakdown = {
	chatHistoryTokens: number | null;
	worldInfoTokens: number | null;
	characterTokens: number | null;
	personaTokens: number | null;
	otherPromptTokens: number | null;
	hasDetailedBreakdown: boolean;
};

type HeadersLike = Headers | Record<string, string>;

type ChatCompletionSettingsLike = Record<string, unknown>;

type StContextLike = Record<string, unknown> & {
	ToolManager?: unknown;
	chatCompletionSettings?: ChatCompletionSettingsLike;
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	getRequestHeaders?: () => HeadersLike | unknown;
	getTokenizerModel?: () => string;
	mainApi?: unknown;
};

type PromptManagerLike = {
	tokenHandler?: {
		getCounts?: () => unknown;
	};
	tokenUsage?: unknown;
};

type OpenAiModuleLike = {
	promptManager?: PromptManagerLike | null;
};

type PromptManagerUsageSnapshot = ChatContextUsageDetailedBreakdown & {
	usedPromptTokens: number;
};

type TokenizerCountResponse = {
	count?: number;
	token_count?: number;
};

type ChatCompletionPromptReadyEvent = {
	chat?: unknown;
	dryRun?: boolean;
};

type ChatContextUsageRefreshSource = "live" | "post-generation";

export type ChatContextUsageActivityStatus =
	| "idle"
	| "generating"
	| "refreshing";

type ToolDefinitionLike = {
	shouldRegister?: () => boolean | Promise<boolean>;
	toFunctionOpenAI?: () => unknown;
};

type ToolManagerLike = {
	registerFunctionToolsOpenAI?: (
		data: Record<string, unknown>,
	) => Promise<void>;
	tools?: ToolDefinitionLike[];
};

export type ChatContextUsageStatus =
	| "idle"
	| "pending"
	| "ready"
	| "unsupported"
	| "stale"
	| "unavailable";

export interface ChatContextUsageSnapshot extends ChatContextUsageDetailedBreakdown {
	activityStatus: ChatContextUsageActivityStatus;
	hasPreparedContext: boolean;
	mainApi: string;
	maxContextTokens: number;
	promptBudgetTokens: number;
	reservedResponseTokens: number;
	status: ChatContextUsageStatus;
	updatedAt: number;
	usagePercent: number | null;
	usedContextTokens: number | null;
	usedPromptTokens: number | null;
}

export interface ChatContextUsageStore {
	dispose(): void;
	getSnapshot(): ChatContextUsageSnapshot;
	subscribe(listener: Listener): () => void;
}

export interface ChatContextUsageStoreDependencies {
	documentRef?: Document;
	fetchImpl?: typeof fetch;
	generationSettleMs?: number;
	importOpenAiModule?: () => Promise<OpenAiModuleLike | null>;
	now?: () => number;
	postGenerationRefreshMs?: number;
	settleMs?: number;
}

const OPENAI_MAIN_API = "openai";
const OPENAI_MODULE_SPECIFIER = "/scripts/openai.js";
const OPENAI_TOKENIZER_COUNT_ENDPOINT = "/api/tokenizers/openai/count";
const ASSISTANT_PRIMER_TOKENS = 3;
const PROMPT_READY_SETTLE_MS = 120;
const POST_GENERATION_REFRESH_MS = 1300;
const GENERATION_SETTLE_MS = 1300;
const IGNORED_GENERATION_TYPES = new Set(["quiet", "impersonate"]);
const TOKENIZERS_WITHOUT_OPENAI_PADDING = new Set([
	"claude",
	"llama",
	"llama3",
	"mistral",
	"yi",
	"gemma",
	"jamba",
	"qwen2",
	"command-r",
	"command-a",
	"nemo",
	"deepseek",
]);

let openAiModulePromise: Promise<OpenAiModuleLike | null> | null = null;

function resolveContextSafe(): StContextLike | null {
	try {
		return getStContext() as StContextLike;
	} catch {
		return null;
	}
}

function createEmptyDetailedBreakdown(): ChatContextUsageDetailedBreakdown {
	return {
		characterTokens: null,
		chatHistoryTokens: null,
		hasDetailedBreakdown: false,
		otherPromptTokens: null,
		personaTokens: null,
		worldInfoTokens: null,
	};
}

function toNonNegativeInteger(value: unknown): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return 0;
	}

	return Math.floor(parsed);
}

function parseNonNegativeInteger(value: unknown): number | null {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}

	return Math.floor(parsed);
}

function parseTokenInteger(value: unknown): number | null {
	if (typeof value === "number") {
		return parseNonNegativeInteger(value);
	}

	if (typeof value !== "string") {
		return null;
	}

	const match = value.match(/\d[\d,\s]*/);
	if (!match) {
		return null;
	}

	const normalized = match[0].replace(/[,\s]/g, "");
	if (normalized.length === 0) {
		return null;
	}

	return parseNonNegativeInteger(normalized);
}

function calculateOtherPromptTokens(
	usedPromptTokens: number,
	knownPromptTokens: Array<number | null>,
): number {
	const knownPromptTotal = knownPromptTokens.reduce<number>(
		(total, tokenCount) => total + (tokenCount ?? 0),
		0,
	);

	return Math.max(0, usedPromptTokens - knownPromptTotal);
}

function readHasPreparedContext(documentRef: Document | null): boolean {
	return Boolean(documentRef?.querySelector("#chat .mes.lastInContext"));
}

function createBudget(context: StContextLike | null): ChatContextUsageBudget {
	const settings = isRecord(context?.chatCompletionSettings)
		? context.chatCompletionSettings
		: null;
	const mainApi =
		typeof context?.mainApi === "string" ? context.mainApi.trim() : "";
	const maxContextTokens = toNonNegativeInteger(settings?.openai_max_context);
	const reservedResponseTokens = toNonNegativeInteger(
		settings?.openai_max_tokens,
	);
	const promptBudgetTokens = Math.max(
		0,
		maxContextTokens - reservedResponseTokens,
	);

	return {
		mainApi,
		maxContextTokens,
		promptBudgetTokens,
		reservedResponseTokens,
	};
}

function createBudgetSnapshot(
	budget: ChatContextUsageBudget,
	status: "idle" | "pending" | "unsupported" | "unavailable",
	now: () => number,
	activityStatus: ChatContextUsageActivityStatus = "idle",
	hasPreparedContext = false,
): ChatContextUsageSnapshot {
	return {
		...budget,
		...createEmptyDetailedBreakdown(),
		activityStatus,
		hasPreparedContext,
		status,
		updatedAt: now(),
		usagePercent: null,
		usedContextTokens: null,
		usedPromptTokens: null,
	};
}

function createReadySnapshot(
	budget: ChatContextUsageBudget,
	usedPromptTokens: number,
	detailedBreakdown: ChatContextUsageDetailedBreakdown,
	now: () => number,
	activityStatus: ChatContextUsageActivityStatus = "idle",
	hasPreparedContext = false,
): ChatContextUsageSnapshot {
	const usedContextTokens = Math.min(
		budget.maxContextTokens,
		usedPromptTokens + budget.reservedResponseTokens,
	);
	const usagePercent =
		budget.maxContextTokens > 0
			? Number(
					(
						(usedContextTokens / budget.maxContextTokens) *
						100
					).toFixed(2),
				)
			: 0;

	return {
		...budget,
		...detailedBreakdown,
		activityStatus,
		hasPreparedContext,
		status: "ready",
		updatedAt: now(),
		usagePercent,
		usedContextTokens,
		usedPromptTokens,
	};
}

function hasContextUsageValues(snapshot: ChatContextUsageSnapshot): boolean {
	return (
		snapshot.usedContextTokens != null &&
		snapshot.usedPromptTokens != null &&
		snapshot.usagePercent != null
	);
}

function areSnapshotsSemanticallyEqual(
	currentSnapshot: ChatContextUsageSnapshot,
	nextSnapshot: ChatContextUsageSnapshot,
): boolean {
	return (
		currentSnapshot.activityStatus === nextSnapshot.activityStatus &&
		currentSnapshot.characterTokens === nextSnapshot.characterTokens &&
		currentSnapshot.chatHistoryTokens === nextSnapshot.chatHistoryTokens &&
		currentSnapshot.hasDetailedBreakdown ===
			nextSnapshot.hasDetailedBreakdown &&
		currentSnapshot.hasPreparedContext ===
			nextSnapshot.hasPreparedContext &&
		currentSnapshot.mainApi === nextSnapshot.mainApi &&
		currentSnapshot.maxContextTokens === nextSnapshot.maxContextTokens &&
		currentSnapshot.otherPromptTokens === nextSnapshot.otherPromptTokens &&
		currentSnapshot.personaTokens === nextSnapshot.personaTokens &&
		currentSnapshot.promptBudgetTokens ===
			nextSnapshot.promptBudgetTokens &&
		currentSnapshot.reservedResponseTokens ===
			nextSnapshot.reservedResponseTokens &&
		currentSnapshot.status === nextSnapshot.status &&
		currentSnapshot.usagePercent === nextSnapshot.usagePercent &&
		currentSnapshot.usedContextTokens ===
			nextSnapshot.usedContextTokens &&
		currentSnapshot.usedPromptTokens === nextSnapshot.usedPromptTokens &&
		currentSnapshot.worldInfoTokens === nextSnapshot.worldInfoTokens
	);
}

function createSnapshotFromExistingUsage({
	activityStatus,
	budget,
	now,
	snapshot,
	status,
	hasPreparedContext,
}: {
	activityStatus: ChatContextUsageActivityStatus;
	budget: ChatContextUsageBudget;
	hasPreparedContext: boolean;
	now: () => number;
	snapshot: ChatContextUsageSnapshot;
	status: "ready" | "stale";
}): ChatContextUsageSnapshot | null {
	if (!hasContextUsageValues(snapshot) || snapshot.usedPromptTokens == null) {
		return null;
	}

	return {
		...createReadySnapshot(
			budget,
			snapshot.usedPromptTokens,
			{
				characterTokens: snapshot.characterTokens,
				chatHistoryTokens: snapshot.chatHistoryTokens,
				hasDetailedBreakdown: snapshot.hasDetailedBreakdown,
				otherPromptTokens: snapshot.otherPromptTokens,
				personaTokens: snapshot.personaTokens,
				worldInfoTokens: snapshot.worldInfoTokens,
			},
			now,
			activityStatus,
			hasPreparedContext,
		),
		status,
	};
}

function resolveStatus(mainApi: string): "idle" | "unsupported" {
	return mainApi === OPENAI_MAIN_API ? "idle" : "unsupported";
}

async function defaultImportOpenAiModule(): Promise<OpenAiModuleLike | null> {
	if (!openAiModulePromise) {
		openAiModulePromise = import(
			/* webpackIgnore: true */ OPENAI_MODULE_SPECIFIER
		)
			.then((module) => module as OpenAiModuleLike)
			.catch(() => {
				openAiModulePromise = null;
				return null;
			});
	}

	return openAiModulePromise;
}

function readCountValue(counts: Record<string, unknown>, key: string): number {
	return parseNonNegativeInteger(counts[key]) ?? 0;
}

async function readPromptManagerUsageSnapshot({
	importOpenAiModule,
}: {
	importOpenAiModule: () => Promise<OpenAiModuleLike | null>;
}): Promise<PromptManagerUsageSnapshot | null> {
	const openAiModule = await importOpenAiModule();
	const promptManager = openAiModule?.promptManager;

	if (!promptManager || typeof promptManager !== "object") {
		return null;
	}

	if (typeof promptManager.tokenHandler?.getCounts !== "function") {
		return null;
	}

	try {
		const usedPromptTokens = parseNonNegativeInteger(
			promptManager.tokenUsage,
		);
		const rawCounts = promptManager.tokenHandler.getCounts();

		if (usedPromptTokens == null || !isRecord(rawCounts)) {
			return null;
		}

		const characterTokens =
			readCountValue(rawCounts, "charDescription") +
			readCountValue(rawCounts, "charPersonality") +
			readCountValue(rawCounts, "scenario");
		const chatHistoryTokens = readCountValue(rawCounts, "chatHistory");
		const personaTokens = readCountValue(rawCounts, "personaDescription");
		const worldInfoTokens =
			readCountValue(rawCounts, "worldInfoBefore") +
			readCountValue(rawCounts, "worldInfoAfter");

		return {
			characterTokens,
			chatHistoryTokens,
			hasDetailedBreakdown: true,
			otherPromptTokens: calculateOtherPromptTokens(usedPromptTokens, [
				characterTokens,
				chatHistoryTokens,
				personaTokens,
				worldInfoTokens,
			]),
			personaTokens,
			usedPromptTokens,
			worldInfoTokens,
		};
	} catch {
		return null;
	}
}

function readNativePromptManagerCount(
	counts: Map<string, number>,
	key: string,
): number {
	return counts.get(key) ?? 0;
}

function readNativePromptManagerUsageSnapshot(
	documentRef: Document | null,
): PromptManagerUsageSnapshot | null {
	if (!documentRef) {
		return null;
	}

	const header = documentRef.querySelector(
		".completion_prompt_manager_header",
	);
	const headerTokenUsage = parseTokenInteger(header?.textContent ?? null);
	const promptManagerList = documentRef.querySelector(
		"#completion_prompt_manager_list",
	);
	const counts = new Map<string, number>();
	let rowTokenTotal = 0;

	for (const row of Array.from(
		promptManagerList?.querySelectorAll("[data-pm-identifier]") ?? [],
	)) {
		if (!(row instanceof HTMLElement)) {
			continue;
		}

		const identifier = row.getAttribute("data-pm-identifier")?.trim();
		if (!identifier) {
			continue;
		}

		const tokensElement = row.querySelector(
			".prompt_manager_prompt_tokens",
		);
		const tokenValue = parseTokenInteger(
			tokensElement?.getAttribute("data-pm-tokens") ??
				tokensElement?.textContent ??
				null,
		);

		if (tokenValue == null) {
			continue;
		}

		counts.set(identifier, tokenValue);
		rowTokenTotal += tokenValue;
	}

	const usedPromptTokens =
		headerTokenUsage ?? (counts.size > 0 ? rowTokenTotal : null);
	if (usedPromptTokens == null) {
		return null;
	}

	const characterTokens =
		readNativePromptManagerCount(counts, "charDescription") +
		readNativePromptManagerCount(counts, "charPersonality") +
		readNativePromptManagerCount(counts, "scenario");
	const chatHistoryTokens = readNativePromptManagerCount(
		counts,
		"chatHistory",
	);
	const hasDetailedBreakdown = counts.size > 0;
	const personaTokens = readNativePromptManagerCount(
		counts,
		"personaDescription",
	);
	const worldInfoTokens =
		readNativePromptManagerCount(counts, "worldInfoBefore") +
		readNativePromptManagerCount(counts, "worldInfoAfter");

	return {
		characterTokens,
		chatHistoryTokens,
		hasDetailedBreakdown,
		otherPromptTokens: hasDetailedBreakdown
			? calculateOtherPromptTokens(usedPromptTokens, [
					characterTokens,
					chatHistoryTokens,
					personaTokens,
					worldInfoTokens,
				])
			: null,
		personaTokens,
		usedPromptTokens,
		worldInfoTokens,
	};
}

function choosePromptManagerUsageSnapshot({
	lastSuccessfulSnapshot,
	nativePromptManagerUsage,
	promptManagerUsage,
	source,
}: {
	lastSuccessfulSnapshot: ChatContextUsageSnapshot | null;
	nativePromptManagerUsage: PromptManagerUsageSnapshot | null;
	promptManagerUsage: PromptManagerUsageSnapshot | null;
	source: ChatContextUsageRefreshSource;
}): PromptManagerUsageSnapshot | null {
	if (!promptManagerUsage) {
		return nativePromptManagerUsage;
	}

	if (!nativePromptManagerUsage) {
		return promptManagerUsage;
	}

	if (
		source === "post-generation" &&
		lastSuccessfulSnapshot?.usedPromptTokens ===
			promptManagerUsage.usedPromptTokens &&
		nativePromptManagerUsage.usedPromptTokens !==
			lastSuccessfulSnapshot.usedPromptTokens
	) {
		return nativePromptManagerUsage;
	}

	return promptManagerUsage;
}

function normalizeChatMessage(message: unknown): Record<string, unknown> {
	if (isRecord(message)) {
		return message;
	}

	return {
		content: String(message ?? ""),
		role: "user",
	};
}

function resolveTokenizerModel(context: StContextLike): string {
	if (typeof context.getTokenizerModel !== "function") {
		throw new Error("Tokenizer model resolver is unavailable.");
	}

	const model = context.getTokenizerModel();
	if (typeof model !== "string" || model.trim().length === 0) {
		throw new Error("Tokenizer model is invalid.");
	}

	return model;
}

function resolveRequestHeaders(context: StContextLike): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (typeof context.getRequestHeaders !== "function") {
		return headers;
	}

	const rawHeaders = context.getRequestHeaders();
	if (rawHeaders instanceof Headers) {
		rawHeaders.forEach((value, key) => {
			headers[key] = value;
		});
		return headers;
	}

	if (!isRecord(rawHeaders)) {
		return headers;
	}

	for (const [key, value] of Object.entries(rawHeaders)) {
		if (typeof value === "string") {
			headers[key] = value;
		}
	}

	return headers;
}

async function countTokensForMessage({
	cache,
	fetchImpl,
	headers,
	message,
	tokenizerModel,
}: {
	cache: Map<string, number>;
	fetchImpl: typeof fetch;
	headers: Record<string, string>;
	message: Record<string, unknown>;
	tokenizerModel: string;
}): Promise<number> {
	const cacheKey = `${tokenizerModel}:${JSON.stringify(message)}`;
	const cached = cache.get(cacheKey);
	if (cached != null) {
		return cached;
	}

	const endpoint = `${OPENAI_TOKENIZER_COUNT_ENDPOINT}?model=${encodeURIComponent(
		tokenizerModel,
	)}`;
	const response = await fetchImpl(endpoint, {
		body: JSON.stringify([message]),
		headers,
		method: "POST",
	});

	if (!response.ok) {
		throw new Error(`Tokenizer endpoint failed with ${response.status}.`);
	}

	const data = (await response.json()) as TokenizerCountResponse;
	const rawCount = data.token_count ?? data.count;
	const numericCount = typeof rawCount === "number" ? rawCount : Number.NaN;

	if (!Number.isFinite(numericCount)) {
		throw new Error("Tokenizer endpoint returned an invalid token count.");
	}

	const normalizedCount = TOKENIZERS_WITHOUT_OPENAI_PADDING.has(
		tokenizerModel,
	)
		? numericCount
		: numericCount - ASSISTANT_PRIMER_TOKENS;
	const tokens = Math.max(0, Math.floor(normalizedCount));
	cache.set(cacheKey, tokens);
	return tokens;
}

async function countTokensForChatMessages({
	cache,
	chatMessages,
	fetchImpl,
	headers,
	tokenizerModel,
}: {
	cache: Map<string, number>;
	chatMessages: unknown[];
	fetchImpl: typeof fetch;
	headers: Record<string, string>;
	tokenizerModel: string;
}): Promise<number> {
	let total = 0;

	for (const message of chatMessages) {
		total += await countTokensForMessage({
			cache,
			fetchImpl,
			headers,
			message: normalizeChatMessage(message),
			tokenizerModel,
		});
	}

	return total;
}

async function buildToolPayload(
	context: StContextLike,
): Promise<Record<string, unknown> | null> {
	const toolManager = context.ToolManager as ToolManagerLike | undefined;
	if (!toolManager) {
		return null;
	}

	const toolData: Record<string, unknown> = {};

	if (typeof toolManager.registerFunctionToolsOpenAI === "function") {
		await toolManager.registerFunctionToolsOpenAI(toolData);
	} else {
		const tools: unknown[] = [];
		for (const tool of Array.isArray(toolManager.tools)
			? toolManager.tools
			: []) {
			if (typeof tool?.toFunctionOpenAI !== "function") {
				continue;
			}

			const shouldRegister =
				typeof tool.shouldRegister === "function"
					? await tool.shouldRegister()
					: true;
			if (!shouldRegister) {
				continue;
			}

			tools.push(tool.toFunctionOpenAI());
		}

		if (tools.length > 0) {
			toolData.tools = tools;
			toolData.tool_choice = "auto";
		}
	}

	return Array.isArray(toolData.tools) && toolData.tools.length > 0
		? toolData
		: null;
}

async function countToolReserveTokens({
	cache,
	context,
	fetchImpl,
	headers,
	tokenizerModel,
}: {
	cache: Map<string, number>;
	context: StContextLike;
	fetchImpl: typeof fetch;
	headers: Record<string, string>;
	tokenizerModel: string;
}): Promise<number> {
	const toolPayload = await buildToolPayload(context);
	if (!toolPayload) {
		return 0;
	}

	return countTokensForMessage({
		cache,
		fetchImpl,
		headers,
		message: {
			content: JSON.stringify(toolPayload),
			role: "user",
		},
		tokenizerModel,
	});
}

async function createFallbackReadySnapshot({
	budget,
	chatMessages,
	context,
	fetchImpl,
	now,
	tokenCountCache,
}: {
	budget: ChatContextUsageBudget;
	chatMessages: unknown[];
	context: StContextLike;
	fetchImpl: typeof fetch;
	now: () => number;
	tokenCountCache: Map<string, number>;
}): Promise<ChatContextUsageSnapshot> {
	const tokenizerModel = resolveTokenizerModel(context);
	const headers = resolveRequestHeaders(context);
	const countedChatTokens = await countTokensForChatMessages({
		cache: tokenCountCache,
		chatMessages,
		fetchImpl,
		headers,
		tokenizerModel,
	});
	const toolReserveTokens = await countToolReserveTokens({
		cache: tokenCountCache,
		context,
		fetchImpl,
		headers,
		tokenizerModel,
	});

	const usedPromptTokens =
		countedChatTokens + ASSISTANT_PRIMER_TOKENS + toolReserveTokens;
	return createReadySnapshot(
		budget,
		usedPromptTokens,
		createEmptyDetailedBreakdown(),
		now,
	);
}

export function createChatContextUsageStore(
	dependencies: ChatContextUsageStoreDependencies = {},
): ChatContextUsageStore {
	const listeners = new Set<Listener>();
	const tokenCountCache = new Map<string, number>();
	const now = dependencies.now ?? Date.now;
	const settleMs = dependencies.settleMs ?? PROMPT_READY_SETTLE_MS;
	const postGenerationRefreshMs =
		dependencies.postGenerationRefreshMs ?? POST_GENERATION_REFRESH_MS;
	const generationSettleMs =
		dependencies.generationSettleMs ?? GENERATION_SETTLE_MS;
	const fetchImpl =
		dependencies.fetchImpl ??
		(typeof globalThis.fetch === "function"
			? globalThis.fetch.bind(globalThis)
			: () => {
					throw new Error("fetch is unavailable.");
				});
	const importOpenAiModule =
		dependencies.importOpenAiModule ?? defaultImportOpenAiModule;
	const documentRef =
		dependencies.documentRef ??
		(typeof document === "undefined" ? null : document);
	const readCurrentPreparedContext = () =>
		readHasPreparedContext(documentRef);
	const initialContext = resolveContextSafe();
	const eventSource = isRecord(initialContext?.eventSource)
		? (initialContext.eventSource as EventSourceLike)
		: null;
	const eventTypes = initialContext ? resolveEventTypes(initialContext) : {};

	let disposed = false;
	let revision = 0;
	let lastSuccessfulSnapshot: ChatContextUsageSnapshot | null = null;
	let initialHydrationTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingPromptReadyTimer: ReturnType<typeof setTimeout> | null = null;
	let postGenerationRefreshTimer: ReturnType<typeof setTimeout> | null = null;
	let generationSettleTimer: ReturnType<typeof setTimeout> | null = null;
	let postGenerationRefreshRevision: number | null = null;
	let awaitingGeneratedMessage = false;
	const initialBudget = createBudget(initialContext);
	let snapshot = createBudgetSnapshot(
		initialBudget,
		resolveStatus(initialBudget.mainApi),
		now,
		"idle",
		readCurrentPreparedContext(),
	);

	const notify = () => {
		for (const listener of listeners) {
			listener();
		}
	};

	const setSnapshot = (nextSnapshot: ChatContextUsageSnapshot): boolean => {
		if (areSnapshotsSemanticallyEqual(snapshot, nextSnapshot)) {
			snapshot = {
				...nextSnapshot,
				updatedAt: snapshot.updatedAt,
			};
			return false;
		}

		snapshot = nextSnapshot;
		notify();
		return true;
	};

	const publishReadySnapshot = (nextSnapshot: ChatContextUsageSnapshot) => {
		lastSuccessfulSnapshot = {
			...nextSnapshot,
			activityStatus: "idle",
		};
		setSnapshot(nextSnapshot);
	};

	const clearPendingPromptReadyTimer = () => {
		if (pendingPromptReadyTimer != null) {
			clearTimeout(pendingPromptReadyTimer);
			pendingPromptReadyTimer = null;
		}
	};

	const clearInitialHydrationTimer = () => {
		if (initialHydrationTimer != null) {
			clearTimeout(initialHydrationTimer);
			initialHydrationTimer = null;
		}
	};

	const clearPostGenerationRefreshTimer = () => {
		if (postGenerationRefreshTimer != null) {
			clearTimeout(postGenerationRefreshTimer);
			postGenerationRefreshTimer = null;
		}
	};

	const clearGenerationSettleTimer = () => {
		if (generationSettleTimer != null) {
			clearTimeout(generationSettleTimer);
			generationSettleTimer = null;
		}
	};

	const clearRefreshTimers = () => {
		clearInitialHydrationTimer();
		clearPendingPromptReadyTimer();
		clearPostGenerationRefreshTimer();
		clearGenerationSettleTimer();
	};

	const clearPostGenerationRefreshState = () => {
		clearPostGenerationRefreshTimer();
		clearGenerationSettleTimer();
		postGenerationRefreshRevision = null;
		awaitingGeneratedMessage = false;
	};

	const readResolvedPromptManagerUsageSnapshot = async (
		source: ChatContextUsageRefreshSource,
	): Promise<PromptManagerUsageSnapshot | null> => {
		const promptManagerUsage = await readPromptManagerUsageSnapshot({
			importOpenAiModule,
		});
		const nativePromptManagerUsage =
			readNativePromptManagerUsageSnapshot(documentRef);

		return choosePromptManagerUsageSnapshot({
			lastSuccessfulSnapshot,
			nativePromptManagerUsage,
			promptManagerUsage,
			source,
		});
	};

	const createReadyPromptManagerSnapshot = ({
		activityStatus,
		budget,
		promptManagerUsage,
	}: {
		activityStatus: ChatContextUsageActivityStatus;
		budget: ChatContextUsageBudget;
		promptManagerUsage: PromptManagerUsageSnapshot;
	}): ChatContextUsageSnapshot => {
		return createReadySnapshot(
			budget,
			promptManagerUsage.usedPromptTokens,
			promptManagerUsage,
			now,
			activityStatus,
			readCurrentPreparedContext(),
		);
	};

	const hydrateExistingPromptManagerUsage = async (
		requestRevision: number,
	) => {
		if (disposed) {
			return;
		}

		const context = resolveContextSafe();
		const budget = createBudget(context);
		if (!context || budget.mainApi !== OPENAI_MAIN_API) {
			return;
		}

		try {
			const resolvedPromptManagerUsage =
				await readResolvedPromptManagerUsageSnapshot("live");

			if (
				!resolvedPromptManagerUsage ||
				disposed ||
				requestRevision !== revision
			) {
				return;
			}

			publishReadySnapshot(
				createReadyPromptManagerSnapshot({
					activityStatus: "idle",
					budget,
					promptManagerUsage: resolvedPromptManagerUsage,
				}),
			);
		} catch {
			// Initial hydration is opportunistic and should not show an error state.
		}
	};

	const scheduleInitialHydration = () => {
		const context = resolveContextSafe();
		const budget = createBudget(context);
		if (!context || budget.mainApi !== OPENAI_MAIN_API) {
			return;
		}

		const requestRevision = revision;
		clearInitialHydrationTimer();
		initialHydrationTimer = setTimeout(() => {
			initialHydrationTimer = null;
			void hydrateExistingPromptManagerUsage(requestRevision);
		}, settleMs);
	};

	const resetBudgetSnapshot = ({
		forcePreparedContext,
		preserveExistingUsage = false,
	}: {
		forcePreparedContext?: boolean;
		preserveExistingUsage?: boolean;
	} = {}) => {
		if (disposed) {
			return;
		}

		const previousSnapshot = snapshot;
		clearRefreshTimers();
		postGenerationRefreshRevision = null;
		awaitingGeneratedMessage = false;
		revision += 1;

		const context = resolveContextSafe();
		const budget = createBudget(context);
		const hasPreparedContext =
			forcePreparedContext ?? readCurrentPreparedContext();
		const retainedSnapshot =
			preserveExistingUsage && budget.mainApi === OPENAI_MAIN_API
				? createSnapshotFromExistingUsage({
						activityStatus: "idle",
						budget,
						hasPreparedContext,
						now,
						snapshot: previousSnapshot,
						status: "ready",
					})
				: null;

		if (retainedSnapshot) {
			lastSuccessfulSnapshot = {
				...retainedSnapshot,
				activityStatus: "idle",
			};
			setSnapshot(retainedSnapshot);
			scheduleInitialHydration();
			return;
		}

		lastSuccessfulSnapshot = null;
		setSnapshot(
			createBudgetSnapshot(
				budget,
				resolveStatus(budget.mainApi),
				now,
				"idle",
				hasPreparedContext,
			),
		);
		scheduleInitialHydration();
	};

	const setUnavailableSnapshot = (
		budget: ChatContextUsageBudget,
		activityStatus: ChatContextUsageActivityStatus = "idle",
	) => {
		if (lastSuccessfulSnapshot) {
			const hasPreparedContext = readCurrentPreparedContext();
			const retainedSnapshot = createSnapshotFromExistingUsage({
				activityStatus,
				budget,
				hasPreparedContext,
				now,
				snapshot: lastSuccessfulSnapshot,
				status: "ready",
			});

			if (retainedSnapshot) {
				setSnapshot(retainedSnapshot);
				return;
			}

			return;
		}

		setSnapshot(
			createBudgetSnapshot(
				budget,
				"unavailable",
				now,
				activityStatus,
				readCurrentPreparedContext(),
			),
		);
	};

	const beginActivitySnapshot = (
		activityStatus: ChatContextUsageActivityStatus,
	) => {
		if (disposed) {
			return null;
		}

		const context = resolveContextSafe();
		const budget = createBudget(context);
		if (!context || budget.mainApi !== OPENAI_MAIN_API) {
			return null;
		}

		const requestRevision = ++revision;
		const hasPreparedContext = readCurrentPreparedContext();
		if (hasContextUsageValues(snapshot)) {
			const retainedSnapshot = createSnapshotFromExistingUsage({
				activityStatus: snapshot.activityStatus,
				budget,
				hasPreparedContext,
				now,
				snapshot,
				status: "ready",
			});

			if (retainedSnapshot) {
				setSnapshot(retainedSnapshot);
			}

			return {
				requestRevision,
			};
		}

		if (activityStatus === "idle") {
			setSnapshot(
				createBudgetSnapshot(
					budget,
					"pending",
					now,
					"idle",
					hasPreparedContext,
				),
			);
			return {
				requestRevision,
			};
		}

		const existingUsageSnapshot = createSnapshotFromExistingUsage({
			activityStatus,
			budget,
			hasPreparedContext,
			now,
			snapshot,
			status: "ready",
		});

		if (existingUsageSnapshot) {
			setSnapshot(existingUsageSnapshot);
		} else if (lastSuccessfulSnapshot) {
			const retainedSnapshot = createSnapshotFromExistingUsage({
				activityStatus,
				budget,
				hasPreparedContext,
				now,
				snapshot: lastSuccessfulSnapshot,
				status: "ready",
			});

			setSnapshot(
				retainedSnapshot ??
					createBudgetSnapshot(
						budget,
						"pending",
						now,
						activityStatus,
						hasPreparedContext,
					),
			);
		} else {
			setSnapshot(
				createBudgetSnapshot(
					budget,
					"pending",
					now,
					activityStatus,
					hasPreparedContext,
				),
			);
		}

		return {
			requestRevision,
		};
	};

	const setActivityStatus = (
		activityStatus: ChatContextUsageActivityStatus,
	) => {
		if (disposed || snapshot.activityStatus === activityStatus) {
			return;
		}

		const context = resolveContextSafe();
		const budget = createBudget(context);
		if (!context || budget.mainApi !== OPENAI_MAIN_API) {
			return;
		}

		const hasPreparedContext = readCurrentPreparedContext();
		if (hasContextUsageValues(snapshot)) {
			const retainedSnapshot = createSnapshotFromExistingUsage({
				activityStatus: snapshot.activityStatus,
				budget,
				hasPreparedContext,
				now,
				snapshot,
				status: "ready",
			});

			if (retainedSnapshot) {
				setSnapshot(retainedSnapshot);
			}

			return;
		}

		const existingUsageSnapshot = createSnapshotFromExistingUsage({
			activityStatus,
			budget,
			hasPreparedContext,
			now,
			snapshot,
			status: "ready",
		});

		if (existingUsageSnapshot) {
			setSnapshot(existingUsageSnapshot);
			return;
		}

		if (activityStatus === "idle") {
			setUnavailableSnapshot(budget, "idle");
			return;
		}

		setSnapshot(
			createBudgetSnapshot(
				budget,
				"pending",
				now,
				activityStatus,
				hasPreparedContext,
			),
		);
	};

	const resolvePromptReady = async (
		requestRevision: number,
		eventData?: ChatCompletionPromptReadyEvent,
		source: ChatContextUsageRefreshSource = "live",
	) => {
		if (disposed) {
			return;
		}

		const context = resolveContextSafe();
		const budget = createBudget(context);
		if (!context || budget.mainApi !== OPENAI_MAIN_API) {
			if (source === "post-generation") {
				clearPostGenerationRefreshState();
			}
			return;
		}

		const finishPostGenerationRefresh = () => {
			if (source === "post-generation") {
				clearPostGenerationRefreshState();
			}
		};

		const chatMessages = Array.isArray(eventData?.chat)
			? eventData.chat
			: null;
		const resolveCompletionActivityStatus =
			(): ChatContextUsageActivityStatus => {
				if (source === "post-generation") {
					return "idle";
				}

				return snapshot.activityStatus === "generating" ||
					snapshot.activityStatus === "refreshing"
					? snapshot.activityStatus
					: "idle";
			};

		try {
			const resolvedPromptManagerUsage =
				await readResolvedPromptManagerUsageSnapshot(source);

			if (resolvedPromptManagerUsage) {
				if (disposed || requestRevision !== revision) {
					return;
				}

				publishReadySnapshot(
					createReadyPromptManagerSnapshot({
						activityStatus: resolveCompletionActivityStatus(),
						budget,
						promptManagerUsage: resolvedPromptManagerUsage,
					}),
				);
				finishPostGenerationRefresh();
				return;
			}

			if (!chatMessages) {
				if (disposed || requestRevision !== revision) {
					return;
				}

				if (lastSuccessfulSnapshot) {
					const retainedSnapshot = createSnapshotFromExistingUsage({
						activityStatus: resolveCompletionActivityStatus(),
						budget,
						hasPreparedContext: readCurrentPreparedContext(),
						now,
						snapshot: lastSuccessfulSnapshot,
						status: "ready",
					});

					if (retainedSnapshot) {
						setSnapshot(retainedSnapshot);
					}

					finishPostGenerationRefresh();
					return;
				}

				setUnavailableSnapshot(
					budget,
					resolveCompletionActivityStatus(),
				);
				finishPostGenerationRefresh();
				return;
			}

			const fallbackSnapshot = await createFallbackReadySnapshot({
				budget,
				chatMessages,
				context,
				fetchImpl,
				now,
				tokenCountCache,
			});

			if (disposed || requestRevision !== revision) {
				return;
			}

			publishReadySnapshot({
				...fallbackSnapshot,
				activityStatus: resolveCompletionActivityStatus(),
				hasPreparedContext: readCurrentPreparedContext(),
			});
			finishPostGenerationRefresh();
		} catch (error) {
			console.warn(
				`${EXTENSION_LOG_PREFIX} Failed to update chat context usage snapshot.`,
				error,
			);

			if (disposed || requestRevision !== revision) {
				return;
			}

			if (lastSuccessfulSnapshot) {
				const retainedSnapshot = createSnapshotFromExistingUsage({
					activityStatus: resolveCompletionActivityStatus(),
					budget,
					hasPreparedContext: readCurrentPreparedContext(),
					now,
					snapshot: lastSuccessfulSnapshot,
					status: "ready",
				});

				if (retainedSnapshot) {
					setSnapshot(retainedSnapshot);
				}

				finishPostGenerationRefresh();
				return;
			}

			setUnavailableSnapshot(budget, resolveCompletionActivityStatus());
			finishPostGenerationRefresh();
		}
	};

	const resolveGenerationSettleFallback = async (
		requestRevision: number,
		budget: ChatContextUsageBudget,
	) => {
		if (
			disposed ||
			requestRevision !== revision ||
			pendingPromptReadyTimer != null ||
			postGenerationRefreshTimer != null
		) {
			return;
		}

		const hadUsableSnapshot = hasContextUsageValues(snapshot);

		try {
			const resolvedPromptManagerUsage =
				await readResolvedPromptManagerUsageSnapshot(
					"post-generation",
				);

			if (disposed || requestRevision !== revision) {
				return;
			}

			if (resolvedPromptManagerUsage) {
				publishReadySnapshot(
					createReadyPromptManagerSnapshot({
						activityStatus: "idle",
						budget,
						promptManagerUsage: resolvedPromptManagerUsage,
					}),
				);
				awaitingGeneratedMessage = false;
				return;
			}
		} catch {
			// Keep the existing unavailable fallback when probing fails.
		}

		if (disposed || requestRevision !== revision) {
			return;
		}

		if (hadUsableSnapshot || hasContextUsageValues(snapshot)) {
			const usableSnapshot = hasContextUsageValues(snapshot)
				? snapshot
				: lastSuccessfulSnapshot;
			if (usableSnapshot) {
				const retainedSnapshot = createSnapshotFromExistingUsage({
					activityStatus: "idle",
					budget,
					hasPreparedContext: readCurrentPreparedContext(),
					now,
					snapshot: usableSnapshot,
					status: "ready",
				});

				if (retainedSnapshot) {
					setSnapshot(retainedSnapshot);
				}
			}

			awaitingGeneratedMessage = false;
			return;
		}

		setUnavailableSnapshot(budget, "idle");
		awaitingGeneratedMessage = false;
	};

	const schedulePromptReadyResolution = ({
		eventData,
		requestRevision,
		source = "live",
	}: {
		eventData?: ChatCompletionPromptReadyEvent;
		requestRevision: number;
		source?: ChatContextUsageRefreshSource;
	}) => {
		clearPendingPromptReadyTimer();
		pendingPromptReadyTimer = setTimeout(() => {
			pendingPromptReadyTimer = null;
			void resolvePromptReady(requestRevision, eventData, source);
		}, settleMs);
	};

	const schedulePostGenerationRefreshFallback = (requestRevision: number) => {
		clearPostGenerationRefreshTimer();
		postGenerationRefreshTimer = setTimeout(() => {
			postGenerationRefreshTimer = null;
			if (disposed || requestRevision !== revision) {
				return;
			}

			postGenerationRefreshRevision = null;
			void resolvePromptReady(
				requestRevision,
				undefined,
				"post-generation",
			);
		}, postGenerationRefreshMs);
	};

	const handlePromptReady = (eventData?: ChatCompletionPromptReadyEvent) => {
		if (disposed) {
			return;
		}

		if (eventData?.dryRun === true) {
			if (postGenerationRefreshRevision == null) {
				return;
			}

			const requestRevision = postGenerationRefreshRevision;
			postGenerationRefreshRevision = null;
			clearPostGenerationRefreshTimer();
			schedulePromptReadyResolution({
				eventData,
				requestRevision,
				source: "post-generation",
			});
			return;
		}

		const pendingRequest = beginActivitySnapshot(
			snapshot.activityStatus === "generating" ||
				snapshot.activityStatus === "refreshing"
				? snapshot.activityStatus
				: "idle",
		);
		if (!pendingRequest) {
			return;
		}

		schedulePromptReadyResolution({
			eventData,
			requestRevision: pendingRequest.requestRevision,
		});
	};

	const handleGenerationActivityStarted = (
		type?: unknown,
		options?: unknown,
		dryRun?: unknown,
	) => {
		const generationType =
			typeof type === "string" ? type.toLowerCase() : "";
		const isDryRun =
			dryRun === true || (isRecord(options) && options.dryRun === true);

		if (
			disposed ||
			isDryRun ||
			IGNORED_GENERATION_TYPES.has(generationType)
		) {
			return;
		}

		clearRefreshTimers();
		postGenerationRefreshRevision = null;
		awaitingGeneratedMessage = true;
		beginActivitySnapshot("generating");
	};

	const handleGenerationSettled = () => {
		if (
			disposed ||
			(!awaitingGeneratedMessage &&
				snapshot.activityStatus !== "generating")
		) {
			return;
		}

		const context = resolveContextSafe();
		const budget = createBudget(context);
		if (!context || budget.mainApi !== OPENAI_MAIN_API) {
			return;
		}

		setActivityStatus("refreshing");
		const requestRevision = revision;
		clearGenerationSettleTimer();
		generationSettleTimer = setTimeout(() => {
			generationSettleTimer = null;
			void resolveGenerationSettleFallback(requestRevision, budget);
		}, generationSettleMs);
	};

	const handlePostGenerationRefresh = () => {
		if (disposed) {
			return;
		}

		if (
			!awaitingGeneratedMessage &&
			postGenerationRefreshRevision == null &&
			snapshot.activityStatus !== "generating" &&
			snapshot.activityStatus !== "refreshing"
		) {
			return;
		}

		clearPendingPromptReadyTimer();
		const pendingRequest =
			postGenerationRefreshRevision == null
				? beginActivitySnapshot("refreshing")
				: { requestRevision: postGenerationRefreshRevision };
		if (!pendingRequest) {
			return;
		}

		awaitingGeneratedMessage = false;
		postGenerationRefreshRevision = pendingRequest.requestRevision;
		clearGenerationSettleTimer();
		schedulePostGenerationRefreshFallback(pendingRequest.requestRevision);
	};

	const settingsUpdatedEvent = eventTypes.SETTINGS_UPDATED;
	const mainApiChangedEvent = eventTypes.MAIN_API_CHANGED;
	const chatChangedEvent = eventTypes.CHAT_CHANGED;
	const chatLoadedEvent = eventTypes.CHAT_LOADED;
	const promptReadyEvent = eventTypes.CHAT_COMPLETION_PROMPT_READY;
	const generationAfterCommandsEvent = eventTypes.GENERATION_AFTER_COMMANDS;
	const generationEndedEvent = eventTypes.GENERATION_ENDED;
	const generationStoppedEvent = eventTypes.GENERATION_STOPPED;
	const messageReceivedEvent = eventTypes.MESSAGE_RECEIVED;
	const characterMessageRenderedEvent = eventTypes.CHARACTER_MESSAGE_RENDERED;
	const handleSettingsUpdated = () => {
		resetBudgetSnapshot({ preserveExistingUsage: true });
	};
	const handleContextReset = () => {
		resetBudgetSnapshot({ forcePreparedContext: false });
	};
	const handlePromptReadyEvent = (...args: unknown[]) => {
		handlePromptReady(
			args[0] as ChatCompletionPromptReadyEvent | undefined,
		);
	};

	if (eventSource && typeof settingsUpdatedEvent === "string") {
		eventSource.on(settingsUpdatedEvent, handleSettingsUpdated);
	}

	if (eventSource && typeof mainApiChangedEvent === "string") {
		eventSource.on(mainApiChangedEvent, handleContextReset);
	}

	if (eventSource && typeof chatChangedEvent === "string") {
		eventSource.on(chatChangedEvent, handleContextReset);
	}

	if (eventSource && typeof chatLoadedEvent === "string") {
		eventSource.on(chatLoadedEvent, handleContextReset);
	}

	if (eventSource && typeof promptReadyEvent === "string") {
		eventSource.on(promptReadyEvent, handlePromptReadyEvent);
	}

	if (eventSource && typeof generationAfterCommandsEvent === "string") {
		eventSource.on(
			generationAfterCommandsEvent,
			handleGenerationActivityStarted,
		);
	}

	if (eventSource && typeof generationEndedEvent === "string") {
		eventSource.on(generationEndedEvent, handleGenerationSettled);
	}

	if (eventSource && typeof generationStoppedEvent === "string") {
		eventSource.on(generationStoppedEvent, handleGenerationSettled);
	}

	if (eventSource && typeof messageReceivedEvent === "string") {
		eventSource.on(messageReceivedEvent, handlePostGenerationRefresh);
	}

	if (eventSource && typeof characterMessageRenderedEvent === "string") {
		eventSource.on(
			characterMessageRenderedEvent,
			handlePostGenerationRefresh,
		);
	}

	scheduleInitialHydration();

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			listeners.clear();
			clearRefreshTimers();
			postGenerationRefreshRevision = null;
			awaitingGeneratedMessage = false;

			if (eventSource && typeof settingsUpdatedEvent === "string") {
				eventSource.removeListener(
					settingsUpdatedEvent,
					handleSettingsUpdated,
				);
			}

			if (eventSource && typeof mainApiChangedEvent === "string") {
				eventSource.removeListener(
					mainApiChangedEvent,
					handleContextReset,
				);
			}

			if (eventSource && typeof chatChangedEvent === "string") {
				eventSource.removeListener(
					chatChangedEvent,
					handleContextReset,
				);
			}

			if (eventSource && typeof chatLoadedEvent === "string") {
				eventSource.removeListener(
					chatLoadedEvent,
					handleContextReset,
				);
			}

			if (eventSource && typeof promptReadyEvent === "string") {
				eventSource.removeListener(
					promptReadyEvent,
					handlePromptReadyEvent,
				);
			}

			if (
				eventSource &&
				typeof generationAfterCommandsEvent === "string"
			) {
				eventSource.removeListener(
					generationAfterCommandsEvent,
					handleGenerationActivityStarted,
				);
			}

			if (eventSource && typeof generationEndedEvent === "string") {
				eventSource.removeListener(
					generationEndedEvent,
					handleGenerationSettled,
				);
			}

			if (eventSource && typeof generationStoppedEvent === "string") {
				eventSource.removeListener(
					generationStoppedEvent,
					handleGenerationSettled,
				);
			}

			if (eventSource && typeof messageReceivedEvent === "string") {
				eventSource.removeListener(
					messageReceivedEvent,
					handlePostGenerationRefresh,
				);
			}

			if (
				eventSource &&
				typeof characterMessageRenderedEvent === "string"
			) {
				eventSource.removeListener(
					characterMessageRenderedEvent,
					handlePostGenerationRefresh,
				);
			}
		},
		getSnapshot() {
			return snapshot;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}
