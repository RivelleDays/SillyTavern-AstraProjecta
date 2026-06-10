import * as React from "react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/astra/drawer";
import { ScrollArea } from "@/components/ui/astra/scroll-area";
import { Separator } from "@/components/ui/shadcn/separator";
import { UiIcon } from "@/components/ui/shared/icon";
import { ProviderSvgIcon } from "@/components/ui/shared/provider-svg-icon";
import {
	Bot,
	CalendarClock,
	Clipboard,
	Eye,
	EyeOff,
	History,
	PencilLine,
	Plus,
	Timer,
} from "@/components/ui/shared/icons";
import type { LucideIcon } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import {
	isMessageExtraActionDisabled,
	MessageExtraActionIcon,
	type MessageExtraActionItem,
} from "@/packages/features/chat-session/message-actions/more-actions/MessageExtraActionItem";
import { MessageActionsIdentityHeader } from "@/packages/features/chat-session/message-actions/more-actions/MessageActionsIdentityHeader";

export interface MessageActionsTargetMetadata {
	bookmarkLink?: string;
	generationTime?: string;
	/** Optional cloned native timestamp icon; modelLabel may render without it. */
	modelIconHtml?: string;
	/** Optional provider/model icon key used when no native timestamp icon exists. */
	modelIconKey?: string;
	/** Compact model label resolved from chat metadata or native icon title. */
	modelLabel?: string;
	timestamp?: string;
	tokenCount?: string;
}

export interface MessageActionsTarget {
	avatarUrl: string;
	isSystem: boolean;
	isUser: boolean;
	messageDisplayId: string;
	messageId: number;
	metadata: MessageActionsTargetMetadata;
	messagePreviewText: string;
	renderedMessageHtml: string;
	senderName: string;
	swipeIndex: number;
	swipeTotal: number;
}

export interface MoreActionsDrawerActionConfig {
	disabled?: boolean;
	onClick?: () => void;
}

export interface MoreActionsDrawerPromptVisibilityActionConfig extends MoreActionsDrawerActionConfig {
	isExcluded: boolean;
}

export interface MoreActionsDrawerActionsConfig {
	copy?: MoreActionsDrawerActionConfig;
	edit?: MoreActionsDrawerActionConfig;
	history?: MoreActionsDrawerActionConfig;
	more?: MoreActionsDrawerActionConfig;
	promptVisibility?: MoreActionsDrawerPromptVisibilityActionConfig;
}

const MORE_ACTIONS_DRAWER_ID = "mobile-message-more-actions-drawer";
const MORE_ACTIONS_DRAWER_TITLE_ID = `${MORE_ACTIONS_DRAWER_ID}-title`;
const MORE_ACTIONS_DRAWER_DESCRIPTION_ID = `${MORE_ACTIONS_DRAWER_ID}-description`;
const MORE_ACTIONS_DRAWER_HEADER_ID = `${MORE_ACTIONS_DRAWER_ID}-header`;
const MORE_ACTIONS_DRAWER_HEADING_ID = `${MORE_ACTIONS_DRAWER_ID}-heading`;
const MORE_ACTIONS_DRAWER_BODY_ID = `${MORE_ACTIONS_DRAWER_ID}-body`;
const MORE_ACTIONS_DRAWER_SCROLLABLE_CONTENT_ID = `${MORE_ACTIONS_DRAWER_ID}-scrollable-content`;
const MORE_ACTIONS_DRAWER_CONTENT_ID = `${MORE_ACTIONS_DRAWER_ID}-content`;
const MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_ID = `${MORE_ACTIONS_DRAWER_ID}-extra-actions`;
const MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_VIEWPORT_ID = `${MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_ID}-viewport`;
const MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_CONTENT_ID = `${MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_ID}-content`;
const MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_SCROLLBAR_ID = `${MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_ID}-scrollbar`;
const MORE_ACTIONS_DRAWER_FOOTER_ID = `${MORE_ACTIONS_DRAWER_ID}-footer`;

function isFooterActionDisabled(
	action: MoreActionsDrawerActionConfig | undefined,
) {
	return action?.disabled === true || typeof action?.onClick !== "function";
}

