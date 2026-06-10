import { describe, expect, test } from "vitest";

import { readChatMessageRevisionTreeSnapshot } from "@/packages/core/st/chatMessageRevisionTree";

describe("chat message revision tree reader", () => {
	test("reads native swipe rows with Astra revision children without mutating chat data", () => {
		const chat = [
			{
				is_user: false,
				mes: "First edited",
				name: "Assistant",
				swipe_id: 0,
				swipes: ["First edited", "Second"],
				continueHistory: [
					{
						active: [0, 0],
						createdAt: 10,
						fullText: "First",
						kind: "origin",
						mes: "First",
						parent: [],
						swipes: [
							{
								createdAt: 20,
								fullText: "First edited",
								kind: "edit",
								mes: " edited",
								parent: [0],
								swipes: [],
							},
						],
					},
					{
						active: [1],
						createdAt: 30,
						fullText: "Second",
						kind: "origin",
						mes: "Second",
						parent: [],
						swipes: [],
					},
				],
			},
		];
		const before = JSON.stringify(chat);

		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: { chat },
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot).toEqual({
			activeFullText: "First edited",
			activePath: [0, 0],
			hasHistory: true,
			messageId: 0,
			displayRoots: [
				{
					children: [
						{
							children: [],
							compactText: "edited",
							createdAt: 20,
							fullText: "First edited",
							kind: "edit",
							path: [0, 0],
							text: " edited",
						},
					],
					compactText: "First",
					createdAt: 10,
					fullText: "First",
					kind: "nativeSwipe",
					path: [0],
					text: "First",
				},
			],
			root: {
				children: [
					{
						children: [],
						compactText: "edited",
						createdAt: 20,
						fullText: "First edited",
						kind: "edit",
						path: [0, 0],
						text: " edited",
					},
				],
				compactText: "First",
				createdAt: 10,
				fullText: "First",
				kind: "nativeSwipe",
				path: [0],
				text: "First",
			},
			roots: [
				{
					children: [
						{
							children: [],
							compactText: "edited",
							createdAt: 20,
							fullText: "First edited",
							kind: "edit",
							path: [0, 0],
							text: " edited",
						},
					],
					compactText: "First",
					createdAt: 10,
					fullText: "First",
					kind: "nativeSwipe",
					path: [0],
					text: "First",
				},
				{
					children: [],
					compactText: "Second",
					createdAt: 30,
					fullText: "Second",
					kind: "nativeSwipe",
					path: [1],
					text: "Second",
				},
			],
			status: "ready",
			swipeIndex: 0,
		});
		expect(JSON.stringify(chat)).toBe(before);
	});

	test("promotes root regenerated replacements beside the original display root", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Regenerated root Continued",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Regenerated root Continued"],
						continueHistory: [
							{
								active: [0, 0, 0],
								createdAt: 10,
								fullText: "Root",
								kind: "origin",
								mes: "Root",
								parent: [],
								swipes: [
									{
										createdAt: 20,
										fullText: "Regenerated root",
										kind: "regenerate",
										mes: "Regenerated root",
										parent: [0],
										swipes: [
											{
												createdAt: 30,
												fullText:
													"Regenerated root Continued",
												kind: "continue",
												mes: " Continued",
												parent: [0, 0],
												swipes: [],
											},
										],
									},
								],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot.displayRoots).toEqual([
			{
				children: [],
				compactText: "Root",
				createdAt: 10,
				fullText: "Root",
				kind: "nativeSwipe",
				path: [0],
				text: "Root",
			},
			{
				children: [
					{
						children: [],
						compactText: "Continued",
						createdAt: 30,
						fullText: "Regenerated root Continued",
						kind: "continue",
						path: [0, 0, 0],
						text: " Continued",
					},
				],
				compactText: "Regenerated root",
				createdAt: 20,
				fullText: "Regenerated root",
				kind: "regenerate",
				path: [0, 0],
				text: "Regenerated root",
			},
		]);
		expect(snapshot.activePath).toEqual([0, 0, 0]);
		expect(snapshot.activeFullText).toBe("Regenerated root Continued");
	});

	test("returns native swipe rows when no Astra revision children exist", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Second",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["First", "Second"],
					},
				],
			},
			messageId: 0,
			swipeIndex: 1,
		});

		expect(snapshot).toMatchObject({
			activeFullText: "Second",
			activePath: [1],
			hasHistory: true,
			messageId: 0,
			roots: [
				{
					children: [],
					fullText: "First",
					kind: "nativeSwipe",
					path: [0],
					text: "First",
				},
				{
					children: [],
					fullText: "Second",
					kind: "nativeSwipe",
					path: [1],
					text: "Second",
				},
			],
			status: "ready",
			swipeIndex: 1,
		});
	});

	test("exposes compact text as appended text for generated continues", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Root Added",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Root Added"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Root",
								kind: "origin",
								mes: "Root",
								parent: [],
								swipes: [
									{
										fullText: "Root Added",
										kind: "continue",
										mes: " Added",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot.root?.children[0]?.compactText).toBe("Added");
	});

	test("trims leading newlines from compact text for generated continues", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Root\n\nContinued",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Root\n\nContinued"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Root",
								kind: "origin",
								mes: "Root",
								parent: [],
								swipes: [
									{
										fullText: "Root\n\nContinued",
										kind: "continue",
										mes: "\n\nContinued",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot.root?.children[0]?.compactText).toBe("Continued");
	});

	test("exposes compact text as the changed middle segment for edits", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "The blue fox jumps",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["The blue fox jumps"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "The red fox jumps",
								kind: "origin",
								mes: "The red fox jumps",
								parent: [],
								swipes: [
									{
										fullText: "The blue fox jumps",
										kind: "edit",
										mes: "blue fox jumps",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot.root?.children[0]?.compactText).toBe("blue");
	});

	test("trims leading whitespace from compact text for middle edits", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Alpha \nnew tail",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Alpha \nnew tail"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Alpha old tail",
								kind: "origin",
								mes: "Alpha old tail",
								parent: [],
								swipes: [
									{
										fullText: "Alpha \nnew tail",
										kind: "edit",
										mes: "\nnew tail",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot.root?.children[0]?.compactText).toBe("new");
	});

	test("keeps promoted root replacements compact relative to the original root", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Root regenerated ending",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Root regenerated ending"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Root original ending",
								kind: "origin",
								mes: "Root original ending",
								parent: [],
								swipes: [
									{
										fullText: "Root regenerated ending",
										kind: "regenerate",
										mes: "Root regenerated ending",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot.displayRoots[1]?.compactText).toBe("regenerated");
	});

	test("uses removed-text fallback for compact pure deletions", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Root  ending",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Root  ending"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Root deleted ending",
								kind: "origin",
								mes: "Root deleted ending",
								parent: [],
								swipes: [
									{
										fullText: "Root  ending",
										kind: "edit",
										mes: " ending",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot.root?.children[0]?.compactText).toBe("Removed text");
	});

	test("uses whitespace-change fallback for compact whitespace-only edits", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Root   ",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Root   "],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Root",
								kind: "origin",
								mes: "Root",
								parent: [],
								swipes: [
									{
										fullText: "Root   ",
										kind: "edit",
										mes: "   ",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot.root?.children[0]?.compactText).toBe(
			"Whitespace change",
		);
	});

	test("keeps full-text-only compact previews non-empty", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Root rewritten ending",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Root rewritten ending"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Root original ending",
								kind: "origin",
								mes: "Root original ending",
								parent: [],
								swipes: [
									{
										fullText: "Root rewritten ending",
										kind: "edit",
										mes: "",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot.root?.children[0]?.compactText).toBe("rewritten");
	});

	test("prefers namespaced Astra revision roots over legacy continue history", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						astra_projecta: {
							revisionHistory: {
								roots: [
									{
										active: [0, 0],
										fullText: "Namespaced",
										kind: "origin",
										mes: "Namespaced",
										parent: [],
										swipes: [
											{
												fullText: "Namespaced edited",
												kind: "edit",
												mes: " edited",
												parent: [0],
												swipes: [],
											},
										],
									},
								],
							},
						},
						continueHistory: [
							{
								active: [0],
								fullText: "Legacy",
								mes: "Legacy",
								parent: [],
								swipes: [],
							},
						],
						is_user: false,
						mes: "Namespaced edited",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Namespaced edited"],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot).toMatchObject({
			activeFullText: "Namespaced edited",
			activePath: [0, 0],
			roots: [
				{
					children: [
						{
							fullText: "Namespaced edited",
							kind: "edit",
							path: [0, 0],
						},
					],
					fullText: "Namespaced",
					kind: "nativeSwipe",
					path: [0],
				},
			],
			status: "ready",
		});
	});

	test("returns idle when one native swipe has no revision children", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Only",
						name: "Assistant",
						swipe_id: 0,
						swipes: ["Only"],
					},
				],
			},
			messageId: 0,
			swipeIndex: 0,
		});

		expect(snapshot).toEqual({
			activeFullText: "",
			activePath: [],
			displayRoots: [],
			hasHistory: false,
			messageId: 0,
			root: null,
			roots: [],
			status: "idle",
			swipeIndex: 0,
		});
	});

	test("keeps alternate native swipe rows even when current swipe has no revision children", () => {
		const snapshot = readChatMessageRevisionTreeSnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Second",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["First", "Second"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "First",
								kind: "origin",
								mes: "First",
								parent: [],
								swipes: [
									{
										fullText: "First edited",
										kind: "edit",
										mes: " edited",
										parent: [0],
										swipes: [],
									},
								],
							},
							{
								active: [1],
								fullText: "Second",
								kind: "origin",
								mes: "Second",
								parent: [],
								swipes: [],
							},
						],
					},
				],
			},
			messageId: 0,
			swipeIndex: 1,
		});

		expect(snapshot).toMatchObject({
			activeFullText: "Second",
			activePath: [1],
			hasHistory: true,
			roots: [
				expect.objectContaining({ path: [0] }),
				expect.objectContaining({ path: [1] }),
			],
			status: "ready",
		});
	});
});
