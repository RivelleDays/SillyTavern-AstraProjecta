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

function setupContextWithAppearance({
	blurPx = 2,
	opacityPercent = 80,
}: {
	blurPx?: number;
	opacityPercent?: number;
} = {}) {
	const context = createContext({
		extensionSettings: {
			astra_projecta: {
				chatBackgroundAppearance: { blurPx, opacityPercent, version: 1 },
			},
		},
	});
	setSillyTavernContext(context);
	return context;
}

beforeEach(() => {
	ensureAstraProjectaUiInfrastructure({ documentRef: document });
});

afterEach(() => {
	cleanup();
	Reflect.deleteProperty(
		globalThis as Record<string, unknown>,
		"SillyTavern",
	);
});

describe("ChatSessionSettingsDrawer", () => {
	test("renders the Astra dialog-style header, body, and footer", () => {
		setupContextWithAppearance();
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		render(<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />);

		const dialog = screen.getByRole("dialog", { name: "Chat Settings" });
		expect(dialog).toHaveAttribute("id", "astra-chat-session-settings-drawer");
		expect(dialog).toHaveClass("chat-session-settings-drawer");
		expect(
			dialog.querySelector(
				".chat-session-settings-drawer__header.astra-dialog-header",
			),
		).toBeInTheDocument();
		expect(dialog.querySelector(".astra-dialog-heading")).toBeInTheDocument();
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
			document.getElementById("astra-chat-session-settings-drawer-content"),
		).toContainElement(
			document.querySelector(".chat-session-settings__chat-background-tab"),
		);
		expect(screen.getByText("Background Blur")).toBeInTheDocument();
		expect(screen.getByText("Background Opacity")).toBeInTheDocument();
		const footer = dialog.querySelector(".astra-dialog-footer");
		expect(footer).toBeInTheDocument();
		expect(
			within(footer as HTMLElement).getByRole("button", { name: "Cancel" }),
		).toBeInTheDocument();
		expect(
			within(footer as HTMLElement).getByRole("button", {
				name: "Save changes",
			}),
		).toBeDisabled();
		expect(
			within(footer as HTMLElement)
				.getByRole("button", { name: "Save changes" })
				.querySelector("[data-slot='ui-icon']"),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
		expect(consoleError).not.toHaveBeenCalled();

		consoleError.mockRestore();
	});

	test("keeps slider edits local until Save changes is clicked", () => {
		const context = setupContextWithAppearance();
		render(<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />);

		const sliders = screen.getAllByRole("slider");
		sliders[0].focus();
		fireEvent.keyDown(sliders[0], { key: "ArrowRight" });

		expect(readAppearance(context)).toEqual(
			expect.objectContaining({ blurPx: 2, opacityPercent: 80 }),
		);
		expect(context.saveSettingsDebounced).not.toHaveBeenCalled();

		const saveButton = screen.getByRole("button", { name: "Save changes" });
		expect(saveButton).toBeEnabled();
		fireEvent.click(saveButton);

		expect(readAppearance(context)).toEqual(
			expect.objectContaining({ blurPx: 3, opacityPercent: 80 }),
		);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
	});

	test("Cancel discards draft edits and reopening reflects persisted settings", () => {
		const context = setupContextWithAppearance({ blurPx: 1, opacityPercent: 60 });
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

		rerender(<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={false} />);
		rerender(<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />);

		const textboxes = screen.getAllByRole("textbox");
		expect(textboxes[0]).toHaveValue("1");
		expect(textboxes[1]).toHaveValue("60");
	});
});
