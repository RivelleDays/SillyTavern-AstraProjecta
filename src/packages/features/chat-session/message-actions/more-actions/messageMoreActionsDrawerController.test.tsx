import {
	act,
	cleanup,
	fireEvent,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import type { ChatMessageRevisionHistoryItem } from "@/packages/core/st/chatMessageRevisionHistory";
import { createMessageMoreActionsDrawerController } from "@/packages/features/chat-session/message-actions/more-actions/messageMoreActionsDrawerController";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";

function mockMobileLayout() {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		})),
		writable: true,
	});
}

function setSillyTavernContext(context: Record<string, unknown>) {
	(
		globalThis as { SillyTavern?: { getContext: () => unknown } }
	).SillyTavern = {
		getContext: () => context,
	};
}

function createTarget(
	overrides: Partial<MessageActionsTarget> = {},
): MessageActionsTarget {
	return {
		avatarUrl: "",
		isSystem: false,
		isUser: false,
		messageDisplayId: "#4",
		messageId: 4,
		metadata: {},
		messagePreviewText: "Rendered body",
		renderedMessageHtml: '<div class="mes_text">Rendered body</div>',
		senderName: "Assistant",
		swipeIndex: 0,
		swipeTotal: 2,
		...overrides,
	};
}

function createHistoryItem(): ChatMessageRevisionHistoryItem {
	return {
		avatarUrl: "",
		hasHistory: true,
		messageDisplayId: "#4",
		messageId: 4,
		senderName: "Assistant",
		swipeIndex: 0,
		swipeTotal: 2,
	};
}

describe("createMessageMoreActionsDrawerController", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({ deleteMessage: vi.fn() });
		document.body.innerHTML += `
			<div id="chat">
				<div class="mes" mesid="4">
					<div class="mes_block">
						<div class="mes_text">Rendered body</div>
						<button class="mes_copy" type="button">Copy</button>
						<button class="mes_hide" type="button">Hide</button>
						<div class="extraMesButtons">
							<button class="fa-solid fa-language" title="Translate message" type="button">Translate</button>
						</div>
					</div>
				</div>
			</div>
		`;
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("owns copy, prompt visibility, native quick action, and history handoff actions", async () => {
		const target = createTarget();
		const historyItem = createHistoryItem();
		const copyAction = document.querySelector(".mes_copy");
		const promptVisibilityAction = document.querySelector(".mes_hide");
		const nativeAction = document.querySelector(".extraMesButtons button");
		const copyPointerUp = vi.fn();
		const promptVisibilityClick = vi.fn();
		const nativePointerUp = vi.fn();
		const nativeClick = vi.fn();
		copyAction?.addEventListener("pointerup", copyPointerUp);
		promptVisibilityAction?.addEventListener(
			"click",
			promptVisibilityClick,
		);
		nativeAction?.addEventListener("pointerup", nativePointerUp);
		nativeAction?.addEventListener("click", nativeClick);
		const scheduledCallbacks: Array<() => void> = [];
		const handoffScheduler = {
			cancel: vi.fn(),
			schedule: vi.fn((callback: () => void) => {
				scheduledCallbacks.push(callback);
			}),
		};
		const openHistoryItem = vi.fn();
		const refreshMessageActionStores = vi.fn();
		const controller = createMessageMoreActionsDrawerController({
			documentRef: document,
			handoffScheduler,
			openDeletionConfirmation: vi.fn(),
			openEditDrawerForTarget: vi.fn(),
			openExtraActionsForMessage: vi.fn(),
			openHistoryItem,
			refreshMessageActionStores,
			resolveHistoryItemForTarget: vi.fn(() => historyItem),
			resolveTargetForMessage: vi.fn(() => target),
		});

		controller.openForMessage(4);
		let dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Copy message text",
			}),
		);
		expect(copyPointerUp).toHaveBeenCalledTimes(1);

		controller.openForMessage(4);
		dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Exclude message from prompts",
			}),
		);
		expect(promptVisibilityClick).toHaveBeenCalledTimes(1);
		expect(refreshMessageActionStores).toHaveBeenCalledTimes(1);

		controller.openForMessage(4);
		dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Translate message",
			}),
		);
		expect(nativePointerUp).toHaveBeenCalledTimes(1);
		expect(nativeClick).toHaveBeenCalledTimes(1);
		expect(refreshMessageActionStores).toHaveBeenCalledTimes(2);

		controller.openForMessage(4);
		dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Revision history",
			}),
		);
		expect(handoffScheduler.schedule).toHaveBeenCalledTimes(1);
		expect(openHistoryItem).not.toHaveBeenCalled();

		await act(async () => {
			scheduledCallbacks.shift()?.();
		});

		expect(openHistoryItem).toHaveBeenCalledWith(historyItem);
	});

	test("owns edit, extra drawer, and delete quick-action handoffs", async () => {
		const target = createTarget();
		const scheduledCallbacks: Array<() => void> = [];
		const handoffScheduler = {
			cancel: vi.fn(),
			schedule: vi.fn((callback: () => void) => {
				scheduledCallbacks.push(callback);
			}),
		};
		const openDeletionConfirmation = vi.fn();
		const openEditDrawerForTarget = vi.fn();
		const openExtraActionsForMessage = vi.fn();
		const controller = createMessageMoreActionsDrawerController({
			documentRef: document,
			handoffScheduler,
			openDeletionConfirmation,
			openEditDrawerForTarget,
			openExtraActionsForMessage,
			openHistoryItem: vi.fn(),
			refreshMessageActionStores: vi.fn(),
			resolveHistoryItemForTarget: vi.fn(() => null),
			resolveTargetForMessage: vi.fn(() => target),
		});

		controller.openForMessage(4);
		let dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Edit message" }),
		);
		expect(openEditDrawerForTarget).not.toHaveBeenCalled();
		await act(async () => {
			scheduledCallbacks.shift()?.();
		});
		expect(openEditDrawerForTarget).toHaveBeenCalledWith(target);

		controller.openForMessage(4);
		dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		fireEvent.click(
			within(dialog).getByRole("button", { name: "More actions" }),
		);
		expect(openExtraActionsForMessage).not.toHaveBeenCalled();
		await act(async () => {
			scheduledCallbacks.shift()?.();
		});
		expect(openExtraActionsForMessage).toHaveBeenCalledWith(4);

		controller.openForMessage(4);
		dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Delete current swipe",
			}),
		);

		expect(openDeletionConfirmation).toHaveBeenCalledWith(
			"swipe",
			target,
			"more",
		);
	});
});
