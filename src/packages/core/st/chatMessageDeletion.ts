import { getStContext } from "@/packages/core/st/context";
import { isRecord } from "@/packages/core/st/shared";

export type ChatMessageDeletionKind = "message" | "swipe";

type DeleteMessageLike = (
	messageId: number,
	swipeDeletionIndex?: number,
	askConfirmation?: boolean,
) => unknown | Promise<unknown>;

type StMessageDeletionContextLike = Record<string, unknown> & {
	deleteMessage?: unknown;
};

export interface ChatMessageDeletionSupport {
	canDeleteMessage: boolean;
	canDeleteSwipe: boolean;
}

export interface DeleteChatMessageInput {
	kind: ChatMessageDeletionKind;
	messageId: number;
	swipeIndex?: number;
}

export type DeleteChatMessageResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			reason:
				| "api-unavailable"
				| "delete-failed"
				| "invalid-message-id"
				| "invalid-swipe-index";
	  };

function resolveContextSafe(): StMessageDeletionContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context)
			? (context as StMessageDeletionContextLike)
			: null;
	} catch {
		return null;
	}
}

function resolveDeleteMessage(
	context: StMessageDeletionContextLike | null,
): DeleteMessageLike | null {
	return typeof context?.deleteMessage === "function"
		? (context.deleteMessage as DeleteMessageLike)
		: null;
}

export function readChatMessageDeletionSupport({
	swipeTotal,
}: {
	swipeTotal?: number;
} = {}): ChatMessageDeletionSupport {
	const context = resolveContextSafe();
	const hasDeleteMessage = Boolean(resolveDeleteMessage(context));

	return {
		canDeleteMessage: hasDeleteMessage,
		canDeleteSwipe:
			hasDeleteMessage &&
			typeof swipeTotal === "number" &&
			Number.isInteger(swipeTotal) &&
			swipeTotal > 1,
	};
}

export async function deleteChatMessage({
	kind,
	messageId,
	swipeIndex,
}: DeleteChatMessageInput): Promise<DeleteChatMessageResult> {
	if (!Number.isInteger(messageId) || messageId < 0) {
		return {
			ok: false,
			reason: "invalid-message-id",
		};
	}

	if (
		kind === "swipe" &&
		(!Number.isInteger(swipeIndex) || Number(swipeIndex) < 0)
	) {
		return {
			ok: false,
			reason: "invalid-swipe-index",
		};
	}

	const context = resolveContextSafe();
	const deleteMessage = resolveDeleteMessage(context);
	if (!deleteMessage) {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	try {
		await deleteMessage(
			messageId,
			kind === "swipe" ? Number(swipeIndex) : undefined,
			false,
		);
		return {
			ok: true,
		};
	} catch {
		return {
			ok: false,
			reason: "delete-failed",
		};
	}
}
