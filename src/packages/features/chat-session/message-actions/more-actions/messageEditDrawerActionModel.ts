import {
	type ChatMessageDeletionKind,
	readChatMessageDeletionSupport,
} from "@/packages/core/st/chatMessageDeletion";
import type { ChatMessageMoveDirection } from "@/packages/core/st/chatMessageEdit";
import type {
	MessageEditDrawerActionsConfig,
	MessageEditDrawerDraft,
	MessageEditDrawerSubmitDraft,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageEditDrawer";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";

export function createEditDrawerActions({
	copyEditDraft,
	draft,
	moveEditDraft,
	openDeletionConfirmation,
	target,
}: {
	copyEditDraft(submitDraft: MessageEditDrawerSubmitDraft): void;
	draft: MessageEditDrawerDraft;
	moveEditDraft(args: {
		direction: ChatMessageMoveDirection;
		submitDraft: MessageEditDrawerSubmitDraft;
	}): void;
	openDeletionConfirmation(
		kind: ChatMessageDeletionKind,
		target: MessageActionsTarget,
		source: "edit",
	): void;
	target: MessageActionsTarget;
}): MessageEditDrawerActionsConfig {
	const deletionSupport = readChatMessageDeletionSupport({
		swipeTotal: target.swipeTotal,
	});

	return {
		addReasoning: {
			disabled: draft.hasReasoning,
		},
		copy: {
			disabled: !draft.canCopy,
			onClick: copyEditDraft,
		},
		deleteMessage: {
			disabled: !deletionSupport.canDeleteMessage,
			onClick: () => {
				openDeletionConfirmation("message", target, "edit");
			},
		},
		deleteSwipe: {
			disabled: !deletionSupport.canDeleteSwipe,
			onClick: () => {
				openDeletionConfirmation("swipe", target, "edit");
			},
		},
		moveDown: {
			disabled: !draft.canMoveDown,
			onClick: (submitDraft) => {
				moveEditDraft({
					direction: "down",
					submitDraft,
				});
			},
		},
		moveUp: {
			disabled: !draft.canMoveUp,
			onClick: (submitDraft) => {
				moveEditDraft({
					direction: "up",
					submitDraft,
				});
			},
		},
	};
}
