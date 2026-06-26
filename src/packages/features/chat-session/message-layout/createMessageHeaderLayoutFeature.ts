import { getStContext } from "@/packages/core/st/context";
import { translateAstra } from "@/packages/core/i18n";
import {
	asTrimmedString,
	isRecord,
} from "@/packages/core/st/shared";
import {
	formatStAbsoluteTimestamp,
	formatStTimestampDateDivider,
	formatStTimestampTimeOnly,
	getStTimestampLocalDateKey,
	parseStTimestampToMs,
} from "@/packages/core/st/timestamps";
import { resolveMessageModelLabel } from "@/packages/features/chat-session/messageModelMetadata";

export interface MessageHeaderLayoutFeature {
	dispose(): void;
	mount(): void;
	unmount(): void;
}

type StContextLike = {
	chat?: unknown;
	eventSource?: unknown;
	eventTypes?: unknown;
	event_types?: unknown;
	powerUserSettings?: unknown;
};

type EventSourceLike = {
	on(eventName: string, listener: (...args: unknown[]) => void): void;
	removeListener(
		eventName: string,
		listener: (...args: unknown[]) => void,
	): void;
};

interface MessageHeaderLayoutState {
	avatarPlaceholder: Comment;
	avatarWrapper: HTMLDivElement;
	header: HTMLDivElement;
	identityLine: HTMLDivElement;
	metadataElements: Map<MetadataClass, MetadataElementState>;
	metadataItemElements: Map<MetadataClass, HTMLDivElement>;
	metadata: HTMLDivElement;
	metadataItems: HTMLDivElement;
	metadataSeparators: HTMLDivElement[];
	messageBlock: HTMLDivElement;
	name: HTMLDivElement;
	nameText: HTMLElement | null;
	nameTextPlaceholder: Comment | null;
	nameTextWrapper: HTMLDivElement | null;
	nameWrapper: HTMLDivElement;
	nativeControls: HTMLDivElement;
	nativeControlStates: NativeControlState[];
	modelLabel: HTMLSpanElement | null;
	modelMeta: HTMLDivElement | null;
	timestamp: HTMLElement | null;
	timestampIconPlaceholder: Comment | null;
	timestampMeta: HTMLDivElement | null;
	timestampOriginalHidden: boolean | null;
	timestampOriginalText: string | null;
	timestampOriginalTitle: string | null;
	timestampPlaceholder: Comment | null;
}

interface MetadataElementState {
	element: HTMLDivElement;
	hiddenByAstra: boolean;
	originalHidden: boolean;
	originalText: string | null;
}

interface NativeControlState {
	control: HTMLDivElement;
	placeholder: Comment;
}

interface MessageTimestampResolution {
	dateLabel: string;
	dayKey: string;
	timeLabel: string;
	title: string;
}

interface DateDividerState {
	dateLabel: string;
	dayKey: string;
	divider: HTMLDivElement;
}

const MESSAGE_CLASS = "astra-mes";
const BODY_CLASS = "astra-mesBody";
const HEADER_CLASS = "astra-mesHeader";
const HEADER_NAME_CLASS = "astra-mesHeader__name";
const HEADER_IDENTITY_LINE_CLASS = "astra-mesHeader__identityLine";
const NAME_TEXT_WRAPPER_CLASS = "astra-mesNameText";
const META_CLASS = "astra-mesMeta";
const META_ITEMS_CLASS = "astra-mesMeta__items";
const META_ITEM_CLASS = "astra-mesMeta__item";
const META_SEPARATOR_CLASS = "astra-mesMeta__separator";
const MODEL_META_CLASS = "astra-mesModel";
const MODEL_LABEL_CLASS = "astra-mesModel__label";
const MODEL_ICONS_DISABLED_BODY_CLASS = "no-modelIcons";
const TIMESTAMP_META_CLASS = "astra-mesMeta__time";
const NATIVE_CONTROLS_CLASS = "astra-mesNativeControls";
const DATE_DIVIDER_CLASS = "astra-mesDate";
const DATE_DIVIDER_LINE_CLASS = "astra-mesDate__line";
const DATE_DIVIDER_LABEL_CLASS = "astra-mesDate__label";
const CONTEXT_BOUNDARY_ID = "astra-mesContextBoundary";
const CONTEXT_BOUNDARY_CLASS = "astra-mesContextBoundary";
const CONTEXT_BOUNDARY_TAG_CLASS = "astra-mesContextBoundary__tag";
const CONTEXT_BOUNDARY_TAG_ICON_CLASS = "astra-mesContextBoundary__tagIcon";
const CONTEXT_BOUNDARY_TITLE_CLASS = "astra-mesContextBoundary__title";
const REASONING_HEADER_CLASS = "mes_reasoning_header";
const REASONING_HEADER_TITLE_CLASS = "mes_reasoning_header_title";
const REASONING_SPARKLE_CLASS = "astra-mesReasoningSparkle";
const REASONING_CHEVRON_CLASS = "astra-mesReasoningChevron";
const PROMPT_EXCLUDED_ATTRIBUTE = "data-astra-message-prompt-excluded";
const NATIVE_CONTROL_CLASSES = ["mes_buttons", "mes_edit_buttons"] as const;
const METADATA_CLASSES = [
	"mesIDDisplay",
	"mes_timer",
	"tokenCounterDisplay",
] as const;
const LAYOUT_SYNC_EVENT_KEYS = [
	"CHAT_CHANGED",
	"CHAT_LOADED",
	"CHARACTER_MESSAGE_RENDERED",
	"GENERATE_AFTER_DATA",
	"MESSAGE_DELETED",
	"MESSAGE_EDITED",
	"MESSAGE_SWIPED",
	"MESSAGE_UPDATED",
	"SETTINGS_UPDATED",
	"USER_MESSAGE_RENDERED",
] as const;
type MetadataClass = (typeof METADATA_CLASSES)[number];
const METADATA_BODY_HIDE_CLASSES: Record<MetadataClass, string> = {
	mesIDDisplay: "no-mesIDDisplay",
	mes_timer: "no-timer",
	tokenCounterDisplay: "no-tokenCount",
};
const CHAT_OBSERVER_OPTIONS: MutationObserverInit = {
	attributeFilter: ["class", "is_system"],
	attributeOldValue: true,
	attributes: true,
	childList: true,
	subtree: true,
};

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function isDirectMessageElement(element: Element): boolean {
	return element.classList.contains("mes") && element.hasAttribute("mesid");
}

function nodeTouchesMessageLayout(node: Node): boolean {
	if (!(node instanceof Element)) {
		return false;
	}

	return (
		isDirectMessageElement(node) ||
		Boolean(node.closest(".mes[mesid]")) ||
		Boolean(node.querySelector(".mes[mesid]"))
	);
}

