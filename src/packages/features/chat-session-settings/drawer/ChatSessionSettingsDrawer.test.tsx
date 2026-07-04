import * as React from "react";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { ChatSessionSettingsDrawer } from "@/packages/features/chat-session-settings/drawer/ChatSessionSettingsDrawer";
import { MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY } from "@/packages/features/chat-session/send-form/contracts/dom";
import { shortcutsToolbarVisibilityStore } from "@/packages/features/chat-session/send-form/shell/shortcutsToolbarVisibilityStore";

function setSillyTavernContext(context: Record<string, unknown>) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function createContext(overrides: Record<string, unknown> = {}) {
	return {
		extensionSettings: {},
		saveSettingsDebounced: vi.fn(),
		...overrides,
	};
}

function readAppearance(context: Record<string, unknown>) {
	return (
		context.extensionSettings as Record<string, Record<string, unknown>>
	).astra_projecta.chatBackgroundAppearance as
		| { blurPx: number; opacityPercent: number }
		| undefined;
}

function readMessageAppearance(context: Record<string, unknown>) {
	return (
		context.extensionSettings as Record<string, Record<string, unknown>>
	).astra_projecta.chatMessageAppearance as
		| { lineHeight: string; showTimeline: boolean; textAlign: string }
		| undefined;
}

function readMessageInteraction(context: Record<string, unknown>) {
	return (
		context.extensionSettings as Record<string, Record<string, unknown>>
	).astra_projecta.chatMessageInteraction as
		| { longPressAction: string }
		| undefined;
}

function setupContextWithAppearance({
	blurPx = 2,
	lineHeight = "md",
	longPressAction = "disabled",
	opacityPercent = 80,
	showTimeline = true,
	textAlign = "start",
}: {
	blurPx?: number;
	lineHeight?: string;
	longPressAction?: string;
	opacityPercent?: number;
	showTimeline?: boolean;
	textAlign?: string;
} = {}) {
	const context = createContext({
		extensionSettings: {
			astra_projecta: {
				chatBackgroundAppearance: {
					blurPx,
					opacityPercent,
					version: 1,
				},
				chatMessageAppearance: {
					lineHeight,
					showTimeline,
					textAlign,
					version: 1,
				},
				chatMessageInteraction: {
					longPressAction,
					version: 1,
				},
			},
		},
	});
	setSillyTavernContext(context);
	return context;
}

function openLongPressActionMenu() {
	fireEvent.pointerDown(
		screen.getByRole("button", { name: "Message text long press" }),
		{
			button: 0,
			ctrlKey: false,
		},
	);
}

beforeEach(() => {
	document.body.removeAttribute("style");
	ensureAstraProjectaUiInfrastructure({ documentRef: document });
});

afterEach(() => {
	cleanup();
	window.localStorage.removeItem(
		MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
	);
	Reflect.deleteProperty(
		globalThis as Record<string, unknown>,
		"SillyTavern",
	);
});

