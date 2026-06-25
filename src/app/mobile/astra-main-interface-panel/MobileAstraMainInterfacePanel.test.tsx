import * as React from "react";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import {
	ASTRA_MAIN_INTERFACE_PANEL_CONTENT_ID,
	ASTRA_MAIN_INTERFACE_PANEL_ID,
	ASTRA_MAIN_INTERFACE_TITLE_ID,
	MobileAstraMainInterfacePanel,
} from "@/app/mobile/astra-main-interface-panel";

describe("MobileAstraMainInterfacePanel", () => {
	beforeEach(() => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
	});

	afterEach(() => {
		cleanup();
	});

	test("renders the left-side mobile main interface shell with stable ids", async () => {
		const onOpenChange = vi.fn();

		render(
			<MobileAstraMainInterfacePanel
				bodyStart={
					<div data-testid="astra-main-interface-body-start">
						Body start
					</div>
				}
				headerContent={
					<div data-testid="astra-main-interface-header-content">
						Header controls
					</div>
				}
				open={true}
				onOpenChange={onOpenChange}
			>
				<div>Future main interface content</div>
			</MobileAstraMainInterfacePanel>,
		);

		const panel = await screen.findByRole("dialog", { name: "Main UI" });

		expect(panel).toHaveAttribute(
			"id",
			ASTRA_MAIN_INTERFACE_PANEL_ID,
		);
		expect(panel).toHaveAttribute("data-side", "left");
		expect(panel).toHaveClass("astra-main-interface-panel");
		expect(
			document.getElementById(ASTRA_MAIN_INTERFACE_TITLE_ID),
		).toHaveTextContent("Main UI");
		expect(
			document.getElementById(ASTRA_MAIN_INTERFACE_PANEL_CONTENT_ID),
		).toHaveTextContent("Future main interface content");
		expect(
			panel.querySelector(".astra-main-interface-panel__header"),
		).toBeInTheDocument();
		const headerBar = panel.querySelector(
			".astra-main-interface-panel__header-bar",
		);
		expect(headerBar).toBeInTheDocument();
		expect(headerBar).toContainElement(
			panel.querySelector(".astra-main-interface-panel__header-main"),
		);
		expect(headerBar).toContainElement(
			panel.querySelector(".astra-main-interface-panel__header-end"),
		);
		expect(
			panel.querySelector(".astra-main-interface-panel__header"),
		).toContainElement(
			screen.getByTestId("astra-main-interface-header-content"),
		);
		expect(headerBar).not.toContainElement(
			screen.getByTestId("astra-main-interface-header-content"),
		);
		expect(
			panel.querySelector(".astra-main-interface-panel__body"),
		).toBeInTheDocument();
		expect(
			panel.querySelector(".astra-main-interface-panel__scroll-area"),
		).toHaveAttribute("data-astra-scroll-affordance", "surface");
		expect(
			panel.querySelector(".astra-main-interface-panel__content"),
		).toHaveAttribute("id", ASTRA_MAIN_INTERFACE_PANEL_CONTENT_ID);
		expect(
			panel.querySelector(".astra-main-interface-panel__body")
				?.firstElementChild,
		).toBe(screen.getByTestId("astra-main-interface-body-start"));
		expect(
			document.getElementById(ASTRA_MAIN_INTERFACE_PANEL_CONTENT_ID),
		).not.toContainElement(
			screen.getByTestId("astra-main-interface-body-start"),
		);
		expect(
			panel.querySelector(".astra-mobile-page-panel__body-header"),
		).toBeNull();

		const closeButton = screen.getByRole("button", { name: "Back" });
		expect(
			panel.querySelector(".astra-main-interface-panel__header-end"),
		).toContainElement(closeButton);
		expect(
			document.getElementById(
				"astra-main-interface-close-button-wrapper",
			),
		).toContainElement(closeButton);
		expect(closeButton.querySelector('[data-slot="ui-icon"]')).toHaveClass(
			"lucide-chevrons-right",
		);

		fireEvent.click(closeButton);

		await waitFor(() => {
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	test("uses headerTitle for visible title without changing the dialog name", async () => {
		const onOpenChange = vi.fn();

		render(
			<MobileAstraMainInterfacePanel
				headerTitle="SillyTavern"
				open={true}
				onOpenChange={onOpenChange}
			>
				<div>Future main interface content</div>
			</MobileAstraMainInterfacePanel>,
		);

		const panel = await screen.findByRole("dialog", { name: "Main UI" });

		expect(panel).toBeInTheDocument();
		expect(
			document.getElementById(ASTRA_MAIN_INTERFACE_TITLE_ID),
		).toHaveTextContent("SillyTavern");
	});

	test("preserves the viewport scroll position when closed and reopened", async () => {
		function PanelHarness() {
			const [open, setOpen] = React.useState(true);

			return (
				<>
					<button type="button" onClick={() => setOpen(true)}>
						Open main interface
					</button>
					<MobileAstraMainInterfacePanel
						open={open}
						onOpenChange={setOpen}
					>
						<div style={{ height: "2400px" }}>
							Scrollable content
						</div>
					</MobileAstraMainInterfacePanel>
				</>
			);
		}

		render(<PanelHarness />);

		const panel = await screen.findByRole("dialog", { name: "Main UI" });
		const viewport = panel.querySelector<HTMLElement>(
			".astra-main-interface-panel__viewport",
		);
		expect(viewport).not.toBeNull();

		viewport!.scrollTop = 128;
		fireEvent.scroll(viewport!);
		fireEvent.click(screen.getByRole("button", { name: "Back" }));

		await waitFor(() => {
			expect(
				document.getElementById(ASTRA_MAIN_INTERFACE_PANEL_ID),
			).toHaveAttribute("data-state", "closed");
			expect(
				document.getElementById(ASTRA_MAIN_INTERFACE_PANEL_ID),
			).toHaveAttribute("inert");
		});
		expect(
			document.getElementById(ASTRA_MAIN_INTERFACE_PANEL_ID),
		).not.toHaveAttribute("aria-hidden");

		fireEvent.click(
			screen.getByRole("button", { name: "Open main interface" }),
		);

		const reopenedPanel = await screen.findByRole("dialog", {
			name: "Main UI",
		});
		const reopenedViewport = reopenedPanel.querySelector<HTMLElement>(
			".astra-main-interface-panel__viewport",
		);

		expect(reopenedViewport).toBe(viewport);
		expect(reopenedViewport?.scrollTop).toBe(128);
	});

	test("supports child-owned scrolling while preserving body-start order", async () => {
		const onOpenChange = vi.fn();

		render(
			<MobileAstraMainInterfacePanel
				bodyStart={
					<div data-testid="astra-main-interface-body-start">
						Body start
					</div>
				}
				contentScrollMode="children"
				open={true}
				onOpenChange={onOpenChange}
			>
				<div data-testid="astra-main-interface-child-scroll">
					Child scroll owner
				</div>
			</MobileAstraMainInterfacePanel>,
		);

		const panel = await screen.findByRole("dialog", { name: "Main UI" });
		const body = panel.querySelector(".astra-main-interface-panel__body");
		const content = document.getElementById(
			ASTRA_MAIN_INTERFACE_PANEL_CONTENT_ID,
		);

		expect(
			panel.querySelector(".astra-main-interface-panel__scroll-area"),
		).not.toBeInTheDocument();
		expect(content).toHaveClass("astra-main-interface-panel__content");
		expect(content).toContainElement(
			screen.getByTestId("astra-main-interface-child-scroll"),
		);
		expect(body?.firstElementChild).toBe(
			screen.getByTestId("astra-main-interface-body-start"),
		);
		expect(body?.lastElementChild).toBe(content);
		expect(content).not.toContainElement(
			screen.getByTestId("astra-main-interface-body-start"),
		);
	});
});
