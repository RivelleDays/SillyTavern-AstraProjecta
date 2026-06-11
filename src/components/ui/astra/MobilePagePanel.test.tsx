import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { MobilePagePanel } from "@/components/ui/astra/MobilePagePanel";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";

const DIALOG_TITLE_WARNING =
	"`DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.";

function normalizeStyleSource(source: string): string {
	return source
		.replaceAll('"', "'")
		.replace(/\(\s+/g, "(")
		.replace(/\s+\)/g, ")")
		.replace(/\s+/g, " ")
		.trim();
}

describe("MobilePagePanel", () => {
	beforeEach(() => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	test("renders a low-level mobile page primitive in the Astra portal container", () => {
		const onOpenChange = vi.fn();
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		render(
			<MobilePagePanel
				accessibleTitle="Page panel"
				id="page-panel"
				open={true}
				onOpenChange={onOpenChange}
			>
				<div id="page-panel-content">Panel body</div>
			</MobilePagePanel>,
		);

		const dialog = screen.getByRole("dialog", { name: "Page panel" });
		const labelledBy = dialog.getAttribute("aria-labelledby");
		const radixTitle = document.getElementById(labelledBy ?? "");
		const accessibleTitle = document.getElementById(
			"page-panel-accessible-title",
		);
		const portalContainer = document.getElementById(
			"astra-projecta-ui-portals",
		);

		expect(labelledBy).toBeTruthy();
		expect(labelledBy).not.toBe("page-panel-accessible-title");
		expect(radixTitle).toHaveTextContent("Page panel");
		expect(accessibleTitle).toHaveAttribute(
			"id",
			"page-panel-accessible-title",
		);
		expect(accessibleTitle).toHaveTextContent("Page panel");
		expect(accessibleTitle?.id).not.toMatch(/^radix-/);
		expect(dialog).toHaveClass("astra-mobile-page-panel");
		expect(dialog).toHaveAttribute("data-side", "right");
		expect(dialog).toHaveAttribute(
			"data-astra-component",
			"MobilePagePanel",
		);
		expect(portalContainer?.contains(dialog)).toBe(true);
		expect(dialog).toContainElement(
			document.getElementById("page-panel-content"),
		);
		expect(
			dialog.querySelector(".astra-mobile-page-panel__header"),
		).toBeNull();
		expect(
			dialog.querySelector(".astra-mobile-page-panel__body-header"),
		).toBeNull();
		expect(
			dialog.querySelector(".astra-mobile-page-panel__subheader"),
		).toBeNull();
		expect(
			document.querySelector('[data-slot="dialog-overlay"]'),
		).toBeNull();
		expect(
			consoleErrorSpy.mock.calls
				.flat()
				.some((message) =>
					String(message).includes(DIALOG_TITLE_WARNING),
				),
		).toBe(false);
	});

	test("keeps a force-mounted closed panel inert without hiding focused descendants from assistive tech", () => {
		render(
			<MobilePagePanel
				accessibleTitle="Closed panel"
				forceMount={true}
				id="closed-page-panel"
				open={false}
				onOpenChange={vi.fn()}
			>
				<button type="button">Closed action</button>
			</MobilePagePanel>,
		);

		const dialog = document.getElementById("closed-page-panel");

		expect(dialog).toHaveAttribute("inert");
		expect(dialog).not.toHaveAttribute("aria-hidden");
	});

	test("respects side while refusing outside-click and Escape dismissal", () => {
		const onOpenChange = vi.fn();

		render(
			<MobilePagePanel
				accessibleTitle="Left panel"
				open={true}
				side="left"
				onOpenChange={onOpenChange}
			>
				<div>Panel body</div>
			</MobilePagePanel>,
		);

		const dialog = screen.getByRole("dialog", { name: "Left panel" });

		expect(dialog).toHaveAttribute("data-side", "left");

		fireEvent.keyDown(dialog, { key: "Escape" });
		fireEvent.pointerDown(document.body);
		fireEvent.mouseDown(document.body);
		fireEvent.click(document.body);

		expect(onOpenChange).not.toHaveBeenCalled();
	});

	test("renders custom children without imposing scroll or footer structure", () => {
		render(
			<MobilePagePanel
				accessibleTitle="Custom panel"
				className="custom-panel"
				open={true}
				onOpenChange={vi.fn()}
			>
				<div className="custom-panel__shell">
					<button type="button">Custom close</button>
					<main>Custom content</main>
				</div>
			</MobilePagePanel>,
		);

		const dialog = screen.getByRole("dialog", { name: "Custom panel" });

		expect(dialog).toHaveClass("custom-panel");
		expect(
			dialog.querySelector(".custom-panel__shell"),
		).toBeInTheDocument();
		expect(
			dialog.querySelector(".astra-mobile-page-panel__scroll-area"),
		).toBeNull();
		expect(
			dialog.querySelector(".astra-mobile-page-panel__body-header-end"),
		).toBeNull();
	});
});

describe("MobilePagePanel source contract", () => {
	test("keeps app-style primitive behavior in the wrapper without feature layout slots", () => {
		const source = readFileSync(
			resolve(
				process.cwd(),
				"src/components/ui/astra/MobilePagePanel.tsx",
			),
			"utf8",
		);
		const css = readFileSync(
			resolve(process.cwd(), "src/styles/shadcn-overrides.css"),
			"utf8",
		);

		expect(source).toContain("modal={false}");
		expect(source).toContain("onEscapeKeyDown");
		expect(source).toContain("onInteractOutside");
		expect(source).toContain("onPointerDownOutside");
		expect(source).toContain("<DialogPrimitive.Title asChild={true}>");
		expect(source).toContain("accessibleTitle");
		expect(source).not.toContain("closeButtonId");
		expect(source).not.toContain("bodyHeader");
		expect(source).not.toContain("bodyHeaderAccessory");
		expect(source).not.toContain("bodyHeaderCenter");
		expect(source).not.toContain("bodyOverlay");
		expect(source).not.toContain("subheader");
		expect(source).not.toContain("contentId");
		expect(source).not.toContain("viewportRef");
		expect(source).not.toContain("onViewportScroll");
		expect(css).toContain(".astra-mobile-page-panel");
		expect(css).not.toContain(".astra-mobile-page-panel__header");
		expect(css).not.toContain(".astra-mobile-page-panel__body-header");
		expect(css).not.toContain(
			".astra-mobile-page-panel__body-header-accessory",
		);
		expect(css).not.toContain(".astra-mobile-page-panel__body-overlay");
		expect(normalizeStyleSource(css)).toContain(
			normalizeStyleSource(
				"body.astra-projecta-mobile-layout[data-astra-projecta-native-popup-active='true'] .astra-mobile-page-panel",
			),
		);
		expect(css).not.toContain(
			"body.astra-projecta-mobile-layout:has(dialog.popup",
		);
	});
});
