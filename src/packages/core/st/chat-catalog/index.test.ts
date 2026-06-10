import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	CHAT_CATALOG_CACHE_KEY,
	CHAT_CATALOG_CACHE_STALE_MS,
	createChatCatalogStore,
	deleteChatCatalogEntry,
	exportChatCatalogEntry,
	filterChatCatalogEntries,
	normalizeRecentChatCatalogEntries,
	openChatCatalogEntry,
	readChatCatalogCache,
	renameChatCatalogEntry,
	sortChatCatalogEntries,
	writeChatCatalogCache,
	type ChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";

type Listener = (...args: unknown[]) => void;

function createJsonResponse(payload: unknown, ok = true): Response {
	return {
		json: vi.fn().mockResolvedValue(payload),
		ok,
		status: ok ? 200 : 500,
		statusText: ok ? "OK" : "Server Error",
	} as unknown as Response;
}

function createEventSourceStub() {
	const listeners = new Map<string, Set<Listener>>();

	return {
		emit(event: string, ...args: unknown[]) {
			for (const listener of listeners.get(event) ?? []) {
				listener(...args);
			}
		},
		listenerCount(event: string) {
			return listeners.get(event)?.size ?? 0;
		},
		on(event: string, listener: Listener) {
			const activeListeners = listeners.get(event) ?? new Set<Listener>();
			activeListeners.add(listener);
			listeners.set(event, activeListeners);
		},
		removeListener(event: string, listener: Listener) {
			listeners.get(event)?.delete(listener);
		},
	};
}

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
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

