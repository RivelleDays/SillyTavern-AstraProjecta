import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/shadcn/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/astra/dropdown-menu";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/astra/drawer";
import { ResponsiveDialog } from "@/components/ui/astra/ResponsiveDialog";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/shadcn/empty";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Switch } from "@/components/ui/shadcn/switch";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	ArrowDown01,
	ArrowDown10,
	ArrowDownAZ,
	ArrowDownNarrowWide,
	ArrowUpWideNarrow,
	ArrowUpZA,
	Bookmark,
	ChevronDown,
	CircleX,
	Clock,
	Database,
	Ellipsis,
	FileJson,
	FileSearch,
	FileText,
	Funnel,
	MessageCircle,
	MessageCircleMore,
	PencilLine,
	RefreshCcw,
	Rows3,
	Search,
	Trash2,
	Type,
	type LucideIcon,
} from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import {
	type ChatCatalogEntry,
	type ChatCatalogExportFormat,
	type ChatCatalogSortMode,
	type DeleteChatCatalogEntry,
	type ExportChatCatalogEntry,
	type OpenChatCatalogEntry,
	type RenameChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import {
	ChatCategoryAssignmentDrawer,
	CHAT_ROW_CATEGORY_DRAWER_ID,
	useChatCategoryStore,
} from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryUi";
import {
	ChatCatalogRowActionDialog,
	ChatCatalogRowDialogIdentityHeader,
	type ChatCatalogRowActionDialogState,
} from "@/packages/features/astra-main-interface/chat-list/ChatCatalogRowActionDialog";
import { useChatCatalogEntryOpenController } from "@/packages/features/astra-main-interface/chat-list/useChatCatalogEntryOpenController";
import type { ChatMenuPreviewLineCount } from "@/packages/features/astra-main-interface/chat-list/chatMenuDisplayPreferences";
import type { I18nKey } from "@/types/i18n";

const CHAT_LIST_PAGE_SIZE = 50;
const CHAT_MENU_DRAWER_EXIT_UNMOUNT_MS = 650;
const CHAT_MENU_CONTROLS_DRAWER_ID = "astra-main-interface-controls-drawer";
const CHAT_MENU_CONTROLS_DRAWER_TITLE_ID =
	"astra-main-interface-controls-drawer-title";
const CHAT_MENU_CONTROLS_DRAWER_DESCRIPTION_ID =
	"astra-main-interface-controls-drawer-description";
const CHAT_MENU_CONTROLS_DRAWER_SCROLLABLE_CONTENT_ID =
	"astra-main-interface-controls-drawer-scrollable-content";
const CHAT_MENU_CONTROLS_DRAWER_MENU_ID =
	"astra-main-interface-controls-drawer-menu";
const CHAT_MENU_CONTROLS_DRAWER_AVATARS_TOGGLE_ID =
	"astra-main-interface-controls-drawer-avatars-toggle";
const CHAT_MENU_CONTROLS_DRAWER_AVATARS_TOGGLE_SWITCH_ID =
	"astra-main-interface-controls-drawer-avatars-toggle-switch";
const CHAT_ROW_ACTIONS_DRAWER_ID = "astra-main-interface-chat-actions-drawer";
const CHAT_ROW_ACTIONS_DRAWER_MENU_ID =
	"astra-main-interface-chat-actions-drawer-menu";

type ChatMenuSortField = "last-message" | "messages" | "name";
type ChatMenuSortDirection = "ascending" | "descending";
type ChatMenuSortOrder = "natural" | "reverse";
type ChatListRowVariant = "current" | "global";

export interface ChatListCopy {
	controlsDescription: I18nKey;
	controlsTitle: I18nKey;
	controlsTrigger: I18nKey;
	emptyDescription: I18nKey;
	emptySearch: I18nKey;
	emptySearchDescription: I18nKey;
	emptyTitle: I18nKey;
	listLabel: I18nKey;
	searchClear: I18nKey;
	searchLabel: I18nKey;
	searchPlaceholder: I18nKey;
}

export interface ChatListSnapshotLike {
	entries: ChatCatalogEntry[];
	status: string;
}

export interface ChatListStoreLike<
	Snapshot extends ChatListSnapshotLike = ChatListSnapshotLike,
> {
	getSnapshot(): Snapshot;
	refresh(): void;
	subscribe(listener: () => void): () => void;
}

export interface ChatListExperienceProps<
	Snapshot extends ChatListSnapshotLike = ChatListSnapshotLike,
> {
	chatCategoryStore?: ChatCategoryStore;
	copy: ChatListCopy;
	deleteChat: DeleteChatCatalogEntry;
	exportChat: ExportChatCatalogEntry;
	filterEntries(
		entries: ChatCatalogEntry[],
		query: string,
	): ChatCatalogEntry[];
	listClassName?: string;
	listItemClassName?: string;
	onRequestClose?: () => void;
	openChat: OpenChatCatalogEntry;
	persistPreviewLineCount(
		storage: Storage | null | undefined,
		lineCount: unknown,
	): void;
	persistShowAvatars?(
		storage: Storage | null | undefined,
		showAvatars: boolean,
	): void;
	persistSortMode(
		storage: Storage | null | undefined,
		sortMode: unknown,
	): void;
	readPreviewLineCount(storage?: Storage | null): ChatMenuPreviewLineCount;
	readShowAvatars?(storage?: Storage | null): boolean;
	readSortMode(storage?: Storage | null): ChatCatalogSortMode;
	refreshOnExportSuccess?: boolean;
	refreshOnOpenSuccess?: boolean;
	renameChat: RenameChatCatalogEntry;
	rowVariant: ChatListRowVariant;
	showAvatarToggle?: boolean;
	sortEntries(
		entries: ChatCatalogEntry[],
		sortMode: ChatCatalogSortMode,
	): ChatCatalogEntry[];
	store: ChatListStoreLike<Snapshot>;
}

const CHAT_MENU_SORT_FIELDS: Array<{
	icon: LucideIcon;
	labelKey: I18nKey;
	value: ChatMenuSortField;
}> = [
	{
		icon: Clock,
		labelKey: "astraMainInterface.chatMenu.sort.field.lastMessage",
		value: "last-message",
	},
	{
		icon: Type,
		labelKey: "astraMainInterface.chatMenu.sort.field.name",
		value: "name",
	},
	{
		icon: MessageCircleMore,
		labelKey: "astraMainInterface.chatMenu.sort.field.messages",
		value: "messages",
	},
];

const CHAT_MENU_SORT_DIRECTION_OPTIONS: Array<{
	direction: ChatMenuSortDirection;
	labelKey: I18nKey;
}> = [
	{
		direction: "descending",
		labelKey: "astraMainInterface.chatMenu.sort.direction.descending",
	},
	{
		direction: "ascending",
		labelKey: "astraMainInterface.chatMenu.sort.direction.ascending",
	},
];

const CHAT_MENU_SORT_DIRECTION_ORDERS: Record<
	ChatMenuSortField,
	Record<ChatMenuSortDirection, ChatMenuSortOrder>
> = {
	"last-message": {
		ascending: "reverse",
		descending: "natural",
	},
	messages: {
		ascending: "reverse",
		descending: "natural",
	},
	name: {
		ascending: "natural",
		descending: "reverse",
	},
};

const CHAT_MENU_SORT_DIRECTION_ICONS: Record<
	ChatMenuSortField,
	Record<ChatMenuSortOrder, LucideIcon>
> = {
	"last-message": {
		natural: ArrowDownNarrowWide,
		reverse: ArrowUpWideNarrow,
	},
	messages: {
		natural: ArrowDown10,
		reverse: ArrowDown01,
	},
	name: {
		natural: ArrowDownAZ,
		reverse: ArrowUpZA,
	},
};

const CHAT_MENU_PREVIEW_LINE_OPTIONS: Array<{
	icon: LucideIcon;
	labelKey: I18nKey;
	value: ChatMenuPreviewLineCount;
}> = [
	{
		icon: Rows3,
		labelKey: "astraMainInterface.chatMenu.previewLines.option.none",
		value: 0,
	},
	{
		icon: Rows3,
		labelKey: "astraMainInterface.chatMenu.previewLines.option.one",
		value: 1,
	},
	{
		icon: Rows3,
		labelKey: "astraMainInterface.chatMenu.previewLines.option.two",
		value: 2,
	},
	{
		icon: Rows3,
		labelKey: "astraMainInterface.chatMenu.previewLines.option.three",
		value: 3,
	},
];

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

function getChatListDisplayStorage() {
	return typeof window === "undefined" ? null : window.localStorage;
}

function formatMessageCount(count: number | null) {
	return count === null ? "-" : String(count);
}

function formatFileSize(fileSize: string) {
	return (
		fileSize ||
		translateAstra("astraMainInterface.chatMenu.unknownFileSize")
	);
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

function getChatMenuSortState(sortMode: ChatCatalogSortMode): {
	field: ChatMenuSortField;
	order: ChatMenuSortOrder;
} {
	switch (sortMode) {
		case "oldest":
			return {
				field: "last-message",
				order: "reverse",
			};
		case "most-messages":
			return {
				field: "messages",
				order: "natural",
			};
		case "least-messages":
			return {
				field: "messages",
				order: "reverse",
			};
		case "entity-asc":
			return {
				field: "name",
				order: "natural",
			};
		case "entity-desc":
			return {
				field: "name",
				order: "reverse",
			};
		case "most-recent":
		default:
			return {
				field: "last-message",
				order: "natural",
			};
	}
}

function getChatMenuSortMode({
	field,
	order,
}: {
	field: ChatMenuSortField;
	order: ChatMenuSortOrder;
}): ChatCatalogSortMode {
	if (field === "messages") {
		return order === "natural" ? "most-messages" : "least-messages";
	}

	if (field === "name") {
		return order === "natural" ? "entity-asc" : "entity-desc";
	}

	return order === "natural" ? "most-recent" : "oldest";
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
		}, CHAT_MENU_DRAWER_EXIT_UNMOUNT_MS);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [isContentMounted, isOpen]);

	return isOpen || isContentMounted;
}

