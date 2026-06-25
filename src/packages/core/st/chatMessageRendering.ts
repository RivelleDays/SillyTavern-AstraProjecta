export type RenderedMessageContent =
	| {
			kind: "formatted-html";
			value: string;
	  }
	| {
			kind: "plain-text";
			value: string;
	  };

type MessageFormatterLike = (
	value: string,
	name?: unknown,
	isSystem?: boolean,
	isUser?: unknown,
	messageId?: unknown,
) => unknown;

type MessageRenderContextLike = {
	messageFormatting?: unknown;
} | null;

type MessageRenderMessageLike = {
	is_system?: unknown;
	is_user?: unknown;
	name?: unknown;
};

export function renderMessageContent({
	context,
	message,
	messageId,
	text,
}: {
	context: MessageRenderContextLike;
	message: MessageRenderMessageLike;
	messageId: number;
	text: string;
}): RenderedMessageContent {
	if (typeof context?.messageFormatting === "function") {
		try {
			const formatted = (
				context.messageFormatting as MessageFormatterLike
			)(
				text,
				message.name,
				message.is_system === true,
				message.is_user === true,
				messageId,
			);

			return {
				kind: "formatted-html",
				value:
					typeof formatted === "string"
						? formatted
						: String(formatted ?? ""),
			};
		} catch {
			// Fall through to textContent-only rendering.
		}
	}

	return {
		kind: "plain-text",
		value: text,
	};
}

export function writeRenderedMessageContent(
	target: Element,
	content: RenderedMessageContent,
): void {
	if (content.kind === "formatted-html") {
		target.innerHTML = content.value;
		return;
	}

	target.textContent = content.value;
}
