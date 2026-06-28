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
		| { lineHeight: string; textAlign: string }
		| undefined;
}

function setupContextWithAppearance({
	blurPx = 2,
	lineHeight = "md",
	opacityPercent = 80,
	textAlign = "start",
}: {
	blurPx?: number;
	lineHeight?: string;
	opacityPercent?: number;
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
					textAlign,
					version: 1,
				},
			},
		},
	});
	setSillyTavernContext(context);
	return context;
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
	test("renders the Astra dialog-style header, body, and footer", () => {
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
		expect(
			dialog.querySelector(".astra-dialog-heading"),
		).toBeInTheDocument();
		expect(
			dialog.querySelector(".astra-dialog-icon [data-slot='ui-icon']"),
		).toBeInTheDocument();
		expect(
			document.getElementById("astra-chat-session-settings-drawer-title"),
		).toHaveClass("astra-dialog-title");
		expect(
			document.getElementById(
				"astra-chat-session-settings-drawer-description",
			),
		).toHaveClass("astra-dialog-description", "sr-only");
		expect(
			document.getElementById(
				"astra-chat-session-settings-drawer-content",
			),
		).toContainElement(
			document.querySelector(
				".chat-session-settings__chat-background-tab",
			),
		);
		expect(screen.getByText("Background blur")).toBeInTheDocument();
		expect(screen.getByText("Background opacity")).toBeInTheDocument();
		const chatMessagesMarker = screen
			.getByText("Chat Messages")
			.closest(".chat-session-settings__section-marker");
		expect(
			chatMessagesMarker?.querySelector(
				".chat-session-settings__section-marker-icon .lucide-message-circle-more",
			),
		).toBeInTheDocument();
		const chatBackgroundMarker = screen
			.getByText("Chat Background")
			.closest(".chat-session-settings__section-marker");
		expect(
			chatBackgroundMarker?.querySelector(
				".chat-session-settings__section-marker-icon .lucide-image",
			),
		).toBeInTheDocument();
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

	test("previews message appearance immediately but persists only when Save is clicked", () => {
		const context = setupContextWithAppearance();
		render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		fireEvent.click(screen.getByRole("radio", { name: "Large" }));
		fireEvent.click(screen.getByRole("radio", { name: "Align center" }));

		expect(readMessageAppearance(context)).toEqual(
			expect.objectContaining({ lineHeight: "md", textAlign: "start" }),
		);
		expect(context.saveSettingsDebounced).not.toHaveBeenCalled();
		expect(
			document.body.style.getPropertyValue("--astra-mes-line-height"),
		).toBe("calc(var(--mainFontSize) + 0.8rem)");
		expect(
			document.body.style.getPropertyValue("--astra-mes-text-align"),
		).toBe("center");

		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(readMessageAppearance(context)).toEqual(
			expect.objectContaining({ lineHeight: "lg", textAlign: "center" }),
		);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
	});

	test("Cancel discards draft edits and reopening reflects persisted settings", () => {
		const context = setupContextWithAppearance({
			blurPx: 1,
			opacityPercent: 60,
		});
		const { rerender } = render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		const sliders = screen.getAllByRole("slider");
		sliders[0].focus();
		fireEvent.keyDown(sliders[0], { key: "ArrowRight" });
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(readAppearance(context)).toEqual(
			expect.objectContaining({ blurPx: 1, opacityPercent: 60 }),
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
	});

	test("closing without Save restores the persisted preview", () => {
		const context = setupContextWithAppearance({
			blurPx: 1,
			lineHeight: "sm",
			opacityPercent: 60,
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

		rerender(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={false} />,
		);

		expect(readAppearance(context)).toEqual(
			expect.objectContaining({ blurPx: 1, opacityPercent: 60 }),
		);
		expect(readMessageAppearance(context)).toEqual(
			expect.objectContaining({ lineHeight: "sm", textAlign: "end" }),
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
	});

	test("previews the shortcuts toggle live but persists only when Save is clicked", () => {
		setupContextWithAppearance();
		render(
			<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />,
		);

		const toggle = screen.getByRole("switch", {
			name: "Show chat shortcuts",
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
			screen.getByRole("switch", { name: "Show chat shortcuts" }),
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
