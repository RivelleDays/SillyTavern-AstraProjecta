import * as React from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";

import { Button } from "@/components/ui/shadcn/button";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import { Equal } from "@/components/ui/shared/icons";
import { markAstraProjectaUiRoot } from "@/packages/core/runtime/uiScope";
import {
	AstraMainInterface,
	AstraMainInterfaceScopeStrip,
	resolveAstraMainInterfaceScopeTitle,
	type AstraMainInterfaceSectionValue,
} from "@/packages/features/astra-main-interface";
import {
	createChatCatalogStore,
	type ChatCatalogStore,
} from "@/packages/core/st/chat-catalog";
import {
	createCurrentChatIdentityStore,
	type CurrentChatIdentitySnapshot,
	type CurrentChatIdentityStore,
} from "@/packages/core/st/chat-identity";
import {
	createFavoriteChatEntitiesStore,
	type FavoriteChatEntitiesSnapshot,
	type FavoriteChatEntitiesStore,
} from "@/packages/core/st/favorite-chat-entities";
import {
	createScopedChatCatalogStore,
	type ScopedChatCatalogStore,
} from "@/packages/core/st/current-chat-catalog";
import { translateAstra } from "@/packages/core/i18n";
import {
	MOBILE_ASTRA_MAIN_INTERFACE_PANEL_ID,
	MOBILE_ASTRA_MAIN_INTERFACE_SECONDARY_TABS_LIST_FRAME_ID,
	MOBILE_ASTRA_MAIN_INTERFACE_TRIGGER_ID,
	MobileAstraMainInterfacePanel,
} from "@/app/mobile/astra-main-interface-panel";
import {
	MOBILE_CHAT_TOP_BAR_HOST_ID,
	MOBILE_CHAT_SESSION_SHELL_ID,
} from "@/app/mobile/top-bar/contracts/dom";

const NATIVE_SHELD_ID = "sheld";

interface MainInterfaceStores {
	chatCatalogStore: ChatCatalogStore;
	favoriteChatEntitiesStore: FavoriteChatEntitiesStore;
	scopedChatCatalogStore: ScopedChatCatalogStore;
}

export {
	MOBILE_ASTRA_MAIN_INTERFACE_PANEL_ID,
	MOBILE_ASTRA_MAIN_INTERFACE_SECONDARY_TABS_LIST_FRAME_ID,
	MOBILE_ASTRA_MAIN_INTERFACE_TRIGGER_ID,
} from "@/app/mobile/astra-main-interface-panel";
export {
	MOBILE_CHAT_TOP_BAR_HOST_ID,
	MOBILE_CHAT_SESSION_SHELL_ID,
} from "@/app/mobile/top-bar/contracts/dom";

export interface MobileChatTopBarFeature {
	dispose(): void;
	mount(): void;
	unmount(): void;
}

function resolveSheld(documentRef: Document): HTMLElement | null {
	const sheld = documentRef.getElementById(NATIVE_SHELD_ID);
	return sheld instanceof HTMLElement ? sheld : null;
}

