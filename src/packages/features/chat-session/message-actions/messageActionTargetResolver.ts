import type { ChatMessageRevisionHistoryItem } from "@/packages/core/st/chatMessageRevisionHistory";
import { getStContext } from "@/packages/core/st/context";
import { asTrimmedString, isRecord } from "@/packages/core/st/shared";
import {
	resolveMessageModelIconKey,
	resolveMessageModelLabel,
} from "@/packages/features/chat-session/messageModelMetadata";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import { createMessageContentSnapshot } from "@/packages/features/chat-session/message-actions/more-actions/messageContentSnapshot";
import {
	type LoadedMessageElement,
	resolveMessageMetadataElements,
	resolveMessageSenderNameText,
} from "@/packages/features/chat-session/message-actions/contracts/dom";

export type MessageActionsContextLike = Record<string, unknown> & {
	chat?: unknown;
};

export type MessageActionsChatMessageLike = Record<string, unknown> & {
	extra?: unknown;
	is_system?: unknown;
	is_user?: unknown;
	name?: unknown;
	swipe_id?: unknown;
	swipes?: unknown;
};

export function resolveContextSafe(): MessageActionsContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context)
			? (context as MessageActionsContextLike)
			: null;
	} catch {
		return null;
	}
}

function asChatMessage(value: unknown): MessageActionsChatMessageLike | null {
	return isRecord(value) ? (value as MessageActionsChatMessageLike) : null;
}

function asIndex(value: unknown): number {
	const numericValue =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number.parseInt(value, 10)
				: 0;

	return Number.isInteger(numericValue) ? numericValue : 0;
}

export function asOptionalBoolean(value: unknown): boolean | undefined {
	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value !== "string") {
		return undefined;
	}

	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === "true") {
		return true;
	}
	if (normalizedValue === "false") {
		return false;
	}

	return undefined;
}

function clampIndex(index: number, total: number): number {
	return Math.min(total - 1, Math.max(0, index));
}

export function resolveChatMessage(
	context: MessageActionsContextLike | null,
	messageId: number,
): MessageActionsChatMessageLike | null {
	const chat = Array.isArray(context?.chat) ? context.chat : [];
	return asChatMessage(chat[messageId]);
}

function resolveMessageDisplayId(
	messageElement: Element,
	messageId: number,
): string {
	const domText =
		resolveMessageMetadataElements(messageElement).displayId?.textContent;
	const normalizedDomText = asTrimmedString(domText);

	return normalizedDomText || `#${messageId}`;
}

function resolveAvatarUrl(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
): string {
	const image = resolveMessageMetadataElements(messageElement).avatarImage;
	if (image) {
		const imageUrl =
			asTrimmedString(image.getAttribute("src")) ||
			asTrimmedString(image.currentSrc) ||
			asTrimmedString(image.src);
		if (imageUrl) {
			return imageUrl;
		}
	}

	const candidates = [
		message?.avatarUrl,
		message?.avatar,
		message?.character_avatar,
		message?.ch_avatar,
		message?.img,
		message?.avatar_url,
		message?.avatarId,
		message?.avatar_file,
		message?.avatarFile,
	];

	return candidates.map(asTrimmedString).find(Boolean) ?? "";
}

function resolveDomSenderName(messageElement: Element): string {
	return asTrimmedString(resolveMessageSenderNameText(messageElement));
}

function resolveSenderName(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
): string {
	const messageName = asTrimmedString(message?.name);
	if (messageName) {
		return messageName;
	}

	const domName = resolveDomSenderName(messageElement);
	if (domName) {
		return domName;
	}

	if (message?.is_system === true) {
		return "System";
	}

	return message?.is_user === true ? "User" : "Character";
}

function resolveTimestamp(messageElement: Element): string {
	const { timestamp } = resolveMessageMetadataElements(messageElement);
	return (
		asTrimmedString(messageElement.getAttribute("timestamp")) ||
		asTrimmedString(timestamp?.textContent)
	);
}

function scrubInertTimestampIconElement(element: Element) {
	const elements = [element, ...Array.from(element.querySelectorAll("*"))];
	for (const currentElement of elements) {
		currentElement.removeAttribute("id");
		for (const attribute of Array.from(currentElement.attributes)) {
			if (attribute.name.toLowerCase().startsWith("on")) {
				currentElement.removeAttribute(attribute.name);
			}
		}
	}
}

function cloneTimestampIconHtml(timestampIcon: Element): string {
	const clonedIcon = timestampIcon.cloneNode(true);
	if (!(clonedIcon instanceof Element)) {
		return "";
	}

	scrubInertTimestampIconElement(clonedIcon);
	return clonedIcon.outerHTML;
}

function resolveMessageModelMetadata(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
): Pick<
	MessageActionsTarget["metadata"],
	"modelIconHtml" | "modelIconKey" | "modelLabel"
