import { type ChatMessageDeletionKind } from "@/packages/core/st/chatMessageDeletion";
import { createAstraReactPortalRootManager } from "@/packages/core/runtime/reactPortalRootManager";
import {
	MessageDeleteConfirmationDrawer,
	type MessageDeleteConfirmationDrawerState,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageDeleteConfirmationDrawer";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";

export interface MessageDeleteConfirmationDrawerController {
	open(kind: ChatMessageDeletionKind, target: MessageActionsTarget): void;
	render(): void;
	sync(validMessageIds: Set<number>): void;
	unmount(): void;
}

export function cloneMessageActionsTarget(
	target: MessageActionsTarget,
): MessageActionsTarget {
	return {
		...target,
		metadata: {
			...target.metadata,
		},
	};
}

export function createMessageDeleteConfirmationDrawerController({
	documentRef,
	onDeleted,
	resolveTargetForMessage,
}: {
	documentRef: Document;
	onDeleted(): void;
	resolveTargetForMessage(args: {
		includeRenderedMessage: boolean;
		messageId: number;
	}): MessageActionsTarget | null;
}): MessageDeleteConfirmationDrawerController {
	const root = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-delete-confirmation-drawer-host",
	});
	let selectedConfirmation: MessageDeleteConfirmationDrawerState | null =
		null;

	function unmount() {
		root.unmount();
		selectedConfirmation = null;
	}

	function resolveConfirmationTarget(
		target: MessageActionsTarget,
	): MessageActionsTarget {
		const fallbackTarget = cloneMessageActionsTarget(target);
		const renderedTarget = resolveTargetForMessage({
			includeRenderedMessage: true,
			messageId: target.messageId,
		});
		if (!renderedTarget?.renderedMessageHtml.trim()) {
			return fallbackTarget;
		}

		return cloneMessageActionsTarget(renderedTarget);
	}

	function render() {
		if (!selectedConfirmation) {
			unmount();
			return;
		}

		const host = root.ensure();
		root.render(
			<MessageDeleteConfirmationDrawer
				action={selectedConfirmation}
				container={host}
				onDeleted={onDeleted}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					selectedConfirmation = null;
					unmount();
				}}
			/>,
		);
	}

	return {
		open(kind, target) {
			selectedConfirmation = {
				kind,
				target: resolveConfirmationTarget(target),
			};
			render();
		},
		render,
		sync(validMessageIds) {
			if (
				selectedConfirmation &&
				!validMessageIds.has(selectedConfirmation.target.messageId)
			) {
				unmount();
			}
		},
		unmount,
	};
}
