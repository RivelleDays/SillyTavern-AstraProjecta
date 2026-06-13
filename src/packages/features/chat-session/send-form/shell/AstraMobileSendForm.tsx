import * as React from "react";

import {
	SendHorizontal,
	Square,
	StepForward,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatContextUsageStore } from "@/packages/core/st/chatContextUsage";
import type { CurrentConnectionInfoStore } from "@/packages/core/st/currentConnectionInfo";
import type { CurrentChatIdentityStore } from "@/packages/core/st/chat-identity";
import type { CurrentChatInfoStore } from "@/packages/core/st/currentChatInfo";
import type { CurrentPresetProfileControlsStore } from "@/packages/core/st/currentPresetProfileControls";
import type { CurrentUserAvatarStore } from "@/packages/core/st/currentUserAvatar";
import type {
	PrimarySendActionKind,
	PrimarySendActionStore,
} from "@/packages/core/st/primarySendAction";
import type { QuickShortcutStore } from "@/packages/core/st/quickShortcuts";
import type { NativeQuickReplyEnabledStore } from "@/packages/features/chat-session/send-form/bridges/nativeQuickReplyEnabledStore";
import {
	MOBILE_CHAT_INPUT_HOST_ID,
	MOBILE_SEND_FORM_QUICK_REPLY_VISIBILITY_STORAGE_KEY,
	MOBILE_CHAT_SHORTCUTS_HOST_ID,
	MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
} from "@/packages/features/chat-session/send-form/contracts/dom";
import type { SillyTavernInterfaceRouteKey } from "@/app/shared/sillytavern-interface";
import {
	NOOP_MOBILE_SEND_FORM_SILLYTAVERN_INTERFACE,
	type MobileSendFormSillyTavernInterfaceAdapter,
} from "@/packages/features/chat-session/send-form/contracts/sillyTavernInterface";
import { SEND_FORM_SHORTCUTS } from "@/packages/features/chat-session/send-form/contracts/shortcuts";
import {
	isMenuOpenKeyboardEvent,
	releaseSendFormFocus,
} from "@/packages/features/chat-session/send-form/bridges/focusRelease";
import { triggerNativeChatSettingsOverride } from "@/packages/features/chat-session/send-form/bridges/nativeChatSettingsOverrideBridge";
import { triggerNativeQuickShortcut } from "@/packages/features/chat-session/send-form/bridges/nativeQuickShortcutBridge";
import { shouldShowContextUsageShortcut } from "@/packages/features/chat-session/send-form/context-usage/presentation";
import { CurrentChatDeleteDialog } from "@/packages/features/chat-session/send-form/main-menu/CurrentChatDeleteDialog";
import { CurrentChatRenameDialog } from "@/packages/features/chat-session/send-form/main-menu/CurrentChatRenameDialog";
import { MobileChatMainMenuDrawer } from "@/packages/features/chat-session/send-form/main-menu/MobileChatMainMenuDrawer";
import { MobileChatInput } from "@/packages/features/chat-session/send-form/shell/MobileChatInput";
import { MobileSendFormShortcutsToolbar } from "@/packages/features/chat-session/send-form/shell/MobileSendFormShortcutsToolbar";
import {
	deleteCurrentChat,
	type DeleteCurrentChatResult,
} from "@/packages/core/st/currentChatDelete";
import {
	renameCurrentChat,
	type RenameCurrentChatInput,
	type RenameCurrentChatResult,
} from "@/packages/core/st/currentChatRename";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import type { CurrentChatInfoSnapshot } from "@/packages/core/st/currentChatInfo";

function readInputControlSize(textarea: HTMLTextAreaElement): number {
	const inputRow = textarea.closest(".mobile-chat-input");
	if (!(inputRow instanceof HTMLElement)) {
		return 36;
	}

	const view = textarea.ownerDocument.defaultView;
	if (!view || typeof view.getComputedStyle !== "function") {
		return 36;
	}

	const rawValue = view
		.getComputedStyle(inputRow)
		.getPropertyValue("--mobile-send-form-input-control-size")
		.trim();
	const parsedValue = Number.parseFloat(rawValue);
	return Number.isFinite(parsedValue) ? parsedValue : 36;
}

