export interface MessageContentSnapshot {
	messagePreviewText: string;
	renderedMessageHtml: string;
}

const EMPTY_MESSAGE_CONTENT_SNAPSHOT: MessageContentSnapshot = {
	messagePreviewText: "",
	renderedMessageHtml: "",
};

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"area[href]",
	"audio[controls]",
	"button",
	"details",
	"embed",
	"iframe",
	"input",
	"object",
	"select",
	"summary",
	"textarea",
	"video[controls]",
	"[contenteditable]",
	"[tabindex]",
].join(",");

const SCRUBBED_ATTRIBUTE_NAMES = new Set([
	"autofocus",
	"autoplay",
	"contenteditable",
	"id",
]);

function resolveRenderedMessageText(messageElement: Element | null): Element | null {
	return (
		messageElement?.querySelector(".mes_block .mes_text") ??
		messageElement?.querySelector(".mes_text") ??
		null
	);
}

function normalizePreviewText(value: string | null | undefined): string {
	return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function collectPreviewTextParts(node: Node, parts: string[]) {
	if (node.nodeType === Node.TEXT_NODE) {
		const text = normalizePreviewText(node.textContent);
		if (text) {
			parts.push(text);
		}
		return;
	}

	if (!(node instanceof Element)) {
		return;
	}

	if (node.matches("script, style")) {
		return;
	}

	for (const child of Array.from(node.childNodes)) {
		collectPreviewTextParts(child, parts);
	}
}

function createMessagePreviewText(messageText: Element): string {
	const parts: string[] = [];
	collectPreviewTextParts(messageText, parts);
	return normalizePreviewText(parts.join(" "));
}

function shouldRemoveAttribute(attributeName: string): boolean {
	const normalizedAttributeName = attributeName.toLowerCase();
	return (
		SCRUBBED_ATTRIBUTE_NAMES.has(normalizedAttributeName) ||
		normalizedAttributeName.startsWith("on")
	);
}

function scrubElementForInertSnapshot(element: Element) {
	for (const attribute of Array.from(element.attributes)) {
		if (shouldRemoveAttribute(attribute.name)) {
			element.removeAttribute(attribute.name);
		}
	}

	if (element.matches(FOCUSABLE_SELECTOR)) {
		element.setAttribute("tabindex", "-1");
	}
}

export function createMessageContentSnapshot(
	messageElement: Element | null,
): MessageContentSnapshot {
	const messageText = resolveRenderedMessageText(messageElement);
	if (!messageText) {
		return EMPTY_MESSAGE_CONTENT_SNAPSHOT;
	}

	const clonedMessageText = messageText.cloneNode(true);
	if (!(clonedMessageText instanceof Element)) {
		return EMPTY_MESSAGE_CONTENT_SNAPSHOT;
	}
	const messagePreviewText = createMessagePreviewText(messageText);

	for (const script of Array.from(
		clonedMessageText.querySelectorAll("script"),
	)) {
		script.remove();
	}

	scrubElementForInertSnapshot(clonedMessageText);
	for (const element of Array.from(
		clonedMessageText.querySelectorAll("*"),
	)) {
		scrubElementForInertSnapshot(element);
	}

	return {
		messagePreviewText,
		renderedMessageHtml: clonedMessageText.outerHTML,
	};
}
