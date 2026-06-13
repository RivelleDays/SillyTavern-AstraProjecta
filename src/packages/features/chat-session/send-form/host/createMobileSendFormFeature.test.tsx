import * as React from "react";
import {
	act,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import {
	createMobileSillyTavernInterfacePanelFeature,
	type MobileSillyTavernInterfacePanelFeature,
} from "@/app/mobile/sillytavern-interface-panel";
import {
	SILLYTAVERN_INTERFACE_ROUTES,
	type SillyTavernInterfaceRouteIconKey,
} from "@/app/shared/sillytavern-interface";
import {
	SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
} from "@/packages/features/sillytavern-interface/contracts/dom";
import { createMobileSendFormFeature } from "@/packages/features/chat-session/send-form/host/createMobileSendFormFeature";
import { MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY } from "@/packages/features/chat-session/send-form/contracts/dom";
import type { MobileSendFormSillyTavernInterfaceAdapter } from "@/packages/features/chat-session/send-form/contracts/sillyTavernInterface";

type Listener = (...args: unknown[]) => void;

const mountedQuickReplyVisibilityFeatures: Array<
	ReturnType<typeof createMobileSendFormFeature>
> = [];

interface MountedMobileSendFormWithSillyTavernInterface {
	feature: ReturnType<typeof createMobileSendFormFeature>;
	sillyTavernInterfacePanelFeature: MobileSillyTavernInterfacePanelFeature;
	dispose(): void;
	mount(): void;
}

function renderTestSillyTavernInterfaceRouteIcon({
	className,
	iconKey,
}: {
	className?: string;
	iconKey: SillyTavernInterfaceRouteIconKey;
}) {
	return React.createElement("span", {
		"aria-hidden": true,
		className,
		"data-icon-key": iconKey,
	});
}

function createTestSillyTavernInterfaceAdapter(): MobileSendFormSillyTavernInterfaceAdapter {
	return {
		openCurrentPage: vi.fn(),
		openRoute: vi.fn(),
		renderRouteIcon: renderTestSillyTavernInterfaceRouteIcon,
	};
}

function createTestMobileSendFormFeature({
	documentRef = document,
	sillyTavernInterface = createTestSillyTavernInterfaceAdapter(),
}: {
	documentRef?: Document;
	sillyTavernInterface?: MobileSendFormSillyTavernInterfaceAdapter;
} = {}) {
	return createMobileSendFormFeature({
		documentRef,
		sillyTavernInterface,
	});
}

function createMountedMobileSendFormWithSillyTavernInterface({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): MountedMobileSendFormWithSillyTavernInterface {
	const sillyTavernInterfacePanelFeature =
		createMobileSillyTavernInterfacePanelFeature({ documentRef });
	const feature = createMobileSendFormFeature({
		documentRef,
		sillyTavernInterface:
			sillyTavernInterfacePanelFeature.getSendFormAdapter(),
	});

	return {
		feature,
		sillyTavernInterfacePanelFeature,
		dispose() {
			feature.dispose();
			sillyTavernInterfacePanelFeature.dispose();
		},
		mount() {
			sillyTavernInterfacePanelFeature.mount();
			feature.mount();
		},
	};
}

function createEventSourceStub() {
	const listeners = new Map<string, Set<Listener>>();

	return {
		emit(event: string, ...args: unknown[]) {
			const activeListeners = listeners.get(event);
			if (!activeListeners) {
				return;
			}

			for (const listener of activeListeners) {
				listener(...args);
			}
		},
		on(event: string, listener: Listener) {
			const activeListeners = listeners.get(event) ?? new Set<Listener>();
			activeListeners.add(listener);
			listeners.set(event, activeListeners);
		},
		removeListener(event: string, listener: Listener) {
			listeners.get(event)?.delete(listener);
		},
	};
}

function setSillyTavernContext(context: unknown | { current: unknown }) {
	const contextRef =
		typeof context === "object" && context !== null && "current" in context
			? context
			: { current: context };

	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => contextRef.current,
	};
}

async function waitForSendFormHosts() {
	return waitFor(() => {
		const composerShell = document.getElementById(
			"mobile-chat-composer-shell",
		);
		const composerHost = document.getElementById(
			"mobile-chat-composer-host",
		);
		const quickReplyHost = document.getElementById(
			"mobile-chat-quick-replies-host",
		);
		const shortcutsHost = document.getElementById(
			"mobile-chat-shortcuts-host",
		);
		const inputRowHost = document.getElementById("mobile-chat-input-host");

		expect(composerShell).toBeInTheDocument();
		expect(composerHost).toBeInTheDocument();
		expect(shortcutsHost).toBeInTheDocument();
		expect(inputRowHost).toBeInTheDocument();
		expect(quickReplyHost).toBeInTheDocument();

		return {
			composerShell: composerShell as HTMLElement,
			composerHost: composerHost as HTMLElement,
			inputRowHost: inputRowHost as HTMLElement,
			quickReplyHost: quickReplyHost as HTMLElement,
			shortcutsHost: shortcutsHost as HTMLElement,
		};
	});
}

async function waitForInputRowHost() {
	return (await waitForSendFormHosts()).inputRowHost;
}

function expectQuickReplyHostInTextareaSlot({
	inputRowHost,
	quickReplyHost,
}: {
	inputRowHost: HTMLElement;
	quickReplyHost: HTMLElement;
}) {
	const textareaHost = inputRowHost.querySelector<HTMLElement>(
		".mobile-chat-input__field",
	);
	const textareaMain = inputRowHost.querySelector<HTMLElement>(
		".mobile-chat-input__textarea-slot",
	);

	expect(textareaHost).toContainElement(textareaMain);
	expect(textareaHost).toContainElement(quickReplyHost);
	expect(textareaMain?.nextElementSibling).toBe(quickReplyHost);
}

async function waitForShortcutsHost() {
	return (await waitForSendFormHosts()).shortcutsHost;
}

async function mountMainMenuFocusFixture() {
	document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="qr--bar"><button type="button">Quick reply</button></div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

	window.matchMedia = vi.fn().mockImplementation(() => ({
		addEventListener: vi.fn(),
		matches: true,
		removeEventListener: vi.fn(),
	}));

	setSillyTavernContext({
		characterId: 0,
		characters: [
			{
				avatar: "hero.png",
				chat: "chapter-1",
				name: "Hero",
			},
		],
		chat: [{ is_system: false, is_user: true }],
		chatId: "chapter-1",
		chatMetadata: {},
		getThumbnailUrl: vi.fn((type: string, value: string) =>
			type === "persona"
				? `/thumbs/persona/${value}`
				: `/thumbs/avatar/${value}`,
		),
		Popup: {
			show: {
				confirm: vi.fn().mockResolvedValue(true),
			},
		},
		executeSlashCommandsWithOptions: vi.fn(),
		getRequestHeaders: () => ({
			Authorization: "Bearer test-token",
		}),
		powerUserSettings: { continue_on_send: false },
	});
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			json: async () => [
				{
					file_id: "chapter-1",
					file_name: "chapter-1.jsonl",
					file_size: "12 KB",
					last_mes: "2026-04-23T10:30:00.000Z",
				},
			],
			ok: true,
		}),
	);

	ensureAstraProjectaUiInfrastructure({ documentRef: document });

	const feature = createTestMobileSendFormFeature({ documentRef: document });
	feature.mount();

	const inputRowHost = await waitForInputRowHost();
	const formSheld = document.getElementById("form_sheld");
	const trigger = within(inputRowHost).getByRole("button", {
		name: "Current user avatar",
	});

	if (
		!(formSheld instanceof HTMLElement) ||
		!(trigger instanceof HTMLElement)
	) {
		throw new Error(
			"main menu focus fixture did not mount expected elements",
		);
	}

	return {
		feature,
		formSheld,
		trigger,
	};
}

type ChatSettingsOverrideFixtureKind = "character" | "group";

