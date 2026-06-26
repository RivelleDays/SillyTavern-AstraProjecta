import { describe, expect, test, vi } from "vitest";

import {
	createMobileNativePopupBridge,
	NATIVE_POPUP_ACTIVE_ATTRIBUTE,
	shouldSyncNativePopupForMutations,
} from "@/app/mobile/runtime/mobileNativePopupBridge";

function createMutation({
	addedNodes = [],
	attributeName = null,
	removedNodes = [],
	target = document.body,
	type = "childList",
}: {
	addedNodes?: Node[];
	attributeName?: string | null;
	removedNodes?: Node[];
	target?: Node;
	type?: MutationRecordType;
}): MutationRecord {
	return {
		addedNodes: addedNodes as unknown as NodeList,
		attributeName,
		attributeNamespace: null,
		nextSibling: null,
		oldValue: null,
		previousSibling: null,
		removedNodes: removedNodes as unknown as NodeList,
		target,
		type,
	} as MutationRecord;
}

describe("mobile native popup bridge observer", () => {
	test("ignores unrelated mutations", () => {
		const unrelated = document.createElement("div");

		expect(
			shouldSyncNativePopupForMutations([
				createMutation({ addedNodes: [unrelated] }),
				createMutation({
					attributeName: "class",
					target: unrelated,
					type: "attributes",
				}),
			]),
		).toBe(false);
	});

	test("syncs for dialog popup and legacy popup mutations", () => {
		const dialog = document.createElement("dialog");
		dialog.className = "popup";
		const legacyPopup = document.createElement("div");
		legacyPopup.id = "shadow_popup";

		expect(
			shouldSyncNativePopupForMutations([
				createMutation({ addedNodes: [dialog] }),
			]),
		).toBe(true);
		expect(
			shouldSyncNativePopupForMutations([
				createMutation({
					attributeName: "style",
					target: legacyPopup,
					type: "attributes",
				}),
			]),
		).toBe(true);
	});

	test("sets the native popup active contract after the scheduled frame", async () => {
		const frameCallbacks: FrameRequestCallback[] = [];
		vi.spyOn(window, "requestAnimationFrame").mockImplementation(
			(callback: FrameRequestCallback) => {
				frameCallbacks.push(callback);
				return frameCallbacks.length;
			},
		);
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(vi.fn());
		const bridge = createMobileNativePopupBridge({
			documentRef: document,
		});

		try {
			bridge.mount();
			const popup = document.createElement("dialog");
			popup.className = "popup";
			popup.setAttribute("open", "");
			document.body.append(popup);

			await Promise.resolve();
			await Promise.resolve();

			expect(document.body).not.toHaveAttribute(
				NATIVE_POPUP_ACTIVE_ATTRIBUTE,
			);

			const callbacks = frameCallbacks.splice(0);
			for (const callback of callbacks) {
				callback(0);
			}

			expect(document.body).toHaveAttribute(
				NATIVE_POPUP_ACTIVE_ATTRIBUTE,
				"true",
			);
			expect(document.documentElement).toHaveAttribute(
				NATIVE_POPUP_ACTIVE_ATTRIBUTE,
				"true",
			);
		} finally {
			bridge.dispose();
		}
	});
});