function useFavoriteChatEntitiesSnapshot(
	store: FavoriteChatEntitiesStore | null | undefined,
): FavoriteChatEntitiesSnapshot | null {
	const subscribe = React.useCallback(
		(listener: () => void) =>
			store?.subscribe(listener) ?? (() => undefined),
		[store],
	);
	const getSnapshot = React.useCallback(
		() => store?.getSnapshot() ?? null,
		[store],
	);

	return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function MobileChatTopBar({
	currentChatIdentityStore,
	snapshot,
}: {
	currentChatIdentityStore: CurrentChatIdentityStore;
	snapshot: CurrentChatIdentitySnapshot;
}) {
	const [isMainInterfaceOpen, setIsMainInterfaceOpen] = React.useState(false);
	const [hasMainInterfaceOpened, setHasMainInterfaceOpened] =
		React.useState(false);
	const [activeMainInterfaceSection, setActiveMainInterfaceSection] =
		React.useState<AstraMainInterfaceSectionValue>("global");
	const [
		secondaryTabsListFramePortalTarget,
		setSecondaryTabsListFramePortalTarget,
	] = React.useState<HTMLDivElement | null>(null);
	const mainInterfaceStores =
		React.useMemo<MainInterfaceStores | null>(() => {
			if (!hasMainInterfaceOpened) {
				return null;
			}

			const chatCatalogStore = createChatCatalogStore();
			return {
				chatCatalogStore,
				favoriteChatEntitiesStore: createFavoriteChatEntitiesStore({
					chatCatalogStore,
				}),
				scopedChatCatalogStore: createScopedChatCatalogStore(),
			};
		}, [hasMainInterfaceOpened]);
	const favoriteChatEntitiesSnapshot = useFavoriteChatEntitiesSnapshot(
		mainInterfaceStores?.favoriteChatEntitiesStore,
	);
	const mainInterfaceHeaderTitle = resolveAstraMainInterfaceScopeTitle({
		currentIdentitySnapshot: snapshot,
		favoriteChatEntitiesSnapshot,
		value: activeMainInterfaceSection,
	});
	const showSecondaryTabsListFrame = hasMainInterfaceOpened;
	const openMainInterfaceLabel = translateAstra("astraMainInterface.open");
	const avatarLabel = translateAstra("sendForm.mainMenu.avatar");
	const emptyStateLabel = translateAstra("sendForm.mainMenu.empty");
	const displayName = snapshot.hasActiveChat
		? snapshot.entityName
		: emptyStateLabel;
	React.useEffect(() => {
		if (!mainInterfaceStores) {
			return undefined;
		}

		return () => {
			mainInterfaceStores.favoriteChatEntitiesStore.dispose();
			mainInterfaceStores.scopedChatCatalogStore.dispose();
			mainInterfaceStores.chatCatalogStore.dispose();
		};
	}, [mainInterfaceStores]);

	const handleMainInterfaceOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) {
				setHasMainInterfaceOpened(true);
			}

			setIsMainInterfaceOpen(nextOpen);
		},
		[],
	);

	return (
		<div
			aria-label={translateAstra("sendForm.mainMenu.title")}
			className="mobile-chat-top-bar"
			data-slot="mobile-chat-top-bar"
		>
			<Button
				aria-controls={MOBILE_ASTRA_MAIN_INTERFACE_PANEL_ID}
				aria-expanded={isMainInterfaceOpen}
				aria-haspopup="dialog"
				aria-label={openMainInterfaceLabel}
				id={MOBILE_ASTRA_MAIN_INTERFACE_TRIGGER_ID}
				className="mobile-chat-top-bar__astra-main-trigger"
				size="icon-sm"
				title={openMainInterfaceLabel}
				type="button"
				variant="ghost"
				onClick={() => {
					handleMainInterfaceOpenChange(true);
				}}
			>
				<UiIcon
					aria-hidden={true}
					className="mobile-chat-top-bar__astra-main-trigger-icon"
					icon={Equal}
					size="sm"
				/>
			</Button>
			<div className="mobile-chat-top-bar__identity">
				<div className="mobile-chat-top-bar__avatar-frame">
					<AstraChatAvatar
						alt={avatarLabel}
						className="mobile-chat-top-bar__avatar"
						avatarUrl={snapshot.thumbnailUrl}
						fallbackText={displayName.trim().charAt(0) || "?"}
						groupAvatarUrls={snapshot.groupAvatarUrls}
						imageClassName="mobile-chat-top-bar__avatar-image"
						loading="eager"
					/>
				</div>
				<div className="mobile-chat-top-bar__name" title={displayName}>
					{displayName}
				</div>
			</div>
			<MobileAstraMainInterfacePanel
				bodyStart={
					showSecondaryTabsListFrame ? (
						<div
							id={
								MOBILE_ASTRA_MAIN_INTERFACE_SECONDARY_TABS_LIST_FRAME_ID
							}
							className="astra-smooth-tabs__list-frame"
							ref={setSecondaryTabsListFramePortalTarget}
						/>
					) : null
				}
				contentScrollMode="children"
				headerTitle={mainInterfaceHeaderTitle}
				headerContent={
					<AstraMainInterfaceScopeStrip
						currentIdentitySnapshot={snapshot}
						favoriteChatEntitiesStore={
							mainInterfaceStores?.favoriteChatEntitiesStore
						}
						onRequestClose={() => {
							handleMainInterfaceOpenChange(false);
						}}
						value={activeMainInterfaceSection}
						onValueChange={setActiveMainInterfaceSection}
					/>
				}
				open={isMainInterfaceOpen}
				onOpenChange={handleMainInterfaceOpenChange}
			>
				{hasMainInterfaceOpened ? (
					<AstraMainInterface
						activeSection={activeMainInterfaceSection}
						chatCatalogStore={mainInterfaceStores?.chatCatalogStore}
						currentChatIdentityStore={currentChatIdentityStore}
						favoriteChatEntitiesStore={
							mainInterfaceStores?.favoriteChatEntitiesStore
						}
						secondaryTabsListFramePortalTarget={
							showSecondaryTabsListFrame
								? secondaryTabsListFramePortalTarget
								: null
						}
						showSectionTabs={false}
						scopedChatCatalogStore={
							mainInterfaceStores?.scopedChatCatalogStore
						}
						onActiveSectionChange={setActiveMainInterfaceSection}
						onRequestClose={() => {
							handleMainInterfaceOpenChange(false);
						}}
					/>
				) : null}
			</MobileAstraMainInterfacePanel>
		</div>
	);
}