function MoreActionsFooterButton({
	ariaLabel,
	disabled,
	icon,
	label,
	onClick,
}: {
	ariaLabel: string;
	disabled: boolean;
	icon: LucideIcon;
	label: string;
	onClick?: () => void;
}) {
	return (
		<button
			aria-label={ariaLabel}
			className="astra-messageMoreActionsDrawer__footerAction"
			disabled={disabled}
			title={ariaLabel}
			type="button"
			onClick={onClick}
		>
			<UiIcon
				aria-hidden={true}
				className="astra-messageMoreActionsDrawer__footerActionIcon"
				icon={icon}
				size="md"
			/>
			<span className="astra-messageMoreActionsDrawer__footerActionLabel">
				{label}
			</span>
		</button>
	);
}

function MoreActionsExtraActionButton({
	action,
}: {
	action: MessageExtraActionItem;
}) {
	const variant = action.variant ?? "native";

	return (
		<button
			aria-label={action.label}
			className={cn(
				"astra-messageMoreActionsDrawer__extraActionButton",
				variant === "danger"
					? "astra-messageMoreActionsDrawer__extraActionButton--danger"
					: "astra-messageMoreActionsDrawer__extraActionButton--native",
			)}
			disabled={isMessageExtraActionDisabled(action)}
			title={action.label}
			type="button"
			onClick={action.onClick}
		>
			<MessageExtraActionIcon action={action} />
		</button>
	);
}

function MoreActionsMetadataRow({
	children,
	icon,
	iconModifier,
	label,
	valueText,
}: {
	children: React.ReactNode;
	icon: LucideIcon;
	iconModifier: "sent" | "model" | "generation";
	label: string;
	valueText: string;
}) {
	return (
		<dl
			aria-label={`${label}: ${valueText}`}
			className="astra-messageMoreActionsDrawer__detailRow"
			title={`${label}: ${valueText}`}
		>
			<dt className="astra-messageMoreActionsDrawer__detailTerm">
				<UiIcon
					aria-hidden={true}
					className={`astra-messageMoreActionsDrawer__detailIcon astra-messageMoreActionsDrawer__detailIcon--${iconModifier}`}
					icon={icon}
					size="xs"
				/>
				<span>{label}</span>
			</dt>
			<dd className="astra-messageMoreActionsDrawer__detailDefinition">
				{children}
			</dd>
		</dl>
	);
}

function MoreActionsModelValue({
	modelIconHtml,
	modelIconKey,
	modelLabel,
}: {
	modelIconHtml: string;
	modelIconKey?: string;
	modelLabel: string;
}) {
	return (
		<span
			className="astra-messageMoreActionsDrawer__modelName"
			title={modelLabel}
		>
			{modelIconHtml ? (
				<span
					aria-hidden={true}
					className="astra-messageMoreActionsDrawer__modelIcon"
					dangerouslySetInnerHTML={{
						__html: modelIconHtml,
					}}
				/>
			) : (
				<ProviderSvgIcon
					className="astra-messageMoreActionsDrawer__modelIcon"
					iconKey={modelIconKey}
				/>
			)}
			<span className="astra-messageMoreActionsDrawer__modelLabel">
				{modelLabel}
			</span>
		</span>
	);
}

function MoreActionsGenerationValue({
	generationTime,
	generationTimeLabel,
}: {
	generationTime: string;
	generationTimeLabel: string;
}) {
	return (
		<span className="astra-messageMoreActionsDrawer__modelStats">
			<span
				aria-label={`${generationTimeLabel}: ${generationTime}`}
				className="astra-messageMoreActionsDrawer__modelStatsValue"
				title={`${generationTimeLabel}: ${generationTime}`}
			>
				{generationTime}
			</span>
		</span>
	);
}

function renderMoreActionsDetailRows(
	rows: Array<{ key: string; node: React.ReactElement }>,
) {
	return rows.map(({ key, node }, index) => (
		<React.Fragment key={key}>
			{index > 0 ? (
				<Separator className="astra-messageMoreActionsDrawer__detailSeparator" />
			) : null}
			{node}
		</React.Fragment>
	));
}

