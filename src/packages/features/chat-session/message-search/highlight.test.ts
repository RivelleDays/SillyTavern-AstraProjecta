import { afterEach, describe, expect, test, vi } from "vitest";

import {
	applyChatMessageSearchHighlights,
	clearChatMessageSearchHighlights,
} from "@/packages/features/chat-session/message-search/highlight";
import {
	ASTRA_CHAT_MESSAGE_SEARCH_ACTIVE_HIGHLIGHT_CLASS,
	ASTRA_CHAT_MESSAGE_SEARCH_HIGHLIGHT_CLASS,
} from "@/packages/features/chat-session/message-search/contracts/dom";
import type { ChatMessageSearchSnapshot } from "@/packages/features/chat-session/message-search/store";

function createSnapshot(
	overrides: Partial<ChatMessageSearchSnapshot> = {},
): ChatMessageSearchSnapshot {
	const matches = [
		{ end: 3, messageId: 0, start: 0, swipeId: null, text: "cat" },
		{ end: 11, messageId: 0, start: 8, swipeId: null, text: "cat" },
	];

	return {
		activeMatch: matches[1],
		activeMatchIndex: 1,
		canNavigate: true,
		canRedo: false,
		canReplace: true,
		canUndo: false,
		caseSensitive: false,
		isBusy: false,
		isOpen: true,
		isReplaceOpen: false,
		matchCount: matches.length,
		matches,
		query: "cat",
		replaceText: "",
		wholeWord: false,
		...overrides,
	};
}

describe("chat message search highlights", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	test("applies active and inactive highlights and clears them back to text", () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0">
					<div class="mes_text">cat dog cat</div>
				</div>
			</div>
		`;
		const scrollIntoView = vi.fn();
		HTMLElement.prototype.scrollIntoView = scrollIntoView;

		const activeHighlight = applyChatMessageSearchHighlights({
			documentRef: document,
			snapshot: createSnapshot(),
		});

		const highlights = document.querySelectorAll(
			`.${ASTRA_CHAT_MESSAGE_SEARCH_HIGHLIGHT_CLASS}`,
		);
		expect(highlights).toHaveLength(2);
		expect(activeHighlight).toHaveClass(
			ASTRA_CHAT_MESSAGE_SEARCH_ACTIVE_HIGHLIGHT_CLASS,
		);
		expect(scrollIntoView).toHaveBeenCalledTimes(1);

		clearChatMessageSearchHighlights(document);
		expect(
			document.querySelector(`.${ASTRA_CHAT_MESSAGE_SEARCH_HIGHLIGHT_CLASS}`),
		).toBeNull();
		expect(document.querySelector(".mes_text")?.textContent).toBe(
			"cat dog cat",
		);
	});
});
