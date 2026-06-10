import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	createChatContextUsageStore,
	type ChatContextUsageSnapshot,
} from "@/packages/core/st/chatContextUsage";

type Listener = (...args: unknown[]) => void | Promise<void>;

class EventSourceStub {
	private readonly listeners = new Map<string, Set<Listener>>();

	listenerCount(event: string): number {
		return this.listeners.get(event)?.size ?? 0;
	}

	emit(event: string, ...args: unknown[]) {
		const listeners = this.listeners.get(event);
		if (!listeners) {
			return;
		}

		for (const listener of listeners) {
			listener(...args);
		}
	}

	on(event: string, listener: Listener) {
		const listeners = this.listeners.get(event) ?? new Set<Listener>();
		listeners.add(listener);
		this.listeners.set(event, listeners);
	}

	removeListener(event: string, listener: Listener) {
		this.listeners.get(event)?.delete(listener);
	}
}

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

async function flushAsyncWork() {
	await vi.runAllTimersAsync();
	await Promise.resolve();
}

function renderNativePromptManagerFixture() {
	document.body.innerHTML = `
            <div id="completion_prompt_manager">
                <div class="completion_prompt_manager_header">
                    <div>Prompts</div>
                    <div>Total Tokens: 3,600</div>
                </div>
                <ul id="completion_prompt_manager_list">
                    <li class="completion_prompt_manager_prompt" data-pm-identifier="chatHistory">
                        <span class="prompt_manager_prompt_tokens" data-pm-tokens="1,800">1,800</span>
                    </li>
                    <li class="completion_prompt_manager_prompt" data-pm-identifier="worldInfoBefore">
                        <span class="prompt_manager_prompt_tokens" data-pm-tokens="100">100</span>
                    </li>
                    <li class="completion_prompt_manager_prompt" data-pm-identifier="worldInfoAfter">
                        <span class="prompt_manager_prompt_tokens" data-pm-tokens="150">150</span>
                    </li>
                    <li class="completion_prompt_manager_prompt" data-pm-identifier="charDescription">
                        <span class="prompt_manager_prompt_tokens" data-pm-tokens="300">300</span>
                    </li>
                    <li class="completion_prompt_manager_prompt" data-pm-identifier="charPersonality">
                        <span class="prompt_manager_prompt_tokens" data-pm-tokens="200">200</span>
                    </li>
                    <li class="completion_prompt_manager_prompt" data-pm-identifier="scenario">
                        <span class="prompt_manager_prompt_tokens" data-pm-tokens="250">250</span>
                    </li>
                    <li class="completion_prompt_manager_prompt" data-pm-identifier="personaDescription">
                        <span class="prompt_manager_prompt_tokens" data-pm-tokens="400">400</span>
                    </li>
                </ul>
            </div>
        `;
}

function renderLastInContextFixture() {
	const chatElement = document.createElement("div");
	chatElement.id = "chat";
	chatElement.innerHTML = `
            <div class="mes" mesid="0"></div>
            <div class="mes lastInContext" mesid="1"></div>
        `;
	document.body.appendChild(chatElement);
}

