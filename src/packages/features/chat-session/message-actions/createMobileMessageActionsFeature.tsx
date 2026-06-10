import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";

import {
	type ChatMessageRevisionHistoryItem,
	type ChatMessageRevisionHistoryStore,
	createChatMessageRevisionHistoryStore,
} from "@/packages/core/st/chatMessageRevisionHistory";
import {
	type ChatMessageRevisionStore,
	createChatMessageRevisionStore,
} from "@/packages/core/st/chatMessageRevision";
import {
	type ChatMessageSwipeStore,
	createChatMessageSwipeStore,
} from "@/packages/core/st/chatMessageSwipe";
import {
	type ChatMessageDeletionKind,
	readChatMessageDeletionSupport,
} from "@/packages/core/st/chatMessageDeletion";
import {
	copyChatMessageFromDraft,
	moveChatMessage,
	readChatMessageEditDraft,
	saveChatMessageEdit,
	type ChatMessageMoveDirection,
} from "@/packages/core/st/chatMessageEdit";
import { translateAstra } from "@/packages/core/i18n";
import { getStContext } from "@/packages/core/st/context";
import { isRecord } from "@/packages/core/st/shared";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	Delete,
	Ellipsis,
	Eye,
	EyeOff,
	MessageCircleX,
	PencilLine,
} from "@/components/ui/shared/icons";
import type { LucideIcon } from "@/components/ui/shared/icons";
import {
	resolveMessageModelIconKey,
	resolveMessageModelLabel,
} from "@/packages/features/chat-session/messageModelMetadata";
import {
	cleanupMessageActionSlots,
	ensureMessageActionSlots,
} from "@/packages/features/chat-session/message-actions/messageActionSlots";
import {
	MoreActionsDrawer,
	type MessageActionsTarget,
	type MoreActionsDrawerActionsConfig,
} from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import {
	MessageExtraActionsDrawer,
	type MessageExtraActionsDrawerAction,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionsDrawer";
import type { MessageExtraActionItem } from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionItem";
import {
	MessageDeleteConfirmationDrawer,
	type MessageDeleteConfirmationDrawerState,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageDeleteConfirmationDrawer";
import {
	MessageEditDrawer,
	type MessageEditDrawerDraft,
	type MessageEditDrawerSubmitDraft,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageEditDrawer";
import { createMessageContentSnapshot } from "@/packages/features/chat-session/message-actions/more-actions/messageContentSnapshot";
import {
	resolveNativeExtraMessageActions,
	triggerNativeExtraMessageAction,
	type NativeExtraMessageAction,
} from "@/packages/features/chat-session/message-actions/more-actions/nativeExtraMessageActions";
import { RevisionBar } from "@/packages/features/chat-session/message-actions/RevisionBar";
import { RevisionHistoryDrawer } from "@/packages/features/chat-session/message-actions/revision-history/RevisionHistoryDrawer";
import { SwipePager } from "@/packages/features/chat-session/message-actions/SwipePager";
import {
	getAstraProjectaPortalContainer,
	markAstraProjectaUiRoot,
} from "@/packages/core/runtime/uiScope";

export interface MobileMessageActionsFeature {
	dispose(): void;
	mount(): void;
	unmount(): void;
}

interface LoadedMessageElement {
	messageElement: Element;
	messageId: number;
}

type MessageActionsContextLike = Record<string, unknown> & {
	chat?: unknown;
};

type MessageActionsChatMessageLike = Record<string, unknown> & {
	extra?: unknown;
	is_system?: unknown;
	is_user?: unknown;
	name?: unknown;
	swipe_id?: unknown;
	swipes?: unknown;
};

type RevisionSnapshot = ReturnType<ChatMessageRevisionStore["getSnapshot"]>;
type SwipeSnapshot = ReturnType<ChatMessageSwipeStore["getSnapshot"]>;

const MESSAGE_TEXT_LONG_PRESS_DURATION_MS = 240;
const MESSAGE_TEXT_LONG_PRESS_MOVE_THRESHOLD_PX = 12;
const MESSAGE_TEXT_SUPPRESS_ACTIVATION_MS = 500;
const MESSAGE_HEADER_ACTIONS_CLASS = "astra-mesHeaderActions";
const MESSAGE_HEADER_ACTIONS_COMPONENT = "mes-header-actions";

interface HeaderActionRootState {
	host: HTMLDivElement;
	messageElement: Element;
	root: Root;
}

interface MessageTextLongPressState {
	clientX: number;
	clientY: number;
	messageElement: Element;
	messageId: number;
	pointerId: number;
	timerId: number;
}

function MessageHeaderActions({
	onEdit,
	onMore,
}: {
	onEdit(): void;
	onMore(): void;
}) {
	return (
		<>
			<button
				aria-label={translateAstra("messageActions.header.edit.aria")}
				className="astra-mesHeaderActions__button astra-mesHeaderActions__button--edit"
				type="button"
				onClick={onEdit}
			>
				<UiIcon aria-hidden={true} icon={PencilLine} size="sm" />
			</button>
			<button
				aria-label={translateAstra("messageActions.header.more.aria")}
				className="astra-mesHeaderActions__button astra-mesHeaderActions__button--more"
				type="button"
				onClick={onMore}
			>
				<UiIcon aria-hidden={true} icon={Ellipsis} size="sm" />
			</button>
		</>
	);
}

function MessageFooterActions({
	historyAction,
	onContinue,
	onRegenerate,
	onSwipeNext,
	onSwipePrevious,
	onUndo,
	revisionSnapshot,
	swipeSnapshot,
}: {
	historyAction: { disabled?: boolean; onClick(): void } | null;
	onContinue(): void;
	onRegenerate(): void;
	onSwipeNext(): void;
	onSwipePrevious(): void;
	onUndo(): void;
	revisionSnapshot: RevisionSnapshot | null;
	swipeSnapshot: SwipeSnapshot | null;
}) {
	return (
		<>
			{revisionSnapshot || historyAction ? (
				<RevisionBar
					canContinue={revisionSnapshot?.canContinue === true}
					canRegenerate={revisionSnapshot?.canRegenerate === true}
					canUndo={revisionSnapshot?.canUndo === true}
					historyAction={historyAction ?? undefined}
					isBusy={revisionSnapshot?.isBusy === true}
					onContinue={onContinue}
					onRegenerate={onRegenerate}
					onUndo={onUndo}
				/>
			) : null}
			{swipeSnapshot ? (
				<SwipePager
					canSwipeNext={swipeSnapshot.canSwipeNext}
					canSwipePrevious={swipeSnapshot.canSwipePrevious}
					currentIndex={swipeSnapshot.currentIndex}
					isNativeSwipeBusy={swipeSnapshot.isNativeSwipeBusy}
					onNext={onSwipeNext}
					onPrevious={onSwipePrevious}
					total={swipeSnapshot.total}
				/>
			) : null}
		</>
	);
}

function resolveContextSafe(): MessageActionsContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context)
			? (context as MessageActionsContextLike)
			: null;
	} catch {
		return null;
	}
}

function asTrimmedString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function asChatMessage(value: unknown): MessageActionsChatMessageLike | null {
	return isRecord(value) ? (value as MessageActionsChatMessageLike) : null;
}

function asIndex(value: unknown): number {
	const numericValue =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number.parseInt(value, 10)
				: 0;

	return Number.isInteger(numericValue) ? numericValue : 0;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value !== "string") {
		return undefined;
	}

	const normalizedValue = value.trim().toLowerCase();
	if (normalizedValue === "true") {
		return true;
	}
	if (normalizedValue === "false") {
		return false;
	}

	return undefined;
}

function clampIndex(index: number, total: number): number {
	return Math.min(total - 1, Math.max(0, index));
}

function resolveChatMessage(
	context: MessageActionsContextLike | null,
	messageId: number,
): MessageActionsChatMessageLike | null {
	const chat = Array.isArray(context?.chat) ? context.chat : [];
	return asChatMessage(chat[messageId]);
}

function resolveMessageDisplayId(
	messageElement: Element,
	messageId: number,
): string {
	const domText = messageElement.querySelector(".mesIDDisplay")?.textContent;
	const normalizedDomText = asTrimmedString(domText);

	return normalizedDomText || `#${messageId}`;
}

