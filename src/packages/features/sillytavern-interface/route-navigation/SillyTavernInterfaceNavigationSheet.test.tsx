import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { SillyTavernInterfaceNavigationSheet } from "@/packages/features/sillytavern-interface/route-navigation/SillyTavernInterfaceNavigationSheet";
import { getDefaultSillyTavernInterfacePageNavigationItems } from "@/packages/features/sillytavern-interface/routes/registry";

const DIALOG_TITLE_WARNING =
	"`DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.";

function setSillyTavernContext(context: unknown) {
	Object.defineProperty(window, "SillyTavern", {
		configurable: true,
		value: {
			getContext: () => context,
		},
	});
}

describe("SillyTavernInterfaceNavigationSheet", () => {
	beforeEach(() => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	test("renders a whisper-label menu with a flat item list and no visible title header", () => {
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		render(
			<SillyTavernInterfaceNavigationSheet
				activePageKey="ai-response-configuration"
				items={getDefaultSillyTavernInterfacePageNavigationItems()}
				open={true}
				onOpenChange={vi.fn()}
				onPageSelect={vi.fn()}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "sillyTavernInterface.menu.title::Core Settings",
		});
		const labelledBy = dialog.getAttribute("aria-labelledby");
		const radixTitle = document.getElementById(labelledBy ?? "");
		const stableTitle = document.getElementById(
			"sillytavern-interface-panel-menu-sheet-title",
		);
		const metadata = dialog.querySelector(
			".sillytavern-interface__menu-metadata",
		);
		const menuItems = dialog.querySelectorAll(
			".sillytavern-interface__menu-item",
		);

		expect(dialog).toHaveAttribute(
			"id",
			"sillytavern-interface-panel-menu-sheet",
		);
		expect(labelledBy).toBeTruthy();
		expect(labelledBy).not.toBe(
			"sillytavern-interface-panel-menu-sheet-title",
		);
		expect(radixTitle).toHaveAttribute("data-slot", "sheet-title");
		expect(radixTitle).toHaveTextContent(
			"sillyTavernInterface.menu.title::Core Settings",
		);
		expect(stableTitle).toHaveTextContent(
			"sillyTavernInterface.menu.title::Core Settings",
		);
		expect(
			dialog.querySelector(".sillytavern-interface__menu-sheet-header"),
		).toBeNull();
		expect(
			dialog.querySelector(".sillytavern-interface__menu-group"),
		).toBeNull();
		expect(
			dialog.querySelector(".sillytavern-interface__menu-item--nested"),
		).toBeNull();
		expect(
			screen.queryByRole("heading", { name: /Core Settings/i }),
		).toBeNull();
		expect(
			screen.queryByText(
				"sillyTavernInterface.menu.group.aiSettings::AI Settings",
			),
		).toBeNull();
		expect(metadata).toHaveTextContent(
			"sillyTavernInterface.menu.title::Core Settings",
		);
		expect(metadata?.closest("button")).toBeNull();
		expect(menuItems).toHaveLength(9);
		expect(
			consoleErrorSpy.mock.calls
				.flat()
				.some((message) =>
					String(message).includes(DIALOG_TITLE_WARNING),
				),
		).toBe(false);
	});

	test("does not render the removed external close affordance or extra hint copy", () => {
		render(
			<SillyTavernInterfaceNavigationSheet
				activePageKey="ai-response-configuration"
				items={getDefaultSillyTavernInterfacePageNavigationItems()}
				open={true}
				onOpenChange={vi.fn()}
				onPageSelect={vi.fn()}
			/>,
		);

		expect(
			document.querySelector(
				".sillytavern-interface__menu-sheet-close-affordance",
			),
		).toBeNull();
		expect(
			document.querySelector(
				".sillytavern-interface__menu-sheet-close-button",
			),
		).toBeNull();
		expect(
			document.querySelector(
				".sillytavern-interface__menu-sheet-close-hint",
			),
		).toBeNull();
	});
});

describe("SillyTavernInterfaceNavigationSheet style contract", () => {
	test("keeps legacy menu item selectors in feature CSS", () => {
		const css = readFileSync(
			resolve(
				process.cwd(),
				"src/packages/features/sillytavern-interface/sillytavern-interface.css",
			),
			"utf8",
		).replaceAll('"', "'");
		expect(css).toContain(".sillytavern-interface__menu-item");
		expect(css).toContain(
			".sillytavern-interface__menu-item[data-slot='button'][data-variant='ghost']",
		);
		expect(css).toContain(
			".sillytavern-interface__menu-item[data-slot='button'][data-variant='ghost'][data-active='true']",
		);
	});
});
