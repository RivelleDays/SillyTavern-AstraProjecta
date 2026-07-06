import { createAstraReactPortalRootManager } from "@/packages/core/runtime/reactPortalRootManager";
import type { ChatMessageRevisionHistoryItem } from "@/packages/core/st/chatMessageRevisionHistory";
import { type ChatMessageDeletionKind } from "@/packages/core/st/chatMessageDeletion";
import {
	dispatchNativeClick,
	dispatchNativePointerUp,
	resolveNativeMessageActionElement,
} from "@/packages/features/chat-session/message-actions/contracts/dom";
import {
	createMessageDrawerHandoffScheduler,
	type MessageDrawerHandoffScheduler,
} from "@/packages/features/chat-session/message-actions/messageDrawerHandoffScheduler";
import {
	MoreActionsDrawer,
	type MessageActionsTarget,
	type MoreActionsDrawerActionsConfig,
} from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import type { MessageExtraActionItem } from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionItem";
import { createNativeExtraQuickActions } from "@/packages/features/chat-session/message-actions/more-actions/messageExtraActionsActionModel";
import {
	createMoreActionsDrawerActions,
	createMoreActionsExtraActions,
	type MoreActionsPromptVisibilityAction,
} from "@/packages/features/chat-session/message-actions/more-actions/messageMoreActionsActionModel";
import {
	resolveNativeExtraMessageActions,
	triggerNativeExtraMessageAction,
} from "@/packages/features/chat-session/message-actions/more-actions/nativeExtraMessageActions";

export interface MessageMoreActionsDrawerController {
	close(): void;
	getTarget(): MessageActionsTarget | null;
	openForMessage(messageId: number): void;
	render(): void;
	sync(validMessageIds: Set<number>): void;
	unmount(): void;
}

