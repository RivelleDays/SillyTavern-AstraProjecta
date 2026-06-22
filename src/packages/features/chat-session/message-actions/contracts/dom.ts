export interface LoadedMessageElement {
	messageElement: Element;
	messageId: number;
}

export interface MessageMetadataElements {
	avatarImage: HTMLImageElement | null;
	displayId: Element | null;
	generationTime: Element | null;
	name: Element | null;
	nameText: Element | null;
	timestamp: Element | null;
	timestampIcon: Element | null;
	tokenCount: Element | null;
}

export interface MessageTextGestureTarget {
	messageElement: Element;
	messageId: number;
	messagePart: HTMLElement;
}

export type NativeMessageAction = "copy" | "hide" | "unhide";
export type NativePromptVisibilityState = "excluded" | "included";
export type MessageTextGestureKind = "editable" | "text";

const CHAT_MESSAGE_SELECTOR = "#chat .mes[mesid]";
const MESSAGE_TEMPLATE_SELECTOR = "#message_template > .mes";
const NATIVE_MESSAGE_ACTION_SELECTORS: Record<NativeMessageAction, string> = {
	copy: ".mes_copy",
	hide: ".mes_hide",
	unhide: ".mes_unhide",
};
const LEGACY_MESSAGE_ACTION_HOST_CLASSES = [
	"astra-mesActions__left",
	"astra-mesActions__leftDefault",
	"astra-mesActions__revisionHost",
	"astra-mesActions__historyHost",
	"astra-mesActions__moreHost",
	"astra-mesActions__right",
	"astra-mesActions__rightDefault",
	"astra-mesActions__swipeHost",
	"astra-messageActions__left",
	"astra-messageActions__leftDefault",
	"astra-messageActions__revisionHost",
	"astra-messageActions__historyHost",
	"astra-messageActions__moreHost",
	"astra-messageActions__right",
	"astra-messageActions__rightDefault",
	"astra-messageActions__swipeHost",
] as const;

function resolveMessageId(messageElement: Element | null): number | null {
	const messageId = Number(messageElement?.getAttribute("mesid"));
	return Number.isInteger(messageId) ? messageId : null;
}

export function resolveMessageElement(
	documentRef: Document,
	messageId: number,
): Element | null {
	for (const messageElement of Array.from(
		documentRef.querySelectorAll(CHAT_MESSAGE_SELECTOR),
	)) {
		if (resolveMessageId(messageElement) === messageId) {
			return messageElement;
		}
	}

	return null;
}

export function resolveLoadedMessageElements(
	documentRef: Document,
): LoadedMessageElement[] {
	const seenMessageIds = new Set<number>();
	const messageElements: LoadedMessageElement[] = [];

	for (const messageElement of Array.from(
		documentRef.querySelectorAll(CHAT_MESSAGE_SELECTOR),
	)) {
		const messageId = resolveMessageId(messageElement);
		if (messageId === null || seenMessageIds.has(messageId)) {
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

export function resolveMessageTemplateElement(
	documentRef: Document,
): Element | null {
	return documentRef.querySelector(MESSAGE_TEMPLATE_SELECTOR);
}

export function resolveMessageMetadataElements(
	messageElement: Element,
): MessageMetadataElements {
	const avatarImage = messageElement.querySelector(
		".mesAvatarWrapper img, .mes_avatar img, .avatar img",
	);

	return {
		avatarImage:
			avatarImage instanceof HTMLImageElement ? avatarImage : null,
		displayId: messageElement.querySelector(".mesIDDisplay"),
		generationTime: messageElement.querySelector(".mes_timer"),
		name: messageElement.querySelector(".ch_name"),
		nameText: messageElement.querySelector(".name_text"),
		timestamp: messageElement.querySelector(".timestamp"),
		timestampIcon: messageElement.querySelector(".timestamp-icon"),
		tokenCount: messageElement.querySelector(".tokenCounterDisplay"),
	};
}

export function resolveMessageSenderNameText(messageElement: Element): string {
	const { name, nameText } = resolveMessageMetadataElements(messageElement);
	const directNameText = nameText?.textContent?.trim() ?? "";
	if (directNameText) {
		return directNameText;
	}
	if (!name) {
		return "";
	}

	const clone = name.cloneNode(true);
	if (!(clone instanceof Element)) {
		return "";
	}

	clone
		.querySelectorAll(
			".astra-mesModel, .timestamp, .timestamp-icon, .mes_buttons",
		)
		.forEach((element) => element.remove());
	return clone.textContent?.trim() ?? "";
}

export function resolveDirectMessageBlockElement(
	messageElement: Element,
): HTMLDivElement | null {
	for (const child of Array.from(messageElement.children)) {
		if (
			child instanceof HTMLDivElement &&
			child.classList.contains("mes_block")
		) {
			return child;
		}
	}

	return null;
}

export function resolveMessageNameTextParentElement(
	messageElement: Element,
): HTMLElement | null {
	const parent =
		resolveMessageMetadataElements(messageElement).nameText?.parentElement;
	return parent instanceof HTMLElement ? parent : null;
}

export function resolveRenderedMessageTextElement(
	messageElement: Element | null,
): Element | null {
	return (
		messageElement?.querySelector(".mes_block .mes_text") ??
		messageElement?.querySelector(".mes_text") ??
		null
	);
}

export function resolveNativeExtraMessageActionsRoot(
	messageElement: Element | null,
): HTMLElement | null {
	const root = messageElement?.querySelector(".extraMesButtons");
	return root instanceof HTMLElement ? root : null;
}

export function resolveNativeMessageActionElement({
	action,
	documentRef,
	messageId,
}: {
	action: NativeMessageAction;
	documentRef: Document;
	messageId: number;
}): HTMLElement | null {
	const actionElement = resolveMessageElement(
		documentRef,
		messageId,
	)?.querySelector(NATIVE_MESSAGE_ACTION_SELECTORS[action]);

	return actionElement instanceof HTMLElement ? actionElement : null;
}

export function resolveNativePromptVisibilityState(
	element: Element | null,
): NativePromptVisibilityState | null {
	if (element?.classList.contains("mes_hide")) {
		return "excluded";
	}
	if (element?.classList.contains("mes_unhide")) {
		return "included";
	}

	return null;
}

export function resolveMessageTextGestureTarget(
	eventTarget: EventTarget | null,
	kind: MessageTextGestureKind,
): MessageTextGestureTarget | null {
	if (!(eventTarget instanceof Element)) {
		return null;
	}

	const messagePartSelector =
		kind === "editable" ? ".mes_text, .mes_reasoning" : ".mes_text";
	const messagePart = eventTarget.closest(messagePartSelector);
	if (!(messagePart instanceof HTMLElement)) {
		return null;
	}

	const messageElement = messagePart.closest(CHAT_MESSAGE_SELECTOR);
	const messageId = resolveMessageId(messageElement);
	if (!messageElement || messageId === null) {
		return null;
	}

	return {
		messageElement,
		messageId,
		messagePart,
	};
}

export function hasNativeMessageEditTextarea(documentRef: Document): boolean {
	return Boolean(
		documentRef.querySelector(".edit_textarea, .reasoning_edit_textarea"),
	);
}

export function resolveLegacyMessageActionHosts(
	documentRef: Document,
): HTMLElement[] {
	const scopes = ["#chat", "#message_template"];
	const selector = scopes
		.flatMap((scope) =>
			LEGACY_MESSAGE_ACTION_HOST_CLASSES.map(
				(className) => `${scope} .${className}`,
			),
		)
		.join(", ");

	return Array.from(documentRef.querySelectorAll(selector)).filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
	);
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