function MobileChatTopBarRoot({
	currentChatIdentityStore,
}: {
	currentChatIdentityStore: CurrentChatIdentityStore;
}) {
	const snapshot = React.useSyncExternalStore(
		currentChatIdentityStore.subscribe,
		currentChatIdentityStore.getSnapshot,
		currentChatIdentityStore.getSnapshot,
	);

	return (
		<MobileChatTopBar
			currentChatIdentityStore={currentChatIdentityStore}
			snapshot={snapshot}
		/>
	);
}

export function createMobileChatTopBarFeature({
	createCurrentChatIdentityStore:
		createIdentityStore = createCurrentChatIdentityStore,
	documentRef = document,
}: {
	createCurrentChatIdentityStore?: (args?: {
		documentRef?: Document;
	}) => CurrentChatIdentityStore;
	documentRef?: Document;
} = {}): MobileChatTopBarFeature {
	let currentChatIdentityStore: CurrentChatIdentityStore | null = null;
	let originalNextSibling: ChildNode | null = null;
	let originalParent: Node | null = null;
	let root: Root | null = null;
	let shell: HTMLDivElement | null = null;
	let topBarHost: HTMLDivElement | null = null;

	function mount() {
		if (root && shell?.isConnected && topBarHost?.isConnected) {
			return;
		}

		if (root || shell || topBarHost) {
			unmount();
		}

		const sheld = resolveSheld(documentRef);
		if (!sheld || !sheld.parentNode) {
			return;
		}

		if (sheld.parentElement?.id === MOBILE_CHAT_SESSION_SHELL_ID) {
			return;
		}

		const existingShell = documentRef.getElementById(
			MOBILE_CHAT_SESSION_SHELL_ID,
		);
		if (existingShell) {
			return;
		}

		originalParent = sheld.parentNode;
		originalNextSibling = sheld.nextSibling;

		shell = markAstraProjectaUiRoot(documentRef.createElement("div"));
		shell.id = MOBILE_CHAT_SESSION_SHELL_ID;
		shell.className = "mobile-chat-session-shell";

		topBarHost = markAstraProjectaUiRoot(documentRef.createElement("div"));
		topBarHost.id = MOBILE_CHAT_TOP_BAR_HOST_ID;
		topBarHost.className = "mobile-chat-top-bar-host";

		originalParent.insertBefore(shell, sheld);
		shell.append(topBarHost, sheld);

		currentChatIdentityStore = createIdentityStore({ documentRef });
		root = createRoot(topBarHost);
		root.render(
			<MobileChatTopBarRoot
				currentChatIdentityStore={currentChatIdentityStore}
			/>,
		);
	}

	function restoreSheld() {
		const sheld = resolveSheld(documentRef);
		if (!sheld || !shell?.contains(sheld)) {
			return;
		}

		if (originalParent) {
			if (
				originalNextSibling &&
				originalNextSibling.parentNode === originalParent
			) {
				originalParent.insertBefore(sheld, originalNextSibling);
				return;
			}

			originalParent.appendChild(sheld);
			return;
		}

		shell.parentNode?.insertBefore(sheld, shell);
	}

	function unmount() {
		root?.unmount();
		root = null;
		currentChatIdentityStore?.dispose();
		currentChatIdentityStore = null;

		restoreSheld();
		shell?.remove();
		shell = null;
		topBarHost = null;
		originalParent = null;
		originalNextSibling = null;
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
