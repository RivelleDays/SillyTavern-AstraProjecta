import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import { getStContext } from "@/packages/core/st/context";
import { isRecord, resolveEventTypes } from "@/packages/core/st/shared";
import {
	persistStoredCharacterManagementTabValue,
	readMaybeStoredCharacterManagementTabValue,
	type StoredCharacterManagementTabValue,
} from "@/packages/features/sillytavern-interface/routes/subheaderStorage";

export type CharacterManagementTabValue = StoredCharacterManagementTabValue;

export const CHARACTER_MANAGEMENT_PAGE_KEY = "character-management";
export const CHARACTER_MANAGEMENT_ADVANCED_TRIGGER_ID = "advanced_div";
export const CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID = "character_popup";
export const CHARACTER_MANAGEMENT_ADVANCED_CLOSE_BUTTON_ID = "character_cross";
export const CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE =
	"data-astra-projecta-character-management-advanced-close-pending";
export const CHARACTER_MANAGEMENT_CARDS_TRIGGER_ID = "rm_button_characters";
export const CHARACTER_MANAGEMENT_EDIT_TRIGGER_ID = "rm_button_selected_ch";
export const CHARACTER_MANAGEMENT_MENU_TYPE_ATTRIBUTE = "data-menu-type";
export const CHARACTER_MANAGEMENT_PRIMARY_DRAWER_ID = "right-nav-panel";
export const CHARACTER_MANAGEMENT_GALLERY_SOURCE_ID = "gallery";
export const CHARACTER_MANAGEMENT_GALLERY_CLOSE_BUTTON_ID = "galleryclose";
export const CHARACTER_MANAGEMENT_GALLERY_DROPDOWN_ID =
	"char-management-dropdown";
export const CHARACTER_MANAGEMENT_GALLERY_DROPDOWN_OPTION_ID =
	"show_char_gallery";
export const CHARACTER_MANAGEMENT_GALLERY_WAND_BUTTON_ID =
	"show_gallery_wand_button";
export const CHARACTER_MANAGEMENT_DROPDOWN_EVENT_NAME =
	"charManagementDropdown";

interface PendingCharacterManagementTabValueRequest {
	bodyObserver: MutationObserver | null;
	popupObserver: MutationObserver | null;
	timeoutId: number | null;
	value: Exclude<CharacterManagementTabValue, "advanced">;
	view: Window;
}

interface PendingCharacterGalleryTabValueRequest {
	bodyObserver: MutationObserver | null;
	timeoutId: number | null;
	view: Window;
}

const pendingCharacterManagementTabValueRequests = new WeakMap<
	Document,
	PendingCharacterManagementTabValueRequest
>();
const pendingCharacterGalleryTabValueRequests = new WeakMap<
	Document,
	PendingCharacterGalleryTabValueRequest
>();
const requestedCharacterManagementTabValues = new WeakMap<
	Document,
	CharacterManagementTabValue
>();
const CHARACTER_MANAGEMENT_GALLERY_READY_TIMEOUT_MS = 2000;
const CHARACTER_MANAGEMENT_TAB_VALUE_REQUEST_EVENT =
	"astra-projecta:character-management-tab-value-request";

export function getDefaultCharacterManagementDocumentRef(): Document | null {
	if (typeof document === "undefined") {
		return null;
	}

	return document;
}

export function isCharacterManagementSillyTavernInterfaceRoute(
	pageKey: string,
) {
	return pageKey === CHARACTER_MANAGEMENT_PAGE_KEY;
}

export function canOpenCharacterEditTab(
	snapshot: CurrentChatIdentitySnapshot | undefined,
) {
	return (
		snapshot?.hasActiveChat === true &&
		(snapshot.kind === "character" || snapshot.kind === "group")
	);
}

export function canOpenCharacterGalleryTab(
	snapshot: CurrentChatIdentitySnapshot | undefined,
) {
	return canOpenCharacterEditTab(snapshot);
}

export function resolveCharacterManagementTabValue(
	menuType: string | null | undefined,
): CharacterManagementTabValue {
	switch (menuType) {
		case "character_edit":
		case "group_edit":
			return "edit";
		case "characters":
		case "create":
		case "group_create":
		default:
			return "cards";
	}
}

function getCharacterManagementStorage(documentRef: Document | null) {
	return documentRef?.defaultView?.localStorage ?? null;
}

