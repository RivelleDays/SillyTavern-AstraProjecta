import {
	BASE_UI_BODY_CLASS,
	EXTENSION_LOG_PREFIX,
	MOBILE_LAYOUT_CLASS,
} from "@/packages/core/constants";
import {
	getDefaultLayoutModeStore,
	type LayoutModeStore,
	type LayoutModeWindowLike,
} from "@/packages/core/layout-mode";
import {
	createMobileKeyboardViewportBridge,
	type MobileKeyboardViewportBridge,
	type MobileKeyboardViewportBridgeWindowLike,
} from "@/app/mobile/runtime/mobileKeyboardViewportBridge";
import {
	createMobileNativePopupBridge,
	type MobileNativePopupBridge,
} from "@/app/mobile/runtime/mobileNativePopupBridge";
import {
	type MobileMessageActionsFeature,
	createMobileMessageActionsFeature,
} from "@/packages/features/chat-session/message-actions";
import {
	createMobileChatScrollFeature,
	type MobileChatScrollFeature,
} from "@/packages/features/chat-session/chat-scroll";
import {
	createMobileChatSwitchLoadingFeature,
	type MobileChatSwitchLoadingFeature,
} from "@/packages/features/chat-session/chat-switch-loading";
import {
	createMessageHeaderLayoutFeature as createDefaultMessageHeaderLayoutFeature,
	type MessageHeaderLayoutFeature,
} from "@/packages/features/chat-session/message-layout/createMessageHeaderLayoutFeature";
import {
	type MobileSendFormFeature,
	createMobileSendFormFeature,
} from "@/packages/features/chat-session/send-form/createMobileSendFormFeature";
import type { SendFormSillyTavernInterfaceAdapter } from "@/packages/features/chat-session/send-form/contracts/sillyTavernInterface";
import {
	createMobileSillyTavernInterfacePanelFeature,
	type MobileSillyTavernInterfacePanelFeature,
} from "@/app/mobile/sillytavern-interface-panel";
import {
	createMobileChatTopBarFeature,
	type MobileChatTopBarFeature,
} from "@/app/mobile/top-bar/createMobileChatTopBarFeature";
import {
	createDefaultChatMessageSearchStore,
	type CreateDefaultChatMessageSearchStoreOptions,
} from "@/packages/core/st/chatMessageSearch";
import type { ChatMessageSearchStore } from "@/packages/features/chat-session/message-search";
import {
	mountFeaturesTransactionally,
	unmountFeaturesSafely,
	type MountableRuntimeFeature,
} from "@/packages/core/runtime/mountFeaturesTransactionally";
import type { RuntimeCleanupErrorHandler } from "@/packages/core/runtime/runtimeCleanup";
import { safeRuntimeCallback } from "@/packages/core/runtime/fatalErrorRecovery";

export interface MobileChatSessionRuntime {
	dispose(): void;
}

