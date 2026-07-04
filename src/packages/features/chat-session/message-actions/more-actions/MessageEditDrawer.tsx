import * as React from "react";

import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/astra/drawer";
import { Button } from "@/components/ui/shadcn/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/shadcn/field";
import { Textarea } from "@/components/ui/shadcn/textarea";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	ChevronDown,
	ChevronUp,
	Copy,
	Delete,
	LayersMinus,
	LayersPlus,
	MessageCircleX,
	PencilLine,
} from "@/components/ui/shared/icons";
import type { LucideIcon } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import { MessageActionsIdentityHeader } from "@/packages/features/chat-session/message-actions/more-actions/MessageActionsIdentityHeader";
import type { MessageActionsTarget } from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";

export interface MessageEditDrawerDraft {
	canCopy: boolean;
	canMoveDown: boolean;
	canMoveUp: boolean;
	hasReasoning: boolean;
	messageId: number;
	messageText: string;
	reasoningText: string;
}

export interface MessageEditDrawerSubmitDraft {
	hasReasoning: boolean;
	messageId: number;
	messageText: string;
	reasoningText: string;
}

export interface MessageEditDrawerActionConfig {
	disabled?: boolean;
	onClick?: (draft: MessageEditDrawerSubmitDraft) => void | Promise<void>;
}

export interface MessageEditDrawerAddReasoningActionConfig {
	disabled?: boolean;
}

export interface MessageEditDrawerActionsConfig {
	addReasoning?: MessageEditDrawerAddReasoningActionConfig;
	copy?: MessageEditDrawerActionConfig;
	deleteMessage?: MessageEditDrawerActionConfig;
	deleteSwipe?: MessageEditDrawerActionConfig;
	moveDown?: MessageEditDrawerActionConfig;
	moveUp?: MessageEditDrawerActionConfig;
}

const EDIT_DRAWER_ID = "astra-message-edit-drawer";
const EDIT_DRAWER_TITLE_ID = `${EDIT_DRAWER_ID}-title`;
const EDIT_DRAWER_DESCRIPTION_ID = `${EDIT_DRAWER_ID}-description`;
const EDIT_DRAWER_HEADER_ID = `${EDIT_DRAWER_ID}-header`;
const EDIT_DRAWER_BODY_ID = `${EDIT_DRAWER_ID}-body`;
const EDIT_DRAWER_SCROLLABLE_CONTENT_ID = `${EDIT_DRAWER_ID}-scrollable-content`;
const EDIT_DRAWER_CONTENT_ID = `${EDIT_DRAWER_ID}-content`;
const EDIT_DRAWER_EXTRA_ACTIONS_ID = `${EDIT_DRAWER_ID}-extra-actions`;
const EDIT_DRAWER_EXTRA_ACTIONS_CONTENT_ID = `${EDIT_DRAWER_EXTRA_ACTIONS_ID}-content`;
const EDIT_DRAWER_EXTRA_ACTIONS_START_ID = `${EDIT_DRAWER_EXTRA_ACTIONS_ID}-start`;
const EDIT_DRAWER_EXTRA_ACTIONS_END_ID = `${EDIT_DRAWER_EXTRA_ACTIONS_ID}-end`;
const EDIT_DRAWER_FOOTER_ID = `${EDIT_DRAWER_ID}-footer`;
const EDIT_DRAWER_REASONING_TEXTAREA_ID = `${EDIT_DRAWER_ID}-reasoning-textarea`;
const EDIT_DRAWER_MESSAGE_TEXTAREA_ID = `${EDIT_DRAWER_ID}-message-textarea`;

function isConfigActionDisabled(
	action: MessageEditDrawerActionConfig | undefined,
) {
	return action?.disabled === true || typeof action?.onClick !== "function";
}

