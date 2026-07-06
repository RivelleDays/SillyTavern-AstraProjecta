import { afterEach, describe, expect, test, vi } from "vitest";

import { Eye, EyeOff } from "@/components/ui/shared/icons";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import {
	createExtraActionsDrawerDangerActions,
	createNativeExtraDrawerActions,
	createNativeExtraQuickActions,
	resolveNativePromptVisibilityIcon,
} from "@/packages/features/chat-session/message-actions/more-actions/messageExtraActionsActionModel";

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
		messageDisplayId: "#8",
		messageId: 8,
		metadata: {},
		messagePreviewText: "Rendered message",
		renderedMessageHtml: "<p>Rendered message</p>",
		senderName: "Assistant",
		swipeIndex: 1,
		swipeTotal: 2,
		...overrides,
	};
}

describe("messageExtraActionsActionModel", () => {
	afterEach(() => {
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
	});

	test("maps prompt visibility native actions to semantic icons", () => {
		const hideElement = document.createElement("button");
		hideElement.className = "mes_hide";
		const unhideElement = document.createElement("button");
		unhideElement.className = "mes_unhide";
		const neutralElement = document.createElement("button");

		expect(
			resolveNativePromptVisibilityIcon({ element: hideElement }),
		).toBe(Eye);
		expect(
			resolveNativePromptVisibilityIcon({ element: unhideElement }),
		).toBe(EyeOff);
		expect(
			resolveNativePromptVisibilityIcon({ element: neutralElement }),
		).toBeUndefined();
	});

	test("builds drawer and quick native action rows from the same native action model", () => {
		const nativeAction = {
			description: "Native description",
			element: document.createElement("button"),
			iconClassName: "fa-solid fa-language",
			id: "8:0:Translate",
			label: "Translate",
			messageId: 8,
		};
		const triggerNativeAction = vi.fn(() => true);
		const closeExtraActionsDrawer = vi.fn();
		const closeMoreActionsDrawer = vi.fn();
		const refreshMessageActionStores = vi.fn();

		const drawerActions = createNativeExtraDrawerActions({
			closeExtraActionsDrawer,
			nativeActions: [nativeAction],
			refreshMessageActionStores,
			triggerNativeAction,
		});
		const quickActions = createNativeExtraQuickActions({
			closeMoreActionsDrawer,
			nativeActions: [nativeAction],
			refreshMessageActionStores,
			triggerNativeAction,
		});

		drawerActions[0].onClick?.();
		quickActions[0].onClick?.();

		expect(drawerActions[0]).toMatchObject({
			description: "Native description",
			iconClassName: "fa-solid fa-language",
			id: "8:0:Translate",
			label: "Translate",
		});
		expect(quickActions[0]).toMatchObject({
			id: "8:0:Translate",
			label: "Translate",
			variant: "native",
		});
		expect(triggerNativeAction).toHaveBeenCalledTimes(2);
		expect(closeExtraActionsDrawer).toHaveBeenCalledTimes(1);
		expect(closeMoreActionsDrawer).toHaveBeenCalledTimes(1);
		expect(refreshMessageActionStores).toHaveBeenCalledTimes(2);
	});

	test("does not close or refresh when native action dispatch fails", () => {
		const nativeAction = {
			element: document.createElement("button"),
			id: "8:0:Broken",
			label: "Broken",
			messageId: 8,
		};
		const closeExtraActionsDrawer = vi.fn();
		const refreshMessageActionStores = vi.fn();
		const actions = createNativeExtraDrawerActions({
			closeExtraActionsDrawer,
			nativeActions: [nativeAction],
			refreshMessageActionStores,
			triggerNativeAction: vi.fn(() => false),
		});

		actions[0].onClick?.();

		expect(closeExtraActionsDrawer).not.toHaveBeenCalled();
		expect(refreshMessageActionStores).not.toHaveBeenCalled();
	});

	test("builds danger actions from deletion support", () => {
		setSillyTavernContext({ deleteMessage: vi.fn() });
		const target = createTarget();
		const openDeletionConfirmation = vi.fn();
		const actions = createExtraActionsDrawerDangerActions({
			openDeletionConfirmation,
			target,
		});

		actions.deleteMessage?.onClick?.();
		actions.deleteSwipe?.onClick?.();

		expect(actions.deleteMessage?.disabled).toBe(false);
		expect(actions.deleteSwipe?.disabled).toBe(false);
		expect(openDeletionConfirmation).toHaveBeenNthCalledWith(
			1,
			"message",
			target,
		);
		expect(openDeletionConfirmation).toHaveBeenNthCalledWith(
			2,
			"swipe",
			target,
		);
	});
});
