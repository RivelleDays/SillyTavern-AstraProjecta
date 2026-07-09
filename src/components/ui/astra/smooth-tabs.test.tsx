import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
import { afterEach, describe, expect, test, vi } from "vitest";

import {
	AstraSmoothTabs,
	type AstraSmoothTabItem,
} from "@/components/ui/astra/smooth-tabs";
import { MessageCircle, Tags } from "@/components/ui/shared/icons";

const SMOOTH_TAB_ITEMS: AstraSmoothTabItem[] = [
	{
		content: (
			<div>
				<button type="button">Open chat</button>
				<span>Chat panel content</span>
			</div>
		),
		icon: MessageCircle,
		label: "Chats",
		value: "chats",
	},
	{
		content: (
			<div>
				<span>No categories yet</span>
				<span data-astra-smooth-tabs-swipe-ignore>
					Ignore swipe area
				</span>
			</div>
		),
		icon: Tags,
		label: "Categories",
		value: "categories",
	},
	{
		content: <div>Disabled panel content</div>,
		disabled: true,
		label: "Disabled",
		value: "disabled",
	},
];

function mockElementSize(element: HTMLElement, width: number, height = 0) {
	Object.defineProperty(element, "offsetWidth", {
		configurable: true,
		value: width,
	});
	Object.defineProperty(element, "scrollHeight", {
		configurable: true,
		value: height,
	});
	element.getBoundingClientRect = vi.fn(() => ({
		bottom: height,
		height,
		left: 0,
		right: width,
		top: 0,
		width,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	}));
}

function installResizeObserverMock() {
	const observedElements: Element[] = [];
	const observerCallbacks: ResizeObserverCallback[] = [];

	class ResizeObserverMock {
		constructor(callback: ResizeObserverCallback) {
			observerCallbacks.push(callback);
		}

		observe = vi.fn((element: Element) => {
			observedElements.push(element);
		});

		disconnect = vi.fn();

		unobserve = vi.fn();
	}

	vi.stubGlobal("ResizeObserver", ResizeObserverMock);

	return {
		get observedElements() {
			return observedElements;
		},
		trigger() {
			for (const callback of observerCallbacks) {
				callback([], {} as ResizeObserver);
			}
		},
	};
}

function mockOffsetBox(element: HTMLElement, left: number, width: number) {
	Object.defineProperty(element, "offsetLeft", {
		configurable: true,
		value: left,
	});
	Object.defineProperty(element, "offsetWidth", {
		configurable: true,
		value: width,
	});
}

function readSmoothTabsCss() {
	return readFileSync(
		resolve(process.cwd(), "src/components/ui/astra/smooth-tabs.css"),
		"utf8",
	);
}

