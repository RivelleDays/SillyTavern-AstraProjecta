import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { Button } from "@/components/ui/shadcn/button";
import * as AstraDrawer from "@/components/ui/astra/drawer";

const {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} = AstraDrawer;

const ASTRA_DRAWER_EXIT_MS = 500;

function HookCloseButton() {
	const requestClose = (
		AstraDrawer as typeof AstraDrawer & {
			useAstraDrawerClose: () => () => void;
		}
	).useAstraDrawerClose();

	return (
		<button type="button" onClick={requestClose}>
			Close with hook
		</button>
	);
}

describe("astra DrawerBody", () => {
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

	test("renders a canonical scrollable drawer body with Astra ScrollArea parts", async () => {
		const { container } = render(
			<DrawerBody>
				<div>Drawer body content</div>
			</DrawerBody>,
		);

		expect(screen.getByText("Drawer body content")).toBeInTheDocument();

		await waitFor(() => {
			expect(
				container.querySelector('[data-slot="drawer-body"]'),
			).toHaveClass("astra-drawer__body", "flex", "min-h-0");
			expect(
				container.querySelector('[data-astra-component="ScrollArea"]'),
			).toHaveClass("astra-drawer__scroll-area");
			expect(
				container.querySelector('[data-astra-component="ScrollArea"]'),
			).toHaveAttribute("data-astra-scroll-affordance", "surface");
			expect(
				container.querySelector('[data-slot="scroll-area-viewport"]'),
			).toHaveClass("astra-drawer__viewport");
			expect(
				container.querySelector('[data-slot="scroll-area-content"]'),
			).toHaveClass("astra-drawer__body-content");
			expect(
				container.querySelector('[data-slot="scroll-area-scrollbar"]'),
			).toHaveAttribute("data-orientation", "vertical");
			expect(
				container.querySelector('[data-slot="scroll-area-thumb"]'),
			).toBeInTheDocument();
		});
	});

	test("forwards scroll-area prop bags to the correct internal nodes", async () => {
		const { container } = render(
			<DrawerBody
				className="custom-drawer-body"
				contentProps={{
					className: "custom-content",
					id: "drawer-body-content",
				}}
				scrollAreaProps={{ className: "custom-scroll-area" }}
				scrollbarProps={{ className: "custom-scrollbar" }}
				viewportProps={{
					className: "custom-viewport",
					id: "drawer-body-viewport",
				}}
			>
				<div>Forwarded props</div>
			</DrawerBody>,
		);

		await waitFor(() => {
			expect(
				container.querySelector('[data-slot="drawer-body"]'),
			).toHaveClass("custom-drawer-body");
			expect(
				container.querySelector('[data-astra-component="ScrollArea"]'),
			).toHaveClass("custom-scroll-area");
			expect(
				container.querySelector("#drawer-body-viewport"),
			).toHaveClass("custom-viewport");
			expect(container.querySelector("#drawer-body-content")).toHaveClass(
				"custom-content",
			);
			expect(
				container.querySelector('[data-slot="scroll-area-scrollbar"]'),
			).toHaveClass("custom-scrollbar");
		});
	});

	test("keeps the vertical scrollbar mounted while exposing no-overflow state", async () => {
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(
			120,
		);
		vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(
			120,
		);

		const { container } = render(
			<DrawerBody>
				<div>Non-scrollable drawer body</div>
			</DrawerBody>,
		);

		await waitFor(() => {
			const scrollbar = container.querySelector(
				'[data-slot="scroll-area-scrollbar"]',
			);
			const viewport = container.querySelector(
				'[data-slot="scroll-area-viewport"]',
			);

			expect(scrollbar).toBeInTheDocument();
			expect(scrollbar).not.toHaveAttribute("data-has-overflow-y");
			expect(viewport).not.toHaveAttribute("data-has-overflow-y");
		});
	});
});

