import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { Button } from "@/components/ui/shadcn/button";
import * as ResponsiveDialogModule from "@/components/ui/astra/ResponsiveDialog";

const { ResponsiveDialog, ResponsiveDialogClose } = ResponsiveDialogModule;

const ASTRA_DIALOG_EXIT_MS = 500;
const DIALOG_TITLE_WARNING =
	"`DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.";

function getAriaReference(element: HTMLElement, attributeName: string) {
	const id = element.getAttribute(attributeName);

	expect(id).toBeTruthy();

	const referencedElement = document.getElementById(id ?? "");

	expect(referencedElement).toBeInTheDocument();

	return referencedElement as HTMLElement;
}

function expectNoDialogTitleWarning(
	consoleErrorSpy: ReturnType<typeof vi.spyOn>,
) {
	expect(
		consoleErrorSpy.mock.calls
			.flat()
			.some((message) => String(message).includes(DIALOG_TITLE_WARNING)),
	).toBe(false);
}

function ResponsiveDialogCloseButton() {
	const ResponsiveDialogClose = (
		ResponsiveDialogModule as typeof ResponsiveDialogModule & {
			ResponsiveDialogClose: React.ComponentType<{
				asChild?: boolean;
				children: React.ReactNode;
			}>;
		}
	).ResponsiveDialogClose;

	return (
		<ResponsiveDialogClose asChild={true}>
			<button type="button">Close dialog</button>
		</ResponsiveDialogClose>
	);
}

function mockMatchMedia(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => ({
			addEventListener: vi.fn(),
			matches,
			removeEventListener: vi.fn(),
		})),
		writable: true,
	});
}

