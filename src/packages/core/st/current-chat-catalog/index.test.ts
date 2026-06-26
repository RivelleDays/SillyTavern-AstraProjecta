import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	createCurrentChatCatalogStore,
	createScopedChatCatalogStore,
	filterCurrentChatCatalogEntries,
	normalizeCurrentChatCatalogEntries,
	sortCurrentChatCatalogEntries,
	type CurrentChatCatalogEntityScope,
	type CurrentChatCatalogSnapshot,
} from "@/packages/core/st/current-chat-catalog";
import type { ChatCatalogEntry } from "@/packages/core/st/chat-catalog";

type Listener = (...args: unknown[]) => void;

function createJsonResponse(payload: unknown, ok = true): Response {
	return {
		json: vi.fn().mockResolvedValue(payload),
		ok,
		status: ok ? 200 : 500,
		statusText: ok ? "OK" : "Server Error",
	} as unknown as Response;
}

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});

	return {
		promise,
		reject,
		resolve,
	};
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
		characterId: 0,
		chatId: "chapter-1",
		entityId: "0",
		entityName: "Hero",
		fileName: "chapter-1.jsonl",
		fileSize: "12 KB",
		isCurrent: false,
		key: "character:0:chapter-1",
		kind: "character",
		lastMessageAt: Date.parse("2026-05-01T10:00:00.000Z"),
		lastMessageLabel: "2026/05/01 10:00 AM",
		lastMessagePreview: "Hero preview",
		messageCount: 4,
		...overrides,
	};
}

function expectSnapshotEntries(
	snapshot: CurrentChatCatalogSnapshot,
	entries: Array<Partial<ChatCatalogEntry>>,
) {
	expect(snapshot.entries).toEqual(
		entries.map((entry) => expect.objectContaining(entry)),
	);
}

