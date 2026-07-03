import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { CharacterLibraryMissingDialog } from "@/packages/features/chat-session/send-form/main-menu/extension-shortcuts/CharacterLibraryMissingDialog";

const CHARACTER_LIBRARY_REPOSITORY_URL =
	"https://github.com/Sillyanonymous/SillyTavern-CharacterLibrary";

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function mockMobileLayout() {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		})),
		writable: true,
	});
}

async function renderOpenDialog() {
	render(
		<CharacterLibraryMissingDialog open={true} onOpenChange={() => {}} />,
	);

	return screen.findByRole("dialog", {
		name: "Character Library is not available",
	});
}

describe("CharacterLibraryMissingDialog", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			translate: (text: string) => text,
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
		vi.restoreAllMocks();
	});

	test("renders an Empty state without redundant dialog chrome and footer actions", async () => {
		const dialog = await renderOpenDialog();

		expect(dialog).toHaveAttribute(
			"id",
			"astra-chat-main-menu-character-library-missing-dialog",
		);
		expect(dialog.querySelector(".astra-dialog-header")).toBeNull();
		expect(dialog.querySelector(".astra-dialog-heading")).toBeNull();
		expect(dialog.querySelector("[data-slot='empty']")).toHaveClass(
			"astra-chat-library-missing-dialog__empty",
		);
		expect(dialog.querySelector("[data-slot='empty-header']")).toHaveClass(
			"astra-chat-library-missing-dialog__empty-header",
		);
		expect(dialog.querySelector("[data-slot='empty-icon']")).toHaveClass(
			"astra-chat-library-missing-dialog__empty-icon",
		);
		expect(
			dialog.querySelector("[data-slot='empty-title']"),
		).toHaveTextContent("Character Library is not available");
		expect(
			dialog.querySelector("[data-slot='empty-description']"),
		).toHaveTextContent(
			"Install SillyTavern-CharacterLibrary, refresh SillyTavern, then use this shortcut again.",
		);

		expect(
			within(dialog).queryByRole("link", {
				name: "Sillyanonymous/SillyTavern-CharacterLibrary",
			}),
		).toBeNull();
		expect(
			within(dialog).getByRole("textbox", {
				name: "GitHub repository URL",
			}),
		).toHaveValue(CHARACTER_LIBRARY_REPOSITORY_URL);

		const footer = dialog.querySelector(".astra-dialog-footer");
		expect(
			footer?.querySelector(".astra-chat-library-dialog-footer-actions"),
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Close" }),
		).toHaveAttribute("data-variant", "ghost");

		const githubButton = within(dialog).getByRole("link", {
			name: "GitHub repository",
		});
		expect(githubButton).toHaveAttribute(
			"href",
			CHARACTER_LIBRARY_REPOSITORY_URL,
		);
		expect(githubButton).toHaveAttribute("data-variant", "default");
		expect(
			githubButton.querySelector(".lucide-square-arrow-out-up-right"),
		).toBeInTheDocument();
	});

	test("copies the repository URL from the readonly field", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText },
		});
		const dialog = await renderOpenDialog();

		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Copy repository URL",
			}),
		);

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith(
				CHARACTER_LIBRARY_REPOSITORY_URL,
			);
		});
		expect(
			within(dialog).getByRole("button", { name: "Copied" }),
		).toBeInTheDocument();
	});
});
