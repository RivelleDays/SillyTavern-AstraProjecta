import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/astra/select";
import {
	ASTRA_PROJECTA_PORTAL_ID,
	ensureAstraProjectaUiInfrastructure,
} from "@/packages/core/runtime/uiScope";

function TestSelect({
	container,
	open,
}: {
	container?: HTMLElement | null;
	open?: boolean;
}) {
	return (
		<Select defaultValue="story" open={open}>
			<SelectTrigger aria-label="Open test select">
				<SelectValue placeholder="Select option" />
			</SelectTrigger>
			<SelectContent container={container}>
				<SelectItem value="none">{"<None>"}</SelectItem>
				<SelectItem value="story">Story Mode</SelectItem>
			</SelectContent>
		</Select>
	);
}

describe("astra Select", () => {
	test("mounts content inside the Astra portal container by default", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		render(<TestSelect open={true} />);

		const content = await screen.findByRole("listbox");
		const item = within(content).getByRole("option", {
			name: "Story Mode",
		});
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
		customContainer.id = "custom-select-container";
		document.body.appendChild(customContainer);

		render(<TestSelect container={customContainer} open={true} />);

		const content = await screen.findByRole("listbox");
		const item = within(content).getByRole("option", {
			name: "Story Mode",
		});

		await waitFor(() => {
			expect(customContainer.contains(content)).toBe(true);
		});
	});

	test("raises select content above the Astra drawer layer with an explicit z-index contract", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		render(<TestSelect open={true} />);

		const content = await screen.findByRole("listbox");
		expect(
			within(content).getByRole("option", { name: "Story Mode" }),
		).toBeInTheDocument();

		expect(content).toHaveStyle({ zIndex: "16000" });
		expect(content).toHaveStyle({ pointerEvents: "auto" });
	});
});
