import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import { createMessageExtraActionsDrawerController } from "@/packages/features/chat-session/message-actions/more-actions/messageExtraActionsDrawerController";
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

function createTarget(): MessageActionsTarget {
	return {
		avatarUrl: "",
		isSystem: false,
		isUser: false,
		messageDisplayId: "#8",
		messageId: 8,
		metadata: {},
		messagePreviewText: "Rendered body",
		renderedMessageHtml: '<div class="mes_text">Rendered body</div>',
		senderName: "Assistant",
		swipeIndex: 1,
		swipeTotal: 3,
	};
}

describe("createMessageExtraActionsDrawerController", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		setSillyTavernContext({ deleteMessage: vi.fn() });
		document.body.innerHTML += `
			<div id="chat">
				<div class="mes" mesid="8">
					<div class="mes_block">
						<div class="mes_text">Rendered body</div>
						<div class="extraMesButtons">
							<button class="fa-solid fa-language" title="Translate message" type="button">Translate</button>
						</div>
					</div>
				</div>
			</div>
		`;
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("owns native action rows and source-tagged danger actions", async () => {
		const target = createTarget();
		const nativeAction = document.querySelector(".extraMesButtons button");
		const nativePointerUp = vi.fn();
		const nativeClick = vi.fn();
		nativeAction?.addEventListener("pointerup", nativePointerUp);
		nativeAction?.addEventListener("click", nativeClick);
		const openDeletionConfirmation = vi.fn();
		const refreshMessageActionStores = vi.fn();
		const controller = createMessageExtraActionsDrawerController({
			documentRef: document,
			openDeletionConfirmation,
			refreshMessageActionStores,
			resolveTargetForMessage: vi.fn(() => target),
		});

		controller.openForMessage(8);
		let dialog = await screen.findByRole("dialog", {
			name: "More Message Actions",
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Translate message",
			}),
		);

		expect(nativePointerUp).toHaveBeenCalledTimes(1);
		expect(nativeClick).toHaveBeenCalledTimes(1);
		expect(refreshMessageActionStores).toHaveBeenCalledTimes(1);

		controller.openForMessage(8);
		dialog = await screen.findByRole("dialog", {
			name: "More Message Actions",
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Delete current swipe",
			}),
		);

		expect(openDeletionConfirmation).toHaveBeenCalledWith(
			"swipe",
			target,
			"extra",
		);
	});
});
