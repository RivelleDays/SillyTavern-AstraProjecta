import {
	hasNativeMessageEditTextarea,
	resolveMessageTextGestureTarget,
} from "@/packages/features/chat-session/message-actions/contracts/dom";

const MESSAGE_TEXT_LONG_PRESS_DURATION_MS = 240;
const MESSAGE_TEXT_LONG_PRESS_MOVE_THRESHOLD_PX = 12;
const MESSAGE_TEXT_SUPPRESS_ACTIVATION_MS = 500;

interface MessageTextLongPressState {
	clientX: number;
	clientY: number;
	messageElement: Element;
	messageId: number;
	pointerId: number;
	timerId: number;
}

export interface MessageTextGestureController {
	attach(): void;
	detach(): void;
}

export function createMessageTextGestureController({
	documentRef = document,
	isClickToEditEnabled,
	onOpenEdit,
	onOpenMore,
}: {
	documentRef?: Document;
	isClickToEditEnabled(): boolean;
	onOpenEdit(messageId: number): void;
	onOpenMore(messageId: number): void;
}): MessageTextGestureController {
	let messageTextLongPress: MessageTextLongPressState | null = null;
	let suppressMessageTextActivationTimeoutId: number | null = null;
	let shouldSuppressMessageTextActivation = false;
	let isAttached = false;

	function setFeatureTimeout(callback: () => void, delay: number): number {
		const view = documentRef.defaultView;
		return typeof view?.setTimeout === "function"
			? view.setTimeout(callback, delay)
			: window.setTimeout(callback, delay);
	}

	function clearFeatureTimeout(timerId: number) {
		const view = documentRef.defaultView;
		if (typeof view?.clearTimeout === "function") {
			view.clearTimeout(timerId);
			return;
		}

		window.clearTimeout(timerId);
	}

	function clearSuppressMessageTextActivationTimeout() {
		if (suppressMessageTextActivationTimeoutId === null) {
			return;
		}

		clearFeatureTimeout(suppressMessageTextActivationTimeoutId);
		suppressMessageTextActivationTimeoutId = null;
	}

	function clearMessageTextLongPress() {
		if (!messageTextLongPress) {
			return;
		}

		clearFeatureTimeout(messageTextLongPress.timerId);
		messageTextLongPress = null;
	}

	function suppressUpcomingMessageTextActivation() {
		shouldSuppressMessageTextActivation = true;
		clearSuppressMessageTextActivationTimeout();

		const clearSuppression = () => {
			shouldSuppressMessageTextActivation = false;
			suppressMessageTextActivationTimeoutId = null;
		};

		suppressMessageTextActivationTimeoutId = setFeatureTimeout(
			clearSuppression,
			MESSAGE_TEXT_SUPPRESS_ACTIVATION_MS,
		);
	}

	function resolveLongPressMessageTextTarget(
		eventTarget: EventTarget | null,
	): {
		messageElement: Element;
		messageId: number;
		messageText: HTMLElement;
	} | null {
		const target = resolveMessageTextGestureTarget(eventTarget, "text");
		if (!target) {
			return null;
		}

		return {
			messageElement: target.messageElement,
			messageId: target.messageId,
			messageText: target.messagePart,
		};
	}

	function resolveClickToEditTarget(eventTarget: EventTarget | null): {
		messageElement: Element;
		messageId: number;
	} | null {
		const target = resolveMessageTextGestureTarget(eventTarget, "editable");
		if (!target) {
			return null;
		}

		return {
			messageElement: target.messageElement,
			messageId: target.messageId,
		};
	}

	function hasActiveTextSelection(): boolean {
		const selection = documentRef.defaultView?.getSelection?.();
		return Boolean(selection?.toString());
	}

	function hasNativeEditTextarea(): boolean {
		return hasNativeMessageEditTextarea(documentRef);
	}

	function stopNativeMessageTextActivation(event: Event) {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	function maybeHandleClickToEdit(event: Event) {
		if (event.type !== "click" || !isClickToEditEnabled()) {
			return;
		}

		const target = resolveClickToEditTarget(event.target);
		if (!target || hasActiveTextSelection() || hasNativeEditTextarea()) {
			return;
		}

		stopNativeMessageTextActivation(event);
		onOpenEdit(target.messageId);
	}

	function handleMessageTextPointerDown(event: PointerEvent) {
		const target = resolveLongPressMessageTextTarget(event.target);
		if (!target) {
			return;
		}

		clearMessageTextLongPress();

		const timerId = setFeatureTimeout(() => {
			if (
				!messageTextLongPress ||
				!target.messageText.isConnected ||
				!target.messageElement.isConnected
			) {
				clearMessageTextLongPress();
				return;
			}

			const messageId = messageTextLongPress.messageId;
			messageTextLongPress = null;
			suppressUpcomingMessageTextActivation();
			onOpenMore(messageId);
		}, MESSAGE_TEXT_LONG_PRESS_DURATION_MS);

		messageTextLongPress = {
			clientX: event.clientX,
			clientY: event.clientY,
			messageElement: target.messageElement,
			messageId: target.messageId,
			pointerId: event.pointerId,
			timerId,
		};
	}

	function handleMessageTextPointerMove(event: PointerEvent) {
		if (
			!messageTextLongPress ||
			event.pointerId !== messageTextLongPress.pointerId
		) {
			return;
		}

		const movedDistance = Math.hypot(
			event.clientX - messageTextLongPress.clientX,
			event.clientY - messageTextLongPress.clientY,
		);
		if (movedDistance > MESSAGE_TEXT_LONG_PRESS_MOVE_THRESHOLD_PX) {
			clearMessageTextLongPress();
		}
	}

	function handleMessageTextPointerEnd(event: PointerEvent) {
		if (
			!messageTextLongPress ||
			event.pointerId !== messageTextLongPress.pointerId
		) {
			return;
		}

		clearMessageTextLongPress();
	}

	function handleMessageTextSuppressedActivation(event: Event) {
		if (!shouldSuppressMessageTextActivation) {
			maybeHandleClickToEdit(event);
			return;
		}

		if (!resolveLongPressMessageTextTarget(event.target)) {
			maybeHandleClickToEdit(event);
			return;
		}

		stopNativeMessageTextActivation(event);
		if (event.type === "click") {
			shouldSuppressMessageTextActivation = false;
			clearSuppressMessageTextActivationTimeout();
		}
	}

	function attach() {
		if (isAttached) {
			return;
		}

		documentRef.addEventListener(
			"pointerdown",
			handleMessageTextPointerDown,
		);
		documentRef.addEventListener(
			"pointermove",
			handleMessageTextPointerMove,
		);
		documentRef.addEventListener("pointerup", handleMessageTextPointerEnd);
		documentRef.addEventListener(
			"pointercancel",
			handleMessageTextPointerEnd,
		);
		documentRef.addEventListener(
			"click",
			handleMessageTextSuppressedActivation,
			true,
		);
		documentRef.addEventListener(
			"contextmenu",
			handleMessageTextSuppressedActivation,
			true,
		);
		isAttached = true;
	}

	function detach() {
		if (!isAttached) {
			return;
		}

		documentRef.removeEventListener(
			"pointerdown",
			handleMessageTextPointerDown,
		);
		documentRef.removeEventListener(
			"pointermove",
			handleMessageTextPointerMove,
		);
		documentRef.removeEventListener(
			"pointerup",
			handleMessageTextPointerEnd,
		);
		documentRef.removeEventListener(
			"pointercancel",
			handleMessageTextPointerEnd,
		);
		documentRef.removeEventListener(
			"click",
			handleMessageTextSuppressedActivation,
			true,
		);
		documentRef.removeEventListener(
			"contextmenu",
			handleMessageTextSuppressedActivation,
			true,
		);
		clearMessageTextLongPress();
		shouldSuppressMessageTextActivation = false;
		clearSuppressMessageTextActivationTimeout();
		isAttached = false;
	}

	return {
		attach,
		detach,
	};
}