export function createMessageMoreActionsDrawerController({
	documentRef,
	handoffScheduler,
	openDeletionConfirmation,
	openEditDrawerForTarget,
	openExtraActionsForMessage,
	openHistoryItem,
	refreshMessageActionStores,
	resolveHistoryItemForTarget,
	resolveTargetForMessage,
}: {
	documentRef: Document;
	handoffScheduler?: MessageDrawerHandoffScheduler;
	openDeletionConfirmation(
		kind: ChatMessageDeletionKind,
		target: MessageActionsTarget,
		source: "more",
	): void;
	openEditDrawerForTarget(target: MessageActionsTarget): void;
	openExtraActionsForMessage(messageId: number): void;
	openHistoryItem(item: ChatMessageRevisionHistoryItem): void;
	refreshMessageActionStores(): void;
	resolveHistoryItemForTarget(
		target: MessageActionsTarget,
	): ChatMessageRevisionHistoryItem | null;
	resolveTargetForMessage(args: {
		includeRenderedMessage: boolean;
		messageId: number;
	}): MessageActionsTarget | null;
}): MessageMoreActionsDrawerController {
	const root = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-more-actions-drawer-host",
	});
	const resolvedHandoffScheduler =
		handoffScheduler ??
		createMessageDrawerHandoffScheduler({ documentRef });
	let selectedTarget: MessageActionsTarget | null = null;
	let isOpen = false;

	function dispatchCopy(messageId: number): boolean {
		const copyAction = resolveNativeMessageActionElement({
			action: "copy",
			documentRef,
			messageId,
		});

		if (!copyAction) {
			return false;
		}

		dispatchNativePointerUp({
			documentRef,
			element: copyAction,
		});
		return true;
	}

	function dispatchPromptVisibility({
		action,
		messageId,
	}: {
		action: MoreActionsPromptVisibilityAction;
		messageId: number;
	}): boolean {
		const promptVisibilityAction = resolveNativeMessageActionElement({
			action,
			documentRef,
			messageId,
		});

		if (!promptVisibilityAction) {
			return false;
		}

		dispatchNativeClick({
			documentRef,
			element: promptVisibilityAction,
		});
		return true;
	}

	function closeAndScheduleHandoff(callback: () => void) {
		close();
		resolvedHandoffScheduler.schedule(callback);
	}

	function createNativeQuickActions(
		target: MessageActionsTarget,
	): MessageExtraActionItem[] {
		return createNativeExtraQuickActions({
			closeMoreActionsDrawer: close,
			nativeActions: resolveNativeExtraMessageActions({
				documentRef,
				messageId: target.messageId,
			}),
			refreshMessageActionStores,
			triggerNativeAction: (action) =>
				triggerNativeExtraMessageAction({
					action,
					documentRef,
				}),
		});
	}

	function createActions(
		target: MessageActionsTarget,
	): MoreActionsDrawerActionsConfig {
		const promptVisibilityActionName: MoreActionsPromptVisibilityAction =
			target.isSystem ? "unhide" : "hide";
		const copyAction = resolveNativeMessageActionElement({
			action: "copy",
			documentRef,
			messageId: target.messageId,
		});
		const promptVisibilityAction = resolveNativeMessageActionElement({
			action: promptVisibilityActionName,
			documentRef,
			messageId: target.messageId,
		});

		return createMoreActionsDrawerActions({
			canCopy: Boolean(copyAction),
			canPromptVisibility: Boolean(promptVisibilityAction),
			closeMoreActionsDrawer: close,
			dispatchCopy,
			dispatchPromptVisibility,
			historyItem: resolveHistoryItemForTarget(target),
			onEdit: (nextTarget) => {
				closeAndScheduleHandoff(() => {
					openEditDrawerForTarget(nextTarget);
				});
			},
			onMore: (messageId) => {
				closeAndScheduleHandoff(() => {
					openExtraActionsForMessage(messageId);
				});
			},
			onOpenHistory: (historyItem) => {
				closeAndScheduleHandoff(() => {
					openHistoryItem(historyItem);
				});
			},
			promptVisibilityActionName,
			refreshMessageActionStores,
			target,
		});
	}

	function createExtraActions(target: MessageActionsTarget) {
		return createMoreActionsExtraActions({
			nativeQuickActions: createNativeQuickActions(target),
			openDeletionConfirmation,
			target,
		});
	}

	function unmount() {
		root.unmount();
		selectedTarget = null;
		isOpen = false;
	}

	function render() {
		if (!selectedTarget && !root.getHost()) {
			return;
		}

		const host = root.ensure();
		root.render(
			<MoreActionsDrawer
				actions={
					selectedTarget ? createActions(selectedTarget) : undefined
				}
				container={host}
				extraActions={
					selectedTarget ? createExtraActions(selectedTarget) : []
				}
				open={isOpen && Boolean(selectedTarget)}
				target={selectedTarget}
				onExitComplete={() => {
					if (!isOpen) {
						unmount();
					}
				}}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					unmount();
				}}
			/>,
		);
	}

	function close() {
		if (!selectedTarget && !root.getHost()) {
			return;
		}

		isOpen = false;
		render();
	}

	return {
		close,
		getTarget() {
			return selectedTarget;
		},
		openForMessage(messageId) {
			const target = resolveTargetForMessage({
				includeRenderedMessage: true,
				messageId,
			});
			if (!target) {
				unmount();
				return;
			}

			selectedTarget = target;
			isOpen = true;
			render();
		},
		render,
		sync(validMessageIds) {
			if (!selectedTarget) {
				return;
			}
			if (!validMessageIds.has(selectedTarget.messageId)) {
				unmount();
				return;
			}

			if (isOpen) {
				const resolvedTarget = resolveTargetForMessage({
					includeRenderedMessage: true,
					messageId: selectedTarget.messageId,
				});
				if (!resolvedTarget) {
					unmount();
					return;
				}

				selectedTarget = resolvedTarget;
				render();
			}
		},
		unmount,
	};
}
