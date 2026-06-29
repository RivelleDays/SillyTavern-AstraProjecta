import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as React from "react";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import type { ChatContextUsageSnapshot } from "@/packages/core/st/chatContextUsage";
import type { CurrentConnectionInfoSnapshot } from "@/packages/core/st/currentConnectionInfo";
import type { CurrentChatInfoSnapshot } from "@/packages/core/st/currentChatInfo";
import type {
	CurrentConnectionProfilesSnapshot,
	CurrentPresetProfileControlsSnapshot,
} from "@/packages/core/st/currentPresetProfileControls";
import type { CurrentUserAvatarSnapshot } from "@/packages/core/st/currentUserAvatar";
import {
	SILLYTAVERN_INTERFACE_ROUTES,
	type SillyTavernInterfaceRouteIconKey,
} from "@/app/shared/sillytavern-interface";
import { MobileChatMainMenuDrawer } from "@/packages/features/chat-session/send-form/main-menu/MobileChatMainMenuDrawer";

const ST_MERIDIEM_TIMESTAMP_MS = Date.parse("2025-05-04T14:20:00.000Z");

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function createIdentitySnapshot(
	overrides: Partial<CurrentChatIdentitySnapshot> = {},
): CurrentChatIdentitySnapshot {
	return {
		avatarSource: "character-thumbnail",
		characterId: 0,
		chatFileName: "chapter-1",
		entityName: "Hero",
		groupAvatarUrls: [],
		groupId: null,
		hasActiveChat: true,
		kind: "character",
		thumbnailUrl: "/thumbs/avatar/hero.png",
		updatedAt: 0,
		...overrides,
	};
}

function createInfoSnapshot(
	overrides: Partial<CurrentChatInfoSnapshot> = {},
): CurrentChatInfoSnapshot {
	return {
		dominantModel: "claude-3.7-sonnet",
		fileSize: "12 KB",
		hasActiveChat: true,
		lastMessagePreview: "Reply 3",
		lastUpdatedAt: Date.parse("2026-04-23T10:30:00.000Z"),
		metadataReason: null,
		metadataStatus: "ready",
		messageCount: 128,
		modelCounts: {
			"openrouter/anthropic/claude-3.7-sonnet": 2,
		},
		updatedAt: 0,
		...overrides,
	};
}

function createContextUsageSnapshot(
	overrides: Partial<ChatContextUsageSnapshot> = {},
): ChatContextUsageSnapshot {
	return {
		activityStatus: "idle",
		characterTokens: 402,
		chatHistoryTokens: 10_842,
		hasDetailedBreakdown: true,
		hasPreparedContext: true,
		mainApi: "openai",
		maxContextTokens: 32_768,
		otherPromptTokens: null,
		personaTokens: 176,
		promptBudgetTokens: 30_720,
		reservedResponseTokens: 2_048,
		status: "ready",
		updatedAt: 0,
		usagePercent: 37.68,
		usedContextTokens: 12_345,
		usedPromptTokens: 10_297,
		worldInfoTokens: 987,
		...overrides,
	};
}

function createCurrentUserSnapshot(
	overrides: Partial<CurrentUserAvatarSnapshot> = {},
): CurrentUserAvatarSnapshot {
	return {
		displayName: "Rivelle",
		personaId: "hero-persona",
		personaName: "Star Traveler",
		personaTitle: "Lead Pilot",
		source: "selected-persona",
		thumbnailUrl: "/thumbs/persona/hero-persona.png",
		updatedAt: 0,
		...overrides,
	};
}

function createCurrentConnectionSnapshot(
	overrides: Partial<CurrentConnectionInfoSnapshot> = {},
): CurrentConnectionInfoSnapshot {
	return {
		apiIconKey: "openrouter",
		apiLabel: "OpenRouter / Anthropic",
		hasActiveConnection: true,
		modelIconKey: "claude",
		modelLabel: "Claude 3.7 Sonnet",
		status: "ready",
		updatedAt: 0,
		...overrides,
	};
}

const defaultConnectionProfiles: CurrentConnectionProfilesSnapshot = {
	authority: "attached",
	detachedReason: null,
	options: [
		{ label: "<None>", value: "" },
		{ label: "Story Mode", value: "profile-1" },
	],
	selectedProfileId: "profile-1",
	selectedProfileName: "Story Mode",
	status: "ready",
};

function createPresetProfileControlsSnapshot({
	connectionProfiles,
	...overrides
}: Omit<Partial<CurrentPresetProfileControlsSnapshot>, "connectionProfiles"> & {
	connectionProfiles?: Partial<CurrentConnectionProfilesSnapshot>;
} = {}): CurrentPresetProfileControlsSnapshot {
	return {
		connectionProfiles: {
			...defaultConnectionProfiles,
			...connectionProfiles,
		},
		updatedAt: 0,
		...overrides,
	};
}

function renderTestRouteIcon({
	className,
	iconKey,
}: {
	className?: string;
	iconKey: SillyTavernInterfaceRouteIconKey;
}) {
	return (
		<span
			aria-hidden={true}
			className={className}
			data-icon-key={iconKey}
		/>
	);
}

function ControlledMainMenuDrawer(
	props: Omit<
		React.ComponentProps<typeof MobileChatMainMenuDrawer>,
		"onOpenChange" | "open"
	>,
) {
	const [open, setOpen] = React.useState(true);

	return (
		<MobileChatMainMenuDrawer
			{...props}
			onOpenChange={setOpen}
			open={open}
			renderSillyTavernInterfaceRouteIcon={
				props.renderSillyTavernInterfaceRouteIcon ?? renderTestRouteIcon
			}
		/>
	);
}

