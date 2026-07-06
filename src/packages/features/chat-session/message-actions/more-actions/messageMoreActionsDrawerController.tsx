import { createAstraReactPortalRootManager } from "@/packages/core/runtime/reactPortalRootManager";
import {
	MoreActionsDrawer,
	type MessageActionsTarget,
	type MoreActionsDrawerActionsConfig,
} from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import type { MessageExtraActionItem } from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionItem";

export interface MessageMoreActionsDrawerController {
	close(): void;
	getTarget(): MessageActionsTarget | null;
	openForMessage(messageId: number): void;
	render(): void;
	sync(validMessageIds: Set<number>): void;
	unmount(): void;
}

export function createMessageMoreActionsDrawerController({
	createActions,
	createExtraActions,
	documentRef,
	resolveTargetForMessage,
}: {
	createActions(target: MessageActionsTarget): MoreActionsDrawerActionsConfig;
	createExtraActions(target: MessageActionsTarget): MessageExtraActionItem[];
	documentRef: Document;
	resolveTargetForMessage(args: {
		includeRenderedMessage: boolean;
		messageId: number;
	}): MessageActionsTarget | null;
}): MessageMoreActionsDrawerController {
	const root = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-more-actions-drawer-host",
	});
	let selectedTarget: MessageActionsTarget | null = null;
	let isOpen = false;

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
