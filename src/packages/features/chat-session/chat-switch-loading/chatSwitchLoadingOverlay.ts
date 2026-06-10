export interface ChatSwitchLoadingOverlayHandle {
	hide(): Promise<void>;
}

const CHAT_SWITCH_LOADING_ATTRIBUTE = "data-astra-projecta-chat-switch-loading";
const CHAT_SWITCH_LOADING_OVERLAY_CLASS = "astra-chat-switch-loading-overlay";
const CHAT_SWITCH_LOADING_OVERLAY_SELECTOR = `.${CHAT_SWITCH_LOADING_OVERLAY_CLASS}`;
const DEFAULT_EXIT_DURATION_MS = 180;
const NATIVE_SHELD_ID = "sheld";

function createNoopHandle(): ChatSwitchLoadingOverlayHandle {
	return {
		async hide() {
			return undefined;
		},
	};
}

function createOverlay(documentRef: Document, label: string) {
	const overlay = documentRef.createElement("div");
	overlay.className = CHAT_SWITCH_LOADING_OVERLAY_CLASS;
	overlay.dataset.state = "active";
	overlay.setAttribute("aria-label", label);
	overlay.setAttribute("aria-live", "polite");
	overlay.setAttribute("role", "status");

	const surface = documentRef.createElement("span");
	surface.className = "astra-chat-switch-loading-overlay__surface";

	const spinner = documentRef.createElement("span");
	spinner.setAttribute("aria-hidden", "true");
	spinner.className = "astra-chat-switch-loading-overlay__spinner";

	const text = documentRef.createElement("span");
	text.className = "astra-chat-switch-loading-overlay__text";
	text.textContent = label;

	surface.append(spinner, text);
	overlay.append(surface);

	return overlay;
}

function resolveExistingOverlay(hostElement: HTMLElement) {
	const overlay = hostElement.querySelector<HTMLElement>(
		CHAT_SWITCH_LOADING_OVERLAY_SELECTOR,
	);

	return overlay;
}

export function showChatSwitchLoadingOverlay({
	documentRef = document,
	exitDurationMs = DEFAULT_EXIT_DURATION_MS,
	label,
}: {
	documentRef?: Document;
	exitDurationMs?: number;
	label: string;
}): ChatSwitchLoadingOverlayHandle {
	const hostElement = documentRef.getElementById(NATIVE_SHELD_ID);
	if (!hostElement) {
		return createNoopHandle();
	}

	const overlay =
		resolveExistingOverlay(hostElement) ??
		createOverlay(documentRef, label);
	overlay.dataset.state = "active";
	overlay.setAttribute("aria-label", label);
	const text = overlay.querySelector<HTMLElement>(
		".astra-chat-switch-loading-overlay__text",
	);
	if (text) {
		text.textContent = label;
	}

	if (!overlay.parentElement) {
		hostElement.append(overlay);
	}

	hostElement.setAttribute(CHAT_SWITCH_LOADING_ATTRIBUTE, "active");

	let hidePromise: Promise<void> | null = null;

	return {
		hide() {
			if (hidePromise) {
				return hidePromise;
			}

			hidePromise = new Promise((resolve) => {
				const cleanup = () => {
					if (overlay.parentElement === hostElement) {
						overlay.remove();
					}

					if (!resolveExistingOverlay(hostElement)) {
						hostElement.removeAttribute(
							CHAT_SWITCH_LOADING_ATTRIBUTE,
						);
					}

					resolve();
				};

				overlay.dataset.state = "closing";
				hostElement.setAttribute(
					CHAT_SWITCH_LOADING_ATTRIBUTE,
					"closing",
				);

				if (exitDurationMs <= 0) {
					cleanup();
					return;
				}

				globalThis.setTimeout(cleanup, exitDurationMs);
			});

			return hidePromise;
		},
	};
}
