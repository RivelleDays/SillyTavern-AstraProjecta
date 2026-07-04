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
	type ChatMessageInteractionStore,
} from "@/packages/core/st/chat-message-interaction";
import {
	type ChatMessageDeletionKind,
	readChatMessageDeletionSupport,
} from "@/packages/core/st/chatMessageDeletion";
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
import {
	Delete,
	Ellipsis,
	Eye,
	EyeOff,
	MessageCircleX,
	PencilLine,
} from "@/components/ui/shared/icons";
import type { LucideIcon } from "@/components/ui/shared/icons";
import {
	cleanupMessageActionSlots,
	ensureMessageActionSlots,
} from "@/packages/features/chat-session/message-actions/messageActionSlots";
import {
	asOptionalBoolean,
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
	resolveNativePromptVisibilityState,
	type NativeMessageAction,
} from "@/packages/features/chat-session/message-actions/contracts/dom";
import {
	MoreActionsDrawer,
	type MessageActionsTarget,
	type MoreActionsDrawerActionsConfig,
} from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import {
	MessageExtraActionsDrawer,
	type MessageExtraActionsDrawerAction,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionsDrawer";
import type { MessageExtraActionItem } from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionItem";
import {
	MessageDeleteConfirmationDrawer,
	type MessageDeleteConfirmationDrawerState,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageDeleteConfirmationDrawer";
import {
	MessageEditDrawer,
	type MessageEditDrawerDraft,
	type MessageEditDrawerSubmitDraft,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageEditDrawer";
import {
	resolveNativeExtraMessageActions,
	triggerNativeExtraMessageAction,
	type NativeExtraMessageAction,
} from "@/packages/features/chat-session/message-actions/more-actions/nativeExtraMessageActions";
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
	const deletionConfirmationDrawerRoot = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-delete-confirmation-drawer-host",
	});
	const editDrawerRoot = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-edit-drawer-host",
	});
	const extraActionsDrawerRoot = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-extra-actions-drawer-host",
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
	const moreActionsDrawerRoot = createAstraReactPortalRootManager({
		documentRef,
		id: "astra-message-more-actions-drawer-host",
	});
	let messageInteractionStore: ChatMessageInteractionStore | null = null;
	let primarySendActionStore: PrimarySendActionStore | null = null;
	let revisionStore: ChatMessageRevisionStore | null = null;
	let selectedHistoryItem: ChatMessageRevisionHistoryItem | null = null;
	let selectedDeletionConfirmation: MessageDeleteConfirmationDrawerState | null =
		null;
	const editDrawer = createEditDrawerController();
	let selectedMoreActionsTarget: MessageActionsTarget | null = null;
	let swipeStore: ChatMessageSwipeStore | null = null;
	let deferredNativeActionFrameId: number | null = null;
	let selectedExtraActionsTarget: MessageActionsTarget | null = null;
	let isMoreActionsDrawerOpen = false;
	let unsubscribeHistory: (() => void) | null = null;
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

	function renderMoreActionsDrawer() {
		if (!selectedMoreActionsTarget && !moreActionsDrawerRoot.getHost()) {
			return;
		}

		const host = moreActionsDrawerRoot.ensure();
		moreActionsDrawerRoot.render(
			<MoreActionsDrawer
				actions={
					selectedMoreActionsTarget
						? createMoreActionsDrawerActions(
								selectedMoreActionsTarget,
							)
						: undefined
				}
				container={host}
				extraActions={
					selectedMoreActionsTarget
						? createMoreActionsExtraActions(
								selectedMoreActionsTarget,
							)
						: []
				}
				open={
					isMoreActionsDrawerOpen &&
					Boolean(selectedMoreActionsTarget)
				}
				target={selectedMoreActionsTarget}
				onExitComplete={() => {
					if (!isMoreActionsDrawerOpen) {
						unmountMoreActionsDrawer();
					}
				}}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					unmountMoreActionsDrawer();
				}}
			/>,
		);
	}

	function unmountMoreActionsDrawer() {
		moreActionsDrawerRoot.unmount();
		selectedMoreActionsTarget = null;
		isMoreActionsDrawerOpen = false;
	}

	function closeMoreActionsDrawer() {
		if (!selectedMoreActionsTarget && !moreActionsDrawerRoot.getHost()) {
			return;
		}

		isMoreActionsDrawerOpen = false;
		renderMoreActionsDrawer();
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

	function resolveEditTargetForMessageId(
		messageId: number,
	): MessageActionsTarget | null {
		const selectedMessageElement = resolveMessageElement(
			documentRef,
			messageId,
		);
		if (!selectedMessageElement) {
			return null;
		}

		return resolveMoreActionsTarget({
			context: resolveContextSafe(),
			includeRenderedMessage: false,
			messageElement: selectedMessageElement,
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
		const nextTarget = cloneDeletionTarget(target);
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

	function resolveNativePromptVisibilityIcon(
		action: NativeExtraMessageAction,
	): LucideIcon | undefined {
		const state = resolveNativePromptVisibilityState(action.element);
		if (state === "excluded") {
			return Eye;
		}

		if (state === "included") {
			return EyeOff;
		}

		return undefined;
	}

	function createNativeExtraDrawerActions(
		target: MessageActionsTarget,
	): MessageExtraActionsDrawerAction[] {
		return resolveNativeExtraMessageActions({
			documentRef,
			messageId: target.messageId,
		}).map((nativeAction) => ({
			description: nativeAction.description,
			icon: resolveNativePromptVisibilityIcon(nativeAction),
			iconClassName: nativeAction.iconClassName,
			id: nativeAction.id,
			label: nativeAction.label,
			onClick: () => {
				if (
					!triggerNativeExtraMessageAction({
						action: nativeAction,
						documentRef,
					})
				) {
					return;
				}

				closeExtraActionsDrawer();
				refreshMessageActionStores({ renderImmediately: true });
			},
		}));
	}

	function createNativeExtraQuickActions(
		target: MessageActionsTarget,
	): MessageExtraActionItem[] {
		return resolveNativeExtraMessageActions({
			documentRef,
			messageId: target.messageId,
		}).map((nativeAction) => ({
			description: nativeAction.description,
			icon: resolveNativePromptVisibilityIcon(nativeAction),
			iconClassName: nativeAction.iconClassName,
			id: nativeAction.id,
			label: nativeAction.label,
			onClick: () => {
				if (
					!triggerNativeExtraMessageAction({
						action: nativeAction,
						documentRef,
					})
				) {
					return;
				}

				closeMoreActionsDrawer();
				refreshMessageActionStores({ renderImmediately: true });
			},
			variant: "native",
		}));
	}

	function renderExtraActionsDrawer() {
		if (!selectedExtraActionsTarget && !extraActionsDrawerRoot) {
			return;
		}

		const host = extraActionsDrawerRoot.ensure();
		const target = selectedExtraActionsTarget;
		const deletionSupport = target
			? readChatMessageDeletionSupport({
					swipeTotal: target.swipeTotal,
				})
			: {
					canDeleteMessage: false,
					canDeleteSwipe: false,
				};

		extraActionsDrawerRoot.render(
			<MessageExtraActionsDrawer
				container={host}
				dangerActions={{
					deleteMessage: {
						disabled: !deletionSupport.canDeleteMessage,
						onClick: () => {
							if (!target) {
								return;
							}

							openDeletionConfirmationForTarget(
								"message",
								target,
							);
						},
					},
					deleteSwipe: {
						disabled: !deletionSupport.canDeleteSwipe,
						onClick: () => {
							if (!target) {
								return;
							}

							openDeletionConfirmationForTarget("swipe", target);
						},
					},
				}}
				nativeActions={
					target ? createNativeExtraDrawerActions(target) : []
				}
				open={Boolean(target)}
				target={target}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					selectedExtraActionsTarget = null;
					renderExtraActionsDrawer();
				}}
			/>,
		);
	}

	function unmountExtraActionsDrawer() {
		extraActionsDrawerRoot.unmount();
		selectedExtraActionsTarget = null;
	}

	function closeExtraActionsDrawer() {
		unmountExtraActionsDrawer();
	}

	function renderDeletionConfirmationDrawer() {
		if (!selectedDeletionConfirmation) {
			unmountDeletionConfirmationDrawer();
			return;
		}

		const host = deletionConfirmationDrawerRoot.ensure();
		deletionConfirmationDrawerRoot.render(
			<MessageDeleteConfirmationDrawer
				action={selectedDeletionConfirmation}
				container={host}
				onDeleted={() => {
					refreshMessageActionStores({
						renderImmediately: true,
					});
				}}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					selectedDeletionConfirmation = null;
					unmountDeletionConfirmationDrawer();
				}}
			/>,
		);
	}

	function unmountDeletionConfirmationDrawer() {
		deletionConfirmationDrawerRoot.unmount();
		selectedDeletionConfirmation = null;
	}

	function cloneDeletionTarget(
		target: MessageActionsTarget,
	): MessageActionsTarget {
		return {
			...target,
			metadata: {
				...target.metadata,
			},
		};
	}

	function resolveDeletionConfirmationTarget(
		target: MessageActionsTarget,
	): MessageActionsTarget {
		const fallbackTarget = cloneDeletionTarget(target);
		const selectedMessageElement = resolveMessageElement(
			documentRef,
			target.messageId,
		);
		if (!selectedMessageElement) {
			return fallbackTarget;
		}

		const renderedTarget = resolveMoreActionsTarget({
			context: resolveContextSafe(),
			includeRenderedMessage: true,
			messageElement: selectedMessageElement,
			messageId: target.messageId,
		});
		if (!renderedTarget.renderedMessageHtml.trim()) {
			return fallbackTarget;
		}

		return cloneDeletionTarget(renderedTarget);
	}

	function openDeletionConfirmationForTarget(
		kind: ChatMessageDeletionKind,
		target: MessageActionsTarget,
		source: "edit" | "extra" | "more" = "extra",
	) {
		const nextDeletionConfirmation: MessageDeleteConfirmationDrawerState = {
			kind,
			target: resolveDeletionConfirmationTarget(target),
		};

		if (source === "more") {
			closeMoreActionsDrawer();
		} else if (source === "edit") {
			closeEditDrawer();
		} else {
			closeExtraActionsDrawer();
		}
		scheduleDeferredNativeAction(() => {
			selectedDeletionConfirmation = nextDeletionConfirmation;
			renderDeletionConfirmationDrawer();
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
		const deletionSupport = readChatMessageDeletionSupport({
			swipeTotal: target.swipeTotal,
		});

		return {
			addReasoning: {
				disabled: draft.hasReasoning,
			},
			copy: {
				disabled: !draft.canCopy,
				onClick: (submitDraft: MessageEditDrawerSubmitDraft) => {
					void copyEditDraft(submitDraft);
				},
			},
			deleteMessage: {
				disabled: !deletionSupport.canDeleteMessage,
				onClick: () => {
					openDeletionConfirmationForTarget(
						"message",
						target,
						"edit",
					);
				},
			},
			deleteSwipe: {
				disabled: !deletionSupport.canDeleteSwipe,
				onClick: () => {
					openDeletionConfirmationForTarget("swipe", target, "edit");
				},
			},
			moveDown: {
				disabled: !draft.canMoveDown,
				onClick: (submitDraft: MessageEditDrawerSubmitDraft) => {
					void moveEditDraft({
						direction: "down",
						submitDraft,
					});
				},
			},
			moveUp: {
				disabled: !draft.canMoveUp,
				onClick: (submitDraft: MessageEditDrawerSubmitDraft) => {
					void moveEditDraft({
						direction: "up",
						submitDraft,
					});
				},
			},
		};
	}

	function openExtraActionsForMessage(messageId: number) {
		closeMoreActionsDrawer();
		scheduleDeferredNativeAction(() => {
			const selectedMessageElement = resolveMessageElement(
				documentRef,
				messageId,
			);
			if (!selectedMessageElement) {
				unmountExtraActionsDrawer();
				return;
			}

			selectedExtraActionsTarget = resolveMoreActionsTarget({
				context: resolveContextSafe(),
				includeRenderedMessage: true,
				messageElement: selectedMessageElement,
				messageId,
			});
			renderExtraActionsDrawer();
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

	function createMoreActionsDrawerActions(
		target: MessageActionsTarget,
	): MoreActionsDrawerActionsConfig {
		const copyAction = resolveNativeMessageActionElement({
			action: "copy",
			documentRef,
			messageId: target.messageId,
		});
		const promptVisibilityActionName: NativeMessageAction = target.isSystem
			? "unhide"
			: "hide";
		const promptVisibilityAction = resolveNativeMessageActionElement({
			action: promptVisibilityActionName,
			documentRef,
			messageId: target.messageId,
		});
		const historyItem = resolveHistoryItemForMoreActionsTarget(target);

		return {
			copy: {
				disabled: !copyAction,
				onClick: () => {
					const nextCopyAction = resolveNativeMessageActionElement({
						action: "copy",
						documentRef,
						messageId: target.messageId,
					});
					if (!nextCopyAction) {
						return;
					}

					dispatchNativePointerUp({
						documentRef,
						element: nextCopyAction,
					});
					closeMoreActionsDrawer();
				},
			},
			edit: {
				disabled: false,
				onClick: () => {
					openEditDrawerForTarget(target);
				},
			},
			history: {
				disabled: !historyItem,
				onClick: () => {
					if (!historyItem) {
						return;
					}

					closeMoreActionsDrawer();
					scheduleDeferredNativeAction(() => {
						selectedHistoryItem = historyItem;
						renderHistoryDrawer();
					});
				},
			},
			more: {
				disabled: false,
				onClick: () => {
					openExtraActionsForMessage(target.messageId);
				},
			},
			promptVisibility: {
				disabled: !promptVisibilityAction,
				isExcluded: target.isSystem,
				onClick: () => {
					const nextPromptVisibilityAction =
						resolveNativeMessageActionElement({
							action: promptVisibilityActionName,
							documentRef,
							messageId: target.messageId,
						});
					if (!nextPromptVisibilityAction) {
						return;
					}

					dispatchNativeClick({
						documentRef,
						element: nextPromptVisibilityAction,
					});
					closeMoreActionsDrawer();
					refreshMessageActionStores({ renderImmediately: true });
				},
			},
		};
	}

	function createMoreActionsExtraActions(
		target: MessageActionsTarget,
	): MessageExtraActionItem[] {
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
					openDeletionConfirmationForTarget("swipe", target, "more");
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
				openDeletionConfirmationForTarget("message", target, "more");
			},
			variant: "danger",
		});

		return quickActions.concat(createNativeExtraQuickActions(target));
	}

	function openMoreActionsForMessage(messageId: number) {
		const selectedMessageElement = resolveMessageElement(
			documentRef,
			messageId,
		);
		if (!selectedMessageElement) {
			unmountMoreActionsDrawer();
			return;
		}

		selectedMoreActionsTarget = resolveMoreActionsTarget({
			context: resolveContextSafe(),
			includeRenderedMessage: true,
			messageElement: selectedMessageElement,
			messageId,
		});
		isMoreActionsDrawerOpen = true;
		renderMoreActionsDrawer();
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
		if (selectedMoreActionsTarget) {
			if (!validMessageIds.has(selectedMoreActionsTarget.messageId)) {
				unmountMoreActionsDrawer();
				return;
			}

			const selectedMessageElement = resolveMessageElement(
				documentRef,
				selectedMoreActionsTarget.messageId,
			);
			if (!selectedMessageElement) {
				unmountMoreActionsDrawer();
				return;
			}

			if (isMoreActionsDrawerOpen) {
				selectedMoreActionsTarget = resolveMoreActionsTarget({
					context: resolveContextSafe(),
					includeRenderedMessage: true,
					messageElement: selectedMessageElement,
					messageId: selectedMoreActionsTarget.messageId,
				});
				renderMoreActionsDrawer();
			}
		}

		if (selectedExtraActionsTarget) {
			if (!validMessageIds.has(selectedExtraActionsTarget.messageId)) {
				unmountExtraActionsDrawer();
				return;
			}

			const selectedMessageElement = resolveMessageElement(
				documentRef,
				selectedExtraActionsTarget.messageId,
			);
			if (!selectedMessageElement) {
				unmountExtraActionsDrawer();
				return;
			}

			selectedExtraActionsTarget = resolveMoreActionsTarget({
				context: resolveContextSafe(),
				includeRenderedMessage: false,
				messageElement: selectedMessageElement,
				messageId: selectedExtraActionsTarget.messageId,
			});
			renderExtraActionsDrawer();
		}

		if (
			selectedDeletionConfirmation &&
			!validMessageIds.has(selectedDeletionConfirmation.target.messageId)
		) {
			unmountDeletionConfirmationDrawer();
		}

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
		cancelScheduledMessageActionsRender();
	}

	function runRevisionAction(action: (() => Promise<boolean>) | undefined) {
		if (!action) {
			return;
		}

		void action().finally(refreshMessageActionStores);
	}

	function unmountFooterActionRoot() {
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
		const revisionActionsSnapshot =
			!isGenerating &&
			revisionSnapshot?.status === "ready" &&
			revisionSnapshot.messageId === targetMessageId &&
			(revisionSnapshot.canContinue ||
				revisionSnapshot.canRegenerate ||
				revisionSnapshot.canUndo)
				? revisionSnapshot
				: null;
		const swipeActionsSnapshot =
			!isGenerating &&
			swipeSnapshot?.status === "ready" &&
			swipeSnapshot.messageId === targetMessageId &&
			(swipeSnapshot.canSwipeNext ||
				swipeSnapshot.canSwipePrevious ||
				swipeSnapshot.isNativeSwipeBusy)
				? swipeSnapshot
				: null;
		const inlineHistoryItem = isGenerating
			? null
			: resolveInlineHistoryItem({
					historySnapshot,
					messageId: targetMessageId,
				});

		if (
			!revisionActionsSnapshot &&
			!swipeActionsSnapshot &&
			!inlineHistoryItem
		) {
			unmountFooterActionRoot();
			return;
		}

		const slots = ensureMessageActionSlots(targetMessage.messageElement);
		if (!slots) {
			unmountRoots();
			return;
		}

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
		unsubscribeHistory = historyStore.subscribe(
			scheduleMessageActionsRender,
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
		unsubscribePrimarySendAction?.();
		unsubscribePrimarySendAction = null;
		unsubscribeRevision?.();
		unsubscribeRevision = null;
		unsubscribeSwipe?.();
		unsubscribeSwipe = null;
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