function ChatCatalogAvatar({ entry }: { entry: ChatCatalogEntry }) {
	const fallbackInitial =
		entry.entityName.trim().charAt(0).toUpperCase() || "?";

	return (
		<AstraChatAvatar
			avatarUrl={entry.avatarUrl}
			className="astra-main-interface-chat-row__avatar"
			collageClassName="astra-main-interface-chat-row__avatar--collage"
			collageImageClassName="astra-main-interface-chat-row__avatar-collage-image"
			fallbackClassName="astra-main-interface-chat-row__avatar-fallback"
			fallbackText={fallbackInitial}
			groupAvatarUrls={
				entry.kind === "group" ? entry.groupAvatarUrls : undefined
			}
			imageClassName="astra-main-interface-chat-row__avatar-image"
		/>
	);
}

function ChatListRowActionButton({
	ariaControls,
	ariaExpanded,
	baseClassName,
	dataState,
	disabled = false,
	icon,
	label,
	modifierClassName,
	onClick,
}: {
	ariaControls?: string;
	ariaExpanded?: boolean;
	baseClassName: string;
	dataState?: "off" | "on";
	disabled?: boolean;
	icon: LucideIcon;
	label: string;
	modifierClassName?: string;
	onClick?: () => void;
}) {
	function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
		event.stopPropagation();
		onClick?.();
	}

	function stopRowActivation(event: React.SyntheticEvent<HTMLButtonElement>) {
		event.stopPropagation();
	}

	return (
		<button
			aria-controls={ariaControls}
			aria-expanded={ariaExpanded}
			aria-label={label}
			className={cn(baseClassName, modifierClassName)}
			data-state={dataState}
			disabled={disabled}
			title={label}
			type="button"
			onClick={handleClick}
			onKeyDown={stopRowActivation}
		>
			<UiIcon aria-hidden={true} icon={icon} size="sm" />
		</button>
	);
}

function ChatActionsDrawerItemButton({
	ariaControls,
	ariaExpanded,
	dataState,
	disabled = false,
	icon,
	label,
	modifierClassName,
	onClick,
}: {
	ariaControls?: string;
	ariaExpanded?: boolean;
	dataState?: "off" | "on";
	disabled?: boolean;
	icon: LucideIcon;
	label: string;
	modifierClassName?: string;
	onClick?: () => void;
}) {
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
			onClick={onClick}
		>
			<UiIcon aria-hidden={true} icon={icon} size="sm" />
			<span>{label}</span>
		</button>
	);
}

function getChatCatalogRowChatId(entry: ChatCatalogEntry) {
	return (
		entry.chatId ||
		translateAstra("astraMainInterface.chatMenu.untitledChat")
	);
}

