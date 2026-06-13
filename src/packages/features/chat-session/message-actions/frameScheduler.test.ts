import { describe, expect, test, vi } from "vitest";

import { createFrameScheduler } from "@/packages/features/chat-session/message-actions/frameScheduler";

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

describe("createFrameScheduler", () => {
	test("coalesces repeated schedules into one animation frame callback", () => {
		const frame = installAnimationFrameQueue();
		const callback = vi.fn();

		try {
			const scheduler = createFrameScheduler({
				callback,
				documentRef: document,
			});

			scheduler.schedule();
			scheduler.schedule();
			scheduler.schedule();

			expect(frame.requestAnimationFrame).toHaveBeenCalledTimes(1);
			expect(callback).not.toHaveBeenCalled();
			expect(scheduler.isScheduled()).toBe(true);

			frame.flushFrames();

			expect(callback).toHaveBeenCalledTimes(1);
			expect(scheduler.isScheduled()).toBe(false);
		} finally {
			frame.restore();
		}
	});

	test("cancels a scheduled frame", () => {
		const frame = installAnimationFrameQueue();
		const callback = vi.fn();

		try {
			const scheduler = createFrameScheduler({
				callback,
				documentRef: document,
			});

			scheduler.schedule();
			scheduler.cancel();
			frame.flushFrames();

			expect(frame.cancelAnimationFrame).toHaveBeenCalledWith(1);
			expect(callback).not.toHaveBeenCalled();
			expect(scheduler.isScheduled()).toBe(false);
		} finally {
			frame.restore();
		}
	});

	test("runs immediately when requestAnimationFrame is unavailable", () => {
		const originalRequestAnimationFrame = window.requestAnimationFrame;
		const callback = vi.fn();
		Object.defineProperty(window, "requestAnimationFrame", {
			configurable: true,
			value: undefined,
			writable: true,
		});

		try {
			const scheduler = createFrameScheduler({
				callback,
				documentRef: document,
			});

			scheduler.schedule();

			expect(callback).toHaveBeenCalledTimes(1);
			expect(scheduler.isScheduled()).toBe(false);
		} finally {
			Object.defineProperty(window, "requestAnimationFrame", {
				configurable: true,
				value: originalRequestAnimationFrame,
				writable: true,
			});
		}
	});
});
