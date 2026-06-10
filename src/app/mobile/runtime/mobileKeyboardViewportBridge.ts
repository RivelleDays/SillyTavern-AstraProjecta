export const MOBILE_KEYBOARD_ATTRIBUTE = "data-astra-mobile-keyboard";
export const MOBILE_KEYBOARD_OPEN_ATTRIBUTE_VALUE = "open";
export const MOBILE_VISUAL_VIEWPORT_BOTTOM_VAR =
	"--astra-mobile-visual-viewport-bottom";
export const MOBILE_SAFE_BOTTOM_EFFECTIVE_VAR =
	"--astra-mobile-safe-bottom-effective";

const KEYBOARD_VIEWPORT_SHRINK_THRESHOLD_PX = 120;
const TEXT_ENTRY_INPUT_TYPES = new Set([
	"",
	"date",
	"datetime-local",
	"email",
	"month",
	"number",
	"password",
	"search",
	"tel",
	"text",
	"time",
	"url",
	"week",
]);

export interface MobileKeyboardViewportBridge {
	dispose(): void;
	mount(): void;
	unmount(): void;
}

interface VisualViewportLike extends EventTarget {
	height: number;
	offsetTop: number;
}

export interface MobileKeyboardViewportBridgeWindowLike {
	addEventListener?: Window["addEventListener"];
	cancelAnimationFrame?: Window["cancelAnimationFrame"];
	innerHeight?: number;
	removeEventListener?: Window["removeEventListener"];
	requestAnimationFrame?: Window["requestAnimationFrame"];
	visualViewport?: VisualViewportLike | null;
}

function formatCssPixelValue(value: number): string {
	return `${Math.round(Math.max(0, value) * 100) / 100}px`;
}

function isTextEntryElement(element: Element | null): boolean {
	if (!(element instanceof HTMLElement)) {
		return false;
	}

	if (element instanceof HTMLTextAreaElement) {
		return !element.disabled && !element.readOnly;
	}

	if (element instanceof HTMLInputElement) {
		const type = (element.getAttribute("type") ?? "text").toLowerCase();
		return (
			TEXT_ENTRY_INPUT_TYPES.has(type) &&
			!element.disabled &&
			!element.readOnly
		);
	}

	return element.isContentEditable;
}

function clearKeyboardViewportContract(body: HTMLElement) {
	body.removeAttribute(MOBILE_KEYBOARD_ATTRIBUTE);
	body.style.removeProperty(MOBILE_VISUAL_VIEWPORT_BOTTOM_VAR);
	body.style.removeProperty(MOBILE_SAFE_BOTTOM_EFFECTIVE_VAR);
}

export function createMobileKeyboardViewportBridge({
	documentRef = document,
	windowRef = window,
}: {
	documentRef?: Document;
	windowRef?: MobileKeyboardViewportBridgeWindowLike;
} = {}): MobileKeyboardViewportBridge {
	let mounted = false;
	let observedVisualViewport: VisualViewportLike | null = null;
	let animationFrameHandle: number | null = null;
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

	const cancelScheduledSync = () => {
		if (animationFrameHandle !== null) {
			windowRef.cancelAnimationFrame?.(animationFrameHandle);
			animationFrameHandle = null;
		}

		if (timeoutHandle !== null) {
			clearTimeout(timeoutHandle);
			timeoutHandle = null;
		}
	};

	const syncNow = () => {
		const body = documentRef.body;
		if (!(body instanceof HTMLElement)) {
			return;
		}

		const visualViewport = windowRef.visualViewport;
		if (!visualViewport) {
			clearKeyboardViewportContract(body);
			return;
		}

		const innerHeight =
			typeof windowRef.innerHeight === "number"
				? windowRef.innerHeight
				: visualViewport.height;
		const viewportShrink = innerHeight - visualViewport.height;
		const hasTextEntryFocus = isTextEntryElement(documentRef.activeElement);

		if (
			!hasTextEntryFocus ||
			viewportShrink < KEYBOARD_VIEWPORT_SHRINK_THRESHOLD_PX
		) {
			clearKeyboardViewportContract(body);
			return;
		}

		body.setAttribute(
			MOBILE_KEYBOARD_ATTRIBUTE,
			MOBILE_KEYBOARD_OPEN_ATTRIBUTE_VALUE,
		);
		body.style.setProperty(
			MOBILE_VISUAL_VIEWPORT_BOTTOM_VAR,
			formatCssPixelValue(
				visualViewport.height + visualViewport.offsetTop,
			),
		);
		body.style.setProperty(MOBILE_SAFE_BOTTOM_EFFECTIVE_VAR, "0px");
	};

	const runScheduledSync = () => {
		animationFrameHandle = null;
		timeoutHandle = null;
		syncNow();
	};

	const scheduleSync = () => {
		if (
			!mounted ||
			animationFrameHandle !== null ||
			timeoutHandle !== null
		) {
			return;
		}

		if (typeof windowRef.requestAnimationFrame === "function") {
			animationFrameHandle =
				windowRef.requestAnimationFrame(runScheduledSync);
			return;
		}

		timeoutHandle = setTimeout(runScheduledSync, 0);
	};

	const handleViewportChange = () => {
		scheduleSync();
	};

	function mount() {
		if (mounted) {
			return;
		}

		mounted = true;
		observedVisualViewport = windowRef.visualViewport ?? null;
		observedVisualViewport?.addEventListener(
			"resize",
			handleViewportChange,
		);
		observedVisualViewport?.addEventListener(
			"scroll",
			handleViewportChange,
		);
		windowRef.addEventListener?.("resize", handleViewportChange);
		documentRef.addEventListener("focusin", handleViewportChange, true);
		documentRef.addEventListener("focusout", handleViewportChange, true);
		syncNow();
	}

	function unmount() {
		if (!mounted) {
			return;
		}

		mounted = false;
		cancelScheduledSync();
		observedVisualViewport?.removeEventListener(
			"resize",
			handleViewportChange,
		);
		observedVisualViewport?.removeEventListener(
			"scroll",
			handleViewportChange,
		);
		observedVisualViewport = null;
		windowRef.removeEventListener?.("resize", handleViewportChange);
		documentRef.removeEventListener("focusin", handleViewportChange, true);
		documentRef.removeEventListener("focusout", handleViewportChange, true);

		const body = documentRef.body;
		if (body instanceof HTMLElement) {
			clearKeyboardViewportContract(body);
		}
	}

	return {
		dispose() {
			unmount();
		},
		mount,
		unmount,
	};
}