function didLastInContextClassChange(mutation: MutationRecord): boolean {
	const target = mutation.target;
	if (!(target instanceof Element) || !isDirectMessageElement(target)) {
		return false;
	}

	const oldClassNames = new Set(
		(mutation.oldValue ?? "").split(/\s+/).filter(Boolean),
	);
	return (
		oldClassNames.has("lastInContext") !==
		target.classList.contains("lastInContext")
	);
}

export function shouldScheduleMessageLayoutSyncForMutations(
	mutations: MutationRecord[],
): boolean {
	for (const mutation of mutations) {
		if (mutation.type === "childList") {
			if (nodeTouchesMessageLayout(mutation.target)) {
				return true;
			}
			for (const node of Array.from(mutation.addedNodes)) {
				if (nodeTouchesMessageLayout(node)) {
					return true;
				}
			}
			for (const node of Array.from(mutation.removedNodes)) {
				if (nodeTouchesMessageLayout(node)) {
					return true;
				}
			}
			continue;
		}

		if (mutation.type !== "attributes") {
			continue;
		}

		if (mutation.attributeName === "is_system") {
			const target = mutation.target;
			if (target instanceof Element && isDirectMessageElement(target)) {
				return true;
			}
		}

		if (
			mutation.attributeName === "class" &&
			didLastInContextClassChange(mutation)
		) {
			return true;
		}
	}

	return false;
}

function findDirectChildByClass(
	parent: Element | null,
	className: string,
): HTMLDivElement | null {
	if (!parent) {
		return null;
	}

	for (const child of Array.from(parent.children)) {
		if (
			child instanceof HTMLDivElement &&
			child.classList.contains(className)
		) {
			return child;
		}
	}

	return null;
}

function findDirectElementByClass(
	parent: Element | null,
	className: string,
): Element | null {
	if (!parent) {
		return null;
	}

	for (const child of Array.from(parent.children)) {
		if (child.classList.contains(className)) {
			return child;
		}
	}

	return null;
}

function createMetadataSeparator(documentRef: Document): HTMLDivElement {
	const separator = documentRef.createElement("div");
	separator.className = META_SEPARATOR_CLASS;
	separator.setAttribute("aria-hidden", "true");

	const icon = documentRef.createElementNS(SVG_NAMESPACE, "svg");
	icon.classList.add("lucide", "lucide-dot");
	icon.setAttribute("aria-hidden", "true");
	icon.setAttribute("focusable", "false");
	icon.setAttribute("fill", "none");
	icon.setAttribute("height", "24");
	icon.setAttribute("stroke", "currentColor");
	icon.setAttribute("stroke-linecap", "round");
	icon.setAttribute("stroke-linejoin", "round");
	icon.setAttribute("stroke-width", "var(--astra-icon-stroke-width)");
	icon.setAttribute("viewBox", "0 0 24 24");
	icon.setAttribute("width", "24");
	icon.setAttribute("xmlns", SVG_NAMESPACE);

	const circle = documentRef.createElementNS(SVG_NAMESPACE, "circle");
	circle.setAttribute("cx", "12.1");
	circle.setAttribute("cy", "12.1");
	circle.setAttribute("r", "1");
	icon.appendChild(circle);

	separator.appendChild(icon);
	return separator;
}

function createMetadataItem(
	documentRef: Document,
	metadataElement: HTMLDivElement,
): HTMLDivElement {
	const item = documentRef.createElement("div");
	item.className = META_ITEM_CLASS;
	item.appendChild(metadataElement);
	return item;
}

function isEventSourceLike(value: unknown): value is EventSourceLike {
	return (
		isRecord(value) &&
		typeof value.on === "function" &&
		typeof value.removeListener === "function"
	);
}

function resolveEventTypes(
	context: StContextLike | null,
): Record<string, unknown> {
	if (isRecord(context?.eventTypes)) {
		return context.eventTypes;
	}

	if (isRecord(context?.event_types)) {
		return context.event_types;
	}

	return {};
}

function resolveMessageBooleanField(
	message: Element,
	fieldName: "is_system",
): boolean | null {
	const chatMessage = resolveChatMessageRecord(message);
	if (typeof chatMessage?.[fieldName] === "boolean") {
		return chatMessage[fieldName];
	}

	const attributeValue = message.getAttribute(fieldName);
	if (attributeValue === "true") {
		return true;
	}
	if (attributeValue === "false") {
		return false;
	}

	return null;
}

function resolveContextSafe(): StContextLike | null {
	try {
		return getStContext() as StContextLike;
	} catch {
		return null;
	}
}

function resolveMessageId(message: Element): number | null {
	const rawMessageId = message.getAttribute("mesid");
	if (rawMessageId === null || rawMessageId.trim() === "") {
		return null;
	}

	const messageId = Number(rawMessageId);
	return Number.isInteger(messageId) && messageId >= 0 ? messageId : null;
}

function resolveChatMessageRecord(
	message: Element,
): Record<string, unknown> | null {
	const messageId = resolveMessageId(message);
	if (messageId === null) {
		return null;
	}

	const context = resolveContextSafe();
	if (!Array.isArray(context?.chat)) {
		return null;
	}

	const chatMessage = context.chat[messageId];
	if (!isRecord(chatMessage)) {
		return null;
	}

	return chatMessage;
}

function resolveMessageModelLabelText(
	message: Element,
	timestampIcon: Element | null,
): string {
	const chatMessage = resolveChatMessageRecord(message);
	const extra = isRecord(chatMessage?.extra) ? chatMessage.extra : null;
	return resolveMessageModelLabel({
		iconTitle: timestampIcon?.getAttribute("title"),
		model: extra?.model,
	});
}

function findTimestamp(message: Element): HTMLElement | null {
	const timestamp = message.querySelector(".timestamp");
	return timestamp instanceof HTMLElement ? timestamp : null;
}

function normalizeTimestampCandidate(value: unknown): number | string | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed ? trimmed : null;
	}

	return null;
}

function createTimestampTitle(
	source: number | string,
	timestampMs: number,
): string {
	if (typeof source === "string" && !/^\d+(?:\.\d+)?$/.test(source)) {
		return source;
	}

	return formatStAbsoluteTimestamp(timestampMs) || String(source);
}