function readRequestedCharacterManagementTabValue(
	documentRef: Document | null,
) {
	if (!documentRef) {
		return null;
	}

	return requestedCharacterManagementTabValues.get(documentRef) ?? null;
}

function clearRequestedCharacterManagementTabValue(
	documentRef: Document | null,
) {
	if (!documentRef) {
		return;
	}

	requestedCharacterManagementTabValues.delete(documentRef);
}

function dispatchRequestedCharacterManagementTabValue(
	documentRef: Document | null,
	value: CharacterManagementTabValue,
) {
	if (!documentRef) {
		return;
	}

	requestedCharacterManagementTabValues.set(documentRef, value);
	persistStoredCharacterManagementTabValue(
		getCharacterManagementStorage(documentRef),
		value,
	);
	documentRef.dispatchEvent(
		new CustomEvent<CharacterManagementTabValue>(
			CHARACTER_MANAGEMENT_TAB_VALUE_REQUEST_EVENT,
			{
				detail: value,
			},
		),
	);
}

export function isCharacterAdvancedPopupVisible(documentRef: Document | null) {
	const popup = documentRef?.getElementById(
		CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID,
	);

	if (!(popup instanceof HTMLElement)) {
		return false;
	}

	if (
		popup.getAttribute(
			CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
		) === "true"
	) {
		return false;
	}

	const view = documentRef?.defaultView ?? globalThis.window;
	const display =
		typeof view?.getComputedStyle === "function"
			? view.getComputedStyle(popup).display
			: popup.style.display;
	const opacity =
		typeof view?.getComputedStyle === "function"
			? view.getComputedStyle(popup).opacity
			: popup.style.opacity;

	return display !== "none" && opacity !== "0";
}

export function isCharacterGalleryVisible(documentRef: Document | null) {
	return (
		documentRef?.getElementById(
			CHARACTER_MANAGEMENT_GALLERY_SOURCE_ID,
		) instanceof HTMLElement
	);
}

export function readCharacterManagementTabValue(
	documentRef: Document | null,
): CharacterManagementTabValue {
	if (isCharacterAdvancedPopupVisible(documentRef)) {
		return "advanced";
	}

	if (isCharacterGalleryVisible(documentRef)) {
		return "images";
	}

	const drawer = documentRef?.getElementById(
		CHARACTER_MANAGEMENT_PRIMARY_DRAWER_ID,
	);

	return resolveCharacterManagementTabValue(
		drawer instanceof HTMLElement
			? drawer.getAttribute(CHARACTER_MANAGEMENT_MENU_TYPE_ATTRIBUTE)
			: null,
	);
}

export function readPreferredCharacterManagementTabValue({
	canOpenEditTab = true,
	canOpenGalleryTab = true,
	documentRef,
}: {
	canOpenEditTab?: boolean;
	canOpenGalleryTab?: boolean;
	documentRef: Document | null;
}): CharacterManagementTabValue {
	const storedValue = readMaybeStoredCharacterManagementTabValue(
		getCharacterManagementStorage(documentRef),
	);

	if (storedValue) {
		if (storedValue === "edit" && !canOpenEditTab) {
			return "cards";
		}

		if (storedValue === "images" && !canOpenGalleryTab) {
			return "cards";
		}

		return storedValue;
	}

	const activeValue = readCharacterManagementTabValue(documentRef);
	if (activeValue === "edit" && !canOpenEditTab) {
		return "cards";
	}

	if (activeValue === "images" && !canOpenGalleryTab) {
		return "cards";
	}

	return activeValue;
}

function clickNativeElementById(documentRef: Document | null, id: string) {
	const control = documentRef?.getElementById(id);

	if (control instanceof HTMLElement) {
		control.click();
	}
}

export function openNativeCharacterAdvancedPopup(documentRef: Document | null) {
	const popup = documentRef?.getElementById(
		CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID,
	);

	if (popup instanceof HTMLElement) {
		popup.removeAttribute(
			CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
		);
	}

	if (isCharacterAdvancedPopupVisible(documentRef)) {
		return;
	}

	clickNativeElementById(
		documentRef,
		CHARACTER_MANAGEMENT_ADVANCED_TRIGGER_ID,
	);
}

