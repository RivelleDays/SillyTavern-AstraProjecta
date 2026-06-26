import * as React from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogClose,
	useResponsiveDialogClose,
} from "@/components/ui/astra/ResponsiveDialog";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	Database,
	MessageCircleMore,
	PencilLine,
	Trash2,
	TriangleAlert,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import type {
	ChatCatalogEntry,
	DeleteChatCatalogResult,
	RenameChatCatalogResult,
} from "@/packages/core/st/chat-catalog";

export type ChatCatalogRowActionMode = "delete" | "rename";

export interface ChatCatalogRowActionDialogState {
	entry: ChatCatalogEntry;
	mode: ChatCatalogRowActionMode;
}

type ConfirmRenameResult = RenameChatCatalogResult | void;
type ConfirmDeleteResult = DeleteChatCatalogResult | void;
type CloseDialog = () => void;

export interface ChatCatalogRowActionDialogProps {
	action: ChatCatalogRowActionDialogState | null;
	onConfirmDelete(entry: ChatCatalogEntry): Promise<ConfirmDeleteResult>;
	onConfirmRename(
		entry: ChatCatalogEntry,
		newFileName: string,
	): Promise<ConfirmRenameResult>;
	onOpenChange(nextValue: boolean): void;
	onSuccess(): void;
}

type ToastrLike = {
	error?: (message: string) => void;
	success?: (message: string) => void;
};

const JSONL_EXTENSION_PATTERN = /\.jsonl$/i;
const CHAT_ROW_ACTION_DIALOG_ID = "astra-main-interface-chat-row-action-dialog";
const CHAT_ROW_ACTION_DIALOG_RENAME_INPUT_ID =
	"astra-main-interface-chat-row-action-dialog-rename-input";

function showToast(kind: keyof ToastrLike, message: string) {
	const toastr = (globalThis as typeof globalThis & { toastr?: ToastrLike })
		.toastr;
	const handler = toastr?.[kind];
	if (typeof handler === "function") {
		handler.call(toastr, message);
	}
}

function normalizeChatFileName(value: string): string {
	return value.trim().replace(JSONL_EXTENSION_PATTERN, "");
}

function formatCount(value: number | null): string {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return "-";
	}

	return String(value);
}

export function ChatCatalogRowDialogIdentityHeader({
	entry,
}: {
	entry: ChatCatalogEntry;
}) {
	const messagesLabel = translateAstra(
		"astraMainInterface.chatMenu.meta.messageCount",
	);
	const fileSizeLabel = translateAstra(
		"astraMainInterface.chatMenu.meta.fileSize",
	);
	const messageCountText = formatCount(entry.messageCount ?? null);
	const fileSizeText = entry.fileSize || "-";
	const entityName =
		entry.entityName ||
		translateAstra("astraMainInterface.chatMenu.untitledChat");
	const hasDialogAvatar = Boolean(
		entry.avatarUrl || (entry.groupAvatarUrls?.length ?? 0) > 0,
	);

	return (
		<div className="astra-dialog-identity">
			<div className="astra-dialog-identityAvatar">
				{hasDialogAvatar ? (
					<AstraChatAvatar
						alt={`${entityName} avatar`}
						avatarUrl={entry.avatarUrl}
						className="astra-dialog-identityImage"
						groupAvatarUrls={
							entry.kind === "group"
								? entry.groupAvatarUrls
								: undefined
						}
						loading="lazy"
					/>
				) : null}
			</div>
			<span className="astra-dialog-identityName" title={entityName}>
				{entityName}
			</span>
			<span
				aria-label={`${messagesLabel}: ${messageCountText}`}
				className="astra-dialog-identityMesBadge"
				title={`${messagesLabel}: ${messageCountText}`}
			>
				<UiIcon
					aria-hidden={true}
					className="astra-dialog-identityMesBadgeIcon"
					icon={MessageCircleMore}
					size="xs"
				/>
				{messageCountText}
			</span>
			<span
				aria-label={`${fileSizeLabel}: ${fileSizeText}`}
				className="astra-dialog-identityMesBadge"
				title={`${fileSizeLabel}: ${fileSizeText}`}
			>
				<UiIcon
					aria-hidden={true}
					className="astra-dialog-identityMesBadgeIcon"
					icon={Database}
					size="xs"
				/>
				{fileSizeText}
			</span>
		</div>
	);
}

function isFailedRenameResult(
	value: ConfirmRenameResult,
): value is Extract<RenameChatCatalogResult, { ok: false }> {
	return (
		typeof value === "object" &&
		value !== null &&
		"ok" in value &&
		value.ok === false
	);
}

function isFailedDeleteResult(
	value: ConfirmDeleteResult,
): value is Extract<DeleteChatCatalogResult, { ok: false }> {
	return (
		typeof value === "object" &&
		value !== null &&
		"ok" in value &&
		value.ok === false
	);
}

