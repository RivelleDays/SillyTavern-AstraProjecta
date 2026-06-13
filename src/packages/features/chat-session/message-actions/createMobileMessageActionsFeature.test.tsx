import {
	act,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { createMobileMessageActionsFeature } from "@/packages/features/chat-session/message-actions/createMobileMessageActionsFeature";
import {
	createHistoryStoreStub,
	createRevisionStoreStub,
	createSwipeStoreStub,
	fireMessageTextLongPress,
	getMessageText,
	installAnimationFrameQueue,
	mockMatchMedia,
	openMoreActionsDrawerForMessage,
	openRevisionHistoryDrawerForMessage,
	readAstraRevisionRoots,
	setSillyTavernContext,
	waitForDrawerExitAnimation,
} from "@/packages/features/chat-session/message-actions/createMobileMessageActionsFeature.test-utils";

describe("createMobileMessageActionsFeature", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	test("renders revision and swipe controls directly into the last message action footer and cleans up on unmount", async () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block"></div>
                </div>
            </div>
        `;
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: true,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: 0,
			status: "ready",
			total: 2,
			updatedAt: 0,
		});
		const revisionStore = createRevisionStoreStub({
			canContinue: true,
			canRegenerate: true,
			canUndo: false,
			isBusy: false,
			messageId: 0,
			status: "ready",
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		await waitFor(() => {
			expect(
				document.querySelector(".astra-swipePager"),
			).toBeInTheDocument();
		});
		expect(
			document.querySelector(".astra-revisionBar"),
		).toBeInTheDocument();
		expect(
			document.querySelector(".astra-mesActions__leftDefault"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__rightDefault"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__revisionHost"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__historyHost"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__moreHost"),
		).toBeNull();
		expect(
			document
				.querySelector(".astra-revisionBar")
				?.closest(".astra-mesActions"),
		).toBe(document.querySelector('.mes[mesid="0"] > .astra-mesActions'));
		expect(
			document
				.querySelector(".astra-swipePager")
				?.closest(".astra-mesActions"),
		).toBe(document.querySelector('.mes[mesid="0"] > .astra-mesActions'));
		expect(
			document.querySelector('.astra-mesActions[data-astra-slot="top"]'),
		).toBeNull();
		expect(
			document.querySelector('.mes[mesid="0"] > .astra-mesActions')
				?.previousElementSibling,
		).toBe(document.querySelector('.mes[mesid="0"] > .mes_block'));
		expect(
			document.querySelector(".astra-swipePager__counter"),
		).toHaveTextContent("1 / 2");

		feature.unmount();

		expect(revisionStore.store.dispose).toHaveBeenCalledTimes(1);
		expect(swipeStore.store.dispose).toHaveBeenCalledTimes(1);
		expect(document.querySelector(".astra-revisionBar")).toBeNull();
		expect(document.querySelector(".astra-swipePager")).toBeNull();
		expect(document.querySelector(".astra-mesActions")).toBeNull();
	});

	test("does not create footer actions when the last loaded message is user-authored", async () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false">
                    <div class="mes_block"></div>
                </div>
                <div class="mes" mesid="1" is_user="true">
                    <div class="mes_block"></div>
                </div>
            </div>
        `;
		const revisionStore = createRevisionStoreStub({
			canContinue: true,
			canRegenerate: true,
			canUndo: false,
			isBusy: false,
			messageId: 0,
			status: "ready",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: true,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: 0,
			status: "ready",
			total: 2,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		await waitFor(() => {
			expect(revisionStore.store.refresh).toHaveBeenCalled();
		});
		expect(document.querySelector(".astra-revisionBar")).toBeNull();
		expect(document.querySelector(".astra-swipePager")).toBeNull();
		expect(document.querySelector(".astra-mesActions")).toBeNull();

		feature.dispose();
	});

	test("renders footer actions only for the last non-user message", async () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false">
                    <div class="mes_block"></div>
                </div>
                <div class="mes" mesid="1" is_user="false">
                    <div class="mes_block"></div>
                </div>
            </div>
        `;
		const revisionStore = createRevisionStoreStub({
			canContinue: true,
			canRegenerate: true,
			canUndo: false,
			isBusy: false,
			messageId: 0,
			status: "ready",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: true,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: 0,
			status: "ready",
			total: 2,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		await waitFor(() => {
			expect(revisionStore.store.refresh).toHaveBeenCalled();
		});
		expect(document.querySelector(".astra-mesActions")).toBeNull();

		revisionStore.dispatch({
			canContinue: true,
			canRegenerate: true,
			canUndo: false,
			isBusy: false,
			messageId: 1,
			status: "ready",
			updatedAt: 1,
		});
		swipeStore.dispatch({
			canSwipeNext: true,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: 1,
			status: "ready",
			total: 2,
			updatedAt: 1,
		});

		await waitFor(() => {
			expect(
				document.querySelector('.mes[mesid="1"] > .astra-mesActions'),
			).toBeInTheDocument();
		});
		expect(
			document.querySelector('.mes[mesid="0"] > .astra-mesActions'),
		).toBeNull();
		expect(
			document.querySelector('.mes[mesid="1"] .astra-revisionBar'),
		).toBeInTheDocument();
		expect(
			document.querySelector('.mes[mesid="1"] .astra-swipePager'),
		).toBeInTheDocument();

		feature.dispose();
	});

	test("does not render inline more or history actions for loaded messages", async () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block"><div class="ch_name">User</div><div class="mes_text">User alternate edited</div></div>
                </div>
                <div class="mes" mesid="1">
                    <div class="mes_block"><div class="ch_name">Assistant</div></div>
                </div>
                <div class="mes" mesid="2">
                    <div class="mes_block"><div class="ch_name">Narrator</div></div>
                </div>
            </div>
        `;
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		await waitFor(() => {
			expect(historyStore.store.refresh).toHaveBeenCalled();
		});

		expect(
			document.querySelector(".astra-mesActions__moreHost"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__historyHost"),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "More actions" }),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Revision history" }),
		).toBeNull();

		feature.unmount();

		expect(
			document.querySelector(".astra-mesActions__moreHost"),
		).toBeNull();
		expect(document.querySelector(".astra-mesActions")).toBeNull();
	});

	test("opens more actions from a 240ms long press on live message text only", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_text"><p>Assistant long press target</p></div>
                    </div>
                </div>
                <div class="mes" mesid="1" is_user="true" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/user-avatar.png" /></div>
                        <div class="mesIDDisplay">#1</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">User</div>
                        <div class="mes_text"><p>User long press target</p></div>
                    </div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					mes: "Assistant raw text should not render",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Assistant long press target"],
				},
				{
					is_system: false,
					is_user: true,
					mes: "User raw text should not render",
					name: "User",
					swipe_id: 0,
					swipes: ["User long press target"],
				},
			],
		});
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();
			const assistantMessage = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const userMessage = document.querySelector(
				'.mes[mesid="1"]',
			) as HTMLElement;

			await fireMessageTextLongPress(assistantMessage, {
				durationMs: 239,
			});
			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();

			await openMoreActionsDrawerForMessage(userMessage);

			const dialog = await screen.findByRole("dialog", {
				name: "Message Actions",
			});
			expect(within(dialog).getByText("User")).toBeInTheDocument();
			expect(
				within(dialog).getByLabelText("Message: 1"),
			).toHaveTextContent("1");
			expect(
				within(dialog).getByText("User long press target"),
			).toBeInTheDocument();
			expect(
				within(dialog).queryByText("Assistant long press target"),
			).toBeNull();
			expect(
				document.querySelector(".astra-mesActions__moreHost"),
			).toBeNull();
			expect(
				document.querySelector(".astra-mesActions__historyHost"),
			).toBeNull();
		} finally {
			feature.unmount();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("opens the more actions drawer from the message header ellipsis button", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="astra-mesHeader"></div>
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_text"><p>Header more target body</p></div>
                    </div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					mes: "Header more target body",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Header more target body"],
				},
			],
		});
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();

			const moreButton = await screen.findByRole("button", {
				name: "More message actions",
			});
			expect(moreButton.closest(".astra-mesHeaderActions")).toBe(
				document.querySelector(".astra-mesHeaderActions"),
			);
			fireEvent.click(moreButton);

			const dialog = await screen.findByRole("dialog", {
				name: "Message Actions",
			});
			expect(dialog).toHaveAttribute(
				"id",
				"mobile-message-more-actions-drawer",
			);
			expect(within(dialog).getByText("Assistant")).toBeInTheDocument();
			expect(
				within(dialog).getByText("Header more target body"),
			).toBeInTheDocument();
			expect(
				document.querySelector(".astra-mesActions__moreHost"),
			).toBeNull();
		} finally {
			feature.unmount();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("opens the edit drawer from the message header pencil button without native edit DOM", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="astra-mesHeader"></div>
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_buttons">
                            <button type="button" class="mes_edit"></button>
                        </div>
                        <div class="mes_text"><p>Header edit target body</p></div>
                    </div>
                </div>
            </div>
        `;
		const chat = [
			{
				is_system: false,
				is_user: false,
				extra: {
					reasoning: "Header reasoning",
				},
				mes: "Header edit target body",
				name: "Assistant",
				swipe_id: 0,
				swipes: ["Header edit target body"],
			},
		];
		const editClick = vi.fn();
		document
			.querySelector(".mes_edit")
			?.addEventListener("click", editClick);
		setSillyTavernContext({
			chat,
			eventSource: { emit: vi.fn() },
			eventTypes: {},
			messageFormatting: vi.fn((value: string) => `<p>${value}</p>`),
			powerUserSettings: {
				trim_spaces: true,
			},
			saveChat: vi.fn(),
			substituteParams: vi.fn((value: string) => value),
		});
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();

			fireEvent.click(
				await screen.findByRole("button", { name: "Edit message" }),
			);
			frame.flushFrames();

			const editDialog = await screen.findByRole("dialog", {
				name: "Edit Message",
			});
			expect(editDialog).toHaveAttribute(
				"id",
				"mobile-message-edit-drawer",
			);
			expect(editClick).not.toHaveBeenCalled();
			expect(
				within(editDialog).getByLabelText("Message text"),
			).toHaveValue("Header edit target body");
			expect(within(editDialog).getByLabelText("Reasoning")).toHaveValue(
				"Header reasoning",
			);
			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();
		} finally {
			feature.unmount();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("routes SillyTavern click_to_edit message text clicks to the Astra edit drawer", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_buttons">
                            <button type="button" class="mes_edit"></button>
                        </div>
                        <div class="mes_text"><p>Click edit target body</p></div>
                    </div>
                </div>
            </div>
        `;
		const chat = [
			{
				is_system: false,
				is_user: false,
				extra: {
					reasoning: "Click edit reasoning",
				},
				mes: "Click edit target body",
				name: "Assistant",
				swipe_id: 0,
				swipes: ["Click edit target body"],
			},
		];
		const editClick = vi.fn();
		const nativeClickToEdit = vi.fn((event: MouseEvent) => {
			const target =
				event.target instanceof Element ? event.target : null;
			if (!target?.closest("body .mes .mes_text")) {
				return;
			}
			if (window.getSelection()?.toString()) {
				return;
			}
			if (document.querySelector(".edit_textarea")) {
				return;
			}
			target
				.closest(".mes")
				?.querySelector(".mes_edit")
				?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		document
			.querySelector(".mes_edit")
			?.addEventListener("click", editClick);
		document.addEventListener("click", nativeClickToEdit);
		setSillyTavernContext({
			chat,
			eventSource: { emit: vi.fn() },
			eventTypes: {},
			messageFormatting: vi.fn((value: string) => `<p>${value}</p>`),
			powerUserSettings: {
				click_to_edit: true,
				trim_spaces: true,
			},
			saveChat: vi.fn(),
			substituteParams: vi.fn((value: string) => value),
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => createHistoryStoreStub([]).store,
			createRevisionStore: () =>
				createRevisionStoreStub({
					canContinue: false,
					canRegenerate: false,
					canUndo: false,
					isBusy: false,
					messageId: null,
					status: "idle",
					updatedAt: 0,
				}).store,
			createSwipeStore: () =>
				createSwipeStoreStub({
					canSwipeNext: false,
					canSwipePrevious: false,
					currentIndex: 0,
					isNativeSwipeBusy: false,
					messageId: null,
					status: "idle",
					total: 1,
					updatedAt: 0,
				}).store,
			documentRef: document,
		});

		try {
			feature.mount();

			fireEvent.click(document.querySelector(".mes_text")!);
			frame.flushFrames();

			const editDialog = await screen.findByRole("dialog", {
				name: "Edit Message",
			});
			expect(editDialog).toHaveAttribute(
				"id",
				"mobile-message-edit-drawer",
			);
			expect(nativeClickToEdit).not.toHaveBeenCalled();
			expect(editClick).not.toHaveBeenCalled();
			expect(
				within(editDialog).getByLabelText("Message text"),
			).toHaveValue("Click edit target body");
			expect(within(editDialog).getByLabelText("Reasoning")).toHaveValue(
				"Click edit reasoning",
			);
		} finally {
			feature.unmount();
			frame.restore();
			document.removeEventListener("click", nativeClickToEdit);
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("keeps long-press follow-up clicks from opening edit when click_to_edit is enabled", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_buttons">
                            <button type="button" class="mes_edit"></button>
                        </div>
                        <div class="mes_text"><p>Long press click body</p></div>
                    </div>
                </div>
            </div>
        `;
		const editClick = vi.fn();
		const nativeClickToEdit = vi.fn((event: MouseEvent) => {
			const target =
				event.target instanceof Element ? event.target : null;
			if (!target?.closest("body .mes .mes_text")) {
				return;
			}
			target
				.closest(".mes")
				?.querySelector(".mes_edit")
				?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		});
		document
			.querySelector(".mes_edit")
			?.addEventListener("click", editClick);
		document.addEventListener("click", nativeClickToEdit);
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					mes: "Long press click body",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Long press click body"],
				},
			],
			eventSource: { emit: vi.fn() },
			eventTypes: {},
			messageFormatting: vi.fn((value: string) => `<p>${value}</p>`),
			powerUserSettings: {
				click_to_edit: true,
				trim_spaces: true,
			},
			saveChat: vi.fn(),
			substituteParams: vi.fn((value: string) => value),
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => createHistoryStoreStub([]).store,
			createRevisionStore: () =>
				createRevisionStoreStub({
					canContinue: false,
					canRegenerate: false,
					canUndo: false,
					isBusy: false,
					messageId: null,
					status: "idle",
					updatedAt: 0,
				}).store,
			createSwipeStore: () =>
				createSwipeStoreStub({
					canSwipeNext: false,
					canSwipePrevious: false,
					currentIndex: 0,
					isNativeSwipeBusy: false,
					messageId: null,
					status: "idle",
					total: 1,
					updatedAt: 0,
				}).store,
			documentRef: document,
		});

		try {
			feature.mount();

			const message = document.querySelector(".mes") as HTMLElement;
			const moreDialog = await openMoreActionsDrawerForMessage(message);
			expect(moreDialog).toHaveAttribute(
				"id",
				"mobile-message-more-actions-drawer",
			);

			fireEvent.click(getMessageText(message));
			frame.flushFrames();

			expect(
				screen.queryByRole("dialog", { name: "Edit Message" }),
			).toBeNull();
			expect(nativeClickToEdit).not.toHaveBeenCalled();
			expect(editClick).not.toHaveBeenCalled();
		} finally {
			feature.unmount();
			frame.restore();
			document.removeEventListener("click", nativeClickToEdit);
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("leaves click_to_edit message text clicks alone during selection or active native edit", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_buttons">
                            <button type="button" class="mes_edit"></button>
                        </div>
                        <div class="mes_text"><p>Selection edit target body</p></div>
                    </div>
                </div>
            </div>
        `;
		const editClick = vi.fn();
		document
			.querySelector(".mes_edit")
			?.addEventListener("click", editClick);
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					mes: "Selection edit target body",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Selection edit target body"],
				},
			],
			eventSource: { emit: vi.fn() },
			eventTypes: {},
			messageFormatting: vi.fn((value: string) => `<p>${value}</p>`),
			powerUserSettings: {
				click_to_edit: true,
				trim_spaces: true,
			},
			saveChat: vi.fn(),
			substituteParams: vi.fn((value: string) => value),
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => createHistoryStoreStub([]).store,
			createRevisionStore: () =>
				createRevisionStoreStub({
					canContinue: false,
					canRegenerate: false,
					canUndo: false,
					isBusy: false,
					messageId: null,
					status: "idle",
					updatedAt: 0,
				}).store,
			createSwipeStore: () =>
				createSwipeStoreStub({
					canSwipeNext: false,
					canSwipePrevious: false,
					currentIndex: 0,
					isNativeSwipeBusy: false,
					messageId: null,
					status: "idle",
					total: 1,
					updatedAt: 0,
				}).store,
			documentRef: document,
		});

		try {
			feature.mount();

			const messageText = document.querySelector(".mes_text")!;
			const range = document.createRange();
			range.selectNodeContents(messageText);
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(range);
			fireEvent.click(messageText);
			frame.flushFrames();

			expect(
				screen.queryByRole("dialog", { name: "Edit Message" }),
			).toBeNull();
			expect(editClick).not.toHaveBeenCalled();

			window.getSelection()?.removeAllRanges();
			document.body.insertAdjacentHTML(
				"beforeend",
				'<textarea class="edit_textarea"></textarea>',
			);
			fireEvent.click(messageText);
			frame.flushFrames();

			expect(
				screen.queryByRole("dialog", { name: "Edit Message" }),
			).toBeNull();
			expect(editClick).not.toHaveBeenCalled();
		} finally {
			feature.unmount();
			frame.restore();
			window.getSelection()?.removeAllRanges();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("routes SillyTavern click_to_edit reasoning clicks to the Astra edit drawer", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_buttons">
                            <button type="button" class="mes_edit"></button>
                        </div>
                        <div class="mes_reasoning">Visible reasoning text</div>
                        <div class="mes_text"><p>Reasoning click body</p></div>
                    </div>
                </div>
            </div>
        `;
		const editClick = vi.fn();
		document
			.querySelector(".mes_edit")
			?.addEventListener("click", editClick);
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					extra: {
						reasoning: "Reasoning click drawer text",
					},
					mes: "Reasoning click body",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Reasoning click body"],
				},
			],
			eventSource: { emit: vi.fn() },
			eventTypes: {},
			messageFormatting: vi.fn((value: string) => `<p>${value}</p>`),
			powerUserSettings: {
				click_to_edit: true,
				trim_spaces: true,
			},
			saveChat: vi.fn(),
			substituteParams: vi.fn((value: string) => value),
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => createHistoryStoreStub([]).store,
			createRevisionStore: () =>
				createRevisionStoreStub({
					canContinue: false,
					canRegenerate: false,
					canUndo: false,
					isBusy: false,
					messageId: null,
					status: "idle",
					updatedAt: 0,
				}).store,
			createSwipeStore: () =>
				createSwipeStoreStub({
					canSwipeNext: false,
					canSwipePrevious: false,
					currentIndex: 0,
					isNativeSwipeBusy: false,
					messageId: null,
					status: "idle",
					total: 1,
					updatedAt: 0,
				}).store,
			documentRef: document,
		});

		try {
			feature.mount();

			fireEvent.click(document.querySelector(".mes_reasoning")!);
			frame.flushFrames();

			const editDialog = await screen.findByRole("dialog", {
				name: "Edit Message",
			});
			expect(editClick).not.toHaveBeenCalled();
			expect(
				within(editDialog).getByLabelText("Message text"),
			).toHaveValue("Reasoning click body");
			expect(within(editDialog).getByLabelText("Reasoning")).toHaveValue(
				"Reasoning click drawer text",
			);
		} finally {
			feature.unmount();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("cleans up message header action roots when a message leaves the chat DOM", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="astra-mesHeader"></div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_text"><p>Header cleanup target</p></div>
                    </div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					mes: "Header cleanup target",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Header cleanup target"],
				},
			],
		});
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();

			expect(
				await screen.findByRole("button", {
					name: "More message actions",
				}),
			).toBeInTheDocument();

			document.querySelector('.mes[mesid="0"]')?.remove();
			await Promise.resolve();
			frame.flushFrames();

			expect(
				document.querySelector(".astra-mesHeaderActions"),
			).toBeNull();
			expect(
				screen.queryByRole("button", { name: "More message actions" }),
			).toBeNull();
			expect(
				screen.queryByRole("button", { name: "Edit message" }),
			).toBeNull();
		} finally {
			feature.unmount();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("cancels message-text long press on meaningful movement and unmount", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_text"><p>Moving should cancel</p></div>
                    </div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					mes: "Moving should cancel",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Moving should cancel"],
				},
			],
		});
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();
			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;

			await fireMessageTextLongPress(message, {
				moveTo: {
					clientX: 28,
					clientY: 12,
				},
			});
			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();

			const messageText = getMessageText(message);
			vi.useFakeTimers();
			fireEvent.pointerDown(messageText, {
				clientX: 8,
				clientY: 12,
				pointerId: 1,
				pointerType: "touch",
			});
			feature.unmount();
			await act(async () => {
				vi.advanceTimersByTime(240);
			});
			vi.useRealTimers();

			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();
			expect(
				document.querySelector(".astra-mesActions__moreHost"),
			).toBeNull();
			expect(
				document.querySelector(".astra-mesActions__historyHost"),
			).toBeNull();
		} finally {
			vi.useRealTimers();
			feature.unmount();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("keeps more actions metadata and rendered preview lazy until the selected trigger is clicked", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false" timestamp="January 14, 2026 9:03 PM" bookmark_link="Checkpoint #359 - 2025-10-05@16h29m18s">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#4</div>
                        <div class="mes_timer">4.2s</div>
                        <div class="tokenCounterDisplay">321 tokens</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">
                            Assistant
                            <span id="native-model-icon" class="icon-svg timestamp-icon custom-model-icon" style="--model-color: cyan;" title="makersuite - gemini-2.0-flash" onclick="openModel()"><span class="model-glyph"></span></span>
                            <small class="timestamp">Fallback timestamp text</small>
                        </div>
                        <div class="mes_text"><p>Initial assistant rendered body</p></div>
                    </div>
                </div>
            </div>
        `;
		let chatAccessCount = 0;
		const context: { chat?: unknown[] } = {};
		Object.defineProperty(context, "chat", {
			get() {
				chatAccessCount += 1;
				return [
					{
						is_user: false,
						extra: {
							model: "openrouter/google/gemini-2.5-pro",
						},
						mes: "Assistant raw context should not render",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["Assistant first", "Assistant second"],
					},
				];
			},
		});
		const getContext = vi.fn(() => context);
		(globalThis as { SillyTavern?: unknown }).SillyTavern = {
			getContext,
		};
		const message = document.querySelector(
			'.mes[mesid="0"]',
		) as HTMLElement;
		const messageText = message.querySelector(".mes_text") as HTMLElement;
		const cloneNodeSpy = vi.spyOn(messageText, "cloneNode");
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();

			const initialGetContextCallCount = getContext.mock.calls.length;

			expect(chatAccessCount).toBe(0);
			expect(cloneNodeSpy).not.toHaveBeenCalled();
			expect(
				document.getElementById(
					"astra-message-more-actions-drawer-host",
				),
			).toBeNull();

			const dialog = await openMoreActionsDrawerForMessage(message);
			const header = dialog.querySelector(
				"#mobile-message-more-actions-drawer-header",
			);
			const modelRow = dialog.querySelector(
				"#mobile-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__detailSection",
			);
			const identityMetaLine = header?.querySelector(
				".astra-messageMoreActionsDrawer__identityMetaLine",
			);
			const modelName = modelRow?.querySelector(
				".astra-messageMoreActionsDrawer__modelName",
			);
			const modelIconHost = modelName?.querySelector(
				".astra-messageMoreActionsDrawer__modelIcon",
			);
			const modelIcon = modelIconHost?.querySelector(
				".timestamp-icon.custom-model-icon",
			);

			expect(getContext.mock.calls.length).toBeGreaterThan(
				initialGetContextCallCount,
			);
			expect(chatAccessCount).toBeGreaterThanOrEqual(1);
			expect(cloneNodeSpy).toHaveBeenCalledTimes(1);
			expect(
				within(header as HTMLElement).queryByText(
					"January 14, 2026 9:03 PM",
				),
			).toBeNull();
			expect(
				within(header as HTMLElement).queryByText("gemini-2.5-pro"),
			).toBeNull();
			expect(modelRow).toBeInTheDocument();
			expect(
				within(modelRow as HTMLElement).getByText(
					"January 14, 2026 9:03 PM",
				),
			).toBeInTheDocument();
			expect(
				within(modelRow as HTMLElement).getByText("gemini-2.5-pro"),
			).toBeInTheDocument();
			expect(modelName).toHaveClass(
				"astra-messageMoreActionsDrawer__modelName",
			);
			expect(modelName).not.toHaveClass("astra-mesModel");
			expect(
				modelName?.querySelector(".astra-mesModel__label"),
			).toBeNull();
			expect(identityMetaLine).toBeNull();
			expect(
				within(header as HTMLElement).getByLabelText(
					"Message tokens: 321 tokens",
				),
			).toHaveTextContent("321 tokens");
			expect(header?.querySelector(".lucide-braces")).toBeInTheDocument();
			expect(
				within(header as HTMLElement).queryByLabelText("Swipe: 2"),
			).toBeNull();
			expect(modelIcon).not.toHaveAttribute("id");
			expect(modelIcon).not.toHaveAttribute("onclick");
			expect(modelIcon).toHaveClass("icon-svg");
			expect(modelIcon).toHaveStyle("--model-color: cyan");
			expect(modelIcon).toHaveAttribute(
				"title",
				"makersuite - gemini-2.0-flash",
			);
			expect(
				modelIcon?.querySelector(".model-glyph"),
			).toBeInTheDocument();
			expect(header?.querySelector(".lucide-bot")).toBeNull();
			expect(
				modelRow?.querySelector(
					".astra-messageMoreActionsDrawer__modelStats",
				),
			).toBeInTheDocument();
			expect(
				within(header as HTMLElement).queryByText("4.2s"),
			).toBeNull();
			expect(
				within(modelRow as HTMLElement).getByText("4.2s"),
			).toBeInTheDocument();
			expect(
				within(dialog).queryByText(
					"Checkpoint #359 - 2025-10-05@16h29m18s",
				),
			).toBeNull();
			expect(
				within(dialog).getByText("Initial assistant rendered body"),
			).toBeInTheDocument();
		} finally {
			feature.unmount();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("shows the drawer model icon and label from chat context when native model icons are disabled", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const fetchProviderIcon = vi.fn(async () => ({
			ok: true,
			text: async () =>
				'<svg viewBox="0 0 24 24" onclick="alert(1)"><path d="M4 12h16" /></svg>',
		}));
		vi.stubGlobal("fetch", fetchProviderIcon);
		document.body.classList.add("no-modelIcons");
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#4</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_text"><p>Assistant rendered body</p></div>
                    </div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					mes: "Assistant raw context should not render",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Assistant message"],
				},
			],
			powerUserSettings: {
				messageModelIconEnabled: false,
			},
		});
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();

			const dialog = await openMoreActionsDrawerForMessage(
				document.querySelector('.mes[mesid="0"]') as HTMLElement,
			);
			const heading = dialog.querySelector(
				"#mobile-message-more-actions-drawer-heading",
			);
			const modelName = heading?.querySelector(
				".astra-messageMoreActionsDrawer__modelName",
			);

			expect(heading).toHaveClass(
				"astra-messageMoreActionsDrawer__modelDataRow",
			);
			expect(heading).not.toHaveClass("sr-only");
			expect(modelName).toHaveTextContent("gemini-2.5-pro");
			await waitFor(() => {
				expect(
					modelName?.querySelector(
						".astra-messageMoreActionsDrawer__modelIcon svg",
					),
				).toBeInTheDocument();
			});
			expect(fetchProviderIcon).toHaveBeenCalledWith("/img/vertexai.svg");
			expect(
				modelName?.querySelector(
					".astra-messageMoreActionsDrawer__modelIcon svg",
				),
			).not.toHaveAttribute("onclick");
			expect(dialog.querySelector(".timestamp-icon")).toBeNull();
		} finally {
			feature.unmount();
			document.body.classList.remove("no-modelIcons");
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("uses name_text instead of header model metadata when resolving a DOM sender name", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">
                            <span class="name_text">Assistant</span>
                            <span class="astra-mesModel">
                                <span class="timestamp-icon" title="openrouter/google/gemini-2.5-pro"></span>
                                <span class="astra-mesModel__label">gemini-2.5-pro</span>
                            </span>
                        </div>
                        <div class="mes_text"><p>Assistant body</p></div>
                    </div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					mes: "Assistant body",
					swipe_id: 0,
					swipes: ["Assistant body"],
				},
			],
		});
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();
			const dialog = await openMoreActionsDrawerForMessage(
				document.querySelector('.mes[mesid="0"]') as HTMLElement,
			);
			const identityName = dialog.querySelector(
				".astra-messageMoreActionsDrawer__identityName",
			);

			expect(identityName).toHaveTextContent("Assistant");
			expect(identityName).not.toHaveTextContent("gemini-2.5-pro");
		} finally {
			feature.unmount();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("renders model metadata for system messages when native model data exists", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="true" timestamp="January 14, 2026 9:03 PM">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/system-avatar.png" /></div>
                        <div class="mesIDDisplay">#9</div>
                        <div class="mes_timer">1.8s</div>
                        <div class="tokenCounterDisplay">88 tokens</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">
                            System
                            <span class="icon-svg timestamp-icon custom-model-icon" title="makersuite - gemini-2.0-flash"><span class="model-glyph"></span></span>
                        </div>
                        <div class="mes_text"><p>System rendered body</p></div>
                    </div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					is_system: false,
					is_user: false,
					extra: {},
					mes: "System raw context should not render",
					name: "System",
					swipe_id: 0,
					swipes: ["System message"],
				},
			],
		});
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();
			const systemMessage = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;

			const dialog = await openMoreActionsDrawerForMessage(systemMessage);
			const header = dialog.querySelector(
				"#mobile-message-more-actions-drawer-header",
			);
			const modelRow = dialog.querySelector(
				"#mobile-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__detailSection",
			);
			const identityMetaLine = header?.querySelector(
				".astra-messageMoreActionsDrawer__identityMetaLine",
			);

			expect(
				within(header as HTMLElement).getByText("System"),
			).toBeInTheDocument();
			expect(
				within(header as HTMLElement).getByLabelText(
					"Message tokens: 88 tokens",
				),
			).toHaveTextContent("88 tokens");
			expect(modelRow).toBeInTheDocument();
			expect(identityMetaLine).toBeNull();
			expect(
				within(modelRow as HTMLElement).getByText(
					"January 14, 2026 9:03 PM",
				),
			).toBeInTheDocument();
			expect(
				within(header as HTMLElement).queryByText(
					"January 14, 2026 9:03 PM",
				),
			).toBeNull();
			expect(
				within(header as HTMLElement).queryByText("gemini-2.0-flash"),
			).toBeNull();
			expect(
				within(modelRow as HTMLElement).getByText("gemini-2.0-flash"),
			).toBeInTheDocument();
			expect(
				within(modelRow as HTMLElement).getByText("1.8s"),
			).toBeInTheDocument();
			expect(
				modelRow?.querySelector(
					".astra-messageMoreActionsDrawer__modelIcon .timestamp-icon.custom-model-icon",
				),
			).toBeInTheDocument();
		} finally {
			feature.unmount();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("opens the more actions drawer for the selected message identity and rendered message body", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false" timestamp="January 14, 2026 9:03 PM" bookmark_link="Checkpoint #359 - 2025-10-05@16h29m18s">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#4</div>
                        <div class="mes_timer">4.2s</div>
                        <div class="tokenCounterDisplay">321 tokens</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">
                            Assistant
                            <span id="native-model-icon" class="icon-svg timestamp-icon custom-model-icon" style="--model-color: cyan;" title="makersuite - gemini-2.0-flash" onclick="openModel()"><span class="model-glyph"></span></span>
                            <small class="timestamp">Fallback timestamp text</small>
                        </div>
                        <div class="mes_text"><p>Initial assistant rendered body</p></div>
                    </div>
                </div>
                <div class="mes" mesid="1" is_user="true" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/user-avatar.png" /></div>
                        <div class="mesIDDisplay">#7</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">User</div>
                        <div class="mes_text"><style>.mes_text .custom-user { color: green; }</style><p><q>「使用者顯示文字」</q><em>User rendered body</em></p></div>
                    </div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					is_user: false,
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					mes: "Assistant raw context should not render",
					name: "Assistant",
					swipe_id: 1,
					swipes: ["Assistant first", "Assistant second"],
				},
				{
					is_user: true,
					mes: "User raw context should not render",
					name: "User",
					swipe_id: 0,
					swipes: ["User message"],
				},
			],
		});
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		const assistantMessage = document.querySelector(
			'.mes[mesid="0"]',
		) as HTMLElement;
		const userMessage = document.querySelector(
			'.mes[mesid="1"]',
		) as HTMLElement;
		assistantMessage.querySelector(".mes_text")!.innerHTML =
			'<p><q>「小蝴蝶，早安。」</q><strong>Latest assistant DOM body</strong></p><a id="assistant-link" href="/characters" onclick="openLink()">Rendered link</a><script>window.__unsafe = true;</script>';

		const dialog = await openMoreActionsDrawerForMessage(assistantMessage);
		expect(dialog).toHaveAttribute(
			"id",
			"mobile-message-more-actions-drawer",
		);
		expect(dialog).toHaveClass("astra-drawer-surface");
		expect(
			dialog.querySelector(
				".astra-dialog-identity.astra-messageMoreActionsDrawer__identity",
			),
		).toBeNull();
		const header = dialog.querySelector(
			"#mobile-message-more-actions-drawer-header",
		);
		expect(
			header?.querySelector(
				":scope > .astra-messageMoreActionsDrawer__summary",
			),
		).toBeInTheDocument();
		expect(within(dialog).getByText("Assistant")).toBeInTheDocument();
		expect(within(dialog).getByLabelText("Message: 4")).toHaveTextContent(
			"4",
		);
		expect(
			within(dialog).getByLabelText("Message tokens: 321 tokens"),
		).toHaveTextContent("321 tokens");
		expect(within(dialog).queryByLabelText("Swipe: 2")).toBeNull();
		expect(header?.querySelector(".lucide-braces")).toBeInTheDocument();
		const identityNameRow = header?.querySelector(
			".astra-messageMoreActionsDrawer__identityNameRow",
		);
		const identityText = header?.querySelector(
			".astra-messageMoreActionsDrawer__identityText",
		);
		const identityBadges = header?.querySelector(
			".astra-messageMoreActionsDrawer__identityMain > .astra-messageMoreActionsDrawer__identityBadges",
		);
		const nestedIdentityBadges = identityNameRow?.querySelector(
			":scope > .astra-messageMoreActionsDrawer__identityBadges",
		);
		const identityMetaLine = identityText?.querySelector(
			":scope > .astra-messageMoreActionsDrawer__identityMetaLine",
		);
		expect(identityBadges).toBeInTheDocument();
		expect(nestedIdentityBadges).toBeNull();
		expect(identityMetaLine).toBeNull();
		expect(identityText?.lastElementChild).toBe(identityNameRow);
		expect(dialog.querySelector("img")).toHaveAttribute(
			"src",
			"/assistant-avatar.png",
		);
		expect(
			dialog.querySelector(
				".astra-messageMoreActionsDrawer__metadataHeading",
			),
		).toBeNull();
		const modelRow = dialog.querySelector(
			"#mobile-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__detailSection",
		);
		expect(modelRow).toBeInTheDocument();
		expect(header?.nextElementSibling).toBe(modelRow);
		expect(dialog.querySelector(".astra-dialog-icon")).toBeNull();
		expect(dialog.querySelector(".astra-dialog-headingContent")).toBeNull();
		expect(
			dialog.querySelector(
				".astra-dialog-header, .astra-dialog-heading, .astra-dialog-body, .astra-dialog-footer, .astra-dialog-content",
			),
		).toBeNull();
		expect(header?.querySelector(".lucide-bot")).toBeNull();
		const modelIcon = modelRow?.querySelector(
			".astra-messageMoreActionsDrawer__modelIcon .timestamp-icon.custom-model-icon",
		);
		expect(modelIcon).not.toHaveAttribute("id");
		expect(modelIcon).not.toHaveAttribute("onclick");
		expect(modelIcon).toHaveClass("icon-svg");
		expect(modelIcon).toHaveStyle("--model-color: cyan");
		expect(modelIcon).toHaveAttribute(
			"title",
			"makersuite - gemini-2.0-flash",
		);
		expect(modelIcon?.querySelector(".model-glyph")).toBeInTheDocument();
		expect(
			within(header as HTMLElement).queryByText(
				"January 14, 2026 9:03 PM",
			),
		).toBeNull();
		expect(
			within(modelRow as HTMLElement).getByText(
				"January 14, 2026 9:03 PM",
			),
		).toBeInTheDocument();
		expect(
			within(header as HTMLElement).queryByText("gemini-2.5-pro"),
		).toBeNull();
		expect(
			within(modelRow as HTMLElement).getByText("gemini-2.5-pro"),
		).toBeInTheDocument();
		expect(
			modelRow?.querySelector(
				".astra-messageMoreActionsDrawer__modelStats",
			),
		).toBeInTheDocument();
		expect(within(header as HTMLElement).queryByText("4.2s")).toBeNull();
		expect(
			within(modelRow as HTMLElement).getByText("4.2s"),
		).toBeInTheDocument();
		expect(
			within(dialog).queryByText(
				"Checkpoint #359 - 2025-10-05@16h29m18s",
			),
		).toBeNull();
		const assistantPreview = dialog.querySelector(
			'.astra-messageMoreActionsDrawer__messagePreview.mes[data-astra-message-preview="true"]',
		);
		const assistantRenderedMessage =
			assistantPreview?.querySelector(".mes_text");
		expect(assistantPreview).toBeInTheDocument();
		expect(assistantRenderedMessage).toBeInTheDocument();
		expect(assistantRenderedMessage?.querySelector("q")).toHaveTextContent(
			"「小蝴蝶，早安。」",
		);
		expect(
			assistantRenderedMessage?.querySelector("strong"),
		).toHaveTextContent("Latest assistant DOM body");
		expect(assistantRenderedMessage?.querySelector("script")).toBeNull();
		expect(
			assistantRenderedMessage?.querySelector("a"),
		).not.toHaveAttribute("id");
		expect(assistantRenderedMessage?.querySelector("a")).toHaveAttribute(
			"tabindex",
			"-1",
		);
		expect(
			within(dialog).queryByText("Initial assistant rendered body"),
		).toBeNull();
		expect(
			within(dialog).queryByText(
				"Assistant raw context should not render",
			),
		).toBeNull();

		await openMoreActionsDrawerForMessage(userMessage);

		await waitFor(() => {
			expect(within(dialog).getByText("User")).toBeInTheDocument();
		});
		expect(within(dialog).getByLabelText("Message: 7")).toHaveTextContent(
			"7",
		);
		expect(within(dialog).queryByLabelText(/Message tokens:/)).toBeNull();
		expect(within(dialog).queryByLabelText("Swipe: 1")).toBeNull();
		expect(
			dialog.querySelector(
				"#mobile-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__modelDataRow",
			),
		).toBeNull();
		expect(
			dialog.querySelector(
				"#mobile-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__detailSection",
			),
		).toBeNull();
		expect(
			document.getElementById(
				"mobile-message-more-actions-drawer-heading",
			),
		).toHaveClass("sr-only");
		expect(dialog.querySelector("img")).toHaveAttribute(
			"src",
			"/user-avatar.png",
		);
		expect(
			within(dialog).queryByText("January 14, 2026 9:03 PM"),
		).toBeNull();
		expect(within(dialog).queryByText("4.2s")).toBeNull();
		expect(within(dialog).queryByText("321 tokens")).toBeNull();
		expect(within(dialog).queryByText("gemini-2.5-pro")).toBeNull();
		expect(
			within(dialog).queryByText(
				"Checkpoint #359 - 2025-10-05@16h29m18s",
			),
		).toBeNull();
		const userPreview = dialog.querySelector(
			'.astra-messageMoreActionsDrawer__messagePreview.mes[data-astra-message-preview="true"]',
		);
		const userRenderedMessage = userPreview?.querySelector(".mes_text");
		expect(userRenderedMessage?.querySelector("style")).toHaveTextContent(
			".mes_text .custom-user",
		);
		expect(userRenderedMessage?.querySelector("q")).toHaveTextContent(
			"「使用者顯示文字」",
		);
		expect(userRenderedMessage?.querySelector("em")).toHaveTextContent(
			"User rendered body",
		);
		expect(
			within(dialog).queryByText("Latest assistant DOM body"),
		).toBeNull();
		expect(
			within(dialog).queryByText("User raw context should not render"),
		).toBeNull();

		feature.unmount();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("dispatches native copy and prompt visibility then hands edit to the Astra edit drawer", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
                <div id="chat">
                    <div class="mes" mesid="0" is_user="false" is_system="false">
                        <div class="mesAvatarWrapper">
                            <div class="avatar"><img src="/assistant-avatar.png" /></div>
                            <div class="mesIDDisplay">#0</div>
                        </div>
                        <div class="mes_block">
                            <div class="ch_name">Assistant</div>
                            <div class="mes_buttons">
                                <div class="extraMesButtons">
                                    <button type="button" class="mes_hide"></button>
                                    <button type="button" class="mes_unhide"></button>
                                    <button type="button" class="mes_copy"></button>
                                </div>
                                <button type="button" class="mes_edit"></button>
                            </div>
                            <div class="mes_text"><p>Native action target body</p></div>
                        </div>
                    </div>
                </div>
            `;
			const chat = [
				{
					is_system: false,
					is_user: false,
					extra: {
						reasoning: "Original reasoning",
					},
					mes: "Native action target body",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Native action target body"],
				},
			];
			const eventSource = { emit: vi.fn() };
			const saveChat = vi.fn();
			setSillyTavernContext({
				chat,
				eventSource,
				eventTypes: {
					MESSAGE_EDITED: "message_edited",
					MESSAGE_UPDATED: "message_updated",
				},
				messageFormatting: vi.fn((value: string) => `<p>${value}</p>`),
				powerUserSettings: {
					trim_spaces: true,
				},
				saveChat,
				substituteParams: vi.fn((value: string) =>
					value.replace(/\{\{char\}\}/gu, "Assistant"),
				),
			});
			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const copyButton = message.querySelector(".mes_copy")!;
			const hideButton = message.querySelector(".mes_hide")!;
			const unhideButton = message.querySelector(".mes_unhide")!;
			const editButton = message.querySelector(".mes_edit")!;
			const copyPointerUp = vi.fn();
			const hideClick = vi.fn(() => {
				message.setAttribute("is_system", "true");
				chat[0].is_system = true;
			});
			const unhideClick = vi.fn(() => {
				message.setAttribute("is_system", "false");
				chat[0].is_system = false;
			});
			const editClick = vi.fn();
			copyButton.addEventListener("pointerup", copyPointerUp);
			hideButton.addEventListener("click", hideClick);
			unhideButton.addEventListener("click", unhideClick);
			editButton.addEventListener("click", editClick);
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const dialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(dialog).getByRole("button", {
					name: "Copy message text",
				}),
			);
			expect(copyPointerUp).toHaveBeenCalledTimes(1);
			expect(
				within(dialog).getByRole("button", {
					name: "Exclude message from prompts",
				}),
			).toBeInTheDocument();
			expect(dialog).toHaveAttribute("data-state", "closed");
			expect(
				screen.getByRole("dialog", { name: "Message Actions" }),
			).toBe(dialog);
			await waitForDrawerExitAnimation();
			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();

			const promptDialog = await openMoreActionsDrawerForMessage(message);

			fireEvent.click(
				within(promptDialog).getByRole("button", {
					name: "Exclude message from prompts",
				}),
			);
			expect(hideClick).toHaveBeenCalledTimes(1);
			expect(unhideClick).not.toHaveBeenCalled();
			expect(
				within(promptDialog).getByRole("button", {
					name: "Exclude message from prompts",
				}),
			).toBeInTheDocument();
			expect(promptDialog).toHaveAttribute("data-state", "closed");
			await waitForDrawerExitAnimation();
			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();

			const editDialog = await openMoreActionsDrawerForMessage(message);
			expect(
				within(editDialog).getByRole("button", {
					name: "Include message in prompts",
				}),
			).toBeInTheDocument();

			fireEvent.click(
				within(editDialog).getByRole("button", {
					name: "Edit message",
				}),
			);
			expect(editClick).not.toHaveBeenCalled();
			expect(editDialog).toHaveAttribute("data-state", "closed");
			expect(
				screen.queryByRole("dialog", { name: "Edit Message" }),
			).toBeNull();
			frame.flushFrames();
			expect(editClick).not.toHaveBeenCalled();
			const astraEditDialog = await screen.findByRole("dialog", {
				name: "Edit Message",
			});
			const astraEditDialogQueries = within(astraEditDialog);
			const messageTextarea =
				astraEditDialogQueries.getByLabelText("Message text");
			const reasoningTextarea =
				await astraEditDialogQueries.findByLabelText("Reasoning");

			expect(messageTextarea).toHaveValue("Native action target body");
			expect(reasoningTextarea).toHaveValue("Original reasoning");
			await waitForDrawerExitAnimation();
			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();
			expect(astraEditDialog.querySelector(".edit_textarea")).toBeNull();
			expect(
				astraEditDialog.querySelector(".reasoning_edit_textarea"),
			).toBeNull();

			fireEvent.change(messageTextarea, {
				target: { value: "  Edited {{char}} body  " },
			});
			fireEvent.change(reasoningTextarea, {
				target: { value: "Edited reasoning" },
			});
			fireEvent.click(
				within(astraEditDialog).getByRole("button", {
					name: "Confirm edit",
				}),
			);

			await waitFor(() => {
				expect(saveChat).toHaveBeenCalledTimes(1);
			});
			expect(chat[0].mes).toBe("Edited Assistant body");
			expect(chat[0].swipes[0]).toBe("Edited Assistant body");
			expect(chat[0].extra?.reasoning).toBe("Edited reasoning");
			expect(message.querySelector(".mes_text")).toHaveTextContent(
				"Edited Assistant body",
			);
			expect(eventSource.emit).toHaveBeenCalledWith("message_edited", 0);
			expect(eventSource.emit).toHaveBeenCalledWith("message_updated", 0);
			expect(
				document.getElementById("astra-message-edit-drawer-host"),
			).toBeInTheDocument();
			expect(
				document.getElementById("mobile-message-edit-drawer"),
			).toHaveAttribute("data-state", "closed");
			expect(
				document.getElementById("mobile-message-edit-drawer"),
			).toHaveAttribute("data-state", "closed");
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("runs edit drawer top actions through Astra adapters without native edit clicks", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			const chat = [
				{
					is_system: false,
					is_user: false,
					mes: "First message",
					name: "Assistant",
					swipe_id: 1,
					swipes: ["First old", "First message"],
				},
				{
					is_system: false,
					is_user: false,
					mes: "Second message",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Second message"],
				},
			];
			const saveChat = vi.fn();
			const deleteMessage = vi.fn();
			const printMessages = vi.fn(() => {
				document.getElementById("chat")!.innerHTML = chat
					.map(
						(message, index) => `
                            <div class="mes" mesid="${index}" is_user="${String(message.is_user)}" is_system="${String(message.is_system)}">
                                <div class="mesAvatarWrapper">
                                    <div class="avatar"><img src="/assistant-avatar.png" /></div>
                                    <div class="mesIDDisplay">#${index}</div>
                                </div>
                                <div class="mes_block">
                                    <div class="ch_name">${message.name}</div>
                                    <div class="mes_buttons">
                                        <button type="button" class="mes_edit"></button>
                                    </div>
                                    <div class="mes_text"><p>${message.mes}</p></div>
                                </div>
                            </div>
                        `,
					)
					.join("");
			});
			document.body.innerHTML += `<div id="chat"></div>`;
			printMessages();
			setSillyTavernContext({
				chat,
				deleteMessage,
				printMessages,
				saveChat,
			});
			const firstNativeEditClick = vi.fn();
			document
				.querySelector('.mes[mesid="0"] .mes_edit')
				?.addEventListener("click", firstNativeEditClick);
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 1,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 2,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const moreDialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(moreDialog).getByRole("button", {
					name: "Edit message",
				}),
			);
			frame.flushFrames();

			const editDialog = await screen.findByRole("dialog", {
				name: "Edit Message",
			});
			const messageTextarea =
				within(editDialog).getByLabelText("Message text");
			fireEvent.change(messageTextarea, {
				target: { value: "Copied draft body" },
			});

			fireEvent.click(
				within(editDialog).getByRole("button", {
					name: "Copy this message",
				}),
			);
			await waitFor(() => {
				expect(chat).toHaveLength(3);
			});
			expect(chat[1].mes).toBe("Copied draft body");
			expect(chat[1].swipes[1]).toBe("Copied draft body");
			expect(printMessages).toHaveBeenCalledTimes(2);
			expect(firstNativeEditClick).not.toHaveBeenCalled();
			expect(
				screen.getByRole("dialog", { name: "Edit Message" }),
			).toBeInTheDocument();

			fireEvent.click(
				within(
					screen.getByRole("dialog", { name: "Edit Message" }),
				).getByRole("button", {
					name: "Move message down",
				}),
			);
			await waitFor(() => {
				expect(
					within(
						screen.getByRole("dialog", { name: "Edit Message" }),
					).getByLabelText("Message text"),
				).toHaveValue("Copied draft body");
			});
			expect(chat[1].mes).toBe("First message");
			expect(chat[0].mes).toBe("Copied draft body");
			expect(saveChat).toHaveBeenCalledTimes(2);

			fireEvent.click(
				within(
					screen.getByRole("dialog", { name: "Edit Message" }),
				).getByRole("button", {
					name: "Delete message and all swipes",
				}),
			);
			frame.flushFrames();
			expect(
				document.getElementById("mobile-message-edit-drawer"),
			).toHaveAttribute("data-state", "closed");
			const deleteConfirmDialog = await screen.findByRole("dialog", {
				name: "Delete message",
			});
			expect(deleteConfirmDialog).toBeInTheDocument();
			expect(
				deleteConfirmDialog.querySelector(
					'.astra-messageDeleteConfirmationDrawer__messagePreview.mes[data-astra-message-preview="true"] .mes_text',
				),
			).toHaveTextContent("First message");
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("keeps the edit drawer stable while moving a message during delayed chat redraw", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			const chat = [
				{
					is_system: false,
					is_user: false,
					mes: "First message",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["First message", "First alternate"],
				},
				{
					is_system: false,
					is_user: false,
					mes: "Second message",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Second message"],
				},
			];
			const renderChat = () => {
				document.getElementById("chat")!.innerHTML = chat
					.map(
						(message, index) => `
							<div class="mes" mesid="${index}" is_user="${String(message.is_user)}" is_system="${String(message.is_system)}">
								<div class="mesAvatarWrapper">
									<div class="avatar"><img src="/assistant-avatar.png" /></div>
									<div class="mesIDDisplay">#${index}</div>
								</div>
								<div class="mes_block">
									<div class="ch_name">${message.name}</div>
									<div class="mes_buttons">
										<button type="button" class="mes_edit"></button>
									</div>
									<div class="mes_text"><p>${message.mes}</p></div>
								</div>
							</div>
						`,
					)
					.join("");
			};
			let finishRedraw: (() => void) | null = null;
			const printMessages = vi.fn(() => {
				document.getElementById("chat")!.innerHTML = "";
				return new Promise<void>((resolve) => {
					finishRedraw = () => {
						renderChat();
						resolve();
					};
				});
			});
			const saveChat = vi.fn(async () => undefined);
			document.body.innerHTML += `<div id="chat"></div>`;
			renderChat();
			setSillyTavernContext({
				chat,
				printMessages,
				saveChat,
			});
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 2,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const moreDialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(moreDialog).getByRole("button", {
					name: "Edit message",
				}),
			);
			frame.flushFrames();

			const editDialog = await screen.findByRole("dialog", {
				name: "Edit Message",
			});
			const readStartActionLabels = (group: HTMLElement) =>
				within(group)
					.getAllByRole("button")
					.map((button) => button.getAttribute("aria-label"));
			const startGroup = document.getElementById(
				"mobile-message-edit-drawer-extra-actions-start",
			) as HTMLElement;
			const deleteSwipeButton = within(startGroup).getByRole("button", {
				name: "Delete current swipe",
			});
			const startActionLabels = readStartActionLabels(startGroup);
			expect(startActionLabels).toEqual([
				"Delete current swipe",
				"Delete message and all swipes",
				"Copy this message",
				"Add reasoning block",
			]);
			const messageTextarea =
				within(editDialog).getByLabelText("Message text");
			fireEvent.change(messageTextarea, {
				target: { value: "Unsaved first draft" },
			});

			fireEvent.click(
				within(editDialog).getByRole("button", {
					name: "Move message down",
				}),
			);
			await Promise.resolve();
			expect(chat.map((message) => message.mes)).toEqual([
				"Second message",
				"First message",
			]);
			expect(printMessages).toHaveBeenCalledTimes(1);
			expect(document.querySelectorAll("#chat .mes")).toHaveLength(0);

			frame.flushFrames();

			const stableDialog = screen.getByRole("dialog", {
				name: "Edit Message",
			});
			const stableStartGroup = document.getElementById(
				"mobile-message-edit-drawer-extra-actions-start",
			) as HTMLElement;
			expect(stableDialog).toBe(editDialog);
			expect(stableStartGroup).toBe(startGroup);
			expect(readStartActionLabels(stableStartGroup)).toEqual(
				startActionLabels,
			);
			expect(
				within(stableStartGroup).getByRole("button", {
					name: "Delete current swipe",
				}),
			).toBe(deleteSwipeButton);
			expect(stableDialog).not.toHaveAttribute("data-state", "closed");
			expect(
				within(stableDialog).getByLabelText("Message text"),
			).toHaveValue("Unsaved first draft");
			expect(
				within(stableDialog).getByRole("button", {
					name: "Move message down",
				}),
			).toBeDisabled();

			expect(finishRedraw).toEqual(expect.any(Function));
			await act(async () => {
				finishRedraw?.();
				await Promise.resolve();
			});
			frame.flushFrames();

			await waitFor(() => {
				expect(saveChat).toHaveBeenCalledTimes(1);
			});
			const updatedDialog = screen.getByRole("dialog", {
				name: "Edit Message",
			});
			const updatedStartGroup = document.getElementById(
				"mobile-message-edit-drawer-extra-actions-start",
			) as HTMLElement;
			expect(updatedDialog).toBe(editDialog);
			expect(updatedStartGroup).toBe(startGroup);
			expect(readStartActionLabels(updatedStartGroup)).toEqual(
				startActionLabels,
			);
			expect(
				within(updatedStartGroup).getByRole("button", {
					name: "Delete current swipe",
				}),
			).toBe(deleteSwipeButton);
			expect(
				within(updatedDialog).getByLabelText("Message text"),
			).toHaveValue("Unsaved first draft");
			expect(
				within(updatedDialog).getByLabelText("Message: 1"),
			).toBeInTheDocument();
			expect(
				within(updatedDialog).getByRole("button", {
					name: "Move message down",
				}),
			).toBeDisabled();
			expect(
				within(updatedDialog).getByRole("button", {
					name: "Move message up",
				}),
			).toBeEnabled();
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("renders the live message preview when the edit drawer opens swipe deletion confirmation", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
	                <div id="chat">
	                    <div class="mes" mesid="0" is_user="false" is_system="false">
	                        <div class="mesAvatarWrapper">
	                            <div class="avatar"><img src="/assistant-avatar.png" /></div>
	                            <div class="mesIDDisplay">#0</div>
	                        </div>
	                        <div class="mes_block">
	                            <div class="ch_name">Assistant</div>
	                            <div class="mes_buttons">
	                                <button type="button" class="mes_edit"></button>
	                            </div>
	                            <div class="mes_text"><p>Edit swipe delete target body</p></div>
	                        </div>
	                    </div>
	                </div>
	            `;
			setSillyTavernContext({
				chat: [
					{
						is_system: false,
						is_user: false,
						mes: "Raw text should not render",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["First swipe", "Raw text should not render"],
					},
				],
				deleteMessage: vi.fn(async () => undefined),
			});
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 1,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 2,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const moreDialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(moreDialog).getByRole("button", {
					name: "Edit message",
				}),
			);
			frame.flushFrames();

			const editDialog = await screen.findByRole("dialog", {
				name: "Edit Message",
			});
			fireEvent.click(
				within(editDialog).getByRole("button", {
					name: "Delete current swipe",
				}),
			);
			frame.flushFrames();

			const deleteConfirmDialog = await screen.findByRole("dialog", {
				name: "Delete current swipe",
			});
			expect(
				deleteConfirmDialog.querySelector(
					'.astra-messageDeleteConfirmationDrawer__messagePreview.mes[data-astra-message-preview="true"] .mes_text',
				),
			).toHaveTextContent("Edit swipe delete target body");
			expect(
				within(deleteConfirmDialog).queryByText(
					"Raw text should not render",
				),
			).toBeNull();
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("runs extra action quick strip actions from the more actions drawer", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		const deleteMessage = vi.fn(async () => undefined);
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
                <div id="chat">
                    <div class="mes" mesid="0" is_user="false" is_system="false">
                        <div class="mesAvatarWrapper">
                            <div class="avatar"><img src="/assistant-avatar.png" /></div>
                            <div class="mesIDDisplay">#0</div>
                        </div>
                        <div class="mes_block">
                            <div class="ch_name">Assistant</div>
                            <div class="mes_buttons">
                                <div class="extraMesButtons">
                                    <button type="button" title="Translate message" class="mes_button mes_translate fa-solid fa-language"></button>
                                    <button type="button" title="Create branch" class="mes_button mes_create_branch fa-regular fa-code-branch"></button>
                                </div>
                            </div>
                            <div class="mes_text"><p>Quick action target body</p></div>
                        </div>
                    </div>
                </div>
            `;
			setSillyTavernContext({
				chat: [
					{
						is_system: false,
						is_user: false,
						mes: "Quick action target body",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["First swipe", "Second swipe"],
					},
				],
				deleteMessage,
			});
			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const translateButton = message.querySelector(".mes_translate")!;
			const translatePointerUp = vi.fn();
			const translateClick = vi.fn();
			translateButton.addEventListener("pointerup", translatePointerUp);
			translateButton.addEventListener("click", translateClick);
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 1,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 2,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const nativeDialog = await openMoreActionsDrawerForMessage(message);
			const quickStrip = document.getElementById(
				"mobile-message-more-actions-drawer-extra-actions-content",
			);
			expect(
				within(quickStrip as HTMLElement)
					.getAllByRole("button")
					.map((button) => button.getAttribute("aria-label")),
			).toEqual([
				"Delete current swipe",
				"Delete message and all swipes",
				"Translate message",
				"Create branch",
			]);
			fireEvent.click(
				within(nativeDialog).getByRole("button", {
					name: "Translate message",
				}),
			);
			expect(translatePointerUp).toHaveBeenCalledTimes(1);
			expect(translateClick).toHaveBeenCalledTimes(1);
			expect(nativeDialog).toHaveAttribute("data-state", "closed");
			expect(
				screen.getByRole("dialog", { name: "Message Actions" }),
			).toBe(nativeDialog);
			await waitForDrawerExitAnimation();
			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();

			const deleteDialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(deleteDialog).getByRole("button", {
					name: "Delete current swipe",
				}),
			);

			expect(deleteDialog).toHaveAttribute("data-state", "closed");
			expect(
				screen.queryByRole("dialog", {
					name: "Delete current swipe",
				}),
			).toBeNull();
			frame.flushFrames();

			expect(
				await screen.findByRole("dialog", {
					name: "Delete current swipe",
				}),
			).toBeInTheDocument();
			expect(deleteMessage).not.toHaveBeenCalled();
			await waitForDrawerExitAnimation();
			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("renders prompt visibility native quick actions with semantic Lucide icons", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
				<style>
					.mes[is_system="false"] .mes_unhide {
						display: none;
					}
				</style>
                <div id="chat">
                    <div class="mes" mesid="0" is_user="false" is_system="false">
                        <div class="mesAvatarWrapper">
                            <div class="avatar"><img src="/assistant-avatar.png" /></div>
                            <div class="mesIDDisplay">#0</div>
                        </div>
                        <div class="mes_block">
                            <div class="ch_name">Assistant</div>
                            <div class="mes_buttons">
                                <div class="extraMesButtons" style="display: none;">
                                    <div title="Exclude message from prompts" class="mes_button mes_hide fa-solid fa-eye-slash"></div>
                                    <div title="Include message in prompts" class="mes_button mes_unhide fa-solid fa-eye"></div>
                                </div>
                            </div>
                            <div class="mes_text"><p>Prompt visibility quick action body</p></div>
                        </div>
                    </div>
                </div>
            `;
			setSillyTavernContext({
				chat: [
					{
						is_system: false,
						is_user: false,
						mes: "Prompt visibility quick action body",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Prompt visibility quick action body"],
					},
				],
			});
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			await openMoreActionsDrawerForMessage(message);
			const quickActionContent = document.getElementById(
				"mobile-message-more-actions-drawer-extra-actions-content",
			);
			const excludeQuickAction = within(
				quickActionContent as HTMLElement,
			).getByRole("button", {
				name: "Exclude message from prompts",
			});

			expect(
				excludeQuickAction.querySelector(".lucide-eye"),
			).toBeInTheDocument();
			expect(
				excludeQuickAction.querySelector(".lucide-eye-off"),
			).toBeNull();
			expect(
				excludeQuickAction.querySelector(".fa-eye-slash"),
			).toBeNull();
		} finally {
			feature?.dispose();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("hands off from the more actions footer to the revision history drawer on the next frame", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
                <div id="chat">
                    <div class="mes" mesid="0" is_user="false" is_system="false">
                        <div class="mesAvatarWrapper">
                            <div class="avatar"><img src="/assistant-avatar.png" /></div>
                            <div class="mesIDDisplay">#0</div>
                        </div>
                        <div class="mes_block">
                            <div class="ch_name">Assistant</div>
                            <div class="mes_text"><p>Original edited</p></div>
                        </div>
                    </div>
                </div>
            `;
			setSillyTavernContext({
				chat: [
					{
						astra_projecta: {
							revisionHistory: {
								roots: [
									{
										active: [0, 0],
										createdAt: 10,
										fullText: "Original",
										kind: "origin",
										mes: "Original",
										parent: [],
										swipes: [
											{
												createdAt: 20,
												fullText: "Original edited",
												kind: "edit",
												mes: " edited",
												parent: [0],
												swipes: [],
											},
										],
									},
								],
							},
						},
						is_system: false,
						is_user: false,
						mes: "Original edited",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Original edited"],
					},
				],
			});
			const historyStore = createHistoryStoreStub([
				{
					avatarUrl: "/assistant-avatar.png",
					hasHistory: true,
					messageDisplayId: "#0",
					messageId: 0,
					senderName: "Assistant",
					swipeIndex: 0,
					swipeTotal: 1,
				},
			]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const dialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(dialog).getByRole("button", {
					name: "Revision history",
				}),
			);

			expect(dialog).toHaveAttribute("data-state", "closed");
			expect(
				screen.queryByRole("dialog", {
					name: "Message Revision History",
				}),
			).toBeNull();
			frame.flushFrames();

			const historyDialog = await screen.findByRole("dialog", {
				name: "Message Revision History",
			});
			expect(
				within(historyDialog).getByText("Assistant"),
			).toBeInTheDocument();
			expect(
				within(historyDialog).getAllByText("Original").length,
			).toBeGreaterThanOrEqual(1);
			expect(
				within(historyDialog).getByText("Edited"),
			).toBeInTheDocument();
			await waitForDrawerExitAnimation();
			expect(
				screen.queryByRole("dialog", { name: "Message Actions" }),
			).toBeNull();
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("hands off from the more actions footer to the message extra actions drawer on the next frame", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
				<style id="astra-extra-actions-hidden-child-test-style">
					.mes[is_system="false"] .mes_unhide {
						display: none;
					}
				</style>
                <div id="chat">
                    <div class="mes" mesid="0" is_user="false" is_system="false" timestamp="January 14, 2026 9:03 PM">
                        <div class="mesAvatarWrapper">
                            <div class="avatar"><img src="/assistant-avatar.png" /></div>
                            <div class="mesIDDisplay">#8</div>
                            <div class="tokenCounterDisplay">321 tokens</div>
                        </div>
                        <div class="mes_block">
                            <div class="ch_name">Assistant</div>
                            <div class="mes_buttons">
                                <div class="extraMesButtons" style="display: none;">
                                    <div title="Translate message" class="mes_button mes_translate fa-solid fa-language"></div>
                                    <div title="Create branch" class="mes_button mes_create_branch fa-regular fa-code-branch"></div>
                                    <div title="Include message in prompts" class="mes_button mes_unhide fa-solid fa-eye"></div>
                                </div>
                            </div>
                            <div class="mes_text"><p>Extra drawer target body</p></div>
                        </div>
                    </div>
                </div>
            `;
			setSillyTavernContext({
				Popup: {
					show: {
						confirm: vi.fn(async () => true),
					},
				},
				chat: [
					{
						is_system: false,
						is_user: false,
						mes: "Stale raw context should not render",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["First swipe", "Second swipe"],
					},
				],
				deleteMessage: vi.fn(async () => undefined),
			});
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			message.querySelector(".mes_text")!.innerHTML =
				"<p>Latest rendered first line</p><p>Latest rendered second line</p><p>Latest rendered third line</p><p>Latest rendered fourth line</p>";
			const moreDialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(moreDialog).getByRole("button", {
					name: "More actions",
				}),
			);

			expect(moreDialog).toHaveAttribute("data-state", "closed");
			expect(
				screen.queryByRole("dialog", {
					name: "More Message Actions",
				}),
			).toBeNull();
			frame.flushFrames();

			const extraDialog = await screen.findByRole("dialog", {
				name: "More Message Actions",
			});
			const extraHeader = document.getElementById(
				"mobile-message-extra-actions-drawer-header",
			);
			const extraHeading = document.getElementById(
				"mobile-message-extra-actions-drawer-heading",
			);
			const headingPreview = extraHeading?.querySelector(
				".astra-messageExtraActionsDrawer__messagePreview",
			);
			expect(extraHeader).toBeInTheDocument();
			expect(extraHeading).toBeInTheDocument();
			expect(extraHeading).toHaveClass(
				"astra-chat-library-dialog-meta",
				"astra-messageExtraActionsDrawer__messageMeta",
			);
			expect(extraHeading).not.toHaveClass(
				"astra-messageExtraActionsDrawer__heading",
			);
			expect(extraHeader?.nextElementSibling).toBe(extraHeading);
			expect(
				within(extraHeader as HTMLElement).getByText("Assistant"),
			).toBeInTheDocument();
			expect(
				within(extraHeader as HTMLElement).queryByText(
					"January 14, 2026 9:03 PM",
				),
			).toBeNull();
			expect(
				within(extraHeader as HTMLElement).getByLabelText("Message: 8"),
			).toHaveTextContent("8");
			expect(
				within(extraHeader as HTMLElement).getByLabelText(
					"Message tokens: 321 tokens",
				),
			).toHaveTextContent("321 tokens");
			expect(headingPreview).toHaveTextContent(
				"Latest rendered first line Latest rendered second line Latest rendered third line Latest rendered fourth line",
			);
			expect(
				within(extraHeading as HTMLElement).queryByText(
					"Stale raw context should not render",
				),
			).toBeNull();
			expect(
				within(extraDialog).getByText("Danger zone"),
			).toBeInTheDocument();
			expect(
				within(extraDialog).getByText("Message actions"),
			).toBeInTheDocument();
			expect(
				within(extraDialog).getByRole("button", {
					name: "Translate message",
				}),
			).toBeInTheDocument();
			expect(
				within(extraDialog).getByRole("button", {
					name: "Create branch",
				}),
			).toBeInTheDocument();
			expect(
				within(extraDialog).queryByRole("button", {
					name: "Include message in prompts",
				}),
			).toBeNull();
			expect(
				within(extraDialog).getByRole("button", {
					name: "Delete current swipe",
				}),
			).not.toBeDisabled();
			await waitForDrawerExitAnimation();
			expect(
				screen.queryByRole("dialog", {
					name: "Message Actions",
				}),
			).toBeNull();
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("opens a confirmation drawer and deletes a whole message from the extra actions drawer", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		const confirm = vi.fn(async () => true);
		const deleteMessage = vi.fn(async () => undefined);
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
                <div id="chat">
                    <div class="mes" mesid="0" is_user="false" is_system="false">
                        <div class="mes_block">
                            <div class="ch_name">Assistant</div>
                            <div class="mes_buttons">
                                <div class="extraMesButtons">
                                    <div title="Translate message" class="mes_button mes_translate fa-solid fa-language"></div>
                                </div>
                            </div>
                            <div class="mes_text"><p>Delete target body</p></div>
                        </div>
                    </div>
                </div>
            `;
			setSillyTavernContext({
				Popup: {
					show: {
						confirm,
					},
				},
				chat: [
					{
						is_system: false,
						is_user: false,
						mes: "Delete target body",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["First swipe", "Second swipe"],
					},
				],
				deleteMessage,
			});
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const moreDialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(moreDialog).getByRole("button", {
					name: "More actions",
				}),
			);
			frame.flushFrames();
			const extraDialog = await screen.findByRole("dialog", {
				name: "More Message Actions",
			});

			fireEvent.click(
				within(extraDialog).getByRole("button", {
					name: "Delete message and all swipes",
				}),
			);

			expect(
				screen.queryByRole("dialog", {
					name: "More Message Actions",
				}),
			).toBeNull();
			expect(
				screen.queryByRole("dialog", {
					name: "Delete message",
				}),
			).toBeNull();
			frame.flushFrames();

			const confirmDialog = await screen.findByRole("dialog", {
				name: "Delete message",
			});
			fireEvent.click(
				within(confirmDialog).getByRole("button", {
					name: "Delete message",
				}),
			);

			await waitFor(() => {
				expect(deleteMessage).toHaveBeenCalledWith(0, undefined, false);
			});
			expect(confirm).not.toHaveBeenCalled();
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", {
						name: "Delete message",
					}),
				).toBeNull();
			});
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("opens a confirmation drawer and deletes the current swipe from the extra actions drawer", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		const confirm = vi.fn(async () => true);
		const deleteMessage = vi.fn(async () => undefined);
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
                <div id="chat">
                    <div class="mes" mesid="0" is_user="false" is_system="false">
                        <div class="mes_block">
                            <div class="ch_name">Assistant</div>
                            <div class="mes_buttons">
                                <div class="extraMesButtons">
                                    <div title="Translate message" class="mes_button mes_translate fa-solid fa-language"></div>
                                </div>
                            </div>
                            <div class="mes_text"><p>Swipe delete target body</p></div>
                        </div>
                    </div>
                </div>
            `;
			setSillyTavernContext({
				Popup: {
					show: {
						confirm,
					},
				},
				chat: [
					{
						is_system: false,
						is_user: false,
						mes: "Swipe delete target body",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["First swipe", "Second swipe"],
					},
				],
				deleteMessage,
			});
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const moreDialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(moreDialog).getByRole("button", {
					name: "More actions",
				}),
			);
			frame.flushFrames();
			const extraDialog = await screen.findByRole("dialog", {
				name: "More Message Actions",
			});

			fireEvent.click(
				within(extraDialog).getByRole("button", {
					name: "Delete current swipe",
				}),
			);
			frame.flushFrames();

			const confirmDialog = await screen.findByRole("dialog", {
				name: "Delete current swipe",
			});
			fireEvent.click(
				within(confirmDialog).getByRole("button", {
					name: "Delete current swipe",
				}),
			);

			await waitFor(() => {
				expect(deleteMessage).toHaveBeenCalledWith(0, 1, false);
			});
			expect(confirm).not.toHaveBeenCalled();
			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", {
						name: "Delete current swipe",
					}),
				).toBeNull();
			});
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("closes the swipe deletion confirmation without reopening extra actions when canceled", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		const confirm = vi.fn(async () => true);
		const deleteMessage = vi.fn(async () => undefined);
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
                <div id="chat">
                    <div class="mes" mesid="0" is_user="false" is_system="false">
                        <div class="mes_block">
                            <div class="ch_name">Assistant</div>
                            <div class="mes_buttons">
                                <div class="extraMesButtons">
                                    <div title="Translate message" class="mes_button mes_translate fa-solid fa-language"></div>
                                </div>
                            </div>
                            <div class="mes_text"><p>Swipe delete target body</p></div>
                        </div>
                    </div>
                </div>
            `;
			setSillyTavernContext({
				Popup: {
					show: {
						confirm,
					},
				},
				chat: [
					{
						is_system: false,
						is_user: false,
						mes: "Swipe delete target body",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["First swipe", "Second swipe"],
					},
				],
				deleteMessage,
			});
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const moreDialog = await openMoreActionsDrawerForMessage(message);
			fireEvent.click(
				within(moreDialog).getByRole("button", {
					name: "More actions",
				}),
			);
			frame.flushFrames();
			const extraDialog = await screen.findByRole("dialog", {
				name: "More Message Actions",
			});

			fireEvent.click(
				within(extraDialog).getByRole("button", {
					name: "Delete current swipe",
				}),
			);

			expect(
				screen.queryByRole("dialog", {
					name: "More Message Actions",
				}),
			).toBeNull();
			expect(
				screen.queryByRole("dialog", {
					name: "Delete current swipe",
				}),
			).toBeNull();
			frame.flushFrames();

			const confirmDialog = await screen.findByRole("dialog", {
				name: "Delete current swipe",
			});
			fireEvent.click(
				within(confirmDialog).getByRole("button", {
					name: "Cancel",
				}),
			);

			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", {
						name: "Delete current swipe",
					}),
				).toBeNull();
			});
			expect(confirm).not.toHaveBeenCalled();
			expect(deleteMessage).not.toHaveBeenCalled();
			expect(
				screen.queryByRole("dialog", {
					name: "More Message Actions",
				}),
			).toBeNull();
		} finally {
			feature?.dispose();
			frame.restore();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("closes the more actions drawer when the selected message leaves the chat DOM", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML += `
                <div id="chat">
                    <div class="mes" mesid="0">
                        <div class="mesAvatarWrapper">
                            <div class="avatar"><img src="/assistant-avatar.png" /></div>
                            <div class="mesIDDisplay">#0</div>
                        </div>
                        <div class="mes_block">
                            <div class="ch_name">Assistant</div>
                            <div class="mes_text"><p>Rendered before remove</p></div>
                        </div>
                    </div>
                    <div class="mes" mesid="1">
                        <div class="mes_block"><div class="ch_name">User</div></div>
                    </div>
                </div>
            `;
			setSillyTavernContext({
				chat: [
					{
						is_user: false,
						mes: "Assistant message",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Assistant message"],
					},
					{
						is_user: true,
						mes: "User message",
						name: "User",
						swipe_id: 0,
						swipes: ["User message"],
					},
				],
			});
			const historyStore = createHistoryStoreStub([]);
			const revisionStore = createRevisionStoreStub({
				canContinue: false,
				canRegenerate: false,
				canUndo: false,
				isBusy: false,
				messageId: null,
				status: "idle",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: false,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: null,
				status: "idle",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			const selectedMessage = document.querySelector(
				'.mes[mesid="0"]',
			) as HTMLElement;
			const openedDialog =
				await openMoreActionsDrawerForMessage(selectedMessage);
			expect(openedDialog).toBeInTheDocument();
			expect(
				within(openedDialog).getByText("Rendered before remove"),
			).toBeInTheDocument();

			selectedMessage.remove();
			await Promise.resolve();
			frame.flushFrames();

			await waitFor(() => {
				expect(
					screen.queryByRole("dialog", {
						name: "Message Actions",
					}),
				).toBeNull();
			});
			expect(screen.queryByText("Rendered before remove")).toBeNull();
		} finally {
			feature?.dispose();
			frame.restore();
			resetDefaultLayoutModeStoreForTests();
			setDefaultLayoutModePreferenceReader(() => "auto");
		}
	});

	test("recreates message actions after SillyTavern rebuilds the same message DOM without snapshot changes", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML = `
                <div id="chat">
                    <div class="mes" mesid="0">
                        <div class="mes_block"></div>
                    </div>
                </div>
            `;
			const historyStore = createHistoryStoreStub([
				{
					avatarUrl: "",
					hasHistory: true,
					messageDisplayId: "#0",
					messageId: 0,
					senderName: "Assistant",
					swipeIndex: 0,
					swipeTotal: 1,
				},
			]);
			const revisionStore = createRevisionStoreStub({
				canContinue: true,
				canRegenerate: true,
				canUndo: false,
				isBusy: false,
				messageId: 0,
				status: "ready",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: true,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: 0,
				status: "ready",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createHistoryStore: () => historyStore.store,
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			await waitFor(() => {
				expect(
					document.querySelector('.mes[mesid="0"] .astra-swipePager'),
				).toBeInTheDocument();
			});
			expect(
				document.querySelector('.mes[mesid="0"] .astra-revisionBar'),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Revision history" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "More actions" }),
			).toBeNull();

			historyStore.store.refresh.mockClear();
			revisionStore.store.refresh.mockClear();
			swipeStore.store.refresh.mockClear();
			document.getElementById("chat")!.innerHTML = `
                <div class="mes" mesid="0">
                    <div class="mes_block"></div>
                </div>
            `;
			expect(document.querySelector(".astra-mesActions")).toBeNull();

			await Promise.resolve();
			frame.flushFrames();

			await waitFor(() => {
				expect(
					document.querySelector('.mes[mesid="0"] .astra-swipePager'),
				).toBeInTheDocument();
			});
			expect(
				document.querySelector('.mes[mesid="0"] .astra-revisionBar'),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Revision history" }),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "More actions" }),
			).toBeNull();
			expect(historyStore.store.refresh).toHaveBeenCalledTimes(1);
			expect(revisionStore.store.refresh).toHaveBeenCalledTimes(1);
			expect(swipeStore.store.refresh).toHaveBeenCalledTimes(1);
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("opens revision history from the inline last-message footer button", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0" is_user="false" is_system="false">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_text"><p>Edited</p></div>
                    </div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					astra_projecta: {
						revisionHistory: {
							roots: [
								{
									active: [0, 0],
									fullText: "Original",
									kind: "origin",
									mes: "Original",
									swipes: [
										{
											fullText: "Edited",
											kind: "edit",
											mes: "Edited",
											parent: [0],
										},
									],
								},
							],
						},
					},
					is_system: false,
					is_user: false,
					mes: "Edited",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["Edited"],
				},
			],
		});
		const historyStore = createHistoryStoreStub([
			{
				avatarUrl: "",
				hasHistory: true,
				messageDisplayId: "#0",
				messageId: 0,
				senderName: "Assistant",
				swipeIndex: 0,
				swipeTotal: 1,
			},
		]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		try {
			feature.mount();

			const historyButton = await screen.findByRole("button", {
				name: "Revision history",
			});
			expect(historyButton.closest(".astra-revisionBar")).toBe(
				document.querySelector('.mes[mesid="0"] .astra-revisionBar'),
			);
			expect(
				document.querySelector(".astra-mesActions__historyHost"),
			).toBeNull();

			fireEvent.click(historyButton);

			const historyDialog = await screen.findByRole("dialog", {
				name: "Message Revision History",
			});
			expect(historyDialog).toHaveAttribute(
				"id",
				"mobile-message-revision-history-dialog",
			);
			expect(
				within(historyDialog).getByText("Assistant"),
			).toBeInTheDocument();
			expect(
				within(historyDialog).getAllByText("Edited").length,
			).toBeGreaterThan(0);
		} finally {
			feature.dispose();
			delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
		}
	});

	test("stops observing chat DOM rebuilds after unmount", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMobileMessageActionsFeature
		> | null = null;

		try {
			document.body.innerHTML = `
                <div id="chat">
                    <div class="mes" mesid="0">
                        <div class="mes_block"></div>
                    </div>
                </div>
            `;
			const revisionStore = createRevisionStoreStub({
				canContinue: true,
				canRegenerate: true,
				canUndo: false,
				isBusy: false,
				messageId: 0,
				status: "ready",
				updatedAt: 0,
			});
			const swipeStore = createSwipeStoreStub({
				canSwipeNext: true,
				canSwipePrevious: false,
				currentIndex: 0,
				isNativeSwipeBusy: false,
				messageId: 0,
				status: "ready",
				total: 1,
				updatedAt: 0,
			});
			feature = createMobileMessageActionsFeature({
				createRevisionStore: () => revisionStore.store,
				createSwipeStore: () => swipeStore.store,
				documentRef: document,
			});

			feature.mount();

			await waitFor(() => {
				expect(
					document.querySelector('.mes[mesid="0"] .astra-swipePager'),
				).toBeInTheDocument();
			});

			feature.unmount();
			frame.requestAnimationFrame.mockClear();
			document.getElementById("chat")!.innerHTML = `
                <div class="mes" mesid="0">
                    <div class="mes_block"></div>
                </div>
            `;

			await Promise.resolve();
			frame.flushFrames();

			expect(frame.requestAnimationFrame).not.toHaveBeenCalled();
			expect(document.querySelector(".astra-mesActions")).toBeNull();
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("opens a selectable current-swipe revision history drawer body from the more drawer footer", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/user-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block"><div class="ch_name">User</div><div class="mes_text">User alternate edited</div></div>
                </div>
                <div class="mes" mesid="1">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/plain-avatar.png" /></div>
                        <div class="mesIDDisplay">#1</div>
                    </div>
                    <div class="mes_block"><div class="ch_name">Plain</div><div class="mes_text">Plain message</div></div>
                </div>
            </div>
        `;
		const saveChatConditional = vi.fn();
		const eventSource = { emit: vi.fn() };
		const chat = [
			{
				continueHistory: [
					{
						active: [0],
						createdAt: 10,
						fullText: "User first",
						kind: "origin",
						mes: "User first",
						parent: [],
						swipes: [],
					},
					{
						active: [1, 0],
						createdAt: 20,
						fullText: "User alternate",
						kind: "origin",
						mes: "User alternate",
						parent: [],
						swipes: [
							{
								createdAt: 30,
								fullText: "User alternate edited",
								kind: "edit",
								mes: " edited",
								parent: [1],
								swipes: [],
							},
						],
					},
				],
				is_user: true,
				mes: "User alternate edited",
				name: "User",
				swipe_id: 1,
				swipes: ["User first", "User alternate edited"],
			},
		];
		setSillyTavernContext({
			chat,
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_SWIPED: "message_swiped",
			},
			messageFormatting: (value: string) => value,
			saveChatConditional,
			substituteParams: (value: string) => value,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const historyStore = createHistoryStoreStub([
			{
				avatarUrl: "/user-avatar.png",
				hasHistory: true,
				messageDisplayId: "#0",
				messageId: 0,
				senderName: "User",
				swipeIndex: 1,
				swipeTotal: 2,
			},
		]);
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		const historyMessage = document.querySelector(
			'.mes[mesid="0"]',
		) as HTMLElement;
		const plainMessage = document.querySelector(
			'.mes[mesid="1"]',
		) as HTMLElement;
		expect(
			historyMessage.querySelector(".astra-mesActions__historyHost"),
		).toBeNull();
		expect(
			historyMessage.querySelector(".astra-mesActions__moreHost"),
		).toBeNull();
		expect(
			plainMessage.querySelector(".astra-mesActions__historyHost"),
		).toBeNull();
		expect(
			plainMessage.querySelector(".astra-mesActions__moreHost"),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Revision history" }),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "More actions" }),
		).toBeNull();

		const moreDialog =
			await openMoreActionsDrawerForMessage(historyMessage);
		fireEvent.click(
			within(moreDialog).getByRole("button", {
				name: "Revision history",
			}),
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Message Revision History",
		});
		const title = document.getElementById(
			"mobile-message-revision-history-dialog-title",
		);
		const description = document.getElementById(
			"mobile-message-revision-history-dialog-description",
		);

		expect(dialog).toHaveAttribute(
			"id",
			"mobile-message-revision-history-dialog",
		);
		const labelledBy = dialog.getAttribute("aria-labelledby");
		const describedBy = dialog.getAttribute("aria-describedby");
		expect(labelledBy).toBeTruthy();
		expect(labelledBy).not.toBe(
			"mobile-message-revision-history-dialog-title",
		);
		expect(document.getElementById(labelledBy ?? "")).toHaveClass(
			"astra-dialog-title",
		);
		expect(describedBy).toBeTruthy();
		expect(describedBy).not.toBe(
			"mobile-message-revision-history-dialog-description",
		);
		expect(document.getElementById(describedBy ?? "")).toHaveClass(
			"astra-dialog-description",
		);
		expect(title).toHaveClass("astra-dialog-title");
		expect(description).toHaveClass("astra-dialog-description");
		expect(dialog).toHaveClass("astra-drawer-surface");
		const dialogBody = dialog.querySelector(".astra-dialog-body");
		expect(dialogBody).toBeInTheDocument();
		expect(
			dialogBody?.querySelector('[data-astra-component="ScrollArea"]'),
		).toHaveClass("astra-dialog-body__scroll-root");
		expect(
			dialogBody?.querySelector('[data-slot="scroll-area-viewport"]'),
		).toHaveClass("astra-dialog-body__viewport");
		expect(
			dialogBody?.querySelector('[data-slot="scroll-area-content"]'),
		).toHaveClass("astra-dialog-content");
		expect(
			dialogBody?.querySelector('[data-slot="scroll-area-scrollbar"]'),
		).toHaveClass("astra-dialog-body__scrollbar");
		expect(
			dialogBody?.querySelector('[data-slot="scroll-area-thumb"]'),
		).toHaveClass("astra-dialog-body__thumb");
		expect(
			dialogBody
				?.querySelector('[data-slot="scroll-area-thumb"]')
				?.closest(".astra-dialog-body"),
		).toBe(dialogBody);
		expect(within(dialog).getByText("User")).toBeInTheDocument();
		expect(within(dialog).getByText("0")).toBeInTheDocument();
		expect(within(dialog).queryByText("#0")).toBeNull();
		expect(within(dialog).getByText("2")).toBeInTheDocument();
		expect(
			within(dialog).getByRole("tree", {
				name: "Revision history entries",
			}),
		).toBeInTheDocument();
		expect(within(dialog).getAllByText("Original")).toHaveLength(1);
		expect(within(dialog).queryByText("Swipe")).toBeNull();
		expect(within(dialog).queryByText("User first")).toBeNull();
		expect(within(dialog).getByText("Edited")).toBeInTheDocument();
		expect(within(dialog).getByText("User alternate")).toBeInTheDocument();
		expect(within(dialog).queryByText("User alternate edited")).toBeNull();
		const modeOptions = dialog.querySelectorAll(
			".astra-revisionHistoryDrawer__modeOption",
		);
		expect(modeOptions).toHaveLength(2);
		expect(modeOptions[0]).toHaveTextContent("Expand text");
		expect(modeOptions[1]).toHaveTextContent("Include unchanged text");
		expect(
			within(dialog).getByRole("checkbox", {
				name: "Include unchanged text",
			}),
		).toHaveAttribute(
			"id",
			"mobile-message-revision-history-dialog-include-unchanged-text-toggle",
		);
		expect(
			within(dialog).getByRole("checkbox", {
				name: "Expand text",
			}),
		).toHaveAttribute(
			"id",
			"mobile-message-revision-history-dialog-expand-text-toggle",
		);
		expect(
			within(dialog).getByRole("checkbox", {
				name: "Include unchanged text",
			}),
		).not.toBeChecked();
		expect(
			within(dialog).getByRole("checkbox", {
				name: "Expand text",
			}),
		).not.toBeChecked();
		expect(
			within(dialog).getByRole("treeitem", {
				name: /Edited.* edited/s,
			}),
		).toBeInTheDocument();
		expect(
			dialog.querySelector(
				'.astra-revisionHistoryTreeNode__textWrapper[data-full-text="true"]',
			),
		).toBeNull();
		fireEvent.click(
			within(dialog).getByRole("checkbox", {
				name: "Expand text",
			}),
		);
		expect(
			dialog.querySelector(
				'.astra-revisionHistoryTreeNode__textWrapper[data-full-text="true"]',
			),
		).toBeInTheDocument();
		fireEvent.click(
			within(dialog).getByRole("checkbox", {
				name: "Include unchanged text",
			}),
		);
		expect(
			within(dialog).getAllByText("User alternate edited").length,
		).toBeGreaterThanOrEqual(1);
		fireEvent.click(
			within(dialog).getByRole("treeitem", {
				name: /Original.*User alternate/s,
			}),
		);
		expect(chat[0].mes).toBe("User alternate");
		expect(chat[0].swipes[1]).toBe("User alternate");
		expect(readAstraRevisionRoots(chat[0])[1]?.active).toEqual([1]);
		expect(chat[0].continueHistory[1].active).toEqual([1, 0]);
		expect(saveChatConditional).toHaveBeenCalledTimes(1);
		expect(eventSource.emit).toHaveBeenCalledWith("message_swiped", 0);
		expect(eventSource.emit).toHaveBeenCalledWith("message_edited", 0);
		fireEvent.click(
			within(dialog).getByRole("treeitem", {
				name: /Edited.*User alternate edited/s,
			}),
		);
		expect(chat[0].mes).toBe("User alternate edited");
		expect(readAstraRevisionRoots(chat[0])[1]?.active).toEqual([1, 0]);
		expect(saveChatConditional).toHaveBeenCalledTimes(2);
		const activeSwipeRow = within(dialog).getByRole("treeitem", {
			name: /Original.*User alternate/s,
		});
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Collapse all" }),
		);
		expect(activeSwipeRow).toHaveAttribute("aria-expanded", "false");
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Expand all" }),
		);
		expect(activeSwipeRow).toHaveAttribute("aria-expanded", "true");
		expect(
			dialog.querySelector(".astra-dialog-footer"),
		).toBeInTheDocument();
		expect(
			within(dialog).getByRole("button", { name: "Done" }),
		).toBeInTheDocument();

		feature.unmount();

		await waitFor(() => {
			expect(
				document.querySelector(".astra-mesActions__historyHost"),
			).toBeNull();
		});
		expect(screen.queryByRole("dialog")).toBeNull();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("shows compact changed text before unchanged text is included", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block"><div class="ch_name">Assistant</div><div class="mes_text">User blue tail</div></div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					continueHistory: [
						{
							active: [0, 0],
							createdAt: 10,
							fullText: "User red tail",
							kind: "origin",
							mes: "User red tail",
							parent: [],
							swipes: [
								{
									createdAt: 20,
									fullText: "User blue tail",
									kind: "edit",
									mes: "blue tail",
									parent: [0],
									swipes: [],
								},
							],
						},
					],
					is_user: false,
					mes: "User blue tail",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["User blue tail"],
				},
			],
			eventSource: { emit: vi.fn() },
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_SWIPED: "message_swiped",
			},
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const historyStore = createHistoryStoreStub([
			{
				avatarUrl: "/assistant-avatar.png",
				hasHistory: true,
				messageDisplayId: "#0",
				messageId: 0,
				senderName: "Assistant",
				swipeIndex: 0,
				swipeTotal: 1,
			},
		]);
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();
		const message = document.querySelector(
			'.mes[mesid="0"]',
		) as HTMLElement;
		const dialog = await openRevisionHistoryDrawerForMessage(message);
		expect(within(dialog).getByText("blue")).toBeInTheDocument();
		expect(within(dialog).queryByText("blue tail")).toBeNull();
		expect(within(dialog).queryByText("User blue tail")).toBeNull();

		fireEvent.click(
			within(dialog).getByRole("checkbox", {
				name: "Include unchanged text",
			}),
		);
		expect(within(dialog).getByText("User blue tail")).toBeInTheDocument();

		feature.unmount();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("remembers revision history drawer display preferences in browser storage", async () => {
		window.localStorage.setItem(
			"astra_projecta.message_revision_history.show_full_text",
			"true",
		);
		window.localStorage.setItem(
			"astra_projecta.message_revision_history.include_unchanged_text",
			"true",
		);
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block"><div class="ch_name">Assistant</div><div class="mes_text">User blue tail</div></div>
                </div>
            </div>
        `;
		setSillyTavernContext({
			chat: [
				{
					continueHistory: [
						{
							active: [0, 0],
							createdAt: 10,
							fullText: "User red tail",
							kind: "origin",
							mes: "User red tail",
							parent: [],
							swipes: [
								{
									createdAt: 20,
									fullText: "User blue tail",
									kind: "edit",
									mes: "blue tail",
									parent: [0],
									swipes: [],
								},
							],
						},
					],
					is_user: false,
					mes: "User blue tail",
					name: "Assistant",
					swipe_id: 0,
					swipes: ["User blue tail"],
				},
			],
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const historyStore = createHistoryStoreStub([
			{
				avatarUrl: "/assistant-avatar.png",
				hasHistory: true,
				messageDisplayId: "#0",
				messageId: 0,
				senderName: "Assistant",
				swipeIndex: 0,
				swipeTotal: 1,
			},
		]);
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();
		const message = document.querySelector(
			'.mes[mesid="0"]',
		) as HTMLElement;
		const dialog = await openRevisionHistoryDrawerForMessage(message);
		const expandTextToggle = within(dialog).getByRole("checkbox", {
			name: "Expand text",
		});
		const includeUnchangedToggle = within(dialog).getByRole("checkbox", {
			name: "Include unchanged text",
		});
		expect(expandTextToggle).toBeChecked();
		expect(includeUnchangedToggle).toBeChecked();

		fireEvent.click(expandTextToggle);
		fireEvent.click(includeUnchangedToggle);

		expect(
			window.localStorage.getItem(
				"astra_projecta.message_revision_history.show_full_text",
			),
		).toBe("false");
		expect(
			window.localStorage.getItem(
				"astra_projecta.message_revision_history.include_unchanged_text",
			),
		).toBe("false");

		feature.unmount();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("opens native swipe-only revision history for the current swipe row", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_text">Second swipe</div>
                    </div>
                </div>
            </div>
        `;
		const saveChatConditional = vi.fn();
		const eventSource = { emit: vi.fn() };
		const chat = [
			{
				is_user: false,
				mes: "Second swipe",
				name: "Assistant",
				swipe_id: 1,
				swipes: ["First swipe", "Second swipe"],
			},
		];
		setSillyTavernContext({
			chat,
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_SWIPED: "message_swiped",
			},
			messageFormatting: (value: string) => value,
			saveChatConditional,
			substituteParams: (value: string) => value,
		});
		const historyStore = createHistoryStoreStub([
			{
				avatarUrl: "/assistant-avatar.png",
				hasHistory: true,
				messageDisplayId: "#0",
				messageId: 0,
				senderName: "Assistant",
				swipeIndex: 1,
				swipeTotal: 2,
			},
		]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		const message = document.querySelector(
			'.mes[mesid="0"]',
		) as HTMLElement;
		const dialog = await openRevisionHistoryDrawerForMessage(message);

		expect(within(dialog).getAllByText("Original")).toHaveLength(1);
		expect(within(dialog).queryByText("Swipe")).toBeNull();
		expect(within(dialog).queryByText("First swipe")).toBeNull();
		expect(
			within(dialog).getByRole("treeitem", {
				name: /Original.*Second swipe/s,
			}),
		).toBeInTheDocument();

		expect(chat[0].mes).toBe("Second swipe");
		expect(chat[0].swipe_id).toBe(1);
		expect(saveChatConditional).not.toHaveBeenCalled();
		expect(eventSource.emit).not.toHaveBeenCalled();

		feature.unmount();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("renders root regenerated versions beside the original row", async () => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMatchMedia(true);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		document.body.innerHTML += `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_text">Regenerated root Continued</div>
                    </div>
                </div>
            </div>
        `;
		const saveChatConditional = vi.fn();
		const eventSource = { emit: vi.fn() };
		const chat = [
			{
				continueHistory: [
					{
						active: [0, 0, 0],
						createdAt: 10,
						fullText: "Root",
						kind: "origin",
						mes: "Root",
						parent: [],
						swipes: [
							{
								createdAt: 20,
								fullText: "Regenerated root",
								kind: "regenerate",
								mes: "Regenerated root",
								parent: [0],
								swipes: [
									{
										createdAt: 30,
										fullText: "Regenerated root Continued",
										kind: "continue",
										mes: " Continued",
										parent: [0, 0],
										swipes: [],
									},
								],
							},
						],
					},
				],
				is_user: false,
				mes: "Regenerated root Continued",
				name: "Assistant",
				swipe_id: 0,
				swipes: ["Regenerated root Continued"],
			},
		];
		setSillyTavernContext({
			chat,
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_SWIPED: "message_swiped",
			},
			messageFormatting: (value: string) => value,
			saveChatConditional,
			substituteParams: (value: string) => value,
		});
		const historyStore = createHistoryStoreStub([
			{
				avatarUrl: "/assistant-avatar.png",
				hasHistory: true,
				messageDisplayId: "#0",
				messageId: 0,
				senderName: "Assistant",
				swipeIndex: 0,
				swipeTotal: 1,
			},
		]);
		const revisionStore = createRevisionStoreStub({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 0,
		});
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		const message = document.querySelector(
			'.mes[mesid="0"]',
		) as HTMLElement;
		const dialog = await openRevisionHistoryDrawerForMessage(message);
		const nativeSwipeRow = within(dialog).getByRole("treeitem", {
			name: /Original.*Root/s,
		});
		const regeneratedRow = within(dialog).getByRole("treeitem", {
			name: /Regenerated.*Regenerated root/s,
		});
		const continuedRow = within(dialog).getByRole("treeitem", {
			name: /Continued.*Continued/s,
		});

		expect(nativeSwipeRow).toHaveAttribute("aria-level", "1");
		expect(regeneratedRow).toHaveAttribute("aria-level", "1");
		expect(continuedRow).toHaveAttribute("aria-level", "2");
		expect(nativeSwipeRow.closest("li")).toHaveAttribute(
			"data-used",
			"false",
		);
		expect(regeneratedRow.closest("li")).toHaveAttribute(
			"data-used",
			"true",
		);
		const usedCheckboxes = within(dialog).getAllByRole("checkbox", {
			name: "Currently included in this message",
		});
		expect(usedCheckboxes).toHaveLength(2);
		usedCheckboxes.forEach((checkbox) => {
			expect(checkbox).toBeChecked();
			expect(checkbox).toBeDisabled();
		});
		const applyRootCheckbox = within(dialog).getByRole("checkbox", {
			name: "Apply message up to this segment",
		});
		expect(applyRootCheckbox).not.toBeChecked();
		expect(applyRootCheckbox).toBeEnabled();

		fireEvent.click(applyRootCheckbox);
		expect(chat[0].mes).toBe("Root");
		expect(chat[0].swipes[0]).toBe("Root");
		expect(readAstraRevisionRoots(chat[0])[0]?.active).toEqual([0]);
		expect(chat[0].continueHistory[0].active).toEqual([0, 0, 0]);

		fireEvent.click(
			within(dialog).getByRole("treeitem", {
				name: /Regenerated.*Regenerated root/s,
			}),
		);
		expect(chat[0].mes).toBe("Regenerated root");
		expect(chat[0].swipes[0]).toBe("Regenerated root");
		expect(readAstraRevisionRoots(chat[0])[0]?.active).toEqual([0, 0]);
		expect(saveChatConditional).toHaveBeenCalledTimes(2);
		fireEvent.click(
			within(dialog).getByRole("treeitem", {
				name: /Continued.*Continued/s,
			}),
		);
		expect(chat[0].mes).toBe("Regenerated root Continued");
		expect(chat[0].swipes[0]).toBe("Regenerated root Continued");
		expect(readAstraRevisionRoots(chat[0])[0]?.active).toEqual([0, 0, 0]);
		expect(saveChatConditional).toHaveBeenCalledTimes(3);

		feature.unmount();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("renders message actions only when snapshots target the last message and no-ops when idle", async () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block"></div>
                </div>
                <div class="mes" mesid="1">
                    <div class="mes_block"></div>
                </div>
            </div>
        `;
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: true,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: 0,
			status: "ready",
			total: 1,
			updatedAt: 0,
		});
		const revisionStore = createRevisionStoreStub({
			canContinue: true,
			canRegenerate: true,
			canUndo: false,
			isBusy: false,
			messageId: 0,
			status: "ready",
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		await waitFor(() => {
			expect(swipeStore.store.refresh).toHaveBeenCalled();
		});
		expect(
			document.querySelector('.mes[mesid="0"] .astra-swipePager'),
		).toBeNull();
		expect(
			document.querySelector('.mes[mesid="0"] .astra-revisionBar'),
		).toBeNull();
		expect(document.querySelector(".astra-mesActions")).toBeNull();

		swipeStore.dispatch({
			canSwipeNext: true,
			canSwipePrevious: true,
			currentIndex: 1,
			isNativeSwipeBusy: false,
			messageId: 1,
			status: "ready",
			total: 2,
			updatedAt: 1,
		});
		revisionStore.dispatch({
			canContinue: true,
			canRegenerate: true,
			canUndo: true,
			isBusy: false,
			messageId: 1,
			status: "ready",
			updatedAt: 1,
		});

		await waitFor(() => {
			expect(
				document.querySelector('.mes[mesid="1"] .astra-swipePager'),
			).toBeInTheDocument();
		});
		expect(
			document.querySelector('.mes[mesid="1"] .astra-revisionBar'),
		).toBeInTheDocument();
		expect(
			document.querySelector('.mes[mesid="0"] .astra-swipePager'),
		).toBeNull();
		expect(
			document.querySelector('.mes[mesid="0"] .astra-revisionBar'),
		).toBeNull();
		expect(
			document.querySelector(
				'.mes[mesid="0"] .astra-mesActions__moreHost',
			),
		).toBeNull();
		expect(
			document.querySelector('.mes[mesid="1"] > .astra-mesActions')
				?.previousElementSibling,
		).toBe(document.querySelector('.mes[mesid="1"] > .mes_block'));

		swipeStore.dispatch({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 2,
		});
		revisionStore.dispatch({
			canContinue: false,
			canRegenerate: false,
			canUndo: false,
			isBusy: false,
			messageId: null,
			status: "idle",
			updatedAt: 2,
		});

		await waitFor(() => {
			expect(document.querySelector(".astra-swipePager")).toBeNull();
		});
		expect(document.querySelector(".astra-revisionBar")).toBeNull();
		expect(document.querySelector(".astra-mesActions")).toBeNull();
		expect(
			document.querySelectorAll(".astra-mesActions__moreHost"),
		).toHaveLength(0);

		feature.dispose();
	});

	test("renders revision actions without creating an empty swipe host", async () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block"></div>
                </div>
            </div>
        `;
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 0,
		});
		const revisionStore = createRevisionStoreStub({
			canContinue: true,
			canRegenerate: true,
			canUndo: false,
			isBusy: false,
			messageId: 0,
			status: "ready",
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		await waitFor(() => {
			expect(
				document.querySelector(".astra-revisionBar"),
			).toBeInTheDocument();
		});
		expect(document.querySelector(".astra-swipePager")).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__rightDefault"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__swipeHost"),
		).toBeNull();

		feature.dispose();
	});

	test("refreshes history actions after regenerate settles", async () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block">
                        <div class="ch_name">Assistant</div>
                        <div class="mes_text">Root</div>
                    </div>
                </div>
            </div>
        `;
		const historyItem = {
			avatarUrl: "",
			hasHistory: true,
			messageDisplayId: "#0",
			messageId: 0,
			senderName: "Assistant",
			swipeIndex: 0,
			swipeTotal: 1,
		};
		const historyStore = createHistoryStoreStub([]);
		const revisionStore = createRevisionStoreStub({
			canContinue: true,
			canRegenerate: true,
			canUndo: false,
			isBusy: false,
			messageId: 0,
			status: "ready",
			updatedAt: 0,
		});
		revisionStore.store.regenerateLastRevision.mockResolvedValue(true);
		const feature = createMobileMessageActionsFeature({
			createHistoryStore: () => historyStore.store,
			createRevisionStore: () => revisionStore.store,
			documentRef: document,
		});

		feature.mount();
		const regenerateButton = await screen.findByRole("button", {
			name: "Regenerate",
		});
		historyStore.store.refresh.mockClear();
		historyStore.store.refresh.mockImplementation(() => {
			historyStore.dispatch([historyItem]);
		});

		fireEvent.click(regenerateButton);

		await waitFor(() => {
			expect(historyStore.store.refresh).toHaveBeenCalledTimes(1);
		});
		expect(
			screen.getByRole("button", { name: "Revision history" }),
		).toBeInTheDocument();
		const message = document.querySelector(
			'.mes[mesid="0"]',
		) as HTMLElement;
		const moreDialog = await openMoreActionsDrawerForMessage(message);
		expect(
			within(moreDialog).getByRole("button", {
				name: "Revision history",
			}),
		).not.toBeDisabled();

		feature.dispose();
	});

	test("removes the swipe pager when swipe actions become unavailable while revision actions remain", async () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block"></div>
                </div>
            </div>
        `;
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: true,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: 0,
			status: "ready",
			total: 1,
			updatedAt: 0,
		});
		const revisionStore = createRevisionStoreStub({
			canContinue: true,
			canRegenerate: true,
			canUndo: false,
			isBusy: false,
			messageId: 0,
			status: "ready",
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		await waitFor(() => {
			expect(
				document.querySelector(".astra-swipePager"),
			).toBeInTheDocument();
		});

		swipeStore.dispatch({
			canSwipeNext: false,
			canSwipePrevious: false,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: null,
			status: "idle",
			total: 1,
			updatedAt: 1,
		});

		await waitFor(() => {
			expect(document.querySelector(".astra-swipePager")).toBeNull();
		});
		expect(
			document.querySelector(".astra-revisionBar"),
		).toBeInTheDocument();
		expect(
			document.querySelector(".astra-mesActions__rightDefault"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__swipeHost"),
		).toBeNull();

		feature.dispose();
	});

	test("keeps the action host mounted while native swipe is busy", async () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block"></div>
                </div>
            </div>
        `;
		const swipeStore = createSwipeStoreStub({
			canSwipeNext: true,
			canSwipePrevious: true,
			currentIndex: 0,
			isNativeSwipeBusy: false,
			messageId: 0,
			status: "ready",
			total: 2,
			updatedAt: 0,
		});
		const revisionStore = createRevisionStoreStub({
			canContinue: true,
			canRegenerate: true,
			canUndo: true,
			isBusy: false,
			messageId: 0,
			status: "ready",
			updatedAt: 0,
		});
		const feature = createMobileMessageActionsFeature({
			createRevisionStore: () => revisionStore.store,
			createSwipeStore: () => swipeStore.store,
			documentRef: document,
		});

		feature.mount();

		await waitFor(() => {
			expect(
				document.querySelector(".astra-mesActions"),
			).toBeInTheDocument();
		});

		swipeStore.dispatch({
			canSwipeNext: true,
			canSwipePrevious: true,
			currentIndex: 1,
			isNativeSwipeBusy: true,
			messageId: 0,
			status: "ready",
			total: 2,
			updatedAt: 1,
		});
		revisionStore.dispatch({
			canContinue: true,
			canRegenerate: true,
			canUndo: true,
			isBusy: true,
			messageId: 0,
			status: "ready",
			updatedAt: 1,
		});

		await waitFor(() => {
			expect(
				document.querySelector(".astra-swipePager__counter"),
			).toHaveTextContent("2 / 2");
		});
		expect(
			document.querySelector(".astra-mesActions__leftDefault"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__rightDefault"),
		).toBeNull();
		expect(
			document.querySelector(".astra-swipePager__button"),
		).toBeDisabled();
		expect(
			document.querySelector(".astra-revisionBar__button"),
		).toBeDisabled();

		feature.dispose();
	});
});