function resolveMessageTimestamp(
	message: Element,
	state: MessageHeaderLayoutState | null,
): MessageTimestampResolution | null {
	const chatMessage = resolveChatMessageRecord(message);
	const timestamp = state?.timestamp ?? findTimestamp(message);
	const candidates = [
		chatMessage?.send_date,
		message.getAttribute("timestamp"),
		state?.timestampOriginalTitle ?? timestamp?.getAttribute("title"),
		state?.timestampOriginalText ?? timestamp?.textContent,
	];

	for (const candidate of candidates) {
		const normalizedCandidate = normalizeTimestampCandidate(candidate);
		if (normalizedCandidate === null) {
			continue;
		}

		const timestampMs = parseStTimestampToMs(normalizedCandidate);
		if (timestampMs === null) {
			continue;
		}

		const timeLabel = formatStTimestampTimeOnly(timestampMs);
		const dateLabel = formatStTimestampDateDivider(timestampMs);
		const dayKey = getStTimestampLocalDateKey(timestampMs);
		if (!timeLabel || !dateLabel || !dayKey) {
			continue;
		}

		return {
			dateLabel,
			dayKey,
			timeLabel,
			title: createTimestampTitle(normalizedCandidate, timestampMs),
		};
	}

	return null;
}

function restoreTimestampDisplay(state: MessageHeaderLayoutState) {
	if (!state.timestamp) {
		return;
	}

	state.timestamp.textContent = state.timestampOriginalText;
	if (state.timestampOriginalHidden !== null) {
		state.timestamp.hidden = state.timestampOriginalHidden;
	}
	if (state.timestampOriginalTitle === null) {
		state.timestamp.removeAttribute("title");
		return;
	}

	state.timestamp.setAttribute("title", state.timestampOriginalTitle);
}

function isTimestampIconElement(element: Element | null): element is Element {
	return Boolean(element?.classList.contains("timestamp-icon"));
}

function isInjectedTimestampSvgIcon(
	element: Element | null,
): element is Element {
	return Boolean(
		isTimestampIconElement(element) &&
		element.namespaceURI === SVG_NAMESPACE &&
		element.localName.toLowerCase() === "svg",
	);
}

function findTimestampIcon(
	message: Element,
	state: MessageHeaderLayoutState,
	{ requireInjectedSvg = false }: { requireInjectedSvg?: boolean } = {},
): Element | null {
	const isUsableIcon = requireInjectedSvg
		? isInjectedTimestampSvgIcon
		: isTimestampIconElement;

	const modelMetaIcon = Array.from(state.modelMeta?.children ?? []).find(
		(child) => isUsableIcon(child),
	);
	if (modelMetaIcon) {
		return modelMetaIcon;
	}

	const nextTimestampSibling = state.timestamp?.nextElementSibling ?? null;
	if (isUsableIcon(nextTimestampSibling)) {
		return nextTimestampSibling;
	}

	const previousTimestampSibling =
		state.timestamp?.previousElementSibling ?? null;
	if (isUsableIcon(previousTimestampSibling)) {
		return previousTimestampSibling;
	}

	for (const timestampIcon of Array.from(
		message.querySelectorAll(".timestamp-icon"),
	)) {
		if (isUsableIcon(timestampIcon)) {
			return timestampIcon;
		}
	}

	return null;
}

function findNameTextElement(name: Element): HTMLElement | null {
	const nameText = name.querySelector(".name_text");
	return nameText instanceof HTMLElement ? nameText : null;
}

function createDateDivider(
	documentRef: Document,
	labelText: string,
): HTMLDivElement {
	const divider = documentRef.createElement("div");
	divider.className = DATE_DIVIDER_CLASS;
	divider.dataset.astraComponent = "message-date-divider";
	divider.setAttribute("aria-label", labelText);
	divider.setAttribute("role", "separator");

	const leadingLine = documentRef.createElement("div");
	leadingLine.className = DATE_DIVIDER_LINE_CLASS;
	leadingLine.setAttribute("aria-hidden", "true");

	const label = documentRef.createElement("span");
	label.className = DATE_DIVIDER_LABEL_CLASS;
	label.textContent = labelText;

	const trailingLine = documentRef.createElement("div");
	trailingLine.className = DATE_DIVIDER_LINE_CLASS;
	trailingLine.setAttribute("aria-hidden", "true");

	divider.appendChild(leadingLine);
	divider.appendChild(label);
	divider.appendChild(trailingLine);
	return divider;
}

function isDateDividerElement(element: Element): element is HTMLDivElement {
	return (
		element instanceof HTMLDivElement &&
		element.classList.contains(DATE_DIVIDER_CLASS)
	);
}

function updateDateDivider(
	state: DateDividerState,
	resolution: MessageTimestampResolution,
) {
	state.dayKey = resolution.dayKey;
	state.dateLabel = resolution.dateLabel;
	state.divider.dataset.astraDateKey = resolution.dayKey;

	if (state.divider.getAttribute("aria-label") !== resolution.dateLabel) {
		state.divider.setAttribute("aria-label", resolution.dateLabel);
	}

	const label = state.divider.querySelector(`.${DATE_DIVIDER_LABEL_CLASS}`);
	if (label && label.textContent !== resolution.dateLabel) {
		label.textContent = resolution.dateLabel;
	}
}

function createContextBoundary(documentRef: Document): HTMLDivElement {
	const boundary = documentRef.createElement("div");
	boundary.id = CONTEXT_BOUNDARY_ID;
	boundary.className = CONTEXT_BOUNDARY_CLASS;
	boundary.dataset.astraComponent = "message-context-boundary";
	boundary.setAttribute("role", "separator");

	const tag = documentRef.createElement("span");
	tag.className = CONTEXT_BOUNDARY_TAG_CLASS;
	tag.appendChild(createContextBoundaryTagIcon(documentRef));

	const title = documentRef.createElement("span");
	title.className = CONTEXT_BOUNDARY_TITLE_CLASS;

	boundary.append(tag, title);
	updateContextBoundaryCopy(boundary);
	return boundary;
}

function createContextBoundaryTagIcon(documentRef: Document): SVGSVGElement {
	const icon = documentRef.createElementNS(SVG_NAMESPACE, "svg");
	icon.classList.add(
		"lucide",
		"lucide-messages-square",
		CONTEXT_BOUNDARY_TAG_ICON_CLASS,
	);
	icon.setAttribute("aria-hidden", "true");
	icon.setAttribute("focusable", "false");
	icon.setAttribute("fill", "none");
	icon.setAttribute("height", "14");
	icon.setAttribute("stroke", "currentColor");
	icon.setAttribute("stroke-linecap", "round");
	icon.setAttribute("stroke-linejoin", "round");
	icon.setAttribute("stroke-width", "var(--astra-icon-stroke-width)");
	icon.setAttribute("viewBox", "0 0 24 24");
	icon.setAttribute("width", "14");
	icon.setAttribute("xmlns", SVG_NAMESPACE);

	const firstPath = documentRef.createElementNS(SVG_NAMESPACE, "path");
	firstPath.setAttribute(
		"d",
		"M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
	);

	const secondPath = documentRef.createElementNS(SVG_NAMESPACE, "path");
	secondPath.setAttribute(
		"d",
		"M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1",
	);

	icon.append(firstPath, secondPath);
	return icon;
}

