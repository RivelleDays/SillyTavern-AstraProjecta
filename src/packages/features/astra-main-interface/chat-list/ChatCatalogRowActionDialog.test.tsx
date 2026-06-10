import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import type { ChatCatalogEntry } from "@/packages/core/st/chat-catalog";
import { ChatCatalogRowActionDialog } from "@/packages/features/astra-main-interface/chat-list/ChatCatalogRowActionDialog";

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

function createEntry(
	overrides: Partial<ChatCatalogEntry> = {},
): ChatCatalogEntry {
	return {
		avatarUrl: "/thumbs/avatar/hero.png",
		chatId: "chapter-1",
		entityId: "0",
		entityName: "Hero",
		fileName: "chapter-1.jsonl",
		fileSize: "12 KB",
		key: "character:0:chapter-1",
		kind: "character",
		lastMessageAt: Date.parse("2026-05-01T10:00:00.000Z"),
		lastMessageLabel: "2026/05/01 10:00 AM",
		lastMessagePreview: "Hero preview",
		messageCount: 4,
		...overrides,
	};
}

describe("ChatCatalogRowActionDialog", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
	});

	afterEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("uses semantic ids for the row action overlay and rename input", async () => {
		render(
			<ChatCatalogRowActionDialog
				action={{ entry: createEntry(), mode: "rename" }}
				onConfirmDelete={vi.fn()}
				onConfirmRename={vi.fn()}
				onOpenChange={vi.fn()}
				onSuccess={vi.fn()}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Rename chat",
		});
		const title = document.getElementById(
			"astra-main-interface-chat-row-action-dialog-title",
		);
		const description = document.getElementById(
			"astra-main-interface-chat-row-action-dialog-description",
		);
		const input = screen.getByRole("textbox", { name: "New chat name" });

		expect(dialog).toHaveAttribute(
			"id",
			"astra-main-interface-chat-row-action-dialog",
		);
		const labelledBy = dialog.getAttribute("aria-labelledby");
		const describedBy = dialog.getAttribute("aria-describedby");
		expect(labelledBy).toBeTruthy();
		expect(labelledBy).not.toBe(
			"astra-main-interface-chat-row-action-dialog-title",
		);
		expect(document.getElementById(labelledBy ?? "")).toHaveClass(
			"astra-dialog-title",
		);
		expect(describedBy).toBeTruthy();
		expect(describedBy).not.toBe(
			"astra-main-interface-chat-row-action-dialog-description",
		);
		expect(document.getElementById(describedBy ?? "")).toHaveClass(
			"astra-dialog-description",
		);
		expect(title).toHaveClass("astra-dialog-title");
		expect(description).toHaveClass("astra-dialog-description");
		expect(input).toHaveAttribute(
			"id",
			"astra-main-interface-chat-row-action-dialog-rename-input",
		);
	});
});
