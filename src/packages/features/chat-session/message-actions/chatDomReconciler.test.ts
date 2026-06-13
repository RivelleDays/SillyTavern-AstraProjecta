import { describe, expect, test, vi } from "vitest";

import { createChatDomReconciler } from "@/packages/features/chat-session/message-actions/chatDomReconciler";

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

describe("createChatDomReconciler", () => {
	test("coalesces chat child mutations into one reconcile frame", async () => {
		const frame = installAnimationFrameQueue();
		const onReconcile = vi.fn();
		document.body.innerHTML = `<div id="chat"></div>`;

		try {
			const reconciler = createChatDomReconciler({
				documentRef: document,
				onReconcile,
			});
			reconciler.start();

			document
				.getElementById("chat")!
				.append(document.createElement("div"));
			document
				.getElementById("chat")!
				.append(document.createElement("div"));
			await Promise.resolve();

			expect(frame.requestAnimationFrame).toHaveBeenCalledTimes(1);
			frame.flushFrames();
			expect(onReconcile).toHaveBeenCalledTimes(1);

			reconciler.stop();
		} finally {
			frame.restore();
		}
	});

	test("disconnects and cancels pending reconcile work on stop", async () => {
		const frame = installAnimationFrameQueue();
		const onReconcile = vi.fn();
		document.body.innerHTML = `<div id="chat"></div>`;

		try {
			const reconciler = createChatDomReconciler({
				documentRef: document,
				onReconcile,
			});
			reconciler.start();

			document
				.getElementById("chat")!
				.append(document.createElement("div"));
			await Promise.resolve();
			reconciler.stop();
			frame.flushFrames();

			expect(frame.cancelAnimationFrame).toHaveBeenCalledWith(1);
			expect(onReconcile).not.toHaveBeenCalled();

			document
				.getElementById("chat")!
				.append(document.createElement("div"));
			await Promise.resolve();
			frame.flushFrames();
			expect(frame.requestAnimationFrame).toHaveBeenCalledTimes(1);
			expect(onReconcile).not.toHaveBeenCalled();
		} finally {
			frame.restore();
		}
	});

	test("no-ops when chat root is absent", () => {
		const onReconcile = vi.fn();
		const reconciler = createChatDomReconciler({
			documentRef: document,
			onReconcile,
		});

		reconciler.start();
		reconciler.stop();

		expect(onReconcile).not.toHaveBeenCalled();
	});
});