function resolveAvatarUrl(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
): string {
	const image = messageElement.querySelector(
		".mesAvatarWrapper img, .mes_avatar img, .avatar img",
	);
	if (image instanceof HTMLImageElement) {
		const imageUrl =
			asTrimmedString(image.getAttribute("src")) ||
			asTrimmedString(image.currentSrc) ||
			asTrimmedString(image.src);
		if (imageUrl) {
			return imageUrl;
		}
	}

	const candidates = [
		message?.avatarUrl,
		message?.avatar,
		message?.character_avatar,
		message?.ch_avatar,
		message?.img,
		message?.avatar_url,
		message?.avatarId,
		message?.avatar_file,
		message?.avatarFile,
	];

	return candidates.map(asTrimmedString).find(Boolean) ?? "";
}

function resolveDomSenderName(messageElement: Element): string {
	const nameText = asTrimmedString(
		messageElement.querySelector(".name_text")?.textContent,
	);
	if (nameText) {
		return nameText;
	}

	const nameElement = messageElement.querySelector(".ch_name");
	if (!nameElement) {
		return "";
	}

	const clone = nameElement.cloneNode(true);
	if (!(clone instanceof Element)) {
		return "";
	}

	clone
		.querySelectorAll(
			".astra-mesModel, .timestamp, .timestamp-icon, .mes_buttons",
		)
		.forEach((element) => element.remove());
	return asTrimmedString(clone.textContent);
}

function resolveSenderName(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
): string {
	const messageName = asTrimmedString(message?.name);
	if (messageName) {
		return messageName;
	}

	const domName = resolveDomSenderName(messageElement);
	if (domName) {
		return domName;
	}

	if (message?.is_system === true) {
		return "System";
	}

	return message?.is_user === true ? "User" : "Character";
}

function resolveElementText(messageElement: Element, selector: string): string {
	return asTrimmedString(messageElement.querySelector(selector)?.textContent);
}

function resolveTimestamp(messageElement: Element): string {
	return (
		asTrimmedString(messageElement.getAttribute("timestamp")) ||
		resolveElementText(messageElement, ".timestamp")
	);
}

function scrubInertTimestampIconElement(element: Element) {
	const elements = [element, ...Array.from(element.querySelectorAll("*"))];
	for (const currentElement of elements) {
		currentElement.removeAttribute("id");
		for (const attribute of Array.from(currentElement.attributes)) {
			if (attribute.name.toLowerCase().startsWith("on")) {
				currentElement.removeAttribute(attribute.name);
			}
		}
	}
}

function cloneTimestampIconHtml(timestampIcon: Element): string {
	const clonedIcon = timestampIcon.cloneNode(true);
	if (!(clonedIcon instanceof Element)) {
		return "";
	}

	scrubInertTimestampIconElement(clonedIcon);
	return clonedIcon.outerHTML;
}

function resolveMessageModelMetadata(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
): Pick<
	MessageActionsTarget["metadata"],
	"modelIconHtml" | "modelIconKey" | "modelLabel"
> {
	const timestampIcon = messageElement.querySelector(".timestamp-icon");
	const iconTitle =
		timestampIcon instanceof Element
			? asTrimmedString(timestampIcon.getAttribute("title"))
			: "";
	const extra = isRecord(message?.extra) ? message.extra : null;
	const modelLabel = resolveMessageModelLabel({
		iconTitle,
		model: extra?.model,
	});
	const modelIconKey = resolveMessageModelIconKey({
		iconTitle,
		model: extra?.model,
	});
	const modelIconHtml =
		timestampIcon instanceof Element
			? cloneTimestampIconHtml(timestampIcon)
			: "";
	const modelMetadata: Pick<
		MessageActionsTarget["metadata"],
		"modelIconHtml" | "modelIconKey" | "modelLabel"
	> = {};
	if (modelIconHtml) {
		modelMetadata.modelIconHtml = modelIconHtml;
	}
	if (modelIconKey) {
		modelMetadata.modelIconKey = modelIconKey;
	}
	if (modelLabel) {
		modelMetadata.modelLabel = modelLabel;
	}

	return modelMetadata;
}

function resolveMessageMetadata(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
): MessageActionsTarget["metadata"] {
	const modelMetadata = resolveMessageModelMetadata(message, messageElement);

	return {
		bookmarkLink:
			asTrimmedString(messageElement.getAttribute("bookmark_link")) ||
			undefined,
		generationTime:
			resolveElementText(messageElement, ".mes_timer") || undefined,
		...modelMetadata,
		timestamp: resolveTimestamp(messageElement) || undefined,
		tokenCount:
			resolveElementText(messageElement, ".tokenCounterDisplay") ||
			undefined,
	};
}

function resolveMessageBooleanFlag(
	message: MessageActionsChatMessageLike | null,
	messageElement: Element,
	attributeName: string,
	messageFieldName: "is_system" | "is_user",
): boolean {
	const attributeValue = asOptionalBoolean(
		messageElement.getAttribute(attributeName),
	);
	if (typeof attributeValue === "boolean") {
		return attributeValue;
	}

	return message?.[messageFieldName] === true;
}

function resolveMoreActionsTarget({
	context,
	includeRenderedMessage = false,
	messageElement,
	messageId,
}: {
	context: MessageActionsContextLike | null;
	includeRenderedMessage?: boolean;
	messageElement: Element;
	messageId: number;
}): MessageActionsTarget {
	const message = resolveChatMessage(context, messageId);
	const swipeTotal =
		Array.isArray(message?.swipes) && message.swipes.length > 0
			? message.swipes.length
			: 1;
	const swipeIndex = clampIndex(asIndex(message?.swipe_id), swipeTotal);
	const messageContentSnapshot = includeRenderedMessage
		? createMessageContentSnapshot(messageElement)
		: {
				messagePreviewText: "",
				renderedMessageHtml: "",
			};

	return {
		avatarUrl: resolveAvatarUrl(message, messageElement),
		isSystem: resolveMessageBooleanFlag(
			message,
			messageElement,
			"is_system",
			"is_system",
		),
		isUser: resolveMessageBooleanFlag(
			message,
			messageElement,
			"is_user",
			"is_user",
		),
		messageDisplayId: resolveMessageDisplayId(messageElement, messageId),
		messageId,
		messagePreviewText: messageContentSnapshot.messagePreviewText,
		renderedMessageHtml: messageContentSnapshot.renderedMessageHtml,
		metadata: resolveMessageMetadata(message, messageElement),
		senderName: resolveSenderName(message, messageElement),
		swipeIndex,
		swipeTotal,
	};
}

function resolveMessageElement(
	documentRef: Document,
	messageId: number,
): Element | null {
	return documentRef.querySelector(`#chat .mes[mesid="${messageId}"]`);
}

function findDirectMessageHeader(
	messageElement: Element,
): HTMLDivElement | null {
	for (const child of Array.from(messageElement.children)) {
		if (
			child instanceof HTMLDivElement &&
			child.classList.contains("astra-mesHeader")
		) {
			return child;
		}
	}

	return null;
}

function findDirectHeaderActionsHost(
	headerElement: Element,
): HTMLDivElement | null {
	for (const child of Array.from(headerElement.children)) {
		if (
			child instanceof HTMLDivElement &&
			child.classList.contains(MESSAGE_HEADER_ACTIONS_CLASS) &&
			child.dataset.astraComponent === MESSAGE_HEADER_ACTIONS_COMPONENT
		) {
			return child;
		}
	}

	return null;
}

function ensureHeaderActionsHost(
	messageElement: Element,
): HTMLDivElement | null {
	const headerElement = findDirectMessageHeader(messageElement);
	if (!headerElement) {
		return null;
	}

	const existingHost = findDirectHeaderActionsHost(headerElement);
	if (existingHost) {
		return existingHost;
	}

	const host = messageElement.ownerDocument.createElement("div");
	host.className = MESSAGE_HEADER_ACTIONS_CLASS;
	host.dataset.astraComponent = MESSAGE_HEADER_ACTIONS_COMPONENT;
	headerElement.appendChild(host);
	return host;
}

function resolveNativeMessageActionElement({
	documentRef,
	messageId,
	selector,
}: {
	documentRef: Document;
	messageId: number;
	selector: string;
}): HTMLElement | null {
	const actionElement = resolveMessageElement(
		documentRef,
		messageId,
	)?.querySelector(selector);

	return actionElement instanceof HTMLElement ? actionElement : null;
}

