import { describe, expect, test, vi } from "vitest";

import { createUnstableChatCatalogInternals } from "@/packages/core/st/chat-catalog/unstable-st-internals";

describe("unstable chat catalog SillyTavern internals", () => {
	test("returns api-unavailable and warns once when the core module import fails", async () => {
		const warn = vi.fn();
		const internals = createUnstableChatCatalogInternals({
			loadCoreModule: vi.fn().mockRejectedValue(new Error("missing")),
			warn,
		});

		await expect(
			internals.renameChat({
				entityId: "0",
				kind: "character",
				newName: "chapter-2",
				oldName: "chapter-1",
			}),
		).resolves.toEqual({
			ok: false,
			reason: "api-unavailable",
		});
		await expect(
			internals.renameChat({
				entityId: "0",
				kind: "character",
				newName: "chapter-3",
				oldName: "chapter-1",
			}),
		).resolves.toEqual({
			ok: false,
			reason: "api-unavailable",
		});

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain(
			"renameGroupOrCharacterChat",
		);
	});

	test("returns api-unavailable and includes CLIENT_VERSION when a core capability is missing", async () => {
		const warn = vi.fn();
		const internals = createUnstableChatCatalogInternals({
			loadCoreModule: vi.fn().mockResolvedValue({
				CLIENT_VERSION: "SillyTavern:1.2.3:test",
			}),
			warn,
		});

		await expect(
			internals.renameChat({
				entityId: "0",
				kind: "character",
				newName: "chapter-2",
				oldName: "chapter-1",
			}),
		).resolves.toEqual({
			ok: false,
			reason: "api-unavailable",
		});

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain(
			"SillyTavern:1.2.3:test",
		);
	});

	test("renames character chats and updates the remote character chat pointer", async () => {
		const renameGroupOrCharacterChat = vi
			.fn()
			.mockResolvedValue(undefined);
		const updateRemoteChatName = vi.fn().mockResolvedValue(undefined);
		const internals = createUnstableChatCatalogInternals({
			loadCoreModule: vi.fn().mockResolvedValue({
				renameGroupOrCharacterChat,
				updateRemoteChatName,
			}),
		});

		await expect(
			internals.renameChat({
				characterId: 0,
				entityId: "0",
				kind: "character",
				newName: "chapter-2",
				oldName: "chapter-1",
			}),
		).resolves.toEqual({
			ok: true,
		});

		expect(renameGroupOrCharacterChat).toHaveBeenCalledWith({
			characterId: "0",
			groupId: undefined,
			loader: false,
			newFileName: "chapter-2",
			oldFileName: "chapter-1",
		});
		expect(updateRemoteChatName).toHaveBeenCalledWith(0, "chapter-2");
	});

	test("renames group chats through the core capability wrapper", async () => {
		const renameGroupOrCharacterChat = vi
			.fn()
			.mockResolvedValue(undefined);
		const internals = createUnstableChatCatalogInternals({
			loadCoreModule: vi.fn().mockResolvedValue({
				renameGroupOrCharacterChat,
			}),
		});

		await expect(
			internals.renameChat({
				entityId: "party",
				kind: "group",
				newName: "campfire-2",
				oldName: "campfire",
			}),
		).resolves.toEqual({
			ok: true,
		});

		expect(renameGroupOrCharacterChat).toHaveBeenCalledWith({
			characterId: undefined,
			groupId: "party",
			loader: false,
			newFileName: "campfire-2",
			oldFileName: "campfire",
		});
	});

	test("deletes character and group chats through capability wrappers", async () => {
		const deleteCharacterChatByName = vi.fn().mockResolvedValue(undefined);
		const deleteGroupChatByName = vi.fn().mockResolvedValue(undefined);
		const internals = createUnstableChatCatalogInternals({
			loadCoreModule: vi.fn().mockResolvedValue({
				deleteCharacterChatByName,
			}),
			loadGroupModule: vi.fn().mockResolvedValue({
				deleteGroupChatByName,
			}),
		});

		await expect(
			internals.deleteChat({
				chatId: "chapter-1",
				entityId: "0",
				kind: "character",
			}),
		).resolves.toEqual({
			ok: true,
		});
		await expect(
			internals.deleteChat({
				chatId: "campfire",
				entityId: "party",
				kind: "group",
			}),
		).resolves.toEqual({
			ok: true,
		});

		expect(deleteCharacterChatByName).toHaveBeenCalledWith(
			"0",
			"chapter-1",
		);
		expect(deleteGroupChatByName).toHaveBeenCalledWith("party", "campfire");
	});
});
