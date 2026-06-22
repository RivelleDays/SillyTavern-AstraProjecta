import * as React from "react";

import { createAstraReactPortalRootManager } from "@/packages/core/runtime/reactPortalRootManager";
import {
	createCurrentChatIdentityStore,
	type CurrentChatIdentityStore,
} from "@/packages/core/st/chat-identity";
import {
	createCurrentUserAvatarStore,
	type CurrentUserAvatarStore,
} from "@/packages/core/st/currentUserAvatar";
import {
	DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
	SILLYTAVERN_INTERFACE_ROUTES,
	type SillyTavernInterfaceRouteKey,
} from "@/app/shared/sillytavern-interface";
import type { SendFormSillyTavernInterfaceAdapter } from "@/packages/features/chat-session/send-form/contracts/sillyTavernInterface";
import { MobileSillyTavernInterfacePanel } from "@/packages/features/sillytavern-interface/panel-shell/MobileSillyTavernInterfacePanel";
import { SillyTavernInterfaceRouteIcon } from "@/packages/features/sillytavern-interface/icons/SillyTavernInterfaceRouteIcon";
import {
	isDefaultSillyTavernInterfacePageKey,
	persistStoredSillyTavernInterfacePageKey,
	readStoredSillyTavernInterfacePageKey,
} from "@/packages/features/sillytavern-interface/routes/registry";
import { readStoredAiSettingsPageKey } from "@/packages/features/sillytavern-interface/routes/subheaderStorage";

const MOBILE_SILLYTAVERN_INTERFACE_PANEL_HOST_ID =
	"mobile-sillytavern-interface-panel-host";

type ScheduledOpenHandleKind = "frame" | "timeout";

interface SillyTavernInterfacePanelState {
	activePageKey: string;
	open: boolean;
}

export interface MobileSillyTavernInterfacePanelFeature {
	dispose(): void;
	getSendFormAdapter(): SendFormSillyTavernInterfaceAdapter;
	mount(): void;
	unmount(): void;
}