describe("ResponsiveDialog", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.useRealTimers();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("renders the shared Astra dialog structure as a desktop dialog", () => {
		mockMatchMedia(false);
		const semanticProps = { id: "semantic-test-dialog" };
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		render(
			<ResponsiveDialog
				{...semanticProps}
				description="Update this chat file."
				open={true}
				title="Rename chat"
				onOpenChange={() => {}}
			>
				<div>Rename body</div>
			</ResponsiveDialog>,
		);

		const dialog = screen.getByRole("dialog", { name: "Rename chat" });
		const title = dialog.querySelector(".astra-dialog-title");
		const description = dialog.querySelector(".astra-dialog-description");
		const labelledBy = dialog.getAttribute("aria-labelledby");
		const describedBy = dialog.getAttribute("aria-describedby");
		const radixTitle = getAriaReference(dialog, "aria-labelledby");
		const radixDescription = getAriaReference(
			dialog,
			"aria-describedby",
		);
		const stableTitle = document.getElementById(
			"semantic-test-dialog-title",
		);
		const stableDescription = document.getElementById(
			"semantic-test-dialog-description",
		);

		expect(dialog).toHaveAttribute("id", "semantic-test-dialog");
		expect(labelledBy).not.toBe("semantic-test-dialog-title");
		expect(describedBy).not.toBe("semantic-test-dialog-description");
		expect(radixTitle).toHaveClass("astra-dialog-title");
		expect(radixDescription).toHaveClass("astra-dialog-description");
		expect(stableTitle).toHaveAttribute(
			"id",
			"semantic-test-dialog-title",
		);
		expect(stableDescription).toHaveAttribute(
			"id",
			"semantic-test-dialog-description",
		);
		expect(stableTitle).toHaveTextContent("Rename chat");
		expect(stableDescription).toHaveTextContent("Update this chat file.");
		expect(dialog).toHaveClass("astra-dialog-surface");
		expect(
			dialog.querySelector(".astra-dialog-header"),
		).toBeInTheDocument();
		expect(
			dialog.querySelector(".astra-dialog-heading"),
		).toBeInTheDocument();
		expect(title).toHaveTextContent("Rename chat");
		expect(description).toHaveTextContent("Update this chat file.");
		expect(dialog.querySelector(".astra-dialog-body")).toBeInTheDocument();
		expect(screen.getByText("Update this chat file.")).toBeInTheDocument();
		expect(screen.getByText("Rename body")).toBeInTheDocument();
		expect(
			dialog.querySelector(".astra-dialog-primitiveA11yGuard"),
		).toBeNull();
		expectNoDialogTitleWarning(consoleErrorSpy);
	});

	test("applies a stable content id to the desktop dialog surface", () => {
		mockMatchMedia(false);

		render(
			<ResponsiveDialog
				contentId="astra-test-responsive-dialog"
				description="Update this chat file."
				open={true}
				title="Rename chat"
				onOpenChange={() => {}}
			>
				<div>Rename body</div>
			</ResponsiveDialog>,
		);

		expect(
			screen.getByRole("dialog", { name: "Rename chat" }),
		).toHaveAttribute("id", "astra-test-responsive-dialog");
	});

	test("keeps the desktop dialog surface mounted when force mounted while closed", () => {
		mockMatchMedia(false);

		render(
			<ResponsiveDialog
				contentId="astra-test-force-mounted-dialog"
				description="Update this chat file."
				forceMountContent={true}
				open={false}
				title="Rename chat"
				onOpenChange={() => {}}
			>
				<div>Rename body</div>
			</ResponsiveDialog>,
		);

		expect(
			document.getElementById("astra-test-force-mounted-dialog"),
		).toHaveAttribute("data-state", "closed");
	});

	test("keeps the desktop dialog mounted in closed state before notifying the parent", async () => {
		vi.useFakeTimers();
		mockMatchMedia(false);
		const onOpenChange = vi.fn();

		render(
			<ResponsiveDialog
				contentId="astra-test-desktop-delayed-dialog"
				description="Update this chat file."
				open={true}
				title="Rename chat"
				onOpenChange={onOpenChange}
			>
				<div>Rename body</div>
				<ResponsiveDialogCloseButton />
			</ResponsiveDialog>,
		);

		const dialog = screen.getByRole("dialog", { name: "Rename chat" });

		fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

		expect(dialog).toHaveAttribute("data-state", "closed");
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(screen.getByText("Rename body")).toBeInTheDocument();

		await act(async () => {
			vi.advanceTimersByTime(ASTRA_DIALOG_EXIT_MS);
		});

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("preserves shadcn Button metadata when ResponsiveDialogClose uses asChild", () => {
		mockMatchMedia(false);

		render(
			<ResponsiveDialog
				description="Update this chat file."
				open={true}
				title="Rename chat"
				onOpenChange={() => {}}
			>
				<ResponsiveDialogClose asChild={true}>
					<Button size="default" type="button" variant="default">
						Close with button
					</Button>
				</ResponsiveDialogClose>
			</ResponsiveDialog>,
		);

		const closeButton = screen.getByRole("button", {
			name: "Close with button",
		});

		expect(closeButton).toHaveAttribute("data-slot", "dialog-close");
		expect(closeButton).toHaveAttribute("data-variant", "default");
		expect(closeButton).toHaveAttribute("data-size", "default");
		expect(closeButton).toHaveClass("bg-primary");
		expect(closeButton).toHaveClass("text-primary-foreground");
	});

	test("renders the same shared structure inside the Astra drawer on mobile layout", () => {
		mockMatchMedia(true);
		const semanticProps = { id: "semantic-mobile-dialog" };
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		render(
			<ResponsiveDialog
				{...semanticProps}
				description="Update this chat file."
				open={true}
				title="Rename chat"
				onOpenChange={() => {}}
			>
				<div>Rename body</div>
			</ResponsiveDialog>,
		);

		const dialog = screen.getByRole("dialog", { name: "Rename chat" });
		const title = dialog.querySelector(".astra-dialog-title");
		const description = dialog.querySelector(".astra-dialog-description");
		const labelledBy = dialog.getAttribute("aria-labelledby");
		const describedBy = dialog.getAttribute("aria-describedby");
		const radixTitle = getAriaReference(dialog, "aria-labelledby");
		const radixDescription = getAriaReference(
			dialog,
			"aria-describedby",
		);
		const stableTitle = document.getElementById(
			"semantic-mobile-dialog-title",
		);
		const stableDescription = document.getElementById(
			"semantic-mobile-dialog-description",
		);

		expect(dialog).toHaveAttribute("id", "semantic-mobile-dialog");
		expect(labelledBy).not.toBe("semantic-mobile-dialog-title");
		expect(describedBy).not.toBe("semantic-mobile-dialog-description");
		expect(radixTitle).toHaveClass("astra-dialog-title");
		expect(radixDescription).toHaveClass("astra-dialog-description");
		expect(stableTitle).toHaveAttribute(
			"id",
			"semantic-mobile-dialog-title",
		);
		expect(stableDescription).toHaveAttribute(
			"id",
			"semantic-mobile-dialog-description",
		);
		expect(stableTitle).toHaveTextContent("Rename chat");
		expect(stableDescription).toHaveTextContent("Update this chat file.");
		expect(dialog).toHaveClass("astra-drawer-surface");
		expect(dialog).toHaveAttribute("data-vaul-drawer-direction", "bottom");
		expect(
			dialog.querySelector(".astra-dialog-header"),
		).toBeInTheDocument();
		expect(
			dialog.querySelector(".astra-dialog-heading"),
		).toBeInTheDocument();
		expect(title).toHaveTextContent("Rename chat");
		expect(description).toHaveTextContent("Update this chat file.");
		expect(dialog.querySelector(".astra-dialog-body")).toBeInTheDocument();
		expect(
			dialog.querySelector(".astra-dialog-primitiveA11yGuard"),
		).toBeNull();
		expectNoDialogTitleWarning(consoleErrorSpy);
	});

	test("keeps the mobile drawer mounted in closed state before notifying the parent", async () => {
		vi.useFakeTimers();
		mockMatchMedia(true);
		const onOpenChange = vi.fn();

		render(
			<ResponsiveDialog
				contentId="astra-test-mobile-delayed-drawer"
				description="Update this chat file."
				open={true}
				title="Rename chat"
				onOpenChange={onOpenChange}
			>
				<div>Rename body</div>
				<ResponsiveDialogCloseButton />
			</ResponsiveDialog>,
		);

		const dialog = screen.getByRole("dialog", { name: "Rename chat" });

		fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

		expect(dialog).toHaveAttribute("data-state", "closed");
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(screen.getByText("Rename body")).toBeInTheDocument();

		await act(async () => {
			vi.advanceTimersByTime(ASTRA_DIALOG_EXIT_MS);
		});

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("lets callers replace the default heading while preserving dialog semantics", () => {
		mockMatchMedia(true);

		render(
			<ResponsiveDialog
				description="Custom metadata for the selected message."
				id="semantic-custom-heading-dialog"
				open={true}
				renderHeading={({ descriptionNode, titleNode }) => (
					<div className="custom-dialog-heading">
						<div className="custom-dialog-heading__semantic">
							{titleNode}
							{descriptionNode}
						</div>
						<div className="custom-dialog-heading__visible">
							Visible custom heading
						</div>
					</div>
				)}
				title="Message Actions"
				onOpenChange={() => {}}
			>
				<div>Custom heading body</div>
			</ResponsiveDialog>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Message Actions",
		});
		const labelledBy = dialog.getAttribute("aria-labelledby");
		const describedBy = dialog.getAttribute("aria-describedby");
		const radixTitle = getAriaReference(dialog, "aria-labelledby");
		const radixDescription = getAriaReference(
			dialog,
			"aria-describedby",
		);
		const stableTitle = document.getElementById(
			"semantic-custom-heading-dialog-title",
		);
		const stableDescription = document.getElementById(
			"semantic-custom-heading-dialog-description",
		);

		expect(labelledBy).not.toBe(
			"semantic-custom-heading-dialog-title",
		);
		expect(describedBy).not.toBe(
			"semantic-custom-heading-dialog-description",
		);
		expect(radixTitle).toHaveClass("astra-dialog-title");
		expect(radixDescription).toHaveClass("astra-dialog-description");
		expect(
			dialog.querySelector(".custom-dialog-heading"),
		).toBeInTheDocument();
		expect(
			dialog.querySelector(".custom-dialog-heading__visible"),
		).toHaveTextContent("Visible custom heading");
		expect(dialog.querySelector(".astra-dialog-heading")).toBeNull();
		expect(dialog.querySelector(".astra-dialog-icon")).toBeNull();
		expect(dialog.querySelector(".astra-dialog-headingContent")).toBeNull();
		expect(stableTitle).toHaveTextContent("Message Actions");
		expect(stableDescription).toHaveTextContent(
			"Custom metadata for the selected message.",
		);
	});

	test("keeps semantic title and description mounted when the heading is visually hidden", () => {
		mockMatchMedia(false);
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		render(
			<ResponsiveDialog
				description="Hidden heading details."
				hideHeading={true}
				id="hidden-heading-dialog"
				open={true}
				title="Hidden heading title"
				onOpenChange={() => {}}
			>
				<div>Hidden heading body</div>
			</ResponsiveDialog>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Hidden heading title",
		});
		const radixTitle = getAriaReference(dialog, "aria-labelledby");
		const radixDescription = getAriaReference(
			dialog,
			"aria-describedby",
		);

		expect(dialog.querySelector(".astra-dialog-heading")).toBeNull();
		expect(radixTitle.closest(".sr-only")).toBeInTheDocument();
		expect(radixDescription.closest(".sr-only")).toBeInTheDocument();
		expect(
			document.getElementById("hidden-heading-dialog-title"),
		).toHaveTextContent("Hidden heading title");
		expect(
			document.getElementById("hidden-heading-dialog-description"),
		).toHaveTextContent("Hidden heading details.");
		expectNoDialogTitleWarning(consoleErrorSpy);
	});

	test("applies a stable content id to the mobile drawer surface", () => {
		mockMatchMedia(true);

		render(
			<ResponsiveDialog
				contentId="astra-test-responsive-drawer"
				description="Update this chat file."
				open={true}
				title="Rename chat"
				onOpenChange={() => {}}
			>
				<div>Rename body</div>
			</ResponsiveDialog>,
		);

		expect(
			screen.getByRole("dialog", { name: "Rename chat" }),
		).toHaveAttribute("id", "astra-test-responsive-drawer");
	});

	test("renders identity group avatar URLs as a shared collage", () => {
		mockMatchMedia(false);

		render(
			<ResponsiveDialog
				description="Update this chat file."
				identity={{
					avatarUrl: "/thumbs/avatar/hero.png",
					groupAvatarUrls: [
						"/thumbs/avatar/hero.png",
						"/thumbs/avatar/mage.png",
					],
					name: "Party",
				}}
				open={true}
				title="Rename chat"
				onOpenChange={() => {}}
			>
				<div>Rename body</div>
			</ResponsiveDialog>,
		);

		const dialog = screen.getByRole("dialog", { name: "Rename chat" });
		const collage = dialog.querySelector(
			".astra-dialog-identityImage.astra-chat-avatar--collage",
		);

		expect(collage).toBeInTheDocument();
		expect(collage).toHaveAttribute("data-count", "2");
		expect(
			Array.from(
				collage?.querySelectorAll(
					".astra-chat-avatar__collage-image",
				) ?? [],
			).map((image) => image.getAttribute("src")),
		).toEqual(["/thumbs/avatar/hero.png", "/thumbs/avatar/mage.png"]);
	});
});
