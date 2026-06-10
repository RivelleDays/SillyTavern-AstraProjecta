import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ScrollArea as AstraScrollArea } from "@/components/ui/astra/scroll-area";
import { ScrollArea, ScrollBar } from "@/components/ui/shared/scroll-area";

describe("shared ScrollArea", () => {
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

	test("renders children with the canonical Astra scroll-area root", async () => {
		const { container } = render(
			<ScrollArea className="custom-scroll-area">
				<div>Scrollable content</div>
			</ScrollArea>,
		);

		expect(screen.getByText("Scrollable content")).toBeInTheDocument();

		await waitFor(() => {
			expect(
				container.querySelector('[data-astra-component="ScrollArea"]'),
			).toHaveClass("astra-scroll-area", "custom-scroll-area");
			expect(
				container.querySelector('[data-slot="scroll-area-viewport"]'),
			).toBeInTheDocument();
			expect(
				container.querySelector('[data-slot="scroll-area-content"]'),
			).toBeInTheDocument();
			expect(
				container.querySelector('[data-slot="scroll-area-scrollbar"]'),
			).toBeInTheDocument();
			expect(
				container.querySelector('[data-slot="scroll-area-thumb"]'),
			).toBeInTheDocument();
			expect(
				container.querySelector('[data-slot="scroll-area-corner"]'),
			).toBeInTheDocument();
		});
	});

	test("ScrollBar defaults to vertical orientation when composed from Astra parts", () => {
		const { container } = render(
			<AstraScrollArea.Root>
				<AstraScrollArea.Viewport>
					<AstraScrollArea.Content>
						<div>Content</div>
					</AstraScrollArea.Content>
				</AstraScrollArea.Viewport>
				<ScrollBar />
			</AstraScrollArea.Root>,
		);

		expect(
			container.querySelector('[data-slot="scroll-area-scrollbar"]'),
		).toHaveAttribute("data-orientation", "vertical");
	});

	test("ScrollBar can render a horizontal scrollbar", () => {
		const { container } = render(
			<AstraScrollArea.Root>
				<AstraScrollArea.Viewport>
					<AstraScrollArea.Content>
						<div>Content</div>
					</AstraScrollArea.Content>
				</AstraScrollArea.Viewport>
				<ScrollBar orientation="horizontal" />
			</AstraScrollArea.Root>,
		);

		expect(
			container.querySelector('[data-slot="scroll-area-scrollbar"]'),
		).toHaveAttribute("data-orientation", "horizontal");
	});
});
