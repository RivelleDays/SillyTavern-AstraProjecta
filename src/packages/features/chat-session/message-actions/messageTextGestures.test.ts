import { act, fireEvent } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { createMessageTextGestureController } from "@/packages/features/chat-session/message-actions/messageTextGestures";

function setupMessageDom() {
	document.body.innerHTML = `
		<div id="chat">
			<div class="mes" mesid="0">
				<div class="mes_block">
					<button type="button" class="mes_edit"></button>
					<div class="mes_text"><p>Message body</p></div>
				</div>
			</div>
		</div>
	`;
	return {
		editButton: document.querySelector(".mes_edit") as HTMLButtonElement,
		messageText: document.querySelector(".mes_text") as HTMLElement,
	};
}

describe("createMessageTextGestureController", () => {
	test("does not intercept long press or follow-up clicks when the action is disabled", async () => {
		const { messageText } = setupMessageDom();
		const onOpenEdit = vi.fn();
		const onOpenMore = vi.fn();
		const nativeClick = vi.fn();
		document.addEventListener("click", nativeClick);
		const controller = createMessageTextGestureController({
			documentRef: document,
			isClickToEditEnabled: () => false,
			onOpenEdit,
			onOpenMore,
		});

		vi.useFakeTimers();
		try {
			controller.attach();
			fireEvent.pointerDown(messageText, {
				clientX: 8,
				clientY: 12,
				pointerId: 1,
				pointerType: "touch",
			});
			await act(async () => {
				vi.advanceTimersByTime(360);
			});
			fireEvent.click(messageText);

			expect(onOpenEdit).not.toHaveBeenCalled();
			expect(onOpenMore).not.toHaveBeenCalled();
			expect(nativeClick).toHaveBeenCalledTimes(1);
		} finally {
			controller.detach();
			document.removeEventListener("click", nativeClick);
			vi.useRealTimers();
		}
	});

	test("opens More actions after a 360ms message-actions long press on message text", async () => {
		const { messageText } = setupMessageDom();
		const onOpenMore = vi.fn();
		const controller = createMessageTextGestureController({
			documentRef: document,
			getLongPressAction: () => "message-actions",
			isClickToEditEnabled: () => false,
			onOpenEdit: vi.fn(),
			onOpenMore,
		});

		vi.useFakeTimers();
		try {
			controller.attach();
			fireEvent.pointerDown(messageText, {
				clientX: 8,
				clientY: 12,
				pointerId: 1,
				pointerType: "touch",
			});
			await act(async () => {
				vi.advanceTimersByTime(359);
			});
			expect(onOpenMore).not.toHaveBeenCalled();

			await act(async () => {
				vi.advanceTimersByTime(1);
			});
			expect(onOpenMore).toHaveBeenCalledWith(0);
		} finally {
			controller.detach();
			vi.useRealTimers();
		}
	});

	test("opens Edit message after a 360ms edit-message long press on message text", async () => {
		const { messageText } = setupMessageDom();
		const onOpenEdit = vi.fn();
		const onOpenMore = vi.fn();
		const controller = createMessageTextGestureController({
			documentRef: document,
			getLongPressAction: () => "edit-message",
			isClickToEditEnabled: () => false,
			onOpenEdit,
			onOpenMore,
		});

		vi.useFakeTimers();
		try {
			controller.attach();
			fireEvent.pointerDown(messageText, {
				clientX: 8,
				clientY: 12,
				pointerId: 1,
				pointerType: "touch",
			});
			await act(async () => {
				vi.advanceTimersByTime(359);
			});
			expect(onOpenEdit).not.toHaveBeenCalled();

			await act(async () => {
				vi.advanceTimersByTime(1);
			});
			expect(onOpenEdit).toHaveBeenCalledWith(0);
			expect(onOpenMore).not.toHaveBeenCalled();
		} finally {
			controller.detach();
			vi.useRealTimers();
		}
	});

	test("cancels the long press after meaningful pointer movement", async () => {
		const { messageText } = setupMessageDom();
		const onOpenMore = vi.fn();
		const controller = createMessageTextGestureController({
			documentRef: document,
			getLongPressAction: () => "message-actions",
			isClickToEditEnabled: () => false,
			onOpenEdit: vi.fn(),
			onOpenMore,
		});

		vi.useFakeTimers();
		try {
			controller.attach();
			fireEvent.pointerDown(messageText, {
				clientX: 8,
				clientY: 12,
				pointerId: 1,
				pointerType: "touch",
			});
			fireEvent.pointerMove(messageText, {
				clientX: 28,
				clientY: 12,
				pointerId: 1,
				pointerType: "touch",
			});
			await act(async () => {
				vi.advanceTimersByTime(360);
			});

			expect(onOpenMore).not.toHaveBeenCalled();
		} finally {
			controller.detach();
			vi.useRealTimers();
		}
	});

	test("cancels a pending long press when detached", async () => {
		const { messageText } = setupMessageDom();
		const onOpenMore = vi.fn();
		const controller = createMessageTextGestureController({
			documentRef: document,
			getLongPressAction: () => "message-actions",
			isClickToEditEnabled: () => false,
			onOpenEdit: vi.fn(),
			onOpenMore,
		});

		vi.useFakeTimers();
		try {
			controller.attach();
			fireEvent.pointerDown(messageText, {
				clientX: 8,
				clientY: 12,
				pointerId: 1,
				pointerType: "touch",
			});
			controller.detach();
			await act(async () => {
				vi.advanceTimersByTime(360);
			});

			expect(onOpenMore).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	test("routes click_to_edit clicks while suppressing the follow-up click after long press", async () => {
		const { editButton, messageText } = setupMessageDom();
		const onOpenEdit = vi.fn();
		const onOpenMore = vi.fn();
		const nativeClickToEdit = vi.fn((event: MouseEvent) => {
			const target =
				event.target instanceof Element ? event.target : null;
			if (!target?.closest("body .mes .mes_text")) {
				return;
			}
			editButton.dispatchEvent(
				new MouseEvent("click", { bubbles: true }),
			);
		});
		const nativeEditClick = vi.fn();
		document.addEventListener("click", nativeClickToEdit);
		editButton.addEventListener("click", nativeEditClick);
		const controller = createMessageTextGestureController({
			documentRef: document,
			getLongPressAction: () => "message-actions",
			isClickToEditEnabled: () => true,
			onOpenEdit,
			onOpenMore,
		});

		vi.useFakeTimers();
		try {
			controller.attach();
			fireEvent.click(messageText);
			expect(onOpenEdit).toHaveBeenCalledWith(0);
			expect(nativeClickToEdit).not.toHaveBeenCalled();
			expect(nativeEditClick).not.toHaveBeenCalled();

			onOpenEdit.mockClear();
			fireEvent.pointerDown(messageText, {
				clientX: 8,
				clientY: 12,
				pointerId: 1,
				pointerType: "touch",
			});
			await act(async () => {
				vi.advanceTimersByTime(360);
			});
			expect(onOpenMore).toHaveBeenCalledWith(0);

			fireEvent.click(messageText);
			expect(onOpenEdit).not.toHaveBeenCalled();
			expect(nativeClickToEdit).not.toHaveBeenCalled();
			expect(nativeEditClick).not.toHaveBeenCalled();
		} finally {
			controller.detach();
			document.removeEventListener("click", nativeClickToEdit);
			editButton.removeEventListener("click", nativeEditClick);
			vi.useRealTimers();
		}
	});
});
