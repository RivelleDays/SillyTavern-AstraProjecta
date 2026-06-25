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
	TriangleAlert,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	normalizeChatFileName,
	type RenameCurrentChatInput,
	type RenameCurrentChatResult,
} from "@/packages/core/st/currentChatRename";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import type { CurrentChatInfoSnapshot } from "@/packages/core/st/currentChatInfo";
import {
	ASTRA_CHAT_MAIN_MENU_RENAME_DIALOG_ID,
	ASTRA_CHAT_MAIN_MENU_RENAME_DIALOG_INPUT_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";
import { CurrentChatActionDialogDescription } from "@/packages/features/chat-session/send-form/main-menu/CurrentChatActionDialogDescription";

type ConfirmRenameResult = RenameCurrentChatResult | void;

export interface CurrentChatRenameDialogProps {
	chatInfoSnapshot: CurrentChatInfoSnapshot;
	onConfirmRename(
		input: RenameCurrentChatInput,
	): ConfirmRenameResult | Promise<ConfirmRenameResult>;
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

function isFailedRenameResult(
	value: ConfirmRenameResult,
): value is Extract<RenameCurrentChatResult, { ok: false }> {
	return (
		typeof value === "object" &&
		value !== null &&
		"ok" in value &&
		value.ok === false
	);
}

function CurrentChatRenameDialogFooter({
	canRename,
	handleConfirm,
	isBusy,
}: {
	canRename: boolean;
	handleConfirm(requestClose: () => void): void;
	isBusy: boolean;
}) {
	const requestClose = useResponsiveDialogClose();

	return (
		<div className="astra-chat-library-dialog-footer astra-chat-library-dialog-footer--rename">
			<div className="astra-chat-library-dialog-footer-actions">
				<ResponsiveDialogClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						disabled={isBusy}
						type="button"
						variant="ghost"
					>
						{translateAstra("sendForm.mainMenu.rename.cancel")}
					</Button>
				</ResponsiveDialogClose>
				<Button
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--confirm"
					disabled={!canRename || isBusy}
					type="button"
					variant="default"
					onClick={() => {
						handleConfirm(requestClose);
					}}
				>
					<UiIcon aria-hidden={true} icon={PencilLine} size="sm" />
					{isBusy
						? translateAstra("sendForm.mainMenu.rename.renaming")
						: translateAstra("sendForm.mainMenu.rename.confirm")}
				</Button>
			</div>
		</div>
	);
}

function CurrentChatRenameDialogBody({
	handleConfirm,
	inputLabel,
	isBusy,
	nextName,
	setNextName,
}: {
	handleConfirm(requestClose: () => void): void;
	inputLabel: string;
	isBusy: boolean;
	nextName: string;
	setNextName(nextName: string): void;
}) {
	const requestClose = useResponsiveDialogClose();

	return (
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
							"sendForm.mainMenu.rename.warningTitle",
						)}
					</p>
					<p className="astra-chat-library-dialog-alert-text">
						{translateAstra(
							"sendForm.mainMenu.rename.warningText",
						)}
					</p>
				</div>
			</div>
			<div className="astra-chat-library-dialog-field">
				<Input
					aria-label={inputLabel}
					disabled={isBusy}
					id={ASTRA_CHAT_MAIN_MENU_RENAME_DIALOG_INPUT_ID}
					placeholder={translateAstra(
						"sendForm.mainMenu.rename.placeholder",
					)}
					value={nextName}
					onChange={(event) => {
						setNextName(event.target.value);
					}}
					onKeyDown={(event) => {
						if (event.key !== "Enter") {
							return;
						}

						event.preventDefault();
						handleConfirm(requestClose);
					}}
				/>
				<p className="astra-chat-library-dialog-description">
					{translateAstra("sendForm.mainMenu.rename.hint")}
				</p>
			</div>
		</div>
	);
}

export function CurrentChatRenameDialog({
	chatInfoSnapshot,
	onConfirmRename,
	onOpenChange,
	open,
	snapshot,
}: CurrentChatRenameDialogProps) {
	const [nextName, setNextName] = React.useState(snapshot.chatFileName);
	const [isBusy, setIsBusy] = React.useState(false);

	React.useEffect(() => {
		if (!open) {
			return;
		}

		setNextName(snapshot.chatFileName);
		setIsBusy(false);
	}, [open, snapshot.chatFileName]);

	const currentName = normalizeChatFileName(snapshot.chatFileName);
	const normalizedNextName = normalizeChatFileName(nextName);
	const canRename =
		snapshot.hasActiveChat &&
		normalizedNextName.length > 0 &&
		normalizedNextName !== currentName;
	const entityName = snapshot.hasActiveChat
		? snapshot.entityName
		: translateAstra("sendForm.mainMenu.empty");
	const messageCountText = formatCount(chatInfoSnapshot.messageCount);
	const fileSizeText = chatInfoSnapshot.fileSize || "-";
	const messagesLabel = translateAstra("sendForm.mainMenu.meta.messages");
	const fileSizeLabel = translateAstra("sendForm.mainMenu.meta.fileSize");
	const title = translateAstra("sendForm.mainMenu.rename.title");
	const descriptionText = translateAstra(
		"sendForm.mainMenu.rename.description",
	);
	const description = (
		<CurrentChatActionDialogDescription
			chatFileName={snapshot.chatFileName || "-"}
			text={descriptionText}
		/>
	);
	const inputLabel = translateAstra("sendForm.mainMenu.rename.inputLabel");

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	const handleConfirm = React.useCallback(async (requestClose: () => void) => {
		if (!canRename || isBusy) {
			return;
		}

		setIsBusy(true);
		try {
			const result = await onConfirmRename({
				newFileName: normalizedNextName,
				oldFileName: currentName,
			});

			if (!isFailedRenameResult(result)) {
				requestClose();
			}
		} finally {
			setIsBusy(false);
		}
	}, [
		canRename,
		currentName,
		isBusy,
		normalizedNextName,
		onConfirmRename,
	]);

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
		<CurrentChatRenameDialogFooter
			canRename={canRename}
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
			id={ASTRA_CHAT_MAIN_MENU_RENAME_DIALOG_ID}
			icon={<UiIcon aria-hidden={true} icon={PencilLine} size="sm" />}
			open={open}
			title={title}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			<CurrentChatRenameDialogBody
				handleConfirm={(requestClose) => {
					void handleConfirm(requestClose);
				}}
				inputLabel={inputLabel}
				isBusy={isBusy}
				nextName={nextName}
				setNextName={setNextName}
			/>
		</ResponsiveDialog>
	);
}
