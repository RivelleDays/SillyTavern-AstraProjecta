import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
	act,
} from "@testing-library/react";
import {
	afterEach,
	describe,
	expect,
	test,
	vi,
	type MockInstance,
} from "vitest";

import { Plug2, SlidersHorizontal, Type } from "@/components/ui/shared/icons";
import { AstraSlidingTabs } from "@/components/ui/shared/sliding-tabs";

const TAB_ITEMS = [
	{
		icon: SlidersHorizontal,
		label: "Config",
		value: "config",
	},
	{
		icon: Plug2,
		label: "API",
		value: "api",
	},
	{
		disabled: true,
		icon: Type,
		label: "Advanced",
		value: "advanced",
	},
];

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

function installAnimationFrameQueue() {
	let nextFrameId = 1;
	const frameCallbacks = new Map<number, FrameRequestCallback>();

	vi.stubGlobal(
		"requestAnimationFrame",
		vi.fn((callback: FrameRequestCallback) => {
			const frameId = nextFrameId;
			nextFrameId += 1;
			frameCallbacks.set(frameId, callback);

			return frameId;
		}),
	);
	vi.stubGlobal(
		"cancelAnimationFrame",
		vi.fn((frameId: number) => {
			frameCallbacks.delete(frameId);
		}),
	);

	return {
		flushAll() {
			const callbacks = Array.from(frameCallbacks.entries());
			frameCallbacks.clear();

			for (const [, callback] of callbacks) {
				callback(0);
			}
		},
	};
}

function installResizeObserverMock() {
	const observedElements: Element[] = [];
	let observerCallback: ResizeObserverCallback | null = null;

	class ResizeObserverMock {
		constructor(callback: ResizeObserverCallback) {
			observerCallback = callback;
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
			observerCallback?.([], {} as ResizeObserver);
		},
	};
}

describe("AstraSlidingTabs", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	test("renders accessible tabs, calls selection changes, and ignores disabled tabs", () => {
		const onValueChange = vi.fn();

		render(
			<AstraSlidingTabs
				ariaLabel="Settings sections"
				items={TAB_ITEMS}
				value="config"
				onValueChange={onValueChange}
			/>,
		);

		const tablist = screen.getByRole("tablist", {
			name: "Settings sections",
		});
		const configTab = within(tablist).getByRole("tab", { name: "Config" });
		const apiTab = within(tablist).getByRole("tab", { name: "API" });
		const advancedTab = within(tablist).getByRole("tab", {
			name: "Advanced",
		});

		expect(configTab).toHaveAttribute("data-state", "active");
		expect(
			configTab.querySelector(".lucide-sliders-horizontal"),
		).toBeInTheDocument();
		expect(apiTab.querySelector(".lucide-plug-2")).toBeInTheDocument();
		expect(advancedTab.querySelector(".lucide-type")).toBeInTheDocument();
		expect(
			tablist.querySelectorAll(".astra-sliding-tabs__indicator"),
		).toHaveLength(1);

		fireEvent.mouseDown(apiTab, { button: 0, ctrlKey: false });
		fireEvent.mouseDown(advancedTab, { button: 0, ctrlKey: false });

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenCalledWith("api");
	});

	test("moves the same indicator to controlled active tab bounds before the next animation frame", () => {
		installAnimationFrameQueue();
		const requestAnimationFrameMock =
			globalThis.requestAnimationFrame as unknown as MockInstance;
		const { rerender } = render(
			<AstraSlidingTabs
				ariaLabel="Settings sections"
				items={TAB_ITEMS}
				value="config"
				onValueChange={vi.fn()}
			/>,
		);

		const tablist = screen.getByRole("tablist", {
			name: "Settings sections",
		});
		const configTab = within(tablist).getByRole("tab", { name: "Config" });
		const apiTab = within(tablist).getByRole("tab", { name: "API" });
		const indicator = tablist.querySelector(
			".astra-sliding-tabs__indicator",
		) as HTMLElement;

		mockOffsetBox(configTab, 60, 48);
		mockOffsetBox(apiTab, 128, 36);

		expect(requestAnimationFrameMock).not.toHaveBeenCalled();

		rerender(
			<AstraSlidingTabs
				ariaLabel="Settings sections"
				items={TAB_ITEMS}
				value="api"
				onValueChange={vi.fn()}
			/>,
		);

		expect(requestAnimationFrameMock).not.toHaveBeenCalled();
		expect(indicator.style.transform).toBe(
			"translate3d(128px, 0, 0) scaleX(36)",
		);

		rerender(
			<AstraSlidingTabs
				ariaLabel="Settings sections"
				items={TAB_ITEMS}
				value="config"
				onValueChange={vi.fn()}
			/>,
		);

		expect(requestAnimationFrameMock).not.toHaveBeenCalled();
		expect(indicator.style.transform).toBe(
			"translate3d(60px, 0, 0) scaleX(48)",
		);
	});

	test("coalesces resize observer indicator measurement onto the next animation frame", async () => {
		const animationFrames = installAnimationFrameQueue();
		const resizeObserver = installResizeObserverMock();

		render(
			<AstraSlidingTabs
				ariaLabel="Settings sections"
				items={TAB_ITEMS}
				value="config"
				onValueChange={vi.fn()}
			/>,
		);

		const tablist = screen.getByRole("tablist", {
			name: "Settings sections",
		});
		const configTab = within(tablist).getByRole("tab", { name: "Config" });
		const indicator = tablist.querySelector(
			".astra-sliding-tabs__indicator",
		) as HTMLElement;

		expect(resizeObserver.observedElements).toContain(tablist);
		expect(resizeObserver.observedElements).toContain(configTab);

		mockOffsetBox(configTab, 72, 54);
		act(() => {
			resizeObserver.trigger();
		});

		expect(indicator.style.transform).not.toBe(
			"translate3d(72px, 0, 0) scaleX(54)",
		);

		act(() => {
			animationFrames.flushAll();
		});

		await waitFor(() => {
			expect(indicator.style.transform).toBe(
				"translate3d(72px, 0, 0) scaleX(54)",
			);
		});
	});
});
