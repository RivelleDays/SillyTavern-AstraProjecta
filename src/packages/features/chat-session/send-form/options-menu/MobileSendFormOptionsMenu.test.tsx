import * as React from "react";

import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { MobileSendFormOptionsMenu } from "@/packages/features/chat-session/send-form/options-menu/MobileSendFormOptionsMenu";

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

function createVisualViewport(height: number) {
	const target = new EventTarget() as EventTarget & { height: number };
	target.height = height;
	return target;
}

describe("MobileSendFormOptionsMenu", () => {
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
		Reflect.deleteProperty(
			window as unknown as Record<string, unknown>,
			"visualViewport",
		);
	});

	test("keeps drawer position styles stable during visualViewport resize when input repositioning is disabled", async () => {
		document.body.innerHTML = `
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
      </div>
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
        </div>
      </form>
    `;

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const visualViewport = createVisualViewport(640);
		Object.defineProperty(window, "visualViewport", {
			configurable: true,
			value: visualViewport,
		});
		Object.defineProperty(window, "innerHeight", {
			configurable: true,
			value: 900,
		});

		setSillyTavernContext({
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			chatId: "chat-1",
			chatMetadata: {},
			characters: [],
			executeSlashCommandsWithOptions: vi.fn(),
		});

		const { container } = render(
			<MobileSendFormOptionsMenu documentRef={document} />,
		);

		const textarea = document.getElementById(
			"send_textarea",
		) as HTMLTextAreaElement;
		textarea.focus();
		expect(document.activeElement).toBe(textarea);

		const trigger = within(container).getByRole("button", { name: "Menu" });

		fireEvent.pointerDown(trigger);
		fireEvent.click(trigger);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-options-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		expect(document.activeElement).not.toBe(textarea);
		expect(drawer.style.bottom).toBe("");
		expect(drawer.style.height).toBe("");

		visualViewport.height = 520;
		visualViewport.dispatchEvent(new Event("resize"));

		expect(drawer.style.bottom).toBe("");
		expect(drawer.style.height).toBe("");
	});

	test("renders the Astra drawer handle before the drawer body and menu content", async () => {
		document.body.innerHTML = `
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
      </div>
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
        </div>
      </form>
    `;

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		setSillyTavernContext({
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			chatId: "chat-1",
			chatMetadata: {},
			characters: [],
			executeSlashCommandsWithOptions: vi.fn(),
		});

		const { container } = render(
			<MobileSendFormOptionsMenu documentRef={document} />,
		);

		const trigger = within(container).getByRole("button", { name: "Menu" });

		fireEvent.pointerDown(trigger);
		fireEvent.click(trigger);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-options-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		const handle = drawer.querySelector(
			".astra-drawer__handle",
		) as HTMLElement | null;
		const title = document.getElementById(
			"mobile-send-form-options-drawer-title",
		);
		const description = document.getElementById(
			"mobile-send-form-options-drawer-description",
		);
		const drawerBody = drawer.querySelector(
			'[data-slot="drawer-body"]',
		) as HTMLElement | null;
		const scrollableContent = document.getElementById(
			"mobile-send-form-options-drawer-scrollable-content",
		);
		const menu = document.getElementById(
			"mobile-send-form-options-drawer-menu",
		);

		expect(drawer).toHaveAttribute(
			"aria-labelledby",
			"mobile-send-form-options-drawer-title",
		);
		expect(drawer).toHaveAttribute(
			"aria-describedby",
			"mobile-send-form-options-drawer-description",
		);
		expect(title).toHaveAttribute("data-slot", "drawer-title");
		expect(description).toHaveAttribute("data-slot", "drawer-description");
		expect(handle).toBeInTheDocument();
		expect(handle).toHaveClass("astra-drawer__handle");
		expect(handle).not.toHaveClass("hidden");
		expect(handle).not.toHaveClass("bg-muted");
		expect(drawer.firstElementChild).toBe(handle);
		expect(drawerBody).toBeInTheDocument();
		expect(scrollableContent).toBeInTheDocument();
		expect(scrollableContent?.closest('[data-slot="drawer-body"]')).toBe(
			drawerBody,
		);
		expect(menu).toBeInTheDocument();
		expect(menu?.closest('[data-slot="drawer-body"]')).toBe(drawerBody);
		expect(handle?.compareDocumentPosition(drawerBody as Node)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
	});

	test("translates the trigger button and drawer copy through Astra i18n", async () => {
		document.body.innerHTML = `
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
      </div>
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
        </div>
      </form>
    `;

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		setSillyTavernContext({
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			chatId: "chat-1",
			chatMetadata: {},
			executeSlashCommandsWithOptions: vi.fn(),
			translate: vi.fn((text: string, key: string) => `${key}::${text}`),
		});

		const { container } = render(
			<MobileSendFormOptionsMenu documentRef={document} />,
		);

		const trigger = within(container).getByRole("button", {
			name: "sendForm.options.trigger::Menu",
		});

		fireEvent.pointerDown(trigger);
		fireEvent.click(trigger);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-options-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		expect(
			within(drawer).getByText("sendForm.options.title::Menu"),
		).toBeInTheDocument();
		expect(
			within(drawer).getByText(
				"sendForm.options.description::Chat session actions and prompt panel controls.",
			),
		).toBeInTheDocument();
		expect(
			within(drawer).getByText(
				"sendForm.options.group.promptPanels::Prompt Panels",
			),
		).toBeInTheDocument();
		expect(
			within(drawer).getByText(
				"sendForm.options.action.authorNote::Author's Note",
			),
		).toBeInTheDocument();
	});

	test("renders a shortcuts visibility switch above the danger zone and toggles it from the visible label", async () => {
		document.body.innerHTML = `
      <div id="options">
        <button id="option_toggle_AN" type="button"></button>
        <button id="option_close_chat" type="button"></button>
        <button id="option_delete_mes" type="button"></button>
      </div>
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
        </div>
      </form>
    `;

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		setSillyTavernContext({
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			chatId: "chat-1",
			chatMetadata: {},
			characters: [],
			executeSlashCommandsWithOptions: vi.fn(),
		});

		const onShowShortcutsToolbarChange = vi.fn();
		const { container } = render(
			<MobileSendFormOptionsMenu
				documentRef={document}
				onShowShortcutsToolbarChange={onShowShortcutsToolbarChange}
				showShortcutsToolbar={true}
			/>,
		);

		const trigger = within(container).getByRole("button", { name: "Menu" });

		fireEvent.pointerDown(trigger);
		fireEvent.click(trigger);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-options-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		const visibilityToggle = within(drawer).getByRole("switch", {
			name: "Show chat shortcuts",
		});
		const closeChatButton = within(drawer).getByRole("button", {
			name: "Close chat",
		});
		const visibilityLabel = within(drawer).getByText("Show chat shortcuts");
		const dangerZoneLabel = within(drawer).getByText("Danger zone");
		const visibilityToggleRow = document.getElementById(
			"mobile-send-form-options-drawer-shortcuts-toggle",
		);

		expect(visibilityToggleRow).toBeInTheDocument();
		expect(visibilityToggleRow).toContainElement(visibilityToggle);
		expect(visibilityToggle).toHaveAttribute(
			"id",
			"mobile-send-form-options-drawer-shortcuts-toggle-switch",
		);
		expect(visibilityToggle).toHaveAttribute("data-size", "default");
		expect(visibilityLabel).toHaveAttribute(
			"for",
			"mobile-send-form-options-drawer-shortcuts-toggle-switch",
		);
		expect(closeChatButton).toHaveClass(
			"mobile-send-form-options-drawer__item",
		);
		expect(closeChatButton.querySelector(".lucide-x")).toBeInTheDocument();
		expect(visibilityToggle).toHaveAttribute("aria-checked", "true");
		expect(
			visibilityLabel.compareDocumentPosition(dangerZoneLabel) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).not.toBe(0);

		fireEvent.click(visibilityLabel);

		expect(onShowShortcutsToolbarChange).toHaveBeenCalledWith(false);
	});

	test("clicking Reload Page triggers the page reload handler", async () => {
		document.body.innerHTML = `
      <div id="options">
      </div>
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
        </div>
      </form>
    `;

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const reloadPageSpy = vi.fn();

		setSillyTavernContext({
			chatId: "chat-1",
			chatMetadata: {},
			groupId: "group-1",
		});

		const { container } = render(
			<MobileSendFormOptionsMenu
				documentRef={document}
				onPageReload={reloadPageSpy}
			/>,
		);

		const trigger = within(container).getByRole("button", { name: "Menu" });

		fireEvent.pointerDown(trigger);
		fireEvent.click(trigger);

		const drawer = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-options-drawer",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		fireEvent.click(
			within(drawer).getByRole("button", { name: "Reload Page" }),
		);

		expect(reloadPageSpy).toHaveBeenCalledTimes(1);
	});
});
