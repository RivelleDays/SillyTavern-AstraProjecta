export const NATIVE_POPUP_ACTIVE_ATTRIBUTE =
	"data-astra-projecta-native-popup-active";

const NATIVE_DIALOG_POPUP_SELECTOR =
	"dialog.popup[open], dialog.popup[opening]";
const LEGACY_POPUP_IDS = [
	"shadow_popup",
	"bulk_tag_shadow_popup",
	"shadow_select_chat_popup",
];
const POPUP_OBSERVER_CONFIG: MutationObserverInit = {
	attributeFilter: ["class", "style", "open", "opening"],
	attributes: true,
	childList: true,
	subtree: true,
};

export interface MobileNativePopupBridge {
	dispose(): void;
	mount(): void;
	unmount(): void;
}

function setNativePopupActiveContract(documentRef: Document, active: boolean) {
	const targets = [documentRef.documentElement, documentRef.body].filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
	);

	for (const target of targets) {
		if (active) {
			target.setAttribute(NATIVE_POPUP_ACTIVE_ATTRIBUTE, "true");
			continue;
		}

		target.removeAttribute(NATIVE_POPUP_ACTIVE_ATTRIBUTE);
	}
}

function isElementVisible(element: Element | null): boolean {
	if (!(element instanceof HTMLElement)) {
		return false;
	}

	if (element.hidden) {
		return false;
	}

	const view = element.ownerDocument.defaultView;
	const style =
		typeof view?.getComputedStyle === "function"
			? view.getComputedStyle(element)
			: null;

	if (style?.display === "none" || style?.visibility === "hidden") {
		return false;
	}

	return true;
}

function isNativePopupActive(documentRef: Document): boolean {
	if (documentRef.querySelector(NATIVE_DIALOG_POPUP_SELECTOR)) {
		return true;
	}

	return LEGACY_POPUP_IDS.some((id) =>
		isElementVisible(documentRef.getElementById(id)),
	);
}

export function createMobileNativePopupBridge({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): MobileNativePopupBridge {
	let mounted = false;
	let observer: MutationObserver | null = null;

	const syncNow = () => {
		if (!mounted) {
			return;
		}

		setNativePopupActiveContract(
			documentRef,
			isNativePopupActive(documentRef),
		);
	};

	function mount() {
		if (mounted) {
			return;
		}

		mounted = true;

		const MutationObserverConstructor =
			documentRef.defaultView?.MutationObserver ??
			globalThis.MutationObserver;
		const root = documentRef.documentElement ?? documentRef.body;

		if (root && typeof MutationObserverConstructor === "function") {
			observer = new MutationObserverConstructor(syncNow);
			observer.observe(root, POPUP_OBSERVER_CONFIG);
		}

		documentRef.addEventListener("close", syncNow, true);
		documentRef.addEventListener("cancel", syncNow, true);
		syncNow();
	}

	function unmount() {
		if (!mounted) {
			setNativePopupActiveContract(documentRef, false);
			return;
		}

		mounted = false;
		observer?.disconnect();
		observer = null;
		documentRef.removeEventListener("close", syncNow, true);
		documentRef.removeEventListener("cancel", syncNow, true);
		setNativePopupActiveContract(documentRef, false);
	}

	return {
		dispose() {
			unmount();
		},
		mount,
		unmount,
	};
}
