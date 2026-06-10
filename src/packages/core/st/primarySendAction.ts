import { translateAstra } from "@/packages/core/i18n";
import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	queueMicrotaskSafe,
	resolveEventTypes,
} from "@/packages/core/st/shared";
import type { I18nKey } from "@/types/i18n";

type Listener = () => void;

type StContextLike = Record<string, unknown> & {
	chat?: unknown[];
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	groupId?: unknown;
	onlineStatus?: unknown;
	powerUserSettings?: unknown;
};

export type PrimarySendActionKind = "continue" | "send" | "stop";

export interface PrimarySendActionSnapshot {
	disabled: boolean;
	kind: PrimarySendActionKind;
	label: string;
	updatedAt: number;
	visible: boolean;
}

export interface PrimarySendActionStore {
	dispose(): void;
	getSnapshot(): PrimarySendActionSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
	trigger(): boolean;
}

const CONTINUE_OPTION_ID = "option_continue";
const OPTIONS_ROOT_ID = "options";
const SEND_BUTTON_ID = "send_but";
const STOP_BUTTON_ID = "mes_stop";
const SEND_TEXTAREA_ID = "send_textarea";
const FILE_INPUT_ID = "file_form_input";
const RIGHT_SEND_FORM_ID = "rightSendForm";
const CONTINUE_ACTION_LABEL_KEY = "sendForm.primaryAction.continue";
const SEND_ACTION_LABEL_KEY = "sendForm.primaryAction.send";
const STOP_ACTION_LABEL_KEY = "sendForm.primaryAction.stop";
const RELEVANT_BODY_TARGET_SELECTOR = [
	`#${RIGHT_SEND_FORM_ID}`,
	`#${SEND_TEXTAREA_ID}`,
	`#${FILE_INPUT_ID}`,
	`#${CONTINUE_OPTION_ID}`,
].join(", ");

function resolveContextSafe(): StContextLike | null {
	try {
		return getStContext() as StContextLike;
	} catch {
		return null;
	}
}

function readNativeActionLabel(
	element: HTMLElement | null,
	fallbackKey: I18nKey,
): string {
	if (!(element instanceof HTMLElement)) {
		return translateAstra(fallbackKey);
	}

	const ariaLabel = element.getAttribute("aria-label")?.trim();
	if (ariaLabel) {
		return ariaLabel;
	}

	const title = element.getAttribute("title")?.trim();
	if (title) {
		return title;
	}

	return translateAstra(fallbackKey);
}

function isElementVisible(element: HTMLElement | null): boolean {
	if (!(element instanceof HTMLElement) || !element.isConnected) {
		return false;
	}

	if (
		element.classList.contains("displayNone") ||
		element.hasAttribute("hidden")
	) {
		return false;
	}

	const view = element.ownerDocument.defaultView ?? window;
	const style = view.getComputedStyle(element);
	return style.display !== "none" && style.visibility !== "hidden";
}

function readIsDisabled(element: HTMLElement | null): boolean {
	if (!(element instanceof HTMLElement)) {
		return true;
	}

	return (
		element.hasAttribute("disabled") ||
		element.getAttribute("aria-disabled") === "true" ||
		element.classList.contains("disabled")
	);
}

function hasConnectedStatus(context: StContextLike | null): boolean {
	if (typeof context?.onlineStatus !== "string") {
		return false;
	}

	const normalizedStatus = context.onlineStatus.trim().toLowerCase();
	return normalizedStatus !== "" && normalizedStatus !== "no_connection";
}

function isSendActionAvailable(
	context: StContextLike | null,
	sendButton: HTMLElement | null,
): boolean {
	if (!(sendButton instanceof HTMLElement)) {
		return false;
	}

	return isElementVisible(sendButton) || hasConnectedStatus(context);
}

function hasPendingFileAttachment(documentRef: Document): boolean {
	const fileInput = documentRef.getElementById(FILE_INPUT_ID);
	return (
		fileInput instanceof HTMLInputElement &&
		fileInput.files != null &&
		fileInput.files.length > 0
	);
}