function ChatCatalogRowAvatarSlot({
	entry,
	showAvatars,
}: {
	entry: ChatCatalogEntry;
	showAvatars: boolean;
}) {
	if (!showAvatars) {
		return null;
	}

	if (entry.isCurrent) {
		return (
			<div className="astra-main-interface-chat-row__current-avatar-shell">
				<ChatCatalogAvatar entry={entry} />
				<span
					aria-hidden={true}
					className="astra-main-interface-chat-row__avatar-status"
				/>
			</div>
		);
	}

	return <ChatCatalogAvatar entry={entry} />;
}

function ChatCatalogRowBody({
	categoryDrawerOpen,
	entry,
	hasAssignedCategories,
	onOpenActions,
	onOpenCategories,
	onRequestDelete,
	onRequestRename,
	previewLineCount,
	showAvatars,
}: {
	categoryDrawerOpen: boolean;
	entry: ChatCatalogEntry;
	hasAssignedCategories: boolean;
	onOpenActions: (entry: ChatCatalogEntry) => void;
	onOpenCategories: (entry: ChatCatalogEntry) => void;
	onRequestDelete: (entry: ChatCatalogEntry) => void;
	onRequestRename: (entry: ChatCatalogEntry) => void;
	previewLineCount: ChatMenuPreviewLineCount;
	showAvatars: boolean;
}) {
	const chatId = getChatCatalogRowChatId(entry);
	const lastMessageLabel =
		entry.lastMessageLabel ||
		translateAstra("astraMainInterface.chatMenu.unknownDate");
	const messageCountLabel = translateAstra(
		"astraMainInterface.chatMenu.meta.messageCount",
	);
	const fileSizeLabel = translateAstra(
		"astraMainInterface.chatMenu.meta.fileSize",
	);
	const messageCount = formatMessageCount(entry.messageCount);
	const fileSize = formatFileSize(entry.fileSize);

	return (
		<div
			className={cn(
				"astra-main-interface-chat-row__body",
				entry.isCurrent &&
					"astra-main-interface-chat-row__body--current",
			)}
		>
			<div className="astra-main-interface-chat-row__header">
				<div className="astra-main-interface-chat-row__header-row">
					<ChatCatalogRowAvatarSlot
						entry={entry}
						showAvatars={showAvatars}
					/>
					<div className="astra-main-interface-chat-row__name-stack">
						<span
							className="astra-main-interface-chat-row__entity"
							title={entry.entityName}
						>
							{entry.entityName}
						</span>
						<div className="astra-main-interface-chat-row__time-row">
							<span className="astra-main-interface-chat-row__date">
								{lastMessageLabel}
							</span>
						</div>
					</div>
					<div className="astra-main-interface-chat-row__header-actions">
						<ChatListRowActionButton
							baseClassName="astra-main-interface-chat-row__action-button"
							icon={Ellipsis}
							label={translateAstra(
								"astraMainInterface.chatMenu.actions",
							)}
							modifierClassName="astra-main-interface-chat-row__action-button--menu"
							onClick={() => {
								onOpenActions(entry);
							}}
						/>
					</div>
				</div>
			</div>
			<div className="astra-main-interface-chat-row__main">
				<span
					className="astra-main-interface-chat-row__chat-name"
					title={entry.fileName}
				>
					{chatId}
				</span>
				{previewLineCount > 0 ? (
					<span
						className="astra-main-interface-chat-row__preview"
						title={entry.lastMessagePreview}
					>
						{entry.lastMessagePreview ||
							translateAstra(
								"astraMainInterface.chatMenu.noPreview",
							)}
					</span>
				) : null}
			</div>
			<div className="astra-main-interface-chat-row__footer">
				<span
					aria-label={`${messageCountLabel}: ${messageCount}`}
					className="astra-main-interface-chat-row__stat"
				>
					<span className="astra-main-interface-chat-row__stat-icon">
						<UiIcon
							aria-hidden={true}
							icon={MessageCircleMore}
							size="xs"
						/>
					</span>
					<span className="astra-main-interface-chat-row__stat-value">
						{messageCount}
					</span>
				</span>
				<span
					aria-label={`${fileSizeLabel}: ${fileSize}`}
					className="astra-main-interface-chat-row__stat"
				>
					<span className="astra-main-interface-chat-row__stat-icon">
						<UiIcon
							aria-hidden={true}
							icon={Database}
							size="xs"
						/>
					</span>
					<span className="astra-main-interface-chat-row__stat-value">
						{fileSize}
					</span>
				</span>
				<div className="astra-main-interface-chat-row__actions">
					<ChatListRowActionButton
						baseClassName="astra-main-interface-chat-row__action-button"
						icon={Trash2}
						label={translateAstra(
							"astraMainInterface.chatMenu.action.delete",
						)}
						modifierClassName="astra-main-interface-chat-row__action-button--delete"
						onClick={() => {
							onRequestDelete(entry);
						}}
					/>
					<ChatListRowActionButton
						ariaControls={CHAT_ROW_CATEGORY_DRAWER_ID}
						ariaExpanded={categoryDrawerOpen}
						baseClassName="astra-main-interface-chat-row__action-button"
						dataState={hasAssignedCategories ? "on" : "off"}
						icon={Bookmark}
						label={translateAstra(
							"astraMainInterface.chatMenu.action.categories",
						)}
						modifierClassName="astra-main-interface-chat-row__action-button--categories"
						onClick={() => {
							onOpenCategories(entry);
						}}
					/>
					<ChatListRowActionButton
						baseClassName="astra-main-interface-chat-row__action-button"
						icon={PencilLine}
						label={translateAstra(
							"astraMainInterface.chatMenu.action.rename",
						)}
						modifierClassName="astra-main-interface-chat-row__action-button--rename"
						onClick={() => {
							onRequestRename(entry);
						}}
					/>
				</div>
			</div>
		</div>
	);
}

