import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";

import {
	type ChatMessageRevisionHistoryItem,
	type ChatMessageRevisionHistoryStore,
	createChatMessageRevisionHistoryStore,
} from "@/packages/core/st/chatMessageRevisionHistory";
import {
	type ChatMessageRevisionStore,
	createChatMessageRevisionStore,
} from "@/packages/core/st/chatMessageRevision";
import {
	type ChatMessageSwipeStore,
	createChatMessageSwipeStore,
} from "@/packages/core/st/chatMessageSwipe";
import {
	createPrimarySendActionStore as createDefaultPrimarySendActionStore,
	type PrimarySendActionStore,
} from "@/packages/core/st/primarySendAction";
import {
	createChatMessageInteractionStore,
	type ChatMessageLongPressAction,
	type ChatMessageInteractionStore,
} from "@/packages/core/st/chat-message-interaction";
import type { ChatMessageDeletionKind } from "@/packages/core/st/chatMessageDeletion";
import {
	copyChatMessageFromDraft,
	moveChatMessage,
	readChatMessageEditDraft,
	saveChatMessageEdit,
	type ChatMessageMoveDirection,
} from "@/packages/core/st/chatMessageEdit";
import { translateAstra } from "@/packages/core/i18n";
import { isRecord } from "@/packages/core/st/shared";
import { UiIcon } from "@/components/ui/shared/icon";
import { Ellipsis, PencilLine } from "@/components/ui/shared/icons";
import {
	cleanupMessageActionSlots,
	ensureMessageActionSlots,
} from "@/packages/features/chat-session/message-actions/messageActionSlots";
import {
	resolveChatMessage,
	resolveContextSafe,
	resolveInlineHistoryItem,
	resolveLastActionableFooterMessage,
	resolveMoreActionsTarget,
	type MessageActionsChatMessageLike,
} from "@/packages/features/chat-session/message-actions/messageActionTargetResolver";
import {
	dispatchNativeClick,
	dispatchNativePointerUp,
	resolveLegacyMessageActionHosts,
	resolveLoadedMessageElements,
	resolveMessageElement,
	resolveNativeMessageActionElement,
} from "@/packages/features/chat-session/message-actions/contracts/dom";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import {
	MessageEditDrawer,
	type MessageEditDrawerDraft,
	type MessageEditDrawerSubmitDraft,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageEditDrawer";
import {
	resolveNativeExtraMessageActions,
	triggerNativeExtraMessageAction,
} from "@/packages/features/chat-session/message-actions/more-actions/nativeExtraMessageActions";
import { createEditDrawerActions as createEditDrawerActionConfig } from "@/packages/features/chat-session/message-actions/more-actions/messageEditDrawerActionModel";
import {
	createExtraActionsDrawerDangerActions,
	createNativeExtraDrawerActions,
	createNativeExtraQuickActions,
} from "@/packages/features/chat-session/message-actions/more-actions/messageExtraActionsActionModel";
import {
	createMoreActionsDrawerActions,
	createMoreActionsExtraActions,
	type MoreActionsPromptVisibilityAction,
} from "@/packages/features/chat-session/message-actions/more-actions/messageMoreActionsActionModel";
import {
	cloneMessageActionsTarget,
	createMessageDeleteConfirmationDrawerController,
} from "@/packages/features/chat-session/message-actions/more-actions/messageDeleteConfirmationDrawerController";
import { createMessageExtraActionsDrawerController } from "@/packages/features/chat-session/message-actions/more-actions/messageExtraActionsDrawerController";
import { createMessageMoreActionsDrawerController } from "@/packages/features/chat-session/message-actions/more-actions/messageMoreActionsDrawerController";
import { RevisionBar } from "@/packages/features/chat-session/message-actions/RevisionBar";
import { RevisionHistoryDrawer } from "@/packages/features/chat-session/message-actions/revision-history/RevisionHistoryDrawer";
import { SwipePager } from "@/packages/features/chat-session/message-actions/SwipePager";
import { createAstraReactPortalRootManager } from "@/packages/core/runtime/reactPortalRootManager";
import { withAstraErrorBoundary } from "@/packages/core/runtime/AstraErrorBoundary";
import { createChatDomReconciler } from "@/packages/features/chat-session/message-actions/chatDomReconciler";
import {
	createEditDrawerController,
	createEditDraftOverride as createDraftOverrideFromLiveDraft,
} from "@/packages/features/chat-session/message-actions/editDrawerController";
import { createFrameScheduler } from "@/packages/features/chat-session/message-actions/frameScheduler";
import { createMessageHeaderActionRoots } from "@/packages/features/chat-session/message-actions/messageHeaderActionRoots";
import { createMessageTextGestureController } from "@/packages/features/chat-session/message-actions/messageTextGestures";

export interface MobileMessageActionsFeature {
	dispose(): void;
	mount(): void;
	unmount(): void;
}

type RevisionSnapshot = ReturnType<ChatMessageRevisionStore["getSnapshot"]>;
type SwipeSnapshot = ReturnType<ChatMessageSwipeStore["getSnapshot"]>;

const MESSAGE_TEXT_LONG_PRESS_ACTION_ATTRIBUTE =
	"data-astra-message-text-long-press-action";
const POST_GENERATION_FOOTER_SETTLE_MS = 750;

function MessageHeaderActions({
	onEdit,
	onMore,
}: {
	onEdit(): void;
	onMore(): void;
}) {
	return (
		<>
			<button
				aria-label={translateAstra("messageActions.header.edit.aria")}
				className="astra-mesHeaderActions__button astra-mesHeaderActions__button--edit"
				type="button"
				onClick={onEdit}
			>
				<UiIcon aria-hidden={true} icon={PencilLine} size="sm" />
			</button>
			<button
				aria-label={translateAstra("messageActions.header.more.aria")}
				className="astra-mesHeaderActions__button astra-mesHeaderActions__button--more"
				type="button"
				onClick={onMore}
			>
				<UiIcon aria-hidden={true} icon={Ellipsis} size="sm" />
			</button>
		</>
	);
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
	revisionSnapshot: RevisionSnapshot | null;
	swipeSnapshot: SwipeSnapshot | null;
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

export function createMobileMessageActionsFeature({
	documentRef = document,
	createHistoryStore,
	createPrimarySendActionStore = () =>
		createDefaultPrimarySendActionStore({ documentRef }),
	createRevisionStore = () => createChatMessageRevisionStore(),
	createSwipeStore = () => createChatMessageSwipeStore(),
}: {
	documentRef?: Document;
	createHistoryStore?: () => ChatMessageRevisionHistoryStore;
	createPrimarySendActionStore?: () => PrimarySendActionStore;
	createRevisionStore?: () => ChatMessageRevisionStore;
	createSwipeStore?: () => ChatMessageSwipeStore;
} = {}): MobileMessageActionsFeature {
	const resolvedCreateHistoryStore =
		createHistoryStore ??
		(() => createChatMessageRevisionHistoryStore({ documentRef }));
	const historyDrawerRoot = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-revision-history-drawer-host",
	});
	let historyStore: ChatMessageRevisionHistoryStore | null = null;
	const editDrawerRoot = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-edit-drawer-host",
	});
	const headerActionRoots = createMessageHeaderActionRoots({
		renderActions: (messageId) => (
			<MessageHeaderActions
				onEdit={() => {
					openEditDrawerForMessage(messageId);
				}}
				onMore={() => {
					openMoreActionsForMessage(messageId);
				}}
			/>
		),
	});
	let footerActionRoot: Root | null = null;
	let footerActionRootHost: HTMLDivElement | null = null;
	let messageInteractionStore: ChatMessageInteractionStore | null = null;
	let primarySendActionStore: PrimarySendActionStore | null = null;
	let revisionStore: ChatMessageRevisionStore | null = null;
	let selectedHistoryItem: ChatMessageRevisionHistoryItem | null = null;
	const editDrawer = createEditDrawerController();
	let swipeStore: ChatMessageSwipeStore | null = null;
	let deferredNativeActionFrameId: number | null = null;
	let isFooterInPostGenerationSettle = false;
	let wasFooterBlockedByGeneration = false;
	let postGenerationFooterSettleTimeoutId: ReturnType<
		typeof globalThis.setTimeout
	> | null = null;
	let unsubscribeHistory: (() => void) | null = null;
	let unsubscribeMessageInteraction: (() => void) | null = null;
	let unsubscribePrimarySendAction: (() => void) | null = null;
	let unsubscribeRevision: (() => void) | null = null;
	let unsubscribeSwipe: (() => void) | null = null;
	const renderScheduler = createFrameScheduler({
		callback: renderMessageActions,
		documentRef,
	});
	const postEditSettleRefreshScheduler = createFrameScheduler({
		callback: () => {
			refreshMessageActionStores({ renderImmediately: true });
		},
		documentRef,
	});
	const chatDomReconciler = createChatDomReconciler({
		documentRef,
		onReconcile: () => {
			refreshMessageActionStores({ renderImmediately: true });
		},
	});
	const messageTextGestures = createMessageTextGestureController({
		documentRef,
		getLongPressAction: () =>
			messageInteractionStore?.getSnapshot().longPressAction ??
			"disabled",
		isClickToEditEnabled,
		onOpenEdit: openEditDrawerForMessage,
		onOpenMore: openMoreActionsForMessage,
	});
	const moreActionsDrawer = createMessageMoreActionsDrawerController({
		createActions: createMoreActionsActionsConfig,
		createExtraActions: createMoreActionsQuickActionsConfig,
		documentRef,
		resolveTargetForMessage,
	});
	const extraActionsDrawer = createMessageExtraActionsDrawerController({
		createDangerActions: (target) =>
			createExtraActionsDrawerDangerActions({
				openDeletionConfirmation: openDeletionConfirmationForTarget,
				target,
			}),
		createNativeActions: createExtraActionsNativeActionConfig,
		documentRef,
		resolveTargetForMessage,
	});
	const deletionConfirmationDrawer =
		createMessageDeleteConfirmationDrawerController({
			documentRef,
			onDeleted: () => {
				refreshMessageActionStores({
					renderImmediately: true,
				});
			},
			resolveTargetForMessage,
		});

	function readMessageTextLongPressAction(): ChatMessageLongPressAction {
		return (
			messageInteractionStore?.getSnapshot().longPressAction ?? "disabled"
		);
	}

	function syncMessageTextLongPressActionAttribute() {
		documentRef.body?.setAttribute(
			MESSAGE_TEXT_LONG_PRESS_ACTION_ATTRIBUTE,
			readMessageTextLongPressAction(),
		);
	}

	function clearMessageTextLongPressActionAttribute() {
		documentRef.body?.removeAttribute(
			MESSAGE_TEXT_LONG_PRESS_ACTION_ATTRIBUTE,
		);
	}

	function renderHistoryDrawer() {
		if (!selectedHistoryItem && !historyDrawerRoot.getHost()) {
			return;
		}

		historyDrawerRoot.render(
			<RevisionHistoryDrawer
				item={selectedHistoryItem}
				open={Boolean(selectedHistoryItem)}
				onRevisionApplied={() => {
					historyStore?.refresh();
					revisionStore?.refresh();
					swipeStore?.refresh();
					renderMessageActions();
				}}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					selectedHistoryItem = null;
					renderHistoryDrawer();
				}}
			/>,
		);
	}

	function unmountHistoryDrawer() {
		historyDrawerRoot.unmount();
		selectedHistoryItem = null;
	}

	function unmountMoreActionsDrawer() {
		moreActionsDrawer.unmount();
	}

	function closeMoreActionsDrawer() {
		moreActionsDrawer.close();
	}

	function readEditDrawerDraft(
		messageId: number,
	): MessageEditDrawerDraft | null {
		const result = readChatMessageEditDraft({ messageId });
		return result.ok ? result.draft : null;
	}

	function createEditDraftOverride({
		messageId,
		submitDraft,
	}: {
		messageId: number;
		submitDraft: MessageEditDrawerSubmitDraft;
	}): MessageEditDrawerDraft | null {
		return createDraftOverrideFromLiveDraft({
			liveDraft: readEditDrawerDraft(messageId),
			submitDraft,
		});
	}

	function resolveTargetForMessage({
		includeRenderedMessage,
		messageId,
	}: {
		includeRenderedMessage: boolean;
		messageId: number;
	}): MessageActionsTarget | null {
		const selectedMessageElement = resolveMessageElement(
			documentRef,
			messageId,
		);
		if (!selectedMessageElement) {
			return null;
		}

		return resolveMoreActionsTarget({
			context: resolveContextSafe(),
			includeRenderedMessage,
			messageElement: selectedMessageElement,
			messageId,
		});
	}

	function resolveEditTargetForMessageId(
		messageId: number,
	): MessageActionsTarget | null {
		return resolveTargetForMessage({
			includeRenderedMessage: false,
			messageId,
		});
	}

	function resolveEditMessageReference(
		messageId: number,
	): MessageActionsChatMessageLike | null {
		return resolveChatMessage(resolveContextSafe(), messageId);
	}

	function resolveSelectedEditMessageId(): number | null {
		const context = resolveContextSafe();
		const chat = Array.isArray(context?.chat) ? context.chat : [];
		return editDrawer.resolveSelectedMessageId(chat);
	}

	function retargetEditTargetFallback(
		target: MessageActionsTarget,
		messageId: number,
	): MessageActionsTarget {
		return {
			...target,
			messageDisplayId: `#${messageId}`,
			messageId,
			metadata: {
				...target.metadata,
			},
		};
	}

	function resolveSelectedEditTarget(): MessageActionsTarget | null {
		const messageId = resolveSelectedEditMessageId();
		if (messageId === null) {
			return null;
		}

		const fallbackTarget = editDrawer.getState().target;
		return (
			resolveEditTargetForMessageId(messageId) ??
			(fallbackTarget
				? retargetEditTargetFallback(fallbackTarget, messageId)
				: null)
		);
	}

	function renderEditDrawer() {
		if (!editDrawer.getState().target && !editDrawerRoot.getHost()) {
			return;
		}

		const resolvedTarget = resolveSelectedEditTarget();
		if (!resolvedTarget) {
			unmountEditDrawer();
			return;
		}
		editDrawer.setTarget(resolvedTarget);
		editDrawer.retargetDraftOverride(resolvedTarget.messageId);

		const liveDraft = readEditDrawerDraft(resolvedTarget.messageId);
		const draft = editDrawer.resolveRenderableDraft({
			liveDraft,
			messageId: resolvedTarget.messageId,
		});
		if (!draft) {
			unmountEditDrawer();
			return;
		}

		const state = editDrawer.getState();
		const host = editDrawerRoot.ensure();
		editDrawerRoot.render(
			<MessageEditDrawer
				actions={createEditDrawerActions(resolvedTarget, draft)}
				container={host}
				draft={draft}
				isMutationPending={state.isMutationPending}
				open={state.isOpen}
				target={resolvedTarget}
				onConfirm={(submitDraft) => {
					void confirmEditDraft(submitDraft);
				}}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					closeEditDrawer();
				}}
			/>,
		);
	}

	function unmountEditDrawer() {
		editDrawerRoot.unmount();
		editDrawer.unmount();
	}

	function closeEditDrawer() {
		if (!editDrawer.getState().target && !editDrawerRoot.getHost()) {
			return;
		}

		editDrawer.close();
		renderEditDrawer();
	}

	function openEditDrawerForTarget(target: MessageActionsTarget) {
		const nextTarget = cloneMessageActionsTarget(target);
		editDrawer.prepareOpen({
			messageReference: resolveEditMessageReference(nextTarget.messageId),
			target: nextTarget,
		});
		closeMoreActionsDrawer();
		scheduleDeferredNativeAction(() => {
			const target =
				resolveEditTargetForMessageId(nextTarget.messageId) ??
				nextTarget;
			editDrawer.finishOpen({
				messageReference: resolveEditMessageReference(target.messageId),
				target,
			});
			renderEditDrawer();
		});
	}

	function openEditDrawerForMessage(messageId: number) {
		const target = resolveEditTargetForMessageId(messageId);
		if (!target) {
			unmountEditDrawer();
			return;
		}

		openEditDrawerForTarget(target);
	}

	function createMoreActionsNativeQuickActions(target: MessageActionsTarget) {
		return createNativeExtraQuickActions({
			closeMoreActionsDrawer,
			nativeActions: resolveNativeExtraMessageActions({
				documentRef,
				messageId: target.messageId,
			}),
			refreshMessageActionStores: () => {
				refreshMessageActionStores({ renderImmediately: true });
			},
			triggerNativeAction: (action) =>
				triggerNativeExtraMessageAction({
					action,
					documentRef,
				}),
		});
	}

	function createExtraActionsNativeActionConfig(
		target: MessageActionsTarget,
	) {
		return createNativeExtraDrawerActions({
			closeExtraActionsDrawer,
			nativeActions: resolveNativeExtraMessageActions({
				documentRef,
				messageId: target.messageId,
			}),
			refreshMessageActionStores: () => {
				refreshMessageActionStores({ renderImmediately: true });
			},
			triggerNativeAction: (action) =>
				triggerNativeExtraMessageAction({
					action,
					documentRef,
				}),
		});
	}

	function unmountExtraActionsDrawer() {
		extraActionsDrawer.unmount();
	}

	function closeExtraActionsDrawer() {
		extraActionsDrawer.close();
	}

	function unmountDeletionConfirmationDrawer() {
		deletionConfirmationDrawer.unmount();
	}

	function openDeletionConfirmationForTarget(
		kind: ChatMessageDeletionKind,
		target: MessageActionsTarget,
		source: "edit" | "extra" | "more" = "extra",
	) {
		if (source === "more") {
			closeMoreActionsDrawer();
		} else if (source === "edit") {
			closeEditDrawer();
		} else {
			closeExtraActionsDrawer();
		}
		scheduleDeferredNativeAction(() => {
			deletionConfirmationDrawer.open(kind, target);
		});
	}

	function setEditMutationPending(nextValue: boolean) {
		if (!editDrawer.setMutationPending(nextValue)) {
			return;
		}

		renderEditDrawer();
	}

	async function confirmEditDraft(submitDraft: MessageEditDrawerSubmitDraft) {
		if (editDrawer.getState().isMutationPending) {
			return;
		}

		setEditMutationPending(true);
		const result = await saveChatMessageEdit(submitDraft);
		if (!result.ok) {
			setEditMutationPending(false);
			return;
		}

		editDrawer.setMutationPending(false);
		closeEditDrawer();
		refreshMessageActionStores({ renderImmediately: true });
		postEditSettleRefreshScheduler.schedule();
	}

	async function copyEditDraft(submitDraft: MessageEditDrawerSubmitDraft) {
		if (editDrawer.getState().isMutationPending) {
			return;
		}

		editDrawer.setDraftOverride(
			createEditDraftOverride({
				messageId: submitDraft.messageId,
				submitDraft,
			}),
		);
		setEditMutationPending(true);
		const result = await copyChatMessageFromDraft(submitDraft);
		if (!result.ok) {
			setEditMutationPending(false);
			return;
		}

		editDrawer.setMutationPending(false);
		refreshMessageActionStores({ renderImmediately: true });
		renderEditDrawer();
	}

	async function moveEditDraft({
		direction,
		submitDraft,
	}: {
		direction: ChatMessageMoveDirection;
		submitDraft: MessageEditDrawerSubmitDraft;
	}) {
		if (editDrawer.getState().isMutationPending) {
			return;
		}

		editDrawer.setDraftOverride(
			createEditDraftOverride({
				messageId: submitDraft.messageId,
				submitDraft,
			}),
		);
		setEditMutationPending(true);
		const result = await moveChatMessage({
			direction,
			messageId: submitDraft.messageId,
		});
		if (!result.ok) {
			setEditMutationPending(false);
			return;
		}

		editDrawer.setDraftOverride(
			createEditDraftOverride({
				messageId: result.messageId,
				submitDraft: {
					...submitDraft,
					messageId: result.messageId,
				},
			}),
		);
		const fallbackTarget = editDrawer.getState().target;
		const movedTarget =
			resolveEditTargetForMessageId(result.messageId) ??
			(fallbackTarget
				? {
						...fallbackTarget,
						messageId: result.messageId,
						metadata: {
							...fallbackTarget.metadata,
						},
					}
				: null);
		if (movedTarget) {
			editDrawer.finishOpen({
				messageReference:
					resolveEditMessageReference(result.messageId) ??
					editDrawer.getState().messageReference,
				target: movedTarget,
			});
		}
		editDrawer.setMutationPending(false);
		refreshMessageActionStores({ renderImmediately: true });
		renderEditDrawer();
	}

	function createEditDrawerActions(
		target: MessageActionsTarget,
		draft: MessageEditDrawerDraft,
	) {
		return createEditDrawerActionConfig({
			copyEditDraft: (submitDraft) => {
				void copyEditDraft(submitDraft);
			},
			draft,
			moveEditDraft: ({ direction, submitDraft }) => {
				void moveEditDraft({
					direction,
					submitDraft,
				});
			},
			openDeletionConfirmation: openDeletionConfirmationForTarget,
			target,
		});
	}

	function openExtraActionsForMessage(messageId: number) {
		closeMoreActionsDrawer();
		scheduleDeferredNativeAction(() => {
			extraActionsDrawer.openForMessage(messageId);
		});
	}

	function resolveHistoryItemForMoreActionsTarget(
		target: MessageActionsTarget,
	): ChatMessageRevisionHistoryItem | null {
		return (
			(historyStore?.getSnapshot() ?? []).find(
				(item) =>
					item.hasHistory &&
					item.messageId === target.messageId &&
					item.swipeIndex === target.swipeIndex,
			) ?? null
		);
	}

	function cancelDeferredNativeAction() {
		if (deferredNativeActionFrameId === null) {
			return;
		}

		const view = documentRef.defaultView;
		if (typeof view?.cancelAnimationFrame === "function") {
			view.cancelAnimationFrame(deferredNativeActionFrameId);
		}
		deferredNativeActionFrameId = null;
	}

	function scheduleDeferredNativeAction(callback: () => void) {
		cancelDeferredNativeAction();
		const view = documentRef.defaultView;
		if (typeof view?.requestAnimationFrame === "function") {
			deferredNativeActionFrameId = view.requestAnimationFrame(() => {
				deferredNativeActionFrameId = null;
				callback();
			});
			return;
		}

		callback();
	}

	function dispatchMoreActionsCopy(messageId: number): boolean {
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

	function dispatchMoreActionsPromptVisibility({
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

	function createMoreActionsActionsConfig(target: MessageActionsTarget) {
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
			closeMoreActionsDrawer,
			dispatchCopy: dispatchMoreActionsCopy,
			dispatchPromptVisibility: dispatchMoreActionsPromptVisibility,
			historyItem: resolveHistoryItemForMoreActionsTarget(target),
			onEdit: openEditDrawerForTarget,
			onMore: openExtraActionsForMessage,
			onOpenHistory: (historyItem) => {
				scheduleDeferredNativeAction(() => {
					selectedHistoryItem = historyItem;
					renderHistoryDrawer();
				});
			},
			promptVisibilityActionName,
			refreshMessageActionStores: () => {
				refreshMessageActionStores({ renderImmediately: true });
			},
			target,
		});
	}

	function createMoreActionsQuickActionsConfig(target: MessageActionsTarget) {
		return createMoreActionsExtraActions({
			nativeQuickActions: createMoreActionsNativeQuickActions(target),
			openDeletionConfirmation: openDeletionConfirmationForTarget,
			target,
		});
	}

	function openMoreActionsForMessage(messageId: number) {
		moreActionsDrawer.openForMessage(messageId);
	}

	function isClickToEditEnabled(): boolean {
		const context = resolveContextSafe();
		const powerUserSettings = isRecord(context?.powerUserSettings)
			? context.powerUserSettings
			: null;

		return powerUserSettings?.click_to_edit === true;
	}

	function removeLegacyMessageActionHosts() {
		for (const host of resolveLegacyMessageActionHosts(documentRef)) {
			cleanupMessageActionSlots(host);
		}
	}

	function syncOpenMessageActionTargets(validMessageIds: Set<number>) {
		moreActionsDrawer.sync(validMessageIds);
		extraActionsDrawer.sync(validMessageIds);
		deletionConfirmationDrawer.sync(validMessageIds);

		const editState = editDrawer.getState();
		if (editState.target) {
			if (
				!editState.messageReference &&
				!validMessageIds.has(editState.target.messageId)
			) {
				unmountEditDrawer();
				return;
			}

			const resolvedTarget = resolveSelectedEditTarget();
			if (!resolvedTarget) {
				unmountEditDrawer();
				return;
			}

			editDrawer.setTarget(resolvedTarget);
			renderEditDrawer();
		}
	}

	function cancelScheduledMessageActionsRender() {
		renderScheduler.cancel();
	}

	function renderMessageActionsImmediately() {
		cancelScheduledMessageActionsRender();
		renderMessageActions();
	}

	function scheduleMessageActionsRender() {
		renderScheduler.schedule();
	}

	function refreshMessageActionStores({
		renderImmediately = false,
	}: {
		renderImmediately?: boolean;
	} = {}) {
		historyStore?.refresh();
		primarySendActionStore?.refresh();
		revisionStore?.refresh();
		swipeStore?.refresh();
		if (renderImmediately) {
			renderMessageActionsImmediately();
			return;
		}

		scheduleMessageActionsRender();
	}

	function observeChatDom() {
		chatDomReconciler.start();
	}

	function stopObservingChatDom() {
		chatDomReconciler.stop();
		postEditSettleRefreshScheduler.cancel();
		stopPostGenerationFooterSettle();
		cancelScheduledMessageActionsRender();
	}

	function runRevisionAction(action: (() => Promise<boolean>) | undefined) {
		if (!action) {
			return;
		}

		void action().finally(refreshMessageActionStores);
	}

	function clearPostGenerationFooterSettleTimer() {
		if (postGenerationFooterSettleTimeoutId === null) {
			return;
		}

		globalThis.clearTimeout(postGenerationFooterSettleTimeoutId);
		postGenerationFooterSettleTimeoutId = null;
	}

	function stopPostGenerationFooterSettle() {
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
			renderMessageActionsImmediately();
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

	function unmountFooterActionRoot() {
		stopPostGenerationFooterSettle();
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
			unmountFooterActionRoot();
			footerActionRoot = createRoot(actionHost);
			footerActionRootHost = actionHost;
		}

		return footerActionRoot;
	}

	function unmountRoots() {
		headerActionRoots.unmountAll();
		unmountMoreActionsDrawer();
		unmountEditDrawer();
		unmountExtraActionsDrawer();
		unmountDeletionConfirmationDrawer();
		unmountHistoryDrawer();
		unmountFooterActionRoot();
	}

	function syncHistoryDrawerSelection(
		items: ChatMessageRevisionHistoryItem[],
	) {
		if (selectedHistoryItem) {
			selectedHistoryItem =
				items.find(
					(item) =>
						item.messageId === selectedHistoryItem?.messageId &&
						item.swipeIndex === selectedHistoryItem.swipeIndex,
				) ?? null;
			renderHistoryDrawer();
		}
	}

	function renderMessageActions() {
		const historySnapshot = historyStore?.getSnapshot() ?? [];
		const isGenerating =
			primarySendActionStore?.getSnapshot().isGenerating === true;
		const wasFooterBlockedBeforeRender = wasFooterBlockedByGeneration;
		wasFooterBlockedByGeneration = false;
		const revisionSnapshot = revisionStore?.getSnapshot();
		const swipeSnapshot = swipeStore?.getSnapshot();
		const context = resolveContextSafe();
		const loadedMessages = resolveLoadedMessageElements(documentRef);
		const validMessageIds = new Set(
			loadedMessages.map(({ messageId }) => messageId),
		);

		removeLegacyMessageActionHosts();
		headerActionRoots.render(loadedMessages);
		syncOpenMessageActionTargets(validMessageIds);
		syncHistoryDrawerSelection(historySnapshot);

		const targetMessage = resolveLastActionableFooterMessage({
			context,
			loadedMessages,
		});
		if (!targetMessage) {
			unmountFooterActionRoot();
			return;
		}

		const targetMessageId = targetMessage.messageId;
		if (isGenerating) {
			stopPostGenerationFooterSettle();
			const slots = ensureMessageActionSlots(
				targetMessage.messageElement,
			);
			if (!slots) {
				unmountRoots();
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
					unmountRoots();
					return;
				}

				setFooterGenerationBlocked(slots.container, false);
				setFooterPostGenerationSettling(slots.container, true);
				ensureFooterActionRoot(slots.container).render(null);
				return;
			}

			unmountFooterActionRoot();
			return;
		}

		stopPostGenerationFooterSettle();
		const slots = ensureMessageActionSlots(targetMessage.messageElement);
		if (!slots) {
			unmountRoots();
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
											selectedHistoryItem =
												inlineHistoryItem;
											renderHistoryDrawer();
										},
									}
								: null
						}
						revisionSnapshot={revisionActionsSnapshot}
						swipeSnapshot={swipeActionsSnapshot}
						onContinue={() => {
							runRevisionAction(
								() =>
									revisionStore?.continueLastMessage() ??
									Promise.resolve(false),
							);
						}}
						onRegenerate={() => {
							runRevisionAction(
								() =>
									revisionStore?.regenerateLastRevision() ??
									Promise.resolve(false),
							);
						}}
						onSwipeNext={() => {
							void swipeStore?.swipeNext();
						}}
						onSwipePrevious={() => {
							void swipeStore?.swipePrevious();
						}}
						onUndo={() => {
							runRevisionAction(
								() =>
									revisionStore?.undoLastRevision() ??
									Promise.resolve(false),
							);
						}}
					/>
				),
				source: "message-footer-actions",
			}),
		);
	}

	function mount() {
		if (
			historyStore &&
			messageInteractionStore &&
			primarySendActionStore &&
			swipeStore &&
			revisionStore
		) {
			removeLegacyMessageActionHosts();
			observeChatDom();
			messageTextGestures.attach();
			syncMessageTextLongPressActionAttribute();
			historyStore.refresh();
			primarySendActionStore.refresh();
			revisionStore.refresh();
			swipeStore.refresh();
			renderMessageActions();
			return;
		}

		removeLegacyMessageActionHosts();
		observeChatDom();
		messageTextGestures.attach();
		historyStore = resolvedCreateHistoryStore();
		messageInteractionStore = createChatMessageInteractionStore({
			eventTarget: documentRef.defaultView ?? undefined,
		});
		primarySendActionStore = createPrimarySendActionStore();
		revisionStore = createRevisionStore();
		swipeStore = createSwipeStore();
		syncMessageTextLongPressActionAttribute();
		unsubscribeHistory = historyStore.subscribe(
			scheduleMessageActionsRender,
		);
		unsubscribeMessageInteraction = messageInteractionStore.subscribe(
			syncMessageTextLongPressActionAttribute,
		);
		unsubscribePrimarySendAction = primarySendActionStore.subscribe(
			scheduleMessageActionsRender,
		);
		unsubscribeRevision = revisionStore.subscribe(
			scheduleMessageActionsRender,
		);
		unsubscribeSwipe = swipeStore.subscribe(scheduleMessageActionsRender);
		historyStore.refresh();
		primarySendActionStore.refresh();
		revisionStore.refresh();
		swipeStore.refresh();
		renderMessageActions();
	}

	function unmount() {
		stopObservingChatDom();
		cancelDeferredNativeAction();
		messageTextGestures.detach();
		unsubscribeHistory?.();
		unsubscribeHistory = null;
		unsubscribeMessageInteraction?.();
		unsubscribeMessageInteraction = null;
		unsubscribePrimarySendAction?.();
		unsubscribePrimarySendAction = null;
		unsubscribeRevision?.();
		unsubscribeRevision = null;
		unsubscribeSwipe?.();
		unsubscribeSwipe = null;
		clearMessageTextLongPressActionAttribute();
		unmountRoots();
		historyStore?.dispose();
		historyStore = null;
		messageInteractionStore?.dispose();
		messageInteractionStore = null;
		primarySendActionStore?.dispose();
		primarySendActionStore = null;
		revisionStore?.dispose();
		revisionStore = null;
		swipeStore?.dispose();
		swipeStore = null;
	}

	return {
		dispose: unmount,
		mount,
		unmount,
	};
}
