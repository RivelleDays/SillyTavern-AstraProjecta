import { describe, expect, test, vi } from "vitest";

import { createMessageDrawerHandoffScheduler } from "@/packages/features/chat-session/message-actions/messageDrawerHandoffScheduler";

function installAnimationFrameQueue() {
	const callbacks: FrameRequestCallback[] = [];
	const originalRequestAnimationFrame = window.requestAnimationFrame;
	const originalCancelAnimationFrame = window.cancelAnimationFrame;
	const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
		callbacks.push(callback);
		return callbacks.length;
	});
	const cancelAnimationFrame = vi.fn((handle: number) => {
		callbacks[handle - 1] = () => {};
	});

	Object.defineProperty(window, "requestAnimationFrame", {
		configurable: true,
		value: requestAnimationFrame,
		writable: true,
	});
	Object.defineProperty(window, "cancelAnimationFrame", {
		configurable: true,
		value: cancelAnimationFrame,
		writable: true,
	});

	return {
		cancelAnimationFrame,
		flushFrames() {
			const scheduledCallbacks = callbacks.splice(0);
			for (const callback of scheduledCallbacks) {
				callback(0);
			}
		},
		requestAnimationFrame,
		restore() {
			Object.defineProperty(window, "requestAnimationFrame", {
				configurable: true,
				value: originalRequestAnimationFrame,
				writable: true,
			});
			Object.defineProperty(window, "cancelAnimationFrame", {
				configurable: true,
				value: originalCancelAnimationFrame,
				writable: true,
			});
		},
	};
}

describe("createMessageDrawerHandoffScheduler", () => {
	test("replaces a pending drawer handoff with the latest callback", () => {
		const frame = installAnimationFrameQueue();
		const firstCallback = vi.fn();
		const secondCallback = vi.fn();

		try {
			const scheduler = createMessageDrawerHandoffScheduler({
				documentRef: document,
			});

			scheduler.schedule(firstCallback);
			scheduler.schedule(secondCallback);
			frame.flushFrames();

			expect(frame.requestAnimationFrame).toHaveBeenCalledTimes(2);
			expect(frame.cancelAnimationFrame).toHaveBeenCalledWith(1);
			expect(firstCallback).not.toHaveBeenCalled();
			expect(secondCallback).toHaveBeenCalledTimes(1);
		} finally {
			frame.restore();
		}
	});

	test("cancels a pending drawer handoff", () => {
		const frame = installAnimationFrameQueue();
		const callback = vi.fn();

		try {
			const scheduler = createMessageDrawerHandoffScheduler({
				documentRef: document,
			});

			scheduler.schedule(callback);
			scheduler.cancel();
			frame.flushFrames();

			expect(frame.cancelAnimationFrame).toHaveBeenCalledWith(1);
			expect(callback).not.toHaveBeenCalled();
		} finally {
			frame.restore();
		}
	});

	test("runs immediately when animation frames are unavailable", () => {
		const originalRequestAnimationFrame = window.requestAnimationFrame;
		const callback = vi.fn();
		Object.defineProperty(window, "requestAnimationFrame", {
			configurable: true,
			value: undefined,
			writable: true,
		});

		try {
			const scheduler = createMessageDrawerHandoffScheduler({
				documentRef: document,
			});

			scheduler.schedule(callback);

			expect(callback).toHaveBeenCalledTimes(1);
		} finally {
			Object.defineProperty(window, "requestAnimationFrame", {
				configurable: true,
				value: originalRequestAnimationFrame,
				writable: true,
			});
		}
	});
});
