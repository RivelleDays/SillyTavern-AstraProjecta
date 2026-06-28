import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { ChatSessionSettingsDrawer } from "@/packages/features/chat-session-settings/drawer/ChatSessionSettingsDrawer";

beforeEach(() => {
	ensureAstraProjectaUiInfrastructure({ documentRef: document });
});

afterEach(() => {
	cleanup();
});

describe("ChatSessionSettingsDrawer", () => {
	test("renders chat background controls inside the drawer shell", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		render(<ChatSessionSettingsDrawer onOpenChange={vi.fn()} open={true} />);

		expect(
			screen.getByRole("dialog", { name: "Chat Settings" }),
		).toBeInTheDocument();
		expect(
			document.getElementById("astra-chat-session-settings-drawer"),
		).toHaveClass("chat-session-settings-drawer");
		expect(
			document.getElementById("astra-chat-session-settings-drawer-content"),
		).toContainElement(
			document.querySelector(".chat-session-settings__chat-background-tab"),
		);
		expect(screen.getByText("Background Blur")).toBeInTheDocument();
		expect(screen.getByText("Background Opacity")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
		expect(consoleError).not.toHaveBeenCalled();

		consoleError.mockRestore();
	});
});