function readNativeElement(
	documentRef: Document,
	elementId: string,
): HTMLElement | null {
	const element = documentRef.getElementById(elementId);
	return element instanceof HTMLElement ? element : null;
}

function resolveContinueOption(documentRef: Document): HTMLElement | null {
	return readNativeElement(documentRef, CONTINUE_OPTION_ID);
}

function shouldUseContinueAction(
	context: StContextLike | null,
	documentRef: Document,
): boolean {
	if (
		!context ||
		!isRecord(context.powerUserSettings) ||
		context.powerUserSettings.continue_on_send !== true
	) {
		return false;
	}

	if (context.groupId != null) {
		return false;
	}

	const textarea = documentRef.getElementById(SEND_TEXTAREA_ID);
	if (!(textarea instanceof HTMLTextAreaElement) || textarea.value !== "") {
		return false;
	}

	if (hasPendingFileAttachment(documentRef)) {
		return false;
	}

	const chat = Array.isArray(context.chat) ? context.chat : [];
	if (chat.length === 0) {
		return false;
	}

	const lastMessage = chat.at(-1);
	if (!isRecord(lastMessage)) {
		return false;
	}

	return !lastMessage.is_user && !lastMessage.is_system;
}

function createSnapshot({
	disabled,
	kind,
	label,
	visible,
}: Omit<PrimarySendActionSnapshot, "updatedAt">): PrimarySendActionSnapshot {
	return {
		disabled,
		kind,
		label,
		updatedAt: Date.now(),
		visible,
	};
}

function createHiddenSendSnapshot(
	sendButton: HTMLElement | null,
): PrimarySendActionSnapshot {
	return createSnapshot({
		disabled: true,
		kind: "send",
		label: readNativeActionLabel(sendButton, SEND_ACTION_LABEL_KEY),
		visible: false,
	});
}

function nodeContainsRelevantTarget(node: Node): boolean {
	if (!(node instanceof Element)) {
		return false;
	}

	if (node.matches(RELEVANT_BODY_TARGET_SELECTOR)) {
		return true;
	}

	return node.querySelector(RELEVANT_BODY_TARGET_SELECTOR) != null;
}

function shouldRefreshForBodyMutations(mutations: MutationRecord[]): boolean {
	return mutations.some((mutation) => {
		if (mutation.type === "attributes") {
			return (
				mutation.attributeName === "data-generating" ||
				mutation.attributeName === "data-swiping"
			);
		}

		if (mutation.type !== "childList") {
			return false;
		}

		for (const node of mutation.addedNodes) {
			if (nodeContainsRelevantTarget(node)) {
				return true;
			}
		}

		for (const node of mutation.removedNodes) {
			if (nodeContainsRelevantTarget(node)) {
				return true;
			}
		}

		return false;
	});
}

function snapshotsEqual(
	a: PrimarySendActionSnapshot,
	b: PrimarySendActionSnapshot,
): boolean {
	return (
		a.disabled === b.disabled &&
		a.kind === b.kind &&
		a.label === b.label &&
		a.visible === b.visible
	);
}

function resolvePrimarySendActionTarget(
	snapshot: PrimarySendActionSnapshot,
	documentRef: Document,
): HTMLElement | null {
	switch (snapshot.kind) {
		case "continue":
			return resolveContinueOption(documentRef);
		case "stop":
			return readNativeElement(documentRef, STOP_BUTTON_ID);
		default:
			return readNativeElement(documentRef, SEND_BUTTON_ID);
	}
}

