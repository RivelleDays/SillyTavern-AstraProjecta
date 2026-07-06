import { createAstraReactPortalRootManager } from "@/packages/core/runtime/reactPortalRootManager";
import {
	MessageExtraActionsDrawer,
	type MessageExtraActionsDrawerAction,
	type MessageExtraActionsDrawerDangerActions,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionsDrawer";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";

export interface MessageExtraActionsDrawerController {
	close(): void;
	openForMessage(messageId: number): void;
	render(): void;
	sync(validMessageIds: Set<number>): void;
	unmount(): void;
}

export function createMessageExtraActionsDrawerController({
	createDangerActions,
	createNativeActions,
	documentRef,
	resolveTargetForMessage,
}: {
	createDangerActions(
		target: MessageActionsTarget | null,
	): MessageExtraActionsDrawerDangerActions;
	createNativeActions(
		target: MessageActionsTarget,
	): MessageExtraActionsDrawerAction[];
	documentRef: Document;
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
