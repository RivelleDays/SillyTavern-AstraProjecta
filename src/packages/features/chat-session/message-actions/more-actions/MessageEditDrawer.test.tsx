import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import {
	MessageEditDrawer,
	type MessageEditDrawerDraft,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageEditDrawer";
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
		metadata: {
			timestamp: "January 14, 2026 9:03 PM",
		},
		messagePreviewText: "Rendered edit target preview",
		renderedMessageHtml: "",
		senderName: "Assistant",
		swipeIndex: 1,
		swipeTotal: 3,
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
		hasReasoning: true,
		messageId: 12,
		messageText: "Current message body",
		reasoningText: "Current reasoning body",
		...overrides,
	};
}

describe("MessageEditDrawer", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("renders Astra-owned edit controls without native SillyTavern edit textareas", async () => {
		const onConfirm = vi.fn();

		render(
			<MessageEditDrawer
				open={true}
				target={createTarget()}
				draft={createDraft()}
				actions={{
					addReasoning: { disabled: false },
					copy: { disabled: false, onClick: vi.fn() },
					deleteMessage: { disabled: false, onClick: vi.fn() },
					deleteSwipe: { disabled: false, onClick: vi.fn() },
					moveDown: { disabled: false, onClick: vi.fn() },
					moveUp: { disabled: false, onClick: vi.fn() },
				}}
				onConfirm={onConfirm}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Edit Message",
		});
		expect(dialog).toHaveAttribute("id", "astra-message-edit-drawer");
		expect(dialog).toHaveAttribute(
			"aria-labelledby",
			"astra-message-edit-drawer-title",
		);
		expect(dialog).toHaveAttribute(
			"aria-describedby",
			"astra-message-edit-drawer-description",
		);
		expect(dialog).toHaveClass("astra-messageEditDrawer");

		const header = document.getElementById(
			"astra-message-edit-drawer-header",
		);
		const actionContent = document.getElementById(
			"astra-message-edit-drawer-extra-actions-content",
		);
		const actionStartGroup = document.getElementById(
			"astra-message-edit-drawer-extra-actions-start",
		);
		const actionEndGroup = document.getElementById(
			"astra-message-edit-drawer-extra-actions-end",
		);
		const body = document.getElementById("astra-message-edit-drawer-body");
		const content = document.getElementById(
			"astra-message-edit-drawer-content",
		);
		const footer = document.getElementById(
			"astra-message-edit-drawer-footer",
		);

		expect(header).toHaveClass("astra-messageEditDrawer__header");
		expect(
			within(header as HTMLElement).getByText("Assistant"),
		).toBeInTheDocument();
		expect(actionContent).toHaveClass(
			"astra-messageEditDrawer__extraActionsContent",
		);
		expect(actionStartGroup).toHaveClass(
			"astra-messageEditDrawer__extraActionsGroup",
			"astra-messageEditDrawer__extraActionsGroup--start",
		);
		expect(actionEndGroup).toHaveClass(
			"astra-messageEditDrawer__extraActionsGroup",
			"astra-messageEditDrawer__extraActionsGroup--end",
		);
		expect(
			document.getElementById(
				"astra-message-edit-drawer-extra-actions-scrollbar",
			),
		).toBeNull();
		expect(body).toHaveClass("astra-messageEditDrawer__body");
		expect(content).toHaveClass("astra-messageEditDrawer__content");
		expect(footer).toHaveClass("astra-messageEditDrawer__footer");

		const actionButtons = within(actionContent as HTMLElement).getAllByRole(
			"button",
		);
		expect(
			actionButtons.map((button) => button.getAttribute("aria-label")),
		).toEqual([
			"Delete current swipe",
			"Delete message and all swipes",
			"Copy this message",
			"Hide reasoning block",
			"Move message up",
			"Move message down",
		]);
		expect(
			within(actionEndGroup as HTMLElement)
				.getAllByRole("button")
				.map((button) => button.getAttribute("aria-label")),
		).toEqual(["Move message up", "Move message down"]);
		expect(actionButtons[0]).toHaveClass(
			"astra-messageEditDrawer__extraActionButton--danger",
		);
		expect(actionButtons[1]).toHaveClass(
			"astra-messageEditDrawer__extraActionButton--danger",
		);
		expect(actionButtons[2]).toHaveClass(
			"astra-messageEditDrawer__extraActionButton--native",
		);
		expect(
			actionContent?.querySelector(".lucide-delete"),
		).toBeInTheDocument();
		expect(
			actionContent?.querySelector(".lucide-message-circle-x"),
		).toBeInTheDocument();
		expect(
			actionContent?.querySelector(".lucide-copy"),
		).toBeInTheDocument();
		const reasoningToggleButton = within(
			actionContent as HTMLElement,
		).getByRole("button", {
			name: "Hide reasoning block",
		});
		expect(reasoningToggleButton).toBeEnabled();
		expect(reasoningToggleButton).toHaveAttribute("aria-pressed", "true");
		expect(
			actionContent?.querySelector(".lucide-layers-minus"),
		).toBeInTheDocument();
		expect(
			actionContent?.querySelector(".lucide-chevron-up"),
		).toBeInTheDocument();
		expect(
			actionContent?.querySelector(".lucide-chevron-down"),
		).toBeInTheDocument();

		const reasoningTextarea = within(content as HTMLElement).getByLabelText(
			"Reasoning",
		);
		const messageTextarea = within(content as HTMLElement).getByLabelText(
			"Message text",
		);
		expect(reasoningTextarea).toHaveValue("Current reasoning body");
		expect(messageTextarea).toHaveValue("Current message body");
		expect(reasoningTextarea).toHaveAttribute("data-slot", "textarea");
		expect(messageTextarea).toHaveAttribute("data-slot", "textarea");
		expect(dialog.querySelector(".edit_textarea")).toBeNull();
		expect(dialog.querySelector(".reasoning_edit_textarea")).toBeNull();
		expect(dialog.querySelector("#curEditTextarea")).toBeNull();

		const confirmButton = within(footer as HTMLElement).getByRole(
			"button",
			{
				name: "Confirm edit",
			},
		);
		expect(confirmButton).toBeDisabled();

		fireEvent.click(reasoningToggleButton);
		expect(
			within(content as HTMLElement).queryByLabelText("Reasoning"),
		).toBeNull();
		expect(confirmButton).toBeEnabled();

		fireEvent.click(confirmButton);
		expect(onConfirm).toHaveBeenCalledWith({
			hasReasoning: false,
			messageId: 12,
			messageText: "Current message body",
			reasoningText: "Current reasoning body",
		});

		onConfirm.mockClear();
		fireEvent.click(reasoningToggleButton);
		const restoredReasoningTextarea = within(
			content as HTMLElement,
		).getByLabelText("Reasoning");
		expect(restoredReasoningTextarea).toHaveValue("Current reasoning body");

		fireEvent.change(restoredReasoningTextarea, {
			target: { value: "" },
		});
		expect(confirmButton).toBeEnabled();

		fireEvent.change(restoredReasoningTextarea, {
			target: { value: "Updated reasoning" },
		});
		fireEvent.change(messageTextarea, {
			target: { value: "Updated message" },
		});
		fireEvent.click(confirmButton);

		expect(onConfirm).toHaveBeenCalledWith({
			hasReasoning: true,
			messageId: 12,
			messageText: "Updated message",
			reasoningText: "Updated reasoning",
		});
		expect(
			footer?.querySelector(".lucide-pencil-line"),
		).toBeInTheDocument();
		expect(footer?.querySelector(".lucide-x")).toBeNull();
	});

	test("adds the reasoning textarea from the Astra action strip and cancels through the footer", async () => {
		vi.useFakeTimers();
		const onOpenChange = vi.fn();
		const onConfirm = vi.fn();

		render(
			<MessageEditDrawer
				open={true}
				target={createTarget({ swipeTotal: 1 })}
				draft={createDraft({
					canMoveDown: false,
					hasReasoning: false,
					reasoningText: "",
				})}
				actions={{
					addReasoning: { disabled: false },
					copy: { disabled: false, onClick: vi.fn() },
					deleteMessage: { disabled: false, onClick: vi.fn() },
					moveDown: { disabled: true, onClick: vi.fn() },
					moveUp: { disabled: false, onClick: vi.fn() },
				}}
				onConfirm={onConfirm}
				onOpenChange={onOpenChange}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Edit Message",
		});
		const actionContent = document.getElementById(
			"astra-message-edit-drawer-extra-actions-content",
		);
		expect(
			within(actionContent as HTMLElement).queryByRole("button", {
				name: "Delete current swipe",
			}),
		).toBeNull();
		expect(
			within(dialog).queryByLabelText("Reasoning"),
		).not.toBeInTheDocument();

		const reasoningToggleButton = within(
			actionContent as HTMLElement,
		).getByRole("button", {
			name: "Add reasoning block",
		});
		expect(reasoningToggleButton).toHaveAttribute("aria-pressed", "false");
		expect(
			actionContent?.querySelector(".lucide-layers-plus"),
		).toBeInTheDocument();

		fireEvent.click(reasoningToggleButton);

		expect(within(dialog).getByLabelText("Reasoning")).toHaveValue("");
		const confirmButton = within(dialog).getByRole("button", {
			name: "Confirm edit",
		});
		expect(confirmButton).toBeDisabled();
		expect(
			within(actionContent as HTMLElement).getByRole("button", {
				name: "Move message down",
			}),
		).toBeDisabled();

		fireEvent.change(within(dialog).getByLabelText("Reasoning"), {
			target: { value: "New reasoning" },
		});
		expect(confirmButton).toBeEnabled();

		const hideReasoningButton = within(
			actionContent as HTMLElement,
		).getByRole("button", {
			name: "Hide reasoning block",
		});
		expect(hideReasoningButton).toHaveAttribute("aria-pressed", "true");
		expect(
			actionContent?.querySelector(".lucide-layers-minus"),
		).toBeInTheDocument();

		fireEvent.click(hideReasoningButton);
		expect(within(dialog).queryByLabelText("Reasoning")).toBeNull();
		expect(confirmButton).toBeDisabled();

		fireEvent.click(
			within(actionContent as HTMLElement).getByRole("button", {
				name: "Add reasoning block",
			}),
		);
		expect(within(dialog).getByLabelText("Reasoning")).toHaveValue(
			"New reasoning",
		);
		expect(confirmButton).toBeEnabled();

		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Cancel",
			}),
		);
		expect(dialog).toHaveAttribute("data-state", "closed");
		expect(onOpenChange).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(500);
		});

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	test("keeps rendering without loading copy while mutation actions are pending", async () => {
		const onConfirm = vi.fn();

		render(
			<MessageEditDrawer
				open={true}
				target={createTarget()}
				draft={createDraft()}
				isMutationPending={true}
				actions={{
					addReasoning: { disabled: false },
					copy: { disabled: false, onClick: vi.fn() },
					deleteMessage: { disabled: false, onClick: vi.fn() },
					deleteSwipe: { disabled: false, onClick: vi.fn() },
					moveDown: { disabled: false, onClick: vi.fn() },
					moveUp: { disabled: false, onClick: vi.fn() },
				}}
				onConfirm={onConfirm}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Edit Message",
		});
		const messageTextarea = within(dialog).getByLabelText("Message text");

		fireEvent.change(messageTextarea, {
			target: { value: "Edited while pending" },
		});

		expect(dialog).not.toHaveAttribute("data-state", "closed");
		expect(within(dialog).queryByText(/loading|error|failed/i)).toBeNull();
		expect(
			within(dialog).getByRole("button", {
				name: "Delete current swipe",
			}),
		).toBeDisabled();
		expect(
			within(dialog).getByRole("button", {
				name: "Delete current swipe",
			}),
		).toHaveAttribute("data-astra-pending-disabled", "true");
		expect(
			within(dialog).getByRole("button", {
				name: "Delete message and all swipes",
			}),
		).toBeDisabled();
		expect(
			within(dialog).getByRole("button", {
				name: "Delete message and all swipes",
			}),
		).toHaveAttribute("data-astra-pending-disabled", "true");
		expect(
			within(dialog).getByRole("button", {
				name: "Copy this message",
			}),
		).toBeDisabled();
		expect(
			within(dialog).getByRole("button", {
				name: "Copy this message",
			}),
		).toHaveAttribute("data-astra-pending-disabled", "true");
		expect(
			within(dialog).getByRole("button", {
				name: "Move message up",
			}),
		).toBeDisabled();
		expect(
			within(dialog).getByRole("button", {
				name: "Move message up",
			}),
		).toHaveAttribute("data-astra-pending-disabled", "true");
		expect(
			within(dialog).getByRole("button", {
				name: "Move message down",
			}),
		).toBeDisabled();
		expect(
			within(dialog).getByRole("button", {
				name: "Move message down",
			}),
		).toHaveAttribute("data-astra-pending-disabled", "true");
		expect(
			within(dialog).getByRole("button", {
				name: "Confirm edit",
			}),
		).toBeDisabled();
		expect(onConfirm).not.toHaveBeenCalled();
	});
});
