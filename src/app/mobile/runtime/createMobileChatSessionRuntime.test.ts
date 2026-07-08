import { afterEach, describe, expect, test, vi } from "vitest";

import { createMobileChatSessionRuntime } from "@/app/mobile/runtime/createMobileChatSessionRuntime";
import {
	BASE_UI_BODY_CLASS,
	MOBILE_LAYOUT_CLASS,
	THEME_BODY_CLASS,
} from "@/packages/core/constants";
import {
	createLayoutModeStore,
	type LayoutModePreference,
	type LayoutModeSnapshot,
	type LayoutModeStore,
	type ResolvedLayoutMode,
} from "@/packages/core/layout-mode";
import { createMessageHeaderLayoutFeature } from "@/packages/features/chat-session/message-layout/createMessageHeaderLayoutFeature";

function createLayoutModeStoreStub(initialResolvedMode: ResolvedLayoutMode) {
	let listener: (() => void) | null = null;
	let snapshot: LayoutModeSnapshot = {
		matchesAutoModeMediaQuery: initialResolvedMode === "mobile",
		mediaQuery: "screen and (max-width: 1000px)",
		preference: "auto",
		resolvedMode: initialResolvedMode,
	};
	const unsubscribe = vi.fn(() => {
		listener = null;
	});

	return {
		dispatch(nextResolvedMode: ResolvedLayoutMode) {
			snapshot = {
				...snapshot,
				matchesAutoModeMediaQuery: nextResolvedMode === "mobile",
				resolvedMode: nextResolvedMode,
			};
			listener?.();
		},
		store: {
			dispose: vi.fn(),
			getSnapshot: vi.fn(() => snapshot),
			subscribe: vi.fn((nextListener: () => void) => {
				listener = nextListener;
				return unsubscribe;
			}),
			sync: vi.fn(),
		} satisfies LayoutModeStore,
		unsubscribe,
	};
}

function createStaticMatchMediaWindow(matchesAutoModeMediaQuery: boolean) {
	return {
		matchMedia: vi.fn(() => ({
			matches: matchesAutoModeMediaQuery,
		})),
	};
}

type VisualViewportStub = EventTarget & {
	height: number;
	offsetTop: number;
};

function createVisualViewportStub({
	height,
	offsetTop = 0,
}: {
	height: number;
	offsetTop?: number;
}): VisualViewportStub {
	const visualViewport = new EventTarget() as VisualViewportStub;
	visualViewport.height = height;
	visualViewport.offsetTop = offsetTop;
	return visualViewport;
}

function installWindowProperty<K extends keyof Window>(
	key: K,
	value: Window[K],
): () => void {
	const descriptor = Object.getOwnPropertyDescriptor(window, key);
	Object.defineProperty(window, key, {
		configurable: true,
		value,
	});

	return () => {
		if (descriptor) {
			Object.defineProperty(window, key, descriptor);
			return;
		}

		Reflect.deleteProperty(window, key);
	};
}

function installViewportFixture({
	innerHeight = 900,
	visualViewport,
}: {
	innerHeight?: number;
	visualViewport: VisualViewportStub;
}) {
	const frameCallbacks: FrameRequestCallback[] = [];
	const restoreVisualViewport = installWindowProperty(
		"visualViewport",
		visualViewport as unknown as Window["visualViewport"],
	);
	const restoreInnerHeight = installWindowProperty(
		"innerHeight",
		innerHeight,
	);
	const restoreRequestAnimationFrame = installWindowProperty(
		"requestAnimationFrame",
		vi.fn((callback: FrameRequestCallback) => {
			frameCallbacks.push(callback);
			return frameCallbacks.length;
		}) as unknown as Window["requestAnimationFrame"],
	);
	const restoreCancelAnimationFrame = installWindowProperty(
		"cancelAnimationFrame",
		vi.fn(),
	);

	return {
		flushFrames() {
			const callbacks = frameCallbacks.splice(0);
			for (const callback of callbacks) {
				callback(0);
			}
		},
		restore() {
			restoreCancelAnimationFrame();
			restoreRequestAnimationFrame();
			restoreInnerHeight();
			restoreVisualViewport();
		},
	};
}

async function flushMutationObservers() {
	await Promise.resolve();
	await Promise.resolve();
}

