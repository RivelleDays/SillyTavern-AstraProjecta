import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";

import type { ChatMessageRevisionHistoryItem } from "@/packages/core/st/chatMessageRevisionHistory";
import type { ChatMessageRevisionSnapshot } from "@/packages/core/st/chatMessageRevision";
import type { ChatMessageSwipeSnapshot } from "@/packages/core/st/chatMessageSwipe";
import { withAstraErrorBoundary } from "@/packages/core/runtime/AstraErrorBoundary";
import {
	cleanupMessageActionSlots,
	ensureMessageActionSlots,
} from "@/packages/features/chat-session/message-actions/messageActionSlots";
import {
	resolveInlineHistoryItem,
	resolveLastActionableFooterMessage,
	type MessageActionsContextLike,
} from "@/packages/features/chat-session/message-actions/messageActionTargetResolver";
import type { LoadedMessageElement } from "@/packages/features/chat-session/message-actions/contracts/dom";
import { RevisionBar } from "@/packages/features/chat-session/message-actions/RevisionBar";
import { SwipePager } from "@/packages/features/chat-session/message-actions/SwipePager";

const POST_GENERATION_FOOTER_SETTLE_MS = 750;

export interface MessageFooterActionsController {
	render(options: MessageFooterActionsRenderOptions): void;
	stopPostGenerationSettle(): void;
	unmount(): void;
}

export interface MessageFooterActionsRenderOptions {
	context: MessageActionsContextLike | null;
	historySnapshot: ChatMessageRevisionHistoryItem[];
	isGenerating: boolean;
	loadedMessages: LoadedMessageElement[];
	revisionSnapshot: ChatMessageRevisionSnapshot | undefined;
	swipeSnapshot: ChatMessageSwipeSnapshot | undefined;
}

function MessageFooterActions({
	historyAction,
	onContinue,
	onRegenerate,
	onSwipeNext,
	onSwipePrevious,
	onUndo,
	revisionSnapshot,
	swipeSnapshot,
}: {
	historyAction: { disabled?: boolean; onClick(): void } | null;
	onContinue(): void;
	onRegenerate(): void;
	onSwipeNext(): void;
	onSwipePrevious(): void;
	onUndo(): void;
	revisionSnapshot: ChatMessageRevisionSnapshot | null;
	swipeSnapshot: ChatMessageSwipeSnapshot | null;
}) {
	return (
		<>
			{revisionSnapshot || historyAction ? (
				<RevisionBar
					canContinue={revisionSnapshot?.canContinue === true}
					canRegenerate={revisionSnapshot?.canRegenerate === true}
					canUndo={revisionSnapshot?.canUndo === true}
					historyAction={historyAction ?? undefined}
					isBusy={revisionSnapshot?.isBusy === true}
					onContinue={onContinue}
					onRegenerate={onRegenerate}
					onUndo={onUndo}
				/>
			) : null}
			{swipeSnapshot ? (
				<SwipePager
					canSwipeNext={swipeSnapshot.canSwipeNext}
					canSwipePrevious={swipeSnapshot.canSwipePrevious}
					currentIndex={swipeSnapshot.currentIndex}
					isNativeSwipeBusy={swipeSnapshot.isNativeSwipeBusy}
					onNext={onSwipeNext}
					onPrevious={onSwipePrevious}
					total={swipeSnapshot.total}
				/>
			) : null}
		</>
	);
}