function MessageEditExtraActionButton({
	ariaPressed,
	disabled,
	icon,
	label,
	onClick,
	pendingDisabled = false,
	variant,
}: {
	ariaPressed?: boolean;
	disabled: boolean;
	icon: LucideIcon;
	label: string;
	onClick?: () => void;
	pendingDisabled?: boolean;
	variant: "danger" | "native";
}) {
	const isPendingDisabled = disabled && pendingDisabled;

	return (
		<button
			aria-label={label}
			aria-pressed={ariaPressed}
			className={cn(
				"astra-messageEditDrawer__extraActionButton",
				variant === "danger"
					? "astra-messageEditDrawer__extraActionButton--danger"
					: "astra-messageEditDrawer__extraActionButton--native",
				isPendingDisabled
					? "astra-messageEditDrawer__extraActionButton--pendingDisabled"
					: null,
			)}
			data-astra-pending-disabled={isPendingDisabled ? "true" : undefined}
			disabled={disabled}
			title={label}
			type="button"
			onClick={onClick}
		>
			<UiIcon
				aria-hidden={true}
				className="astra-messageEditDrawer__extraActionIcon"
				icon={icon}
				size="sm"
			/>
		</button>
	);
}

export function MessageEditDrawer({
	actions,
	container,
	draft,
	isMutationPending = false,
	onConfirm,
	onOpenChange,
	open,
	target,
}: {
	actions?: MessageEditDrawerActionsConfig;
	container?: HTMLElement | null;
	draft: MessageEditDrawerDraft | null;
	isMutationPending?: boolean;
	onConfirm(draft: MessageEditDrawerSubmitDraft): void | Promise<void>;
	onOpenChange(nextValue: boolean): void;
	open: boolean;
	target: MessageActionsTarget | null;
}) {
	const [hasReasoning, setHasReasoning] = React.useState(false);
	const [messageText, setMessageText] = React.useState("");
	const [reasoningText, setReasoningText] = React.useState("");
	const title = translateAstra("messageActions.edit.title");
	const description = translateAstra("messageActions.edit.description");
	const extraActionsAriaLabel = translateAstra(
		"messageActions.edit.extraActions.aria",
	);
	const addReasoningLabel = translateAstra(
		"messageActions.edit.action.addReasoning",
	);
	const hideReasoningLabel = translateAstra(
		"messageActions.edit.action.hideReasoning",
	);
	const copyLabel = translateAstra("messageActions.edit.action.copy");
	const deleteMessageLabel = translateAstra(
		"messageActions.extra.action.deleteMessage.label",
	);
	const deleteMessageSingleSwipeLabel = translateAstra(
		"messageActions.extra.action.deleteMessage.singleSwipeLabel",
	);
	const deleteSwipeLabel = translateAstra(
		"messageActions.extra.action.deleteSwipe.label",
	);
	const messageLabel = translateAstra(
		"messageActions.edit.field.message.label",
	);
	const messagePlaceholder = translateAstra(
		"messageActions.edit.field.message.placeholder",
	);
	const moveDownLabel = translateAstra("messageActions.edit.action.moveDown");
	const moveUpLabel = translateAstra("messageActions.edit.action.moveUp");
	const reasoningLabel = translateAstra(
		"messageActions.edit.field.reasoning.label",
	);
	const reasoningPlaceholder = translateAstra(
		"messageActions.edit.field.reasoning.placeholder",
	);
	const cancelLabel = translateAstra("messageActions.edit.cancel");
	const confirmLabel = translateAstra("messageActions.edit.confirm");
	const hasMultipleSwipes =
		typeof target?.swipeTotal === "number" && target.swipeTotal > 1;
	const resolvedDeleteMessageLabel = hasMultipleSwipes
		? deleteMessageLabel
		: deleteMessageSingleSwipeLabel;
	const canRender = open && Boolean(target) && Boolean(draft);
	const isDeleteSwipeDisabled = isConfigActionDisabled(actions?.deleteSwipe);
	const isDeleteMessageDisabled = isConfigActionDisabled(
		actions?.deleteMessage,
	);
	const isCopyDisabled =
		!draft?.canCopy || isConfigActionDisabled(actions?.copy);
	const isMoveUpDisabled =
		!draft?.canMoveUp || isConfigActionDisabled(actions?.moveUp);
	const isMoveDownDisabled =
		!draft?.canMoveDown || isConfigActionDisabled(actions?.moveDown);

	React.useLayoutEffect(() => {
		setHasReasoning(draft?.hasReasoning === true);
		setMessageText(draft?.messageText ?? "");
		setReasoningText(draft?.reasoningText ?? "");
	}, [
		draft?.hasReasoning,
		draft?.messageId,
		draft?.messageText,
		draft?.reasoningText,
		open,
	]);

	const readSubmitDraft =
		React.useCallback((): MessageEditDrawerSubmitDraft | null => {
			if (!draft) {
				return null;
			}

			return {
				hasReasoning,
				messageId: draft.messageId,
				messageText,
				reasoningText,
			};
		}, [draft, hasReasoning, messageText, reasoningText]);

	const hasEffectiveDraftChanges = React.useMemo(() => {
		if (!draft) {
			return false;
		}

		if (messageText !== draft.messageText) {
			return true;
		}

		if (hasReasoning !== draft.hasReasoning) {
			return draft.hasReasoning || reasoningText.trim().length > 0;
		}

		if (draft.hasReasoning) {
			return reasoningText !== draft.reasoningText;
		}

		return hasReasoning && reasoningText.trim().length > 0;
	}, [draft, hasReasoning, messageText, reasoningText]);

	const runDraftAction = React.useCallback(
		(action: MessageEditDrawerActionConfig | undefined) => {
			const submitDraft = readSubmitDraft();
			if (
				isMutationPending ||
				!submitDraft ||
				isConfigActionDisabled(action)
			) {
				return;
			}

			void action?.onClick?.(submitDraft);
		},
		[isMutationPending, readSubmitDraft],
	);

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	return (
		<Drawer
			container={container}
			direction="bottom"
			onOpenChange={onOpenChange}
			open={canRender}
			repositionInputs={false}
		>
			<DrawerContent
				aria-describedby={EDIT_DRAWER_DESCRIPTION_ID}
				aria-labelledby={EDIT_DRAWER_TITLE_ID}
				className="astra-drawer-surface astra-messageEditDrawer"
				container={container}
				id={EDIT_DRAWER_ID}
				onOpenAutoFocus={handleOpenAutoFocus}
			>
				<DrawerHeader className="sr-only">
					<DrawerTitle asChild={true}>
						<div
							aria-hidden={true}
							className="astra-messageEditDrawer__primitiveA11yGuard sr-only"
						/>
					</DrawerTitle>
					<DrawerDescription asChild={true}>
						<div
							aria-hidden={true}
							className="astra-messageEditDrawer__primitiveA11yGuard sr-only"
						/>
					</DrawerDescription>
					<div id={EDIT_DRAWER_TITLE_ID} data-slot="drawer-title">
						{title}
					</div>
					<div
						id={EDIT_DRAWER_DESCRIPTION_ID}
						data-slot="drawer-description"
					>
						{description}
					</div>
				</DrawerHeader>
				<div
					id={EDIT_DRAWER_HEADER_ID}
					className="astra-messageMoreActionsDrawer__header astra-messageEditDrawer__header"
				>
					<MessageActionsIdentityHeader target={target} />
				</div>
				<div
					aria-label={extraActionsAriaLabel}
					className="astra-messageEditDrawer__extraActions"
					id={EDIT_DRAWER_EXTRA_ACTIONS_ID}
				>
					<div
						className="astra-messageEditDrawer__extraActionsContent"
						id={EDIT_DRAWER_EXTRA_ACTIONS_CONTENT_ID}
					>
						<div
							className="astra-messageEditDrawer__extraActionsGroup astra-messageEditDrawer__extraActionsGroup--start"
							id={EDIT_DRAWER_EXTRA_ACTIONS_START_ID}
						>
							{hasMultipleSwipes ? (
								<MessageEditExtraActionButton
									disabled={
										isMutationPending ||
										isDeleteSwipeDisabled
									}
									icon={Delete}
									label={deleteSwipeLabel}
									onClick={() => {
										runDraftAction(actions?.deleteSwipe);
									}}
									pendingDisabled={
										isMutationPending &&
										!isDeleteSwipeDisabled
									}
									variant="danger"
								/>
							) : null}
							<MessageEditExtraActionButton
								disabled={
									isMutationPending || isDeleteMessageDisabled
								}
								icon={MessageCircleX}
								label={resolvedDeleteMessageLabel}
								onClick={() => {
									runDraftAction(actions?.deleteMessage);
								}}
								pendingDisabled={
									isMutationPending &&
									!isDeleteMessageDisabled
								}
								variant="danger"
							/>
							<MessageEditExtraActionButton
								disabled={isMutationPending || isCopyDisabled}
								icon={Copy}
								label={copyLabel}
								onClick={() => {
									runDraftAction(actions?.copy);
								}}
								pendingDisabled={
									isMutationPending && !isCopyDisabled
								}
								variant="native"
							/>
							<MessageEditExtraActionButton
								ariaPressed={hasReasoning}
								disabled={
									actions?.addReasoning?.disabled === true
								}
								icon={hasReasoning ? LayersMinus : LayersPlus}
								label={
									hasReasoning
										? hideReasoningLabel
										: addReasoningLabel
								}
								onClick={() => {
									if (
										actions?.addReasoning?.disabled === true
									) {
										return;
									}
									setHasReasoning(
										(currentValue) => !currentValue,
									);
								}}
								variant="native"
							/>
						</div>
						<div
							className="astra-messageEditDrawer__extraActionsGroup astra-messageEditDrawer__extraActionsGroup--end"
							id={EDIT_DRAWER_EXTRA_ACTIONS_END_ID}
						>
							<MessageEditExtraActionButton
								disabled={isMutationPending || isMoveUpDisabled}
								icon={ChevronUp}
								label={moveUpLabel}
								onClick={() => {
									runDraftAction(actions?.moveUp);
								}}
								pendingDisabled={
									isMutationPending && !isMoveUpDisabled
								}
								variant="native"
							/>
							<MessageEditExtraActionButton
								disabled={
									isMutationPending || isMoveDownDisabled
								}
								icon={ChevronDown}
								label={moveDownLabel}
								onClick={() => {
									runDraftAction(actions?.moveDown);
								}}
								pendingDisabled={
									isMutationPending && !isMoveDownDisabled
								}
								variant="native"
							/>
						</div>
					</div>
				</div>
				<DrawerBody
					id={EDIT_DRAWER_BODY_ID}
					className="astra-messageEditDrawer__body"
					viewportProps={{
						id: EDIT_DRAWER_SCROLLABLE_CONTENT_ID,
						className: "astra-messageEditDrawer__scrollableContent",
					}}
					contentProps={{
						id: EDIT_DRAWER_CONTENT_ID,
						className: "astra-messageEditDrawer__content",
					}}
				>
					<FieldGroup className="astra-messageEditDrawer__fieldGroup">
						{hasReasoning ? (
							<Field className="astra-messageEditDrawer__field">
								<FieldLabel
									htmlFor={EDIT_DRAWER_REASONING_TEXTAREA_ID}
								>
									{reasoningLabel}
								</FieldLabel>
								<Textarea
									className="astra-messageEditDrawer__textarea astra-messageEditDrawer__textarea--reasoning"
									id={EDIT_DRAWER_REASONING_TEXTAREA_ID}
									placeholder={reasoningPlaceholder}
									value={reasoningText}
									onChange={(event) => {
										setReasoningText(event.target.value);
									}}
								/>
							</Field>
						) : null}
						<Field className="astra-messageEditDrawer__field">
							<FieldLabel
								htmlFor={EDIT_DRAWER_MESSAGE_TEXTAREA_ID}
							>
								{messageLabel}
							</FieldLabel>
							<Textarea
								className="astra-messageEditDrawer__textarea astra-messageEditDrawer__textarea--message"
								id={EDIT_DRAWER_MESSAGE_TEXTAREA_ID}
								placeholder={messagePlaceholder}
								value={messageText}
								onChange={(event) => {
									setMessageText(event.target.value);
								}}
							/>
						</Field>
					</FieldGroup>
				</DrawerBody>
				<div
					id={EDIT_DRAWER_FOOTER_ID}
					className="astra-dialog-footer astra-messageEditDrawer__footer"
				>
					<DrawerClose asChild={true}>
						<Button
							className="astra-messageEditDrawer__footerAction astra-messageEditDrawer__footerAction--cancel"
							type="button"
							variant="ghost"
						>
							{cancelLabel}
						</Button>
					</DrawerClose>
					<Button
						className="astra-messageEditDrawer__footerAction astra-messageEditDrawer__footerAction--confirm"
						disabled={
							isMutationPending ||
							!draft ||
							!hasEffectiveDraftChanges
						}
						type="button"
						variant="default"
						onClick={() => {
							const submitDraft = readSubmitDraft();
							if (
								isMutationPending ||
								!submitDraft ||
								!hasEffectiveDraftChanges
							) {
								return;
							}

							void onConfirm(submitDraft);
						}}
					>
						<UiIcon
							aria-hidden={true}
							icon={PencilLine}
							size="sm"
						/>
						{confirmLabel}
					</Button>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
