import { NATIVE_SEND_FORM_ID } from "@/packages/features/chat-session/send-form/contracts/dom";

const MENU_OPEN_KEY_SET = new Set([" ", "Enter", "Spacebar"]);

function getSendFormElement(documentRef: Document): HTMLElement | null {
	const sendForm = documentRef.getElementById(NATIVE_SEND_FORM_ID);
	return sendForm instanceof HTMLElement ? sendForm : null;
}

function isActiveElementInsideSendForm(
	documentRef: Document,
	activeElement: Element | null,
): activeElement is HTMLElement {
	if (!(activeElement instanceof HTMLElement)) {
		return false;
	}

	const sendForm = getSendFormElement(documentRef);
	if (!(sendForm instanceof HTMLElement)) {
		return false;
	}

	return sendForm.contains(activeElement);
}

export function isMenuOpenKeyboardEvent(
	event: Pick<KeyboardEvent, "key">,
): boolean {
	return MENU_OPEN_KEY_SET.has(event.key);
}

export function releaseSendFormFocus(documentRef: Document): void {
	const activeElement = documentRef.activeElement;

	if (!isActiveElementInsideSendForm(documentRef, activeElement)) {
		return;
	}

	if (typeof activeElement.blur === "function") {
		activeElement.blur();
	}

	if (
		documentRef.body instanceof HTMLBodyElement &&
		activeElement !== documentRef.body &&
		typeof documentRef.body.focus === "function"
	) {
		try {
			documentRef.body.focus({ preventScroll: true });
		} catch {
			documentRef.body.focus();
		}
	}
}