export function ChatMenuControlsDrawer({
	description = translateAstra(
		"astraMainInterface.chatMenu.controls.description",
	),
	isRefreshDisabled,
	onPreviewLineCountChange,
	onRefresh,
	onShowAvatarsChange,
	onSortModeChange,
	previewLineCount,
	showAvatarToggle = true,
	showAvatars,
	sortMode,
	title = translateAstra("astraMainInterface.chatMenu.controls.title"),
	triggerLabel = translateAstra(
		"astraMainInterface.chatMenu.controls.trigger",
	),
}: {
	description?: string;
	isRefreshDisabled: boolean;
	onPreviewLineCountChange: (
		previewLineCount: ChatMenuPreviewLineCount,
	) => void;
	onRefresh: () => void;
	onShowAvatarsChange?: (showAvatars: boolean) => void;
	onSortModeChange: (sortMode: ChatCatalogSortMode) => void;
	previewLineCount: ChatMenuPreviewLineCount;
	showAvatarToggle?: boolean;
	showAvatars: boolean;
	sortMode: ChatCatalogSortMode;
	title?: string;
	triggerLabel?: string;
}) {
	const [isOpen, setIsOpen] = React.useState(false);
	const shouldRenderDrawer = useDelayedDrawerContentMount(isOpen);
	const sortByLabel = translateAstra("astraMainInterface.chatMenu.sort.by");
	const previewLinesLabel = translateAstra(
		"astraMainInterface.chatMenu.previewLines.label",
	);
	const showAvatarsLabel = translateAstra(
		"astraMainInterface.chatMenu.showAvatars",
	);
	const sortState = getChatMenuSortState(sortMode);
	const activeSortField =
		CHAT_MENU_SORT_FIELDS.find(
			(option) => option.value === sortState.field,
		) ?? CHAT_MENU_SORT_FIELDS[0];
	const activePreviewLineOption =
		CHAT_MENU_PREVIEW_LINE_OPTIONS.find(
			(option) => option.value === previewLineCount,
		) ?? CHAT_MENU_PREVIEW_LINE_OPTIONS[2];

	const handleOpenChange = React.useCallback((nextOpen: boolean) => {
		setIsOpen(nextOpen);
	}, []);

	const handleSortFieldChange = React.useCallback(
		(nextField: ChatMenuSortField) => {
			onSortModeChange(
				getChatMenuSortMode({
					field: nextField,
					order: sortState.order,
				}),
			);
		},
		[onSortModeChange, sortState.order],
	);

	const handleSortOrderChange = React.useCallback(
		(nextOrder: ChatMenuSortOrder) => {
			if (nextOrder === sortState.order) {
				return;
			}

			onSortModeChange(
				getChatMenuSortMode({
					field: sortState.field,
					order: nextOrder,
				}),
			);
		},
		[onSortModeChange, sortState.field, sortState.order],
	);

	const handlePreviewLineCountChange = React.useCallback(
		(nextLineCount: ChatMenuPreviewLineCount) => {
			if (nextLineCount === previewLineCount) {
				return;
			}

			onPreviewLineCountChange(nextLineCount);
		},
		[onPreviewLineCountChange, previewLineCount],
	);

	const handleRefresh = React.useCallback(() => {
		if (isRefreshDisabled) {
			return;
		}

		onRefresh();
		handleOpenChange(false);
	}, [handleOpenChange, isRefreshDisabled, onRefresh]);

	return (
		<Drawer
			direction="bottom"
			onOpenChange={handleOpenChange}
			open={isOpen}
			repositionInputs={false}
		>
			<button
				aria-controls={CHAT_MENU_CONTROLS_DRAWER_ID}
				aria-expanded={isOpen}
				aria-label={triggerLabel}
				className={cn(
					buttonVariants({
						size: "icon-sm",
						variant: "outline",
					}),
					"astra-main-interface__controls-trigger",
				)}
				title={triggerLabel}
				type="button"
				onClick={() => {
					handleOpenChange(true);
				}}
			>
				<UiIcon aria-hidden={true} icon={Funnel} size="sm" />
			</button>
			{shouldRenderDrawer ? (
				<DrawerContent
					className="astra-main-interface-drawer astra-main-interface-controls-drawer"
					id={CHAT_MENU_CONTROLS_DRAWER_ID}
				>
					<DrawerHeader className="sr-only">
						<DrawerTitle>
							<span
								data-slot="drawer-title"
								id={CHAT_MENU_CONTROLS_DRAWER_TITLE_ID}
							>
								{title}
							</span>
						</DrawerTitle>
						<DrawerDescription>
							<span
								data-slot="drawer-description"
								id={CHAT_MENU_CONTROLS_DRAWER_DESCRIPTION_ID}
							>
								{description}
							</span>
						</DrawerDescription>
					</DrawerHeader>
					<DrawerBody
						scrollAreaProps={{
							className:
								"astra-main-interface-controls-drawer__scroll-area",
						}}
						viewportProps={{
							className:
								"astra-main-interface-controls-drawer__scrollable-content",
							id: CHAT_MENU_CONTROLS_DRAWER_SCROLLABLE_CONTENT_ID,
						}}
					>
						<div
							className="astra-main-interface-controls-drawer__menu"
							id={CHAT_MENU_CONTROLS_DRAWER_MENU_ID}
						>
							<section className="astra-main-interface-controls-drawer__group astra-main-interface-controls-drawer__group--sort">
								<div className="astra-main-interface-controls-drawer__group-items">
									<div className="astra-main-interface-controls-drawer__preview-lines-row">
										<span className="astra-main-interface-controls-drawer__preview-lines-label">
											{previewLinesLabel}
										</span>
										<div className="astra-main-interface-controls-drawer__preview-lines-controls">
											<DropdownMenu>
												<DropdownMenuTrigger
													asChild={true}
												>
													<button
														className={cn(
															buttonVariants({
																variant:
																	"outline",
															}),
															"astra-main-interface-controls-drawer__preview-lines-trigger",
														)}
														title={translateAstra(
															activePreviewLineOption.labelKey,
														)}
														type="button"
													>
														<UiIcon
															aria-hidden={true}
															data-icon="inline-start"
															icon={
																activePreviewLineOption.icon
															}
															size="sm"
														/>
														<span className="astra-main-interface-controls-drawer__preview-lines-trigger-label">
															{translateAstra(
																activePreviewLineOption.labelKey,
															)}
														</span>
														<UiIcon
															aria-hidden={true}
															data-icon="inline-end"
															icon={ChevronDown}
															size="sm"
														/>
													</button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													align="start"
													className={cn(
														"astra-main-interface-controls-drawer__dropdown",
														"astra-main-interface-controls-drawer__preview-lines-dropdown",
													)}
													side="top"
												>
													<DropdownMenuGroup>
														{CHAT_MENU_PREVIEW_LINE_OPTIONS.map(
															(option) => (
																<DropdownMenuItem
																	className={cn(
																		"astra-main-interface-controls-drawer__item",
																		"astra-main-interface-controls-drawer__preview-lines-item",
																		option.value ===
																			previewLineCount &&
																			"astra-main-interface-controls-drawer__item--active",
																	)}
																	key={
																		option.value
																	}
																	onSelect={() => {
																		handlePreviewLineCountChange(
																			option.value,
																		);
																	}}
																>
																	<UiIcon
																		aria-hidden={
																			true
																		}
																		icon={
																			option.icon
																		}
																		size="sm"
																	/>
																	<span>
																		{translateAstra(
																			option.labelKey,
																		)}
																	</span>
																</DropdownMenuItem>
															),
														)}
													</DropdownMenuGroup>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
									</div>
									<div className="astra-main-interface-controls-drawer__sort-row">
										<span className="astra-main-interface-controls-drawer__sort-label">
											{sortByLabel}
										</span>
										<div className="astra-main-interface-controls-drawer__sort-controls">
											<DropdownMenu>
												<DropdownMenuTrigger
													asChild={true}
												>
													<button
														className={cn(
															buttonVariants({
																variant:
																	"outline",
															}),
															"astra-main-interface-controls-drawer__sort-field-trigger",
														)}
														title={translateAstra(
															activeSortField.labelKey,
														)}
														type="button"
													>
														<UiIcon
															aria-hidden={true}
															data-icon="inline-start"
															icon={
																activeSortField.icon
															}
															size="sm"
														/>
														<span className="astra-main-interface-controls-drawer__sort-field-trigger-label">
															{translateAstra(
																activeSortField.labelKey,
															)}
														</span>
														<UiIcon
															aria-hidden={true}
															data-icon="inline-end"
															icon={ChevronDown}
															size="sm"
														/>
													</button>
												</DropdownMenuTrigger>
												<DropdownMenuContent
													align="start"
													className={cn(
														"astra-main-interface-controls-drawer__dropdown",
														"astra-main-interface-controls-drawer__sort-dropdown",
													)}
													side="top"
												>
													<DropdownMenuGroup>
														{CHAT_MENU_SORT_FIELDS.map(
															(option) => (
																<DropdownMenuItem
																	className={cn(
																		"astra-main-interface-controls-drawer__item",
																		option.value ===
																			sortState.field &&
																			"astra-main-interface-controls-drawer__item--active",
																	)}
																	key={
																		option.value
																	}
																	onSelect={() => {
																		handleSortFieldChange(
																			option.value,
																		);
																	}}
																>
																	<UiIcon
																		aria-hidden={
																			true
																		}
																		icon={
																			option.icon
																		}
																		size="sm"
																	/>
																	<span>
																		{translateAstra(
																			option.labelKey,
																		)}
																	</span>
																</DropdownMenuItem>
															),
														)}
													</DropdownMenuGroup>
												</DropdownMenuContent>
											</DropdownMenu>
											<div
												aria-label={translateAstra(
													"astraMainInterface.chatMenu.sort.direction.label",
												)}
												className="astra-main-interface-controls-drawer__sort-direction"
												role="group"
											>
												{CHAT_MENU_SORT_DIRECTION_OPTIONS.map(
													({
														direction,
														labelKey,
													}) => {
														const label =
															translateAstra(
																labelKey,
															);
														const order =
															CHAT_MENU_SORT_DIRECTION_ORDERS[
																sortState.field
															][direction];
														const DirectionIcon =
															CHAT_MENU_SORT_DIRECTION_ICONS[
																sortState.field
															][order];

														return (
															<button
																aria-label={
																	label
																}
																aria-pressed={
																	sortState.order ===
																	order
																}
																className={cn(
																	buttonVariants(
																		{
																			size: "icon-sm",
																			variant:
																				"ghost",
																		},
																	),
																	"astra-main-interface-controls-drawer__sort-direction-button",
																	sortState.order ===
																		order &&
																		"astra-main-interface-controls-drawer__sort-direction-button--active",
																)}
																key={direction}
																title={label}
																type="button"
																onClick={() => {
																	handleSortOrderChange(
																		order,
																	);
																}}
															>
																<UiIcon
																	aria-hidden={
																		true
																	}
																	icon={
																		DirectionIcon
																	}
																	size="sm"
																/>
															</button>
														);
													},
												)}
											</div>
										</div>
									</div>
								</div>
							</section>
							{showAvatarToggle ? (
								<section className="astra-main-interface-controls-drawer__group astra-main-interface-controls-drawer__group--avatars">
									<div className="astra-main-interface-controls-drawer__group-items">
										<div
											className="astra-main-interface-controls-drawer__avatar-toggle mobile-send-form-options-drawer__toggle"
											id={
												CHAT_MENU_CONTROLS_DRAWER_AVATARS_TOGGLE_ID
											}
										>
											<Label
												className="astra-main-interface-controls-drawer__avatar-toggle-label mobile-send-form-options-drawer__toggle-label"
												htmlFor={
													CHAT_MENU_CONTROLS_DRAWER_AVATARS_TOGGLE_SWITCH_ID
												}
											>
												{showAvatarsLabel}
											</Label>
											<Switch
												checked={showAvatars}
												id={
													CHAT_MENU_CONTROLS_DRAWER_AVATARS_TOGGLE_SWITCH_ID
												}
												size="default"
												type="button"
												onCheckedChange={
													onShowAvatarsChange
												}
											/>
										</div>
									</div>
								</section>
							) : null}
							<section className="astra-main-interface-controls-drawer__group astra-main-interface-controls-drawer__group--actions">
								<Button
									className="astra-main-interface-controls-drawer__refresh-button"
									disabled={isRefreshDisabled}
									type="button"
									variant="outline"
									onClick={handleRefresh}
								>
									<UiIcon
										aria-hidden={true}
										icon={RefreshCcw}
										size="sm"
									/>
									<span>
										{translateAstra(
											"astraMainInterface.chatMenu.refresh",
										)}
									</span>
								</Button>
							</section>
						</div>
					</DrawerBody>
				</DrawerContent>
			) : null}
		</Drawer>
	);
}

