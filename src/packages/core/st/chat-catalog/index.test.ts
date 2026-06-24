import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const unstableChatCatalogInternalsMock = vi.hoisted(() => ({
	deleteChat: vi.fn(),
	renameChat: vi.fn(),
}));

vi.mock("@/packages/core/st/chat-catalog/unstable-st-internals", async () => {
	const actual = await vi.importActual<
		typeof import("@/packages/core/st/chat-catalog/unstable-st-internals")
	>("@/packages/core/st/chat-catalog/unstable-st-internals");

	return {
		...actual,
		defaultUnstableChatCatalogInternals:
			unstableChatCatalogInternalsMock,
	};
});

import {
	activateChatEntity,
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

function stubFetch(payload: unknown, ok = true) {
	const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(payload, ok));
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function stubBrowserDownload() {
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

	return {
		clickSpy,
		createObjectUrlSpy,
		revokeObjectUrlSpy,
	};
}

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function setMutableSillyTavernContext(contextRef: { current: unknown }) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => contextRef.current,
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

function assertActionExportSignaturesDoNotExposeTestSeams() {
	const entry = createEntry();

	// @ts-expect-error action exports should use the global fetch contract
	void exportChatCatalogEntry(entry, "jsonl", { fetchImpl: fetch });
	// @ts-expect-error action exports should use the global SillyTavern context
	void openChatCatalogEntry(entry, { getContext: () => ({}) });
	// @ts-expect-error action exports should use the default unstable bridge
	void renameChatCatalogEntry(entry, "chapter-2", {
		unstableInternals: {
			deleteChat: async () => ({ ok: true }),
			renameChat: async () => ({ ok: true }),
		},
	});
	// @ts-expect-error action exports should use the default unstable bridge
	void deleteChatCatalogEntry(entry, {
		unstableInternals: {
			deleteChat: async () => ({ ok: true }),
			renameChat: async () => ({ ok: true }),
		},
	});
}

describe("chat catalog adapter", () => {
	beforeEach(() => {
		vi.useRealTimers();
		localStorage.clear();
		unstableChatCatalogInternalsMock.deleteChat.mockReset();
		unstableChatCatalogInternalsMock.renameChat.mockReset();
	});

	afterEach(() => {
		localStorage.clear();
		document.body.innerHTML = "";
		vi.unstubAllGlobals();
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
		const fetchMock = stubFetch({
			message: "Chat exported.",
			result: '{"mes":"hello"}',
		});
		const { clickSpy } = stubBrowserDownload();
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

		const result = await exportChatCatalogEntry(createEntry(), "jsonl");

		expect(result).toEqual({
			fileName: "chapter-1.jsonl",
			ok: true,
		});
		expect(fetchMock).toHaveBeenCalledWith("/api/chats/export", {
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
		expect(clickSpy).toHaveBeenCalledTimes(1);
	});

	test("exports group chat files without avatar metadata", async () => {
		const fetchMock = stubFetch({
			result: "plain text",
		});
		const { clickSpy } = stubBrowserDownload();
		setSillyTavernContext({
			getRequestHeaders: () => ({}),
		});

		const result = await exportChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				key: "group:party:campfire",
				kind: "group",
			}),
			"txt",
		);

		expect(result).toEqual({
			fileName: "campfire.txt",
			ok: true,
		});
		expect(fetchMock).toHaveBeenCalledWith(
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
		expect(clickSpy).toHaveBeenCalledTimes(1);
	});

	test("returns a typed failure when chat export request fails", async () => {
		const fetchMock = stubFetch(
			{
				message: "No chat file found.",
			},
			false,
		);
		const { clickSpy } = stubBrowserDownload();
		setSillyTavernContext({
			getRequestHeaders: () => ({}),
		});

		const result = await exportChatCatalogEntry(createEntry(), "jsonl");

		expect(result).toEqual({
			message: "No chat file found.",
			ok: false,
			reason: "export-failed",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(clickSpy).not.toHaveBeenCalled();
	});

	test("uses a browser blob download for exported chat content", async () => {
		stubFetch({
			result: "plain text",
		});
		const { clickSpy, createObjectUrlSpy, revokeObjectUrlSpy } =
			stubBrowserDownload();
		setSillyTavernContext({
			getRequestHeaders: () => ({}),
		});

		const result = await exportChatCatalogEntry(createEntry(), "txt");

		expect(result).toEqual({
			fileName: "chapter-1.txt",
			ok: true,
		});
		expect(clickSpy).toHaveBeenCalledTimes(1);
		expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
		expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:chat-export");
	});

	test("renames character chat files through the unstable internals bridge", async () => {
		unstableChatCatalogInternalsMock.renameChat.mockResolvedValue({
			ok: true,
		});

		const result = await renameChatCatalogEntry(
			createEntry({
				characterId: 0,
				chatId: "chapter-1",
				entityId: "0",
				kind: "character",
			}),
			"chapter-2.jsonl",
		);

		expect(result).toEqual({ ok: true });
		expect(unstableChatCatalogInternalsMock.renameChat).toHaveBeenCalledWith({
			characterId: 0,
			entityId: "0",
			kind: "character",
			newName: "chapter-2",
			oldName: "chapter-1",
		});
	});

	test("renames group chat files through the unstable internals bridge", async () => {
		unstableChatCatalogInternalsMock.renameChat.mockResolvedValue({
			ok: true,
		});

		const result = await renameChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				key: "group:party:campfire",
				kind: "group",
			}),
			"campfire-2",
		);

		expect(result).toEqual({ ok: true });
		expect(unstableChatCatalogInternalsMock.renameChat).toHaveBeenCalledWith({
			characterId: undefined,
			entityId: "party",
			kind: "group",
			newName: "campfire-2",
			oldName: "campfire",
		});
	});

	test("deletes character chat files through the unstable internals bridge", async () => {
		unstableChatCatalogInternalsMock.deleteChat.mockResolvedValue({
			ok: true,
		});

		const result = await deleteChatCatalogEntry(createEntry());

		expect(result).toEqual({ ok: true });
		expect(unstableChatCatalogInternalsMock.deleteChat).toHaveBeenCalledWith({
			chatId: "chapter-1",
			entityId: "0",
			kind: "character",
		});
	});

	test("deletes group chat files through the unstable internals bridge", async () => {
		unstableChatCatalogInternalsMock.deleteChat.mockResolvedValue({
			ok: true,
		});

		const result = await deleteChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				key: "group:party:campfire",
				kind: "group",
			}),
		);

		expect(result).toEqual({ ok: true });
		expect(unstableChatCatalogInternalsMock.deleteChat).toHaveBeenCalledWith({
			chatId: "campfire",
			entityId: "party",
			kind: "group",
		});
	});

	test("returns typed failures for invalid chat rename and unavailable delete APIs", async () => {
		await expect(
			renameChatCatalogEntry(createEntry(), "chapter-1"),
		).resolves.toEqual({
			ok: false,
			reason: "invalid-name",
		});
		unstableChatCatalogInternalsMock.deleteChat.mockResolvedValue({
			ok: false,
			reason: "api-unavailable",
		});
		await expect(deleteChatCatalogEntry(createEntry())).resolves.toEqual({
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

	test("activates a favorite character through the public go command and persists the reload target", async () => {
		const characters = [
			{
				avatar: "hero.png",
				chat: "chapter-remembered",
				name: "Hero",
			},
			{
				avatar: "mage.png",
				chat: "mage-remembered",
				name: "Mage",
			},
		];
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				characterId: 0,
				characters,
				chatId: "chapter-remembered",
				groupId: null,
			},
		};
		const executeSlashCommandsWithOptions = vi.fn(async () => {
			contextRef.current = {
				...contextRef.current,
				characterId: 1,
				chatId: characters[1].chat,
				groupId: null,
			};
			return {
				pipe: "Mage",
			};
		});
		const selectCharacterById = vi.fn();
		const saveSettingsDebounced = vi.fn();
		contextRef.current.executeSlashCommandsWithOptions =
			executeSlashCommandsWithOptions;
		contextRef.current.selectCharacterById = selectCharacterById;
		contextRef.current.saveSettingsDebounced = saveSettingsDebounced;
		setMutableSillyTavernContext(contextRef);

		const result = await activateChatEntity({
			characterId: 1,
			entityId: "1",
			entityName: "Mage",
			kind: "character",
		});

		expect(result).toEqual({ ok: true });
		expect(executeSlashCommandsWithOptions).toHaveBeenCalledWith(
			'/go "mage.png"',
			expect.objectContaining({
				source: "astra-projecta",
			}),
		);
		expect(selectCharacterById).not.toHaveBeenCalled();
		expect(characters[1].chat).toBe("mage-remembered");
		expect(contextRef.current.chatId).toBe("mage-remembered");
		expect(saveSettingsDebounced).toHaveBeenCalledTimes(1);
	});

	test("activates a favorite group through the native group selector and persists the remembered chat", async () => {
		document.body.innerHTML =
			'<button class="group_select" data-grid="party"></button>';
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				characterId: 0,
				chatId: "chapter-remembered",
				groupId: null,
				groups: [
					{
						chat_id: "campfire",
						id: "party",
						name: "Party",
					},
				],
				saveSettingsDebounced: vi.fn(),
			},
		};
		document.querySelector(".group_select")?.addEventListener("click", () => {
			contextRef.current = {
				...contextRef.current,
				characterId: null,
				chatId: "campfire",
				groupId: "party",
			};
		});
		setMutableSillyTavernContext(contextRef);

		const result = await activateChatEntity({
			entityId: "party",
			entityName: "Party",
			kind: "group",
		});

		expect(result).toEqual({ ok: true });
		expect(contextRef.current.chatId).toBe("campfire");
		expect(contextRef.current.saveSettingsDebounced).toHaveBeenCalledTimes(
			1,
		);
	});

	test("falls back to the native character selector when the public go command is unavailable and persists the remembered chat", async () => {
		document.body.innerHTML =
			'<button class="character_select" data-chid="1"></button>';
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				characterId: 0,
				chatId: "chapter-remembered",
				groupId: null,
				saveSettingsDebounced: vi.fn(),
			},
		};
		document
			.querySelector(".character_select")
			?.addEventListener("click", () => {
				contextRef.current = {
					...contextRef.current,
					characterId: 1,
					chatId: "mage-remembered",
					groupId: null,
				};
			});
		setMutableSillyTavernContext(contextRef);

		const result = await activateChatEntity({
			characterId: 1,
			entityId: "1",
			entityName: "Mage",
			kind: "character",
		});

		expect(result).toEqual({ ok: true });
		expect(contextRef.current.chatId).toBe("mage-remembered");
		expect(contextRef.current.saveSettingsDebounced).toHaveBeenCalledTimes(
			1,
		);
	});

	test("falls back to the public go command when the native group selector is unavailable", async () => {
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				characterId: 0,
				chatId: "chapter-remembered",
				groupId: null,
				groups: [
					{
						chat_id: "campfire",
						id: "party",
						name: "Party",
					},
				],
			},
		};
		const executeSlashCommandsWithOptions = vi.fn(async () => {
			contextRef.current = {
				...contextRef.current,
				characterId: null,
				chatId: "campfire",
				groupId: "party",
			};
			return {
				pipe: "Party",
			};
		});
		contextRef.current.executeSlashCommandsWithOptions =
			executeSlashCommandsWithOptions;
		setMutableSillyTavernContext(contextRef);

		const result = await activateChatEntity({
			entityId: "party",
			entityName: "Party",
			kind: "group",
		});

		expect(result).toEqual({ ok: true });
		expect(executeSlashCommandsWithOptions).toHaveBeenCalledWith(
			'/go "Party"',
			expect.objectContaining({
				source: "astra-projecta",
			}),
		);
		expect(contextRef.current.chatId).toBe("campfire");
	});

	test("reports an already-current favorite entity without invoking native activation", async () => {
		const selectCharacterById = vi.fn();
		setSillyTavernContext({
			characterId: 1,
			chatId: "mage-remembered",
			groupId: null,
			selectCharacterById,
		});

		const result = await activateChatEntity({
			characterId: 1,
			entityId: "1",
			entityName: "Mage",
			kind: "character",
		});

		expect(result).toEqual({
			alreadyCurrent: true,
			ok: true,
		});
		expect(selectCharacterById).not.toHaveBeenCalled();
	});

	test("does not use the public character selector when no reload-aware activation path is available", async () => {
		const selectCharacterById = vi.fn().mockResolvedValue(undefined);
		setSillyTavernContext({
			characterId: 0,
			chatId: "chapter-remembered",
			groupId: null,
			selectCharacterById,
		});

		const result = await activateChatEntity({
			characterId: 1,
			entityId: "1",
			entityName: "Mage",
			kind: "character",
		});

		expect(result).toEqual({
			ok: false,
			reason: "api-unavailable",
		});
		expect(selectCharacterById).not.toHaveBeenCalled();
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
		setMutableSillyTavernContext(contextRef);

		const result = await openChatCatalogEntry(createEntry());

		expect(result).toEqual({ ok: true });
		expect(selectCharacterById).not.toHaveBeenCalled();
		expect(executeSlashCommandsWithOptions).not.toHaveBeenCalled();
		expect(openCharacterChat).not.toHaveBeenCalled();
		expect(loadedChats).toEqual(["chapter-1"]);
		expect(characters[0].chat).toBe("chapter-1");
		expect(saveSettingsDebounced).toHaveBeenCalled();
	});

	test("keeps waiting long enough for delayed native character activation to verify", async () => {
		vi.useFakeTimers();
		document.body.innerHTML =
			'<button class="character_select" data-chid="0"></button>';
		const characters = [
			{
				avatar: "hero.png",
				chat: "chapter-old",
				name: "Hero",
			},
		];
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				characterId: 2,
				characters,
				chatId: "other-chat",
				groupId: null,
				openCharacterChat: vi.fn().mockResolvedValue(undefined),
				saveSettingsDebounced: vi.fn(),
			},
		};
		document
			.querySelector(".character_select")
			?.addEventListener("click", () => {
				setTimeout(() => {
					contextRef.current = {
						...contextRef.current,
						characterId: 0,
						chatId: characters[0].chat,
						groupId: null,
					};
				}, 300);
			});
		setMutableSillyTavernContext(contextRef);

		const resultPromise = openChatCatalogEntry(createEntry());

		await vi.advanceTimersByTimeAsync(300);

		await expect(resultPromise).resolves.toEqual({ ok: true });
		expect(characters[0].chat).toBe("chapter-1");
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
		setMutableSillyTavernContext(contextRef);

		const result = await openChatCatalogEntry(createEntry());

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
		setMutableSillyTavernContext(contextRef);

		const result = await openChatCatalogEntry(createEntry());

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

	test("restores the character chat pointer when public fallback activation fails", async () => {
		vi.useFakeTimers();
		const characters = [
			{
				avatar: "hero.png",
				chat: "chapter-old",
				name: "Hero",
			},
		];
		const executeSlashCommandsWithOptions = vi.fn().mockResolvedValue({
			pipe: "Hero",
		});
		setSillyTavernContext({
			characterId: 2,
			characters,
			chatId: "other-chat",
			executeSlashCommandsWithOptions,
			groupId: null,
			openCharacterChat: vi.fn().mockResolvedValue(undefined),
		});

		const resultPromise = openChatCatalogEntry(createEntry());

		await vi.advanceTimersByTimeAsync(1_000);

		await expect(resultPromise).resolves.toEqual({
			ok: false,
			reason: "open-failed",
		});
		expect(characters[0].chat).toBe("chapter-old");
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
		setSillyTavernContext({
			characterId: 2,
			characters,
			chatId: "other-chat",
			groupId: null,
			openCharacterChat,
			selectCharacterById,
		});

		const result = await openChatCatalogEntry(createEntry());

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
		setSillyTavernContext({
			characterId: 0,
			getCurrentChatId: () => "chapter-1",
			openCharacterChat,
			selectCharacterById,
		});

		const result = await openChatCatalogEntry(createEntry());

		expect(result).toEqual({ alreadyCurrent: true, ok: true });
		expect(selectCharacterById).not.toHaveBeenCalled();
		expect(openCharacterChat).not.toHaveBeenCalled();
	});

	test("opens an already-active different character chat without reselecting the character and persists it", async () => {
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				characterId: 0,
				chatId: "chapter-old",
				groupId: null,
				selectCharacterById: vi.fn(),
				saveSettingsDebounced: vi.fn(),
			},
		};
		const selectCharacterById = vi.fn();
		contextRef.current.selectCharacterById = selectCharacterById;
		const openCharacterChat = vi.fn(async (chatId: string) => {
			contextRef.current = {
				...contextRef.current,
				chatId,
				getCurrentChatId: () => chatId,
			};
		});
		contextRef.current.openCharacterChat = openCharacterChat;
		contextRef.current.getCurrentChatId = () => "chapter-old";
		setMutableSillyTavernContext(contextRef);

		const result = await openChatCatalogEntry(createEntry());

		expect(result).toEqual({ ok: true });
		expect(selectCharacterById).not.toHaveBeenCalled();
		expect(openCharacterChat).toHaveBeenCalledTimes(1);
		expect(openCharacterChat).toHaveBeenCalledWith("chapter-1");
		expect(contextRef.current.saveSettingsDebounced).toHaveBeenCalledTimes(
			1,
		);
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
		setMutableSillyTavernContext(contextRef);

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
		);

		expect(result).toEqual({ ok: true });
		expect(
			contextRef.current.executeSlashCommandsWithOptions,
		).not.toHaveBeenCalled();
		expect(contextRef.current.openGroupChat).not.toHaveBeenCalled();
		expect(loadedChats).toEqual(["campfire"]);
		expect(group.chat_id).toBe("campfire");
	});

	test("restores the group chat pointer when native group activation times out", async () => {
		vi.useFakeTimers();
		document.body.innerHTML =
			'<button class="group_select" data-grid="party"></button>';
		const group = {
			chat_id: "party-home",
			id: "party",
			name: "Party",
		};
		setSillyTavernContext({
			chatId: "other-chat",
			groupId: null,
			groups: [group],
			openGroupChat: vi.fn().mockResolvedValue(undefined),
		});

		const resultPromise = openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
		);

		await vi.advanceTimersByTimeAsync(1_000);

		await expect(resultPromise).resolves.toEqual({
			ok: false,
			reason: "open-failed",
		});
		expect(group.chat_id).toBe("party-home");
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
		setMutableSillyTavernContext(contextRef);

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
		);

		expect(result).toEqual({ ok: true });
		expect(contextRef.current.saveSettingsDebounced).toHaveBeenCalledTimes(
			1,
		);
		expect(contextRef.current.openGroupChat).not.toHaveBeenCalled();
	});

	test("opens already-active group chats directly with openGroupChat and persists them", async () => {
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				chatId: "other-chat",
				groupId: "party",
				saveSettingsDebounced: vi.fn(),
			},
		};
		const openGroupChat = vi.fn(async (_groupId: string, chatId: string) => {
			contextRef.current = {
				...contextRef.current,
				chatId,
				getCurrentChatId: () => chatId,
			};
		});
		contextRef.current.openGroupChat = openGroupChat;
		setMutableSillyTavernContext(contextRef);

		const result = await openChatCatalogEntry(
			createEntry({
				entityId: "party",
				key: "group:party:campfire",
				kind: "group",
			}),
		);

		expect(result).toEqual({ ok: true });
		expect(openGroupChat).toHaveBeenCalledWith("party", "chapter-1");
		expect(contextRef.current.saveSettingsDebounced).toHaveBeenCalledTimes(
			1,
		);
	});

	test("fails inactive group activation when public slash execution is unavailable", async () => {
		const openGroupChat = vi.fn().mockResolvedValue(undefined);
		setSillyTavernContext({
			chatId: "other-chat",
			groupId: null,
			groups: [
				{
					id: "party",
					name: "Party",
				},
			],
			openGroupChat,
		});

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
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
		setSillyTavernContext({
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
		});

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
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
		setSillyTavernContext({
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
		});

		const result = await openChatCatalogEntry(
			createEntry({
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				key: "group:party:campfire",
				kind: "group",
			}),
		);

		expect(result).toEqual({
			ok: false,
			reason: "open-failed",
		});
		expect(openGroupChat).not.toHaveBeenCalled();
	});

	test("returns a failure result when the SillyTavern open API rejects", async () => {
		setSillyTavernContext({
			characterId: 0,
			chatId: "other-chat",
			groupId: null,
			openCharacterChat: vi.fn().mockRejectedValue(new Error("boom")),
		});

		const result = await openChatCatalogEntry(createEntry());

		expect(result).toEqual({
			ok: false,
			reason: "open-failed",
		});
	});
});
