import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/shared/popover";
import {
	ASTRA_PROJECTA_PORTAL_ID,
	ensureAstraProjectaUiInfrastructure,
} from "@/packages/core/runtime/uiScope";

describe("shared Popover", () => {
	test("mounts content inside the Astra portal container by default", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		render(
			<Popover>
				<PopoverTrigger asChild={true}>
					<button type="button">Open details</button>
				</PopoverTrigger>
				<PopoverContent>Popover body</PopoverContent>
			</Popover>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Open details" }));

		const content = await screen.findByText("Popover body");
		const portalContainer = document.getElementById(
			ASTRA_PROJECTA_PORTAL_ID,
		);

		await waitFor(() => {
			expect(portalContainer?.contains(content)).toBe(true);
		});
	});

	test("respects an explicit container override", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const customContainer = document.createElement("div");
		customContainer.id = "custom-popover-container";
		document.body.appendChild(customContainer);

		render(
			<Popover>
				<PopoverTrigger asChild={true}>
					<button type="button">Open custom</button>
				</PopoverTrigger>
				<PopoverContent container={customContainer}>
					Custom popover body
				</PopoverContent>
			</Popover>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Open custom" }));

		const content = await screen.findByText("Custom popover body");

		await waitFor(() => {
			expect(customContainer.contains(content)).toBe(true);
		});
	});
});
