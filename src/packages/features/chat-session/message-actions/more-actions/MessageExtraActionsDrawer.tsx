import * as React from "react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/astra/drawer";
import { Delete, MessageCircleX } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import {
	isMessageExtraActionDisabled,
	MessageExtraActionIcon,
	type MessageExtraActionItem,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionItem";
import { MessageActionsIdentityHeader } from "@/packages/features/chat-session/message-actions/more-actions/MessageActionsIdentityHeader";
import type {
	MessageActionsTarget,
	MoreActionsDrawerActionConfig,
} from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";

export type MessageExtraActionsDrawerAction = Omit<
	MessageExtraActionItem,
	"variant"
>;

export interface MessageExtraActionsDrawerDangerActions {
	deleteMessage?: MoreActionsDrawerActionConfig;
	deleteSwipe?: MoreActionsDrawerActionConfig;
}

const EXTRA_ACTIONS_DRAWER_ID = "astra-message-extra-actions-drawer";
const EXTRA_ACTIONS_DRAWER_TITLE_ID = `${EXTRA_ACTIONS_DRAWER_ID}-title`;
const EXTRA_ACTIONS_DRAWER_DESCRIPTION_ID = `${EXTRA_ACTIONS_DRAWER_ID}-description`;
const EXTRA_ACTIONS_DRAWER_HEADER_ID = `${EXTRA_ACTIONS_DRAWER_ID}-header`;
const EXTRA_ACTIONS_DRAWER_HEADING_ID = `${EXTRA_ACTIONS_DRAWER_ID}-heading`;
const EXTRA_ACTIONS_DRAWER_BODY_ID = `${EXTRA_ACTIONS_DRAWER_ID}-body`;
const EXTRA_ACTIONS_DRAWER_SCROLLABLE_CONTENT_ID = `${EXTRA_ACTIONS_DRAWER_ID}-scrollable-content`;
const EXTRA_ACTIONS_DRAWER_CONTENT_ID = `${EXTRA_ACTIONS_DRAWER_ID}-content`;

function isConfigActionDisabled(
	action: MoreActionsDrawerActionConfig | undefined,
) {
	return action?.disabled === true || typeof action?.onClick !== "function";
}

function ActionButton({ action }: { action: MessageExtraActionItem }) {
	const variant = action.variant ?? "native";

	return (
		<button
			aria-label={action.label}
			className={cn(
				"astra-messageExtraActionsDrawer__action",
				variant === "danger"
					? "astra-messageExtraActionsDrawer__action--danger"
					: "astra-messageExtraActionsDrawer__action--native",
			)}
			disabled={isMessageExtraActionDisabled(action)}
			title={action.label}
			type="button"
			onClick={action.onClick}
		>
			<MessageExtraActionIcon action={action} />
			<span className="astra-messageExtraActionsDrawer__actionText">
				<span className="astra-messageExtraActionsDrawer__actionLabel">
					{action.label}
				</span>
				{action.description ? (
					<span className="astra-messageExtraActionsDrawer__actionDescription">
						{action.description}
					</span>
				) : null}
			</span>
		</button>
	);
}

function Group({
	children,
	label,
}: {
	children: React.ReactNode;
	label: string;
}) {
	return (
		<section className="astra-messageExtraActionsDrawer__group">
			<div className="astra-messageExtraActionsDrawer__groupLabel">
				{label}
			</div>
			<div className="astra-messageExtraActionsDrawer__groupContent">
				{children}
			</div>
		</section>
	);
}

export function MessageExtraActionsDrawer({
	container,
	dangerActions,
	nativeActions,
	onOpenChange,
	open,
	target,
}: {
	container?: HTMLElement | null;
	dangerActions?: MessageExtraActionsDrawerDangerActions;
	nativeActions: MessageExtraActionsDrawerAction[];
	onOpenChange(nextValue: boolean): void;
	open: boolean;
	target: MessageActionsTarget | null;
}) {
	const title = translateAstra("messageActions.extra.title");
	const description = translateAstra("messageActions.extra.description");
	const dangerLabel = translateAstra("messageActions.extra.group.danger");
	const nativeActionsLabel = translateAstra("messageActions.extra.group.native");
	const deleteMessageLabel = translateAstra(
		"messageActions.extra.action.deleteMessage.label",
	);
	const deleteMessageSingleSwipeLabel = translateAstra(
		"messageActions.extra.action.deleteMessage.singleSwipeLabel",
	);
	const deleteSwipeLabel = translateAstra(
		"messageActions.extra.action.deleteSwipe.label",
	);
	const emptyNativeActions = translateAstra("messageActions.extra.empty");
	const hasMultipleSwipes =
		typeof target?.swipeTotal === "number" && target.swipeTotal > 1;
	const resolvedDeleteMessageLabel = hasMultipleSwipes
		? deleteMessageLabel
		: deleteMessageSingleSwipeLabel;
	const showDeleteSwipeAction =
		hasMultipleSwipes && Boolean(dangerActions?.deleteSwipe);
	const messagePreviewText =
		typeof target?.messagePreviewText === "string"
			? target.messagePreviewText.trim()
			: "";

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	return (
		<Drawer
			container={container}
			direction="bottom"
			onOpenChange={onOpenChange}
			open={open && Boolean(target)}
			repositionInputs={false}
		>
			<DrawerContent
				aria-describedby={EXTRA_ACTIONS_DRAWER_DESCRIPTION_ID}
				aria-labelledby={EXTRA_ACTIONS_DRAWER_TITLE_ID}
				className="astra-drawer-surface astra-messageExtraActionsDrawer"
				container={container}
				id={EXTRA_ACTIONS_DRAWER_ID}
				onOpenAutoFocus={handleOpenAutoFocus}
			>
				<DrawerHeader className="sr-only">
					<DrawerTitle asChild={true}>
						<div
							aria-hidden={true}
							className="astra-messageExtraActionsDrawer__primitiveA11yGuard sr-only"
						/>
					</DrawerTitle>
					<DrawerDescription asChild={true}>
						<div
							aria-hidden={true}
							className="astra-messageExtraActionsDrawer__primitiveA11yGuard sr-only"
						/>
					</DrawerDescription>
					<div
						id={EXTRA_ACTIONS_DRAWER_TITLE_ID}
						data-slot="drawer-title"
					>
						{title}
					</div>
					<div
						id={EXTRA_ACTIONS_DRAWER_DESCRIPTION_ID}
						data-slot="drawer-description"
					>
						{description}
					</div>
				</DrawerHeader>
				<div
					id={EXTRA_ACTIONS_DRAWER_HEADER_ID}
					className="astra-messageMoreActionsDrawer__header astra-messageExtraActionsDrawer__header"
				>
					<MessageActionsIdentityHeader target={target} />
				</div>
				<div
					id={EXTRA_ACTIONS_DRAWER_HEADING_ID}
					className={cn(
						"astra-messageExtraActionsDrawer__messageMeta",
						messagePreviewText
							? "astra-chat-library-dialog-meta"
							: "sr-only",
					)}
				>
					<div className="astra-messageExtraActionsDrawer__messagePreview">
						{messagePreviewText}
					</div>
				</div>
				<DrawerBody
					id={EXTRA_ACTIONS_DRAWER_BODY_ID}
					className="astra-messageExtraActionsDrawer__body"
					viewportProps={{
						id: EXTRA_ACTIONS_DRAWER_SCROLLABLE_CONTENT_ID,
						className:
							"astra-messageExtraActionsDrawer__scrollableContent",
					}}
					contentProps={{
						id: EXTRA_ACTIONS_DRAWER_CONTENT_ID,
						className: "astra-messageExtraActionsDrawer__content",
					}}
				>
					<Group label={dangerLabel}>
						{showDeleteSwipeAction ? (
							<ActionButton
								action={{
									disabled: isConfigActionDisabled(
										dangerActions?.deleteSwipe,
									),
									icon: Delete,
									id: "delete-swipe",
									label: deleteSwipeLabel,
									onClick: dangerActions?.deleteSwipe?.onClick,
									variant: "danger",
								}}
							/>
						) : null}
						<ActionButton
							action={{
								disabled: isConfigActionDisabled(
									dangerActions?.deleteMessage,
								),
								icon: MessageCircleX,
								id: "delete-message",
								label: resolvedDeleteMessageLabel,
								onClick: dangerActions?.deleteMessage?.onClick,
								variant: "danger",
							}}
						/>
					</Group>
					<Group label={nativeActionsLabel}>
						{nativeActions.length ? (
							nativeActions.map((action) => (
								<ActionButton
									key={action.id}
									action={{
										...action,
										variant: "native",
									}}
								/>
							))
						) : (
							<div className="astra-messageExtraActionsDrawer__empty">
								{emptyNativeActions}
							</div>
						)}
					</Group>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
