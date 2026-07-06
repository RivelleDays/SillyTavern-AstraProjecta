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
import { cleanupMessageActionSlots } from "@/packages/features/chat-session/message-actions/messageActionSlots";
import {
	resolveChatMessage,
	resolveContextSafe,
	resolveMoreActionsTarget,
	type MessageActionsChatMessageLike,
} from "@/packages/features/chat-session/message-actions/messageActionTargetResolver";
import {
	resolveLegacyMessageActionHosts,
	resolveLoadedMessageElements,
	resolveMessageElement,
} from "@/packages/features/chat-session/message-actions/contracts/dom";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import {
	MessageEditDrawer,
	type MessageEditDrawerDraft,
	type MessageEditDrawerSubmitDraft,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageEditDrawer";
import { createEditDrawerActions as createEditDrawerActionConfig } from "@/packages/features/chat-session/message-actions/more-actions/messageEditDrawerActionModel";
import {
	cloneMessageActionsTarget,
	createMessageDeleteConfirmationDrawerController,
	type MessageDeleteConfirmationSource,
} from "@/packages/features/chat-session/message-actions/more-actions/messageDeleteConfirmationDrawerController";
import { createMessageExtraActionsDrawerController } from "@/packages/features/chat-session/message-actions/more-actions/messageExtraActionsDrawerController";
import { createMessageMoreActionsDrawerController } from "@/packages/features/chat-session/message-actions/more-actions/messageMoreActionsDrawerController";
import { RevisionHistoryDrawer } from "@/packages/features/chat-session/message-actions/revision-history/RevisionHistoryDrawer";
import { createAstraReactPortalRootManager } from "@/packages/core/runtime/reactPortalRootManager";
import { createChatDomReconciler } from "@/packages/features/chat-session/message-actions/chatDomReconciler";
import {
	createEditDrawerController,
	createEditDraftOverride as createDraftOverrideFromLiveDraft,
} from "@/packages/features/chat-session/message-actions/editDrawerController";
import { createMessageDrawerHandoffScheduler } from "@/packages/features/chat-session/message-actions/messageDrawerHandoffScheduler";
import { createFrameScheduler } from "@/packages/features/chat-session/message-actions/frameScheduler";
import { createMessageFooterActionsController } from "@/packages/features/chat-session/message-actions/messageFooterActionsController";
import { createMessageHeaderActionRoots } from "@/packages/features/chat-session/message-actions/messageHeaderActionRoots";
import { createMessageTextGestureController } from "@/packages/features/chat-session/message-actions/messageTextGestures";

export interface MobileMessageActionsFeature {
	dispose(): void;
	mount(): void;
	unmount(): void;
}

const MESSAGE_TEXT_LONG_PRESS_ACTION_ATTRIBUTE =
	"data-astra-message-text-long-press-action";

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
	let messageInteractionStore: ChatMessageInteractionStore | null = null;
	let primarySendActionStore: PrimarySendActionStore | null = null;
	let revisionStore: ChatMessageRevisionStore | null = null;
	let selectedHistoryItem: ChatMessageRevisionHistoryItem | null = null;
	const editDrawer = createEditDrawerController();
	let swipeStore: ChatMessageSwipeStore | null = null;
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
	const drawerHandoffScheduler = createMessageDrawerHandoffScheduler({
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
		documentRef,
		handoffScheduler: drawerHandoffScheduler,
		openDeletionConfirmation: (kind, target, source) => {
			deletionConfirmationDrawer.open(kind, target, source);
		},
		openEditDrawerForTarget,
		openExtraActionsForMessage: (messageId) => {
			extraActionsDrawer.openForMessage(messageId);
		},
		openHistoryItem: (historyItem) => {
			selectedHistoryItem = historyItem;
			renderHistoryDrawer();
		},
		refreshMessageActionStores: () => {
			refreshMessageActionStores({ renderImmediately: true });
		},
		resolveHistoryItemForTarget,
		resolveTargetForMessage,
	});
	const extraActionsDrawer = createMessageExtraActionsDrawerController({
		documentRef,
		openDeletionConfirmation: (kind, target, source) => {
			deletionConfirmationDrawer.open(kind, target, source);
		},
		refreshMessageActionStores: () => {
			refreshMessageActionStores({ renderImmediately: true });
		},
		resolveTargetForMessage,
	});
	const deletionConfirmationDrawer =
		createMessageDeleteConfirmationDrawerController({
			closeSourceDrawer,
			documentRef,
			handoffScheduler: drawerHandoffScheduler,
			onDeleted: () => {
				refreshMessageActionStores({
					renderImmediately: true,
				});
			},
			resolveTargetForMessage,
		});
	const footerActionsController = createMessageFooterActionsController({
		onContinue: () => {
			runRevisionAction(
				() =>
					revisionStore?.continueLastMessage() ??
					Promise.resolve(false),
			);
		},
		onOpenHistory: (historyItem) => {
			selectedHistoryItem = historyItem;
			renderHistoryDrawer();
		},
		onRegenerate: () => {
			runRevisionAction(
				() =>
					revisionStore?.regenerateLastRevision() ??
					Promise.resolve(false),
			);
		},
		onSwipeNext: () => {
			void swipeStore?.swipeNext();
		},
		onSwipePrevious: () => {
			void swipeStore?.swipePrevious();
		},
		onUndo: () => {
			runRevisionAction(
				() =>
					revisionStore?.undoLastRevision() ?? Promise.resolve(false),
			);
		},
		renderImmediately: renderMessageActionsImmediately,
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
		const resolvedTarget =
			resolveEditTargetForMessageId(nextTarget.messageId) ?? nextTarget;
		editDrawer.finishOpen({
			messageReference: resolveEditMessageReference(
				resolvedTarget.messageId,
			),
			target: resolvedTarget,
		});
		renderEditDrawer();
	}

	function openEditDrawerForMessage(messageId: number) {
		const target = resolveEditTargetForMessageId(messageId);
		if (!target) {
			unmountEditDrawer();
			return;
		}

		openEditDrawerForTarget(target);
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

	function closeSourceDrawer(source: MessageDeleteConfirmationSource) {
		if (source === "more") {
			closeMoreActionsDrawer();
		} else if (source === "edit") {
			closeEditDrawer();
		} else {
			closeExtraActionsDrawer();
		}
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
			copyEditDraft,
			draft,
			moveEditDraft,
			openDeletionConfirmation: (kind, nextTarget, source) => {
				deletionConfirmationDrawer.open(kind, nextTarget, source);
			},
			target,
		});
	}

	function resolveHistoryItemForTarget(
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
		footerActionsController.stopPostGenerationSettle();
		cancelScheduledMessageActionsRender();
	}

	function runRevisionAction(action: (() => Promise<boolean>) | undefined) {
		if (!action) {
			return;
		}

		void action().finally(refreshMessageActionStores);
	}

	function unmountRoots() {
		headerActionRoots.unmountAll();
		unmountMoreActionsDrawer();
		unmountEditDrawer();
		unmountExtraActionsDrawer();
		unmountDeletionConfirmationDrawer();
		unmountHistoryDrawer();
		footerActionsController.unmount();
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

		footerActionsController.render({
			context,
			historySnapshot,
			isGenerating,
			loadedMessages,
			revisionSnapshot,
			swipeSnapshot,
		});
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
		drawerHandoffScheduler.cancel();
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
