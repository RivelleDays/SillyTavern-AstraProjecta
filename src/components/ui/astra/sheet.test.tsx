import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/astra/sheet";

describe("astra Sheet", () => {
	test("renders a full-height bottom sheet without the upstream close button by default", () => {
		render(
			<Sheet open={true}>
				<SheetContent side="bottom">
					<SheetHeader>
						<SheetTitle>AI Settings</SheetTitle>
					</SheetHeader>
					<div>Body content</div>
					<SheetFooter>
						<button type="button">Close</button>
					</SheetFooter>
				</SheetContent>
			</Sheet>,
		);

		const dialog = screen.getByRole("dialog", { name: "AI Settings" });
		const overlay = document.querySelector('[data-slot="sheet-overlay"]');

		expect(dialog).toHaveClass("astra-sheet-content", "flex", "flex-col");
		expect(dialog).not.toHaveClass("z-50");
		expect(overlay).toHaveClass("astra-sheet-overlay");
		expect(overlay).not.toHaveClass("z-50");
		expect(overlay).not.toHaveClass("bg-black/50");
		expect(dialog).toHaveAttribute("data-astra-component", "Sheet");
		expect(dialog).toHaveAttribute("data-side", "bottom");
		expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(
			1,
		);
	});
});

describe("astra Sheet source contract", () => {
	test("keeps Astra-specific full-height behavior in the local wrapper rather than the vendored shadcn source", () => {
		const astraSource = readFileSync(
			resolve(process.cwd(), "src/components/ui/astra/sheet.tsx"),
			"utf8",
		);
		const shadcnSource = readFileSync(
			resolve(process.cwd(), "src/components/ui/shadcn/sheet.tsx"),
			"utf8",
		);

		expect(astraSource).toContain("astra-sheet-content");
		expect(astraSource).toContain("astra-sheet-overlay");
		expect(astraSource).not.toContain("astra-sheet-content fixed z-50");
		expect(astraSource).not.toContain("fixed inset-0 z-50 bg-black/50");
		expect(astraSource).not.toContain("bg-black/50");
		expect(astraSource).not.toContain(
			"h-[calc(100vh-var(--topBarBlockSize))]",
		);
		expect(astraSource).not.toContain(
			"h-[calc(100dvh-var(--topBarBlockSize))]",
		);
		expect(astraSource).not.toContain(
			"max-h-[calc(100vh-var(--topBarBlockSize))]",
		);
		expect(astraSource).not.toContain(
			"max-h-[calc(100dvh-var(--topBarBlockSize))]",
		);
		expect(astraSource).toContain("showCloseButton = false");
		expect(shadcnSource).not.toContain("astra-sheet-content");
		expect(shadcnSource).not.toContain("100dvh");
	});
});
