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
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import type { CurrentChatInfoSnapshot } from "@/packages/core/st/currentChatInfo";
import { CurrentChatDeleteDialog } from "@/packages/features/chat-session/send-form/main-menu/CurrentChatDeleteDialog";

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

function createIdentitySnapshot(
	overrides: Partial<CurrentChatIdentitySnapshot> = {},
): CurrentChatIdentitySnapshot {
	return {
		avatarSource: "character-thumbnail",
		characterId: 0,
		chatFileName: "chapter-1",
		entityName: "Hero",
		groupAvatarUrls: [],
		groupId: null,
		hasActiveChat: true,
		kind: "character",
		thumbnailUrl: "/thumbs/avatar/hero.png",
		updatedAt: 0,
		...overrides,
	};
}

function createInfoSnapshot(
	overrides: Partial<CurrentChatInfoSnapshot> = {},
): CurrentChatInfoSnapshot {
	return {
		dominantModel: "claude-3.7-sonnet",
		fileSize: "12 KB",
		hasActiveChat: true,
		lastMessagePreview: "The last reply stays visible here.",
		lastUpdatedAt: Date.parse("2026-04-23T10:30:00.000Z"),
		metadataReason: null,
		metadataStatus: "ready",
		messageCount: 128,
		modelCounts: {},
		updatedAt: 0,
		...overrides,
	};
}

describe("CurrentChatDeleteDialog", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: () => "2026/04/23 06:30 PM",
			}),
			translate: (text: string) => text,
		});
	});

	afterEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("renders current chat identity with delete warning and last message preview", async () => {
		render(
			<CurrentChatDeleteDialog
				chatInfoSnapshot={createInfoSnapshot()}
				open={true}
				snapshot={createIdentitySnapshot()}
				onConfirmDelete={vi.fn()}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Delete chat",
		});
		const title = document.getElementById(
			"mobile-chat-main-menu-delete-dialog-title",
		);
		const semanticDescription = document.getElementById(
			"mobile-chat-main-menu-delete-dialog-description",
		);

		expect(dialog).toHaveAttribute(
			"id",
			"mobile-chat-main-menu-delete-dialog",
		);
		const labelledBy = dialog.getAttribute("aria-labelledby");
		const describedBy = dialog.getAttribute("aria-describedby");
		expect(labelledBy).toBeTruthy();
		expect(labelledBy).not.toBe("mobile-chat-main-menu-delete-dialog-title");
		expect(document.getElementById(labelledBy ?? "")).toHaveClass(
			"astra-dialog-title",
		);
		expect(describedBy).toBeTruthy();
		expect(describedBy).not.toBe(
			"mobile-chat-main-menu-delete-dialog-description",
		);
		expect(document.getElementById(describedBy ?? "")).toHaveClass(
			"astra-dialog-description",
		);
		expect(title).toHaveClass("astra-dialog-title");
		expect(semanticDescription).toHaveClass("astra-dialog-description");
		expect(within(dialog).getByText("Hero")).toBeInTheDocument();
		expect(
			within(dialog).getByLabelText("Messages: 128"),
		).toBeInTheDocument();
		expect(
			within(dialog).getByLabelText("File size: 12 KB"),
		).toBeInTheDocument();
		const description = dialog.querySelector(".astra-dialog-description");
		expect(description).toHaveTextContent("Permanently delete chapter-1.");
		expect(
			description?.querySelector(
				".astra-dialog-current-chat-file-description",
			),
		).toBeInTheDocument();
		const currentFileName = dialog.querySelector(
			".astra-dialog-current-chat-file-name",
		);
		expect(currentFileName).toHaveTextContent("chapter-1");
		expect(
			within(dialog).getByText("This action cannot be undone."),
		).toBeInTheDocument();
		expect(within(dialog).getByText("Last updated")).toBeInTheDocument();
		expect(
			within(dialog).getByText("2026/04/23 06:30 PM"),
		).toBeInTheDocument();
		expect(within(dialog).getByText("Last message")).toBeInTheDocument();
		expect(
			within(dialog).getByText("The last reply stays visible here."),
		).toBeInTheDocument();
		expect(within(dialog).queryByText("Chat file")).not.toBeInTheDocument();
		const footer = dialog.querySelector(
			".astra-chat-library-dialog-footer--delete",
		);
		expect(footer).toBeInTheDocument();
		expect(
			footer?.querySelector(".astra-chat-library-dialog-footer-actions"),
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Delete chat" }),
		).toHaveAttribute("data-variant", "ghost");
		expect(
			within(dialog).getByRole("button", { name: "Close" }),
		).toHaveAttribute("data-variant", "default");
	});

	test("renders a current group chat identity as a member collage", async () => {
		render(
			<CurrentChatDeleteDialog
				chatInfoSnapshot={createInfoSnapshot()}
				open={true}
				snapshot={createIdentitySnapshot({
					avatarSource: "group-member-thumbnail",
					characterId: null,
					chatFileName: "campfire",
					entityName: "Party",
					groupAvatarUrls: [
						"/thumbs/avatar/hero.png",
						"/thumbs/avatar/mage.png",
					],
					groupId: "party",
					kind: "group",
					thumbnailUrl: "/thumbs/avatar/hero.png",
				})}
				onConfirmDelete={vi.fn()}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Delete chat",
		});
		const collage = dialog.querySelector(
			".astra-dialog-identityImage.astra-chat-avatar--collage",
		);
		const images = Array.from(
			collage?.querySelectorAll(".astra-chat-avatar__collage-image") ??
				[],
		);

		expect(collage).toBeInTheDocument();
		expect(collage).toHaveAttribute("data-count", "2");
		expect(images.map((image) => image.getAttribute("src"))).toEqual([
			"/thumbs/avatar/hero.png",
			"/thumbs/avatar/mage.png",
		]);
	});

	test("passes the frozen chat file name when confirming delete", async () => {
		const onConfirmDelete = vi.fn().mockResolvedValue({ ok: true });
		const onOpenChange = vi.fn();

		render(
			<CurrentChatDeleteDialog
				chatInfoSnapshot={createInfoSnapshot()}
				open={true}
				snapshot={createIdentitySnapshot()}
				onConfirmDelete={onConfirmDelete}
				onOpenChange={onOpenChange}
			/>,
		);

		fireEvent.click(
			await screen.findByRole("button", { name: "Delete chat" }),
		);

		await waitFor(() => {
			expect(onConfirmDelete).toHaveBeenCalledWith("chapter-1");
		});
		await waitFor(() => {
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
