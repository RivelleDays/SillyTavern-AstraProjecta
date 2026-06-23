import * as React from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogClose,
	useResponsiveDialogClose,
} from "@/components/ui/astra/ResponsiveDialog";
import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	Bookmark,
	FileJson,
	FileText,
	MessageCircleMore,
	PencilLine,
	Trash2,
	type LucideIcon,
} from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import {
	type ChatCatalogEntry,
	type ChatCatalogExportFormat,
	type DeleteChatCatalogEntry,
	type ExportChatCatalogEntry,
	type OpenChatCatalogEntry,
	type RenameChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import {
	ChatCategoryAssignmentDrawer,
	CHAT_ROW_CATEGORY_DRAWER_ID,
} from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryUi";
import {
	ChatCatalogRowActionDialog,
	ChatCatalogRowDialogIdentityHeader,
} from "@/packages/features/astra-main-interface/chat-list/ChatCatalogRowActionDialog";
import type { ChatCatalogRowOverlayController } from "@/packages/features/astra-main-interface/chat-list/useChatCatalogRowOverlayController";
import type { I18nKey } from "@/types/i18n";

const CHAT_ROW_DRAWER_EXIT_UNMOUNT_MS = 650;
export const CHAT_ROW_ACTIONS_DRAWER_ID =
	"astra-main-interface-chat-actions-drawer";
const CHAT_ROW_ACTIONS_DRAWER_MENU_ID =
	"astra-main-interface-chat-actions-drawer-menu";

const CHAT_ROW_EXPORT_OPTIONS: Array<{
	format: ChatCatalogExportFormat;
	icon: LucideIcon;
	labelKey: I18nKey;
}> = [
	{
		format: "jsonl",
		icon: FileJson,
		labelKey: "astraMainInterface.chatMenu.action.exportJsonl",
	},
	{
		format: "txt",
		icon: FileText,
		labelKey: "astraMainInterface.chatMenu.action.exportText",
	},
];

export interface ChatCatalogRowOverlaysProps {
	chatCategoryStore: ChatCategoryStore;
	controller: ChatCatalogRowOverlayController;
	deleteChat: DeleteChatCatalogEntry;
	exportChat: ExportChatCatalogEntry;
	onSuccess?: () => void;
	openEntry: OpenChatCatalogEntry;
	openEntryDisabled: boolean;
	renameChat: RenameChatCatalogEntry;
}

function showAstraToast(kind: "error" | "success", message: string) {
	const toastr = (
		globalThis as typeof globalThis & {
			toastr?: {
				error?: (message: string) => void;
				success?: (message: string) => void;
			};
		}
	).toastr;
	const handler = toastr?.[kind];
	if (typeof handler === "function") {
		handler.call(toastr, message);
	}
}

function useDelayedDrawerContentMount(isOpen: boolean) {
	const [isContentMounted, setIsContentMounted] = React.useState(isOpen);

	React.useEffect(() => {
		if (isOpen) {
			setIsContentMounted(true);
			return undefined;
		}

		if (!isContentMounted) {
			return undefined;
		}

		const timeoutId = setTimeout(() => {
			setIsContentMounted(false);
		}, CHAT_ROW_DRAWER_EXIT_UNMOUNT_MS);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [isContentMounted, isOpen]);

	return isOpen || isContentMounted;
}

function ChatActionsDrawerItemButton({
	ariaControls,
	ariaExpanded,
	closeBeforeAction = false,
	dataState,
	disabled = false,
	icon,
	label,
	modifierClassName,
	onClick,
}: {
	ariaControls?: string;
	ariaExpanded?: boolean;
	closeBeforeAction?: boolean;
	dataState?: "off" | "on";
	disabled?: boolean;
	icon: LucideIcon;
	label: string;
	modifierClassName?: string;
	onClick?: () => void;
}) {
	const close = useResponsiveDialogClose();

	function handleClick() {
		if (closeBeforeAction) {
			close();
		}
		onClick?.();
	}

	return (
		<button
			aria-controls={ariaControls}
			aria-expanded={ariaExpanded}
			className={cn(
				"astra-main-interface-chat-actions-drawer__item",
				modifierClassName,
			)}
			data-state={dataState}
			disabled={disabled}
			title={label}
			type="button"
			onClick={handleClick}
		>
			<UiIcon aria-hidden={true} icon={icon} size="sm" />
			<span>{label}</span>
		</button>
	);
}

function ChatCatalogRowActionsDrawer({
	categoryDrawerOpen,
	entry,
	exportChat,
	hasAssignedCategories,
	onOpenEntry,
	onOpenCategories,
	onOpenChange,
	openEntryDisabled,
	onRequestDelete,
	onRequestRename,
}: {
	categoryDrawerOpen: boolean;
	entry: ChatCatalogEntry | null;
	exportChat: ExportChatCatalogEntry;
	hasAssignedCategories: boolean;
	onOpenEntry: OpenChatCatalogEntry;
	onOpenCategories: (entry: ChatCatalogEntry) => void;
	onOpenChange: (open: boolean) => void;
	openEntryDisabled: boolean;
	onRequestDelete: (entry: ChatCatalogEntry) => void;
	onRequestRename: (entry: ChatCatalogEntry) => void;
}) {
	const [exportingFormat, setExportingFormat] =
		React.useState<ChatCatalogExportFormat | null>(null);
	const [retainedEntry, setRetainedEntry] =
		React.useState<ChatCatalogEntry | null>(entry);
	const isOpen = entry !== null;
	const activeEntryKey = entry?.key ?? null;
	const shouldRenderDrawer = useDelayedDrawerContentMount(isOpen);
	const drawerEntry = entry ?? retainedEntry;
	const isExporting = exportingFormat !== null;
	const activeEntryKeyRef = React.useRef<string | null>(activeEntryKey);
	const isMountedRef = React.useRef(false);
	const isOpenRef = React.useRef(isOpen);
	const latestExportRequestRef = React.useRef(0);
	const title = translateAstra("astraMainInterface.chatMenu.actions");
	const descriptionPrefix = translateAstra(
		"astraMainInterface.chatMenu.actions.description",
	);
	const chatFileGroupLabel = translateAstra(
		"astraMainInterface.chatMenu.actions.group.chatFile",
	);
	const exportTitle = translateAstra(
		"astraMainInterface.chatMenu.export.title",
	);

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	React.useEffect(() => {
		isMountedRef.current = true;

		return () => {
			isMountedRef.current = false;
			latestExportRequestRef.current += 1;
		};
	}, []);

	React.useEffect(() => {
		if (entry) {
			setRetainedEntry(entry);
		}
	}, [entry]);

	React.useLayoutEffect(() => {
		const didEntryChange = activeEntryKeyRef.current !== activeEntryKey;
		const didOpenChange = isOpenRef.current !== isOpen;

		activeEntryKeyRef.current = activeEntryKey;
		isOpenRef.current = isOpen;

		if (didEntryChange || (didOpenChange && !isOpen)) {
			latestExportRequestRef.current += 1;
			setExportingFormat(null);
		}
	}, [activeEntryKey, isOpen]);

	React.useEffect(() => {
		if (!shouldRenderDrawer && !isOpen) {
			setRetainedEntry(null);
		}
	}, [isOpen, shouldRenderDrawer]);

	const handleExport = React.useCallback(
		async (format: ChatCatalogExportFormat) => {
			if (!entry || isExporting) {
				return;
			}

			const exportEntry = entry;
			const exportEntryKey = entry.key;
			const exportRequestId = latestExportRequestRef.current + 1;
			latestExportRequestRef.current = exportRequestId;
			setExportingFormat(format);
			const result = await exportChat(exportEntry, format).catch(() => ({
				ok: false as const,
				reason: "export-failed" as const,
			}));
			const isActiveRequest =
				isMountedRef.current &&
				isOpenRef.current &&
				latestExportRequestRef.current === exportRequestId &&
				activeEntryKeyRef.current === exportEntryKey;

			if (!isActiveRequest) {
				return;
			}

			if (result.ok) {
				showAstraToast(
					"success",
					translateAstra(
						"astraMainInterface.chatMenu.export.success",
					),
				);
				setExportingFormat(null);
				onOpenChange(false);
				return;
			}

			setExportingFormat(null);
			showAstraToast(
				"error",
				translateAstra("astraMainInterface.chatMenu.export.failure"),
			);
		},
		[entry, exportChat, isExporting, onOpenChange],
	);

	if (!shouldRenderDrawer || !drawerEntry) {
		return null;
	}

	const description = (
		<span className="astra-dialog-current-chat-file-description">
			{descriptionPrefix}{" "}
			<span className="astra-dialog-current-chat-file-token">
				<span className="astra-dialog-current-chat-file-name">
					{drawerEntry.chatId}
				</span>
			</span>
			.
		</span>
	);
	const footer = (
		<ChatCatalogRowActionsDrawerFooter
			entry={drawerEntry}
			isExporting={isExporting}
			onOpenEntry={onOpenEntry}
			openEntryDisabled={openEntryDisabled}
		/>
	);

	return (
		<ResponsiveDialog
			className="astra-main-interface-drawer astra-main-interface-chat-row-action-dialog astra-main-interface-chat-actions-drawer"
			contentId={CHAT_ROW_ACTIONS_DRAWER_ID}
			description={description}
			footer={footer}
			headerContent={
				<ChatCatalogRowDialogIdentityHeader entry={drawerEntry} />
			}
			icon={
				<UiIcon aria-hidden={true} icon={MessageCircleMore} size="sm" />
			}
			open={isOpen}
			scrollBody={true}
			title={title}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			<div className="astra-dialog-section astra-chat-library-dialog-content">
				<div
					className="astra-main-interface-chat-actions-drawer__menu"
					id={CHAT_ROW_ACTIONS_DRAWER_MENU_ID}
				>
					<section className="astra-main-interface-chat-actions-drawer__group astra-main-interface-chat-actions-drawer__group--chat-file">
						<div className="astra-main-interface-chat-actions-drawer__group-label mobile-send-form-surface-label">
							{chatFileGroupLabel}
						</div>
						<div className="astra-main-interface-chat-actions-drawer__group-items">
							<ChatActionsDrawerItemButton
								disabled={isExporting || !entry}
								icon={Trash2}
								label={translateAstra(
									"astraMainInterface.chatMenu.action.delete",
								)}
								modifierClassName="astra-main-interface-chat-actions-drawer__item--destructive astra-main-interface-chat-actions-drawer__item--delete"
								closeBeforeAction={true}
								onClick={() => {
									if (entry) {
										onRequestDelete(entry);
									}
								}}
							/>
							<ChatActionsDrawerItemButton
								ariaControls={CHAT_ROW_CATEGORY_DRAWER_ID}
								ariaExpanded={categoryDrawerOpen}
								dataState={hasAssignedCategories ? "on" : "off"}
								disabled={isExporting || !entry}
								icon={Bookmark}
								label={translateAstra(
									"astraMainInterface.chatMenu.action.categories",
								)}
								modifierClassName="astra-main-interface-chat-actions-drawer__item--categories"
								closeBeforeAction={true}
								onClick={() => {
									if (entry) {
										onOpenCategories(entry);
									}
								}}
							/>
							<ChatActionsDrawerItemButton
								disabled={isExporting || !entry}
								icon={PencilLine}
								label={translateAstra(
									"astraMainInterface.chatMenu.action.rename",
								)}
								modifierClassName="astra-main-interface-chat-actions-drawer__item--rename"
								closeBeforeAction={true}
								onClick={() => {
									if (entry) {
										onRequestRename(entry);
									}
								}}
							/>
						</div>
					</section>
					<section className="astra-main-interface-chat-actions-drawer__group astra-main-interface-chat-actions-drawer__group--export">
						<div className="astra-main-interface-chat-actions-drawer__group-label mobile-send-form-surface-label">
							{exportTitle}
						</div>
						<div className="astra-main-interface-chat-actions-drawer__group-items">
							{CHAT_ROW_EXPORT_OPTIONS.map((option) => (
								<ChatActionsDrawerItemButton
									disabled={isExporting || !entry}
									icon={option.icon}
									key={option.format}
									label={translateAstra(option.labelKey)}
									modifierClassName="astra-main-interface-chat-actions-drawer__item--export"
									onClick={() => {
										void handleExport(option.format);
									}}
								/>
							))}
						</div>
					</section>
				</div>
			</div>
		</ResponsiveDialog>
	);
}

function ChatCatalogRowActionsDrawerFooter({
	entry,
	isExporting,
	onOpenEntry,
	openEntryDisabled,
}: {
	entry: ChatCatalogEntry;
	isExporting: boolean;
	onOpenEntry: OpenChatCatalogEntry;
	openEntryDisabled: boolean;
}) {
	const close = useResponsiveDialogClose();
	const cancelLabel = translateAstra(
		"astraMainInterface.chatMenu.actions.cancel",
	);
	const openLabel = translateAstra(
		"astraMainInterface.chatMenu.actions.open",
	);

	return (
		<div className="astra-chat-library-dialog-footer">
			<div className="astra-chat-library-dialog-footer-actions">
				<ResponsiveDialogClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						type="button"
						variant="ghost"
					>
						{cancelLabel}
					</Button>
				</ResponsiveDialogClose>
				<Button
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--confirm"
					disabled={isExporting || openEntryDisabled}
					type="button"
					variant="default"
					onClick={() => {
						close();
						void onOpenEntry(entry);
					}}
				>
					<UiIcon
						aria-hidden={true}
						icon={MessageCircleMore}
						size="sm"
					/>
					{openLabel}
				</Button>
			</div>
		</div>
	);
}

export function ChatCatalogRowOverlays({
	chatCategoryStore,
	controller,
	deleteChat,
	exportChat,
	onSuccess,
	openEntry,
	openEntryDisabled,
	renameChat,
}: ChatCatalogRowOverlaysProps) {
	const categorySnapshot = React.useSyncExternalStore(
		chatCategoryStore.subscribe,
		chatCategoryStore.getSnapshot,
		chatCategoryStore.getSnapshot,
	);
	const {
		activeActionsEntry,
		activeCategoryEntry,
		activeRowAction,
		closeActiveOverlay,
		queueCategories,
		queueDelete,
		queueRename,
	} = controller;
	const assignedChatKeys = React.useMemo(
		() =>
			new Set(
				Object.entries(categorySnapshot.chatMap)
					.filter(([, categoryIds]) => categoryIds.length > 0)
					.map(([chatKey]) => chatKey),
			),
		[categorySnapshot.chatMap],
	);
	const activeEntry = activeActionsEntry ?? activeCategoryEntry;

	return (
		<>
			<ChatCatalogRowActionsDrawer
				categoryDrawerOpen={
					activeCategoryEntry !== null &&
					(activeActionsEntry === null ||
						activeCategoryEntry.key === activeActionsEntry.key)
				}
				entry={activeActionsEntry}
				exportChat={exportChat}
				hasAssignedCategories={
					activeEntry ? assignedChatKeys.has(activeEntry.key) : false
				}
				onOpenEntry={openEntry}
				onOpenCategories={queueCategories}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						closeActiveOverlay();
					}
				}}
				openEntryDisabled={openEntryDisabled}
				onRequestDelete={queueDelete}
				onRequestRename={queueRename}
			/>

			<ChatCategoryAssignmentDrawer
				chatCategoryStore={chatCategoryStore}
				entry={activeCategoryEntry}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						closeActiveOverlay();
					}
				}}
			/>

			<ChatCatalogRowActionDialog
				action={activeRowAction}
				onConfirmDelete={async (entry) => {
					const result = await deleteChat(entry);
					if (!result || result.ok) {
						chatCategoryStore.removeChatKey(entry.key);
					}

					return result;
				}}
				onConfirmRename={async (entry, newFileName) => {
					const result = await renameChat(entry, newFileName);
					if (!result || result.ok) {
						chatCategoryStore.moveChatKey(
							entry.key,
							`${entry.kind}:${entry.entityId}:${newFileName}`,
						);
					}

					return result;
				}}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						closeActiveOverlay();
					}
				}}
				onSuccess={() => {
					onSuccess?.();
				}}
			/>
		</>
	);
}
