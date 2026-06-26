import { waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
	createNativeQuickReplyEnabledStore,
	shouldRefreshNativeQuickReplyEnabledForMutations,
} from "@/packages/features/chat-session/send-form/bridges/nativeQuickReplyEnabledStore";

describe("createNativeQuickReplyEnabledStore", () => {
	async function flushMutationObservers() {
		await new Promise((resolve) => setTimeout(resolve, 0));
	}

	function createMutation({
		addedNodes = [],
		removedNodes = [],
		target = document.body,
	}: {
		addedNodes?: Node[];
		removedNodes?: Node[];
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
			type: "childList",
		} as MutationRecord;
	}

	function installAnimationFrameQueue() {
		const callbacks: FrameRequestCallback[] = [];
		const originalRequestAnimationFrame = window.requestAnimationFrame;
		const originalCancelAnimationFrame = window.cancelAnimationFrame;
		const requestAnimationFrame = vi.fn(
			(callback: FrameRequestCallback) => {
				callbacks.push(callback);
				return callbacks.length;
			},
		);
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

	test("filters quick reply enabled mutations to the native root or toggle", () => {
		const unrelated = document.createElement("div");
		const wrapper = document.createElement("div");
		wrapper.innerHTML = `
			<section>
				<div id="qr_container">
					<input id="qr--isEnabled" type="checkbox">
				</div>
			</section>
		`;

		expect(
			shouldRefreshNativeQuickReplyEnabledForMutations([
				createMutation({ addedNodes: [unrelated] }),
			]),
		).toBe(false);
		expect(
			shouldRefreshNativeQuickReplyEnabledForMutations([
				createMutation({ addedNodes: [wrapper] }),
			]),
		).toBe(true);
	});

	test("reports unavailable and disabled when the native quick reply toggle is missing", () => {
		document.body.innerHTML = `<div id="qr_container"></div>`;

		const store = createNativeQuickReplyEnabledStore({
			documentRef: document,
		});
		const listener = vi.fn();
		const unsubscribe = store.subscribe(listener);

		expect(store.getSnapshot()).toEqual({
			hasNativeToggle: false,
			isEnabled: false,
		});

		unsubscribe();
		store.dispose();

		document.body.append(document.createElement("input"));
		expect(listener).not.toHaveBeenCalled();
	});

	test("reports enabled when the native quick reply toggle is checked", () => {
		document.body.innerHTML = `
      <input id="qr--isEnabled" type="checkbox" checked>
    `;

		const store = createNativeQuickReplyEnabledStore({
			documentRef: document,
		});

		expect(store.getSnapshot()).toEqual({
			hasNativeToggle: true,
			isEnabled: true,
		});

		store.dispose();
	});

	test("updates subscribers when the native quick reply toggle changes", async () => {
		document.body.innerHTML = `
      <input id="qr--isEnabled" type="checkbox" checked>
    `;
		const nativeToggle = document.getElementById("qr--isEnabled");
		if (!(nativeToggle instanceof HTMLInputElement)) {
			throw new Error("expected native quick reply toggle fixture");
		}

		const store = createNativeQuickReplyEnabledStore({
			documentRef: document,
		});
		const listener = vi.fn();
		store.subscribe(listener);

		nativeToggle.checked = false;
		nativeToggle.dispatchEvent(new Event("change", { bubbles: true }));

		await waitFor(() => {
			expect(store.getSnapshot()).toEqual({
				hasNativeToggle: true,
				isEnabled: false,
			});
		});
		expect(listener).toHaveBeenCalledTimes(1);

		store.dispose();
	});

	test("tracks late native quick reply toggle insertion and removal", async () => {
		document.body.innerHTML = `<div id="qr_container"></div>`;

		const store = createNativeQuickReplyEnabledStore({
			documentRef: document,
		});
		const listener = vi.fn();
		store.subscribe(listener);

		const nativeToggle = document.createElement("input");
		nativeToggle.id = "qr--isEnabled";
		nativeToggle.type = "checkbox";
		nativeToggle.checked = true;
		document.body.append(nativeToggle);

		await waitFor(() => {
			expect(store.getSnapshot()).toEqual({
				hasNativeToggle: true,
				isEnabled: true,
			});
		});

		nativeToggle.remove();

		await waitFor(() => {
			expect(store.getSnapshot()).toEqual({
				hasNativeToggle: false,
				isEnabled: false,
			});
		});
		expect(listener).toHaveBeenCalledTimes(2);

		store.dispose();
	});

	test("ignores unrelated popup and context menu DOM mutations", async () => {
		document.body.innerHTML = `
      <div id="qr_container">
        <input id="qr--isEnabled" type="checkbox" checked>
      </div>
    `;
		const getElementByIdSpy = vi.spyOn(document, "getElementById");
		const childrenSpy = vi.spyOn(Element.prototype, "children", "get");
		const store = createNativeQuickReplyEnabledStore({
			documentRef: document,
		});
		const listener = vi.fn();
		store.subscribe(listener);
		getElementByIdSpy.mockClear();
		childrenSpy.mockClear();

		const popup = document.createElement("dialog");
		popup.className = "popup large_dialogue_popup vertical_scrolling_dialogue_popup";
		popup.setAttribute("open", "");
		let parent: HTMLElement = popup;
		for (let index = 0; index < 50; index += 1) {
			const child = document.createElement("div");
			child.className = `popup-fixture-node-${index}`;
			parent.append(child);
			parent = child;
		}
		const quickReplyPopout = document.createElement("div");
		quickReplyPopout.id = "qr--popout";
		const contextMenu = document.createElement("div");
		contextMenu.className = "ctx-menu";
		const shadowPopup = document.createElement("div");
		shadowPopup.id = "shadow_popup";
		shadowPopup.style.display = "block";

		document.body.append(
			popup,
			quickReplyPopout,
			contextMenu,
			shadowPopup,
		);
		childrenSpy.mockClear();
		await flushMutationObservers();

		expect(listener).not.toHaveBeenCalled();
		expect(getElementByIdSpy).not.toHaveBeenCalled();
		expect(childrenSpy).not.toHaveBeenCalled();
		expect(store.getSnapshot()).toEqual({
			hasNativeToggle: true,
			isEnabled: true,
		});

		popup.remove();
		quickReplyPopout.remove();
		contextMenu.remove();
		shadowPopup.remove();
		childrenSpy.mockClear();
		await flushMutationObservers();

		expect(listener).not.toHaveBeenCalled();
		expect(getElementByIdSpy).not.toHaveBeenCalled();
		expect(childrenSpy).not.toHaveBeenCalled();

		childrenSpy.mockRestore();
		getElementByIdSpy.mockRestore();
		store.dispose();
	});

	test("tracks native quick reply toggle replacement", async () => {
		document.body.innerHTML = `
      <div id="qr_container">
        <input id="qr--isEnabled" type="checkbox" checked>
      </div>
    `;
		const originalToggle = document.getElementById("qr--isEnabled");
		if (!(originalToggle instanceof HTMLInputElement)) {
			throw new Error("expected original quick reply toggle fixture");
		}

		const store = createNativeQuickReplyEnabledStore({
			documentRef: document,
		});
		const listener = vi.fn();
		store.subscribe(listener);

		const replacementToggle = document.createElement("input");
		replacementToggle.id = "qr--isEnabled";
		replacementToggle.type = "checkbox";
		replacementToggle.checked = false;
		originalToggle.replaceWith(replacementToggle);

		await waitFor(() => {
			expect(store.getSnapshot()).toEqual({
				hasNativeToggle: true,
				isEnabled: false,
			});
		});

		replacementToggle.checked = true;
		replacementToggle.dispatchEvent(
			new Event("input", { bubbles: true }),
		);

		await waitFor(() => {
			expect(store.getSnapshot()).toEqual({
				hasNativeToggle: true,
				isEnabled: true,
			});
		});
		expect(listener).toHaveBeenCalledTimes(2);

		store.dispose();
	});

	test("coalesces native quick reply DOM refreshes through one animation frame", async () => {
		const frame = installAnimationFrameQueue();
		document.body.innerHTML = `
      <div id="qr_container">
        <input id="qr--isEnabled" type="checkbox" checked>
      </div>
    `;

		try {
			const originalToggle = document.getElementById("qr--isEnabled");
			if (!(originalToggle instanceof HTMLInputElement)) {
				throw new Error("expected original quick reply toggle fixture");
			}
			const store = createNativeQuickReplyEnabledStore({
				documentRef: document,
			});
			const listener = vi.fn();
			store.subscribe(listener);

			const replacementToggle = document.createElement("input");
			replacementToggle.id = "qr--isEnabled";
			replacementToggle.type = "checkbox";
			replacementToggle.checked = false;
			originalToggle.replaceWith(replacementToggle);
			const unrelatedButton = document.createElement("button");
			unrelatedButton.type = "button";
			unrelatedButton.textContent = "Quick reply";
			document.getElementById("qr_container")?.append(unrelatedButton);
			await flushMutationObservers();

			expect(frame.requestAnimationFrame).toHaveBeenCalledTimes(1);
			expect(listener).not.toHaveBeenCalled();

			frame.flushFrames();

			await waitFor(() => {
				expect(store.getSnapshot()).toEqual({
					hasNativeToggle: true,
					isEnabled: false,
				});
			});
			expect(listener).toHaveBeenCalledTimes(1);

			store.dispose();
		} finally {
			frame.restore();
		}
	});
});
