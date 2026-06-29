export interface ChatMessageSearchMessage {
	mes?: string | null;
	messageId: number;
}

export interface ChatMessageSearchOptions {
	caseSensitive: boolean;
	wholeWord: boolean;
}

export interface ChatMessageSearchMatch {
	end: number;
	messageId: number;
	start: number;
	text: string;
}

export interface CollectChatMessageSearchMatchesInput {
	messages: ChatMessageSearchMessage[];
	options: ChatMessageSearchOptions;
	query: string;
}

function normalizeForCase(value: string, caseSensitive: boolean): string {
	return caseSensitive ? value : value.toLocaleLowerCase();
}

function isLatinDigit(value: string): boolean {
	return /^[A-Za-z0-9]$/u.test(value);
}

function hasLatinDigit(value: string): boolean {
	return /[A-Za-z0-9]/u.test(value);
}

function isWholeWordMatch({
	end,
	query,
	start,
	text,
}: {
	end: number;
	query: string;
	start: number;
	text: string;
}): boolean {
	if (!hasLatinDigit(query)) {
		return true;
	}

	const previous = start > 0 ? text[start - 1] : "";
	const next = end < text.length ? text[end] : "";
	return !isLatinDigit(previous) && !isLatinDigit(next);
}

export function collectChatMessageSearchMatches({
	messages,
	options,
	query,
}: CollectChatMessageSearchMatchesInput): ChatMessageSearchMatch[] {
	if (!query) {
		return [];
	}

	const normalizedQuery = normalizeForCase(query, options.caseSensitive);
	if (!normalizedQuery) {
		return [];
	}

	const matches: ChatMessageSearchMatch[] = [];
	for (const message of messages) {
		const text = typeof message.mes === "string" ? message.mes : "";
		if (!text) {
			continue;
		}

		const searchableText = normalizeForCase(text, options.caseSensitive);
		let fromIndex = 0;
		while (fromIndex <= searchableText.length) {
			const start = searchableText.indexOf(normalizedQuery, fromIndex);
			if (start === -1) {
				break;
			}

			const end = start + query.length;
			if (
				!options.wholeWord ||
				isWholeWordMatch({ end, query, start, text: searchableText })
			) {
				matches.push({
					end,
					messageId: message.messageId,
					start,
					text: text.slice(start, end),
				});
			}

			fromIndex = start + Math.max(1, query.length);
		}
	}

	return matches;
}
