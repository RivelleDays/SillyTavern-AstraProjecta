import { createAstraReactPortalRootManager } from "@/packages/core/runtime/reactPortalRootManager";
import type { ChatMessageDeletionKind } from "@/packages/core/st/chatMessageDeletion";
import {
	MessageExtraActionsDrawer,
	type MessageExtraActionsDrawerAction,
	type MessageExtraActionsDrawerDangerActions,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionsDrawer";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import {
	createExtraActionsDrawerDangerActions,
	createNativeExtraDrawerActions,
} from "@/packages/features/chat-session/message-actions/more-actions/messageExtraActionsActionModel";
import {
	resolveNativeExtraMessageActions,
	triggerNativeExtraMessageAction,
} from "@/packages/features/chat-session/message-actions/more-actions/nativeExtraMessageActions";

export interface MessageExtraActionsDrawerController {
	close(): void;
	openForMessage(messageId: number): void;
	render(): void;
	sync(validMessageIds: Set<number>): void;
	unmount(): void;
}

export function createMessageExtraActionsDrawerController({
	documentRef,
	openDeletionConfirmation,
	refreshMessageActionStores,
	resolveTargetForMessage,
}: {
	documentRef: Document;
	openDeletionConfirmation(
		kind: ChatMessageDeletionKind,
		target: MessageActionsTarget,
		source: "extra",
	): void;
	refreshMessageActionStores(): void;
	resolveTargetForMessage(args: {
		includeRenderedMessage: boolean;
		messageId: number;
	}): MessageActionsTarget | null;
}): MessageExtraActionsDrawerController {
	const root = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-extra-actions-drawer-host",
	});
	let selectedTarget: MessageActionsTarget | null = null;

	function createDangerActions(
		target: MessageActionsTarget | null,
	): MessageExtraActionsDrawerDangerActions {
		return createExtraActionsDrawerDangerActions({
			openDeletionConfirmation: (kind, nextTarget) => {
				openDeletionConfirmation(kind, nextTarget, "extra");
			},
			target,
		});
	}

	function createNativeActions(
		target: MessageActionsTarget,
	): MessageExtraActionsDrawerAction[] {
		return createNativeExtraDrawerActions({
			closeExtraActionsDrawer: unmount,
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

	function render() {
		if (!selectedTarget && !root.getHost()) {
			return;
		}

		const host = root.ensure();
		const target = selectedTarget;
		root.render(
			<MessageExtraActionsDrawer
				container={host}
				dangerActions={createDangerActions(target)}
				nativeActions={target ? createNativeActions(target) : []}
				open={Boolean(target)}
				target={target}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					selectedTarget = null;
					render();
				}}
			/>,
		);
	}

	function unmount() {
		root.unmount();
		selectedTarget = null;
	}

	return {
		close: unmount,
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

			const resolvedTarget = resolveTargetForMessage({
				includeRenderedMessage: false,
				messageId: selectedTarget.messageId,
			});
			if (!resolvedTarget) {
				unmount();
				return;
			}

			selectedTarget = resolvedTarget;
			render();
		},
		unmount,
	};
}
