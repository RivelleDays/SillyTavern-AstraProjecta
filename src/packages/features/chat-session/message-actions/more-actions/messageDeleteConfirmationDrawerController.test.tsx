import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { createMessageDeleteConfirmationDrawerController } from "@/packages/features/chat-session/message-actions/more-actions/messageDeleteConfirmationDrawerController";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";

function mockMobileLayout() {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		})),
		writable: true,
	});
}

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
		messageDisplayId: "#12",
		messageId: 12,
		messagePreviewText: "Stale preview",
		metadata: {},
		renderedMessageHtml: '<div class="mes_text">Stale body</div>',
		senderName: "Assistant",
		swipeIndex: 0,
		swipeTotal: 2,
		...overrides,
	};
}

describe("createMessageDeleteConfirmationDrawerController", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({ deleteMessage: vi.fn() });
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("closes the source drawer, defers opening, and renders a refreshed target", async () => {
		const staleTarget = createTarget();
		const freshTarget = createTarget({
			messagePreviewText: "Fresh preview",
			renderedMessageHtml:
				'<div class="mes_text">Fresh rendered delete body</div>',
		});
		const scheduledCallbacks: Array<() => void> = [];
		const closeSourceDrawer = vi.fn();
		const handoffScheduler = {
			cancel: vi.fn(),
			schedule: vi.fn((callback: () => void) => {
				scheduledCallbacks.push(callback);
			}),
		};
		const controller = createMessageDeleteConfirmationDrawerController({
			closeSourceDrawer,
			documentRef: document,
			handoffScheduler,
			onDeleted: vi.fn(),
			resolveTargetForMessage: vi.fn(() => freshTarget),
		});

		controller.open("swipe", staleTarget, "edit");

		expect(closeSourceDrawer).toHaveBeenCalledWith("edit");
		expect(handoffScheduler.schedule).toHaveBeenCalledTimes(1);
		expect(
			screen.queryByRole("dialog", { name: "Delete current swipe" }),
		).toBeNull();

		await act(async () => {
			scheduledCallbacks.shift()?.();
		});

		const dialog = await screen.findByRole("dialog", {
			name: "Delete current swipe",
		});
		expect(dialog).toHaveTextContent("Fresh rendered delete body");
		expect(dialog).not.toHaveTextContent("Stale body");
	});
});