export function MoreActionsDrawer({
	actions,
	container,
	extraActions = [],
	onOpenChange,
	onExitComplete,
	open,
	target,
}: {
	actions?: MoreActionsDrawerActionsConfig;
	container?: HTMLElement | null;
	extraActions?: MessageExtraActionItem[];
	onExitComplete?: () => void;
	onOpenChange(nextValue: boolean): void;
	open: boolean;
	target: MessageActionsTarget | null;
}) {
	const title = translateAstra("messageActions.more.title");
	const description = translateAstra("messageActions.more.description");
	const extraActionsAriaLabel = translateAstra(
		"messageActions.more.extraActions.aria",
	);
	const copyLabel = translateAstra("messageActions.more.action.copy.label");
	const copyAriaLabel = translateAstra(
		"messageActions.more.action.copy.aria",
	);
	const editLabel = translateAstra("messageActions.more.action.edit.label");
	const editAriaLabel = translateAstra(
		"messageActions.more.action.edit.aria",
	);
	const excludeLabel = translateAstra(
		"messageActions.more.action.exclude.label",
	);
	const excludeAriaLabel = translateAstra(
		"messageActions.more.action.exclude.aria",
	);
	const historyLabel = translateAstra(
		"messageActions.more.action.history.label",
	);
	const historyAriaLabel = translateAstra(
		"messageActions.more.action.history.aria",
	);
	const includeLabel = translateAstra(
		"messageActions.more.action.include.label",
	);
	const includeAriaLabel = translateAstra(
		"messageActions.more.action.include.aria",
	);
	const moreAriaLabel = translateAstra(
		"messageActions.more.action.more.aria",
	);
	const sentLabel = translateAstra("messageActions.more.meta.sent");
	const modelMetaLabel = translateAstra("messageActions.more.meta.model");
	const generationTimeLabel = translateAstra(
		"messageActions.more.meta.generationTime",
	);
	const metadata = target?.metadata ?? {};
	const sentValue = metadata.timestamp?.trim() || "";
	const generationTime = metadata.generationTime?.trim() || "";
	const modelLabel = metadata.modelLabel?.trim() || "";
	const hasModelRowContent = Boolean(
		target && (sentValue || modelLabel || generationTime),
	);
	const detailRows: Array<{ key: string; node: React.ReactElement }> = [];

	if (sentValue) {
		detailRows.push({
			key: "sent",
			node: (
				<MoreActionsMetadataRow
					icon={CalendarClock}
					iconModifier="sent"
					label={sentLabel}
					valueText={sentValue}
				>
					{sentValue}
				</MoreActionsMetadataRow>
			),
		});
	}

	if (modelLabel) {
		detailRows.push({
			key: "model",
			node: (
				<MoreActionsMetadataRow
					icon={Bot}
					iconModifier="model"
					label={modelMetaLabel}
					valueText={modelLabel}
				>
					<MoreActionsModelValue
						modelIconHtml={metadata.modelIconHtml?.trim() || ""}
						modelIconKey={metadata.modelIconKey}
						modelLabel={modelLabel}
					/>
				</MoreActionsMetadataRow>
			),
		});
	}

	if (generationTime) {
		detailRows.push({
			key: "generation",
			node: (
				<MoreActionsMetadataRow
					icon={Timer}
					iconModifier="generation"
					label={generationTimeLabel}
					valueText={generationTime}
				>
					<MoreActionsGenerationValue
						generationTime={generationTime}
						generationTimeLabel={generationTimeLabel}
					/>
				</MoreActionsMetadataRow>
			),
		});
	}
	const isExcludedFromPrompts =
		actions?.promptVisibility?.isExcluded ?? target?.isSystem === true;
	const promptVisibilityLabel = isExcludedFromPrompts
		? includeLabel
		: excludeLabel;
	const promptVisibilityAriaLabel = isExcludedFromPrompts
		? includeAriaLabel
		: excludeAriaLabel;
	const promptVisibilityIcon = isExcludedFromPrompts ? EyeOff : Eye;

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	const heading = (
		<div
			id={MORE_ACTIONS_DRAWER_HEADING_ID}
			className={cn(
				"astra-messageMoreActionsDrawer__heading",
				hasModelRowContent
					? "astra-messageMoreActionsDrawer__detailSection astra-messageMoreActionsDrawer__modelDataRow"
					: "sr-only",
			)}
		>
			{renderMoreActionsDetailRows(detailRows)}
		</div>
	);

	return (
		<Drawer
			container={container}
			direction="bottom"
			onExitComplete={onExitComplete}
			onOpenChange={onOpenChange}
			open={open && Boolean(target)}
			repositionInputs={false}
		>
			<DrawerContent
				aria-describedby={MORE_ACTIONS_DRAWER_DESCRIPTION_ID}
				aria-labelledby={MORE_ACTIONS_DRAWER_TITLE_ID}
				className="astra-drawer-surface astra-messageMoreActionsDrawer"
				container={container}
				id={MORE_ACTIONS_DRAWER_ID}
				onOpenAutoFocus={handleOpenAutoFocus}
			>
				<DrawerHeader className="sr-only">
					<DrawerTitle asChild={true}>
						<div
							aria-hidden={true}
							className="astra-messageMoreActionsDrawer__primitiveA11yGuard sr-only"
						/>
					</DrawerTitle>
					<DrawerDescription asChild={true}>
						<div
							aria-hidden={true}
							className="astra-messageMoreActionsDrawer__primitiveA11yGuard sr-only"
						/>
					</DrawerDescription>
					<div
						id={MORE_ACTIONS_DRAWER_TITLE_ID}
						data-slot="drawer-title"
					>
						{title}
					</div>
					<div
						id={MORE_ACTIONS_DRAWER_DESCRIPTION_ID}
						data-slot="drawer-description"
					>
						{description}
					</div>
				</DrawerHeader>
				<div
					id={MORE_ACTIONS_DRAWER_HEADER_ID}
					className="astra-messageMoreActionsDrawer__header"
				>
					<MessageActionsIdentityHeader target={target} />
				</div>
				{heading}
				{extraActions.length ? (
					<ScrollArea.Root
						aria-label={extraActionsAriaLabel}
						className="astra-messageMoreActionsDrawer__extraActions"
						id={MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_ID}
					>
						<ScrollArea.Viewport
							className="astra-messageMoreActionsDrawer__extraActionsViewport"
							id={MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_VIEWPORT_ID}
						>
							<ScrollArea.Content
								className="astra-messageMoreActionsDrawer__extraActionsContent"
								id={
									MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_CONTENT_ID
								}
							>
								{extraActions.map((action) => (
									<MoreActionsExtraActionButton
										action={action}
										key={action.id}
									/>
								))}
							</ScrollArea.Content>
						</ScrollArea.Viewport>
						<ScrollArea.Scrollbar
							className="astra-messageMoreActionsDrawer__extraActionsScrollbar"
							id={MORE_ACTIONS_DRAWER_EXTRA_ACTIONS_SCROLLBAR_ID}
							keepMounted={true}
							orientation="horizontal"
						>
							<ScrollArea.Thumb />
						</ScrollArea.Scrollbar>
						<ScrollArea.Corner />
					</ScrollArea.Root>
				) : null}
				<DrawerBody
					id={MORE_ACTIONS_DRAWER_BODY_ID}
					className="astra-messageMoreActionsDrawer__body"
					viewportProps={{
						id: MORE_ACTIONS_DRAWER_SCROLLABLE_CONTENT_ID,
						className:
							"astra-messageMoreActionsDrawer__scrollableContent",
					}}
					contentProps={{
						id: MORE_ACTIONS_DRAWER_CONTENT_ID,
						className: "astra-messageMoreActionsDrawer__content",
					}}
				>
					<div
						className="astra-messageMoreActionsDrawer__messagePreview mes"
						data-astra-message-preview="true"
						dangerouslySetInnerHTML={{
							__html: target?.renderedMessageHtml ?? "",
						}}
					/>
				</DrawerBody>
				<div
					id={MORE_ACTIONS_DRAWER_FOOTER_ID}
					className="astra-messageMoreActionsDrawer__footer"
				>
					<MoreActionsFooterButton
						ariaLabel={copyAriaLabel}
						disabled={isFooterActionDisabled(actions?.copy)}
						icon={Clipboard}
						label={copyLabel}
						onClick={actions?.copy?.onClick}
					/>
					<MoreActionsFooterButton
						ariaLabel={promptVisibilityAriaLabel}
						disabled={isFooterActionDisabled(
							actions?.promptVisibility,
						)}
						icon={promptVisibilityIcon}
						label={promptVisibilityLabel}
						onClick={actions?.promptVisibility?.onClick}
					/>
					<button
						aria-label={moreAriaLabel}
						className="astra-messageMoreActionsDrawer__footerMoreAction"
						disabled={isFooterActionDisabled(actions?.more)}
						title={moreAriaLabel}
						type="button"
						onClick={actions?.more?.onClick}
					>
						<span className="astra-messageMoreActionsDrawer__footerMorePill">
							<UiIcon
								aria-hidden={true}
								className="astra-messageMoreActionsDrawer__footerMoreActionIcon"
								icon={Plus}
								size="md"
							/>
						</span>
					</button>
					<MoreActionsFooterButton
						ariaLabel={historyAriaLabel}
						disabled={isFooterActionDisabled(actions?.history)}
						icon={History}
						label={historyLabel}
						onClick={actions?.history?.onClick}
					/>
					<MoreActionsFooterButton
						ariaLabel={editAriaLabel}
						disabled={isFooterActionDisabled(actions?.edit)}
						icon={PencilLine}
						label={editLabel}
						onClick={actions?.edit?.onClick}
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