export function ChatCatalogRowActionDialog({
	action,
	onConfirmDelete,
	onConfirmRename,
	onOpenChange,
	onSuccess,
}: ChatCatalogRowActionDialogProps) {
	const entry = action?.entry ?? null;
	const mode = action?.mode ?? "rename";
	const isOpen = entry !== null;
	const isRename = mode === "rename";
	const isDelete = mode === "delete";
	const [nextName, setNextName] = React.useState("");
	const [isBusy, setIsBusy] = React.useState(false);

	React.useEffect(() => {
		if (!entry || !isOpen) {
			setIsBusy(false);
			return;
		}

		setNextName(entry.chatId);
		setIsBusy(false);
	}, [entry, isOpen, mode]);

	const currentName = normalizeChatFileName(entry?.chatId ?? "");
	const normalizedNextName = normalizeChatFileName(nextName);
	const canRename =
		isRename &&
		currentName.length > 0 &&
		normalizedNextName.length > 0 &&
		normalizedNextName !== currentName;
	const canDelete = isDelete && Boolean(entry?.chatId);
	const title = translateAstra(
		isDelete
			? "astraMainInterface.chatMenu.delete.title"
			: "astraMainInterface.chatMenu.rename.title",
	);
	const descriptionText = translateAstra(
		isDelete
			? "astraMainInterface.chatMenu.delete.description"
			: "astraMainInterface.chatMenu.rename.description",
	);
	const lastUpdatedAtText =
		entry?.lastMessageLabel ||
		translateAstra("astraMainInterface.chatMenu.unknownDate");
	const lastMessagePreview = entry?.lastMessagePreview || "-";
	const chatFileName = entry?.chatId || "-";

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	const handleConfirmRename = React.useCallback(
		async (close: CloseDialog) => {
			if (!entry || !canRename || isBusy) return;

			setIsBusy(true);
			try {
				const result = await onConfirmRename(entry, normalizedNextName);
				if (isFailedRenameResult(result)) {
					showToast(
						"error",
						translateAstra(
							"astraMainInterface.chatMenu.rename.failure",
						),
					);
					return;
				}

				onSuccess();
				showToast(
					"success",
					translateAstra(
						"astraMainInterface.chatMenu.rename.success",
					),
				);
				close();
			} finally {
				setIsBusy(false);
			}
		},
		[
			canRename,
			entry,
			isBusy,
			normalizedNextName,
			onConfirmRename,
			onSuccess,
		],
	);

	const handleConfirmDelete = React.useCallback(
		async (close: CloseDialog) => {
			if (!entry || !canDelete || isBusy) return;

			setIsBusy(true);
			try {
				const result = await onConfirmDelete(entry);
				if (isFailedDeleteResult(result)) {
					showToast(
						"error",
						translateAstra(
							"astraMainInterface.chatMenu.delete.failure",
						),
					);
					return;
				}

				onSuccess();
				showToast(
					"success",
					translateAstra(
						"astraMainInterface.chatMenu.delete.success",
					),
				);
				close();
			} finally {
				setIsBusy(false);
			}
		},
		[canDelete, entry, isBusy, onConfirmDelete, onSuccess],
	);

	const headerContent = entry ? (
		<ChatCatalogRowDialogIdentityHeader entry={entry} />
	) : null;

	const footer = (
		<ChatCatalogRowActionDialogFooter
			canDelete={canDelete}
			canRename={canRename}
			isBusy={isBusy}
			isDelete={isDelete}
			isRename={isRename}
			onConfirmDelete={handleConfirmDelete}
			onConfirmRename={handleConfirmRename}
		/>
	);

	return (
		<ResponsiveDialog
			className="astra-main-interface-drawer astra-main-interface-chat-row-action-dialog"
			description={
				<div className="astra-dialog-current-chat-file-description">
					{descriptionText}
					<span className="astra-dialog-current-chat-file-token">
						<span className="astra-dialog-current-chat-file-name">
							{chatFileName}
						</span>
					</span>
				</div>
			}
			footer={footer}
			headerContent={headerContent}
			id={CHAT_ROW_ACTION_DIALOG_ID}
			icon={
				<UiIcon
					aria-hidden={true}
					icon={isDelete ? Trash2 : PencilLine}
					size="sm"
				/>
			}
			open={isOpen}
			title={title}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			<div className="astra-dialog-section astra-chat-library-dialog-content">
				<div className="astra-chat-library-dialog-alert" role="alert">
					<UiIcon
						aria-hidden={true}
						className="astra-chat-library-dialog-alert-icon"
						icon={TriangleAlert}
						size="sm"
					/>
					<div className="astra-chat-library-dialog-alert-content">
						<p className="astra-chat-library-dialog-alert-title">
							{translateAstra(
								isDelete
									? "astraMainInterface.chatMenu.delete.warningTitle"
									: "astraMainInterface.chatMenu.rename.warningTitle",
							)}
						</p>
						<p className="astra-chat-library-dialog-alert-text">
							{translateAstra(
								isDelete
									? "astraMainInterface.chatMenu.delete.warningText"
									: "astraMainInterface.chatMenu.rename.warningText",
							)}
						</p>
					</div>
				</div>
				{isRename ? (
					<ChatCatalogRowActionDialogRenameField
						disabled={isBusy}
						nextName={nextName}
						onConfirmRename={handleConfirmRename}
						onNextNameChange={setNextName}
					/>
				) : (
					<div className="astra-chat-library-dialog-meta">
						<div className="astra-chat-library-dialog-row">
							<span className="astra-chat-library-dialog-label">
								{translateAstra(
									"astraMainInterface.chatMenu.meta.lastUpdatedAt",
								)}
							</span>
							<span
								className="astra-chat-library-dialog-value"
								title={lastUpdatedAtText}
							>
								{lastUpdatedAtText}
							</span>
						</div>
						<div className="astra-chat-library-dialog-row astra-chat-library-dialog-row--stack">
							<span className="astra-chat-library-dialog-label">
								{translateAstra(
									"astraMainInterface.chatMenu.meta.lastMessage",
								)}
							</span>
							<p
								className="astra-chat-library-dialog-preview"
								title={lastMessagePreview}
							>
								{lastMessagePreview}
							</p>
						</div>
					</div>
				)}
			</div>
		</ResponsiveDialog>
	);
}