export function closeNativeCharacterAdvancedPopup(
	documentRef: Document | null,
) {
	const popup = documentRef?.getElementById(
		CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID,
	);

	if (!(popup instanceof HTMLElement)) {
		return;
	}

	const wasVisible = isCharacterAdvancedPopupVisible(documentRef);
	popup.setAttribute(
		CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
		"true",
	);

	if (!wasVisible) {
		hideNativeCharacterAdvancedPopup(documentRef);
		return;
	}

	clickNativeElementById(
		documentRef,
		CHARACTER_MANAGEMENT_ADVANCED_CLOSE_BUTTON_ID,
	);
	hideNativeCharacterAdvancedPopup(documentRef);
}

export function hideNativeCharacterAdvancedPopup(documentRef: Document | null) {
	const popup = documentRef?.getElementById(
		CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID,
	);

	if (!(popup instanceof HTMLElement)) {
		return;
	}

	popup.setAttribute(
		CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
		"true",
	);
	popup.classList.remove("open");
	popup.style.display = "none";
	popup.style.opacity = "0";
	popup.style.transition = "none";
}

function selectNativeDropdownOptionById({
	documentRef,
	optionId,
	selectId,
}: {
	documentRef: Document | null;
	optionId: string;
	selectId: string;
}) {
	const select = documentRef?.getElementById(selectId);
	if (!(select instanceof HTMLSelectElement)) {
		return false;
	}

	const option = Array.from(select.options).find(
		(candidate) => candidate.id === optionId,
	);
	if (!(option instanceof HTMLOptionElement)) {
		return false;
	}

	option.selected = true;
	select.dispatchEvent(new Event("change", { bubbles: true }));
	return true;
}

function emitNativeCharacterManagementDropdownEvent(optionId: string) {
	try {
		const context = getStContext();
		if (!isRecord(context) || !isRecord(context.eventSource)) {
			return false;
		}

		const eventTypes = resolveEventTypes(context);
		const eventName =
			eventTypes.CHARACTER_MANAGEMENT_DROPDOWN ??
			CHARACTER_MANAGEMENT_DROPDOWN_EVENT_NAME;
		const emit = context.eventSource.emit;
		if (typeof emit !== "function") {
			return false;
		}

		void emit.call(context.eventSource, eventName, optionId);
		return true;
	} catch {
		return false;
	}
}

export function openNativeCharacterGallery(documentRef: Document | null) {
	if (isCharacterGalleryVisible(documentRef)) {
		return true;
	}

	if (
		selectNativeDropdownOptionById({
			documentRef,
			optionId: CHARACTER_MANAGEMENT_GALLERY_DROPDOWN_OPTION_ID,
			selectId: CHARACTER_MANAGEMENT_GALLERY_DROPDOWN_ID,
		})
	) {
		return true;
	}

	const wandButton = documentRef?.getElementById(
		CHARACTER_MANAGEMENT_GALLERY_WAND_BUTTON_ID,
	);
	if (wandButton instanceof HTMLElement) {
		wandButton.click();
		return true;
	}

	return emitNativeCharacterManagementDropdownEvent(
		CHARACTER_MANAGEMENT_GALLERY_DROPDOWN_OPTION_ID,
	);
}

export function closeNativeCharacterGallery(documentRef: Document | null) {
	clearPendingCharacterGalleryTabValueRequest(documentRef);

	const gallery = documentRef?.getElementById(
		CHARACTER_MANAGEMENT_GALLERY_SOURCE_ID,
	);

	if (!(gallery instanceof HTMLElement)) {
		return;
	}

	const movingDivs = documentRef?.getElementById("movingDivs");
	if (
		movingDivs instanceof HTMLElement &&
		gallery.parentElement !== movingDivs
	) {
		movingDivs.appendChild(gallery);
	}

	const closeControl =
		documentRef?.getElementById(
			CHARACTER_MANAGEMENT_GALLERY_CLOSE_BUTTON_ID,
		) ??
		gallery.querySelector<HTMLElement>(
			'.dragClose[data-related-id="gallery"], .dragClose',
		);

	if (closeControl instanceof HTMLElement) {
		closeControl.click();
		if (gallery.isConnected) {
			gallery.remove();
		}
		return;
	}

	gallery.remove();
}

function clearPendingCharacterGalleryTabValueRequest(
	documentRef: Document | null,
) {
	if (!documentRef) {
		return;
	}

	const pendingRequest =
		pendingCharacterGalleryTabValueRequests.get(documentRef);
	if (!pendingRequest) {
		return;
	}

	pendingRequest.bodyObserver?.disconnect();
	if (pendingRequest.timeoutId !== null) {
		pendingRequest.view.clearTimeout(pendingRequest.timeoutId);
	}

	pendingCharacterGalleryTabValueRequests.delete(documentRef);
}