function setupChatSettingsOverrideFixture(
	kind: ChatSettingsOverrideFixtureKind,
) {
	const chatId = kind === "group" ? "group-chat" : "chapter-1";
	document.body.innerHTML = `
      <select id="char-management-dropdown">
        <option id="default" selected>More...</option>
        <option id="set_chat_character_settings">Character Settings Overrides</option>
      </select>
      <button id="rm_group_scenario" type="button"></button>
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="qr--bar"><button type="button">Quick reply</button></div>
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

	window.matchMedia = vi.fn().mockImplementation(() => ({
		addEventListener: vi.fn(),
		matches: true,
		removeEventListener: vi.fn(),
	}));

	const eventSource = createEventSourceStub();
	const contextRef = {
		current: {
			characterId: kind === "character" ? 0 : null,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
			],
			chat: [
				{
					is_system: false,
					is_user: true,
				},
			],
			chatId,
			chatMetadata: {},
			eventSource,
			eventTypes: {
				APP_READY: "app_ready",
				CHAT_CHANGED: "chat_changed",
				CHAT_LOADED: "chat_loaded",
				CHARACTER_EDITED: "character_edited",
				GROUP_UPDATED: "group_updated",
				MESSAGE_SENT: "message_sent",
				PERSONA_CHANGED: "persona_changed",
				PERSONA_RENAMED: "persona_renamed",
				PERSONA_UPDATED: "persona_updated",
				SETTINGS_UPDATED: "settings_updated",
			},
			executeSlashCommandsWithOptions: vi.fn(),
			getThumbnailUrl: vi.fn((type: string, value: string) => {
				if (type === "persona") {
					return `/thumbs/persona/${value}`;
				}

				return `/thumbs/avatar/${value}`;
			}),
			groupId: kind === "group" ? "group-1" : null,
			groups: [
				{
					chat_id: "group-chat",
					id: "group-1",
					members: ["hero.png"],
					name: "Raid Party",
				},
			],
			name1: "Rivelle",
			powerUserSettings: {
				continue_on_send: false,
				persona_descriptions: {
					"hero-persona": {
						title: "Lead Pilot",
					},
				},
				personas: {
					"hero-persona": "Star Traveler",
				},
			},
			timestampToMoment: vi.fn(() => ({
				format: vi.fn(() => "2026/04/23 06:30 PM"),
			})),
			translate: (text: string) => text,
		},
	};

	setSillyTavernContext(contextRef);
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			json: async () => [
				{
					file_id: chatId,
					file_name: `${chatId}.jsonl`,
					file_size: "12 KB",
					last_mes: "2026-04-23T10:30:00.000Z",
				},
			],
			ok: true,
		}),
	);

	ensureAstraProjectaUiInfrastructure({ documentRef: document });

	const feature = createTestMobileSendFormFeature({ documentRef: document });
	feature.mount();

	return {
		feature,
		nativeGroupButton: document.getElementById("rm_group_scenario"),
		nativeSelect: document.getElementById(
			"char-management-dropdown",
		) as HTMLSelectElement,
	};
}

async function openMainMenuFromCurrentUserAvatar() {
	const host = await waitForInputRowHost();
	fireEvent.click(
		within(host).getByRole("button", {
			name: "Current user avatar",
		}),
	);

	return waitFor(() => {
		const drawer = document.getElementById("mobile-chat-main-menu-drawer");
		expect(drawer).toBeInTheDocument();
		return drawer as HTMLElement;
	});
}

function setupQuickReplyVisibilityFixture({
	nativeToggle = "checked",
	storedVisibility,
}: {
	nativeToggle?: "checked" | "missing" | "unchecked";
	storedVisibility?: "false" | "true";
} = {}) {
	document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_impersonate" type="button"></button>
        <button id="option_continue" type="button"></button>
      </div>
      <div id="qr_container">
        ${
			nativeToggle === "missing"
				? ""
				: `<input id="qr--isEnabled" type="checkbox" ${
						nativeToggle === "checked" ? "checked" : ""
					}>`
		}
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="qr--bar"><button type="button">Quick reply</button></div>
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

	window.matchMedia = vi.fn().mockImplementation(() => ({
		addEventListener: vi.fn(),
		matches: true,
		removeEventListener: vi.fn(),
	}));

	if (storedVisibility) {
		window.localStorage.setItem(
			"astra_projecta.mobile_send_form.quick_reply_visible",
			storedVisibility,
		);
	}

	setSillyTavernContext({
		chat: [{ is_system: false, is_user: true }],
		chatId: "chat-1",
		characters: [{ chat: "chat-1" }],
		getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
		powerUserSettings: {
			continue_on_send: false,
			quick_continue: true,
			quick_impersonate: true,
		},
	});

	ensureAstraProjectaUiInfrastructure({ documentRef: document });

	const feature = createTestMobileSendFormFeature({ documentRef: document });
	feature.mount();
	mountedQuickReplyVisibilityFeatures.push(feature);

	return feature;
}

describe("createMobileSendFormFeature", () => {
	afterEach(() => {
		while (mountedQuickReplyVisibilityFeatures.length > 0) {
			mountedQuickReplyVisibilityFeatures.pop()?.dispose();
		}
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"default_avatar",
		);
		vi.unstubAllGlobals();
		window.localStorage.clear();
	});

	test("hides the shortcuts toolbar when the stored preference disables it", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
        <button id="option_delete_mes" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="persona-management-button" class="drawer">
        <div class="drawer-toggle"></div>
        <div id="PersonaManagement" class="drawer-content closedDrawer">
          <div class="flex-container wide100p alignitemscenter spaceBetween flexNoGap">
            <div class="flex-container alignItemsBaseline wide100p">
              <div class="flex1 flex-container alignItemsBaseline">
                <h3 class="margin0"><span>Persona Management</span></h3>
              </div>
              <div class="flex-container">
                <div class="menu_button menu_button_icon user_stats_button"><span>Usage Stats</span></div>
                <div id="personas_backup" class="menu_button menu_button_icon"><span>Backup</span></div>
                <div id="personas_restore" class="menu_button menu_button_icon"><span>Restore</span></div>
                <input id="personas_restore_input" type="file" accept=".json" hidden />
              </div>
            </div>
            <div id="persona-management-block" class="flex-container wide100p flexGap10">
              <div class="persona_management_left_column flex1 overflowHidden wide100p">
                <div id="user_avatar_block_panel">
                  <div class="avatar-container selected" data-avatar-id="hero-persona">
                    <span>Star Traveler</span>
                  </div>
                </div>
              </div>
              <div class="persona_management_right_column flex1">
                <div class="persona_management_current_persona">
                  <h4 class="standoutHeader">Current Persona</h4>
                  <h5 id="your_name" class="persona_name">Star Traveler</h5>
                  <textarea id="persona_description" name="persona_description">Lead Pilot</textarea>
                </div>
                <div class="persona_management_global_settings">
                  <h4 class="standoutHeader">Global Settings</h4>
                </div>
              </div>
            </div>
          </div>
      </div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="qr--bar"><button type="button">Quick reply</button></div>
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		window.localStorage.setItem(
			MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
			"false",
		);

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			chatMetadata: {},
			characterId: 0,
			characters: [{ chat: "chat-1" }],
			Popup: {
				show: {
					confirm: vi.fn().mockResolvedValue(true),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: { continue_on_send: false },
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const { composerHost, inputRowHost, quickReplyHost, shortcutsHost } =
			await waitForSendFormHosts();
		const composerShell = document.getElementById(
			"mobile-chat-composer-shell",
		);
		const formSheld = document.getElementById("form_sheld");

		expect(
			shortcutsHost.querySelector(".mobile-send-form-shortcuts"),
		).not.toBeInTheDocument();
		expect(
			shortcutsHost.querySelector(".mobile-chat-input"),
		).not.toBeInTheDocument();
		expect(
			inputRowHost.querySelector(".mobile-send-form-shortcuts"),
		).not.toBeInTheDocument();
		expect(
			inputRowHost.querySelector(".mobile-chat-input"),
		).toBeInTheDocument();
		expect(composerShell).toHaveClass("mobile-chat-composer-shell");
		expect(composerShell).toContainElement(formSheld);
		expect(composerShell?.children[0]).toBe(formSheld);
		expect(composerHost).toHaveClass("mobile-chat-composer-host");
		expect(composerHost.parentElement?.id).toBe("send_form");
		expect(composerHost.nextElementSibling?.id).toBe("nonQRFormItems");
		const composer = composerHost.querySelector(".mobile-chat-composer");
		expect(composer).toBeInTheDocument();
		expect(composer).toHaveAttribute("data-shortcuts-visible", "false");
		expect(
			composerHost.querySelector(".mobile-chat-composer__input-region"),
		).toContainElement(inputRowHost);
		expect(
			composerHost.querySelector(
				".mobile-chat-composer__shortcuts-region",
			),
		).toContainElement(shortcutsHost);
		expect(shortcutsHost.parentElement).toHaveClass(
			"mobile-chat-composer__shortcuts-region",
		);
		expect(shortcutsHost.nextElementSibling).toBeNull();
		expectQuickReplyHostInTextareaSlot({
			inputRowHost,
			quickReplyHost,
		});
		expect(quickReplyHost).toHaveAttribute("hidden");
		expect(quickReplyHost.querySelector("#qr--bar")).toBeInTheDocument();
		expect(inputRowHost.parentElement).toHaveClass(
			"mobile-chat-composer__input-region",
		);
		expect(inputRowHost.nextElementSibling).toBeNull();

		feature.unmount();
		window.localStorage.removeItem(
			MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
		);
	});

	test("mounts the textarea host with persistent left controls and restores the textarea on unmount", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;">
        <div id="attach_file_wand_container" class="extension_container">
          <div id="attach_file_action" role="button" tabindex="0">
            <div class="fa-solid fa-paperclip extensionsMenuExtensionButton"></div>
            <span>Attach file</span>
          </div>
        </div>
        <div id="empty_wand_container" class="extension_container"></div>
      </div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_toggle_CFG" type="button"></button>
        <button id="option_toggle_logprobs" type="button"></button>
        <button id="option_new_bookmark" type="button"></button>
        <button id="option_back_to_main" type="button"></button>
        <button id="option_regenerate" type="button"></button>
        <button id="option_continue" type="button"></button>
        <button id="option_impersonate" type="button"></button>
        <button id="option_convert_to_group" type="button"></button>
        <button id="option_start_new_chat" type="button"></button>
        <button id="option_select_chat" type="button"></button>
        <button id="option_close_chat" type="button"></button>
        <button id="option_delete_mes" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="persona-management-button" class="drawer">
        <div class="drawer-toggle"></div>
        <div id="PersonaManagement" class="drawer-content closedDrawer">
          <div class="flex-container wide100p alignitemscenter spaceBetween flexNoGap">
            <div class="flex-container alignItemsBaseline wide100p">
              <div class="flex1 flex-container alignItemsBaseline">
                <h3 class="margin0"><span>Persona Management</span></h3>
              </div>
              <div class="flex-container">
                <div class="menu_button menu_button_icon user_stats_button"><span>Usage Stats</span></div>
                <div id="personas_backup" class="menu_button menu_button_icon"><span>Backup</span></div>
                <div id="personas_restore" class="menu_button menu_button_icon"><span>Restore</span></div>
                <input id="personas_restore_input" type="file" accept=".json" hidden />
              </div>
            </div>
            <div id="persona-management-block" class="flex-container wide100p flexGap10">
              <div class="persona_management_left_column flex1 overflowHidden wide100p">
                <div id="user_avatar_block_panel">
                  <div class="avatar-container selected" data-avatar-id="hero-persona">
                    <span>Star Traveler</span>
                  </div>
                </div>
              </div>
              <div class="persona_management_right_column flex1">
                <div class="persona_management_current_persona">
                  <h4 class="standoutHeader">Current Persona</h4>
                  <h5 id="your_name" class="persona_name">Star Traveler</h5>
                  <textarea id="persona_description" name="persona_description">Lead Pilot</textarea>
                </div>
                <div class="persona_management_global_settings">
                  <h4 class="standoutHeader">Global Settings</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="qr--bar"><button type="button">Quick reply</button></div>
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		const confirmSpy = vi.fn().mockResolvedValue(true);
		const executeSlashCommandsWithOptions = vi.fn();

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatCompletionSettings: {
				openai_max_context: 4096,
				openai_max_tokens: 512,
			},
			chatId: "chat-1",
			chatMetadata: { main_chat: "parent-chat" },
			characterId: 0,
			characters: [{ chat: "chat-1" }],
			Popup: {
				show: {
					confirm: confirmSpy,
				},
			},
			executeSlashCommandsWithOptions,
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			mainApi: "openai",
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: true,
				quick_impersonate: true,
			},
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		const impersonateButton = document.getElementById("mes_impersonate");
		const menuButton = document.getElementById("options_button");
		const authorNoteOption = document.getElementById("option_toggle_AN");
		const sendButton = document.getElementById("send_but");
		const extensionsMenuButton = document.getElementById(
			"extensionsMenuButton",
		);
		const extensionsMenu = document.getElementById("extensionsMenu");
		const extensionsAction = document.getElementById("attach_file_action");
		let authorNoteClicks = 0;
		let menuClicks = 0;
		let extensionsMenuClicks = 0;
		let extensionActionClicks = 0;
		let impersonateClicks = 0;
		let sendClicks = 0;

		authorNoteOption?.addEventListener("click", () => {
			authorNoteClicks += 1;
		});

		impersonateButton?.addEventListener("click", () => {
			impersonateClicks += 1;
		});

		menuButton?.addEventListener("click", () => {
			menuClicks += 1;
		});

		sendButton?.addEventListener("click", () => {
			sendClicks += 1;
		});

		extensionsMenuButton?.addEventListener("click", () => {
			extensionsMenuClicks += 1;
		});

		extensionsAction?.addEventListener("click", () => {
			extensionActionClicks += 1;
		});

		feature.mount();
		feature.mount();

		const {
			composerHost,
			composerShell,
			inputRowHost,
			quickReplyHost,
			shortcutsHost,
		} = await waitForSendFormHosts();
		const formSheld = document.getElementById("form_sheld");

		expect(composerShell).toHaveClass("mobile-chat-composer-shell");
		expect(composerShell).toContainElement(formSheld);
		expect(composerShell.children[0]).toBe(formSheld);
		expect(composerHost).toHaveClass("mobile-chat-composer-host");
		expect(composerHost.parentElement?.id).toBe("send_form");
		expect(composerHost.nextElementSibling?.id).toBe("nonQRFormItems");
		const composer = composerHost.querySelector(".mobile-chat-composer");
		expect(composer).toBeInTheDocument();
		expect(composer).toHaveAttribute("data-shortcuts-visible", "true");
		expect(
			composerHost.querySelector(".mobile-chat-composer__input-region"),
		).toContainElement(inputRowHost);
		expect(
			composerHost.querySelector(
				".mobile-chat-composer__shortcuts-region",
			),
		).toContainElement(shortcutsHost);
		expect(shortcutsHost).toHaveClass("mobile-chat-shortcuts-host");
		expect(shortcutsHost.parentElement).toHaveClass(
			"mobile-chat-composer__shortcuts-region",
		);
		expect(shortcutsHost.nextElementSibling).toBeNull();
		expect(quickReplyHost).toHaveClass("mobile-chat-quick-replies-host");
		expectQuickReplyHostInTextareaSlot({
			inputRowHost,
			quickReplyHost,
		});
		expect(quickReplyHost).toHaveAttribute("hidden");
		expect(quickReplyHost.querySelector("#qr--bar")).toBeInTheDocument();
		expect(inputRowHost).toHaveClass("mobile-chat-input-host");
		expect(inputRowHost.parentElement).toHaveClass(
			"mobile-chat-composer__input-region",
		);
		expect(inputRowHost.nextElementSibling).toBeNull();
		expect(
			document.querySelectorAll("#mobile-chat-composer-host"),
		).toHaveLength(1);
		expect(
			document.querySelectorAll("#mobile-chat-shortcuts-host"),
		).toHaveLength(1);
		expect(
			document.querySelectorAll("#mobile-chat-quick-replies-host"),
		).toHaveLength(1);
		expect(
			shortcutsHost.querySelector(".mobile-send-form-shortcuts"),
		).toBeInTheDocument();
		const contextSlot = shortcutsHost.querySelector(
			".mobile-send-form-shortcuts__context-slot",
		) as HTMLElement | null;
		const contextUsageTrigger = contextSlot?.querySelector(
			'[data-slot="mobile-chat-context-usage-shortcut"]',
		) as HTMLButtonElement | null;

		expect(contextSlot).toBeInTheDocument();
		expect(contextUsageTrigger).toBeInTheDocument();
		expect(contextUsageTrigger).toHaveClass("is-idle");
		expect(contextUsageTrigger).not.toBeDisabled();
		expect(
			shortcutsHost.querySelector(".mobile-chat-input"),
		).not.toBeInTheDocument();
		expect(
			inputRowHost.querySelector(".mobile-chat-input"),
		).toBeInTheDocument();
		expect(
			inputRowHost.querySelector(".mobile-chat-input__tools"),
		).toBeInTheDocument();
		expect(
			inputRowHost.querySelector(".mobile-chat-input__tool-list"),
		).toBeInTheDocument();
		expect(
			inputRowHost.querySelector(".mobile-chat-input__tools-composing"),
		).not.toBeInTheDocument();

		const textarea = await waitFor(() => {
			const textbox = within(inputRowHost).getByRole("textbox");
			expect(textbox).toHaveAttribute("id", "send_textarea");
			return textbox as HTMLTextAreaElement;
		});

		Object.defineProperty(textarea, "scrollHeight", {
			configurable: true,
			get: () => 80,
		});

		expect(
			within(shortcutsHost).queryByRole("button", {
				name: "Context usage unavailable",
			}),
		).not.toBeInTheDocument();

		fireEvent.click(
			within(shortcutsHost).getByRole("button", { name: "Impersonate" }),
		);
		fireEvent.click(
			within(inputRowHost).getByRole("button", { name: "Send message" }),
		);

		expect(impersonateClicks).toBe(1);
		expect(sendClicks).toBe(1);

		const host = inputRowHost;
		const inputRow = host.querySelector<HTMLElement>(".mobile-chat-input");
		const leftControls = host.querySelector<HTMLElement>(
			".mobile-chat-input__tools",
		);
		const controlsRow = host.querySelector<HTMLElement>(
			".mobile-chat-input__toolbar",
		);
		const textareaHost = host.querySelector<HTMLElement>(
			".mobile-chat-input__field",
		);
		const textareaMain = host.querySelector<HTMLElement>(
			".mobile-chat-input__textarea-slot",
		);
		const textareaActions = host.querySelector<HTMLElement>(
			".mobile-chat-input__actions",
		);
		expect(inputRow).toHaveAttribute("data-input-state", "default");
		expect(textareaHost).toContainElement(textareaMain);
		expect(textareaHost).toContainElement(controlsRow);
		expect(controlsRow).toContainElement(leftControls);
		expect(controlsRow).toContainElement(textareaActions);
		expect(leftControls).toHaveAttribute("data-left-state", "default");

		const mainMenuTrigger = within(host).getByRole("button", {
			name: "Current user avatar",
		});
		const leftControlsMenuButton = within(host).getByRole("button", {
			name: "Menu",
		});
		const leftControlsExtensionsButton = await within(host).findByRole(
			"button",
			{
				name: "Extension shortcuts",
			},
		);

		expect(leftControlsMenuButton).toHaveAttribute(
			"id",
			"mobile-send-form-menu-button",
		);
		expect(mainMenuTrigger).toHaveAttribute(
			"id",
			"mobile-chat-main-menu-trigger",
		);
		expect(leftControlsExtensionsButton).toHaveAttribute(
			"id",
			"mobile-send-form-extension-shortcuts-button",
		);
		expect(leftControls).toContainElement(mainMenuTrigger);
		expect(leftControls).toContainElement(leftControlsMenuButton);
		expect(leftControls).toContainElement(leftControlsExtensionsButton);
		expect(textareaActions).toContainElement(
			within(host).getByRole("button", { name: "Send message" }),
		);
		expect(leftControlsMenuButton).toHaveClass(
			"mobile-chat-input__tool-button",
		);
		expect(leftControlsExtensionsButton).toHaveClass(
			"mobile-chat-input__tool-button",
		);
		expect(leftControlsExtensionsButton).not.toBeDisabled();
		expect(leftControlsExtensionsButton).toHaveAttribute(
			"aria-hidden",
			"false",
		);

		const nativeExtensionsMenuOriginParent = extensionsMenu?.parentElement;
		const nativeExtensionsMenuOriginSibling = extensionsMenu?.nextSibling;

		fireEvent.pointerDown(leftControlsExtensionsButton);
		fireEvent.click(leftControlsExtensionsButton);

		const extensionsDrawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-extensions-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		const extensionsMenuHost = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-extensions-menu-host",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		expect(extensionsMenuClicks).toBe(0);
		expect(extensionsDrawer).toHaveAttribute(
			"data-vaul-drawer-direction",
			"bottom",
		);
		expect(extensionsDrawer).toHaveAttribute(
			"data-vaul-custom-container",
			"true",
		);
		expect(extensionsMenu?.parentElement).toBe(extensionsMenuHost);
		expect(extensionsMenuHost.contains(extensionsMenu)).toBe(true);
		expect(
			extensionsDrawer.querySelector(
				".mobile-send-form-extensions-drawer__label",
			),
		).toHaveTextContent("Extensions");
		expect(
			within(extensionsDrawer).getByText("Attach file"),
		).toBeInTheDocument();

		fireEvent.click(within(extensionsDrawer).getByText("Attach file"));

		expect(extensionActionClicks).toBe(1);
		await waitFor(() => {
			expect(extensionsMenu?.parentElement).toBe(
				nativeExtensionsMenuOriginParent,
			);
		});
		expect(extensionsMenu?.nextSibling).toBe(
			nativeExtensionsMenuOriginSibling,
		);

		textarea.focus();
		expect(document.activeElement).toBe(textarea);

		fireEvent.pointerDown(leftControlsMenuButton);
		fireEvent.click(leftControlsMenuButton);

		const optionsDrawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-options-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		expect(menuClicks).toBe(0);
		expect(optionsDrawer).toHaveAttribute(
			"data-vaul-drawer-direction",
			"bottom",
		);
		expect(optionsDrawer).toHaveAttribute(
			"data-vaul-custom-container",
			"true",
		);
		expect(document.activeElement).not.toBe(textarea);
		expect(
			within(optionsDrawer).getByRole("button", {
				name: "Author's Note",
			}),
		).toBeInTheDocument();
		expect(
			within(optionsDrawer).getByRole("button", {
				name: "Delete chat",
			}),
		).toBeInTheDocument();

		fireEvent.click(
			within(optionsDrawer).getByRole("button", {
				name: "Author's Note",
			}),
		);

		expect(authorNoteClicks).toBe(1);

		textarea.focus();
		expect(document.activeElement).toBe(textarea);

		fireEvent.pointerDown(leftControlsMenuButton);
		fireEvent.click(leftControlsMenuButton);

		const reopenedOptionsDrawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-options-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		expect(document.activeElement).not.toBe(textarea);

		fireEvent.click(
			within(reopenedOptionsDrawer).getByRole("button", {
				name: "Delete chat",
			}),
		);

		expect(confirmSpy).toHaveBeenCalledWith("Are you sure?");
		await waitFor(() => {
			expect(executeSlashCommandsWithOptions).toHaveBeenCalledWith(
				"/delchat",
			);
		});

		fireEvent.focus(textarea);
		fireEvent.input(textarea, { target: { value: "line 1\nline 2" } });

		await waitFor(() => {
			expect(inputRow).toHaveAttribute("data-input-state", "default");
			expect(inputRow).toHaveAttribute(
				"data-textarea-layout",
				"multi-line",
			);
			expect(leftControls).toHaveAttribute("data-left-state", "default");
		});

		expect(
			within(host).queryByRole("button", {
				hidden: true,
				name: "Expand left controls",
			}),
		).not.toBeInTheDocument();
		expect(
			document.getElementById("mobile-send-form-menu-button"),
		).toBeInTheDocument();
		expect(
			document.getElementById(
				"mobile-send-form-extension-shortcuts-button",
			),
		).toHaveAttribute("aria-hidden", "false");

		const avatarImage = within(host).getByAltText("Current user avatar");
		expect(avatarImage).toHaveAttribute("src", "/thumbs/hero-persona.png");
		expect(avatarImage).toHaveClass("mobile-chat-input__avatar-image");
		expect(within(host).getByLabelText("Current user avatar")).toHaveClass(
			"mobile-chat-input__avatar-button",
			"mobile-chat-main-menu__trigger",
		);
		expect(within(host).getByLabelText("Send message")).toHaveClass(
			"mobile-chat-input__send-button",
		);

		feature.unmount();

		const restoredQuickReplyBar = document.getElementById("qr--bar");
		const restoredTextarea = document.getElementById("send_textarea");
		const nonQrFormItems = document.getElementById("nonQRFormItems");
		const rightSendForm = document.getElementById("rightSendForm");
		const sendForm = document.getElementById("send_form");

		expect(
			document.getElementById("mobile-chat-shortcuts-host"),
		).not.toBeInTheDocument();
		expect(
			document.getElementById("mobile-chat-composer-host"),
		).not.toBeInTheDocument();
		expect(
			document.getElementById("mobile-chat-quick-replies-host"),
		).not.toBeInTheDocument();
		expect(
			document.getElementById("mobile-chat-input-host"),
		).not.toBeInTheDocument();
		expect(restoredQuickReplyBar?.parentElement).toBe(sendForm);
		expect(restoredQuickReplyBar?.nextElementSibling).toBe(nonQrFormItems);
		expect(restoredTextarea?.parentElement).toBe(nonQrFormItems);
		expect(restoredTextarea?.nextElementSibling).toBe(rightSendForm);

		feature.dispose();
	});

	test("renders the primary send action when the native send button is css-hidden but SillyTavern is connected", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" title="Continue" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea">hello</textarea>
          <div id="rightSendForm">
            <button id="send_but" class="displayNone" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			chatMetadata: {},
			characterId: 0,
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const nativeSendButton = document.getElementById("send_but");
		let sendClicks = 0;
		nativeSendButton?.addEventListener("click", () => {
			sendClicks += 1;
		});

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForInputRowHost();

		const primarySendButton = await within(host).findByRole("button", {
			name: "Send message",
		});
		expect(primarySendButton).toHaveClass("mobile-chat-input__send-button");

		fireEvent.click(primarySendButton);

		expect(sendClicks).toBe(1);

		feature.dispose();
	});

	test("renders shortcut buttons when settings are enabled even if native quick buttons are hidden", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" title="Continue" type="button"></button>
        <button id="option_impersonate" title="Impersonate" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" style="display: none;" title="Impersonate" type="button"></button>
            <button id="mes_continue" style="display: none;" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: true,
				quick_impersonate: true,
			},
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForShortcutsHost();

		expect(
			within(host).getByRole("button", { name: "Impersonate" }),
		).toBeInTheDocument();
		expect(
			within(host).getByRole("button", { name: "Continue" }),
		).toBeInTheDocument();

		feature.dispose();
	});

	test("synchronizes shortcut visibility immediately when the native SillyTavern settings toggles change", async () => {
		document.body.innerHTML = `
      <input id="quick_continue" type="checkbox" />
      <input id="quick_impersonate" type="checkbox" />
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" title="Continue" type="button"></button>
        <button id="option_impersonate" title="Impersonate" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" style="display: none;" title="Impersonate" type="button"></button>
            <button id="mes_continue" style="display: none;" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		const contextRef = {
			current: {
				chat: [{ is_system: false, is_user: true }],
				chatId: "chat-1",
				characters: [{ chat: "chat-1" }],
				getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
				Popup: {
					show: {
						confirm: vi.fn(),
					},
				},
				executeSlashCommandsWithOptions: vi.fn(),
				powerUserSettings: {
					continue_on_send: false,
					quick_continue: false,
					quick_impersonate: false,
				},
			},
		};
		setSillyTavernContext(contextRef);

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForShortcutsHost();

		expect(
			within(host).queryByRole("button", { name: "Continue" }),
		).not.toBeInTheDocument();
		expect(
			within(host).queryByRole("button", { name: "Impersonate" }),
		).not.toBeInTheDocument();

		const continueToggle = document.getElementById(
			"quick_continue",
		) as HTMLInputElement;
		const impersonateToggle = document.getElementById(
			"quick_impersonate",
		) as HTMLInputElement;

		contextRef.current = {
			...contextRef.current,
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: true,
				quick_impersonate: true,
			},
		};
		continueToggle.checked = true;
		impersonateToggle.checked = true;

		fireEvent.input(continueToggle);
		fireEvent.input(impersonateToggle);

		await waitFor(() => {
			expect(
				within(host).getByRole("button", { name: "Continue" }),
			).toBeInTheDocument();
			expect(
				within(host).getByRole("button", { name: "Impersonate" }),
			).toBeInTheDocument();
		});

		contextRef.current = {
			...contextRef.current,
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: false,
				quick_impersonate: false,
			},
		};
		continueToggle.checked = false;
		impersonateToggle.checked = false;

		fireEvent.input(continueToggle);
		fireEvent.input(impersonateToggle);

		await waitFor(() => {
			expect(
				within(host).queryByRole("button", { name: "Continue" }),
			).not.toBeInTheDocument();
			expect(
				within(host).queryByRole("button", { name: "Impersonate" }),
			).not.toBeInTheDocument();
		});

		feature.dispose();
	});

	test("hides shortcut buttons when their native options become unavailable", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" title="Continue" type="button"></button>
        <button id="option_impersonate" title="Impersonate" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" style="display: none;" title="Impersonate" type="button"></button>
            <button id="mes_continue" style="display: none;" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: true,
				quick_impersonate: true,
			},
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForShortcutsHost();

		const continueOption = document.getElementById(
			"option_continue",
		) as HTMLButtonElement;
		const impersonateOption = document.getElementById(
			"option_impersonate",
		) as HTMLButtonElement;

		expect(
			within(host).getByRole("button", { name: "Continue" }),
		).toBeInTheDocument();
		expect(
			within(host).getByRole("button", { name: "Impersonate" }),
		).toBeInTheDocument();

		continueOption.style.display = "none";

		await waitFor(() => {
			expect(
				within(host).queryByRole("button", { name: "Continue" }),
			).not.toBeInTheDocument();
		});

		impersonateOption.hidden = true;

		await waitFor(() => {
			expect(
				within(host).queryByRole("button", { name: "Impersonate" }),
			).not.toBeInTheDocument();
		});

		feature.dispose();
	});

	test("falls back to native option actions when native quick buttons are missing", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" title="Continue" type="button"></button>
        <button id="option_impersonate" title="Impersonate" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		let continueClicks = 0;
		let impersonateClicks = 0;

		document
			.getElementById("option_continue")
			?.addEventListener("click", () => {
				continueClicks += 1;
			});
		document
			.getElementById("option_impersonate")
			?.addEventListener("click", () => {
				impersonateClicks += 1;
			});

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: true,
				quick_impersonate: true,
			},
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForShortcutsHost();

		fireEvent.click(within(host).getByRole("button", { name: "Continue" }));
		fireEvent.click(
			within(host).getByRole("button", { name: "Impersonate" }),
		);

		expect(continueClicks).toBe(1);
		expect(impersonateClicks).toBe(1);

		feature.dispose();
	});

	test("releases focused main menu trigger before opening the drawer", async () => {
		const { feature, formSheld, trigger } =
			await mountMainMenuFocusFixture();

		try {
			trigger.focus();

			expect(document.activeElement).toBe(trigger);
			expect(formSheld.contains(document.activeElement)).toBe(true);

			fireEvent.pointerDown(trigger);
			fireEvent.click(trigger);

			await waitFor(() => {
				expect(
					document.getElementById("mobile-chat-main-menu-drawer"),
				).toBeInTheDocument();
				expect(document.activeElement).not.toBe(trigger);
				expect(formSheld.contains(document.activeElement)).toBe(false);
			});
		} finally {
			feature.dispose();
		}
	});

	test("releases focused main menu trigger for keyboard open keys", async () => {
		for (const key of ["Enter", " "] as const) {
			const { feature, formSheld, trigger } =
				await mountMainMenuFocusFixture();

			try {
				trigger.focus();

				expect(document.activeElement).toBe(trigger);
				expect(formSheld.contains(document.activeElement)).toBe(true);

				fireEvent.keyDown(trigger, { key });

				expect(document.activeElement).not.toBe(trigger);
				expect(formSheld.contains(document.activeElement)).toBe(false);

				fireEvent.click(trigger);

				await waitFor(() => {
					expect(
						document.getElementById("mobile-chat-main-menu-drawer"),
					).toBeInTheDocument();
					expect(formSheld.contains(document.activeElement)).toBe(
						false,
					);
				});
			} finally {
				feature.dispose();
			}
		}
	});

	test("keeps the main menu detail rows always visible across remounts", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		(globalThis as Record<string, unknown>).default_avatar =
			"/img/five.png";

		setSillyTavernContext({
			chatCompletionSettings: {
				chat_completion_source: "openrouter",
			},
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
			],
			chat: [
				{
					is_system: false,
					is_user: true,
				},
				{
					extra: {
						model: "openrouter/anthropic/claude-3.7-sonnet",
					},
					is_user: false,
				},
			],
			chatId: "chapter-1",
			chatMetadata: {},
			getChatCompletionModel: () =>
				"openrouter/anthropic/claude-3.7-sonnet",
			getThumbnailUrl: vi.fn((type: string, value: string) => {
				if (type === "persona") {
					return `/thumbs/persona/${value}`;
				}

				return `/thumbs/avatar/${value}`;
			}),
			Popup: {
				show: {
					confirm: vi.fn().mockResolvedValue(true),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			mainApi: "openai",
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
			timestampToMoment: vi.fn(() => ({
				format: vi.fn((pattern: string) =>
					pattern === "YYYY/MM/DD hh:mm A"
						? "2026/04/23 06:30 PM"
						: `unexpected:${pattern}`,
				),
			})),
		});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				json: async () => [
					{
						file_id: "chapter-1",
						file_name: "chapter-1.jsonl",
						file_size: "12 KB",
						last_mes: "2026-04-23T10:30:00.000Z",
					},
				],
				ok: true,
			}),
		);

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const openDrawer = async () => {
			const host = await waitForInputRowHost();

			const trigger = within(host).getByRole("button", {
				name: "Current user avatar",
			});
			const triggerAvatar = within(trigger).getByAltText(
				"Current user avatar",
			);
			fireEvent.click(trigger);

			const drawer = await waitFor(() => {
				const element = document.getElementById(
					"mobile-chat-main-menu-drawer",
				);
				expect(element).toBeInTheDocument();
				return element as HTMLElement;
			});

			return { drawer, host, triggerAvatar };
		};

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		let { drawer, triggerAvatar } = await openDrawer();

		expect(triggerAvatar).toHaveAttribute(
			"src",
			"/thumbs/persona/hero-persona",
		);
		expect(drawer).toHaveAttribute("data-vaul-drawer-direction", "bottom");
		expect(
			within(drawer).getByRole("img", { name: "Current chat avatar" }),
		).toHaveAttribute("src", "/thumbs/avatar/hero.png");
		expect(within(drawer).getByText("Hero")).toBeInTheDocument();
		expect(within(drawer).getByText("chapter-1")).toBeInTheDocument();

		expect(
			drawer.querySelector(".mobile-chat-main-menu-drawer__meta-row"),
		).not.toBeInTheDocument();

		let detailSection: HTMLElement | null = null;
		await waitFor(() => {
			const detailSection = drawer.querySelector(
				".mobile-chat-main-menu-drawer__detail-section",
			);
			expect(detailSection).toBeInTheDocument();
		});
		detailSection = drawer.querySelector(
			".mobile-chat-main-menu-drawer__detail-section",
		);
		expect(detailSection).toBeInTheDocument();
		expect(
			within(detailSection as HTMLElement).getByText("Current API"),
		).toBeInTheDocument();
		expect(
			within(detailSection as HTMLElement).queryByRole("button", {
				name: "More details",
			}),
		).not.toBeInTheDocument();
		expect(
			within(detailSection as HTMLElement).queryByRole("button", {
				name: "Less details",
			}),
		).not.toBeInTheDocument();
		expect(
			within(detailSection as HTMLElement).getByText("Most used model"),
		).toBeInTheDocument();
		expect(
			within(detailSection as HTMLElement).getByText(
				"Waiting for SillyTavern chat context",
			),
		).toBeInTheDocument();

		const tileGrid = drawer.querySelector(
			".mobile-chat-main-menu-drawer__grid",
		);
		expect(tileGrid).toBeInTheDocument();

		const tileButtons = within(tileGrid as HTMLElement).getAllByRole(
			"button",
		);
		expect(tileButtons).toHaveLength(6);
		expect(
			tileButtons.map((button) => button.getAttribute("aria-label")),
		).toEqual([
			"AI Settings",
			"User Settings",
			"Lorebook",
			"Extensions",
			"Backgrounds",
			"Character Management",
		]);

		const userSettingsButton = within(tileGrid as HTMLElement).getByRole(
			"button",
			{
				name: "User Settings",
			},
		);
		const userSettingsTitleLines = Array.from(
			userSettingsButton.querySelectorAll(
				".mobile-chat-main-menu-drawer__tile-title-line",
			),
		).map((line) => line.textContent);
		expect(userSettingsTitleLines).toEqual(["User", "Settings"]);
		expect(
			userSettingsButton.querySelector(
				".mobile-chat-main-menu-drawer__tile-glow",
			),
		).toBeInTheDocument();
		expect(
			userSettingsButton.querySelector(
				".mobile-chat-main-menu-drawer__tile-fade",
			),
		).toBeInTheDocument();
		expect(
			userSettingsButton.querySelector(
				".mobile-chat-main-menu-drawer__tile-deco-icon",
			),
		).toBeInTheDocument();
		expect(
			userSettingsButton.querySelectorAll(
				".mobile-chat-main-menu-drawer__tile-deco-icon",
			),
		).toHaveLength(1);

		const lorebookButton = within(tileGrid as HTMLElement).getByRole(
			"button",
			{
				name: "Lorebook",
			},
		);
		const lorebookTitleLines = Array.from(
			lorebookButton.querySelectorAll(
				".mobile-chat-main-menu-drawer__tile-title-line",
			),
		).map((line) => line.textContent);
		expect(lorebookTitleLines).toEqual(["Lorebook"]);
		expect(
			lorebookButton.querySelectorAll(
				".mobile-chat-main-menu-drawer__tile-deco-icon",
			),
		).toHaveLength(1);

		feature.dispose();

		const remountedFeature = createTestMobileSendFormFeature({
			documentRef: document,
		});
		remountedFeature.mount();

		({ drawer, triggerAvatar } = await openDrawer());

		expect(triggerAvatar).toHaveAttribute(
			"src",
			"/thumbs/persona/hero-persona",
		);
		detailSection = await waitFor(() => {
			const element = drawer.querySelector(
				".mobile-chat-main-menu-drawer__detail-section",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		expect(
			within(detailSection).queryByRole("button", {
				name: "More details",
			}),
		).not.toBeInTheDocument();
		expect(
			within(detailSection).getByText("Most used model"),
		).toBeInTheDocument();
		expect(
			within(detailSection).getByText(
				"Waiting for SillyTavern chat context",
			),
		).toBeInTheDocument();

		remountedFeature.dispose();

		const reopenedFeature = createTestMobileSendFormFeature({
			documentRef: document,
		});
		reopenedFeature.mount();

		({ drawer } = await openDrawer());

		detailSection = await waitFor(() => {
			const element = drawer.querySelector(
				".mobile-chat-main-menu-drawer__detail-section",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});
		expect(
			drawer.querySelector(".mobile-chat-main-menu-drawer__meta-row"),
		).not.toBeInTheDocument();
		expect(
			within(detailSection).queryByRole("button", {
				name: "More details",
			}),
		).not.toBeInTheDocument();
		expect(
			detailSection.querySelector(
				".mobile-chat-main-menu-drawer__detail-context-row",
			),
		).not.toBeInTheDocument();
		expect(
			within(detailSection).getByText("Most used model"),
		).toBeInTheDocument();
		expect(
			within(detailSection).getByText(
				"Waiting for SillyTavern chat context",
			),
		).toBeInTheDocument();

		reopenedFeature.dispose();
	});

	test("updates the current user card from the shared avatar store without reading persona card DOM copy", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		const eventSource = createEventSourceStub();
		const contextRef = {
			current: {
				Popup: {
					show: {
						confirm: vi.fn().mockResolvedValue(true),
					},
				},
				characterId: 0,
				characters: [
					{
						avatar: "hero.png",
						chat: "chapter-1",
						name: "Hero",
					},
				],
				chat: [
					{
						is_system: false,
						is_user: true,
					},
					{
						extra: {
							model: "openrouter/anthropic/claude-3.7-sonnet",
						},
						is_user: false,
					},
				],
				chatId: "chapter-1",
				chatMetadata: {},
				eventSource,
				eventTypes: {
					APP_READY: "app_ready",
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
					MESSAGE_SENT: "message_sent",
					PERSONA_CHANGED: "persona_changed",
					PERSONA_RENAMED: "persona_renamed",
					PERSONA_UPDATED: "persona_updated",
					SETTINGS_UPDATED: "settings_updated",
				},
				executeSlashCommandsWithOptions: vi.fn(),
				getThumbnailUrl: vi.fn((type: string, value: string) => {
					if (type === "persona") {
						return `/thumbs/persona/${value}`;
					}

					return `/thumbs/avatar/${value}`;
				}),
				name1: "Rivelle",
				powerUserSettings: {
					continue_on_send: false,
					persona_descriptions: {
						"hero-persona": {
							title: "Lead Pilot",
						},
					},
					personas: {
						"hero-persona": "Star Traveler",
					},
				},
				timestampToMoment: vi.fn(() => ({
					format: vi.fn(() => "2026/04/23 06:30 PM"),
				})),
				translate: (text: string) => text,
			},
		};

		setSillyTavernContext(contextRef);
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				json: async () => [
					{
						file_id: "chapter-1",
						file_name: "chapter-1.jsonl",
						file_size: "12 KB",
						last_mes: "2026-04-23T10:30:00.000Z",
					},
				],
				ok: true,
			}),
		);

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForInputRowHost();

		fireEvent.click(
			within(host).getByRole("button", {
				name: "Current user avatar",
			}),
		);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-chat-main-menu-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		const getCurrentUserCard = () =>
			drawer.querySelector(
				".mobile-chat-main-menu-drawer__current-user-card",
			) as HTMLElement | null;

		await waitFor(() => {
			const currentUserCard = getCurrentUserCard();
			expect(currentUserCard).toBeInTheDocument();
			expect(
				within(currentUserCard as HTMLElement).getByText("Rivelle"),
			).toBeInTheDocument();
			expect(
				within(currentUserCard as HTMLElement).getByText("Lead Pilot"),
			).toBeInTheDocument();
		});

		contextRef.current.name1 = "Captain Rivelle";
		contextRef.current.powerUserSettings.personas["hero-persona"] =
			"Sky Captain";
		eventSource.emit("persona_renamed", {
			avatarId: "hero-persona",
			newName: "Sky Captain",
			oldName: "Star Traveler",
		});

		await waitFor(() => {
			const currentUserCard = getCurrentUserCard();
			expect(
				within(currentUserCard as HTMLElement).getByText(
					"Captain Rivelle",
				),
			).toBeInTheDocument();
		});

		contextRef.current.powerUserSettings.persona_descriptions[
			"hero-persona"
		].title = "Bridge Lead";
		eventSource.emit("persona_updated", "hero-persona");

		await waitFor(() => {
			const currentUserCard = getCurrentUserCard();
			expect(
				within(currentUserCard as HTMLElement).getByText("Bridge Lead"),
			).toBeInTheDocument();
		});

		Reflect.deleteProperty(
			contextRef.current.powerUserSettings.persona_descriptions[
				"hero-persona"
			],
			"title",
		);
		contextRef.current.name1 = "Sky Captain";
		eventSource.emit("settings_updated");

		await waitFor(() => {
			const currentUserCard = getCurrentUserCard();
			expect(
				within(currentUserCard as HTMLElement).getByText("Sky Captain"),
			).toBeInTheDocument();
			expect(
				within(currentUserCard as HTMLElement).queryByText(
					"Bridge Lead",
				),
			).not.toBeInTheDocument();
		});

		feature.dispose();
	});

	test("routes the current user chat settings override button to the character dropdown after closing the main menu", async () => {
		const { feature, nativeSelect } =
			setupChatSettingsOverrideFixture("character");
		let selectedOptionId = "";
		let drawerStateWhenNativeTriggered: string | null = null;

		nativeSelect.addEventListener("change", () => {
			selectedOptionId = nativeSelect.selectedOptions[0]?.id ?? "";
			drawerStateWhenNativeTriggered =
				document
					.getElementById("mobile-chat-main-menu-drawer")
					?.getAttribute("data-state") ?? null;
		});

		const drawer = await openMainMenuFromCurrentUserAvatar();

		fireEvent.click(
			within(drawer).getByRole("button", {
				name: "Chat settings override",
			}),
		);

		await waitFor(() => {
			expect(selectedOptionId).toBe("set_chat_character_settings");
		});
		expect(drawerStateWhenNativeTriggered).toBe("closed");

		feature.dispose();
	});

	test("routes the current user chat settings override button to the group scenario button after closing the main menu", async () => {
		const { feature, nativeGroupButton } =
			setupChatSettingsOverrideFixture("group");
		let clickCount = 0;
		let drawerStateWhenNativeTriggered: string | null = null;

		nativeGroupButton?.addEventListener("click", () => {
			clickCount += 1;
			drawerStateWhenNativeTriggered =
				document
					.getElementById("mobile-chat-main-menu-drawer")
					?.getAttribute("data-state") ?? null;
		});

		const drawer = await openMainMenuFromCurrentUserAvatar();

		fireEvent.click(
			within(drawer).getByRole("button", {
				name: "Chat settings override",
			}),
		);

		await waitFor(() => {
			expect(clickCount).toBe(1);
		});
		expect(drawerStateWhenNativeTriggered).toBe("closed");

		feature.dispose();
	});

	test("opens rename chat as a sibling responsive dialog after closing the main menu drawer", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
			],
			chat: [
				{
					is_system: false,
					is_user: true,
					send_date: "2026-04-23T10:30:00.000Z",
				},
			],
			chatId: "chapter-1",
			chatMetadata: {},
			executeSlashCommandsWithOptions: vi.fn(),
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			getThumbnailUrl: vi.fn((type: string, value: string) => {
				if (type === "persona") {
					return `/thumbs/persona/${value}`;
				}

				return `/thumbs/avatar/${value}`;
			}),
			Popup: {
				show: {
					confirm: vi.fn().mockResolvedValue(true),
				},
			},
			powerUserSettings: { continue_on_send: false },
			renameChat: vi.fn().mockResolvedValue(undefined),
			timestampToMoment: vi.fn(() => ({
				format: vi.fn(() => "2026/04/23 06:30 PM"),
			})),
			translate: (text: string) => text,
		});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				json: async () => [
					{
						file_id: "chapter-1",
						file_name: "chapter-1.jsonl",
						file_size: "12 KB",
						last_mes: "2026-04-23T10:30:00.000Z",
					},
				],
				ok: true,
			}),
		);

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForInputRowHost();

		fireEvent.click(
			within(host).getByRole("button", {
				name: "Current user avatar",
			}),
		);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-chat-main-menu-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		fireEvent.click(
			within(drawer).getByRole("button", { name: "Rename chat" }),
		);

		await waitFor(() => {
			expect(
				document.getElementById("mobile-chat-main-menu-drawer"),
			).not.toBeInTheDocument();
		});

		const dialog = await screen.findByRole("dialog", {
			name: "Rename chat",
		});
		expect(within(dialog).getByText("Hero")).toBeInTheDocument();
		expect(within(dialog).getByText("chapter-1")).toBeInTheDocument();
		expect(
			within(dialog).getByRole("textbox", { name: "New chat name" }),
		).toHaveValue("chapter-1");

		feature.dispose();
	});

	test("opens delete chat as a sibling responsive dialog and confirms through the delete adapter path", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		const eventSource = createEventSourceStub();
		const executeSlashCommandsWithOptions = vi.fn();
		const openCharacterChat = vi.fn(async (chatId: string) => {
			contextRef.current.chatId = chatId;
			contextRef.current.characters[0].chat = chatId;
			contextRef.current.chat = [
				{
					is_system: false,
					is_user: false,
					mes: "Fresh replacement reply",
					send_date: "2026-04-24T11:30:00.000Z",
				},
			];
			eventSource.emit("chat_changed", chatId);
		});
		const contextRef = {
			current: {
				characterId: 0,
				characters: [
					{
						avatar: "hero.png",
						chat: "chapter-1",
						name: "Hero",
					},
				],
				chat: [
					{
						is_system: false,
						is_user: true,
						mes: "Hello",
						send_date: "2026-04-23T10:20:00.000Z",
					},
					{
						extra: {
							model: "openrouter/anthropic/claude-3.7-sonnet",
						},
						is_system: false,
						is_user: false,
						mes: "Reply 3",
						send_date: "2026-04-23T10:30:00.000Z",
					},
				],
				chatId: "chapter-1",
				chatMetadata: {},
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_DELETED: "chat_deleted",
				},
				executeSlashCommandsWithOptions,
				getRequestHeaders: () => ({
					Authorization: "Bearer test-token",
				}),
				getThumbnailUrl: vi.fn((type: string, value: string) => {
					if (type === "persona") {
						return `/thumbs/persona/${value}`;
					}

					return `/thumbs/avatar/${value}`;
				}),
				openCharacterChat,
				powerUserSettings: { continue_on_send: false },
				timestampToMoment: vi.fn(() => ({
					format: vi.fn(() => "2026/04/23 06:30 PM"),
					valueOf: vi.fn(() =>
						Date.parse("2026-04-23T10:30:00.000Z"),
					),
				})),
				translate: (text: string) => text,
			},
		};

		setSillyTavernContext(contextRef);
		const fetchMock = vi.fn(async (input: string) => {
			if (input === "/api/chats/delete") {
				return {
					ok: true,
				};
			}

			if (input === "/api/characters/chats") {
				return {
					json: async () => [
						{
							file_id: "chapter-1",
							file_name: "chapter-1.jsonl",
							file_size: "12 KB",
							last_mes: "2026-04-23T10:30:00.000Z",
						},
						{
							file_id: "chapter-3",
							file_name: "chapter-3.jsonl",
							file_size: "16 KB",
							last_mes: "2026-04-24T11:30:00.000Z",
						},
					],
					ok: true,
				};
			}

			throw new Error(`Unexpected fetch request: ${input}`);
		});
		vi.stubGlobal("fetch", fetchMock);

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForInputRowHost();

		fireEvent.click(
			within(host).getByRole("button", {
				name: "Current user avatar",
			}),
		);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-chat-main-menu-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		fireEvent.click(
			within(drawer).getByRole("button", { name: "Delete chat" }),
		);

		await waitFor(() => {
			expect(
				document.getElementById("mobile-chat-main-menu-drawer"),
			).not.toBeInTheDocument();
		});

		const dialog = await screen.findByRole("dialog", {
			name: "Delete chat",
		});
		expect(within(dialog).getByText("Reply 3")).toBeInTheDocument();
		expect(within(dialog).getByText("chapter-1")).toBeInTheDocument();

		fireEvent.click(
			within(dialog).getByRole("button", { name: "Delete chat" }),
		);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith("/api/chats/delete", {
				body: JSON.stringify({
					avatar_url: "hero.png",
					chatfile: "chapter-1.jsonl",
				}),
				headers: {
					Authorization: "Bearer test-token",
					"Content-Type": "application/json",
				},
				method: "POST",
			});
		});
		await waitFor(() => {
			expect(openCharacterChat).toHaveBeenCalledWith("chapter-3");
		});
		expect(executeSlashCommandsWithOptions).not.toHaveBeenCalled();

		feature.dispose();
	});

	test("opens the main menu drawer with a group identity and falls back to a no-active-chat state when chatId is missing", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		(globalThis as Record<string, unknown>).default_avatar =
			"/img/five.png";

		const eventListeners = new Map<
			string,
			Set<(...args: unknown[]) => void>
		>();
		const eventSource = {
			emit(event: string, ...args: unknown[]) {
				for (const listener of eventListeners.get(event) ?? []) {
					listener(...args);
				}
			},
			on(event: string, listener: (...args: unknown[]) => void) {
				const activeListeners = eventListeners.get(event) ?? new Set();
				activeListeners.add(listener);
				eventListeners.set(event, activeListeners);
			},
			removeListener(
				event: string,
				listener: (...args: unknown[]) => void,
			) {
				eventListeners.get(event)?.delete(listener);
			},
		};

		const contextRef = {
			current: {
				chat: [],
				chatId: "party-night",
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHAT_LOADED: "chat_loaded",
				},
				getThumbnailUrl: vi.fn((type: string, value: string) => {
					if (type === "persona") {
						return `/thumbs/persona/${value}`;
					}

					return `/thumbs/avatar/${value}`;
				}),
				groupId: "group-1",
				groups: [
					{
						avatar_url: "/groups/party-night.png",
						chat_id: "party-night",
						id: "group-1",
						members: ["hero.png", "mage.png"],
						name: "Party Night",
					},
				],
				Popup: {
					show: {
						confirm: vi.fn().mockResolvedValue(true),
					},
				},
				executeSlashCommandsWithOptions: vi.fn(),
				getRequestHeaders: () => ({
					Authorization: "Bearer test-token",
				}),
				powerUserSettings: { continue_on_send: false },
				timestampToMoment: vi.fn(() => ({
					format: vi.fn((pattern: string) =>
						pattern === "YYYY/MM/DD hh:mm A"
							? "2026/04/22 05:00 PM"
							: `unexpected:${pattern}`,
					),
				})),
			},
		};

		setSillyTavernContext(contextRef.current);
		(
			globalThis as { SillyTavern?: { getContext(): unknown } }
		).SillyTavern = {
			getContext: () => contextRef.current,
		};
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				json: async () => ({
					file_size: "24 KB",
					last_mes: "2026-04-22T09:00:00.000Z",
				}),
				ok: true,
			}),
		);

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForInputRowHost();

		fireEvent.click(
			within(host).getByRole("button", {
				name: "Current user avatar",
			}),
		);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-chat-main-menu-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		expect(within(drawer).getByText("Party Night")).toBeInTheDocument();
		expect(within(drawer).getByText("party-night")).toBeInTheDocument();
		expect(
			within(drawer).getByRole("img", { name: "Current chat avatar" }),
		).toHaveAttribute("src", "/groups/party-night.png");
		expect(
			drawer.querySelector(".mobile-chat-main-menu-drawer__meta-row"),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(
				".mobile-chat-main-menu-drawer__detail-section",
			),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelectorAll(
				".mobile-chat-main-menu-drawer__detail-separator",
			),
		).toHaveLength(0);

		contextRef.current = {
			...contextRef.current,
			chatId: "",
			groupId: "",
		};

		eventSource.emit("chat_changed");

		await waitFor(() => {
			expect(
				within(drawer).getByText("No active chat"),
			).toBeInTheDocument();
		});
		expect(
			within(drawer).queryByText("party-night"),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(".mobile-chat-main-menu-drawer__meta-row"),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(
				".mobile-chat-main-menu-drawer__detail-section",
			),
		).not.toBeInTheDocument();
		expect(
			within(drawer).queryByRole("button", { name: /chat details/i }),
		).not.toBeInTheDocument();
		expect(
			within(drawer).getByRole("img", { name: "Current chat avatar" }),
		).toHaveAttribute("src", "/img/five.png");

		feature.dispose();
	});

	test("persists shortcuts toolbar visibility when toggled from the options drawer", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
        <button id="option_delete_mes" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		window.localStorage.removeItem(
			MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
		);

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			chatMetadata: {},
			characterId: 0,
			characters: [{ chat: "chat-1" }],
			Popup: {
				show: {
					confirm: vi.fn().mockResolvedValue(true),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: { continue_on_send: false },
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const { composerHost, inputRowHost, shortcutsHost } =
			await waitForSendFormHosts();
		const composer = composerHost.querySelector(".mobile-chat-composer");

		expect(
			shortcutsHost.querySelector(".mobile-send-form-shortcuts"),
		).toBeInTheDocument();
		expect(composer).toHaveAttribute("data-shortcuts-visible", "true");

		const menuButton = within(inputRowHost).getByRole("button", {
			name: "Menu",
		});
		fireEvent.pointerDown(menuButton);
		fireEvent.click(menuButton);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-options-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		const visibilityToggle = within(drawer).getByRole("switch", {
			name: "Show chat shortcuts",
		});

		fireEvent.click(visibilityToggle);

		await waitFor(() => {
			expect(
				shortcutsHost.querySelector(".mobile-send-form-shortcuts"),
			).not.toBeInTheDocument();
			expect(composer).toHaveAttribute("data-shortcuts-visible", "false");
		});
		expect(
			window.localStorage.getItem(
				MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
			),
		).toBe("false");

		feature.unmount();
		feature.mount();

		const {
			composerHost: remountedComposerHost,
			shortcutsHost: remountedHost,
		} = await waitForSendFormHosts();

		expect(
			remountedHost.querySelector(".mobile-send-form-shortcuts"),
		).not.toBeInTheDocument();
		expect(
			remountedComposerHost.querySelector(".mobile-chat-composer"),
		).toHaveAttribute("data-shortcuts-visible", "false");

		feature.unmount();
		window.localStorage.removeItem(
			MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
		);
	});

	test("keeps the options drawer available while the textarea is multiline", async () => {
		try {
			document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;">
        <div id="attach_file_wand_container" class="extension_container">
          <div id="attach_file_action" role="button" tabindex="0">
            <div class="fa-solid fa-paperclip extensionsMenuExtensionButton"></div>
            <span>Attach file</span>
          </div>
        </div>
      </div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

			window.matchMedia = vi.fn().mockImplementation(() => ({
				addEventListener: vi.fn(),
				matches: true,
				removeEventListener: vi.fn(),
			}));

			setSillyTavernContext({
				chat: [{ is_system: false, is_user: true }],
				chatId: "chat-1",
				characters: [{ chat: "chat-1" }],
				getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
				Popup: {
					show: {
						confirm: vi.fn(),
					},
				},
				executeSlashCommandsWithOptions: vi.fn(),
				powerUserSettings: { continue_on_send: false },
			});

			ensureAstraProjectaUiInfrastructure({ documentRef: document });

			const feature = createTestMobileSendFormFeature({
				documentRef: document,
			});
			feature.mount();

			const host = await waitForInputRowHost();

			const textarea = within(host).getByRole(
				"textbox",
			) as HTMLTextAreaElement;
			const leftControls = host.querySelector(
				".mobile-chat-input__tools",
			);

			Object.defineProperty(textarea, "scrollHeight", {
				configurable: true,
				get: () => 80,
			});

			fireEvent.focus(textarea);
			fireEvent.input(textarea, { target: { value: "line 1\nline 2" } });

			await waitFor(() => {
				expect(leftControls).toHaveAttribute(
					"data-left-state",
					"default",
				);
			});

			const menuButton = within(host).getByRole("button", {
				name: "Menu",
			});

			fireEvent.pointerDown(menuButton);
			fireEvent.click(menuButton);

			await waitFor(() => {
				expect(
					document.getElementById("mobile-send-form-options-drawer"),
				).toBeInTheDocument();
			});

			feature.dispose();
		} finally {
			vi.useRealTimers();
		}
	});

	test("keeps the extensions drawer available while the textarea is multiline", async () => {
		try {
			document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;">
        <div id="attach_file_wand_container" class="extension_container">
          <div id="attach_file_action" role="button" tabindex="0">
            <div class="fa-solid fa-paperclip extensionsMenuExtensionButton"></div>
            <span>Attach file</span>
          </div>
        </div>
      </div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

			window.matchMedia = vi.fn().mockImplementation(() => ({
				addEventListener: vi.fn(),
				matches: true,
				removeEventListener: vi.fn(),
			}));

			setSillyTavernContext({
				chat: [{ is_system: false, is_user: true }],
				chatId: "chat-1",
				characters: [{ chat: "chat-1" }],
				getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
				Popup: {
					show: {
						confirm: vi.fn(),
					},
				},
				executeSlashCommandsWithOptions: vi.fn(),
				powerUserSettings: { continue_on_send: false },
			});

			ensureAstraProjectaUiInfrastructure({ documentRef: document });

			const feature = createTestMobileSendFormFeature({
				documentRef: document,
			});
			feature.mount();

			const host = await waitForInputRowHost();

			const textarea = within(host).getByRole(
				"textbox",
			) as HTMLTextAreaElement;
			const leftControls = host.querySelector(
				".mobile-chat-input__tools",
			);

			Object.defineProperty(textarea, "scrollHeight", {
				configurable: true,
				get: () => 80,
			});

			fireEvent.focus(textarea);
			fireEvent.input(textarea, { target: { value: "line 1\nline 2" } });

			await waitFor(() => {
				expect(leftControls).toHaveAttribute(
					"data-left-state",
					"default",
				);
			});

			const extensionsButton = within(host).getByRole("button", {
				name: "Extension shortcuts",
			});

			fireEvent.pointerDown(extensionsButton);
			fireEvent.click(extensionsButton);

			await waitFor(() => {
				expect(
					document.getElementById(
						"mobile-send-form-extensions-drawer",
					),
				).toBeInTheDocument();
			});

			feature.dispose();
		} finally {
			vi.useRealTimers();
		}
	});

	test("does not render an expand button while the textarea is multiline", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;">
        <div id="attach_file_wand_container" class="extension_container">
          <div id="attach_file_action" role="button" tabindex="0">
            <div class="fa-solid fa-paperclip extensionsMenuExtensionButton"></div>
            <span>Attach file</span>
          </div>
        </div>
      </div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			powerUserSettings: { continue_on_send: false },
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForInputRowHost();

		const textarea = within(host).getByRole(
			"textbox",
		) as HTMLTextAreaElement;
		const leftControls = host.querySelector(".mobile-chat-input__tools");

		Object.defineProperty(textarea, "scrollHeight", {
			configurable: true,
			get: () => 80,
		});

		fireEvent.focus(textarea);
		fireEvent.input(textarea, { target: { value: "line 1\nline 2" } });

		await waitFor(() => {
			expect(leftControls).toHaveAttribute("data-left-state", "default");
		});

		expect(
			within(host).queryByRole("button", {
				hidden: true,
				name: "Expand left controls",
			}),
		).not.toBeInTheDocument();
		expect(
			within(host).getByRole("button", { name: "Menu" }),
		).toBeInTheDocument();
		expect(
			within(host).getByRole("button", {
				name: "Extension shortcuts",
			}),
		).toBeInTheDocument();

		feature.dispose();
	});

	test("keeps left controls visible after textarea focus and outside pointerdown", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;">
        <div id="attach_file_wand_container" class="extension_container">
          <div id="attach_file_action" role="button" tabindex="0">
            <div class="fa-solid fa-paperclip extensionsMenuExtensionButton"></div>
            <span>Attach file</span>
          </div>
        </div>
      </div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			powerUserSettings: { continue_on_send: false },
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForInputRowHost();

		const textarea = within(host).getByRole(
			"textbox",
		) as HTMLTextAreaElement;
		const leftControls = host.querySelector(".mobile-chat-input__tools");

		Object.defineProperty(textarea, "scrollHeight", {
			configurable: true,
			get: () => 80,
		});

		fireEvent.focus(textarea);
		fireEvent.input(textarea, { target: { value: "line 1\nline 2" } });

		await waitFor(() => {
			expect(leftControls).toHaveAttribute("data-left-state", "default");
		});

		fireEvent.pointerDown(
			within(host).getByRole("button", { name: "Current user avatar" }),
		);

		expect(leftControls).toHaveAttribute("data-left-state", "default");

		feature.dispose();
	});

	test("keeps the extensions trigger disabled when the native menu is missing or empty", async () => {
		document.body.innerHTML = `
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: { continue_on_send: false },
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForInputRowHost();

		const leftControlsExtensionsButton = document.getElementById(
			"mobile-send-form-extension-shortcuts-button",
		) as HTMLButtonElement | null;

		expect(leftControlsExtensionsButton).toBeDisabled();
		expect(leftControlsExtensionsButton).toHaveAttribute(
			"aria-hidden",
			"true",
		);
		expect(leftControlsExtensionsButton).toHaveAttribute("tabindex", "-1");

		expect(leftControlsExtensionsButton).not.toBeNull();
		fireEvent.click(leftControlsExtensionsButton as HTMLButtonElement);

		await waitFor(() => {
			expect(
				document.getElementById("mobile-send-form-extensions-drawer"),
			).not.toBeInTheDocument();
		});

		feature.dispose();
	});

	test("keeps the extensions trigger disabled when the native menu button is missing", async () => {
		document.body.innerHTML = `
      <div id="extensionsMenu" class="options-content" style="display: none;">
        <div id="attach_file_wand_container" class="extension_container">
          <div id="attach_file_action" role="button" tabindex="0">
            <div class="fa-solid fa-paperclip extensionsMenuExtensionButton"></div>
            <span>Attach file</span>
          </div>
        </div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: { continue_on_send: false },
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		await waitForInputRowHost();

		const leftControlsExtensionsButton = document.getElementById(
			"mobile-send-form-extension-shortcuts-button",
		) as HTMLButtonElement | null;

		expect(leftControlsExtensionsButton).toBeDisabled();
		expect(leftControlsExtensionsButton).toHaveAttribute(
			"aria-hidden",
			"true",
		);
		expect(leftControlsExtensionsButton).toHaveAttribute("tabindex", "-1");

		fireEvent.click(leftControlsExtensionsButton as HTMLButtonElement);

		await waitFor(() => {
			expect(
				document.getElementById("mobile-send-form-extensions-drawer"),
			).not.toBeInTheDocument();
		});

		feature.dispose();
	});

	test("restores the native extensions menu when the menu node is replaced or the feature unmounts while open", async () => {
		document.body.innerHTML = `
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;">
        <div id="first_wand_container" class="extension_container">
          <div id="first_action" role="button" tabindex="0">
            <div class="fa-solid fa-paperclip extensionsMenuExtensionButton"></div>
            <span>First action</span>
          </div>
        </div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" title="Impersonate" type="button"></button>
            <button id="mes_continue" title="Continue" type="button"></button>
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: { continue_on_send: false },
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForInputRowHost();
		const originalMenu = document.getElementById(
			"extensionsMenu",
		) as HTMLElement | null;
		const originalParent = originalMenu?.parentElement;
		const originalSibling = originalMenu?.nextSibling;
		const leftControlsExtensionsButton = await within(host).findByRole(
			"button",
			{
				name: "Extension shortcuts",
			},
		);

		fireEvent.pointerDown(leftControlsExtensionsButton);
		fireEvent.click(leftControlsExtensionsButton);

		const replacementMenuHost = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-extensions-menu-host",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		await waitFor(() => {
			expect(originalMenu?.parentElement).toBe(replacementMenuHost);
		});

		const replacementMenu = document.createElement("div");
		replacementMenu.id = "extensionsMenu";
		replacementMenu.className = "options-content";
		replacementMenu.style.display = "none";
		replacementMenu.innerHTML = `
          <div id="replacement_wand_container" class="extension_container">
            <div id="replacement_action" role="button" tabindex="0">
              <div class="fa-solid fa-wand-magic-sparkles extensionsMenuExtensionButton"></div>
              <span>Replacement action</span>
            </div>
          </div>
        `;

		originalMenu?.remove();
		document.body.appendChild(replacementMenu);

		await waitFor(() => {
			expect(originalMenu?.parentElement).toBe(originalParent);
		});
		expect(originalMenu?.nextSibling).toBe(originalSibling);

		fireEvent.pointerDown(leftControlsExtensionsButton);
		fireEvent.click(leftControlsExtensionsButton);

		await waitFor(() => {
			expect(replacementMenu.parentElement).toBe(replacementMenuHost);
		});

		feature.unmount();

		expect(replacementMenu.parentElement).toBe(document.body);
		expect(
			document.getElementById("mobile-send-form-extensions-drawer"),
		).not.toBeInTheDocument();

		feature.dispose();
	});

	test("uses translated Astra fallback copy for quick shortcuts and extensions drawer chrome", async () => {
		document.body.innerHTML = `
      <div id="options_button"></div>
      <div id="extensionsMenuButton"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;">
        <div id="attach_file_wand_container" class="extension_container">
          <div id="attach_file_action" role="button" tabindex="0">
            <div class="fa-solid fa-paperclip extensionsMenuExtensionButton"></div>
            <span>Attach file</span>
          </div>
        </div>
      </div>
      <div id="options">
        <button id="option_continue" type="button"></button>
        <button id="option_impersonate" type="button"></button>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" type="button"></button>
            <button id="mes_continue" type="button"></button>
            <button id="send_but" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: true,
				quick_impersonate: true,
			},
			translate: vi.fn((text: string, key: string) => `${key}::${text}`),
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const { inputRowHost, shortcutsHost } = await waitForSendFormHosts();

		expect(
			await within(shortcutsHost).findByRole("button", {
				name: "sendForm.shortcuts.impersonate::Ask AI to write your message for you",
			}),
		).toBeInTheDocument();
		expect(
			await within(shortcutsHost).findByRole("button", {
				name: "sendForm.shortcuts.continue::Continue the last message",
			}),
		).toBeInTheDocument();

		const extensionsButton = within(inputRowHost).getByRole("button", {
			name: "sendForm.extensions.trigger::Extension shortcuts",
		});

		fireEvent.pointerDown(extensionsButton);
		fireEvent.click(extensionsButton);

		const extensionsDrawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-extensions-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		expect(
			within(extensionsDrawer).getByText(
				"sendForm.extensions.title::Extensions",
			),
		).toBeInTheDocument();
		expect(
			within(extensionsDrawer).getByText(
				"sendForm.extensions.description::Live SillyTavern extension shortcuts for the chat send form.",
			),
		).toBeInTheDocument();
		expect(
			within(extensionsDrawer).getByText(
				"sendForm.extensions.sectionLabel::Extensions",
			),
		).toBeInTheDocument();

		feature.dispose();
	});

	test("renders the quick reply visibility toggle with the textarea visible by default when native quick replies are enabled", async () => {
		const feature = setupQuickReplyVisibilityFixture();

		const { inputRowHost, quickReplyHost, shortcutsHost } =
			await waitForSendFormHosts();
		const inputRow = inputRowHost.querySelector(".mobile-chat-input");
		const textareaMain = inputRowHost.querySelector(
			".mobile-chat-input__textarea-slot",
		);
		const shortcutsStrip = shortcutsHost.querySelector(
			".mobile-send-form-shortcuts__strip",
		) as HTMLElement | null;
		expect(shortcutsStrip).toBeInTheDocument();

		const shortcutButtons = within(
			shortcutsStrip as HTMLElement,
		).getAllByRole("button");
		const textareaActions = inputRowHost.querySelector(
			".mobile-chat-input__actions",
		);
		const quickReplyToggle = within(inputRowHost).getByRole("button", {
			name: "Show quick replies",
		});
		const sendButton = within(inputRowHost).getByRole("button", {
			name: "Send message",
		});

		expect(shortcutButtons[0]).toHaveAttribute(
			"id",
			"sillytavern-interface-panel-trigger",
		);
		expect(shortcutButtons[0]).toHaveAccessibleName("ST menu");
		expect(
			shortcutButtons[0].querySelector(".lucide-brain-circuit"),
		).toBeInTheDocument();
		expect(
			shortcutButtons[0].querySelector(
				".mobile-send-form-shortcuts__button-chevron .lucide-chevron-down",
			),
		).toBeInTheDocument();
		expect(
			within(shortcutsHost).queryByRole("button", {
				name: "Show quick replies",
			}),
		).not.toBeInTheDocument();
		expect(quickReplyToggle).toHaveAttribute(
			"id",
			"mobile-send-form-quick-reply-toggle",
		);
		expect(
			quickReplyToggle.querySelector(".lucide-message-circle-reply"),
		).toBeInTheDocument();
		expect(textareaActions?.firstElementChild).toBe(quickReplyToggle);
		expect(quickReplyToggle.nextElementSibling).toBe(sendButton);
		expect(shortcutButtons[1]).toHaveAccessibleName("Impersonate");
		expectQuickReplyHostInTextareaSlot({
			inputRowHost,
			quickReplyHost,
		});
		expect(inputRow).toHaveAttribute("data-active-panel", "textarea");
		expect(textareaMain).not.toHaveAttribute("hidden");
		expect(quickReplyHost).toHaveAttribute("hidden");
		expect(quickReplyHost.querySelector("#qr--bar")).toBeInTheDocument();

		feature.dispose();
	});

	test("shows and hides the quick reply host from the persisted visibility toggle", async () => {
		const feature = setupQuickReplyVisibilityFixture();

		const { inputRowHost, quickReplyHost, shortcutsHost } =
			await waitForSendFormHosts();
		const inputRow = inputRowHost.querySelector(".mobile-chat-input");
		const textareaMain = inputRowHost.querySelector(
			".mobile-chat-input__textarea-slot",
		);
		expect(
			within(shortcutsHost).queryByRole("button", {
				name: "Show quick replies",
			}),
		).not.toBeInTheDocument();
		const showToggle = within(inputRowHost).getByRole("button", {
			name: "Show quick replies",
		});

		fireEvent.click(showToggle);

		await waitFor(() => {
			expect(quickReplyHost).not.toHaveAttribute("hidden");
		});
		expect(inputRow).toHaveAttribute("data-active-panel", "quick-reply");
		expect(textareaMain).toHaveAttribute("hidden");
		expect(
			window.localStorage.getItem(
				"astra_projecta.mobile_send_form.quick_reply_visible",
			),
		).toBe("true");

		const hideToggle = within(inputRowHost).getByRole("button", {
			name: "Hide quick replies",
		});
		expect(
			hideToggle.querySelector(".lucide-keyboard"),
		).toBeInTheDocument();

		fireEvent.click(hideToggle);

		await waitFor(() => {
			expect(quickReplyHost).toHaveAttribute("hidden");
		});
		expect(inputRow).toHaveAttribute("data-active-panel", "textarea");
		expect(textareaMain).not.toHaveAttribute("hidden");
		expect(
			window.localStorage.getItem(
				"astra_projecta.mobile_send_form.quick_reply_visible",
			),
		).toBe("false");

		feature.dispose();
	});

	test("starts with the quick reply host hidden when persisted visibility is false and can show it again", async () => {
		const feature = setupQuickReplyVisibilityFixture({
			storedVisibility: "false",
		});

		const { inputRowHost, quickReplyHost, shortcutsHost } =
			await waitForSendFormHosts();
		const inputRow = inputRowHost.querySelector(".mobile-chat-input");
		const textareaMain = inputRowHost.querySelector(
			".mobile-chat-input__textarea-slot",
		);

		expect(quickReplyHost).toHaveAttribute("hidden");
		expect(inputRow).toHaveAttribute("data-active-panel", "textarea");
		expect(textareaMain).not.toHaveAttribute("hidden");
		expect(
			within(shortcutsHost).queryByRole("button", {
				name: "Show quick replies",
			}),
		).not.toBeInTheDocument();

		const showToggle = within(inputRowHost).getByRole("button", {
			name: "Show quick replies",
		});
		expect(
			showToggle.querySelector(".lucide-message-circle-reply"),
		).toBeInTheDocument();
		fireEvent.click(showToggle);

		await waitFor(() => {
			expect(quickReplyHost).not.toHaveAttribute("hidden");
		});
		expect(inputRow).toHaveAttribute("data-active-panel", "quick-reply");
		expect(textareaMain).toHaveAttribute("hidden");

		feature.dispose();
	});

	test("hides the quick reply visibility toggle and host when native quick replies are disabled", async () => {
		const feature = setupQuickReplyVisibilityFixture({
			nativeToggle: "unchecked",
		});

		const { inputRowHost, quickReplyHost, shortcutsHost } =
			await waitForSendFormHosts();
		const inputRow = inputRowHost.querySelector(".mobile-chat-input");
		const textareaMain = inputRowHost.querySelector(
			".mobile-chat-input__textarea-slot",
		);

		expect(
			within(shortcutsHost).queryByRole("button", {
				name: "Hide quick replies",
			}),
		).not.toBeInTheDocument();
		expect(
			within(shortcutsHost).queryByRole("button", {
				name: "Show quick replies",
			}),
		).not.toBeInTheDocument();
		expect(
			within(inputRowHost).queryByRole("button", {
				name: "Hide quick replies",
			}),
		).not.toBeInTheDocument();
		expect(
			within(inputRowHost).queryByRole("button", {
				name: "Show quick replies",
			}),
		).not.toBeInTheDocument();
		expect(quickReplyHost).toHaveAttribute("hidden");
		expect(inputRow).toHaveAttribute("data-active-panel", "textarea");
		expect(textareaMain).not.toHaveAttribute("hidden");

		feature.dispose();
	});

	test("hides the quick reply visibility toggle and keeps the textarea visible when the native quick reply setting is unavailable", async () => {
		const feature = setupQuickReplyVisibilityFixture({
			nativeToggle: "missing",
		});

		const { inputRowHost, quickReplyHost, shortcutsHost } =
			await waitForSendFormHosts();
		const inputRow = inputRowHost.querySelector(".mobile-chat-input");
		const textareaMain = inputRowHost.querySelector(
			".mobile-chat-input__textarea-slot",
		);

		expect(
			within(shortcutsHost).queryByRole("button", {
				name: "Hide quick replies",
			}),
		).not.toBeInTheDocument();
		expect(
			within(shortcutsHost).queryByRole("button", {
				name: "Show quick replies",
			}),
		).not.toBeInTheDocument();
		expect(
			within(inputRowHost).queryByRole("button", {
				name: "Hide quick replies",
			}),
		).not.toBeInTheDocument();
		expect(
			within(inputRowHost).queryByRole("button", {
				name: "Show quick replies",
			}),
		).not.toBeInTheDocument();
		expect(quickReplyHost).toHaveAttribute("hidden");
		expect(inputRow).toHaveAttribute("data-active-panel", "textarea");
		expect(textareaMain).not.toHaveAttribute("hidden");
		expect(document.getElementById("qr--bar")).toBeInTheDocument();

		feature.dispose();
	});

	test("opens the SillyTavern interface from the first shortcuts button and closes it with the dedicated close button", async () => {
		document.body.innerHTML = `
      <div id="options_button"></div>
      <div id="extensionsMenuButton"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" type="button"></button>
        <button id="option_impersonate" type="button"></button>
      </div>
      <div id="persona-management-button" class="drawer">
        <div class="drawer-toggle"></div>
        <div id="PersonaManagement" class="drawer-content closedDrawer">
          <div class="flex-container wide100p alignitemscenter spaceBetween flexNoGap">
            <div class="flex-container alignItemsBaseline wide100p">
              <div class="flex1 flex-container alignItemsBaseline">
                <h3 class="margin0"><span>Persona Management</span></h3>
              </div>
              <div class="flex-container">
                <div class="menu_button menu_button_icon user_stats_button"><span>Usage Stats</span></div>
                <div id="personas_backup" class="menu_button menu_button_icon"><span>Backup</span></div>
                <div id="personas_restore" class="menu_button menu_button_icon"><span>Restore</span></div>
                <input id="personas_restore_input" type="file" accept=".json" hidden />
              </div>
            </div>
            <div id="persona-management-block" class="flex-container wide100p flexGap10">
              <div class="persona_management_left_column flex1 overflowHidden wide100p">
                <div id="user_avatar_block">
                  <div class="avatar-container selected" data-avatar-id="hero-persona">
                    <span>Star Traveler</span>
                  </div>
                </div>
              </div>
              <div class="persona_management_right_column flex1">
                <div class="persona_management_current_persona">
                  <h4 class="standoutHeader">Current Persona</h4>
                  <h5 id="your_name" class="persona_name">Star Traveler</h5>
                  <textarea id="persona_description" name="persona_description">Lead Pilot</textarea>
                </div>
                <div class="persona_management_global_settings">
                  <h4 class="standoutHeader">Global Settings</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" type="button"></button>
            <button id="mes_continue" type="button"></button>
            <button id="send_but" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: true,
				quick_impersonate: true,
			},
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createMountedMobileSendFormWithSillyTavernInterface({
			documentRef: document,
		});
		feature.mount();

		const host = await waitForShortcutsHost();
		const shortcutsStrip = host.querySelector(
			".mobile-send-form-shortcuts__strip",
		) as HTMLElement | null;

		expect(shortcutsStrip).toBeInTheDocument();

		const shortcutButtons = within(
			shortcutsStrip as HTMLElement,
		).getAllByRole("button");

		expect(shortcutButtons[0]).toHaveAccessibleName("ST menu");
		expect(shortcutButtons[0]).toHaveTextContent("ST menu");
		expect(
			shortcutButtons[0].querySelector(".lucide-brain-circuit"),
		).toBeInTheDocument();
		expect(
			shortcutButtons[0].querySelector(
				".mobile-send-form-shortcuts__button-chevron .lucide-chevron-down",
			),
		).toBeInTheDocument();
		expect(shortcutButtons[0]).toHaveAttribute("data-variant", "outline");
		expect(shortcutButtons[0]).toHaveAttribute("data-size", "sm");
		expect(shortcutButtons[1]).toHaveAttribute("data-size", "icon-sm");

		fireEvent.click(shortcutButtons[0]);

		const sillyTavernInterface = await waitFor(() => {
			const element = document.getElementById(
				"sillytavern-interface-panel",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});
		const sillyTavernInterfaceBodyHeader =
			sillyTavernInterface.querySelector(
				".sillytavern-interface-panel__footer",
			) as HTMLElement | null;

		expect(sillyTavernInterface).toHaveAttribute("data-side", "right");
		expect(
			document.getElementById(
				"sillytavern-interface-panel-close-button-wrapper",
			),
		).toBeInTheDocument();
		expect(sillyTavernInterfaceBodyHeader).toBeInTheDocument();
		expect(
			within(sillyTavernInterface).getByRole("button", { name: "Back" }),
		).toBeInTheDocument();
		expect(sillyTavernInterfaceBodyHeader).toContainElement(
			within(sillyTavernInterface).getByRole("button", { name: "Back" }),
		);
		expect(sillyTavernInterfaceBodyHeader).toContainElement(
			within(sillyTavernInterface).getByRole("button", {
				name: "On this page",
			}),
		);
		expect(sillyTavernInterfaceBodyHeader).toContainElement(
			within(sillyTavernInterface).getByRole("button", {
				name: "Toggle main navigation",
			}),
		);
		expect(
			within(sillyTavernInterface).getByRole("button", {
				name: "On this page",
			}),
		).toBeDisabled();
		expect(
			within(sillyTavernInterface).getByRole("navigation", {
				name: "Page shortcuts",
			}),
		).toBeInTheDocument();
		expect(
			sillyTavernInterface
				.querySelector(".sillytavern-interface-panel__header")
				?.contains(
					within(sillyTavernInterface).getByRole("button", {
						name: "Back",
					}),
				),
		).toBe(false);
		expect(
			screen.getByRole("dialog", { name: "AI Settings" }),
		).toBeInTheDocument();
		expect(
			document.getElementById("sillytavern-interface-panel-title"),
		).toHaveTextContent("AI Settings");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-icon-frame"),
		).toHaveAttribute("data-icon-kind", "main-menu-svg");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-svg-icon svg"),
		).toBeInTheDocument();
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-summary"),
		).toHaveTextContent("Tune prompts and generation behavior.");
		expect(
			within(sillyTavernInterface).getByRole("link", {
				name: "Open SillyTavern documentation",
			}),
		).toHaveAttribute(
			"href",
			"https://docs.sillytavern.app/usage/prompts/prompt-manager/",
		);
		expect(
			document.getElementById("sillytavern-interface-panel-content"),
		).toHaveTextContent(
			"SillyTavern AI Response Configuration is unavailable in the current DOM.",
		);

		fireEvent.click(
			within(sillyTavernInterface).getByRole("button", {
				name: "Toggle main navigation",
			}),
		);

		expect(
			within(sillyTavernInterface).queryByRole("navigation", {
				name: "Page shortcuts",
			}),
		).not.toBeInTheDocument();
		expect(
			window.localStorage.getItem(
				"astra_projecta.sillytavern_interface.main_navigation_visible",
			),
		).toBe("false");

		fireEvent.click(
			within(sillyTavernInterface).getByRole("button", {
				name: "Toggle main navigation",
			}),
		);

		expect(
			within(sillyTavernInterface).getByRole("navigation", {
				name: "Page shortcuts",
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("dialog", {
				name: "Core Settings",
			}),
		).not.toBeInTheDocument();

		fireEvent.click(
			within(
				within(sillyTavernInterface).getByRole("navigation", {
					name: "Page shortcuts",
				}),
			).getByRole("button", { name: "User Settings" }),
		);

		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", {
					name: "Core Settings",
				}),
			).not.toBeInTheDocument();
			expect(
				screen.getByRole("dialog", { name: "User Settings" }),
			).toBeInTheDocument();
		});

		expect(
			document.getElementById("sillytavern-interface-panel-title"),
		).toHaveTextContent("User Settings");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-icon-frame"),
		).toHaveAttribute("data-icon-kind", "main-menu-svg");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-svg-icon svg"),
		).toBeInTheDocument();
		expect(
			within(sillyTavernInterface).getByRole("link", {
				name: "Open SillyTavern documentation",
			}),
		).toHaveAttribute(
			"href",
			"https://docs.sillytavern.app/usage/user-settings/",
		);
		expect(
			document.getElementById("sillytavern-interface-panel-content"),
		).toHaveTextContent(
			"SillyTavern User Settings are unavailable in the current DOM.",
		);

		fireEvent.click(
			document.getElementById(
				"sillytavern-interface-panel-close-button",
			) as HTMLElement,
		);

		await waitFor(() => {
			expect(
				document.getElementById("sillytavern-interface-panel"),
			).not.toBeInTheDocument();
		});

		feature.dispose();
	});

	test("keeps the context usage shortcut in the top shortcuts toolbar when usage data is available", async () => {
		const eventSource = createEventSourceStub();

		document.body.innerHTML = `
      <div id="options_button"></div>
      <div id="extensionsMenuButton"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" type="button"></button>
        <button id="option_impersonate" type="button"></button>
      </div>
      <div id="chat">
        <div class="mes lastInContext" mesid="0"></div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" type="button"></button>
            <button id="mes_continue" type="button"></button>
            <button id="send_but" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				json: async () => ({ count: 23 }),
				ok: true,
			}),
		);

		setSillyTavernContext({
			chat: [{ content: "hello", role: "user" }],
			chatCompletionSettings: {
				openai_max_context: 4096,
				openai_max_tokens: 512,
			},
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			eventSource,
			eventTypes: {
				CHAT_COMPLETION_PROMPT_READY: "CHAT_COMPLETION_PROMPT_READY",
				GENERATION_AFTER_COMMANDS: "GENERATION_AFTER_COMMANDS",
				GENERATION_ENDED: "GENERATION_ENDED",
				MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer token",
			}),
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			getTokenizerModel: () => "gpt-4o",
			mainApi: "openai",
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: true,
				quick_impersonate: true,
			},
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createTestMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitForShortcutsHost();

		act(() => {
			eventSource.emit("GENERATION_AFTER_COMMANDS", "normal", {}, false);
		});

		await waitFor(() => {
			const contextSlot = host.querySelector(
				".mobile-send-form-shortcuts__context-slot",
			) as HTMLElement | null;
			const trigger = contextSlot?.querySelector(
				'[data-slot="mobile-chat-context-usage-shortcut"]',
			) as HTMLButtonElement | null;

			expect(contextSlot).toBeInTheDocument();
			expect(trigger).toBeInTheDocument();
			expect(trigger).toBeDisabled();
			expect(trigger).toHaveAccessibleName("Loading context usage");
		});

		act(() => {
			eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
				chat: [{ content: "hello", role: "user" }],
			});
		});

		const shortcutsToolbar = host.querySelector(
			".mobile-send-form-shortcuts",
		) as HTMLElement | null;

		await waitFor(() => {
			const contextSlot = host.querySelector(
				".mobile-send-form-shortcuts__context-slot",
			) as HTMLElement | null;

			expect(shortcutsToolbar).toBeInTheDocument();
			expect(contextSlot).toBeInTheDocument();
			const trigger = contextSlot?.querySelector(
				'[data-slot="mobile-chat-context-usage-shortcut"]',
			) as HTMLButtonElement | null;

			expect(trigger).toBeInTheDocument();
			expect(trigger).toBeDisabled();
			expect(trigger).toHaveAccessibleName("Loading context usage");
			expect(shortcutsToolbar).toContainElement(contextSlot);
		});

		act(() => {
			eventSource.emit("GENERATION_ENDED");
		});

		act(() => {
			eventSource.emit("MESSAGE_RECEIVED", 1, "normal");
		});

		await waitFor(() => {
			const trigger = host.querySelector(
				'[data-slot="mobile-chat-context-usage-shortcut"]',
			) as HTMLButtonElement | null;

			expect(trigger).toBeInTheDocument();
			expect(trigger).toBeDisabled();
			expect(trigger).toHaveAccessibleName("Loading context usage");
			expect(
				trigger?.querySelector(
					".mobile-chat-context-usage-shortcut__loading-dots",
				),
			).toBeInTheDocument();
		});

		act(() => {
			eventSource.emit("CHAT_COMPLETION_PROMPT_READY", {
				chat: [
					{ content: "hello", role: "user" },
					{ content: "generated reply", role: "assistant" },
				],
				dryRun: true,
			});
		});

		await waitFor(() => {
			const trigger = host.querySelector(
				'[data-slot="mobile-chat-context-usage-shortcut"]',
			) as HTMLButtonElement | null;

			expect(trigger).toBeInTheDocument();
			expect(trigger).not.toBeDisabled();
			expect(trigger).toHaveAccessibleName("Open context usage details");
		});

		feature.dispose();
	});

	test("keeps the SillyTavern interface trigger opening the last selected route after drawer routing", async () => {
		document.body.innerHTML = `
      <div id="options_button"></div>
      <div id="extensionsMenuButton"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" type="button"></button>
        <button id="option_impersonate" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="persona-management-button" class="drawer">
        <div class="drawer-toggle"></div>
        <div id="PersonaManagement" class="drawer-content closedDrawer">
          <div class="flex-container wide100p alignitemscenter spaceBetween flexNoGap">
            <div class="flex-container alignItemsBaseline wide100p">
              <div class="flex1 flex-container alignItemsBaseline">
                <h3 class="margin0"><span>Persona Management</span></h3>
              </div>
              <div class="flex-container">
                <div class="menu_button menu_button_icon user_stats_button"><span>Usage Stats</span></div>
                <div id="personas_backup" class="menu_button menu_button_icon"><span>Backup</span></div>
                <div id="personas_restore" class="menu_button menu_button_icon"><span>Restore</span></div>
                <input id="personas_restore_input" type="file" accept=".json" hidden />
              </div>
            </div>
            <div id="persona-management-block" class="flex-container wide100p flexGap10">
              <div class="persona_management_left_column flex1 overflowHidden wide100p">
                <div id="user_avatar_block_panel">
                  <div class="avatar-container selected" data-avatar-id="hero-persona">
                    <span>Star Traveler</span>
                  </div>
                </div>
              </div>
              <div class="persona_management_right_column flex1">
                <div class="persona_management_current_persona">
                  <h4 class="standoutHeader">Current Persona</h4>
                  <h5 id="your_name" class="persona_name">Star Traveler</h5>
                  <textarea id="persona_description" name="persona_description">Lead Pilot</textarea>
                </div>
                <div class="persona_management_global_settings">
                  <h4 class="standoutHeader">Global Settings</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" type="button"></button>
            <button id="mes_continue" type="button"></button>
            <button id="send_but" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: {
				continue_on_send: false,
				personas: {
					"hero-persona": "Star Traveler",
				},
				quick_continue: true,
				quick_impersonate: true,
			},
			translate: (text: string) => text,
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
		const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

		globalThis.requestAnimationFrame = ((
			callback: FrameRequestCallback,
		) => {
			callback(performance.now());
			return 0;
		}) as typeof globalThis.requestAnimationFrame;
		globalThis.cancelAnimationFrame =
			vi.fn() as typeof globalThis.cancelAnimationFrame;

		const feature = createMountedMobileSendFormWithSillyTavernInterface({
			documentRef: document,
		});
		feature.mount();

		try {
			const { inputRowHost, shortcutsHost } =
				await waitForSendFormHosts();
			const shortcutsStrip = shortcutsHost.querySelector(
				".mobile-send-form-shortcuts__strip",
			) as HTMLElement | null;
			const shortcutButtons = within(
				shortcutsStrip as HTMLElement,
			).getAllByRole("button");
			const avatarButton = within(inputRowHost).getByRole("button", {
				name: "Current user avatar",
			});

			fireEvent.click(avatarButton);
			fireEvent.click(
				screen.getByRole("button", { name: "User Settings" }),
			);

			await waitFor(() => {
				expect(
					screen.getByRole("dialog", { name: "User Settings" }),
				).toBeInTheDocument();
			});

			fireEvent.click(
				document.getElementById(
					"sillytavern-interface-panel-close-button",
				) as HTMLElement,
			);

			await waitFor(() => {
				expect(
					document.getElementById("sillytavern-interface-panel"),
				).not.toBeInTheDocument();
			});

			fireEvent.click(shortcutButtons[0] as HTMLElement);

			await waitFor(() => {
				expect(
					screen.getByRole("dialog", { name: "User Settings" }),
				).toBeInTheDocument();
				expect(
					document.getElementById(
						"sillytavern-interface-panel-title",
					),
				).toHaveTextContent("User Settings");
				expect(
					window.localStorage.getItem(
						SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
					),
				).toBe(SILLYTAVERN_INTERFACE_ROUTES.userSettings);
			});
		} finally {
			globalThis.requestAnimationFrame = originalRequestAnimationFrame;
			globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
			feature.dispose();
		}
	});

	test("opens the stored SillyTavern interface route from the saved trigger on mount", async () => {
		document.body.innerHTML = `
      <div id="options_button"></div>
      <div id="extensionsMenuButton"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" type="button"></button>
        <button id="option_impersonate" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="persona-management-button" class="drawer">
        <div class="drawer-toggle"></div>
        <div id="PersonaManagement" class="drawer-content closedDrawer">
          <div class="flex-container wide100p alignitemscenter spaceBetween flexNoGap">
            <div class="flex-container alignItemsBaseline wide100p">
              <div class="flex1 flex-container alignItemsBaseline">
                <h3 class="margin0"><span>Persona Management</span></h3>
              </div>
              <div class="flex-container">
                <div class="menu_button menu_button_icon user_stats_button"><span>Usage Stats</span></div>
                <div id="personas_backup" class="menu_button menu_button_icon"><span>Backup</span></div>
                <div id="personas_restore" class="menu_button menu_button_icon"><span>Restore</span></div>
                <input id="personas_restore_input" type="file" accept=".json" hidden />
              </div>
            </div>
            <div id="persona-management-block" class="flex-container wide100p flexGap10">
              <div class="persona_management_left_column flex1 overflowHidden wide100p">
                <div id="user_avatar_block_panel">
                  <div class="avatar-container selected" data-avatar-id="hero-persona">
                    <span>Star Traveler</span>
                  </div>
                </div>
              </div>
              <div class="persona_management_right_column flex1">
                <div class="persona_management_current_persona">
                  <h4 class="standoutHeader">Current Persona</h4>
                  <h5 id="your_name" class="persona_name">Star Traveler</h5>
                  <textarea id="persona_description" name="persona_description">Lead Pilot</textarea>
                </div>
                <div class="persona_management_global_settings">
                  <h4 class="standoutHeader">Global Settings</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" type="button"></button>
            <button id="mes_continue" type="button"></button>
            <button id="send_but" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			SILLYTAVERN_INTERFACE_ROUTES.personaManagement,
		);
		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: {
				continue_on_send: false,
				personas: {
					"hero-persona": "Star Traveler",
				},
				quick_continue: true,
				quick_impersonate: true,
			},
			translate: (text: string) => text,
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createMountedMobileSendFormWithSillyTavernInterface({
			documentRef: document,
		});
		feature.mount();

		const host = await waitForShortcutsHost();
		const shortcutsStrip = host.querySelector(
			".mobile-send-form-shortcuts__strip",
		) as HTMLElement | null;
		const shortcutButtons = within(
			shortcutsStrip as HTMLElement,
		).getAllByRole("button");

		fireEvent.click(shortcutButtons[0] as HTMLElement);

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "Persona Management" }),
			).toBeInTheDocument();
			expect(
				document.getElementById("sillytavern-interface-panel-title"),
			).toHaveTextContent("Persona Management");
			expect(
				document.getElementById("sillytavern-interface-panel-content"),
			).toHaveTextContent("Usage Stats");
			expect(
				document.getElementById("sillytavern-interface-panel-content"),
			).toHaveTextContent("Current Persona");
			expect(
				document.getElementById("sillytavern-interface-panel-content"),
			).toHaveTextContent("Global Settings");
		});

		feature.dispose();
	});

	test("reopens Persona Management on the last stored persona tab", async () => {
		document.body.innerHTML = `
      <div id="options_button"></div>
      <div id="extensionsMenuButton"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" type="button"></button>
        <button id="option_impersonate" type="button"></button>
      </div>
      <div id="persona-management-button" class="drawer">
        <div class="drawer-toggle"></div>
        <div id="PersonaManagement" class="drawer-content closedDrawer">
          <div class="flex-container wide100p alignitemscenter spaceBetween flexNoGap">
            <div class="flex-container alignItemsBaseline wide100p">
              <div class="flex1 flex-container alignItemsBaseline">
                <h3 class="margin0"><span>Persona Management</span></h3>
              </div>
              <div class="flex-container">
                <div class="menu_button menu_button_icon user_stats_button"><span>Usage Stats</span></div>
              </div>
            </div>
            <div id="persona-management-block" class="flex-container wide100p flexGap10">
              <div class="persona_management_left_column flex1 overflowHidden wide100p">
                <div id="user_avatar_block">
                  <div class="avatar-container selected" data-avatar-id="hero-persona">
                    <span>Star Traveler</span>
                  </div>
                </div>
              </div>
              <div class="persona_management_right_column flex1">
                <div class="persona_management_current_persona">
                  <h4 class="standoutHeader">Current Persona</h4>
                  <h5 id="your_name" class="persona_name">Star Traveler</h5>
                </div>
                <div class="persona_management_global_settings">
                  <h4 class="standoutHeader">Global Settings</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" type="button"></button>
            <button id="mes_continue" type="button"></button>
            <button id="send_but" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			SILLYTAVERN_INTERFACE_ROUTES.personaManagement,
		);
		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: {
				continue_on_send: false,
				personas: {
					"hero-persona": "Star Traveler",
				},
				quick_continue: true,
				quick_impersonate: true,
			},
			translate: (text: string) => text,
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createMountedMobileSendFormWithSillyTavernInterface({
			documentRef: document,
		});
		feature.mount();

		const host = await waitForShortcutsHost();
		const shortcutsStrip = host.querySelector(
			".mobile-send-form-shortcuts__strip",
		) as HTMLElement | null;
		const shortcutButtons = within(
			shortcutsStrip as HTMLElement,
		).getAllByRole("button");

		fireEvent.click(shortcutButtons[0] as HTMLElement);

		const tabList = await waitFor(() => {
			const panel = screen.getByRole("dialog", {
				name: "Persona Management",
			});
			expect(panel).toBeInTheDocument();
			return within(panel).getByRole("tablist", {
				name: "Persona Management sections",
			});
		});
		const editTab = within(tabList).getByRole("tab", { name: "Edit" });

		fireEvent.mouseDown(editTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(editTab).toHaveAttribute("data-state", "active");
			expect(
				window.localStorage.getItem(
					SILLYTAVERN_INTERFACE_PERSONA_MANAGEMENT_ACTIVE_TAB_STORAGE_KEY,
				),
			).toBe("edit");
		});

		fireEvent.click(
			document.getElementById(
				"sillytavern-interface-panel-close-button",
			) as HTMLElement,
		);

		await waitFor(() => {
			expect(
				document.getElementById("sillytavern-interface-panel"),
			).not.toBeInTheDocument();
		});

		fireEvent.click(shortcutButtons[0] as HTMLElement);

		const reopenedTabList = await waitFor(() => {
			const panel = screen.getByRole("dialog", {
				name: "Persona Management",
			});
			expect(panel).toBeInTheDocument();
			return within(panel).getByRole("tablist", {
				name: "Persona Management sections",
			});
		});
		const reopenedEditTab = within(reopenedTabList).getByRole("tab", {
			name: "Edit",
		});

		await waitFor(() => {
			expect(reopenedEditTab).toHaveAttribute("data-state", "active");
		});

		feature.dispose();
	});

	test("falls back to AI Settings when the stored SillyTavern interface route is invalid", async () => {
		document.body.innerHTML = `
      <div id="options_button"></div>
      <div id="extensionsMenuButton"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_continue" type="button"></button>
        <button id="option_impersonate" type="button"></button>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="mes_impersonate" type="button"></button>
            <button id="mes_continue" type="button"></button>
            <button id="send_but" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			"missing-page",
		);
		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			characters: [{ chat: "chat-1" }],
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			powerUserSettings: {
				continue_on_send: false,
				quick_continue: true,
				quick_impersonate: true,
			},
			translate: (text: string) => text,
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createMountedMobileSendFormWithSillyTavernInterface({
			documentRef: document,
		});
		feature.mount();

		const host = await waitForShortcutsHost();
		const shortcutsStrip = host.querySelector(
			".mobile-send-form-shortcuts__strip",
		) as HTMLElement | null;
		const shortcutButtons = within(
			shortcutsStrip as HTMLElement,
		).getAllByRole("button");

		fireEvent.click(shortcutButtons[0] as HTMLElement);

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "AI Settings" }),
			).toBeInTheDocument();
			expect(
				document.getElementById("sillytavern-interface-panel-title"),
			).toHaveTextContent("AI Settings");
		});

		feature.dispose();
	});

	test("opens SillyTavern interface routes from main-menu tiles while migrating only the selected native root", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
        <button id="option_delete_mes" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="ai-response-configuration-root">
        <section id="left-nav-panel" class="drawer-content closedDrawer fillLeft">
          <div class="settings-panel">AI response settings</div>
        </section>
      </div>
      <div id="world-info-root">
        <div id="WorldInfo" class="drawer-content closedDrawer">
          <div class="settings-panel">Lorebook settings</div>
        </div>
      </div>
      <div id="extensions-root">
        <div id="rm_extensions_block" class="drawer-content closedDrawer">
          <div class="settings-panel">Extension settings</div>
        </div>
      </div>
      <div id="backgrounds-root">
        <div id="Backgrounds" class="drawer-content closedDrawer bg-drawer-layout">
          <div class="settings-panel">Background settings</div>
        </div>
      </div>
      <div id="character-management-root">
        <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight">
          <div class="scrollableInner">
            <div id="rm_print_characters_block">Character settings</div>
          </div>
        </nav>
      </div>
      <div id="settings-root">
        <section id="user-settings-block" class="closedDrawer">
          <div class="settings-panel">Profile settings</div>
        </section>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			chatMetadata: {},
			characterId: 0,
			characters: [{ avatar: "hero.png", chat: "chat-1", name: "Hero" }],
			Popup: {
				show: {
					confirm: vi.fn().mockResolvedValue(true),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			getThumbnailUrl: vi.fn((type: string, value: string) =>
				type === "avatar"
					? `/thumbs/avatar/${value}`
					: `/thumbs/persona/${value}`,
			),
			powerUserSettings: { continue_on_send: false },
			translate: (text: string) => text,
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const sillyTavernInterfaceTileFixtures = [
			{
				hostId: "sillytavern-interface-panel-ai-response-configuration-host",
				originalParentId: "ai-response-configuration-root",
				panelTitle: "AI Settings",
				rootId: "left-nav-panel",
				title: "AI Settings",
			},
			{
				hostId: "sillytavern-interface-panel-user-settings-host",
				originalParentId: "settings-root",
				panelTitle: "User Settings",
				rootId: "user-settings-block",
				title: "User Settings",
			},
			{
				hostId: "sillytavern-interface-panel-lorebook-host",
				originalParentId: "world-info-root",
				panelTitle: "Worlds/Lorebooks",
				rootId: "WorldInfo",
				title: "Lorebook",
			},
			{
				hostId: "sillytavern-interface-panel-extensions-host",
				originalParentId: "extensions-root",
				panelTitle: "Extensions",
				rootId: "rm_extensions_block",
				title: "Extensions",
			},
			{
				hostId: "sillytavern-interface-panel-backgrounds-host",
				originalParentId: "backgrounds-root",
				panelTitle: "Backgrounds",
				rootId: "Backgrounds",
				title: "Backgrounds",
			},
			{
				hostId: "sillytavern-interface-panel-character-management-host",
				originalParentId: "character-management-root",
				panelTitle: "Character Management",
				rootId: "right-nav-panel",
				title: "Character Management",
			},
		] as const;

		for (const fixture of sillyTavernInterfaceTileFixtures) {
			if (!fixture.rootId || !fixture.originalParentId) {
				continue;
			}

			expect(document.getElementById(fixture.rootId)?.parentElement).toBe(
				document.getElementById(fixture.originalParentId),
			);
		}

		const feature = createMountedMobileSendFormWithSillyTavernInterface({
			documentRef: document,
		});
		feature.mount();

		const host = await waitForInputRowHost();

		const avatarButton = within(host).getByRole("button", {
			name: "Current user avatar",
		});

		fireEvent.click(avatarButton);

		const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
		const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

		globalThis.requestAnimationFrame = ((
			callback: FrameRequestCallback,
		) => {
			callback(performance.now());
			return 0;
		}) as typeof globalThis.requestAnimationFrame;
		globalThis.cancelAnimationFrame =
			vi.fn() as typeof globalThis.cancelAnimationFrame;

		try {
			for (const fixture of sillyTavernInterfaceTileFixtures) {
				fireEvent.click(
					screen.getByRole("button", {
						name: fixture.title,
					}),
				);

				await waitFor(() => {
					expect(
						screen.getByRole("dialog", {
							name: fixture.panelTitle,
						}),
					).toBeInTheDocument();
					expect(avatarButton).toHaveAttribute(
						"aria-expanded",
						"false",
					);
				});

				for (const nativeFixture of sillyTavernInterfaceTileFixtures) {
					if (
						!nativeFixture.rootId ||
						!nativeFixture.originalParentId
					) {
						continue;
					}

					const sourceNode = document.getElementById(
						nativeFixture.rootId,
					);

					if (nativeFixture.rootId === fixture.rootId) {
						expect(sourceNode?.parentElement).toBe(
							document.getElementById(
								nativeFixture.hostId as string,
							),
						);
						expect(sourceNode).toHaveClass("openDrawer");
						expect(sourceNode).not.toHaveClass("closedDrawer");
						expect(sourceNode).toHaveAttribute(
							"data-astra-projecta-native-drawer-source",
							nativeFixture.rootId,
						);
						continue;
					}

					expect(sourceNode?.parentElement).toBe(
						document.getElementById(nativeFixture.originalParentId),
					);
					expect(sourceNode).toHaveClass("closedDrawer");
					expect(sourceNode).not.toHaveClass("openDrawer");
				}

				if (fixture.title === "Character Management") {
					expect(
						document
							.getElementById("sillytavern-interface-panel-title")
							?.querySelector(
								".sillytavern-interface__title-icon-frame",
							),
					).toHaveAttribute("data-icon-kind", "current-chat-avatar");
					expect(
						document
							.getElementById("sillytavern-interface-panel-title")
							?.querySelector(
								".sillytavern-interface__title-avatar-image",
							),
					).toHaveAttribute("src", "/thumbs/avatar/hero.png");
				}

				fireEvent.click(
					document.getElementById(
						"sillytavern-interface-panel-close-button",
					) as HTMLElement,
				);

				await waitFor(() => {
					expect(
						document.getElementById("sillytavern-interface-panel"),
					).not.toBeInTheDocument();
				});

				for (const nativeFixture of sillyTavernInterfaceTileFixtures) {
					if (
						!nativeFixture.rootId ||
						!nativeFixture.originalParentId
					) {
						continue;
					}

					const sourceNode = document.getElementById(
						nativeFixture.rootId,
					);
					expect(sourceNode?.parentElement).toBe(
						document.getElementById(nativeFixture.originalParentId),
					);
					expect(sourceNode).toHaveClass("closedDrawer");
					expect(sourceNode).not.toHaveClass("openDrawer");
					expect(sourceNode).not.toHaveAttribute(
						"data-astra-projecta-native-drawer-source",
					);
				}

				fireEvent.click(avatarButton);

				await waitFor(() => {
					expect(
						screen.getByRole("dialog", {
							name: "Chat",
						}),
					).toBeInTheDocument();
				});
			}
		} finally {
			globalThis.requestAnimationFrame = originalRequestAnimationFrame;
			globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
		}

		feature.dispose();

		for (const fixture of sillyTavernInterfaceTileFixtures) {
			if (!fixture.rootId || !fixture.originalParentId) {
				continue;
			}

			const sourceNode = document.getElementById(fixture.rootId);
			expect(sourceNode?.parentElement).toBe(
				document.getElementById(fixture.originalParentId),
			);
			expect(sourceNode).toHaveClass("closedDrawer");
			expect(sourceNode).not.toHaveClass("openDrawer");
		}
	});

	test("opens the AI Settings tile through the injected SillyTavern interface adapter", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
        <button id="option_delete_mes" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="ai-response-configuration-root">
        <section id="left-nav-panel" class="drawer-content closedDrawer fillLeft">
          <div class="settings-panel">AI response settings</div>
        </section>
      </div>
      <div id="advanced-formatting-root">
        <section id="AdvancedFormatting" class="drawer-content closedDrawer">
          <div class="settings-panel">Advanced formatting settings</div>
        </section>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			chatMetadata: {},
			characterId: 0,
			characters: [{ avatar: "hero.png", chat: "chat-1", name: "Hero" }],
			Popup: {
				show: {
					confirm: vi.fn().mockResolvedValue(true),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			getThumbnailUrl: vi.fn((type: string, value: string) =>
				type === "avatar"
					? `/thumbs/avatar/${value}`
					: `/thumbs/persona/${value}`,
			),
			powerUserSettings: { continue_on_send: false },
			translate: (text: string) => text,
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createMountedMobileSendFormWithSillyTavernInterface({
			documentRef: document,
		});
		feature.mount();

		const host = await waitForInputRowHost();
		const avatarButton = within(host).getByRole("button", {
			name: "Current user avatar",
		});

		const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
		const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

		globalThis.requestAnimationFrame = ((
			callback: FrameRequestCallback,
		) => {
			callback(performance.now());
			return 0;
		}) as typeof globalThis.requestAnimationFrame;
		globalThis.cancelAnimationFrame =
			vi.fn() as typeof globalThis.cancelAnimationFrame;

		try {
			fireEvent.click(avatarButton);
			fireEvent.click(
				screen.getByRole("button", { name: "AI Settings" }),
			);

			await waitFor(() => {
				expect(
					screen.getByRole("dialog", {
						name: "AI Settings",
					}),
				).toBeInTheDocument();
				expect(
					document.getElementById(
						"sillytavern-interface-panel-content",
					),
				).toHaveTextContent("AI response settings");
				expect(
					window.localStorage.getItem(
						SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
					),
				).toBe(SILLYTAVERN_INTERFACE_ROUTES.aiSettings);
			});

			fireEvent.click(
				document.getElementById(
					"sillytavern-interface-panel-close-button",
				) as HTMLElement,
			);

			await waitFor(() => {
				expect(
					document.getElementById("sillytavern-interface-panel"),
				).not.toBeInTheDocument();
			});

			fireEvent.click(avatarButton);
			fireEvent.click(
				screen.getByRole("button", { name: "AI Settings" }),
			);

			await waitFor(() => {
				expect(
					screen.getByRole("dialog", {
						name: "AI Settings",
					}),
				).toBeInTheDocument();
				expect(
					document.getElementById(
						"sillytavern-interface-panel-content",
					),
				).toHaveTextContent("AI response settings");
			});
		} finally {
			globalThis.requestAnimationFrame = originalRequestAnimationFrame;
			globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
			feature.dispose();
		}
	});

	test("reopens the Character Management tile on the last stored subheader tab", async () => {
		document.body.innerHTML = `
      <div id="options_button" title="Menu"></div>
      <div id="extensionsMenuButton" title="Extensions"></div>
      <div id="extensionsMenu" class="options-content" style="display: none;"></div>
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
        <button id="option_delete_mes" type="button"></button>
      </div>
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
      <div id="character-management-root">
        <button id="advanced_div" type="button">Native advanced</button>
        <button id="rm_button_characters" type="button">Native cards</button>
        <button id="rm_button_selected_ch" type="button">Native edit</button>
        <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
          <div class="scrollableInner">
            <div id="rm_print_characters_block">Character settings</div>
          </div>
        </nav>
        <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
          <div id="character_popup_text">Advanced definitions</div>
          <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
          <div id="character_popup_ok" class="menu_button">Save</div>
        </div>
      </div>
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm">
            <button id="send_but" title="Send message" type="button"></button>
          </div>
        </div>
      </form>
      </div>
    `;

		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;
		document
			.getElementById("advanced_div")
			?.addEventListener("click", () => {
				advancedPopup.style.display = "flex";
				advancedPopup.style.opacity = "1";
				advancedPopup.classList.add("open");
			});
		document
			.getElementById("character_cross")
			?.addEventListener("click", () => {
				advancedPopup.style.display = "none";
				advancedPopup.style.opacity = "0";
			});

		window.matchMedia = vi.fn().mockImplementation(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		}));

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			chatId: "chat-1",
			chatMetadata: {},
			characterId: 0,
			characters: [{ avatar: "hero.png", chat: "chat-1", name: "Hero" }],
			Popup: {
				show: {
					confirm: vi.fn().mockResolvedValue(true),
				},
			},
			executeSlashCommandsWithOptions: vi.fn(),
			getThumbnailUrl: vi.fn((type: string, value: string) =>
				type === "avatar"
					? `/thumbs/avatar/${value}`
					: `/thumbs/persona/${value}`,
			),
			powerUserSettings: { continue_on_send: false },
			translate: (text: string) => text,
		});

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createMountedMobileSendFormWithSillyTavernInterface({
			documentRef: document,
		});
		feature.mount();

		const host = await waitForInputRowHost();
		const avatarButton = within(host).getByRole("button", {
			name: "Current user avatar",
		});

		const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
		const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

		globalThis.requestAnimationFrame = ((
			callback: FrameRequestCallback,
		) => {
			callback(performance.now());
			return 0;
		}) as typeof globalThis.requestAnimationFrame;
		globalThis.cancelAnimationFrame =
			vi.fn() as typeof globalThis.cancelAnimationFrame;

		try {
			fireEvent.click(avatarButton);
			fireEvent.click(
				screen.getByRole("button", { name: "Character Management" }),
			);

			const sillyTavernInterface = await waitFor(() => {
				const element = screen.getByRole("dialog", {
					name: "Character Management",
				});
				expect(element).toBeInTheDocument();
				return element as HTMLElement;
			});
			const advancedTab = within(
				within(sillyTavernInterface).getByRole("tablist", {
					name: "Character Management sections",
				}),
			).getByRole("tab", { name: "Advanced" });

			fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

			await waitFor(() => {
				expect(advancedTab).toHaveAttribute("data-state", "active");
				expect(
					document.getElementById(
						"sillytavern-interface-panel-character-management-host",
					),
				).toHaveTextContent("Advanced definitions");
				expect(
					window.localStorage.getItem(
						"astra_projecta.sillytavern_interface.character_management_active_tab",
					),
				).toBe("advanced");
			});

			fireEvent.click(
				document.getElementById(
					"sillytavern-interface-panel-close-button",
				) as HTMLElement,
			);

			await waitFor(() => {
				expect(
					document.getElementById("sillytavern-interface-panel"),
				).not.toBeInTheDocument();
			});

			fireEvent.click(avatarButton);
			fireEvent.click(
				screen.getByRole("button", { name: "Character Management" }),
			);

			const reopenedPanel = await waitFor(() => {
				const element = screen.getByRole("dialog", {
					name: "Character Management",
				});
				expect(element).toBeInTheDocument();
				return element as HTMLElement;
			});
			const reopenedAdvancedTab = within(
				within(reopenedPanel).getByRole("tablist", {
					name: "Character Management sections",
				}),
			).getByRole("tab", { name: "Advanced" });

			await waitFor(() => {
				expect(reopenedAdvancedTab).toHaveAttribute(
					"data-state",
					"active",
				);
				expect(
					document.getElementById(
						"sillytavern-interface-panel-character-management-host",
					),
				).toHaveTextContent("Advanced definitions");
			});
		} finally {
			globalThis.requestAnimationFrame = originalRequestAnimationFrame;
			globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
			feature.dispose();
		}
	});
});