function createReasoningChevronIcon(documentRef: Document): SVGSVGElement {
	const icon = documentRef.createElementNS(SVG_NAMESPACE, "svg");
	icon.classList.add(
		"lucide",
		"lucide-chevron-right",
		REASONING_CHEVRON_CLASS,
	);
	icon.setAttribute("aria-hidden", "true");
	icon.setAttribute("focusable", "false");
	icon.setAttribute("fill", "none");
	icon.setAttribute("height", "16");
	icon.setAttribute("stroke", "currentColor");
	icon.setAttribute("stroke-linecap", "round");
	icon.setAttribute("stroke-linejoin", "round");
	icon.setAttribute("stroke-width", "var(--astra-icon-stroke-width)");
	icon.setAttribute("viewBox", "0 0 24 24");
	icon.setAttribute("width", "16");
	icon.setAttribute("xmlns", SVG_NAMESPACE);

	const path = documentRef.createElementNS(SVG_NAMESPACE, "path");
	path.setAttribute("d", "m9 18 6-6-6-6");
	icon.appendChild(path);
	return icon;
}

function createReasoningSparkleIcon(documentRef: Document): SVGSVGElement {
	const icon = documentRef.createElementNS(SVG_NAMESPACE, "svg");
	icon.classList.add("lucide", "lucide-sparkle", REASONING_SPARKLE_CLASS);
	icon.setAttribute("aria-hidden", "true");
	icon.setAttribute("focusable", "false");
	icon.setAttribute("fill", "none");
	icon.setAttribute("height", "16");
	icon.setAttribute("stroke", "currentColor");
	icon.setAttribute("stroke-linecap", "round");
	icon.setAttribute("stroke-linejoin", "round");
	icon.setAttribute("stroke-width", "var(--astra-icon-stroke-width)");
	icon.setAttribute("viewBox", "0 0 24 24");
	icon.setAttribute("width", "16");
	icon.setAttribute("xmlns", SVG_NAMESPACE);

	const path = documentRef.createElementNS(SVG_NAMESPACE, "path");
	path.setAttribute(
		"d",
		"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
	);
	icon.appendChild(path);

	return icon;
}

function findContextBoundary(chatRoot: Element): HTMLDivElement | null {
	for (const child of Array.from(chatRoot.children)) {
		if (
			child instanceof HTMLDivElement &&
			child.id === CONTEXT_BOUNDARY_ID &&
			child.classList.contains(CONTEXT_BOUNDARY_CLASS)
		) {
			return child;
		}
	}

	return null;
}

function isContextBoundaryElement(element: Element): element is HTMLDivElement {
	return (
		element instanceof HTMLDivElement &&
		element.id === CONTEXT_BOUNDARY_ID &&
		element.classList.contains(CONTEXT_BOUNDARY_CLASS)
	);
}

function updateContextBoundaryCopy(boundary: HTMLDivElement) {
	const tagText = translateAstra("messageLayout.contextBoundary.tag");
	const titleText = translateAstra("messageLayout.contextBoundary.title");
	boundary.setAttribute("aria-label", `${tagText}: ${titleText}`);

	const tag = boundary.querySelector(`.${CONTEXT_BOUNDARY_TAG_CLASS}`);
	if (tag) {
		let icon = tag.querySelector(".lucide-messages-square");
		if (!icon) {
			icon = createContextBoundaryTagIcon(boundary.ownerDocument);
			tag.insertBefore(icon, tag.firstChild);
		}

		const textNode = icon.nextSibling;
		if (textNode?.nodeType === Node.TEXT_NODE) {
			if (textNode.textContent !== tagText) {
				textNode.textContent = tagText;
			}
		} else {
			icon.after(boundary.ownerDocument.createTextNode(tagText));
		}
	}

	const title = boundary.querySelector(`.${CONTEXT_BOUNDARY_TITLE_CLASS}`);
	if (title && title.textContent !== titleText) {
		title.textContent = titleText;
	}
}

