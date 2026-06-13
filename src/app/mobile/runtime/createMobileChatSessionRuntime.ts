import {
	BASE_UI_BODY_CLASS,
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
import type { MobileSendFormSillyTavernInterfaceAdapter } from "@/packages/features/chat-session/send-form/contracts/sillyTavernInterface";
import {
	createMobileSillyTavernInterfacePanelFeature,
	type MobileSillyTavernInterfacePanelFeature,
} from "@/app/mobile/sillytavern-interface-panel";
import {
	createMobileChatTopBarFeature,
	type MobileChatTopBarFeature,
} from "@/app/mobile/top-bar/createMobileChatTopBarFeature";

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
	createSendFormFeature = createMobileSendFormFeature,
	createSillyTavernInterfacePanelFeature = createMobileSillyTavernInterfacePanelFeature,
	createTopBarFeature = createMobileChatTopBarFeature,
	documentRef = document,
	getLayoutModeStore = getDefaultLayoutModeStore,
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
	createSendFormFeature?: (args?: {
		documentRef?: Document;
		sillyTavernInterface?: MobileSendFormSillyTavernInterfaceAdapter;
	}) => MobileSendFormFeature;
	createSillyTavernInterfacePanelFeature?: (args?: {
		documentRef?: Document;
	}) => MobileSillyTavernInterfacePanelFeature;
	createTopBarFeature?: (args?: {
		documentRef?: Document;
	}) => MobileChatTopBarFeature;
	getLayoutModeStore?: (args?: {
		windowRef?: LayoutModeWindowLike;
	}) => LayoutModeStore;
	documentRef?: Document;
	windowRef?: LayoutModeWindowLike & MobileKeyboardViewportBridgeWindowLike;
} = {}): MobileChatSessionRuntime {
	const messageActionsFeature = createMessageActionsFeature({ documentRef });
	const sillyTavernInterfacePanelFeature =
		createSillyTavernInterfacePanelFeature({ documentRef });
	const sendFormFeature = createSendFormFeature({
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
	const topBarFeature = createTopBarFeature({ documentRef });
	const nativePopupBridge = createNativePopupBridge({ documentRef });
	const keyboardViewportBridge = createKeyboardViewportBridge({
		documentRef,
		windowRef,
	});
	const layoutModeStore = getLayoutModeStore({ windowRef });

	const deactivateMobileLayout = () => {
		chatScrollFeature.unmount();
		sendFormFeature.unmount();
		messageActionsFeature.unmount();
		chatSwitchLoadingFeature.unmount();
		messageHeaderLayout.unmount();
		sillyTavernInterfacePanelFeature.unmount();
		topBarFeature.unmount();
		nativePopupBridge.unmount();
		keyboardViewportBridge.unmount();
		documentRef.body?.classList.remove(BASE_UI_BODY_CLASS);
		documentRef.body?.classList.remove(MOBILE_LAYOUT_CLASS);
	};

	const syncFeatureMount = (matches: boolean) => {
		if (matches) {
			documentRef.body?.classList.add(BASE_UI_BODY_CLASS);
			documentRef.body?.classList.add(MOBILE_LAYOUT_CLASS);
			keyboardViewportBridge.mount();
			nativePopupBridge.mount();
			topBarFeature.mount();
			messageHeaderLayout.mount();
			chatSwitchLoadingFeature.mount();
			messageActionsFeature.mount();
			sillyTavernInterfacePanelFeature.mount();
			sendFormFeature.mount();
			chatScrollFeature.mount();
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
	const unsubscribe = layoutModeStore.subscribe(syncLayoutMode);

	return {
		dispose() {
			unsubscribe();
			deactivateMobileLayout();
			chatScrollFeature.dispose();
			chatSwitchLoadingFeature.dispose();
			messageHeaderLayout.dispose();
			sendFormFeature.dispose();
			sillyTavernInterfacePanelFeature.dispose();
			messageActionsFeature.dispose();
			topBarFeature.dispose();
			nativePopupBridge.dispose();
			keyboardViewportBridge.dispose();
		},
	};
}