export function readPrimarySendActionSnapshot({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): PrimarySendActionSnapshot {
	const context = resolveContextSafe();
	const sendButton = readNativeElement(documentRef, SEND_BUTTON_ID);
	const stopButton = readNativeElement(documentRef, STOP_BUTTON_ID);
	const continueOption = resolveContinueOption(documentRef);
	const body = documentRef.body;
	const isGenerating = body?.dataset.generating === "true";
	const isSwiping = body?.dataset.swiping === "true";

	if (
		stopButton instanceof HTMLElement &&
		(isElementVisible(stopButton) || isGenerating || isSwiping)
	) {
		return createSnapshot({
			disabled: readIsDisabled(stopButton),
			kind: "stop",
			label: readNativeActionLabel(stopButton, STOP_ACTION_LABEL_KEY),
			visible: true,
		});
	}

	if (!isSendActionAvailable(context, sendButton)) {
		return createHiddenSendSnapshot(
			sendButton instanceof HTMLElement ? sendButton : null,
		);
	}

	if (continueOption && shouldUseContinueAction(context, documentRef)) {
		return createSnapshot({
			disabled: readIsDisabled(sendButton),
			kind: "continue",
			label: readNativeActionLabel(
				continueOption,
				CONTINUE_ACTION_LABEL_KEY,
			),
			visible: true,
		});
	}

	return createSnapshot({
		disabled: readIsDisabled(sendButton),
		kind: "send",
		label: readNativeActionLabel(sendButton, SEND_ACTION_LABEL_KEY),
		visible: true,
	});
}

export function createPrimarySendActionStore({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): PrimarySendActionStore {
	const initialContext = resolveContextSafe();
	const eventSource = isRecord(initialContext?.eventSource)
		? (initialContext.eventSource as EventSourceLike)
		: null;
	const eventTypes = initialContext ? resolveEventTypes(initialContext) : {};
	const listeners = new Set<Listener>();
	const eventRefreshHandler = () => {
		scheduleRefresh();
	};

	let disposed = false;
	let isRefreshQueued = false;
	let snapshot = readPrimarySendActionSnapshot({ documentRef });
	let textareaElement: HTMLTextAreaElement | null = null;
	let fileInputElement: HTMLInputElement | null = null;
	let optionsRootElement: HTMLElement | null = null;
	let optionsRootObserver: MutationObserver | null = null;
	let rightSendFormElement: HTMLElement | null = null;
	let rightSendFormObserver: MutationObserver | null = null;
	let bodyObserver: MutationObserver | null = null;
	let activeEventNames: string[] = [];

	function notifyListeners() {
		for (const listener of listeners) {
			listener();
		}
	}

	function bindInputListeners() {
		const nextTextarea = documentRef.getElementById(SEND_TEXTAREA_ID);
		const normalizedTextarea =
			nextTextarea instanceof HTMLTextAreaElement ? nextTextarea : null;
		if (textareaElement !== normalizedTextarea) {
			textareaElement?.removeEventListener("focus", eventRefreshHandler);
			textareaElement?.removeEventListener("input", eventRefreshHandler);
			textareaElement = normalizedTextarea;
			textareaElement?.addEventListener("focus", eventRefreshHandler);
			textareaElement?.addEventListener("input", eventRefreshHandler);
		}

		const nextFileInput = documentRef.getElementById(FILE_INPUT_ID);
		const normalizedFileInput =
			nextFileInput instanceof HTMLInputElement ? nextFileInput : null;
		if (fileInputElement !== normalizedFileInput) {
			fileInputElement?.removeEventListener(
				"change",
				eventRefreshHandler,
			);
			fileInputElement = normalizedFileInput;
			fileInputElement?.addEventListener("change", eventRefreshHandler);
		}
	}

	function bindRightSendFormObserver() {
		const nextRightSendForm =
			documentRef.getElementById(RIGHT_SEND_FORM_ID);
		const normalizedRightSendForm =
			nextRightSendForm instanceof HTMLElement ? nextRightSendForm : null;
		if (rightSendFormElement === normalizedRightSendForm) {
			return;
		}

		rightSendFormObserver?.disconnect();
		rightSendFormObserver = null;
		rightSendFormElement = normalizedRightSendForm;

		if (!rightSendFormElement) {
			return;
		}

		rightSendFormObserver = new MutationObserver(() => {
			scheduleRefresh();
		});

		rightSendFormObserver.observe(rightSendFormElement, {
			attributeFilter: [
				"aria-disabled",
				"aria-label",
				"class",
				"disabled",
				"hidden",
				"style",
				"title",
			],
			attributes: true,
			childList: true,
			subtree: true,
		});
	}

	function bindOptionsObserver() {
		const nextOptionsRoot = readNativeElement(documentRef, OPTIONS_ROOT_ID);
		if (optionsRootElement === nextOptionsRoot) {
			return;
		}

		optionsRootObserver?.disconnect();
		optionsRootObserver = null;
		optionsRootElement = nextOptionsRoot;

		if (!optionsRootElement) {
			return;
		}

		optionsRootObserver = new MutationObserver(() => {
			scheduleRefresh();
		});

		optionsRootObserver.observe(optionsRootElement, {
			attributeFilter: [
				"aria-label",
				"class",
				"hidden",
				"style",
				"title",
			],
			attributes: true,
			childList: true,
			subtree: true,
		});
	}

	function syncBindings() {
		bindInputListeners();
		bindOptionsObserver();
		bindRightSendFormObserver();
	}

	function refresh() {
		if (disposed) {
			return;
		}

		syncBindings();
		const nextSnapshot = readPrimarySendActionSnapshot({ documentRef });
		if (snapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
		notifyListeners();
	}

	function scheduleRefresh() {
		if (disposed || isRefreshQueued) {
			return;
		}

		isRefreshQueued = true;
		queueMicrotaskSafe(() => {
			isRefreshQueued = false;
			refresh();
		});
	}

	const body = documentRef.body;
	if (body instanceof HTMLBodyElement) {
		bodyObserver = new MutationObserver((mutations) => {
			if (!shouldRefreshForBodyMutations(mutations)) {
				return;
			}

			scheduleRefresh();
		});

		bodyObserver.observe(body, {
			attributeFilter: ["data-generating", "data-swiping"],
			attributes: true,
			childList: true,
			subtree: true,
		});
	}

	if (eventSource) {
		activeEventNames = Array.from(
			new Set(
				[
					eventTypes.APP_READY,
					eventTypes.CHAT_CHANGED,
					eventTypes.CHAT_LOADED,
					eventTypes.MESSAGE_SENT,
					eventTypes.SETTINGS_UPDATED,
					eventTypes.GENERATION_STARTED,
					eventTypes.GENERATION_STOPPED,
					eventTypes.GENERATION_ENDED,
					eventTypes.ONLINE_STATUS_CHANGED,
				].filter((eventName): eventName is string =>
					Boolean(eventName),
				),
			),
		);

		for (const eventName of activeEventNames) {
			eventSource.on(eventName, eventRefreshHandler);
		}
	}

	syncBindings();

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			textareaElement?.removeEventListener("focus", eventRefreshHandler);
			textareaElement?.removeEventListener("input", eventRefreshHandler);
			fileInputElement?.removeEventListener(
				"change",
				eventRefreshHandler,
			);
			optionsRootObserver?.disconnect();
			rightSendFormObserver?.disconnect();
			bodyObserver?.disconnect();

			if (eventSource) {
				for (const eventName of activeEventNames) {
					eventSource.removeListener(eventName, eventRefreshHandler);
				}
			}

			listeners.clear();
		},
		getSnapshot() {
			return snapshot;
		},
		refresh,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		trigger() {
			const nextSnapshot = readPrimarySendActionSnapshot({ documentRef });
			if (!nextSnapshot.visible || nextSnapshot.disabled) {
				return false;
			}

			const target = resolvePrimarySendActionTarget(
				nextSnapshot,
				documentRef,
			);
			if (!(target instanceof HTMLElement)) {
				return false;
			}

			target.click();
			return true;
		},
	};
}
