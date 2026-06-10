import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import {
	MessageDeleteConfirmationDrawer,
	type MessageDeleteConfirmationDrawerState,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageDeleteConfirmationDrawer";
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

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
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
		messagePreviewText: "Rendered delete target preview",
		metadata: {
			generationTime: "4.2s",
			modelIconHtml:
				'<span class="timestamp-icon custom-model-icon" title="makersuite - gemini-2.0-flash"></span>',
			modelLabel: "gemini-2.0-flash",
			timestamp: "January 14, 2026 9:03 PM",
			tokenCount: "321 tokens",
		},
		renderedMessageHtml:
			'<div class="mes_text"><p>Rendered delete target full body</p></div>',
		senderName: "Assistant",
		swipeIndex: 1,
		swipeTotal: 3,
		...overrides,
	};
}

function createAction(
	overrides: Partial<MessageDeleteConfirmationDrawerState> = {},
): MessageDeleteConfirmationDrawerState {
	return {
		kind: "message",
		target: createTarget(),
		...overrides,
	};
}

describe("MessageDeleteConfirmationDrawer", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
		delete (globalThis as { toastr?: unknown }).toastr;
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("confirms whole-message deletion through the public SillyTavern surface", async () => {
		vi.useFakeTimers();
		const deleteMessage = vi.fn(async () => undefined);
		const onDeleted = vi.fn();
		const onOpenChange = vi.fn();
		setSillyTavernContext({ deleteMessage });

		render(
			<MessageDeleteConfirmationDrawer
				action={createAction()}
				onDeleted={onDeleted}
				onOpenChange={onOpenChange}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Delete message",
		});
		expect(dialog).toHaveAttribute(
			"id",
			"mobile-message-delete-confirmation-drawer",
		);
		expect(dialog).toHaveClass(
			"astra-main-interface-chat-row-action-dialog",
		);
		expect(dialog).toHaveAttribute(
			"aria-labelledby",
			"mobile-message-delete-confirmation-drawer-title",
		);
		expect(dialog).toHaveAttribute(
			"aria-describedby",
			"mobile-message-delete-confirmation-drawer-description",
		);
		expect(within(dialog).getByText("Assistant")).toBeInTheDocument();
		expect(
			within(dialog).getByText("Rendered delete target full body"),
		).toBeInTheDocument();

		fireEvent.click(
			within(dialog).getByRole("button", { name: "Delete message" }),
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		expect(deleteMessage).toHaveBeenCalledWith(12, undefined, false);
		expect(onDeleted).toHaveBeenCalledTimes(1);
		expect(dialog).toHaveAttribute("data-state", "closed");
		expect(onOpenChange).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(500);
		});

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("renders operation metadata in delete-specific detail rows", async () => {
		setSillyTavernContext({ deleteMessage: vi.fn() });

		render(
			<MessageDeleteConfirmationDrawer
				action={createAction()}
				onDeleted={vi.fn()}
				onOpenChange={vi.fn()}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Delete message",
		});
		const meta = dialog.querySelector(
			".astra-chat-library-dialog-meta.astra-messageDeleteConfirmationDrawer__detailSection",
		);
		const rows = Array.from(
			meta?.querySelectorAll(
				".astra-messageDeleteConfirmationDrawer__detailRow",
			) ?? [],
		);
		const separators = Array.from(
			meta?.querySelectorAll(
				".astra-messageDeleteConfirmationDrawer__detailSeparator",
			) ?? [],
		);
		const swipeRow = rows.find((row) => row.textContent?.includes("Swipe"));
		const sentRow = rows.find((row) => row.textContent?.includes("Sent"));
		const modelRow = rows.find((row) => row.textContent?.includes("Model"));

		expect(meta).toBeInTheDocument();
		expect(rows).toHaveLength(3);
		expect(separators).toHaveLength(2);
		expect(within(swipeRow as HTMLElement).getByText("Swipe")).toBeInTheDocument();
		expect(within(swipeRow as HTMLElement).getByText("2 / 3")).toBeInTheDocument();
		expect(
			swipeRow?.querySelector(
				".astra-messageDeleteConfirmationDrawer__detailIcon--swipe",
			),
		).toBeInTheDocument();
		expect(within(sentRow as HTMLElement).getByText("Sent")).toBeInTheDocument();
		expect(
			within(sentRow as HTMLElement).getByText("January 14, 2026 9:03 PM"),
		).toBeInTheDocument();
		expect(
			sentRow?.querySelector(
				".astra-messageDeleteConfirmationDrawer__detailIcon--sent",
			),
		).toBeInTheDocument();
		expect(within(modelRow as HTMLElement).getByText("Model")).toBeInTheDocument();
		expect(
			within(modelRow as HTMLElement).getByText("gemini-2.0-flash"),
		).toBeInTheDocument();
		expect(
			modelRow?.querySelector(
				".astra-messageDeleteConfirmationDrawer__detailIcon--model",
			),
		).toBeInTheDocument();
		expect(
			modelRow?.querySelector(".timestamp-icon.custom-model-icon"),
		).toBeInTheDocument();
		expect(within(meta as HTMLElement).queryByText("Generation")).toBeNull();
		expect(within(meta as HTMLElement).queryByText("4.2s")).toBeNull();
		expect(
			within(meta as HTMLElement).queryByText(
				"Rendered delete target full body",
			),
		).toBeNull();

	});

	test("renders the full message in its own drawer body outside the footer", async () => {
		setSillyTavernContext({ deleteMessage: vi.fn() });

		render(
			<MessageDeleteConfirmationDrawer
				action={createAction()}
				onDeleted={vi.fn()}
				onOpenChange={vi.fn()}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Delete message",
		});
		const meta = dialog.querySelector(".astra-chat-library-dialog-meta");
		const messageBody = document.getElementById(
			"mobile-message-delete-confirmation-drawer-body",
		);
		const messageViewport = document.getElementById(
			"mobile-message-delete-confirmation-drawer-scrollable-content",
		);
		const messageContent = document.getElementById(
			"mobile-message-delete-confirmation-drawer-content",
		);
		const footer = document.getElementById(
			"mobile-message-delete-confirmation-drawer-footer",
		);
		const renderedMessage = dialog.querySelector(
			'.astra-messageDeleteConfirmationDrawer__messagePreview.mes[data-astra-message-preview="true"]',
		);

		expect(
			dialog.querySelector(
				".astra-messageDeleteConfirmationDrawer__renderedMessageSection",
			),
		).toBeNull();
		expect(messageBody).toHaveClass(
			"astra-messageDeleteConfirmationDrawer__messageBody",
		);
		expect(messageViewport).toHaveClass(
			"astra-messageDeleteConfirmationDrawer__messageScrollableContent",
		);
		expect(messageContent).toHaveClass(
			"astra-messageDeleteConfirmationDrawer__messageContent",
		);
		expect(messageBody?.contains(footer)).toBe(false);
		expect(meta?.contains(renderedMessage as HTMLElement)).toBe(false);
		expect(renderedMessage).toBeInTheDocument();
		expect(renderedMessage).toHaveClass("mes");
		expect(renderedMessage?.querySelector(".mes_text")).toHaveTextContent(
			"Rendered delete target full body",
		);
	});

	test("hides optional metadata rows while keeping the swipe position row", async () => {
		setSillyTavernContext({ deleteMessage: vi.fn() });

		render(
			<MessageDeleteConfirmationDrawer
				action={createAction({
					target: createTarget({
						metadata: {},
						swipeIndex: 0,
						swipeTotal: 1,
					}),
				})}
				onDeleted={vi.fn()}
				onOpenChange={vi.fn()}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Delete message",
		});
		const meta = dialog.querySelector(".astra-chat-library-dialog-meta");
		const separators = meta?.querySelectorAll(
			".astra-messageDeleteConfirmationDrawer__detailSeparator",
		);

		expect(meta).toBeInTheDocument();
		expect(within(meta as HTMLElement).getByText("Swipe")).toBeInTheDocument();
		expect(within(meta as HTMLElement).getByText("1 / 1")).toBeInTheDocument();
		expect(separators).toHaveLength(0);
		expect(within(meta as HTMLElement).queryByText("Sent")).toBeNull();
		expect(within(meta as HTMLElement).queryByText("Model")).toBeNull();
		expect(within(meta as HTMLElement).queryByText("Generation")).toBeNull();
	});

	test("confirms current-swipe deletion with the frozen target swipe index", async () => {
		vi.useFakeTimers();
		const deleteMessage = vi.fn(async () => undefined);
		const onDeleted = vi.fn();
		const onOpenChange = vi.fn();
		setSillyTavernContext({ deleteMessage });

		render(
			<MessageDeleteConfirmationDrawer
				action={createAction({ kind: "swipe" })}
				onDeleted={onDeleted}
				onOpenChange={onOpenChange}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Delete current swipe",
		});
		fireEvent.click(
			within(dialog).getByRole("button", {
				name: "Delete current swipe",
			}),
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});
		expect(deleteMessage).toHaveBeenCalledWith(12, 1, false);
		expect(onDeleted).toHaveBeenCalledTimes(1);
		expect(dialog).toHaveAttribute("data-state", "closed");
		expect(onOpenChange).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(500);
		});

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	test("disables the footer actions while deletion is running", async () => {
		const deferredDelete: { resolve?: () => void } = {};
		const deleteMessage = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					deferredDelete.resolve = resolve;
				}),
		);
		setSillyTavernContext({ deleteMessage });

		render(
			<MessageDeleteConfirmationDrawer
				action={createAction()}
				onDeleted={vi.fn()}
				onOpenChange={vi.fn()}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Delete message",
		});
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Delete message" }),
		);

		await waitFor(() => {
			expect(
				within(dialog).getByRole("button", { name: "Deleting..." }),
			).toBeDisabled();
		});
		expect(
			within(dialog).getByRole("button", { name: "Cancel" }),
		).toBeDisabled();

		deferredDelete.resolve?.();
	});

	test("closes without deleting after the exit animation when cancel is selected", async () => {
		vi.useFakeTimers();
		const deleteMessage = vi.fn(async () => undefined);
		const onOpenChange = vi.fn();
		const onExitComplete = vi.fn();
		setSillyTavernContext({ deleteMessage });

		render(
			<MessageDeleteConfirmationDrawer
				action={createAction()}
				onExitComplete={onExitComplete}
				onDeleted={vi.fn()}
				onOpenChange={onOpenChange}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Delete message",
		});
		fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

		expect(deleteMessage).not.toHaveBeenCalled();
		expect(dialog).toHaveAttribute("data-state", "closed");
		expect(
			within(dialog).getByText("Rendered delete target full body"),
		).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(onExitComplete).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(500);
		});

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onExitComplete).toHaveBeenCalledTimes(1);
	});

	test("keeps the last delete target visible while a parent-driven close exits", async () => {
		vi.useFakeTimers();
		const action = createAction();
		const onOpenChange = vi.fn();
		const onExitComplete = vi.fn();
		setSillyTavernContext({ deleteMessage: vi.fn() });

		const { rerender } = render(
			<MessageDeleteConfirmationDrawer
				action={action}
				onExitComplete={onExitComplete}
				onDeleted={vi.fn()}
				onOpenChange={onOpenChange}
			/>,
		);

		const dialog = screen.getByRole("dialog", {
			name: "Delete message",
		});

		rerender(
			<MessageDeleteConfirmationDrawer
				action={null}
				onExitComplete={onExitComplete}
				onDeleted={vi.fn()}
				onOpenChange={onOpenChange}
			/>,
		);

		expect(dialog).toHaveAttribute("data-state", "closed");
		expect(
			within(dialog).getByText("Rendered delete target full body"),
		).toBeInTheDocument();
		expect(onOpenChange).not.toHaveBeenCalled();
		expect(onExitComplete).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(500);
		});

		expect(onExitComplete).toHaveBeenCalledTimes(1);
	});

	test("keeps the confirmation drawer open and reports failure when deletion fails", async () => {
		const deleteMessage = vi.fn(async () => {
			throw new Error("native failure");
		});
		const onDeleted = vi.fn();
		const onOpenChange = vi.fn();
		const error = vi.fn();
		(globalThis as typeof globalThis & { toastr?: unknown }).toastr = {
			error,
		};
		setSillyTavernContext({ deleteMessage });

		render(
			<MessageDeleteConfirmationDrawer
				action={createAction()}
				onDeleted={onDeleted}
				onOpenChange={onOpenChange}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Delete message",
		});
		fireEvent.click(
			within(dialog).getByRole("button", { name: "Delete message" }),
		);

		await waitFor(() => {
			expect(error).toHaveBeenCalledWith("Unable to delete message.");
		});
		expect(onDeleted).not.toHaveBeenCalled();
		expect(onOpenChange).not.toHaveBeenCalledWith(false);
		expect(
			screen.getByRole("dialog", { name: "Delete message" }),
		).toBeInTheDocument();
	});
});
