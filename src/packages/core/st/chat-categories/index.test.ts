import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	CHAT_CATEGORIES_CHANGE_EVENT,
	createChatCategoryStore,
	type ChatCategory,
} from "@/packages/core/st/chat-categories";

function setSillyTavernContext(context: Record<string, unknown>) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function createContext(overrides: Record<string, unknown> = {}) {
	return {
		extensionSettings: {},
		saveSettingsDebounced: vi.fn(),
		...overrides,
	};
}

function categorySummary(category: ChatCategory) {
	return {
		id: category.id,
		name: category.name,
		ownerId: category.ownerId,
		ownerType: category.ownerType,
		scope: category.scope,
	};
}

describe("chat category store", () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("creates global and owner categories in separate scopes", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const changeListener = vi.fn();
		window.addEventListener(CHAT_CATEGORIES_CHANGE_EVENT, changeListener);
		const store = createChatCategoryStore({
			createId: vi
				.fn()
				.mockReturnValueOnce("cat_global")
				.mockReturnValueOnce("cat_owner"),
		});

		const globalResult = store.createCategory({
			name: "Plot",
			scope: "global",
		});
		const ownerResult = store.createCategory({
			name: "Plot",
			ownerId: "0",
			ownerType: "character",
			scope: "owner",
		});

		expect(globalResult).toEqual({
			category: expect.objectContaining({
				id: "cat_global",
				name: "Plot",
				nameKey: "plot",
				ownerId: null,
				ownerType: null,
				scope: "global",
			}),
			ok: true,
		});
		expect(ownerResult).toEqual({
			category: expect.objectContaining({
				id: "cat_owner",
				name: "Plot",
				nameKey: "plot",
				ownerId: "0",
				ownerType: "character",
				scope: "owner",
			}),
			ok: true,
		});
		expect(
			store.createCategory({
				name: "plot",
				scope: "global",
			}),
		).toEqual({
			category: expect.objectContaining({
				id: "cat_global",
			}),
			ok: false,
			reason: "duplicate",
		});
		expect(
			store.getVisibleCategories({
				ownerId: "0",
				ownerType: "character",
			}),
		).toEqual({
			all: [
				expect.objectContaining({ id: "cat_owner" }),
				expect.objectContaining({ id: "cat_global" }),
			],
			global: [expect.objectContaining({ id: "cat_global" })],
			owner: [expect.objectContaining({ id: "cat_owner" })],
		});
		expect(store.getSnapshot().categories.map(categorySummary)).toEqual([
			{
				id: "cat_global",
				name: "Plot",
				ownerId: null,
				ownerType: null,
				scope: "global",
			},
			{
				id: "cat_owner",
				name: "Plot",
				ownerId: "0",
				ownerType: "character",
				scope: "owner",
			},
		]);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(2);
		expect(changeListener).toHaveBeenCalledTimes(2);

		window.removeEventListener(
			CHAT_CATEGORIES_CHANGE_EVENT,
			changeListener,
		);
	});

	test("accepts explicit null owner fields for global scope input", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatCategoryStore({
			createId: vi.fn().mockReturnValueOnce("cat_global"),
		});

		const result = store.createCategory({
			name: "Shared Plot",
			ownerId: null,
			ownerType: null,
			scope: "global",
		});

		expect(result).toEqual({
			category: expect.objectContaining({
				id: "cat_global",
				name: "Shared Plot",
				ownerId: null,
				ownerType: null,
				scope: "global",
			}),
			ok: true,
		});
		expect(
			store.getVisibleCategories().global.map(categorySummary),
		).toEqual([
			{
				id: "cat_global",
				name: "Shared Plot",
				ownerId: null,
				ownerType: null,
				scope: "global",
			},
		]);
	});

	test("validates category names before creating or renaming", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatCategoryStore({
			createId: vi.fn().mockReturnValueOnce("cat_unicode"),
		});
		const longName = "a".repeat(65);

		expect(
			store.createCategory({
				name: "  劇情 🌟  ",
				scope: "global",
			}),
		).toEqual({
			category: expect.objectContaining({
				id: "cat_unicode",
				name: "劇情 🌟",
				nameKey: "劇情 🌟",
			}),
			ok: true,
		});
		expect(
			store.createCategory({
				name: longName,
				scope: "global",
			}),
		).toEqual({
			ok: false,
			reason: "invalid-name",
		});
		expect(
			store.createCategory({
				name: "Bad\nName",
				scope: "global",
			}),
		).toEqual({
			ok: false,
			reason: "invalid-name",
		});
		expect(store.renameCategory("cat_unicode", longName)).toEqual({
			ok: false,
			reason: "invalid-name",
		});
		expect(store.getVisibleCategories().global).toEqual([
			expect.objectContaining({
				id: "cat_unicode",
				name: "劇情 🌟",
			}),
		]);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(1);
	});

	test("tracks chat memberships and category chat order", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatCategoryStore({
			createId: vi
				.fn()
				.mockReturnValueOnce("cat_a")
				.mockReturnValueOnce("cat_b"),
		});

		store.createCategory({ name: "A", scope: "global" });
		store.createCategory({ name: "B", scope: "global" });

		expect(
			store.setChatCategoryIds("character:0:chapter-1", [
				"cat_a",
				"cat_b",
				"cat_a",
				"missing",
			]),
		).toBe(true);
		expect(store.getChatCategoryIds("character:0:chapter-1")).toEqual([
			"cat_a",
			"cat_b",
		]);
		expect(store.getCategoryChatKeys("cat_a")).toEqual([
			"character:0:chapter-1",
		]);

		expect(
			store.toggleChatCategory("character:0:chapter-2", "cat_a", true),
		).toBe(true);
		expect(
			store.setCategoryChatOrder("cat_a", [
				"character:0:chapter-2",
				"character:0:chapter-1",
			]),
		).toEqual(["character:0:chapter-2", "character:0:chapter-1"]);
		expect(store.getCategoryChatKeys("cat_a")).toEqual([
			"character:0:chapter-2",
			"character:0:chapter-1",
		]);

		expect(
			store.toggleChatCategory("character:0:chapter-1", "cat_a", false),
		).toBe(true);
		expect(store.getChatCategoryIds("character:0:chapter-1")).toEqual([
			"cat_b",
		]);
		expect(store.getCategoryChatKeys("cat_a")).toEqual([
			"character:0:chapter-2",
		]);
	});

	test("renames and deletes categories while preserving valid membership", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatCategoryStore({
			createId: vi
				.fn()
				.mockReturnValueOnce("cat_a")
				.mockReturnValueOnce("cat_b"),
		});
		store.createCategory({ name: "A", scope: "global" });
		store.createCategory({ name: "B", scope: "global" });
		store.setChatCategoryIds("character:0:chapter-1", ["cat_a", "cat_b"]);

		expect(store.renameCategory("cat_a", "Archive")).toEqual({
			category: expect.objectContaining({
				id: "cat_a",
				name: "Archive",
				nameKey: "archive",
			}),
			ok: true,
		});
		expect(store.renameCategory("cat_a", "B")).toEqual({
			category: expect.objectContaining({ id: "cat_b" }),
			ok: false,
			reason: "duplicate",
		});
		expect(store.deleteCategory("cat_b")).toBe(true);

		expect(store.getChatCategoryIds("character:0:chapter-1")).toEqual([
			"cat_a",
		]);
		expect(store.getVisibleCategories()).toEqual({
			all: [expect.objectContaining({ id: "cat_a", name: "Archive" })],
			global: [expect.objectContaining({ id: "cat_a", name: "Archive" })],
			owner: [],
		});
	});

	test("moves and removes chat keys after chat rename and delete actions", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatCategoryStore({
			createId: vi.fn().mockReturnValueOnce("cat_a"),
		});
		store.createCategory({ name: "A", scope: "global" });
		store.setChatCategoryIds("character:0:old-name", ["cat_a"]);

		expect(
			store.moveChatKey("character:0:old-name", "character:0:new-name"),
		).toBe(true);
		expect(store.getChatCategoryIds("character:0:old-name")).toEqual([]);
		expect(store.getChatCategoryIds("character:0:new-name")).toEqual([
			"cat_a",
		]);
		expect(store.getCategoryChatKeys("cat_a")).toEqual([
			"character:0:new-name",
		]);

		expect(store.removeChatKey("character:0:new-name")).toBe(true);
		expect(store.getChatCategoryIds("character:0:new-name")).toEqual([]);
		expect(store.getCategoryChatKeys("cat_a")).toEqual([]);
	});

	test("reorders categories within one scope only", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatCategoryStore({
			createId: vi
				.fn()
				.mockReturnValueOnce("cat_global_a")
				.mockReturnValueOnce("cat_global_b")
				.mockReturnValueOnce("cat_owner_a")
				.mockReturnValueOnce("cat_owner_b")
				.mockReturnValueOnce("cat_other_owner"),
		});
		store.createCategory({ name: "Global A", scope: "global" });
		store.createCategory({ name: "Global B", scope: "global" });
		store.createCategory({
			name: "Owner A",
			ownerId: "0",
			ownerType: "character",
			scope: "owner",
		});
		store.createCategory({
			name: "Owner B",
			ownerId: "0",
			ownerType: "character",
			scope: "owner",
		});
		store.createCategory({
			name: "Other Owner",
			ownerId: "1",
			ownerType: "character",
			scope: "owner",
		});

		expect(
			store.setCategoryOrder({ scope: "global" }, [
				"cat_global_b",
				"cat_owner_a",
				"missing",
			]),
		).toEqual(["cat_global_b", "cat_global_a"]);
		expect(store.getVisibleCategories().global.map((entry) => entry.id))
			.toEqual(["cat_global_b", "cat_global_a"]);

		expect(
			store.setCategoryOrder(
				{
					ownerId: "0",
					ownerType: "character",
					scope: "owner",
				},
				["cat_owner_b", "cat_other_owner"],
			),
		).toEqual(["cat_owner_b", "cat_owner_a"]);
		expect(
			store
				.getVisibleCategories({
					ownerId: "0",
					ownerType: "character",
				})
				.owner.map((entry) => entry.id),
		).toEqual(["cat_owner_b", "cat_owner_a"]);
		expect(
			store
				.getVisibleCategories({
					ownerId: "1",
					ownerType: "character",
				})
				.owner.map((entry) => entry.id),
		).toEqual(["cat_other_owner"]);
	});

	test("does not write settings when category reorder scope is invalid", () => {
		const context = createContext();
		setSillyTavernContext(context);
		const store = createChatCategoryStore({
			createId: vi.fn().mockReturnValueOnce("cat_global"),
		});
		store.createCategory({ name: "Global", scope: "global" });
		const savesAfterCreate = context.saveSettingsDebounced.mock.calls.length;

		expect(
			store.setCategoryOrder(
				{
					ownerId: "0",
					ownerType: "invalid",
					scope: "owner",
				} as never,
				["cat_global"],
			),
		).toEqual([]);
		expect(context.saveSettingsDebounced).toHaveBeenCalledTimes(
			savesAfterCreate,
		);
	});

	test("normalizes malformed persisted state safely", () => {
		const context = createContext({
			extensionSettings: {
				astra_projecta: {
					chatCategories: {
						categories: {
							byId: {
								empty: {
									id: "empty",
									name: "",
									scope: "global",
								},
								global: {
									id: "global",
									name: "Global",
									scope: "global",
								},
								tooLong: {
									id: "tooLong",
									name: "x".repeat(65),
									scope: "global",
								},
								control: {
									id: "control",
									name: "Bad\u0007Name",
									scope: "global",
								},
								owner: {
									id: "owner",
									name: "Owner",
									ownerId: 0,
									ownerType: "character",
									scope: "owner",
								},
								brokenOwner: {
									id: "brokenOwner",
									name: "Broken",
									scope: "owner",
								},
							},
							chatOrder: {
								global: [
									"chat:two",
									"chat:one",
									"chat:bad",
									"missing",
								],
								missing: ["chat:lost"],
							},
							order: {
								global: [
									"tooLong",
									"missing",
									"global",
									"global",
									"control",
								],
								owner: {
									"character:0": ["owner", "missing"],
									invalid: ["brokenOwner"],
								},
							},
						},
						chatMap: {
							"chat:one": [
								"global",
								"owner",
								"global",
								"missing",
							],
							"chat:two": ["global"],
							"chat:bad": ["tooLong", "control"],
							"chat:lost": ["missing"],
						},
						version: 1,
					},
				},
			},
		});
		setSillyTavernContext(context);

		const store = createChatCategoryStore();

		expect(store.getSnapshot().categories.map(categorySummary)).toEqual([
			{
				id: "global",
				name: "Global",
				ownerId: null,
				ownerType: null,
				scope: "global",
			},
			{
				id: "owner",
				name: "Owner",
				ownerId: "0",
				ownerType: "character",
				scope: "owner",
			},
		]);
		expect(store.getChatCategoryIds("chat:one")).toEqual([
			"global",
			"owner",
		]);
		expect(store.getCategoryChatKeys("global")).toEqual([
			"chat:two",
			"chat:one",
		]);
		expect(
			store
				.getVisibleCategories({ ownerId: "0", ownerType: "character" })
				.all.map((category) => category.id),
		).toEqual(["owner", "global"]);
	});
});