function ChatCatalogRowActionDialogFooter({
	canDelete,
	canRename,
	isBusy,
	isDelete,
	isRename,
	onConfirmDelete,
	onConfirmRename,
}: {
	canDelete: boolean;
	canRename: boolean;
	isBusy: boolean;
	isDelete: boolean;
	isRename: boolean;
	onConfirmDelete(close: CloseDialog): Promise<void>;
	onConfirmRename(close: CloseDialog): Promise<void>;
}) {
	const close = useResponsiveDialogClose();

	return (
		<div
			className={
				isDelete
					? "astra-chat-library-dialog-footer astra-chat-library-dialog-footer--delete"
					: "astra-chat-library-dialog-footer astra-chat-library-dialog-footer--rename"
			}
		>
			{isDelete ? (
				<Button
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--delete"
					disabled={!canDelete || isBusy}
					type="button"
					variant="ghost"
					onClick={() => {
						void onConfirmDelete(close);
					}}
				>
					<UiIcon aria-hidden={true} icon={Trash2} size="sm" />
					{isBusy
						? translateAstra(
								"astraMainInterface.chatMenu.delete.deleting",
							)
						: translateAstra(
								"astraMainInterface.chatMenu.delete.confirm",
							)}
				</Button>
			) : null}
			<div className="astra-chat-library-dialog-footer-actions">
				<ResponsiveDialogClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						disabled={isBusy}
						type="button"
						variant={isRename ? "ghost" : "default"}
					>
						{translateAstra(
							isRename
								? "astraMainInterface.chatMenu.rename.cancel"
								: "astraMainInterface.chatMenu.delete.close",
						)}
					</Button>
				</ResponsiveDialogClose>
				{isRename ? (
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--confirm"
						disabled={!canRename || isBusy}
						type="button"
						variant="default"
						onClick={() => {
							void onConfirmRename(close);
						}}
					>
						<UiIcon
							aria-hidden={true}
							icon={PencilLine}
							size="sm"
						/>
						{isBusy
							? translateAstra(
									"astraMainInterface.chatMenu.rename.renaming",
								)
							: translateAstra(
									"astraMainInterface.chatMenu.rename.confirm",
								)}
					</Button>
				) : null}
			</div>
		</div>
	);
}

function ChatCatalogRowActionDialogRenameField({
	disabled,
	nextName,
	onConfirmRename,
	onNextNameChange,
}: {
	disabled: boolean;
	nextName: string;
	onConfirmRename(close: CloseDialog): Promise<void>;
	onNextNameChange(nextName: string): void;
}) {
	const close = useResponsiveDialogClose();

	return (
		<div className="astra-chat-library-dialog-field">
			<Input
				aria-label={translateAstra(
					"astraMainInterface.chatMenu.rename.inputLabel",
				)}
				disabled={disabled}
				id={CHAT_ROW_ACTION_DIALOG_RENAME_INPUT_ID}
				placeholder={translateAstra(
					"astraMainInterface.chatMenu.rename.placeholder",
				)}
				value={nextName}
				onChange={(event) => {
					onNextNameChange(event.target.value);
				}}
				onKeyDown={(event) => {
					if (event.key !== "Enter") return;
					event.preventDefault();
					void onConfirmRename(close);
				}}
			/>
			<p className="astra-chat-library-dialog-description">
				{translateAstra("astraMainInterface.chatMenu.rename.hint")}
			</p>
		</div>
	);
}
