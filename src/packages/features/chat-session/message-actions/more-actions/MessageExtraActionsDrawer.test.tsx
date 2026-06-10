import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import {
	MessageExtraActionsDrawer,
	type MessageExtraActionsDrawerAction,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionsDrawer";
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

function createTarget(
	overrides: Partial<MessageActionsTarget> = {},
): MessageActionsTarget {
	return {
		avatarUrl: "/assistant-avatar.png",
		isSystem: false,
		isUser: false,
		messageDisplayId: "#12",
		messageId: 12,
		metadata: {},
		messagePreviewText: "",
		renderedMessageHtml: "",
		senderName: "Assistant",
		swipeIndex: 1,
		swipeTotal: 3,
		...overrides,
	};
}

function createNativeActions(): MessageExtraActionsDrawerAction[] {
	return [
		{
			description: "Translate message",
			iconClassName: "fa-solid fa-language",
			id: "native-translate",
			label: "Translate message",
			onClick: vi.fn(),
		},
		{
			description: "Create branch",
			iconClassName: "fa-regular fa-code-branch",
			id: "native-branch",
			label: "Create branch",
			onClick: vi.fn(),
		},
	];
}

describe("MessageExtraActionsDrawer", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
	});

	afterEach(() => {
		cleanup();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("renders the danger block before SillyTavern native message actions", async () => {
		const deleteMessage = vi.fn();
		const deleteSwipe = vi.fn();
		const nativeActions = createNativeActions();

		render(
			<MessageExtraActionsDrawer
				open={true}
				target={createTarget()}
				nativeActions={nativeActions}
				dangerActions={{
					deleteMessage: {
						disabled: false,
						onClick: deleteMessage,
					},
					deleteSwipe: {
						disabled: false,
						onClick: deleteSwipe,
					},
				}}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "More Message Actions",
		});
		const content = document.getElementById(
			"mobile-message-extra-actions-drawer-content",
		);
		const groups = Array.from(
			content?.querySelectorAll(".astra-messageExtraActionsDrawer__group") ??
				[],
		);

		expect(dialog).toHaveAttribute(
			"id",
			"mobile-message-extra-actions-drawer",
		);
		expect(groups).toHaveLength(2);
		expect(within(groups[0] as HTMLElement).getByText("Danger zone")).toBeInTheDocument();
		expect(
			within(groups[1] as HTMLElement).getByText("Message actions"),
		).toBeInTheDocument();

		const dangerButtons = within(groups[0] as HTMLElement).getAllByRole(
			"button",
		);
		expect(dangerButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
			"Delete current swipe",
			"Delete message and all swipes",
		]);
		const deleteSwipeButton = dangerButtons[0] as HTMLElement;
		const deleteMessageButton = dangerButtons[1] as HTMLElement;
		expect(
			deleteMessageButton.querySelector(".lucide-message-circle-x"),
		).toBeInTheDocument();
		expect(
			deleteSwipeButton.querySelector(".lucide-delete"),
		).toBeInTheDocument();
		expect(
			within(groups[0] as HTMLElement).queryByText(
				"Delete this message and all of its swipes.",
			),
		).not.toBeInTheDocument();
		expect(
			within(groups[0] as HTMLElement).queryByText(
				"Delete the current swipe only.",
			),
		).not.toBeInTheDocument();

		const nativeGroup = groups[1] as HTMLElement;
		expect(
			within(nativeGroup).getByRole("button", {
				name: "Translate message",
			}),
		).toBeInTheDocument();
		expect(
			within(nativeGroup).getByRole("button", {
				name: "Create branch",
			}),
		).toBeInTheDocument();
		expect(nativeGroup.querySelector(".fa-language")).toBeInTheDocument();
		expect(nativeGroup.querySelector(".fa-code-branch")).toBeInTheDocument();

		deleteMessageButton.click();
		deleteSwipeButton.click();
		within(nativeGroup)
			.getByRole("button", {
				name: "Translate message",
			})
			.click();

		expect(deleteMessage).toHaveBeenCalledTimes(1);
		expect(deleteSwipe).toHaveBeenCalledTimes(1);
		expect(nativeActions[0].onClick).toHaveBeenCalledTimes(1);
	});

	test("hides Delete current swipe and uses a shorter message delete label when the selected message has one swipe", async () => {
		render(
			<MessageExtraActionsDrawer
				open={true}
				target={createTarget({
					swipeIndex: 0,
					swipeTotal: 1,
				})}
				nativeActions={[]}
				dangerActions={{
					deleteMessage: {
						disabled: false,
						onClick: vi.fn(),
					},
					deleteSwipe: {
						disabled: true,
						onClick: vi.fn(),
					},
				}}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "More Message Actions",
		});
		expect(
			within(dialog).getByRole("button", {
				name: "Delete message",
			}),
		).toBeEnabled();
		expect(
			within(dialog).queryByRole("button", {
				name: "Delete current swipe",
			}),
		).toBeNull();
		expect(
			within(dialog).getByText("No additional message actions available."),
		).toBeInTheDocument();
	});

	test("renders the selected message identity header and three-line preview before action groups", async () => {
		render(
			<MessageExtraActionsDrawer
				open={true}
				target={createTarget({
					metadata: {
						timestamp: "January 14, 2026 9:03 PM",
						tokenCount: "321 tokens",
					},
					messagePreviewText:
						"First rendered line Second rendered line Third rendered line Fourth rendered line",
				})}
				nativeActions={createNativeActions()}
				dangerActions={{
					deleteMessage: {
						disabled: false,
						onClick: vi.fn(),
					},
					deleteSwipe: {
						disabled: false,
						onClick: vi.fn(),
					},
				}}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "More Message Actions",
		});
		const header = document.getElementById(
			"mobile-message-extra-actions-drawer-header",
		);
		const heading = document.getElementById(
			"mobile-message-extra-actions-drawer-heading",
		);
		const body = document.getElementById(
			"mobile-message-extra-actions-drawer-body",
		);
		const preview = heading?.querySelector(
			".astra-messageExtraActionsDrawer__messagePreview",
		);

		expect(header).toBeInTheDocument();
		expect(header).toHaveClass("astra-messageMoreActionsDrawer__header");
		expect(
			header?.querySelector(
				":scope > .astra-messageMoreActionsDrawer__summary",
			),
		).toBeInTheDocument();
		expect(header?.querySelector("img")).toHaveAttribute(
			"src",
			"/assistant-avatar.png",
		);
		expect(within(header as HTMLElement).getByText("Assistant")).toBeInTheDocument();
		expect(
			within(header as HTMLElement).queryByText("January 14, 2026 9:03 PM"),
		).toBeNull();
		expect(
			header?.querySelector(
				".astra-messageMoreActionsDrawer__identityMetaLine",
			),
		).toBeNull();
		expect(
			within(header as HTMLElement).getByLabelText("Message: 12"),
		).toHaveTextContent("12");
		expect(
			within(header as HTMLElement).getByLabelText(
				"Message tokens: 321 tokens",
			),
		).toHaveTextContent("321 tokens");

		expect(heading).toBeInTheDocument();
		expect(heading).toHaveClass(
			"astra-chat-library-dialog-meta",
			"astra-messageExtraActionsDrawer__messageMeta",
		);
		expect(heading).not.toHaveClass(
			"astra-messageExtraActionsDrawer__heading",
		);
		expect(preview).toHaveTextContent(
			"First rendered line Second rendered line Third rendered line Fourth rendered line",
		);
		expect(heading?.querySelector(".mes_text")).toBeNull();
		expect(
			within(heading as HTMLElement).queryByRole("button"),
		).toBeNull();
		expect(header?.nextElementSibling).toBe(heading);
		expect(heading?.nextElementSibling).toBe(body);
		expect(
			dialog.querySelector(".astra-messageExtraActionsDrawer__group"),
		).toBeInTheDocument();
	});
});
