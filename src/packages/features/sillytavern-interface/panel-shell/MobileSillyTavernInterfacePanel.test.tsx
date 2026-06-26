import * as React from "react";

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import { CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE } from "@/packages/features/sillytavern-interface/tools/character-management/characterManagementNative";
import { MobileSillyTavernInterfacePanel } from "@/packages/features/sillytavern-interface/panel-shell/MobileSillyTavernInterfacePanel";

function setSillyTavernContext(context: unknown) {
	Object.defineProperty(window, "SillyTavern", {
		configurable: true,
		value: {
			getContext: () => context,
		},
	});
}

function createActiveCharacterIdentitySnapshot(): CurrentChatIdentitySnapshot {
	return {
		avatarSource: "character-thumbnail",
		characterId: 0,
		chatFileName: "hero-chat",
		entityName: "Hero",
		groupAvatarUrls: [],
		groupId: null,
		hasActiveChat: true,
		kind: "character",
		thumbnailUrl: "/thumbs/avatar/hero.png",
		updatedAt: 1,
	};
}

const NATIVE_PAGE_FIXTURES = [
	{
		hostId: "sillytavern-interface-panel-ai-response-configuration-host",
		pageKey: "ai-response-configuration",
		rootId: "left-nav-panel",
		text: "AI response settings",
		title: "AI Settings",
	},
	{
		hostId: "sillytavern-interface-panel-connection-profile-host",
		pageKey: "connection-profile",
		rootId: "rm_api_block",
		text: "API connection settings",
		title: "AI Settings",
	},
	{
		hostId: "sillytavern-interface-panel-advanced-formatting-host",
		pageKey: "advanced-formatting",
		rootId: "AdvancedFormatting",
		text: "Advanced formatting settings",
		title: "AI Settings",
	},
	{
		hostId: "sillytavern-interface-panel-user-settings-host",
		pageKey: "user-settings",
		rootId: "user-settings-block",
		text: "Profile settings",
		title: "User Settings",
	},
	{
		hostId: "sillytavern-interface-panel-lorebook-host",
		pageKey: "worlds-lorebooks",
		rootId: "WorldInfo",
		text: "Lorebook settings",
		title: "Worlds/Lorebooks",
	},
	{
		hostId: "sillytavern-interface-panel-extensions-host",
		pageKey: "extensions",
		rootId: "rm_extensions_block",
		text: "Extension settings",
		title: "Extensions",
	},
	{
		hostId: "sillytavern-interface-panel-backgrounds-host",
		pageKey: "backgrounds",
		rootId: "Backgrounds",
		text: "Background settings",
		title: "Backgrounds",
	},
	{
		hostId: "sillytavern-interface-panel-character-management-host",
		pageKey: "character-management",
		rootId: "right-nav-panel",
		text: "Character settings",
		title: "Character Management",
	},
] as const;

function setupNativeDrawerFixtureDom() {
	document.body.innerHTML = `
        <div id="ai-response-configuration-root">
            <section id="left-nav-panel" class="drawer-content closedDrawer fillLeft extra">
                <div class="settings-panel">AI response settings</div>
                <div id="nested-left-nav-panel" class="closedDrawer">Nested AI response settings</div>
            </section>
            <div id="after-left-nav-panel"></div>
        </div>
        <div id="connection-profile-root">
            <section id="rm_api_block" class="drawer-content closedDrawer extra">
                <div class="settings-panel">API connection settings</div>
                <div id="nested-rm_api_block" class="closedDrawer">Nested API settings</div>
            </section>
            <div id="after-rm_api_block"></div>
        </div>
        <div id="advanced-formatting-root">
            <section id="AdvancedFormatting" class="drawer-content closedDrawer extra">
                <div class="settings-panel">Advanced formatting settings</div>
                <div id="nested-AdvancedFormatting" class="closedDrawer">Nested advanced formatting</div>
            </section>
            <div id="after-AdvancedFormatting"></div>
        </div>
        <div id="settings-root">
            <section id="user-settings-block" class="drawer-content closedDrawer extra">
                <div class="settings-panel">Profile settings</div>
                <div id="nested-user-settings-block" class="closedDrawer">Nested settings</div>
            </section>
            <div id="after-user-settings-block"></div>
        </div>
        <div id="world-info-root">
            <section id="WorldInfo" class="drawer-content closedDrawer extra">
                <div class="settings-panel">Lorebook settings</div>
                <div id="nested-WorldInfo" class="closedDrawer">Nested lorebook</div>
            </section>
            <div id="after-WorldInfo"></div>
        </div>
        <div id="extensions-root">
            <section id="rm_extensions_block" class="drawer-content closedDrawer extra">
                <div class="settings-panel">Extension settings</div>
                <div id="nested-rm_extensions_block" class="closedDrawer">Nested extensions</div>
            </section>
            <div id="after-rm_extensions_block"></div>
        </div>
        <div id="backgrounds-root">
            <section id="Backgrounds" class="drawer-content closedDrawer bg-drawer-layout extra">
                <div class="settings-panel">Background settings</div>
                <div id="nested-Backgrounds" class="closedDrawer">Nested backgrounds</div>
            </section>
            <div id="after-Backgrounds"></div>
        </div>
        <div id="character-management-root">
            <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight extra">
                <div class="settings-panel">Character settings</div>
                <div id="nested-right-nav-panel" class="closedDrawer">Nested characters</div>
            </nav>
            <div id="after-right-nav-panel"></div>
        </div>
    `;
}