function dispatchNativeClick({
	documentRef,
	element,
}: {
	documentRef: Document;
	element: HTMLElement;
}) {
	const view = documentRef.defaultView;
	const event =
		typeof view?.MouseEvent === "function"
			? new view.MouseEvent("click", {
					bubbles: true,
					cancelable: true,
				})
			: new Event("click", { bubbles: true, cancelable: true });

	element.dispatchEvent(event);
}

function dispatchNativePointerUp({
	documentRef,
	element,
}: {
	documentRef: Document;
	element: HTMLElement;
}) {
	const view = documentRef.defaultView;
	const event =
		typeof view?.PointerEvent === "function"
			? new view.PointerEvent("pointerup", {
					bubbles: true,
					cancelable: true,
					pointerType: "touch",
				})
			: new Event("pointerup", { bubbles: true, cancelable: true });

	element.dispatchEvent(event);
}

function resolveLoadedMessageElements(
	documentRef: Document,
): LoadedMessageElement[] {
	const seenMessageIds = new Set<number>();
	const messageElements: LoadedMessageElement[] = [];

	for (const messageElement of Array.from(
		documentRef.querySelectorAll("#chat .mes[mesid]"),
	)) {
		const messageId = Number(messageElement.getAttribute("mesid"));
		if (!Number.isInteger(messageId) || seenMessageIds.has(messageId)) {
			continue;
		}

		seenMessageIds.add(messageId);
		messageElements.push({
			messageElement,
			messageId,
		});
	}

	return messageElements;
}

function isActionableFooterMessage({
	context,
	messageElement,
	messageId,
}: {
	context: MessageActionsContextLike | null;
	messageElement: Element;
	messageId: number;
}): boolean {
	const isUserAttribute = asOptionalBoolean(
		messageElement.getAttribute("is_user"),
	);
	if (isUserAttribute === true) {
		return false;
	}
	if (isUserAttribute === false) {
		return true;
	}

	const message = resolveChatMessage(context, messageId);
	if (
		resolveMessageBooleanFlag(message, messageElement, "is_user", "is_user")
	) {
		return false;
	}

	const extra = isRecord(message?.extra) ? message.extra : null;
	return extra?.isSmallSys !== true && extra?.swipeable !== false;
}

function resolveLastActionableFooterMessage({
	context,
	loadedMessages,
}: {
	context: MessageActionsContextLike | null;
	loadedMessages: LoadedMessageElement[];
}): LoadedMessageElement | null {
	const lastMessage = loadedMessages.at(-1);
	if (!lastMessage) {
		return null;
	}

	return isActionableFooterMessage({
		context,
		messageElement: lastMessage.messageElement,
		messageId: lastMessage.messageId,
	})
		? lastMessage
		: null;
}

function resolveInlineHistoryItem({
	historySnapshot,
	messageId,
}: {
	historySnapshot: ChatMessageRevisionHistoryItem[];
	messageId: number;
}): ChatMessageRevisionHistoryItem | null {
	return (
		historySnapshot.find(
			(item) => item.hasHistory && item.messageId === messageId,
		) ?? null
	);
}

