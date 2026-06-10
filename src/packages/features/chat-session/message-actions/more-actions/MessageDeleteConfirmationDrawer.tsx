import * as React from "react";

import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	useAstraDrawerClose,
} from "@/components/ui/astra/drawer";
import { Button } from "@/components/ui/shadcn/button";
import { Separator } from "@/components/ui/shadcn/separator";
import { UiIcon } from "@/components/ui/shared/icon";
import { ProviderSvgIcon } from "@/components/ui/shared/provider-svg-icon";
import {
	Bot,
	CalendarClock,
	Hash,
	Trash2,
	TriangleAlert,
} from "@/components/ui/shared/icons";
import type { LucideIcon } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	deleteChatMessage,
	type ChatMessageDeletionKind,
} from "@/packages/core/st/chatMessageDeletion";
import { MessageActionsIdentityHeader } from "@/packages/features/chat-session/message-actions/more-actions/MessageActionsIdentityHeader";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";

export interface MessageDeleteConfirmationDrawerState {
	kind: ChatMessageDeletionKind;
	target: MessageActionsTarget;
}

export interface MessageDeleteConfirmationDrawerProps {
	action: MessageDeleteConfirmationDrawerState | null;
	container?: HTMLElement | null;
	onExitComplete?: () => void;
	onDeleted(): void;
	onOpenChange(nextValue: boolean): void;
}

type ToastrLike = {
	error?: (message: string) => void;
	success?: (message: string) => void;
};

const MESSAGE_DELETE_CONFIRMATION_DRAWER_ID =
	"mobile-message-delete-confirmation-drawer";
const MESSAGE_DELETE_CONFIRMATION_DRAWER_TITLE_ID = `${MESSAGE_DELETE_CONFIRMATION_DRAWER_ID}-title`;
const MESSAGE_DELETE_CONFIRMATION_DRAWER_DESCRIPTION_ID = `${MESSAGE_DELETE_CONFIRMATION_DRAWER_ID}-description`;
const MESSAGE_DELETE_CONFIRMATION_DRAWER_HEADER_ID = `${MESSAGE_DELETE_CONFIRMATION_DRAWER_ID}-header`;
const MESSAGE_DELETE_CONFIRMATION_DRAWER_HEADING_ID = `${MESSAGE_DELETE_CONFIRMATION_DRAWER_ID}-heading`;
const MESSAGE_DELETE_CONFIRMATION_DRAWER_BODY_ID = `${MESSAGE_DELETE_CONFIRMATION_DRAWER_ID}-body`;
const MESSAGE_DELETE_CONFIRMATION_DRAWER_SCROLLABLE_CONTENT_ID = `${MESSAGE_DELETE_CONFIRMATION_DRAWER_ID}-scrollable-content`;
const MESSAGE_DELETE_CONFIRMATION_DRAWER_CONTENT_ID = `${MESSAGE_DELETE_CONFIRMATION_DRAWER_ID}-content`;
const MESSAGE_DELETE_CONFIRMATION_DRAWER_FOOTER_ID = `${MESSAGE_DELETE_CONFIRMATION_DRAWER_ID}-footer`;

function showToast(kind: keyof ToastrLike, message: string) {
	const toastr = (globalThis as typeof globalThis & { toastr?: ToastrLike })
		.toastr;
	const handler = toastr?.[kind];
	if (typeof handler === "function") {
		handler.call(toastr, message);
	}
}

function MessageDeleteConfirmationMetadataRow({
	children,
	icon,
	iconModifier,
	label,
	valueText,
}: {
	children: React.ReactNode;
	icon: LucideIcon;
	iconModifier: "swipe" | "sent" | "model";
	label: string;
	valueText: string;
}) {
	return (
		<dl
			aria-label={`${label}: ${valueText}`}
			className="astra-messageDeleteConfirmationDrawer__detailRow"
			title={`${label}: ${valueText}`}
		>
			<dt className="astra-messageDeleteConfirmationDrawer__detailTerm">
				<UiIcon
					aria-hidden={true}
					className={`astra-messageDeleteConfirmationDrawer__detailIcon astra-messageDeleteConfirmationDrawer__detailIcon--${iconModifier}`}
					icon={icon}
					size="xs"
				/>
				<span>{label}</span>
			</dt>
			<dd className="astra-messageDeleteConfirmationDrawer__detailDefinition">
				{children}
			</dd>
		</dl>
	);
}