function hasPendingCharacterGalleryTabValueRequest(
	documentRef: Document | null,
) {
	return (
		!!documentRef &&
		pendingCharacterGalleryTabValueRequests.has(documentRef)
	);
}

function clearPendingCharacterManagementTabValueRequest(
	documentRef: Document | null,
) {
	if (!documentRef) {
		return;
	}

	const pendingRequest =
		pendingCharacterManagementTabValueRequests.get(documentRef);
	if (!pendingRequest) {
		return;
	}

	pendingRequest.popupObserver?.disconnect();
	pendingRequest.bodyObserver?.disconnect();
	if (pendingRequest.timeoutId !== null) {
		pendingRequest.view.clearTimeout(pendingRequest.timeoutId);
	}

	pendingCharacterManagementTabValueRequests.delete(documentRef);
}

function clickNativeCharacterManagementPrimaryControl(
	documentRef: Document | null,
	value: Exclude<CharacterManagementTabValue, "advanced" | "images">,
) {
	clickNativeElementById(
		documentRef,
		value === "cards"
			? CHARACTER_MANAGEMENT_CARDS_TRIGGER_ID
			: CHARACTER_MANAGEMENT_EDIT_TRIGGER_ID,
	);
}

function openNativeCharacterManagementNonAdvancedTab(
	documentRef: Document | null,
	value: Exclude<CharacterManagementTabValue, "advanced">,
) {
	if (value === "images") {
		requestNativeCharacterGalleryTabValue(documentRef);
		return;
	}

	clickNativeCharacterManagementPrimaryControl(documentRef, value);
}

function requestNativeCharacterGalleryTabValue(documentRef: Document | null) {
	clearPendingCharacterGalleryTabValueRequest(documentRef);

	if (!documentRef) {
		return;
	}

	persistStoredCharacterManagementTabValue(
		getCharacterManagementStorage(documentRef),
		"images",
	);
	clearRequestedCharacterManagementTabValue(documentRef);

	if (isCharacterGalleryVisible(documentRef)) {
		dispatchRequestedCharacterManagementTabValue(documentRef, "images");
		return;
	}

	const wasOpenRequested = openNativeCharacterGallery(documentRef);
	if (!wasOpenRequested || isCharacterGalleryVisible(documentRef)) {
		dispatchRequestedCharacterManagementTabValue(documentRef, "images");
		return;
	}

	const view = documentRef.defaultView ?? globalThis.window;
	const pendingRequest: PendingCharacterGalleryTabValueRequest = {
		bodyObserver: null,
		timeoutId: null,
		view,
	};
	const commitRequestedValue = () => {
		if (
			pendingCharacterGalleryTabValueRequests.get(documentRef) !==
			pendingRequest
		) {
			return;
		}

		clearPendingCharacterGalleryTabValueRequest(documentRef);
		dispatchRequestedCharacterManagementTabValue(documentRef, "images");
	};
	const commitRequestedValueIfGalleryExists = () => {
		if (!isCharacterGalleryVisible(documentRef)) {
			return;
		}

		commitRequestedValue();
	};

	pendingCharacterGalleryTabValueRequests.set(documentRef, pendingRequest);

	if (documentRef.body instanceof HTMLBodyElement) {
		pendingRequest.bodyObserver = new MutationObserver(
			commitRequestedValueIfGalleryExists,
		);
		pendingRequest.bodyObserver.observe(documentRef.body, {
			childList: true,
			subtree: true,
		});
	}

	pendingRequest.timeoutId = view.setTimeout(() => {
		commitRequestedValue();
	}, CHARACTER_MANAGEMENT_GALLERY_READY_TIMEOUT_MS);
	commitRequestedValueIfGalleryExists();
}

