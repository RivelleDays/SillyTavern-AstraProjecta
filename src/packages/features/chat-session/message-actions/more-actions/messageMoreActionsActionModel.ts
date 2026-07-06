import type { ChatMessageRevisionHistoryItem } from "@/packages/core/st/chatMessageRevisionHistory";
import {
	type ChatMessageDeletionKind,
	readChatMessageDeletionSupport,
} from "@/packages/core/st/chatMessageDeletion";
import { translateAstra } from "@/packages/core/i18n";
import { Delete, MessageCircleX } from "@/components/ui/shared/icons";
import type { MessageExtraActionItem } from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionItem";
import type {
	MessageActionsTarget,
	MoreActionsDrawerActionsConfig,
} from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import type { NativeMessageAction } from "@/packages/features/chat-session/message-actions/contracts/dom";

export type MoreActionsPromptVisibilityAction = Extract<
	NativeMessageAction,
	"hide" | "unhide"
>;

export function createMoreActionsDrawerActions({
	closeMoreActionsDrawer,
	canCopy = true,
	canPromptVisibility = true,
	dispatchCopy,
	dispatchPromptVisibility,
	historyItem,
	onEdit,
	onMore,
	onOpenHistory,
	promptVisibilityActionName,
	refreshMessageActionStores,
	target,
}: {
	closeMoreActionsDrawer(): void;
	canCopy?: boolean;
	canPromptVisibility?: boolean;
	dispatchCopy(messageId: number): boolean;
	dispatchPromptVisibility(args: {
		action: MoreActionsPromptVisibilityAction;
		messageId: number;
	}): boolean;
	historyItem: ChatMessageRevisionHistoryItem | null;
	onEdit(target: MessageActionsTarget): void;
	onMore(messageId: number): void;
	onOpenHistory(item: ChatMessageRevisionHistoryItem): void;
	promptVisibilityActionName: MoreActionsPromptVisibilityAction;
	refreshMessageActionStores(): void;
	target: MessageActionsTarget;
}): MoreActionsDrawerActionsConfig {
	return {
		copy: {
			disabled: !canCopy,
			onClick: () => {
				if (!dispatchCopy(target.messageId)) {
					return;
				}

				closeMoreActionsDrawer();
			},
		},
		edit: {
			disabled: false,
			onClick: () => {
				onEdit(target);
			},
		},
		history: {
			disabled: !historyItem,
			onClick: () => {
				if (!historyItem) {
					return;
				}

				closeMoreActionsDrawer();
				onOpenHistory(historyItem);
			},
		},
		more: {
			disabled: false,
			onClick: () => {
				onMore(target.messageId);
			},
		},
		promptVisibility: {
			disabled: !canPromptVisibility,
			isExcluded: target.isSystem,
			onClick: () => {
				if (
					!dispatchPromptVisibility({
						action: promptVisibilityActionName,
						messageId: target.messageId,
					})
				) {
					return;
				}

				closeMoreActionsDrawer();
				refreshMessageActionStores();
			},
		},
	};
}

export function createMoreActionsExtraActions({
	nativeQuickActions = [],
	openDeletionConfirmation,
	target,
}: {
	nativeQuickActions?: MessageExtraActionItem[];
	openDeletionConfirmation(
		kind: ChatMessageDeletionKind,
		target: MessageActionsTarget,
		source: "more",
	): void;
	target: MessageActionsTarget;
}): MessageExtraActionItem[] {
	const deletionSupport = readChatMessageDeletionSupport({
		swipeTotal: target.swipeTotal,
	});
	const hasMultipleSwipes =
		typeof target.swipeTotal === "number" && target.swipeTotal > 1;
	const deleteMessageLabel = translateAstra(
		"messageActions.extra.action.deleteMessage.label",
	);
	const deleteMessageSingleSwipeLabel = translateAstra(
		"messageActions.extra.action.deleteMessage.singleSwipeLabel",
	);
	const deleteSwipeLabel = translateAstra(
		"messageActions.extra.action.deleteSwipe.label",
	);
	const quickActions: MessageExtraActionItem[] = [];

	if (hasMultipleSwipes) {
		quickActions.push({
			disabled: !deletionSupport.canDeleteSwipe,
			icon: Delete,
			id: `${target.messageId}:delete-swipe`,
			label: deleteSwipeLabel,
			onClick: () => {
				openDeletionConfirmation("swipe", target, "more");
			},
			variant: "danger",
		});
	}

	quickActions.push({
		disabled: !deletionSupport.canDeleteMessage,
		icon: MessageCircleX,
		id: `${target.messageId}:delete-message`,
		label: hasMultipleSwipes
			? deleteMessageLabel
			: deleteMessageSingleSwipeLabel,
		onClick: () => {
			openDeletionConfirmation("message", target, "more");
		},
		variant: "danger",
	});

	return quickActions.concat(nativeQuickActions);
}
