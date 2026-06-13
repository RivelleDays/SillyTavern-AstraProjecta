import { describe, expect, test } from "vitest";

import type { MessageEditDrawerDraft } from "@/packages/features/chat-session/message-actions/more-actions/MessageEditDrawer";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import { createEditDrawerController } from "@/packages/features/chat-session/message-actions/editDrawerController";

function createTarget(messageId: number): MessageActionsTarget {
	return {
		avatarUrl: "",
		isSystem: false,
		isUser: false,
		messageDisplayId: `#${messageId}`,
		messageId,
		metadata: {},
		messagePreviewText: "",
		renderedMessageHtml: "",
		senderName: "Assistant",
		swipeIndex: 0,
		swipeTotal: 1,
	};
}

function createDraft(
	messageId: number,
	overrides: Partial<MessageEditDrawerDraft> = {},
): MessageEditDrawerDraft {
	return {
		canCopy: true,
		canMoveDown: true,
		canMoveUp: true,
		hasReasoning: false,
		messageId,
		messageText: `Message ${messageId}`,
		reasoningText: "",
		...overrides,
	};
}

describe("createEditDrawerController", () => {
	test("keeps a draft override renderable while an edit mutation is pending and live draft is missing", () => {
		const controller = createEditDrawerController();
		controller.finishOpen({
			messageReference: null,
			target: createTarget(0),
		});
		controller.setDraftOverride(
			createDraft(0, { messageText: "Unsaved pending body" }),
		);
		controller.setMutationPending(true);

		expect(
			controller.resolveRenderableDraft({
				liveDraft: null,
				messageId: 0,
			})?.messageText,
		).toBe("Unsaved pending body");
		expect(controller.getState().isMutationPending).toBe(true);
	});

	test("retargets the selected message and draft override when chat order changes", () => {
		const controller = createEditDrawerController();
		const selectedMessage = { mes: "First message" };
		controller.finishOpen({
			messageReference: selectedMessage,
			target: createTarget(0),
		});
		controller.setDraftOverride(
			createDraft(0, { messageText: "Unsaved first draft" }),
		);

		expect(
			controller.resolveSelectedMessageId([
				{ mes: "Second message" },
				selectedMessage,
			]),
		).toBe(1);
		controller.retargetDraftOverride(1);

		expect(controller.getState().draftOverride?.messageId).toBe(1);
		expect(
			controller.resolveRenderableDraft({
				liveDraft: createDraft(1, { messageText: "First message" }),
				messageId: 1,
			})?.messageText,
		).toBe("Unsaved first draft");
	});

	test("returns null when a referenced message leaves chat", () => {
		const controller = createEditDrawerController();
		const selectedMessage = { mes: "Removed message" };
		controller.finishOpen({
			messageReference: selectedMessage,
			target: createTarget(0),
		});

		expect(
			controller.resolveSelectedMessageId([{ mes: "Other message" }]),
		).toBeNull();
	});

	test("close clears transient edit state while preserving the target for close rendering", () => {
		const controller = createEditDrawerController();
		controller.finishOpen({
			messageReference: { mes: "Message" },
			target: createTarget(0),
		});
		controller.setDraftOverride(createDraft(0));
		controller.setMutationPending(true);

		controller.close();

		expect(controller.getState()).toMatchObject({
			draftOverride: null,
			isMutationPending: false,
			isOpen: false,
			messageReference: null,
			target: createTarget(0),
		});
	});
});
