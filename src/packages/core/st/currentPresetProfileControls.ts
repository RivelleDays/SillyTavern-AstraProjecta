import { getStContext } from "@/packages/core/st/context";
import {
	asTrimmedPrimitiveString as asTrimmedString,
	type EventSourceLike,
	isRecord,
	queueMicrotaskSafe,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type Listener = () => void;

type SelectOption = {
	label: string;
	value: string;
};

type ConnectionProfileLike = Record<string, unknown> & {
	id?: unknown;
	mode?: unknown;
	name?: unknown;
};

type ConnectionManagerSettingsLike = Record<string, unknown> & {
	profiles?: unknown;
	selectedProfile?: unknown;
};

type ExtensionSettingsLike = Record<string, unknown> & {
	connectionManager?: ConnectionManagerSettingsLike;
	disabledExtensions?: unknown;
};

type ChatCompletionSettingsLike = Record<string, unknown> & {
	chat_completion_source?: unknown;
	preset_settings_openai?: unknown;
};

type TextCompletionSettingsLike = Record<string, unknown> & {
	custom_model?: unknown;
	openrouter_model?: unknown;
	preset?: unknown;
	type?: unknown;
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
	extensionSettings?: ExtensionSettingsLike;
	getChatCompletionModel?: () => unknown;
	mainApi?: unknown;
	SlashCommandParser?: SlashCommandParserLike;
	textCompletionSettings?: TextCompletionSettingsLike;
};

type ConnectionProfileMode = "cc" | "tc";

type ConnectionProfileAuthorityResult = {
	authority: CurrentConnectionProfileAuthority;
	detachedReason: CurrentConnectionProfileDetachedReason;
};

export type CurrentConnectionProfileAuthority = "attached" | "detached";

export type CurrentConnectionProfileDetachedReason = null | "settings-changed";

export type CurrentConnectionProfilesStatus =
	| "disabled"
	| "ready"
	| "unavailable";

export interface CurrentConnectionProfilesSnapshot {
	authority: CurrentConnectionProfileAuthority;
	detachedReason: CurrentConnectionProfileDetachedReason;
	options: SelectOption[];
	selectedProfileId: string;
	selectedProfileName: string;
	status: CurrentConnectionProfilesStatus;
}

export interface CurrentPresetProfileControlsSnapshot {
	connectionProfiles: CurrentConnectionProfilesSnapshot;
	updatedAt: number;
}

export interface CurrentPresetProfileControlsStore {
	applyConnectionProfile(profileId: string): Promise<boolean>;
	dispose(): void;
	getSnapshot(): CurrentPresetProfileControlsSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

const NONE_PROFILE_LABEL = "<None>";
const PROFILE_COMMAND_AWAIT_ARGS = {
	await: "true",
	timeout: "2000",
} as const;
const PROFILE_COMMAND_READ_ARGS = {
	await: "false",
	connect: "false",
	force: "true",
	quiet: "true",
	timeout: "0",
} as const;
const APPLY_EVENT_TIMEOUT_MS = 2_500;
const ALLOW_EMPTY_PROFILE_COMMANDS = new Set([
	"start-reply-with",
	"stop-strings",
]);
const CHAT_COMPLETION_PROFILE_COMMANDS = [
	"api",
	"preset",
	"api-url",
	"model",
	"proxy",
	"stop-strings",
	"start-reply-with",
	"reasoning-template",
	"prompt-post-processing",
	"secret-id",
	"regex-preset",
] as const;
const TEXT_COMPLETION_PROFILE_COMMANDS = [
	"api",
	"preset",
	"api-url",
	"model",
	"sysprompt",
	"sysprompt-state",
	"instruct",
	"context",
	"instruct-state",
	"tokenizer",
	"stop-strings",
	"start-reply-with",
	"reasoning-template",
	"secret-id",
	"regex-preset",
] as const;

function resolveContextSafe(): StContextLike | null {
	try {
		return getStContext() as StContextLike;
	} catch {
		return null;
	}
}

function getEventSource(context: StContextLike | null): EventSourceLike | null {
	if (
		isRecord(context?.eventSource) &&
		typeof context.eventSource.on === "function" &&
		typeof context.eventSource.removeListener === "function"
	) {
		return context.eventSource as EventSourceLike;
	}

	return null;
}

function readConnectionProfileOptions(
	profiles: ConnectionProfileLike[],
): SelectOption[] {
	return [
		{
			label: NONE_PROFILE_LABEL,
			value: "",
		},
		...profiles
			.map((profile) => ({
				label: asTrimmedString(profile.name),
				value: asTrimmedString(profile.id),
			}))
			.filter((option) => option.label && option.value)
			.sort((left, right) => left.label.localeCompare(right.label)),
	];
}

function readConnectionProfilesSnapshot(
	context: StContextLike | null,
	previous?: CurrentConnectionProfilesSnapshot,
): CurrentConnectionProfilesSnapshot {
	const extensionSettings = isRecord(context?.extensionSettings)
		? (context.extensionSettings as ExtensionSettingsLike)
		: null;
	const disabledExtensions = Array.isArray(
		extensionSettings?.disabledExtensions,
	)
		? extensionSettings.disabledExtensions.map(asTrimmedString)
		: [];

	if (disabledExtensions.includes("connection-manager")) {
		return {
			authority: "attached",
			detachedReason: null,
			options: [],
			selectedProfileId: "",
			selectedProfileName: "",
			status: "disabled",
		};
	}

	const connectionManager = isRecord(extensionSettings?.connectionManager)
		? (extensionSettings.connectionManager as ConnectionManagerSettingsLike)
		: null;
	if (!connectionManager) {
		return {
			authority: "attached",
			detachedReason: null,
			options: [],
			selectedProfileId: "",
			selectedProfileName: "",
			status: "unavailable",
		};
	}

	const profiles = Array.isArray(connectionManager.profiles)
		? (connectionManager.profiles.filter(
				isRecord,
			) as ConnectionProfileLike[])
		: [];
	const selectedProfileId = asTrimmedString(
		connectionManager.selectedProfile,
	);
	const options = readConnectionProfileOptions(profiles);
	const selectedProfileName =
		options.find((option) => option.value === selectedProfileId)?.label ??
		(selectedProfileId ? "" : NONE_PROFILE_LABEL);
	const canPreserveAuthority =
		previous?.selectedProfileId === selectedProfileId &&
		previous.status === "ready";

	return {
		authority:
			selectedProfileId && canPreserveAuthority
				? previous.authority
				: "attached",
		detachedReason:
			selectedProfileId && canPreserveAuthority
				? previous.detachedReason
				: null,
		options,
		selectedProfileId,
		selectedProfileName,
		status: Array.isArray(connectionManager.profiles)
			? "ready"
			: "unavailable",
	};
}

function createSnapshot(
	context: StContextLike | null,
	now: () => number,
	previous?: CurrentPresetProfileControlsSnapshot,
): CurrentPresetProfileControlsSnapshot {
	return {
		connectionProfiles: readConnectionProfilesSnapshot(
			context,
			previous?.connectionProfiles,
		),
		updatedAt: now(),
	};
}

function areOptionsEqual(
	current: readonly SelectOption[],
	next: readonly SelectOption[],
): boolean {
	if (current.length !== next.length) {
		return false;
	}

	return current.every((option, index) => {
		const candidate = next[index];
		return (
			candidate != null &&
			candidate.label === option.label &&
			candidate.value === option.value
		);
	});
}

function areConnectionProfilesEqual(
	current: CurrentConnectionProfilesSnapshot,
	next: CurrentConnectionProfilesSnapshot,
): boolean {
	return (
		current.authority === next.authority &&
		current.detachedReason === next.detachedReason &&
		current.selectedProfileId === next.selectedProfileId &&
		current.selectedProfileName === next.selectedProfileName &&
		current.status === next.status &&
		areOptionsEqual(current.options, next.options)
	);
}

function areSnapshotsEqual(
	current: CurrentPresetProfileControlsSnapshot,
	next: CurrentPresetProfileControlsSnapshot,
): boolean {
	return areConnectionProfilesEqual(
		current.connectionProfiles,
		next.connectionProfiles,
	);
}

function waitForEventMatch({
	eventName,
	eventSource,
	matcher,
	timeoutMs = APPLY_EVENT_TIMEOUT_MS,
}: {
	eventName?: string;
	eventSource: EventSourceLike | null;
	matcher?: (...args: unknown[]) => boolean;
	timeoutMs?: number;
}): Promise<boolean> {
	if (!eventSource || !eventName) {
		return Promise.resolve(false);
	}

	return new Promise((resolve) => {
		let settled = false;

		const cleanup = (result: boolean) => {
			if (settled) {
				return;
			}

			settled = true;
			clearTimeout(timeoutId);
			eventSource.removeListener(eventName, handleEvent);
			resolve(result);
		};

		const handleEvent = (...args: unknown[]) => {
			if (matcher && !matcher(...args)) {
				return;
			}

			cleanup(true);
		};

		const timeoutId = setTimeout(() => {
			cleanup(false);
		}, timeoutMs);

		eventSource.on(eventName, handleEvent);
	});
}

function resolveProfileNameById(
	snapshot: CurrentPresetProfileControlsSnapshot,
	profileId: string,
): string {
	if (!profileId) {
		return NONE_PROFILE_LABEL;
	}

	return (
		snapshot.connectionProfiles.options.find(
			(option) => option.value === profileId,
		)?.label ?? ""
	);
}

function resolveNativeProfileSelect(
	documentRef: Document,
): HTMLSelectElement | null {
	const element = documentRef.getElementById("connection_profiles");
	return element instanceof HTMLSelectElement ? element : null;
}

function resolveConnectionProfileMode(
	value: unknown,
): ConnectionProfileMode | null {
	const normalized = asTrimmedString(value);
	return normalized === "cc" || normalized === "tc" ? normalized : null;
}

function resolveCurrentConnectionProfileMode(
	context: StContextLike | null,
): ConnectionProfileMode | null {
	const mainApi = asTrimmedString(context?.mainApi);
	if (mainApi === "openai") {
		return "cc";
	}

	if (mainApi === "textgenerationwebui") {
		return "tc";
	}

	return null;
}

function getSelectedConnectionProfile(
	context: StContextLike | null,
	selectedProfileId: string,
): ConnectionProfileLike | null {
	if (!selectedProfileId) {
		return null;
	}

	const connectionManager = isRecord(
		context?.extensionSettings?.connectionManager,
	)
		? (context?.extensionSettings
				?.connectionManager as ConnectionManagerSettingsLike)
		: null;
	const profiles = Array.isArray(connectionManager?.profiles)
		? (connectionManager.profiles.filter(
				isRecord,
			) as ConnectionProfileLike[])
		: [];

	return (
		profiles.find(
			(profile) => asTrimmedString(profile.id) === selectedProfileId,
		) ?? null
	);
}

function readCurrentApiValue(context: StContextLike | null): string | null {
	const mainApi = asTrimmedString(context?.mainApi);
	if (mainApi === "openai") {
		return asTrimmedString(
			context?.chatCompletionSettings?.chat_completion_source,
		);
	}

	if (mainApi === "textgenerationwebui") {
		return asTrimmedString(context?.textCompletionSettings?.type);
	}

	return mainApi || null;
}

function readCurrentPresetValue(context: StContextLike | null): string | null {
	const mainApi = asTrimmedString(context?.mainApi);
	if (mainApi === "openai") {
		return asTrimmedString(
			context?.chatCompletionSettings?.preset_settings_openai,
		);
	}

	if (mainApi === "textgenerationwebui") {
		return asTrimmedString(context?.textCompletionSettings?.preset);
	}

	return null;
}

function readCurrentModelValue(context: StContextLike | null): string | null {
	const mainApi = asTrimmedString(context?.mainApi);
	if (
		mainApi === "openai" &&
		typeof context?.getChatCompletionModel === "function"
	) {
		try {
			return asTrimmedString(context.getChatCompletionModel());
		} catch {
			return null;
		}
	}

	if (mainApi === "textgenerationwebui") {
		const settings = isRecord(context?.textCompletionSettings)
			? (context.textCompletionSettings as TextCompletionSettingsLike)
			: null;
		const type = asTrimmedString(settings?.type);
		if (!type) {
			return null;
		}

		if (type === "ooba") {
			return asTrimmedString(settings?.custom_model);
		}

		if (type === "openrouter") {
			return asTrimmedString(settings?.openrouter_model);
		}
	}

	return null;
}

function readCurrentCommandValueFallback(
	context: StContextLike | null,
	commandName: string,
): string | null {
	if (commandName === "api") {
		return readCurrentApiValue(context);
	}

	if (commandName === "preset") {
		return readCurrentPresetValue(context);
	}

	if (commandName === "model") {
		return readCurrentModelValue(context);
	}

	return null;
}

async function readCurrentCommandValue(
	context: StContextLike | null,
	commandName: string,
): Promise<string | null> {
	// Background authority checks must stay read-only. These values are
	// exposed synchronously by ST context, while slash command callbacks may
	// emit settings updates even when called as probes.
	if (
		commandName === "api" ||
		commandName === "preset" ||
		commandName === "model"
	) {
		return readCurrentCommandValueFallback(context, commandName);
	}

	const command = context?.SlashCommandParser?.commands?.[commandName];
	if (typeof command?.callback === "function") {
		try {
			const result = await command.callback(
				PROFILE_COMMAND_READ_ARGS,
				"",
			);
			return asTrimmedString(result);
		} catch {
			return readCurrentCommandValueFallback(context, commandName);
		}
	}

	return readCurrentCommandValueFallback(context, commandName);
}

function getConnectionProfileCommands(
	mode: ConnectionProfileMode,
): readonly string[] {
	return mode === "cc"
		? CHAT_COMPLETION_PROFILE_COMMANDS
		: TEXT_COMPLETION_PROFILE_COMMANDS;
}

function getComparableProfileCommandNames(
	profile: ConnectionProfileLike,
	mode: ConnectionProfileMode,
): string[] {
	return getConnectionProfileCommands(mode).filter(
		(commandName, index, array) => {
			if (array.indexOf(commandName) !== index) {
				return false;
			}

			if (!(commandName in profile)) {
				return false;
			}

			const value = profile[commandName];
			const normalized = asTrimmedString(value);
			if (normalized) {
				return true;
			}

			return (
				ALLOW_EMPTY_PROFILE_COMMANDS.has(commandName) && value === ""
			);
		},
	);
}

async function resolveConnectionProfileAuthority(
	context: StContextLike | null,
	snapshot: CurrentPresetProfileControlsSnapshot,
): Promise<ConnectionProfileAuthorityResult> {
	const selectedProfileId = snapshot.connectionProfiles.selectedProfileId;
	if (snapshot.connectionProfiles.status !== "ready" || !selectedProfileId) {
		return {
			authority: "attached",
			detachedReason: null,
		};
	}

	const selectedProfile = getSelectedConnectionProfile(
		context,
		selectedProfileId,
	);
	if (!selectedProfile) {
		return {
			authority: "attached",
			detachedReason: null,
		};
	}

	const profileMode = resolveConnectionProfileMode(selectedProfile.mode);
	const currentMode = resolveCurrentConnectionProfileMode(context);
	if (!profileMode || profileMode !== currentMode) {
		return {
			authority: "detached",
			detachedReason: "settings-changed",
		};
	}

	const comparableCommands = getComparableProfileCommandNames(
		selectedProfile,
		profileMode,
	);
	for (const commandName of comparableCommands) {
		const expectedValue = asTrimmedString(selectedProfile[commandName]);
		const currentValue = await readCurrentCommandValue(
			context,
			commandName,
		);
		if (currentValue == null) {
			continue;
		}

		if (currentValue !== expectedValue) {
			return {
				authority: "detached",
				detachedReason: "settings-changed",
			};
		}
	}

	return {
		authority: "attached",
		detachedReason: null,
	};
}

function withConnectionProfileAuthority(
	snapshot: CurrentPresetProfileControlsSnapshot,
	authority: CurrentConnectionProfileAuthority,
	detachedReason: CurrentConnectionProfileDetachedReason,
	now: () => number,
): CurrentPresetProfileControlsSnapshot {
	return {
		...snapshot,
		connectionProfiles: {
			...snapshot.connectionProfiles,
			authority,
			detachedReason,
		},
		updatedAt: now(),
	};
}

export function readCurrentPresetProfileControlsSnapshot({
	now = Date.now,
}: {
	now?: () => number;
} = {}): CurrentPresetProfileControlsSnapshot {
	return createSnapshot(resolveContextSafe(), now);
}

export function createCurrentPresetProfileControlsStore({
	documentRef = document,
	now = Date.now,
}: {
	documentRef?: Document;
	now?: () => number;
} = {}): CurrentPresetProfileControlsStore {
	const listeners = new Set<Listener>();
	const context = resolveContextSafe();
	const eventSource = getEventSource(context);
	const eventTypes = context ? resolveEventTypes(context) : {};
	let disposed = false;
	let isRefreshQueued = false;
	let authorityResolutionToken = 0;
	let snapshot = createSnapshot(context, now);

	function emitIfChanged(nextSnapshot: CurrentPresetProfileControlsSnapshot) {
		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
		listeners.forEach((listener) => {
			listener();
		});
	}

	async function resolveAuthorityAndEmit(
		activeContext: StContextLike | null,
		baseSnapshot: CurrentPresetProfileControlsSnapshot,
		resolutionToken: number,
	) {
		const authorityResult = await resolveConnectionProfileAuthority(
			activeContext,
			baseSnapshot,
		);
		if (disposed || resolutionToken !== authorityResolutionToken) {
			return;
		}

		emitIfChanged(
			withConnectionProfileAuthority(
				baseSnapshot,
				authorityResult.authority,
				authorityResult.detachedReason,
				now,
			),
		);
	}

	function refresh() {
		const activeContext = resolveContextSafe();
		const baseSnapshot = createSnapshot(activeContext, now, snapshot);
		emitIfChanged(baseSnapshot);
		const resolutionToken = ++authorityResolutionToken;
		void resolveAuthorityAndEmit(
			activeContext,
			baseSnapshot,
			resolutionToken,
		);
	}

	async function refreshResolvedAuthority() {
		const activeContext = resolveContextSafe();
		const baseSnapshot = createSnapshot(activeContext, now, snapshot);
		emitIfChanged(baseSnapshot);
		const resolutionToken = ++authorityResolutionToken;
		await resolveAuthorityAndEmit(
			activeContext,
			baseSnapshot,
			resolutionToken,
		);
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
		eventTypes.CHATCOMPLETION_SOURCE_CHANGED,
		eventTypes.CONNECTION_PROFILE_CREATED,
		eventTypes.CONNECTION_PROFILE_DELETED,
		eventTypes.CONNECTION_PROFILE_LOADED,
		eventTypes.CONNECTION_PROFILE_UPDATED,
		eventTypes.MAIN_API_CHANGED,
		eventTypes.PRESET_CHANGED,
		eventTypes.PRESET_DELETED,
		eventTypes.PRESET_RENAMED,
	].filter((eventName): eventName is string => typeof eventName === "string");

	if (eventSource) {
		for (const eventName of boundEvents) {
			eventSource.on(eventName, queueRefresh);
		}
	}

	const initialResolutionToken = ++authorityResolutionToken;
	void resolveAuthorityAndEmit(context, snapshot, initialResolutionToken);

	return {
		async applyConnectionProfile(profileId) {
			const currentSnapshot = snapshot;
			if (currentSnapshot.connectionProfiles.status !== "ready") {
				return false;
			}

			const profileName = resolveProfileNameById(
				currentSnapshot,
				profileId,
			);
			if (!profileName) {
				return false;
			}

			const activeContext = resolveContextSafe();
			const activeEventSource = getEventSource(activeContext);
			const activeEventTypes = activeContext
				? resolveEventTypes(activeContext)
				: {};
			const waitForProfileLoad = waitForEventMatch({
				eventName: activeEventTypes.CONNECTION_PROFILE_LOADED,
				eventSource: activeEventSource,
			});
			const profileCommand =
				activeContext?.SlashCommandParser?.commands?.profile?.callback;

			try {
				if (typeof profileCommand === "function") {
					await profileCommand(
						{ ...PROFILE_COMMAND_AWAIT_ARGS },
						profileName,
					);
				} else {
					const nativeSelect =
						resolveNativeProfileSelect(documentRef);
					if (!nativeSelect) {
						return false;
					}

					nativeSelect.value = profileId;
					if (profileId && nativeSelect.value !== profileId) {
						const optionIndex = Array.from(
							nativeSelect.options,
						).findIndex((option) => option.value === profileId);
						nativeSelect.selectedIndex = optionIndex;
					}

					if (!profileId) {
						nativeSelect.selectedIndex = 0;
					}

					nativeSelect.dispatchEvent(
						new Event("change", { bubbles: true }),
					);
				}

				await waitForProfileLoad;
				await refreshResolvedAuthority();
				return true;
			} catch {
				await refreshResolvedAuthority();
				return false;
			}
		},
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
