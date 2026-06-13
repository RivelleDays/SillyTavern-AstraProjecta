import type { MessageEditDrawerDraft } from "@/packages/features/chat-session/message-actions/more-actions/MessageEditDrawer";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import type { MessageActionsChatMessageLike } from "@/packages/features/chat-session/message-actions/messageActionTargetResolver";

export interface EditDrawerState {
	draftOverride: MessageEditDrawerDraft | null;
	isMutationPending: boolean;
	isOpen: boolean;
	messageReference: MessageActionsChatMessageLike | null;
	target: MessageActionsTarget | null;
}

export interface EditDrawerController {
	close(): void;
	finishOpen({
		messageReference,
		target,
	}: {
		messageReference: MessageActionsChatMessageLike | null;
		target: MessageActionsTarget;
	}): void;
	getState(): EditDrawerState;
	prepareOpen({
		messageReference,
		target,
	}: {
		messageReference: MessageActionsChatMessageLike | null;
		target: MessageActionsTarget;
	}): void;
	resolveRenderableDraft({
		liveDraft,
		messageId,
	}: {
		liveDraft: MessageEditDrawerDraft | null;
		messageId: number;
	}): MessageEditDrawerDraft | null;
	resolveSelectedMessageId(chat: unknown[]): number | null;
	retargetDraftOverride(messageId: number): void;
	setDraftOverride(draft: MessageEditDrawerDraft | null): void;
	setMutationPending(nextValue: boolean): boolean;
	setTarget(target: MessageActionsTarget): void;
	unmount(): void;
}

function createInitialState(): EditDrawerState {
	return {
		draftOverride: null,
		isMutationPending: false,
		isOpen: false,
		messageReference: null,
		target: null,
	};
}

function copyState(state: EditDrawerState): EditDrawerState {
	return {
		...state,
	};
}

export function createEditDraftOverride({
	liveDraft,
	submitDraft,
}: {
	liveDraft: MessageEditDrawerDraft | null;
	submitDraft: Pick<
		MessageEditDrawerDraft,
		"hasReasoning" | "messageText" | "reasoningText"
	>;
}): MessageEditDrawerDraft | null {
	if (!liveDraft) {
		return null;
	}

	return {
		...liveDraft,
		hasReasoning: submitDraft.hasReasoning,
		messageText: submitDraft.messageText,
		reasoningText: submitDraft.reasoningText,
	};
}

export function createEditDrawerController(): EditDrawerController {
	let state = createInitialState();

	function setState(nextState: EditDrawerState) {
		state = nextState;
	}

	function retargetDraftOverride(messageId: number) {
		if (
			!state.draftOverride ||
			state.draftOverride.messageId === messageId
		) {
			return;
		}

		setState({
			...state,
			draftOverride: {
				...state.draftOverride,
				messageId,
			},
		});
	}

	return {
		close() {
			setState({
				...state,
				draftOverride: null,
				isMutationPending: false,
				isOpen: false,
				messageReference: null,
			});
		},
		finishOpen({ messageReference, target }) {
			setState({
				...state,
				isOpen: true,
				messageReference: state.messageReference ?? messageReference,
				target,
			});
		},
		getState() {
			return copyState(state);
		},
		prepareOpen({ messageReference, target }) {
			setState({
				...state,
				draftOverride: null,
				isMutationPending: false,
				isOpen: true,
				messageReference,
				target,
			});
		},
		resolveRenderableDraft({ liveDraft, messageId }) {
			if (
				state.draftOverride &&
				state.draftOverride.messageId !== messageId
			) {
				retargetDraftOverride(messageId);
			}

			if (liveDraft) {
				if (!state.draftOverride) {
					return liveDraft;
				}

				return {
					...liveDraft,
					hasReasoning: state.draftOverride.hasReasoning,
					messageText: state.draftOverride.messageText,
					reasoningText: state.draftOverride.reasoningText,
				};
			}

			return state.isMutationPending ? state.draftOverride : null;
		},
		resolveSelectedMessageId(chat) {
			if (!state.messageReference) {
				return state.target?.messageId ?? null;
			}

			const messageId = chat.indexOf(state.messageReference);
			return messageId >= 0 ? messageId : null;
		},
		retargetDraftOverride(messageId) {
			retargetDraftOverride(messageId);
		},
		setDraftOverride(draft) {
			setState({
				...state,
				draftOverride: draft,
			});
		},
		setMutationPending(nextValue) {
			if (state.isMutationPending === nextValue) {
				return false;
			}

			setState({
				...state,
				isMutationPending: nextValue,
			});
			return true;
		},
		setTarget(target) {
			setState({
				...state,
				target,
			});
		},
		unmount() {
			setState(createInitialState());
		},
	};
}