describe("MobileChatMainMenuDrawer", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
		vi.unstubAllGlobals();
		window.localStorage.clear();
	});

	test("renders a single always-visible detail list with context usage last", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: (pattern: string) =>
					pattern === "YYYY/MM/DD hh:mm A"
						? "2026/04/23 06:30 PM"
						: `unexpected:${pattern}`,
			}),
			translate: (text: string) => text,
		});
		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const drawer = await screen.findByText("Hero");
		const root = drawer.closest(".astra-chat-main-menu-drawer");
		expect(root).toBeInTheDocument();
		const title = document.getElementById(
			"astra-chat-main-menu-drawer-title",
		);
		const description = document.getElementById(
			"astra-chat-main-menu-drawer-description",
		);
		const header = document.getElementById(
			"astra-chat-main-menu-drawer-header",
		);
		const body = document.getElementById(
			"astra-chat-main-menu-drawer-body",
		);
		const scrollableContent = document.getElementById(
			"astra-chat-main-menu-drawer-scrollable-content",
		);
		const content = document.getElementById(
			"astra-chat-main-menu-drawer-content",
		);
		const headerRow = root?.querySelector(
			".astra-chat-main-menu-drawer__header-row",
		) as HTMLElement | null;
		const headerMain = headerRow?.querySelector(
			".astra-chat-main-menu-drawer__header-main",
		) as HTMLElement | null;

		expect(scrollableContent).toBeInTheDocument();
		expect(root).toHaveAttribute("id", "astra-chat-main-menu-drawer");
		expect(root).toHaveAttribute(
			"aria-labelledby",
			"astra-chat-main-menu-drawer-title",
		);
		expect(root).toHaveAttribute(
			"aria-describedby",
			"astra-chat-main-menu-drawer-description",
		);
		expect(title).toHaveAttribute("data-slot", "drawer-title");
		expect(description).toHaveAttribute("data-slot", "drawer-description");
		expect(header).toBeInTheDocument();
		expect(header).toHaveClass("astra-chat-main-menu-drawer__header");
		expect(body).toHaveClass("astra-chat-main-menu-drawer__body");
		expect(scrollableContent).toHaveClass(
			"astra-chat-main-menu-drawer__scrollable-content",
		);
		expect(content).toHaveClass("astra-chat-main-menu-drawer__content");
		expect(headerRow).toBeInTheDocument();
		expect(
			header?.querySelector(".astra-chat-main-menu-drawer__header-row"),
		).toBe(headerRow);
		expect(
			headerRow?.closest(
				".astra-chat-main-menu-drawer__scrollable-content",
			),
		).toBeNull();
		expect(headerMain).toBeInTheDocument();
		expect(
			headerMain?.querySelector(
				".astra-chat-main-menu-drawer__avatar-frame",
			),
		).toBeInTheDocument();
		expect(
			headerMain?.querySelector(
				".astra-chat-main-menu-drawer__name-stack",
			),
		).toBeInTheDocument();
		expect(
			headerRow?.querySelector(".astra-chat-main-menu-drawer__actions"),
		).toBeInTheDocument();

		expect(
			root?.querySelector(".astra-chat-main-menu-drawer__meta-row"),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Delete chat" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Edit categories" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Rename chat" }),
		).toBeInTheDocument();

		const detailSection = root?.querySelector(
			".astra-chat-main-menu-drawer__detail-section",
		);
		const tileGrid = root?.querySelector(
			".astra-chat-main-menu-drawer__grid",
		) as HTMLElement | null;
		expect(detailSection).toBeInTheDocument();
		expect(tileGrid).toBeInTheDocument();
		expect(
			detailSection?.closest(
				".astra-chat-main-menu-drawer__scrollable-content",
			),
		).toBe(scrollableContent);
		expect(
			tileGrid?.closest(
				".astra-chat-main-menu-drawer__scrollable-content",
			),
		).toBe(scrollableContent);

		const detailRows = Array.from(
			detailSection?.querySelectorAll(
				".astra-chat-main-menu-drawer__detail-row",
			) ?? [],
		);
		expect(detailRows).toHaveLength(3);
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
			within(detailRows[0] as HTMLElement).getByText("Current API"),
		).toBeInTheDocument();
		expect(
			within(detailRows[0] as HTMLElement).getByText(
				"OpenRouter / Anthropic",
			),
		).toBeInTheDocument();
		expect(
			within(detailRows[0] as HTMLElement).getByText("Claude 3.7 Sonnet"),
		).toBeInTheDocument();
		expect(
			detailRows[0]?.querySelector(
				".astra-chat-main-menu-drawer__detail-connection-provider img.astra-chat-main-menu-drawer__detail-connection-provider-icon",
			),
		).not.toBeInTheDocument();
		expect(
			detailRows[0]?.querySelector(
				".astra-chat-main-menu-drawer__detail-connection-model .astra-chat-main-menu-drawer__detail-connection-provider-icon",
			),
		).not.toBeInTheDocument();
		expect(
			within(detailRows[1] as HTMLElement).getByText("Most used model"),
		).toBeInTheDocument();
		const modelValue = within(detailRows[1] as HTMLElement).getByText(
			"claude-3.7-sonnet",
		);
		expect(modelValue).toHaveClass(
			"astra-chat-main-menu-drawer__detail-definition",
		);
		expect(modelValue).toHaveAttribute("title", "claude-3.7-sonnet");
		expect(
			within(detailRows[2] as HTMLElement).getByText("Context Usage"),
		).toBeInTheDocument();

		expect(
			detailSection?.querySelectorAll(
				'.astra-chat-main-menu-drawer__detail-separator[data-slot="separator"], .astra-chat-main-menu-drawer__detail-separator',
			),
		).toHaveLength(2);

		const contextUsageRow = within(detailSection as HTMLElement)
			.getByText("Context Usage")
			.closest(".astra-chat-main-menu-drawer__detail-context-row");
		expect(contextUsageRow).toBeInTheDocument();
		expect(contextUsageRow?.tagName).toBe("DL");
		expect(
			within(contextUsageRow as HTMLElement).getByText("Context Usage"),
		).toBeInTheDocument();

		expect(
			within(contextUsageRow as HTMLElement).getByText("38%"),
		).toBeInTheDocument();
		expect(
			within(contextUsageRow as HTMLElement).getByText(
				"(12,345 / 32,768)",
			),
		).toBeInTheDocument();
		expect(
			root?.querySelectorAll(
				".astra-chat-context-usage-shortcut__data-pill",
			),
		).toHaveLength(0);
		expect(
			within(detailSection as HTMLElement).queryByText("Context Used"),
		).not.toBeInTheDocument();
		expect(
			within(detailSection as HTMLElement).queryByText("Chat History"),
		).not.toBeInTheDocument();
		expect(
			within(detailSection as HTMLElement).queryByText("Last updated"),
		).not.toBeInTheDocument();
		expect(
			detailSection?.querySelector(
				".astra-chat-main-menu-drawer__detail-helper",
			),
		).not.toBeInTheDocument();
	});

	test("renders the current group avatar as a member collage in the header", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot({
					avatarSource: "group-member-thumbnail",
					characterId: null,
					chatFileName: "campfire",
					entityName: "Party",
					groupAvatarUrls: [
						"/thumbs/avatar/hero.png",
						"/thumbs/avatar/mage.png",
					],
					groupId: "party",
					kind: "group",
					thumbnailUrl: "/thumbs/avatar/hero.png",
				})}
			/>,
		);

		const drawer = (await screen.findByText("Party")).closest(
			".astra-chat-main-menu-drawer",
		);
		const collage = drawer?.querySelector(
			".astra-chat-main-menu-drawer__avatar.astra-chat-avatar--collage",
		);
		const images = Array.from(
			collage?.querySelectorAll(".astra-chat-avatar__collage-image") ??
				[],
		);

		expect(collage).toBeInTheDocument();
		expect(collage).toHaveAttribute("data-count", "2");
		expect(images.map((image) => image.getAttribute("src"))).toEqual([
			"/thumbs/avatar/hero.png",
			"/thumbs/avatar/mage.png",
		]);
	});

	test("renders drawer tiles with split labels and a single decorative icon container", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				onOpenChange={() => {}}
				open={true}
				renderSillyTavernInterfaceRouteIcon={renderTestRouteIcon}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const userSettingsButton = await screen.findByRole("button", {
			name: "User Settings",
		});
		const userSettingsTitleLines = Array.from(
			userSettingsButton.querySelectorAll(
				".astra-chat-main-menu-drawer__tile-title-line",
			),
		).map((line) => line.textContent);

		expect(userSettingsTitleLines).toEqual(["User", "Settings"]);
		expect(
			userSettingsButton.querySelector(
				".astra-chat-main-menu-drawer__tile-glow",
			),
		).toBeInTheDocument();
		expect(
			userSettingsButton.querySelector(
				".astra-chat-main-menu-drawer__tile-fade",
			),
		).toBeInTheDocument();
		expect(
			userSettingsButton.querySelectorAll(
				".astra-chat-main-menu-drawer__tile-deco-icon",
			),
		).toHaveLength(1);

		const lorebookButton = screen.getByRole("button", { name: "Lorebook" });
		expect(
			Array.from(
				lorebookButton.querySelectorAll(
					".astra-chat-main-menu-drawer__tile-title-line",
				),
			).map((line) => line.textContent),
		).toEqual(["Lorebook"]);
		expect(
			lorebookButton.querySelectorAll(
				".astra-chat-main-menu-drawer__tile-deco-icon",
			),
		).toHaveLength(1);
	});

	test("routes drawer tile clicks to the matching SillyTavern interface page", async () => {
		const onSillyTavernInterfaceShortcutSelect = vi.fn();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				onOpenChange={() => {}}
				onSillyTavernInterfaceShortcutSelect={
					onSillyTavernInterfaceShortcutSelect
				}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const tileRoutes = [
			["AI Settings", SILLYTAVERN_INTERFACE_ROUTES.aiSettings],
			["User Settings", SILLYTAVERN_INTERFACE_ROUTES.userSettings],
			["Lorebook", SILLYTAVERN_INTERFACE_ROUTES.lorebook],
			["Extensions", SILLYTAVERN_INTERFACE_ROUTES.extensions],
			["Backgrounds", SILLYTAVERN_INTERFACE_ROUTES.backgrounds],
			[
				"Character Management",
				SILLYTAVERN_INTERFACE_ROUTES.characterManagement,
			],
		] as const;

		for (const [label, pageKey] of tileRoutes) {
			fireEvent.click(
				await screen.findByRole("button", {
					name: label,
				}),
			);
			expect(
				onSillyTavernInterfaceShortcutSelect,
			).toHaveBeenLastCalledWith(pageKey);
		}

		expect(onSillyTavernInterfaceShortcutSelect).toHaveBeenCalledTimes(
			tileRoutes.length,
		);
	});

	test("renders the current user card after the tile grid and routes persona management", async () => {
		const onSillyTavernInterfaceShortcutSelect = vi.fn();
		const onRequestChatSessionSettings = vi.fn();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentUserSnapshot={createCurrentUserSnapshot()}
				onOpenChange={() => {}}
				onSillyTavernInterfaceShortcutSelect={
					onSillyTavernInterfaceShortcutSelect
				}
				onRequestChatSessionSettings={onRequestChatSessionSettings}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const tileGrid = await screen.findByLabelText("Main menu shortcuts");
		const root = tileGrid.closest(".astra-chat-main-menu-drawer");
		const scrollableContent = root?.querySelector(
			".astra-chat-main-menu-drawer__scrollable-content",
		) as HTMLElement | null;
		const footer = document.getElementById(
			"astra-chat-main-menu-drawer-footer",
		);
		const currentUserSection = root?.querySelector(
			".astra-chat-main-menu-drawer__current-user-section",
		) as HTMLElement | null;
		const currentUserCard = root?.querySelector(
			".astra-chat-main-menu-drawer__current-user-card",
		) as HTMLElement | null;
		const currentUserRow = currentUserCard?.querySelector(
			".astra-chat-main-menu-drawer__current-user-row",
		) as HTMLElement | null;

		expect(scrollableContent).toBeInTheDocument();
		expect(footer).toBeInTheDocument();
		expect(footer).toHaveClass("astra-chat-main-menu-drawer__footer");
		expect(currentUserSection).toBeInTheDocument();
		expect(currentUserCard).toBeInTheDocument();
		expect(
			footer?.querySelector(
				".astra-chat-main-menu-drawer__current-user-card",
			),
		).toBe(currentUserCard);
		expect(
			currentUserCard?.closest(
				".astra-chat-main-menu-drawer__scrollable-content",
			),
		).toBeNull();
		expect(currentUserRow).toBeInTheDocument();
		expect(currentUserRow).not.toHaveClass(
			"astra-chat-main-menu-drawer__header-row",
		);
		expect(
			tileGrid.compareDocumentPosition(footer as HTMLElement) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			within(currentUserCard as HTMLElement).getByText("Rivelle"),
		).toBeInTheDocument();
		expect(
			within(currentUserCard as HTMLElement).getByText("Lead Pilot"),
		).toBeInTheDocument();
		expect(
			currentUserCard?.querySelector(
				".astra-chat-main-menu-drawer__current-user-frame",
			),
		).toBeInTheDocument();
		const currentUserMainGroup = currentUserCard?.querySelector(
			".astra-chat-main-menu-drawer__current-user-main",
		) as HTMLElement | null;
		expect(currentUserMainGroup).toBeInTheDocument();
		expect(
			currentUserMainGroup?.querySelector(
				".astra-chat-main-menu-drawer__current-user-image",
			),
		).toBeInTheDocument();
		expect(
			currentUserMainGroup?.querySelector(
				".astra-chat-main-menu-drawer__current-user-name-stack",
			),
		).toBeInTheDocument();
		expect(
			currentUserCard?.querySelector(
				".astra-chat-main-menu-drawer__current-user-actions",
			),
		).toBeInTheDocument();
		expect(
			currentUserCard?.querySelector('[data-slot="item"]'),
		).not.toBeInTheDocument();
		expect(
			currentUserCard?.querySelector('[data-slot="item-media"]'),
		).not.toBeInTheDocument();
		expect(
			currentUserCard?.querySelector('[data-slot="item-content"]'),
		).not.toBeInTheDocument();
		expect(
			currentUserCard?.querySelector('[data-slot="item-actions"]'),
		).not.toBeInTheDocument();
		expect(
			currentUserCard?.querySelector('[data-slot="avatar"]'),
		).not.toBeInTheDocument();

		const actionButtons = within(
			currentUserCard as HTMLElement,
		).getAllByRole("button");
		expect(
			actionButtons.map((button) => button.getAttribute("aria-label")),
		).toEqual([
			"Chat settings override",
			"Persona management",
			"Open chat settings",
		]);
		for (const button of actionButtons) {
			expect(button).toHaveClass(
				"astra-chat-main-menu-drawer__action-button",
			);
			expect(button).toHaveClass(
				"astra-chat-main-menu-drawer__current-user-action",
			);
			expect(button).toHaveAttribute("data-size", "icon");
		}
		expect(actionButtons[0]).toBeDisabled();
		expect(actionButtons[1]).not.toBeDisabled();
		expect(actionButtons[2]).not.toBeDisabled();
		expect(
			actionButtons[1]?.querySelector(".lucide-arrow-right-left"),
		).toBeInTheDocument();
		expect(
			actionButtons[2]?.querySelector(".lucide-bolt"),
		).toBeInTheDocument();
		expect(
			within(currentUserCard as HTMLElement).queryByRole("button", {
				name: "Persona switch",
			}),
		).not.toBeInTheDocument();

		fireEvent.click(actionButtons[1] as HTMLElement);

		expect(onSillyTavernInterfaceShortcutSelect).toHaveBeenCalledWith(
			SILLYTAVERN_INTERFACE_ROUTES.personaManagement,
		);
		expect(onRequestChatSessionSettings).not.toHaveBeenCalled();

		fireEvent.click(actionButtons[2] as HTMLElement);

		expect(onRequestChatSessionSettings).toHaveBeenCalledTimes(1);
	});

	test("falls back to persona name for the current user subtitle and hides it when it matches display name", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		const { rerender } = render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentUserSnapshot={createCurrentUserSnapshot({
					personaTitle: "",
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const currentUserCard = await screen.findByText("Rivelle");
		expect(
			within(
				currentUserCard.closest(
					".astra-chat-main-menu-drawer__current-user-card",
				) as HTMLElement,
			).getByText("Star Traveler"),
		).toBeInTheDocument();

		rerender(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentUserSnapshot={createCurrentUserSnapshot({
					personaName: "Rivelle",
					personaTitle: "",
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		expect(screen.queryByText("Star Traveler")).not.toBeInTheDocument();
	});

	test("hides detail items that do not have real values and removes the section for no active chat", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		const { rerender } = render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					dominantModel: "",
					fileSize: "",
					lastUpdatedAt: null,
					messageCount: 0,
					modelCounts: {},
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const activeRow = await screen.findByText("Hero");
		const activeRoot = activeRow.closest(".astra-chat-main-menu-drawer");
		expect(
			activeRoot?.querySelector(".astra-chat-main-menu-drawer__meta-row"),
		).not.toBeInTheDocument();
		expect(
			activeRoot?.querySelector(
				".astra-chat-main-menu-drawer__detail-section",
			),
		).not.toBeInTheDocument();
		expect(
			within(activeRoot as HTMLElement).queryByText("Most used model"),
		).not.toBeInTheDocument();
		expect(
			within(activeRoot as HTMLElement).queryByText("Context Usage"),
		).not.toBeInTheDocument();

		rerender(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot({
					dominantModel: "",
					fileSize: "",
					hasActiveChat: false,
					lastUpdatedAt: null,
					messageCount: null,
					modelCounts: {},
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot({
					chatFileName: "",
					entityName: "",
					hasActiveChat: false,
					kind: "none",
				})}
			/>,
		);

		expect(screen.getByText("No active chat")).toBeInTheDocument();
		const inactiveRoot = screen
			.getByText("No active chat")
			.closest(".astra-chat-main-menu-drawer");
		expect(
			inactiveRoot?.querySelector(
				".astra-chat-main-menu-drawer__meta-row",
			),
		).not.toBeInTheDocument();
		expect(
			inactiveRoot?.querySelector(
				".astra-chat-main-menu-drawer__detail-section",
			),
		).not.toBeInTheDocument();
	});

	test("hides context usage when there is no usable value", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		const { rerender } = render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		expect(screen.queryByText("Context Usage")).not.toBeInTheDocument();

		rerender(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "pending",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		expect(screen.queryByText("Context Usage")).not.toBeInTheDocument();
		expect(
			screen.queryByText("Loading context usage"),
		).not.toBeInTheDocument();

		rerender(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					mainApi: "koboldcpp",
					status: "unsupported",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		expect(screen.queryByText("Context Usage")).not.toBeInTheDocument();
		expect(
			screen.queryByText("Context usage unavailable"),
		).not.toBeInTheDocument();
	});

	test("renders only the connection profile control below the tile grid", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				currentPresetProfileControlsSnapshot={createPresetProfileControlsSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const drawer = await screen.findByText("Hero");
		const root = drawer.closest(".astra-chat-main-menu-drawer");
		const scrollableContent = root?.querySelector(
			".astra-chat-main-menu-drawer__scrollable-content",
		) as HTMLElement | null;
		const detailSection = root?.querySelector(
			".astra-chat-main-menu-drawer__detail-section",
		) as HTMLElement | null;
		const controlsSection = root?.querySelector(
			".astra-chat-main-menu-drawer__controls-section",
		) as HTMLElement | null;
		const tileGrid = root?.querySelector(
			".astra-chat-main-menu-drawer__grid",
		) as HTMLElement | null;

		if (
			!scrollableContent ||
			!detailSection ||
			!controlsSection ||
			!tileGrid
		) {
			throw new Error(
				"Expected the main-menu drawer sections to render.",
			);
		}

		expect(detailSection).toBeInTheDocument();
		expect(controlsSection).toBeInTheDocument();
		expect(tileGrid).toBeInTheDocument();
		expect(
			detailSection.closest(
				".astra-chat-main-menu-drawer__scrollable-content",
			),
		).toBe(scrollableContent);
		expect(
			tileGrid.closest(
				".astra-chat-main-menu-drawer__scrollable-content",
			),
		).toBe(scrollableContent);
		expect(
			controlsSection.closest(
				".astra-chat-main-menu-drawer__scrollable-content",
			),
		).toBe(scrollableContent);
		expect(
			detailSection.compareDocumentPosition(tileGrid) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			tileGrid.compareDocumentPosition(controlsSection) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			within(controlsSection).getByText("Connection Profile"),
		).toBeInTheDocument();
		expect(
			within(controlsSection).queryByText("Chat Completion preset"),
		).not.toBeInTheDocument();
		const profileTriggers =
			within(controlsSection).getAllByRole("combobox");
		expect(profileTriggers).toHaveLength(1);
		expect(profileTriggers[0]).toHaveAttribute(
			"id",
			"astra-chat-main-menu-connection-profile-select",
		);
	});

	test("shows a detached profile label and helper when current settings drift away from the selected profile", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				currentPresetProfileControlsSnapshot={createPresetProfileControlsSnapshot(
					{
						connectionProfiles: {
							authority: "detached",
							detachedReason: "settings-changed",
						},
					},
				)}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const drawer = await screen.findByText("Hero");
		const root = drawer.closest(".astra-chat-main-menu-drawer");
		expect(
			within(root as HTMLElement).getByText("Connection Profile"),
		).toBeInTheDocument();
		const profileTrigger = screen.getByRole("combobox", {
			name: "Connection Profile",
		});
		expect(profileTrigger).toHaveTextContent("Custom / Detached");
		expect(
			within(root as HTMLElement).getByText(
				"Current settings changed outside Connection Profile. Select a profile to reattach.",
			),
		).toBeInTheDocument();
	});

	test("opens the connection profile dropdown inside the Astra portal container", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				currentPresetProfileControlsSnapshot={createPresetProfileControlsSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const profileTrigger = await screen.findByRole("combobox", {
			name: "Connection Profile",
		});
		profileTrigger.focus();
		fireEvent.keyDown(profileTrigger, {
			code: "ArrowDown",
			key: "ArrowDown",
		});

		const content = await screen.findByRole("listbox");
		const noneItem = within(content).getByRole("option", {
			name: "<None>",
		});
		const profileItem = within(content).getByRole("option", {
			name: "Story Mode",
		});
		const portalContainer = document.getElementById(
			"astra-projecta-ui-portals",
		);

		expect(noneItem).toBeInTheDocument();
		expect(profileItem).toBeInTheDocument();
		await waitFor(() => {
			expect(portalContainer?.contains(content)).toBe(true);
		});
	});

	test("keeps long connection profile labels inspectable while exposing bounded select markup", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});
		const longProfileLabel =
			"openrouter anthropic/claude-opus-4.5 - Sushi Preset (Kimi, Deepseek, Gemini, and several long fallback providers)";
		const onConnectionProfileChange = vi.fn();

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				currentPresetProfileControlsSnapshot={createPresetProfileControlsSnapshot(
					{
						connectionProfiles: {
							options: [
								{ label: "<None>", value: "" },
								{
									label: longProfileLabel,
									value: "profile-long",
								},
								{
									label: "Compact Mode",
									value: "profile-short",
								},
							],
							selectedProfileId: "profile-long",
							selectedProfileName: longProfileLabel,
						},
					},
				)}
				onConnectionProfileChange={onConnectionProfileChange}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const profileTrigger = await screen.findByRole("combobox", {
			name: "Connection Profile",
		});
		const triggerValue = profileTrigger.querySelector(
			".astra-chat-main-menu-drawer__control-value",
		);

		expect(profileTrigger).toHaveTextContent(longProfileLabel);
		expect(profileTrigger).toHaveAttribute("title", longProfileLabel);
		expect(triggerValue).toBeInTheDocument();
		expect(triggerValue).toHaveTextContent(longProfileLabel);

		profileTrigger.focus();
		fireEvent.keyDown(profileTrigger, {
			code: "ArrowDown",
			key: "ArrowDown",
		});

		const content = await screen.findByRole("listbox");
		const longProfileItem = within(content).getByRole("option", {
			name: longProfileLabel,
		});
		const longProfileItemLabel =
			within(longProfileItem).getByText(longProfileLabel);
		const portalContainer = document.getElementById(
			"astra-projecta-ui-portals",
		);

		expect(longProfileItem).toHaveClass(
			"astra-chat-main-menu-drawer__control-option",
		);
		expect(longProfileItemLabel).toHaveClass(
			"astra-chat-main-menu-drawer__control-option-label",
		);
		expect(longProfileItemLabel).toHaveAttribute("title", longProfileLabel);
		await waitFor(() => {
			expect(portalContainer?.contains(content)).toBe(true);
		});

		fireEvent.click(
			within(content).getByRole("option", {
				name: "Compact Mode",
			}),
		);

		expect(onConnectionProfileChange).toHaveBeenCalledWith("profile-short");
	});

	test("disables the connection profile select while a change is in progress", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				controlsBusy={true}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				currentPresetProfileControlsSnapshot={createPresetProfileControlsSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const profileTrigger = await screen.findByRole("combobox", {
			name: "Connection Profile",
		});

		expect(profileTrigger).toBeDisabled();
	});

	test("calls onConnectionProfileChange with a real profile selection while detached", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});
		const onConnectionProfileChange = vi.fn();

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				currentPresetProfileControlsSnapshot={createPresetProfileControlsSnapshot(
					{
						connectionProfiles: {
							authority: "detached",
							detachedReason: "settings-changed",
						},
					},
				)}
				onConnectionProfileChange={onConnectionProfileChange}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const profileTrigger = await screen.findByRole("combobox", {
			name: "Connection Profile",
		});
		profileTrigger.focus();
		fireEvent.keyDown(profileTrigger, {
			code: "ArrowDown",
			key: "ArrowDown",
		});

		const storyModeItem = await screen.findByRole("option", {
			name: "Story Mode",
		});
		fireEvent.click(storyModeItem);

		expect(onConnectionProfileChange).toHaveBeenCalledWith("profile-1");
	});

	test("renders the detail section when only the model row is available", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/22 05:00 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					dominantModel: "gemini-2.5-pro",
					lastUpdatedAt: Date.parse("2026-04-22T09:00:00.000Z"),
					messageCount: 2,
					modelCounts: {
						"openrouter/google/gemini-2.5-pro": 2,
					},
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot({
					chatFileName: "raid-night",
					entityName: "Raid Party",
					groupId: "group-1",
					kind: "group",
					thumbnailUrl: "/thumbs/groups/raid-party.png",
				})}
			/>,
		);

		const groupTitle = await screen.findByText("Raid Party");
		const root = groupTitle.closest(".astra-chat-main-menu-drawer");
		const detailSection = root?.querySelector(
			".astra-chat-main-menu-drawer__detail-section",
		) as HTMLElement | null;
		expect(detailSection).toBeInTheDocument();
		expect(
			within(detailSection as HTMLElement).getByText("Most used model"),
		).toBeInTheDocument();
		expect(screen.queryByText("Last updated")).not.toBeInTheDocument();
	});

	test("renders metadata helper states immediately when details are visible", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		const groupSnapshot = createIdentitySnapshot({
			chatFileName: "raid-night",
			entityName: "Raid Party",
			groupId: "group-1",
			kind: "group",
			thumbnailUrl: "/thumbs/groups/raid-party.png",
		});

		const { rerender } = render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					lastUpdatedAt: null,
					metadataReason: "context-not-ready",
					metadataStatus: "pending",
				})}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={groupSnapshot}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: "More details" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByText("Waiting for SillyTavern chat context"),
		).toBeInTheDocument();
		expect(screen.queryByText("Last updated")).not.toBeInTheDocument();

		rerender(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					metadataReason: "http-error",
					metadataStatus: "stale",
				})}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={groupSnapshot}
			/>,
		);

		expect(
			await screen.findByText(
				"Chat file details may be stale. Retrying in the background.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("Last updated")).not.toBeInTheDocument();

		rerender(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					lastUpdatedAt: null,
					metadataReason: "http-error",
					metadataStatus: "unavailable",
				})}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={groupSnapshot}
			/>,
		);

		expect(
			await screen.findByText(
				"Chat file details are unavailable. They will retry on the next sync.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("Last updated")).not.toBeInTheDocument();

		rerender(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					metadataReason: null,
					metadataStatus: "ready",
				})}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={groupSnapshot}
			/>,
		);

		expect(
			screen.queryByText("Waiting for SillyTavern chat context"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(
				"Chat file details may be stale. Retrying in the background.",
			),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(
				"Chat file details are unavailable. They will retry on the next sync.",
			),
		).not.toBeInTheDocument();
	});

	test("omits last updated from the drawer detail list even when the snapshot has a timestamp", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: (value: unknown) => ({
				format: (pattern: string) =>
					pattern === "YYYY/MM/DD hh:mm A" &&
					value === ST_MERIDIEM_TIMESTAMP_MS
						? "2025/05/04 10:20 PM"
						: "",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					dominantModel: "gemini-2.5-pro",
					lastUpdatedAt: ST_MERIDIEM_TIMESTAMP_MS,
					metadataReason: null,
					metadataStatus: "ready",
				})}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot({
					chatFileName: "上乘握壽司盛合",
					entityName: "Refluscia",
					groupId: "1746368244091",
					kind: "group",
					thumbnailUrl: "/thumbs/groups/refluscia.png",
				})}
			/>,
		);

		expect(screen.queryByText("Last updated")).not.toBeInTheDocument();
		expect(
			screen.queryByText("2025/05/04 10:20 PM"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(
				"Chat file details are unavailable. They will retry on the next sync.",
			),
		).not.toBeInTheDocument();
	});

	test("shows an unavailable helper for invalid metadata instead of silently omitting all timestamp feedback", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					dominantModel: "gemini-2.5-pro",
					lastUpdatedAt: null,
					metadataReason: "invalid-payload",
					metadataStatus: "unavailable",
				})}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot({
					chatFileName: "上乘握壽司盛合",
					entityName: "Refluscia",
					groupId: "1746368244091",
					kind: "group",
					thumbnailUrl: "/thumbs/groups/refluscia.png",
				})}
			/>,
		);

		expect(
			await screen.findByText(
				"Chat file details are unavailable. They will retry on the next sync.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("Last updated")).not.toBeInTheDocument();
		expect(screen.getByText("Most used model")).toBeInTheDocument();
	});

	test("keeps long model values single-line with the full value in the title", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const longModelName =
			"claude-3.7-sonnet-thinking-extended-2026-preview";

		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot({
					dominantModel: longModelName,
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const modelLabel = await screen.findByText("Most used model");
		const modelRow = modelLabel.closest(
			".astra-chat-main-menu-drawer__detail-row",
		);
		expect(modelRow).toBeInTheDocument();
		const modelValue = within(modelRow as HTMLElement).getByText(
			longModelName,
		);
		expect(modelValue).toHaveClass(
			"astra-chat-main-menu-drawer__detail-definition",
		);
		expect(modelValue).toHaveAttribute("title", longModelName);
	});

	test("renders the current API row above most used model and allows the live model name to wrap", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const fetchMock = vi.fn(async () => ({
			ok: true,
			text: async () => `
        <?xml version="1.0"?>
        <!DOCTYPE svg>
        <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="paint">
              <stop offset="0" stop-color="currentColor" />
            </linearGradient>
          </defs>
          <path id="mark" fill="url(#paint)" d="M0 0h10v10H0z" />
        </svg>
      `,
		}));
		const longModelName =
			"claude-3.7-sonnet-thinking-extended-2026-preview-with-extra-routing-context";

		vi.stubGlobal("fetch", fetchMock);
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot({
					apiIconKey: "wrapped-provider",
					modelLabel: longModelName,
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const apiLabel = await screen.findByText("Current API");
		const apiRow = apiLabel.closest(
			".astra-chat-main-menu-drawer__detail-row",
		);
		expect(apiRow).toBeInTheDocument();
		expect(
			within(apiRow as HTMLElement).getByText("OpenRouter / Anthropic"),
		).toBeInTheDocument();
		await waitFor(() => {
			expect(
				apiRow?.querySelector(
					".astra-chat-main-menu-drawer__detail-connection-provider svg",
				),
			).toBeInTheDocument();
		});
		const providerIcon = apiRow?.querySelector(
			".astra-chat-main-menu-drawer__detail-connection-provider .astra-chat-main-menu-drawer__detail-connection-provider-icon",
		);
		expect(fetchMock).toHaveBeenCalledWith("/img/wrapped-provider.svg");
		expect(providerIcon?.tagName).toBe("SPAN");
		expect(providerIcon).toHaveAttribute("aria-hidden", "true");
		expect(providerIcon?.querySelector("img")).not.toBeInTheDocument();
		expect(providerIcon?.querySelector("linearGradient")?.id).toMatch(
			/^astra-provider-icon-/,
		);
		expect(
			providerIcon?.querySelector("path")?.getAttribute("fill"),
		).toMatch(/^url\(#astra-provider-icon-/);
		expect(
			apiRow?.querySelector(
				".astra-chat-main-menu-drawer__detail-connection-provider img.astra-chat-main-menu-drawer__detail-connection-provider-icon",
			),
		).not.toBeInTheDocument();
		expect(
			apiRow?.querySelector(
				".astra-chat-main-menu-drawer__detail-connection-model .astra-chat-main-menu-drawer__detail-connection-provider-icon",
			),
		).not.toBeInTheDocument();
		const liveModelValue = within(apiRow as HTMLElement).getByText(
			longModelName,
		);
		expect(liveModelValue).toHaveClass(
			"astra-chat-main-menu-drawer__detail-connection-model",
		);

		const detailSection = apiRow?.parentElement;
		const detailRows = Array.from(
			detailSection?.querySelectorAll(
				".astra-chat-main-menu-drawer__detail-row",
			) ?? [],
		);
		const apiIndex = detailRows.findIndex((row) =>
			within(row as HTMLElement).queryByText("Current API"),
		);
		const mostUsedModelIndex = detailRows.findIndex((row) =>
			within(row as HTMLElement).queryByText("Most used model"),
		);
		const contextUsageIndex = detailRows.findIndex((row) =>
			within(row as HTMLElement).queryByText("Context Usage"),
		);
		expect(apiIndex).toBeGreaterThan(-1);
		expect(apiIndex).toBeLessThan(mostUsedModelIndex);
		expect(contextUsageIndex).toBe(detailRows.length - 1);
	});

	test("hides the detail section when there are no visible detail rows", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					dominantModel: "",
					hasActiveChat: true,
					lastUpdatedAt: null,
					metadataReason: null,
					metadataStatus: "ready",
					modelCounts: {},
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		expect(
			document.querySelector(
				".astra-chat-main-menu-drawer__detail-section",
			),
		).not.toBeInTheDocument();
	});

	test("keeps the detail section visible without a toggle when only current API is available", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot({
					status: "idle",
					usagePercent: null,
					usedContextTokens: null,
					usedPromptTokens: null,
				})}
				chatInfoSnapshot={createInfoSnapshot({
					dominantModel: "",
					lastUpdatedAt: null,
					metadataReason: null,
					metadataStatus: "ready",
					modelCounts: {},
				})}
				currentConnectionSnapshot={createCurrentConnectionSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const apiLabel = await screen.findByText("Current API");
		const detailSection = apiLabel.closest(
			".astra-chat-main-menu-drawer__detail-section",
		) as HTMLElement | null;

		expect(detailSection).toBeInTheDocument();
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
		expect(screen.queryByText("Most used model")).not.toBeInTheDocument();
		expect(screen.queryByText("Context Usage")).not.toBeInTheDocument();
		expect(
			within(detailSection as HTMLElement).getByText("Current API"),
		).toBeInTheDocument();
	});

	test("wraps each tile button in a stable identified shell", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const userSettingsShell = (
			await screen.findByRole("button", {
				name: "User Settings",
			})
		).closest("#main-menu-user");
		const characterManagementShell = screen
			.getByRole("button", {
				name: "Character Management",
			})
			.closest("#main-menu-characters");

		expect(userSettingsShell).toBeInTheDocument();
		expect(characterManagementShell).toBeInTheDocument();
	});

	test("keeps the tile wrapper id attribute ahead of className in source", () => {
		const source = readFileSync(
			resolve(
				process.cwd(),
				"src/packages/features/chat-session/send-form/main-menu/MobileChatMainMenuDrawer.tsx",
			),
			"utf8",
		);

		expect(source).toMatch(
			/<div\s+id=\{wrapperId\}\s+className="astra-chat-main-menu-drawer__tile-shell"/,
		);
	});

	test("routes chat settings override for character and group chats only", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		const onRequestChatSettingsOverride = vi.fn();
		const props = {
			chatContextUsageSnapshot: createContextUsageSnapshot(),
			chatInfoSnapshot: createInfoSnapshot(),
			currentUserSnapshot: createCurrentUserSnapshot(),
			onOpenChange: vi.fn(),
			onRequestChatSettingsOverride,
			open: true,
			snapshot: createIdentitySnapshot(),
		};
		const { rerender } = render(<MobileChatMainMenuDrawer {...props} />);

		const characterButton = await screen.findByRole("button", {
			name: "Chat settings override",
		});
		expect(characterButton).not.toBeDisabled();

		fireEvent.click(characterButton);
		expect(onRequestChatSettingsOverride).toHaveBeenCalledTimes(1);

		rerender(
			<MobileChatMainMenuDrawer
				{...props}
				snapshot={createIdentitySnapshot({
					avatarSource: "group-custom-avatar",
					characterId: null,
					groupId: "group-1",
					kind: "group",
				})}
			/>,
		);

		const groupButton = await screen.findByRole("button", {
			name: "Chat settings override",
		});
		expect(groupButton).not.toBeDisabled();

		fireEvent.click(groupButton);
		expect(onRequestChatSettingsOverride).toHaveBeenCalledTimes(2);

		rerender(
			<MobileChatMainMenuDrawer
				{...props}
				snapshot={createIdentitySnapshot({
					characterId: null,
					groupId: null,
					hasActiveChat: false,
					kind: "none",
				})}
			/>,
		);

		expect(
			await screen.findByRole("button", {
				name: "Chat settings override",
			}),
		).toBeDisabled();
	});

	test("keeps tile clicks inert and leaves native panel roots untouched", async () => {
		document.body.innerHTML = `
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
        <section id="user-settings-block" class="drawer-content closedDrawer">
          <div class="settings-panel">Profile settings</div>
        </section>
      </div>
    `;

		const tileFixtures = [
			{
				rootId: null,
				title: "AI Settings",
			},
			{
				rootId: "user-settings-block",
				title: "User Settings",
			},
			{
				rootId: "WorldInfo",
				title: "Lorebook",
			},
			{
				rootId: "rm_extensions_block",
				title: "Extensions",
			},
			{
				rootId: "Backgrounds",
				title: "Backgrounds",
			},
			{
				rootId: "right-nav-panel",
				title: "Character Management",
			},
		] as const;

		vi.useFakeTimers();
		const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
		const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

		globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) =>
			setTimeout(
				() => callback(performance.now()),
				0,
			)) as unknown as typeof globalThis.requestAnimationFrame;
		globalThis.cancelAnimationFrame = ((handle: number) =>
			clearTimeout(
				handle as unknown as ReturnType<typeof setTimeout>,
			)) as typeof globalThis.cancelAnimationFrame;

		try {
			ensureAstraProjectaUiInfrastructure({ documentRef: document });
			setSillyTavernContext({
				timestampToMoment: () => ({
					format: () => "2026/04/23 06:30 PM",
				}),
				translate: (text: string) => text,
			});

			const originalParents = new Map(
				tileFixtures
					.filter((fixture) => fixture.rootId !== null)
					.map((fixture) => {
						const root = document.getElementById(
							fixture.rootId as string,
						);

						return [
							fixture.rootId as string,
							root?.parentElement ?? null,
						];
					}),
			);

			render(
				<ControlledMainMenuDrawer
					chatContextUsageSnapshot={createContextUsageSnapshot()}
					chatInfoSnapshot={createInfoSnapshot()}
					snapshot={createIdentitySnapshot()}
				/>,
			);

			for (const fixture of tileFixtures) {
				fireEvent.click(
					screen.getByRole("button", {
						name: fixture.title,
					}),
				);

				await vi.advanceTimersByTimeAsync(1);

				expect(
					screen.queryByRole("dialog", {
						name: fixture.title,
					}),
				).not.toBeInTheDocument();
				expect(
					screen.getByRole("dialog", {
						name: "Chat",
					}),
				).toBeInTheDocument();

				if (fixture.rootId) {
					const sourceNode = document.getElementById(fixture.rootId);

					expect(sourceNode?.parentElement).toBe(
						originalParents.get(fixture.rootId),
					);
					expect(sourceNode).toHaveClass("closedDrawer");
					expect(sourceNode).not.toHaveClass("openDrawer");
				}
			}
		} finally {
			globalThis.requestAnimationFrame = originalRequestAnimationFrame;
			globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
			vi.useRealTimers();
		}
	});

	test("renders the main-menu drawer viewport contract and preserves long chat filenames", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		const longChatFileName =
			"chapter-01-the-archive-of-the-longest-possible-mobile-chat-file-name-that-should-truncate-cleanly-without-pushing-the-drawer-wider-than-its-viewport";

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot({
					chatFileName: longChatFileName,
				})}
			/>,
		);

		const chatFileName = await screen.findByText(longChatFileName);
		expect(chatFileName).toHaveClass(
			"astra-chat-main-menu-drawer__chat-file-name",
		);
		expect(chatFileName).toHaveAttribute("title", longChatFileName);
		expect(
			chatFileName.closest(".astra-chat-main-menu-drawer__name-stack"),
		).toBeInTheDocument();
		expect(
			chatFileName.closest(".astra-chat-main-menu-drawer__header"),
		).toBeInTheDocument();
		expect(
			chatFileName.closest(
				".astra-chat-main-menu-drawer__scrollable-content",
			),
		).toBeNull();
	});

	test("routes delete, categories, and rename actions through their own callbacks only", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		const onRequestDelete = vi.fn();
		const onRequestCategories = vi.fn();
		const onRequestRename = vi.fn();

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				onRequestCategories={onRequestCategories}
				onRequestDelete={onRequestDelete}
				onOpenChange={() => {}}
				onRequestRename={onRequestRename}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Delete chat" }),
		);
		expect(onRequestDelete).toHaveBeenCalledTimes(1);
		expect(onRequestCategories).not.toHaveBeenCalled();
		expect(onRequestRename).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole("button", { name: "Edit categories" }),
		);
		expect(onRequestDelete).toHaveBeenCalledTimes(1);
		expect(onRequestCategories).toHaveBeenCalledTimes(1);
		expect(onRequestRename).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Rename chat" }));
		expect(onRequestDelete).toHaveBeenCalledTimes(1);
		expect(onRequestCategories).toHaveBeenCalledTimes(1);
		expect(onRequestRename).toHaveBeenCalledTimes(1);
	});

	test("uses the provider icon source for the current API row even when the model icon key differs", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const fetchMock = vi.fn(async () => ({
			ok: true,
			text: async () =>
				'<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10H0z" /></svg>',
		}));

		vi.stubGlobal("fetch", fetchMock);
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot({
					apiIconKey: "makersuite",
					apiLabel: "Google AI Studio",
					modelIconKey: "vertexai",
					modelLabel: "gemini-2.5-flash",
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const apiLabel = await screen.findByText("Current API");
		const apiRow = apiLabel.closest(
			".astra-chat-main-menu-drawer__detail-row",
		);

		expect(apiRow).toBeInTheDocument();
		expect(
			within(apiRow as HTMLElement).getByText("Google AI Studio"),
		).toBeInTheDocument();
		expect(
			within(apiRow as HTMLElement).getByText("gemini-2.5-flash"),
		).toBeInTheDocument();
		await waitFor(() => {
			expect(
				apiRow?.querySelector(
					".astra-chat-main-menu-drawer__detail-connection-provider .astra-chat-main-menu-drawer__detail-connection-provider-icon svg",
				),
			).toBeInTheDocument();
		});
		expect(fetchMock).toHaveBeenCalledWith("/img/makersuite.svg");
		expect(
			apiRow?.querySelector(
				".astra-chat-main-menu-drawer__detail-connection-provider img.astra-chat-main-menu-drawer__detail-connection-provider-icon",
			),
		).not.toBeInTheDocument();
	});

	test("prefetches and reuses the provider icon without rendering an image phase across drawer reopens", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const fetchMock = vi.fn(async () => ({
			ok: true,
			text: async () =>
				'<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h10v10H0z" /></svg>',
		}));

		vi.stubGlobal("fetch", fetchMock);
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		const props = {
			chatContextUsageSnapshot: createContextUsageSnapshot(),
			chatInfoSnapshot: createInfoSnapshot(),
			currentConnectionSnapshot: createCurrentConnectionSnapshot({
				apiIconKey: "prefetched-provider",
				apiLabel: "Prefetched Provider",
				modelIconKey: "claude",
				modelLabel: "Claude 3.7 Sonnet",
			}),
			onOpenChange: vi.fn(),
			snapshot: createIdentitySnapshot(),
		};
		const { rerender } = render(
			<MobileChatMainMenuDrawer {...props} open={false} />,
		);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith(
				"/img/prefetched-provider.svg",
			);
		});
		expect(
			document.getElementById("astra-chat-main-menu-drawer"),
		).toBeNull();

		rerender(<MobileChatMainMenuDrawer {...props} open={true} />);

		const apiLabel = await screen.findByText("Current API");
		const apiRow = apiLabel.closest(
			".astra-chat-main-menu-drawer__detail-row",
		) as HTMLElement | null;

		await waitFor(() => {
			expect(
				apiRow?.querySelector(
					".astra-chat-main-menu-drawer__detail-connection-provider .astra-chat-main-menu-drawer__detail-connection-provider-icon svg",
				),
			).toBeInTheDocument();
		});
		expect(
			apiRow?.querySelector(
				".astra-chat-main-menu-drawer__detail-connection-provider img.astra-chat-main-menu-drawer__detail-connection-provider-icon",
			),
		).not.toBeInTheDocument();

		rerender(<MobileChatMainMenuDrawer {...props} open={false} />);
		await waitFor(() => {
			expect(
				document.getElementById("astra-chat-main-menu-drawer"),
			).not.toBeInTheDocument();
		});

		rerender(<MobileChatMainMenuDrawer {...props} open={true} />);

		const reopenedApiLabel = await screen.findByText("Current API");
		const reopenedApiRow = reopenedApiLabel.closest(
			".astra-chat-main-menu-drawer__detail-row",
		) as HTMLElement | null;

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(
			reopenedApiRow?.querySelector(
				".astra-chat-main-menu-drawer__detail-connection-provider .astra-chat-main-menu-drawer__detail-connection-provider-icon svg",
			),
		).toBeInTheDocument();
		expect(
			reopenedApiRow?.querySelector(
				".astra-chat-main-menu-drawer__detail-connection-provider img.astra-chat-main-menu-drawer__detail-connection-provider-icon",
			),
		).not.toBeInTheDocument();
		expect(
			within(reopenedApiRow as HTMLElement).getByText(
				"Prefetched Provider",
			),
		).toBeInTheDocument();
		expect(
			within(reopenedApiRow as HTMLElement).getByText(
				"Claude 3.7 Sonnet",
			),
		).toBeInTheDocument();
	});

	test("hides only the provider icon when the current API icon source fails to load", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const fetchMock = vi.fn(async () => ({
			ok: false,
			text: async () => "",
		}));

		vi.stubGlobal("fetch", fetchMock);
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});

		render(
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={createContextUsageSnapshot()}
				chatInfoSnapshot={createInfoSnapshot()}
				currentConnectionSnapshot={createCurrentConnectionSnapshot({
					apiIconKey: "missing-provider",
					apiLabel: "Missing Provider",
					modelIconKey: "claude",
					modelLabel: "Claude 3.7 Sonnet",
				})}
				onOpenChange={() => {}}
				open={true}
				snapshot={createIdentitySnapshot()}
			/>,
		);

		const apiLabel = await screen.findByText("Current API");
		const apiRow = apiLabel.closest(
			".astra-chat-main-menu-drawer__detail-row",
		) as HTMLElement | null;

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith("/img/missing-provider.svg");
		});
		await waitFor(() => {
			expect(
				apiRow?.querySelector(
					".astra-chat-main-menu-drawer__detail-connection-provider-icon",
				),
			).not.toBeInTheDocument();
		});
		expect(
			within(apiRow as HTMLElement).getByText("Missing Provider"),
		).toBeInTheDocument();
		expect(
			within(apiRow as HTMLElement).getByText("Claude 3.7 Sonnet"),
		).toBeInTheDocument();
	});
});
