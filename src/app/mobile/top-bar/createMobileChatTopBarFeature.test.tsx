import {
	act,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import {
	createMobileChatTopBarFeature,
	ASTRA_MAIN_INTERFACE_SECONDARY_TABS_LIST_FRAME_ID,
	ASTRA_CHAT_TOP_BAR_HOST_ID,
	ASTRA_CHAT_SESSION_SHELL_ID,
} from "@/app/mobile/top-bar/createMobileChatTopBarFeature";

function createIdentitySnapshot(
	overrides: Partial<CurrentChatIdentitySnapshot> = {},
): CurrentChatIdentitySnapshot {
	return {
		avatarSource: "character-thumbnail",
		characterId: 0,
		chatFileName: "chapter-1",
		entityName: "Hero",
		groupAvatarUrls: [],
		groupId: null,
		hasActiveChat: true,
		kind: "character",
		thumbnailUrl: "/thumbs/avatar/hero.png",
		updatedAt: 0,
		...overrides,
	};
}

function createIdentityStoreStub(
	initialSnapshot: CurrentChatIdentitySnapshot = createIdentitySnapshot(),
) {
	let snapshot = initialSnapshot;
	const listeners = new Set<() => void>();
	const store = {
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
	const factory = vi.fn(() => store);

	return {
		dispatch(nextSnapshot: CurrentChatIdentitySnapshot) {
			snapshot = nextSnapshot;
			listeners.forEach((listener) => listener());
		},
		factory,
		store,
	};
}

function createJsonResponse(payload: unknown, ok = true): Response {
	return {
		json: vi.fn().mockResolvedValue(payload),
		ok,
		status: ok ? 200 : 500,
		statusText: ok ? "OK" : "Server Error",
	} as unknown as Response;
}

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("createMobileChatTopBarFeature", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		localStorage.clear();
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
		vi.unstubAllGlobals();
	});

	test("wraps #sheld with an Astra-owned shell and restores the original position on unmount", () => {
		document.body.innerHTML = `
            <div id="before"></div>
            <div id="sheld"><div id="chat"></div></div>
            <div id="after"></div>
        `;
		const store = createIdentityStoreStub();
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
		});

		const shell = document.getElementById(ASTRA_CHAT_SESSION_SHELL_ID);
		const topBarHost = document.getElementById(ASTRA_CHAT_TOP_BAR_HOST_ID);
		const sheld = document.getElementById("sheld");

		expect(shell?.parentElement).toBe(document.body);
		expect(shell?.previousElementSibling?.id).toBe("before");
		expect(shell?.nextElementSibling?.id).toBe("after");
		expect(shell?.children[0]).toBe(topBarHost);
		expect(shell?.children[1]).toBe(sheld);
		expect(topBarHost?.parentElement).toBe(shell);

		act(() => {
			feature.unmount();
		});

		expect(document.getElementById(ASTRA_CHAT_SESSION_SHELL_ID)).toBeNull();
		expect([...document.body.children].map((child) => child.id)).toEqual([
			"before",
			"sheld",
			"after",
		]);
		expect(store.store.dispose).toHaveBeenCalledTimes(1);
	});

	test("keeps mount and unmount idempotent", () => {
		document.body.innerHTML = '<div id="sheld"></div>';
		const store = createIdentityStoreStub();
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
			feature.mount();
		});

		expect(
			document.querySelectorAll(`#${ASTRA_CHAT_SESSION_SHELL_ID}`),
		).toHaveLength(1);
		expect(store.factory).toHaveBeenCalledTimes(1);

		act(() => {
			feature.unmount();
			feature.unmount();
		});

		expect(document.getElementById(ASTRA_CHAT_SESSION_SHELL_ID)).toBeNull();
		expect(store.store.dispose).toHaveBeenCalledTimes(1);
	});

	test("no-ops cleanly when #sheld is absent", () => {
		const store = createIdentityStoreStub();
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
		});

		expect(document.getElementById(ASTRA_CHAT_SESSION_SHELL_ID)).toBeNull();
		expect(store.factory).not.toHaveBeenCalled();

		act(() => {
			feature.dispose();
		});
	});

	test("shares first-open catalog data and activates a favorite before rebinding the open panel to Current", async () => {
		document.body.innerHTML = '<div id="sheld"></div>';
		const store = createIdentityStoreStub();
		const characters = [
			{
				avatar: "hero.png",
				chat: "chapter-1",
				fav: true,
				name: "Hero",
			},
			{
				avatar: "mage.png",
				chat: "mage-home",
				fav: true,
				name: "Mage",
			},
		];
		const context: Record<string, unknown> = {
			characterId: 0,
			characters,
			chatId: "chapter-1",
			getRequestHeaders: () => ({ "X-ST": "token" }),
			getThumbnailUrl: (type: string, fileName: string) =>
				`/thumbs/${type}/${fileName}`,
			groupId: null,
			groups: [],
		};
		const executeSlashCommandsWithOptions = vi.fn(async () => {
			const characterId = 1;
			context.characterId = characterId;
			context.chatId = characters[characterId].chat;
			context.groupId = null;
			store.dispatch(
				createIdentitySnapshot({
					characterId,
					chatFileName: characters[characterId].chat,
					entityName: characters[characterId].name,
					thumbnailUrl: `/thumbs/avatar/${characters[characterId].avatar}`,
				}),
			);
			return {
				pipe: characters[characterId].name,
			};
		});
		const saveSettingsDebounced = vi.fn();
		const selectCharacterById = vi.fn();
		context.executeSlashCommandsWithOptions =
			executeSlashCommandsWithOptions;
		context.saveSettingsDebounced = saveSettingsDebounced;
		context.selectCharacterById = selectCharacterById;
		setSillyTavernContext(context);
		const fetchSpy = vi.fn((url: string | URL | Request) => {
			const urlText = String(url);

			if (urlText === "/api/chats/search") {
				return Promise.resolve(
					createJsonResponse([
						{
							file_name: "mage-side-story",
							file_size: "8 KB",
							last_mes: "2026-05-03T12:00:00.000Z",
							message_count: 7,
							preview_message: "Mage preview",
						},
					]),
				);
			}

			return Promise.resolve(createJsonResponse([]));
		});
		vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
		});

		const mainInterfaceTrigger = await screen.findByRole("button", {
			name: "Open Main UI",
		});

		expect(fetchSpy).not.toHaveBeenCalled();

		fireEvent.click(mainInterfaceTrigger);

		await waitFor(() => {
			expect(
				fetchSpy.mock.calls.filter(
					([url]) => url === "/api/chats/recent",
				),
			).toHaveLength(1);
		});
		expect(
			document.getElementById("astra-main-interface-title"),
		).toHaveTextContent("SillyTavern");
		expect(
			fetchSpy.mock.calls.filter(([url]) => url === "/api/chats/search"),
		).toHaveLength(0);

		fireEvent.click(await screen.findByRole("tab", { name: "Mage" }));

		await waitFor(() => {
			expect(
				document.querySelector(".astra-chat-top-bar__name"),
			).toHaveTextContent("Mage");
		});
		expect(mainInterfaceTrigger).toHaveAttribute("aria-expanded", "true");
		expect(executeSlashCommandsWithOptions).toHaveBeenCalledWith(
			'/go "mage.png"',
			expect.objectContaining({
				source: "astra-projecta",
			}),
		);
		expect(selectCharacterById).not.toHaveBeenCalled();
		expect(saveSettingsDebounced).toHaveBeenCalledTimes(1);
		expect(
			document.getElementById("astra-main-interface-title"),
		).toHaveTextContent("Mage");
		expect(document.querySelector(".astra-main-interface")).toHaveAttribute(
			"data-route",
			"current-context-chats",
		);
		expect(context.chatId).toBe("mage-home");

		act(() => {
			feature.dispose();
		});
	});

	test("defers main interface content and chat catalog fetch until first open", async () => {
		document.body.innerHTML = '<div id="sheld"></div>';
		const fetchSpy = vi.fn(
			() => new Promise<Response>(() => {}),
		) as unknown as typeof fetch;
		vi.stubGlobal("fetch", fetchSpy);
		const store = createIdentityStoreStub();
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
		});

		const mainInterfaceTrigger = await screen.findByRole("button", {
			name: "Open Main UI",
		});

		expect(
			document.getElementById("astra-main-interface-panel"),
		).toBeInTheDocument();
		expect(document.querySelector(".astra-main-interface")).toBeNull();
		expect(fetchSpy).not.toHaveBeenCalled();

		fireEvent.click(mainInterfaceTrigger);

		await waitFor(() => {
			expect(
				document.querySelector(".astra-main-interface"),
			).toBeInTheDocument();
		});
		expect(fetchSpy).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole("button", { name: "Back" }));

		await waitFor(() => {
			expect(mainInterfaceTrigger).toHaveAttribute(
				"aria-expanded",
				"false",
			);
		});
		expect(
			document.querySelector(".astra-main-interface"),
		).toBeInTheDocument();

		act(() => {
			feature.dispose();
		});
	});

	test("renders the active chat avatar, entity name, and main interface trigger", async () => {
		document.body.innerHTML = '<div id="sheld"></div>';
		const store = createIdentityStoreStub(
			createIdentitySnapshot({
				entityName: "Star Captain",
				thumbnailUrl: "/thumbs/avatar/star-captain.png",
			}),
		);
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
		});

		await waitFor(() => {
			expect(
				document.querySelector(".astra-chat-top-bar__name"),
			).toHaveTextContent("Star Captain");
		});
		const avatar = screen.getByRole("img", {
			name: "Current chat avatar",
		});
		expect(avatar).toHaveAttribute(
			"src",
			"/thumbs/avatar/star-captain.png",
		);
		const mainInterfaceTrigger = screen.getByRole("button", {
			name: "Open Main UI",
		});
		expect(mainInterfaceTrigger).toBeEnabled();
		expect(mainInterfaceTrigger).toHaveAttribute(
			"id",
			"astra-main-interface-trigger",
		);
		expect(mainInterfaceTrigger).toHaveAttribute(
			"aria-controls",
			"astra-main-interface-panel",
		);
		expect(mainInterfaceTrigger).toHaveAttribute("aria-expanded", "false");
		expect(mainInterfaceTrigger).toHaveAttribute("aria-haspopup", "dialog");
		expect(
			mainInterfaceTrigger.querySelector(".lucide-equal"),
		).toBeInTheDocument();
		expect(
			mainInterfaceTrigger.querySelector(".lucide-chevron-left"),
		).not.toBeInTheDocument();

		fireEvent.click(mainInterfaceTrigger);

		const mainInterfacePanel = await waitFor(() => {
			const element = document.getElementById(
				"astra-main-interface-panel",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});
		const content = document.getElementById("astra-main-interface-content");

		expect(mainInterfaceTrigger).toHaveAttribute("aria-expanded", "true");
		expect(mainInterfacePanel).toHaveAttribute("data-side", "left");
		expect(mainInterfacePanel).toHaveAccessibleName("Main UI");
		expect(
			document.getElementById("astra-main-interface-title"),
		).toHaveTextContent("SillyTavern");
		expect(content).toBeInTheDocument();
		expect(
			content?.querySelector(".astra-main-interface"),
		).toBeInTheDocument();
		expect(
			mainInterfacePanel.querySelector(
				".astra-main-interface-panel__scroll-area",
			),
		).not.toBeInTheDocument();

		const globalTabs = within(mainInterfacePanel).getByRole("tablist", {
			name: "Global sections",
		});
		const globalTabsListFrame = globalTabs.closest<HTMLElement>(
			".astra-smooth-tabs__list-frame",
		);
		expect(globalTabsListFrame).toHaveAttribute(
			"id",
			ASTRA_MAIN_INTERFACE_SECONDARY_TABS_LIST_FRAME_ID,
		);
		const panelBody = mainInterfacePanel.querySelector(
			".astra-main-interface-panel__body",
		);
		expect(globalTabsListFrame?.parentElement).toBe(panelBody);
		expect(panelBody?.firstElementChild).toBe(globalTabsListFrame);
		expect(content).not.toContainElement(globalTabsListFrame);

		const sectionTabs = within(mainInterfacePanel).getByRole("tablist", {
			name: "Main UI sections",
		});
		const panelHeaderContent = mainInterfacePanel.querySelector(
			".astra-main-interface-panel__header-content",
		);
		expect(panelHeaderContent).toContainElement(sectionTabs);
		expect(
			within(panelHeaderContent as HTMLElement).getByRole("tab", {
				name: "Star Captain",
			}),
		).toHaveClass("astra-main-interface__scope-button");
		expect(
			within(panelHeaderContent as HTMLElement).queryByRole("tab", {
				name: "Current Character/Group",
			}),
		).not.toBeInTheDocument();

		fireEvent.click(
			within(mainInterfacePanel).getByRole("tab", {
				name: "Star Captain",
			}),
		);

		expect(
			document.getElementById("astra-main-interface-title"),
		).toHaveTextContent("Star Captain");

		const currentContextTabs = within(mainInterfacePanel).getByRole(
			"tablist",
			{
				name: "Current context sections",
			},
		);
		const currentTabsListFrame = currentContextTabs.closest<HTMLElement>(
			".astra-smooth-tabs__list-frame",
		);
		expect(currentTabsListFrame).toBe(globalTabsListFrame);
		expect(currentTabsListFrame).toHaveAttribute(
			"id",
			ASTRA_MAIN_INTERFACE_SECONDARY_TABS_LIST_FRAME_ID,
		);
		expect(content).not.toContainElement(currentTabsListFrame);

		const panelHeader = mainInterfacePanel.querySelector(
			".astra-main-interface-panel__header",
		);
		expect(panelHeader).toContainElement(sectionTabs);
		expect(content).not.toContainElement(sectionTabs);

		fireEvent.click(
			within(mainInterfacePanel).getByRole("button", { name: "Back" }),
		);

		await waitFor(() => {
			expect(
				document.getElementById("astra-main-interface-panel"),
			).toHaveAttribute("data-state", "closed");
			expect(
				document.getElementById("astra-main-interface-panel"),
			).toHaveAttribute("inert");
		});
		expect(
			document.getElementById("astra-main-interface-panel"),
		).not.toHaveAttribute("aria-hidden");
		expect(mainInterfaceTrigger).toHaveAttribute("aria-expanded", "false");

		act(() => {
			feature.dispose();
		});
	});

	test("renders active group chat avatars as a member collage", async () => {
		document.body.innerHTML = '<div id="sheld"></div>';
		const store = createIdentityStoreStub(
			createIdentitySnapshot({
				avatarSource: "group-member-thumbnail",
				characterId: null,
				entityName: "Party",
				groupAvatarUrls: [
					"/thumbs/avatar/hero.png",
					"/thumbs/avatar/mage.png",
				],
				groupId: "party",
				kind: "group",
				thumbnailUrl: "/thumbs/avatar/hero.png",
			}),
		);
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
		});

		await waitFor(() => {
			expect(
				document.querySelector(".astra-chat-top-bar__name"),
			).toHaveTextContent("Party");
		});
		const collage = document.querySelector(
			".astra-chat-top-bar__avatar-frame .astra-chat-avatar--collage",
		);

		expect(collage).toBeInTheDocument();
		expect(collage).toHaveAttribute("data-count", "2");
		expect(
			collage?.querySelectorAll(".astra-chat-avatar__collage-image"),
		).toHaveLength(2);
		expect(
			screen.queryByRole("img", { name: "Current chat avatar" }),
		).not.toBeInTheDocument();

		act(() => {
			feature.dispose();
		});
	});

	test("renders the drawer empty-state label when no chat is active", async () => {
		document.body.innerHTML = '<div id="sheld"></div>';
		const store = createIdentityStoreStub(
			createIdentitySnapshot({
				entityName: "",
				hasActiveChat: false,
				kind: "none",
				thumbnailUrl: "/img/five.png",
			}),
		);
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
		});

		await waitFor(() => {
			expect(screen.getByText("No active chat")).toBeInTheDocument();
		});

		act(() => {
			feature.dispose();
		});
	});

	test("renders a disabled chat message search placeholder in the top-bar action group", async () => {
		document.body.innerHTML = '<div id="sheld"></div>';
		const store = createIdentityStoreStub();
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
		});

		const searchTrigger = await screen.findByRole("button", {
			name: "Search chat messages",
		});

		expect(
			searchTrigger.closest(".astra-chat-top-bar__actions"),
		).toBeInTheDocument();
		expect(searchTrigger).toBeDisabled();
		expect(
			searchTrigger.querySelector(".lucide-search"),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Open chat settings" }),
		).not.toBeInTheDocument();
		expect(
			document.getElementById("astra-chat-session-settings-panel"),
		).not.toBeInTheDocument();

		act(() => {
			feature.dispose();
		});
	});
});
