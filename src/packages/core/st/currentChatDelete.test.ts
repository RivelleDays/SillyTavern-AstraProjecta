import { afterEach, describe, expect, test, vi } from "vitest";

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("deleteCurrentChat", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
		vi.useRealTimers();
	});

	test("deletes the active character chat and opens the latest remaining chat", async () => {
		const openCharacterChat = vi.fn().mockResolvedValue(undefined);
		const emit = vi.fn().mockResolvedValue(undefined);
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
			})
			.mockResolvedValueOnce({
				json: async () => [
					{
						file_name: "chapter-1.jsonl",
						last_mes: "2026-04-22T09:00:00.000Z",
					},
					{
						file_name: "chapter-3.jsonl",
						last_mes: "2026-04-24T09:00:00.000Z",
					},
				],
				ok: true,
			});

		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-2",
					name: "Hero",
				},
			],
			chatId: "chapter-2",
			eventSource: {
				emit,
			},
			eventTypes: {
				CHAT_DELETED: "chat_deleted",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: null,
			openCharacterChat,
		});

		const { deleteCurrentChat } =
			await import("@/packages/core/st/currentChatDelete");

		await expect(
			deleteCurrentChat({
				expectedFileName: "chapter-2",
				fetchImpl,
			}),
		).resolves.toEqual({
			deletedFileName: "chapter-2",
			ok: true,
			replacementFileName: "chapter-3",
			scope: "character",
		});

		expect(fetchImpl).toHaveBeenNthCalledWith(1, "/api/chats/delete", {
			body: JSON.stringify({
				avatar_url: "hero.png",
				chatfile: "chapter-2.jsonl",
			}),
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			},
			method: "POST",
		});
		expect(fetchImpl).toHaveBeenNthCalledWith(2, "/api/characters/chats", {
			body: JSON.stringify({
				avatar_url: "hero.png",
			}),
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			},
			method: "POST",
		});
		expect(openCharacterChat).toHaveBeenCalledWith("chapter-3");
		expect(emit).toHaveBeenCalledWith("chat_deleted", "chapter-2");
	});

	test("deletes the last active character chat and opens a generated replacement chat", async () => {
		const openCharacterChat = vi.fn().mockResolvedValue(undefined);
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
			})
			.mockResolvedValueOnce({
				json: async () => [],
				ok: true,
			});

		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
			],
			chatId: "chapter-1",
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: null,
			openCharacterChat,
		});

		const { deleteCurrentChat } =
			await import("@/packages/core/st/currentChatDelete");

		const result = await deleteCurrentChat({
			expectedFileName: "chapter-1",
			fetchImpl,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.deletedFileName).toBe("chapter-1");
		expect(result.scope).toBe("character");
		expect(result.replacementFileName).toMatch(
			/^\d{4}-\d{2}-\d{2}@\d{2}h\d{2}m\d{2}s\d{3}ms$/,
		);
		expect(openCharacterChat).toHaveBeenCalledWith(
			result.replacementFileName,
		);
	});

	test("deletes the active group chat and opens the last remaining group chat", async () => {
		const openGroupChat = vi.fn().mockResolvedValue(undefined);
		const emit = vi.fn().mockResolvedValue(undefined);
		const fetchImpl = vi.fn().mockResolvedValue({
			ok: true,
		});

		setSillyTavernContext({
			chatId: "raid-2",
			eventSource: {
				emit,
			},
			eventTypes: {
				GROUP_CHAT_DELETED: "group_chat_deleted",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "raid-2",
					chats: ["raid-1", "raid-2"],
					id: "group-1",
				},
			],
			openGroupChat,
		});

		const { deleteCurrentChat } =
			await import("@/packages/core/st/currentChatDelete");

		await expect(
			deleteCurrentChat({
				expectedFileName: "raid-2",
				fetchImpl,
			}),
		).resolves.toEqual({
			deletedFileName: "raid-2",
			ok: true,
			replacementFileName: "raid-1",
			scope: "group",
		});

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(fetchImpl).toHaveBeenCalledWith("/api/chats/group/delete", {
			body: JSON.stringify({
				id: "raid-2",
			}),
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			},
			method: "POST",
		});
		expect(openGroupChat).toHaveBeenCalledWith("group-1", "raid-1");
		expect(emit).toHaveBeenCalledWith("group_chat_deleted", "raid-2");
	});

	test("deletes the last active group chat, persists a replacement chat, and opens it", async () => {
		const openGroupChat = vi.fn().mockResolvedValue(undefined);
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
			})
			.mockResolvedValueOnce({
				ok: true,
			});

		setSillyTavernContext({
			chatId: "raid-2",
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "raid-2",
					chats: ["raid-2"],
					id: "group-1",
					name: "Raid Night",
				},
			],
			openGroupChat,
		});

		const { deleteCurrentChat } =
			await import("@/packages/core/st/currentChatDelete");

		const result = await deleteCurrentChat({
			expectedFileName: "raid-2",
			fetchImpl,
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.scope).toBe("group");
		expect(result.replacementFileName).toMatch(
			/^\d{4}-\d{2}-\d{2}@\d{2}h\d{2}m\d{2}s\d{3}ms$/,
		);
		expect(fetchImpl).toHaveBeenNthCalledWith(2, "/api/groups/edit", {
			body: JSON.stringify({
				chat_id: result.replacementFileName,
				chats: [result.replacementFileName],
				id: "group-1",
				name: "Raid Night",
			}),
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			},
			method: "POST",
		});
		expect(openGroupChat).toHaveBeenCalledWith(
			"group-1",
			result.replacementFileName,
		);
	});

	test("returns chat-changed when the dialog target no longer matches the active chat", async () => {
		const fetchImpl = vi.fn();

		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-2",
					name: "Hero",
				},
			],
			chatId: "chapter-2",
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: null,
			openCharacterChat: vi.fn(),
		});

		const { deleteCurrentChat } =
			await import("@/packages/core/st/currentChatDelete");

		await expect(
			deleteCurrentChat({
				expectedFileName: "chapter-1",
				fetchImpl,
			}),
		).resolves.toEqual({
			ok: false,
			reason: "chat-changed",
		});

		expect(fetchImpl).not.toHaveBeenCalled();
	});

	test("returns api-unavailable when required public context APIs are missing", async () => {
		const fetchImpl = vi.fn();

		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-2",
					name: "Hero",
				},
			],
			chatId: "chapter-2",
			groupId: null,
		});

		const { deleteCurrentChat } =
			await import("@/packages/core/st/currentChatDelete");

		await expect(
			deleteCurrentChat({
				expectedFileName: "chapter-2",
				fetchImpl,
			}),
		).resolves.toEqual({
			ok: false,
			reason: "api-unavailable",
		});

		expect(fetchImpl).not.toHaveBeenCalled();
	});
});
