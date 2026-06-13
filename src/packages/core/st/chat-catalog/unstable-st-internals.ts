import { EXTENSION_LOG_PREFIX } from "@/packages/core/constants";

type ChatCatalogCoreModule = Record<string, unknown> & {
	CLIENT_VERSION?: unknown;
	deleteCharacterChatByName?: unknown;
	renameGroupOrCharacterChat?: unknown;
	updateRemoteChatName?: unknown;
};

type ChatCatalogGroupModule = Record<string, unknown> & {
	deleteGroupChatByName?: unknown;
};

type ChatCatalogCoreModuleLoader = () => Promise<ChatCatalogCoreModule>;
type ChatCatalogGroupModuleLoader = () => Promise<ChatCatalogGroupModule>;
type WarnLike = (message: string) => void;

type ChatCatalogUnstableEntryKind = "character" | "group";

export type UnstableChatCatalogRenameResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			reason: "api-unavailable" | "rename-failed";
	  };

export type UnstableChatCatalogDeleteResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			reason: "api-unavailable" | "delete-failed";
	  };

export type UnstableChatCatalogRenameInput = {
	characterId?: number | string | null;
	entityId: string;
	kind: ChatCatalogUnstableEntryKind;
	newName: string;
	oldName: string;
};

export type UnstableChatCatalogDeleteInput = {
	chatId: string;
	entityId: string;
	kind: ChatCatalogUnstableEntryKind;
};

export type ChatCatalogUnstableStInternals = {
	deleteChat(
		input: UnstableChatCatalogDeleteInput,
	): Promise<UnstableChatCatalogDeleteResult>;
	renameChat(
		input: UnstableChatCatalogRenameInput,
	): Promise<UnstableChatCatalogRenameResult>;
};

type CreateUnstableChatCatalogInternalsOptions = {
	loadCoreModule?: ChatCatalogCoreModuleLoader;
	loadGroupModule?: ChatCatalogGroupModuleLoader;
	warn?: WarnLike;
};

const CORE_SCRIPT_MODULE_PATH = "/script.js";
const GROUP_CHATS_MODULE_PATH = "/scripts/group-chats.js";

let coreModulePromise: Promise<ChatCatalogCoreModule> | null = null;
let groupModulePromise: Promise<ChatCatalogGroupModule> | null = null;

function loadDefaultCoreModule(): Promise<ChatCatalogCoreModule> {
	coreModulePromise ??= import(
		/* webpackIgnore: true */
		CORE_SCRIPT_MODULE_PATH
	) as Promise<ChatCatalogCoreModule>;
	return coreModulePromise;
}

function loadDefaultGroupModule(): Promise<ChatCatalogGroupModule> {
	groupModulePromise ??= import(
		/* webpackIgnore: true */
		GROUP_CHATS_MODULE_PATH
	) as Promise<ChatCatalogGroupModule>;
	return groupModulePromise;
}

function resolveClientVersion(module: ChatCatalogCoreModule | null): string {
	const version = module?.CLIENT_VERSION;
	return typeof version === "string" ? version.trim() : "";
}

function createWarnUnavailable(warn: WarnLike) {
	const warnedCapabilities = new Set<string>();

	return (
		capability: string,
		module: ChatCatalogCoreModule | null,
	) => {
		if (warnedCapabilities.has(capability)) {
			return;
		}

		warnedCapabilities.add(capability);
		const clientVersion = resolveClientVersion(module);
		const versionDetail = clientVersion
			? ` CLIENT_VERSION: ${clientVersion}.`
			: "";
		warn(
			`${EXTENSION_LOG_PREFIX} Unstable SillyTavern internal "${capability}" is unavailable.${versionDetail} Chat catalog action will return api-unavailable when this capability is required.`,
		);
	};
}

function asFunction(
	module: Record<string, unknown>,
	capability: string,
): ((...args: unknown[]) => unknown) | null {
	const value = module[capability];
	return typeof value === "function"
		? (value as (...args: unknown[]) => unknown)
		: null;
}

export function createUnstableChatCatalogInternals({
	loadCoreModule = loadDefaultCoreModule,
	loadGroupModule = loadDefaultGroupModule,
	warn = console.warn,
}: CreateUnstableChatCatalogInternalsOptions = {}): ChatCatalogUnstableStInternals {
	const warnUnavailable = createWarnUnavailable(warn);

	async function loadCoreCapability(
		capability: string,
	): Promise<
		| {
				fn: (...args: unknown[]) => unknown;
				module: ChatCatalogCoreModule;
				ok: true;
		  }
		| {
				ok: false;
		  }
	> {
		let module: ChatCatalogCoreModule;
		try {
			module = await loadCoreModule();
		} catch {
			warnUnavailable(capability, null);
			return {
				ok: false,
			};
		}

		const fn = asFunction(module, capability);
		if (!fn) {
			warnUnavailable(capability, module);
			return {
				ok: false,
			};
		}

		return {
			fn,
			module,
			ok: true,
		};
	}

	async function loadGroupCapability(
		capability: string,
	): Promise<
		| {
				fn: (...args: unknown[]) => unknown;
				ok: true;
		  }
		| {
				ok: false;
		  }
	> {
		let module: ChatCatalogGroupModule;
		try {
			module = await loadGroupModule();
		} catch {
			warnUnavailable(capability, null);
			return {
				ok: false,
			};
		}

		const fn = asFunction(module, capability);
		if (!fn) {
			warnUnavailable(capability, null);
			return {
				ok: false,
			};
		}

		return {
			fn,
			ok: true,
		};
	}

	return {
		async deleteChat({
			chatId,
			entityId,
			kind,
		}): Promise<UnstableChatCatalogDeleteResult> {
			try {
				if (kind === "group") {
					const capability = await loadGroupCapability(
						"deleteGroupChatByName",
					);
					if (!capability.ok) {
						return {
							ok: false,
							reason: "api-unavailable",
						};
					}

					await capability.fn(entityId, chatId);
					return {
						ok: true,
					};
				}

				const capability = await loadCoreCapability(
					"deleteCharacterChatByName",
				);
				if (!capability.ok) {
					return {
						ok: false,
						reason: "api-unavailable",
					};
				}

				await capability.fn(entityId, chatId);
				return {
					ok: true,
				};
			} catch {
				return {
					ok: false,
					reason: "delete-failed",
				};
			}
		},

		async renameChat({
			characterId,
			entityId,
			kind,
			newName,
			oldName,
		}): Promise<UnstableChatCatalogRenameResult> {
			const renameCapability = await loadCoreCapability(
				"renameGroupOrCharacterChat",
			);
			if (!renameCapability.ok) {
				return {
					ok: false,
					reason: "api-unavailable",
				};
			}

			try {
				await renameCapability.fn({
					characterId: kind === "group" ? undefined : entityId,
					groupId: kind === "group" ? entityId : undefined,
					loader: false,
					newFileName: newName,
					oldFileName: oldName,
				});

				const updateRemoteChatName = asFunction(
					renameCapability.module,
					"updateRemoteChatName",
				);
				if (kind !== "group" && updateRemoteChatName) {
					await updateRemoteChatName(
						characterId ?? entityId,
						newName,
					);
				} else if (kind !== "group") {
					warnUnavailable(
						"updateRemoteChatName",
						renameCapability.module,
					);
				}

				return {
					ok: true,
				};
			} catch {
				return {
					ok: false,
					reason: "rename-failed",
				};
			}
		},
	};
}

export const defaultUnstableChatCatalogInternals =
	createUnstableChatCatalogInternals();
