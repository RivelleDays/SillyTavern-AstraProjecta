import { describe, expect, test } from "vitest";

import {
	CHAT_CATEGORY_PAGE_SIZE,
	CHAT_ROW_CATEGORY_DRAWER_CREATE_INPUT_ID,
	CHAT_ROW_CATEGORY_DRAWER_ID,
	CHAT_ROW_CATEGORY_DRAWER_SCROLLABLE_CONTENT_ID,
	CategoryTreeActionsGroup,
	ChatCategoryAssignmentDrawer,
	ChatCategoryManagerPage,
	GLOBAL_CATEGORY_DELETE_DRAWER_ID,
	GLOBAL_CATEGORY_RENAME_DRAWER_ID,
	GLOBAL_CATEGORY_RENAME_DRAWER_INPUT_ID,
	GLOBAL_CATEGORY_TREE_INDENT,
	useChatCategoryStore,
} from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryUi";
import { CategoryActionDrawer } from "@/packages/features/astra-main-interface/chat-categories/CategoryActionDrawer";
import { ChatCategoryCreateRow } from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryCreateRow";
import { ChatCategoryTree } from "@/packages/features/astra-main-interface/chat-categories/CategoryTree";

describe("ChatCategoryUi public contract", () => {
	test("keeps the facade exports stable", () => {
		expect(CHAT_CATEGORY_PAGE_SIZE).toBe(50);
		expect(GLOBAL_CATEGORY_TREE_INDENT).toBe(20);
		expect(CHAT_ROW_CATEGORY_DRAWER_ID).toBe(
			"astra-main-interface-chat-category-drawer",
		);
		expect(CHAT_ROW_CATEGORY_DRAWER_SCROLLABLE_CONTENT_ID).toBe(
			"astra-main-interface-chat-category-drawer-scrollable-content",
		);
		expect(CHAT_ROW_CATEGORY_DRAWER_CREATE_INPUT_ID).toBe(
			"astra-main-interface-chat-category-drawer-create-input",
		);
		expect(GLOBAL_CATEGORY_RENAME_DRAWER_ID).toBe(
			"astra-main-interface-global-category-rename-drawer",
		);
		expect(GLOBAL_CATEGORY_DELETE_DRAWER_ID).toBe(
			"astra-main-interface-global-category-delete-drawer",
		);
		expect(GLOBAL_CATEGORY_RENAME_DRAWER_INPUT_ID).toBe(
			"astra-main-interface-global-category-rename-drawer-input",
		);
		expect(typeof ChatCategoryManagerPage).toBe("function");
		expect(typeof ChatCategoryAssignmentDrawer).toBe("function");
		expect(typeof CategoryTreeActionsGroup).toBe("function");
		expect(typeof useChatCategoryStore).toBe("function");
	});

	test("keeps the split module entrypoints available to the facade", () => {
		expect(typeof CategoryActionDrawer).toBe("function");
		expect(typeof ChatCategoryCreateRow).toBe("function");
		expect(typeof ChatCategoryTree).toBe("function");
	});
});
