import { describe, expect, test } from "vitest";

import { shouldSyncManagedTextareaForMutations } from "@/packages/features/chat-session/send-form/shell/AstraMobileSendForm";

function createChildListMutation({
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

describe("AstraMobileSendForm textarea observer", () => {
	test("ignores unrelated body mutations", () => {
		const unrelated = document.createElement("div");

		expect(
			shouldSyncManagedTextareaForMutations([
				createChildListMutation({ addedNodes: [unrelated] }),
			]),
		).toBe(false);
	});

	test("syncs when the managed send textarea is added or removed", () => {
		const addedTextarea = document.createElement("textarea");
		addedTextarea.id = "send_textarea";
		const removedTextarea = document.createElement("textarea");
		removedTextarea.id = "send_textarea";

		expect(
			shouldSyncManagedTextareaForMutations([
				createChildListMutation({ addedNodes: [addedTextarea] }),
			]),
		).toBe(true);
		expect(
			shouldSyncManagedTextareaForMutations([
				createChildListMutation({ removedNodes: [removedTextarea] }),
			]),
		).toBe(true);
	});
});
