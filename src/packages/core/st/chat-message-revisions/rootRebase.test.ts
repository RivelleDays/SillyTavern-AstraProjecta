import { describe, expect, test } from "vitest";

import { rebaseRevisionRootToNativeSwipeIndex } from "@/packages/core/st/chat-message-revisions/rootRebase";
import type { AstraRevisionNode } from "@/packages/core/st/chat-message-revisions/storage";

describe("revision root rebasing", () => {
	test("rebases active and parent paths through descendant revisions", () => {
		const rootRevision: AstraRevisionNode = {
			active: [2, 0],
			parent: [2],
			swipes: [
				{
					active: [2, 0, 1],
					parent: [2],
					swipes: [
						{
							active: [2, 0, 1],
							parent: [2, 0],
							swipes: [],
						},
					],
				},
			],
		};

		rebaseRevisionRootToNativeSwipeIndex(rootRevision, 1);

		expect(rootRevision).toEqual({
			active: [1, 0],
			parent: [],
			swipes: [
				{
					active: [1, 0, 1],
					parent: [1],
					swipes: [
						{
							active: [1, 0, 1],
							parent: [1, 0],
							swipes: [],
						},
					],
				},
			],
		});
	});

	test("defaults a root with no active path to the rebased root index", () => {
		const rootRevision: AstraRevisionNode = {
			active: null,
			parent: [],
			swipes: [],
		};

		rebaseRevisionRootToNativeSwipeIndex(rootRevision, 3);

		expect(rootRevision).toEqual({
			active: [3],
			parent: [],
			swipes: [],
		});
	});
});
