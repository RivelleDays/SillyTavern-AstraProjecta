import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";

import { markAstraProjectaUiRoot } from "@/packages/core/runtime/uiScope";
import { createChatContextUsageStore } from "@/packages/core/st/chatContextUsage";
import { createCurrentConnectionInfoStore } from "@/packages/core/st/currentConnectionInfo";
import { createCurrentChatIdentityStore } from "@/packages/core/st/chat-identity";
import { createCurrentChatInfoStore } from "@/packages/core/st/currentChatInfo";
import { createCurrentPresetProfileControlsStore } from "@/packages/core/st/currentPresetProfileControls";
import { createCurrentUserAvatarStore } from "@/packages/core/st/currentUserAvatar";
import { createPrimarySendActionStore } from "@/packages/core/st/primarySendAction";
import { createQuickShortcutStore } from "@/packages/core/st/quickShortcuts";
import {
	MOBILE_CHAT_COMPOSER_HOST_ID,
	MOBILE_CHAT_COMPOSER_SHELL_ID,
	NATIVE_FORM_SHELD_ID,
	NATIVE_NON_QR_FORM_ITEMS_ID,
	NATIVE_RIGHT_SEND_FORM_ID,
	NATIVE_SEND_FORM_ID,
	NATIVE_SEND_TEXTAREA_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";
import {
	createNativeQuickReplyBarBridge,
	type NativeQuickReplyBarBridge,
} from "@/packages/features/chat-session/send-form/bridges/nativeQuickReplyBarBridge";
import { createNativeQuickReplyEnabledStore } from "@/packages/features/chat-session/send-form/bridges/nativeQuickReplyEnabledStore";
import { SEND_FORM_SHORTCUTS } from "@/packages/features/chat-session/send-form/contracts/shortcuts";
import {
	NOOP_MOBILE_SEND_FORM_SILLYTAVERN_INTERFACE,
	type MobileSendFormSillyTavernInterfaceAdapter,
} from "@/packages/features/chat-session/send-form/contracts/sillyTavernInterface";
import { AstraMobileSendForm } from "@/packages/features/chat-session/send-form/shell/AstraMobileSendForm";

export interface MobileSendFormFeature {
	dispose(): void;
	mount(): void;
	unmount(): void;
}

function resolveSendFormTargets(documentRef: Document) {
	const formSheld = documentRef.getElementById(NATIVE_FORM_SHELD_ID);
	const sendForm = documentRef.getElementById(NATIVE_SEND_FORM_ID);
	const nonQrFormItems = documentRef.getElementById(
		NATIVE_NON_QR_FORM_ITEMS_ID,
	);

	if (
		!(formSheld instanceof HTMLElement) ||
		!(sendForm instanceof HTMLElement) ||
		!(nonQrFormItems instanceof HTMLElement)
	) {
		return null;
	}

	if (
		sendForm.parentElement !== formSheld ||
		nonQrFormItems.parentElement !== sendForm
	) {
		return null;
	}

	return {
		formSheld,
		nonQrFormItems,
		sendForm,
	};
}

function resolveHost(
	documentRef: Document,
	hostId: string,
): HTMLDivElement | null {
	const host = documentRef.getElementById(hostId);
	return host instanceof HTMLDivElement
		? markAstraProjectaUiRoot(host)
		: null;
}

export function createMobileSendFormFeature({
	documentRef = document,
	sillyTavernInterface = NOOP_MOBILE_SEND_FORM_SILLYTAVERN_INTERFACE,
}: {
	documentRef?: Document;
	sillyTavernInterface?: MobileSendFormSillyTavernInterfaceAdapter;
} = {}): MobileSendFormFeature {
	let composerHost: HTMLDivElement | null = null;
	let composerShell: HTMLDivElement | null = null;
	let quickReplyBarBridge: NativeQuickReplyBarBridge | null = null;
	let quickReplyHost: HTMLDivElement | null = null;
	let root: Root | null = null;
	let managedTextarea: HTMLTextAreaElement | null = null;
	let originalFormSheldNextSibling: ChildNode | null = null;
	let originalFormSheldParent: Node | null = null;
	let ownsComposerShell = false;
	let currentChatIdentityStore: ReturnType<
		typeof createCurrentChatIdentityStore
	> | null = null;
	let currentConnectionInfoStore: ReturnType<
		typeof createCurrentConnectionInfoStore
	> | null = null;
	let currentChatInfoStore: ReturnType<
		typeof createCurrentChatInfoStore
	> | null = null;
	let currentPresetProfileControlsStore: ReturnType<
		typeof createCurrentPresetProfileControlsStore
	> | null = null;
	let currentUserAvatarStore: ReturnType<
		typeof createCurrentUserAvatarStore
	> | null = null;
	let chatContextUsageStore: ReturnType<
		typeof createChatContextUsageStore
	> | null = null;
	let primarySendActionStore: ReturnType<
		typeof createPrimarySendActionStore
	> | null = null;
	let quickShortcutStore: ReturnType<typeof createQuickShortcutStore> | null =
		null;
	let quickReplyEnabledStore: ReturnType<
		typeof createNativeQuickReplyEnabledStore
	> | null = null;

	function resolveManagedTextarea() {
		const textarea = documentRef.getElementById(NATIVE_SEND_TEXTAREA_ID);
		if (textarea instanceof HTMLTextAreaElement) {
			managedTextarea = textarea;
			return textarea;
		}

		return managedTextarea;
	}

	function moveTextareaIntoHost(nextHost: HTMLDivElement | null) {
		if (!(nextHost instanceof HTMLDivElement) || !nextHost.isConnected) {
			return;
		}

		const textarea = resolveManagedTextarea();
		if (!(textarea instanceof HTMLTextAreaElement)) {
			return;
		}

		if (textarea.parentElement !== nextHost) {
			nextHost.appendChild(textarea);
		}
	}

	function handleQuickReplyHostChange(nextHost: HTMLDivElement | null) {
		if (!(nextHost instanceof HTMLDivElement) || !nextHost.isConnected) {
			quickReplyBarBridge?.restore();
			quickReplyHost = null;
			return;
		}

		quickReplyHost = markAstraProjectaUiRoot(nextHost);
		quickReplyBarBridge ??= createNativeQuickReplyBarBridge({
			documentRef,
		});
		quickReplyBarBridge.attachTo(quickReplyHost);
	}

	function ensureComposerShell(formSheld: HTMLElement) {
		if (formSheld.parentElement?.id === MOBILE_CHAT_COMPOSER_SHELL_ID) {
			const parent = formSheld.parentElement;
			if (parent instanceof HTMLDivElement) {
				composerShell = markAstraProjectaUiRoot(parent);
				return composerShell;
			}
		}

		const existingShell = documentRef.getElementById(
			MOBILE_CHAT_COMPOSER_SHELL_ID,
		);
		if (existingShell) {
			return null;
		}

		if (!formSheld.parentNode) {
			return null;
		}

		originalFormSheldParent = formSheld.parentNode;
		originalFormSheldNextSibling = formSheld.nextSibling;

		composerShell = documentRef.createElement("div");
		composerShell.id = MOBILE_CHAT_COMPOSER_SHELL_ID;
		composerShell.className = "mobile-chat-composer-shell";
		markAstraProjectaUiRoot(composerShell);

		originalFormSheldParent.insertBefore(composerShell, formSheld);
		composerShell.appendChild(formSheld);
		ownsComposerShell = true;

		return composerShell;
	}

	function restoreFormSheld() {
		const formSheld = documentRef.getElementById(NATIVE_FORM_SHELD_ID);
		if (
			!(formSheld instanceof HTMLElement) ||
			!composerShell?.contains(formSheld)
		) {
			return;
		}

		if (originalFormSheldParent) {
			if (
				originalFormSheldNextSibling &&
				originalFormSheldNextSibling.parentNode ===
					originalFormSheldParent
			) {
				originalFormSheldParent.insertBefore(
					formSheld,
					originalFormSheldNextSibling,
				);
			} else {
				originalFormSheldParent.appendChild(formSheld);
			}
			return;
		}

		composerShell.parentNode?.insertBefore(formSheld, composerShell);
	}

	function restoreTextareaToNativeRow() {
		const textarea = resolveManagedTextarea();
		const nonQrFormItems = documentRef.getElementById(
			NATIVE_NON_QR_FORM_ITEMS_ID,
		);
		if (
			!(textarea instanceof HTMLTextAreaElement) ||
			!(nonQrFormItems instanceof HTMLElement)
		) {
			return;
		}

		const rightSendForm = documentRef.getElementById(
			NATIVE_RIGHT_SEND_FORM_ID,
		);
		if (
			rightSendForm instanceof HTMLElement &&
			rightSendForm.parentElement === nonQrFormItems
		) {
			if (
				textarea.parentElement !== nonQrFormItems ||
				textarea.nextElementSibling !== rightSendForm
			) {
				nonQrFormItems.insertBefore(textarea, rightSendForm);
			}
			return;
		}

		if (textarea.parentElement !== nonQrFormItems) {
			nonQrFormItems.appendChild(textarea);
		}
	}

	function ensureStores() {
		chatContextUsageStore ??= createChatContextUsageStore({
			documentRef,
		});
		currentConnectionInfoStore ??= createCurrentConnectionInfoStore();
		currentChatIdentityStore ??= createCurrentChatIdentityStore({
			documentRef,
		});
		currentChatInfoStore ??= createCurrentChatInfoStore();
		currentPresetProfileControlsStore ??=
			createCurrentPresetProfileControlsStore({
				documentRef,
			});
		currentUserAvatarStore ??= createCurrentUserAvatarStore({
			documentRef,
		});
		primarySendActionStore ??= createPrimarySendActionStore({
			documentRef,
		});
		quickShortcutStore ??= createQuickShortcutStore({
			descriptors: SEND_FORM_SHORTCUTS,
			documentRef,
		});
		quickReplyEnabledStore ??= createNativeQuickReplyEnabledStore({
			documentRef,
		});

		return {
			chatContextUsageStore,
			currentConnectionInfoStore,
			currentChatIdentityStore,
			currentChatInfoStore,
			currentPresetProfileControlsStore,
			currentUserAvatarStore,
			primarySendActionStore,
			quickReplyEnabledStore,
			quickShortcutStore,
		};
	}

	function disposeStores() {
		chatContextUsageStore?.dispose();
		currentConnectionInfoStore?.dispose();
		currentChatIdentityStore?.dispose();
		currentChatInfoStore?.dispose();
		currentPresetProfileControlsStore?.dispose();
		currentUserAvatarStore?.dispose();
		primarySendActionStore?.dispose();
		quickReplyEnabledStore?.dispose();
		quickShortcutStore?.dispose();
		chatContextUsageStore = null;
		currentConnectionInfoStore = null;
		currentChatIdentityStore = null;
		currentChatInfoStore = null;
		currentPresetProfileControlsStore = null;
		currentUserAvatarStore = null;
		primarySendActionStore = null;
		quickReplyEnabledStore = null;
		quickShortcutStore = null;
	}

	function mount() {
		if (root && composerHost?.isConnected) {
			return;
		}

		if (root && !composerHost?.isConnected) {
			unmount();
		}

		const targets = resolveSendFormTargets(documentRef);
		if (!targets) {
			return;
		}

		if (!ensureComposerShell(targets.formSheld)) {
			return;
		}

		composerHost =
			resolveHost(documentRef, MOBILE_CHAT_COMPOSER_HOST_ID) ??
			documentRef.createElement("div");
		composerHost.id = MOBILE_CHAT_COMPOSER_HOST_ID;
		composerHost.className = "mobile-chat-composer-host";
		markAstraProjectaUiRoot(composerHost);

		if (
			composerHost.parentElement !== targets.sendForm ||
			composerHost.nextElementSibling !== targets.nonQrFormItems
		) {
			targets.sendForm.insertBefore(composerHost, targets.nonQrFormItems);
		}

		if (!root) {
			root = createRoot(composerHost);
		}

		const stores = ensureStores();
		root.render(
			<AstraMobileSendForm
				chatContextUsageStore={stores.chatContextUsageStore}
				currentConnectionInfoStore={stores.currentConnectionInfoStore}
				currentChatIdentityStore={stores.currentChatIdentityStore}
				currentChatInfoStore={stores.currentChatInfoStore}
				currentPresetProfileControlsStore={
					stores.currentPresetProfileControlsStore
				}
				currentUserAvatarStore={stores.currentUserAvatarStore}
				documentRef={documentRef}
				onQuickReplyHostChange={handleQuickReplyHostChange}
				onTextareaHostChange={moveTextareaIntoHost}
					primarySendActionStore={stores.primarySendActionStore}
					quickReplyEnabledStore={stores.quickReplyEnabledStore}
					quickShortcutStore={stores.quickShortcutStore}
					sillyTavernInterface={sillyTavernInterface}
				/>,
			);
	}

	function unmount() {
		restoreTextareaToNativeRow();
		quickReplyBarBridge?.restore();
		root?.unmount();
		root = null;
		quickReplyBarBridge?.dispose();
		quickReplyBarBridge = null;
		quickReplyHost = null;
		composerHost?.remove();
		composerHost = null;
		restoreFormSheld();
		if (ownsComposerShell) {
			composerShell?.remove();
		}
		composerShell = null;
		originalFormSheldNextSibling = null;
		originalFormSheldParent = null;
		ownsComposerShell = false;
		disposeStores();
	}

	function dispose() {
		unmount();
	}

	return {
		dispose,
		mount,
		unmount,
	};
}
