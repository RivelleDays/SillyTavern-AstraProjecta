import { describe, expect, test, vi } from "vitest";

import type { ChatMessageRevisionHistoryItem } from "@/packages/core/st/chatMessageRevisionHistory";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import {
	createMoreActionsDrawerActions,
	createMoreActionsExtraActions,
} from "@/packages/features/chat-session/message-actions/more-actions/messageMoreActionsActionModel";

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
		messagePreviewText: "Rendered message",
		renderedMessageHtml: "<p>Rendered message</p>",
		senderName: "Assistant",
		swipeIndex: 0,
		swipeTotal: 1,
		...overrides,
	};
}

function createHistoryItem(
	overrides: Partial<ChatMessageRevisionHistoryItem> = {},
): ChatMessageRevisionHistoryItem {
	return {
		avatarUrl: "",
		hasHistory: true,
		messageDisplayId: "#4",
		messageId: 4,
		senderName: "Assistant",
		swipeIndex: 0,
		swipeTotal: 1,
		...overrides,
	};
}

describe("messageMoreActionsActionModel", () => {
	test("dispatches native copy and prompt visibility through injected callbacks", () => {
		const target = createTarget();
		const dispatchCopy = vi.fn(() => true);
		const dispatchPromptVisibility = vi.fn(() => true);
		const closeMoreActionsDrawer = vi.fn();
		const refreshMessageActionStores = vi.fn();

		const actions = createMoreActionsDrawerActions({
			closeMoreActionsDrawer,
			dispatchCopy,
			dispatchPromptVisibility,
			historyItem: null,
			onEdit: vi.fn(),
			onMore: vi.fn(),
			onOpenHistory: vi.fn(),
			promptVisibilityActionName: "hide",
			refreshMessageActionStores,
			target,
		});

		actions.copy?.onClick?.();
		actions.promptVisibility?.onClick?.();

		expect(dispatchCopy).toHaveBeenCalledWith(target.messageId);
		expect(dispatchPromptVisibility).toHaveBeenCalledWith({
			action: "hide",
			messageId: target.messageId,
		});
		expect(closeMoreActionsDrawer).toHaveBeenCalledTimes(2);
		expect(refreshMessageActionStores).toHaveBeenCalledTimes(1);
	});

	test("builds footer handoff actions without firing disabled history", () => {
		const target = createTarget();
		const onEdit = vi.fn();
		const onMore = vi.fn();
		const onOpenHistory = vi.fn();
		const closeMoreActionsDrawer = vi.fn();
		const actions = createMoreActionsDrawerActions({
			closeMoreActionsDrawer,
			dispatchCopy: vi.fn(),
			dispatchPromptVisibility: vi.fn(),
			historyItem: null,
			onEdit,
			onMore,
			onOpenHistory,
			promptVisibilityActionName: "hide",
			refreshMessageActionStores: vi.fn(),
			target,
		});

		actions.history?.onClick?.();
		actions.edit?.onClick?.();
		actions.more?.onClick?.();

		expect(actions.history?.disabled).toBe(true);
		expect(onOpenHistory).not.toHaveBeenCalled();
		expect(onEdit).toHaveBeenCalledWith(target);
		expect(onMore).toHaveBeenCalledWith(target.messageId);
	});

	test("builds history and delete quick actions for multi-swipe targets", () => {
		const target = createTarget({ swipeTotal: 2 });
		const historyItem = createHistoryItem();
		const openDeletionConfirmation = vi.fn();
		const onOpenHistory = vi.fn();

		const actions = createMoreActionsDrawerActions({
			closeMoreActionsDrawer: vi.fn(),
			dispatchCopy: vi.fn(),
			dispatchPromptVisibility: vi.fn(),
			historyItem,
			onEdit: vi.fn(),
			onMore: vi.fn(),
			onOpenHistory,
			promptVisibilityActionName: "hide",
			refreshMessageActionStores: vi.fn(),
			target,
		});
		const extraActions = createMoreActionsExtraActions({
			openDeletionConfirmation,
			target,
		});

		actions.history?.onClick?.();
		extraActions
			.find((action) => action.id === "4:delete-swipe")
			?.onClick?.();
		extraActions
			.find((action) => action.id === "4:delete-message")
			?.onClick?.();

		expect(actions.history?.disabled).toBe(false);
		expect(onOpenHistory).toHaveBeenCalledWith(historyItem);
		expect(extraActions.map((action) => action.label)).toEqual([
			"Delete current swipe",
			"Delete message and all swipes",
		]);
		expect(openDeletionConfirmation).toHaveBeenNthCalledWith(
			1,
			"swipe",
			target,
			"more",
		);
		expect(openDeletionConfirmation).toHaveBeenNthCalledWith(
			2,
			"message",
			target,
			"more",
		);
	});
});