describe("current chat catalog adapter", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.useRealTimers();
	});

	afterEach(() => {
		localStorage.clear();
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("normalizes chats for the active character only", () => {
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
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [],
		});

		const entries = normalizeCurrentChatCatalogEntries([
			{
				file_name: "chapter-1",
				file_size: "12 KB",
				last_mes: "2026-05-01T10:00:00.000Z",
				message_count: 4,
				preview_message: "Hero preview",
			},
		]);

		expect(entries).toEqual([
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/hero.png",
				characterId: 0,
				chatId: "chapter-1",
				entityId: "0",
				entityName: "Hero",
				fileName: "chapter-1.jsonl",
				isCurrent: true,
				key: "character:0:chapter-1",
				kind: "character",
				lastMessagePreview: "Hero preview",
				messageCount: 4,
			}),
		]);
	});

	test("marks current chats from getCurrentChatId when context chatId is stale", () => {
		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-stale",
					name: "Hero",
				},
			],
			chatId: "chapter-stale",
			getCurrentChatId: () => "chapter-active",
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [],
		});

		const entries = normalizeCurrentChatCatalogEntries([
			{
				file_name: "chapter-stale",
				file_size: "12 KB",
				last_mes: "2026-05-01T10:00:00.000Z",
				message_count: 4,
				preview_message: "Stale preview",
			},
			{
				file_name: "chapter-active",
				file_size: "16 KB",
				last_mes: "2026-05-02T10:00:00.000Z",
				message_count: 6,
				preview_message: "Active preview",
			},
		]);

		expect(entries).toEqual([
			expect.objectContaining({
				chatId: "chapter-stale",
				isCurrent: false,
			}),
			expect.objectContaining({
				chatId: "chapter-active",
				isCurrent: true,
			}),
		]);
	});

	test("lazy-loads explicit character and group entities on demand", async () => {
		const fetchSpy = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				createJsonResponse([
					{
						file_name: "mage-side-story",
						file_size: "8 KB",
						last_mes: "2026-05-03T12:00:00.000Z",
						message_count: 7,
						preview_message: "Mage preview",
					},
				]),
			)
			.mockResolvedValueOnce(
				createJsonResponse([
					{
						file_name: "party-night",
						file_size: "21 KB",
						last_mes: "2026-05-04T13:00:00.000Z",
						message_count: 11,
						preview_message: "Party preview",
					},
				]),
			);

		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
				{
					avatar: "mage.png",
					chat: "mage-home",
					name: "Mage",
				},
			],
			chatId: "chapter-1",
			getRequestHeaders: () => ({ "X-ST": "token" }),
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: {
				party: {
					chat_id: "party-home",
					id: "party",
					members: ["hero.png", "mage.png"],
					name: "Party",
				},
			},
		});

		const store = createScopedChatCatalogStore({
			fetchImpl: fetchSpy,
			now: () => Date.parse("2026-05-05T00:00:00.000Z"),
			storage: null,
		});

		expect(fetchSpy).not.toHaveBeenCalled();

		store.setEntity({ entityId: "1", kind: "character" });

		await waitFor(() => {
			expect(store.getSnapshot().status).toBe("ready");
		});
		expect(fetchSpy).toHaveBeenNthCalledWith(
			1,
			"/api/chats/search",
			expect.objectContaining({
				body: JSON.stringify({
					avatar_url: "mage.png",
					group_id: null,
					query: "",
				}),
				headers: expect.objectContaining({
					"Content-Type": "application/json",
					"X-ST": "token",
				}),
				method: "POST",
			}),
		);
		expectSnapshotEntries(store.getSnapshot(), [
			{
				avatarUrl: "/thumbs/avatar/mage.png",
				chatId: "mage-side-story",
				entityId: "1",
				entityName: "Mage",
				isCurrent: false,
				kind: "character",
				messageCount: 7,
			},
		]);

		store.setEntity({ entityId: "party", kind: "group" });

		await waitFor(() => {
			expect(fetchSpy).toHaveBeenCalledTimes(2);
			expect(store.getSnapshot().status).toBe("ready");
			expect(store.getSnapshot().activeEntity?.scopeKey).toBe(
				"group:party",
			);
		});
		expect(fetchSpy).toHaveBeenNthCalledWith(
			2,
			"/api/chats/search",
			expect.objectContaining({
				body: JSON.stringify({
					avatar_url: null,
					group_id: "party",
					query: "",
				}),
				method: "POST",
			}),
		);
		expectSnapshotEntries(store.getSnapshot(), [
			{
				chatId: "party-night",
				entityId: "party",
				entityName: "Party",
				isCurrent: false,
				kind: "group",
				messageCount: 11,
			},
		]);

		store.dispose();
	});

	test("ignores stale explicit entity refresh results after switching targets", async () => {
		const characterResponse = createDeferred<Response>();
		const groupResponse = createDeferred<Response>();
		const fetchSpy = vi
			.fn<typeof fetch>()
			.mockReturnValueOnce(characterResponse.promise)
			.mockReturnValueOnce(groupResponse.promise);
		const characterScope: CurrentChatCatalogEntityScope = {
			entityId: "1",
			kind: "character",
		};
		const groupScope: CurrentChatCatalogEntityScope = {
			entityId: "party",
			kind: "group",
		};

		setSillyTavernContext({
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
				{
					avatar: "mage.png",
					chat: "mage-home",
					name: "Mage",
				},
			],
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: {
				party: {
					chat_id: "party-home",
					id: "party",
					members: ["hero.png"],
					name: "Party",
				},
			},
		});

		const store = createScopedChatCatalogStore({
			fetchImpl: fetchSpy,
			storage: null,
		});

		store.setEntity(characterScope);
		store.setEntity(groupScope);

		groupResponse.resolve(
			createJsonResponse([
				{
					file_name: "party-night",
					last_mes: "2026-05-04T13:00:00.000Z",
					message_count: 11,
					preview_message: "Party preview",
				},
			]),
		);

		await waitFor(() => {
			expect(store.getSnapshot().activeEntity?.scopeKey).toBe(
				"group:party",
			);
			expect(store.getSnapshot().entries).toHaveLength(1);
		});

		characterResponse.resolve(
			createJsonResponse([
				{
					file_name: "mage-side-story",
					last_mes: "2026-05-03T12:00:00.000Z",
					message_count: 7,
					preview_message: "Mage preview",
				},
			]),
		);

		await Promise.resolve();
		await Promise.resolve();

		expect(store.getSnapshot().activeEntity?.scopeKey).toBe("group:party");
		expectSnapshotEntries(store.getSnapshot(), [
			{
				chatId: "party-night",
				entityId: "party",
				kind: "group",
			},
		]);

		store.dispose();
	});

	test("normalizes chats for the active group with member collage avatars", () => {
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
			],
			chatId: "campfire",
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groupId: "party",
			groups: [
				{
					avatar_url: "/img/five.png",
					chat_id: "campfire",
					id: "party",
					members: ["hero.png", "mage.png"],
					name: "Party",
				},
			],
		});

		const entries = normalizeCurrentChatCatalogEntries([
			{
				file_name: "campfire.jsonl",
				file_size: "24 KB",
				last_mes: "2026-05-02T10:00:00.000Z",
				message_count: 8,
				preview_message: "Party preview",
			},
		]);

		expect(entries).toEqual([
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/hero.png",
				chatId: "campfire",
				entityId: "party",
				entityName: "Party",
				fileName: "campfire.jsonl",
				groupAvatarUrls: [
					"/thumbs/avatar/hero.png",
					"/thumbs/avatar/mage.png",
				],
				isCurrent: true,
				key: "group:party:campfire",
				kind: "group",
				lastMessagePreview: "Party preview",
				messageCount: 8,
			}),
		]);
	});

	test("fetches the active character chat list through scoped search", async () => {
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
				Authorization: "Bearer token",
			}),
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [],
		});
		const fetchImpl = vi.fn().mockResolvedValue(
			createJsonResponse([
				{
					file_name: "chapter-1",
					file_size: "12 KB",
					last_mes: "2026-05-01T10:00:00.000Z",
					message_count: 4,
					preview_message: "Hero preview",
				},
			]),
		) as unknown as typeof fetch;

		const store = createCurrentChatCatalogStore({
			fetchImpl,
			storage: localStorage,
		});

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				cacheStatus: "fresh",
				status: "ready",
			});
			expectSnapshotEntries(store.getSnapshot(), [
				{
					entityName: "Hero",
					key: "character:0:chapter-1",
				},
			]);
		});
		expect(fetchImpl).toHaveBeenCalledWith(
			"/api/chats/search",
			expect.objectContaining({
				body: JSON.stringify({
					avatar_url: "hero.png",
					group_id: null,
					query: "",
				}),
				headers: {
					Authorization: "Bearer token",
					"Content-Type": "application/json",
				},
				method: "POST",
			}),
		);

		store.dispose();
	});

	test("fetches the active group chat list through scoped search", async () => {
		setSillyTavernContext({
			chatId: "campfire",
			getRequestHeaders: () => ({
				"X-CSRF-Token": "token",
			}),
			groupId: "party",
			groups: [
				{
					chat_id: "campfire",
					id: "party",
					name: "Party",
				},
			],
		});
		const fetchImpl = vi
			.fn()
			.mockResolvedValue(
				createJsonResponse([]),
			) as unknown as typeof fetch;

		const store = createCurrentChatCatalogStore({
			fetchImpl,
			storage: localStorage,
		});

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				status: "ready",
			});
		});
		expect(fetchImpl).toHaveBeenCalledWith(
			"/api/chats/search",
			expect.objectContaining({
				body: JSON.stringify({
					avatar_url: null,
					group_id: "party",
					query: "",
				}),
				headers: {
					"Content-Type": "application/json",
					"X-CSRF-Token": "token",
				},
				method: "POST",
			}),
		);

		store.dispose();
	});

	test("stays empty without an active character or group", () => {
		setSillyTavernContext({
			characterId: undefined,
			groupId: null,
		});
		const fetchImpl = vi.fn() as unknown as typeof fetch;

		const store = createCurrentChatCatalogStore({
			fetchImpl,
			storage: localStorage,
		});

		expect(store.getSnapshot()).toMatchObject({
			activeEntity: null,
			cacheStatus: "empty",
			entries: [],
			status: "ready",
		});
		expect(fetchImpl).not.toHaveBeenCalled();

		store.dispose();
	});

	test("keeps fresh cache scoped per active entity", async () => {
		const now = 10_000;
		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
				{
					avatar: "mage.png",
					chat: "intro",
					name: "Mage",
				},
			],
			chatId: "chapter-1",
		});
		const firstFetch = vi.fn().mockResolvedValue(
			createJsonResponse([
				{
					file_name: "chapter-1",
					message_count: 4,
					preview_message: "Hero preview",
				},
			]),
		) as unknown as typeof fetch;
		const firstStore = createCurrentChatCatalogStore({
			fetchImpl: firstFetch,
			now: () => now,
			storage: localStorage,
		});

		await waitFor(() => {
			expect(firstStore.getSnapshot().status).toBe("ready");
		});
		firstStore.dispose();

		const cachedFetch = vi.fn() as unknown as typeof fetch;
		const cachedStore = createCurrentChatCatalogStore({
			fetchImpl: cachedFetch,
			now: () => now + 1_000,
			storage: localStorage,
		});

		expect(cachedStore.getSnapshot()).toMatchObject({
			cacheStatus: "fresh",
			status: "ready",
		});
		expect(cachedStore.getSnapshot().entries[0]).toMatchObject({
			key: "character:0:chapter-1",
		});
		expect(cachedFetch).not.toHaveBeenCalled();
		cachedStore.dispose();

		setSillyTavernContext({
			characterId: 1,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
				{
					avatar: "mage.png",
					chat: "intro",
					name: "Mage",
				},
			],
			chatId: "intro",
		});
		const nextFetch = vi
			.fn()
			.mockResolvedValue(
				createJsonResponse([]),
			) as unknown as typeof fetch;
		const nextStore = createCurrentChatCatalogStore({
			fetchImpl: nextFetch,
			now: () => now + 1_000,
			storage: localStorage,
		});

		expect(nextStore.getSnapshot()).toMatchObject({
			cacheStatus: "empty",
			status: "loading",
		});
		await waitFor(() => {
			expect(nextFetch).toHaveBeenCalledTimes(1);
		});
		nextStore.dispose();
	});

	test("ignores stale async refresh results", async () => {
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
		});
		const firstRequest = createDeferred<Response>();
		const secondRequest = createDeferred<Response>();
		const fetchImpl = vi
			.fn()
			.mockReturnValueOnce(firstRequest.promise)
			.mockReturnValueOnce(
				secondRequest.promise,
			) as unknown as typeof fetch;
		const store = createCurrentChatCatalogStore({
			fetchImpl,
			storage: localStorage,
		});

		store.refresh();
		secondRequest.resolve(
			createJsonResponse([
				{
					file_name: "fresh",
					message_count: 2,
					preview_message: "Fresh preview",
				},
			]),
		);
		firstRequest.resolve(
			createJsonResponse([
				{
					file_name: "stale",
					message_count: 1,
					preview_message: "Stale preview",
				},
			]),
		);

		await waitFor(() => {
			expect(store.getSnapshot().entries[0]).toMatchObject({
				chatId: "fresh",
			});
		});
		await Promise.resolve();
		expect(store.getSnapshot().entries[0]).toMatchObject({
			chatId: "fresh",
		});

		store.dispose();
	});

	test("refreshes on exposed SillyTavern chat events and removes listeners on dispose", async () => {
		const eventSource = createEventSourceStub();
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
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
		});
		const fetchImpl = vi
			.fn()
			.mockResolvedValue(
				createJsonResponse([]),
			) as unknown as typeof fetch;

		const store = createCurrentChatCatalogStore({
			fetchImpl,
			storage: localStorage,
		});

		expect(eventSource.listenerCount("chat_changed")).toBe(1);
		await waitFor(() => {
			expect(fetchImpl).toHaveBeenCalledTimes(1);
		});

		eventSource.emit("chat_changed");
		await waitFor(() => {
			expect(fetchImpl).toHaveBeenCalledTimes(2);
		});

		store.dispose();
		expect(eventSource.listenerCount("chat_changed")).toBe(0);

		eventSource.emit("chat_changed");
		await Promise.resolve();

		expect(fetchImpl).toHaveBeenCalledTimes(2);
	});

	test("filters and sorts scoped entries by chat metadata", () => {
		const entries = [
			createEntry({
				chatId: "zeta",
				fileName: "zeta.jsonl",
				key: "character:0:zeta",
				lastMessageAt: 10,
				lastMessagePreview: "needle preview",
				messageCount: 1,
			}),
			createEntry({
				chatId: "alpha",
				fileName: "alpha.jsonl",
				key: "character:0:alpha",
				lastMessageAt: 20,
				lastMessagePreview: "other preview",
				messageCount: 8,
			}),
		];

		expect(filterCurrentChatCatalogEntries(entries, "needle")).toEqual([
			entries[0],
		]);
		expect(
			sortCurrentChatCatalogEntries(entries, "entity-asc").map(
				(entry) => entry.chatId,
			),
		).toEqual(["alpha", "zeta"]);
		expect(
			sortCurrentChatCatalogEntries(entries, "most-recent").map(
				(entry) => entry.chatId,
			),
		).toEqual(["alpha", "zeta"]);
		expect(
			sortCurrentChatCatalogEntries(entries, "most-messages").map(
				(entry) => entry.chatId,
			),
		).toEqual(["alpha", "zeta"]);
	});
});