describe("ChatSessionSettingsDrawer", () => {
	test("renders the grouped settings sections, simple title, body, and footer", () => {
		setupContextWithAppearance();
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		const dialog = screen.getByRole("dialog", { name: "Chat Settings" });
		expect(dialog).toHaveAttribute(
			"id",
			"astra-chat-session-settings-drawer",
		);
		expect(dialog).toHaveClass("chat-session-settings-drawer");
		expect(
			dialog.querySelector(
				".chat-session-settings-drawer__header.astra-dialog-header",
			),
		).toBeInTheDocument();
		const heading = dialog.querySelector(
			".chat-session-settings-drawer__heading",
		);
		expect(heading).toHaveTextContent("Chat Settings");
		expect(heading?.querySelector(".astra-dialog-icon")).toBeNull();
		expect(
			document.getElementById("astra-chat-session-settings-drawer-title"),
		).toHaveClass("chat-session-settings-drawer__title");
		expect(
			document.getElementById(
				"astra-chat-session-settings-drawer-description",
			),
		).toHaveClass("chat-session-settings-drawer__description", "sr-only");
		expect(
			document.getElementById(
				"astra-chat-session-settings-drawer-content",
			),
		).toContainElement(
			document.querySelector(
				".chat-session-settings__chat-background-tab",
			),
		);
		const sectionTitles = Array.from(
			dialog.querySelectorAll(".chat-session-settings__section-title"),
		).map((sectionTitle) => sectionTitle.textContent);
		expect(sectionTitles).toEqual([
			"Chat Messages",
			"Message input field",
			"Chat Background",
		]);
		const groupedSections = dialog.querySelectorAll(
			"section.chat-session-settings__section",
		);
		expect(groupedSections).toHaveLength(3);
		groupedSections.forEach((section) => {
			expect(
				section.querySelector(".chat-session-settings__section-card"),
			).toBeInTheDocument();
			expect(
				section.querySelector(".chat-session-settings__section-marker"),
			).toBeNull();
			expect(
				section.querySelector(
					".chat-session-settings__section-marker-icon",
				),
			).toBeNull();
		});
		expect(screen.getByText("Background blur")).toBeInTheDocument();
		expect(screen.getByText("Background opacity")).toBeInTheDocument();
		const chatMessagesSection = screen
			.getByText("Chat Messages")
			.closest("section");
		expect(chatMessagesSection).toBeInTheDocument();
		const timelineToggle = within(
			chatMessagesSection as HTMLElement,
		).getByRole("switch", {
			name: "Show chat timeline",
		});
		const longPressTrigger = within(
			chatMessagesSection as HTMLElement,
		).getByRole("button", {
			name: "Message text long press",
		});
		const chatMessageControls = Array.from(
			(chatMessagesSection as HTMLElement).querySelectorAll(
				".chat-session-settings__dropdown-row, .chat-session-settings__button-row, .chat-session-settings__toggle-row",
			),
		);
		expect(chatMessageControls.at(0)).toContainElement(longPressTrigger);
		expect(longPressTrigger).toHaveClass(
			"chat-session-settings__dropdown-trigger",
		);
		expect(longPressTrigger).toHaveTextContent("Disabled");
		expect(
			longPressTrigger.querySelector(".lucide-ban"),
		).toBeInTheDocument();
		expect(chatMessageControls.at(-1)).toContainElement(timelineToggle);
		expect(timelineToggle).toHaveAttribute("aria-checked", "true");
		expect(timelineToggle).toHaveAttribute(
			"id",
			"astra-chat-session-settings-drawer-timeline-toggle-switch",
		);
		expect(
			document.getElementById(
				"astra-chat-session-settings-drawer-timeline-toggle",
			),
		).toContainElement(timelineToggle);
		const shortcutsToggle = screen.getByRole("switch", {
			name: "Show shortcut toolbar",
		});
		const shortcutsRow = shortcutsToggle.closest<HTMLElement>(
			".chat-session-settings__toggle-row",
		);
		const shortcutsHeader = shortcutsToggle.closest<HTMLElement>(
			".chat-session-settings__toggle-row-header",
		);
		expect(shortcutsHeader).toContainElement(
			screen.getByText("Show shortcut toolbar"),
		);
		expect(shortcutsHeader).toContainElement(shortcutsToggle);
		expect(shortcutsRow).toContainElement(shortcutsHeader);
		expect(shortcutsToggle).not.toHaveAttribute("aria-describedby");
		const footer = dialog.querySelector(".astra-dialog-footer");
		expect(footer).toBeInTheDocument();
		expect(
			within(footer as HTMLElement).getByRole("button", {
				name: "Cancel",
			}),
		).toBeInTheDocument();
		expect(
			within(footer as HTMLElement).getByRole("button", {
				name: "Save",
			}),
		).toBeDisabled();
		expect(
			within(footer as HTMLElement)
				.getByRole("button", { name: "Save" })
				.querySelector("[data-slot='ui-icon']"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Close" }),
		).not.toBeInTheDocument();
		expect(consoleError).not.toHaveBeenCalled();

		consoleError.mockRestore();
	});

	test("previews slider edits immediately but persists only when Save is clicked", () => {
		const context = setupContextWithAppearance();
		render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		const sliders = screen.getAllByRole("slider");
		sliders[0].focus();
		fireEvent.keyDown(sliders[0], { key: "ArrowRight" });

		expect(readAppearance(context)).toEqual(
			expect.objectContaining({ blurPx: 2, opacityPercent: 80 }),
		);
		expect(context.saveSettingsDebounced).not.toHaveBeenCalled();
		expect(
			document.body.style.getPropertyValue("--astra-chat-bg-blur"),
		).toBe("3px");
		expect(
			document.body.style.getPropertyValue("--astra-chat-bg-opacity"),
		).toBe("0.8");

		const saveButton = screen.getByRole("button", { name: "Save" });
		expect(saveButton).toBeEnabled();
		fireEvent.click(saveButton);

		expect(readAppearance(context)).toEqual(
			expect.objectContaining({ blurPx: 3, opacityPercent: 80 }),
		);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
	});

	test("persists the message long press action only when Save is clicked", async () => {
		const context = setupContextWithAppearance();
		render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		openLongPressActionMenu();
		fireEvent.click(
			await screen.findByRole("menuitem", { name: "More actions" }),
		);

		expect(readMessageInteraction(context)).toEqual(
			expect.objectContaining({
				longPressAction: "disabled",
			}),
		);
		expect(context.saveSettingsDebounced).not.toHaveBeenCalled();
		const trigger = screen.getByRole("button", {
			name: "Message text long press",
		});
		expect(trigger).toHaveTextContent("More actions");
		expect(trigger.querySelector(".lucide-route")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(readMessageInteraction(context)).toEqual(
			expect.objectContaining({
				longPressAction: "message-actions",
			}),
		);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
	});

	test("previews message appearance immediately but persists only when Save is clicked", () => {
		const context = setupContextWithAppearance();
		render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		fireEvent.click(screen.getByRole("radio", { name: "Large" }));
		fireEvent.click(screen.getByRole("radio", { name: "Align center" }));
		fireEvent.click(
			screen.getByRole("switch", { name: "Show chat timeline" }),
		);

		expect(readMessageAppearance(context)).toEqual(
			expect.objectContaining({
				lineHeight: "md",
				showTimeline: true,
				textAlign: "start",
			}),
		);
		expect(context.saveSettingsDebounced).not.toHaveBeenCalled();
		expect(
			document.body.style.getPropertyValue("--astra-mes-line-height"),
		).toBe("calc(var(--mainFontSize) + 0.8rem)");
		expect(
			document.body.style.getPropertyValue("--astra-mes-text-align"),
		).toBe("center");
		expect(document.body.classList).toContain(
			"astra-projecta-chat-timeline-hidden",
		);

		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(readMessageAppearance(context)).toEqual(
			expect.objectContaining({
				lineHeight: "lg",
				showTimeline: false,
				textAlign: "center",
			}),
		);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
	});

	test("Cancel discards draft edits and reopening reflects persisted settings", () => {
		const context = setupContextWithAppearance({
			blurPx: 1,
			longPressAction: "edit-message",
			opacityPercent: 60,
		});
		const { rerender } = render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		const sliders = screen.getAllByRole("slider");
		sliders[0].focus();
		fireEvent.keyDown(sliders[0], { key: "ArrowRight" });
		openLongPressActionMenu();
		fireEvent.click(screen.getByRole("menuitem", { name: "More actions" }));
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(readAppearance(context)).toEqual(
			expect.objectContaining({ blurPx: 1, opacityPercent: 60 }),
		);
		expect(readMessageInteraction(context)).toEqual(
			expect.objectContaining({ longPressAction: "edit-message" }),
		);
		expect(context.saveSettingsDebounced).not.toHaveBeenCalled();
		expect(
			document.body.style.getPropertyValue("--astra-chat-bg-blur"),
		).toBe("1px");
		expect(
			document.body.style.getPropertyValue("--astra-chat-bg-opacity"),
		).toBe("0.6");

		rerender(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={false} />,
		);
		rerender(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		const textboxes = screen.getAllByRole("textbox");
		expect(textboxes[0]).toHaveValue("1");
		expect(textboxes[1]).toHaveValue("60");
		expect(
			screen.getByRole("button", { name: "Message text long press" }),
		).toHaveTextContent("Edit message");
	});

	test("closing without Save restores the persisted preview", () => {
		const context = setupContextWithAppearance({
			blurPx: 1,
			lineHeight: "sm",
			longPressAction: "edit-message",
			opacityPercent: 60,
			showTimeline: true,
			textAlign: "end",
		});
		const { rerender } = render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		const sliders = screen.getAllByRole("slider");
		sliders[0].focus();
		fireEvent.keyDown(sliders[0], { key: "ArrowRight" });
		fireEvent.click(screen.getByRole("radio", { name: "Large" }));
		fireEvent.click(screen.getByRole("radio", { name: "Align center" }));
		fireEvent.click(
			screen.getByRole("switch", { name: "Show chat timeline" }),
		);
		openLongPressActionMenu();
		fireEvent.click(screen.getByRole("menuitem", { name: "More actions" }));

		rerender(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={false} />,
		);

		expect(readAppearance(context)).toEqual(
			expect.objectContaining({ blurPx: 1, opacityPercent: 60 }),
		);
		expect(readMessageAppearance(context)).toEqual(
			expect.objectContaining({
				lineHeight: "sm",
				showTimeline: true,
				textAlign: "end",
			}),
		);
		expect(readMessageInteraction(context)).toEqual(
			expect.objectContaining({
				longPressAction: "edit-message",
			}),
		);
		expect(context.saveSettingsDebounced).not.toHaveBeenCalled();
		expect(
			document.body.style.getPropertyValue("--astra-chat-bg-blur"),
		).toBe("1px");
		expect(
			document.body.style.getPropertyValue("--astra-mes-line-height"),
		).toBe("calc(var(--mainFontSize) + 0.4rem)");
		expect(
			document.body.style.getPropertyValue("--astra-mes-text-align"),
		).toBe("end");
		expect(document.body.classList).not.toContain(
			"astra-projecta-chat-timeline-hidden",
		);
	});

	test("previews the shortcuts toggle live but persists only when Save is clicked", () => {
		setupContextWithAppearance();
		render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		const toggle = screen.getByRole("switch", {
			name: "Show shortcut toolbar",
		});
		expect(toggle).toHaveAttribute("aria-checked", "true");

		fireEvent.click(toggle);

		expect(toggle).toHaveAttribute("aria-checked", "false");
		// Live preview drives the send-form toolbar without persisting yet.
		expect(shortcutsToolbarVisibilityStore.getSnapshot()).toBe(false);
		expect(
			window.localStorage.getItem(
				MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
			),
		).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(
			window.localStorage.getItem(
				MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
			),
		).toBe("false");
		expect(shortcutsToolbarVisibilityStore.getPersisted()).toBe(false);
	});

	test("reverts the shortcuts toggle preview when closing without Save", () => {
		setupContextWithAppearance();
		const { rerender } = render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		fireEvent.click(
			screen.getByRole("switch", {
				name: "Show shortcut toolbar",
			}),
		);
		expect(shortcutsToolbarVisibilityStore.getSnapshot()).toBe(false);

		rerender(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={false} />,
		);

		// Preview reverts to the persisted default and nothing is written.
		expect(shortcutsToolbarVisibilityStore.getSnapshot()).toBe(true);
		expect(
			window.localStorage.getItem(
				MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
			),
		).toBeNull();
	});
});
