import { describe, expect, test } from "vitest";

import { shouldSyncNativePopupForMutations } from "@/app/mobile/runtime/mobileNativePopupBridge";

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
});
