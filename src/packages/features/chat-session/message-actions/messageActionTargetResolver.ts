import type { ChatMessageRevisionHistoryItem } from "@/packages/core/st/chatMessageRevisionHistory";
import { getStContext } from "@/packages/core/st/context";
import { isRecord } from "@/packages/core/st/shared";
import {
	resolveMessageModelIconKey,
	resolveMessageModelLabel,
} from "@/packages/features/chat-session/messageModelMetadata";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import { createMessageContentSnapshot } from "@/packages/features/chat-session/message-actions/more-actions/messageContentSnapshot";

export interface LoadedMessageElement {
	messageElement: Element;
	messageId: number;
}

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

function asTrimmedString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
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
	const domText = messageElement.querySelector(".mesIDDisplay")?.textContent;
	const normalizedDomText = asTrimmedString(domText);

	return normalizedDomText || `#${messageId}`;
}

function resolveAvatarUrl(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
): string {
	const image = messageElement.querySelector(
		".mesAvatarWrapper img, .mes_avatar img, .avatar img",
	);
	if (image instanceof HTMLImageElement) {
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
	const nameText = asTrimmedString(
		messageElement.querySelector(".name_text")?.textContent,
	);
	if (nameText) {
		return nameText;
	}

	const nameElement = messageElement.querySelector(".ch_name");
	if (!nameElement) {
		return "";
	}

	const clone = nameElement.cloneNode(true);
	if (!(clone instanceof Element)) {
		return "";
	}

	clone
		.querySelectorAll(
			".astra-mesModel, .timestamp, .timestamp-icon, .mes_buttons",
		)
		.forEach((element) => element.remove());
	return asTrimmedString(clone.textContent);
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

function resolveElementText(messageElement: Element, selector: string): string {
	return asTrimmedString(messageElement.querySelector(selector)?.textContent);
}

function resolveTimestamp(messageElement: Element): string {
	return (
		asTrimmedString(messageElement.getAttribute("timestamp")) ||
		resolveElementText(messageElement, ".timestamp")
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
	const timestampIcon = messageElement.querySelector(".timestamp-icon");
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

	return {
		bookmarkLink:
			asTrimmedString(messageElement.getAttribute("bookmark_link")) ||
			undefined,
		generationTime:
			resolveElementText(messageElement, ".mes_timer") || undefined,
		...modelMetadata,
		timestamp: resolveTimestamp(messageElement) || undefined,
		tokenCount:
			resolveElementText(messageElement, ".tokenCounterDisplay") ||
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

export function resolveMessageElement(
	documentRef: Document,
	messageId: number,
): Element | null {
	return documentRef.querySelector(`#chat .mes[mesid="${messageId}"]`);
}

export function resolveNativeMessageActionElement({
	documentRef,
	messageId,
	selector,
}: {
	documentRef: Document;
	messageId: number;
	selector: string;
}): HTMLElement | null {
	const actionElement = resolveMessageElement(
		documentRef,
		messageId,
	)?.querySelector(selector);

	return actionElement instanceof HTMLElement ? actionElement : null;
}

export function dispatchNativeClick({
	documentRef,
	element,
}: {
	documentRef: Document;
	element: HTMLElement;
}) {
	const view = documentRef.defaultView;
	const event =
		typeof view?.MouseEvent === "function"
			? new view.MouseEvent("click", {
					bubbles: true,
					cancelable: true,
				})
			: new Event("click", { bubbles: true, cancelable: true });

	element.dispatchEvent(event);
}

export function dispatchNativePointerUp({
	documentRef,
	element,
}: {
	documentRef: Document;
	element: HTMLElement;
}) {
	const view = documentRef.defaultView;
	const event =
		typeof view?.PointerEvent === "function"
			? new view.PointerEvent("pointerup", {
					bubbles: true,
					cancelable: true,
					pointerType: "touch",
				})
			: new Event("pointerup", { bubbles: true, cancelable: true });

	element.dispatchEvent(event);
}

export function resolveLoadedMessageElements(
	documentRef: Document,
): LoadedMessageElement[] {
	const seenMessageIds = new Set<number>();
	const messageElements: LoadedMessageElement[] = [];

	for (const messageElement of Array.from(
		documentRef.querySelectorAll("#chat .mes[mesid]"),
	)) {
		const messageId = Number(messageElement.getAttribute("mesid"));
		if (!Number.isInteger(messageId) || seenMessageIds.has(messageId)) {
			continue;
		}

		seenMessageIds.add(messageId);
		messageElements.push({
			messageElement,
			messageId,
		});
	}

	return messageElements;
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