> {
	const timestampIcon =
		resolveMessageMetadataElements(messageElement).timestampIcon;
	const iconTitle =
		timestampIcon instanceof Element
			? asTrimmedString(timestampIcon.getAttribute("title"))
			: "";
	const extra = isRecord(message?.extra) ? message.extra : null;
	const modelLabel = resolveMessageModelLabel({
		iconTitle,
		model: extra?.model,
	});
	const modelIconKey = resolveMessageModelIconKey({
		iconTitle,
		model: extra?.model,
	});
	const modelIconHtml =
		timestampIcon instanceof Element
			? cloneTimestampIconHtml(timestampIcon)
			: "";
	const modelMetadata: Pick<
		MessageActionsTarget["metadata"],
		"modelIconHtml" | "modelIconKey" | "modelLabel"
	> = {};
	if (modelIconHtml) {
		modelMetadata.modelIconHtml = modelIconHtml;
	}
	if (modelIconKey) {
		modelMetadata.modelIconKey = modelIconKey;
	}
	if (modelLabel) {
		modelMetadata.modelLabel = modelLabel;
	}

	return modelMetadata;
}

function resolveMessageMetadata(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
): MessageActionsTarget["metadata"] {
	const modelMetadata = resolveMessageModelMetadata(message, messageElement);
	const metadataElements = resolveMessageMetadataElements(messageElement);

	return {
		bookmarkLink:
			asTrimmedString(messageElement.getAttribute("bookmark_link")) ||
			undefined,
		generationTime:
			asTrimmedString(metadataElements.generationTime?.textContent) ||
			undefined,
		...modelMetadata,
		timestamp: resolveTimestamp(messageElement) || undefined,
		tokenCount:
			asTrimmedString(metadataElements.tokenCount?.textContent) ||
			undefined,
	};
}

export function resolveMessageBooleanFlag(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
	attributeName: string,
	messageFieldName: "is_system" | "is_user",
): boolean {
	const attributeValue = asOptionalBoolean(
		messageElement.getAttribute(attributeName),
	);
	if (typeof attributeValue === "boolean") {
		return attributeValue;
	}

	return message?.[messageFieldName] === true;
}

export function resolveMoreActionsTarget({
	context,
	includeRenderedMessage = false,
	messageElement,
	messageId,
}: {
	context: MessageActionsContextLike | null;
	includeRenderedMessage?: boolean;
	messageElement: Element;
	messageId: number;
}): MessageActionsTarget {
	const message = resolveChatMessage(context, messageId);
	const swipeTotal =
		Array.isArray(message?.swipes) && message.swipes.length > 0
			? message.swipes.length
			: 1;
	const swipeIndex = clampIndex(asIndex(message?.swipe_id), swipeTotal);
	const messageContentSnapshot = includeRenderedMessage
		? createMessageContentSnapshot(messageElement)
		: {
				messagePreviewText: "",
				renderedMessageHtml: "",
			};

	return {
		avatarUrl: resolveAvatarUrl(message, messageElement),
		isSystem: resolveMessageBooleanFlag(
			message,
			messageElement,
			"is_system",
			"is_system",
		),
		isUser: resolveMessageBooleanFlag(
			message,
			messageElement,
			"is_user",
			"is_user",
		),
		messageDisplayId: resolveMessageDisplayId(messageElement, messageId),
		messageId,
		messagePreviewText: messageContentSnapshot.messagePreviewText,
		renderedMessageHtml: messageContentSnapshot.renderedMessageHtml,
		metadata: resolveMessageMetadata(message, messageElement),
		senderName: resolveSenderName(message, messageElement),
		swipeIndex,
		swipeTotal,
	};
}

export function isActionableFooterMessage({
	context,
	messageElement,
	messageId,
}: {
	context: MessageActionsContextLike | null;
	messageElement: Element;
	messageId: number;
}): boolean {
	const isUserAttribute = asOptionalBoolean(
		messageElement.getAttribute("is_user"),
	);
	if (isUserAttribute === true) {
		return false;
	}
	if (isUserAttribute === false) {
		return true;
	}

	const message = resolveChatMessage(context, messageId);
	if (
		resolveMessageBooleanFlag(message, messageElement, "is_user", "is_user")
	) {
		return false;
	}

	const extra = isRecord(message?.extra) ? message.extra : null;
	return extra?.isSmallSys !== true && extra?.swipeable !== false;
}

export function resolveLastActionableFooterMessage({
	context,
	loadedMessages,
}: {
	context: MessageActionsContextLike | null;
	loadedMessages: LoadedMessageElement[];
}): LoadedMessageElement | null {
	const lastMessage = loadedMessages.at(-1);
	if (!lastMessage) {
		return null;
	}

	return isActionableFooterMessage({
		context,
		messageElement: lastMessage.messageElement,
		messageId: lastMessage.messageId,
	})
		? lastMessage
		: null;
}

export function resolveInlineHistoryItem({
	historySnapshot,
	messageId,
}: {
	historySnapshot: ChatMessageRevisionHistoryItem[];
	messageId: number;
}): ChatMessageRevisionHistoryItem | null {
	return (
		historySnapshot.find(
			(item) => item.hasHistory && item.messageId === messageId,
		) ?? null
	);
}
