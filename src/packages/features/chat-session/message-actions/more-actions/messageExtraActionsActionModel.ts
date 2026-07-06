import { Eye, EyeOff, type LucideIcon } from "@/components/ui/shared/icons";
import {
	type ChatMessageDeletionKind,
	readChatMessageDeletionSupport,
} from "@/packages/core/st/chatMessageDeletion";
import { resolveNativePromptVisibilityState } from "@/packages/features/chat-session/message-actions/contracts/dom";
import type { MessageExtraActionItem } from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionItem";
import type {
	MessageExtraActionsDrawerAction,
	MessageExtraActionsDrawerDangerActions,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionsDrawer";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import type { NativeExtraMessageAction } from "@/packages/features/chat-session/message-actions/more-actions/nativeExtraMessageActions";

export type TriggerNativeExtraAction = (
	action: NativeExtraMessageAction,
) => boolean;

export type OpenDeletionConfirmation = (
	kind: ChatMessageDeletionKind,
	target: MessageActionsTarget,
	source?: "edit" | "extra" | "more",
) => void;

export function resolveNativePromptVisibilityIcon({
	element,
}: Pick<NativeExtraMessageAction, "element">): LucideIcon | undefined {
	const state = resolveNativePromptVisibilityState(element);
	if (state === "excluded") {
		return Eye;
	}

	if (state === "included") {
		return EyeOff;
	}

	return undefined;
}

function mapNativeExtraAction({
	nativeAction,
	onClick,
}: {
	nativeAction: NativeExtraMessageAction;
	onClick(): void;
}): MessageExtraActionsDrawerAction {
	return {
		description: nativeAction.description,
		icon: resolveNativePromptVisibilityIcon(nativeAction),
		iconClassName: nativeAction.iconClassName,
		id: nativeAction.id,
		label: nativeAction.label,
		onClick,
	};
}

export function createNativeExtraDrawerActions({
	closeExtraActionsDrawer,
	nativeActions,
	refreshMessageActionStores,
	triggerNativeAction,
}: {
	closeExtraActionsDrawer(): void;
	nativeActions: NativeExtraMessageAction[];
	refreshMessageActionStores(): void;
	triggerNativeAction: TriggerNativeExtraAction;
}): MessageExtraActionsDrawerAction[] {
	return nativeActions.map((nativeAction) =>
		mapNativeExtraAction({
			nativeAction,
			onClick: () => {
				if (!triggerNativeAction(nativeAction)) {
					return;
				}

				closeExtraActionsDrawer();
				refreshMessageActionStores();
			},
		}),
	);
}

export function createNativeExtraQuickActions({
	closeMoreActionsDrawer,
	nativeActions,
	refreshMessageActionStores,
	triggerNativeAction,
}: {
	closeMoreActionsDrawer(): void;
	nativeActions: NativeExtraMessageAction[];
	refreshMessageActionStores(): void;
	triggerNativeAction: TriggerNativeExtraAction;
}): MessageExtraActionItem[] {
	return nativeActions.map((nativeAction) => ({
		...mapNativeExtraAction({
			nativeAction,
			onClick: () => {
				if (!triggerNativeAction(nativeAction)) {
					return;
				}

				closeMoreActionsDrawer();
				refreshMessageActionStores();
			},
		}),
		variant: "native",
	}));
}

export function createExtraActionsDrawerDangerActions({
	openDeletionConfirmation,
	target,
}: {
	openDeletionConfirmation: OpenDeletionConfirmation;
	target: MessageActionsTarget | null;
}): MessageExtraActionsDrawerDangerActions {
	const deletionSupport = target
		? readChatMessageDeletionSupport({
				swipeTotal: target.swipeTotal,
			})
		: {
				canDeleteMessage: false,
				canDeleteSwipe: false,
			};

	return {
		deleteMessage: {
			disabled: !deletionSupport.canDeleteMessage,
			onClick: () => {
				if (!target) {
					return;
				}

				openDeletionConfirmation("message", target);
			},
		},
		deleteSwipe: {
			disabled: !deletionSupport.canDeleteSwipe,
			onClick: () => {
				if (!target) {
					return;
				}

				openDeletionConfirmation("swipe", target);
			},
		},
	};
}