export function createMobileMessageActionsFeature({
	createHistoryStore,
	createRevisionStore = () => createChatMessageRevisionStore(),
	createSwipeStore = () => createChatMessageSwipeStore(),
	documentRef = document,
}: {
	createHistoryStore?: () => ChatMessageRevisionHistoryStore;
	createRevisionStore?: () => ChatMessageRevisionStore;
	createSwipeStore?: () => ChatMessageSwipeStore;
	documentRef?: Document;
} = {}): MobileMessageActionsFeature {
	const resolvedCreateHistoryStore =
		createHistoryStore ??
		(() => createChatMessageRevisionHistoryStore({ documentRef }));
	let drawerRoot: Root | null = null;
	let drawerRootHost: HTMLDivElement | null = null;
	let historyStore: ChatMessageRevisionHistoryStore | null = null;
	let deletionConfirmationDrawerRoot: Root | null = null;
	let deletionConfirmationDrawerRootHost: HTMLDivElement | null = null;
	let editDrawerRoot: Root | null = null;
	let editDrawerRootHost: HTMLDivElement | null = null;
	let extraActionsDrawerRoot: Root | null = null;
	let extraActionsDrawerRootHost: HTMLDivElement | null = null;
	const headerActionRoots = new Map<number, HeaderActionRootState>();
	let footerActionRoot: Root | null = null;
	let footerActionRootHost: HTMLDivElement | null = null;
	let moreActionsDrawerRoot: Root | null = null;
	let moreActionsDrawerRootHost: HTMLDivElement | null = null;
	let revisionStore: ChatMessageRevisionStore | null = null;
	let selectedHistoryItem: ChatMessageRevisionHistoryItem | null = null;
	let selectedDeletionConfirmation: MessageDeleteConfirmationDrawerState | null =
		null;
	let selectedEditDraftOverride: MessageEditDrawerDraft | null = null;
	let selectedEditMessageReference: MessageActionsChatMessageLike | null =
		null;
	let selectedEditTarget: MessageActionsTarget | null = null;
	let isEditMutationPending = false;
	let isEditDrawerOpen = false;
	let selectedMoreActionsTarget: MessageActionsTarget | null = null;
	let swipeStore: ChatMessageSwipeStore | null = null;
	let chatObserver: MutationObserver | null = null;
	let reconcileFrameId: number | null = null;
	let renderFrameId: number | null = null;
	let deferredNativeActionFrameId: number | null = null;
	let messageTextLongPress: MessageTextLongPressState | null = null;
	let suppressMessageTextActivationTimeoutId: number | null = null;
	let shouldSuppressMessageTextActivation = false;
	let isMessageTextLongPressListenerAttached = false;
	let selectedExtraActionsTarget: MessageActionsTarget | null = null;
	let isMoreActionsDrawerOpen = false;
	let unsubscribeHistory: (() => void) | null = null;
	let unsubscribeRevision: (() => void) | null = null;
	let unsubscribeSwipe: (() => void) | null = null;

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

	function ensureDrawerRoot() {
		if (drawerRoot && drawerRootHost?.isConnected) {
			return;
		}

		drawerRoot?.unmount();
		drawerRoot = null;
		drawerRootHost?.remove();
		drawerRootHost = documentRef.createElement("div");
		drawerRootHost.id = "astra-message-revision-history-drawer-host";
		markAstraProjectaUiRoot(drawerRootHost);
		(getAstraProjectaPortalContainer() ?? documentRef.body).appendChild(
			drawerRootHost,
		);
		drawerRoot = createRoot(drawerRootHost);
	}

	function renderHistoryDrawer() {
		if (!selectedHistoryItem && !drawerRoot) {
			return;
		}

		ensureDrawerRoot();
		drawerRoot?.render(
			<RevisionHistoryDrawer
				item={selectedHistoryItem}
				open={Boolean(selectedHistoryItem)}
				onRevisionApplied={() => {
					historyStore?.refresh();
					revisionStore?.refresh();
					swipeStore?.refresh();
					renderMessageActions();
				}}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					selectedHistoryItem = null;
					renderHistoryDrawer();
				}}
			/>,
		);
	}

	function unmountHistoryDrawer() {
		drawerRoot?.unmount();
		drawerRoot = null;
		drawerRootHost?.remove();
		drawerRootHost = null;
		selectedHistoryItem = null;
	}

	function unmountHeaderActionRoot(messageId: number) {
		const state = headerActionRoots.get(messageId);
		if (!state) {
			return;
		}

		state.root.unmount();
		state.host.remove();
		headerActionRoots.delete(messageId);
	}

	function unmountHeaderActionRoots() {
		for (const messageId of Array.from(headerActionRoots.keys())) {
			unmountHeaderActionRoot(messageId);
		}
	}

	function renderHeaderActionsForLoadedMessages(
		loadedMessages: LoadedMessageElement[],
	) {
		const nextMessageIds = new Set(
			loadedMessages.map(({ messageId }) => messageId),
		);

		for (const [messageId, state] of Array.from(headerActionRoots)) {
			if (
				!nextMessageIds.has(messageId) ||
				!state.messageElement.isConnected ||
				!state.host.isConnected
			) {
				unmountHeaderActionRoot(messageId);
			}
		}

		for (const { messageElement, messageId } of loadedMessages) {
			const host = ensureHeaderActionsHost(messageElement);
			if (!host) {
				unmountHeaderActionRoot(messageId);
				continue;
			}

			let state = headerActionRoots.get(messageId);
			if (
				!state ||
				state.host !== host ||
				state.messageElement !== messageElement
			) {
				unmountHeaderActionRoot(messageId);
				state = {
					host,
					messageElement,
					root: createRoot(host),
				};
				headerActionRoots.set(messageId, state);
			}

			state.root.render(
				<MessageHeaderActions
					onEdit={() => {
						openEditDrawerForMessage(messageId);
					}}
					onMore={() => {
						openMoreActionsForMessage(messageId);
					}}
				/>,
			);
		}
	}

	function ensureMoreActionsDrawerRoot() {
		if (moreActionsDrawerRoot && moreActionsDrawerRootHost?.isConnected) {
			return;
		}

		moreActionsDrawerRoot?.unmount();
		moreActionsDrawerRoot = null;
		moreActionsDrawerRootHost?.remove();
		moreActionsDrawerRootHost = documentRef.createElement("div");
		moreActionsDrawerRootHost.id = "astra-message-more-actions-drawer-host";
		markAstraProjectaUiRoot(moreActionsDrawerRootHost);
		(getAstraProjectaPortalContainer() ?? documentRef.body).appendChild(
			moreActionsDrawerRootHost,
		);
		moreActionsDrawerRoot = createRoot(moreActionsDrawerRootHost);
	}

	function renderMoreActionsDrawer() {
		if (!selectedMoreActionsTarget && !moreActionsDrawerRoot) {
			return;
		}

		ensureMoreActionsDrawerRoot();
		moreActionsDrawerRoot?.render(
			<MoreActionsDrawer
				actions={
					selectedMoreActionsTarget
						? createMoreActionsDrawerActions(
								selectedMoreActionsTarget,
							)
						: undefined
				}
				container={moreActionsDrawerRootHost}
				extraActions={
					selectedMoreActionsTarget
						? createMoreActionsExtraActions(
								selectedMoreActionsTarget,
							)
						: []
				}
				open={
					isMoreActionsDrawerOpen &&
					Boolean(selectedMoreActionsTarget)
				}
				target={selectedMoreActionsTarget}
				onExitComplete={() => {
					if (!isMoreActionsDrawerOpen) {
						unmountMoreActionsDrawer();
					}
				}}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					unmountMoreActionsDrawer();
				}}
			/>,
		);
	}

	function unmountMoreActionsDrawer() {
		moreActionsDrawerRoot?.unmount();
		moreActionsDrawerRoot = null;
		moreActionsDrawerRootHost?.remove();
		moreActionsDrawerRootHost = null;
		selectedMoreActionsTarget = null;
		isMoreActionsDrawerOpen = false;
	}

	function closeMoreActionsDrawer() {
		if (!selectedMoreActionsTarget && !moreActionsDrawerRoot) {
			return;
		}

		isMoreActionsDrawerOpen = false;
		renderMoreActionsDrawer();
	}

	function ensureEditDrawerRoot() {
		if (editDrawerRoot && editDrawerRootHost?.isConnected) {
			return;
		}

		editDrawerRoot?.unmount();
		editDrawerRoot = null;
		editDrawerRootHost?.remove();
		editDrawerRootHost = documentRef.createElement("div");
		editDrawerRootHost.id = "astra-message-edit-drawer-host";
		markAstraProjectaUiRoot(editDrawerRootHost);
		(getAstraProjectaPortalContainer() ?? documentRef.body).appendChild(
			editDrawerRootHost,
		);
		editDrawerRoot = createRoot(editDrawerRootHost);
	}

	function readEditDrawerDraft(
		messageId: number,
	): MessageEditDrawerDraft | null {
		const result = readChatMessageEditDraft({ messageId });
		return result.ok ? result.draft : null;
	}

	function mergeEditDraftOverride(
		liveDraft: MessageEditDrawerDraft,
	): MessageEditDrawerDraft {
		if (!selectedEditDraftOverride) {
			return liveDraft;
		}

		return {
			...liveDraft,
			hasReasoning: selectedEditDraftOverride.hasReasoning,
			messageText: selectedEditDraftOverride.messageText,
			reasoningText: selectedEditDraftOverride.reasoningText,
		};
	}

	function createEditDraftOverride({
		messageId,
		submitDraft,
	}: {
		messageId: number;
		submitDraft: MessageEditDrawerSubmitDraft;
	}): MessageEditDrawerDraft | null {
		const liveDraft = readEditDrawerDraft(messageId);
		if (!liveDraft) {
			return null;
		}

		return {
			...liveDraft,
			hasReasoning: submitDraft.hasReasoning,
			messageText: submitDraft.messageText,
			reasoningText: submitDraft.reasoningText,
		};
	}

	function resolveEditTargetForMessageId(
		messageId: number,
	): MessageActionsTarget | null {
		const selectedMessageElement = resolveMessageElement(
			documentRef,
			messageId,
		);
		if (!selectedMessageElement) {
			return null;
		}

		return resolveMoreActionsTarget({
			context: resolveContextSafe(),
			includeRenderedMessage: false,
			messageElement: selectedMessageElement,
			messageId,
		});
	}

	function resolveEditMessageReference(
		messageId: number,
	): MessageActionsChatMessageLike | null {
		return resolveChatMessage(resolveContextSafe(), messageId);
	}

	function resolveSelectedEditMessageId(): number | null {
		if (!selectedEditMessageReference) {
			return selectedEditTarget?.messageId ?? null;
		}

		const context = resolveContextSafe();
		const chat = Array.isArray(context?.chat) ? context.chat : [];
		const messageId = chat.indexOf(selectedEditMessageReference);
		return messageId >= 0 ? messageId : null;
	}

	function retargetEditTargetFallback(
		target: MessageActionsTarget,
		messageId: number,
	): MessageActionsTarget {
		return {
			...target,
			messageDisplayId: `#${messageId}`,
			messageId,
			metadata: {
				...target.metadata,
			},
		};
	}

	function resolveSelectedEditTarget(): MessageActionsTarget | null {
		const messageId = resolveSelectedEditMessageId();
		if (messageId === null) {
			return null;
		}

		return (
			resolveEditTargetForMessageId(messageId) ??
			(selectedEditTarget
				? retargetEditTargetFallback(selectedEditTarget, messageId)
				: null)
		);
	}

	function retargetSelectedEditDraftOverride(messageId: number) {
		if (
			!selectedEditDraftOverride ||
			selectedEditDraftOverride.messageId === messageId
		) {
			return;
		}

		selectedEditDraftOverride = {
			...selectedEditDraftOverride,
			messageId,
		};
	}

	function renderEditDrawer() {
		if (!selectedEditTarget && !editDrawerRoot) {
			return;
		}

		const resolvedTarget = resolveSelectedEditTarget();
		if (!resolvedTarget) {
			unmountEditDrawer();
			return;
		}
		selectedEditTarget = resolvedTarget;
		retargetSelectedEditDraftOverride(resolvedTarget.messageId);

		const liveDraft = readEditDrawerDraft(resolvedTarget.messageId);
		if (!liveDraft) {
			if (!isEditMutationPending || !selectedEditDraftOverride) {
				unmountEditDrawer();
				return;
			}

			retargetSelectedEditDraftOverride(resolvedTarget.messageId);
		}

		const draft = liveDraft
			? mergeEditDraftOverride(liveDraft)
			: selectedEditDraftOverride;
		if (!draft) {
			unmountEditDrawer();
			return;
		}

		ensureEditDrawerRoot();
		editDrawerRoot?.render(
			<MessageEditDrawer
				actions={createEditDrawerActions(resolvedTarget, draft)}
				container={editDrawerRootHost}
				draft={draft}
				isMutationPending={isEditMutationPending}
				open={isEditDrawerOpen}
				target={resolvedTarget}
				onConfirm={(submitDraft) => {
					void confirmEditDraft(submitDraft);
				}}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					closeEditDrawer();
				}}
			/>,
		);
	}

	function unmountEditDrawer() {
		editDrawerRoot?.unmount();
		editDrawerRoot = null;
		editDrawerRootHost?.remove();
		editDrawerRootHost = null;
		selectedEditTarget = null;
		selectedEditDraftOverride = null;
		selectedEditMessageReference = null;
		isEditMutationPending = false;
		isEditDrawerOpen = false;
	}

	function closeEditDrawer() {
		if (!selectedEditTarget && !editDrawerRoot) {
			return;
		}

		isEditDrawerOpen = false;
		selectedEditDraftOverride = null;
		selectedEditMessageReference = null;
		isEditMutationPending = false;
		renderEditDrawer();
	}

	function openEditDrawerForTarget(target: MessageActionsTarget) {
		const nextTarget = cloneDeletionTarget(target);
		selectedEditDraftOverride = null;
		selectedEditMessageReference = resolveEditMessageReference(
			nextTarget.messageId,
		);
		isEditMutationPending = false;
		isEditDrawerOpen = true;
		closeMoreActionsDrawer();
		scheduleDeferredNativeAction(() => {
			selectedEditTarget =
				resolveEditTargetForMessageId(nextTarget.messageId) ??
				nextTarget;
			selectedEditMessageReference ??= resolveEditMessageReference(
				selectedEditTarget.messageId,
			);
			isEditDrawerOpen = true;
			renderEditDrawer();
		});
	}

	function openEditDrawerForMessage(messageId: number) {
		const target = resolveEditTargetForMessageId(messageId);
		if (!target) {
			unmountEditDrawer();
			return;
		}

		openEditDrawerForTarget(target);
	}

	function ensureExtraActionsDrawerRoot() {
		if (extraActionsDrawerRoot && extraActionsDrawerRootHost?.isConnected) {
			return;
		}

		extraActionsDrawerRoot?.unmount();
		extraActionsDrawerRoot = null;
		extraActionsDrawerRootHost?.remove();
		extraActionsDrawerRootHost = documentRef.createElement("div");
		extraActionsDrawerRootHost.id =
			"astra-message-extra-actions-drawer-host";
		markAstraProjectaUiRoot(extraActionsDrawerRootHost);
		(getAstraProjectaPortalContainer() ?? documentRef.body).appendChild(
			extraActionsDrawerRootHost,
		);
		extraActionsDrawerRoot = createRoot(extraActionsDrawerRootHost);
	}

	function resolveNativePromptVisibilityIcon(
		action: NativeExtraMessageAction,
	): LucideIcon | undefined {
		if (action.element.classList.contains("mes_hide")) {
			return Eye;
		}

		if (action.element.classList.contains("mes_unhide")) {
			return EyeOff;
		}

		return undefined;
	}

	function createNativeExtraDrawerActions(
		target: MessageActionsTarget,
	): MessageExtraActionsDrawerAction[] {
		return resolveNativeExtraMessageActions({
			documentRef,
			messageId: target.messageId,
		}).map((nativeAction) => ({
			description: nativeAction.description,
			icon: resolveNativePromptVisibilityIcon(nativeAction),
			iconClassName: nativeAction.iconClassName,
			id: nativeAction.id,
			label: nativeAction.label,
			onClick: () => {
				if (
					!triggerNativeExtraMessageAction({
						action: nativeAction,
						documentRef,
					})
				) {
					return;
				}

				closeExtraActionsDrawer();
				refreshMessageActionStores({ renderImmediately: true });
			},
		}));
	}

	function createNativeExtraQuickActions(
		target: MessageActionsTarget,
	): MessageExtraActionItem[] {
		return resolveNativeExtraMessageActions({
			documentRef,
			messageId: target.messageId,
		}).map((nativeAction) => ({
			description: nativeAction.description,
			icon: resolveNativePromptVisibilityIcon(nativeAction),
			iconClassName: nativeAction.iconClassName,
			id: nativeAction.id,
			label: nativeAction.label,
			onClick: () => {
				if (
					!triggerNativeExtraMessageAction({
						action: nativeAction,
						documentRef,
					})
				) {
					return;
				}

				closeMoreActionsDrawer();
				refreshMessageActionStores({ renderImmediately: true });
			},
			variant: "native",
		}));
	}

	function renderExtraActionsDrawer() {
		if (!selectedExtraActionsTarget && !extraActionsDrawerRoot) {
			return;
		}

		ensureExtraActionsDrawerRoot();
		const target = selectedExtraActionsTarget;
		const deletionSupport = target
			? readChatMessageDeletionSupport({
					swipeTotal: target.swipeTotal,
				})
			: {
					canDeleteMessage: false,
					canDeleteSwipe: false,
				};

		extraActionsDrawerRoot?.render(
			<MessageExtraActionsDrawer
				container={extraActionsDrawerRootHost}
				dangerActions={{
					deleteMessage: {
						disabled: !deletionSupport.canDeleteMessage,
						onClick: () => {
							if (!target) {
								return;
							}

							openDeletionConfirmationForTarget(
								"message",
								target,
							);
						},
					},
					deleteSwipe: {
						disabled: !deletionSupport.canDeleteSwipe,
						onClick: () => {
							if (!target) {
								return;
							}

							openDeletionConfirmationForTarget("swipe", target);
						},
					},
				}}
				nativeActions={
					target ? createNativeExtraDrawerActions(target) : []
				}
				open={Boolean(target)}
				target={target}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					selectedExtraActionsTarget = null;
					renderExtraActionsDrawer();
				}}
			/>,
		);
	}

	function unmountExtraActionsDrawer() {
		extraActionsDrawerRoot?.unmount();
		extraActionsDrawerRoot = null;
		extraActionsDrawerRootHost?.remove();
		extraActionsDrawerRootHost = null;
		selectedExtraActionsTarget = null;
	}

	function closeExtraActionsDrawer() {
		unmountExtraActionsDrawer();
	}

	function ensureDeletionConfirmationDrawerRoot() {
		if (
			deletionConfirmationDrawerRoot &&
			deletionConfirmationDrawerRootHost?.isConnected
		) {
			return;
		}

		deletionConfirmationDrawerRoot?.unmount();
		deletionConfirmationDrawerRoot = null;
		deletionConfirmationDrawerRootHost?.remove();
		deletionConfirmationDrawerRootHost = documentRef.createElement("div");
		deletionConfirmationDrawerRootHost.id =
			"astra-message-delete-confirmation-drawer-host";
		markAstraProjectaUiRoot(deletionConfirmationDrawerRootHost);
		(getAstraProjectaPortalContainer() ?? documentRef.body).appendChild(
			deletionConfirmationDrawerRootHost,
		);
		deletionConfirmationDrawerRoot = createRoot(
			deletionConfirmationDrawerRootHost,
		);
	}

	function renderDeletionConfirmationDrawer() {
		if (!selectedDeletionConfirmation) {
			unmountDeletionConfirmationDrawer();
			return;
		}

		ensureDeletionConfirmationDrawerRoot();
		deletionConfirmationDrawerRoot?.render(
			<MessageDeleteConfirmationDrawer
				action={selectedDeletionConfirmation}
				container={deletionConfirmationDrawerRootHost}
				onDeleted={() => {
					refreshMessageActionStores({
						renderImmediately: true,
					});
				}}
				onOpenChange={(nextValue) => {
					if (nextValue) {
						return;
					}

					selectedDeletionConfirmation = null;
					unmountDeletionConfirmationDrawer();
				}}
			/>,
		);
	}

	function unmountDeletionConfirmationDrawer() {
		deletionConfirmationDrawerRoot?.unmount();
		deletionConfirmationDrawerRoot = null;
		deletionConfirmationDrawerRootHost?.remove();
		deletionConfirmationDrawerRootHost = null;
		selectedDeletionConfirmation = null;
	}

	function cloneDeletionTarget(
		target: MessageActionsTarget,
	): MessageActionsTarget {
		return {
			...target,
			metadata: {
				...target.metadata,
			},
		};
	}

	function resolveDeletionConfirmationTarget(
		target: MessageActionsTarget,
	): MessageActionsTarget {
		const fallbackTarget = cloneDeletionTarget(target);
		const selectedMessageElement = resolveMessageElement(
			documentRef,
			target.messageId,
		);
		if (!selectedMessageElement) {
			return fallbackTarget;
		}

		const renderedTarget = resolveMoreActionsTarget({
			context: resolveContextSafe(),
			includeRenderedMessage: true,
			messageElement: selectedMessageElement,
			messageId: target.messageId,
		});
		if (!renderedTarget.renderedMessageHtml.trim()) {
			return fallbackTarget;
		}

		return cloneDeletionTarget(renderedTarget);
	}

	function openDeletionConfirmationForTarget(
		kind: ChatMessageDeletionKind,
		target: MessageActionsTarget,
		source: "edit" | "extra" | "more" = "extra",
	) {
		const nextDeletionConfirmation: MessageDeleteConfirmationDrawerState = {
			kind,
			target: resolveDeletionConfirmationTarget(target),
		};

		if (source === "more") {
			closeMoreActionsDrawer();
		} else if (source === "edit") {
			closeEditDrawer();
		} else {
			closeExtraActionsDrawer();
		}
		scheduleDeferredNativeAction(() => {
			selectedDeletionConfirmation = nextDeletionConfirmation;
			renderDeletionConfirmationDrawer();
		});
	}

	function setEditMutationPending(nextValue: boolean) {
		if (isEditMutationPending === nextValue) {
			return;
		}

		isEditMutationPending = nextValue;
		renderEditDrawer();
	}

	async function confirmEditDraft(submitDraft: MessageEditDrawerSubmitDraft) {
		if (isEditMutationPending) {
			return;
		}

		setEditMutationPending(true);
		const result = await saveChatMessageEdit(submitDraft);
		if (!result.ok) {
			setEditMutationPending(false);
			return;
		}

		isEditMutationPending = false;
		closeEditDrawer();
		refreshMessageActionStores({ renderImmediately: true });
	}

	async function copyEditDraft(submitDraft: MessageEditDrawerSubmitDraft) {
		if (isEditMutationPending) {
			return;
		}

		selectedEditDraftOverride = createEditDraftOverride({
			messageId: submitDraft.messageId,
			submitDraft,
		});
		setEditMutationPending(true);
		const result = await copyChatMessageFromDraft(submitDraft);
		if (!result.ok) {
			setEditMutationPending(false);
			return;
		}

		isEditMutationPending = false;
		refreshMessageActionStores({ renderImmediately: true });
		renderEditDrawer();
	}

	async function moveEditDraft({
		direction,
		submitDraft,
	}: {
		direction: ChatMessageMoveDirection;
		submitDraft: MessageEditDrawerSubmitDraft;
	}) {
		if (isEditMutationPending) {
			return;
		}

		selectedEditDraftOverride = createEditDraftOverride({
			messageId: submitDraft.messageId,
			submitDraft,
		});
		setEditMutationPending(true);
		const result = await moveChatMessage({
			direction,
			messageId: submitDraft.messageId,
		});
		if (!result.ok) {
			setEditMutationPending(false);
			return;
		}

		selectedEditDraftOverride = createEditDraftOverride({
			messageId: result.messageId,
			submitDraft: {
				...submitDraft,
				messageId: result.messageId,
			},
		});
		selectedEditMessageReference =
			resolveEditMessageReference(result.messageId) ??
			selectedEditMessageReference;
		selectedEditTarget =
			resolveEditTargetForMessageId(result.messageId) ??
			(selectedEditTarget
				? {
						...selectedEditTarget,
						messageId: result.messageId,
						metadata: {
							...selectedEditTarget.metadata,
						},
					}
				: null);
		isEditMutationPending = false;
		refreshMessageActionStores({ renderImmediately: true });
		renderEditDrawer();
	}

	function createEditDrawerActions(
		target: MessageActionsTarget,
		draft: MessageEditDrawerDraft,
	) {
		const deletionSupport = readChatMessageDeletionSupport({
			swipeTotal: target.swipeTotal,
		});

		return {
			addReasoning: {
				disabled: draft.hasReasoning,
			},
			copy: {
				disabled: !draft.canCopy,
				onClick: (submitDraft: MessageEditDrawerSubmitDraft) => {
					void copyEditDraft(submitDraft);
				},
			},
			deleteMessage: {
				disabled: !deletionSupport.canDeleteMessage,
				onClick: () => {
					openDeletionConfirmationForTarget(
						"message",
						target,
						"edit",
					);
				},
			},
			deleteSwipe: {
				disabled: !deletionSupport.canDeleteSwipe,
				onClick: () => {
					openDeletionConfirmationForTarget("swipe", target, "edit");
				},
			},
			moveDown: {
				disabled: !draft.canMoveDown,
				onClick: (submitDraft: MessageEditDrawerSubmitDraft) => {
					void moveEditDraft({
						direction: "down",
						submitDraft,
					});
				},
			},
			moveUp: {
				disabled: !draft.canMoveUp,
				onClick: (submitDraft: MessageEditDrawerSubmitDraft) => {
					void moveEditDraft({
						direction: "up",
						submitDraft,
					});
				},
			},
		};
	}

	function openExtraActionsForMessage(messageId: number) {
		closeMoreActionsDrawer();
		scheduleDeferredNativeAction(() => {
			const selectedMessageElement = resolveMessageElement(
				documentRef,
				messageId,
			);
			if (!selectedMessageElement) {
				unmountExtraActionsDrawer();
				return;
			}

			selectedExtraActionsTarget = resolveMoreActionsTarget({
				context: resolveContextSafe(),
				includeRenderedMessage: true,
				messageElement: selectedMessageElement,
				messageId,
			});
			renderExtraActionsDrawer();
		});
	}

	function resolveHistoryItemForMoreActionsTarget(
		target: MessageActionsTarget,
	): ChatMessageRevisionHistoryItem | null {
		return (
			(historyStore?.getSnapshot() ?? []).find(
				(item) =>
					item.hasHistory &&
					item.messageId === target.messageId &&
					item.swipeIndex === target.swipeIndex,
			) ?? null
		);
	}

	function cancelDeferredNativeAction() {
		if (deferredNativeActionFrameId === null) {
			return;
		}

		const view = documentRef.defaultView;
		if (typeof view?.cancelAnimationFrame === "function") {
			view.cancelAnimationFrame(deferredNativeActionFrameId);
		}
		deferredNativeActionFrameId = null;
	}

	function scheduleDeferredNativeAction(callback: () => void) {
		cancelDeferredNativeAction();
		const view = documentRef.defaultView;
		if (typeof view?.requestAnimationFrame === "function") {
			deferredNativeActionFrameId = view.requestAnimationFrame(() => {
				deferredNativeActionFrameId = null;
				callback();
			});
			return;
		}

		callback();
	}

	function createMoreActionsDrawerActions(
		target: MessageActionsTarget,
	): MoreActionsDrawerActionsConfig {
		const copyAction = resolveNativeMessageActionElement({
			documentRef,
			messageId: target.messageId,
			selector: ".mes_copy",
		});
		const promptVisibilitySelector = target.isSystem
			? ".mes_unhide"
			: ".mes_hide";
		const promptVisibilityAction = resolveNativeMessageActionElement({
			documentRef,
			messageId: target.messageId,
			selector: promptVisibilitySelector,
		});
		const historyItem = resolveHistoryItemForMoreActionsTarget(target);

		return {
			copy: {
				disabled: !copyAction,
				onClick: () => {
					const nextCopyAction = resolveNativeMessageActionElement({
						documentRef,
						messageId: target.messageId,
						selector: ".mes_copy",
					});
					if (!nextCopyAction) {
						return;
					}

					dispatchNativePointerUp({
						documentRef,
						element: nextCopyAction,
					});
					closeMoreActionsDrawer();
				},
			},
			edit: {
				disabled: false,
				onClick: () => {
					openEditDrawerForTarget(target);
				},
			},
			history: {
				disabled: !historyItem,
				onClick: () => {
					if (!historyItem) {
						return;
					}

					closeMoreActionsDrawer();
					scheduleDeferredNativeAction(() => {
						selectedHistoryItem = historyItem;
						renderHistoryDrawer();
					});
				},
			},
			more: {
				disabled: false,
				onClick: () => {
					openExtraActionsForMessage(target.messageId);
				},
			},
			promptVisibility: {
				disabled: !promptVisibilityAction,
				isExcluded: target.isSystem,
				onClick: () => {
					const nextPromptVisibilityAction =
						resolveNativeMessageActionElement({
							documentRef,
							messageId: target.messageId,
							selector: promptVisibilitySelector,
						});
					if (!nextPromptVisibilityAction) {
						return;
					}

					dispatchNativeClick({
						documentRef,
						element: nextPromptVisibilityAction,
					});
					closeMoreActionsDrawer();
					refreshMessageActionStores({ renderImmediately: true });
				},
			},
		};
	}

	function createMoreActionsExtraActions(
		target: MessageActionsTarget,
	): MessageExtraActionItem[] {
		const deletionSupport = readChatMessageDeletionSupport({
			swipeTotal: target.swipeTotal,
		});
		const hasMultipleSwipes =
			typeof target.swipeTotal === "number" && target.swipeTotal > 1;
		const deleteMessageLabel = translateAstra(
			"messageActions.extra.action.deleteMessage.label",
		);
		const deleteMessageSingleSwipeLabel = translateAstra(
			"messageActions.extra.action.deleteMessage.singleSwipeLabel",
		);
		const deleteSwipeLabel = translateAstra(
			"messageActions.extra.action.deleteSwipe.label",
		);
		const quickActions: MessageExtraActionItem[] = [];

		if (hasMultipleSwipes) {
			quickActions.push({
				disabled: !deletionSupport.canDeleteSwipe,
				icon: Delete,
				id: `${target.messageId}:delete-swipe`,
				label: deleteSwipeLabel,
				onClick: () => {
					openDeletionConfirmationForTarget("swipe", target, "more");
				},
				variant: "danger",
			});
		}

		quickActions.push({
			disabled: !deletionSupport.canDeleteMessage,
			icon: MessageCircleX,
			id: `${target.messageId}:delete-message`,
			label: hasMultipleSwipes
				? deleteMessageLabel
				: deleteMessageSingleSwipeLabel,
			onClick: () => {
				openDeletionConfirmationForTarget("message", target, "more");
			},
			variant: "danger",
		});

		return quickActions.concat(createNativeExtraQuickActions(target));
	}

	function openMoreActionsForMessage(messageId: number) {
		const selectedMessageElement = resolveMessageElement(
			documentRef,
			messageId,
		);
		if (!selectedMessageElement) {
			unmountMoreActionsDrawer();
			return;
		}

		selectedMoreActionsTarget = resolveMoreActionsTarget({
			context: resolveContextSafe(),
			includeRenderedMessage: true,
			messageElement: selectedMessageElement,
			messageId,
		});
		isMoreActionsDrawerOpen = true;
		renderMoreActionsDrawer();
	}

	function isClickToEditEnabled(): boolean {
		const context = resolveContextSafe();
		const powerUserSettings = isRecord(context?.powerUserSettings)
			? context.powerUserSettings
			: null;

		return powerUserSettings?.click_to_edit === true;
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
		if (!(eventTarget instanceof Element)) {
			return null;
		}

		const messageText = eventTarget.closest("#chat .mes[mesid] .mes_text");
		if (!(messageText instanceof HTMLElement)) {
			return null;
		}

		const messageElement = messageText.closest("#chat .mes[mesid]");
		const messageId = Number(messageElement?.getAttribute("mesid"));
		if (!messageElement || !Number.isInteger(messageId)) {
			return null;
		}

		return {
			messageElement,
			messageId,
			messageText,
		};
	}

	function resolveClickToEditTarget(eventTarget: EventTarget | null): {
		messageElement: Element;
		messageId: number;
	} | null {
		if (!(eventTarget instanceof Element)) {
			return null;
		}

		const editableMessagePart = eventTarget.closest(
			"#chat .mes[mesid] .mes_text, #chat .mes[mesid] .mes_reasoning",
		);
		if (!(editableMessagePart instanceof HTMLElement)) {
			return null;
		}

		const messageElement = editableMessagePart.closest("#chat .mes[mesid]");
		const messageId = Number(messageElement?.getAttribute("mesid"));
		if (!messageElement || !Number.isInteger(messageId)) {
			return null;
		}

		return {
			messageElement,
			messageId,
		};
	}

	function hasActiveTextSelection(): boolean {
		const selection = documentRef.defaultView?.getSelection?.();
		return Boolean(selection?.toString());
	}

	function hasNativeEditTextarea(): boolean {
		return Boolean(
			documentRef.querySelector(
				".edit_textarea, .reasoning_edit_textarea",
			),
		);
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
		openEditDrawerForMessage(target.messageId);
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
			openMoreActionsForMessage(messageId);
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

	function attachMessageTextLongPressListener() {
		if (isMessageTextLongPressListenerAttached) {
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
		isMessageTextLongPressListenerAttached = true;
	}

	function detachMessageTextLongPressListener() {
		if (!isMessageTextLongPressListenerAttached) {
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
		isMessageTextLongPressListenerAttached = false;
	}

	function removeLegacyMessageActionHosts() {
		for (const host of Array.from(
			documentRef.querySelectorAll(
				"#chat .astra-mesActions__left, #chat .astra-mesActions__leftDefault, #chat .astra-mesActions__revisionHost, #chat .astra-mesActions__historyHost, #chat .astra-mesActions__moreHost, #chat .astra-mesActions__right, #chat .astra-mesActions__rightDefault, #chat .astra-mesActions__swipeHost, #chat .astra-messageActions__left, #chat .astra-messageActions__leftDefault, #chat .astra-messageActions__revisionHost, #chat .astra-messageActions__historyHost, #chat .astra-messageActions__moreHost, #chat .astra-messageActions__right, #chat .astra-messageActions__rightDefault, #chat .astra-messageActions__swipeHost, #message_template .astra-mesActions__left, #message_template .astra-mesActions__leftDefault, #message_template .astra-mesActions__revisionHost, #message_template .astra-mesActions__historyHost, #message_template .astra-mesActions__moreHost, #message_template .astra-mesActions__right, #message_template .astra-mesActions__rightDefault, #message_template .astra-mesActions__swipeHost, #message_template .astra-messageActions__left, #message_template .astra-messageActions__leftDefault, #message_template .astra-messageActions__revisionHost, #message_template .astra-messageActions__historyHost, #message_template .astra-messageActions__moreHost, #message_template .astra-messageActions__right, #message_template .astra-messageActions__rightDefault, #message_template .astra-messageActions__swipeHost",
			),
		)) {
			if (host instanceof HTMLElement) {
				cleanupMessageActionSlots(host);
			}
		}
	}

	function syncOpenMessageActionTargets(validMessageIds: Set<number>) {
		if (selectedMoreActionsTarget) {
			if (!validMessageIds.has(selectedMoreActionsTarget.messageId)) {
				unmountMoreActionsDrawer();
				return;
			}

			const selectedMessageElement = resolveMessageElement(
				documentRef,
				selectedMoreActionsTarget.messageId,
			);
			if (!selectedMessageElement) {
				unmountMoreActionsDrawer();
				return;
			}

			if (isMoreActionsDrawerOpen) {
				selectedMoreActionsTarget = resolveMoreActionsTarget({
					context: resolveContextSafe(),
					includeRenderedMessage: true,
					messageElement: selectedMessageElement,
					messageId: selectedMoreActionsTarget.messageId,
				});
				renderMoreActionsDrawer();
			}
		}

		if (selectedExtraActionsTarget) {
			if (!validMessageIds.has(selectedExtraActionsTarget.messageId)) {
				unmountExtraActionsDrawer();
				return;
			}

			const selectedMessageElement = resolveMessageElement(
				documentRef,
				selectedExtraActionsTarget.messageId,
			);
			if (!selectedMessageElement) {
				unmountExtraActionsDrawer();
				return;
			}

			selectedExtraActionsTarget = resolveMoreActionsTarget({
				context: resolveContextSafe(),
				includeRenderedMessage: false,
				messageElement: selectedMessageElement,
				messageId: selectedExtraActionsTarget.messageId,
			});
			renderExtraActionsDrawer();
		}

		if (
			selectedDeletionConfirmation &&
			!validMessageIds.has(selectedDeletionConfirmation.target.messageId)
		) {
			unmountDeletionConfirmationDrawer();
		}

		if (selectedEditTarget) {
			if (
				!selectedEditMessageReference &&
				!validMessageIds.has(selectedEditTarget.messageId)
			) {
				unmountEditDrawer();
				return;
			}

			const resolvedTarget = resolveSelectedEditTarget();
			if (!resolvedTarget) {
				unmountEditDrawer();
				return;
			}

			selectedEditTarget = resolvedTarget;
			renderEditDrawer();
		}
	}

	function cancelScheduledMessageActionsRender() {
		if (renderFrameId === null) {
			return;
		}

		const view = documentRef.defaultView;
		if (typeof view?.cancelAnimationFrame === "function") {
			view.cancelAnimationFrame(renderFrameId);
		}
		renderFrameId = null;
	}

	function renderMessageActionsOnFrame() {
		renderFrameId = null;
		renderMessageActions();
	}

	function renderMessageActionsImmediately() {
		cancelScheduledMessageActionsRender();
		renderMessageActions();
	}

	function scheduleMessageActionsRender() {
		if (renderFrameId !== null) {
			return;
		}

		const view = documentRef.defaultView;
		if (typeof view?.requestAnimationFrame === "function") {
			renderFrameId = view.requestAnimationFrame(
				renderMessageActionsOnFrame,
			);
			return;
		}

		renderMessageActions();
	}

	function refreshMessageActionStores({
		renderImmediately = false,
	}: {
		renderImmediately?: boolean;
	} = {}) {
		historyStore?.refresh();
		revisionStore?.refresh();
		swipeStore?.refresh();
		if (renderImmediately) {
			renderMessageActionsImmediately();
			return;
		}

		scheduleMessageActionsRender();
	}

	function scheduleChatDomReconcile() {
		if (reconcileFrameId !== null) {
			return;
		}

		const runReconcile = () => {
			reconcileFrameId = null;
			refreshMessageActionStores({ renderImmediately: true });
		};
		const view = documentRef.defaultView;
		if (typeof view?.requestAnimationFrame === "function") {
			reconcileFrameId = view.requestAnimationFrame(runReconcile);
			return;
		}

		runReconcile();
	}

	function observeChatDom() {
		if (chatObserver) {
			return;
		}

		const chatRoot = documentRef.getElementById("chat");
		const view = documentRef.defaultView;
		if (!chatRoot || !view?.MutationObserver) {
			return;
		}

		chatObserver = new view.MutationObserver(scheduleChatDomReconcile);
		chatObserver.observe(chatRoot, {
			childList: true,
		});
	}

	function stopObservingChatDom() {
		chatObserver?.disconnect();
		chatObserver = null;

		if (reconcileFrameId === null) {
			if (renderFrameId === null) {
				return;
			}
		} else {
			const view = documentRef.defaultView;
			if (typeof view?.cancelAnimationFrame === "function") {
				view.cancelAnimationFrame(reconcileFrameId);
			}
			reconcileFrameId = null;
		}

		cancelScheduledMessageActionsRender();
	}

	function runRevisionAction(action: (() => Promise<boolean>) | undefined) {
		if (!action) {
			return;
		}

		void action().finally(refreshMessageActionStores);
	}

	function unmountFooterActionRoot() {
		footerActionRoot?.unmount();
		footerActionRoot = null;
		cleanupMessageActionSlots(footerActionRootHost);
		footerActionRootHost = null;
	}

	function unmountRoots() {
		unmountHeaderActionRoots();
		unmountMoreActionsDrawer();
		unmountEditDrawer();
		unmountExtraActionsDrawer();
		unmountDeletionConfirmationDrawer();
		unmountHistoryDrawer();
		unmountFooterActionRoot();
	}

	function syncHistoryDrawerSelection(
		items: ChatMessageRevisionHistoryItem[],
	) {
		if (selectedHistoryItem) {
			selectedHistoryItem =
				items.find(
					(item) =>
						item.messageId === selectedHistoryItem?.messageId &&
						item.swipeIndex === selectedHistoryItem.swipeIndex,
				) ?? null;
			renderHistoryDrawer();
		}
	}

	function renderMessageActions() {
		const historySnapshot = historyStore?.getSnapshot() ?? [];
		const revisionSnapshot = revisionStore?.getSnapshot();
		const swipeSnapshot = swipeStore?.getSnapshot();
		const context = resolveContextSafe();
		const loadedMessages = resolveLoadedMessageElements(documentRef);
		const validMessageIds = new Set(
			loadedMessages.map(({ messageId }) => messageId),
		);

		removeLegacyMessageActionHosts();
		renderHeaderActionsForLoadedMessages(loadedMessages);
		syncOpenMessageActionTargets(validMessageIds);
		syncHistoryDrawerSelection(historySnapshot);

		const targetMessage = resolveLastActionableFooterMessage({
			context,
			loadedMessages,
		});
		if (!targetMessage) {
			unmountFooterActionRoot();
			return;
		}

		const targetMessageId = targetMessage.messageId;
		const revisionActionsSnapshot =
			revisionSnapshot?.status === "ready" &&
			revisionSnapshot.messageId === targetMessageId &&
			(revisionSnapshot.canContinue ||
				revisionSnapshot.canRegenerate ||
				revisionSnapshot.canUndo)
				? revisionSnapshot
				: null;
		const swipeActionsSnapshot =
			swipeSnapshot?.status === "ready" &&
			swipeSnapshot.messageId === targetMessageId &&
			(swipeSnapshot.canSwipeNext ||
				swipeSnapshot.canSwipePrevious ||
				swipeSnapshot.isNativeSwipeBusy)
				? swipeSnapshot
				: null;
		const inlineHistoryItem = resolveInlineHistoryItem({
			historySnapshot,
			messageId: targetMessageId,
		});

		if (
			!revisionActionsSnapshot &&
			!swipeActionsSnapshot &&
			!inlineHistoryItem
		) {
			unmountFooterActionRoot();
			return;
		}

		const slots = ensureMessageActionSlots(targetMessage.messageElement);
		if (!slots) {
			unmountRoots();
			return;
		}

		if (!footerActionRoot || footerActionRootHost !== slots.container) {
			unmountFooterActionRoot();
			footerActionRoot = createRoot(slots.container);
			footerActionRootHost = slots.container;
		}

		footerActionRoot.render(
			<MessageFooterActions
				historyAction={
					inlineHistoryItem
						? {
								disabled:
									revisionActionsSnapshot?.isBusy === true,
								onClick: () => {
									selectedHistoryItem = inlineHistoryItem;
									renderHistoryDrawer();
								},
							}
						: null
				}
				revisionSnapshot={revisionActionsSnapshot}
				swipeSnapshot={swipeActionsSnapshot}
				onContinue={() => {
					runRevisionAction(
						() =>
							revisionStore?.continueLastMessage() ??
							Promise.resolve(false),
					);
				}}
				onRegenerate={() => {
					runRevisionAction(
						() =>
							revisionStore?.regenerateLastRevision() ??
							Promise.resolve(false),
					);
				}}
				onSwipeNext={() => {
					void swipeStore?.swipeNext();
				}}
				onSwipePrevious={() => {
					void swipeStore?.swipePrevious();
				}}
				onUndo={() => {
					runRevisionAction(
						() =>
							revisionStore?.undoLastRevision() ??
							Promise.resolve(false),
					);
				}}
			/>,
		);
	}

	function mount() {
		if (historyStore && swipeStore && revisionStore) {
			removeLegacyMessageActionHosts();
			observeChatDom();
			attachMessageTextLongPressListener();
			historyStore.refresh();
			revisionStore.refresh();
			swipeStore.refresh();
			renderMessageActions();
			return;
		}

		removeLegacyMessageActionHosts();
		observeChatDom();
		attachMessageTextLongPressListener();
		historyStore = resolvedCreateHistoryStore();
		revisionStore = createRevisionStore();
		swipeStore = createSwipeStore();
		unsubscribeHistory = historyStore.subscribe(
			scheduleMessageActionsRender,
		);
		unsubscribeRevision = revisionStore.subscribe(
			scheduleMessageActionsRender,
		);
		unsubscribeSwipe = swipeStore.subscribe(scheduleMessageActionsRender);
		historyStore.refresh();
		revisionStore.refresh();
		swipeStore.refresh();
		renderMessageActions();
	}

	function unmount() {
		stopObservingChatDom();
		cancelDeferredNativeAction();
		detachMessageTextLongPressListener();
		unsubscribeHistory?.();
		unsubscribeHistory = null;
		unsubscribeRevision?.();
		unsubscribeRevision = null;
		unsubscribeSwipe?.();
		unsubscribeSwipe = null;
		unmountRoots();
		historyStore?.dispose();
		historyStore = null;
		revisionStore?.dispose();
		revisionStore = null;
		swipeStore?.dispose();
		swipeStore = null;
	}

	return {
		dispose: unmount,
		mount,
		unmount,
	};
}