describe("astra Drawer close lifecycle", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	test("preserves shadcn Button metadata when DrawerClose uses asChild", () => {
		render(
			<Drawer direction="bottom" open={true} onOpenChange={() => {}}>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Close metadata drawer</DrawerTitle>
						<DrawerDescription>
							Checks close button metadata.
						</DrawerDescription>
					</DrawerHeader>
					<DrawerClose asChild={true}>
						<Button size="default" type="button" variant="default">
							Close with button
						</Button>
					</DrawerClose>
				</DrawerContent>
			</Drawer>,
		);

		const closeButton = screen.getByRole("button", {
			name: "Close with button",
		});

		expect(closeButton).toHaveAttribute("data-slot", "drawer-close");
		expect(closeButton).toHaveAttribute("data-variant", "default");
		expect(closeButton).toHaveAttribute("data-size", "default");
		expect(closeButton).toHaveClass("bg-primary");
		expect(closeButton).toHaveClass("text-primary-foreground");
	});

	test("keeps DrawerClose mounted in closed state before notifying the parent", async () => {
		vi.useFakeTimers();
		const onOpenChange = vi.fn();
		const onExitComplete = vi.fn();

		render(
			<Drawer
				direction="bottom"
				open={true}
				onExitComplete={onExitComplete}
				onOpenChange={onOpenChange}
			>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Lifecycle drawer</DrawerTitle>
						<DrawerDescription>
							Checks delayed close notification.
						</DrawerDescription>
					</DrawerHeader>
					<DrawerClose asChild={true}>
						<button type="button">Close drawer</button>
					</DrawerClose>
				</DrawerContent>
			</Drawer>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Lifecycle drawer",
		});

		fireEvent.click(screen.getByRole("button", { name: "Close drawer" }));

		expect(dialog).toHaveAttribute("data-state", "closed");
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(onExitComplete).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(ASTRA_DRAWER_EXIT_MS - 1);
		});

		expect(onOpenChange).not.toHaveBeenCalled();
		expect(onExitComplete).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(1);
		});

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onExitComplete).toHaveBeenCalledTimes(1);
	});

	test("lets nested content close through useAstraDrawerClose with the same delay", async () => {
		vi.useFakeTimers();
		const onOpenChange = vi.fn();
		const onExitComplete = vi.fn();

		render(
			<Drawer
				direction="bottom"
				open={true}
				onExitComplete={onExitComplete}
				onOpenChange={onOpenChange}
			>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Hook drawer</DrawerTitle>
						<DrawerDescription>
							Checks hook-based close notification.
						</DrawerDescription>
					</DrawerHeader>
					<HookCloseButton />
				</DrawerContent>
			</Drawer>,
		);

		const dialog = screen.getByRole("dialog", { name: "Hook drawer" });

		fireEvent.click(screen.getByRole("button", { name: "Close with hook" }));

		expect(dialog).toHaveAttribute("data-state", "closed");
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(onExitComplete).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(ASTRA_DRAWER_EXIT_MS);
		});

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onExitComplete).toHaveBeenCalledTimes(1);
	});
});

describe("astra DrawerContent source contract", () => {
	test("keeps Astra wrapper classes while delegating bottom top-gap sizing to CSS tokens", () => {
		const source = readFileSync(
			resolve(process.cwd(), "src/components/ui/astra/drawer.tsx"),
			"utf8",
		);

		expect(source).toContain(
			"astra-drawer group/drawer-content fixed z-50 flex h-auto flex-col bg-background outline-none",
		);
		expect(source).toContain(
			"data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0",
		);
		expect(source).toContain(
			"data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
		);
		expect(source).not.toContain(
			"data-[vaul-drawer-direction=bottom]:mt-24",
		);
		expect(source).not.toContain(
			"data-[vaul-drawer-direction=bottom]:max-h-[80vh]",
		);
		expect(source).not.toContain("overlayClassName");
	});
});