describe("chatContextUsage store", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		document.body.innerHTML = "";
		vi.useRealTimers();
	});

	test("returns an unsupported snapshot for non-openai providers", () => {
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
			},
			mainApi: "kobold",
		});

		const store = createChatContextUsageStore();

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			mainApi: "kobold",
			maxContextTokens: 8192,
			promptBudgetTokens: 7168,
			reservedResponseTokens: 1024,
			status: "unsupported",
			usagePercent: null,
			usedContextTokens: null,
			usedPromptTokens: null,
		});

		store.dispose();
	});

	test("hydrates initial native prompt manager DOM usage without a prompt-ready event", async () => {
		renderNativePromptManagerFixture();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource: new EventSourceStub(),
			eventTypes: {},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		expect(store.getSnapshot()).toMatchObject({
			status: "idle",
			usedPromptTokens: null,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			characterTokens: 750,
			chatHistoryTokens: 1800,
			hasPreparedContext: false,
			hasDetailedBreakdown: true,
			personaTokens: 400,
			status: "ready",
			usagePercent: 56.45,
			usedContextTokens: 4624,
			usedPromptTokens: 3600,
			worldInfoTokens: 250,
		});

		store.dispose();
	});

	test("hydrates prepared context state from the native lastInContext marker", async () => {
		renderNativePromptManagerFixture();
		renderLastInContextFixture();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource: new EventSourceStub(),
			eventTypes: {},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			hasPreparedContext: true,
			status: "ready",
			usedPromptTokens: 3600,
		});

		store.dispose();
	});

	test("keeps initial hydration idle when prompt manager usage is unavailable", async () => {
		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource: new EventSourceStub(),
			eventTypes: {},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			hasPreparedContext: false,
			status: "idle",
			usagePercent: null,
			usedContextTokens: null,
			usedPromptTokens: null,
		});

		store.dispose();
	});

	test("clears prepared context state immediately when the chat changes", async () => {
		renderNativePromptManagerFixture();
		renderLastInContextFixture();
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "CHAT_CHANGED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			hasPreparedContext: true,
			status: "ready",
		});

		eventSource.emit("CHAT_CHANGED");

		expect(store.getSnapshot()).toMatchObject({
			hasPreparedContext: false,
			status: "idle",
			usedPromptTokens: null,
		});

		store.dispose();
	});

	test("keeps existing prompt manager usage ready during settings reset hydration", async () => {
		renderNativePromptManagerFixture();
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				SETTINGS_UPDATED: "SETTINGS_UPDATED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			status: "ready",
			usedPromptTokens: 3600,
		});

		eventSource.emit("SETTINGS_UPDATED");

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			status: "ready",
			usagePercent: 56.45,
			usedContextTokens: 4624,
			usedPromptTokens: 3600,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			status: "ready",
			usagePercent: 56.45,
			usedContextTokens: 4624,
			usedPromptTokens: 3600,
		});

		store.dispose();
	});

	test("transitions from pending to ready using prompt manager counts when available", async () => {
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => {
				return {
					promptManager: {
						tokenHandler: {
							getCounts: () => ({
								charDescription: 400,
								charPersonality: 100,
								chatHistory: 2000,
								personaDescription: 500,
								scenario: 250,
								worldInfoAfter: 200,
								worldInfoBefore: 300,
							}),
						},
						tokenUsage: 5000,
					},
				};
			},
			settleMs: 5,
		});

		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
		});

		expect(store.getSnapshot().status).toBe("pending");

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			characterTokens: 750,
			chatHistoryTokens: 2000,
			hasDetailedBreakdown: true,
			mainApi: "openai",
			maxContextTokens: 8192,
			personaTokens: 500,
			promptBudgetTokens: 7168,
			reservedResponseTokens: 1024,
			status: "ready",
			usagePercent: 73.54,
			usedContextTokens: 6024,
			usedPromptTokens: 5000,
			worldInfoTokens: 500,
		});

		store.dispose();
	});

	test("falls back to tokenizer counting when prompt manager details are unavailable", async () => {
		const eventSource = new EventSourceStub();
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				json: async () => ({ count: 23 }),
				ok: true,
			})
			.mockResolvedValueOnce({
				json: async () => ({ count: 13 }),
				ok: true,
			});

		setSillyTavernContext({
			ToolManager: {
				tools: [
					{
						shouldRegister: () => true,
						toFunctionOpenAI: () => ({
							function: { name: "lookup" },
							type: "function",
						}),
					},
				],
			},
			chatCompletionSettings: {
				openai_max_context: 4096,
				openai_max_tokens: 512,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer token",
			}),
			getTokenizerModel: () => "gpt-4o",
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			fetchImpl,
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
		});

		expect(store.getSnapshot().status).toBe("pending");

		await flushAsyncWork();

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(store.getSnapshot()).toMatchObject({
			hasDetailedBreakdown: false,
			maxContextTokens: 4096,
			promptBudgetTokens: 3584,
			reservedResponseTokens: 512,
			status: "ready",
			usagePercent: 13.31,
			usedContextTokens: 545,
			usedPromptTokens: 33,
		});

		store.dispose();
	});

	test("keeps the previous ready snapshot when refresh fails after a successful read", async () => {
		const eventSource = new EventSourceStub();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				json: async () => ({ count: 23 }),
				ok: true,
			})
			.mockRejectedValueOnce(new Error("tokenizer failed"));

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 4096,
				openai_max_tokens: 512,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
			},
			getRequestHeaders: () => ({}),
			getTokenizerModel: () => "gpt-4o",
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			fetchImpl,
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
		});

		await flushAsyncWork();

		const readySnapshot = store.getSnapshot();
		expect(readySnapshot.status).toBe("ready");

		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "world", role: "user" }],
		});

		expect(store.getSnapshot()).toMatchObject({
			status: "ready",
			usedPromptTokens: readySnapshot.usedPromptTokens,
		});

		await flushAsyncWork();

		const retainedSnapshot = store.getSnapshot();
		expect(retainedSnapshot).toMatchObject({
			status: "ready",
			usedContextTokens: readySnapshot.usedContextTokens,
			usedPromptTokens: readySnapshot.usedPromptTokens,
		});
		expect(retainedSnapshot.updatedAt).toBe(readySnapshot.updatedAt);
		expect(warnSpy).toHaveBeenCalledTimes(1);

		store.dispose();
		warnSpy.mockRestore();
	});

	test("starts generation activity after commands", () => {
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore();

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "generating",
			status: "pending",
			usagePercent: null,
			usedContextTokens: null,
			usedPromptTokens: null,
		});

		store.dispose();
	});

	test("ignores non-user-visible generation activity", () => {
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore();

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, true);
		eventSource.emit("GENERATION_AFTER_COMMANDS", "quiet", {}, false);
		eventSource.emit("GENERATION_AFTER_COMMANDS", "impersonate", {}, false);

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			status: "idle",
			usagePercent: null,
			usedContextTokens: null,
			usedPromptTokens: null,
		});

		store.dispose();
	});

	test("marks first-time refresh failures unavailable", async () => {
		const eventSource = new EventSourceStub();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 4096,
				openai_max_tokens: 512,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
			},
			getRequestHeaders: () => ({}),
			getTokenizerModel: () => "gpt-4o",
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			fetchImpl: vi.fn().mockRejectedValue(new Error("tokenizer failed")),
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
		});

		expect(store.getSnapshot().status).toBe("pending");

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			status: "unavailable",
			usagePercent: null,
			usedContextTokens: null,
			usedPromptTokens: null,
		});
		expect(warnSpy).toHaveBeenCalledTimes(1);

		store.dispose();
		warnSpy.mockRestore();
	});

	test("marks generation endings without prompt data unavailable", () => {
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
				GENERATION_ENDED: "GENERATION_ENDED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore();

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);
		eventSource.emit("GENERATION_ENDED");

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "refreshing",
			status: "pending",
			usagePercent: null,
			usedContextTokens: null,
			usedPromptTokens: null,
		});

		store.dispose();
	});

	test("marks generation endings without prompt data unavailable after the grace period", async () => {
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
				GENERATION_ENDED: "GENERATION_ENDED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			generationSettleMs: 20,
			importOpenAiModule: async () => ({ promptManager: null }),
		});

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);
		eventSource.emit("GENERATION_ENDED");

		await vi.advanceTimersByTimeAsync(19);

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "refreshing",
			status: "pending",
			usagePercent: null,
			usedContextTokens: null,
			usedPromptTokens: null,
		});

		await vi.advanceTimersByTimeAsync(1);
		await Promise.resolve();

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			status: "unavailable",
			usagePercent: null,
			usedContextTokens: null,
			usedPromptTokens: null,
		});

		store.dispose();
	});

	test("refreshes usage after message-received events", async () => {
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
				MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => {
				return {
					promptManager: {
						tokenHandler: {
							getCounts: () => ({
								chatHistory: 1800,
							}),
						},
						tokenUsage: 3600,
					},
				};
			},
			settleMs: 5,
		});

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);
		eventSource.emit("MESSAGE_RECEIVED");

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "refreshing",
			status: "pending",
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			chatHistoryTokens: 1800,
			status: "ready",
			usagePercent: 56.45,
			usedContextTokens: 4624,
			usedPromptTokens: 3600,
		});

		store.dispose();
	});

	test("refreshes ready usage after generated message events", async () => {
		const eventSource = new EventSourceStub();
		let tokenUsage = 2400;

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
				MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => {
				return {
					promptManager: {
						tokenHandler: {
							getCounts: () => ({
								chatHistory: tokenUsage,
							}),
						},
						tokenUsage,
					},
				};
			},
			postGenerationRefreshMs: 20,
			settleMs: 5,
		});

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);
		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "generating",
			status: "ready",
			usedPromptTokens: 2400,
		});

		tokenUsage = 3600;
		eventSource.emit("MESSAGE_RECEIVED", 1, "normal");

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "generating",
			status: "ready",
			usedContextTokens: 3424,
			usedPromptTokens: 2400,
		});

		await vi.advanceTimersByTimeAsync(20);

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			chatHistoryTokens: 3600,
			status: "ready",
			usedPromptTokens: 3600,
		});

		store.dispose();
	});

	test("keeps ready usage stable during generated message event storms", async () => {
		renderNativePromptManagerFixture();
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				CHARACTER_MESSAGE_RENDERED: "CHARACTER_MESSAGE_RENDERED",
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
				GENERATION_ENDED: "GENERATION_ENDED",
				MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			generationSettleMs: 20,
			importOpenAiModule: async () => ({ promptManager: null }),
			postGenerationRefreshMs: 20,
			settleMs: 5,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			status: "ready",
			usedPromptTokens: 3600,
		});

		const observedSnapshots: ChatContextUsageSnapshot[] = [];
		const unsubscribe = store.subscribe(() => {
			observedSnapshots.push(store.getSnapshot());
		});

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);
		eventSource.emit("GENERATION_ENDED");
		eventSource.emit("MESSAGE_RECEIVED", 1, "normal");
		eventSource.emit("CHARACTER_MESSAGE_RENDERED", 1, "normal");

		expect(observedSnapshots).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(20);
		await Promise.resolve();

		expect(observedSnapshots).toHaveLength(0);
		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			status: "ready",
			usagePercent: 56.45,
			usedContextTokens: 4624,
			usedPromptTokens: 3600,
		});

		unsubscribe();
		store.dispose();
	});

	test("updates prepared context state without loading flicker when lastInContext appears", async () => {
		renderNativePromptManagerFixture();
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
				GENERATION_ENDED: "GENERATION_ENDED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			generationSettleMs: 20,
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			hasPreparedContext: false,
			status: "ready",
			usedPromptTokens: 3600,
		});

		const observedSnapshots: ChatContextUsageSnapshot[] = [];
		const unsubscribe = store.subscribe(() => {
			observedSnapshots.push(store.getSnapshot());
		});

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);
		renderLastInContextFixture();
		eventSource.emit("GENERATION_ENDED");

		expect(
			observedSnapshots.some(
				(item) =>
					item.status === "pending" ||
					item.activityStatus === "refreshing",
			),
		).toBe(false);

		await vi.advanceTimersByTimeAsync(20);
		await Promise.resolve();

		expect(observedSnapshots.length).toBeGreaterThanOrEqual(1);
		expect(observedSnapshots.at(-1)).toMatchObject({
			activityStatus: "idle",
			hasPreparedContext: true,
			status: "ready",
			usedPromptTokens: 3600,
		});
		unsubscribe();
		store.dispose();
	});

	test("does not notify subscribers when prompt manager usage is semantically unchanged", async () => {
		renderNativePromptManagerFixture();
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			status: "ready",
			usedPromptTokens: 3600,
		});

		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);

		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
		});

		await flushAsyncWork();

		expect(listener).not.toHaveBeenCalled();
		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			status: "ready",
			usedPromptTokens: 3600,
		});

		unsubscribe();
		store.dispose();
	});

	test("uses armed dry-run prompt-ready events for post-generation refreshes", async () => {
		const eventSource = new EventSourceStub();
		let tokenUsage = 1800;

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
				GENERATION_ENDED: "GENERATION_ENDED",
				MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => {
				return {
					promptManager: {
						tokenHandler: {
							getCounts: () => ({
								chatHistory: tokenUsage,
							}),
						},
						tokenUsage,
					},
				};
			},
			postGenerationRefreshMs: 100,
			settleMs: 5,
		});

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);
		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
		});

		await flushAsyncWork();

		tokenUsage = 2800;
		eventSource.emit("GENERATION_ENDED");
		eventSource.emit("MESSAGE_RECEIVED", 1, "normal");
		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
			dryRun: true,
		});

		await vi.advanceTimersByTimeAsync(5);

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			chatHistoryTokens: 2800,
			status: "ready",
			usedPromptTokens: 2800,
		});

		store.dispose();
	});

	test("ignores dry-run prompt-ready events without an armed post-generation refresh", async () => {
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
			dryRun: true,
		});

		await flushAsyncWork();

		expect(store.getSnapshot()).toMatchObject({
			status: "idle",
			usagePercent: null,
			usedContextTokens: null,
			usedPromptTokens: null,
		});

		store.dispose();
	});

	test("uses native prompt manager DOM values when tokenizer fallback fails", async () => {
		const eventSource = new EventSourceStub();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		renderNativePromptManagerFixture();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
			},
			getRequestHeaders: () => ({}),
			getTokenizerModel: () => "gemini",
			mainApi: "openai",
		});

		const fetchImpl = vi
			.fn()
			.mockRejectedValue(new Error("tokenizer failed"));
		const store = createChatContextUsageStore({
			fetchImpl,
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
			chat: [{ content: "hello", role: "user" }],
		});

		await flushAsyncWork();

		expect(fetchImpl).not.toHaveBeenCalled();
		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			characterTokens: 750,
			chatHistoryTokens: 1800,
			hasDetailedBreakdown: true,
			personaTokens: 400,
			status: "ready",
			usagePercent: 56.45,
			usedContextTokens: 4624,
			usedPromptTokens: 3600,
			worldInfoTokens: 250,
		});
		expect(warnSpy).not.toHaveBeenCalled();

		store.dispose();
		warnSpy.mockRestore();
	});

	test("refreshes from native prompt manager values when generation ends before message events", async () => {
		const eventSource = new EventSourceStub();

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
				GENERATION_ENDED: "GENERATION_ENDED",
			},
			mainApi: "openai",
		});

		const store = createChatContextUsageStore({
			generationSettleMs: 20,
			importOpenAiModule: async () => ({ promptManager: null }),
			settleMs: 5,
		});

		await flushAsyncWork();

		eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);
		renderNativePromptManagerFixture();
		eventSource.emit("GENERATION_ENDED");

		await vi.advanceTimersByTimeAsync(20);

		expect(store.getSnapshot()).toMatchObject({
			activityStatus: "idle",
			status: "ready",
			usagePercent: 56.45,
			usedContextTokens: 4624,
			usedPromptTokens: 3600,
		});

		store.dispose();
	});

	test("removes context usage event listeners on dispose", () => {
		const eventSource = new EventSourceStub();
		const eventTypes = {
			CHARACTER_MESSAGE_RENDERED: "CHARACTER_MESSAGE_RENDERED",
			CHAT_CHANGED: "CHAT_CHANGED",
			CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
			CHAT_LOADED: "CHAT_LOADED",
			GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
			GENERATION_ENDED: "GENERATION_ENDED",
			GENERATION_STOPPED: "GENERATION_STOPPED",
			MAIN_API_CHANGED: "MAIN_API_CHANGED",
			MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
			SETTINGS_UPDATED: "SETTINGS_UPDATED",
		};

		setSillyTavernContext({
			chatCompletionSettings: {
				openai_max_context: 8192,
				openai_max_tokens: 1024,
			},
			eventSource,
			eventTypes,
			mainApi: "openai",
		});

		const store = createChatContextUsageStore();

		for (const eventName of Object.values(eventTypes)) {
			expect(eventSource.listenerCount(eventName)).toBe(1);
		}

		store.dispose();

		for (const eventName of Object.values(eventTypes)) {
			expect(eventSource.listenerCount(eventName)).toBe(0);
		}
	});
});
