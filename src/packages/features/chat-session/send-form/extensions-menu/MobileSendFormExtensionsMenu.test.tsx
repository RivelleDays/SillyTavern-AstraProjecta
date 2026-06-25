import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { MobileSendFormExtensionsMenu } from "@/packages/features/chat-session/send-form/extensions-menu/MobileSendFormExtensionsMenu";

const DIALOG_TITLE_WARNING =
	"`DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.";
const DIALOG_DESCRIPTION_WARNING =
	"Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.";

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("MobileSendFormExtensionsMenu", () => {
	beforeEach(() => {
		consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		consoleWarnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => undefined);
	});

	afterEach(() => {
		expect(
			consoleErrorSpy.mock.calls
				.flat()
				.some((message) =>
					String(message).includes(DIALOG_TITLE_WARNING),
				),
		).toBe(false);
		expect(
			consoleWarnSpy.mock.calls
				.flat()
				.some((message) =>
					String(message).includes(DIALOG_DESCRIPTION_WARNING),
				),
		).toBe(false);
		consoleErrorSpy.mockRestore();
		consoleWarnSpy.mockRestore();
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("uses semantic ids for the extensions drawer title and description", async () => {
		document.body.innerHTML = `
            <button id="extensionsMenuButton" type="button">Extensions</button>
            <div id="extensionsMenu">
                <button type="button">Extension action</button>
            </div>
        `;
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});
		Object.defineProperty(window, "requestAnimationFrame", {
			configurable: true,
			value: vi.fn(() => 1),
		});
		Object.defineProperty(window, "cancelAnimationFrame", {
			configurable: true,
			value: vi.fn(),
		});

		const { container } = render(
			<MobileSendFormExtensionsMenu documentRef={document} />,
		);

		const trigger = within(container).getByRole("button", {
			name: "Extension shortcuts",
		});
		expect(trigger).not.toBeDisabled();
		fireEvent.pointerDown(trigger);
		fireEvent.click(trigger);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"astra-send-form-extensions-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});
		const title = document.getElementById(
			"astra-send-form-extensions-drawer-title",
		);
		const description = document.getElementById(
			"astra-send-form-extensions-drawer-description",
		);

		expect(drawer).toHaveAttribute(
			"aria-labelledby",
			"astra-send-form-extensions-drawer-title",
		);
		expect(drawer).toHaveAttribute(
			"aria-describedby",
			"astra-send-form-extensions-drawer-description",
		);
		expect(title).toHaveAttribute("data-slot", "drawer-title");
		expect(description).toHaveAttribute("data-slot", "drawer-description");
		expect(screen.getByText("Extension action")).toBeInTheDocument();
	});
});
