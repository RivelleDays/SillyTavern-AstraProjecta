import { afterEach, describe, expect, test, vi } from "vitest";

import {
	createCurrentConnectionInfoStore,
	readCurrentConnectionInfoSnapshot,
} from "@/packages/core/st/currentConnectionInfo";

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function setChatCompletionSourceOptions(
	options: Array<{ label: string; value: string }>,
) {
	document.body.innerHTML = `
        <select id="chat_completion_source">
            ${options
				.map(
					({ label, value }) =>
						`<option value="${value}">${label}</option>`,
				)
				.join("")}
        </select>
    `;
}

async function flushMicrotasks() {
	await Promise.resolve();
	await Promise.resolve();
}

class FakeEventSource {
	private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

	emit(event: string, ...args: unknown[]) {
		for (const listener of this.listeners.get(event) ?? []) {
			listener(...args);
		}
	}

	on(event: string, listener: (...args: unknown[]) => void) {
		const listeners = this.listeners.get(event) ?? new Set();
		listeners.add(listener);
		this.listeners.set(event, listeners);
	}

	removeListener(event: string, listener: (...args: unknown[]) => void) {
		this.listeners.get(event)?.delete(listener);
	}
}

describe("currentConnectionInfo", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
		document.body.innerHTML = "";
	});

	test("derives a friendly OpenRouter provider label from the active chat-completion source and model", () => {
		setChatCompletionSourceOptions([
			{ label: "OpenRouter", value: "openrouter" },
		]);

		setSillyTavernContext({
			chatCompletionSettings: {
				chat_completion_source: "openrouter",
			},
			getChatCompletionModel: () => "anthropic/claude-3.7-sonnet",
			mainApi: "openai",
			onlineStatus: "Connected",
		});

		expect(readCurrentConnectionInfoSnapshot()).toMatchObject({
			apiIconKey: "openrouter",
			apiLabel: "OpenRouter / Anthropic",
			hasActiveConnection: true,
			modelIconKey: "claude",
			modelLabel: "anthropic/claude-3.7-sonnet",
			status: "ready",
		});
	});

	test("uses the SillyTavern provider option text for makersuite while keeping the raw icon key", () => {
		setChatCompletionSourceOptions([
			{ label: "Google AI Studio", value: "makersuite" },
		]);

		setSillyTavernContext({
			chatCompletionSettings: {
				chat_completion_source: "makersuite",
			},
			getChatCompletionModel: () => "gemini-2.5-flash",
			mainApi: "openai",
			onlineStatus: "Connected",
		});

		expect(readCurrentConnectionInfoSnapshot()).toMatchObject({
			apiIconKey: "makersuite",
			apiLabel: "Google AI Studio",
			hasActiveConnection: true,
			modelIconKey: "vertexai",
			modelLabel: "gemini-2.5-flash",
			status: "ready",
		});
	});

	test("falls back to the raw provider key when the SillyTavern source option text is unavailable", () => {
		setSillyTavernContext({
			chatCompletionSettings: {
				chat_completion_source: "makersuite",
			},
			getChatCompletionModel: () => "gemini-2.5-flash",
			mainApi: "openai",
			onlineStatus: "Connected",
		});

		expect(readCurrentConnectionInfoSnapshot()).toMatchObject({
			apiIconKey: "makersuite",
			apiLabel: "makersuite",
			hasActiveConnection: true,
			modelIconKey: "vertexai",
			modelLabel: "gemini-2.5-flash",
			status: "ready",
		});
	});

	test("normalizes ooba to the textgenerationwebui icon key while keeping the active model", () => {
		setSillyTavernContext({
			mainApi: "textgenerationwebui",
			onlineStatus: "Connected",
			textCompletionSettings: {
				custom_model: "Midnight-Miqu-70B-v1",
				type: "ooba",
			},
		});

		expect(readCurrentConnectionInfoSnapshot()).toMatchObject({
			apiIconKey: "textgenerationwebui",
			apiLabel: "textgenerationwebui",
			hasActiveConnection: true,
			modelIconKey: "textgenerationwebui",
			modelLabel: "Midnight-Miqu-70B-v1",
			status: "ready",
		});
	});

	test("falls back to the slash-command model callback when sync settings do not expose the live model", async () => {
		const modelCallback = vi.fn().mockResolvedValue("DeepSeek-R1-Q8");

		setSillyTavernContext({
			mainApi: "textgenerationwebui",
			onlineStatus: "Connected",
			SlashCommandParser: {
				commands: {
					model: {
						callback: modelCallback,
					},
				},
			},
			textCompletionSettings: {
				type: "koboldcpp",
			},
		});

		const store = createCurrentConnectionInfoStore();
		store.refresh();
		await flushMicrotasks();

		expect(modelCallback).toHaveBeenCalledWith({ quiet: "true" }, "");
		expect(store.getSnapshot()).toMatchObject({
			apiIconKey: "koboldcpp",
			apiLabel: "koboldcpp",
			hasActiveConnection: true,
			modelIconKey: "deepseek",
			modelLabel: "DeepSeek-R1-Q8",
			status: "ready",
		});

		store.dispose();
	});

	test("refreshes from SillyTavern events when the active connection changes", async () => {
		const eventSource = new FakeEventSource();
		const context = {
			chatCompletionSettings: {
				chat_completion_source: "openai",
			},
			eventSource,
			eventTypes: {
				ONLINE_STATUS_CHANGED: "online_status_changed",
			},
			getChatCompletionModel: () => "gpt-4.1",
			mainApi: "openai",
			onlineStatus: "Connected",
		};

		setSillyTavernContext(context);

		const store = createCurrentConnectionInfoStore();
		const listener = vi.fn();
		store.subscribe(listener);

		context.chatCompletionSettings.chat_completion_source = "claude";
		context.getChatCompletionModel = () => "claude-sonnet-4-20250514";

		eventSource.emit("online_status_changed", "claude-sonnet-4-20250514");
		await flushMicrotasks();

		expect(store.getSnapshot()).toMatchObject({
			apiIconKey: "claude",
			apiLabel: "claude",
			hasActiveConnection: true,
			modelIconKey: "claude",
			modelLabel: "claude-sonnet-4-20250514",
			status: "ready",
		});
		expect(listener).toHaveBeenCalled();

		store.dispose();
	});
});