function requestNativeCharacterManagementNonAdvancedTab({
	documentRef,
	value,
}: {
	documentRef: Document | null;
	value: Exclude<CharacterManagementTabValue, "advanced">;
}) {
	if (!documentRef || !isCharacterAdvancedPopupVisible(documentRef)) {
		openNativeCharacterManagementNonAdvancedTab(documentRef, value);
		return;
	}

	const popup = documentRef.getElementById(
		CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID,
	);
	if (!(popup instanceof HTMLElement)) {
		openNativeCharacterManagementNonAdvancedTab(documentRef, value);
		return;
	}

	const view = documentRef.defaultView ?? globalThis.window;
	const pendingRequest: PendingCharacterManagementTabValueRequest = {
		bodyObserver: null,
		popupObserver: null,
		timeoutId: null,
		value,
		view,
	};
	const commitRequestedValue = () => {
		if (
			pendingCharacterManagementTabValueRequests.get(documentRef) !==
				pendingRequest ||
			isCharacterAdvancedPopupVisible(documentRef)
		) {
			return;
		}

		clearPendingCharacterManagementTabValueRequest(documentRef);
		openNativeCharacterManagementNonAdvancedTab(
			documentRef,
			pendingRequest.value,
		);
	};

	pendingRequest.popupObserver = new MutationObserver(commitRequestedValue);
	pendingRequest.popupObserver.observe(popup, {
		attributeFilter: ["class", "style"],
		attributes: true,
	});

	if (documentRef.body instanceof HTMLBodyElement) {
		pendingRequest.bodyObserver = new MutationObserver(
			commitRequestedValue,
		);
		pendingRequest.bodyObserver.observe(documentRef.body, {
			childList: true,
			subtree: true,
		});
	}

	pendingCharacterManagementTabValueRequests.set(documentRef, pendingRequest);
	closeNativeCharacterAdvancedPopup(documentRef);
	pendingRequest.timeoutId = view.setTimeout(() => {
		commitRequestedValue();
	}, 0);
	commitRequestedValue();
}

export function cancelPendingCharacterManagementTabValueRequest(
	documentRef: Document | null,
) {
	clearPendingCharacterManagementTabValueRequest(documentRef);
	clearPendingCharacterGalleryTabValueRequest(documentRef);
	clearRequestedCharacterManagementTabValue(documentRef);
}

export function requestCharacterManagementTabValue({
	canOpenEditTab,
	canOpenGalleryTab = true,
	documentRef,
	value,
}: {
	canOpenEditTab: boolean;
	canOpenGalleryTab?: boolean;
	documentRef: Document | null;
	value: CharacterManagementTabValue;
}) {
	clearPendingCharacterManagementTabValueRequest(documentRef);
	clearPendingCharacterGalleryTabValueRequest(documentRef);

	if (value === "edit" && !canOpenEditTab) {
		clearRequestedCharacterManagementTabValue(documentRef);
		return;
	}

	if (value === "images" && !canOpenGalleryTab) {
		clearRequestedCharacterManagementTabValue(documentRef);
		return;
	}

	const currentValue = readCharacterManagementTabValue(documentRef);
	const hasOpenGallery = isCharacterGalleryVisible(documentRef);

	if (currentValue === value) {
		if (value !== "images" && hasOpenGallery) {
			closeNativeCharacterGallery(documentRef);
		}
		persistStoredCharacterManagementTabValue(
			getCharacterManagementStorage(documentRef),
			value,
		);
		clearRequestedCharacterManagementTabValue(documentRef);
		return;
	}

	if (value !== "images" && hasOpenGallery) {
		closeNativeCharacterGallery(documentRef);
	}

	if (value === "advanced") {
		dispatchRequestedCharacterManagementTabValue(documentRef, value);
		openNativeCharacterAdvancedPopup(documentRef);
		return;
	}

	if (value !== "images") {
		dispatchRequestedCharacterManagementTabValue(documentRef, value);
	}

	requestNativeCharacterManagementNonAdvancedTab({
		documentRef,
		value,
	});
}

export function getCharacterManagementSourceId(
	value: CharacterManagementTabValue,
) {
	if (value === "images") {
		return CHARACTER_MANAGEMENT_GALLERY_SOURCE_ID;
	}

	return value === "advanced"
		? CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID
		: CHARACTER_MANAGEMENT_PRIMARY_DRAWER_ID;
}

