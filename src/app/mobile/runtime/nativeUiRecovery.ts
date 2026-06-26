import {
	ASTRA_CHAT_SESSION_SHELL_ID,
	ASTRA_CHAT_TOP_BAR_HOST_ID,
} from "@/app/mobile/top-bar/contracts/dom";
import {
	ASTRA_CHAT_COMPOSER_HOST_ID,
	ASTRA_CHAT_COMPOSER_SHELL_ID,
	NATIVE_FORM_SHELD_ID,
	NATIVE_SEND_FORM_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";

const NATIVE_SHELD_ID = "sheld";

function moveElementBeforeRemovedShell({
	element,
	shell,
}: {
	element: Element | null;
	shell: HTMLElement;
}): void {
	if (!element) {
		shell.remove();
		return;
	}

	const parent = shell.parentNode ?? shell.ownerDocument.body;
	parent?.insertBefore(element, shell);
	shell.remove();
}

export function restoreMobileNativeUi(documentRef: Document): void {
	const chatSessionShell = documentRef.getElementById(
		ASTRA_CHAT_SESSION_SHELL_ID,
	);
	if (chatSessionShell instanceof HTMLElement) {
		moveElementBeforeRemovedShell({
			element: chatSessionShell.querySelector(`#${NATIVE_SHELD_ID}`),
			shell: chatSessionShell,
		});
	}

	const composerShell = documentRef.getElementById(
		ASTRA_CHAT_COMPOSER_SHELL_ID,
	);
	if (composerShell instanceof HTMLElement) {
		moveElementBeforeRemovedShell({
			element: composerShell.querySelector(`#${NATIVE_FORM_SHELD_ID}`),
			shell: composerShell,
		});
	}

	documentRef.getElementById(ASTRA_CHAT_TOP_BAR_HOST_ID)?.remove();
	documentRef.getElementById(ASTRA_CHAT_COMPOSER_HOST_ID)?.remove();

	const sendForm = documentRef.getElementById(NATIVE_SEND_FORM_ID);
	if (sendForm instanceof HTMLElement) {
		sendForm.style.removeProperty("display");
	}

	documentRef.documentElement.removeAttribute(
		"data-astra-projecta-native-popup-active",
	);
	documentRef.body?.removeAttribute(
		"data-astra-projecta-native-popup-active",
	);
	documentRef.body?.removeAttribute("data-astra-mobile-keyboard");
	documentRef.body?.style.removeProperty(
		"--astra-mobile-visual-viewport-bottom",
	);
	documentRef.body?.style.removeProperty(
		"--astra-mobile-safe-bottom-effective",
	);
}
