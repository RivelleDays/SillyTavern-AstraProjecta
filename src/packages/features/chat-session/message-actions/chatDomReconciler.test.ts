import { describe, expect, test, vi } from "vitest";

import {
	createChatDomReconciler,
	shouldReconcileChatDomForMutations,
} from "@/packages/features/chat-session/message-actions/chatDomReconciler";

function createMutation({
	addedNodes = [],
	removedNodes = [],
	type = "childList",
	target = document.body,
}: {
	addedNodes?: Node[];
	removedNodes?: Node[];
	type?: MutationRecord["type"];
	target?: Node;
}): MutationRecord {
	return {
		addedNodes: addedNodes as unknown as NodeList,
		attributeName: null,
		attributeNamespace: null,
		nextSibling: null,
		oldValue: null,
		previousSibling: null,
		removedNodes: removedNodes as unknown as NodeList,
		target,
		type,
	} as MutationRecord;
}

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
	test("filters chat mutations to message additions and removals", () => {
		const unrelated = document.createElement("div");
		const message = document.createElement("div");
		message.className = "mes";
		message.setAttribute("mesid", "0");

		expect(
			shouldReconcileChatDomForMutations([
				createMutation({ addedNodes: [unrelated] }),
			]),
		).toBe(false);
		expect(
			shouldReconcileChatDomForMutations([
				createMutation({ addedNodes: [message] }),
			]),
		).toBe(true);
		expect(
			shouldReconcileChatDomForMutations([
				createMutation({ removedNodes: [message] }),
			]),
		).toBe(true);
	});

	test("reconciles structural message subtree additions and removals", () => {
		const message = document.createElement("div");
		message.className = "mes";
		message.setAttribute("mesid", "0");
		const messageBlock = document.createElement("div");
		messageBlock.className = "mes_block";
		const messageText = document.createElement("div");
		messageText.className = "mes_text";
		const unrelated = document.createElement("span");

		expect(
			shouldReconcileChatDomForMutations([
				createMutation({
					addedNodes: [messageBlock],
					target: message,
				}),
			]),
		).toBe(true);
		expect(
			shouldReconcileChatDomForMutations([
				createMutation({
					addedNodes: [messageText],
					target: messageBlock,
				}),
			]),
		).toBe(true);
		expect(
			shouldReconcileChatDomForMutations([
				createMutation({
					removedNodes: [messageText],
					target: messageBlock,
				}),
			]),
		).toBe(true);
		expect(
			shouldReconcileChatDomForMutations([
				createMutation({
					addedNodes: [unrelated],
					target: message,
				}),
			]),
		).toBe(false);
	});

	test("ignores ordinary streaming text churn", () => {
		const messageText = document.createElement("div");
		messageText.className = "mes_text";
		const textChunk = document.createTextNode("streamed token");

		expect(
			shouldReconcileChatDomForMutations([
				createMutation({
					addedNodes: [textChunk],
					target: messageText,
				}),
			]),
		).toBe(false);
		expect(
			shouldReconcileChatDomForMutations([
				createMutation({ target: textChunk, type: "characterData" }),
			]),
		).toBe(false);
	});

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

			const firstMessage = document.createElement("div");
			firstMessage.className = "mes";
			firstMessage.setAttribute("mesid", "0");
			const secondMessage = document.createElement("div");
			secondMessage.className = "mes";
			secondMessage.setAttribute("mesid", "1");
			document.getElementById("chat")!.append(firstMessage);
			document.getElementById("chat")!.append(secondMessage);
			await Promise.resolve();

			expect(frame.requestAnimationFrame).toHaveBeenCalledTimes(1);
			frame.flushFrames();
			expect(onReconcile).toHaveBeenCalledTimes(1);

			reconciler.stop();
		} finally {
			frame.restore();
		}
	});

	test("observes structural subtree changes under existing messages", async () => {
		const frame = installAnimationFrameQueue();
		const onReconcile = vi.fn();
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0"></div>
			</div>
		`;

		try {
			const reconciler = createChatDomReconciler({
				documentRef: document,
				onReconcile,
			});
			reconciler.start();

			const messageBlock = document.createElement("div");
			messageBlock.className = "mes_block";
			document.querySelector(".mes")!.append(messageBlock);
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

			const message = document.createElement("div");
			message.className = "mes";
			message.setAttribute("mesid", "0");
			document.getElementById("chat")!.append(message);
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