export function observeCharacterManagementTabValue({
	documentRef,
	onValueChange,
}: {
	documentRef: Document;
	onValueChange(value: CharacterManagementTabValue): void;
}) {
	let observedDrawer: HTMLElement | null = null;
	let observedAdvancedPopup: HTMLElement | null = null;
	let observedGallery: HTMLElement | null = null;
	let drawerObserver: MutationObserver | null = null;
	let advancedPopupObserver: MutationObserver | null = null;
	let galleryObserver: MutationObserver | null = null;
	let lastResolvedValue: CharacterManagementTabValue | null = null;

	function emitValueIfChanged(value: CharacterManagementTabValue) {
		if (lastResolvedValue === value) {
			return;
		}

		lastResolvedValue = value;
		persistStoredCharacterManagementTabValue(
			getCharacterManagementStorage(documentRef),
			value,
		);
		onValueChange(value);
	}

	function syncValue() {
		const nextValue = readCharacterManagementTabValue(documentRef);
		if (
			readRequestedCharacterManagementTabValue(documentRef) === nextValue
		) {
			clearRequestedCharacterManagementTabValue(documentRef);
		}

		const requestedValue =
			readRequestedCharacterManagementTabValue(documentRef);
		const resolvedValue =
			requestedValue ??
			(hasPendingCharacterGalleryTabValueRequest(documentRef) &&
			nextValue !== "images" &&
			lastResolvedValue
				? lastResolvedValue
				: nextValue);
		emitValueIfChanged(resolvedValue);
	}

	function disconnectDrawerObserver() {
		drawerObserver?.disconnect();
		drawerObserver = null;
	}

	function disconnectAdvancedPopupObserver() {
		advancedPopupObserver?.disconnect();
		advancedPopupObserver = null;
	}

	function disconnectGalleryObserver() {
		galleryObserver?.disconnect();
		galleryObserver = null;
	}

	function syncDrawerObserver() {
		const drawer = documentRef.getElementById(
			CHARACTER_MANAGEMENT_PRIMARY_DRAWER_ID,
		);
		const nextDrawer = drawer instanceof HTMLElement ? drawer : null;

		if (nextDrawer === observedDrawer) {
			syncValue();
			return;
		}

		disconnectDrawerObserver();
		observedDrawer = nextDrawer;
		syncValue();

		if (!observedDrawer) {
			return;
		}

		drawerObserver = new MutationObserver(syncValue);
		drawerObserver.observe(observedDrawer, {
			attributeFilter: [CHARACTER_MANAGEMENT_MENU_TYPE_ATTRIBUTE],
			attributes: true,
		});
	}

	function syncAdvancedPopupObserver() {
		const popup = documentRef.getElementById(
			CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID,
		);
		const nextPopup = popup instanceof HTMLElement ? popup : null;

		if (nextPopup === observedAdvancedPopup) {
			syncValue();
			return;
		}

		disconnectAdvancedPopupObserver();
		observedAdvancedPopup = nextPopup;
		syncValue();

		if (!observedAdvancedPopup) {
			return;
		}

		advancedPopupObserver = new MutationObserver(syncValue);
		advancedPopupObserver.observe(observedAdvancedPopup, {
			attributeFilter: ["class", "style"],
			attributes: true,
		});
	}

	function syncGalleryObserver() {
		const gallery = documentRef.getElementById(
			CHARACTER_MANAGEMENT_GALLERY_SOURCE_ID,
		);
		const nextGallery = gallery instanceof HTMLElement ? gallery : null;

		if (nextGallery === observedGallery) {
			syncValue();
			return;
		}

		disconnectGalleryObserver();
		observedGallery = nextGallery;
		syncValue();

		if (!observedGallery) {
			return;
		}

		galleryObserver = new MutationObserver(syncValue);
		galleryObserver.observe(observedGallery, {
			attributeFilter: ["class", "style"],
			attributes: true,
		});
	}

	function syncObservers() {
		syncDrawerObserver();
		syncAdvancedPopupObserver();
		syncGalleryObserver();
	}

	const bodyObserver =
		documentRef.body instanceof HTMLBodyElement
			? new MutationObserver(syncObservers)
			: null;
	const requestedValueListener = (event: Event) => {
		emitValueIfChanged(
			(event as CustomEvent<CharacterManagementTabValue>).detail,
		);
	};

	documentRef.addEventListener(
		CHARACTER_MANAGEMENT_TAB_VALUE_REQUEST_EVENT,
		requestedValueListener,
	);
	bodyObserver?.observe(documentRef.body, {
		childList: true,
		subtree: true,
	});
	syncObservers();

	return () => {
		documentRef.removeEventListener(
			CHARACTER_MANAGEMENT_TAB_VALUE_REQUEST_EVENT,
			requestedValueListener,
		);
		bodyObserver?.disconnect();
		disconnectDrawerObserver();
		disconnectAdvancedPopupObserver();
		disconnectGalleryObserver();
	};
}
