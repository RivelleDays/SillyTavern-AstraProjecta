import { afterEach, describe, expect, test, vi } from "vitest";

import type {
	MessageEditDrawerDraft,
	MessageEditDrawerSubmitDraft,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageEditDrawer";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import { createEditDrawerActions } from "@/packages/features/chat-session/message-actions/more-actions/messageEditDrawerActionModel";

function setSillyTavernContext(context: Record<string, unknown>) {
	(
		globalThis as { SillyTavern?: { getContext: () => unknown } }
	).SillyTavern = {
		getContext: () => context,
	};
}

function createTarget(
	overrides: Partial<MessageActionsTarget> = {},
): MessageActionsTarget {
	return {
		avatarUrl: "",
		isSystem: false,
		isUser: false,
		messageDisplayId: "#2",
		messageId: 2,
		metadata: {},
		messagePreviewText: "Rendered message",
		renderedMessageHtml: "<p>Rendered message</p>",
		senderName: "Assistant",
		swipeIndex: 0,
		swipeTotal: 1,
		...overrides,
	};
}

function createDraft(
	overrides: Partial<MessageEditDrawerDraft> = {},
): MessageEditDrawerDraft {
	return {
		canCopy: true,
		canMoveDown: true,
		canMoveUp: true,
		hasReasoning: false,
		messageId: 2,
		messageText: "Draft body",
		reasoningText: "",
		...overrides,
	};
}

describe("messageEditDrawerActionModel", () => {
	afterEach(() => {
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
	});

	test("builds edit actions from draft capabilities and deletion support", () => {
		setSillyTavernContext({ deleteMessage: vi.fn() });
		const target = createTarget({ swipeTotal: 1 });
		const draft = createDraft({
			canCopy: false,
			canMoveDown: false,
			hasReasoning: true,
		});
		const actions = createEditDrawerActions({
			copyEditDraft: vi.fn(),
			draft,
			moveEditDraft: vi.fn(),
			openDeletionConfirmation: vi.fn(),
			target,
		});

		expect(actions.addReasoning?.disabled).toBe(true);
		expect(actions.copy?.disabled).toBe(true);
		expect(actions.moveDown?.disabled).toBe(true);
		expect(actions.moveUp?.disabled).toBe(false);
		expect(actions.deleteMessage?.disabled).toBe(false);
		expect(actions.deleteSwipe?.disabled).toBe(true);
	});

	test("routes callbacks with submitted drafts and edit-source deletion handoff", () => {
		setSillyTavernContext({ deleteMessage: vi.fn() });
		const target = createTarget({ swipeTotal: 3 });
		const draft = createDraft();
		const submitDraft: MessageEditDrawerSubmitDraft = {
			hasReasoning: false,
			messageId: 2,
			messageText: "Updated body",
			reasoningText: "",
		};
		const copyEditDraft = vi.fn();
		const moveEditDraft = vi.fn();
		const openDeletionConfirmation = vi.fn();
		const actions = createEditDrawerActions({
			copyEditDraft,
			draft,
			moveEditDraft,
			openDeletionConfirmation,
			target,
		});

		actions.copy?.onClick?.(submitDraft);
		actions.moveUp?.onClick?.(submitDraft);
		actions.moveDown?.onClick?.(submitDraft);
		actions.deleteMessage?.onClick?.(submitDraft);
		actions.deleteSwipe?.onClick?.(submitDraft);

		expect(copyEditDraft).toHaveBeenCalledWith(submitDraft);
		expect(moveEditDraft).toHaveBeenNthCalledWith(1, {
			direction: "up",
			submitDraft,
		});
		expect(moveEditDraft).toHaveBeenNthCalledWith(2, {
			direction: "down",
			submitDraft,
		});
		expect(openDeletionConfirmation).toHaveBeenNthCalledWith(
			1,
			"message",
			target,
			"edit",
		);
		expect(openDeletionConfirmation).toHaveBeenNthCalledWith(
			2,
			"swipe",
			target,
			"edit",
		);
	});
});
