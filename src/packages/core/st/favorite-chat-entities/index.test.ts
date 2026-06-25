import { afterEach, describe, expect, test, vi } from "vitest";

import type { ChatCatalogEntry } from "@/packages/core/st/chat-catalog";
import {
	FAVORITE_CHAT_ENTITIES_DEFAULT_LIMIT,
	createFavoriteChatEntityScopeValue,
	isFavoriteChatEntityScopeValue,
	parseFavoriteChatEntityScopeValue,
	readFavoriteChatEntitiesSnapshot,
} from "@/packages/core/st/favorite-chat-entities";

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

describe("favorite chat entity adapter", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("detects favorite characters from root and extension fields while ignoring falsey favorites", () => {
		setSillyTavernContext({
			characters: [
				{
					avatar: "root.png",
					fav: true,
					name: "Root Favorite",
				},
				{
					avatar: "string-root.png",
					fav: "true",
					name: "String Root Favorite",
				},
				{
					avatar: "extension.png",
					data: {
						extensions: {
							fav: true,
						},
					},
					name: "Extension Favorite",
				},
				{
					avatar: "false-root.png",
					fav: false,
					name: "False Root",
				},
				{
					avatar: "false-extension.png",
					data: {
						extensions: {
							fav: "false",
						},
					},
					name: "False Extension",
				},
			],
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [],
		});

		const snapshot = readFavoriteChatEntitiesSnapshot({
			chatCatalogEntries: [],
			now: () => 10,
		});

		expect(snapshot.entities.map((entity) => entity.entityName)).toEqual([
			"Extension Favorite",
			"Root Favorite",
			"String Root Favorite",
		]);
		expect(snapshot.entities).toEqual([
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/extension.png",
				entityId: "2",
				kind: "character",
				scopeValue: "favorite:character:2",
				totalMessageCount: 0,
			}),
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/root.png",
				entityId: "0",
				kind: "character",
				scopeValue: "favorite:character:0",
				totalMessageCount: 0,
			}),
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/string-root.png",
				entityId: "1",
				kind: "character",
				scopeValue: "favorite:character:1",
				totalMessageCount: 0,
			}),
		]);
		expect(snapshot.limit).toBe(FAVORITE_CHAT_ENTITIES_DEFAULT_LIMIT);
		expect(snapshot.totalFavoriteCount).toBe(3);
		expect(snapshot.updatedAt).toBe(10);
	});

	test("detects favorite groups and resolves member collage avatars", () => {
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
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [
				{
					avatar_url: "/img/five.png",
					fav: true,
					id: "party",
					members: ["hero.png", "mage.png"],
					name: "Party",
				},
			],
		});

		const snapshot = readFavoriteChatEntitiesSnapshot({
			chatCatalogEntries: [],
			now: () => 20,
		});

		expect(snapshot.entities).toEqual([
			expect.objectContaining({
				avatarUrl: "/thumbs/avatar/hero.png",
				entityId: "party",
				entityName: "Party",
				groupAvatarUrls: [
					"/thumbs/avatar/hero.png",
					"/thumbs/avatar/mage.png",
				],
				kind: "group",
				scopeValue: "favorite:group:party",
			}),
		]);
	});

	test("aggregates chat counts and sorts favorites by messages, recency, then stable names", () => {
		setSillyTavernContext({
			characters: [
				{
					avatar: "alpha.png",
					fav: true,
					name: "Alpha",
				},
				{
					avatar: "beta.png",
					fav: true,
					name: "Beta",
				},
				{
					avatar: "gamma.png",
					fav: true,
					name: "Gamma",
				},
			],
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [
				{
					avatar_url: "/img/five.png",
					fav: true,
					id: "party",
					members: ["alpha.png"],
					name: "Party",
				},
			],
		});

		const snapshot = readFavoriteChatEntitiesSnapshot({
			chatCatalogEntries: [
				createEntry({
					entityId: "0",
					entityName: "Alpha",
					key: "character:0:a",
					lastMessageAt: 100,
					messageCount: 5,
				}),
				createEntry({
					chatId: "b",
					entityId: "0",
					entityName: "Alpha",
					key: "character:0:b",
					lastMessageAt: 500,
					messageCount: 5,
				}),
				createEntry({
					entityId: "1",
					entityName: "Beta",
					key: "character:1:a",
					lastMessageAt: 900,
					messageCount: 10,
				}),
				createEntry({
					entityId: "2",
					entityName: "Gamma",
					key: "character:2:a",
					lastMessageAt: 800,
					messageCount: 10,
				}),
				createEntry({
					entityId: "party",
					entityName: "Party",
					key: "group:party:a",
					kind: "group",
					lastMessageAt: 1200,
					messageCount: null,
				}),
			],
			now: () => 30,
		});

		expect(snapshot.entities.map((entity) => entity.entityName)).toEqual([
			"Beta",
			"Gamma",
			"Alpha",
			"Party",
		]);
		expect(snapshot.entities).toEqual([
			expect.objectContaining({
				chatCount: 1,
				entityName: "Beta",
				latestMessageAt: 900,
				totalMessageCount: 10,
			}),
			expect.objectContaining({
				chatCount: 1,
				entityName: "Gamma",
				latestMessageAt: 800,
				totalMessageCount: 10,
			}),
			expect.objectContaining({
				chatCount: 2,
				entityName: "Alpha",
				latestMessageAt: 500,
				totalMessageCount: 10,
			}),
			expect.objectContaining({
				chatCount: 1,
				entityName: "Party",
				latestMessageAt: 1200,
				totalMessageCount: 0,
			}),
		]);
	});

	test("keeps the current entity in the visible favorites before applying the limit", () => {
		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "current.png",
					fav: true,
					name: "Current",
				},
				{
					avatar: "one.png",
					fav: true,
					name: "One",
				},
				{
					avatar: "two.png",
					fav: true,
					name: "Two",
				},
			],
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [],
		});

		const snapshot = readFavoriteChatEntitiesSnapshot({
			chatCatalogEntries: [
				createEntry({
					entityId: "0",
					entityName: "Current",
					key: "character:0:current",
					messageCount: 50,
				}),
				createEntry({
					entityId: "1",
					entityName: "One",
					key: "character:1:one",
					messageCount: 20,
				}),
				createEntry({
					entityId: "2",
					entityName: "Two",
					key: "character:2:two",
					messageCount: 10,
				}),
			],
			limit: 1,
		});

		expect(snapshot.currentScopeValue).toBe("favorite:character:0");
		expect(snapshot.excludedCurrentEntity).toBeNull();
		expect(snapshot.totalFavoriteCount).toBe(3);
		expect(snapshot.entities).toEqual([
			expect.objectContaining({
				entityName: "Current",
				scopeValue: "favorite:character:0",
			}),
		]);
	});

	test("applies the favorite limit after sorting without removing the current entity", () => {
		setSillyTavernContext({
			characterId: 2,
			characters: [
				{
					avatar: "one.png",
					fav: true,
					name: "One",
				},
				{
					avatar: "two.png",
					fav: true,
					name: "Two",
				},
				{
					avatar: "current.png",
					fav: true,
					name: "Current",
				},
			],
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groups: [],
		});

		const snapshot = readFavoriteChatEntitiesSnapshot({
			chatCatalogEntries: [
				createEntry({
					entityId: "0",
					entityName: "One",
					key: "character:0:one",
					messageCount: 20,
				}),
				createEntry({
					entityId: "1",
					entityName: "Two",
					key: "character:1:two",
					messageCount: 10,
				}),
				createEntry({
					entityId: "2",
					entityName: "Current",
					key: "character:2:current",
					messageCount: 15,
				}),
			],
			limit: 2,
		});

		expect(snapshot.currentScopeValue).toBe("favorite:character:2");
		expect(snapshot.excludedCurrentEntity).toBeNull();
		expect(snapshot.totalFavoriteCount).toBe(3);
		expect(snapshot.entities.map((entity) => entity.scopeValue)).toEqual([
			"favorite:character:0",
			"favorite:character:2",
		]);
	});

	test("returns an empty fallback snapshot when SillyTavern context is unavailable or malformed", () => {
		const unavailableSnapshot = readFavoriteChatEntitiesSnapshot({
			chatCatalogEntries: [createEntry()],
			now: () => 40,
		});

		setSillyTavernContext({
			characters: null,
			groups: null,
		});
		const malformedSnapshot = readFavoriteChatEntitiesSnapshot({
			chatCatalogEntries: [createEntry()],
			now: () => 50,
		});

		expect(unavailableSnapshot).toEqual({
			currentScopeValue: null,
			entities: [],
			excludedCurrentEntity: null,
			limit: FAVORITE_CHAT_ENTITIES_DEFAULT_LIMIT,
			totalFavoriteCount: 0,
			updatedAt: 40,
		});
		expect(malformedSnapshot).toEqual({
			currentScopeValue: null,
			entities: [],
			excludedCurrentEntity: null,
			limit: FAVORITE_CHAT_ENTITIES_DEFAULT_LIMIT,
			totalFavoriteCount: 0,
			updatedAt: 50,
		});
	});

	test("creates and parses favorite entity scope values without accepting pinned section values", () => {
		expect(createFavoriteChatEntityScopeValue("character", "2")).toBe(
			"favorite:character:2",
		);
		expect(createFavoriteChatEntityScopeValue("group", "party:night")).toBe(
			"favorite:group:party:night",
		);
		expect(isFavoriteChatEntityScopeValue("favorite:group:party")).toBe(
			true,
		);
		expect(isFavoriteChatEntityScopeValue("global")).toBe(false);
		expect(isFavoriteChatEntityScopeValue("current-context")).toBe(false);
		expect(
			parseFavoriteChatEntityScopeValue("favorite:group:party:night"),
		).toEqual({
			entityId: "party:night",
			kind: "group",
		});
		expect(
			parseFavoriteChatEntityScopeValue("favorite:persona:main"),
		).toBeNull();
	});
});