async function flushAnimationFrame() {
	await new Promise<void>((resolve) => {
		if (typeof window.requestAnimationFrame === "function") {
			window.requestAnimationFrame(() => resolve());
			return;
		}

		setTimeout(resolve, 0);
	});
}

async function flushMutationObserversAndAnimationFrame() {
	await flushMutationObservers();
	await flushAnimationFrame();
}

function renderMessageWithTimestamp() {
	document.body.innerHTML = `
		<div id="chat">
			<div class="mes" mesid="0">
				<div class="mesAvatarWrapper">
					<div class="avatar"></div>
					<div class="mesIDDisplay"></div>
					<div class="mes_timer"></div>
					<div class="tokenCounterDisplay"></div>
				</div>
				<div class="mes_block">
					<div class="ch_name">
						<span class="name_text">Assistant</span>
						<small class="timestamp">June 1, 2026 10:00 AM</small>
					</div>
					<div class="mes_text">Hello</div>
				</div>
			</div>
		</div>
	`;
}

function createLifecycleFeature({
	events,
	mountError,
	name,
	unmountError,
}: {
	events: string[];
	mountError?: Error;
	name: string;
	unmountError?: Error;
}) {
	return {
		dispose: vi.fn(() => {
			events.push(`${name}.dispose`);
		}),
		mount: vi.fn(() => {
			events.push(`${name}.mount`);
			if (mountError) {
				throw mountError;
			}
		}),
		unmount: vi.fn(() => {
			events.push(`${name}.unmount`);
			if (unmountError) {
				throw unmountError;
			}
		}),
	};
}

function createRuntimeAcceptanceHarness({
	matchesAutoModeMediaQuery,
	preference,
}: {
	matchesAutoModeMediaQuery: boolean;
	preference: LayoutModePreference;
}) {
	const events: string[] = [];
	const createFeature = (name: string) =>
		createLifecycleFeature({ events, name });
	const keyboardViewportBridge = createFeature("keyboardViewport");
	const nativePopupBridge = createFeature("nativePopup");
	const topBarFeature = createFeature("topBar");
	const messageHeaderLayoutFeature = createFeature("messageHeader");
	const chatSwitchLoadingFeature = {
		...createFeature("chatSwitchLoading"),
		beginAstraChatSwitch: vi.fn(),
		handleChatChanged: vi.fn(),
	};
	const messageActionsFeature = createFeature("messageActions");
	const sillyTavernInterfacePanelFeature = {
		...createFeature("sillyTavernInterfacePanel"),
		getSendFormAdapter: () => ({
			openCurrentPage: vi.fn(),
			openRoute: vi.fn(),
			renderRouteIcon: vi.fn(),
		}),
	};
	const sendFormFeature = createFeature("sendForm");
	const chatScrollFeature = createFeature("chatScroll");
	const layoutModeStore = createLayoutModeStore({
		getPreference: () => preference,
		windowRef: createStaticMatchMediaWindow(matchesAutoModeMediaQuery),
	});

	const runtime = createMobileChatSessionRuntime({
		createChatScrollFeature: () => chatScrollFeature,
		createChatSwitchLoadingFeature: () => chatSwitchLoadingFeature,
		createKeyboardViewportBridge: () => keyboardViewportBridge,
		createMessageActionsFeature: () => messageActionsFeature,
		createMessageHeaderLayoutFeature: () => messageHeaderLayoutFeature,
		createNativePopupBridge: () => nativePopupBridge,
		createSendFormFeature: () => sendFormFeature,
		createSillyTavernInterfacePanelFeature: () =>
			sillyTavernInterfacePanelFeature,
		createTopBarFeature: () => topBarFeature,
		documentRef: document,
		getLayoutModeStore: () => layoutModeStore,
	});

	return {
		layoutModeStore,
		runtime,
		sendFormFeature,
	};
}