function setupPersonaManagementFixtureDom() {
	document.body.innerHTML = `
        <div id="persona-management-button" class="drawer">
            <div class="drawer-toggle">
                <div class="drawer-icon fa-solid fa-face-smile fa-fw closedIcon"></div>
            </div>
            <div id="PersonaManagement" class="drawer-content closedDrawer">
                <div class="flex-container wide100p alignitemscenter spaceBetween flexNoGap">
                    <div class="flex-container alignItemsBaseline wide100p">
                        <div class="flex1 flex-container alignItemsBaseline">
                            <h3 class="margin0">
                                <span>Persona Management</span>
                                <a href="https://docs.sillytavern.app/usage/core-concepts/personas/" target="_blank">
                                    <span class="fa-solid fa-circle-question note-link-span"></span>
                                </a>
                            </h3>
                        </div>
                        <div class="flex-container">
                            <div class="menu_button menu_button_icon user_stats_button">
                                <i class="fa-solid fa-ranking-star"></i>
                                <span>Usage Stats</span>
                            </div>
                            <div id="personas_backup" class="menu_button menu_button_icon">
                                <i class="fa-solid fa-file-export"></i>
                                <span>Backup</span>
                            </div>
                            <div id="personas_restore" class="menu_button menu_button_icon">
                                <i class="fa-solid fa-file-import"></i>
                                <span>Restore</span>
                            </div>
                            <input id="personas_restore_input" type="file" accept=".json" hidden />
                        </div>
                    </div>
                    <div id="persona-management-block" class="flex-container wide100p flexGap10">
                        <div class="persona_management_left_column flex1 overflowHidden wide100p">
                            <div class="flex-container marginBot10 alignitemscenter">
                                <div id="create_dummy_persona" class="menu_button menu_button_icon">
                                    <div>Create</div>
                                </div>
                                <input id="persona_search_bar" class="text_pole width100p flex1 margin0" type="search" placeholder="Search..." />
                                <select id="persona_sort_order" class="margin0">
                                    <option value="search" hidden>Search</option>
                                    <option value="asc">A-Z</option>
                                    <option value="desc">Z-A</option>
                                </select>
                                <div id="persona_pagination_container" class="flex1"></div>
                                <i id="persona_grid_toggle" class="fa-solid fa-table-cells-large menu_button"></i>
                            </div>
                            <div id="user_avatar_block" no_desc_text="[No description]">
                                <div class="avatar-container selected" data-avatar-id="hero-persona">
                                    <span>Star Traveler</span>
                                </div>
                            </div>
                            <form id="form_upload_avatar" action="javascript:void(null);" method="post" enctype="multipart/form-data">
                                <input type="file" id="avatar_upload_file" accept="image/*" name="avatar" />
                                <input type="hidden" id="avatar_upload_overwrite" name="overwrite_name" value="" />
                            </form>
                        </div>
                        <div class="persona_management_right_column flex1">
                            <div class="persona_management_current_persona">
                                <h4 class="standoutHeader">Current Persona</h4>
                                <div id="persona_controls" class="flex-container">
                                    <h5 id="your_name" class="persona_name">Star Traveler</h5>
                                </div>
                                <textarea id="persona_description" name="persona_description">Lead Pilot</textarea>
                                <div id="persona_connections_info_block">Persona connections</div>
                            </div>
                            <div class="persona_management_global_settings">
                                <h4 class="standoutHeader">Global Settings</h4>
                                <label for="persona_show_notifications" class="checkbox_label">
                                    <input id="persona_show_notifications" type="checkbox" />
                                    <span>Show notifications on switching personas</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getPagePanelViewport() {
	return document.querySelector(
		".sillytavern-interface-panel__viewport",
	) as HTMLElement;
}

describe("MobileSillyTavernInterfacePanel", () => {
	beforeEach(() => {
		window.localStorage.clear();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	test("renders the default page with an open main navigation strip and switches the active page route inline", () => {
		const onOpenChange = vi.fn();
		const onActivePageKeyChange = vi.fn();

		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		render(
			<MobileSillyTavernInterfacePanel
				open={true}
				onActivePageKeyChange={onActivePageKeyChange}
				onOpenChange={onOpenChange}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "sillyTavernInterface.page.aiResponseConfiguration.title::AI Settings",
		});
		const closeButton = screen.getByRole("button", {
			name: "sillyTavernInterface.close::Back",
		});
		const sectionNavButton = within(dialog).getByRole("button", {
			name: "sillyTavernInterface.sectionNav.button::On this page",
		});
		const mainNavToggle = within(dialog).getByRole("button", {
			name: "sillyTavernInterface.mainNav.toggle::Toggle main navigation",
		});
		const footer = dialog.querySelector(
			".sillytavern-interface-panel__footer",
		);
		const footerCenter = dialog.querySelector(
			".sillytavern-interface-panel__footer-center",
		);
		const footerAccessory = dialog.querySelector(
			".sillytavern-interface-panel__footer-accessory",
		);
		const mainNavigation = within(dialog).getByRole("navigation", {
			name: "sillyTavernInterface.mainNav.label::Page shortcuts",
		});
		const aiSettingsButton = screen.getByRole("button", {
			name: "sillyTavernInterface.mainNav.aiSettings::AI Settings",
		});
		const characterButton = screen.getByRole("button", {
			name: "sillyTavernInterface.mainNav.character::Character",
		});
		const aiSettingsTabs = within(dialog).getByRole("tablist", {
			name: "sillyTavernInterface.aiSettingsTabs.label::AI Settings sections",
		});
		const aiSettingsTabRoot = aiSettingsTabs.closest(".astra-sliding-tabs");
		const configTab = within(aiSettingsTabs).getByRole("tab", {
			name: "sillyTavernInterface.aiSettingsTabs.config::Config",
		});
		const apiTab = within(aiSettingsTabs).getByRole("tab", {
			name: "sillyTavernInterface.aiSettingsTabs.api::API",
		});
		const advancedTab = within(aiSettingsTabs).getByRole("tab", {
			name: "sillyTavernInterface.aiSettingsTabs.advanced::Advanced",
		});

		expect(dialog).toHaveAttribute("id", "sillytavern-interface-panel");
		expect(closeButton).toHaveAttribute(
			"id",
			"sillytavern-interface-panel-close-button",
		);
		expect(
			document.getElementById(
				"sillytavern-interface-panel-close-button-wrapper",
			),
		).toContainElement(closeButton);
		expect(footer).toContainElement(closeButton);
		expect(footer).toContainElement(sectionNavButton);
		expect(footerCenter).toContainElement(mainNavToggle);
		expect(footerAccessory).toContainElement(mainNavigation);
		expect(sectionNavButton).toBeDisabled();
		expect(mainNavToggle).toHaveAttribute("aria-expanded", "true");
		expect(mainNavToggle).toHaveAttribute("data-expanded", "true");
		expect(mainNavToggle).toHaveAttribute("data-variant", "default");
		expect(mainNavToggle).toHaveAttribute(
			"id",
			"sillytavern-interface-panel-menu-button",
		);
		expect(
			mainNavToggle.querySelector(
				".sillytavern-interface__main-nav-toggle-button-icon.lucide-chevron-up",
			),
		).toBeInTheDocument();
		expect(
			mainNavToggle.querySelector(".lucide-plus"),
		).not.toBeInTheDocument();
		expect(mainNavigation).toHaveClass(
			"sillytavern-interface__main-nav-strip",
		);
		expect(mainNavigation).toHaveAttribute("data-state", "open");
		expect(mainNavigation).toHaveAttribute("aria-hidden", "false");
		expect(mainNavigation).toContainElement(aiSettingsButton);
		expect(mainNavigation).toContainElement(characterButton);
		expect(aiSettingsButton).toHaveAttribute("data-active", "true");
		expect(aiSettingsButton).not.toHaveAttribute("tabindex");
		expect(aiSettingsButton).not.toHaveTextContent("AI Settings");
		expect(characterButton).not.toHaveTextContent("Character");
		expect(aiSettingsTabRoot).toBeInTheDocument();
		expect(
			aiSettingsTabRoot?.querySelectorAll(
				".astra-sliding-tabs__indicator",
			),
		).toHaveLength(1);
		expect(configTab).toHaveAttribute("data-state", "active");
		expect(apiTab).toHaveAttribute("data-state", "inactive");
		expect(advancedTab).toHaveAttribute("data-state", "inactive");
		expect(
			configTab.querySelector(".lucide-sliders-horizontal"),
		).not.toBeInTheDocument();
		expect(apiTab.querySelector(".lucide-plug-2")).not.toBeInTheDocument();
		expect(
			advancedTab.querySelector(".lucide-type"),
		).not.toBeInTheDocument();
		expect(
			mainNavigation.querySelector(
				".sillytavern-interface__main-nav-item-label",
			),
		).toBeNull();
		expect(
			dialog
				.querySelector(".sillytavern-interface-panel__header")
				?.contains(closeButton),
		).toBe(false);
		expect(
			document.getElementById("sillytavern-interface-panel-title"),
		).toHaveTextContent(
			"sillyTavernInterface.page.aiResponseConfiguration.title::AI Settings",
		);
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
		).toHaveTextContent(
			"sillyTavernInterface.page.aiResponseConfiguration.summary::Tune prompts and generation behavior.",
		);
		expect(
			within(dialog).getByRole("link", {
				name: "sillyTavernInterface.docs.open::Open SillyTavern documentation",
			}),
		).toHaveAttribute(
			"href",
			"https://docs.sillytavern.app/usage/prompts/prompt-manager/",
		);
		expect(
			document.getElementById("sillytavern-interface-panel-content"),
		).toHaveTextContent(
			"sillyTavernInterface.page.aiResponseConfiguration.missingNativeDrawer::SillyTavern AI Response Configuration is unavailable in the current DOM.",
		);

		fireEvent.mouseDown(apiTab, { button: 0, ctrlKey: false });

		expect(onActivePageKeyChange).toHaveBeenCalledWith(
			"connection-profile",
		);
		expect(apiTab).toHaveAttribute("data-state", "active");
		expect(aiSettingsButton).toHaveAttribute("data-active", "true");
		expect(
			document.getElementById("sillytavern-interface-panel-title"),
		).toHaveTextContent(
			"sillyTavernInterface.page.aiResponseConfiguration.title::AI Settings",
		);
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-summary"),
		).toHaveTextContent(
			"sillyTavernInterface.page.aiResponseConfiguration.summary::Tune prompts and generation behavior.",
		);
		expect(
			within(dialog).getByRole("link", {
				name: "sillyTavernInterface.docs.open::Open SillyTavern documentation",
			}),
		).toHaveAttribute(
			"href",
			"https://docs.sillytavern.app/usage/core-concepts/connection-profiles/",
		);
		expect(
			document.getElementById("sillytavern-interface-panel-content"),
		).toHaveTextContent(
			"sillyTavernInterface.page.connectionProfile.missingNativeDrawer::SillyTavern API Connections are unavailable in the current DOM.",
		);

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		expect(onActivePageKeyChange).toHaveBeenCalledWith(
			"advanced-formatting",
		);
		expect(advancedTab).toHaveAttribute("data-state", "active");
		expect(aiSettingsButton).toHaveAttribute("data-active", "true");
		expect(
			document.getElementById("sillytavern-interface-panel-title"),
		).toHaveTextContent(
			"sillyTavernInterface.page.aiResponseConfiguration.title::AI Settings",
		);
		expect(
			document.getElementById("sillytavern-interface-panel-content"),
		).toHaveTextContent(
			"sillyTavernInterface.page.advancedFormatting.missingNativeDrawer::SillyTavern Advanced Formatting is unavailable in the current DOM.",
		);

		expect(
			screen.queryByRole("dialog", {
				name: "sillyTavernInterface.menu.title::Core Settings",
			}),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(
				"sillyTavernInterface.menu.title::Core Settings",
			),
		).not.toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", {
				name: "sillyTavernInterface.mainNav.userSettings::User Settings",
			}),
		);

		expect(onActivePageKeyChange).toHaveBeenCalledWith("user-settings");
		expect(
			screen.queryByRole("dialog", {
				name: "sillyTavernInterface.menu.title::Core Settings",
			}),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("dialog", {
				name: "sillyTavernInterface.page.userSettings.title::User Settings",
			}),
		).toBeInTheDocument();
		expect(mainNavigation).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "sillyTavernInterface.mainNav.userSettings::User Settings",
			}),
		).toHaveAttribute("data-active", "true");
		expect(
			document.getElementById("sillytavern-interface-panel-title"),
		).toHaveTextContent(
			"sillyTavernInterface.page.userSettings.title::User Settings",
		);
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
			within(dialog).getByRole("link", {
				name: "sillyTavernInterface.docs.open::Open SillyTavern documentation",
			}),
		).toHaveAttribute(
			"href",
			"https://docs.sillytavern.app/usage/user-settings/",
		);
		expect(
			document.getElementById("sillytavern-interface-panel-content"),
		).toHaveTextContent(
			"sillyTavernInterface.page.userSettings.missingNativeDrawer::SillyTavern User Settings are unavailable in the current DOM.",
		);

		fireEvent.click(closeButton);

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("ports each supported native drawer into its active page and restores it on switch or unmount", async () => {
		setupNativeDrawerFixtureDom();

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		for (const fixture of NATIVE_PAGE_FIXTURES) {
			const drawer = document.getElementById(
				fixture.rootId,
			) as HTMLElement;
			const originalParent = drawer.parentElement as HTMLElement;
			const nextSibling = document.getElementById(
				`after-${fixture.rootId}`,
			) as HTMLElement;
			const nestedDrawer = document.getElementById(
				`nested-${fixture.rootId}`,
			) as HTMLElement;
			const originalClassName = drawer.className;

			const { rerender, unmount } = render(
				<MobileSillyTavernInterfacePanel
					activePageKey={fixture.pageKey}
					open={true}
					onOpenChange={vi.fn()}
				/>,
			);

			expect(
				screen.getByRole("dialog", { name: fixture.title }),
			).toBeInTheDocument();

			const host = await waitFor(() => {
				const element = document.getElementById(fixture.hostId);
				expect(element).toBeInTheDocument();
				expect(drawer.parentElement).toBe(element);
				return element as HTMLElement;
			});

			expect(host).toHaveClass("sillytavern-interface__native-host");
			expect(host).toContainElement(drawer);
			expect(host).toHaveTextContent(fixture.text);
			expect(drawer).toHaveClass("openDrawer");
			expect(drawer).toHaveClass("extra");
			expect(drawer).not.toHaveClass("closedDrawer");
			expect(drawer).toHaveAttribute(
				"data-astra-projecta-native-drawer-source",
				fixture.rootId,
			);
			expect(nestedDrawer).toHaveClass("closedDrawer");
			expect(nestedDrawer).not.toHaveClass("openDrawer");

			drawer.classList.remove("openDrawer");
			drawer.classList.add("closedDrawer");

			await waitFor(() => {
				expect(drawer).toHaveClass("openDrawer");
				expect(drawer).not.toHaveClass("closedDrawer");
			});
			expect(nestedDrawer).toHaveClass("closedDrawer");
			expect(nestedDrawer).not.toHaveClass("openDrawer");

			rerender(
				<MobileSillyTavernInterfacePanel
					activePageKey="persona-management"
					open={true}
					onOpenChange={vi.fn()}
				/>,
			);

			await waitFor(() => {
				expect(drawer.parentElement).toBe(originalParent);
			});
			expect(drawer.nextElementSibling).toBe(nextSibling);
			expect(drawer.className).toBe(originalClassName);
			expect(drawer).not.toHaveAttribute(
				"data-astra-projecta-native-drawer-source",
			);

			rerender(
				<MobileSillyTavernInterfacePanel
					activePageKey={fixture.pageKey}
					open={true}
					onOpenChange={vi.fn()}
				/>,
			);

			await waitFor(() => {
				expect(drawer.parentElement).toBe(
					document.getElementById(fixture.hostId),
				);
			});

			unmount();

			expect(drawer.parentElement).toBe(originalParent);
			expect(drawer.nextElementSibling).toBe(nextSibling);
			expect(drawer.className).toBe(originalClassName);
			expect(drawer).not.toHaveAttribute(
				"data-astra-projecta-native-drawer-source",
			);
		}
	});

	test("ports the shared completion prompt manager popup only on the AI response page and restores it hidden", async () => {
		setupNativeDrawerFixtureDom();

		document.body.insertAdjacentHTML(
			"beforeend",
			`
            <div id="prompt-manager-popup-origin">
                <div id="completion_prompt_manager_popup" class="drawer-content closedDrawer extra" style="display: none;">
                    <div id="completion_prompt_manager_popup_edit">Edit prompt</div>
                    <div id="completion_prompt_manager_popup_inspect">Inspect prompt</div>
                </div>
                <div id="after-completion_prompt_manager_popup"></div>
            </div>
        `,
		);

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		const popup = document.getElementById(
			"completion_prompt_manager_popup",
		) as HTMLElement;
		const originalParent = popup.parentElement as HTMLElement;
		const originalNextSibling = popup.nextSibling;
		const originalClassName = popup.className;
		const originalStyleAttribute = popup.getAttribute("style");
		const { rerender, unmount } = render(
			<MobileSillyTavernInterfacePanel
				activePageKey="ai-response-configuration"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const host = await waitFor(() => {
			const element = document.getElementById(
				"sillytavern-interface-panel-prompt-manager-popup-host",
			);
			expect(element).toBeInTheDocument();
			expect(popup.parentElement).toBe(element);
			return element as HTMLElement;
		});

		expect(host).toHaveClass(
			"sillytavern-interface__native-companion-host",
		);
		expect(host).toContainElement(popup);
		expect(popup).toHaveStyle({ display: "none" });
		expect(popup).toHaveClass("astra-projecta-native-companion-ported");
		expect(popup).toHaveAttribute(
			"data-astra-projecta-native-companion-source",
			"completion_prompt_manager_popup",
		);
		expect(
			document.getElementById("completion_prompt_manager_popup_edit"),
		).toHaveTextContent("Edit prompt");
		expect(
			document.getElementById("completion_prompt_manager_popup_inspect"),
		).toHaveTextContent("Inspect prompt");

		popup.classList.add("openDrawer");
		popup.style.display = "none";
		popup.style.height = "0px";
		popup.style.overflow = "hidden";

		await waitFor(() => {
			expect(popup.style.display).toBe("block");
			expect(popup.style.height).toBe("");
			expect(popup.style.overflow).toBe("");
		});

		popup.classList.remove("openDrawer");
		popup.style.display = "block";
		popup.style.height = "420px";
		popup.style.overflow = "hidden";

		await waitFor(() => {
			expect(popup.style.display).toBe("none");
			expect(popup.style.height).toBe("");
			expect(popup.style.overflow).toBe("");
		});

		popup.classList.add("openDrawer");
		popup.style.display = "block";

		rerender(
			<MobileSillyTavernInterfacePanel
				activePageKey="connection-profile"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		await waitFor(() => {
			expect(popup.parentElement).toBe(originalParent);
		});
		expect(popup.nextSibling).toBe(originalNextSibling);
		expect(popup.className).toBe(originalClassName);
		expect(popup.getAttribute("style")).toBe(originalStyleAttribute);
		expect(popup).not.toHaveClass("astra-projecta-native-companion-ported");
		expect(popup).not.toHaveAttribute(
			"data-astra-projecta-native-companion-source",
		);

		rerender(
			<MobileSillyTavernInterfacePanel
				activePageKey="ai-response-configuration"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		await waitFor(() => {
			expect(popup.parentElement).toBe(
				document.getElementById(
					"sillytavern-interface-panel-prompt-manager-popup-host",
				),
			);
		});

		unmount();

		expect(popup.parentElement).toBe(originalParent);
		expect(popup.nextSibling).toBe(originalNextSibling);
		expect(popup.className).toBe(originalClassName);
		expect(popup.getAttribute("style")).toBe(originalStyleAttribute);
	});

	test("renders character management tabs and normalizes native menu types into Cards and Edit", async () => {
		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
                <div id="after-right-nav-panel"></div>
            </div>
        `;

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		expect(
			within(tabList)
				.getAllByRole("tab")
				.map((tab) => tab.textContent),
		).toEqual(["Cards", "Edit", "Advanced", "Gallery"]);

		const cardsTab = within(tabList).getByRole("tab", { name: "Cards" });
		const editTab = within(tabList).getByRole("tab", { name: "Edit" });
		const galleryTab = within(tabList).getByRole("tab", {
			name: "Gallery",
		});
		const advancedTab = within(tabList).getByRole("tab", {
			name: "Advanced",
		});
		const drawer = document.getElementById(
			"right-nav-panel",
		) as HTMLElement;
		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;

		expect(cardsTab).toHaveAttribute("data-state", "active");
		expect(editTab).toHaveAttribute("data-state", "inactive");
		expect(galleryTab).toHaveAttribute("data-state", "inactive");
		expect(advancedTab).toHaveAttribute("data-state", "inactive");
		expect(
			cardsTab.querySelector(".lucide-sparkles"),
		).not.toBeInTheDocument();
		expect(
			editTab.querySelector(".lucide-user-round-pen"),
		).not.toBeInTheDocument();
		expect(
			galleryTab.querySelector(".lucide-images"),
		).not.toBeInTheDocument();
		expect(
			advancedTab.querySelector(".lucide-file-cog"),
		).not.toBeInTheDocument();

		drawer.dataset.menuType = "character_edit";

		await waitFor(() => {
			expect(editTab).toHaveAttribute("data-state", "active");
			expect(cardsTab).toHaveAttribute("data-state", "inactive");
		});

		drawer.dataset.menuType = "group_edit";

		await waitFor(() => {
			expect(editTab).toHaveAttribute("data-state", "active");
		});

		drawer.dataset.menuType = "create";

		await waitFor(() => {
			expect(cardsTab).toHaveAttribute("data-state", "active");
			expect(editTab).toHaveAttribute("data-state", "inactive");
		});

		drawer.dataset.menuType = "group_create";

		await waitFor(() => {
			expect(cardsTab).toHaveAttribute("data-state", "active");
		});

		advancedPopup.style.display = "flex";
		advancedPopup.style.opacity = "1";

		await waitFor(() => {
			expect(advancedTab).toHaveAttribute("data-state", "active");
			expect(cardsTab).toHaveAttribute("data-state", "inactive");
			expect(editTab).toHaveAttribute("data-state", "inactive");
			expect(galleryTab).toHaveAttribute("data-state", "inactive");
		});
	});

	test("switches character management tabs through existing SillyTavern controls without writing menu type directly", async () => {
		const onCardsClick = vi.fn();
		const onEditClick = vi.fn();

		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="character_edit">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="after-right-nav-panel"></div>
            </div>
        `;

		const drawer = document.getElementById(
			"right-nav-panel",
		) as HTMLElement;
		document
			.getElementById("rm_button_characters")
			?.addEventListener("click", () => {
				onCardsClick();
				drawer.dataset.menuType = "characters";
			});
		document
			.getElementById("rm_button_selected_ch")
			?.addEventListener("click", () => {
				onEditClick();
				drawer.dataset.menuType = "group_edit";
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const cardsTab = within(tabList).getByRole("tab", { name: "Cards" });
		const editTab = within(tabList).getByRole("tab", { name: "Edit" });

		expect(editTab).toHaveAttribute("data-state", "active");

		fireEvent.mouseDown(cardsTab, { button: 0, ctrlKey: false });

		expect(onCardsClick).toHaveBeenCalledTimes(1);
		expect(drawer.dataset.menuType).toBe("characters");
		await waitFor(() => {
			expect(cardsTab).toHaveAttribute("data-state", "active");
		});

		fireEvent.mouseDown(editTab, { button: 0, ctrlKey: false });

		expect(onEditClick).toHaveBeenCalledTimes(1);
		expect(drawer.dataset.menuType).toBe("group_edit");
		await waitFor(() => {
			expect(editTab).toHaveAttribute("data-state", "active");
		});
	});

	test("opens the Advanced character management tab through the native trigger and ports the advanced popup into the SillyTavern interface host", async () => {
		const onAdvancedClick = vi.fn();

		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="after-right-nav-panel"></div>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
                <div id="after-character_popup"></div>
            </div>
        `;

		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;
		document
			.getElementById("advanced_div")
			?.addEventListener("click", () => {
				onAdvancedClick();
				advancedPopup.style.display = "flex";
				advancedPopup.style.opacity = "1";
				advancedPopup.classList.add("open");
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const advancedTab = within(tabList).getByRole("tab", {
			name: "Advanced",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		expect(onAdvancedClick).toHaveBeenCalledTimes(1);

		await waitFor(() => {
			expect(advancedTab).toHaveAttribute("data-state", "active");
			expect(advancedPopup.parentElement).toBe(host);
			expect(host).toHaveTextContent("Advanced definitions");
		});
	});

	test("opens the Gallery character management tab through the native dropdown and ports the live gallery into the SillyTavern interface host", async () => {
		const onDropdownChange = vi.fn();

		document.body.innerHTML = `
            <div id="character-management-root">
                <select id="char-management-dropdown">
                    <option id="default">Default</option>
                    <option id="show_char_gallery" value="gallery">Show Gallery</option>
                </select>
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="movingDivs"></div>
            </div>
        `;

		const movingDivs = document.getElementById("movingDivs") as HTMLElement;
		document
			.getElementById("char-management-dropdown")
			?.addEventListener("change", () => {
				onDropdownChange();
				const gallery = document.createElement("div");
				gallery.id = "gallery";
				gallery.className = "draggable no-scrollbar";
				gallery.setAttribute("forchar", "gallery");
				gallery.style.display = "block";
				gallery.style.opacity = "0";
				gallery.style.transition = "opacity 300ms";
				gallery.innerHTML = `
                    <div class="dragTitle">Image Gallery</div>
                    <div class="panelControlBar flex-container">
                        <div id="galleryclose" class="dragClose" data-related-id="gallery"></div>
                    </div>
                    <div id="dragGallery">Gallery images</div>
                `;
				movingDivs.appendChild(gallery);
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const galleryTab = within(tabList).getByRole("tab", {
			name: "Gallery",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;

		fireEvent.mouseDown(galleryTab, { button: 0, ctrlKey: false });

		expect(onDropdownChange).toHaveBeenCalledTimes(1);

		await waitFor(() => {
			expect(galleryTab).toHaveAttribute("data-state", "active");
			expect(document.getElementById("gallery")?.parentElement).toBe(
				host,
			);
			expect(document.getElementById("gallery")).toHaveStyle({
				display: "flex",
				opacity: "1",
				transition: "none",
			});
			expect(host).toHaveTextContent("Gallery images");
		});
	});

	test("keeps the current Character Management content mounted while the native Gallery is still opening", async () => {
		vi.useFakeTimers();

		document.body.innerHTML = `
            <div id="character-management-root">
                <select id="char-management-dropdown">
                    <option id="default">Default</option>
                    <option id="show_char_gallery" value="gallery">Show Gallery</option>
                </select>
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="movingDivs"></div>
            </div>
        `;

		const movingDivs = document.getElementById("movingDivs") as HTMLElement;
		document
			.getElementById("char-management-dropdown")
			?.addEventListener("change", () => {
				setTimeout(() => {
					const gallery = document.createElement("div");
					gallery.id = "gallery";
					gallery.className = "draggable no-scrollbar";
					gallery.setAttribute("forchar", "gallery");
					gallery.innerHTML = `
                        <div id="galleryclose" class="dragClose" data-related-id="gallery"></div>
                        <div id="dragGallery">Gallery images</div>
                    `;
					movingDivs.appendChild(gallery);
				}, 50);
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const galleryTab = within(tabList).getByRole("tab", {
			name: "Gallery",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;
		const primaryDrawer = document.getElementById(
			"right-nav-panel",
		) as HTMLElement;

		fireEvent.mouseDown(galleryTab, { button: 0, ctrlKey: false });

		expect(primaryDrawer.parentElement).toBe(host);
		expect(host).toHaveTextContent("Character settings");
		expect(
			screen.queryByText(
				"SillyTavern Gallery is unavailable in the current DOM.",
			),
		).not.toBeInTheDocument();

		await act(async () => {
			await vi.advanceTimersByTimeAsync(50);
		});

		expect(document.getElementById("gallery")?.parentElement).toBe(host);
		expect(primaryDrawer.parentElement).not.toBe(host);
		expect(host).toHaveTextContent("Gallery images");
	});

	test("switches from Advanced to Gallery after marking the Advanced popup as panel-close-pending", async () => {
		const events: string[] = [];

		document.body.innerHTML = `
            <div id="character-management-root">
                <select id="char-management-dropdown">
                    <option id="default">Default</option>
                    <option id="show_char_gallery" value="gallery">Show Gallery</option>
                </select>
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="movingDivs"></div>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
                <div id="after-character_popup"></div>
            </div>
        `;

		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;
		const movingDivs = document.getElementById("movingDivs") as HTMLElement;
		document
			.getElementById("advanced_div")
			?.addEventListener("click", () => {
				events.push("advanced-open");
				advancedPopup.style.display = "flex";
				advancedPopup.style.opacity = "1";
				advancedPopup.classList.add("open");
			});
		document
			.getElementById("character_cross")
			?.addEventListener("click", () => {
				events.push("advanced-close");
				advancedPopup.style.display = "none";
				advancedPopup.style.opacity = "0";
			});
		document
			.getElementById("char-management-dropdown")
			?.addEventListener("change", () => {
				events.push(
					advancedPopup.getAttribute(
						CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
					) === "true"
						? "gallery-open:advanced-close-pending"
						: "gallery-open:advanced-still-owned",
				);

				const gallery = document.createElement("div");
				gallery.id = "gallery";
				gallery.className = "draggable no-scrollbar";
				gallery.setAttribute("forchar", "gallery");
				gallery.innerHTML = `
                    <div id="galleryclose" class="dragClose" data-related-id="gallery"></div>
                    <div id="dragGallery">Gallery images</div>
                `;
				movingDivs.appendChild(gallery);
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const advancedTab = within(tabList).getByRole("tab", {
			name: "Advanced",
		});
		const galleryTab = within(tabList).getByRole("tab", {
			name: "Gallery",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(advancedTab).toHaveAttribute("data-state", "active");
			expect(advancedPopup.parentElement).toBe(host);
			expect(host).toHaveTextContent("Advanced definitions");
		});

		fireEvent.mouseDown(galleryTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(galleryTab).toHaveAttribute("data-state", "active");
			expect(document.getElementById("gallery")?.parentElement).toBe(
				host,
			);
			expect(advancedPopup).toHaveAttribute(
				CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
				"true",
			);
			expect(advancedPopup.style.display).toBe("none");
			expect(advancedPopup.style.opacity).toBe("0");
			expect(host).toHaveTextContent("Gallery images");
		});
		expect(events).toEqual([
			"advanced-open",
			"advanced-close",
			"gallery-open:advanced-close-pending",
		]);
	});

	test("does not flash the primary character drawer while switching from Advanced to a delayed Gallery", async () => {
		document.body.innerHTML = `
            <div id="character-management-root">
                <select id="char-management-dropdown">
                    <option id="default">Default</option>
                    <option id="show_char_gallery" value="gallery">Show Gallery</option>
                </select>
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="movingDivs"></div>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
                <div id="after-character_popup"></div>
            </div>
        `;

		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;
		const movingDivs = document.getElementById("movingDivs") as HTMLElement;
		const primaryDrawer = document.getElementById(
			"right-nav-panel",
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
		document
			.getElementById("char-management-dropdown")
			?.addEventListener("change", () => {
				setTimeout(() => {
					const gallery = document.createElement("div");
					gallery.id = "gallery";
					gallery.className = "draggable no-scrollbar";
					gallery.setAttribute("forchar", "gallery");
					gallery.innerHTML = `
                        <div id="galleryclose" class="dragClose" data-related-id="gallery"></div>
                        <div id="dragGallery">Gallery images</div>
                    `;
					movingDivs.appendChild(gallery);
				}, 25);
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const advancedTab = within(tabList).getByRole("tab", {
			name: "Advanced",
		});
		const galleryTab = within(tabList).getByRole("tab", {
			name: "Gallery",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(advancedTab).toHaveAttribute("data-state", "active");
			expect(advancedPopup.parentElement).toBe(host);
		});

		fireEvent.mouseDown(galleryTab, { button: 0, ctrlKey: false });

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(primaryDrawer.parentElement).not.toBe(host);
		expect(host).not.toHaveTextContent("Character settings");
		expect(advancedPopup.parentElement).toBe(host);
		expect(advancedPopup.style.display).toBe("none");
		expect(advancedPopup.style.opacity).toBe("0");

		await waitFor(() => {
			expect(document.getElementById("gallery")?.parentElement).toBe(
				host,
			);
			expect(primaryDrawer.parentElement).not.toBe(host);
			expect(host).toHaveTextContent("Gallery images");
		});
	});

	test("closes the panel-owned Gallery when switching back to Cards and reattaches the primary character drawer", async () => {
		const closeEvents: string[] = [];

		document.body.innerHTML = `
            <div id="character-management-root">
                <select id="char-management-dropdown">
                    <option id="default">Default</option>
                    <option id="show_char_gallery" value="gallery">Show Gallery</option>
                </select>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="movingDivs"></div>
            </div>
        `;

		const movingDivs = document.getElementById("movingDivs") as HTMLElement;
		const primaryDrawer = document.getElementById(
			"right-nav-panel",
		) as HTMLElement;
		document
			.getElementById("char-management-dropdown")
			?.addEventListener("change", () => {
				if (document.getElementById("gallery")) {
					return;
				}

				const gallery = document.createElement("div");
				gallery.id = "gallery";
				gallery.className = "draggable no-scrollbar";
				gallery.setAttribute("forchar", "gallery");
				gallery.innerHTML = `
                    <div id="galleryclose" class="dragClose" data-related-id="gallery"></div>
                    <div id="dragGallery">Gallery images</div>
                `;
				movingDivs.appendChild(gallery);
			});
		movingDivs.addEventListener("click", (event) => {
			if (
				event.target instanceof HTMLElement &&
				event.target.matches(".dragClose")
			) {
				closeEvents.push(
					document.getElementById("gallery")?.parentElement?.id ?? "",
				);
				document.getElementById("gallery")?.remove();
			}
		});
		document
			.getElementById("rm_button_characters")
			?.addEventListener("click", () => {
				primaryDrawer.dataset.menuType = "characters";
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const cardsTab = within(tabList).getByRole("tab", { name: "Cards" });
		const galleryTab = within(tabList).getByRole("tab", {
			name: "Gallery",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;

		fireEvent.mouseDown(galleryTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(document.getElementById("gallery")?.parentElement).toBe(
				host,
			);
			expect(galleryTab).toHaveAttribute("data-state", "active");
		});

		fireEvent.mouseDown(cardsTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(cardsTab).toHaveAttribute("data-state", "active");
			expect(primaryDrawer.parentElement).toBe(host);
			expect(document.getElementById("gallery")).toBeNull();
		});
		expect(closeEvents).toEqual(["movingDivs"]);
	});

	test("closes the panel-owned Gallery before opening Advanced from the Gallery tab", async () => {
		const events: string[] = [];

		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="movingDivs">
                    <div class="draggable no-scrollbar" forchar="gallery" id="gallery" style="display: block; opacity: 1; transition: opacity 300ms;">
                        <div id="galleryclose" class="dragClose" data-related-id="gallery"></div>
                        <div id="dragGallery">Gallery images</div>
                    </div>
                </div>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
            </div>
        `;

		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;
		document
			.getElementById("movingDivs")
			?.addEventListener("click", (event) => {
				if (
					event.target instanceof HTMLElement &&
					event.target.matches(".dragClose")
				) {
					events.push("gallery-close");
				}
			});
		document
			.getElementById("advanced_div")
			?.addEventListener("click", () => {
				events.push(
					document.getElementById("gallery")
						? "advanced-open:gallery-present"
						: "advanced-open:gallery-removed",
				);
				advancedPopup.style.display = "flex";
				advancedPopup.style.opacity = "0";
				advancedPopup.style.transition = "opacity 300ms";
				advancedPopup.classList.add("open");
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const galleryTab = within(tabList).getByRole("tab", {
			name: "Gallery",
		});
		const advancedTab = within(tabList).getByRole("tab", {
			name: "Advanced",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;

		await waitFor(() => {
			expect(galleryTab).toHaveAttribute("data-state", "active");
			expect(document.getElementById("gallery")?.parentElement).toBe(
				host,
			);
		});

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(advancedTab).toHaveAttribute("data-state", "active");
			expect(advancedPopup.parentElement).toBe(host);
			expect(advancedPopup).toHaveStyle({
				display: "flex",
				opacity: "1",
				transition: "none",
			});
		});
		expect(events).toEqual([
			"gallery-close",
			"advanced-open:gallery-removed",
		]);
	});

	test("shows a missing Gallery message when the native Gallery extension controls are unavailable", async () => {
		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
            </div>
        `;

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const galleryTab = within(tabList).getByRole("tab", {
			name: "Gallery",
		});

		fireEvent.mouseDown(galleryTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(galleryTab).toHaveAttribute("data-state", "active");
			expect(
				screen.getByText(
					"SillyTavern Gallery is unavailable in the current DOM.",
				),
			).toBeInTheDocument();
		});
	});

	test("switches from Advanced back to Cards by closing the native popup before reopening the primary character drawer", async () => {
		const events: string[] = [];

		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="after-right-nav-panel"></div>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
                <div id="after-character_popup"></div>
            </div>
        `;

		const primaryDrawer = document.getElementById(
			"right-nav-panel",
		) as HTMLElement;
		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;
		document
			.getElementById("advanced_div")
			?.addEventListener("click", () => {
				events.push("advanced");
				advancedPopup.style.display = "flex";
				advancedPopup.style.opacity = "1";
				advancedPopup.classList.add("open");
			});
		document
			.getElementById("rm_button_characters")
			?.addEventListener("click", () => {
				events.push("cards");
				setTimeout(() => {
					primaryDrawer.dataset.menuType = "characters";
				}, 100);
			});
		document
			.getElementById("character_cross")
			?.addEventListener("click", () => {
				events.push("close");
				advancedPopup.style.display = "none";
				advancedPopup.style.opacity = "0";
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const cardsTab = within(tabList).getByRole("tab", { name: "Cards" });
		const advancedTab = within(tabList).getByRole("tab", {
			name: "Advanced",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(advancedPopup.parentElement).toBe(host);
			expect(advancedTab).toHaveAttribute("data-state", "active");
		});

		fireEvent.mouseDown(cardsTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(cardsTab).toHaveAttribute("data-state", "active");
			expect(primaryDrawer.parentElement).toBe(host);
			expect(advancedPopup.parentElement).not.toBe(host);
		});

		expect(events).toEqual(["advanced", "close", "cards"]);
	});

	test("hides the Advanced popup immediately before reopening Cards", async () => {
		const events: string[] = [];

		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="character_edit">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="after-right-nav-panel"></div>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
                <div id="after-character_popup"></div>
            </div>
        `;

		const primaryDrawer = document.getElementById(
			"right-nav-panel",
		) as HTMLElement;
		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;
		document
			.getElementById("advanced_div")
			?.addEventListener("click", () => {
				events.push("advanced");
				advancedPopup.style.display = "flex";
				advancedPopup.style.opacity = "1";
				advancedPopup.classList.add("open");
			});
		document
			.getElementById("rm_button_characters")
			?.addEventListener("click", () => {
				events.push("cards");
				primaryDrawer.dataset.menuType = "characters";
			});
		document
			.getElementById("character_cross")
			?.addEventListener("click", () => {
				events.push("close");
				advancedPopup.style.opacity = "0";
				setTimeout(() => {
					advancedPopup.style.display = "none";
				}, 100);
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const cardsTab = within(tabList).getByRole("tab", { name: "Cards" });
		const advancedTab = within(tabList).getByRole("tab", {
			name: "Advanced",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(advancedPopup.parentElement).toBe(host);
			expect(advancedTab).toHaveAttribute("data-state", "active");
		});

		fireEvent.mouseDown(cardsTab, { button: 0, ctrlKey: false });

		await waitFor(
			() => {
				expect(advancedPopup.style.display).toBe("none");
				expect(advancedPopup.style.opacity).toBe("0");
				expect(advancedPopup.style.transition).toBe("none");
				expect(events).toEqual(["advanced", "close", "cards"]);
				expect(cardsTab).toHaveAttribute("data-state", "active");
				expect(advancedTab).toHaveAttribute("data-state", "inactive");
				expect(primaryDrawer.parentElement).toBe(host);
				expect(advancedPopup.parentElement).not.toBe(host);
				expect(host).toHaveTextContent("Character settings");
			},
			{ timeout: 50 },
		);

		await waitFor(() => {
			expect(primaryDrawer.dataset.menuType).toBe("characters");
		});
	});

	test("hides the Advanced popup immediately before reopening Edit", async () => {
		const events: string[] = [];

		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="after-right-nav-panel"></div>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
                <div id="after-character_popup"></div>
            </div>
        `;

		const primaryDrawer = document.getElementById(
			"right-nav-panel",
		) as HTMLElement;
		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;
		document
			.getElementById("advanced_div")
			?.addEventListener("click", () => {
				events.push("advanced");
				advancedPopup.style.display = "flex";
				advancedPopup.style.opacity = "1";
				advancedPopup.classList.add("open");
			});
		document
			.getElementById("rm_button_selected_ch")
			?.addEventListener("click", () => {
				events.push("edit");
				setTimeout(() => {
					primaryDrawer.dataset.menuType = "character_edit";
				}, 100);
			});
		document
			.getElementById("character_cross")
			?.addEventListener("click", () => {
				events.push("close");
				advancedPopup.style.opacity = "0";
				setTimeout(() => {
					advancedPopup.style.display = "none";
				}, 100);
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const advancedTab = within(tabList).getByRole("tab", {
			name: "Advanced",
		});
		const editTab = within(tabList).getByRole("tab", { name: "Edit" });
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(advancedPopup.parentElement).toBe(host);
			expect(advancedTab).toHaveAttribute("data-state", "active");
		});

		fireEvent.mouseDown(editTab, { button: 0, ctrlKey: false });

		await waitFor(
			() => {
				expect(advancedPopup.style.display).toBe("none");
				expect(advancedPopup.style.opacity).toBe("0");
				expect(advancedPopup.style.transition).toBe("none");
				expect(events).toEqual(["advanced", "close", "edit"]);
				expect(editTab).toHaveAttribute("data-state", "active");
				expect(advancedTab).toHaveAttribute("data-state", "inactive");
				expect(primaryDrawer.parentElement).toBe(host);
				expect(advancedPopup.parentElement).not.toBe(host);
				expect(host).toHaveTextContent("Character settings");
			},
			{ timeout: 50 },
		);

		await waitFor(() => {
			expect(primaryDrawer.dataset.menuType).toBe("character_edit");
		});
	});

	test("falls back from Advanced to the primary character drawer when the native popup close button hides the popup", async () => {
		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="character_edit">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="after-right-nav-panel"></div>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
                <div id="after-character_popup"></div>
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
			.getElementById("character_popup_ok")
			?.addEventListener("click", () => {
				advancedPopup.style.display = "none";
				advancedPopup.style.opacity = "0";
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const advancedTab = within(tabList).getByRole("tab", {
			name: "Advanced",
		});
		const editTab = within(tabList).getByRole("tab", { name: "Edit" });
		const host = document.getElementById(
			"sillytavern-interface-panel-character-management-host",
		) as HTMLElement;
		const primaryDrawer = document.getElementById(
			"right-nav-panel",
		) as HTMLElement;

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(advancedTab).toHaveAttribute("data-state", "active");
			expect(advancedPopup.parentElement).toBe(host);
		});

		fireEvent.click(
			document.getElementById("character_popup_ok") as HTMLElement,
		);

		await waitFor(() => {
			expect(editTab).toHaveAttribute("data-state", "active");
			expect(primaryDrawer.parentElement).toBe(host);
			expect(advancedPopup.parentElement).not.toBe(host);
		});
	});

	test("closes and restores the advanced popup when the character management page unmounts while Advanced is active", async () => {
		let closeCount = 0;

		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="advanced_div" type="button">Native advanced</button>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="after-right-nav-panel"></div>
                <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                    <div id="character_popup_text">Advanced definitions</div>
                    <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                    <div id="character_popup_ok" class="menu_button">Save</div>
                </div>
                <div id="after-character_popup"></div>
            </div>
        `;

		const advancedPopup = document.getElementById(
			"character_popup",
		) as HTMLElement;
		const originalParent = advancedPopup.parentElement as HTMLElement;
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
				closeCount += 1;
				advancedPopup.style.display = "none";
				advancedPopup.style.opacity = "0";
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		const { unmount } = render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const advancedTab = within(
			screen.getByRole("tablist", {
				name: "Character Management sections",
			}),
		).getByRole("tab", { name: "Advanced" });

		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(advancedPopup.parentElement).toBe(
				document.getElementById(
					"sillytavern-interface-panel-character-management-host",
				),
			);
		});

		unmount();

		expect(closeCount).toBe(1);
		expect(advancedPopup.parentElement).toBe(originalParent);
		expect(advancedPopup.style.display).toBe("none");
	});

	test("disables the character management Edit tab when there is no active character or group", () => {
		const onEditClick = vi.fn();

		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="after-right-nav-panel"></div>
            </div>
        `;
		document
			.getElementById("rm_button_selected_ch")
			?.addEventListener("click", onEditClick);

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={{
					...createActiveCharacterIdentitySnapshot(),
					characterId: null,
					hasActiveChat: false,
					kind: "none",
					thumbnailUrl: "/img/five.png",
				}}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const cardsTab = within(tabList).getByRole("tab", { name: "Cards" });
		const editTab = within(tabList).getByRole("tab", { name: "Edit" });

		expect(cardsTab).not.toBeDisabled();
		expect(editTab).toBeDisabled();

		fireEvent.mouseDown(editTab, { button: 0, ctrlKey: false });

		expect(onEditClick).not.toHaveBeenCalled();
	});

	test.each([
		{
			expectedActiveTab: "Advanced",
			initialMenuType: "characters",
			persistedValue: "advanced",
		},
		{
			expectedActiveTab: "Cards",
			initialMenuType: "character_edit",
			persistedValue: "cards",
		},
		{
			expectedActiveTab: "Edit",
			initialMenuType: "characters",
			persistedValue: "edit",
		},
	])(
		'restores the stored Character Management tab "$persistedValue" when the panel opens',
		async ({ expectedActiveTab, initialMenuType, persistedValue }) => {
			window.localStorage.setItem(
				"astra_projecta.sillytavern_interface.character_management_active_tab",
				persistedValue,
			);

			document.body.innerHTML = `
                <div id="character-management-root">
                    <button id="advanced_div" type="button">Native advanced</button>
                    <button id="rm_button_characters" type="button">Native cards</button>
                    <button id="rm_button_selected_ch" type="button">Native edit</button>
                    <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="${initialMenuType}">
                        <div class="settings-panel">Character settings</div>
                    </nav>
                    <div id="after-right-nav-panel"></div>
                    <div id="character_popup" class="flex-container flexFlowColumn flexNoGap open" style="display: none; opacity: 0;">
                        <div id="character_popup_text">Advanced definitions</div>
                        <div id="character_cross" class="fa-solid fa-circle-xmark"></div>
                        <div id="character_popup_ok" class="menu_button">Save</div>
                    </div>
                    <div id="after-character_popup"></div>
                </div>
            `;

			const primaryDrawer = document.getElementById(
				"right-nav-panel",
			) as HTMLElement;
			const advancedPopup = document.getElementById(
				"character_popup",
			) as HTMLElement;
			document
				.getElementById("rm_button_characters")
				?.addEventListener("click", () => {
					primaryDrawer.dataset.menuType = "characters";
				});
			document
				.getElementById("rm_button_selected_ch")
				?.addEventListener("click", () => {
					primaryDrawer.dataset.menuType = "character_edit";
				});
			document
				.getElementById("advanced_div")
				?.addEventListener("click", () => {
					advancedPopup.style.display = "flex";
					advancedPopup.style.opacity = "1";
					advancedPopup.classList.add("open");
				});

			setSillyTavernContext({
				translate: (text: string) => text,
			});

			render(
				<MobileSillyTavernInterfacePanel
					activePageKey="character-management"
					currentChatIdentitySnapshot={createActiveCharacterIdentitySnapshot()}
					open={true}
					onOpenChange={vi.fn()}
				/>,
			);

			const tabList = screen.getByRole("tablist", {
				name: "Character Management sections",
			});
			const targetTab = within(tabList).getByRole("tab", {
				name: expectedActiveTab,
			});
			const host = document.getElementById(
				"sillytavern-interface-panel-character-management-host",
			) as HTMLElement;

			await waitFor(() => {
				expect(targetTab).toHaveAttribute("data-state", "active");
			});

			if (persistedValue === "advanced") {
				await waitFor(() => {
					expect(advancedPopup.parentElement).toBe(host);
				});
				return;
			}

			await waitFor(() => {
				expect(primaryDrawer.parentElement).toBe(host);
			});
		},
	);

	test("falls back to Cards when the stored Character Management tab is Edit but edit is unavailable", async () => {
		const onEditClick = vi.fn();

		window.localStorage.setItem(
			"astra_projecta.sillytavern_interface.character_management_active_tab",
			"edit",
		);

		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="character_edit">
                    <div class="settings-panel">Character settings</div>
                </nav>
                <div id="after-right-nav-panel"></div>
            </div>
        `;
		document
			.getElementById("rm_button_selected_ch")
			?.addEventListener("click", onEditClick);
		document
			.getElementById("rm_button_characters")
			?.addEventListener("click", () => {
				(
					document.getElementById("right-nav-panel") as HTMLElement
				).dataset.menuType = "characters";
			});

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={{
					...createActiveCharacterIdentitySnapshot(),
					characterId: null,
					hasActiveChat: false,
					kind: "none",
					thumbnailUrl: "/img/five.png",
				}}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const cardsTab = within(tabList).getByRole("tab", { name: "Cards" });
		const editTab = within(tabList).getByRole("tab", { name: "Edit" });

		await waitFor(() => {
			expect(cardsTab).toHaveAttribute("data-state", "active");
		});
		expect(editTab).toBeDisabled();
		expect(onEditClick).not.toHaveBeenCalled();
	});

	test("falls back to Cards when the stored Character Management tab is Gallery but gallery is unavailable", async () => {
		const onDropdownChange = vi.fn();

		window.localStorage.setItem(
			"astra_projecta.sillytavern_interface.character_management_active_tab",
			"images",
		);

		document.body.innerHTML = `
            <div id="character-management-root">
                <select id="char-management-dropdown">
                    <option id="default">Default</option>
                    <option id="show_char_gallery" value="gallery">Show Gallery</option>
                </select>
                <button id="rm_button_characters" type="button">Native cards</button>
                <button id="rm_button_selected_ch" type="button">Native edit</button>
                <nav id="right-nav-panel" class="drawer-content closedDrawer fillRight" data-menu-type="characters">
                    <div class="settings-panel">Character settings</div>
                </nav>
            </div>
        `;
		document
			.getElementById("char-management-dropdown")
			?.addEventListener("change", onDropdownChange);

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={{
					...createActiveCharacterIdentitySnapshot(),
					characterId: null,
					hasActiveChat: false,
					kind: "none",
					thumbnailUrl: "/img/five.png",
				}}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Character Management sections",
		});
		const cardsTab = within(tabList).getByRole("tab", { name: "Cards" });
		const galleryTab = within(tabList).getByRole("tab", {
			name: "Gallery",
		});

		await waitFor(() => {
			expect(cardsTab).toHaveAttribute("data-state", "active");
		});
		expect(galleryTab).toBeDisabled();
		expect(onDropdownChange).not.toHaveBeenCalled();
	});

	test("preserves a separate scroll position per page while the panel stays open", async () => {
		setupNativeDrawerFixtureDom();
		vi.spyOn(
			HTMLElement.prototype,
			"clientHeight",
			"get",
		).mockImplementation(function getClientHeight(this: HTMLElement) {
			return this.classList.contains(
				"sillytavern-interface-panel__viewport",
			)
				? 100
				: 0;
		});
		vi.spyOn(
			HTMLElement.prototype,
			"scrollHeight",
			"get",
		).mockImplementation(function getScrollHeight(this: HTMLElement) {
			if (
				!this.classList.contains(
					"sillytavern-interface-panel__viewport",
				)
			) {
				return 0;
			}

			return document
				.getElementById("sillytavern-interface-panel-content")
				?.textContent?.includes("Character settings")
				? 260
				: 220;
		});

		function PagePanelHarness() {
			const [activePageKey, setActivePageKey] =
				React.useState("user-settings");

			return (
				<MobileSillyTavernInterfacePanel
					activePageKey={activePageKey}
					open={true}
					onActivePageKeyChange={setActivePageKey}
					onOpenChange={vi.fn()}
				/>
			);
		}

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(<PagePanelHarness />);

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "User Settings" }),
			).toBeInTheDocument();
			expect(
				document.getElementById("user-settings-block")?.parentElement,
			).toBe(
				document.getElementById(
					"sillytavern-interface-panel-user-settings-host",
				),
			);
		});

		const viewport = getPagePanelViewport();
		viewport.scrollTop = 72;
		fireEvent.scroll(viewport);

		expect(viewport).not.toHaveAttribute("data-has-overflow-y");
		expect(viewport).not.toHaveAttribute("data-astra-has-overflow-y");
		expect(
			viewport.style.getPropertyValue(
				"--astra-scroll-affordance-y-start",
			),
		).toBe("");
		expect(
			viewport.style.getPropertyValue("--astra-scroll-affordance-y-end"),
		).toBe("");

		fireEvent.click(screen.getByRole("button", { name: "Character" }));

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "Character Management" }),
			).toBeInTheDocument();
			expect(
				document.getElementById("right-nav-panel")?.parentElement,
			).toBe(
				document.getElementById(
					"sillytavern-interface-panel-character-management-host",
				),
			);
			expect(viewport.scrollTop).toBe(0);
		});

		viewport.scrollTop = 38;
		fireEvent.scroll(viewport);

		fireEvent.click(screen.getByRole("button", { name: "User Settings" }));

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "User Settings" }),
			).toBeInTheDocument();
			expect(viewport.scrollTop).toBe(72);
		});

		fireEvent.click(screen.getByRole("button", { name: "Character" }));

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "Character Management" }),
			).toBeInTheDocument();
			expect(viewport.scrollTop).toBe(38);
		});
	});

	test("clamps restored scroll positions and clears them after the panel closes", async () => {
		setupNativeDrawerFixtureDom();
		let userSettingsScrollHeight = 320;
		vi.spyOn(
			HTMLElement.prototype,
			"clientHeight",
			"get",
		).mockImplementation(function getClientHeight(this: HTMLElement) {
			return this.classList.contains(
				"sillytavern-interface-panel__viewport",
			)
				? 100
				: 0;
		});
		vi.spyOn(
			HTMLElement.prototype,
			"scrollHeight",
			"get",
		).mockImplementation(function getScrollHeight(this: HTMLElement) {
			if (
				!this.classList.contains(
					"sillytavern-interface-panel__viewport",
				)
			) {
				return 0;
			}

			return document
				.getElementById("sillytavern-interface-panel-content")
				?.textContent?.includes("Character settings")
				? 260
				: userSettingsScrollHeight;
		});

		function PagePanelHarness() {
			const [activePageKey, setActivePageKey] =
				React.useState("user-settings");
			const [open, setOpen] = React.useState(true);

			return (
				<>
					<button type="button" onClick={() => setOpen(true)}>
						Reopen panel
					</button>
					<MobileSillyTavernInterfacePanel
						activePageKey={activePageKey}
						open={open}
						onActivePageKeyChange={setActivePageKey}
						onOpenChange={setOpen}
					/>
				</>
			);
		}

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(<PagePanelHarness />);

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "User Settings" }),
			).toBeInTheDocument();
		});

		const viewport = getPagePanelViewport();
		viewport.scrollTop = 180;
		fireEvent.scroll(viewport);

		fireEvent.click(screen.getByRole("button", { name: "Character" }));

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "Character Management" }),
			).toBeInTheDocument();
			expect(viewport.scrollTop).toBe(0);
		});

		userSettingsScrollHeight = 120;
		fireEvent.click(screen.getByRole("button", { name: "User Settings" }));

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "User Settings" }),
			).toBeInTheDocument();
			expect(viewport.scrollTop).toBe(20);
		});

		viewport.scrollTop = 16;
		fireEvent.scroll(viewport);
		fireEvent.click(screen.getByRole("button", { name: "Back" }));

		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", { name: "User Settings" }),
			).not.toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "Reopen panel" }));

		await waitFor(() => {
			expect(
				screen.getByRole("dialog", { name: "User Settings" }),
			).toBeInTheDocument();
			expect(getPagePanelViewport().scrollTop).toBe(0);
		});
	});

	test("resets the uncontrolled active page back to the default route whenever the panel reopens", () => {
		function PagePanelHarness() {
			const [open, setOpen] = React.useState(true);

			return (
				<>
					<button type="button" onClick={() => setOpen(true)}>
						Reopen panel
					</button>
					<MobileSillyTavernInterfacePanel
						open={open}
						onOpenChange={setOpen}
					/>
				</>
			);
		}

		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(<PagePanelHarness />);

		fireEvent.click(screen.getByRole("button", { name: "User Settings" }));

		expect(
			screen.getByRole("dialog", { name: "User Settings" }),
		).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Back" }));

		expect(
			screen.queryByRole("dialog", { name: "User Settings" }),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Reopen panel" }));

		expect(
			screen.getByRole("dialog", { name: "AI Settings" }),
		).toBeInTheDocument();
		expect(
			document.getElementById("sillytavern-interface-panel-content"),
		).toHaveTextContent(
			"SillyTavern AI Response Configuration is unavailable in the current DOM.",
		);
	});

	test("toggles the main navigation strip and persists the user preference locally", () => {
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		const { unmount } = render(
			<MobileSillyTavernInterfacePanel
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const toggle = screen.getByRole("button", {
			name: "Toggle main navigation",
		});

		expect(
			screen.getByRole("navigation", { name: "Page shortcuts" }),
		).toBeInTheDocument();
		expect(toggle).toHaveAttribute("aria-expanded", "true");
		expect(toggle).toHaveAttribute("data-expanded", "true");

		fireEvent.click(toggle);

		const collapsedNavigation = document.getElementById(
			"sillytavern-interface-panel-main-navigation",
		);

		expect(
			screen.queryByRole("navigation", { name: "Page shortcuts" }),
		).not.toBeInTheDocument();
		expect(collapsedNavigation).toBeInTheDocument();
		expect(collapsedNavigation).toHaveAttribute("aria-hidden", "true");
		expect(collapsedNavigation).toHaveAttribute("data-state", "closed");
		for (const button of collapsedNavigation?.querySelectorAll("button") ??
			[]) {
			expect(button).toHaveAttribute("tabindex", "-1");
		}
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(toggle).toHaveAttribute("data-expanded", "false");
		expect(
			window.localStorage.getItem(
				"astra_projecta.sillytavern_interface.main_navigation_visible",
			),
		).toBe("false");

		unmount();

		render(
			<MobileSillyTavernInterfacePanel
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const persistedCollapsedNavigation = document.getElementById(
			"sillytavern-interface-panel-main-navigation",
		);

		expect(
			screen.queryByRole("navigation", { name: "Page shortcuts" }),
		).not.toBeInTheDocument();
		expect(persistedCollapsedNavigation).toBeInTheDocument();
		expect(persistedCollapsedNavigation).toHaveAttribute(
			"data-state",
			"closed",
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Toggle main navigation",
			}),
		);

		expect(
			screen.getByRole("navigation", { name: "Page shortcuts" }),
		).toBeInTheDocument();
		expect(
			document.getElementById(
				"sillytavern-interface-panel-main-navigation",
			),
		).toHaveAttribute("data-state", "open");
		for (const button of document
			.getElementById("sillytavern-interface-panel-main-navigation")
			?.querySelectorAll("button") ?? []) {
			expect(button).not.toHaveAttribute("tabindex");
		}
		expect(
			window.localStorage.getItem(
				"astra_projecta.sillytavern_interface.main_navigation_visible",
			),
		).toBe("true");
	});

	test("renders optional breadcrumb and section navigation content from the active page descriptor only", () => {
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="docs"
				open={true}
				descriptors={[
					{
						key: "default",
						render: () => <div>Default body</div>,
						title: "Default page",
					},
					{
						breadcrumb: <div>Breadcrumb menu</div>,
						key: "docs",
						render: () => <div>Docs body</div>,
						sectionNav: <div>On this page</div>,
						title: "Docs page",
					},
				]}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("dialog", { name: "Docs page" }),
		).toBeInTheDocument();
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-icon"),
		).toBeNull();
		expect(screen.getByText("Breadcrumb menu")).toBeInTheDocument();
		expect(
			within(
				document.querySelector(
					".sillytavern-interface__subheader-row",
				) as HTMLElement,
			).getByText("On this page"),
		).toBeInTheDocument();
		expect(screen.getByText("Docs body")).toBeInTheDocument();
		expect(screen.queryByText("Default body")).not.toBeInTheDocument();
	});

	test("renders the persona page header with the active user avatar and initials fallback", () => {
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		const currentUserAvatarSnapshot = {
			displayName: "Star Traveler",
			personaId: "hero-persona",
			personaName: "Star Traveler",
			personaTitle: "Lead Pilot",
			source: "selected-persona",
			thumbnailUrl: "/thumbs/persona/hero-persona.png",
			updatedAt: 1,
		} as const;

		const { rerender } = render(
			<MobileSillyTavernInterfacePanel
				activePageKey="persona-management"
				currentUserAvatarSnapshot={currentUserAvatarSnapshot}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("dialog", { name: "Persona Management" }),
		).toBeInTheDocument();
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-icon-frame"),
		).toHaveAttribute("data-icon-kind", "current-user-avatar");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-avatar-image"),
		).toHaveAttribute("src", "/thumbs/persona/hero-persona.png");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-summary"),
		).toHaveTextContent("Create and switch user identities.");
		expect(
			screen.getByRole("link", {
				name: "Open SillyTavern documentation",
			}),
		).toHaveAttribute(
			"href",
			"https://docs.sillytavern.app/usage/core-concepts/personas/",
		);

		rerender(
			<MobileSillyTavernInterfacePanel
				activePageKey="persona-management"
				currentUserAvatarSnapshot={{
					...currentUserAvatarSnapshot,
					thumbnailUrl: "",
				}}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(
					".sillytavern-interface__title-avatar-fallback",
				),
		).toHaveTextContent("ST");
	});

	test("renders persona management tabs and bridges the native PersonaManagement root into the SillyTavern interface host", async () => {
		setupPersonaManagementFixtureDom();
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="persona-management"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Persona Management sections",
		});
		const personasTab = within(tabList).getByRole("tab", {
			name: "Personas",
		});
		const editTab = within(tabList).getByRole("tab", {
			name: "Edit",
		});
		const nativeRoot = document.getElementById("PersonaManagement");
		const host = document.getElementById(
			"sillytavern-interface-panel-persona-management-host",
		);

		expect(personasTab).toHaveAttribute("data-state", "active");
		expect(editTab).toHaveAttribute("data-state", "inactive");
		expect(
			personasTab.querySelector(".lucide-venetian-mask"),
		).not.toBeInTheDocument();
		expect(
			editTab.querySelector(".lucide-user-round-pen"),
		).not.toBeInTheDocument();

		await waitFor(() => {
			expect(nativeRoot?.parentElement).toBe(host);
			expect(host).toHaveTextContent("Usage Stats");
			expect(host).toHaveTextContent("Current Persona");
			expect(host).toHaveTextContent("Global Settings");
		});
	});

	test("restores the stored persona management tab on open", async () => {
		window.localStorage.setItem(
			"astra_projecta.sillytavern_interface.persona_management_active_tab",
			"edit",
		);

		setupPersonaManagementFixtureDom();
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="persona-management"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Persona Management sections",
		});
		const personasTab = within(tabList).getByRole("tab", {
			name: "Personas",
		});
		const editTab = within(tabList).getByRole("tab", {
			name: "Edit",
		});

		await waitFor(() => {
			expect(editTab).toHaveAttribute("data-state", "active");
			expect(personasTab).toHaveAttribute("data-state", "inactive");
		});
	});

	test("persists persona management tab changes without rewriting the native persona content", async () => {
		setupPersonaManagementFixtureDom();
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="persona-management"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		const tabList = screen.getByRole("tablist", {
			name: "Persona Management sections",
		});
		const editTab = within(tabList).getByRole("tab", {
			name: "Edit",
		});
		const personasTab = within(tabList).getByRole("tab", {
			name: "Personas",
		});
		const host = document.getElementById(
			"sillytavern-interface-panel-persona-management-host",
		);

		fireEvent.mouseDown(editTab, { button: 0, ctrlKey: false });

		await waitFor(() => {
			expect(editTab).toHaveAttribute("data-state", "active");
			expect(personasTab).toHaveAttribute("data-state", "inactive");
			expect(
				window.localStorage.getItem(
					"astra_projecta.sillytavern_interface.persona_management_active_tab",
				),
			).toBe("edit");
			expect(host).toHaveAttribute("data-persona-management-tab", "edit");
			expect(host).toHaveTextContent("Star Traveler");
			expect(host).toHaveTextContent("Lead Pilot");
		});
	});

	test("renders the character page header with the active character chat avatar", () => {
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		const currentChatIdentitySnapshot = {
			avatarSource: "character-thumbnail",
			characterId: 0,
			chatFileName: "hero-chat",
			entityName: "Hero",
			groupAvatarUrls: [],
			groupId: null,
			hasActiveChat: true,
			kind: "character",
			thumbnailUrl: "/thumbs/avatar/hero.png",
			updatedAt: 1,
		} satisfies CurrentChatIdentitySnapshot;

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={currentChatIdentitySnapshot}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("dialog", { name: "Character Management" }),
		).toBeInTheDocument();
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-icon-frame"),
		).toHaveAttribute("data-icon-kind", "current-chat-avatar");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-avatar-image"),
		).toHaveAttribute("src", "/thumbs/avatar/hero.png");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-svg-icon svg"),
		).not.toBeInTheDocument();
	});

	test("renders the character page header with the active group chat avatar", () => {
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		const currentChatIdentitySnapshot = {
			avatarSource: "group-member-thumbnail",
			characterId: null,
			chatFileName: "party-chat",
			entityName: "Party",
			groupAvatarUrls: [
				"/thumbs/avatar/hero.png",
				"/thumbs/avatar/mage.png",
			],
			groupId: "party",
			hasActiveChat: true,
			kind: "group",
			thumbnailUrl: "/thumbs/avatar/hero.png",
			updatedAt: 1,
		} satisfies CurrentChatIdentitySnapshot;

		render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={currentChatIdentitySnapshot}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-icon-frame"),
		).toHaveAttribute("data-icon-kind", "current-chat-avatar");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".astra-chat-avatar--collage"),
		).toHaveAttribute("data-count", "2");
		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelectorAll(".astra-chat-avatar__collage-image"),
		).toHaveLength(2);
	});

	test("keeps the character page header SVG fallback when the active chat only has a generic fallback avatar", () => {
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		const activeFallbackCharacterSnapshot = {
			avatarSource: "fallback",
			characterId: 0,
			chatFileName: "hero-chat",
			entityName: "Hero",
			groupAvatarUrls: [],
			groupId: null,
			hasActiveChat: true,
			kind: "character",
			thumbnailUrl: "/img/ai4.png",
			updatedAt: 1,
		} satisfies CurrentChatIdentitySnapshot;
		const activeFallbackGroupSnapshot = {
			avatarSource: "fallback",
			characterId: null,
			chatFileName: "party-chat",
			entityName: "Party",
			groupAvatarUrls: [],
			groupId: "party",
			hasActiveChat: true,
			kind: "group",
			thumbnailUrl: "/img/five.png",
			updatedAt: 2,
		} satisfies CurrentChatIdentitySnapshot;

		const { rerender } = render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={activeFallbackCharacterSnapshot}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

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
				?.querySelector(".sillytavern-interface__title-avatar-image"),
		).not.toBeInTheDocument();

		rerender(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={activeFallbackGroupSnapshot}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

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
				?.querySelector(".sillytavern-interface__title-avatar-image"),
		).not.toBeInTheDocument();
	});

	test("keeps the character page header SVG fallback without an active chat identity", () => {
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		const noActiveChatSnapshot = {
			avatarSource: "fallback",
			characterId: null,
			chatFileName: "",
			entityName: "",
			groupAvatarUrls: [],
			groupId: null,
			hasActiveChat: false,
			kind: "none",
			thumbnailUrl: "/img/five.png",
			updatedAt: 1,
		} satisfies CurrentChatIdentitySnapshot;

		const { rerender } = render(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				currentChatIdentitySnapshot={noActiveChatSnapshot}
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

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
				?.querySelector(".sillytavern-interface__title-avatar-image"),
		).not.toBeInTheDocument();

		rerender(
			<MobileSillyTavernInterfacePanel
				activePageKey="character-management"
				open={true}
				onOpenChange={vi.fn()}
			/>,
		);

		expect(
			document
				.getElementById("sillytavern-interface-panel-title")
				?.querySelector(".sillytavern-interface__title-icon-frame"),
		).toHaveAttribute("data-icon-kind", "main-menu-svg");
	});
});
