import { describe, expect, test } from "vitest";

import { shouldScheduleMessageLayoutSyncForMutations } from "@/packages/features/chat-session/message-layout/createMessageHeaderLayoutFeature";

function createMutation({
	addedNodes = [],
	attributeName = null,
	oldValue = null,
	removedNodes = [],
	target = document.body,
	type = "childList",
}: {
	addedNodes?: Node[];
	attributeName?: string | null;
	oldValue?: string | null;
	removedNodes?: Node[];
	target?: Node;
	type?: MutationRecordType;
}): MutationRecord {
	return {
		addedNodes: addedNodes as unknown as NodeList,
		attributeName,
		attributeNamespace: null,
		nextSibling: null,
		oldValue,
		previousSibling: null,
		removedNodes: removedNodes as unknown as NodeList,
		target,
		type,
	} as MutationRecord;
}

describe("message layout observer scheduling", () => {
	test("ignores unrelated chat childList mutations", () => {
		const unrelated = document.createElement("div");

		expect(
			shouldScheduleMessageLayoutSyncForMutations([
				createMutation({ addedNodes: [unrelated] }),
			]),
		).toBe(false);
	});

	test("syncs for message childList and relevant message attributes", () => {
		const message = document.createElement("div");
		message.className = "mes";
		message.setAttribute("mesid", "0");

		expect(
			shouldScheduleMessageLayoutSyncForMutations([
				createMutation({ addedNodes: [message] }),
			]),
		).toBe(true);

		message.classList.add("lastInContext");
		expect(
			shouldScheduleMessageLayoutSyncForMutations([
				createMutation({
					attributeName: "class",
					oldValue: "mes",
					target: message,
					type: "attributes",
				}),
			]),
		).toBe(true);
		expect(
			shouldScheduleMessageLayoutSyncForMutations([
				createMutation({
					attributeName: "is_system",
					target: message,
					type: "attributes",
				}),
			]),
		).toBe(true);
	});
});
