import * as React from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogClose,
	useResponsiveDialogClose,
} from "@/components/ui/astra/ResponsiveDialog";
import { Button } from "@/components/ui/shadcn/button";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	Database,
	MessageCircleMore,
	Trash2,
	TriangleAlert,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import type { DeleteCurrentChatResult } from "@/packages/core/st/currentChatDelete";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import type { CurrentChatInfoSnapshot } from "@/packages/core/st/currentChatInfo";
import { formatStAbsoluteTimestamp } from "@/packages/core/st/timestamps";
import { ASTRA_CHAT_MAIN_MENU_DELETE_DIALOG_ID } from "@/packages/features/chat-session/send-form/contracts/dom";
import { CurrentChatActionDialogDescription } from "@/packages/features/chat-session/send-form/main-menu/CurrentChatActionDialogDescription";

type ConfirmDeleteResult = DeleteCurrentChatResult | void;

export interface CurrentChatDeleteDialogProps {
	chatInfoSnapshot: CurrentChatInfoSnapshot;
	onConfirmDelete(
		expectedFileName: string,
	): ConfirmDeleteResult | Promise<ConfirmDeleteResult>;
	onOpenChange(nextValue: boolean): void;
	open: boolean;
	snapshot: CurrentChatIdentitySnapshot;
}

function formatCount(value: number | null): string {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return "-";
	}

	return String(value);
}

function isFailedDeleteResult(
	value: ConfirmDeleteResult,
): value is Extract<DeleteCurrentChatResult, { ok: false }> {
	return (
		typeof value === "object" &&
		value !== null &&
		"ok" in value &&
		value.ok === false
	);
}

function CurrentChatDeleteDialogFooter({
	canDelete,
	handleConfirm,
	isBusy,
}: {
	canDelete: boolean;
	handleConfirm(requestClose: () => void): void;
	isBusy: boolean;
}) {
	const requestClose = useResponsiveDialogClose();

	return (
		<div className="astra-chat-library-dialog-footer astra-chat-library-dialog-footer--delete">
			<Button
				className="astra-chat-library-dialog-action astra-chat-library-dialog-action--delete"
				disabled={!canDelete || isBusy}
				type="button"
				variant="ghost"
				onClick={() => {
					handleConfirm(requestClose);
				}}
			>
				<UiIcon aria-hidden={true} icon={Trash2} size="sm" />
				{isBusy
					? translateAstra("sendForm.mainMenu.delete.deleting")
					: translateAstra("sendForm.mainMenu.delete.confirm")}
			</Button>
			<div className="astra-chat-library-dialog-footer-actions">
				<ResponsiveDialogClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						disabled={isBusy}
						type="button"
						variant="default"
					>
						{translateAstra("sendForm.mainMenu.delete.close")}
					</Button>
				</ResponsiveDialogClose>
			</div>
		</div>
	);
}

export function CurrentChatDeleteDialog({
	chatInfoSnapshot,
	onConfirmDelete,
	onOpenChange,
	open,
	snapshot,
}: CurrentChatDeleteDialogProps) {
	const [isBusy, setIsBusy] = React.useState(false);

	React.useEffect(() => {
		if (!open) {
			return;
		}

		setIsBusy(false);
	}, [open, snapshot.chatFileName]);

	const entityName = snapshot.hasActiveChat
		? snapshot.entityName
		: translateAstra("sendForm.mainMenu.empty");
	const messageCountText = formatCount(chatInfoSnapshot.messageCount);
	const fileSizeText = chatInfoSnapshot.fileSize || "-";
	const formattedLastUpdatedAt =
		formatStAbsoluteTimestamp(chatInfoSnapshot.lastUpdatedAt) || "-";
	const lastMessagePreview = chatInfoSnapshot.lastMessagePreview || "-";
	const chatFileName = snapshot.chatFileName || "-";
	const canDelete = snapshot.hasActiveChat && Boolean(snapshot.chatFileName);
	const messagesLabel = translateAstra("sendForm.mainMenu.meta.messages");
	const fileSizeLabel = translateAstra("sendForm.mainMenu.meta.fileSize");
	const title = translateAstra("sendForm.mainMenu.delete.title");
	const descriptionText = translateAstra(
		"sendForm.mainMenu.delete.description",
	);
	const description = (
		<CurrentChatActionDialogDescription
			chatFileName={chatFileName}
			text={descriptionText}
		/>
	);

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	const handleConfirm = React.useCallback(
		async (requestClose: () => void) => {
			if (!canDelete || isBusy) {
				return;
			}

			setIsBusy(true);
			try {
				const result = await onConfirmDelete(snapshot.chatFileName);

				if (!isFailedDeleteResult(result)) {
					requestClose();
				}
			} finally {
				setIsBusy(false);
			}
		},
		[canDelete, isBusy, onConfirmDelete, snapshot.chatFileName],
	);

	const headerContent = (
		<div className="astra-dialog-identity">
			<div className="astra-dialog-identityAvatar">
				<AstraChatAvatar
					alt={`${entityName} avatar`}
					avatarUrl={snapshot.thumbnailUrl}
					className="astra-dialog-identityImage"
					groupAvatarUrls={
						snapshot.kind === "group"
							? snapshot.groupAvatarUrls
							: undefined
					}
					loading="lazy"
				/>
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

	const footer = (
		<CurrentChatDeleteDialogFooter
			canDelete={canDelete}
			handleConfirm={(requestClose) => {
				void handleConfirm(requestClose);
			}}
			isBusy={isBusy}
		/>
	);

	return (
		<ResponsiveDialog
			description={description}
			footer={footer}
			headerContent={headerContent}
			id={ASTRA_CHAT_MAIN_MENU_DELETE_DIALOG_ID}
			icon={<UiIcon aria-hidden={true} icon={Trash2} size="sm" />}
			open={open}
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
								"sendForm.mainMenu.delete.warningTitle",
							)}
						</p>
						<p className="astra-chat-library-dialog-alert-text">
							{translateAstra(
								"sendForm.mainMenu.delete.warningText",
							)}
						</p>
					</div>
				</div>
				<div className="astra-chat-library-dialog-meta">
					<div className="astra-chat-library-dialog-row">
						<span className="astra-chat-library-dialog-label">
							{translateAstra(
								"sendForm.mainMenu.meta.lastUpdatedAt",
							)}
						</span>
						<span
							className="astra-chat-library-dialog-value"
							title={formattedLastUpdatedAt}
						>
							{formattedLastUpdatedAt}
						</span>
					</div>
					<div className="astra-chat-library-dialog-row astra-chat-library-dialog-row--stack">
						<span className="astra-chat-library-dialog-label">
							{translateAstra(
								"sendForm.mainMenu.meta.lastMessage",
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
			</div>
		</ResponsiveDialog>
	);
}