describe("createMobileChatSessionRuntime", () => {
	afterEach(() => {
		document.documentElement.removeAttribute(
			"data-astra-projecta-native-popup-active",
		);
		document.body.removeAttribute(
			"data-astra-projecta-native-popup-active",
		);
		document.body.removeAttribute("data-astra-mobile-keyboard");
		document.body.style.removeProperty(
			"--astra-mobile-visual-viewport-bottom",
		);
		document.body.style.removeProperty(
			"--astra-mobile-safe-bottom-effective",
		);
		document.body.innerHTML = "";
	});

	test("keeps mobile layout disabled for force-desktop when the narrow viewport media query matches", () => {
		const { layoutModeStore, runtime, sendFormFeature } =
			createRuntimeAcceptanceHarness({
				matchesAutoModeMediaQuery: true,
				preference: "force-desktop",
			});

		try {
			expect(layoutModeStore.getSnapshot()).toMatchObject({
				matchesAutoModeMediaQuery: true,
				preference: "force-desktop",
				resolvedMode: "desktop",
			});
			expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
			expect(document.body).not.toHaveClass(BASE_UI_BODY_CLASS);
			expect(document.body).not.toHaveClass(MOBILE_LAYOUT_CLASS);
			expect(sendFormFeature.mount).not.toHaveBeenCalled();
		} finally {
			runtime.dispose();
			layoutModeStore.dispose();
		}
	});

	test("enables mobile layout for force-mobile when the wide viewport media query does not match", () => {
		const { layoutModeStore, runtime, sendFormFeature } =
			createRuntimeAcceptanceHarness({
				matchesAutoModeMediaQuery: false,
				preference: "force-mobile",
			});

		try {
			expect(layoutModeStore.getSnapshot()).toMatchObject({
				matchesAutoModeMediaQuery: false,
				preference: "force-mobile",
				resolvedMode: "mobile",
			});
			expect(document.body).toHaveClass(THEME_BODY_CLASS);
			expect(document.body).toHaveClass(BASE_UI_BODY_CLASS);
			expect(document.body).toHaveClass(MOBILE_LAYOUT_CLASS);
			expect(sendFormFeature.mount).toHaveBeenCalledTimes(1);
		} finally {
			runtime.dispose();
			layoutModeStore.dispose();
		}
	});

	test("toggles mobile body classes and mobile features with the resolved layout-mode lifecycle", () => {
		const mount = vi.fn();
		const unmount = vi.fn();
		const dispose = vi.fn();
		const messageActionsMount = vi.fn();
		const messageActionsUnmount = vi.fn();
		const messageActionsDispose = vi.fn();
		const chatScrollMount = vi.fn();
		const chatScrollUnmount = vi.fn();
		const chatScrollDispose = vi.fn();
		const chatSwitchLoadingMount = vi.fn();
		const chatSwitchLoadingUnmount = vi.fn();
		const chatSwitchLoadingDispose = vi.fn();
		const topBarMount = vi.fn();
		const topBarUnmount = vi.fn();
		const topBarDispose = vi.fn();
		const sillyTavernInterfacePanelMount = vi.fn();
		const sillyTavernInterfacePanelUnmount = vi.fn();
		const sillyTavernInterfacePanelDispose = vi.fn();
		const messageHeaderMount = vi.fn();
		const messageHeaderUnmount = vi.fn();
		const messageHeaderDispose = vi.fn();
		const chatMessageSearchStoreDispose = vi.fn();
		const chatMessageSearchStore = {
			close: vi.fn(),
			dispose: chatMessageSearchStoreDispose,
			getSnapshot: vi.fn(),
			goToNext: vi.fn(),
			goToPrevious: vi.fn(),
			open: vi.fn(),
			redo: vi.fn(),
			refresh: vi.fn(),
			replaceAll: vi.fn(),
			replaceCurrent: vi.fn(),
			resetForChatChange: vi.fn(),
			setCaseSensitive: vi.fn(),
			setQuery: vi.fn(),
			setReplaceVisible: vi.fn(),
			setReplaceText: vi.fn(),
			setWholeWord: vi.fn(),
			subscribe: vi.fn(() => () => undefined),
			undo: vi.fn(),
		};
		const chatMessageSearchStoreFactory = vi.fn(
			() => chatMessageSearchStore,
		);
		const sillyTavernInterface = {
			openCurrentPage: vi.fn(),
			openRoute: vi.fn(),
			renderRouteIcon: vi.fn(),
		};
		const featureFactory = vi.fn(() => ({
			dispose,
			mount,
			unmount,
		}));
		const sillyTavernInterfacePanelFeatureFactory = vi.fn(() => ({
			dispose: sillyTavernInterfacePanelDispose,
			getSendFormAdapter: () => sillyTavernInterface,
			mount: sillyTavernInterfacePanelMount,
			unmount: sillyTavernInterfacePanelUnmount,
		}));
		const messageActionsFeatureFactory = vi.fn(() => ({
			dispose: messageActionsDispose,
			mount: messageActionsMount,
			unmount: messageActionsUnmount,
		}));
		const chatScrollFeatureFactory = vi.fn(() => ({
			dispose: chatScrollDispose,
			mount: chatScrollMount,
			unmount: chatScrollUnmount,
		}));
		const chatSwitchLoadingFeatureFactory = vi.fn(() => ({
			beginAstraChatSwitch: vi.fn(),
			dispose: chatSwitchLoadingDispose,
			handleChatChanged: vi.fn(),
			mount: chatSwitchLoadingMount,
			unmount: chatSwitchLoadingUnmount,
		}));
		const topBarFeatureFactory = vi.fn(() => ({
			dispose: topBarDispose,
			mount: topBarMount,
			unmount: topBarUnmount,
		}));
		const messageHeaderLayoutFeatureFactory = vi.fn(() => ({
			dispose: messageHeaderDispose,
			mount: messageHeaderMount,
			unmount: messageHeaderUnmount,
		}));
		const layoutModeStore = createLayoutModeStoreStub("mobile");

		const runtime = createMobileChatSessionRuntime({
			createChatMessageSearchStore: chatMessageSearchStoreFactory,
			createChatScrollFeature: chatScrollFeatureFactory,
			createChatSwitchLoadingFeature: chatSwitchLoadingFeatureFactory,
			createMessageHeaderLayoutFeature: messageHeaderLayoutFeatureFactory,
			createMessageActionsFeature: messageActionsFeatureFactory,
			createSendFormFeature: featureFactory,
			createSillyTavernInterfacePanelFeature:
				sillyTavernInterfacePanelFeatureFactory,
			createTopBarFeature: topBarFeatureFactory,
			documentRef: document,
			getLayoutModeStore: () => layoutModeStore.store,
		});

		expect(featureFactory).toHaveBeenCalledTimes(1);
		expect(featureFactory).toHaveBeenCalledWith({
			chatMessageSearchStore,
			documentRef: document,
			sillyTavernInterface,
		});
		expect(chatMessageSearchStoreFactory).toHaveBeenCalledTimes(1);
		expect(chatMessageSearchStoreFactory).toHaveBeenCalledWith({
			documentRef: document,
		});
		expect(sillyTavernInterfacePanelFeatureFactory).toHaveBeenCalledTimes(
			1,
		);
		expect(sillyTavernInterfacePanelFeatureFactory).toHaveBeenCalledWith({
			documentRef: document,
		});
		expect(messageActionsFeatureFactory).toHaveBeenCalledTimes(1);
		expect(chatScrollFeatureFactory).toHaveBeenCalledTimes(1);
		expect(chatSwitchLoadingFeatureFactory).toHaveBeenCalledTimes(1);
		expect(topBarFeatureFactory).toHaveBeenCalledTimes(1);
		expect(topBarFeatureFactory).toHaveBeenCalledWith({
			chatMessageSearchStore,
			documentRef: document,
			sillyTavernInterface,
		});
		expect(messageHeaderLayoutFeatureFactory).toHaveBeenCalledTimes(1);
		expect(document.body).toHaveClass(THEME_BODY_CLASS);
		expect(document.body).toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).toHaveClass(MOBILE_LAYOUT_CLASS);
		expect(messageHeaderMount).toHaveBeenCalledTimes(1);
		expect(sillyTavernInterfacePanelMount).toHaveBeenCalledTimes(1);
		expect(mount).toHaveBeenCalledTimes(1);
		expect(messageActionsMount).toHaveBeenCalledTimes(1);
		expect(chatScrollMount).toHaveBeenCalledTimes(1);
		expect(chatSwitchLoadingMount).toHaveBeenCalledTimes(1);
		expect(topBarMount).toHaveBeenCalledTimes(1);
		expect(sillyTavernInterfacePanelUnmount).not.toHaveBeenCalled();
		expect(unmount).not.toHaveBeenCalled();
		expect(messageActionsUnmount).not.toHaveBeenCalled();
		expect(chatScrollUnmount).not.toHaveBeenCalled();
		expect(chatSwitchLoadingUnmount).not.toHaveBeenCalled();
		expect(topBarUnmount).not.toHaveBeenCalled();
		expect(messageHeaderUnmount).not.toHaveBeenCalled();
		expect(layoutModeStore.store.subscribe).toHaveBeenCalledTimes(1);

		layoutModeStore.dispatch("desktop");

		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(document.body).not.toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).not.toHaveClass(MOBILE_LAYOUT_CLASS);
		expect(messageHeaderUnmount).toHaveBeenCalledTimes(1);
		expect(sillyTavernInterfacePanelUnmount).toHaveBeenCalledTimes(1);
		expect(unmount).toHaveBeenCalledTimes(1);
		expect(messageActionsUnmount).toHaveBeenCalledTimes(1);
		expect(chatScrollUnmount).toHaveBeenCalledTimes(1);
		expect(chatSwitchLoadingUnmount).toHaveBeenCalledTimes(1);
		expect(topBarUnmount).toHaveBeenCalledTimes(1);

		layoutModeStore.dispatch("mobile");

		expect(document.body).toHaveClass(THEME_BODY_CLASS);
		expect(document.body).toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).toHaveClass(MOBILE_LAYOUT_CLASS);
		expect(messageHeaderMount).toHaveBeenCalledTimes(2);
		expect(sillyTavernInterfacePanelMount).toHaveBeenCalledTimes(2);
		expect(mount).toHaveBeenCalledTimes(2);
		expect(messageActionsMount).toHaveBeenCalledTimes(2);
		expect(chatScrollMount).toHaveBeenCalledTimes(2);
		expect(chatSwitchLoadingMount).toHaveBeenCalledTimes(2);
		expect(topBarMount).toHaveBeenCalledTimes(2);

		runtime.dispose();

		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(document.body).not.toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).not.toHaveClass(MOBILE_LAYOUT_CLASS);
		expect(messageHeaderDispose).toHaveBeenCalledTimes(1);
		expect(sillyTavernInterfacePanelDispose).toHaveBeenCalledTimes(1);
		expect(dispose).toHaveBeenCalledTimes(1);
		expect(messageActionsDispose).toHaveBeenCalledTimes(1);
		expect(chatScrollDispose).toHaveBeenCalledTimes(1);
		expect(chatSwitchLoadingDispose).toHaveBeenCalledTimes(1);
		expect(topBarDispose).toHaveBeenCalledTimes(1);
		expect(chatMessageSearchStoreDispose).toHaveBeenCalledTimes(1);
		expect(layoutModeStore.unsubscribe).toHaveBeenCalledTimes(1);

		layoutModeStore.dispatch("mobile");

		expect(messageHeaderMount).toHaveBeenCalledTimes(2);
		expect(sillyTavernInterfacePanelMount).toHaveBeenCalledTimes(2);
		expect(mount).toHaveBeenCalledTimes(2);
		expect(messageActionsMount).toHaveBeenCalledTimes(2);
		expect(chatScrollMount).toHaveBeenCalledTimes(2);
		expect(chatSwitchLoadingMount).toHaveBeenCalledTimes(2);
		expect(topBarMount).toHaveBeenCalledTimes(2);

		runtime.dispose();

		expect(messageHeaderDispose).toHaveBeenCalledTimes(1);
		expect(sillyTavernInterfacePanelDispose).toHaveBeenCalledTimes(1);
		expect(dispose).toHaveBeenCalledTimes(1);
		expect(messageActionsDispose).toHaveBeenCalledTimes(1);
		expect(chatScrollDispose).toHaveBeenCalledTimes(1);
		expect(chatSwitchLoadingDispose).toHaveBeenCalledTimes(1);
		expect(topBarDispose).toHaveBeenCalledTimes(1);
		expect(chatMessageSearchStoreDispose).toHaveBeenCalledTimes(1);
		expect(layoutModeStore.unsubscribe).toHaveBeenCalledTimes(1);
	});

	test("rolls back mobile feature mounts transactionally when a later feature fails", () => {
		const events: string[] = [];
		const mountError = new Error("message header failed");
		const keyboardViewportBridge = createLifecycleFeature({
			events,
			name: "keyboardViewportBridge",
		});
		const nativePopupBridge = createLifecycleFeature({
			events,
			name: "nativePopupBridge",
		});
		const topBarFeature = createLifecycleFeature({
			events,
			name: "topBarFeature",
		});
		const messageHeaderLayout = createLifecycleFeature({
			events,
			mountError,
			name: "messageHeaderLayout",
		});
		const chatSwitchLoadingFeature = {
			...createLifecycleFeature({
				events,
				name: "chatSwitchLoadingFeature",
			}),
			beginAstraChatSwitch: vi.fn(),
			handleChatChanged: vi.fn(),
		};
		const messageActionsFeature = createLifecycleFeature({
			events,
			name: "messageActionsFeature",
		});
		const sillyTavernInterfacePanelFeature = {
			...createLifecycleFeature({
				events,
				name: "sillyTavernInterfacePanelFeature",
			}),
			getSendFormAdapter: () => ({
				openCurrentPage: vi.fn(),
				openRoute: vi.fn(),
				renderRouteIcon: vi.fn(),
			}),
		};
		const sendFormFeature = createLifecycleFeature({
			events,
			name: "sendFormFeature",
		});
		const chatScrollFeature = createLifecycleFeature({
			events,
			name: "chatScrollFeature",
		});
		const layoutModeStore = createLayoutModeStoreStub("mobile");

		expect(() =>
			createMobileChatSessionRuntime({
				createChatScrollFeature: () => chatScrollFeature,
				createChatSwitchLoadingFeature: () => chatSwitchLoadingFeature,
				createKeyboardViewportBridge: () => keyboardViewportBridge,
				createMessageActionsFeature: () => messageActionsFeature,
				createMessageHeaderLayoutFeature: () => messageHeaderLayout,
				createNativePopupBridge: () => nativePopupBridge,
				createSendFormFeature: () => sendFormFeature,
				createSillyTavernInterfacePanelFeature: () =>
					sillyTavernInterfacePanelFeature,
				createTopBarFeature: () => topBarFeature,
				documentRef: document,
				getLayoutModeStore: () => layoutModeStore.store,
			}),
		).toThrow(mountError);

		expect(events).toEqual([
			"keyboardViewportBridge.mount",
			"nativePopupBridge.mount",
			"topBarFeature.mount",
			"messageHeaderLayout.mount",
			"topBarFeature.unmount",
			"nativePopupBridge.unmount",
			"keyboardViewportBridge.unmount",
		]);
		expect(chatSwitchLoadingFeature.unmount).not.toHaveBeenCalled();
		expect(messageActionsFeature.unmount).not.toHaveBeenCalled();
		expect(sillyTavernInterfacePanelFeature.unmount).not.toHaveBeenCalled();
		expect(sendFormFeature.unmount).not.toHaveBeenCalled();
		expect(chatScrollFeature.unmount).not.toHaveBeenCalled();
		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(document.body).not.toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).not.toHaveClass(MOBILE_LAYOUT_CLASS);
	});

	test("keeps the message header bridge inactive on desktop and restores it when layout mode changes", () => {
		renderMessageWithTimestamp();
		const layoutModeStore = createLayoutModeStoreStub("desktop");
		const runtime = createMobileChatSessionRuntime({
			createChatScrollFeature: () => ({
				dispose: vi.fn(),
				mount: vi.fn(),
				unmount: vi.fn(),
			}),
			createChatSwitchLoadingFeature: () => ({
				beginAstraChatSwitch: vi.fn(),
				dispose: vi.fn(),
				handleChatChanged: vi.fn(),
				mount: vi.fn(),
				unmount: vi.fn(),
			}),
			createMessageActionsFeature: () => ({
				dispose: vi.fn(),
				mount: vi.fn(),
				unmount: vi.fn(),
			}),
			createMessageHeaderLayoutFeature,
			createSendFormFeature: () => ({
				dispose: vi.fn(),
				mount: vi.fn(),
				unmount: vi.fn(),
			}),
			createTopBarFeature: () => ({
				dispose: vi.fn(),
				mount: vi.fn(),
				unmount: vi.fn(),
			}),
			documentRef: document,
			getLayoutModeStore: () => layoutModeStore.store,
		});

		expect(document.querySelector(".astra-mesHeader")).toBeNull();
		expect(document.querySelector(".astra-mesMeta__time")).toBeNull();
		expect(document.querySelector(".mes_block > .ch_name")).toBeTruthy();

		layoutModeStore.dispatch("mobile");

		expect(document.querySelector(".astra-mesHeader")).toBeTruthy();
		expect(document.querySelector(".astra-mesMeta__time")).toBeTruthy();

		layoutModeStore.dispatch("desktop");

		expect(document.querySelector(".astra-mesHeader")).toBeNull();
		expect(document.querySelector(".astra-mesMeta__time")).toBeNull();
		expect(document.querySelector(".mes_block > .ch_name")).toBeTruthy();

		runtime.dispose();
	});

	test("marks native SillyTavern dialog popups as active only while mobile layout is mounted", async () => {
		const layoutModeStore = createLayoutModeStoreStub("mobile");
		const runtime = createMobileChatSessionRuntime({
			createSendFormFeature: () => ({
				dispose: vi.fn(),
				mount: vi.fn(),
				unmount: vi.fn(),
			}),
			documentRef: document,
			getLayoutModeStore: () => layoutModeStore.store,
			windowRef: window,
		});

		try {
			const popup = document.createElement("dialog");
			popup.className = "popup popup--animation-fast";
			popup.setAttribute("open", "");
			document.body.append(popup);
			await flushMutationObserversAndAnimationFrame();

			expect(document.body).toHaveAttribute(
				"data-astra-projecta-native-popup-active",
				"true",
			);
			expect(document.documentElement).toHaveAttribute(
				"data-astra-projecta-native-popup-active",
				"true",
			);

			layoutModeStore.dispatch("desktop");

			expect(document.body).not.toHaveAttribute(
				"data-astra-projecta-native-popup-active",
			);
			expect(document.documentElement).not.toHaveAttribute(
				"data-astra-projecta-native-popup-active",
			);

			popup.removeAttribute("open");
			layoutModeStore.dispatch("mobile");
			await flushMutationObserversAndAnimationFrame();

			expect(document.body).not.toHaveAttribute(
				"data-astra-projecta-native-popup-active",
			);
		} finally {
			runtime.dispose();
		}
	});

	test("tracks legacy SillyTavern popup shadows as native popup activity", async () => {
		document.body.innerHTML =
			'<div id="shadow_popup" style="display: none;"></div>';
		const layoutModeStore = createLayoutModeStoreStub("mobile");
		const runtime = createMobileChatSessionRuntime({
			createSendFormFeature: () => ({
				dispose: vi.fn(),
				mount: vi.fn(),
				unmount: vi.fn(),
			}),
			documentRef: document,
			getLayoutModeStore: () => layoutModeStore.store,
			windowRef: window,
		});

		try {
			const shadowPopup = document.getElementById("shadow_popup");
			if (!(shadowPopup instanceof HTMLElement)) {
				throw new Error("shadow popup fixture did not mount");
			}

			shadowPopup.style.display = "block";
			await flushMutationObserversAndAnimationFrame();

			expect(document.body).toHaveAttribute(
				"data-astra-projecta-native-popup-active",
				"true",
			);

			shadowPopup.style.display = "none";
			await flushMutationObserversAndAnimationFrame();

			expect(document.body).not.toHaveAttribute(
				"data-astra-projecta-native-popup-active",
			);
		} finally {
			runtime.dispose();
		}
	});

	test("keeps the mobile layout inactive until the shared layout-mode contract resolves mobile", () => {
		const mount = vi.fn();
		const unmount = vi.fn();
		const dispose = vi.fn();
		const topBarMount = vi.fn();
		const topBarUnmount = vi.fn();
		const topBarDispose = vi.fn();
		const layoutModeStore = createLayoutModeStoreStub("desktop");

		const runtime = createMobileChatSessionRuntime({
			createSendFormFeature: () => ({
				dispose,
				mount,
				unmount,
			}),
			createTopBarFeature: () => ({
				dispose: topBarDispose,
				mount: topBarMount,
				unmount: topBarUnmount,
			}),
			documentRef: document,
			getLayoutModeStore: () => layoutModeStore.store,
		});

		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(document.body).not.toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).not.toHaveClass(MOBILE_LAYOUT_CLASS);
		expect(mount).not.toHaveBeenCalled();
		expect(topBarMount).not.toHaveBeenCalled();
		expect(unmount).toHaveBeenCalledTimes(1);
		expect(topBarUnmount).toHaveBeenCalledTimes(1);

		layoutModeStore.dispatch("mobile");

		expect(document.body).toHaveClass(THEME_BODY_CLASS);
		expect(document.body).toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).toHaveClass(MOBILE_LAYOUT_CLASS);
		expect(mount).toHaveBeenCalledTimes(1);
		expect(topBarMount).toHaveBeenCalledTimes(1);

		runtime.dispose();

		expect(dispose).toHaveBeenCalledTimes(1);
		expect(topBarDispose).toHaveBeenCalledTimes(1);
	});

	test("writes keyboard viewport variables only while text input focus shrinks the visual viewport", () => {
		document.body.innerHTML = '<textarea id="send_textarea"></textarea>';
		const visualViewport = createVisualViewportStub({ height: 900 });
		const viewportFixture = installViewportFixture({ visualViewport });
		const layoutModeStore = createLayoutModeStoreStub("mobile");
		const runtime = createMobileChatSessionRuntime({
			createSendFormFeature: () => ({
				dispose: vi.fn(),
				mount: vi.fn(),
				unmount: vi.fn(),
			}),
			documentRef: document,
			getLayoutModeStore: () => layoutModeStore.store,
			windowRef: window,
		});

		try {
			const textarea = document.getElementById("send_textarea");
			if (!(textarea instanceof HTMLTextAreaElement)) {
				throw new Error("textarea fixture did not mount");
			}

			textarea.focus();
			textarea.dispatchEvent(
				new FocusEvent("focusin", { bubbles: true }),
			);
			visualViewport.height = 520;
			visualViewport.offsetTop = 24;
			visualViewport.dispatchEvent(new Event("resize"));
			viewportFixture.flushFrames();

			expect(document.body).toHaveAttribute(
				"data-astra-mobile-keyboard",
				"open",
			);
			expect(
				document.body.style.getPropertyValue(
					"--astra-mobile-visual-viewport-bottom",
				),
			).toBe("544px");
			expect(
				document.body.style.getPropertyValue(
					"--astra-mobile-safe-bottom-effective",
				),
			).toBe("0px");

			textarea.blur();
			textarea.dispatchEvent(
				new FocusEvent("focusout", { bubbles: true }),
			);
			visualViewport.height = 900;
			visualViewport.offsetTop = 0;
			visualViewport.dispatchEvent(new Event("resize"));
			viewportFixture.flushFrames();

			expect(document.body).not.toHaveAttribute(
				"data-astra-mobile-keyboard",
			);
			expect(
				document.body.style.getPropertyValue(
					"--astra-mobile-visual-viewport-bottom",
				),
			).toBe("");
			expect(
				document.body.style.getPropertyValue(
					"--astra-mobile-safe-bottom-effective",
				),
			).toBe("");
		} finally {
			runtime.dispose();
			viewportFixture.restore();
		}
	});

	test("cleans keyboard viewport variables when the mobile layout deactivates", () => {
		document.body.innerHTML = '<textarea id="send_textarea"></textarea>';
		const visualViewport = createVisualViewportStub({ height: 500 });
		const viewportFixture = installViewportFixture({ visualViewport });
		const layoutModeStore = createLayoutModeStoreStub("mobile");
		const runtime = createMobileChatSessionRuntime({
			createSendFormFeature: () => ({
				dispose: vi.fn(),
				mount: vi.fn(),
				unmount: vi.fn(),
			}),
			documentRef: document,
			getLayoutModeStore: () => layoutModeStore.store,
			windowRef: window,
		});

		try {
			const textarea = document.getElementById("send_textarea");
			if (!(textarea instanceof HTMLTextAreaElement)) {
				throw new Error("textarea fixture did not mount");
			}

			textarea.focus();
			textarea.dispatchEvent(
				new FocusEvent("focusin", { bubbles: true }),
			);
			visualViewport.dispatchEvent(new Event("resize"));
			viewportFixture.flushFrames();

			expect(document.body).toHaveAttribute(
				"data-astra-mobile-keyboard",
				"open",
			);

			layoutModeStore.dispatch("desktop");

			expect(document.body).not.toHaveAttribute(
				"data-astra-mobile-keyboard",
			);
			expect(
				document.body.style.getPropertyValue(
					"--astra-mobile-visual-viewport-bottom",
				),
			).toBe("");
			expect(
				document.body.style.getPropertyValue(
					"--astra-mobile-safe-bottom-effective",
				),
			).toBe("");

			visualViewport.height = 480;
			visualViewport.dispatchEvent(new Event("resize"));
			viewportFixture.flushFrames();

			expect(document.body).not.toHaveAttribute(
				"data-astra-mobile-keyboard",
			);
		} finally {
			runtime.dispose();
			viewportFixture.restore();
		}
	});
});
