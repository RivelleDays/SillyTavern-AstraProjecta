import {
	collectChatMessageSearchMatches,
	type ChatMessageSearchMatch,
} from "@/packages/features/chat-session/message-search/matching";
import type { ChatMessageSearchSnapshot } from "@/packages/features/chat-session/message-search/store";
import {
	ASTRA_CHAT_MESSAGE_SEARCH_ACTIVE_HIGHLIGHT_CLASS,
	ASTRA_CHAT_MESSAGE_SEARCH_HIGHLIGHT_CLASS,
} from "@/packages/features/chat-session/message-search/contracts/dom";

interface TextNodeRange {
	end: number;
	node: Text;
	start: number;
}

export function clearChatMessageSearchHighlights(
	documentRef: Document = document,
): void {
	const highlights = documentRef.querySelectorAll(
		`mark[data-astra-chat-message-search-highlight="true"]`,
	);
	for (const highlight of highlights) {
		const parent = highlight.parentNode;
		if (!parent) {
			continue;
		}

		parent.replaceChild(
			documentRef.createTextNode(highlight.textContent ?? ""),
			highlight,
		);
		parent.normalize();
	}
}

function collectTextNodeRanges(root: HTMLElement): TextNodeRange[] {
	const walker = root.ownerDocument.createTreeWalker(
		root,
		NodeFilter.SHOW_TEXT,
	);
	const ranges: TextNodeRange[] = [];
	let offset = 0;

	while (walker.nextNode()) {
		const node = walker.currentNode;
		if (!(node instanceof Text)) {
			continue;
		}

		const length = node.data.length;
		ranges.push({
			end: offset + length,
			node,
			start: offset,
		});
		offset += length;
	}

	return ranges;
}

function findRangeForOffset(
	ranges: TextNodeRange[],
	offset: number,
): TextNodeRange | null {
	return (
		ranges.find(
			(range) => offset >= range.start && offset <= range.end,
		) ?? null
	);
}

function isActiveMatch(
	activeMatch: ChatMessageSearchMatch | null,
	messageId: number,
	match: ChatMessageSearchMatch,
): boolean {
	return (
		activeMatch?.messageId === messageId &&
		activeMatch.start === match.start &&
		activeMatch.end === match.end
	);
}

function wrapTextRange({
	active,
	match,
	ranges,
}: {
	active: boolean;
	match: ChatMessageSearchMatch;
	ranges: TextNodeRange[];
}): HTMLElement | null {
	const startRange = findRangeForOffset(ranges, match.start);
	const endRange = findRangeForOffset(ranges, match.end);
	if (!startRange || !endRange || startRange.node !== endRange.node) {
		return null;
	}

	const node = startRange.node;
	const documentRef = node.ownerDocument;
	const startOffset = match.start - startRange.start;
	const endOffset = match.end - startRange.start;
	const text = node.data;
	const before = text.slice(0, startOffset);
	const matched = text.slice(startOffset, endOffset);
	const after = text.slice(endOffset);
	const highlight = documentRef.createElement("mark");
	highlight.dataset.astraChatMessageSearchHighlight = "true";
	highlight.className = active
		? `${ASTRA_CHAT_MESSAGE_SEARCH_HIGHLIGHT_CLASS} ${ASTRA_CHAT_MESSAGE_SEARCH_ACTIVE_HIGHLIGHT_CLASS}`
		: ASTRA_CHAT_MESSAGE_SEARCH_HIGHLIGHT_CLASS;
	highlight.textContent = matched;

	const replacements: Node[] = [];
	if (before) {
		replacements.push(documentRef.createTextNode(before));
	}
	replacements.push(highlight);
	if (after) {
		replacements.push(documentRef.createTextNode(after));
	}

	node.replaceWith(...replacements);
	return highlight;
}

export function applyChatMessageSearchHighlights({
	documentRef = document,
	snapshot,
}: {
	documentRef?: Document;
	snapshot: ChatMessageSearchSnapshot;
}): HTMLElement | null {
	clearChatMessageSearchHighlights(documentRef);

	if (!snapshot.isOpen || !snapshot.query) {
		return null;
	}

	let activeHighlight: HTMLElement | null = null;
	const textNodes = documentRef.querySelectorAll("#chat .mes[mesid] .mes_text");
	for (const textNode of textNodes) {
		if (!(textNode instanceof HTMLElement)) {
			continue;
		}

		const messageNode = textNode.closest(".mes[mesid]");
		const rawMessageId = messageNode?.getAttribute("mesid");
		const messageId =
			typeof rawMessageId === "string" ? Number.parseInt(rawMessageId, 10) : NaN;
		if (!Number.isInteger(messageId)) {
			continue;
		}

		const text = textNode.textContent ?? "";
		const matches = collectChatMessageSearchMatches({
			messages: [{ mes: text, messageId }],
			options: {
				caseSensitive: snapshot.caseSensitive,
				wholeWord: snapshot.wholeWord,
			},
			query: snapshot.query,
		});
		for (const match of [...matches].reverse()) {
			const highlight = wrapTextRange({
				active: isActiveMatch(snapshot.activeMatch, messageId, match),
				match,
				ranges: collectTextNodeRanges(textNode),
			});
			if (
				highlight &&
				isActiveMatch(snapshot.activeMatch, messageId, match)
			) {
				activeHighlight = highlight;
			}
		}
	}

	activeHighlight
		?.closest(".mes")
		?.scrollIntoView({ block: "center", inline: "nearest" });
	return activeHighlight;
}