describe("chat catalog adapter", () => {
	beforeEach(() => {
		vi.useRealTimers();
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
		document.body.innerHTML = "";
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("normalizes recent character and group chats while excluding root and orphan chats", () => {
		setSillyTavernContext({
			characters: [
				{
					avatar: "hero.png",
					name: "Hero",
				},
			],
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [
				{
					avatar_url: "party.png",
					id: "party",
					members: ["hero.png"],
					name: "Party",
				},
			],
		});

		const entries = normalizeRecentChatCatalogEntries([
			{
				avatar: "hero.png",
				chat_items: 4,
				file_name: "chapter-1.jsonl",
				file_size: "12 KB",
				last_mes: "2026-05-01T10:00:00.000Z",
				mes: "Hero preview",
			},
			{
				chat_items: 8,
				file_name: "campfire.jsonl",
				file_size: "24 KB",
				group: "party",
				last_mes: "2026-05-02T10:00:00.000Z",
				mes: "Party preview",
			},
			{
				chat_items: 2,
				file_name: "root-chat.jsonl",
				last_mes: "2026-05-03T10:00:00.000Z",
				mes: "Root preview",
			},
			{
				avatar: "missing.png",
				chat_items: 1,
				file_name: "orphan.jsonl",
				last_mes: "2026-05-04T10:00:00.000Z",
				mes: "Orphan preview",
			},
		]);

		expect(entries).toEqual([
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/hero.png",
				chatId: "chapter-1",
				entityId: "0",
				entityName: "Hero",
				fileName: "chapter-1.jsonl",
				key: "character:0:chapter-1",
				kind: "character",
				lastMessagePreview: "Hero preview",
				messageCount: 4,
			}),
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/hero.png",
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				fileName: "campfire.jsonl",
				groupAvatarUrls: ["/thumbs/avatar/hero.png"],
				key: "group:party:campfire",
				kind: "group",
				lastMessagePreview: "Party preview",
				messageCount: 8,
			}),
		]);
	});

	test("normalizes group avatar collages from up to four resolved members", () => {
		setSillyTavernContext({
			characters: [
				{
					avatar: "hero.png",
					name: "Hero",
				},
				{
					avatar: "mage.png",
					name: "Mage",
				},
				{
					avatar: "rogue.png",
					name: "Rogue",
				},
				{
					avatar: "cleric.png",
					name: "Cleric",
				},
				{
					avatar: "extra.png",
					name: "Extra",
				},
			],
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [
				{
					avatar_url: "/img/five.png",
					id: "party",
					members: [
						"hero.png",
						"mage.png",
						"rogue.png",
						"cleric.png",
						"extra.png",
					],
					name: "Party",
				},
			],
		});

		const entries = normalizeRecentChatCatalogEntries([
			{
				chat_items: 8,
				file_name: "campfire.jsonl",
				group: "party",
				last_mes: "2026-05-02T10:00:00.000Z",
				mes: "Party preview",
			},
		]);

		expect(entries[0]).toMatchObject({
			avatarUrl: "/thumbs/avatar/hero.png",
			groupAvatarUrls: [
				"/thumbs/avatar/hero.png",
				"/thumbs/avatar/mage.png",
				"/thumbs/avatar/rogue.png",
				"/thumbs/avatar/cleric.png",
			],
		});
	});

	test("indexes character avatars once per normalization pass", () => {
		let avatarReads = 0;
		const characters = [
			{
				get avatar() {
					avatarReads += 1;
					return "one.png";
				},
				name: "One",
			},
			{
				get avatar() {
					avatarReads += 1;
					return "two.png";
				},
				name: "Two",
			},
			{
				get avatar() {
					avatarReads += 1;
					return "target.png";
				},
				name: "Target",
			},
		];
		setSillyTavernContext({
			characters,
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
		});

		const entries = normalizeRecentChatCatalogEntries([
			{
				avatar: "target.png",
				chat_items: 4,
				file_name: "target-1.jsonl",
				last_mes: "2026-05-01T10:00:00.000Z",
				mes: "Target preview 1",
			},
			{
				avatar: "target.png",
				chat_items: 5,
				file_name: "target-2.jsonl",
				last_mes: "2026-05-02T10:00:00.000Z",
				mes: "Target preview 2",
			},
			{
				avatar: "target.png",
				chat_items: 6,
				file_name: "target-3.jsonl",
				last_mes: "2026-05-03T10:00:00.000Z",
				mes: "Target preview 3",
			},
		]);

		expect(entries).toHaveLength(3);
		expect(avatarReads).toBeLessThanOrEqual(characters.length);
	});

	test("normalizes record-shaped character and group catalogs", () => {
		setSillyTavernContext({
			characters: {
				hero: {
					avatar: "hero.png",
					name: "Hero",
				},
			},
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: {
				party: {
					avatar_url: "/img/five.png",
					id: "party",
					members: ["hero.png"],
					name: "Party",
				},
			},
		});

		const entries = normalizeRecentChatCatalogEntries([
			{
				avatar: "hero.png",
				chat_items: 4,
				file_name: "chapter-1.jsonl",
				last_mes: "2026-05-01T10:00:00.000Z",
				mes: "Hero preview",
			},
			{
				chat_items: 8,
				file_name: "campfire.jsonl",
				group: "party",
				last_mes: "2026-05-02T10:00:00.000Z",
				mes: "Party preview",
			},
		]);

		expect(entries).toEqual([
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/hero.png",
				entityId: "hero",
				entityName: "Hero",
				key: "character:hero:chapter-1",
				kind: "character",
			}),
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/hero.png",
				entityId: "party",
				entityName: "Party",
				groupAvatarUrls: ["/thumbs/avatar/hero.png"],
				key: "group:party:campfire",
				kind: "group",
			}),
		]);
	});

	test("marks the active character chat as current during normalization", () => {
		setSillyTavernContext({
			characterId: 0,
			chatId: "chapter-1",
			characters: [
				{
					avatar: "hero.png",
					name: "Hero",
				},
			],
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
		});

		const entries = normalizeRecentChatCatalogEntries([
			{
				avatar: "hero.png",
				chat_items: 4,
				file_name: "chapter-1.jsonl",
				last_mes: "2026-05-01T10:00:00.000Z",
				mes: "Hero preview",
			},
			{
				avatar: "hero.png",
				chat_items: 2,
				file_name: "other-chat.jsonl",
				last_mes: "2026-05-02T10:00:00.000Z",
				mes: "Other preview",
			},
		]);

		expect(entries[0]).toMatchObject({
			chatId: "chapter-1",
			isCurrent: true,
		});
		expect(entries[1]).toMatchObject({
			chatId: "other-chat",
			isCurrent: false,
		});
	});

	test("marks the active group chat as current during normalization", () => {
		setSillyTavernContext({
			chatId: "campfire",
			groupId: "party",
			groups: [
				{
					avatar_url: "/img/five.png",
					id: "party",
					members: [],
					name: "Party",
				},
			],
		});

		const entries = normalizeRecentChatCatalogEntries([
			{
				chat_items: 8,
				file_name: "campfire.jsonl",
				group: "party",
				last_mes: "2026-05-02T10:00:00.000Z",
				mes: "Party preview",
			},
			{
				chat_items: 2,
				file_name: "other-chat.jsonl",
				group: "party",
				last_mes: "2026-05-03T10:00:00.000Z",
				mes: "Other group preview",
			},
		]);

		expect(entries[0]).toMatchObject({
			chatId: "campfire",
			isCurrent: true,
		});
		expect(entries[1]).toMatchObject({
			chatId: "other-chat",
			isCurrent: false,
		});
	});

	test("prefers a valid custom group avatar over member collage avatars", () => {
		setSillyTavernContext({
			characters: [
				{
					avatar: "hero.png",
					name: "Hero",
				},
			],
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [
				{
					avatar_url: "user/images/party.png",
					id: "party",
					members: ["hero.png"],
					name: "Party",
				},
			],
		});

		const entries = normalizeRecentChatCatalogEntries([
			{
				chat_items: 8,
				file_name: "campfire.jsonl",
				group: "party",
				last_mes: "2026-05-02T10:00:00.000Z",
				mes: "Party preview",
			},
		]);

		expect(entries[0]).toMatchObject({
			avatarUrl: "/user/images/party.png",
			groupAvatarUrls: [],
		});
	});

	test("searches and sorts normalized entries locally", () => {
		const entries = [
			createEntry({
				entityName: "Zed",
				key: "character:0:zed-chat",
				lastMessageAt: 10,
				messageCount: 2,
			}),
			createEntry({
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
				lastMessageAt: 20,
				lastMessagePreview: "campfire plan",
				messageCount: 9,
			}),
			createEntry({
				entityName: "Alpha",
				key: "character:2:alpha-chat",
				lastMessageAt: 5,
				messageCount: 1,
			}),
		];

		expect(
			sortChatCatalogEntries(entries, "most-recent").map(
				(entry) => entry.key,
			),
		).toEqual([
			"group:party:campfire",
			"character:0:zed-chat",
			"character:2:alpha-chat",
		]);
		expect(
			sortChatCatalogEntries(entries, "entity-asc").map(
				(entry) => entry.entityName,
			),
		).toEqual(["Alpha", "Party", "Zed"]);
		expect(
			sortChatCatalogEntries(entries, "least-messages").map(
				(entry) => entry.messageCount,
			),
		).toEqual([1, 2, 9]);
		expect(filterChatCatalogEntries(entries, "campfire")).toHaveLength(1);
		expect(filterChatCatalogEntries(entries, "zed")).toHaveLength(1);
	});

	test("exports character chat files lazily with resolved avatar metadata", async () => {
		const fetchImpl = vi.fn().mockResolvedValue(
			createJsonResponse({
				message: "Chat exported.",
				result: '{"mes":"hello"}',
			}),
		);
		const downloadImpl = vi.fn();
		setSillyTavernContext({
			characters: [
				{
					avatar: "hero.png",
					name: "Hero",
				},
			],
			getRequestHeaders: () => ({
				"X-CSRF-Token": "token",
			}),
		});

		const result = await exportChatCatalogEntry(createEntry(), "jsonl", {
			downloadImpl,
			fetchImpl,
		});

		expect(result).toEqual({
			fileName: "chapter-1.jsonl",
			ok: true,
		});
		expect(fetchImpl).toHaveBeenCalledWith("/api/chats/export", {
			body: JSON.stringify({
				avatar_url: "hero.png",
				exportfilename: "chapter-1.jsonl",
				file: "chapter-1.jsonl",
				format: "jsonl",
				is_group: false,
			}),
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"X-CSRF-Token": "token",
			},
			method: "POST",
		});
		expect(downloadImpl).toHaveBeenCalledWith(
			'{"mes":"hello"}',
			"chapter-1.jsonl",
			"application/octet-stream",
		);
	});

	test("exports group chat files without avatar metadata", async () => {
		const fetchImpl = vi.fn().mockResolvedValue(
			createJsonResponse({
				result: "plain text",
			}),
		);
		const downloadImpl = vi.fn();
		setSillyTavernContext({
			getRequestHeaders: () => ({}),
		});

		await exportChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				key: "group:party:campfire",
				kind: "group",
			}),
			"txt",
			{
				downloadImpl,
				fetchImpl,
			},
		);

		expect(fetchImpl).toHaveBeenCalledWith(
			"/api/chats/export",
			expect.objectContaining({
				body: JSON.stringify({
					avatar_url: null,
					exportfilename: "campfire.txt",
					file: "campfire.jsonl",
					format: "txt",
					is_group: true,
				}),
			}),
		);
		expect(downloadImpl).toHaveBeenCalledWith(
			"plain text",
			"campfire.txt",
			"text/plain",
		);
	});

	test("returns a typed failure when chat export request fails", async () => {
		const fetchImpl = vi.fn().mockResolvedValue(
			createJsonResponse(
				{
					message: "No chat file found.",
				},
				false,
			),
		);
		const downloadImpl = vi.fn();
		setSillyTavernContext({
			getRequestHeaders: () => ({}),
		});

		const result = await exportChatCatalogEntry(createEntry(), "jsonl", {
			downloadImpl,
			fetchImpl,
		});

		expect(result).toEqual({
			message: "No chat file found.",
			ok: false,
			reason: "export-failed",
		});
		expect(downloadImpl).not.toHaveBeenCalled();
	});

	test("falls back to a browser blob download when no downloader is injected", async () => {
		const fetchImpl = vi.fn().mockResolvedValue(
			createJsonResponse({
				result: "plain text",
			}),
		);
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {});
		if (typeof URL.createObjectURL !== "function") {
			Object.defineProperty(URL, "createObjectURL", {
				configurable: true,
				value: vi.fn(),
			});
		}
		if (typeof URL.revokeObjectURL !== "function") {
			Object.defineProperty(URL, "revokeObjectURL", {
				configurable: true,
				value: vi.fn(),
			});
		}
		const createObjectUrlSpy = vi
			.spyOn(URL, "createObjectURL")
			.mockReturnValue("blob:chat-export");
		const revokeObjectUrlSpy = vi
			.spyOn(URL, "revokeObjectURL")
			.mockImplementation(() => {});
		setSillyTavernContext({
			getRequestHeaders: () => ({}),
		});

		const result = await exportChatCatalogEntry(createEntry(), "txt", {
			fetchImpl,
		});

		expect(result).toEqual({
			fileName: "chapter-1.txt",
			ok: true,
		});
		expect(clickSpy).toHaveBeenCalledTimes(1);
		expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
		expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:chat-export");

		clickSpy.mockRestore();
		createObjectUrlSpy.mockRestore();
		revokeObjectUrlSpy.mockRestore();
	});

	test("renames character chat files through the lazy SillyTavern core module", async () => {
		const renameGroupOrCharacterChat = vi.fn().mockResolvedValue(undefined);
		const updateRemoteChatName = vi.fn().mockResolvedValue(undefined);

		const result = await renameChatCatalogEntry(
			createEntry({
				characterId: 0,
				chatId: "chapter-1",
				entityId: "0",
				kind: "character",
			}),
			"chapter-2.jsonl",
			{
				loadCoreModule: vi.fn().mockResolvedValue({
					renameGroupOrCharacterChat,
					updateRemoteChatName,
				}),
			},
		);

		expect(result).toEqual({ ok: true });
		expect(renameGroupOrCharacterChat).toHaveBeenCalledWith({
			characterId: "0",
			groupId: undefined,
			loader: false,
			newFileName: "chapter-2",
			oldFileName: "chapter-1",
		});
		expect(updateRemoteChatName).toHaveBeenCalledWith(0, "chapter-2");
	});

	test("renames group chat files through the lazy SillyTavern core module", async () => {
		const renameGroupOrCharacterChat = vi.fn().mockResolvedValue(undefined);

		const result = await renameChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				key: "group:party:campfire",
				kind: "group",
			}),
			"campfire-2",
			{
				loadCoreModule: vi.fn().mockResolvedValue({
					renameGroupOrCharacterChat,
				}),
			},
		);

		expect(result).toEqual({ ok: true });
		expect(renameGroupOrCharacterChat).toHaveBeenCalledWith({
			characterId: undefined,
			groupId: "party",
			loader: false,
			newFileName: "campfire-2",
			oldFileName: "campfire",
		});
	});

	test("deletes character chat files through the lazy SillyTavern core module", async () => {
		const deleteCharacterChatByName = vi.fn().mockResolvedValue(undefined);

		const result = await deleteChatCatalogEntry(createEntry(), {
			loadCoreModule: vi.fn().mockResolvedValue({
				deleteCharacterChatByName,
			}),
		});

		expect(result).toEqual({ ok: true });
		expect(deleteCharacterChatByName).toHaveBeenCalledWith(
			"0",
			"chapter-1",
		);
	});

	test("deletes group chat files through the lazy SillyTavern group module", async () => {
		const deleteGroupChatByName = vi.fn().mockResolvedValue(undefined);

		const result = await deleteChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				key: "group:party:campfire",
				kind: "group",
			}),
			{
				loadGroupModule: vi.fn().mockResolvedValue({
					deleteGroupChatByName,
				}),
			},
		);

		expect(result).toEqual({ ok: true });
		expect(deleteGroupChatByName).toHaveBeenCalledWith("party", "campfire");
	});

	test("returns typed failures for invalid chat rename and unavailable delete APIs", async () => {
		await expect(
			renameChatCatalogEntry(createEntry(), "chapter-1"),
		).resolves.toEqual({
			ok: false,
			reason: "invalid-name",
		});
		await expect(
			deleteChatCatalogEntry(createEntry(), {
				loadCoreModule: vi.fn().mockResolvedValue({}),
			}),
		).resolves.toEqual({
			ok: false,
			reason: "api-unavailable",
		});
	});

	test("reads cached entries as fresh or stale and rewrites corrupted cache payloads as empty", () => {
		const now = 1_000;
		const entries = [createEntry()];

		writeChatCatalogCache({
			entries,
			now,
			storage: localStorage,
		});

		expect(
			readChatCatalogCache({
				now: now + CHAT_CATALOG_CACHE_STALE_MS - 1,
				storage: localStorage,
			}),
		).toMatchObject({
			cacheStatus: "fresh",
			entries,
			timestamp: now,
		});
		expect(
			readChatCatalogCache({
				now: now + CHAT_CATALOG_CACHE_STALE_MS + 1,
				storage: localStorage,
			}),
		).toMatchObject({
			cacheStatus: "stale",
			entries,
			timestamp: now,
		});

		localStorage.setItem(CHAT_CATALOG_CACHE_KEY, "{not json");

		expect(
			readChatCatalogCache({
				now,
				storage: localStorage,
			}),
		).toBeNull();
	});

	test("marks cached entries against the current SillyTavern context", () => {
		const now = 1_000;
		const fetchImpl = vi.fn() as unknown as typeof fetch;
		const currentEntry = createEntry({
			characterId: 0,
			isCurrent: false,
		});
		const staleCurrentEntry = createEntry({
			characterId: 0,
			chatId: "other-chat",
			fileName: "other-chat.jsonl",
			isCurrent: true,
			key: "character:0:other-chat",
		});
		localStorage.setItem(
			CHAT_CATALOG_CACHE_KEY,
			JSON.stringify({
				entries: [currentEntry, staleCurrentEntry],
				timestamp: now,
				version: 1,
			}),
		);
		setSillyTavernContext({
			characterId: 0,
			chatId: "chapter-1",
		});

		const store = createChatCatalogStore({
			fetchImpl,
			now: () => now,
			storage: localStorage,
		});

		expect(store.getSnapshot().entries).toEqual([
			expect.objectContaining({
				chatId: "chapter-1",
				isCurrent: true,
			}),
			expect.objectContaining({
				chatId: "other-chat",
				isCurrent: false,
			}),
		]);
		expect(fetchImpl).not.toHaveBeenCalled();

		store.dispose();
	});

	test("renders stale cache immediately and revalidates with SillyTavern request headers", async () => {
		const cachedEntry = createEntry({
			entityName: "Cached Hero",
			key: "character:0:cached-chat",
		});
		writeChatCatalogCache({
			entries: [cachedEntry],
			now: 1_000,
			storage: localStorage,
		});
		setSillyTavernContext({
			characters: [
				{
					avatar: "hero.png",
					name: "Hero",
				},
			],
			getRequestHeaders: () => ({
				Authorization: "Bearer token",
			}),
			groups: [],
		});
		const fetchImpl = vi.fn().mockResolvedValue(
			createJsonResponse([
				{
					avatar: "hero.png",
					chat_items: 4,
					file_name: "chapter-1.jsonl",
					file_size: "12 KB",
					last_mes: "2026-05-01T10:00:00.000Z",
					mes: "Hero preview",
				},
			]),
		) as unknown as typeof fetch;

		const store = createChatCatalogStore({
			fetchImpl,
			now: () => 1_000 + CHAT_CATALOG_CACHE_STALE_MS + 1,
			storage: localStorage,
		});

		expect(store.getSnapshot()).toMatchObject({
			cacheStatus: "stale",
			entries: [cachedEntry],
			status: "refreshing",
		});

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				cacheStatus: "fresh",
				status: "ready",
			});
			expect(store.getSnapshot().entries[0]).toMatchObject({
				entityName: "Hero",
				key: "character:0:chapter-1",
			});
		});
		expect(fetchImpl).toHaveBeenCalledWith("/api/chats/recent", {
			body: JSON.stringify({}),
			headers: {
				Authorization: "Bearer token",
				"Content-Type": "application/json",
			},
			method: "POST",
		});

		store.dispose();
	});

	test("removes event listeners on dispose", async () => {
		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			characters: [],
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			groups: [],
		});
		const fetchImpl = vi
			.fn()
			.mockResolvedValue(
				createJsonResponse([]),
			) as unknown as typeof fetch;

		const store = createChatCatalogStore({
			fetchImpl,
			storage: localStorage,
		});

		expect(eventSource.listenerCount("chat_changed")).toBe(1);
		await waitFor(() => {
			expect(fetchImpl).toHaveBeenCalledTimes(1);
		});

		store.dispose();
		expect(eventSource.listenerCount("chat_changed")).toBe(0);

		eventSource.emit("chat_changed");
		await Promise.resolve();

		expect(fetchImpl).toHaveBeenCalledTimes(1);
	});

	test("targets an inactive character chat before clicking the native character row", async () => {
		document.body.innerHTML =
			'<button class="character_select" data-chid="0"></button>';
		const loadedChats: string[] = [];
		const characters = [
			{
				avatar: "hero.png",
				chat: "chapter-old",
				name: "Hero",
			},
		];
		const executeSlashCommandsWithOptions = vi.fn();
		const openCharacterChat = vi.fn().mockResolvedValue(undefined);
		const saveSettingsDebounced = vi.fn();
		const selectCharacterById = vi.fn();
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				characterId: 2,
				characters,
				chatId: "other-chat",
				executeSlashCommandsWithOptions,
				groupId: null,
				openCharacterChat,
				saveSettingsDebounced,
				selectCharacterById,
			},
		};
		document
			.querySelector(".character_select")
			?.addEventListener("click", () => {
				loadedChats.push(String(characters[0].chat));
				saveSettingsDebounced();
				contextRef.current = {
					...contextRef.current,
					characterId: 0,
					chatId: characters[0].chat,
					groupId: null,
				};
			});

		const result = await openChatCatalogEntry(createEntry(), {
			getContext: () => contextRef.current,
		});

		expect(result).toEqual({ ok: true });
		expect(selectCharacterById).not.toHaveBeenCalled();
		expect(executeSlashCommandsWithOptions).not.toHaveBeenCalled();
		expect(openCharacterChat).not.toHaveBeenCalled();
		expect(loadedChats).toEqual(["chapter-1"]);
		expect(characters[0].chat).toBe("chapter-1");
		expect(saveSettingsDebounced).toHaveBeenCalled();
	});

	test("does not treat a matching character id as active while a group is selected", async () => {
		document.body.innerHTML =
			'<button class="character_select" data-chid="0"></button>';
		const characters = [
			{
				avatar: "hero.png",
				chat: "chapter-old",
				name: "Hero",
			},
		];
		const openCharacterChat = vi.fn().mockResolvedValue(undefined);
		const saveSettingsDebounced = vi.fn();
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				characterId: 0,
				characters,
				chatId: "refluscia-home",
				groupId: "refluscia",
				openCharacterChat,
				saveSettingsDebounced,
			},
		};
		document
			.querySelector(".character_select")
			?.addEventListener("click", () => {
				saveSettingsDebounced();
				contextRef.current = {
					...contextRef.current,
					characterId: 0,
					chatId: characters[0].chat,
					groupId: null,
				};
			});

		const result = await openChatCatalogEntry(createEntry(), {
			getContext: () => contextRef.current,
		});

		expect(result).toEqual({ ok: true });
		expect(contextRef.current.groupId).toBeNull();
		expect(contextRef.current.chatId).toBe("chapter-1");
		expect(openCharacterChat).not.toHaveBeenCalled();
		expect(saveSettingsDebounced).toHaveBeenCalled();
	});

	test("uses the public slash fallback with the character avatar key when the native row is missing", async () => {
		const characters = [
			{
				avatar: "hero.png",
				chat: "chapter-old",
				name: "Hero",
			},
		];
		const openCharacterChat = vi.fn().mockResolvedValue(undefined);
		const saveSettingsDebounced = vi.fn();
		const executeSlashCommandsWithOptions = vi.fn().mockImplementation(
			(text: string) => {
				contextRef.current = {
					...contextRef.current,
					characterId: 0,
					chatId: characters[0].chat,
					groupId: null,
				};
				return Promise.resolve({
					pipe: text,
				});
			},
		);
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				characterId: 2,
				characters,
				chatId: "other-chat",
				executeSlashCommandsWithOptions,
				groupId: null,
				openCharacterChat,
				saveSettingsDebounced,
			},
		};

		const result = await openChatCatalogEntry(createEntry(), {
			getContext: () => contextRef.current,
		});

		expect(result).toEqual({ ok: true });
		expect(executeSlashCommandsWithOptions).toHaveBeenCalledWith(
			'/go "hero.png"',
			expect.objectContaining({
				source: "astra-projecta",
			}),
		);
		expect(openCharacterChat).not.toHaveBeenCalled();
		expect(characters[0].chat).toBe("chapter-1");
		expect(saveSettingsDebounced).toHaveBeenCalled();
	});

	test("fails inactive character activation instead of silently using non-persisting selection", async () => {
		const characters = [
			{
				avatar: "hero.png",
				chat: "chapter-old",
				name: "Hero",
			},
		];
		const openCharacterChat = vi.fn().mockResolvedValue(undefined);
		const selectCharacterById = vi.fn().mockResolvedValue(undefined);

		const result = await openChatCatalogEntry(createEntry(), {
			getContext: () => ({
				characterId: 2,
				characters,
				chatId: "other-chat",
				groupId: null,
				openCharacterChat,
				selectCharacterById,
			}),
		});

		expect(result).toEqual({
			ok: false,
			reason: "api-unavailable",
		});
		expect(selectCharacterById).not.toHaveBeenCalled();
		expect(openCharacterChat).not.toHaveBeenCalled();
		expect(characters[0].chat).toBe("chapter-old");
	});

	test("skips reopening the already-current character chat", async () => {
		const selectCharacterById = vi.fn();
		const openCharacterChat = vi.fn();

		const result = await openChatCatalogEntry(createEntry(), {
			getContext: () => ({
				characterId: 0,
				getCurrentChatId: () => "chapter-1",
				openCharacterChat,
				selectCharacterById,
			}),
		});

		expect(result).toEqual({ alreadyCurrent: true, ok: true });
		expect(selectCharacterById).not.toHaveBeenCalled();
		expect(openCharacterChat).not.toHaveBeenCalled();
	});

	test("opens an already-active different character chat without reselecting the character", async () => {
		const selectCharacterById = vi.fn();
		const openCharacterChat = vi.fn().mockResolvedValue(undefined);

		const result = await openChatCatalogEntry(createEntry(), {
			getContext: () => ({
				characterId: 0,
				getCurrentChatId: () => "chapter-old",
				openCharacterChat,
				selectCharacterById,
			}),
		});

		expect(result).toEqual({ ok: true });
		expect(selectCharacterById).not.toHaveBeenCalled();
		expect(openCharacterChat).toHaveBeenCalledTimes(1);
		expect(openCharacterChat).toHaveBeenCalledWith("chapter-1");
	});

	test("targets an inactive group chat before clicking the native group row", async () => {
		document.body.innerHTML =
			'<button class="group_select" data-grid="party"></button>';
		const group = {
			chat_id: "party-home",
			id: "party",
			name: "Party",
		};
		const loadedChats: string[] = [];
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				chatId: "other-chat",
				executeSlashCommandsWithOptions: vi.fn().mockResolvedValue({
					pipe: "Party",
				}),
				groupId: null,
				groups: [group],
				openGroupChat: vi.fn().mockResolvedValue(undefined),
				saveSettingsDebounced: vi.fn(),
			},
		};
		document
			.querySelector(".group_select")
			?.addEventListener("click", () => {
				loadedChats.push(group.chat_id);
				contextRef.current = {
					...contextRef.current,
					chatId: group.chat_id,
					groupId: group.id,
				};
			});

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
			{
				getContext: () => contextRef.current,
			},
		);

		expect(result).toEqual({ ok: true });
		expect(
			contextRef.current.executeSlashCommandsWithOptions,
		).not.toHaveBeenCalled();
		expect(contextRef.current.openGroupChat).not.toHaveBeenCalled();
		expect(loadedChats).toEqual(["campfire"]);
		expect(group.chat_id).toBe("campfire");
	});

	test("skips opening a group file when public activation lands on the requested chat", async () => {
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				chatId: "other-chat",
				executeSlashCommandsWithOptions: vi
					.fn()
					.mockImplementation(() => {
						contextRef.current = {
							...contextRef.current,
							chatId: "campfire",
							groupId: "party",
						};
						return Promise.resolve({
							pipe: "Party",
						});
					}),
				groupId: null,
				groups: [
					{
						id: "party",
						name: "Party",
					},
				],
				openGroupChat: vi.fn().mockResolvedValue(undefined),
				saveSettingsDebounced: vi.fn(),
			},
		};

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
			{
				getContext: () => contextRef.current,
			},
		);

		expect(result).toEqual({ ok: true });
		expect(contextRef.current.saveSettingsDebounced).toHaveBeenCalledTimes(
			1,
		);
		expect(contextRef.current.openGroupChat).not.toHaveBeenCalled();
	});

	test("opens already-active group chats directly with openGroupChat", async () => {
		const openGroupChat = vi.fn().mockResolvedValue(undefined);

		const result = await openChatCatalogEntry(
			createEntry({
				entityId: "party",
				key: "group:party:campfire",
				kind: "group",
			}),
			{
				getContext: () => ({
					chatId: "other-chat",
					groupId: "party",
					openGroupChat,
				}),
			},
		);

		expect(result).toEqual({ ok: true });
		expect(openGroupChat).toHaveBeenCalledWith("party", "chapter-1");
	});

	test("fails inactive group activation when public slash execution is unavailable", async () => {
		const openGroupChat = vi.fn().mockResolvedValue(undefined);

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
			{
				getContext: () => ({
					chatId: "other-chat",
					groupId: null,
					groups: [
						{
							id: "party",
							name: "Party",
						},
					],
					openGroupChat,
				}),
			},
		);

		expect(result).toEqual({
			ok: false,
			reason: "api-unavailable",
		});
		expect(openGroupChat).not.toHaveBeenCalled();
	});

	test("fails inactive group activation when the group name is ambiguous", async () => {
		const executeSlashCommandsWithOptions = vi.fn();
		const openGroupChat = vi.fn().mockResolvedValue(undefined);

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
			{
				getContext: () => ({
					chatId: "other-chat",
					executeSlashCommandsWithOptions,
					groupId: null,
					groups: [
						{
							id: "party",
							name: "Party",
						},
						{
							id: "other-party",
							name: "party",
						},
					],
					openGroupChat,
				}),
			},
		);

		expect(result).toEqual({
			ok: false,
			reason: "ambiguous-group",
		});
		expect(executeSlashCommandsWithOptions).not.toHaveBeenCalled();
		expect(openGroupChat).not.toHaveBeenCalled();
	});

	test("fails inactive group activation when public activation cannot be verified", async () => {
		const executeSlashCommandsWithOptions = vi.fn().mockResolvedValue({
			pipe: "Party",
		});
		const openGroupChat = vi.fn().mockResolvedValue(undefined);

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
			{
				getContext: () => ({
					chatId: "other-chat",
					executeSlashCommandsWithOptions,
					groupId: null,
					groups: [
						{
							id: "party",
							name: "Party",
						},
					],
					openGroupChat,
				}),
			},
		);

		expect(result).toEqual({
			ok: false,
			reason: "open-failed",
		});
		expect(openGroupChat).not.toHaveBeenCalled();
	});

	test("returns a failure result when the SillyTavern open API rejects", async () => {
		const result = await openChatCatalogEntry(createEntry(), {
			getContext: () => ({
				characterId: 0,
				chatId: "other-chat",
				groupId: null,
				openCharacterChat: vi.fn().mockRejectedValue(new Error("boom")),
			}),
		});

		expect(result).toEqual({
			ok: false,
			reason: "open-failed",
		});
	});
});
