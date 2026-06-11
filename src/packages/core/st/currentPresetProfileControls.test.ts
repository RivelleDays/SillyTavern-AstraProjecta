import { afterEach, describe, expect, test, vi } from "vitest";

import {
	createCurrentPresetProfileControlsStore,
	readCurrentPresetProfileControlsSnapshot,
} from "@/packages/core/st/currentPresetProfileControls";

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

async function flushMicrotasks() {
	await Promise.resolve();
	await Promise.resolve();
	await Promise.resolve();
}

async function waitForAssertion(assertion: () => void, attempts = 20) {
	let lastError: unknown;

	for (let index = 0; index < attempts; index += 1) {
		try {
			assertion();
			return;
		} catch (error) {
			lastError = error;
			await flushMicrotasks();
		}
	}

	throw lastError;
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

function createConnectedProfileContext({
	disabledExtensions = [],
	selectedProfile = "profile-1",
}: {
	disabledExtensions?: string[];
	selectedProfile?: string;
} = {}) {
	const eventSource = new FakeEventSource();
	const liveValues = {
		api: "openrouter",
		model: "openrouter/anthropic/claude-3.7-sonnet",
		preset: "Storyteller",
	};
	const context = {
		chatCompletionSettings: {
			chat_completion_source: liveValues.api,
			preset_settings_openai: liveValues.preset,
		},
		eventSource,
		eventTypes: {
			APP_READY: "app_ready",
			CHATCOMPLETION_SOURCE_CHANGED: "chatcompletion_source_changed",
			CONNECTION_PROFILE_CREATED: "connection_profile_created",
			CONNECTION_PROFILE_DELETED: "connection_profile_deleted",
			CONNECTION_PROFILE_LOADED: "connection_profile_loaded",
			CONNECTION_PROFILE_UPDATED: "connection_profile_updated",
			MAIN_API_CHANGED: "main_api_changed",
			PRESET_CHANGED: "preset_changed",
			PRESET_DELETED: "preset_deleted",
			PRESET_RENAMED: "preset_renamed",
			SETTINGS_UPDATED: "settings_updated",
		},
		extensionSettings: {
			connectionManager: {
				profiles: [
					{
						api: "openrouter",
						id: "profile-1",
						mode: "cc",
						model: "openrouter/anthropic/claude-3.7-sonnet",
						name: "Story Mode",
						preset: "Storyteller",
					},
				],
				selectedProfile,
			},
			disabledExtensions,
		},
		getChatCompletionModel: () => liveValues.model,
		mainApi: "openai",
		SlashCommandParser: {
			commands: {
				api: {
					callback: vi.fn(async () => liveValues.api),
				},
				model: {
					callback: vi.fn(async () => liveValues.model),
				},
				preset: {
					callback: vi.fn(async () => liveValues.preset),
				},
				profile: {
					callback: vi.fn(
						async (
							_args: Record<string, string>,
							value: string,
						) => {
							if (value === "Story Mode") {
								liveValues.api = "openrouter";
								liveValues.model =
									"openrouter/anthropic/claude-3.7-sonnet";
								liveValues.preset = "Storyteller";
								context.chatCompletionSettings.chat_completion_source =
									liveValues.api;
								context.chatCompletionSettings.preset_settings_openai =
									liveValues.preset;
								context.extensionSettings.connectionManager.selectedProfile =
									"profile-1";
							}

							eventSource.emit(
								"connection_profile_loaded",
								value,
							);
							return value;
						},
					),
				},
			},
		},
	};

	return {
		context,
		eventSource,
		liveValues,
	};
}

describe("currentPresetProfileControls", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
		document.body.innerHTML = "";
	});

	test("reads ready connection profiles and resolves the selected profile as attached when live settings still match it", async () => {
		const { context } = createConnectedProfileContext();
		setSillyTavernContext(context);

		const store = createCurrentPresetProfileControlsStore();
		await waitForAssertion(() => {
			expect(store.getSnapshot()).toMatchObject({
				connectionProfiles: {
					authority: "attached",
					detachedReason: null,
					options: [
						{ label: "<None>", value: "" },
						{ label: "Story Mode", value: "profile-1" },
					],
					selectedProfileId: "profile-1",
					selectedProfileName: "Story Mode",
					status: "ready",
				},
			});
		});

		store.dispose();
	});

	test("reads the current preset from sync SillyTavern settings instead of calling /preset with an empty value", async () => {
		const { context, eventSource, liveValues } =
			createConnectedProfileContext();
		setSillyTavernContext(context);

		const presetCallback =
			context.SlashCommandParser.commands.preset.callback;
		const store = createCurrentPresetProfileControlsStore();

		await waitForAssertion(() => {
			expect(store.getSnapshot().connectionProfiles.authority).toBe(
				"attached",
			);
		});

		expect(presetCallback).not.toHaveBeenCalled();

		liveValues.preset = "Default";
		context.chatCompletionSettings.preset_settings_openai = "Default";
		eventSource.emit("preset_changed", {
			apiId: "openai",
			name: "Default",
		});

		await waitForAssertion(() => {
			expect(store.getSnapshot().connectionProfiles.authority).toBe(
				"detached",
			);
		});

		expect(presetCallback).not.toHaveBeenCalled();

		store.dispose();
	});

	test("does not probe slash commands when settings updates refresh selected profile authority", async () => {
		const { context, eventSource, liveValues } =
			createConnectedProfileContext();
		setSillyTavernContext(context);

		let emittedSettingsUpdates = 0;
		const emitSettingsUpdated = () => {
			if (emittedSettingsUpdates >= 2) {
				return;
			}

			emittedSettingsUpdates += 1;
			eventSource.emit("settings_updated");
		};
		const apiCallback = vi.fn(async () => {
			emitSettingsUpdated();
			return liveValues.api;
		});
		const modelCallback = vi.fn(async () => {
			emitSettingsUpdated();
			return liveValues.model;
		});

		context.SlashCommandParser.commands.api.callback = apiCallback;
		context.SlashCommandParser.commands.model.callback = modelCallback;

		const store = createCurrentPresetProfileControlsStore();
		await waitForAssertion(() => {
			expect(store.getSnapshot().connectionProfiles.authority).toBe(
				"attached",
			);
		});

		expect(apiCallback).not.toHaveBeenCalled();
		expect(modelCallback).not.toHaveBeenCalled();

		eventSource.emit("settings_updated");
		await flushMicrotasks();

		expect(apiCallback).not.toHaveBeenCalled();
		expect(modelCallback).not.toHaveBeenCalled();

		store.dispose();
	});

	test("marks the selected connection profile as detached when a native preset change drifts the live settings away from it", async () => {
		const { context, eventSource, liveValues } =
			createConnectedProfileContext();
		setSillyTavernContext(context);

		const store = createCurrentPresetProfileControlsStore();
		const listener = vi.fn();
		store.subscribe(listener);

		await waitForAssertion(() => {
			expect(store.getSnapshot().connectionProfiles.authority).toBe(
				"attached",
			);
		});

		liveValues.preset = "Default";
		context.chatCompletionSettings.preset_settings_openai = "Default";
		eventSource.emit("preset_changed", {
			apiId: "openai",
			name: "Default",
		});

		await waitForAssertion(() => {
			expect(store.getSnapshot()).toMatchObject({
				connectionProfiles: {
					authority: "detached",
					detachedReason: "settings-changed",
					selectedProfileId: "profile-1",
					selectedProfileName: "Story Mode",
				},
			});
		});
		expect(listener).toHaveBeenCalled();

		store.dispose();
	});

	test("reattaches the detached profile state after selecting a real connection profile again", async () => {
		const { context, eventSource, liveValues } =
			createConnectedProfileContext();
		setSillyTavernContext(context);

		const store = createCurrentPresetProfileControlsStore();
		await waitForAssertion(() => {
			expect(store.getSnapshot().connectionProfiles.authority).toBe(
				"attached",
			);
		});

		liveValues.preset = "Default";
		context.chatCompletionSettings.preset_settings_openai = "Default";
		eventSource.emit("preset_changed", {
			apiId: "openai",
			name: "Default",
		});
		await waitForAssertion(() => {
			expect(store.getSnapshot().connectionProfiles.authority).toBe(
				"detached",
			);
		});

		await expect(store.applyConnectionProfile("profile-1")).resolves.toBe(
			true,
		);

		expect(
			context.SlashCommandParser.commands.profile.callback,
		).toHaveBeenCalledWith(
			{ await: "true", timeout: "2000" },
			"Story Mode",
		);
		await waitForAssertion(() => {
			expect(store.getSnapshot()).toMatchObject({
				connectionProfiles: {
					authority: "attached",
					detachedReason: null,
					selectedProfileId: "profile-1",
					selectedProfileName: "Story Mode",
				},
			});
		});

		store.dispose();
	});

	test("marks connection profiles as disabled when the Connection Manager extension is disabled", () => {
		const { context } = createConnectedProfileContext({
			disabledExtensions: ["connection-manager"],
			selectedProfile: "",
		});
		setSillyTavernContext(context);

		expect(readCurrentPresetProfileControlsSnapshot()).toMatchObject({
			connectionProfiles: {
				authority: "attached",
				detachedReason: null,
				options: [],
				selectedProfileId: "",
				selectedProfileName: "",
				status: "disabled",
			},
		});
	});

	test("falls back to the native connection profile select when the /profile slash command is unavailable", async () => {
		const eventSource = new FakeEventSource();
		const liveValues = {
			api: "openrouter",
			model: "openrouter/anthropic/claude-3.7-sonnet",
			preset: "Storyteller",
		};
		const domChangeSpy = vi.fn(() => {
			liveValues.api = "openrouter";
			liveValues.model = "openrouter/anthropic/claude-3.7-sonnet";
			liveValues.preset = "Storyteller";
			context.extensionSettings.connectionManager.selectedProfile =
				"profile-1";
			eventSource.emit("connection_profile_loaded", "Story Mode");
		});

		document.body.innerHTML = `
            <select id="connection_profiles">
                <option value="">${"<None>"}</option>
                <option value="profile-1">Story Mode</option>
            </select>
        `;
		document
			.getElementById("connection_profiles")
			?.addEventListener("change", domChangeSpy);

		const context = {
			chatCompletionSettings: {
				chat_completion_source: liveValues.api,
				preset_settings_openai: liveValues.preset,
			},
			eventSource,
			eventTypes: {
				CONNECTION_PROFILE_LOADED: "connection_profile_loaded",
			},
			extensionSettings: {
				connectionManager: {
					profiles: [
						{
							api: "openrouter",
							id: "profile-1",
							mode: "cc",
							model: "openrouter/anthropic/claude-3.7-sonnet",
							name: "Story Mode",
							preset: "Storyteller",
						},
					],
					selectedProfile: "",
				},
				disabledExtensions: [],
			},
			getChatCompletionModel: () => liveValues.model,
			mainApi: "openai",
			SlashCommandParser: {
				commands: {
					api: {
						callback: vi.fn(async () => liveValues.api),
					},
					model: {
						callback: vi.fn(async () => liveValues.model),
					},
					preset: {
						callback: vi.fn(async () => liveValues.preset),
					},
				},
			},
		};

		setSillyTavernContext(context);
		const store = createCurrentPresetProfileControlsStore();

		await expect(store.applyConnectionProfile("profile-1")).resolves.toBe(
			true,
		);
		expect(domChangeSpy).toHaveBeenCalledTimes(1);
		expect(
			(
				document.getElementById(
					"connection_profiles",
				) as HTMLSelectElement
			).value,
		).toBe("profile-1");

		store.dispose();
	});
});
