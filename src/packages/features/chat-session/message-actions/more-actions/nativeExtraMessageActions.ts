export interface NativeExtraMessageAction {
	description?: string;
	element: HTMLElement;
	iconClassName?: string;
	id: string;
	label: string;
	messageId: number;
}

function asNormalizedText(value: string | null | undefined): string {
	return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function isNativeActionHiddenOrDisabled(element: HTMLElement): boolean {
	if (!element.isConnected) {
		return true;
	}

	if (
		element.classList.contains("displayNone") ||
		element.classList.contains("disabled") ||
		element.hasAttribute("hidden")
	) {
		return true;
	}

	if (element.getAttribute("aria-disabled") === "true") {
		return true;
	}

	if (
		element.hasAttribute("disabled") ||
		("disabled" in element && element.disabled === true)
	) {
		return true;
	}

	const view = element.ownerDocument.defaultView;
	if (typeof view?.getComputedStyle === "function") {
		const style = view.getComputedStyle(element);
		if (style.display === "none" || style.visibility === "hidden") {
			return true;
		}
	}

	if (element.style.display === "none" || element.style.visibility === "hidden") {
		return true;
	}

	return false;
}

function resolveIconClassName(element: HTMLElement): string | undefined {
	const iconClasses = Array.from(element.classList).filter(
		(className) => className === "fa" || className.startsWith("fa-"),
	);

	return iconClasses.length ? iconClasses.join(" ") : undefined;
}

function resolveLabel(element: HTMLElement): string {
	return (
		asNormalizedText(element.getAttribute("aria-label")) ||
		asNormalizedText(element.getAttribute("title")) ||
		asNormalizedText(element.textContent)
	);
}

function resolveDescription(element: HTMLElement, label: string): string | undefined {
	const text = asNormalizedText(element.textContent);
	if (text && text !== label) {
		return text;
	}

	const title = asNormalizedText(element.getAttribute("title"));
	if (title && title !== label) {
		return title;
	}

	return undefined;
}

function resolveMessageElement(
	documentRef: Document,
	messageId: number,
): Element | null {
	return documentRef.querySelector(`#chat .mes[mesid="${messageId}"]`);
}

function dispatchNativePointerUp({
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

function dispatchNativeClick({
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

export function resolveNativeExtraMessageActions({
	documentRef = document,
	messageId,
}: {
	documentRef?: Document;
	messageId: number;
}): NativeExtraMessageAction[] {
	const messageElement = resolveMessageElement(documentRef, messageId);
	const extraButtons = messageElement?.querySelector(".extraMesButtons");
	if (!(extraButtons instanceof HTMLElement)) {
		return [];
	}

	return Array.from(extraButtons.children).flatMap((child, index) => {
		if (!(child instanceof HTMLElement) || isNativeActionHiddenOrDisabled(child)) {
			return [];
		}

		const label = resolveLabel(child);
		if (!label) {
			return [];
		}

		return [
			{
				description: resolveDescription(child, label),
				element: child,
				iconClassName: resolveIconClassName(child),
				id: `${messageId}:${index}:${label}`,
				label,
				messageId,
			},
		];
	});
}

export function triggerNativeExtraMessageAction({
	action,
	documentRef = document,
}: {
	action: NativeExtraMessageAction;
	documentRef?: Document;
}): boolean {
	if (!(action.element instanceof HTMLElement) || !action.element.isConnected) {
		return false;
	}

	dispatchNativePointerUp({
		documentRef,
		element: action.element,
	});
	dispatchNativeClick({
		documentRef,
		element: action.element,
	});
	return true;
}