function createPanelStateController({
	documentRef,
}: {
	documentRef: Document;
}) {
	const listeners = new Set<() => void>();
	let state: SillyTavernInterfacePanelState = {
		activePageKey: readStoredSillyTavernInterfacePageKey(
			documentRef.defaultView?.localStorage,
		),
		open: false,
	};
	let openHandle: number | ReturnType<typeof setTimeout> | null = null;
	let openHandleKind: ScheduledOpenHandleKind | null = null;

	function emit() {
		for (const listener of listeners) {
			listener();
		}
	}

	function setState(
		nextState:
			| SillyTavernInterfacePanelState
			| ((
					current: SillyTavernInterfacePanelState,
			  ) => SillyTavernInterfacePanelState),
	) {
		const resolvedState =
			typeof nextState === "function" ? nextState(state) : nextState;
		if (
			resolvedState.activePageKey === state.activePageKey &&
			resolvedState.open === state.open
		) {
			return;
		}

		state = resolvedState;
		emit();
	}

	function clearPendingOpen() {
		const handle = openHandle;
		const handleKind = openHandleKind;

		if (handle === null) {
			return;
		}

		openHandle = null;
		openHandleKind = null;

		if (handleKind === "frame") {
			documentRef.defaultView?.cancelAnimationFrame(handle as number);
			return;
		}

		clearTimeout(handle as ReturnType<typeof setTimeout>);
	}

	function scheduleOpen() {
		const openPanel = () => {
			openHandle = null;
			openHandleKind = null;
			setState((current) => ({
				...current,
				open: true,
			}));
		};
		const view = documentRef.defaultView;

		if (typeof view?.requestAnimationFrame === "function") {
			openHandleKind = "frame";
			openHandle = view.requestAnimationFrame(openPanel);
			return;
		}

		openHandleKind = "timeout";
		openHandle = setTimeout(openPanel, 0);
	}

	function setActivePageKey(nextPageKey: string) {
		const resolvedPageKey = isDefaultSillyTavernInterfacePageKey(
			nextPageKey,
		)
			? nextPageKey
			: DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY;

		setState((current) => ({
			...current,
			activePageKey: resolvedPageKey,
		}));
		persistStoredSillyTavernInterfacePageKey(
			documentRef.defaultView?.localStorage,
			resolvedPageKey,
		);
	}

	function openCurrentPage() {
		clearPendingOpen();
		setState((current) => ({
			...current,
			open: true,
		}));
	}

	function openRoute(pageKey: SillyTavernInterfaceRouteKey) {
		const resolvedPageKey =
			pageKey === SILLYTAVERN_INTERFACE_ROUTES.aiSettings
				? readStoredAiSettingsPageKey(
						documentRef.defaultView?.localStorage,
					)
				: pageKey;

		clearPendingOpen();
		setActivePageKey(resolvedPageKey);
		scheduleOpen();
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) {
			clearPendingOpen();
		}

		setState((current) => ({
			...current,
			open: nextOpen,
		}));
	}

	return {
		clearPendingOpen,
		getSnapshot() {
			return state;
		},
		handleActivePageKeyChange: setActivePageKey,
		handleOpenChange,
		openCurrentPage,
		openRoute,
		resetOpen() {
			clearPendingOpen();
			setState((current) => ({
				...current,
				open: false,
			}));
		},
		subscribe(listener: () => void) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

type PanelStateController = ReturnType<typeof createPanelStateController>;

function usePanelState(controller: PanelStateController) {
	return React.useSyncExternalStore(
		controller.subscribe,
		controller.getSnapshot,
		controller.getSnapshot,
	);
}

function MobileSillyTavernInterfacePanelRoot({
	controller,
	currentChatIdentityStore,
	currentUserAvatarStore,
}: {
	controller: PanelStateController;
	currentChatIdentityStore: CurrentChatIdentityStore;
	currentUserAvatarStore: CurrentUserAvatarStore;
}) {
	const panelState = usePanelState(controller);
	const currentChatIdentitySnapshot = React.useSyncExternalStore(
		currentChatIdentityStore.subscribe,
		currentChatIdentityStore.getSnapshot,
		currentChatIdentityStore.getSnapshot,
	);
	const currentUserAvatarSnapshot = React.useSyncExternalStore(
		currentUserAvatarStore.subscribe,
		currentUserAvatarStore.getSnapshot,
		currentUserAvatarStore.getSnapshot,
	);

	return (
		<MobileSillyTavernInterfacePanel
			activePageKey={panelState.activePageKey}
			currentChatIdentitySnapshot={currentChatIdentitySnapshot}
			currentUserAvatarSnapshot={currentUserAvatarSnapshot}
			open={panelState.open}
			onActivePageKeyChange={controller.handleActivePageKeyChange}
			onOpenChange={controller.handleOpenChange}
		/>
	);
}

export function createMobileSillyTavernInterfacePanelFeature({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): MobileSillyTavernInterfacePanelFeature {
	const rootManager = createAstraReactPortalRootManager({
		documentRef,
		id: MOBILE_SILLYTAVERN_INTERFACE_PANEL_HOST_ID,
	});
	const controller = createPanelStateController({ documentRef });
	let currentChatIdentityStore: CurrentChatIdentityStore | null = null;
	let currentUserAvatarStore: CurrentUserAvatarStore | null = null;

	const adapter: SendFormSillyTavernInterfaceAdapter = {
		openCurrentPage: controller.openCurrentPage,
		openRoute: controller.openRoute,
		renderRouteIcon({ className, iconKey }) {
			return (
				<SillyTavernInterfaceRouteIcon
					className={className}
					iconKey={iconKey}
				/>
			);
		},
	};

	function ensureStores() {
		currentChatIdentityStore ??= createCurrentChatIdentityStore({
			documentRef,
		});
		currentUserAvatarStore ??= createCurrentUserAvatarStore({
			documentRef,
		});

		return {
			currentChatIdentityStore,
			currentUserAvatarStore,
		};
	}

	function disposeStores() {
		currentChatIdentityStore?.dispose();
		currentUserAvatarStore?.dispose();
		currentChatIdentityStore = null;
		currentUserAvatarStore = null;
	}

	function mount() {
		const stores = ensureStores();

		rootManager.render(
			<MobileSillyTavernInterfacePanelRoot
				controller={controller}
				currentChatIdentityStore={stores.currentChatIdentityStore}
				currentUserAvatarStore={stores.currentUserAvatarStore}
			/>,
		);
	}

	function unmount() {
		controller.resetOpen();
		rootManager.unmount();
		disposeStores();
	}

	function dispose() {
		unmount();
	}

	return {
		dispose,
		getSendFormAdapter() {
			return adapter;
		},
		mount,
		unmount,
	};
}