function MessageDeleteConfirmationModelValue({
	modelIconHtml,
	modelIconKey,
	modelLabel,
}: {
	modelIconHtml: string;
	modelIconKey?: string;
	modelLabel: string;
}) {
	return (
		<span className="astra-messageDeleteConfirmationDrawer__modelDefinitionValue">
			{modelIconHtml ? (
				<span
					aria-hidden={true}
					className="astra-messageDeleteConfirmationDrawer__modelSnapshotIcon"
					dangerouslySetInnerHTML={{ __html: modelIconHtml }}
				/>
			) : (
				<ProviderSvgIcon
					className="astra-messageDeleteConfirmationDrawer__modelSnapshotIcon"
					iconKey={modelIconKey}
				/>
			)}
			<span className="astra-messageDeleteConfirmationDrawer__modelLabel">
				{modelLabel}
			</span>
		</span>
	);
}

function MessageDeleteConfirmationFooter({
	canDelete,
	closeLabel,
	confirmLabel,
	deletingLabel,
	handleConfirm,
	isBusy,
}: {
	canDelete: boolean;
	closeLabel: string;
	confirmLabel: string;
	deletingLabel: string;
	handleConfirm(requestClose: () => void): void;
	isBusy: boolean;
}) {
	const requestClose = useAstraDrawerClose();

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
				{isBusy ? deletingLabel : confirmLabel}
			</Button>
			<div className="astra-chat-library-dialog-footer-actions">
				<DrawerClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						disabled={isBusy}
						type="button"
						variant="default"
					>
						{closeLabel}
					</Button>
				</DrawerClose>
			</div>
		</div>
	);
}

