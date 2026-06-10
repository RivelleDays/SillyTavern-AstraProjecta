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
import { CurrentChatRenameDialog } from "@/packages/features/chat-session/send-form/main-menu/CurrentChatRenameDialog";

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
		lastMessagePreview: "Reply 3",
		lastUpdatedAt: Date.parse("2026-04-23T10:30:00.000Z"),
		metadataReason: null,
		metadataStatus: "ready",
		messageCount: 128,
		modelCounts: {},
		updatedAt: 0,
		...overrides,
	};
}

describe("CurrentChatRenameDialog", () => {
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

	test("renders current chat identity and a simple rename body without meta rows", async () => {
		render(
			<CurrentChatRenameDialog
				chatInfoSnapshot={createInfoSnapshot()}
				open={true}
				snapshot={createIdentitySnapshot()}
				onConfirmRename={vi.fn()}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Rename chat",
		});
		const title = document.getElementById(
			"mobile-chat-main-menu-rename-dialog-title",
		);
		const semanticDescription = document.getElementById(
			"mobile-chat-main-menu-rename-dialog-description",
		);

		expect(dialog).toHaveAttribute(
			"id",
			"mobile-chat-main-menu-rename-dialog",
		);
		const labelledBy = dialog.getAttribute("aria-labelledby");
		const describedBy = dialog.getAttribute("aria-describedby");
		expect(labelledBy).toBeTruthy();
		expect(labelledBy).not.toBe("mobile-chat-main-menu-rename-dialog-title");
		expect(document.getElementById(labelledBy ?? "")).toHaveClass(
			"astra-dialog-title",
		);
		expect(describedBy).toBeTruthy();
		expect(describedBy).not.toBe(
			"mobile-chat-main-menu-rename-dialog-description",
		);
		expect(document.getElementById(describedBy ?? "")).toHaveClass(
			"astra-dialog-description",
		);
		expect(title).toHaveClass("astra-dialog-title");
		expect(semanticDescription).toHaveClass("astra-dialog-description");
		expect(
			dialog.querySelector(".astra-dialog-header"),
		).toBeInTheDocument();
		expect(
			dialog.querySelector(".astra-dialog-heading"),
		).toBeInTheDocument();
		expect(dialog.querySelector(".astra-dialog-body")).toBeInTheDocument();
		expect(
			dialog.querySelector(".astra-dialog-footer"),
		).toBeInTheDocument();
		expect(within(dialog).getByText("Hero")).toBeInTheDocument();
		expect(
			within(dialog).getByLabelText("Messages: 128"),
		).toBeInTheDocument();
		expect(
			within(dialog).getByLabelText("File size: 12 KB"),
		).toBeInTheDocument();
		const description = dialog.querySelector(".astra-dialog-description");
		expect(description).toHaveTextContent(
			"Update the chat file name for chapter-1.",
		);
		expect(
			description?.querySelector(
				".astra-dialog-current-chat-file-description",
			),
		).toBeInTheDocument();
		const currentFileName = dialog.querySelector(
			".astra-dialog-current-chat-file-name",
		);
		expect(currentFileName).toHaveTextContent("chapter-1");
		expect(dialog.querySelector("code")).not.toBeInTheDocument();
		expect(dialog.querySelector("bdi")).not.toBeInTheDocument();
		expect(
			dialog.querySelector(".astra-chat-library-dialog-meta"),
		).not.toBeInTheDocument();
		expect(
			within(dialog).queryByText("2026/04/23 06:30 PM"),
		).not.toBeInTheDocument();
		expect(
			within(dialog).getByRole("textbox", { name: "New chat name" }),
		).toHaveAttribute("id", "mobile-chat-main-menu-rename-dialog-input");
		expect(
			within(dialog).getByRole("textbox", { name: "New chat name" }),
		).toHaveValue("chapter-1");
	});

	test("renders a current group chat identity as a member collage", async () => {
		render(
			<CurrentChatRenameDialog
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
				onConfirmRename={vi.fn()}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Rename chat",
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

	test("normalizes a trailing jsonl extension before confirming rename", async () => {
		const onConfirmRename = vi.fn().mockResolvedValue({ ok: true });

		render(
			<CurrentChatRenameDialog
				chatInfoSnapshot={createInfoSnapshot()}
				open={true}
				snapshot={createIdentitySnapshot()}
				onConfirmRename={onConfirmRename}
				onOpenChange={() => {}}
			/>,
		);

		const input = await screen.findByRole("textbox", {
			name: "New chat name",
		});
		const confirm = screen.getByRole("button", { name: "Rename chat" });

		expect(confirm).toBeDisabled();
		fireEvent.change(input, { target: { value: "chapter-2.jsonl" } });
		expect(confirm).not.toBeDisabled();
		fireEvent.click(confirm);

		await waitFor(() => {
			expect(onConfirmRename).toHaveBeenCalledWith({
				newFileName: "chapter-2",
				oldFileName: "chapter-1",
			});
		});
	});
});
