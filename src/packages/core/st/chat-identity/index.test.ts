import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

type Listener = (...args: unknown[]) => void;

function createEventSourceStub() {
	const listeners = new Map<string, Set<Listener>>();

	return {
		emit(event: string, ...args: unknown[]) {
			const activeListeners = listeners.get(event);
			if (!activeListeners) {
				return;
			}

			for (const listener of activeListeners) {
				listener(...args);
			}
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

function setSillyTavernContext(contextRef: { current: unknown }) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => contextRef.current,
	};
}

describe("current chat identity", () => {
	beforeEach(() => {
		vi.resetModules();
		(globalThis as Record<string, unknown>).default_avatar =
			"/img/five.png";
	});

	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"default_avatar",
		);
		vi.unstubAllGlobals();
	});

	test("reads the current character chat identity from SillyTavern context", async () => {
		const contextRef: { current: unknown } = {
			current: {
				characterId: 0,
				characters: [
					{
						avatar: "hero.png",
						chat: "chapter-1",
						name: "Hero",
					},
				],
				chatId: "chapter-1",
				getThumbnailUrl: vi.fn(() => "/thumbs/hero.png"),
			},
		};

		setSillyTavernContext(contextRef);

		const { readCurrentChatIdentitySnapshot } =
			await import("@/packages/core/st/chat-identity");

		expect(
			readCurrentChatIdentitySnapshot({ documentRef: document }),
		).toMatchObject({
			avatarSource: "character-thumbnail",
			characterId: 0,
			chatFileName: "chapter-1",
			entityName: "Hero",
			groupAvatarUrls: [],
			groupId: null,
			hasActiveChat: true,
			kind: "character",
			thumbnailUrl: "/thumbs/hero.png",
		});
	});

	test("prefers SillyTavern getCurrentChatId over a stale context chatId", async () => {
		const contextRef: { current: unknown } = {
			current: {
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
				getThumbnailUrl: vi.fn(() => "/thumbs/hero.png"),
			},
		};

		setSillyTavernContext(contextRef);

		const { readCurrentChatIdentitySnapshot } =
			await import("@/packages/core/st/chat-identity");

		expect(
			readCurrentChatIdentitySnapshot({ documentRef: document }),
		).toMatchObject({
			chatFileName: "chapter-active",
			entityName: "Hero",
			hasActiveChat: true,
			kind: "character",
		});
	});

	test("prefers a custom group avatar over member thumbnail composition", async () => {
		const contextRef = {
			current: {
				chatId: "party-night",
				getThumbnailUrl: vi.fn(
					(type: string, file: string) => `/thumbs/${type}/${file}`,
				),
				groupId: "group-1",
				groups: [
					{
						avatar_url: "/groups/party-night.png",
						chat_id: "party-night",
						id: "group-1",
						members: ["hero.png", "mage.png"],
						name: "Party Night",
					},
				],
			},
		};

		setSillyTavernContext(contextRef);

		const { readCurrentChatIdentitySnapshot } =
			await import("@/packages/core/st/chat-identity");

		expect(
			readCurrentChatIdentitySnapshot({ documentRef: document }),
		).toMatchObject({
			avatarSource: "group-custom-avatar",
			chatFileName: "party-night",
			entityName: "Party Night",
			groupAvatarUrls: [],
			groupId: "group-1",
			hasActiveChat: true,
			kind: "group",
			thumbnailUrl: "/groups/party-night.png",
		});
	});

	test("reads group member collage avatar URLs from the current chat identity", async () => {
		const contextRef = {
			current: {
				chatId: "party-night",
				getThumbnailUrl: vi.fn(
					(type: string, file: string) => `/thumbs/${type}/${file}`,
				),
				groupId: "group-1",
				groups: [
					{
						avatar_url: "/img/five.png",
						chat_id: "party-night",
						id: "group-1",
						members: ["hero.png", "mage.png"],
						name: "Party Night",
					},
				],
			},
		};

		setSillyTavernContext(contextRef);

		const { readCurrentChatIdentitySnapshot } =
			await import("@/packages/core/st/chat-identity");

		expect(
			readCurrentChatIdentitySnapshot({ documentRef: document }),
		).toMatchObject({
			avatarSource: "group-member-thumbnail",
			chatFileName: "party-night",
			entityName: "Party Night",
			groupAvatarUrls: [
				"/thumbs/avatar/hero.png",
				"/thumbs/avatar/mage.png",
			],
			groupId: "group-1",
			hasActiveChat: true,
			kind: "group",
			thumbnailUrl: "/thumbs/avatar/hero.png",
		});
	});

	test("returns a stable empty snapshot when no chat is active", async () => {
		const contextRef = {
			current: {
				characterId: 0,
				characters: [
					{
						avatar: "hero.png",
						chat: "",
						name: "Hero",
					},
				],
				chatId: "",
				getThumbnailUrl: vi.fn(() => "/thumbs/hero.png"),
			},
		};

		setSillyTavernContext(contextRef);

		const { readCurrentChatIdentitySnapshot } =
			await import("@/packages/core/st/chat-identity");

		expect(
			readCurrentChatIdentitySnapshot({ documentRef: document }),
		).toMatchObject({
			avatarSource: "fallback",
			chatFileName: "",
			groupAvatarUrls: [],
			hasActiveChat: false,
			kind: "none",
			thumbnailUrl: "/img/five.png",
		});
	});

	test("builds group collage URLs from group members like the native preview", async () => {
		const contextRef = {
			current: {
				chatId: "party-night",
				characters: [
					{ avatar: "hero.png", name: "Hero" },
					{ avatar: "mage.png", name: "Mage" },
					{ avatar: "rogue.png", name: "Rogue" },
				],
				getThumbnailUrl: vi.fn(
					(type: string, file: string) => `/thumbs/${type}/${file}`,
				),
				groupId: "group-1",
				groups: [
					{
						avatar_url: "/img/five.png",
						chat_id: "party-night",
						disabled_members: ["rogue.png"],
						id: "group-1",
						members: ["hero.png", "mage.png", "rogue.png"],
						name: "Party Night",
					},
				],
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatIdentityStore } =
			await import("@/packages/core/st/chat-identity");
		const store = createCurrentChatIdentityStore({ documentRef: document });

		expect(store.getSnapshot()).toMatchObject({
			avatarSource: "group-member-thumbnail",
			groupAvatarUrls: [
				"/thumbs/avatar/hero.png",
				"/thumbs/avatar/mage.png",
				"/thumbs/avatar/rogue.png",
			],
			thumbnailUrl: "/thumbs/avatar/hero.png",
		});

		store.dispose();
	});

	test("refreshes the current character snapshot when CHARACTER_EDITED is emitted", async () => {
		const eventSource = createEventSourceStub();
		const contextRef = {
			current: {
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
					CHARACTER_EDITED: "character_edited",
				},
				getThumbnailUrl: vi.fn(
					(type: string, file: string) => `/thumbs/${type}/${file}`,
				),
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatIdentityStore } =
			await import("@/packages/core/st/chat-identity");
		const store = createCurrentChatIdentityStore({ documentRef: document });
		const listener = vi.fn();
		store.subscribe(listener);

		contextRef.current = {
			...contextRef.current,
			characters: [
				{
					avatar: "hero-v2.png",
					chat: "chapter-1",
					name: "Hero",
				},
			],
		};
		eventSource.emit("character_edited", {
			character: { avatar: "hero-v2.png" },
			id: 0,
		});

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				avatarSource: "character-thumbnail",
				thumbnailUrl:
					"/thumbs/avatar/hero-v2.png?astra_avatar_revision=1",
			});
		});
		expect(listener).toHaveBeenCalled();

		store.dispose();
	});

	test("keeps a group member collage stable across normal refresh events", async () => {
		const eventSource = createEventSourceStub();
		const contextRef: { current: unknown } = {
			current: {
				chatId: "party-night",
				eventSource,
				eventTypes: {
					SETTINGS_UPDATED: "settings_updated",
				},
				getThumbnailUrl: vi.fn(
					(type: string, file: string) => `/thumbs/${type}/${file}`,
				),
				groupId: "group-1",
				groups: [
					{
						avatar_url: "/img/five.png",
						chat_id: "party-night",
						id: "group-1",
						members: ["hero.png", "mage.png"],
						name: "Party Night",
					},
				],
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatIdentityStore } =
			await import("@/packages/core/st/chat-identity");
		const store = createCurrentChatIdentityStore({ documentRef: document });
		const listener = vi.fn();
		store.subscribe(listener);

		eventSource.emit("settings_updated");
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(store.getSnapshot()).toMatchObject({
			avatarSource: "group-member-thumbnail",
			groupAvatarUrls: [
				"/thumbs/avatar/hero.png",
				"/thumbs/avatar/mage.png",
			],
			thumbnailUrl: "/thumbs/avatar/hero.png",
		});
		expect(listener).not.toHaveBeenCalled();

		store.dispose();
	});

	test("ignores unrelated CHARACTER_EDITED events for the current character avatar", async () => {
		const eventSource = createEventSourceStub();
		const contextRef = {
			current: {
				characterId: 0,
				characters: [
					{
						avatar: "hero.png",
						chat: "chapter-1",
						name: "Hero",
					},
					{
						avatar: "other.png",
						chat: "other-chat",
						name: "Other",
					},
				],
				chatId: "chapter-1",
				eventSource,
				eventTypes: {
					CHARACTER_EDITED: "character_edited",
				},
				getThumbnailUrl: vi.fn(
					(type: string, file: string) => `/thumbs/${type}/${file}`,
				),
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatIdentityStore } =
			await import("@/packages/core/st/chat-identity");
		const store = createCurrentChatIdentityStore({ documentRef: document });
		const listener = vi.fn();
		store.subscribe(listener);

		eventSource.emit("character_edited", {
			character: { avatar: "other-v2.png" },
			id: 1,
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(store.getSnapshot()).toMatchObject({
			thumbnailUrl: "/thumbs/avatar/hero.png",
		});
		expect(listener).not.toHaveBeenCalled();

		store.dispose();
	});

	test("ignores GROUP_UPDATED events while the current chat is a character", async () => {
		const eventSource = createEventSourceStub();
		const contextRef = {
			current: {
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
					GROUP_UPDATED: "group_updated",
				},
				getThumbnailUrl: vi.fn(
					(type: string, file: string) => `/thumbs/${type}/${file}`,
				),
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatIdentityStore } =
			await import("@/packages/core/st/chat-identity");
		const store = createCurrentChatIdentityStore({ documentRef: document });
		const listener = vi.fn();
		store.subscribe(listener);

		eventSource.emit("group_updated");
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(store.getSnapshot()).toMatchObject({
			avatarSource: "character-thumbnail",
			thumbnailUrl: "/thumbs/avatar/hero.png",
		});
		expect(listener).not.toHaveBeenCalled();

		store.dispose();
	});

	test("refreshes group member thumbnail URLs when a current group member avatar changes", async () => {
		const eventSource = createEventSourceStub();
		const contextRef: { current: unknown } = {
			current: {
				chatId: "party-night",
				eventSource,
				eventTypes: {
					CHARACTER_EDITED: "character_edited",
				},
				getThumbnailUrl: vi.fn(
					(type: string, file: string) => `/thumbs/${type}/${file}`,
				),
				groupId: "group-1",
				groups: [
					{
						avatar_url: "/img/five.png",
						chat_id: "party-night",
						id: "group-1",
						members: ["hero.png", "mage.png"],
						name: "Party Night",
					},
				],
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatIdentityStore } =
			await import("@/packages/core/st/chat-identity");
		const store = createCurrentChatIdentityStore({ documentRef: document });

		eventSource.emit("character_edited", {
			character: { avatar: "hero.png" },
		});

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				groupAvatarUrls: [
					"/thumbs/avatar/hero.png?astra_avatar_revision=1",
					"/thumbs/avatar/mage.png?astra_avatar_revision=1",
				],
				thumbnailUrl: "/thumbs/avatar/hero.png?astra_avatar_revision=1",
			});
		});

		store.dispose();
	});

	test("does not preserve a group member collage after the active chat changes", async () => {
		const eventSource = createEventSourceStub();
		const contextRef: { current: unknown } = {
			current: {
				chatId: "party-night",
				eventSource,
				eventTypes: {
					SETTINGS_UPDATED: "settings_updated",
				},
				getThumbnailUrl: vi.fn(
					(type: string, file: string) => `/thumbs/${type}/${file}`,
				),
				groupId: "group-1",
				groups: [
					{
						avatar_url: "/img/five.png",
						chat_id: "party-night",
						id: "group-1",
						members: ["hero.png", "mage.png"],
						name: "Party Night",
					},
				],
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatIdentityStore } =
			await import("@/packages/core/st/chat-identity");
		const store = createCurrentChatIdentityStore({ documentRef: document });

		expect(store.getSnapshot()).toMatchObject({
			kind: "group",
			groupAvatarUrls: [
				"/thumbs/avatar/hero.png",
				"/thumbs/avatar/mage.png",
			],
		});

		contextRef.current = {
			characterId: 0,
			characters: [
				{
					avatar: "solo.png",
					chat: "solo-chat",
					name: "Solo",
				},
			],
			chatId: "solo-chat",
			eventSource,
			eventTypes: {
				SETTINGS_UPDATED: "settings_updated",
			},
			getThumbnailUrl: vi.fn(
				(type: string, file: string) => `/thumbs/${type}/${file}`,
			),
			groupId: null,
			groups: [],
		};
		eventSource.emit("settings_updated");

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				avatarSource: "character-thumbnail",
				groupAvatarUrls: [],
				kind: "character",
				thumbnailUrl: "/thumbs/avatar/solo.png",
			});
		});

		store.dispose();
	});
});