export function MessageDeleteConfirmationDrawer({
	action,
	container,
	onExitComplete,
	onDeleted,
	onOpenChange,
}: MessageDeleteConfirmationDrawerProps) {
	const [isBusy, setIsBusy] = React.useState(false);
	const [lastAction, setLastAction] =
		React.useState<MessageDeleteConfirmationDrawerState | null>(action);

	React.useEffect(() => {
		if (action) {
			setLastAction(action);
		}
	}, [action]);

	React.useEffect(() => {
		setIsBusy(false);
	}, [action]);

	const displayedAction = action ?? lastAction;
	const kind = displayedAction?.kind ?? "message";
	const target = displayedAction?.target ?? null;
	const isSwipeDelete = kind === "swipe";
	const canDelete =
		Boolean(target) && (!isSwipeDelete || Number(target?.swipeTotal) > 1);
	const title = translateAstra(
		isSwipeDelete
			? "messageActions.deleteConfirm.swipe.title"
			: "messageActions.deleteConfirm.message.title",
	);
	const description = translateAstra(
		isSwipeDelete
			? "messageActions.deleteConfirm.swipe.description"
			: "messageActions.deleteConfirm.message.description",
	);
	const warningTitle = translateAstra(
		"messageActions.deleteConfirm.warningTitle",
	);
	const warningText = translateAstra(
		isSwipeDelete
			? "messageActions.deleteConfirm.swipe.warningText"
			: "messageActions.deleteConfirm.message.warningText",
	);
	const swipeLabel = translateAstra(
		"messageActions.deleteConfirm.meta.swipe",
	);
	const sentLabel = translateAstra("messageActions.deleteConfirm.meta.sent");
	const modelLabel = translateAstra(
		"messageActions.deleteConfirm.meta.model",
	);
	const messagePreviewTitle = translateAstra(
		"messageActions.deleteConfirm.messagePreview.title",
	);
	const confirmLabel = translateAstra(
		isSwipeDelete
			? "messageActions.deleteConfirm.swipe.confirm"
			: "messageActions.deleteConfirm.message.confirm",
	);
	const deletingLabel = translateAstra(
		"messageActions.deleteConfirm.deleting",
	);
	const closeLabel = translateAstra("messageActions.deleteConfirm.cancel");
	const successLabel = translateAstra(
		isSwipeDelete
			? "messageActions.deleteConfirm.swipe.success"
			: "messageActions.deleteConfirm.message.success",
	);
	const failureLabel = translateAstra(
		isSwipeDelete
			? "messageActions.deleteConfirm.swipe.failure"
			: "messageActions.deleteConfirm.message.failure",
	);
	const metadata = target?.metadata ?? {};
	const swipePosition = target
		? `${target.swipeIndex + 1} / ${target.swipeTotal}`
		: "-";
	const sentValue = metadata.timestamp?.trim() ?? "";
	const modelValue = metadata.modelLabel?.trim() ?? "";
	const modelIconHtml = metadata.modelIconHtml?.trim() ?? "";
	const modelIconKey = metadata.modelIconKey?.trim() ?? "";
	const renderedMessageHtml = target?.renderedMessageHtml ?? "";

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	const handleConfirm = React.useCallback(
		async (requestClose: () => void) => {
			if (!target || !canDelete || isBusy) {
				return;
			}

			setIsBusy(true);
			try {
				const result = await deleteChatMessage({
					kind,
					messageId: target.messageId,
					swipeIndex:
						kind === "swipe" ? target.swipeIndex : undefined,
				});

				if (!result.ok) {
					showToast("error", failureLabel);
					return;
				}

				onDeleted();
				showToast("success", successLabel);
				requestClose();
			} finally {
				setIsBusy(false);
			}
		},
		[
			canDelete,
			failureLabel,
			isBusy,
			kind,
			onDeleted,
			successLabel,
			target,
		],
	);

	const handleExitComplete = React.useCallback(() => {
		if (!action) {
			setLastAction(null);
		}

		onExitComplete?.();
	}, [action, onExitComplete]);

	return (
		<Drawer
			container={container}
			direction="bottom"
			onExitComplete={handleExitComplete}
			open={Boolean(action)}
			onOpenChange={onOpenChange}
			repositionInputs={false}
		>
			<DrawerContent
				id={MESSAGE_DELETE_CONFIRMATION_DRAWER_ID}
				aria-describedby={
					MESSAGE_DELETE_CONFIRMATION_DRAWER_DESCRIPTION_ID
				}
				aria-labelledby={MESSAGE_DELETE_CONFIRMATION_DRAWER_TITLE_ID}
				className="astra-drawer-surface astra-main-interface-drawer astra-main-interface-chat-row-action-dialog astra-messageDeleteConfirmationDrawer"
				container={container}
				onOpenAutoFocus={handleOpenAutoFocus}
			>
				<DrawerHeader className="sr-only">
					<DrawerTitle asChild={true}>
						<div
							aria-hidden={true}
							className="astra-messageDeleteConfirmationDrawer__primitiveA11yGuard sr-only"
						/>
					</DrawerTitle>
					<DrawerDescription asChild={true}>
						<div
							aria-hidden={true}
							className="astra-messageDeleteConfirmationDrawer__primitiveA11yGuard sr-only"
						/>
					</DrawerDescription>
					<div
						id={MESSAGE_DELETE_CONFIRMATION_DRAWER_TITLE_ID}
						data-slot="drawer-title"
					>
						{title}
					</div>
					<div
						id={MESSAGE_DELETE_CONFIRMATION_DRAWER_DESCRIPTION_ID}
						data-slot="drawer-description"
					>
						{description}
					</div>
				</DrawerHeader>
				<div
					id={MESSAGE_DELETE_CONFIRMATION_DRAWER_HEADER_ID}
					className="astra-messageDeleteConfirmationDrawer__header"
				>
					<MessageActionsIdentityHeader target={target} />
				</div>
				<div
					id={MESSAGE_DELETE_CONFIRMATION_DRAWER_HEADING_ID}
					className="astra-dialog-heading astra-messageDeleteConfirmationDrawer__heading"
				>
					<span
						aria-hidden={true}
						className="astra-dialog-icon astra-messageDeleteConfirmationDrawer__headingIcon"
					>
						<UiIcon aria-hidden={true} icon={Trash2} size="sm" />
					</span>
					<div className="astra-dialog-headingContent astra-messageDeleteConfirmationDrawer__headingContent">
						<div className="astra-dialog-title">{title}</div>
						<div className="astra-dialog-description">
							{description}
						</div>
					</div>
				</div>
				<div className="astra-dialog-section astra-chat-library-dialog-content astra-messageDeleteConfirmationDrawer__confirmationContent">
					<div
						className="astra-chat-library-dialog-alert"
						role="alert"
					>
						<UiIcon
							aria-hidden={true}
							className="astra-chat-library-dialog-alert-icon"
							icon={TriangleAlert}
							size="sm"
						/>
						<div className="astra-chat-library-dialog-alert-content">
							<p className="astra-chat-library-dialog-alert-title">
								{warningTitle}
							</p>
							<p className="astra-chat-library-dialog-alert-text">
								{warningText}
							</p>
						</div>
					</div>
					<div className="astra-chat-library-dialog-meta astra-messageDeleteConfirmationDrawer__detailSection">
						<MessageDeleteConfirmationMetadataRow
							icon={Hash}
							iconModifier="swipe"
							label={swipeLabel}
							valueText={swipePosition}
						>
							{swipePosition}
						</MessageDeleteConfirmationMetadataRow>
						{sentValue || modelValue ? (
							<Separator className="astra-messageDeleteConfirmationDrawer__detailSeparator" />
						) : null}
						{sentValue ? (
							<MessageDeleteConfirmationMetadataRow
								icon={CalendarClock}
								iconModifier="sent"
								label={sentLabel}
								valueText={sentValue}
							>
								{sentValue}
							</MessageDeleteConfirmationMetadataRow>
						) : null}
						{sentValue && modelValue ? (
							<Separator className="astra-messageDeleteConfirmationDrawer__detailSeparator" />
						) : null}
						{modelValue ? (
							<MessageDeleteConfirmationMetadataRow
								icon={Bot}
								iconModifier="model"
								label={modelLabel}
								valueText={modelValue}
							>
								<MessageDeleteConfirmationModelValue
									modelIconHtml={modelIconHtml}
									modelIconKey={modelIconKey}
									modelLabel={modelValue}
								/>
							</MessageDeleteConfirmationMetadataRow>
						) : null}
					</div>
				</div>
				<DrawerBody
					id={MESSAGE_DELETE_CONFIRMATION_DRAWER_BODY_ID}
					aria-label={messagePreviewTitle}
					className="astra-messageDeleteConfirmationDrawer__messageBody"
					viewportProps={{
						id: MESSAGE_DELETE_CONFIRMATION_DRAWER_SCROLLABLE_CONTENT_ID,
						className:
							"astra-messageDeleteConfirmationDrawer__messageScrollableContent",
					}}
					contentProps={{
						id: MESSAGE_DELETE_CONFIRMATION_DRAWER_CONTENT_ID,
						className:
							"astra-messageDeleteConfirmationDrawer__messageContent",
					}}
				>
					<div
						className="astra-messageDeleteConfirmationDrawer__messagePreview mes"
						data-astra-message-preview="true"
						dangerouslySetInnerHTML={{
							__html: renderedMessageHtml,
						}}
					/>
				</DrawerBody>
				<div
					id={MESSAGE_DELETE_CONFIRMATION_DRAWER_FOOTER_ID}
					className="astra-dialog-footer astra-messageDeleteConfirmationDrawer__footer"
				>
					<MessageDeleteConfirmationFooter
						canDelete={canDelete}
						closeLabel={closeLabel}
						confirmLabel={confirmLabel}
						deletingLabel={deletingLabel}
						handleConfirm={(requestClose) => {
							void handleConfirm(requestClose);
						}}
						isBusy={isBusy}
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