function getCssRule(css: string, selector: string) {
	const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return (
		css.match(
			new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{[^}]*\\}`, "s"),
		)?.[0] ?? ""
	);
}

describe("AstraSmoothTabs", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	test("renders accessible tabs while keeping inactive panels mounted but hidden from accessibility", () => {
		render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="chats"
				onValueChange={vi.fn()}
			/>,
		);

		const tablist = screen.getByRole("tablist", {
			name: "Global sections",
		});
		const chatsTab = within(tablist).getByRole("tab", { name: "Chats" });
		const categoriesTab = within(tablist).getByRole("tab", {
			name: "Categories",
		});
		const disabledTab = within(tablist).getByRole("tab", {
			name: "Disabled",
		});

		expect(chatsTab).toHaveAttribute("data-state", "active");
		expect(categoriesTab).toHaveAttribute("data-state", "inactive");
		expect(disabledTab).toBeDisabled();
		expect(
			chatsTab.querySelector(".lucide-message-circle"),
		).toBeInTheDocument();
		expect(categoriesTab.querySelector(".lucide-tags")).toBeInTheDocument();

		expect(screen.getByRole("tabpanel", { name: "Chats" })).toHaveAttribute(
			"data-state",
			"active",
		);
		expect(
			screen.queryByRole("tabpanel", { name: "Categories" }),
		).not.toBeInTheDocument();

		const inactivePanel = screen
			.getByText("No categories yet")
			.closest(".astra-smooth-tabs__panel");
		expect(inactivePanel).toHaveAttribute("aria-hidden", "true");
		expect(inactivePanel).toHaveAttribute("data-state", "inactive");
		expect(inactivePanel).toHaveAttribute("inert");
	});

	test("defaults to line variant and exposes the segmented variant contract", () => {
		const { container, rerender } = render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="chats"
				onValueChange={vi.fn()}
			/>,
		);
		const root = container.querySelector(
			".astra-smooth-tabs",
		) as HTMLElement;

		expect(root).toHaveAttribute("data-variant", "line");

		rerender(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="chats"
				variant="segmented"
				onValueChange={vi.fn()}
			/>,
		);

		expect(root).toHaveAttribute("data-variant", "segmented");
	});

	test("uses caller-provided panel ids for tab aria controls", () => {
		const items: AstraSmoothTabItem[] = [
			{
				...SMOOTH_TAB_ITEMS[0],
				panelId: "custom-chats-panel",
			},
			{
				...SMOOTH_TAB_ITEMS[1],
				panelId: "custom-categories-panel",
			},
		];

		render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={items}
				value="chats"
				onValueChange={vi.fn()}
			/>,
		);

		const tablist = screen.getByRole("tablist", {
			name: "Global sections",
		});
		const chatsTab = within(tablist).getByRole("tab", { name: "Chats" });

		expect(chatsTab).toHaveAttribute("aria-controls", "custom-chats-panel");
		expect(screen.getByRole("tabpanel", { name: "Chats" })).toHaveAttribute(
			"id",
			"custom-chats-panel",
		);
		expect(
			screen
				.getByText("No categories yet")
				.closest(".astra-smooth-tabs__panel"),
		).toHaveAttribute("id", "custom-categories-panel");
	});

	test("renders an isolated list frame and moves the active underline to the selected trigger", async () => {
		const { rerender } = render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				listFrameAfter={
					<div data-testid="smooth-tabs-after-list">
						After list frame
					</div>
				}
				value="chats"
				onValueChange={vi.fn()}
			/>,
		);
		const tablist = screen.getByRole("tablist", {
			name: "Global sections",
		});
		const listFrame = tablist.closest(".astra-smooth-tabs__list-frame");
		const afterList = screen.getByTestId("smooth-tabs-after-list");
		const chatsTab = within(tablist).getByRole("tab", { name: "Chats" });
		const categoriesTab = within(tablist).getByRole("tab", {
			name: "Categories",
		});
		const indicator = tablist.querySelector(
			".astra-smooth-tabs__indicator",
		) as HTMLElement;

		expect(listFrame).toBeInTheDocument();
		expect(listFrame?.nextElementSibling).toBe(afterList);
		expect(
			tablist.querySelector(".astra-sliding-tabs__indicator"),
		).not.toBeInTheDocument();
		expect(indicator).toBeInTheDocument();

		mockOffsetBox(chatsTab, 48, 52);
		mockOffsetBox(categoriesTab, 132, 80);

		rerender(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="categories"
				onValueChange={vi.fn()}
			/>,
		);

		await waitFor(() => {
			expect(indicator.style.transform).toBe(
				"translate3d(132px, 0, 0) scaleX(80)",
			);
		});
	});

	test("can render the list frame content into a caller-owned frame", async () => {
		function PortalHarness({ value }: { value: "chats" | "categories" }) {
			const [target, setTarget] = React.useState<HTMLDivElement | null>(
				null,
			);
			const [afterTarget, setAfterTarget] =
				React.useState<HTMLDivElement | null>(null);

			return (
				<>
					<div
						className="astra-smooth-tabs__list-frame"
						data-testid="smooth-tabs-list-frame-target"
						ref={setTarget}
					/>
					<div
						data-testid="smooth-tabs-list-frame-after-target"
						ref={setAfterTarget}
					/>
					<AstraSmoothTabs
						ariaLabel="Global sections"
						items={SMOOTH_TAB_ITEMS}
						listFrameAfter={
							<div data-testid="smooth-tabs-after-list">
								After list frame
							</div>
						}
						listFrameAfterPortalTarget={afterTarget}
						listFramePortalTarget={target}
						value={value}
						onValueChange={vi.fn()}
					/>
				</>
			);
		}

		const { container, rerender } = render(<PortalHarness value="chats" />);
		const target = screen.getByTestId("smooth-tabs-list-frame-target");
		const afterTarget = screen.getByTestId(
			"smooth-tabs-list-frame-after-target",
		);
		const tablist = await screen.findByRole("tablist", {
			name: "Global sections",
		});
		const afterList = await screen.findByTestId("smooth-tabs-after-list");
		const chatsTab = within(tablist).getByRole("tab", { name: "Chats" });
		const categoriesTab = within(tablist).getByRole("tab", {
			name: "Categories",
		});
		const indicator = tablist.querySelector(
			".astra-smooth-tabs__indicator",
		) as HTMLElement;

		expect(target).toContainElement(tablist);
		expect(afterTarget).toContainElement(afterList);
		expect(tablist.closest(".astra-smooth-tabs__list-frame")).toBe(target);
		expect(
			container.querySelector(
				".astra-smooth-tabs > .astra-smooth-tabs__list-frame",
			),
		).not.toBeInTheDocument();
		expect(
			container.querySelector(
				".astra-smooth-tabs > [data-testid='smooth-tabs-after-list']",
			),
		).not.toBeInTheDocument();

		mockOffsetBox(chatsTab, 48, 52);
		mockOffsetBox(categoriesTab, 132, 80);

		rerender(<PortalHarness value="categories" />);

		await waitFor(() => {
			expect(indicator.style.transform).toBe(
				"translate3d(132px, 0, 0) scaleX(80)",
			);
		});
	});

	test("keeps portal-rendered indicator motion token self-contained", () => {
		const css = readSmoothTabsCss();
		const indicatorRule = getCssRule(css, ".astra-smooth-tabs__indicator");

		expect(indicatorRule).toContain("--astra-smooth-tabs-motion-ease:");
		expect(indicatorRule).toContain("--motion-ease-emphasized");
		expect(indicatorRule).toContain("--overlay-ease-emphasized");
		expect(indicatorRule).toContain("will-change:");
	});

	test("keeps segmented variant styling selectors addressable", () => {
		const css = readSmoothTabsCss();
		const searchableCss = css.replace(/\s+/gu, " ");

		expect(searchableCss).toContain(
			'.astra-smooth-tabs[data-variant="segmented"] .astra-smooth-tabs__list-frame',
		);
		expect(searchableCss).toContain(
			'.astra-smooth-tabs[data-variant="segmented"] .astra-smooth-tabs__list',
		);
		expect(searchableCss).toContain(
			'.astra-smooth-tabs[data-variant="segmented"] .astra-smooth-tabs__trigger',
		);
		expect(searchableCss).toContain(
			'.astra-smooth-tabs[data-variant="segmented"] .astra-smooth-tabs__trigger[data-state="active"]',
		);
		expect(searchableCss).toContain(
			'.astra-smooth-tabs[data-variant="segmented"] .astra-smooth-tabs__indicator',
		);
	});

	test("calls value changes from enabled tab clicks and ignores disabled tabs", () => {
		const onValueChange = vi.fn();

		render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="chats"
				onValueChange={onValueChange}
			/>,
		);

		const tablist = screen.getByRole("tablist", {
			name: "Global sections",
		});

		fireEvent.click(
			within(tablist).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(within(tablist).getByRole("tab", { name: "Disabled" }));

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("categories");
	});

	test("switches to the next tab from a horizontal touch flick", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="chats"
				onValueChange={onValueChange}
			/>,
		);
		const viewport = container.querySelector(
			".astra-smooth-tabs__viewport",
		) as HTMLElement;
		mockElementSize(viewport, 320);

		fireEvent.touchStart(viewport, {
			touches: [{ clientX: 260, clientY: 40 }],
		});
		fireEvent.touchMove(viewport, {
			cancelable: true,
			touches: [{ clientX: 220, clientY: 44 }],
		});
		fireEvent.touchEnd(viewport);

		expect(onValueChange).toHaveBeenCalledWith("categories");
	});

	test("keeps vertical gestures and interactive targets from switching tabs", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="chats"
				onValueChange={onValueChange}
			/>,
		);
		const viewport = container.querySelector(
			".astra-smooth-tabs__viewport",
		) as HTMLElement;
		mockElementSize(viewport, 320);
		const openChatButton = screen.getByRole("button", {
			name: "Open chat",
		});

		fireEvent.touchStart(viewport, {
			touches: [{ clientX: 260, clientY: 40 }],
		});
		fireEvent.touchMove(viewport, {
			touches: [{ clientX: 254, clientY: 130 }],
		});
		fireEvent.touchEnd(viewport);

		fireEvent.touchStart(openChatButton, {
			touches: [{ clientX: 260, clientY: 40 }],
		});
		fireEvent.touchMove(openChatButton, {
			touches: [{ clientX: 190, clientY: 42 }],
		});
		fireEvent.touchEnd(openChatButton);

		expect(onValueChange).not.toHaveBeenCalled();
	});

	test("allows opted-in interactive targets to start swipe navigation", () => {
		const onValueChange = vi.fn();
		const items: AstraSmoothTabItem[] = [
			{
				content: (
					<button data-astra-smooth-tabs-swipe-allow type="button">
						Swipe from action
					</button>
				),
				label: "Chats",
				value: "chats",
			},
			{
				content: <div>Categories panel content</div>,
				label: "Categories",
				value: "categories",
			},
		];
		const { container } = render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={items}
				value="chats"
				onValueChange={onValueChange}
			/>,
		);
		const viewport = container.querySelector(
			".astra-smooth-tabs__viewport",
		) as HTMLElement;
		mockElementSize(viewport, 320);
		const swipeAllowedButton = screen.getByRole("button", {
			name: "Swipe from action",
		});

		fireEvent.touchStart(swipeAllowedButton, {
			touches: [{ clientX: 260, clientY: 40 }],
		});
		fireEvent.touchMove(swipeAllowedButton, {
			cancelable: true,
			touches: [{ clientX: 190, clientY: 42 }],
		});
		fireEvent.touchEnd(swipeAllowedButton);

		expect(onValueChange).toHaveBeenCalledWith("categories");
	});

	test("keeps swipe-ignored scroll content from switching tabs", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="categories"
				onValueChange={onValueChange}
			/>,
		);
		const viewport = container.querySelector(
			".astra-smooth-tabs__viewport",
		) as HTMLElement;
		mockElementSize(viewport, 320);
		const ignoredScrollContent = screen.getByText("Ignore swipe area");

		fireEvent.touchStart(ignoredScrollContent, {
			touches: [{ clientX: 260, clientY: 40 }],
		});
		fireEvent.touchMove(ignoredScrollContent, {
			cancelable: true,
			touches: [{ clientX: 190, clientY: 42 }],
		});
		fireEvent.touchEnd(ignoredScrollContent);

		expect(onValueChange).not.toHaveBeenCalled();
	});

	test("switches from horizontal wheel input and throttles repeated wheel changes", () => {
		const onValueChange = vi.fn();
		const { container } = render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="chats"
				onValueChange={onValueChange}
			/>,
		);
		const viewport = container.querySelector(
			".astra-smooth-tabs__viewport",
		) as HTMLElement;

		fireEvent.wheel(viewport, { deltaX: 80, deltaY: 4 });
		fireEvent.wheel(viewport, { deltaX: 80, deltaY: 4 });
		fireEvent.wheel(viewport, { deltaX: 0, deltaY: 80 });

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("categories");
	});

	test("syncs the viewport height to the active panel", async () => {
		const resizeObserver = installResizeObserverMock();
		const { container } = render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="chats"
				onValueChange={vi.fn()}
			/>,
		);
		const viewport = container.querySelector(
			".astra-smooth-tabs__viewport",
		) as HTMLElement;
		const activePanel = screen.getByRole("tabpanel", { name: "Chats" });
		mockElementSize(activePanel, 320, 240);

		expect(resizeObserver.observedElements).toContain(activePanel);

		act(() => {
			resizeObserver.trigger();
		});

		await waitFor(() => {
			expect(viewport.style.height).toBe("240px");
		});
	});

	test("keeps fill viewport mode from applying measured inline height", async () => {
		const resizeObserver = installResizeObserverMock();
		const { container } = render(
			<AstraSmoothTabs
				ariaLabel="Global sections"
				items={SMOOTH_TAB_ITEMS}
				value="chats"
				viewportMode="fill"
				onValueChange={vi.fn()}
			/>,
		);
		const root = container.querySelector(
			".astra-smooth-tabs",
		) as HTMLElement;
		const viewport = container.querySelector(
			".astra-smooth-tabs__viewport",
		) as HTMLElement;
		const activePanel = screen.getByRole("tabpanel", { name: "Chats" });
		mockElementSize(activePanel, 320, 240);

		expect(root).toHaveAttribute("data-viewport-mode", "fill");
		expect(resizeObserver.observedElements).not.toContain(activePanel);

		act(() => {
			resizeObserver.trigger();
		});

		await waitFor(() => {
			expect(viewport.style.height).toBe("");
		});
	});
});