export function ChatCatalogRowActionsDrawer({
	categoryDrawerOpen,
	entry,
	exportChat,
	hasAssignedCategories,
	onOpenCategories,
	onOpenChange,
	onRequestDelete,
	onRequestRename,
}: {
	categoryDrawerOpen: boolean;
	entry: ChatCatalogEntry | null;
	exportChat: ExportChatCatalogEntry;
	hasAssignedCategories: boolean;
	onOpenCategories: (entry: ChatCatalogEntry) => void;
	onOpenChange: (open: boolean) => void;
	onRequestDelete: (entry: ChatCatalogEntry) => void;
	onRequestRename: (entry: ChatCatalogEntry) => void;
}) {
	const [exportingFormat, setExportingFormat] =
		React.useState<ChatCatalogExportFormat | null>(null);
	const [retainedEntry, setRetainedEntry] =
		React.useState<ChatCatalogEntry | null>(entry);
	const isOpen = entry !== null;
	const shouldRenderDrawer = useDelayedDrawerContentMount(isOpen);
	const drawerEntry = entry ?? retainedEntry;
	const isExporting = exportingFormat !== null;
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
		if (entry) {
			setRetainedEntry(entry);
		}
	}, [entry]);

	React.useEffect(() => {
		if (!shouldRenderDrawer && !isOpen) {
			setRetainedEntry(null);
		}
	}, [isOpen, shouldRenderDrawer]);

	React.useEffect(() => {
		if (!isOpen) {
			setExportingFormat(null);
		}
	}, [isOpen]);

	const handleExport = React.useCallback(
		async (format: ChatCatalogExportFormat) => {
			if (!entry || isExporting) {
				return;
			}

			setExportingFormat(format);
			const result = await exportChat(entry, format).catch(() => ({
				ok: false as const,
				reason: "export-failed" as const,
			}));

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

	const handleEntryAction = React.useCallback(
		(action: (entry: ChatCatalogEntry) => void) => {
			if (!entry || isExporting) {
				return;
			}

			onOpenChange(false);
			action(entry);
		},
		[entry, isExporting, onOpenChange],
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

	return (
		<ResponsiveDialog
			className="astra-main-interface-drawer astra-main-interface-chat-row-action-dialog astra-main-interface-chat-actions-drawer"
			contentId={CHAT_ROW_ACTIONS_DRAWER_ID}
			description={description}
			forceMountContent={true}
			headerContent={
				<ChatCatalogRowDialogIdentityHeader entry={drawerEntry} />
			}
			icon={
				<UiIcon
					aria-hidden={true}
					icon={MessageCircleMore}
					size="sm"
				/>
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
								onClick={() => {
									handleEntryAction(onRequestDelete);
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
								onClick={() => {
									handleEntryAction(onOpenCategories);
								}}
							/>
							<ChatActionsDrawerItemButton
								disabled={isExporting || !entry}
								icon={PencilLine}
								label={translateAstra(
									"astraMainInterface.chatMenu.action.rename",
								)}
								modifierClassName="astra-main-interface-chat-actions-drawer__item--rename"
								onClick={() => {
									handleEntryAction(onRequestRename);
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

function GlobalChatCatalogRow({
	categoryDrawerOpen,
	disabled,
	entry,
	hasAssignedCategories,
	onOpen,
	onOpenActions,
	onOpenCategories,
	onRequestDelete,
	onRequestRename,
	previewLineCount,
	showAvatars,
}: {
	categoryDrawerOpen: boolean;
	disabled: boolean;
	entry: ChatCatalogEntry;
	hasAssignedCategories: boolean;
	onOpen: (entry: ChatCatalogEntry) => void;
	onOpenActions: (entry: ChatCatalogEntry) => void;
	onOpenCategories: (entry: ChatCatalogEntry) => void;
	onRequestDelete: (entry: ChatCatalogEntry) => void;
	onRequestRename: (entry: ChatCatalogEntry) => void;
	previewLineCount: ChatMenuPreviewLineCount;
	showAvatars: boolean;
}) {
	const chatId = getChatCatalogRowChatId(entry);

	function handleOpen() {
		if (disabled) return;

		onOpen(entry);
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		if (disabled) return;
		if (event.key !== "Enter" && event.key !== " ") return;

		event.preventDefault();
		onOpen(entry);
	}

	return (
		<div
			aria-disabled={disabled}
			aria-current={entry.isCurrent ? "true" : undefined}
			aria-label={`Open ${entry.entityName} ${chatId}`}
			className="astra-main-interface-chat-row"
			data-astra-smooth-tabs-swipe-allow={true}
			data-preview-lines={
				previewLineCount === 0 ? undefined : previewLineCount
			}
			data-kind={entry.kind}
			role="button"
			tabIndex={disabled ? -1 : 0}
			onClick={handleOpen}
			onKeyDown={handleKeyDown}
		>
			<ChatCatalogRowBody
				categoryDrawerOpen={categoryDrawerOpen}
				entry={entry}
				hasAssignedCategories={hasAssignedCategories}
				previewLineCount={previewLineCount}
				showAvatars={showAvatars}
				onOpenActions={onOpenActions}
				onOpenCategories={onOpenCategories}
				onRequestDelete={onRequestDelete}
				onRequestRename={onRequestRename}
			/>
		</div>
	);
}

function CurrentChatCatalogRow({
	categoryDrawerOpen,
	disabled,
	entry,
	hasAssignedCategories,
	onOpen,
	onOpenActions,
	onOpenCategories,
	onRequestDelete,
	onRequestRename,
	previewLineCount,
	showAvatars,
}: {
	categoryDrawerOpen: boolean;
	disabled: boolean;
	entry: ChatCatalogEntry;
	hasAssignedCategories: boolean;
	onOpen: (entry: ChatCatalogEntry) => void;
	onOpenActions: (entry: ChatCatalogEntry) => void;
	onOpenCategories: (entry: ChatCatalogEntry) => void;
	onRequestDelete: (entry: ChatCatalogEntry) => void;
	onRequestRename: (entry: ChatCatalogEntry) => void;
	previewLineCount: ChatMenuPreviewLineCount;
	showAvatars: boolean;
}) {
	const chatId = getChatCatalogRowChatId(entry);

	function handleOpen() {
		if (disabled) return;

		onOpen(entry);
	}

	function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
		if (disabled) return;
		if (event.key !== "Enter" && event.key !== " ") return;

		event.preventDefault();
		onOpen(entry);
	}

	return (
		<div
			aria-current={entry.isCurrent ? "true" : undefined}
			aria-disabled={disabled}
			aria-label={`Open ${entry.entityName} ${chatId}`}
			className="astra-main-interface-chat-row astra-main-interface-current-chat-row"
			data-astra-smooth-tabs-swipe-allow={true}
			data-preview-lines={
				previewLineCount === 0 ? undefined : previewLineCount
			}
			data-kind={entry.kind}
			role="button"
			tabIndex={disabled ? -1 : 0}
			onClick={handleOpen}
			onKeyDown={handleKeyDown}
		>
			<ChatCatalogRowBody
				categoryDrawerOpen={categoryDrawerOpen}
				entry={entry}
				hasAssignedCategories={hasAssignedCategories}
				previewLineCount={previewLineCount}
				showAvatars={showAvatars}
				onOpenActions={onOpenActions}
				onOpenCategories={onOpenCategories}
				onRequestDelete={onRequestDelete}
				onRequestRename={onRequestRename}
			/>
		</div>
	);
}

export function ChatListExperience<
	Snapshot extends ChatListSnapshotLike = ChatListSnapshotLike,
>({
	chatCategoryStore: injectedChatCategoryStore,
	copy,
	deleteChat,
	exportChat,
	filterEntries,
	listClassName,
	listItemClassName,
	onRequestClose,
	openChat,
	persistPreviewLineCount,
	persistShowAvatars,
	persistSortMode,
	readPreviewLineCount,
	readShowAvatars,
	readSortMode,
	refreshOnExportSuccess = false,
	refreshOnOpenSuccess = false,
	renameChat,
	rowVariant,
	showAvatarToggle = true,
	sortEntries,
	store,
}: ChatListExperienceProps<Snapshot>) {
	const chatCategoryStore = useChatCategoryStore(injectedChatCategoryStore);
	const categorySnapshot = React.useSyncExternalStore(
		chatCategoryStore.subscribe,
		chatCategoryStore.getSnapshot,
		chatCategoryStore.getSnapshot,
	);
	const snapshot = React.useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot,
	);
	const [query, setQuery] = React.useState("");
	const [sortMode, setSortMode] = React.useState<ChatCatalogSortMode>(() =>
		readSortMode(getChatListDisplayStorage()),
	);
	const [previewLineCount, setPreviewLineCount] =
		React.useState<ChatMenuPreviewLineCount>(() =>
			readPreviewLineCount(getChatListDisplayStorage()),
		);
	const [showAvatars, setShowAvatars] = React.useState(
		() => readShowAvatars?.(getChatListDisplayStorage()) ?? false,
	);
	const [visibleCount, setVisibleCount] = React.useState(CHAT_LIST_PAGE_SIZE);
	const [activeRowAction, setActiveRowAction] =
		React.useState<ChatCatalogRowActionDialogState | null>(null);
	const [activeActionsEntry, setActiveActionsEntry] =
		React.useState<ChatCatalogEntry | null>(null);
	const [activeCategoryEntry, setActiveCategoryEntry] =
		React.useState<ChatCatalogEntry | null>(null);
	const searchInputId = React.useId();
	const sentinelRef = React.useRef<HTMLDivElement | null>(null);
	const {
		openEntry: openChatWithFeedback,
		openError,
		openingKey,
	} = useChatCatalogEntryOpenController({
		onOpenSuccess: refreshOnOpenSuccess
			? () => {
					store.refresh();
				}
			: undefined,
		onRequestClose,
		openEntry: openChat,
	});

	const filteredEntries = React.useMemo(() => {
		return sortEntries(filterEntries(snapshot.entries, query), sortMode);
	}, [filterEntries, query, snapshot.entries, sortEntries, sortMode]);

	React.useEffect(() => {
		setVisibleCount(CHAT_LIST_PAGE_SIZE);
	}, [filteredEntries.length, query, sortMode]);

	const hasMoreRows = visibleCount < filteredEntries.length;
	const visibleEntries = React.useMemo(
		() => filteredEntries.slice(0, visibleCount),
		[filteredEntries, visibleCount],
	);
	const hasAssignedCategories = React.useCallback(
		(entry: ChatCatalogEntry) =>
			chatCategoryStore.getChatCategoryIds(entry.key).length > 0,
		[categorySnapshot, chatCategoryStore],
	);
	const exportChatWithRefresh = React.useCallback<ExportChatCatalogEntry>(
		async (entry, format) => {
			const result = await exportChat(entry, format);
			if (result.ok && refreshOnExportSuccess) {
				store.refresh();
			}

			return result;
		},
		[exportChat, refreshOnExportSuccess, store],
	);

	React.useEffect(() => {
		if (!hasMoreRows || typeof IntersectionObserver !== "function") {
			return undefined;
		}

		const sentinel = sentinelRef.current;
		if (!sentinel) {
			return undefined;
		}

		const observer = new IntersectionObserver((entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) {
				return;
			}

			setVisibleCount((currentCount) =>
				Math.min(
					currentCount + CHAT_LIST_PAGE_SIZE,
					filteredEntries.length,
				),
			);
		});

		observer.observe(sentinel);

		return () => {
			observer.disconnect();
		};
	}, [filteredEntries.length, hasMoreRows, visibleCount]);

	const isLoading = snapshot.status === "loading";
	const hasEntries = visibleEntries.length > 0;
	const emptyMessage = query
		? translateAstra(copy.emptySearch)
		: translateAstra(copy.emptyTitle);
	const emptyDescription = query
		? translateAstra(copy.emptySearchDescription)
		: translateAstra(copy.emptyDescription);
	const isGlobalRow = rowVariant === "global";

	function handleClearSearchInput() {
		setQuery("");

		const input = document.getElementById(searchInputId);
		if (input instanceof HTMLInputElement) {
			input.focus();
		}
	}

	function handlePreviewLineCountChange(
		nextLineCount: ChatMenuPreviewLineCount,
	) {
		setPreviewLineCount(nextLineCount);
		persistPreviewLineCount(getChatListDisplayStorage(), nextLineCount);
	}

	function handleShowAvatarsChange(nextValue: boolean) {
		setShowAvatars(nextValue);
		persistShowAvatars?.(getChatListDisplayStorage(), nextValue);
	}

	function handleSortModeChange(nextSortMode: ChatCatalogSortMode) {
		setSortMode(nextSortMode);
		persistSortMode(getChatListDisplayStorage(), nextSortMode);
	}

	return (
		<>
			<div className="astra-main-interface__toolbar">
				<div className="astra-main-interface__field astra-main-interface__field--search">
					<span className="astra-main-interface__search-shell">
						<UiIcon
							aria-hidden={true}
							className="astra-main-interface__search-icon"
							icon={Search}
							size="sm"
						/>
						<Input
							aria-label={translateAstra(copy.searchLabel)}
							className="astra-main-interface__search-input"
							id={searchInputId}
							placeholder={translateAstra(copy.searchPlaceholder)}
							role="searchbox"
							type="text"
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
							}}
						/>
						{query ? (
							<button
								aria-label={translateAstra(copy.searchClear)}
								className="astra-main-interface__search-clear-button"
								type="button"
								onClick={handleClearSearchInput}
							>
								<UiIcon
									aria-hidden={true}
									icon={CircleX}
									size="sm"
								/>
							</button>
						) : null}
					</span>
				</div>
				<ChatMenuControlsDrawer
					description={translateAstra(copy.controlsDescription)}
					isRefreshDisabled={snapshot.status === "loading"}
					previewLineCount={previewLineCount}
					showAvatarToggle={showAvatarToggle}
					showAvatars={showAvatars}
					sortMode={sortMode}
					title={translateAstra(copy.controlsTitle)}
					triggerLabel={translateAstra(copy.controlsTrigger)}
					onPreviewLineCountChange={handlePreviewLineCountChange}
					onRefresh={() => {
						store.refresh();
					}}
					onShowAvatarsChange={handleShowAvatarsChange}
					onSortModeChange={handleSortModeChange}
				/>
			</div>

			{openError ? (
				<div
					className="astra-main-interface__inline-error"
					role="alert"
				>
					{openError}
				</div>
			) : null}

			<div
				aria-busy={isLoading}
				aria-label={translateAstra(copy.listLabel)}
				className={cn("astra-main-interface__chat-list", listClassName)}
				role="list"
			>
				{hasEntries
					? visibleEntries.map((entry) => (
							<div
								className={cn(
									"astra-main-interface__chat-list-item",
									listItemClassName,
								)}
								key={entry.key}
								role="listitem"
							>
								{isGlobalRow ? (
									<GlobalChatCatalogRow
										categoryDrawerOpen={
											activeCategoryEntry?.key ===
											entry.key
										}
										disabled={openingKey !== null}
										entry={entry}
										hasAssignedCategories={hasAssignedCategories(
											entry,
										)}
										previewLineCount={previewLineCount}
										showAvatars={showAvatars}
										onOpenActions={setActiveActionsEntry}
										onOpenCategories={
											setActiveCategoryEntry
										}
										onRequestDelete={(entry) => {
											setActiveRowAction({
												entry,
												mode: "delete",
											});
										}}
										onRequestRename={(entry) => {
											setActiveRowAction({
												entry,
												mode: "rename",
											});
										}}
										onOpen={(nextEntry) => {
											void openChatWithFeedback(
												nextEntry,
											);
										}}
									/>
								) : (
									<CurrentChatCatalogRow
										categoryDrawerOpen={
											activeCategoryEntry?.key ===
											entry.key
										}
										disabled={openingKey !== null}
										entry={entry}
										hasAssignedCategories={hasAssignedCategories(
											entry,
										)}
										previewLineCount={previewLineCount}
										showAvatars={showAvatars}
										onOpenActions={setActiveActionsEntry}
										onOpenCategories={
											setActiveCategoryEntry
										}
										onRequestDelete={(entry) => {
											setActiveRowAction({
												entry,
												mode: "delete",
											});
										}}
										onRequestRename={(entry) => {
											setActiveRowAction({
												entry,
												mode: "rename",
											});
										}}
										onOpen={(nextEntry) => {
											void openChatWithFeedback(
												nextEntry,
											);
										}}
									/>
								)}
							</div>
						))
					: null}
			</div>

			{!isLoading && !hasEntries ? (
				<Empty className="astra-main-interface__empty-state">
					<EmptyHeader
						className="astra-main-interface__empty-header"
						id={
							isGlobalRow
								? "astra-main-interface-empty-header"
								: undefined
						}
					>
						<EmptyMedia
							className="astra-main-interface__empty-media"
							id={
								isGlobalRow
									? "astra-main-interface-empty-media"
									: undefined
							}
							variant="icon"
						>
							<UiIcon
								aria-hidden={true}
								icon={FileSearch}
								size="md"
							/>
						</EmptyMedia>
						<EmptyTitle
							className="astra-main-interface__empty-title"
							id={
								isGlobalRow
									? "astra-main-interface-empty-title"
									: undefined
							}
						>
							{emptyMessage}
						</EmptyTitle>
						<EmptyDescription
							className="astra-main-interface__empty-description"
							id={
								isGlobalRow
									? "astra-main-interface-empty-description"
									: undefined
							}
						>
							{emptyDescription}
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent
						className="astra-main-interface__empty-actions"
						id={
							isGlobalRow
								? "astra-main-interface-empty-actions"
								: undefined
						}
					>
						{query ? (
							<Button
								className="astra-main-interface__empty-action"
								id={
									isGlobalRow
										? "astra-main-interface-empty-clear-search"
										: undefined
								}
								type="button"
								onClick={handleClearSearchInput}
							>
								<UiIcon
									aria-hidden={true}
									icon={Trash2}
									size="sm"
								/>
								{translateAstra(
									"astraMainInterface.chatMenu.action.backToChatMenu",
								)}
							</Button>
						) : null}
						<Button
							className="astra-main-interface__empty-action"
							id={
								isGlobalRow
									? "astra-main-interface-empty-current-chat"
									: undefined
							}
							type="button"
							variant={query ? "outline" : "secondary"}
							onClick={() => {
								onRequestClose?.();
							}}
						>
							<UiIcon
								aria-hidden={true}
								icon={MessageCircle}
								size="sm"
							/>
							{translateAstra(
								"astraMainInterface.chatMenu.action.backToCurrentChat",
							)}
						</Button>
					</EmptyContent>
				</Empty>
			) : null}

			<div
				aria-hidden={true}
				className="astra-main-interface__sentinel"
				ref={sentinelRef}
			/>

			{hasMoreRows ? (
				<Button
					className="astra-main-interface__load-more-button"
					type="button"
					variant="secondary"
					onClick={() => {
						setVisibleCount((currentCount) =>
							Math.min(
								currentCount + CHAT_LIST_PAGE_SIZE,
								filteredEntries.length,
							),
						);
					}}
				>
					{translateAstra("astraMainInterface.chatMenu.loadMore")}
				</Button>
			) : null}

			<ChatCatalogRowActionsDrawer
				categoryDrawerOpen={
					activeCategoryEntry !== null &&
					(activeActionsEntry === null ||
						activeCategoryEntry.key === activeActionsEntry.key)
				}
				entry={activeActionsEntry}
				exportChat={exportChatWithRefresh}
				hasAssignedCategories={
					activeActionsEntry
						? hasAssignedCategories(activeActionsEntry)
						: activeCategoryEntry
							? hasAssignedCategories(activeCategoryEntry)
							: false
				}
				onOpenCategories={setActiveCategoryEntry}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setActiveActionsEntry(null);
					}
				}}
				onRequestDelete={(entry) => {
					setActiveRowAction({
						entry,
						mode: "delete",
					});
				}}
				onRequestRename={(entry) => {
					setActiveRowAction({
						entry,
						mode: "rename",
					});
				}}
			/>

			<ChatCategoryAssignmentDrawer
				chatCategoryStore={chatCategoryStore}
				entry={activeCategoryEntry}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setActiveCategoryEntry(null);
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
						setActiveRowAction(null);
					}
				}}
				onSuccess={() => {
					store.refresh();
				}}
			/>
		</>
	);
}