export function createMessageFooterActionsController({
	onContinue,
	onOpenHistory,
	onRegenerate,
	onSwipeNext,
	onSwipePrevious,
	onUndo,
	renderImmediately,
}: {
	onContinue(): void;
	onOpenHistory(historyItem: ChatMessageRevisionHistoryItem): void;
	onRegenerate(): void;
	onSwipeNext(): void;
	onSwipePrevious(): void;
	onUndo(): void;
	renderImmediately(): void;
}): MessageFooterActionsController {
	let footerActionRoot: Root | null = null;
	let footerActionRootHost: HTMLDivElement | null = null;
	let isFooterInPostGenerationSettle = false;
	let wasFooterBlockedByGeneration = false;
	let postGenerationFooterSettleTimeoutId: ReturnType<
		typeof globalThis.setTimeout
	> | null = null;

	function clearPostGenerationFooterSettleTimer() {
		if (postGenerationFooterSettleTimeoutId === null) {
			return;
		}

		globalThis.clearTimeout(postGenerationFooterSettleTimeoutId);
		postGenerationFooterSettleTimeoutId = null;
	}

	function stopPostGenerationSettle() {
		isFooterInPostGenerationSettle = false;
		clearPostGenerationFooterSettleTimer();
	}

	function startPostGenerationFooterSettle() {
		if (isFooterInPostGenerationSettle) {
			return;
		}

		isFooterInPostGenerationSettle = true;
		clearPostGenerationFooterSettleTimer();
		postGenerationFooterSettleTimeoutId = globalThis.setTimeout(() => {
			postGenerationFooterSettleTimeoutId = null;
			if (!isFooterInPostGenerationSettle) {
				return;
			}

			isFooterInPostGenerationSettle = false;
			renderImmediately();
		}, POST_GENERATION_FOOTER_SETTLE_MS);
	}

	function setFooterGenerationBlocked(
		actionHost: HTMLDivElement,
		isBlocked: boolean,
	) {
		if (isBlocked) {
			actionHost.dataset.astraGenerationBlocked = "true";
			return;
		}

		delete actionHost.dataset.astraGenerationBlocked;
	}

	function setFooterPostGenerationSettling(
		actionHost: HTMLDivElement,
		isSettling: boolean,
	) {
		if (isSettling) {
			actionHost.dataset.astraFooterSettling = "true";
			return;
		}

		delete actionHost.dataset.astraFooterSettling;
	}

	function canPreserveFooterDuringPostGenerationSettle({
		messageElement,
	}: {
		messageElement: Element;
	}): boolean {
		return Boolean(
			isFooterInPostGenerationSettle &&
			footerActionRootHost?.isConnected &&
			footerActionRootHost.parentElement === messageElement,
		);
	}

	function unmount() {
		stopPostGenerationSettle();
		wasFooterBlockedByGeneration = false;
		if (footerActionRootHost) {
			setFooterGenerationBlocked(footerActionRootHost, false);
			setFooterPostGenerationSettling(footerActionRootHost, false);
		}
		footerActionRoot?.unmount();
		footerActionRoot = null;
		cleanupMessageActionSlots(footerActionRootHost);
		footerActionRootHost = null;
	}

	function ensureFooterActionRoot(actionHost: HTMLDivElement): Root {
		if (!footerActionRoot || footerActionRootHost !== actionHost) {
			unmount();
			footerActionRoot = createRoot(actionHost);
			footerActionRootHost = actionHost;
		}

		return footerActionRoot;
	}

	function render({
		context,
		historySnapshot,
		isGenerating,
		loadedMessages,
		revisionSnapshot,
		swipeSnapshot,
	}: MessageFooterActionsRenderOptions) {
		const wasFooterBlockedBeforeRender = wasFooterBlockedByGeneration;
		wasFooterBlockedByGeneration = false;
		const targetMessage = resolveLastActionableFooterMessage({
			context,
			loadedMessages,
		});
		if (!targetMessage) {
			unmount();
			return;
		}

		const targetMessageId = targetMessage.messageId;
		if (isGenerating) {
			stopPostGenerationSettle();
			const slots = ensureMessageActionSlots(
				targetMessage.messageElement,
			);
			if (!slots) {
				unmount();
				return;
			}

			setFooterPostGenerationSettling(slots.container, false);
			setFooterGenerationBlocked(slots.container, true);
			const footerRoot = ensureFooterActionRoot(slots.container);
			wasFooterBlockedByGeneration = true;
			footerRoot.render(null);
			return;
		}

		const revisionActionsSnapshot =
			revisionSnapshot?.status === "ready" &&
			revisionSnapshot.messageId === targetMessageId &&
			(revisionSnapshot.canContinue ||
				revisionSnapshot.canRegenerate ||
				revisionSnapshot.canUndo)
				? revisionSnapshot
				: null;
		const swipeActionsSnapshot =
			swipeSnapshot?.status === "ready" &&
			swipeSnapshot.messageId === targetMessageId &&
			(swipeSnapshot.canSwipeNext ||
				swipeSnapshot.canSwipePrevious ||
				swipeSnapshot.isNativeSwipeBusy)
				? swipeSnapshot
				: null;
		const inlineHistoryItem = resolveInlineHistoryItem({
			historySnapshot,
			messageId: targetMessageId,
		});

		if (
			!revisionActionsSnapshot &&
			!swipeActionsSnapshot &&
			!inlineHistoryItem
		) {
			if (wasFooterBlockedBeforeRender) {
				startPostGenerationFooterSettle();
			}

			if (
				canPreserveFooterDuringPostGenerationSettle({
					messageElement: targetMessage.messageElement,
				})
			) {
				const slots = ensureMessageActionSlots(
					targetMessage.messageElement,
				);
				if (!slots) {
					unmount();
					return;
				}

				setFooterGenerationBlocked(slots.container, false);
				setFooterPostGenerationSettling(slots.container, true);
				ensureFooterActionRoot(slots.container).render(null);
				return;
			}

			unmount();
			return;
		}

		stopPostGenerationSettle();
		const slots = ensureMessageActionSlots(targetMessage.messageElement);
		if (!slots) {
			unmount();
			return;
		}

		setFooterGenerationBlocked(slots.container, false);
		setFooterPostGenerationSettling(slots.container, false);
		ensureFooterActionRoot(slots.container).render(
			withAstraErrorBoundary({
				children: (
					<MessageFooterActions
						historyAction={
							inlineHistoryItem
								? {
										disabled:
											revisionActionsSnapshot?.isBusy ===
											true,
										onClick: () => {
											onOpenHistory(inlineHistoryItem);
										},
									}
								: null
						}
						revisionSnapshot={revisionActionsSnapshot}
						swipeSnapshot={swipeActionsSnapshot}
						onContinue={onContinue}
						onRegenerate={onRegenerate}
						onSwipeNext={onSwipeNext}
						onSwipePrevious={onSwipePrevious}
						onUndo={onUndo}
					/>
				),
				source: "message-footer-actions",
			}),
		);
	}

	return {
		render,
		stopPostGenerationSettle,
		unmount,
	};
}
