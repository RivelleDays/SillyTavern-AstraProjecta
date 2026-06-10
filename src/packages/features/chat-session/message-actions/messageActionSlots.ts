export interface MessageActionSlots {
	bottomContainer: HTMLDivElement;
	container: HTMLDivElement;
}

const MES_ACTIONS_CLASS = "astra-mesActions";
const LEGACY_MESSAGE_ACTIONS_CLASS = "astra-messageActions";
const MES_ACTIONS_COMPONENT = "mes-actions";
const LEGACY_MESSAGE_ACTIONS_COMPONENT = "message-actions";
const MES_ACTIONS_SLOT_ATTRIBUTE = "data-astra-slot";
const LEGACY_MESSAGE_ACTIONS_ANCHOR_ATTRIBUTE = "data-astra-anchor";
const MES_ACTIONS_FOOTER_SLOT = "footer";
const LEGACY_MESSAGE_ACTIONS_BOTTOM_ANCHOR = "bottom";
const LEGACY_MESSAGE_ACTIONS_TOP_ANCHOR = "top";

function findDirectChildByClass(
	parent: Element,
	className: string,
): HTMLDivElement | null {
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

function findDirectMessageActionsContainer(
	parent: Element | null,
	slot: typeof MES_ACTIONS_FOOTER_SLOT,
	{ allowLegacy = false }: { allowLegacy?: boolean } = {},
): HTMLDivElement | null {
	if (!parent) {
		return null;
	}

	for (const child of Array.from(parent.children)) {
		if (!(child instanceof HTMLDivElement)) {
			continue;
		}

		const isCurrentContainer =
			child.classList.contains(MES_ACTIONS_CLASS) &&
			child.getAttribute("data-astra-component") ===
				MES_ACTIONS_COMPONENT;
		const existingSlot = child.getAttribute(MES_ACTIONS_SLOT_ATTRIBUTE);
		if (isCurrentContainer && existingSlot === slot) {
			return child;
		}

		if (!allowLegacy) {
			continue;
		}

		const isLegacyContainer =
			child.classList.contains(LEGACY_MESSAGE_ACTIONS_CLASS) &&
			child.getAttribute("data-astra-component") ===
				LEGACY_MESSAGE_ACTIONS_COMPONENT;
		const legacyAnchor = child.getAttribute(
			LEGACY_MESSAGE_ACTIONS_ANCHOR_ATTRIBUTE,
		);
		if (
			isLegacyContainer &&
			(legacyAnchor === LEGACY_MESSAGE_ACTIONS_BOTTOM_ANCHOR ||
				!legacyAnchor)
		) {
			return child;
		}
	}

	return null;
}

function ensureFooterMessageActionsContainer(parent: Element): HTMLDivElement {
	const existingContainer = findDirectMessageActionsContainer(
		parent,
		MES_ACTIONS_FOOTER_SLOT,
		{
			allowLegacy: true,
		},
	);
	const container =
		existingContainer ?? parent.ownerDocument.createElement("div");

	container.classList.remove(LEGACY_MESSAGE_ACTIONS_CLASS);
	container.classList.add(MES_ACTIONS_CLASS);
	container.dataset.astraComponent = MES_ACTIONS_COMPONENT;
	container.setAttribute(MES_ACTIONS_SLOT_ATTRIBUTE, MES_ACTIONS_FOOTER_SLOT);
	container.removeAttribute(LEGACY_MESSAGE_ACTIONS_ANCHOR_ATTRIBUTE);

	if (container.parentElement !== parent) {
		parent.appendChild(container);
	}

	return container;
}

function removeEmptyLegacyTopContainer(messageElement: Element) {
	const nameTextParent =
		messageElement.querySelector(".name_text")?.parentElement;
	if (!nameTextParent) {
		return;
	}

	for (const child of Array.from(nameTextParent.children)) {
		if (
			child instanceof HTMLDivElement &&
			child.classList.contains(LEGACY_MESSAGE_ACTIONS_CLASS) &&
			child.getAttribute("data-astra-component") ===
				LEGACY_MESSAGE_ACTIONS_COMPONENT &&
			child.getAttribute(LEGACY_MESSAGE_ACTIONS_ANCHOR_ATTRIBUTE) ===
				LEGACY_MESSAGE_ACTIONS_TOP_ANCHOR &&
			child.childElementCount === 0
		) {
			child.remove();
		}
	}
}

function placeFooterContainer(
	messageElement: Element,
	container: HTMLDivElement,
) {
	const messageBlock = findDirectChildByClass(messageElement, "mes_block");
	const reference = messageBlock;

	if (container.parentElement !== messageElement) {
		if (reference?.parentElement === messageElement) {
			messageElement.insertBefore(container, reference.nextSibling);
			return;
		}

		messageElement.appendChild(container);
		return;
	}

	if (
		reference?.parentElement === messageElement &&
		reference.nextSibling !== container
	) {
		messageElement.insertBefore(container, reference.nextSibling);
	}
}

function ensureMessageActionsContainer(
	messageElement: Element,
): MessageActionSlots {
	removeEmptyLegacyTopContainer(messageElement);

	const existingBottomContainer = findDirectMessageActionsContainer(
		messageElement,
		MES_ACTIONS_FOOTER_SLOT,
		{
			allowLegacy: true,
		},
	);
	const messageBlock = findDirectChildByClass(messageElement, "mes_block");
	const legacyNestedContainer = findDirectMessageActionsContainer(
		messageBlock,
		MES_ACTIONS_FOOTER_SLOT,
		{
			allowLegacy: true,
		},
	);
	const bottomContainer =
		existingBottomContainer ??
		legacyNestedContainer ??
		ensureFooterMessageActionsContainer(messageElement);

	bottomContainer.classList.remove(LEGACY_MESSAGE_ACTIONS_CLASS);
	bottomContainer.classList.add(MES_ACTIONS_CLASS);
	bottomContainer.dataset.astraComponent = MES_ACTIONS_COMPONENT;
	bottomContainer.setAttribute(
		MES_ACTIONS_SLOT_ATTRIBUTE,
		MES_ACTIONS_FOOTER_SLOT,
	);
	bottomContainer.removeAttribute(LEGACY_MESSAGE_ACTIONS_ANCHOR_ATTRIBUTE);
	placeFooterContainer(messageElement, bottomContainer);

	return {
		bottomContainer,
		container: bottomContainer,
	};
}

function isEmptyElement(element: Element | null): boolean {
	return Boolean(element && element.childElementCount === 0);
}

export function ensureMessageActionSlots(
	messageElement: Element | null,
): MessageActionSlots | null {
	if (!messageElement) {
		return null;
	}

	return ensureMessageActionsContainer(messageElement);
}

export function ensureMessageActionTemplateSlots(
	documentRef: Document = document,
): MessageActionSlots | null {
	const templateMessage = documentRef.querySelector(
		"#message_template > .mes",
	);
	if (!templateMessage) {
		return null;
	}

	return ensureMessageActionsContainer(templateMessage);
}

export function cleanupMessageActionSlots(
	actionHost: HTMLElement | null,
): void {
	if (!actionHost) {
		return;
	}

	const removableClasses = new Set([
		"astra-mesActions__leftDefault",
		"astra-mesActions__left",
		"astra-mesActions__historyHost",
		"astra-mesActions__moreHost",
		"astra-mesActions__revisionHost",
		"astra-mesActions__rightDefault",
		"astra-mesActions__right",
		"astra-mesActions__swipeHost",
		"astra-messageActions__leftDefault",
		"astra-messageActions__left",
		"astra-messageActions__historyHost",
		"astra-messageActions__moreHost",
		"astra-messageActions__revisionHost",
		"astra-messageActions__rightDefault",
		"astra-messageActions__right",
		"astra-messageActions__swipeHost",
	]);
	let current: Element | null = actionHost.parentElement;

	actionHost.remove();

	while (current) {
		const parent = current.parentElement;
		const isActionContainer =
			(current.classList.contains(MES_ACTIONS_CLASS) &&
				current.getAttribute("data-astra-component") ===
					MES_ACTIONS_COMPONENT) ||
			(current.classList.contains(LEGACY_MESSAGE_ACTIONS_CLASS) &&
				current.getAttribute("data-astra-component") ===
					LEGACY_MESSAGE_ACTIONS_COMPONENT);
		const isRemovableSlot = Array.from(removableClasses).some((className) =>
			current?.classList.contains(className),
		);

		if ((isActionContainer || isRemovableSlot) && isEmptyElement(current)) {
			current.remove();
			current = parent;
			continue;
		}

		break;
	}
}