export function createMessageHeaderLayoutFeature({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): MessageHeaderLayoutFeature {
	const trackedMessages = new Set<Element>();
	const states = new WeakMap<Element, MessageHeaderLayoutState>();
	const dateDividerStates = new Map<Element, DateDividerState>();
	const dateDividerElements = new Set<HTMLDivElement>();
	let observer: MutationObserver | null = null;
	let observerRoot: Element | null = null;
	let bodyClassObserver: MutationObserver | null = null;
	let syncFrameId: number | null = null;
	let eventSource: EventSourceLike | null = null;
	let eventListeners: Array<{
		eventName: string;
		listener: (...args: unknown[]) => void;
	}> = [];

	function isBodyClassEnabled(className: string): boolean {
		return Boolean(documentRef.body?.classList.contains(className));
	}

	function syncMessagePromptExclusion(message: Element) {
		const isExcluded = resolveMessageBooleanField(message, "is_system");
		if (isExcluded === true) {
			message.setAttribute(PROMPT_EXCLUDED_ATTRIBUTE, "true");
			return;
		}

		message.removeAttribute(PROMPT_EXCLUDED_ATTRIBUTE);
	}

	function shouldShowMetadataElement(
		className: MetadataClass,
		metadataElementState: MetadataElementState,
	): boolean {
		if (
			metadataElementState.originalHidden ||
			isBodyClassEnabled(METADATA_BODY_HIDE_CLASSES[className])
		) {
			return false;
		}

		if (
			metadataElementState.element.hidden &&
			!metadataElementState.hiddenByAstra
		) {
			return false;
		}

		return Boolean(metadataElementState.element.textContent?.trim());
	}

	function shouldShowTimestampMeta(state: MessageHeaderLayoutState): boolean {
		return Boolean(
			state.timestampMeta &&
			state.timestamp &&
			!isBodyClassEnabled("no-timestamps") &&
			state.timestamp.textContent?.trim(),
		);
	}

	function shouldShowModelIcons(): boolean {
		if (isBodyClassEnabled(MODEL_ICONS_DISABLED_BODY_CLASS)) {
			return false;
		}

		const context = resolveContextSafe();
		const powerUserSettings = isRecord(context?.powerUserSettings)
			? context.powerUserSettings
			: null;
		const setting = powerUserSettings?.timestamp_model_icon;

		if (typeof setting === "boolean") {
			return setting;
		}

		const legacySetting = powerUserSettings?.messageModelIconEnabled;
		if (typeof legacySetting === "boolean") {
			return legacySetting;
		}

		return true;
	}

	function setElementHidden(element: HTMLElement, hidden: boolean) {
		if (element.hidden !== hidden) {
			element.hidden = hidden;
		}
	}

	function getMetadataItemElement(
		state: MessageHeaderLayoutState,
		className: MetadataClass,
		metadataElement: HTMLDivElement,
	): HTMLDivElement {
		const existingItem = state.metadataItemElements.get(className);
		if (existingItem) {
			if (metadataElement.parentElement !== existingItem) {
				existingItem.appendChild(metadataElement);
			}
			return existingItem;
		}

		const item = createMetadataItem(documentRef, metadataElement);
		state.metadataItemElements.set(className, item);
		return item;
	}

	function getMetadataSeparatorElement(
		state: MessageHeaderLayoutState,
		index: number,
	): HTMLDivElement {
		const existingSeparator = state.metadataSeparators[index];
		if (existingSeparator) {
			return existingSeparator;
		}

		const separator = createMetadataSeparator(documentRef);
		state.metadataSeparators[index] = separator;
		return separator;
	}

	function appendMetadataValueNode(
		state: MessageHeaderLayoutState,
		nodes: Node[],
		valueNode: Node,
	) {
		if (nodes.length > 0) {
			const separatorIndex = Math.floor(nodes.length / 2);
			nodes.push(getMetadataSeparatorElement(state, separatorIndex));
		}
		nodes.push(valueNode);
	}

	function reconcileMetadataRowNodes(
		state: MessageHeaderLayoutState,
		nodes: Node[],
	) {
		const currentNodes = Array.from(state.metadataItems.childNodes);
		if (
			currentNodes.length === nodes.length &&
			currentNodes.every((node, index) => node === nodes[index])
		) {
			return;
		}

		state.metadataItems.replaceChildren(...nodes);
	}

	function syncMetadataRow(state: MessageHeaderLayoutState) {
		const metadataValueNodes: Node[] = [];
		for (const className of METADATA_CLASSES) {
			const metadataElementState = state.metadataElements.get(className);
			if (!metadataElementState) {
				continue;
			}

			if (shouldShowMetadataElement(className, metadataElementState)) {
				metadataElementState.hiddenByAstra = false;
				setElementHidden(metadataElementState.element, false);
				appendMetadataValueNode(
					state,
					metadataValueNodes,
					getMetadataItemElement(
						state,
						className,
						metadataElementState.element,
					),
				);
				continue;
			}

			metadataElementState.hiddenByAstra = true;
			setElementHidden(metadataElementState.element, true);
			if (
				metadataElementState.element.parentElement !==
				state.avatarWrapper
			) {
				state.avatarWrapper.appendChild(metadataElementState.element);
			}
		}

		if (state.timestampMeta && shouldShowTimestampMeta(state)) {
			appendMetadataValueNode(
				state,
				metadataValueNodes,
				state.timestampMeta,
			);
		} else {
			state.timestampMeta?.remove();
		}

		reconcileMetadataRowNodes(state, metadataValueNodes);
		setElementHidden(state.metadataItems, metadataValueNodes.length === 0);
		setElementHidden(state.metadata, metadataValueNodes.length === 0);
	}

	function applyMessageLayout(
		message: Element,
	): MessageHeaderLayoutState | null {
		const messageBlock = findDirectChildByClass(message, "mes_block");
		const avatarWrapper = findDirectChildByClass(
			message,
			"mesAvatarWrapper",
		);
		const name = findDirectChildByClass(messageBlock, "ch_name");
		if (!messageBlock || !avatarWrapper || !name) {
			return null;
		}

		const avatarPlaceholder = documentRef.createComment(
			"astra-mesHeader:avatar",
		);
		avatarWrapper.parentElement?.insertBefore(
			avatarPlaceholder,
			avatarWrapper,
		);

		const header = documentRef.createElement("div");
		header.className = HEADER_CLASS;
		header.dataset.astraComponent = "mes-header-layout";

		const nameWrapper = documentRef.createElement("div");
		nameWrapper.className = HEADER_NAME_CLASS;

		const identityLine = documentRef.createElement("div");
		identityLine.className = HEADER_IDENTITY_LINE_CLASS;

		const nameText = findNameTextElement(name);
		const nameTextWrapper = nameText
			? documentRef.createElement("div")
			: null;
		const nameTextPlaceholder = nameText
			? documentRef.createComment("astra-mesNameText:name_text")
			: null;
		if (nameText && nameTextWrapper && nameTextPlaceholder) {
			nameTextWrapper.className = NAME_TEXT_WRAPPER_CLASS;
			nameText.parentNode?.insertBefore(nameTextPlaceholder, nameText);
			nameTextWrapper.appendChild(nameText);
		}

		const metadata = documentRef.createElement("div");
		metadata.className = META_CLASS;
		metadata.dataset.astraComponent = "mes-metadata";

		const metadataItems = documentRef.createElement("div");
		metadataItems.className = META_ITEMS_CLASS;

		const nativeControls = documentRef.createElement("div");
		nativeControls.className = NATIVE_CONTROLS_CLASS;
		nativeControls.dataset.astraComponent = "mes-native-controls";
		const nativeControlStates: NativeControlState[] = [];
		for (const className of NATIVE_CONTROL_CLASSES) {
			const control = findDirectChildByClass(name, className);
			if (!control) {
				continue;
			}

			const placeholder = documentRef.createComment(
				`astra-mesNativeControls:${className}`,
			);
			control.parentElement?.insertBefore(placeholder, control);
			nativeControls.appendChild(control);
			nativeControlStates.push({ control, placeholder });
		}

		const timestamp = findTimestamp(message);
		const timestampOriginalHidden = timestamp?.hidden ?? null;
		const timestampOriginalText = timestamp?.textContent ?? null;
		const timestampOriginalTitle = timestamp?.getAttribute("title") ?? null;
		const timestampPlaceholder = timestamp
			? documentRef.createComment("astra-mesMeta:timestamp")
			: null;
		const timestampIconPlaceholder = timestamp
			? documentRef.createComment("astra-mesModel:timestamp-icon")
			: null;
		if (timestamp && timestampPlaceholder) {
			const timestampParent = timestamp.parentElement;
			timestampParent?.insertBefore(timestampPlaceholder, timestamp);
			if (timestampIconPlaceholder) {
				timestampParent?.insertBefore(
					timestampIconPlaceholder,
					timestamp.nextSibling,
				);
			}
		}

		const modelMeta = timestamp ? documentRef.createElement("div") : null;
		const timestampMeta = timestamp
			? documentRef.createElement("div")
			: null;
		if (timestamp && modelMeta && timestampMeta) {
			modelMeta.className = MODEL_META_CLASS;
			timestampMeta.className = TIMESTAMP_META_CLASS;
			timestampMeta.appendChild(timestamp);
		}

		message.classList.add(MESSAGE_CLASS);
		messageBlock.classList.add(BODY_CLASS);
		message.insertBefore(header, messageBlock);
		header.appendChild(avatarWrapper);
		header.appendChild(nameWrapper);
		nameWrapper.appendChild(identityLine);
		if (nameTextWrapper) {
			identityLine.appendChild(nameTextWrapper);
		}
		if (modelMeta) {
			identityLine.appendChild(modelMeta);
		}
		nameWrapper.appendChild(metadata);
		nameWrapper.appendChild(name);
		metadata.appendChild(metadataItems);
		messageBlock.appendChild(nativeControls);

		const metadataElements = new Map<MetadataClass, MetadataElementState>();
		for (const className of METADATA_CLASSES) {
			const metadataElement = findDirectChildByClass(
				avatarWrapper,
				className,
			);
			if (metadataElement) {
				metadataElements.set(className, {
					element: metadataElement,
					hiddenByAstra: false,
					originalHidden: metadataElement.hidden,
					originalText: metadataElement.textContent,
				});
			}
		}
		const metadataItemElements = new Map<MetadataClass, HTMLDivElement>();
		const metadataSeparators: HTMLDivElement[] = [];

		trackedMessages.add(message);
		const state = {
			avatarPlaceholder,
			avatarWrapper,
			header,
			identityLine,
			metadataElements,
			metadataItemElements,
			metadata,
			metadataItems,
			metadataSeparators,
			messageBlock,
			name,
			nameText,
			nameTextPlaceholder,
			nameTextWrapper,
			nameWrapper,
			nativeControls,
			nativeControlStates,
			modelLabel: null,
			modelMeta,
			timestamp,
			timestampIconPlaceholder,
			timestampMeta,
			timestampOriginalHidden,
			timestampOriginalText,
			timestampOriginalTitle,
			timestampPlaceholder,
		};
		states.set(message, state);
		syncMessageMetadata(message, state);
		return state;
	}

	function ensureModelLabel(
		state: MessageHeaderLayoutState,
	): HTMLSpanElement | null {
		if (!state.modelMeta) {
			return null;
		}

		if (state.modelLabel?.isConnected) {
			return state.modelLabel;
		}

		const modelLabel = documentRef.createElement("span");
		modelLabel.className = MODEL_LABEL_CLASS;
		state.modelLabel = modelLabel;
		return modelLabel;
	}

	function syncModelMetaPlacement(state: MessageHeaderLayoutState) {
		if (!state.modelMeta) {
			return;
		}

		if (state.nameTextWrapper?.isConnected) {
			if (
				state.modelMeta.parentElement !== state.identityLine ||
				state.nameTextWrapper.nextSibling !== state.modelMeta
			) {
				state.nameTextWrapper.after(state.modelMeta);
			}
			return;
		}

		if (
			state.modelMeta.parentElement !== state.identityLine ||
			state.identityLine.firstElementChild !== state.modelMeta
		) {
			state.identityLine.insertBefore(
				state.modelMeta,
				state.identityLine.firstChild,
			);
		}
	}

	function syncTimestampDisplay(
		message: Element,
		state: MessageHeaderLayoutState,
	) {
		if (!state.timestamp) {
			return;
		}

		if (!isBodyClassEnabled("no-timestamps") && state.timestamp.hidden) {
			state.timestamp.hidden = false;
		}

		const resolution = resolveMessageTimestamp(message, state);
		if (!resolution) {
			restoreTimestampDisplay(state);
			if (
				!isBodyClassEnabled("no-timestamps") &&
				state.timestamp.hidden
			) {
				state.timestamp.hidden = false;
			}
			return;
		}

		if (state.timestamp.textContent !== resolution.timeLabel) {
			state.timestamp.textContent = resolution.timeLabel;
		}
		if (state.timestamp.getAttribute("title") !== resolution.title) {
			state.timestamp.setAttribute("title", resolution.title);
		}
	}

	function syncMessageMetadata(
		message: Element,
		state: MessageHeaderLayoutState,
	) {
		if (!state.timestamp || !state.timestampMeta || !state.modelMeta) {
			syncMetadataRow(state);
			return;
		}

		syncModelMetaPlacement(state);
		syncTimestampDisplay(message, state);

		if (state.timestamp.parentElement !== state.timestampMeta) {
			state.timestampMeta.appendChild(state.timestamp);
		}

		const timestampIcon = findTimestampIcon(message, state);
		const modelLabelText = resolveMessageModelLabelText(
			message,
			timestampIcon,
		);
		if (!timestampIcon || !modelLabelText) {
			setElementHidden(state.modelMeta, true);
			state.modelLabel?.remove();
			syncMetadataRow(state);
			return;
		}

		if (timestampIcon.parentElement !== state.modelMeta) {
			state.modelMeta.insertBefore(
				timestampIcon,
				state.modelMeta.firstChild,
			);
		}

		const modelLabel = ensureModelLabel(state);
		if (!modelLabel) {
			return;
		}

		if (modelLabel.textContent !== modelLabelText) {
			modelLabel.textContent = modelLabelText;
			modelLabel.title = modelLabelText;
		}

		if (timestampIcon.nextSibling !== modelLabel) {
			timestampIcon.after(modelLabel);
		}
		setElementHidden(state.modelMeta, !shouldShowModelIcons());
		syncMetadataRow(state);
	}

	function ensureReasoningChevron(reasoningHeader: Element) {
		const existingChevrons = Array.from(reasoningHeader.children).filter(
			(child) => child.classList.contains(REASONING_CHEVRON_CLASS),
		);
		const chevron =
			existingChevrons[0] ?? createReasoningChevronIcon(documentRef);

		for (const duplicateChevron of existingChevrons.slice(1)) {
			duplicateChevron.remove();
		}

		const title = findDirectElementByClass(
			reasoningHeader,
			REASONING_HEADER_TITLE_CLASS,
		);
		if (title) {
			if (title.nextSibling !== chevron) {
				title.after(chevron);
			}
			return;
		}

		if (chevron.parentElement !== reasoningHeader) {
			reasoningHeader.appendChild(chevron);
		}
	}

	function ensureReasoningSparkle(reasoningHeader: Element) {
		const existingSparkles = Array.from(reasoningHeader.children).filter(
			(child) => child.classList.contains(REASONING_SPARKLE_CLASS),
		);
		const sparkle =
			existingSparkles[0] ?? createReasoningSparkleIcon(documentRef);

		for (const duplicateSparkle of existingSparkles.slice(1)) {
			duplicateSparkle.remove();
		}

		const title = findDirectElementByClass(
			reasoningHeader,
			REASONING_HEADER_TITLE_CLASS,
		);
		if (title) {
			if (title.previousSibling !== sparkle) {
				reasoningHeader.insertBefore(sparkle, title);
			}
			return;
		}

		if (reasoningHeader.firstChild !== sparkle) {
			reasoningHeader.insertBefore(sparkle, reasoningHeader.firstChild);
		}
	}

	function syncReasoningIcons(message: Element) {
		for (const reasoningHeader of Array.from(
			message.querySelectorAll(`.${REASONING_HEADER_CLASS}`),
		)) {
			ensureReasoningSparkle(reasoningHeader);
			ensureReasoningChevron(reasoningHeader);
		}
	}

	function syncMessageLayout(message: Element) {
		syncMessagePromptExclusion(message);
		syncReasoningIcons(message);

		const existingState = states.get(message);
		if (existingState) {
			syncMessageMetadata(message, existingState);
			return;
		}

		applyMessageLayout(message);
	}

	function removeDateDividers() {
		documentRef
			.querySelectorAll(`#chat .${DATE_DIVIDER_CLASS}`)
			.forEach((divider) => divider.remove());
		dateDividerStates.clear();
		dateDividerElements.clear();
	}

	function removePromptExclusionAttributes() {
		documentRef
			.querySelectorAll(`#chat .mes[${PROMPT_EXCLUDED_ATTRIBUTE}]`)
			.forEach((message) => {
				message.removeAttribute(PROMPT_EXCLUDED_ATTRIBUTE);
			});
	}

	function removeReasoningIcons() {
		documentRef
			.querySelectorAll(
				`.${REASONING_SPARKLE_CLASS}, .${REASONING_CHEVRON_CLASS}`,
			)
			.forEach((icon) => icon.remove());
	}

	function createDateDividerState(
		resolution: MessageTimestampResolution,
	): DateDividerState {
		const divider = createDateDivider(documentRef, resolution.dateLabel);
		dateDividerElements.add(divider);
		const state = {
			dateLabel: resolution.dateLabel,
			dayKey: resolution.dayKey,
			divider,
		};
		updateDateDivider(state, resolution);
		return state;
	}

	function reuseDateDividerState(
		message: Element,
		resolution: MessageTimestampResolution,
	): DateDividerState {
		const existingState = dateDividerStates.get(message);
		if (existingState && dateDividerElements.has(existingState.divider)) {
			updateDateDivider(existingState, resolution);
			return existingState;
		}

		const previousElement = message.previousElementSibling;
		if (
			previousElement &&
			isDateDividerElement(previousElement) &&
			dateDividerElements.has(previousElement)
		) {
			const reusedState = {
				dateLabel: resolution.dateLabel,
				dayKey: resolution.dayKey,
				divider: previousElement,
			};
			updateDateDivider(reusedState, resolution);
			return reusedState;
		}

		if (previousElement && isContextBoundaryElement(previousElement)) {
			const boundaryPreviousElement =
				previousElement.previousElementSibling;
			if (
				boundaryPreviousElement &&
				isDateDividerElement(boundaryPreviousElement) &&
				dateDividerElements.has(boundaryPreviousElement)
			) {
				const reusedState = {
					dateLabel: resolution.dateLabel,
					dayKey: resolution.dayKey,
					divider: boundaryPreviousElement,
				};
				updateDateDivider(reusedState, resolution);
				return reusedState;
			}
		}

		return createDateDividerState(resolution);
	}

	function isDateDividerPlacedForMessage(
		divider: HTMLDivElement,
		message: Element,
	): boolean {
		if (divider.nextSibling === message) {
			return true;
		}

		const nextSibling = divider.nextSibling;
		return (
			nextSibling instanceof Element &&
			isContextBoundaryElement(nextSibling) &&
			nextSibling.nextSibling === message
		);
	}

	function removeUnusedDateDividers(usedDividers: Set<HTMLDivElement>) {
		for (const divider of Array.from(dateDividerElements)) {
			if (usedDividers.has(divider)) {
				continue;
			}

			divider.remove();
			dateDividerElements.delete(divider);
		}

		documentRef
			.querySelectorAll(`#chat > .${DATE_DIVIDER_CLASS}`)
			.forEach((divider) => {
				if (
					divider instanceof HTMLDivElement &&
					!usedDividers.has(divider)
				) {
					divider.remove();
				}
			});
	}

	function syncDateDividers() {
		const chatRoot = documentRef.getElementById("chat");
		if (!chatRoot) {
			return;
		}

		const nextDateDividerStates = new Map<Element, DateDividerState>();
		const usedDividers = new Set<HTMLDivElement>();
		let previousDayKey = "";
		for (const child of Array.from(chatRoot.children)) {
			if (
				!child.classList.contains("mes") ||
				!child.hasAttribute("mesid")
			) {
				continue;
			}

			const staleState = dateDividerStates.get(child);
			const resolution = resolveMessageTimestamp(
				child,
				states.get(child) ?? null,
			);
			if (!resolution) {
				continue;
			}

			if (resolution.dayKey === previousDayKey) {
				if (staleState && !usedDividers.has(staleState.divider)) {
					staleState.divider.remove();
					dateDividerElements.delete(staleState.divider);
				}
				continue;
			}

			previousDayKey = resolution.dayKey;
			const dateDividerState = reuseDateDividerState(child, resolution);
			nextDateDividerStates.set(child, dateDividerState);
			usedDividers.add(dateDividerState.divider);

			if (
				!isDateDividerPlacedForMessage(dateDividerState.divider, child)
			) {
				chatRoot.insertBefore(dateDividerState.divider, child);
			}
		}

		removeUnusedDateDividers(usedDividers);
		dateDividerStates.clear();
		for (const [message, state] of nextDateDividerStates) {
			dateDividerStates.set(message, state);
		}
	}

	function removeContextBoundary() {
		const chatRoot = documentRef.getElementById("chat");
		if (!chatRoot) {
			return;
		}

		for (const child of Array.from(chatRoot.children)) {
			if (isContextBoundaryElement(child)) {
				child.remove();
			}
		}
	}

	function syncContextBoundary() {
		const chatRoot = documentRef.getElementById("chat");
		if (!chatRoot) {
			return;
		}

		const contextMessage = Array.from(chatRoot.children).find(
			(child) =>
				child.classList.contains("mes") &&
				child.classList.contains("lastInContext") &&
				child.hasAttribute("mesid"),
		);
		const existingBoundary = findContextBoundary(chatRoot);

		if (!contextMessage) {
			existingBoundary?.remove();
			return;
		}

		const boundary = existingBoundary ?? createContextBoundary(documentRef);
		updateContextBoundaryCopy(boundary);

		for (const child of Array.from(chatRoot.children)) {
			if (child !== boundary && isContextBoundaryElement(child)) {
				child.remove();
			}
		}

		if (boundary.nextSibling !== contextMessage) {
			chatRoot.insertBefore(boundary, contextMessage);
		}
	}

	function syncMessages() {
		const activeObserver = observer;
		if (activeObserver && observerRoot) {
			activeObserver.disconnect();
		}

		documentRef
			.querySelectorAll("#chat .mes[mesid]")
			.forEach(syncMessageLayout);
		syncDateDividers();
		syncContextBoundary();

		if (activeObserver && observerRoot) {
			activeObserver.observe(observerRoot, CHAT_OBSERVER_OPTIONS);
		}
	}

	function restoreMessageLayout(message: Element) {
		const state = states.get(message);
		if (!state) {
			return;
		}

		const {
			avatarPlaceholder,
			avatarWrapper,
			header,
			metadataElements,
			metadata,
			messageBlock,
			modelLabel,
			modelMeta,
			name,
			nameText,
			nameTextPlaceholder,
			nameTextWrapper,
			nativeControls,
			nativeControlStates,
			timestamp,
			timestampIconPlaceholder,
			timestampPlaceholder,
		} = state;
		restoreTimestampDisplay(state);

		if (nameText) {
			if (nameTextPlaceholder?.parentNode) {
				nameTextPlaceholder.parentNode.insertBefore(
					nameText,
					nameTextPlaceholder,
				);
				nameTextPlaceholder.remove();
			} else if (nameText.parentElement !== name) {
				name.insertBefore(nameText, name.firstChild);
			}
		} else {
			nameTextPlaceholder?.remove();
		}
		nameTextWrapper?.remove();

		for (const { control, placeholder } of nativeControlStates) {
			if (placeholder.parentElement) {
				placeholder.parentElement.insertBefore(control, placeholder);
				placeholder.remove();
			} else {
				name.appendChild(control);
			}
		}

		if (name && messageBlock) {
			messageBlock.insertBefore(name, messageBlock.firstChild);
		}

		for (const className of METADATA_CLASSES) {
			const metadataElementState = metadataElements.get(className);
			if (metadataElementState) {
				metadataElementState.element.textContent =
					metadataElementState.originalText;
				metadataElementState.element.hidden =
					metadataElementState.originalHidden;
				avatarWrapper.appendChild(metadataElementState.element);
			}
		}

		const timestampIcon = findTimestampIcon(message, state, {
			requireInjectedSvg: false,
		});
		if (timestampPlaceholder?.parentElement) {
			if (timestamp) {
				timestampPlaceholder.parentElement.insertBefore(
					timestamp,
					timestampPlaceholder,
				);
			}
			timestampPlaceholder.remove();
		}
		if (timestampIconPlaceholder?.parentElement) {
			if (timestampIcon) {
				timestampIconPlaceholder.parentElement.insertBefore(
					timestampIcon,
					timestampIconPlaceholder,
				);
			}
			timestampIconPlaceholder.remove();
		} else if (timestampIcon && timestamp?.parentElement) {
			timestamp.after(timestampIcon);
		}
		modelLabel?.remove();
		modelMeta?.remove();
		message.removeAttribute(PROMPT_EXCLUDED_ATTRIBUTE);

		if (avatarPlaceholder.parentElement) {
			avatarPlaceholder.parentElement.insertBefore(
				avatarWrapper,
				avatarPlaceholder,
			);
			avatarPlaceholder.remove();
		} else if (messageBlock) {
			message.insertBefore(avatarWrapper, messageBlock);
		} else {
			message.appendChild(avatarWrapper);
		}

		nativeControls.remove();
		metadata.remove();
		header.remove();
		message.classList.remove(MESSAGE_CLASS);
		messageBlock.classList.remove(BODY_CLASS);
		states.delete(message);
		trackedMessages.delete(message);
	}

	function unmount() {
		observer?.disconnect();
		observer = null;
		observerRoot = null;
		unbindEventListeners();
		bodyClassObserver?.disconnect();
		bodyClassObserver = null;
		if (syncFrameId !== null) {
			const view = documentRef.defaultView;
			if (typeof view?.cancelAnimationFrame === "function") {
				view.cancelAnimationFrame(syncFrameId);
			}
			syncFrameId = null;
		}
		removeContextBoundary();
		removeDateDividers();
		removePromptExclusionAttributes();
		removeReasoningIcons();
		for (const message of Array.from(trackedMessages)) {
			restoreMessageLayout(message);
		}
	}

	function scheduleSyncMessages() {
		if (syncFrameId !== null) {
			return;
		}

		const view = documentRef.defaultView;
		if (typeof view?.requestAnimationFrame === "function") {
			syncFrameId = view.requestAnimationFrame(() => {
				syncFrameId = null;
				syncMessages();
			});
			return;
		}

		syncMessages();
	}

	function unbindEventListeners() {
		if (eventSource) {
			for (const { eventName, listener } of eventListeners) {
				eventSource.removeListener(eventName, listener);
			}
		}

		eventSource = null;
		eventListeners = [];
	}

	function bindEventListeners() {
		unbindEventListeners();

		const context = resolveContextSafe();
		const nextEventSource = isEventSourceLike(context?.eventSource)
			? context.eventSource
			: null;
		if (!nextEventSource) {
			return;
		}

		const eventTypes = resolveEventTypes(context);
		const eventNames = Array.from(
			new Set(
				LAYOUT_SYNC_EVENT_KEYS.map(
					(eventKey) => eventTypes[eventKey],
				).filter(
					(eventName): eventName is string =>
						typeof eventName === "string" && eventName.length > 0,
				),
			),
		);

		eventSource = nextEventSource;
		eventListeners = eventNames.map((eventName) => {
			const listener = () => {
				scheduleSyncMessages();
			};
			nextEventSource.on(eventName, listener);
			return { eventName, listener };
		});
	}

	return {
		dispose: unmount,
		mount() {
			if (observer) {
				syncMessages();
				return;
			}

			syncMessages();
			bindEventListeners();

			observerRoot =
				documentRef.getElementById("chat") ?? documentRef.body;
			if (!observerRoot || !documentRef.defaultView?.MutationObserver) {
				return;
			}

			observer = new documentRef.defaultView.MutationObserver(
				(mutations) => {
					if (
						shouldScheduleMessageLayoutSyncForMutations(
							mutations,
						)
					) {
						scheduleSyncMessages();
					}
				},
			);
			observer.observe(observerRoot, CHAT_OBSERVER_OPTIONS);

			if (documentRef.body) {
				bodyClassObserver =
					new documentRef.defaultView.MutationObserver(() => {
						scheduleSyncMessages();
					});
				bodyClassObserver.observe(documentRef.body, {
					attributeFilter: ["class"],
					attributes: true,
				});
			}
		},
		unmount,
	};
}
