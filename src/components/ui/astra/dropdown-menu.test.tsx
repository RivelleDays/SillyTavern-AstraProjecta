import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/astra/dropdown-menu";
import {
	ASTRA_PROJECTA_PORTAL_ID,
	ensureAstraProjectaUiInfrastructure,
} from "@/packages/core/runtime/uiScope";

function TestDropdownMenu({ container }: { container?: HTMLElement | null }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild={true}>
				<button type="button">Open test menu</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent container={container}>
				<DropdownMenuItem>Last message</DropdownMenuItem>
				<DropdownMenuItem>Messages</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function openDropdownMenu() {
	fireEvent.pointerDown(
		screen.getByRole("button", { name: "Open test menu" }),
		{
			button: 0,
			ctrlKey: false,
		},
	);
}

describe("astra DropdownMenu", () => {
	test("mounts content inside the Astra portal container by default", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		render(<TestDropdownMenu />);

		openDropdownMenu();

		const content = await screen.findByRole("menu");
		const portalContainer = document.getElementById(
			ASTRA_PROJECTA_PORTAL_ID,
		);

		expect(
			within(content).getByRole("menuitem", { name: "Last message" }),
		).toBeInTheDocument();
		await waitFor(() => {
			expect(portalContainer?.contains(content)).toBe(true);
		});
	});

	test("respects an explicit container override", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const customContainer = document.createElement("div");
		customContainer.id = "custom-dropdown-container";
		document.body.appendChild(customContainer);

		render(<TestDropdownMenu container={customContainer} />);

		openDropdownMenu();

		const content = await screen.findByRole("menu");

		await waitFor(() => {
			expect(customContainer.contains(content)).toBe(true);
		});
	});

	test("raises dropdown content above the Astra overlay layer", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		render(<TestDropdownMenu />);

		openDropdownMenu();

		const content = await screen.findByRole("menu");
		expect(
			within(content).getByRole("menuitem", { name: "Messages" }),
		).toBeInTheDocument();

		expect(content).toHaveStyle({ pointerEvents: "auto" });
		expect(content).toHaveStyle({ zIndex: "16000" });
	});
});
