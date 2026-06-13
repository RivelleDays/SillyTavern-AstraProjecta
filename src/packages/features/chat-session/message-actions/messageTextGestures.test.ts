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
	test("opens More actions after a 240ms long press on message text", async () => {
		const { messageText } = setupMessageDom();
		const onOpenMore = vi.fn();
		const controller = createMessageTextGestureController({
			documentRef: document,
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
				vi.advanceTimersByTime(239);
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

	test("cancels the long press after meaningful pointer movement", async () => {
		const { messageText } = setupMessageDom();
		const onOpenMore = vi.fn();
		const controller = createMessageTextGestureController({
			documentRef: document,
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
				vi.advanceTimersByTime(240);
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
				vi.advanceTimersByTime(240);
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
				vi.advanceTimersByTime(240);
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
