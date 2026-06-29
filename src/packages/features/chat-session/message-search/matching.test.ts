import { describe, expect, test } from "vitest";

import {
	collectChatMessageSearchMatches,
	type ChatMessageSearchMessage,
} from "@/packages/features/chat-session/message-search/matching";

function createMessages(
	values: Array<string | null | undefined>,
): ChatMessageSearchMessage[] {
	return values.map((mes, messageId) => ({ mes, messageId }));
}

describe("chat message search matching", () => {
	test("matches message body text across the current chat", () => {
		expect(
			collectChatMessageSearchMatches({
				messages: createMessages(["Alpha", "beta alpha", "none"]),
				query: "alpha",
				options: {
					caseSensitive: false,
					wholeWord: false,
				},
			}),
		).toEqual([
			{ end: 5, messageId: 0, start: 0, text: "Alpha" },
			{ end: 10, messageId: 1, start: 5, text: "alpha" },
		]);
	});

	test("honors case-sensitive matching when enabled", () => {
		expect(
			collectChatMessageSearchMatches({
				messages: createMessages(["Alpha alpha ALPHA"]),
				query: "Alpha",
				options: {
					caseSensitive: true,
					wholeWord: false,
				},
			}),
		).toEqual([{ end: 5, messageId: 0, start: 0, text: "Alpha" }]);
	});

	test("uses Latin and digit word boundaries for whole-word matching", () => {
		expect(
			collectChatMessageSearchMatches({
				messages: createMessages([
					"cat catalog scat cat2 cat dog-cat dog_cat cat",
				]),
				query: "cat",
				options: {
					caseSensitive: false,
					wholeWord: true,
				},
			}),
		).toEqual([
			{ end: 3, messageId: 0, start: 0, text: "cat" },
			{ end: 25, messageId: 0, start: 22, text: "cat" },
			{ end: 33, messageId: 0, start: 30, text: "cat" },
			{ end: 41, messageId: 0, start: 38, text: "cat" },
			{ end: 45, messageId: 0, start: 42, text: "cat" },
		]);
	});

	test("keeps CJK queries as exact substring matches in whole-word mode", () => {
		expect(
			collectChatMessageSearchMatches({
				messages: createMessages(["益生菌", "吃益生菌了"]),
				query: "益生菌",
				options: {
					caseSensitive: false,
					wholeWord: true,
				},
			}),
		).toEqual([
			{ end: 3, messageId: 0, start: 0, text: "益生菌" },
			{ end: 4, messageId: 1, start: 1, text: "益生菌" },
		]);
	});

	test("returns no matches for empty queries and invalid message text", () => {
		expect(
			collectChatMessageSearchMatches({
				messages: createMessages(["", null, undefined]),
				query: "",
				options: {
					caseSensitive: false,
					wholeWord: false,
				},
			}),
		).toEqual([]);
	});
});
