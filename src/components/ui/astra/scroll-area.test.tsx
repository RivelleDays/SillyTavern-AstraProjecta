import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ScrollArea } from "@/components/ui/astra/scroll-area";

describe("astra ScrollArea", () => {
	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
			120,
		);
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(
			120,
		);
		vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(
			320,
		);
		vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(
			320,
		);
	});

	test("renders the Astra scroll-area parts with the canonical root marker", async () => {
		const { container } = render(
			<ScrollArea.Root className="custom-root">
				<ScrollArea.Viewport
					className="custom-viewport"
					id="test-scroll-area-viewport"
				>
					<ScrollArea.Content className="custom-content">
						<div>Scrollable content</div>
					</ScrollArea.Content>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar>
					<ScrollArea.Thumb />
				</ScrollArea.Scrollbar>
				<ScrollArea.Corner />
			</ScrollArea.Root>,
		);

		expect(screen.getByText("Scrollable content")).toBeInTheDocument();

		await waitFor(() => {
			expect(
				container.querySelector('[data-astra-component="ScrollArea"]'),
			).toHaveClass(
				"astra-scroll-area",
				"relative",
				"min-h-0",
				"min-w-0",
				"custom-root",
			);
			expect(
				container.querySelector("#test-scroll-area-viewport"),
			).toHaveClass(
				"astra-scroll-area__viewport",
				"min-h-0",
				"min-w-0",
				"flex-1",
				"custom-viewport",
			);
			expect(
				container.querySelector('[data-slot="scroll-area-content"]'),
			).toHaveClass("astra-scroll-area__content", "custom-content");
			expect(
				container.querySelector('[data-slot="scroll-area-scrollbar"]'),
			).toHaveClass("astra-scroll-area__scrollbar");
			expect(
				container.querySelector('[data-slot="scroll-area-thumb"]'),
			).toHaveClass("astra-scroll-area__thumb");
			expect(
				container.querySelector('[data-slot="scroll-area-corner"]'),
			).toHaveClass("astra-scroll-area__corner");
		});
	});

	test("supports horizontal scrollbar orientation", () => {
		const { container } = render(
			<ScrollArea.Root>
				<ScrollArea.Viewport>
					<ScrollArea.Content>
						<div>Content</div>
					</ScrollArea.Content>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar orientation="horizontal">
					<ScrollArea.Thumb />
				</ScrollArea.Scrollbar>
			</ScrollArea.Root>,
		);

		expect(
			container.querySelector('[data-slot="scroll-area-scrollbar"]'),
		).toHaveAttribute("data-orientation", "horizontal");
	});

	test("updates surface scroll fade fallback attributes from viewport metrics", async () => {
		const { container } = render(
			<ScrollArea.Root data-astra-scroll-affordance="surface">
				<ScrollArea.Viewport>
					<ScrollArea.Content>
						<div>Surface content</div>
					</ScrollArea.Content>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar>
					<ScrollArea.Thumb />
				</ScrollArea.Scrollbar>
			</ScrollArea.Root>,
		);

		const root = container.querySelector(
			'[data-astra-component="ScrollArea"]',
		) as HTMLElement;
		const viewport = container.querySelector(
			".astra-scroll-area__viewport",
		) as HTMLElement;

		await waitFor(() => {
			expect(root).not.toHaveAttribute("data-astra-scroll-fade-y-start");
			expect(root).toHaveAttribute("data-astra-scroll-fade-y-end");
		});

		viewport.scrollTop = 100;
		fireEvent.scroll(viewport);

		await waitFor(() => {
			expect(root).toHaveAttribute("data-astra-scroll-fade-y-start");
			expect(root).toHaveAttribute("data-astra-scroll-fade-y-end");
		});

		viewport.scrollTop = 200;
		fireEvent.scroll(viewport);

		await waitFor(() => {
			expect(root).toHaveAttribute("data-astra-scroll-fade-y-start");
			expect(root).not.toHaveAttribute("data-astra-scroll-fade-y-end");
		});
		expect(root).not.toHaveAttribute("data-astra-has-overflow-y");
		expect(
			viewport.style.getPropertyValue(
				"--astra-scroll-affordance-y-start",
			),
		).toBe("");
		expect(
			viewport.style.getPropertyValue("--astra-scroll-affordance-y-end"),
		).toBe("");
	});

	test("does not install Astra scroll fade fallback for non-surface roots", () => {
		const { container } = render(
			<ScrollArea.Root>
				<ScrollArea.Viewport>
					<ScrollArea.Content>
						<div>Plain content</div>
					</ScrollArea.Content>
				</ScrollArea.Viewport>
			</ScrollArea.Root>,
		);

		const root = container.querySelector(
			'[data-astra-component="ScrollArea"]',
		) as HTMLElement;
		const viewport = container.querySelector(
			".astra-scroll-area__viewport",
		) as HTMLElement;

		viewport.scrollTop = 100;
		fireEvent.scroll(viewport);

		expect(root).not.toHaveAttribute("data-astra-scroll-fade-y-start");
		expect(root).not.toHaveAttribute("data-astra-scroll-fade-y-end");
	});
});