function readIsTextareaMultiline(textarea: HTMLTextAreaElement): boolean {
	const singleLineHeight = readInputControlSize(textarea);
	const hasExplicitLineBreak = textarea.value.includes("\n");
	const exceedsSingleLineHeight =
		textarea.scrollHeight > singleLineHeight + 2;
	return hasExplicitLineBreak || exceedsSingleLineHeight;
}

function resolvePrimarySendActionIcon(kind: PrimarySendActionKind) {
	switch (kind) {
		case "continue":
			return StepForward;
		case "stop":
			return Square;
		default:
			return SendHorizontal;
	}
}

type CurrentChatActionDialogKind = "delete" | "rename";

type CurrentChatActionDialogState = {
	chatInfoSnapshot: CurrentChatInfoSnapshot;
	kind: CurrentChatActionDialogKind;
	snapshot: CurrentChatIdentitySnapshot;
} | null;

type ToastrLike = {
	error?: (message: string) => void;
	success?: (message: string) => void;
};

function showToast(kind: keyof ToastrLike, message: string) {
	const toastr = (globalThis as typeof globalThis & { toastr?: ToastrLike })
		.toastr;
	const handler = toastr?.[kind];

	if (typeof handler === "function") {
		handler.call(toastr, message);
	}
}

function cloneCurrentChatIdentitySnapshot(
	snapshot: CurrentChatIdentitySnapshot,
): CurrentChatIdentitySnapshot {
	return {
		...snapshot,
	};
}

function cloneCurrentChatInfoSnapshot(
	snapshot: CurrentChatInfoSnapshot,
): CurrentChatInfoSnapshot {
	return {
		...snapshot,
		modelCounts: { ...snapshot.modelCounts },
	};
}

function readStoredShortcutsToolbarVisibility(documentRef: Document): boolean {
	const storage = documentRef.defaultView?.localStorage;
	if (!storage) {
		return true;
	}

	try {
		const storedValue = storage.getItem(
			MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
		);
		if (storedValue === "false") {
			return false;
		}

		if (storedValue === "true") {
			return true;
		}
	} catch {
		return true;
	}

	return true;
}

function persistShortcutsToolbarVisibility(
	documentRef: Document,
	isVisible: boolean,
) {
	const storage = documentRef.defaultView?.localStorage;
	if (!storage) {
		return;
	}

	try {
		storage.setItem(
			MOBILE_SEND_FORM_SHORTCUTS_VISIBILITY_STORAGE_KEY,
			String(isVisible),
		);
	} catch {
		// Ignore storage failures and keep the in-memory preference active.
	}
}

function readStoredQuickReplyHostVisibility(documentRef: Document): boolean {
	const storage = documentRef.defaultView?.localStorage;
	if (!storage) {
		return false;
	}

	try {
		const storedValue = storage.getItem(
			MOBILE_SEND_FORM_QUICK_REPLY_VISIBILITY_STORAGE_KEY,
		);
		if (storedValue === "false") {
			return false;
		}

		if (storedValue === "true") {
			return true;
		}
	} catch {
		return false;
	}

	return false;
}

function persistQuickReplyHostVisibility(
	documentRef: Document,
	isVisible: boolean,
) {
	const storage = documentRef.defaultView?.localStorage;
	if (!storage) {
		return;
	}

	try {
		storage.setItem(
			MOBILE_SEND_FORM_QUICK_REPLY_VISIBILITY_STORAGE_KEY,
			String(isVisible),
		);
	} catch {
		// Ignore storage failures and keep the in-memory preference active.
	}
}

