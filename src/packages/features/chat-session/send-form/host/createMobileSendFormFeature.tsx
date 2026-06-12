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
	MOBILE_SEND_FORM_COMPOSER_HOST_ID,
	MOBILE_SEND_FORM_QUICK_REPLY_HOST_ID,
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
}: {
	documentRef?: Document;
} = {}): MobileSendFormFeature {
	let composerHost: HTMLDivElement | null = null;
	let quickReplyBarBridge: NativeQuickReplyBarBridge | null = null;
	let quickReplyHost: HTMLDivElement | null = null;
	let root: Root | null = null;
	let managedTextarea: HTMLTextAreaElement | null = null;
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
		if (root && composerHost?.isConnected && quickReplyHost?.isConnected) {
			return;
		}

		if (
			root &&
			(!composerHost?.isConnected || !quickReplyHost?.isConnected)
		) {
			unmount();
		}

		const targets = resolveSendFormTargets(documentRef);
		if (!targets) {
			return;
		}

		quickReplyHost =
			resolveHost(documentRef, MOBILE_SEND_FORM_QUICK_REPLY_HOST_ID) ??
			documentRef.createElement("div");
		quickReplyHost.id = MOBILE_SEND_FORM_QUICK_REPLY_HOST_ID;
		quickReplyHost.className = "mobile-send-form-quick-reply-host";
		markAstraProjectaUiRoot(quickReplyHost);

		if (
			quickReplyHost.parentElement !== targets.formSheld ||
			quickReplyHost.nextElementSibling !== targets.sendForm
		) {
			targets.formSheld.insertBefore(quickReplyHost, targets.sendForm);
		}

		composerHost =
			resolveHost(documentRef, MOBILE_SEND_FORM_COMPOSER_HOST_ID) ??
			documentRef.createElement("div");
		composerHost.id = MOBILE_SEND_FORM_COMPOSER_HOST_ID;
		composerHost.className = "mobile-send-form-composer-host";
		markAstraProjectaUiRoot(composerHost);

		if (
			composerHost.parentElement !== targets.sendForm ||
			composerHost.nextElementSibling !== targets.nonQrFormItems
		) {
			targets.sendForm.insertBefore(
				composerHost,
				targets.nonQrFormItems,
			);
		}

		quickReplyBarBridge ??= createNativeQuickReplyBarBridge({
			documentRef,
		});
		quickReplyBarBridge.attachTo(quickReplyHost);

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
				onTextareaHostChange={moveTextareaIntoHost}
				primarySendActionStore={stores.primarySendActionStore}
				quickReplyEnabledStore={stores.quickReplyEnabledStore}
				quickReplyHost={quickReplyHost}
				quickShortcutStore={stores.quickShortcutStore}
			/>,
		);
	}

	function unmount() {
		restoreTextareaToNativeRow();
		root?.unmount();
		root = null;
		quickReplyBarBridge?.restore();
		quickReplyBarBridge?.dispose();
		quickReplyBarBridge = null;
		quickReplyHost?.remove();
		quickReplyHost = null;
		composerHost?.remove();
		composerHost = null;
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
