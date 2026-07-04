import * as React from "react";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
	AstraMainInterface,
	getAstraMainInterfaceRoutes,
} from "@/packages/features/astra-main-interface";
import { SILLYTAVERN_INTERFACE_ROUTES } from "@/app/shared/sillytavern-interface";
import {
	CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
	CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
	CHAT_MENU_SORT_MODE_STORAGE_KEY,
	CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
	CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
	CURRENT_CHAT_MENU_SORT_MODE_STORAGE_KEY,
} from "@/packages/features/astra-main-interface/chat-list/chatMenuDisplayPreferences";
import type {
	ChatCatalogEntry,
	ChatCatalogSnapshot,
	ChatCatalogStore,
	ActivateChatEntity,
	ChatEntityActivationResult,
	DeleteChatCatalogEntry,
	ExportChatCatalogEntry,
	OpenChatCatalogEntry,
	RenameChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import type {
	CurrentChatCatalogSnapshot,
	CurrentChatCatalogStore,
	ScopedChatCatalogStore,
} from "@/packages/core/st/current-chat-catalog";
import type {
	CurrentChatIdentitySnapshot,
	CurrentChatIdentityStore,
} from "@/packages/core/st/chat-identity";
import type {
	FavoriteChatEntitiesSnapshot,
	FavoriteChatEntitiesStore,
	FavoriteChatEntity,
} from "@/packages/core/st/favorite-chat-entities";
import {
	createChatCategoryStore,
	type ChatCategoryStore,
} from "@/packages/core/st/chat-categories";

const DIALOG_TITLE_WARNING =
	"`DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.";
const DIALOG_DESCRIPTION_WARNING =
	"Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.";
const ROW_OVERLAY_UNMOUNT_TIMEOUT_MS = 2000;

async function waitForDialogToUnmount(name: string) {
	await waitFor(
		() => {
			expect(
				screen.queryByRole("dialog", { name }),
			).not.toBeInTheDocument();
		},
		{ timeout: ROW_OVERLAY_UNMOUNT_TIMEOUT_MS },
	);
}

function createEntry(
	overrides: Partial<ChatCatalogEntry> = {},
): ChatCatalogEntry {
	const index = overrides.chatId ?? "chapter-1";

	return {
		avatarUrl: "/thumbs/avatar/hero.png",
		chatId: index,
		entityId: "0",
		entityName: "Hero",
		fileName: `${index}.jsonl`,
		fileSize: "12 KB",
		key: `character:0:${index}`,
		kind: "character",
		lastMessageAt: Date.parse("2026-05-01T10:00:00.000Z"),
		lastMessageLabel: "2026/05/01 10:00 AM",
		lastMessagePreview: "Hero preview",
		messageCount: 4,
		...overrides,
	};
}

function createSnapshot(
	overrides: Partial<ChatCatalogSnapshot> = {},
): ChatCatalogSnapshot {
	return {
		cacheStatus: "empty",
		entries: [],
		errorMessage: "",
		isLikelyTruncated: false,
		status: "ready",
		updatedAt: null,
		...overrides,
	};
}

function createStoreStub(initialSnapshot: ChatCatalogSnapshot) {
	let snapshot = initialSnapshot;
	const listeners = new Set<() => void>();
	const store: ChatCatalogStore = {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn((listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	};

	return {
		dispatch(nextSnapshot: ChatCatalogSnapshot) {
			snapshot = nextSnapshot;
			listeners.forEach((listener) => listener());
		},
		store,
	};
}

function createCurrentSnapshot(
	overrides: Partial<CurrentChatCatalogSnapshot> = {},
): CurrentChatCatalogSnapshot {
	return {
		activeEntity: {
			activeChatId: "chapter-1",
			avatarUrl: "/thumbs/avatar/hero.png",
			characterId: 0,
			entityId: "0",
			entityName: "Hero",
			kind: "character",
			requestAvatarUrl: "hero.png",
			requestGroupId: null,
			scopeKey: "character:0",
		},
		cacheStatus: "empty",
		entries: [],
		errorMessage: "",
		status: "ready",
		updatedAt: null,
		...overrides,
	};
}

function createCurrentStoreStub(initialSnapshot: CurrentChatCatalogSnapshot) {
	let snapshot = initialSnapshot;
	const listeners = new Set<() => void>();
	const store: CurrentChatCatalogStore = {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn((listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	};

	return {
		dispatch(nextSnapshot: CurrentChatCatalogSnapshot) {
			snapshot = nextSnapshot;
			listeners.forEach((listener) => listener());
		},
		store,
	};
}

function createScopedStoreStub(initialSnapshot: CurrentChatCatalogSnapshot) {
	let snapshot = initialSnapshot;
	const listeners = new Set<() => void>();
	const store: ScopedChatCatalogStore = {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		setEntity: vi.fn(),
		subscribe: vi.fn((listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	};

	return {
		dispatch(nextSnapshot: CurrentChatCatalogSnapshot) {
			snapshot = nextSnapshot;
			listeners.forEach((listener) => listener());
		},
		store,
	};
}

function createIdentitySnapshot(
	overrides: Partial<CurrentChatIdentitySnapshot> = {},
): CurrentChatIdentitySnapshot {
	return {
		avatarSource: "fallback",
		characterId: 0,
		chatFileName: "chapter-1",
		entityName: "Hero",
		groupAvatarUrls: [],
		groupId: null,
		hasActiveChat: true,
		kind: "character",
		thumbnailUrl: "/thumbs/avatar/hero.png",
		updatedAt: Date.parse("2026-05-01T10:00:00.000Z"),
		...overrides,
	};
}

function createIdentityStoreStub(initialSnapshot: CurrentChatIdentitySnapshot) {
	let snapshot = initialSnapshot;
	const listeners = new Set<() => void>();
	const store: CurrentChatIdentityStore = {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn((listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	};

	return {
		dispatch(nextSnapshot: CurrentChatIdentitySnapshot) {
			snapshot = nextSnapshot;
			listeners.forEach((listener) => listener());
		},
		store,
	};
}

function createFavoriteEntity(
	overrides: Partial<FavoriteChatEntity> = {},
): FavoriteChatEntity {
	return {
		avatarUrl: "/thumbs/avatar/mage.png",
		characterId: 1,
		chatCount: 2,
		entityId: "1",
		entityName: "Mage",
		groupAvatarUrls: [],
		kind: "character",
		latestMessageAt: Date.parse("2026-05-03T12:00:00.000Z"),
		scopeValue: "favorite:character:1",
		totalMessageCount: 12,
		...overrides,
	};
}

function createFavoriteSnapshot(
	overrides: Partial<FavoriteChatEntitiesSnapshot> = {},
): FavoriteChatEntitiesSnapshot {
	return {
		currentScopeValue: "favorite:character:0",
		entities: [],
		excludedCurrentEntity: null,
		limit: 25,
		totalFavoriteCount: 0,
		updatedAt: Date.parse("2026-05-05T00:00:00.000Z"),
		...overrides,
	};
}

function createFavoriteStoreStub(
	initialSnapshot: FavoriteChatEntitiesSnapshot,
) {
	let snapshot = initialSnapshot;
	const listeners = new Set<() => void>();
	const store: FavoriteChatEntitiesStore = {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn((listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	};

	return {
		dispatch(nextSnapshot: FavoriteChatEntitiesSnapshot) {
			snapshot = nextSnapshot;
			listeners.forEach((listener) => listener());
		},
		store,
	};
}

function createChatCategoryContext() {
	return {
		extensionSettings: {},
		saveSettingsDebounced: vi.fn(),
	};
}

function createSeededChatCategoryStore({ ids }: { ids: string[] }): {
	context: ReturnType<typeof createChatCategoryContext>;
	store: ChatCategoryStore;
} {
	const context = createChatCategoryContext();
	const createId = vi.fn();
	ids.forEach((id) => {
		createId.mockReturnValueOnce(id);
	});

	return {
		context,
		store: createChatCategoryStore({
			createId,
			getContext: () => context,
		}),
	};
}

function openGlobalChatsTab() {
	const chatsPanel = document.querySelector(
		".astra-smooth-tabs__panel[data-route='global-chats']",
	);
	if (chatsPanel?.getAttribute("data-state") === "active") {
		return;
	}

	const globalTabList = screen.queryByRole("tablist", {
		name: "Global sections",
	});
	if (!globalTabList) {
		return;
	}

	fireEvent.click(within(globalTabList).getByRole("tab", { name: "Chats" }));
}

function openControlsDrawer() {
	openGlobalChatsTab();
	fireEvent.click(
		screen.getByRole("button", {
			name: "Chat menu controls",
		}),
	);
}

function openCurrentControlsDrawer() {
	fireEvent.click(
		screen.getByRole("button", {
			name: "Current chat menu controls",
		}),
	);
}

function openDropdownTrigger(name: string) {
	fireEvent.pointerDown(screen.getByRole("button", { name }), {
		button: 0,
		ctrlKey: false,
	});
}

function getGlobalChatsPanel() {
	openGlobalChatsTab();

	return document.querySelector(
		".astra-smooth-tabs__panel[data-route='global-chats']",
	) as HTMLElement;
}

function getChatRowButtons() {
	return Array.from(
		getGlobalChatsPanel().querySelectorAll<HTMLElement>(
			".astra-main-interface-chat-row",
		),
	);
}

function getCurrentChatRowButtons() {
	return Array.from(
		document.querySelectorAll<HTMLElement>(
			".astra-main-interface-current-chat-row",
		),
	);
}

function expectNoCurrentChatRowChildSelectors(row: HTMLElement) {
	expect(
		row.querySelector("[class*='astra-main-interface-current-chat-row__']"),
	).not.toBeInTheDocument();
}

function switchToCurrentContextSection() {
	fireEvent.click(
		within(
			screen.getByRole("tablist", {
				name: "Main UI sections",
			}),
		).getByRole("tab", {
			name: "Current Character/Group",
		}),
	);
}

function mockElementWidth(element: HTMLElement, width: number) {
	Object.defineProperty(element, "offsetWidth", {
		configurable: true,
		value: width,
	});
	element.getBoundingClientRect = vi.fn(() => ({
		bottom: 0,
		height: 0,
		left: 0,
		right: width,
		top: 0,
		width,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	}));
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

describe("AstraMainInterface", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		vi.useRealTimers();
		window.localStorage.clear();
		Reflect.deleteProperty(globalThis as Record<string, unknown>, "toastr");
	});

	test("exposes the visible main interface routes", () => {
		expect(getAstraMainInterfaceRoutes()).toEqual([
			{
				key: "global-home",
				titleKey: "astraMainInterface.global.tabs.home",
			},
			{
				key: "global-chats",
				titleKey: "astraMainInterface.global.tabs.chats",
			},
			{
				key: "global-categories",
				titleKey: "astraMainInterface.global.tabs.categories",
			},
			{
				key: "current-context-chats",
				titleKey: "astraMainInterface.currentContext.tabs.chats",
			},
			{
				key: "current-context-categories",
				titleKey: "astraMainInterface.currentContext.tabs.categories",
			},
			{
				key: "favorite-character-chats",
				titleKey: "astraMainInterface.favorite.tabs.chats",
			},
			{
				key: "favorite-character-categories",
				titleKey: "astraMainInterface.favorite.tabs.categories",
			},
			{
				key: "favorite-group-chats",
				titleKey: "astraMainInterface.favorite.tabs.chats",
			},
			{
				key: "favorite-group-categories",
				titleKey: "astraMainInterface.favorite.tabs.categories",
			},
		]);
	});

	test("renders global home tabs by default", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Default Hero",
					}),
				],
			}),
		);
		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		const sectionTabs = screen.getByRole("tablist", {
			name: "Main UI sections",
		});
		expect(
			within(sectionTabs).getByRole("tab", { name: "Global" }),
		).toHaveAttribute("data-state", "active");
		const globalScopeFrame = within(sectionTabs)
			.getByRole("tab", { name: "Global" })
			.querySelector(".astra-main-interface__scope-button-frame");
		expect(globalScopeFrame).toHaveTextContent("ST");
		expect(globalScopeFrame?.querySelector("svg")).not.toBeInTheDocument();
		expect(
			within(sectionTabs).getByRole("tab", {
				name: "Current Character/Group",
			}),
		).toHaveAttribute("data-state", "inactive");

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		expect(
			within(globalTabs)
				.getAllByRole("tab")
				.map((tab) => tab.textContent),
		).toEqual(["Home", "Chats", "Categories"]);
		expect(
			within(globalTabs).getByRole("tab", { name: "Home" }),
		).toHaveAttribute("data-state", "active");
		expect(
			within(globalTabs).getByRole("tab", { name: "Chats" }),
		).toHaveAttribute("data-state", "inactive");
		expect(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		).toHaveAttribute("data-state", "inactive");
		expect(
			globalTabs.querySelector(".astra-smooth-tabs__trigger-icon"),
		).not.toBeInTheDocument();
		expect(
			within(
				document.querySelector(
					".astra-main-interface-home__recent-list",
				) as HTMLElement,
			).getByText("Default Hero"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Chat menu controls" }),
		).not.toBeInTheDocument();
		expect(screen.getByText("Recent Chats")).toBeInTheDocument();
		expect(document.querySelector(".astra-main-interface")).toHaveAttribute(
			"data-route",
			"global-home",
		);
	});

	test("renders home shortcuts with route icons and opens SillyTavern interface routes", () => {
		const storeStub = createStoreStub(createSnapshot());
		const openRoute = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				renderSillyTavernInterfaceRouteIcon={({
					className,
					iconKey,
				}) => <span className={className} data-route-icon={iconKey} />}
				onSillyTavernInterfaceRouteOpen={openRoute}
			/>,
		);

		const shortcutRow = document.querySelector(
			".astra-main-interface-home__shortcut-row",
		);
		expect(shortcutRow).toBeInTheDocument();
		expect(
			shortcutRow?.querySelectorAll(
				".astra-main-interface-home__shortcut-separator",
			),
		).toHaveLength(0);

		const shortcuts = [
			{
				iconKey: "ai-settings",
				label: "AI Settings",
				route: SILLYTAVERN_INTERFACE_ROUTES.aiSettings,
			},
			{
				iconKey: "user-settings",
				label: "User Settings",
				route: SILLYTAVERN_INTERFACE_ROUTES.userSettings,
			},
			{
				iconKey: "lorebook",
				label: "Lorebook",
				route: SILLYTAVERN_INTERFACE_ROUTES.lorebook,
			},
			{
				iconKey: "extensions",
				label: "Extensions",
				route: SILLYTAVERN_INTERFACE_ROUTES.extensions,
			},
			{
				iconKey: "backgrounds",
				label: "Backgrounds",
				route: SILLYTAVERN_INTERFACE_ROUTES.backgrounds,
			},
			{
				iconKey: "character-management",
				label: "Character Management",
				route: SILLYTAVERN_INTERFACE_ROUTES.characterManagement,
			},
		] as const;

		expect(
			shortcutRow?.querySelectorAll(
				".astra-main-interface-home__shortcut-deco-icon[aria-hidden='true']",
			),
		).toHaveLength(shortcuts.length);

		for (const shortcut of shortcuts) {
			const button = screen.getByRole("button", {
				name: shortcut.label,
			});

			expect(
				button.querySelector(`[data-route-icon="${shortcut.iconKey}"]`),
			).toBeInTheDocument();
			fireEvent.click(button);
			expect(openRoute).toHaveBeenLastCalledWith(shortcut.route);
		}
		expect(openRoute).toHaveBeenCalledTimes(shortcuts.length);
	});

	test("shows at most three recent chats in most-recent order and opens through the global chat contract", async () => {
		const entries = [
			createEntry({
				chatId: "oldest",
				entityName: "Old Hero",
				key: "character:0:oldest",
				lastMessageAt: Date.parse("2026-05-01T10:00:00.000Z"),
				lastMessageLabel: "May 1",
				lastMessagePreview: "Old preview",
			}),
			createEntry({
				chatId: "newest",
				entityName: "Hero",
				key: "character:0:newest",
				lastMessageAt: Date.parse("2026-05-04T10:00:00.000Z"),
				lastMessageLabel: "May 4",
				lastMessagePreview: "Newest preview",
			}),
			createEntry({
				chatId: "middle",
				entityName: "Mage",
				entityId: "1",
				key: "character:1:middle",
				lastMessageAt: Date.parse("2026-05-03T10:00:00.000Z"),
				lastMessageLabel: "May 3",
				lastMessagePreview: "Middle preview",
			}),
			createEntry({
				chatId: "older",
				entityName: "Party",
				entityId: "party",
				key: "group:party:older",
				kind: "group",
				lastMessageAt: Date.parse("2026-05-02T10:00:00.000Z"),
				lastMessageLabel: "May 2",
				lastMessagePreview: "Older preview",
			}),
		];
		const storeStub = createStoreStub(createSnapshot({ entries }));
		const openChat = vi.fn(async () => ({ ok: true as const }));
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);

		const recentList = document.querySelector(
			".astra-main-interface-home__recent-list",
		);
		expect(recentList).toBeInTheDocument();
		expect(
			within(recentList as HTMLElement)
				.getAllByRole("button")
				.map((row) => row.textContent),
		).toEqual([
			expect.stringContaining("newest"),
			expect.stringContaining("middle"),
			expect.stringContaining("older"),
		]);
		expect(
			within(recentList as HTMLElement).queryByText("oldest"),
		).not.toBeInTheDocument();
		expect(
			within(recentList as HTMLElement).getByText("Newest preview"),
		).toBeInTheDocument();
		expect(
			within(recentList as HTMLElement).getByText("Hero"),
		).toBeInTheDocument();
		expect(
			within(recentList as HTMLElement).getByText("May 4"),
		).toBeInTheDocument();
		const newestRow = screen.getByRole("button", {
			name: "Open Hero newest",
		});
		const recentMeta = newestRow.querySelector(
			".astra-main-interface-home__recent-meta",
		);
		const recentIdentity = newestRow.querySelector(
			".astra-main-interface-home__recent-identity",
		);
		const recentAvatar = newestRow.querySelector(
			".astra-main-interface-home__recent-avatar",
		);
		expect(recentAvatar).toHaveClass("astra-chat-avatar");
		expect(recentIdentity?.tagName).toBe("DIV");
		expect(recentMeta?.firstElementChild).toBe(recentIdentity);
		expect(recentIdentity?.firstElementChild).toBe(recentAvatar);
		expect(
			newestRow.querySelector(".astra-main-interface-home__recent-entity")
				?.tagName,
		).toBe("DIV");
		expect(
			newestRow.querySelector(".astra-main-interface-home__recent-time")
				?.tagName,
		).toBe("DIV");
		expect(
			recentAvatar?.querySelector(
				".astra-main-interface-home__recent-avatar-image",
			),
		).toBeInTheDocument();
		expect(
			newestRow.querySelector(
				".astra-main-interface-home__recent-meta-separator",
			),
		).toBeInTheDocument();
		const messageCountStat = newestRow.querySelector<HTMLElement>(
			".astra-main-interface-home__recent-stat",
		);
		expect(messageCountStat?.tagName).toBe("DIV");
		expect(recentMeta).toContainElement(messageCountStat);
		expect(messageCountStat).toHaveClass(
			"astra-main-interface-chat-row__stat",
		);
		expect(messageCountStat).toHaveAttribute(
			"aria-label",
			"Message count: 4",
		);
		expect(
			messageCountStat?.querySelector(
				".astra-main-interface-chat-row__stat-icon .lucide-message-circle-more",
			),
		).toBeInTheDocument();
		expect(
			messageCountStat?.querySelector(
				".astra-main-interface-chat-row__stat-value",
			),
		).toHaveTextContent("4");
		expect(
			recentList?.querySelector(
				".astra-main-interface-chat-row__action-button--menu",
			),
		).not.toBeInTheDocument();
		expect(
			recentList?.querySelector(".astra-main-interface-chat-row__footer"),
		).not.toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Hero newest",
			}),
		);

		await waitFor(() => {
			expect(openChat).toHaveBeenCalledWith(entries[1]);
		});
		expect(onRequestClose).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole("button", { name: "View all chats" }));
		expect(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Chats" }),
		).toBeInTheDocument();
		expect(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Chats" }),
		).toHaveAttribute("data-state", "active");
	});

	test("renders home external resources with safe links", () => {
		const storeStub = createStoreStub(createSnapshot());

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		for (const { name, url } of [
			{
				name: "GitHub Source repository",
				url: "https://github.com/SillyTavern/SillyTavern",
			},
			{
				name: "Docs Guides",
				url: "https://docs.sillytavern.app/",
			},
			{
				name: "Discord Official community",
				url: "https://discord.gg/sillytavern",
			},
			{
				name: "Reddit r/SillyTavernAI",
				url: "https://www.reddit.com/r/SillyTavernAI/",
			},
			{
				name: "GitHub Extension repository",
				url: "https://github.com/RivelleDays/SillyTavern-AstraProjecta",
			},
			{
				name: "Discord Community server",
				url: "https://discord.gg/bb35eB5Zgr",
			},
			{
				name: "Rivelle Author profile",
				url: "https://bio.site/rivelle",
			},
			{
				name: "Character Library Import characters",
				url: "https://github.com/Sillyanonymous/SillyTavern-CharacterLibrary#sillytavern-character-library",
			},
		]) {
			const link = screen.getByRole("link", { name });
			expect(link).toHaveAttribute("href", url);
			expect(link).toHaveAttribute("target", "_blank");
			expect(link).toHaveAttribute("rel", "noreferrer");
		}
	});

	test("labels the current section tab from the active chat identity when available", () => {
		const storeStub = createStoreStub(createSnapshot());
		const identityStoreStub = createIdentityStoreStub(
			createIdentitySnapshot({
				entityName: "Castle Party",
				groupId: "castle-party",
				hasActiveChat: true,
				kind: "group",
			}),
		);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				currentChatIdentityStore={identityStoreStub.store}
			/>,
		);

		const sectionTabs = screen.getByRole("tablist", {
			name: "Main UI sections",
		});
		const currentTab = within(sectionTabs).getByRole("tab", {
			name: "Castle Party",
		});

		expect(currentTab).toHaveAttribute("data-state", "inactive");
		expect(
			currentTab.querySelector(".astra-chat-avatar"),
		).toBeInTheDocument();
		expect(
			within(sectionTabs).queryByRole("tab", {
				name: "Current Character/Group",
			}),
		).not.toBeInTheDocument();
	});

	test("keeps the current section fallback label without an active chat identity", () => {
		const storeStub = createStoreStub(createSnapshot());
		const identityStoreStub = createIdentityStoreStub(
			createIdentitySnapshot({
				entityName: "",
				hasActiveChat: false,
				kind: "none",
			}),
		);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				currentChatIdentityStore={identityStoreStub.store}
			/>,
		);

		expect(
			within(
				screen.getByRole("tablist", {
					name: "Main UI sections",
				}),
			).getByRole("tab", { name: "Current Character/Group" }),
		).toHaveAttribute("data-state", "inactive");
	});

	test("keeps section tab values independent while labels can overlap", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Independent Hero",
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		expect(
			within(globalTabs).getByRole("tab", { name: "Chats" }),
		).toHaveAttribute("data-astra-smooth-tab-value", "chats");
		expect(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		).toHaveAttribute("data-astra-smooth-tab-value", "categories");

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Main UI sections",
				}),
			).getByRole("tab", {
				name: "Current Character/Group",
			}),
		);

		const currentContextTabs = screen.getByRole("tablist", {
			name: "Current context sections",
		});
		expect(
			within(currentContextTabs).getByRole("tab", { name: "Chats" }),
		).toHaveAttribute("data-astra-smooth-tab-value", "current-chats");
		expect(
			within(currentContextTabs).getByRole("tab", { name: "Categories" }),
		).toHaveAttribute("data-astra-smooth-tab-value", "current-categories");
	});

	test("renders fixed global and current avatar scopes before scrollable favorites", () => {
		const storeStub = createStoreStub(createSnapshot());
		const identityStoreStub = createIdentityStoreStub(
			createIdentitySnapshot({
				entityName: "Hero",
				thumbnailUrl: "/thumbs/avatar/hero.png",
			}),
		);
		const favoriteStoreStub = createFavoriteStoreStub(
			createFavoriteSnapshot({
				entities: [
					createFavoriteEntity(),
					createFavoriteEntity({
						avatarUrl: "",
						entityId: "party",
						entityName: "Party",
						groupAvatarUrls: [
							"/thumbs/avatar/hero.png",
							"/thumbs/avatar/mage.png",
						],
						kind: "group",
						scopeValue: "favorite:group:party",
					}),
				],
				totalFavoriteCount: 2,
			}),
		);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				currentChatIdentityStore={identityStoreStub.store}
				favoriteChatEntitiesStore={favoriteStoreStub.store}
			/>,
		);

		const scopeTabs = screen.getByRole("tablist", {
			name: "Main UI sections",
		});
		const tabs = within(scopeTabs).getAllByRole("tab");
		const favoritesRoot = document.getElementById(
			"astra-main-interface-scope-favorites",
		);
		const favoritesContent = document.getElementById(
			"astra-main-interface-scope-favorites-content",
		);
		const pinnedScopes = document.getElementById(
			"astra-main-interface-scope-pinned",
		);
		const scopeDivider = document.getElementById(
			"astra-main-interface-scope-divider",
		);

		expect(scopeTabs).toHaveAttribute(
			"id",
			"astra-main-interface-scope-strip",
		);
		expect(pinnedScopes).toContainElement(
			within(scopeTabs).getByRole("tab", { name: "Global" }),
		);
		expect(scopeDivider).toHaveClass("astra-main-interface__scope-divider");
		expect(scopeDivider).toHaveAttribute("aria-hidden", "true");
		expect(scopeDivider?.previousElementSibling).toBe(pinnedScopes);
		expect(
			scopeDivider?.compareDocumentPosition(favoritesRoot as Node) ?? 0,
		).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(favoritesRoot).toBeInTheDocument();
		expect(
			document.getElementById(
				"astra-main-interface-scope-favorites-viewport",
			),
		).toBeInTheDocument();
		expect(favoritesContent).toBeInTheDocument();
		expect(
			document.getElementById(
				"astra-main-interface-scope-favorites-scrollbar",
			),
		).toBeInTheDocument();
		expect(tabs.map((tab) => tab.getAttribute("data-scope-value"))).toEqual(
			[
				"global",
				"current-context",
				"favorite:character:1",
				"favorite:group:party",
			],
		);
		expect(favoritesRoot).toContainElement(favoritesContent);
		expect(favoritesContent).toContainElement(
			within(scopeTabs).getByRole("tab", { name: "Mage" }),
		);
		expect(
			scopeTabs.querySelector(
				".astra-main-interface__scope-favorites-scrollbar",
			),
		).toBeInTheDocument();
		expect(
			within(scopeTabs).getByRole("tab", { name: "Global" }),
		).toHaveAttribute("aria-selected", "true");
		expect(
			within(scopeTabs).getByRole("tab", { name: "Hero" }),
		).toHaveAttribute("aria-selected", "false");
	});

	test("activates a favorite character, switches to Current, and keeps the panel open", async () => {
		const storeStub = createStoreStub(createSnapshot());
		const favoriteStoreStub = createFavoriteStoreStub(
			createFavoriteSnapshot({
				entities: [createFavoriteEntity()],
				totalFavoriteCount: 1,
			}),
		);
		const handleActiveSectionChange = vi.fn();
		const handleRequestClose = vi.fn();
		const activateEntity = vi.fn<ActivateChatEntity>().mockResolvedValue({
			ok: true,
		});

		render(
			<AstraMainInterface
				activateChatEntity={activateEntity}
				chatCatalogStore={storeStub.store}
				favoriteChatEntitiesStore={favoriteStoreStub.store}
				onActiveSectionChange={handleActiveSectionChange}
				onRequestClose={handleRequestClose}
			/>,
		);

		fireEvent.click(screen.getByRole("tab", { name: "Mage" }));

		await waitFor(() => {
			expect(activateEntity).toHaveBeenCalledWith({
				characterId: 1,
				entityId: "1",
				entityName: "Mage",
				kind: "character",
			});
		});
		expect(handleActiveSectionChange).toHaveBeenCalledWith(
			"current-context",
		);
		expect(handleRequestClose).not.toHaveBeenCalled();
	});

	test("keeps the current scope open and reports an error when favorite activation fails", async () => {
		const storeStub = createStoreStub(createSnapshot());
		const favoriteStoreStub = createFavoriteStoreStub(
			createFavoriteSnapshot({
				entities: [createFavoriteEntity()],
				totalFavoriteCount: 1,
			}),
		);
		const handleActiveSectionChange = vi.fn();
		const handleRequestClose = vi.fn();
		const error = vi.fn();
		(
			globalThis as { toastr?: { error?: (message: string) => void } }
		).toastr = { error };
		const activateEntity = vi.fn<ActivateChatEntity>().mockResolvedValue({
			ok: false,
			reason: "open-failed",
		});

		render(
			<AstraMainInterface
				activateChatEntity={activateEntity}
				chatCatalogStore={storeStub.store}
				favoriteChatEntitiesStore={favoriteStoreStub.store}
				onActiveSectionChange={handleActiveSectionChange}
				onRequestClose={handleRequestClose}
			/>,
		);

		fireEvent.click(screen.getByRole("tab", { name: "Mage" }));

		await waitFor(() => {
			expect(error).toHaveBeenCalledWith(
				"Failed to switch character or group.",
			);
		});
		expect(handleActiveSectionChange).not.toHaveBeenCalled();
		expect(handleRequestClose).not.toHaveBeenCalled();
		expect(screen.getByRole("tab", { name: "Global" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	test("disables scope navigation while a favorite activation is pending", async () => {
		const storeStub = createStoreStub(createSnapshot());
		const favoriteStoreStub = createFavoriteStoreStub(
			createFavoriteSnapshot({
				entities: [createFavoriteEntity()],
				totalFavoriteCount: 1,
			}),
		);
		const activation = createDeferred<ChatEntityActivationResult>();
		const activateEntity = vi
			.fn<ActivateChatEntity>()
			.mockReturnValue(activation.promise);

		render(
			<AstraMainInterface
				activateChatEntity={activateEntity}
				chatCatalogStore={storeStub.store}
				favoriteChatEntitiesStore={favoriteStoreStub.store}
			/>,
		);

		const mageTab = screen.getByRole("tab", { name: "Mage" });
		fireEvent.click(mageTab);

		await waitFor(() => {
			expect(mageTab).toHaveAttribute("aria-busy", "true");
		});
		const scopeTabs = within(
			screen.getByRole("tablist", {
				name: "Main UI sections",
			}),
		).getAllByRole("tab");
		for (const tab of scopeTabs) {
			expect(tab).toBeDisabled();
		}

		fireEvent.click(mageTab);
		expect(activateEntity).toHaveBeenCalledTimes(1);

		activation.resolve({ ok: true });
		await waitFor(() => {
			expect(mageTab).not.toHaveAttribute("aria-busy");
		});
	});

	test("wraps global tab pages in child-owned scroll surfaces without blocking tab swipes", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Scrollable Hero",
					}),
				],
			}),
		);
		const { container } = render(
			<AstraMainInterface chatCatalogStore={storeStub.store} />,
		);

		const globalTabsRoot = container.querySelector(
			".astra-main-interface__global-tabs",
		);
		expect(globalTabsRoot).toHaveAttribute("data-viewport-mode", "fill");

		const scrollAreas = globalTabsRoot?.querySelectorAll(
			".astra-main-interface__tab-scroll-area",
		);
		const scrollViewports = globalTabsRoot?.querySelectorAll(
			".astra-main-interface__tab-scroll-viewport",
		);
		const scrollContents = globalTabsRoot?.querySelectorAll(
			".astra-main-interface__tab-scroll-content",
		);
		const scrollbars = globalTabsRoot?.querySelectorAll(
			".astra-main-interface__tab-scrollbar",
		);

		expect(scrollAreas).toHaveLength(3);
		expect(scrollViewports).toHaveLength(3);
		expect(scrollContents).toHaveLength(3);
		for (const content of Array.from(scrollContents ?? [])) {
			expect(content).toHaveAttribute(
				"data-astra-scroll-content-width",
				"bounded",
			);
		}
		for (const viewport of Array.from(scrollViewports ?? [])) {
			expect(viewport).toHaveAttribute(
				"data-astra-scroll-axis",
				"vertical",
			);
			expect(viewport).not.toHaveAttribute(
				"data-astra-smooth-tabs-swipe-ignore",
			);
		}
		for (const scrollbar of Array.from(scrollbars ?? [])) {
			expect(scrollbar).toHaveAttribute(
				"data-astra-smooth-tabs-swipe-ignore",
			);
		}
		const globalHomePanel = screen
			.getByText("Carousel reserved")
			.closest(".astra-smooth-tabs__panel");
		const globalChatsPanel = document.querySelector(
			".astra-smooth-tabs__panel[data-route='global-chats']",
		);
		const globalCategoriesPanel = screen
			.getByText("No global chat categories yet")
			.closest(".astra-smooth-tabs__panel");
		expect(globalHomePanel).toHaveAttribute("data-route", "global-home");
		expect(globalChatsPanel).toHaveAttribute("data-route", "global-chats");
		expect(globalCategoriesPanel).toHaveAttribute(
			"data-route",
			"global-categories",
		);
		expect(globalCategoriesPanel).toHaveClass(
			"astra-main-interface__category-tab-panel",
			"astra-main-interface__global-category-tab-panel",
		);
		expect(
			globalCategoriesPanel?.querySelector(
				".astra-main-interface__tab-panel",
			),
		).toHaveClass("astra-main-interface__tab-panel--categories");
		expect(globalChatsPanel).not.toHaveClass(
			"astra-main-interface__category-tab-panel",
		);
		expect(globalChatsPanel).not.toHaveClass(
			"astra-main-interface__global-tabs-panel--chats",
		);
		expect(
			within(globalChatsPanel as HTMLElement).getByText(
				"Scrollable Hero",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText("No global chat categories yet"),
		).toBeInTheDocument();
	});

	test("switches from global chats to the category placeholder", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Category Hero",
					}),
				],
			}),
		);
		const identityStoreStub = createIdentityStoreStub(
			createIdentitySnapshot({
				entityName: "Category Persona",
				hasActiveChat: true,
			}),
		);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				currentChatIdentityStore={identityStoreStub.store}
			/>,
		);

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		fireEvent.click(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		);

		expect(
			within(
				document.querySelector(
					".astra-smooth-tabs__panel[data-route='global-chats']",
				) as HTMLElement,
			).getByText("Category Hero"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Chat menu controls" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("tabpanel", { name: "Chats" }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Global chat categories"),
		).not.toBeInTheDocument();
		const inactiveChatPanel = document.querySelector(
			".astra-smooth-tabs__panel[data-route='global-chats']",
		);
		expect(inactiveChatPanel).toHaveAttribute("data-state", "inactive");
		expect(inactiveChatPanel).toHaveAttribute("aria-hidden", "true");
		expect(inactiveChatPanel).toHaveAttribute("inert");
		const manager = document.querySelector(
			".astra-chat-library-global-manager",
		);
		expect(manager).toBeInTheDocument();
		expect(
			manager?.querySelector(".astra-chat-library-category-inputWrap"),
		).toBeInTheDocument();
		expect(
			manager?.querySelector(
				".astra-chat-library-category-inputWrap.astra-main-interface__search-shell",
			),
		).toBeInTheDocument();
		expect(
			manager?.querySelector(
				".astra-chat-library-category-input.astra-main-interface__search-input",
			),
		).toBeInTheDocument();
		expect(
			manager?.querySelector(
				".astra-chat-library-category-panel.astra-chat-library-global-panel",
			),
		).toBeInTheDocument();
		expect(
			manager?.querySelector(".astra-chat-library-category-treeLayout"),
		).toBeInTheDocument();
		expect(
			manager?.querySelector(
				".astra-chat-library-category-tree.astra-chat-library-global-tree",
			),
		).toBeInTheDocument();
		if (!(manager instanceof HTMLElement)) {
			throw new Error("Expected global category manager element");
		}
		const secondaryTabsPanel = manager.closest(
			".astra-main-interface__secondary-tabs .astra-smooth-tabs__panel",
		);
		expect(secondaryTabsPanel).toBeInTheDocument();
		const categoryToolbar = manager.querySelector(
			".astra-main-interface__toolbar.astra-main-interface__toolbar--categories",
		);
		expect(categoryToolbar).toBeInTheDocument();
		expect(
			secondaryTabsPanel?.querySelector(
				".astra-chat-library-category-treeActions",
			),
		).not.toBeInTheDocument();
		const createRow = manager.querySelector(
			".astra-chat-library-category-createRow",
		);
		expect(createRow).toBeInTheDocument();
		if (!(categoryToolbar instanceof HTMLElement)) {
			throw new Error("Expected global category toolbar element");
		}
		if (!(createRow instanceof HTMLElement)) {
			throw new Error("Expected global category create row element");
		}
		expect(categoryToolbar).toContainElement(createRow);
		const createRowActions = createRow?.querySelector(
			".astra-chat-library-category-treeActionsGroup",
		);
		expect(createRowActions).toBeInTheDocument();
		expect(createRow?.lastElementChild).toBe(createRowActions);
		expect(
			manager
				.querySelector(".astra-chat-library-category-treeLayout")
				?.querySelector(
					".astra-chat-library-category-treeActionsGroup",
				),
		).not.toBeInTheDocument();
		const emptyState = within(manager)
			.getByText("No global chat categories yet")
			.closest(".astra-main-interface__empty-state");
		expect(emptyState).toBeInTheDocument();
		expect(emptyState).toHaveAttribute("data-slot", "empty");
		expect(emptyState).toHaveClass(
			"astra-chat-library-category-emptyState",
		);
		expect(
			within(manager).getByText(
				"Create a global category to organize chats across characters and groups.",
			),
		).toBeInTheDocument();
		const categoryTree = manager?.querySelector(
			".astra-chat-library-category-tree.astra-chat-library-global-tree",
		);
		expect(categoryTree).toBeInTheDocument();
		expect(categoryTree).toBeEmptyDOMElement();
		expect(
			categoryTree?.querySelector(
				".astra-chat-library-category-accordion",
			),
		).not.toBeInTheDocument();
		expect(
			manager.querySelector(".astra-chat-library-category-accordion"),
		).not.toBeInTheDocument();
		expect(
			within(manager).queryByRole("button", {
				name: /Category Persona\s*\(0\)/,
			}),
		).not.toBeInTheDocument();
		expect(
			within(manager).queryByRole("button", { name: /^Global\s*\(0\)$/ }),
		).not.toBeInTheDocument();
		expect(
			within(manager).queryByRole("button", {
				name: /Current Character\/Group/,
			}),
		).not.toBeInTheDocument();
		expect(
			within(manager).queryByRole("button", { name: /Global chats/ }),
		).not.toBeInTheDocument();
		for (const label of [
			"Expand all global categories",
			"Collapse all global categories",
		]) {
			const action = within(manager).getByRole("button", { name: label });

			expect(action).toHaveClass("astra-chat-library-actionButton");
			expect(action).toHaveAttribute("data-variant", "outline");
			expect(action).toHaveAttribute("data-size", "icon");
		}
		expect(
			screen.getByLabelText("New global category name"),
		).not.toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Add global category" }),
		).toBeDisabled();
	});

	test("renders global categories as dedicated global tree rows", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "side-story",
						entityName: "Hero",
						key: "character:0:side-story",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds("character:0:side-story", [
			"cat_global_plot",
		]);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);

		const manager = document.querySelector(
			".astra-chat-library-global-manager",
		);
		expect(manager).toBeInTheDocument();
		if (!(manager instanceof HTMLElement)) {
			throw new Error("Expected global category manager element");
		}
		expect(
			manager.querySelector(".astra-chat-library-category-accordion"),
		).not.toBeInTheDocument();

		const categoryRow = manager.querySelector(
			".astra-chat-library-global-categoryRow",
		);
		expect(categoryRow).toBeInTheDocument();
		const categoryHeader = within(manager).getByRole("button", {
			name: /Global Plot\s*\(1\)/,
		});
		expect(categoryHeader).toHaveClass(
			"astra-chat-library-global-categoryHeader",
		);
		expect(categoryHeader).toHaveAttribute("aria-expanded", "true");
		expect(
			categoryHeader.querySelector(
				".astra-chat-library-global-categoryName",
			),
		).toHaveTextContent("Global Plot");
		expect(
			categoryHeader.querySelector(
				".astra-chat-library-global-categoryCount",
			),
		).toHaveTextContent("(1)");
		expect(
			categoryHeader.querySelector(
				".astra-chat-library-global-categoryLabel .lucide-globe",
			),
		).not.toBeInTheDocument();

		const chatList = categoryRow?.querySelector(
			".astra-chat-library-global-chatList",
		);
		expect(chatList).toBeInTheDocument();
		expect(
			within(chatList as HTMLElement).getByRole("button", {
				name: "Open Hero side-story",
			}),
		).toHaveClass("astra-chat-library-global-chatRow");
		expect(
			within(chatList as HTMLElement).getByRole("button", {
				name: "Open Hero side-story",
			}).tagName,
		).toBe("DIV");

		fireEvent.click(categoryHeader);
		expect(categoryHeader).toHaveAttribute("aria-expanded", "false");
		expect(chatList).toHaveAttribute("hidden");

		fireEvent.click(
			within(manager).getByRole("button", {
				name: "Expand all global categories",
			}),
		);
		expect(categoryHeader).toHaveAttribute("aria-expanded", "true");
		expect(chatList).not.toHaveAttribute("hidden");
	});

	test("renders global category action buttons without toggling the category row", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "side-story",
						entityName: "Hero",
						key: "character:0:side-story",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds("character:0:side-story", [
			"cat_global_plot",
		]);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openChat={openChat}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);

		const categoryRow = document.querySelector(
			".astra-chat-library-global-categoryRow",
		);
		expect(categoryRow).toBeInTheDocument();
		if (!(categoryRow instanceof HTMLElement)) {
			throw new Error("Expected global category row");
		}
		expect(
			categoryRow.querySelector(
				".astra-chat-library-global-categoryHeaderRow",
			),
		).toBeInTheDocument();
		expect(
			categoryRow.querySelector(
				".astra-chat-library-global-categoryActions",
			),
		).toBeInTheDocument();
		const actionGroup = categoryRow.querySelector(
			".astra-chat-library-global-categoryActions",
		);
		if (!(actionGroup instanceof HTMLElement)) {
			throw new Error("Expected global category action group");
		}
		const categoryHeader = within(categoryRow).getByRole("button", {
			name: /Global Plot\s*\(1\)/,
		});
		const chatList = categoryRow.querySelector(
			".astra-chat-library-global-chatList",
		);
		const renameAction = within(categoryRow).getByRole("button", {
			name: "Rename global category: Global Plot",
		});
		const deleteAction = within(categoryRow).getByRole("button", {
			name: "Delete global category: Global Plot",
		});

		expect(renameAction).toHaveClass(
			"astra-chat-library-global-categoryActionButton",
			"astra-chat-library-global-categoryRenameAction",
			"rounded-full",
		);
		expect(renameAction).toHaveAttribute("data-variant", "outline");
		expect(renameAction).toHaveAttribute("data-size", "icon-sm");
		expect(
			renameAction.querySelector(".lucide-pencil-line"),
		).toBeInTheDocument();
		expect(deleteAction).toHaveClass(
			"astra-chat-library-global-categoryActionButton",
			"astra-chat-library-global-categoryDeleteAction",
			"rounded-full",
		);
		expect(deleteAction).toHaveAttribute("data-variant", "outline");
		expect(deleteAction).toHaveAttribute("data-size", "icon-sm");
		expect(
			deleteAction.querySelector(".lucide-trash-2"),
		).toBeInTheDocument();
		const actionButtons = Array.from(
			actionGroup.querySelectorAll(
				".astra-chat-library-global-categoryActionButton",
			),
		);
		expect(actionButtons).toHaveLength(2);
		expect(actionButtons[0]).toBe(deleteAction);
		expect(actionButtons[1]).toBe(renameAction);

		fireEvent.click(renameAction);

		expect(categoryHeader).toHaveAttribute("aria-expanded", "true");
		expect(chatList).not.toHaveAttribute("hidden");
		expect(openChat).not.toHaveBeenCalled();
		expect(
			await screen.findByRole("dialog", {
				name: "Rename global category",
			}),
		).toHaveAttribute(
			"id",
			"astra-main-interface-global-category-rename-drawer",
		);
	});

	test("removes a global category chat row from only its current category", () => {
		const entry = createEntry({
			chatId: "side-story",
			entityName: "Hero",
			key: "character:0:side-story",
		});
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [entry],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot", "cat_global_archive"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.createCategory({
			name: "Global Archive",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds(entry.key, [
			"cat_global_plot",
			"cat_global_archive",
		]);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openChat={openChat}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);

		const plotCategory = document.querySelector(
			'[data-category-id="cat_global_plot"]',
		);
		const archiveCategory = document.querySelector(
			'[data-category-id="cat_global_archive"]',
		);
		if (
			!(plotCategory instanceof HTMLElement) ||
			!(archiveCategory instanceof HTMLElement)
		) {
			throw new Error("Expected both global category rows");
		}

		const plotChatRow = within(plotCategory).getByRole("button", {
			name: "Open Hero side-story",
		});
		const actionGroup = plotChatRow.querySelector(
			".astra-chat-library-global-chatActions",
		);
		expect(actionGroup).toHaveAttribute(
			"aria-label",
			"Category chat actions",
		);
		const removeAction = within(plotChatRow).getByRole("button", {
			name: "Remove from category: Global Plot",
		});
		const moreAction = within(plotChatRow).getByRole("button", {
			name: "More chat actions: side-story",
		});
		expect(removeAction).toHaveClass(
			"astra-chat-library-global-chatActionButton",
			"astra-chat-library-global-chatRemoveAction",
			"rounded-full",
		);
		expect(removeAction.querySelector(".lucide-x")).toBeInTheDocument();
		expect(moreAction).toHaveClass(
			"astra-chat-library-global-chatActionButton",
			"astra-chat-library-global-chatMoreAction",
			"rounded-full",
		);
		expect(
			moreAction.querySelector(".lucide-ellipsis-vertical"),
		).toBeInTheDocument();
		expect(moreAction).toHaveAttribute(
			"aria-controls",
			"astra-main-interface-chat-actions-drawer",
		);
		expect(moreAction).toHaveAttribute("aria-expanded", "false");

		fireEvent.keyDown(removeAction, { key: "Enter" });
		fireEvent.click(removeAction);

		expect(openChat).not.toHaveBeenCalled();
		expect(categoryStoreStub.store.getChatCategoryIds(entry.key)).toEqual([
			"cat_global_archive",
		]);
		expect(
			within(plotCategory).queryByRole("button", {
				name: "Open Hero side-story",
			}),
		).not.toBeInTheDocument();
		expect(
			within(archiveCategory).getByRole("button", {
				name: "Open Hero side-story",
			}),
		).toBeInTheDocument();
	});

	test("opens chat actions from a global category row without opening the chat", async () => {
		const entry = createEntry({
			chatId: "side-story",
			entityName: "Hero",
			key: "character:0:side-story",
		});
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [entry],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds(entry.key, [
			"cat_global_plot",
		]);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openChat={openChat}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);

		const chatRow = screen.getByRole("button", {
			name: "Open Hero side-story",
		});
		const moreAction = within(chatRow).getByRole("button", {
			name: "More chat actions: side-story",
		});

		fireEvent.keyDown(moreAction, { key: " " });
		fireEvent.click(moreAction);

		expect(openChat).not.toHaveBeenCalled();
		expect(moreAction).toHaveAttribute("aria-expanded", "true");
		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		expect(drawer).toHaveAttribute(
			"id",
			"astra-main-interface-chat-actions-drawer",
		);
		expect(
			drawer.querySelector(".astra-dialog-identityName"),
		).toHaveTextContent("Hero");
		expect(within(drawer).getByText("side-story")).toBeInTheDocument();
	});

	test("opens global category chat rows with Enter and Space", async () => {
		const entry = createEntry({
			chatId: "side-story",
			entityName: "Hero",
			key: "character:0:side-story",
		});
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [entry],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds(entry.key, [
			"cat_global_plot",
		]);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openChat={openChat}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		const chatRow = screen.getByRole("button", {
			name: "Open Hero side-story",
		});

		fireEvent.keyDown(chatRow, { key: "Enter" });
		await waitFor(() => {
			expect(openChat).toHaveBeenCalledTimes(1);
		});

		fireEvent.keyDown(chatRow, { key: " " });
		await waitFor(() => {
			expect(openChat).toHaveBeenCalledTimes(2);
		});
	});

	test("keeps empty global category rows free of chat actions", () => {
		const storeStub = createStoreStub(createSnapshot());
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_empty"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Empty",
			scope: "global",
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);

		const emptyRow = document.querySelector(
			".astra-chat-library-global-chatRow--empty",
		);
		expect(emptyRow).toHaveTextContent("No chats assigned yet.");
		expect(
			emptyRow?.querySelector(".astra-chat-library-global-chatActions"),
		).not.toBeInTheDocument();
	});

	test("routes global category drawer exports through the injected action", async () => {
		const entry = createEntry({
			chatId: "side-story",
			entityName: "Hero",
			key: "character:0:side-story",
		});
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [entry],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds(entry.key, [
			"cat_global_plot",
		]);
		const exportChat = vi.fn<ExportChatCatalogEntry>().mockResolvedValue({
			fileName: "side-story.jsonl",
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				exportChat={exportChat}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "More chat actions: side-story",
			}),
		);
		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		fireEvent.click(
			within(drawer).getByRole("button", {
				name: "Export JSONL chat file",
			}),
		);

		await waitFor(() => {
			expect(exportChat).toHaveBeenCalledWith(entry, "jsonl");
		});
	});

	test("opens category assignment from a global category row actions drawer", async () => {
		const entry = createEntry({
			chatId: "side-story",
			entityName: "Hero",
			key: "character:0:side-story",
		});
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [entry],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds(entry.key, [
			"cat_global_plot",
		]);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "More chat actions: side-story",
			}),
		);
		const actionsDrawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		fireEvent.click(
			within(actionsDrawer).getByRole("button", {
				name: "Edit categories",
			}),
		);

		expect(
			await screen.findByRole("dialog", {
				name: "Edit categories",
			}),
		).toHaveAttribute("id", "astra-main-interface-chat-category-drawer");
	});

	test("renames a global category from its action drawer", async () => {
		const storeStub = createStoreStub(createSnapshot());
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Rename global category: Global Plot",
			}),
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Rename global category",
		});
		expect(dialog).toHaveClass(
			"astra-main-interface-chat-row-action-dialog",
			"astra-main-interface-global-category-action-drawer",
			"astra-main-interface-global-category-rename-drawer",
		);
		const description = dialog.querySelector(
			".astra-dialog-current-chat-file-description",
		);
		expect(description).toHaveTextContent("Rename this global category.");
		expect(
			description?.querySelector(".astra-dialog-current-chat-file-token"),
		).not.toBeInTheDocument();
		expect(
			description?.querySelector(".astra-dialog-current-chat-file-name"),
		).not.toBeInTheDocument();
		const identity = dialog.querySelector(
			".astra-chat-library-global-categoryActionDrawer__identity",
		);
		expect(
			identity?.querySelector(".lucide-folder-bookmark"),
		).toBeInTheDocument();
		const scopeBadge = dialog.querySelector(
			".astra-chat-library-global-categoryActionDrawer__identityScope",
		);
		expect(scopeBadge).toHaveAttribute("data-slot", "badge");
		expect(scopeBadge).toHaveAttribute("data-variant", "secondary");
		expect(scopeBadge).toHaveTextContent("Global");
		expect(scopeBadge?.querySelector(".lucide-globe")).toBeInTheDocument();
		const alert = dialog.querySelector(".astra-chat-library-dialog-alert");
		expect(alert).toHaveAttribute("role", "alert");
		expect(
			alert?.querySelector(".astra-chat-library-dialog-alert-icon"),
		).toBeInTheDocument();
		expect(
			alert?.querySelector(".astra-chat-library-dialog-alert-content"),
		).toBeInTheDocument();
		expect(
			alert?.querySelector(".astra-chat-library-dialog-alert-title"),
		).toHaveTextContent("Use a concise global category name.");
		expect(
			alert?.querySelector(".astra-chat-library-dialog-alert-text"),
		).toHaveTextContent(
			"AstraProjecta stores category names in extension settings. Chat files and chat names are unchanged.",
		);
		const input = within(dialog).getByRole("textbox", {
			name: "New category name",
		});
		const field = input.closest(
			".astra-chat-library-global-categoryActionDrawer__field",
		);
		expect(field).toHaveClass("astra-chat-library-dialog-field");
		const hint = dialog.querySelector(
			"#astra-main-interface-global-category-rename-drawer-hint",
		);
		expect(hint).toHaveClass(
			"astra-chat-library-global-categoryActionDrawer__hint",
			"astra-chat-library-dialog-description",
		);
		fireEvent.input(input, {
			target: { value: "World Notes" },
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Rename category",
			}),
		);

		expect(
			categoryStoreStub.store.getVisibleCategories().global[0]?.name,
		).toBe("World Notes");
		expect(
			document.querySelector(".astra-chat-library-global-categoryName"),
		).toHaveTextContent("World Notes");
	});

	test("shows global category rename validation errors in the action drawer", async () => {
		const storeStub = createStoreStub(createSnapshot());
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot", "cat_existing"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.createCategory({
			name: "Existing",
			scope: "global",
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Rename global category: Global Plot",
			}),
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Rename global category",
		});
		const input = within(dialog).getByRole("textbox", {
			name: "New category name",
		});

		fireEvent.input(input, {
			target: { value: "Existing" },
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Rename category",
			}),
		);
		expect(
			within(dialog).getByText(
				"A category with that name already exists in this scope.",
			),
		).toBeInTheDocument();

		fireEvent.input(input, {
			target: { value: "Global Plot" },
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Rename category",
			}),
		);
		expect(
			within(dialog).getByText("Choose a different category name."),
		).toBeInTheDocument();
	});

	test("deletes a global category without removing chat catalog entries", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "side-story",
						entityName: "Hero",
						key: "character:0:side-story",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds("character:0:side-story", [
			"cat_global_plot",
		]);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Delete global category: Global Plot",
			}),
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Delete global category",
		});
		expect(dialog).toHaveAttribute(
			"id",
			"astra-main-interface-global-category-delete-drawer",
		);
		expect(dialog).toHaveClass(
			"astra-main-interface-chat-row-action-dialog",
			"astra-main-interface-global-category-action-drawer",
			"astra-main-interface-global-category-delete-drawer",
		);
		const description = dialog.querySelector(
			".astra-dialog-current-chat-file-description",
		);
		expect(description).toHaveTextContent("Delete this global category.");
		expect(
			description?.querySelector(".astra-dialog-current-chat-file-token"),
		).not.toBeInTheDocument();
		expect(
			description?.querySelector(".astra-dialog-current-chat-file-name"),
		).not.toBeInTheDocument();
		const alert = dialog.querySelector(".astra-chat-library-dialog-alert");
		expect(alert).toHaveAttribute("role", "alert");
		expect(
			alert?.querySelector(".astra-chat-library-dialog-alert-icon"),
		).toBeInTheDocument();
		expect(
			alert?.querySelector(".astra-chat-library-dialog-alert-content"),
		).toBeInTheDocument();
		expect(
			alert?.querySelector(".astra-chat-library-dialog-alert-title"),
		).toHaveTextContent("Chat files are not deleted.");
		expect(
			alert?.querySelector(".astra-chat-library-dialog-alert-text"),
		).toHaveTextContent(
			"Only the category, saved ordering, and chat membership in AstraProjecta extension settings are removed.",
		);
		expect(
			within(dialog).getByText("Chat files are not deleted."),
		).toBeInTheDocument();
		expect(
			within(dialog).getByText(
				"Only the category, saved ordering, and chat membership in AstraProjecta extension settings are removed.",
			),
		).toBeInTheDocument();

		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Delete category",
			}),
		);

		expect(
			screen.queryByRole("button", { name: /Global Plot\s*1/ }),
		).not.toBeInTheDocument();
		expect(
			categoryStoreStub.store.getChatCategoryIds(
				"character:0:side-story",
			),
		).toEqual([]);
		expect(storeStub.store.getSnapshot().entries).toEqual([
			expect.objectContaining({
				key: "character:0:side-story",
			}),
		]);
	});

	test("opens global category chat rows through the chat switch overlay flow", async () => {
		document.body.innerHTML = `
	            <div id="sheld">
                <div id="chat"></div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "side-story",
						entityName: "Hero",
						key: "character:0:side-story",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds("character:0:side-story", [
			"cat_global_plot",
		]);
		let resolveOpenChat!: (
			result: Awaited<ReturnType<OpenChatCatalogEntry>>,
		) => void;
		const openChat = vi.fn<OpenChatCatalogEntry>().mockReturnValue(
			new Promise((resolve) => {
				resolveOpenChat = resolve;
			}),
		);
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		const categoryRow = document.querySelector(
			".astra-chat-library-global-categoryRow",
		);
		if (!(categoryRow instanceof HTMLElement)) {
			throw new Error("Expected global category row");
		}
		const chatRow = within(categoryRow).getByRole("button", {
			name: "Open Hero side-story",
		});

		fireEvent.click(chatRow);

		expect(openChat).toHaveBeenCalledWith(
			expect.objectContaining({
				key: "character:0:side-story",
			}),
		);
		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(
			within(sheld).getByRole("status", {
				name: "Opening chat...",
			}),
		).toBeInTheDocument();
		expect(chatRow).toHaveAttribute("aria-disabled", "true");

		await act(async () => {
			resolveOpenChat({
				ok: true,
			});
		});
		expect(
			within(sheld).getByRole("status", {
				name: "Opening chat...",
			}),
		).toBeInTheDocument();
		expect(openChat).toHaveBeenCalledTimes(1);
	});

	test("shows an inline error when a global category chat row fails to open", async () => {
		document.body.innerHTML = `
            <div id="sheld">
                <div id="chat"></div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "side-story",
						entityName: "Hero",
						key: "character:0:side-story",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds("character:0:side-story", [
			"cat_global_plot",
		]);
		const openChat = vi
			.fn<OpenChatCatalogEntry>()
			.mockRejectedValue(new Error("open failed"));
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Hero side-story",
			}),
		);

		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(
			await screen.findByText("Failed to open chat."),
		).toBeInTheDocument();
		expect(
			within(sheld).queryByRole("status", {
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
	});

	test("closes without reopening when a global category chat row is already current", () => {
		document.body.innerHTML = `
            <div id="sheld">
                <div id="chat"></div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "side-story",
						entityName: "Hero",
						isCurrent: true,
						key: "character:0:side-story",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_plot"],
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds("character:0:side-story", [
			"cat_global_plot",
		]);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Hero side-story",
			}),
		);

		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(openChat).not.toHaveBeenCalled();
		expect(
			within(sheld).queryByRole("status", {
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
	});

	test("switches to current context tabs and preserves section tab state", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Scoped Hero",
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Global sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Main UI sections",
				}),
			).getByRole("tab", {
				name: "Current Character/Group",
			}),
		);

		expect(
			screen.queryByRole("tablist", {
				name: "Global sections",
			}),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Scoped Hero")).not.toBeInTheDocument();
		const currentContextTabs = screen.getByRole("tablist", {
			name: "Current context sections",
		});
		expect(
			within(currentContextTabs).getByRole("tab", { name: "Chats" }),
		).toHaveAttribute("data-state", "active");
		expect(
			within(currentContextTabs).getByRole("tab", { name: "Categories" }),
		).toHaveAttribute("data-state", "inactive");
		expect(screen.getByText("No current chats yet")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Current character and group chats will appear here in a later update.",
			),
		).toBeInTheDocument();

		fireEvent.click(
			within(currentContextTabs).getByRole("tab", { name: "Categories" }),
		);

		const inactiveCurrentChatsPanel = screen
			.getByText("No current chats yet")
			.closest(".astra-smooth-tabs__panel");
		const currentCategoriesPanel = screen
			.getByText("No current categories yet")
			.closest(".astra-smooth-tabs__panel");
		expect(inactiveCurrentChatsPanel).toHaveAttribute(
			"data-state",
			"inactive",
		);
		expect(inactiveCurrentChatsPanel).toHaveAttribute(
			"data-route",
			"current-context-chats",
		);
		expect(currentCategoriesPanel).toHaveAttribute(
			"data-route",
			"current-context-categories",
		);
		expect(currentCategoriesPanel).toHaveClass(
			"astra-main-interface__category-tab-panel",
			"astra-main-interface__current-context-category-tab-panel",
		);
		expect(
			currentCategoriesPanel?.querySelector(
				".astra-main-interface__tab-panel",
			),
		).toHaveClass("astra-main-interface__tab-panel--categories");
		expect(
			screen.queryByText("Character or group chat categories"),
		).not.toBeInTheDocument();
		expect(inactiveCurrentChatsPanel).toHaveAttribute(
			"aria-hidden",
			"true",
		);
		expect(inactiveCurrentChatsPanel).toHaveAttribute("inert");
		expect(
			screen.getByText("No current categories yet"),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Create categories for the current character or group.",
			),
		).toBeInTheDocument();

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Main UI sections",
				}),
			).getByRole("tab", { name: "Global" }),
		);

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		expect(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		).toHaveAttribute("data-state", "active");
		expect(
			screen.getByText("No global chat categories yet"),
		).toBeInTheDocument();

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Main UI sections",
				}),
			).getByRole("tab", {
				name: "Current Character/Group",
			}),
		);

		expect(
			within(
				screen.getByRole("tablist", {
					name: "Current context sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		).toHaveAttribute("data-state", "active");
		expect(
			screen.getByText("No current categories yet"),
		).toBeInTheDocument();
	});

	test("renders current chats as chat-first rows in the current smooth-tabs panel", () => {
		const globalStoreStub = createStoreStub(createSnapshot());
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot({
				entries: [
					createEntry({
						isCurrent: true,
					}),
					createEntry({
						chatId: "side-story",
						fileName: "side-story.jsonl",
						key: "character:0:side-story",
						lastMessagePreview: "Side story preview",
					}),
				],
			}),
		);

		render(
			<AstraMainInterface
				chatCatalogStore={globalStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
			/>,
		);
		switchToCurrentContextSection();

		expect(
			screen.getByLabelText("Search current chats"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Current chat menu controls",
			}),
		).toBeInTheDocument();
		expect(
			screen.queryByText("No current chats yet"),
		).not.toBeInTheDocument();
		const rows = getCurrentChatRowButtons();
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveAccessibleName("Open Hero chapter-1");
		expect(rows[0]).toHaveClass(
			"astra-main-interface-chat-row",
			"astra-main-interface-current-chat-row",
		);
		expect(
			rows[0].querySelector(".astra-main-interface-chat-row__entity"),
		).toHaveTextContent("Hero");
		expect(
			rows[0].querySelector(
				".astra-main-interface-chat-row__main .astra-main-interface-chat-row__chat-name",
			),
		).toHaveTextContent("chapter-1");
		expect(
			rows[0].querySelector(
				".astra-main-interface-chat-row__header .astra-main-interface-chat-row__chat-name",
			),
		).not.toBeInTheDocument();
		expect(rows[0]).toHaveAttribute("aria-current", "true");
		expect(
			rows[0].querySelector(".astra-main-interface-chat-row__body"),
		).toHaveClass("astra-main-interface-chat-row__body--current");
		expectNoCurrentChatRowChildSelectors(rows[0]);
		const currentChatsPanel = screen
			.getByText("chapter-1")
			.closest(".astra-smooth-tabs__panel");
		expect(currentChatsPanel).toHaveAttribute(
			"data-route",
			"current-context-chats",
		);
	});

	test("renders current chat avatars by default and persists the current drawer toggle", async () => {
		window.localStorage.setItem(
			CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			"false",
		);
		const globalStoreStub = createStoreStub(createSnapshot());
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot({
				entries: [
					createEntry({
						avatarUrl: "/thumbs/avatar/party.png",
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						groupAvatarUrls: [
							"/thumbs/avatar/hero.png",
							"/thumbs/avatar/mage.png",
						],
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);

		render(
			<AstraMainInterface
				chatCatalogStore={globalStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
			/>,
		);
		switchToCurrentContextSection();

		const row = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		expect(
			row.querySelector(".astra-main-interface-chat-row__entity"),
		).toHaveTextContent("Party");
		expect(
			row.querySelector(
				".astra-main-interface-chat-row__main .astra-main-interface-chat-row__chat-name",
			),
		).toHaveTextContent("campfire");
		const avatar = row.querySelector(
			".astra-main-interface-chat-row__avatar",
		);
		expect(avatar).toBeInTheDocument();
		expect(avatar).toHaveClass("astra-chat-avatar--collage");
		expect(avatar).toHaveAttribute("data-count", "2");
		expect(
			Array.from(
				row.querySelectorAll(
					".astra-main-interface-chat-row__avatar-collage-image",
				),
			).map((image) => image.getAttribute("src")),
		).toEqual(["/thumbs/avatar/hero.png", "/thumbs/avatar/mage.png"]);
		expectNoCurrentChatRowChildSelectors(row);

		openCurrentControlsDrawer();

		const showAvatarsSwitch = await screen.findByRole("switch", {
			name: "Show avatars",
		});
		expect(showAvatarsSwitch).toHaveAttribute("aria-checked", "true");

		fireEvent.click(await screen.findByText("Show avatars"));

		expect(
			row.querySelector(".astra-main-interface-chat-row__avatar"),
		).not.toBeInTheDocument();
		expect(
			window.localStorage.getItem(CHAT_MENU_SHOW_AVATARS_STORAGE_KEY),
		).toBe("false");
		expect(
			window.localStorage.getItem(
				CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			),
		).toBe("false");
		expect(showAvatarsSwitch).toHaveAttribute("aria-checked", "false");
	});

	test("favorite chat rows reuse the current avatar visibility preference", async () => {
		window.localStorage.setItem(
			CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			"false",
		);
		const globalStoreStub = createStoreStub(createSnapshot());
		const scopedStoreStub = createScopedStoreStub(
			createCurrentSnapshot({
				entries: [
					createEntry({
						avatarUrl: "/thumbs/avatar/mage.png",
						chatId: "mage-notes",
						entityId: "1",
						entityName: "Mage",
						key: "character:1:mage-notes",
					}),
				],
			}),
		);

		render(
			<AstraMainInterface
				activeSection="favorite:character:1"
				chatCatalogStore={globalStoreStub.store}
				scopedChatCatalogStore={scopedStoreStub.store}
			/>,
		);

		const row = screen.getByRole("button", {
			name: "Open Mage mage-notes",
		});
		expect(
			row.querySelector(".astra-main-interface-chat-row__entity"),
		).toHaveTextContent("Mage");
		expect(
			row.querySelector(
				".astra-main-interface-chat-row__main .astra-main-interface-chat-row__chat-name",
			),
		).toHaveTextContent("mage-notes");
		expect(
			row.querySelector(".astra-main-interface-chat-row__avatar"),
		).not.toBeInTheDocument();
		expectNoCurrentChatRowChildSelectors(row);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Favorite chat menu controls",
			}),
		);

		const showAvatarsSwitch = await screen.findByRole("switch", {
			name: "Show avatars",
		});
		expect(showAvatarsSwitch).toHaveAttribute("aria-checked", "false");

		fireEvent.click(await screen.findByText("Show avatars"));

		expect(
			row.querySelector(".astra-main-interface-chat-row__avatar"),
		).toBeInTheDocument();
		expectNoCurrentChatRowChildSelectors(row);
		expect(
			window.localStorage.getItem(
				CURRENT_CHAT_MENU_SHOW_AVATARS_STORAGE_KEY,
			),
		).toBe("true");
		expect(showAvatarsSwitch).toHaveAttribute("aria-checked", "true");
	});

	test("filters and sorts current chats with current-specific preferences", () => {
		window.localStorage.setItem(CHAT_MENU_SORT_MODE_STORAGE_KEY, "oldest");
		window.localStorage.setItem(
			CURRENT_CHAT_MENU_SORT_MODE_STORAGE_KEY,
			"entity-asc",
		);
		window.localStorage.setItem(
			CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			"0",
		);
		window.localStorage.setItem(
			CURRENT_CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			"3",
		);
		const globalStoreStub = createStoreStub(createSnapshot());
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot({
				entries: [
					createEntry({
						chatId: "zeta",
						fileName: "zeta.jsonl",
						key: "character:0:zeta",
						lastMessageAt: 10,
						lastMessagePreview: "needle preview",
					}),
					createEntry({
						chatId: "alpha",
						fileName: "alpha.jsonl",
						key: "character:0:alpha",
						lastMessageAt: 20,
						lastMessagePreview: "other preview",
					}),
				],
			}),
		);

		render(
			<AstraMainInterface
				chatCatalogStore={globalStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
			/>,
		);
		switchToCurrentContextSection();

		let rows = getCurrentChatRowButtons();
		expect(within(rows[0]).getByText("alpha")).toBeInTheDocument();
		expect(
			rows[0].querySelector(".astra-main-interface-chat-row__preview"),
		).toBeInTheDocument();
		expectNoCurrentChatRowChildSelectors(rows[0]);
		expect(rows[0]).toHaveAttribute("data-preview-lines", "3");

		fireEvent.change(screen.getByLabelText("Search current chats"), {
			target: {
				value: "needle",
			},
		});

		rows = getCurrentChatRowButtons();
		expect(rows).toHaveLength(1);
		expect(within(rows[0]).getByText("zeta")).toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("button", {
				name: "Clear current chat search",
			}),
		);

		expect(screen.getByLabelText("Search current chats")).toHaveValue("");
		expect(getCurrentChatRowButtons()).toHaveLength(2);
		expect(
			window.localStorage.getItem(CHAT_MENU_SORT_MODE_STORAGE_KEY),
		).toBe("oldest");
	});

	test("opens current chat rows through the current-specific action override", async () => {
		const globalStoreStub = createStoreStub(createSnapshot());
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot({
				entries: [
					createEntry({
						isCurrent: false,
					}),
				],
			}),
		);
		const openCurrentChat = vi
			.fn<OpenChatCatalogEntry>()
			.mockResolvedValue({
				ok: true,
			});
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={globalStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
				openCurrentChat={openCurrentChat}
				onRequestClose={onRequestClose}
			/>,
		);
		switchToCurrentContextSection();

		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Hero chapter-1",
			}),
		);

		await waitFor(() => {
			expect(openCurrentChat).toHaveBeenCalledWith(
				expect.objectContaining({
					chatId: "chapter-1",
				}),
			);
		});
		expect(onRequestClose).toHaveBeenCalledTimes(1);
	});

	test("saves staged category assignments from current chat rows", async () => {
		const globalStoreStub = createStoreStub(createSnapshot());
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot({
				entries: [
					createEntry({
						chatId: "chapter-1",
						entityName: "Hero",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global"],
		});
		categoryStoreStub.store.createCategory({
			name: "Story Arc",
			scope: "global",
		});
		const openCurrentChat = vi
			.fn<OpenChatCatalogEntry>()
			.mockResolvedValue({
				ok: true,
			});

		render(
			<AstraMainInterface
				chatCatalogStore={globalStoreStub.store}
				chatCategoryStore={categoryStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
				openCurrentChat={openCurrentChat}
			/>,
		);
		switchToCurrentContextSection();

		const currentPanel = screen
			.getByText("chapter-1")
			.closest(".astra-main-interface");
		expect(currentPanel).toHaveAttribute(
			"data-route",
			"current-context-chats",
		);

		const row = screen.getByRole("button", {
			name: "Open Hero chapter-1",
		});
		const categoryAction = within(row).getByRole("button", {
			name: "Edit categories",
		});

		expect(categoryAction).toHaveClass(
			"astra-main-interface-chat-row__action-button",
			"astra-main-interface-chat-row__action-button--categories",
		);
		expectNoCurrentChatRowChildSelectors(row);
		expect(categoryAction).toHaveAttribute(
			"aria-controls",
			"astra-main-interface-chat-category-drawer",
		);
		expect(categoryAction).toHaveAttribute("aria-expanded", "false");
		expect(categoryAction).toHaveAttribute("data-state", "off");
		expect(
			categoryAction.querySelector(".lucide-bookmark"),
		).toBeInTheDocument();

		fireEvent.click(categoryAction);

		expect(openCurrentChat).not.toHaveBeenCalled();
		expect(categoryAction).toHaveAttribute("aria-expanded", "true");
		expect(categoryAction).toHaveAttribute("data-state", "off");

		const drawer = await screen.findByRole("dialog", {
			name: "Edit categories",
		});
		expect(drawer).toHaveAttribute(
			"id",
			"astra-main-interface-chat-category-drawer",
		);
		expect(drawer).toHaveClass("astra-main-interface-chat-category-drawer");
		expect(
			drawer.querySelector(".astra-dialog-identityName"),
		).toHaveTextContent("Hero");
		expect(within(drawer).getByText("chapter-1")).toHaveClass(
			"astra-dialog-current-chat-file-name",
		);
		expect(
			drawer.querySelector(
				".astra-chat-library-category-panel.astra-chat-library-dialog-category-panel",
			),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(".astra-chat-library-category-treeLayout"),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(
				".astra-main-interface-chat-category-drawer__panel",
			),
		).toBeInTheDocument();
		expect(
			drawer.querySelector(
				".astra-main-interface-chat-category-drawer__assignment-list",
			),
		).toBeInTheDocument();
		expect(
			within(drawer).getByLabelText("New category name"),
		).not.toBeDisabled();
		const checkbox = within(drawer).getByRole("checkbox", {
			name: /Story Arc/,
		});
		const checkboxRow = checkbox.closest(
			".astra-main-interface-chat-category-drawer__category-row",
		);
		expect(checkbox).toHaveClass("astra-chat-library-category-checkbox");
		expect(checkbox).toHaveAttribute("data-slot", "checkbox");
		expect(checkboxRow).toBeInTheDocument();
		expect(
			checkboxRow?.querySelector(".astra-chat-library-category-checkbox"),
		).toBe(checkbox);
		expect(
			checkboxRow?.querySelector(
				".astra-main-interface-chat-category-drawer__checkbox-wrap",
			),
		).toContainElement(checkbox);
		expect(
			within(drawer).queryByText("No chats assigned yet."),
		).not.toBeInTheDocument();
		const scopeTrigger = drawer.querySelector(
			".astra-chat-library-category-selectTrigger",
		);
		expect(scopeTrigger).toBeInTheDocument();
		expect(scopeTrigger?.tagName).toBe("BUTTON");
		expect(scopeTrigger).toHaveAttribute(
			"aria-label",
			"Category scope: Character",
		);
		expect(scopeTrigger).toHaveAttribute("title", "Character");
		expect(
			scopeTrigger?.querySelector('[data-slot="select-value"]'),
		).not.toBeInTheDocument();
		expect(
			scopeTrigger?.querySelector(".lucide-chevron-down"),
		).not.toBeInTheDocument();
		expect(
			scopeTrigger?.querySelector(".lucide-circle-user"),
		).toBeInTheDocument();
		fireEvent.click(checkbox);
		expect(
			categoryStoreStub.store.getChatCategoryIds("character:0:chapter-1"),
		).toEqual([]);
		fireEvent.click(
			within(drawer).getByRole("button", { name: "Save changes" }),
		);
		expect(
			categoryStoreStub.store.getChatCategoryIds("character:0:chapter-1"),
		).toEqual(["cat_global"]);
		await waitFor(() => {
			expect(categoryAction).toHaveAttribute("aria-expanded", "false");
		});
		expect(categoryAction).toHaveAttribute("data-state", "on");
		await waitFor(
			() => {
				expect(
					screen.queryByRole("dialog", { name: "Edit categories" }),
				).not.toBeInTheDocument();
			},
			{ timeout: ROW_OVERLAY_UNMOUNT_TIMEOUT_MS },
		);
	});

	test("opens the same category drawer from favorite character chat rows", async () => {
		const globalStoreStub = createStoreStub(createSnapshot());
		const scopedStoreStub = createScopedStoreStub(
			createCurrentSnapshot({
				entries: [
					createEntry({
						chatId: "mage-notes",
						entityId: "1",
						entityName: "Mage",
						key: "character:1:mage-notes",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_favorite_global"],
		});
		categoryStoreStub.store.createCategory({
			name: "Favorite Global",
			scope: "global",
		});
		const openCurrentChat = vi
			.fn<OpenChatCatalogEntry>()
			.mockResolvedValue({
				ok: true,
			});

		render(
			<AstraMainInterface
				activeSection="favorite:character:1"
				chatCatalogStore={globalStoreStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openCurrentChat={openCurrentChat}
				scopedChatCatalogStore={scopedStoreStub.store}
			/>,
		);

		const favoritePanel = screen
			.getByText("mage-notes")
			.closest(".astra-main-interface");
		expect(favoritePanel).toHaveAttribute(
			"data-route",
			"favorite-character-chats",
		);
		expect(scopedStoreStub.store.setEntity).toHaveBeenCalledWith({
			entityId: "1",
			kind: "character",
		});

		const row = screen.getByRole("button", {
			name: "Open Mage mage-notes",
		});
		const categoryAction = within(row).getByRole("button", {
			name: "Edit categories",
		});

		expect(categoryAction).toHaveAttribute(
			"aria-controls",
			"astra-main-interface-chat-category-drawer",
		);
		expect(categoryAction).toHaveAttribute("aria-expanded", "false");
		expect(categoryAction).toHaveAttribute("data-state", "off");

		fireEvent.click(categoryAction);

		expect(openCurrentChat).not.toHaveBeenCalled();
		expect(categoryAction).toHaveAttribute("aria-expanded", "true");
		expect(categoryAction).toHaveAttribute("data-state", "off");

		const drawer = await screen.findByRole("dialog", {
			name: "Edit categories",
		});
		expect(drawer).toHaveAttribute(
			"id",
			"astra-main-interface-chat-category-drawer",
		);
		expect(drawer).toHaveClass("astra-main-interface-chat-category-drawer");
		expect(
			drawer.querySelector(".astra-dialog-identityName"),
		).toHaveTextContent("Mage");
		expect(within(drawer).getByText("mage-notes")).toHaveClass(
			"astra-dialog-current-chat-file-name",
		);
		expect(
			document.querySelectorAll(
				"#astra-main-interface-chat-category-drawer",
			),
		).toHaveLength(1);
	});

	test("renders current categories as owner-only global-style category rows", () => {
		const globalStoreStub = createStoreStub(createSnapshot());
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot({
				entries: [
					createEntry({
						chatId: "side-story",
						fileName: "side-story.jsonl",
						key: "character:0:side-story",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_owner", "cat_global"],
		});
		categoryStoreStub.store.createCategory({
			name: "Hero Notes",
			ownerId: "0",
			ownerType: "character",
			scope: "owner",
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds("character:0:side-story", [
			"cat_owner",
			"cat_global",
		]);
		categoryStoreStub.store.setChatCategoryIds("character:0:hidden-chat", [
			"cat_global",
		]);

		render(
			<AstraMainInterface
				chatCatalogStore={globalStoreStub.store}
				chatCategoryStore={categoryStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
			/>,
		);
		switchToCurrentContextSection();

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Current context sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);

		const manager = document.querySelector(
			".astra-chat-library-global-manager.astra-chat-library-scoped-manager",
		);
		expect(manager).toBeInTheDocument();
		if (!(manager instanceof HTMLElement)) {
			throw new Error("Expected scoped category manager element");
		}
		expect(
			manager.querySelector(".astra-chat-library-category-accordion"),
		).not.toBeInTheDocument();
		expect(
			manager.querySelector(
				".astra-chat-library-category-panel.astra-chat-library-global-panel",
			),
		).toBeInTheDocument();
		const createRow = manager.querySelector(
			".astra-chat-library-category-createRow",
		);
		expect(createRow).toHaveClass(
			"astra-chat-library-category-createRow--single",
		);
		expect(
			manager.querySelector(".astra-chat-library-category-selectTrigger"),
		).not.toBeInTheDocument();

		const categoryRows = Array.from(
			manager.querySelectorAll(".astra-chat-library-global-categoryRow"),
		);
		expect(categoryRows).toHaveLength(1);
		expect(categoryRows[0]).toHaveTextContent("Hero Notes");
		expect(
			within(manager).queryByText("Global Plot"),
		).not.toBeInTheDocument();

		const ownerHeader = within(manager).getByRole("button", {
			name: /Hero Notes\s*\(1\)/,
		});
		expect(ownerHeader).toHaveClass(
			"astra-chat-library-global-categoryHeader",
		);
		expect(ownerHeader).toHaveAttribute("aria-expanded", "true");
		expect(
			ownerHeader.querySelector(
				".astra-chat-library-global-categoryLabel .lucide-globe",
			),
		).not.toBeInTheDocument();
		expect(
			within(categoryRows[0] as HTMLElement).getByRole("button", {
				name: "Delete character category: Hero Notes",
			}),
		).toHaveClass("astra-chat-library-global-categoryDeleteAction");
		expect(
			within(categoryRows[0] as HTMLElement).getByRole("button", {
				name: "Rename character category: Hero Notes",
			}),
		).toHaveClass("astra-chat-library-global-categoryRenameAction");
		expect(
			within(manager).queryByRole("button", {
				name: "Delete global category: Global Plot",
			}),
		).not.toBeInTheDocument();

		const ownerChatList = categoryRows[0].querySelector(
			".astra-chat-library-global-chatList",
		);
		expect(ownerChatList).toBeInTheDocument();
		expect(
			within(ownerChatList as HTMLElement).getByRole("button", {
				name: "Open Hero side-story",
			}),
		).toHaveClass("astra-chat-library-global-chatRow");
		fireEvent.click(ownerHeader);
		expect(ownerHeader).toHaveAttribute("aria-expanded", "false");
		expect(ownerChatList).toHaveAttribute("hidden");
		expect(screen.queryByText("hidden-chat")).not.toBeInTheDocument();
		expect(
			screen.getByLabelText("New character category name"),
		).not.toBeDisabled();
	});

	test("removes current category chat rows and opens current chat actions", async () => {
		const globalStoreStub = createStoreStub(createSnapshot());
		const entry = createEntry({
			chatId: "side-story",
			fileName: "side-story.jsonl",
			key: "character:0:side-story",
		});
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot({
				entries: [entry],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_owner"],
		});
		categoryStoreStub.store.createCategory({
			name: "Hero Notes",
			ownerId: "0",
			ownerType: "character",
			scope: "owner",
		});
		categoryStoreStub.store.setChatCategoryIds(entry.key, ["cat_owner"]);
		const openCurrentChat = vi
			.fn<OpenChatCatalogEntry>()
			.mockResolvedValue({
				ok: true,
			});
		const exportCurrentChat = vi
			.fn<ExportChatCatalogEntry>()
			.mockResolvedValue({
				fileName: "side-story.txt",
				ok: true,
			});

		render(
			<AstraMainInterface
				activeSection="current-context"
				chatCatalogStore={globalStoreStub.store}
				chatCategoryStore={categoryStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
				exportCurrentChat={exportCurrentChat}
				openCurrentChat={openCurrentChat}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Current context sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		const chatRow = screen.getByRole("button", {
			name: "Open Hero side-story",
		});
		const moreAction = within(chatRow).getByRole("button", {
			name: "More chat actions: side-story",
		});

		fireEvent.click(moreAction);

		expect(openCurrentChat).not.toHaveBeenCalled();
		expect(moreAction).toHaveAttribute("aria-expanded", "true");
		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		expect(drawer).toHaveAttribute(
			"id",
			"astra-main-interface-chat-actions-drawer",
		);
		fireEvent.click(
			within(drawer).getByRole("button", {
				name: "Export plain text chat file",
			}),
		);

		await waitFor(() => {
			expect(exportCurrentChat).toHaveBeenCalledWith(entry, "txt");
		});
		await waitForDialogToUnmount("Chat actions");

		fireEvent.click(
			screen.getByRole("button", {
				name: "Remove from category: Hero Notes",
			}),
		);
		expect(
			categoryStoreStub.store.getCategoryChatKeys("cat_owner"),
		).toEqual([]);
		expect(screen.getByText("No chats assigned yet.")).toBeInTheDocument();
	});

	test("opens current category chat rows through the chat switch overlay flow", async () => {
		document.body.innerHTML = `
            <div id="sheld">
                <div id="chat"></div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const globalStoreStub = createStoreStub(createSnapshot());
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot({
				entries: [
					createEntry({
						chatId: "side-story",
						fileName: "side-story.jsonl",
						key: "character:0:side-story",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_owner"],
		});
		categoryStoreStub.store.createCategory({
			name: "Hero Notes",
			ownerId: "0",
			ownerType: "character",
			scope: "owner",
		});
		categoryStoreStub.store.setChatCategoryIds("character:0:side-story", [
			"cat_owner",
		]);
		const openResult =
			createDeferred<Awaited<ReturnType<OpenChatCatalogEntry>>>();
		const openCurrentChat = vi
			.fn<OpenChatCatalogEntry>()
			.mockReturnValue(openResult.promise);
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				activeSection="current-context"
				chatCatalogStore={globalStoreStub.store}
				chatCategoryStore={categoryStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
				openCurrentChat={openCurrentChat}
				onRequestClose={onRequestClose}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Current context sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		const chatRow = screen.getByRole("button", {
			name: "Open Hero side-story",
		});

		fireEvent.click(chatRow);

		expect(openCurrentChat).toHaveBeenCalledWith(
			expect.objectContaining({
				key: "character:0:side-story",
			}),
		);
		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(
			within(sheld).getByRole("status", {
				name: "Opening chat...",
			}),
		).toBeInTheDocument();
		expect(chatRow).toHaveAttribute("aria-disabled", "true");
		expect(chatRow).toHaveAttribute("tabindex", "-1");

		await act(async () => {
			openResult.resolve({
				ok: true,
			});
		});
		expect(
			within(sheld).getByRole("status", {
				name: "Opening chat...",
			}),
		).toBeInTheDocument();
		expect(currentStoreStub.store.refresh).toHaveBeenCalledTimes(1);
	});

	test("creates an owner category from the scoped category page create row", () => {
		const globalStoreStub = createStoreStub(createSnapshot());
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot(),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_scoped_owner"],
		});

		render(
			<AstraMainInterface
				activeSection="current-context"
				chatCatalogStore={globalStoreStub.store}
				chatCategoryStore={categoryStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Current context sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		const manager = document.querySelector(
			".astra-chat-library-global-manager.astra-chat-library-scoped-manager",
		);
		expect(manager).toBeInTheDocument();
		if (!(manager instanceof HTMLElement)) {
			throw new Error("Expected scoped category manager element");
		}
		const createRow = manager.querySelector(
			".astra-chat-library-category-createRow",
		);
		expect(createRow).toHaveClass(
			"astra-chat-library-category-createRow--single",
		);
		expect(
			manager.querySelector(".astra-chat-library-category-selectTrigger"),
		).not.toBeInTheDocument();
		const categoryInput = screen.getByLabelText(
			"New character category name",
		);

		fireEvent.input(categoryInput, {
			target: {
				value: "Character Plot",
			},
		});
		expect(categoryInput).toHaveValue("Character Plot");
		fireEvent.click(
			screen.getByRole("button", {
				name: "Add character category",
			}),
		);

		expect(
			screen.queryByText("Choose a valid category scope."),
		).not.toBeInTheDocument();
		const categoryHeader = screen.getByRole("button", {
			name: /Character Plot\s*\(0\)/,
		});
		expect(categoryHeader).toHaveClass(
			"astra-chat-library-global-categoryHeader",
		);
		expect(
			categoryHeader.querySelector(
				".astra-chat-library-global-categoryLabel .lucide-globe",
			),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /^Global\s*\(1\)$/ }),
		).not.toBeInTheDocument();
		expect(
			categoryStoreStub.store.getVisibleCategories({
				ownerId: "0",
				ownerType: "character",
				scope: "owner",
			}).owner,
		).toEqual([
			expect.objectContaining({
				id: "cat_scoped_owner",
				name: "Character Plot",
				scope: "owner",
			}),
		]);
		expect(categoryStoreStub.store.getVisibleCategories().global).toEqual(
			[],
		);
	});

	test("renders favorite categories for the selected favorite scope", () => {
		const globalStoreStub = createStoreStub(createSnapshot());
		const scopedStoreStub = createScopedStoreStub(
			createCurrentSnapshot({
				activeEntity: {
					activeChatId: "",
					avatarUrl: "/thumbs/avatar/mage.png",
					characterId: 1,
					entityId: "1",
					entityName: "Mage",
					kind: "character",
					requestAvatarUrl: "mage.png",
					requestGroupId: null,
					scopeKey: "character:1",
				},
				entries: [
					createEntry({
						chatId: "mage-notes",
						entityId: "1",
						entityName: "Mage",
						fileName: "mage-notes.jsonl",
						key: "character:1:mage-notes",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_mage", "cat_global"],
		});
		categoryStoreStub.store.createCategory({
			name: "Mage Notes",
			ownerId: "1",
			ownerType: "character",
			scope: "owner",
		});
		categoryStoreStub.store.createCategory({
			name: "Global Plot",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds("character:1:mage-notes", [
			"cat_mage",
			"cat_global",
		]);

		render(
			<AstraMainInterface
				activeSection="favorite:character:1"
				chatCatalogStore={globalStoreStub.store}
				chatCategoryStore={categoryStoreStub.store}
				scopedChatCatalogStore={scopedStoreStub.store}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Favorite sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);

		expect(scopedStoreStub.store.setEntity).toHaveBeenCalledWith({
			entityId: "1",
			kind: "character",
		});
		expect(screen.getByText("Mage Notes")).toBeInTheDocument();
		expect(screen.queryByText("Global Plot")).not.toBeInTheDocument();
		const favoriteCategoriesPanel = screen
			.getByText("Mage Notes")
			.closest(".astra-smooth-tabs__panel");
		expect(favoriteCategoriesPanel).toHaveClass(
			"astra-main-interface__category-tab-panel",
			"astra-main-interface__favorite-category-tab-panel",
		);
		expect(
			favoriteCategoriesPanel?.querySelector(
				".astra-main-interface__tab-panel",
			),
		).toHaveClass("astra-main-interface__tab-panel--categories");
		expect(
			screen.queryByText("Character or group chat categories"),
		).not.toBeInTheDocument();
		const categoryRows = Array.from(
			document.querySelectorAll(".astra-chat-library-global-categoryRow"),
		);
		expect(categoryRows).toHaveLength(1);
		expect(categoryRows[0]).toHaveTextContent("Mage Notes");
		const ownerHeader = screen.getByRole("button", {
			name: /Mage Notes\s*\(1\)/,
		});
		expect(
			ownerHeader.querySelector(
				".astra-chat-library-global-categoryLabel .lucide-globe",
			),
		).not.toBeInTheDocument();
		expect(
			within(categoryRows[0] as HTMLElement).getByRole("button", {
				name: "Delete character category: Mage Notes",
			}),
		).toBeInTheDocument();
		expect(
			within(categoryRows[0] as HTMLElement).getByRole("button", {
				name: "Rename character category: Mage Notes",
			}),
		).toBeInTheDocument();
		expect(screen.getAllByText("mage-notes")).toHaveLength(2);
	});

	test("shows an inline error when a favorite category chat row fails to open", async () => {
		document.body.innerHTML = `
            <div id="sheld">
                <div id="chat"></div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const globalStoreStub = createStoreStub(createSnapshot());
		const scopedStoreStub = createScopedStoreStub(
			createCurrentSnapshot({
				activeEntity: {
					activeChatId: "",
					avatarUrl: "/thumbs/avatar/mage.png",
					characterId: 1,
					entityId: "1",
					entityName: "Mage",
					kind: "character",
					requestAvatarUrl: "mage.png",
					requestGroupId: null,
					scopeKey: "character:1",
				},
				entries: [
					createEntry({
						chatId: "mage-notes",
						entityId: "1",
						entityName: "Mage",
						fileName: "mage-notes.jsonl",
						key: "character:1:mage-notes",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_mage"],
		});
		categoryStoreStub.store.createCategory({
			name: "Mage Notes",
			ownerId: "1",
			ownerType: "character",
			scope: "owner",
		});
		categoryStoreStub.store.setChatCategoryIds("character:1:mage-notes", [
			"cat_mage",
		]);
		const openResult =
			createDeferred<Awaited<ReturnType<OpenChatCatalogEntry>>>();
		const openCurrentChat = vi
			.fn<OpenChatCatalogEntry>()
			.mockReturnValue(openResult.promise);
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				activeSection="favorite:character:1"
				chatCatalogStore={globalStoreStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openCurrentChat={openCurrentChat}
				scopedChatCatalogStore={scopedStoreStub.store}
				onRequestClose={onRequestClose}
			/>,
		);

		fireEvent.click(
			within(
				screen.getByRole("tablist", {
					name: "Favorite sections",
				}),
			).getByRole("tab", { name: "Categories" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Mage mage-notes",
			}),
		);

		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(
			within(sheld).getByRole("status", {
				name: "Opening chat...",
			}),
		).toBeInTheDocument();

		openResult.resolve({
			ok: false,
			reason: "open-failed",
		});

		expect(
			await screen.findByText("Failed to open chat."),
		).toBeInTheDocument();
		expect(
			within(sheld).queryByRole("status", {
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
		expect(scopedStoreStub.store.refresh).not.toHaveBeenCalled();
	});

	test("uses current-specific export actions from the current row action drawer", async () => {
		const globalStoreStub = createStoreStub(createSnapshot());
		const currentStoreStub = createCurrentStoreStub(
			createCurrentSnapshot({
				entries: [createEntry()],
			}),
		);
		const exportCurrentChat = vi
			.fn<ExportChatCatalogEntry>()
			.mockResolvedValue({
				fileName: "chapter-1.txt",
				ok: true,
			});

		render(
			<AstraMainInterface
				chatCatalogStore={globalStoreStub.store}
				currentChatCatalogStore={currentStoreStub.store}
				exportCurrentChat={exportCurrentChat}
			/>,
		);
		switchToCurrentContextSection();

		const row = screen.getByRole("button", {
			name: "Open Hero chapter-1",
		});
		fireEvent.click(
			within(row).getByRole("button", {
				name: "Chat actions",
			}),
		);
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Export plain text chat file",
			}),
		);

		await waitFor(() => {
			expect(exportCurrentChat).toHaveBeenCalledWith(
				expect.objectContaining({
					chatId: "chapter-1",
				}),
				"txt",
			);
		});
	});

	test("preserves chat tab state after visiting categories", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Preserved Hero",
					}),
					createEntry({
						chatId: "other-chat",
						entityName: "Other Hero",
						key: "character:2:other-chat",
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		fireEvent.change(screen.getByLabelText("Search chats"), {
			target: {
				value: "Preserved",
			},
		});
		expect(screen.getAllByText("Preserved Hero").length).toBeGreaterThan(0);
		expect(
			within(getGlobalChatsPanel()).queryByText("Other Hero"),
		).not.toBeInTheDocument();

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		fireEvent.click(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		);
		expect(
			screen.queryByRole("searchbox", { name: "Search chats" }),
		).not.toBeInTheDocument();

		fireEvent.click(within(globalTabs).getByRole("tab", { name: "Chats" }));

		expect(screen.getByLabelText("Search chats")).toHaveValue("Preserved");
		expect(screen.getAllByText("Preserved Hero").length).toBeGreaterThan(0);
		expect(
			within(getGlobalChatsPanel()).queryByText("Other Hero"),
		).not.toBeInTheDocument();
	});

	test("does not auto-load full history while global chats is active", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
				isLikelyTruncated: true,
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		expect(storeStub.store.refresh).not.toHaveBeenCalled();
	});

	test("auto-loads full history once when opening truncated global categories", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
				isLikelyTruncated: true,
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		fireEvent.click(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		);

		await waitFor(() => {
			expect(storeStub.store.refresh).toHaveBeenCalledWith({
				full: true,
			});
		});
		expect(storeStub.store.refresh).toHaveBeenCalledTimes(1);

		storeStub.dispatch(
			createSnapshot({
				entries: [createEntry()],
				isLikelyTruncated: true,
			}),
		);

		expect(storeStub.store.refresh).toHaveBeenCalledTimes(1);
	});

	test.each(["loading", "refreshing"] as const)(
		"does not auto-load full history from global categories while the catalog is %s",
		async (status) => {
			const storeStub = createStoreStub(
				createSnapshot({
					entries: [createEntry()],
					isLikelyTruncated: true,
					status,
				}),
			);

			render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

			const globalTabs = screen.getByRole("tablist", {
				name: "Global sections",
			});
			fireEvent.click(
				within(globalTabs).getByRole("tab", { name: "Categories" }),
			);

			await waitFor(() => {
				expect(
					within(globalTabs).getByRole("tab", {
						name: "Categories",
					}),
				).toHaveAttribute("data-state", "active");
			});
			expect(storeStub.store.refresh).not.toHaveBeenCalled();
		},
	);

	test("allows global categories to request full history again after a complete snapshot", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
				isLikelyTruncated: true,
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		fireEvent.click(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		);

		await waitFor(() => {
			expect(storeStub.store.refresh).toHaveBeenCalledTimes(1);
		});

		storeStub.dispatch(
			createSnapshot({
				entries: [createEntry()],
				isLikelyTruncated: false,
			}),
		);
		await act(async () => {});

		storeStub.dispatch(
			createSnapshot({
				entries: [createEntry()],
				isLikelyTruncated: true,
			}),
		);

		await waitFor(() => {
			expect(storeStub.store.refresh).toHaveBeenCalledTimes(2);
		});
		expect(storeStub.store.refresh).toHaveBeenLastCalledWith({
			full: true,
		});
	});

	test("shows global category chats after the full-history snapshot supplies their catalog entries", async () => {
		const oldChat = createEntry({
			chatId: "older-quest",
			entityName: "Archive Hero",
			key: "character:0:older-quest",
		});
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [],
				isLikelyTruncated: true,
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_global_archive"],
		});
		categoryStoreStub.store.createCategory({
			name: "Archive",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds(oldChat.key, [
			"cat_global_archive",
		]);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
			/>,
		);

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		fireEvent.click(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		);

		await waitFor(() => {
			expect(storeStub.store.refresh).toHaveBeenCalledWith({
				full: true,
			});
		});
		expect(
			screen.getByRole("button", { name: /Archive\s*\(0\)/ }),
		).toBeInTheDocument();

		storeStub.dispatch(
			createSnapshot({
				entries: [oldChat],
				isLikelyTruncated: false,
			}),
		);

		expect(
			await screen.findByRole("button", {
				name: "Open Archive Hero older-quest",
			}),
		).toBeInTheDocument();
	});

	test("switches global tabs from the smooth-tabs swipe viewport", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Swipe Hero",
					}),
				],
			}),
		);
		const { container } = render(
			<AstraMainInterface chatCatalogStore={storeStub.store} />,
		);
		const viewport = container.querySelector(
			".astra-main-interface__global-tabs .astra-smooth-tabs__viewport",
		) as HTMLElement;
		mockElementWidth(viewport, 320);

		fireEvent.touchStart(viewport, {
			touches: [{ clientX: 260, clientY: 40 }],
		});
		fireEvent.touchMove(viewport, {
			cancelable: true,
			touches: [{ clientX: 220, clientY: 42 }],
		});
		fireEvent.touchEnd(viewport);

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		expect(
			within(globalTabs).getByRole("tab", { name: "Chats" }),
		).toHaveAttribute("data-state", "active");
		expect(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		).toHaveAttribute("data-state", "inactive");
		expect(
			within(
				document.querySelector(
					".astra-smooth-tabs__panel[data-route='global-chats']",
				) as HTMLElement,
			).getByText("Swipe Hero"),
		).toBeInTheDocument();
	});

	test("switches global tabs from a horizontal touch inside tab scroll content", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Scroll Gesture Hero",
					}),
				],
			}),
		);
		const { container } = render(
			<AstraMainInterface chatCatalogStore={storeStub.store} />,
		);
		const smoothViewport = container.querySelector(
			".astra-main-interface__global-tabs .astra-smooth-tabs__viewport",
		) as HTMLElement;
		const chatRow = getChatRowButtons()[0];
		mockElementWidth(smoothViewport, 320);

		fireEvent.touchStart(chatRow, {
			touches: [{ clientX: 260, clientY: 40 }],
		});
		fireEvent.touchMove(chatRow, {
			cancelable: true,
			touches: [{ clientX: 190, clientY: 42 }],
		});
		fireEvent.touchEnd(chatRow);

		const globalTabs = screen.getByRole("tablist", {
			name: "Global sections",
		});
		expect(
			within(globalTabs).getByRole("tab", { name: "Categories" }),
		).toHaveAttribute("data-state", "active");
		expect(
			screen.getAllByText("Scroll Gesture Hero").length,
		).toBeGreaterThan(0);
		expect(
			screen.getByText("No global chat categories yet"),
		).toBeInTheDocument();
	});

	test("renders cached and empty states without a status row", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				status: "loading",
			}),
		);
		const { container, rerender } = render(
			<AstraMainInterface chatCatalogStore={storeStub.store} />,
		);
		openGlobalChatsTab();

		expect(screen.queryByText("Loading chats")).not.toBeInTheDocument();
		expect(
			container.querySelector(".astra-main-interface__route-header"),
		).not.toBeInTheDocument();
		expect(
			container.querySelector(".astra-main-interface__status-row"),
		).not.toBeInTheDocument();
		expect(
			container.querySelector(".astra-main-interface__toolbar"),
		).toContainElement(
			screen.getByRole("button", { name: "Chat menu controls" }),
		);
		expect(
			screen.queryByRole("button", { name: "Reload chat menu" }),
		).not.toBeInTheDocument();

		storeStub.dispatch(
			createSnapshot({
				cacheStatus: "stale",
				entries: [
					createEntry({
						entityName: "Cached Hero",
					}),
				],
				status: "refreshing",
			}),
		);
		rerender(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		expect(screen.queryByText("Refreshing chats")).not.toBeInTheDocument();
		expect(
			within(getGlobalChatsPanel()).getByText("Cached Hero"),
		).toBeInTheDocument();

		storeStub.dispatch(createSnapshot());
		rerender(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		const emptyState = screen
			.getByText("No chats found")
			.closest(".astra-main-interface__empty-state");
		expect(emptyState).toBeInTheDocument();
		expect(emptyState).toHaveAttribute("data-slot", "empty");
		expect(
			emptyState?.querySelector("#astra-main-interface-empty-header"),
		).toBeInTheDocument();
		expect(
			emptyState?.querySelector("#astra-main-interface-empty-media"),
		).toHaveClass("astra-main-interface__empty-media");
		expect(
			emptyState?.querySelector("#astra-main-interface-empty-title"),
		).toHaveClass("astra-main-interface__empty-title");
		expect(
			emptyState?.querySelector(
				"#astra-main-interface-empty-description",
			),
		).toHaveClass("astra-main-interface__empty-description");
		expect(
			emptyState?.querySelector("#astra-main-interface-empty-actions"),
		).toHaveClass("astra-main-interface__empty-actions");
		expect(
			screen.getByText("There are no chat files to show yet."),
		).toBeInTheDocument();

		storeStub.dispatch(
			createSnapshot({
				errorMessage: "Failed to load chats.",
				status: "error",
			}),
		);
		rerender(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		expect(
			screen.queryByText("Failed to load chats."),
		).not.toBeInTheDocument();
	});

	test("filters and sorts rows through local controls", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Zed",
						messageCount: 10,
					}),
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						key: "group:party:campfire",
						kind: "group",
						lastMessagePreview: "campfire plan",
						messageCount: 2,
					}),
					createEntry({
						chatId: "alpha-chat",
						entityId: "2",
						entityName: "Alpha",
						key: "character:2:alpha-chat",
						messageCount: 1,
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		fireEvent.change(screen.getByLabelText("Search chats"), {
			target: {
				value: "campfire",
			},
		});

		expect(
			within(getGlobalChatsPanel()).getByText("Party"),
		).toBeInTheDocument();
		expect(
			within(getGlobalChatsPanel()).queryByText("Zed"),
		).not.toBeInTheDocument();

		fireEvent.change(screen.getByLabelText("Search chats"), {
			target: {
				value: "",
			},
		});
		openControlsDrawer();
		openDropdownTrigger("Recent");
		fireEvent.click(await screen.findByRole("menuitem", { name: "Count" }));
		fireEvent.click(
			await screen.findByRole("button", { name: "Ascending" }),
		);

		expect(
			screen.getByRole("dialog", {
				name: "Chat menu controls",
			}),
		).toBeInTheDocument();

		const rows = getChatRowButtons();
		expect(within(rows[0]).getByText("Alpha")).toBeInTheDocument();
		expect(within(rows[2]).getByText("Zed")).toBeInTheDocument();
	});

	test("renders toolbar controls without visible field labels", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		const { container } = render(
			<AstraMainInterface chatCatalogStore={storeStub.store} />,
		);
		openGlobalChatsTab();

		expect(screen.getByLabelText("Search chats")).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Chat menu controls",
			}),
		).toHaveClass("astra-main-interface__controls-trigger");
		expect(
			screen.queryByRole("button", {
				name: "Sort chats",
			}),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", {
				name: "Reload chat menu",
			}),
		).not.toBeInTheDocument();
		expect(
			container.querySelector(".astra-main-interface__field-label"),
		).not.toBeInTheDocument();
		expect(
			container.querySelector(".astra-main-interface__route-title"),
		).not.toBeInTheDocument();
	});

	test("uses an Astra-owned search clear button that preserves focus", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		const searchInput = screen.getByLabelText("Search chats");
		expect(searchInput).toHaveAttribute("type", "text");
		expect(
			screen.queryByRole("button", {
				name: "Clear search input",
			}),
		).not.toBeInTheDocument();
		expect(
			document.querySelector(".astra-main-interface__search-icon"),
		).toBeInTheDocument();

		fireEvent.change(searchInput, {
			target: {
				value: "hero",
			},
		});

		const clearButton = screen.getByRole("button", {
			name: "Clear search input",
		});
		expect(clearButton).toHaveClass(
			"astra-main-interface__search-clear-button",
		);
		expect(
			clearButton.querySelector(".lucide-circle-x"),
		).toBeInTheDocument();

		fireEvent.click(clearButton);

		expect(searchInput).toHaveValue("");
		expect(searchInput).toHaveFocus();
	});

	test("clears an empty search from the empty state action", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		fireEvent.change(screen.getByLabelText("Search chats"), {
			target: {
				value: "missing",
			},
		});

		expect(
			screen.getByText("No chats match your search"),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"No chats matched that search. Clear it to return to the full chat menu.",
			),
		).toBeInTheDocument();

		const clearSearchButton = screen.getByRole("button", {
			name: "Clear search",
		});
		expect(
			clearSearchButton.querySelector(".lucide-trash-2"),
		).toBeInTheDocument();

		fireEvent.click(clearSearchButton);

		expect(screen.getByLabelText("Search chats")).toHaveValue("");
		expect(
			within(getGlobalChatsPanel()).getByText("Hero"),
		).toBeInTheDocument();
	});

	test("closes the main interface from the empty state action", () => {
		const storeStub = createStoreStub(createSnapshot());
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				onRequestClose={onRequestClose}
			/>,
		);
		openGlobalChatsTab();

		const currentChatButton = screen.getByRole("button", {
			name: "Current chat",
		});
		expect(
			currentChatButton.querySelector(".lucide-message-circle"),
		).toBeInTheDocument();

		fireEvent.click(currentChatButton);

		expect(onRequestClose).toHaveBeenCalledTimes(1);
	});

	test("renders compact sort controls with field menu and direction buttons", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Old Hero",
						lastMessageAt: 10,
					}),
					createEntry({
						chatId: "new-chat",
						entityId: "2",
						entityName: "Newest Hero",
						key: "character:2:new-chat",
						lastMessageAt: 30,
					}),
				],
			}),
		);
		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		expect(
			within(getChatRowButtons()[0]).getByText("Newest Hero"),
		).toBeInTheDocument();

		openControlsDrawer();

		expect(
			screen.queryByText("Chat menu settings"),
		).not.toBeInTheDocument();
		expect(await screen.findByText("Sort by")).toBeInTheDocument();
		const recentTrigger = await screen.findByRole("button", {
			name: "Recent",
		});
		expect(recentTrigger).toHaveClass(
			"astra-main-interface-controls-drawer__sort-field-trigger",
		);
		expect(
			recentTrigger.querySelector(".lucide-clock"),
		).toBeInTheDocument();
		const controlsDrawer = document.getElementById(
			"astra-main-interface-controls-drawer",
		);
		expect(controlsDrawer).toHaveClass("astra-main-interface-drawer");
		expect(controlsDrawer?.previousElementSibling).toHaveClass(
			"astra-drawer__overlay",
		);
		expect(controlsDrawer?.previousElementSibling).toHaveAttribute(
			"data-vaul-overlay",
		);
		const descendingButton = await screen.findByRole("button", {
			name: "Descending",
		});
		const ascendingButton = await screen.findByRole("button", {
			name: "Ascending",
		});
		expect(
			descendingButton.compareDocumentPosition(ascendingButton) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).not.toBe(0);
		expect(descendingButton).toHaveClass(
			"astra-main-interface-controls-drawer__sort-direction-button--active",
		);
		expect(
			descendingButton.querySelector(".lucide-arrow-down-narrow-wide"),
		).toBeInTheDocument();
		expect(descendingButton).toHaveClass(
			"astra-main-interface-controls-drawer__sort-direction-button",
		);
		expect(
			ascendingButton.querySelector(".lucide-arrow-up-wide-narrow"),
		).toBeInTheDocument();
		expect(
			await screen.findByRole("button", {
				name: "Reload chat menu",
			}),
		).toHaveClass("astra-main-interface-controls-drawer__refresh-button");
		expect(
			screen.queryByRole("button", {
				name: "Actions",
			}),
		).not.toBeInTheDocument();

		openDropdownTrigger("Recent");

		const expectedSortFieldIcons = {
			Count: ".lucide-message-circle-more",
			Recent: ".lucide-clock",
			Title: ".lucide-type",
		};

		for (const [label, iconClassName] of Object.entries(
			expectedSortFieldIcons,
		)) {
			const item = await screen.findByRole("menuitem", {
				name: label,
			});
			expect(item.querySelector(iconClassName)).toBeInTheDocument();
		}

		fireEvent.click(await screen.findByRole("menuitem", { name: "Title" }));

		expect(
			screen
				.getByRole("button", { name: "Descending" })
				.querySelector(".lucide-arrow-up-z-a"),
		).toBeInTheDocument();
		expect(
			screen
				.getByRole("button", { name: "Ascending" })
				.querySelector(".lucide-arrow-down-a-z"),
		).toBeInTheDocument();

		openDropdownTrigger("Title");
		fireEvent.click(await screen.findByRole("menuitem", { name: "Count" }));

		expect(
			screen
				.getByRole("button", { name: "Descending" })
				.querySelector(".lucide-arrow-down-1-0"),
		).toBeInTheDocument();
		expect(
			screen
				.getByRole("button", { name: "Ascending" })
				.querySelector(".lucide-arrow-down-0-1"),
		).toBeInTheDocument();
	});

	test("keeps the controls drawer mounted for the closed-state exit animation", () => {
		vi.useFakeTimers();
		const consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		openControlsDrawer();
		const openDrawer = document.getElementById(
			"astra-main-interface-controls-drawer",
		);
		expect(openDrawer).toHaveAttribute("data-state", "open");
		const labelledBy = openDrawer?.getAttribute("aria-labelledby");
		const describedBy = openDrawer?.getAttribute("aria-describedby");
		expect(labelledBy).toBeTruthy();
		expect(labelledBy).not.toBe(
			"astra-main-interface-controls-drawer-title",
		);
		expect(document.getElementById(labelledBy ?? "")).toHaveAttribute(
			"data-slot",
			"drawer-title",
		);
		expect(describedBy).toBeTruthy();
		expect(describedBy).not.toBe(
			"astra-main-interface-controls-drawer-description",
		);
		expect(document.getElementById(describedBy ?? "")).toHaveAttribute(
			"data-slot",
			"drawer-description",
		);
		expect(
			document.getElementById(
				"astra-main-interface-controls-drawer-title",
			),
		).toHaveAttribute("data-slot", "drawer-title");
		expect(
			document.getElementById(
				"astra-main-interface-controls-drawer-description",
			),
		).toHaveAttribute("data-slot", "drawer-description");
		expect(
			consoleErrorSpy.mock.calls
				.flat()
				.some((message) =>
					String(message).includes(DIALOG_TITLE_WARNING),
				),
		).toBe(false);
		expect(
			consoleErrorSpy.mock.calls
				.flat()
				.some((message) =>
					String(message).includes(DIALOG_DESCRIPTION_WARNING),
				),
		).toBe(false);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Reload chat menu",
			}),
		);

		const closingDrawer = document.getElementById(
			"astra-main-interface-controls-drawer",
		);
		expect(closingDrawer).toBeInTheDocument();
		expect(closingDrawer).toHaveAttribute("data-state", "closed");

		act(() => {
			vi.advanceTimersByTime(649);
		});
		expect(
			document.getElementById("astra-main-interface-controls-drawer"),
		).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(
			document.getElementById("astra-main-interface-controls-drawer"),
		).not.toBeInTheDocument();
	});

	test("renders persisted display controls with preview line and avatar defaults", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		openControlsDrawer();

		const previewLinesTrigger = await screen.findByRole("button", {
			name: "2 lines",
		});
		expect(previewLinesTrigger).toHaveClass(
			"astra-main-interface-controls-drawer__preview-lines-trigger",
		);
		const previewLinesLabel = await screen.findByText("Preview lines");
		const sortByLabel = await screen.findByText("Sort by");
		expect(
			previewLinesLabel.compareDocumentPosition(sortByLabel) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).not.toBe(0);

		const showAvatarsSwitch = screen.getByRole("switch", {
			name: "Show avatars",
		});
		const previewLinesGroup = previewLinesLabel.closest(
			".astra-main-interface-controls-drawer__group",
		);
		const avatarGroup = showAvatarsSwitch.closest(
			".astra-main-interface-controls-drawer__group",
		);
		expect(avatarGroup).toHaveClass(
			"astra-main-interface-controls-drawer__group--avatars",
		);
		expect(avatarGroup).not.toBe(previewLinesGroup);
		expect(avatarGroup?.previousElementSibling).toBe(previewLinesGroup);
		expect(showAvatarsSwitch).toHaveAttribute(
			"id",
			"astra-main-interface-controls-drawer-avatars-toggle-switch",
		);
		expect(showAvatarsSwitch).toHaveAttribute("data-size", "default");
		expect(showAvatarsSwitch).toHaveAttribute("aria-checked", "true");
		expect(
			document.getElementById(
				"astra-main-interface-controls-drawer-avatars-toggle",
			),
		).toContainElement(showAvatarsSwitch);
	});

	test("can hide previews from the controls drawer and persists the line count", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		const { container } = render(
			<AstraMainInterface chatCatalogStore={storeStub.store} />,
		);

		expect(
			container.querySelector(".astra-main-interface-chat-row__preview"),
		).toBeInTheDocument();

		openControlsDrawer();
		openDropdownTrigger("2 lines");
		fireEvent.click(
			await screen.findByRole("menuitem", {
				name: "No preview",
			}),
		);

		expect(
			container.querySelector(".astra-main-interface-chat-row__preview"),
		).not.toBeInTheDocument();
		expect(
			window.localStorage.getItem(
				CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			),
		).toBe("0");
	});

	test("can expand previews to three lines and persists the line count", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		openControlsDrawer();
		openDropdownTrigger("2 lines");
		fireEvent.click(
			await screen.findByRole("menuitem", {
				name: "3 lines",
			}),
		);

		expect(
			document.querySelector(".astra-main-interface-chat-row"),
		).toHaveAttribute("data-preview-lines", "3");
		expect(
			window.localStorage.getItem(
				CHAT_MENU_PREVIEW_LINE_COUNT_STORAGE_KEY,
			),
		).toBe("3");
	});

	test("can hide chat avatars from the controls drawer and persists the preference", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						isCurrent: true,
					} as unknown as Partial<ChatCatalogEntry>),
				],
			}),
		);
		const { container } = render(
			<AstraMainInterface chatCatalogStore={storeStub.store} />,
		);

		expect(
			container.querySelector(".astra-main-interface-chat-row__avatar"),
		).toBeInTheDocument();
		expect(
			container.querySelector(
				".astra-main-interface-chat-row__current-indicator",
			),
		).not.toBeInTheDocument();

		openControlsDrawer();
		fireEvent.click(await screen.findByText("Show avatars"));

		expect(
			container.querySelector(".astra-main-interface-chat-row__avatar"),
		).not.toBeInTheDocument();
		expect(
			container.querySelector(
				".astra-main-interface-chat-row__current-avatar-shell",
			),
		).not.toBeInTheDocument();
		expect(
			container.querySelector(
				".astra-main-interface-chat-row__current-indicator",
			),
		).not.toBeInTheDocument();
		expect(
			window.localStorage.getItem(CHAT_MENU_SHOW_AVATARS_STORAGE_KEY),
		).toBe("false");
		expect(
			screen.getByRole("switch", {
				name: "Show avatars",
			}),
		).toHaveAttribute("aria-checked", "false");
	});

	test("switches sort direction while preserving the selected field", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Zed",
						messageCount: 10,
					}),
					createEntry({
						chatId: "alpha-chat",
						entityId: "2",
						entityName: "Alpha",
						key: "character:2:alpha-chat",
						messageCount: 1,
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		openControlsDrawer();
		openDropdownTrigger("Recent");
		fireEvent.click(await screen.findByRole("menuitem", { name: "Count" }));

		let rows = getChatRowButtons();
		expect(within(rows[0]).getByText("Zed")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Ascending" }));

		rows = getChatRowButtons();
		expect(within(rows[0]).getByText("Alpha")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Ascending" })).toHaveClass(
			"astra-main-interface-controls-drawer__sort-direction-button--active",
		);
	});

	test("applies ascending count sorting from the ascending control label", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Zed",
						messageCount: 10,
					}),
					createEntry({
						chatId: "alpha-chat",
						entityId: "2",
						entityName: "Alpha",
						key: "character:2:alpha-chat",
						messageCount: 1,
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		openControlsDrawer();
		openDropdownTrigger("Recent");
		fireEvent.click(await screen.findByRole("menuitem", { name: "Count" }));
		fireEvent.click(screen.getByRole("button", { name: "Ascending" }));

		const rows = getChatRowButtons();
		expect(within(rows[0]).getByText("Alpha")).toBeInTheDocument();
		expect(within(rows[1]).getByText("Zed")).toBeInTheDocument();
	});

	test("initializes chat sorting from the persisted sort preference", () => {
		window.localStorage.setItem(
			CHAT_MENU_SORT_MODE_STORAGE_KEY,
			"entity-asc",
		);
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Zed",
						lastMessageAt: 30,
					}),
					createEntry({
						chatId: "alpha-chat",
						entityId: "2",
						entityName: "Alpha",
						key: "character:2:alpha-chat",
						lastMessageAt: 10,
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		const rows = getChatRowButtons();
		expect(within(rows[0]).getByText("Alpha")).toBeInTheDocument();
		expect(within(rows[1]).getByText("Zed")).toBeInTheDocument();
	});

	test("persists sort changes from the controls drawer", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						entityName: "Zed",
						messageCount: 10,
					}),
					createEntry({
						chatId: "alpha-chat",
						entityId: "2",
						entityName: "Alpha",
						key: "character:2:alpha-chat",
						messageCount: 1,
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		openControlsDrawer();
		openDropdownTrigger("Recent");
		fireEvent.click(await screen.findByRole("menuitem", { name: "Title" }));

		expect(
			window.localStorage.getItem(CHAT_MENU_SORT_MODE_STORAGE_KEY),
		).toBe("entity-asc");

		fireEvent.click(screen.getByRole("button", { name: "Descending" }));

		expect(
			window.localStorage.getItem(CHAT_MENU_SORT_MODE_STORAGE_KEY),
		).toBe("entity-desc");
	});

	test("renders group chat rows with collage avatars", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						avatarUrl: "/thumbs/avatar/hero.png",
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						key: "group:party:campfire",
						kind: "group",
						groupAvatarUrls: [
							"/thumbs/avatar/hero.png",
							"/thumbs/avatar/mage.png",
						],
					} as Partial<ChatCatalogEntry>),
				],
			}),
		);
		const { container } = render(
			<AstraMainInterface chatCatalogStore={storeStub.store} />,
		);
		openGlobalChatsTab();

		const avatar = container.querySelector(
			".astra-main-interface-chat-row__avatar--collage",
		);
		expect(avatar).toBeInTheDocument();
		expect(
			avatar?.querySelectorAll(
				".astra-main-interface-chat-row__avatar-collage-image",
			),
		).toHaveLength(2);
		expect(
			container.querySelector(".astra-main-interface-chat-row__badge"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Group")).not.toBeInTheDocument();
	});

	test("renders chat rows as card buttons with action affordances", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);
		openGlobalChatsTab();

		const row = screen.getByRole("button", {
			name: "Open Hero chapter-1",
		});
		expect(row.tagName).toBe("DIV");
		expect(row).toHaveAttribute("aria-disabled", "false");
		expect(row).toHaveAttribute("tabindex", "0");
		for (const selector of [
			".astra-main-interface-chat-row__body",
			".astra-main-interface-chat-row__header",
			".astra-main-interface-chat-row__header-row",
			".astra-main-interface-chat-row__name-stack",
			".astra-main-interface-chat-row__time-row",
			".astra-main-interface-chat-row__header-actions",
			".astra-main-interface-chat-row__main",
			".astra-main-interface-chat-row__footer",
			".astra-main-interface-chat-row__actions",
		]) {
			const element = row.querySelector(selector);

			expect(element, selector).toBeInTheDocument();
			expect(element?.tagName, selector).toBe("DIV");
		}

		for (const [label, iconClass] of [
			["Delete chat", ".lucide-trash-2"],
			["Edit categories", ".lucide-bookmark"],
			["Rename chat", ".lucide-pencil-line"],
		]) {
			const action = within(row).getByRole("button", { name: label });
			expect(action).toHaveClass(
				"astra-main-interface-chat-row__action-button",
			);
			expect(action.querySelector(iconClass)).toBeInTheDocument();
		}

		const categoryAction = within(row).getByRole("button", {
			name: "Edit categories",
		});
		expect(categoryAction).toHaveAttribute(
			"aria-controls",
			"astra-main-interface-chat-category-drawer",
		);
		expect(categoryAction).toHaveAttribute("aria-expanded", "false");
		expect(categoryAction).toHaveAttribute("data-state", "off");

		const menuAction = within(row).getByRole("button", {
			name: "Chat actions",
		});
		expect(menuAction).toHaveClass(
			"astra-main-interface-chat-row__action-button",
			"astra-main-interface-chat-row__action-button--menu",
		);
		expect(
			menuAction.querySelector(".lucide-ellipsis"),
		).toBeInTheDocument();
		fireEvent.click(menuAction);
		expect(openChat).not.toHaveBeenCalled();
		expect(onRequestClose).not.toHaveBeenCalled();

		expect(
			row.querySelector(".astra-main-interface-chat-row__stat-icon"),
		).toBeInTheDocument();
		expect(
			Array.from(
				row.querySelectorAll(
					".astra-main-interface-chat-row__stat-value",
				),
				(statValue) => statValue.textContent,
			),
		).toEqual(["4", "12 KB"]);
		expect(within(row).queryByText("4 messages")).not.toBeInTheDocument();

		fireEvent.click(row);

		await waitFor(() => {
			expect(onRequestClose).toHaveBeenCalledTimes(1);
		});
		expect(openChat).toHaveBeenCalledTimes(1);
	});

	test("opens a single chat actions drawer for the clicked row without opening the chat", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "chapter-1",
						entityName: "Hero",
					}),
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						groupAvatarUrls: [
							"/thumbs/avatar/hero.png",
							"/thumbs/avatar/mage.png",
						],
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});
		const exportChat = vi.fn<ExportChatCatalogEntry>().mockResolvedValue({
			fileName: "campfire.jsonl",
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				exportChat={exportChat}
				openChat={openChat}
			/>,
		);
		openGlobalChatsTab();

		const partyRow = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		fireEvent.click(
			within(partyRow).getByRole("button", {
				name: "Chat actions",
			}),
		);

		expect(openChat).not.toHaveBeenCalled();
		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		expect(drawer).toHaveClass(
			"astra-main-interface-drawer",
			"astra-main-interface-chat-row-action-dialog",
			"astra-main-interface-chat-actions-drawer",
		);
		expect(drawer).toHaveAttribute(
			"id",
			"astra-main-interface-chat-actions-drawer",
		);
		const labelledBy = drawer.getAttribute("aria-labelledby");
		const describedBy = drawer.getAttribute("aria-describedby");
		expect(labelledBy).toBeTruthy();
		expect(labelledBy).not.toBe(
			"astra-main-interface-chat-actions-drawer-title",
		);
		expect(document.getElementById(labelledBy ?? "")).toHaveClass(
			"astra-dialog-title",
		);
		expect(describedBy).toBeTruthy();
		expect(describedBy).not.toBe(
			"astra-main-interface-chat-actions-drawer-description",
		);
		expect(document.getElementById(describedBy ?? "")).toHaveClass(
			"astra-dialog-description",
		);
		expect(
			document.getElementById(
				"astra-main-interface-chat-actions-drawer-title",
			),
		).toHaveClass("astra-dialog-title");
		expect(
			document.getElementById(
				"astra-main-interface-chat-actions-drawer-description",
			),
		).toHaveClass("astra-dialog-description");
		expect(
			drawer.querySelector(".astra-dialog-header"),
		).toBeInTheDocument();
		expect(
			drawer.querySelector(".astra-dialog-heading"),
		).toBeInTheDocument();
		expect(
			drawer.querySelector(
				".astra-dialog-headingContent .astra-dialog-title",
			),
		).toHaveTextContent("Chat actions");
		expect(
			drawer.querySelector(
				".astra-dialog-headingContent .astra-dialog-description",
			),
		).toHaveTextContent(
			/Manage this chat file or export a copy of\s*campfire\./,
		);
		expect(
			document
				.getElementById(
					"astra-main-interface-chat-actions-drawer-description",
				)
				?.querySelector(".astra-dialog-current-chat-file-name"),
		).toHaveTextContent("campfire");
		expect(
			drawer.querySelector(
				".astra-dialog-icon .lucide-message-circle-more",
			),
		).toBeInTheDocument();
		expect(drawer.querySelector(".astra-dialog-body")).toBeInTheDocument();
		expect(
			drawer.querySelector(".astra-dialog-content"),
		).toBeInTheDocument();
		expect(
			drawer.querySelector(".astra-dialog-identityName"),
		).toHaveTextContent("Party");
		expect(within(drawer).getByText("campfire")).toHaveClass(
			"astra-dialog-current-chat-file-name",
		);
		expect(
			drawer.querySelector(
				".astra-main-interface-chat-actions-drawer__export-summary",
			),
		).not.toBeInTheDocument();
		const footer = drawer.querySelector(".astra-dialog-footer");
		expect(footer).toBeInTheDocument();
		expect(
			footer?.querySelector(".astra-chat-library-dialog-footer"),
		).toBeInTheDocument();
		expect(
			footer?.querySelector(".astra-chat-library-dialog-footer-actions"),
		).toBeInTheDocument();
		expect(
			within(footer as HTMLElement).getByRole("button", {
				name: "Cancel",
			}),
		).toBeEnabled();
		expect(
			within(footer as HTMLElement).getByRole("button", {
				name: "Open this chat",
			}),
		).toBeEnabled();
		expect(
			within(footer as HTMLElement)
				.getByRole("button", {
					name: "Open this chat",
				})
				.querySelector(".lucide-message-circle-more"),
		).toBeInTheDocument();
		const groups = Array.from(
			drawer.querySelectorAll(
				".astra-main-interface-chat-actions-drawer__group",
			),
		);
		expect(
			groups.map((group) =>
				group
					.querySelector(
						".astra-main-interface-chat-actions-drawer__group-label",
					)
					?.textContent?.trim(),
			),
		).toEqual(["Chat file", "Export"]);
		expect(
			within(groups[0] as HTMLElement)
				.getAllByRole("button")
				.map((button) => button.textContent),
		).toEqual(["Delete chat", "Edit categories", "Rename chat"]);
		expect(
			within(groups[1] as HTMLElement)
				.getAllByRole("button")
				.map((button) => button.textContent),
		).toEqual(["Export JSONL chat file", "Export plain text chat file"]);
		expect(
			within(drawer).getByRole("button", {
				name: "Export JSONL chat file",
			}),
		).toBeInTheDocument();
		expect(
			within(drawer).getByRole("button", {
				name: "Export plain text chat file",
			}),
		).toBeInTheDocument();
		expect(
			drawer.querySelector(
				".astra-main-interface-chat-actions-drawer__item--destructive",
			),
		).toBeInTheDocument();
		expect(
			within(groups[0] as HTMLElement)
				.getByRole("button", { name: "Delete chat" })
				.querySelector(".lucide-trash-2"),
		).toBeInTheDocument();
		expect(
			within(groups[0] as HTMLElement)
				.getByRole("button", { name: "Edit categories" })
				.querySelector(".lucide-bookmark"),
		).toBeInTheDocument();
		expect(
			within(groups[0] as HTMLElement)
				.getByRole("button", { name: "Rename chat" })
				.querySelector(".lucide-pencil-line"),
		).toBeInTheDocument();
	});

	test("closes the chat actions drawer from its footer cancel button", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		fireEvent.click(
			within(
				screen.getByRole("button", {
					name: "Open Hero chapter-1",
				}),
			).getByRole("button", {
				name: "Chat actions",
			}),
		);

		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		fireEvent.click(
			within(drawer).getByRole("button", {
				name: "Cancel",
			}),
		);

		await waitForDialogToUnmount("Chat actions");
	});

	test("opens the selected chat from the actions drawer footer with the shared open controller", async () => {
		document.body.innerHTML = `
            <div id="sheld">
                <div id="chat"></div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		let resolveOpenChat!: (
			result: Awaited<ReturnType<OpenChatCatalogEntry>>,
		) => void;
		const openChat = vi.fn<OpenChatCatalogEntry>().mockReturnValue(
			new Promise((resolve) => {
				resolveOpenChat = resolve;
			}),
		);
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);
		openGlobalChatsTab();

		fireEvent.click(
			within(
				screen.getByRole("button", {
					name: "Open Hero chapter-1",
				}),
			).getByRole("button", {
				name: "Chat actions",
			}),
		);

		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		fireEvent.click(
			within(drawer).getByRole("button", {
				name: "Open this chat",
			}),
		);

		expect(openChat).toHaveBeenCalledWith(
			expect.objectContaining({
				key: "character:0:chapter-1",
			}),
		);
		await waitForDialogToUnmount("Chat actions");
		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(
			within(sheld).getByRole("status", {
				hidden: true,
				name: "Opening chat...",
			}),
		).toBeInTheDocument();

		await act(async () => {
			resolveOpenChat({
				ok: true,
			});
		});
	});

	test("closes the panel without reopening when the actions drawer footer opens the current chat", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						isCurrent: true,
					}),
				],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);
		openGlobalChatsTab();

		fireEvent.click(
			within(
				screen.getByRole("button", {
					name: "Open Hero chapter-1",
				}),
			).getByRole("button", {
				name: "Chat actions",
			}),
		);

		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		fireEvent.click(
			within(drawer).getByRole("button", {
				name: "Open this chat",
			}),
		);

		await waitForDialogToUnmount("Chat actions");
		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(openChat).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("status", {
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
	});

	test("shows the shared inline error when opening from the actions drawer footer fails", async () => {
		document.body.innerHTML = `
            <div id="sheld">
                <div id="chat"></div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		let resolveOpenChat!: (
			result: Awaited<ReturnType<OpenChatCatalogEntry>>,
		) => void;
		const openChat = vi.fn<OpenChatCatalogEntry>().mockReturnValue(
			new Promise((resolve) => {
				resolveOpenChat = resolve;
			}),
		);
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);
		openGlobalChatsTab();

		fireEvent.click(
			within(
				screen.getByRole("button", {
					name: "Open Hero chapter-1",
				}),
			).getByRole("button", {
				name: "Chat actions",
			}),
		);

		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		fireEvent.click(
			within(drawer).getByRole("button", {
				name: "Open this chat",
			}),
		);

		await waitForDialogToUnmount("Chat actions");
		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(
			within(sheld).getByRole("status", {
				hidden: true,
				name: "Opening chat...",
			}),
		).toBeInTheDocument();

		resolveOpenChat({
			ok: false,
			reason: "open-failed",
		});

		expect(
			await screen.findByText("Failed to open chat."),
		).toBeInTheDocument();
		expect(
			within(sheld).queryByRole("status", {
				hidden: true,
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
	});

	test("opens a presentational category drawer for the clicked row without opening the chat", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						groupAvatarUrls: [
							"/thumbs/avatar/hero.png",
							"/thumbs/avatar/mage.png",
						],
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_party", "cat_global"],
		});
		categoryStoreStub.store.createCategory({
			name: "Party Plans",
			ownerId: "party",
			ownerType: "group",
			scope: "owner",
		});
		categoryStoreStub.store.createCategory({
			name: "Shared Tags",
			scope: "global",
		});
		categoryStoreStub.store.setChatCategoryIds("group:party:campfire", [
			"cat_party",
		]);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openChat={openChat}
			/>,
		);
		openGlobalChatsTab();

		const partyRow = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		const categoryAction = within(partyRow).getByRole("button", {
			name: "Edit categories",
		});
		expect(categoryAction).toHaveAttribute("aria-expanded", "false");
		expect(categoryAction).toHaveAttribute("data-state", "on");
		fireEvent.click(categoryAction);

		expect(openChat).not.toHaveBeenCalled();
		expect(categoryAction).toHaveAttribute("aria-expanded", "true");
		expect(categoryAction).toHaveAttribute("data-state", "on");
		const drawer = await screen.findByRole("dialog", {
			name: "Edit categories",
		});

		expect(drawer).toHaveAttribute(
			"id",
			"astra-main-interface-chat-category-drawer",
		);
		expect(drawer).toHaveClass(
			"astra-main-interface-drawer",
			"astra-main-interface-chat-row-action-dialog",
			"astra-main-interface-chat-category-drawer",
		);
		expect(
			drawer.querySelector(".astra-dialog-header"),
		).toBeInTheDocument();
		expect(
			drawer.querySelector(".astra-dialog-heading"),
		).toBeInTheDocument();
		expect(drawer.querySelector(".astra-dialog-body")).toBeInTheDocument();
		expect(
			drawer.querySelector(".astra-dialog-content"),
		).toBeInTheDocument();
		const footer = drawer.querySelector(".astra-dialog-footer");
		expect(footer).toBeInTheDocument();
		expect(
			footer?.querySelector(
				".astra-chat-library-dialog-footer.astra-chat-library-dialog-footer--categories",
			),
		).toBeInTheDocument();
		expect(
			within(footer as HTMLElement).getByRole("button", {
				name: "Cancel",
			}),
		).toBeEnabled();
		expect(
			within(footer as HTMLElement).getByRole("button", {
				name: "Save changes",
			}),
		).toBeDisabled();
		expect(
			drawer.querySelector(".astra-dialog-identityName"),
		).toHaveTextContent("Party");
		expect(within(drawer).getByText("campfire")).toHaveClass(
			"astra-dialog-current-chat-file-name",
		);
		expect(
			drawer.querySelector(
				".astra-chat-library-category-panel.astra-chat-library-dialog-category-panel",
			),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(".astra-chat-library-category-treeLayout"),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(
				".astra-chat-library-category-tree.astra-chat-library-global-tree",
			),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(".astra-chat-library-category-accordion"),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelectorAll(
				".astra-chat-library-category-accordionTrigger",
			),
		).toHaveLength(0);
		expect(
			drawer.querySelector(
				".astra-main-interface-chat-category-drawer__panel",
			),
		).toBeInTheDocument();
		expect(
			drawer.querySelectorAll(
				".astra-main-interface-chat-category-drawer__scope-section",
			),
		).toHaveLength(2);
		expect(
			drawer.querySelector(
				'.astra-main-interface-chat-category-drawer__scope-section[data-scope="owner"]',
			),
		).toBeInTheDocument();
		expect(
			drawer.querySelector(
				'.astra-main-interface-chat-category-drawer__scope-section[data-scope="global"]',
			),
		).toBeInTheDocument();
		expect(
			within(drawer)
				.getByText("Party Plans")
				.closest(
					".astra-main-interface-chat-category-drawer__category-row",
				),
		).toBeInTheDocument();
		expect(
			within(drawer)
				.getByText("Shared Tags")
				.closest(
					".astra-main-interface-chat-category-drawer__category-row",
				),
		).toBeInTheDocument();
		expect(
			within(drawer).queryByRole("button", {
				name: /Current Character\/Group/,
			}),
		).not.toBeInTheDocument();
		expect(
			within(drawer).queryByRole("button", { name: /Global chats/ }),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(".astra-chat-library-category-inputWrap"),
		).toBeInTheDocument();
		expect(
			drawer.querySelector(
				".astra-chat-library-category-inputWrap.astra-main-interface__search-shell",
			),
		).toBeInTheDocument();
		expect(
			drawer.querySelector(
				".astra-chat-library-category-input.astra-main-interface__search-input",
			),
		).toBeInTheDocument();
		const scopeTrigger = drawer.querySelector(
			".astra-chat-library-category-selectTrigger",
		);
		expect(scopeTrigger).toBeInTheDocument();
		expect(scopeTrigger?.tagName).toBe("BUTTON");
		expect(scopeTrigger).toBeEnabled();
		expect(scopeTrigger).toHaveAttribute(
			"aria-label",
			"Category scope: Group",
		);
		expect(scopeTrigger).toHaveAttribute("title", "Group");
		expect(
			scopeTrigger?.querySelector('[data-slot="select-value"]'),
		).not.toBeInTheDocument();
		expect(
			scopeTrigger?.querySelector(".lucide-chevron-down"),
		).not.toBeInTheDocument();
		expect(
			scopeTrigger?.querySelector(".lucide-circle-user"),
		).toBeInTheDocument();
		fireEvent.pointerDown(scopeTrigger as HTMLElement, {
			button: 0,
			ctrlKey: false,
		});
		const scopeMenu = await screen.findByRole("menu");
		const groupScopeItem = within(scopeMenu).getByRole("menuitem", {
			name: /Group/,
		});
		const globalScopeItem = within(scopeMenu).getByRole("menuitem", {
			name: /Global/,
		});
		expect(
			groupScopeItem.querySelector(".lucide-circle-user"),
		).toBeInTheDocument();
		expect(
			globalScopeItem.querySelector(".lucide-globe"),
		).toBeInTheDocument();
		fireEvent.click(groupScopeItem);
		await waitFor(() => {
			expect(drawer).not.toHaveAttribute("aria-hidden", "true");
		});
		for (const categoryItem of drawer.querySelectorAll(
			".astra-chat-library-category-accordionItem--category",
		)) {
			const categoryTitle = categoryItem.querySelector(
				".astra-chat-library-category-accordionTitle--category",
			);
			expect(
				categoryItem.querySelector(
					".astra-chat-library-category-itemActions",
				),
			).not.toBeInTheDocument();
			expect(
				categoryItem.querySelector(
					".astra-chat-library-category-chevron",
				),
			).not.toBeInTheDocument();
			expect(
				categoryItem.querySelector(
					".astra-chat-library-category-accordionTrigger",
				),
			).not.toBeInTheDocument();
			expect(
				categoryTitle?.querySelector(
					".astra-chat-library-category-accordionIconWrap",
				),
			).not.toBeInTheDocument();
			expect(
				categoryTitle?.querySelector(
					".astra-chat-library-category-checkbox",
				),
			).toBeInTheDocument();
		}
		expect(
			drawer.querySelector(".astra-chat-library-category-row--empty"),
		).not.toBeInTheDocument();
		expect(
			within(drawer).queryByText("No chats assigned yet."),
		).not.toBeInTheDocument();
		expect(
			within(drawer).getByLabelText("New category name"),
		).not.toBeDisabled();
		expect(
			within(drawer).getByRole("button", { name: "Add category" }),
		).toBeDisabled();
		expect(
			document.querySelectorAll(
				"#astra-main-interface-chat-category-drawer",
			),
		).toHaveLength(1);
	});

	test("opens category assignment from the chat actions drawer body without opening the chat", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_party"],
		});
		categoryStoreStub.store.createCategory({
			name: "Party Plans",
			ownerId: "party",
			ownerType: "group",
			scope: "owner",
		});
		categoryStoreStub.store.setChatCategoryIds("group:party:campfire", [
			"cat_party",
		]);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
				openChat={openChat}
			/>,
		);
		openGlobalChatsTab();

		const row = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		fireEvent.click(
			within(row).getByRole("button", {
				name: "Chat actions",
			}),
		);
		const actionsDrawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		const categoryAction = within(actionsDrawer).getByRole("button", {
			name: "Edit categories",
		});
		expect(categoryAction).toHaveAttribute(
			"aria-controls",
			"astra-main-interface-chat-category-drawer",
		);
		expect(categoryAction).toHaveAttribute("aria-expanded", "false");
		expect(categoryAction).toHaveAttribute("data-state", "on");

		fireEvent.click(categoryAction);

		expect(openChat).not.toHaveBeenCalled();
		const categoryDrawer = await screen.findByRole(
			"dialog",
			{
				name: "Edit categories",
			},
			{ timeout: ROW_OVERLAY_UNMOUNT_TIMEOUT_MS },
		);
		await waitForDialogToUnmount("Chat actions");
		expect(categoryDrawer).toHaveAttribute(
			"id",
			"astra-main-interface-chat-category-drawer",
		);
		expect(within(categoryDrawer).getByText("campfire")).toHaveClass(
			"astra-dialog-current-chat-file-name",
		);
		fireEvent.click(
			within(categoryDrawer).getByRole("button", {
				name: "Cancel",
			}),
		);
		await waitForDialogToUnmount("Edit categories");
		expect(
			screen.queryByRole("dialog", {
				name: "Chat actions",
			}),
		).not.toBeInTheDocument();
	});

	test("toggles category assignment scope lists while preserving the draft", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_party", "cat_global"],
		});
		categoryStoreStub.store.createCategory({
			name: "Party Plans",
			ownerId: "party",
			ownerType: "group",
			scope: "owner",
		});
		categoryStoreStub.store.createCategory({
			name: "Shared Tags",
			scope: "global",
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
			/>,
		);
		openGlobalChatsTab();

		const partyRow = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		const categoryAction = within(partyRow).getByRole("button", {
			name: "Edit categories",
		});
		fireEvent.click(categoryAction);

		const drawer = await screen.findByRole("dialog", {
			name: "Edit categories",
		});
		expect(
			within(drawer).queryByText("Category list"),
		).not.toBeInTheDocument();
		expect(
			drawer.querySelector(
				".astra-main-interface-chat-category-drawer__list-label",
			),
		).not.toBeInTheDocument();
		const ownerScopeTrigger = within(drawer).getByRole("button", {
			name: "Party (1)",
		});
		const globalScopeTrigger = within(drawer).getByRole("button", {
			name: "Global (1)",
		});
		const ownerListId = ownerScopeTrigger.getAttribute("aria-controls");
		const globalListId = globalScopeTrigger.getAttribute("aria-controls");

		expect(ownerScopeTrigger).toHaveClass(
			"astra-main-interface-chat-category-drawer__scope-header",
		);
		expect(ownerScopeTrigger).toHaveAttribute("aria-expanded", "true");
		expect(ownerScopeTrigger).toHaveAttribute("data-state", "open");
		expect(globalScopeTrigger).toHaveAttribute("aria-expanded", "true");
		expect(globalScopeTrigger).toHaveAttribute("data-state", "open");
		expect(ownerListId).toBeTruthy();
		expect(globalListId).toBeTruthy();
		expect(ownerListId).not.toBe(globalListId);

		const ownerList = document.getElementById(ownerListId as string);
		const globalList = document.getElementById(globalListId as string);
		expect(ownerList).not.toHaveAttribute("hidden");
		expect(globalList).not.toHaveAttribute("hidden");
		expect(
			ownerScopeTrigger.querySelector(
				".astra-main-interface-chat-category-drawer__scope-label",
			)?.nextElementSibling,
		).toHaveClass("astra-main-interface-chat-category-drawer__scope-count");
		expect(
			globalScopeTrigger.querySelector(
				".astra-chat-library-category-chevron",
			),
		).toBeInTheDocument();

		const globalCheckbox = within(drawer).getByRole("checkbox", {
			name: "Shared Tags",
		});
		fireEvent.click(globalCheckbox);
		expect(globalCheckbox).toBeChecked();

		fireEvent.click(globalScopeTrigger);

		expect(globalScopeTrigger).toHaveAttribute("aria-expanded", "false");
		expect(globalScopeTrigger).toHaveAttribute("data-state", "closed");
		expect(globalList).toHaveAttribute("hidden");
		expect(ownerScopeTrigger).toHaveAttribute("aria-expanded", "true");
		expect(ownerList).not.toHaveAttribute("hidden");

		fireEvent.click(globalScopeTrigger);

		expect(globalScopeTrigger).toHaveAttribute("aria-expanded", "true");
		expect(globalList).not.toHaveAttribute("hidden");
		expect(globalCheckbox).toBeChecked();

		fireEvent.click(globalScopeTrigger);
		fireEvent.click(
			within(drawer).getByRole("button", {
				name: "Cancel",
			}),
		);
		await waitFor(() => {
			expect(categoryAction).toHaveAttribute("aria-expanded", "false");
		});

		fireEvent.click(categoryAction);

		const reopenedDrawer = await screen.findByRole("dialog", {
			name: "Edit categories",
		});
		expect(
			within(reopenedDrawer).getByRole("button", {
				name: "Global (1)",
			}),
		).toHaveAttribute("aria-expanded", "true");
	});

	test("opens queued row overlays from the actions drawer in FIFO order", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		const row = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		fireEvent.click(
			within(row).getByRole("button", {
				name: "Chat actions",
			}),
		);
		const actionsDrawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		const categoryAction = within(actionsDrawer).getByRole("button", {
			name: "Edit categories",
		});
		const deleteAction = within(actionsDrawer).getByRole("button", {
			name: "Delete chat",
		});

		fireEvent.click(categoryAction);
		fireEvent.click(deleteAction);

		const categoryDrawer = await screen.findByRole(
			"dialog",
			{
				name: "Edit categories",
			},
			{ timeout: ROW_OVERLAY_UNMOUNT_TIMEOUT_MS },
		);
		expect(
			screen.queryByRole("dialog", {
				name: "Delete chat",
			}),
		).not.toBeInTheDocument();
		fireEvent.click(
			within(categoryDrawer).getByRole("button", {
				name: "Cancel",
			}),
		);

		const deleteDialog = await screen.findByRole(
			"dialog",
			{
				name: "Delete chat",
			},
			{ timeout: ROW_OVERLAY_UNMOUNT_TIMEOUT_MS },
		);
		expect(within(deleteDialog).getByText("campfire")).toBeInTheDocument();
	});

	test("opens delete confirmation from the chat actions drawer body without opening the chat", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
			/>,
		);
		openGlobalChatsTab();

		const row = screen.getByRole("button", {
			name: "Open Hero chapter-1",
		});
		fireEvent.click(
			within(row).getByRole("button", {
				name: "Chat actions",
			}),
		);
		const actionsDrawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});

		fireEvent.click(
			within(actionsDrawer).getByRole("button", {
				name: "Delete chat",
			}),
		);

		expect(openChat).not.toHaveBeenCalled();
		const deleteDialog = await screen.findByRole("dialog", {
			name: "Delete chat",
		});
		await waitForDialogToUnmount("Chat actions");
		expect(deleteDialog).toHaveAttribute(
			"id",
			"astra-main-interface-chat-row-action-dialog",
		);
		expect(within(deleteDialog).getByText("chapter-1")).toBeInTheDocument();
		fireEvent.click(
			within(deleteDialog).getByRole("button", {
				name: "Cancel",
			}),
		);
		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", {
					name: "Delete chat",
				}),
			).not.toBeInTheDocument();
		});
		expect(
			screen.queryByRole("dialog", {
				name: "Chat actions",
			}),
		).not.toBeInTheDocument();
	});

	test("opens rename from the chat actions drawer body without opening the chat", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
			/>,
		);
		openGlobalChatsTab();

		const row = screen.getByRole("button", {
			name: "Open Hero chapter-1",
		});
		fireEvent.click(
			within(row).getByRole("button", {
				name: "Chat actions",
			}),
		);
		const actionsDrawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});

		fireEvent.click(
			within(actionsDrawer).getByRole("button", {
				name: "Rename chat",
			}),
		);

		expect(openChat).not.toHaveBeenCalled();
		const renameDialog = await screen.findByRole("dialog", {
			name: "Rename chat",
		});
		await waitForDialogToUnmount("Chat actions");
		expect(renameDialog).toHaveAttribute(
			"id",
			"astra-main-interface-chat-row-action-dialog",
		);
		expect(
			within(renameDialog).getByRole("textbox", {
				name: "New chat name",
			}),
		).toHaveValue("chapter-1");
		fireEvent.click(
			within(renameDialog).getByRole("button", {
				name: "Cancel",
			}),
		);
		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", {
					name: "Rename chat",
				}),
			).not.toBeInTheDocument();
		});
		expect(
			screen.queryByRole("dialog", {
				name: "Chat actions",
			}),
		).not.toBeInTheDocument();
	});

	test("creates owner and global categories from the category drawer scope select", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);
		const categoryStoreStub = createSeededChatCategoryStore({
			ids: ["cat_drawer_owner", "cat_drawer_global"],
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				chatCategoryStore={categoryStoreStub.store}
			/>,
		);
		openGlobalChatsTab();

		const partyRow = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		fireEvent.click(
			within(partyRow).getByRole("button", {
				name: "Edit categories",
			}),
		);

		const drawer = await screen.findByRole("dialog", {
			name: "Edit categories",
		});
		const scopeTrigger = within(drawer).getByRole("button", {
			name: "Category scope: Group",
		});
		const categoryInput =
			within(drawer).getByLabelText("New category name");
		const addButton = within(drawer).getByRole("button", {
			name: "Add category",
		});

		expect(scopeTrigger).toHaveAttribute("title", "Group");
		expect(
			scopeTrigger.querySelector('[data-slot="select-value"]'),
		).not.toBeInTheDocument();
		expect(
			scopeTrigger.querySelector(".lucide-chevron-down"),
		).not.toBeInTheDocument();
		expect(
			scopeTrigger.querySelector(".lucide-circle-user"),
		).toBeInTheDocument();
		fireEvent.input(categoryInput, {
			target: {
				value: "Party Plans",
			},
		});
		fireEvent.click(addButton);

		expect(
			within(drawer).queryByText("Choose a valid category scope."),
		).not.toBeInTheDocument();
		expect(
			within(drawer)
				.getByText("Party Plans")
				.closest(
					".astra-main-interface-chat-category-drawer__category-row",
				),
		).toBeInTheDocument();
		expect(within(drawer).getByText("Party Plans")).toBeInTheDocument();
		expect(
			categoryStoreStub.store.getVisibleCategories({
				ownerId: "party",
				ownerType: "group",
				scope: "owner",
			}).owner,
		).toEqual([
			expect.objectContaining({
				id: "cat_drawer_owner",
				name: "Party Plans",
				scope: "owner",
			}),
		]);

		fireEvent.pointerDown(scopeTrigger, {
			button: 0,
			ctrlKey: false,
		});
		const globalScopeItem = await screen.findByRole("menuitem", {
			name: /Global/,
		});
		expect(
			globalScopeItem.querySelector(".lucide-globe"),
		).toBeInTheDocument();
		fireEvent.click(globalScopeItem);
		expect(scopeTrigger).toHaveAttribute(
			"aria-label",
			"Category scope: Global",
		);
		expect(scopeTrigger).toHaveAttribute("title", "Global");
		expect(scopeTrigger.querySelector(".lucide-globe")).toBeInTheDocument();
		fireEvent.input(categoryInput, {
			target: {
				value: "Shared Tags",
			},
		});
		fireEvent.click(addButton);

		expect(
			within(drawer).queryByText("Choose a valid category scope."),
		).not.toBeInTheDocument();
		expect(
			within(drawer)
				.getByText("Shared Tags")
				.closest(
					".astra-main-interface-chat-category-drawer__category-row",
				),
		).toBeInTheDocument();
		expect(within(drawer).getByText("Shared Tags")).toBeInTheDocument();
		expect(categoryStoreStub.store.getVisibleCategories().global).toEqual([
			expect.objectContaining({
				id: "cat_drawer_global",
				name: "Shared Tags",
				scope: "global",
			}),
		]);
	});

	test("category drawer renders grouped checklist sections without tree actions", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		const partyRow = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		const categoryAction = within(partyRow).getByRole("button", {
			name: "Edit categories",
		});

		fireEvent.click(categoryAction);

		const drawer = await screen.findByRole("dialog", {
			name: "Edit categories",
		});
		const scrollRoot = drawer.querySelector(
			".astra-dialog-body__scroll-root",
		);

		expect(scrollRoot).toBeInTheDocument();
		if (!(scrollRoot instanceof HTMLElement)) {
			throw new Error("Expected category drawer scroll root");
		}

		expect(
			within(scrollRoot).queryByRole("button", {
				name: "Expand all global categories",
			}),
		).not.toBeInTheDocument();
		expect(
			within(scrollRoot).queryByRole("button", {
				name: "Collapse all global categories",
			}),
		).not.toBeInTheDocument();
		expect(
			scrollRoot.querySelector(
				".astra-main-interface-chat-category-drawer__assignment-list",
			),
		).toBeInTheDocument();
		expect(
			scrollRoot.querySelector(
				'.astra-main-interface-chat-category-drawer__scope-section[data-scope="owner"]',
			),
		).toBeInTheDocument();
		expect(
			scrollRoot.querySelector(
				'.astra-main-interface-chat-category-drawer__scope-section[data-scope="global"]',
			),
		).toBeInTheDocument();
		expect(
			within(scrollRoot).getAllByText("No categories available yet."),
		).toHaveLength(2);
	});

	test("renders group chat actions drawer with member collage avatars", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						avatarUrl: "/thumbs/avatar/hero.png",
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						groupAvatarUrls: [
							"/thumbs/avatar/hero.png",
							"/thumbs/avatar/mage.png",
						],
						key: "group:party:campfire",
						kind: "group",
					} as Partial<ChatCatalogEntry>),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		const partyRow = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		fireEvent.click(
			within(partyRow).getByRole("button", {
				name: "Chat actions",
			}),
		);

		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		const collage = drawer.querySelector(".astra-chat-avatar--collage");

		expect(collage).toBeInTheDocument();
		expect(collage).toHaveAttribute("data-count", "2");
		expect(
			collage?.querySelectorAll(".astra-chat-avatar__collage-image"),
		).toHaveLength(2);
		expect(
			Array.from(
				collage?.querySelectorAll(
					".astra-chat-avatar__collage-image",
				) ?? [],
			).map((image) => image.getAttribute("src")),
		).toEqual(["/thumbs/avatar/hero.png", "/thumbs/avatar/mage.png"]);
	});

	test("exports JSONL from the drawer, disables actions while exporting, and keeps retained content for the exit animation", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						avatarUrl: "/thumbs/avatar/hero.png",
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						groupAvatarUrls: [
							"/thumbs/avatar/hero.png",
							"/thumbs/avatar/mage.png",
						],
						key: "group:party:campfire",
						kind: "group",
					} as Partial<ChatCatalogEntry>),
				],
			}),
		);
		const deferred =
			createDeferred<Awaited<ReturnType<ExportChatCatalogEntry>>>();
		const exportChat = vi.fn<ExportChatCatalogEntry>(
			() => deferred.promise,
		);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				exportChat={exportChat}
			/>,
		);
		openGlobalChatsTab();

		const row = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		fireEvent.click(
			within(row).getByRole("button", {
				name: "Chat actions",
			}),
		);
		const drawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		const jsonlAction = within(drawer).getByRole("button", {
			name: "Export JSONL chat file",
		});

		vi.useFakeTimers();
		fireEvent.click(jsonlAction);

		expect(exportChat).toHaveBeenCalledWith(
			expect.objectContaining({
				chatId: "campfire",
			}),
			"jsonl",
		);
		expect(jsonlAction).toBeDisabled();
		expect(
			within(drawer).getByRole("button", {
				name: "Export plain text chat file",
			}),
		).toBeDisabled();

		deferred.resolve({
			fileName: "campfire.jsonl",
			ok: true,
		});

		await act(async () => {
			await Promise.resolve();
		});

		const closingDrawer = document.getElementById(
			"astra-main-interface-chat-actions-drawer",
		);
		expect(closingDrawer).toBeInTheDocument();
		expect(closingDrawer).toHaveAttribute("data-state", "closed");
		if (!closingDrawer) {
			throw new Error("Expected chat actions drawer to remain mounted");
		}

		expect(within(closingDrawer).getByText("campfire")).toBeInTheDocument();
		const retainedCollage = closingDrawer.querySelector(
			".astra-chat-avatar--collage",
		);
		expect(retainedCollage).toBeInTheDocument();
		expect(retainedCollage).toHaveAttribute("data-count", "2");

		act(() => {
			vi.advanceTimersByTime(499);
		});
		expect(
			document.getElementById("astra-main-interface-chat-actions-drawer"),
		).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(
			document.getElementById("astra-main-interface-chat-actions-drawer"),
		).not.toBeInTheDocument();
	});

	test("ignores stale export completion after switching the active actions drawer row", async () => {
		const successToast = vi.fn();
		(
			globalThis as { toastr?: { success?: (message: string) => void } }
		).toastr = {
			success: successToast,
		};
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "chapter-1",
						entityName: "Hero",
					}),
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);
		const deferred =
			createDeferred<Awaited<ReturnType<ExportChatCatalogEntry>>>();
		const exportChat = vi.fn<ExportChatCatalogEntry>(
			() => deferred.promise,
		);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				exportChat={exportChat}
			/>,
		);
		openGlobalChatsTab();

		const heroRow = screen.getByRole("button", {
			name: "Open Hero chapter-1",
		});
		fireEvent.click(
			within(heroRow).getByRole("button", {
				name: "Chat actions",
			}),
		);
		const firstDrawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		fireEvent.click(
			within(firstDrawer).getByRole("button", {
				name: "Export JSONL chat file",
			}),
		);

		const partyRow = within(getGlobalChatsPanel()).getByRole("button", {
			hidden: true,
			name: "Open Party campfire",
		});
		fireEvent.click(
			within(partyRow).getByRole("button", {
				hidden: true,
				name: "Chat actions",
			}),
		);
		const secondDrawer = await screen.findByRole("dialog", {
			name: "Chat actions",
		});
		await waitFor(() => {
			expect(
				within(secondDrawer).getByText("campfire"),
			).toBeInTheDocument();
		});

		deferred.resolve({
			fileName: "chapter-1.jsonl",
			ok: true,
		});
		await act(async () => {
			await Promise.resolve();
		});

		expect(successToast).not.toHaveBeenCalled();
		expect(
			screen.getByRole("dialog", {
				name: "Chat actions",
			}),
		).not.toHaveAttribute("data-state", "closed");
		expect(within(secondDrawer).getByText("campfire")).toBeInTheDocument();
	});

	test("exports plain text from the drawer for the active row", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		const exportChat = vi.fn<ExportChatCatalogEntry>().mockResolvedValue({
			fileName: "chapter-1.txt",
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				exportChat={exportChat}
			/>,
		);
		openGlobalChatsTab();

		fireEvent.click(
			screen.getByRole("button", {
				name: "Chat actions",
			}),
		);
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Export plain text chat file",
			}),
		);

		await waitFor(() => {
			expect(exportChat).toHaveBeenCalledWith(
				expect.objectContaining({
					chatId: "chapter-1",
				}),
				"txt",
			);
		});
	});

	test("opens rename for the selected row, confirms through the injected action, refreshes, and closes", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "chapter-1",
						entityName: "Hero",
					}),
					createEntry({
						chatId: "campfire",
						entityId: "party",
						entityName: "Party",
						groupAvatarUrls: [
							"/thumbs/avatar/hero.png",
							"/thumbs/avatar/mage.png",
						],
						key: "group:party:campfire",
						kind: "group",
					}),
				],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});
		const renameChat = vi.fn<RenameChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
				renameChat={renameChat}
			/>,
		);
		openGlobalChatsTab();

		const partyRow = screen.getByRole("button", {
			name: "Open Party campfire",
		});
		fireEvent.click(
			within(partyRow).getByRole("button", {
				name: "Rename chat",
			}),
		);

		expect(openChat).not.toHaveBeenCalled();
		const dialog = await screen.findByRole("dialog", {
			name: "Rename chat",
		});
		expect(dialog).toHaveClass("astra-main-interface-drawer");
		expect(within(dialog).getByText("campfire")).toBeInTheDocument();
		const collage = dialog.querySelector(
			".astra-dialog-identityImage.astra-chat-avatar--collage",
		);
		expect(collage).toBeInTheDocument();
		expect(collage).toHaveAttribute("data-count", "2");
		expect(
			Array.from(
				collage?.querySelectorAll(
					".astra-chat-avatar__collage-image",
				) ?? [],
			).map((image) => image.getAttribute("src")),
		).toEqual(["/thumbs/avatar/hero.png", "/thumbs/avatar/mage.png"]);

		const input = within(dialog).getByRole("textbox", {
			name: "New chat name",
		});
		fireEvent.change(input, {
			target: {
				value: "campfire-2",
			},
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Rename chat",
			}),
		);

		await waitFor(() => {
			expect(renameChat).toHaveBeenCalledWith(
				expect.objectContaining({
					chatId: "campfire",
					kind: "group",
				}),
				"campfire-2",
			);
		});
		expect(storeStub.store.refresh).toHaveBeenCalledTimes(1);
		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", {
					name: "Rename chat",
				}),
			).not.toBeInTheDocument();
		});
	});

	test("opens delete for the selected row, confirms through the injected action, refreshes, and closes", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});
		const deleteChat = vi.fn<DeleteChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				deleteChat={deleteChat}
				openChat={openChat}
			/>,
		);
		openGlobalChatsTab();

		const row = screen.getByRole("button", {
			name: "Open Hero chapter-1",
		});
		fireEvent.click(
			within(row).getByRole("button", {
				name: "Delete chat",
			}),
		);

		expect(openChat).not.toHaveBeenCalled();
		const dialog = await screen.findByRole("dialog", {
			name: "Delete chat",
		});
		expect(within(dialog).getByText("chapter-1")).toBeInTheDocument();
		const meta = dialog.querySelector(".astra-chat-library-dialog-meta");
		const metaPanel = meta as HTMLElement;
		expect(meta).toBeInTheDocument();
		expect(within(metaPanel).getByText("Last updated")).toBeInTheDocument();
		expect(
			within(metaPanel).getByText("2026/05/01 10:00 AM"),
		).toBeInTheDocument();
		expect(within(metaPanel).getByText("Last message")).toBeInTheDocument();
		expect(within(metaPanel).getByText("Hero preview")).toBeInTheDocument();
		expect(
			within(metaPanel).queryByText("File size"),
		).not.toBeInTheDocument();
		expect(
			within(metaPanel).queryByText("No preview"),
		).not.toBeInTheDocument();

		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Delete chat",
			}),
		);

		await waitFor(() => {
			expect(deleteChat).toHaveBeenCalledWith(
				expect.objectContaining({
					chatId: "chapter-1",
				}),
			);
		});
		expect(storeStub.store.refresh).toHaveBeenCalledTimes(1);
		await waitFor(() => {
			expect(
				screen.queryByRole("dialog", {
					name: "Delete chat",
				}),
			).not.toBeInTheDocument();
		});
	});

	test("uses the last message label for empty row action delete previews", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						lastMessageLabel: "",
						lastMessagePreview: "",
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		const row = screen.getByRole("button", {
			name: "Open Hero chapter-1",
		});
		fireEvent.click(
			within(row).getByRole("button", {
				name: "Delete chat",
			}),
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Delete chat",
		});
		const meta = dialog.querySelector(".astra-chat-library-dialog-meta");
		const metaPanel = meta as HTMLElement;

		expect(meta).toBeInTheDocument();
		expect(within(metaPanel).getByText("Last updated")).toBeInTheDocument();
		expect(within(metaPanel).getByText("Unknown date")).toBeInTheDocument();
		expect(within(metaPanel).getByText("Last message")).toBeInTheDocument();
		expect(within(metaPanel).getByText("-")).toBeInTheDocument();
		expect(
			within(metaPanel).queryByText("No preview"),
		).not.toBeInTheDocument();
	});

	test("keeps the row action dialog open and shows an error toast when rename fails", async () => {
		const errorToast = vi.fn();
		(
			globalThis as { toastr?: { error?: (message: string) => void } }
		).toastr = {
			error: errorToast,
		};
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		const renameChat = vi.fn<RenameChatCatalogEntry>().mockResolvedValue({
			ok: false,
			reason: "rename-failed",
		});

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				renameChat={renameChat}
			/>,
		);
		openGlobalChatsTab();

		const row = screen.getByRole("button", {
			name: "Open Hero chapter-1",
		});
		fireEvent.click(
			within(row).getByRole("button", {
				name: "Rename chat",
			}),
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Rename chat",
		});
		fireEvent.change(
			within(dialog).getByRole("textbox", {
				name: "New chat name",
			}),
			{
				target: {
					value: "chapter-2",
				},
			},
		);
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Rename chat",
			}),
		);

		await waitFor(() => {
			expect(errorToast).toHaveBeenCalledWith("Failed to rename chat.");
		});
		expect(storeStub.store.refresh).not.toHaveBeenCalled();
		expect(
			screen.getByRole("dialog", {
				name: "Rename chat",
			}),
		).toBeInTheDocument();
	});

	test("marks the current chat row for stronger visual emphasis", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "current-chat",
						isCurrent: true,
					} as unknown as Partial<ChatCatalogEntry>),
					createEntry({
						chatId: "other-chat",
					}),
				],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		const currentRow = screen.getByRole("button", {
			name: "Open Hero current-chat",
		});
		const otherRow = screen.getByRole("button", {
			name: "Open Hero other-chat",
		});

		expect(currentRow).toHaveAttribute("aria-current", "true");
		expect(otherRow).not.toHaveAttribute("aria-current");
		expect(
			currentRow.querySelector(".astra-main-interface-chat-row__body"),
		).toHaveClass("astra-main-interface-chat-row__body--current");
		expect(
			otherRow.querySelector(".astra-main-interface-chat-row__body"),
		).not.toHaveClass("astra-main-interface-chat-row__body--current");
		expect(
			currentRow.querySelector(
				".astra-main-interface-chat-row__current-indicator",
			),
		).not.toBeInTheDocument();
		expect(
			otherRow.querySelector(
				".astra-main-interface-chat-row__current-indicator",
			),
		).not.toBeInTheDocument();
		expect(
			currentRow.querySelector(
				".astra-main-interface-chat-row__current-avatar-shell",
			),
		).toBeInTheDocument();
		expect(
			currentRow.querySelector(
				".astra-main-interface-chat-row__avatar-status",
			),
		).toBeInTheDocument();
		expect(
			otherRow.querySelector(
				".astra-main-interface-chat-row__current-avatar-shell",
			),
		).not.toBeInTheDocument();
		expect(
			otherRow.querySelector(
				".astra-main-interface-chat-row__avatar-status",
			),
		).not.toBeInTheDocument();
	});

	test("renders global chats incrementally with a manual fallback", () => {
		const entries = Array.from({ length: 55 }, (_, index) =>
			createEntry({
				chatId: `chat-${index}`,
				entityId: String(index),
				entityName: `Hero ${index}`,
				key: `character:${index}:chat-${index}`,
			}),
		);
		const storeStub = createStoreStub(
			createSnapshot({
				entries,
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(
			50,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Load more chats",
			}),
		);

		expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(
			55,
		);
	});

	test("prefetches additional global rows before the sentinel reaches the viewport", () => {
		const observerOptions: IntersectionObserverInit[] = [];
		class IntersectionObserverMock {
			disconnect = vi.fn();
			observe = vi.fn();
			takeRecords = vi.fn(() => []);
			unobserve = vi.fn();

			constructor(
				_callback: IntersectionObserverCallback,
				options?: IntersectionObserverInit,
			) {
				observerOptions.push(options ?? {});
			}
		}
		vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
		const entries = Array.from({ length: 55 }, (_, index) =>
			createEntry({
				chatId: `chat-${index}`,
				entityId: String(index),
				entityName: `Hero ${index}`,
				key: `character:${index}:chat-${index}`,
			}),
		);
		const storeStub = createStoreStub(
			createSnapshot({
				entries,
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);
		openGlobalChatsTab();

		expect(observerOptions).toContainEqual(
			expect.objectContaining({
				rootMargin: "400px",
			}),
		);
	});

	test("refreshes the store from the controls drawer after starting the exit lifecycle", () => {
		vi.useFakeTimers();
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		openControlsDrawer();

		fireEvent.click(
			screen.getByRole("button", {
				name: "Reload chat menu",
			}),
		);

		expect(storeStub.store.refresh).toHaveBeenCalledTimes(1);
		expect(
			document.getElementById("astra-main-interface-controls-drawer"),
		).toHaveAttribute("data-state", "closed");

		act(() => {
			vi.advanceTimersByTime(650);
		});
		expect(
			screen.queryByRole("dialog", {
				name: "Chat menu controls",
			}),
		).not.toBeInTheDocument();
	});

	test("keeps refresh disabled while loading without blocking sort controls", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
				status: "loading",
			}),
		);

		render(<AstraMainInterface chatCatalogStore={storeStub.store} />);

		openControlsDrawer();

		expect(
			await screen.findByRole("button", {
				name: "Recent",
			}),
		).toBeEnabled();

		expect(
			await screen.findByRole("button", {
				name: "Reload chat menu",
			}),
		).toBeDisabled();
	});

	test("starts a chat-session shell loading overlay and closes the panel while a non-current row opens", async () => {
		document.body.innerHTML = `
            <div id="astra-chat-session-shell">
                <div id="astra-chat-top-bar-host"></div>
                <div id="sheld">
                    <div id="chat"></div>
                </div>
            </div>
        `;
		const shell = document.getElementById(
			"astra-chat-session-shell",
		) as HTMLElement;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		let resolveOpenChat!: (
			result: Awaited<ReturnType<OpenChatCatalogEntry>>,
		) => void;
		const openChat = vi.fn<OpenChatCatalogEntry>().mockReturnValue(
			new Promise((resolve) => {
				resolveOpenChat = resolve;
			}),
		);
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Hero chapter-1",
			}),
		);

		const overlay = within(shell).getByRole("status", {
			name: "Opening chat...",
		});
		expect(overlay).toHaveClass("astra-chat-switch-loading-overlay");
		expect(overlay.parentElement).toBe(shell);
		expect(sheld).not.toContainElement(overlay);
		expect(
			overlay.querySelector(".astra-chat-switch-loading-overlay__text"),
		).toHaveTextContent("Opening chat...");
		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(openChat).toHaveBeenCalledWith(
			expect.objectContaining({
				key: "character:0:chapter-1",
			}),
		);
		expect(
			screen.getByRole("button", {
				name: "Open Hero chapter-1",
			}),
		).toHaveAttribute("aria-disabled", "true");

		await act(async () => {
			resolveOpenChat({
				ok: true,
			});
		});
		expect(
			within(shell).getByRole("status", {
				name: "Opening chat...",
			}),
		).toBeInTheDocument();
		expect(openChat).toHaveBeenCalledTimes(1);
	});

	test("removes the chat-session shell loading overlay and shows an inline error when chat opening fails while mounted", async () => {
		document.body.innerHTML = `
            <div id="astra-chat-session-shell">
                <div id="astra-chat-top-bar-host"></div>
                <div id="sheld">
                    <div id="chat"></div>
                </div>
            </div>
        `;
		const shell = document.getElementById(
			"astra-chat-session-shell",
		) as HTMLElement;
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [createEntry()],
			}),
		);
		let resolveOpenChat!: (
			result: Awaited<ReturnType<OpenChatCatalogEntry>>,
		) => void;
		const openChat = vi.fn<OpenChatCatalogEntry>().mockReturnValue(
			new Promise((resolve) => {
				resolveOpenChat = resolve;
			}),
		);
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Hero chapter-1",
			}),
		);

		expect(
			within(shell).getByRole("status", {
				name: "Opening chat...",
			}),
		).toBeInTheDocument();
		expect(onRequestClose).toHaveBeenCalledTimes(1);

		resolveOpenChat({
			ok: false,
			reason: "open-failed",
		});

		expect(
			await screen.findByText("Failed to open chat."),
		).toBeInTheDocument();
		expect(
			within(shell).queryByRole("status", {
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
	});

	test("closes immediately without opening when the selected row is already current", () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						isCurrent: true,
					}),
				],
			}),
		);
		const openChat = vi.fn<OpenChatCatalogEntry>().mockResolvedValue({
			ok: true,
		});
		const onRequestClose = vi.fn();

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
				onRequestClose={onRequestClose}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Hero chapter-1",
			}),
		);

		expect(onRequestClose).toHaveBeenCalledTimes(1);
		expect(openChat).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("status", {
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
	});

	test("disables all chat rows while one row is opening", async () => {
		const storeStub = createStoreStub(
			createSnapshot({
				entries: [
					createEntry({
						chatId: "chapter-1",
					}),
					createEntry({
						chatId: "chapter-2",
						key: "character:0:chapter-2",
					}),
				],
			}),
		);
		let resolveOpenChat!: (
			result: Awaited<ReturnType<OpenChatCatalogEntry>>,
		) => void;
		const openChat = vi.fn<OpenChatCatalogEntry>().mockReturnValue(
			new Promise((resolve) => {
				resolveOpenChat = resolve;
			}),
		);

		render(
			<AstraMainInterface
				chatCatalogStore={storeStub.store}
				openChat={openChat}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Hero chapter-1",
			}),
		);

		await waitFor(() => {
			expect(
				screen.getByRole("button", {
					name: "Open Hero chapter-1",
				}),
			).toHaveAttribute("aria-disabled", "true");
			expect(
				screen.getByRole("button", {
					name: "Open Hero chapter-2",
				}),
			).toHaveAttribute("aria-disabled", "true");
		});

		fireEvent.click(
			screen.getByRole("button", {
				name: "Open Hero chapter-2",
			}),
		);
		expect(openChat).toHaveBeenCalledTimes(1);

		resolveOpenChat({
			ok: true,
		});
	});
});