export function AstraMobileSendForm({
	chatContextUsageStore,
	currentConnectionInfoStore,
	currentChatIdentityStore,
	currentChatInfoStore,
	currentPresetProfileControlsStore,
	currentUserAvatarStore,
	documentRef = document,
	onQuickReplyHostChange,
	onTextareaHostChange,
	primarySendActionStore,
	quickReplyEnabledStore,
	quickShortcutStore,
	sillyTavernInterface = NOOP_MOBILE_SEND_FORM_SILLYTAVERN_INTERFACE,
}: {
	chatContextUsageStore: ChatContextUsageStore;
	currentConnectionInfoStore: CurrentConnectionInfoStore;
	currentChatIdentityStore: CurrentChatIdentityStore;
	currentChatInfoStore: CurrentChatInfoStore;
	currentPresetProfileControlsStore: CurrentPresetProfileControlsStore;
	currentUserAvatarStore: CurrentUserAvatarStore;
	documentRef?: Document;
	onQuickReplyHostChange(host: HTMLDivElement | null): void;
	onTextareaHostChange(host: HTMLDivElement | null): void;
	primarySendActionStore: PrimarySendActionStore;
	quickReplyEnabledStore: NativeQuickReplyEnabledStore;
	quickShortcutStore: QuickShortcutStore;
	sillyTavernInterface?: MobileSendFormSillyTavernInterfaceAdapter;
}) {
	const contextUsageSnapshot = React.useSyncExternalStore(
		chatContextUsageStore.subscribe,
		chatContextUsageStore.getSnapshot,
		chatContextUsageStore.getSnapshot,
	);
	const currentConnectionSnapshot = React.useSyncExternalStore(
		currentConnectionInfoStore.subscribe,
		currentConnectionInfoStore.getSnapshot,
		currentConnectionInfoStore.getSnapshot,
	);
	const avatarSnapshot = React.useSyncExternalStore(
		currentUserAvatarStore.subscribe,
		currentUserAvatarStore.getSnapshot,
		currentUserAvatarStore.getSnapshot,
	);
	const currentChatIdentitySnapshot = React.useSyncExternalStore(
		currentChatIdentityStore.subscribe,
		currentChatIdentityStore.getSnapshot,
		currentChatIdentityStore.getSnapshot,
	);
	const currentChatInfoSnapshot = React.useSyncExternalStore(
		currentChatInfoStore.subscribe,
		currentChatInfoStore.getSnapshot,
		currentChatInfoStore.getSnapshot,
	);
	const currentPresetProfileControlsSnapshot = React.useSyncExternalStore(
		currentPresetProfileControlsStore.subscribe,
		currentPresetProfileControlsStore.getSnapshot,
		currentPresetProfileControlsStore.getSnapshot,
	);
	const primarySendActionSnapshot = React.useSyncExternalStore(
		primarySendActionStore.subscribe,
		primarySendActionStore.getSnapshot,
		primarySendActionStore.getSnapshot,
	);
	const quickShortcutStates = React.useSyncExternalStore(
		quickShortcutStore.subscribe,
		quickShortcutStore.getSnapshot,
		quickShortcutStore.getSnapshot,
	);
	const quickReplyEnabledSnapshot = React.useSyncExternalStore(
		quickReplyEnabledStore.subscribe,
		quickReplyEnabledStore.getSnapshot,
		quickReplyEnabledStore.getSnapshot,
	);
	const [managedTextarea, setManagedTextarea] =
		React.useState<HTMLTextAreaElement | null>(null);
	const [isTextareaMultiline, setIsTextareaMultiline] = React.useState(false);
	const [showShortcutsToolbar, setShowShortcutsToolbar] = React.useState(() =>
		readStoredShortcutsToolbarVisibility(documentRef),
	);
	const [showQuickReplyHost, setShowQuickReplyHost] = React.useState(() =>
		readStoredQuickReplyHostVisibility(documentRef),
	);
	const [isMainMenuOpen, setIsMainMenuOpen] = React.useState(false);
	const [currentChatActionDialog, setCurrentChatActionDialog] =
		React.useState<CurrentChatActionDialogState>(null);
	const [isConnectionProfileBusy, setIsConnectionProfileBusy] =
		React.useState(false);
	const currentChatActionDialogOpenHandleRef = React.useRef<
		number | ReturnType<typeof setTimeout> | null
	>(null);
	const currentChatActionDialogOpenHandleKindRef = React.useRef<
		"frame" | "timeout" | null
	>(null);
	const chatSettingsOverrideOpenHandleRef = React.useRef<
		number | ReturnType<typeof setTimeout> | null
	>(null);
	const chatSettingsOverrideOpenHandleKindRef = React.useRef<
		"frame" | "timeout" | null
	>(null);

	const clearPendingCurrentChatActionDialogOpen = React.useCallback(() => {
		const handle = currentChatActionDialogOpenHandleRef.current;
		const handleKind = currentChatActionDialogOpenHandleKindRef.current;

		if (handle === null) {
			return;
		}

		currentChatActionDialogOpenHandleRef.current = null;
		currentChatActionDialogOpenHandleKindRef.current = null;

		if (handleKind === "frame") {
			documentRef.defaultView?.cancelAnimationFrame(handle as number);
			return;
		}

		clearTimeout(handle as ReturnType<typeof setTimeout>);
	}, [documentRef]);

	const clearPendingChatSettingsOverrideOpen = React.useCallback(() => {
		const handle = chatSettingsOverrideOpenHandleRef.current;
		const handleKind = chatSettingsOverrideOpenHandleKindRef.current;

		if (handle === null) {
			return;
		}

		chatSettingsOverrideOpenHandleRef.current = null;
		chatSettingsOverrideOpenHandleKindRef.current = null;

		if (handleKind === "frame") {
			documentRef.defaultView?.cancelAnimationFrame(handle as number);
			return;
		}

		clearTimeout(handle as ReturnType<typeof setTimeout>);
	}, [documentRef]);

	const canShowQuickReplyHost =
		quickReplyEnabledSnapshot.hasNativeToggle &&
		quickReplyEnabledSnapshot.isEnabled;
	const shouldShowQuickReplyVisibilityToggle = canShowQuickReplyHost;
	const isQuickReplyHostVisible = canShowQuickReplyHost
		? showQuickReplyHost
		: false;

	React.useEffect(() => {
		return () => {
			clearPendingCurrentChatActionDialogOpen();
		};
	}, [clearPendingCurrentChatActionDialogOpen]);

	React.useEffect(() => {
		return () => {
			clearPendingChatSettingsOverrideOpen();
		};
	}, [clearPendingChatSettingsOverrideOpen]);

	React.useEffect(() => {
		const syncManagedTextarea = () => {
			const textarea = documentRef.getElementById("send_textarea");
			setManagedTextarea((current) => {
				if (textarea instanceof HTMLTextAreaElement) {
					return current === textarea ? current : textarea;
				}

				return null;
			});
		};

		syncManagedTextarea();

		const body = documentRef.body;
		if (!(body instanceof HTMLElement)) {
			return;
		}

		const observer = new MutationObserver(syncManagedTextarea);
		observer.observe(body, { childList: true, subtree: true });

		return () => {
			observer.disconnect();
		};
	}, [documentRef]);

	React.useEffect(() => {
		if (!(managedTextarea instanceof HTMLTextAreaElement)) {
			setIsTextareaMultiline(false);
			return;
		}

		const syncTextareaLayoutState = () => {
			const nextIsMultiline = readIsTextareaMultiline(managedTextarea);
			setIsTextareaMultiline((current) =>
				current === nextIsMultiline ? current : nextIsMultiline,
			);
		};

		syncTextareaLayoutState();

		const resizeObserver =
			typeof ResizeObserver === "function"
				? new ResizeObserver(syncTextareaLayoutState)
				: null;
		resizeObserver?.observe(managedTextarea);

		const defaultView = documentRef.defaultView;
		managedTextarea.addEventListener("input", syncTextareaLayoutState);
		defaultView?.addEventListener("resize", syncTextareaLayoutState);

		return () => {
			resizeObserver?.disconnect();
			managedTextarea.removeEventListener(
				"input",
				syncTextareaLayoutState,
			);
			defaultView?.removeEventListener("resize", syncTextareaLayoutState);
		};
	}, [documentRef, managedTextarea]);

	const handleTextareaHostRef = React.useCallback(
		(host: HTMLDivElement | null) => {
			onTextareaHostChange(host);
		},
		[onTextareaHostChange],
	);

	const handlePrimarySendActionClick = React.useCallback(() => {
		primarySendActionStore.trigger();
	}, [primarySendActionStore]);

	const handleQuickShortcutClick = React.useCallback(
		(shortcutId: string) => {
			const descriptor = SEND_FORM_SHORTCUTS.find(
				(item) => item.id === shortcutId,
			);
			if (!descriptor) {
				return;
			}

			triggerNativeQuickShortcut({
				descriptor,
				documentRef,
			});
		},
		[documentRef],
	);
	const handleShortcutsToolbarVisibilityChange = React.useCallback(
		(nextValue: boolean) => {
			setShowShortcutsToolbar(nextValue);
			persistShortcutsToolbarVisibility(documentRef, nextValue);
		},
		[documentRef],
	);
	const handleQuickReplyHostVisibilityToggle = React.useCallback(() => {
		setShowQuickReplyHost((current) => {
			const nextValue = !current;
			persistQuickReplyHostVisibility(documentRef, nextValue);
			return nextValue;
		});
	}, [documentRef]);
	const primarySendActionIcon = resolvePrimarySendActionIcon(
		primarySendActionSnapshot.kind,
	);
	const visibleQuickShortcuts = SEND_FORM_SHORTCUTS.flatMap((descriptor) => {
		const state = quickShortcutStates.find(
			(item) => item.id === descriptor.id,
		);
		if (!state?.isVisible) {
			return [];
		}

		return [
			{
				...descriptor,
				label: state.label,
			},
		];
	});
	const showContextUsageShortcut =
		shouldShowContextUsageShortcut(contextUsageSnapshot);
	const shortcutsToolbarLabel = translateAstra("sendForm.shortcuts.toolbar");
	const sillyTavernInterfaceTriggerLabel = translateAstra(
		"sillyTavernInterface.trigger",
	);
	const quickReplyVisibilityToggleLabel = translateAstra(
		isQuickReplyHostVisible
			? "sendForm.quickReply.hide"
			: "sendForm.quickReply.show",
	);
	const inputRowLabel = translateAstra("sendForm.input.row");
	const currentUserAvatarLabel = translateAstra(
		"sendForm.avatar.currentUser",
	);
	const leftControlsLabel = translateAstra("sendForm.input.leftControls");
	const handleMainMenuOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			if (
				nextOpen &&
				!isMainMenuOpen &&
				currentChatInfoSnapshot.hasActiveChat &&
				(currentChatInfoSnapshot.metadataStatus !== "ready" ||
					currentChatInfoSnapshot.lastUpdatedAt === null ||
					!currentChatInfoSnapshot.fileSize)
			) {
				currentChatInfoStore.refresh();
			}

			setIsMainMenuOpen(nextOpen);
		},
		[
			currentChatInfoSnapshot.hasActiveChat,
			currentChatInfoSnapshot.lastUpdatedAt,
			currentChatInfoSnapshot.metadataStatus,
			currentChatInfoSnapshot.fileSize,
			currentChatInfoStore,
			isMainMenuOpen,
		],
	);

	const handleMainMenuOpen = React.useCallback(() => {
		releaseSendFormFocus(documentRef);
		handleMainMenuOpenChange(true);
	}, [documentRef, handleMainMenuOpenChange]);

	const handleMainMenuTriggerPointerDownCapture = React.useCallback(() => {
		releaseSendFormFocus(documentRef);
	}, [documentRef]);

	const handleMainMenuTriggerKeyDownCapture = React.useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (!isMenuOpenKeyboardEvent(event.nativeEvent)) {
				return;
			}

			releaseSendFormFocus(documentRef);
		},
		[documentRef],
	);

	const handleSillyTavernInterfaceShortcutSelect = React.useCallback(
		(pageKey: SillyTavernInterfaceRouteKey) => {
			handleMainMenuOpenChange(false);
			sillyTavernInterface.openRoute(pageKey);
		},
		[sillyTavernInterface, handleMainMenuOpenChange],
	);

	const handleChatSettingsOverrideRequest = React.useCallback(() => {
		const chatKind = currentChatIdentitySnapshot.kind;
		if (chatKind !== "character" && chatKind !== "group") {
			return;
		}

		clearPendingChatSettingsOverrideOpen();
		handleMainMenuOpenChange(false);

		const openNativeOverride = () => {
			chatSettingsOverrideOpenHandleRef.current = null;
			chatSettingsOverrideOpenHandleKindRef.current = null;
			triggerNativeChatSettingsOverride({
				documentRef,
				kind: chatKind,
			});
		};
		const view = documentRef.defaultView;

		if (typeof view?.requestAnimationFrame === "function") {
			chatSettingsOverrideOpenHandleKindRef.current = "frame";
			chatSettingsOverrideOpenHandleRef.current =
				view.requestAnimationFrame(openNativeOverride);
			return;
		}

		chatSettingsOverrideOpenHandleKindRef.current = "timeout";
		chatSettingsOverrideOpenHandleRef.current = setTimeout(
			openNativeOverride,
			0,
		);
	}, [
		clearPendingChatSettingsOverrideOpen,
		currentChatIdentitySnapshot.kind,
		documentRef,
		handleMainMenuOpenChange,
	]);

	const scheduleCurrentChatActionDialog = React.useCallback(
		(kind: CurrentChatActionDialogKind) => {
			if (!currentChatIdentitySnapshot.hasActiveChat) {
				return;
			}

			clearPendingCurrentChatActionDialogOpen();
			handleMainMenuOpenChange(false);

			const nextDialogState: CurrentChatActionDialogState = {
				chatInfoSnapshot: cloneCurrentChatInfoSnapshot(
					currentChatInfoSnapshot,
				),
				kind,
				snapshot: cloneCurrentChatIdentitySnapshot(
					currentChatIdentitySnapshot,
				),
			};
			const openDialog = () => {
				currentChatActionDialogOpenHandleRef.current = null;
				currentChatActionDialogOpenHandleKindRef.current = null;
				setCurrentChatActionDialog(nextDialogState);
			};
			const view = documentRef.defaultView;

			if (typeof view?.requestAnimationFrame === "function") {
				currentChatActionDialogOpenHandleKindRef.current = "frame";
				currentChatActionDialogOpenHandleRef.current =
					view.requestAnimationFrame(openDialog);
				return;
			}

			currentChatActionDialogOpenHandleKindRef.current = "timeout";
			currentChatActionDialogOpenHandleRef.current = setTimeout(
				openDialog,
				0,
			);
		},
		[
			clearPendingCurrentChatActionDialogOpen,
			currentChatIdentitySnapshot,
			currentChatInfoSnapshot,
			documentRef,
			handleMainMenuOpenChange,
		],
	);

	const handleMainMenuDeleteRequest = React.useCallback(() => {
		if (!currentChatIdentitySnapshot.hasActiveChat) {
			return;
		}

		scheduleCurrentChatActionDialog("delete");
	}, [
		currentChatIdentitySnapshot.hasActiveChat,
		scheduleCurrentChatActionDialog,
	]);

	const handleMainMenuRenameRequest = React.useCallback(() => {
		if (!currentChatIdentitySnapshot.hasActiveChat) {
			return;
		}

		scheduleCurrentChatActionDialog("rename");
	}, [
		currentChatIdentitySnapshot.hasActiveChat,
		scheduleCurrentChatActionDialog,
	]);

	const handleConnectionProfileChange = React.useCallback(
		async (nextProfileId: string) => {
			const connectionProfiles =
				currentPresetProfileControlsSnapshot.connectionProfiles;
			if (
				isConnectionProfileBusy ||
				(connectionProfiles.authority !== "detached" &&
					nextProfileId === connectionProfiles.selectedProfileId)
			) {
				return;
			}

			setIsConnectionProfileBusy(true);
			try {
				await currentPresetProfileControlsStore.applyConnectionProfile(
					nextProfileId,
				);
			} finally {
				setIsConnectionProfileBusy(false);
			}
		},
		[
			currentPresetProfileControlsSnapshot.connectionProfiles.authority,
			currentPresetProfileControlsSnapshot.connectionProfiles
				.selectedProfileId,
			currentPresetProfileControlsStore,
			isConnectionProfileBusy,
		],
	);

	const handleCurrentChatActionDialogOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				clearPendingCurrentChatActionDialogOpen();
				setCurrentChatActionDialog(null);
			}
		},
		[clearPendingCurrentChatActionDialogOpen],
	);

	const refreshCurrentChatShellState = React.useCallback(() => {
		currentChatIdentityStore.refresh();
		currentChatInfoStore.refresh();
	}, [currentChatIdentityStore, currentChatInfoStore]);

	const handleConfirmRename = React.useCallback(
		async (
			input: RenameCurrentChatInput,
		): Promise<RenameCurrentChatResult> => {
			const result = await renameCurrentChat(input);

			if (result.ok) {
				currentChatIdentityStore.refresh();
				currentChatInfoStore.refresh();
				showToast(
					"success",
					translateAstra("sendForm.mainMenu.rename.success"),
				);
				return result;
			}

			showToast(
				"error",
				translateAstra("sendForm.mainMenu.rename.failure"),
			);
			return result;
		},
		[currentChatIdentityStore, currentChatInfoStore],
	);

	const handleConfirmDelete = React.useCallback(
		async (expectedFileName: string): Promise<DeleteCurrentChatResult> => {
			const result = await deleteCurrentChat({
				expectedFileName,
			});

			refreshCurrentChatShellState();

			if (result.ok) {
				showToast(
					"success",
					translateAstra("sendForm.mainMenu.delete.success"),
				);
				return result;
			}

			if (
				result.reason === "chat-changed" ||
				result.reason === "no-active-chat"
			) {
				setCurrentChatActionDialog(null);
				showToast(
					"error",
					translateAstra("sendForm.mainMenu.delete.stale"),
				);
				return result;
			}

			showToast(
				"error",
				translateAstra("sendForm.mainMenu.delete.failure"),
			);
			return result;
		},
		[refreshCurrentChatShellState],
	);

	const currentChatActionDialogSnapshot =
		currentChatActionDialog?.snapshot ?? currentChatIdentitySnapshot;
	const currentChatActionDialogInfoSnapshot =
		currentChatActionDialog?.chatInfoSnapshot ?? currentChatInfoSnapshot;
	const isRenameDialogOpen = currentChatActionDialog?.kind === "rename";
	const isDeleteDialogOpen = currentChatActionDialog?.kind === "delete";
	const shortcutsToolbar = showShortcutsToolbar ? (
		<MobileSendFormShortcutsToolbar
			contextUsageSnapshot={contextUsageSnapshot}
			label={shortcutsToolbarLabel}
			sillyTavernInterfaceTriggerLabel={sillyTavernInterfaceTriggerLabel}
			showContextUsageShortcut={showContextUsageShortcut}
			visibleQuickShortcuts={visibleQuickShortcuts}
			onSillyTavernInterfaceOpen={sillyTavernInterface.openCurrentPage}
			onQuickShortcutClick={handleQuickShortcutClick}
		/>
	) : null;
	const inputRow = (
		<MobileChatInput
			currentUserAvatarLabel={currentUserAvatarLabel}
			documentRef={documentRef}
			inputRowLabel={inputRowLabel}
			isMainMenuOpen={isMainMenuOpen}
			isQuickReplyHostVisible={isQuickReplyHostVisible}
			isTextareaMultiline={isTextareaMultiline}
			leftControlsLabel={leftControlsLabel}
			primarySendActionIcon={primarySendActionIcon}
			primarySendActionSnapshot={primarySendActionSnapshot}
			quickReplyVisibilityToggleLabel={quickReplyVisibilityToggleLabel}
			showQuickReplyVisibilityToggle={
				shouldShowQuickReplyVisibilityToggle
			}
			showShortcutsToolbar={showShortcutsToolbar}
			userAvatarSnapshot={avatarSnapshot}
			onMainMenuOpen={handleMainMenuOpen}
			onMainMenuTriggerKeyDownCapture={
				handleMainMenuTriggerKeyDownCapture
			}
			onMainMenuTriggerPointerDownCapture={
				handleMainMenuTriggerPointerDownCapture
			}
			onPrimarySendActionClick={handlePrimarySendActionClick}
			onQuickReplyHostChange={onQuickReplyHostChange}
			onQuickReplyHostVisibilityToggle={
				handleQuickReplyHostVisibilityToggle
			}
			onShortcutsToolbarVisibilityChange={
				handleShortcutsToolbarVisibilityChange
			}
			onTextareaHostChange={handleTextareaHostRef}
		/>
	);

	return (
		<>
			<div
				className="mobile-chat-composer"
				data-shortcuts-visible={showShortcutsToolbar ? "true" : "false"}
				data-slot="mobile-chat-composer"
			>
				<div className="mobile-chat-composer__input-region">
					<div
						id={MOBILE_CHAT_INPUT_HOST_ID}
						className="mobile-chat-input-host"
					>
						{inputRow}
					</div>
				</div>
				<div className="mobile-chat-composer__shortcuts-region">
					<div
						id={MOBILE_CHAT_SHORTCUTS_HOST_ID}
						className="mobile-chat-shortcuts-host"
					>
						{shortcutsToolbar}
					</div>
				</div>
			</div>
			<MobileChatMainMenuDrawer
				chatContextUsageSnapshot={contextUsageSnapshot}
				currentConnectionSnapshot={currentConnectionSnapshot}
				chatInfoSnapshot={currentChatInfoSnapshot}
				controlsBusy={isConnectionProfileBusy}
				currentPresetProfileControlsSnapshot={
					currentPresetProfileControlsSnapshot
				}
				currentUserSnapshot={avatarSnapshot}
				onConnectionProfileChange={handleConnectionProfileChange}
				onSillyTavernInterfaceShortcutSelect={
					handleSillyTavernInterfaceShortcutSelect
				}
				onRequestChatSettingsOverride={
					handleChatSettingsOverrideRequest
				}
					onRequestDelete={handleMainMenuDeleteRequest}
					onOpenChange={handleMainMenuOpenChange}
					onRequestRename={handleMainMenuRenameRequest}
					open={isMainMenuOpen}
					renderSillyTavernInterfaceRouteIcon={
						sillyTavernInterface.renderRouteIcon
					}
					snapshot={currentChatIdentitySnapshot}
				/>
				<CurrentChatDeleteDialog
				chatInfoSnapshot={currentChatActionDialogInfoSnapshot}
				open={isDeleteDialogOpen}
				snapshot={currentChatActionDialogSnapshot}
				onConfirmDelete={handleConfirmDelete}
				onOpenChange={handleCurrentChatActionDialogOpenChange}
			/>
			<CurrentChatRenameDialog
				chatInfoSnapshot={currentChatActionDialogInfoSnapshot}
				open={isRenameDialogOpen}
				snapshot={currentChatActionDialogSnapshot}
				onConfirmRename={handleConfirmRename}
				onOpenChange={handleCurrentChatActionDialogOpenChange}
			/>
		</>
	);
}