export function createMobileChatSessionRuntime({
	createKeyboardViewportBridge = createMobileKeyboardViewportBridge,
	createNativePopupBridge = createMobileNativePopupBridge,
	createChatScrollFeature = createMobileChatScrollFeature,
	createChatSwitchLoadingFeature = createMobileChatSwitchLoadingFeature,
	createMessageActionsFeature = createMobileMessageActionsFeature,
	createMessageHeaderLayoutFeature = createDefaultMessageHeaderLayoutFeature,
	createChatMessageSearchStore = createDefaultChatMessageSearchStore,
	createSendFormFeature = createMobileSendFormFeature,
	createSillyTavernInterfacePanelFeature = createMobileSillyTavernInterfacePanelFeature,
	createTopBarFeature = createMobileChatTopBarFeature,
	documentRef = document,
	getLayoutModeStore = getDefaultLayoutModeStore,
	onCleanupError = (error) => {
		console.error(`${EXTENSION_LOG_PREFIX} Runtime cleanup failed.`, error);
	},
	windowRef = window,
}: {
	createKeyboardViewportBridge?: (args?: {
		documentRef?: Document;
		windowRef?: MobileKeyboardViewportBridgeWindowLike;
	}) => MobileKeyboardViewportBridge;
	createNativePopupBridge?: (args?: {
		documentRef?: Document;
	}) => MobileNativePopupBridge;
	createChatScrollFeature?: (args?: {
		documentRef?: Document;
		windowRef?: MobileKeyboardViewportBridgeWindowLike;
	}) => MobileChatScrollFeature;
	createChatSwitchLoadingFeature?: (args?: {
		documentRef?: Document;
		windowRef?: MobileKeyboardViewportBridgeWindowLike;
	}) => MobileChatSwitchLoadingFeature;
	createMessageActionsFeature?: (args?: {
		documentRef?: Document;
	}) => MobileMessageActionsFeature;
	createMessageHeaderLayoutFeature?: (args?: {
		documentRef?: Document;
	}) => MessageHeaderLayoutFeature;
	createChatMessageSearchStore?: (
		args?: CreateDefaultChatMessageSearchStoreOptions,
	) => ChatMessageSearchStore;
	createSendFormFeature?: (args?: {
		chatMessageSearchStore?: ChatMessageSearchStore;
		documentRef?: Document;
		sillyTavernInterface?: SendFormSillyTavernInterfaceAdapter;
	}) => MobileSendFormFeature;
	createSillyTavernInterfacePanelFeature?: (args?: {
		documentRef?: Document;
	}) => MobileSillyTavernInterfacePanelFeature;
	createTopBarFeature?: (args?: {
		chatMessageSearchStore?: ChatMessageSearchStore;
		documentRef?: Document;
	}) => MobileChatTopBarFeature;
	getLayoutModeStore?: (args?: {
		windowRef?: LayoutModeWindowLike;
	}) => LayoutModeStore;
	documentRef?: Document;
	onCleanupError?: RuntimeCleanupErrorHandler;
	windowRef?: LayoutModeWindowLike & MobileKeyboardViewportBridgeWindowLike;
} = {}): MobileChatSessionRuntime {
	const messageActionsFeature = createMessageActionsFeature({ documentRef });
	const chatMessageSearchStore = createChatMessageSearchStore({
		documentRef,
	});
	const sillyTavernInterfacePanelFeature =
		createSillyTavernInterfacePanelFeature({ documentRef });
	const sendFormFeature = createSendFormFeature({
		chatMessageSearchStore,
		documentRef,
		sillyTavernInterface:
			sillyTavernInterfacePanelFeature.getSendFormAdapter(),
	});
	const chatScrollFeature = createChatScrollFeature({
		documentRef,
		windowRef,
	});
	const chatSwitchLoadingFeature = createChatSwitchLoadingFeature({
		documentRef,
		windowRef,
	});
	const messageHeaderLayout = createMessageHeaderLayoutFeature({
		documentRef,
	});
	const topBarFeature = createTopBarFeature({
		chatMessageSearchStore,
		documentRef,
	});
	const nativePopupBridge = createNativePopupBridge({ documentRef });
	const keyboardViewportBridge = createKeyboardViewportBridge({
		documentRef,
		windowRef,
	});
	const layoutModeStore = getLayoutModeStore({ windowRef });
	const mobileLayoutFeatures: MountableRuntimeFeature[] = [
		keyboardViewportBridge,
		nativePopupBridge,
		topBarFeature,
		messageHeaderLayout,
		chatSwitchLoadingFeature,
		messageActionsFeature,
		sillyTavernInterfacePanelFeature,
		sendFormFeature,
		chatScrollFeature,
	];
	const disposableFeatures = [
		chatScrollFeature,
		sendFormFeature,
		sillyTavernInterfacePanelFeature,
		messageActionsFeature,
		chatSwitchLoadingFeature,
		messageHeaderLayout,
		topBarFeature,
		nativePopupBridge,
		keyboardViewportBridge,
		chatMessageSearchStore,
	];
	let disposed = false;

	const deactivateMobileLayout = () => {
		unmountFeaturesSafely(mobileLayoutFeatures, { onCleanupError });
		chatMessageSearchStore.close();
		documentRef.body?.classList.remove(BASE_UI_BODY_CLASS);
		documentRef.body?.classList.remove(MOBILE_LAYOUT_CLASS);
	};

	const syncFeatureMount = (matches: boolean) => {
		if (matches) {
			documentRef.body?.classList.add(BASE_UI_BODY_CLASS);
			documentRef.body?.classList.add(MOBILE_LAYOUT_CLASS);
			try {
				mountFeaturesTransactionally(mobileLayoutFeatures, {
					onCleanupError,
				});
			} catch (error) {
				documentRef.body?.classList.remove(BASE_UI_BODY_CLASS);
				documentRef.body?.classList.remove(MOBILE_LAYOUT_CLASS);
				throw error;
			}
			return;
		}

		deactivateMobileLayout();
	};

	const syncLayoutMode = () => {
		syncFeatureMount(
			layoutModeStore.getSnapshot().resolvedMode === "mobile",
		);
	};

	syncLayoutMode();
	const unsubscribe = layoutModeStore.subscribe(
		safeRuntimeCallback("mobile-layout-mode", syncLayoutMode),
	);

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			unsubscribe();
			deactivateMobileLayout();
			for (const feature of disposableFeatures) {
				try {
					feature.dispose();
				} catch (error) {
					onCleanupError(error);
				}
			}
		},
	};
}
