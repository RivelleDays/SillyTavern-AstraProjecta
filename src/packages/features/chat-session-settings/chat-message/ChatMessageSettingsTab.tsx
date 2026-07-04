import * as React from "react";

import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
	Ban,
	ChevronDown,
	PencilLine,
	Route,
} from "@/components/ui/shared/icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/astra/dropdown-menu";
import { Label } from "@/components/ui/shadcn/label";
import { Switch } from "@/components/ui/shadcn/switch";
import { buttonVariants } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import { SettingsButtonGroupRow } from "@/packages/features/chat-session-settings/chat-message/SettingsButtonGroupRow";
import {
	CHAT_SESSION_SETTINGS_DRAWER_TIMELINE_TOGGLE_ID,
	CHAT_SESSION_SETTINGS_DRAWER_TIMELINE_TOGGLE_SWITCH_ID,
} from "@/packages/features/chat-session-settings/contracts/dom";
import {
	type ChatMessageAppearanceInput,
	type ChatMessageLineHeight,
	type ChatMessageTextAlign,
} from "@/packages/core/st/chat-message-appearance";
import type {
	ChatMessageInteractionInput,
	ChatMessageLongPressAction,
} from "@/packages/core/st/chat-message-interaction";
import type { LucideIcon } from "@/components/ui/shared/icons";
import type { I18nKey } from "@/types/i18n";

export interface ChatMessageSettingsTabProps {
	appearance: ChatMessageAppearanceInput;
	interaction: ChatMessageInteractionInput;
	onAppearanceChange(nextAppearance: ChatMessageAppearanceInput): void;
	onInteractionChange(nextInteraction: ChatMessageInteractionInput): void;
}

export function ChatMessageSettingsTab({
	appearance,
	interaction,
	onAppearanceChange,
	onInteractionChange,
}: ChatMessageSettingsTabProps) {
	const longPressActionTitleId = React.useId();
	const longPressActionTitle = translateAstra(
		"chatSessionSettings.chatMessages.longPressAction.title",
	);
	const longPressActionOptions: Array<{
		icon: LucideIcon;
		labelKey: I18nKey;
		value: ChatMessageLongPressAction;
	}> = [
		{
			icon: Ban,
			labelKey:
				"chatSessionSettings.chatMessages.longPressAction.option.disabled",
			value: "disabled",
		},
		{
			icon: Route,
			labelKey:
				"chatSessionSettings.chatMessages.longPressAction.option.messageActions",
			value: "message-actions",
		},
		{
			icon: PencilLine,
			labelKey:
				"chatSessionSettings.chatMessages.longPressAction.option.editMessage",
			value: "edit-message",
		},
	];
	const activeLongPressAction =
		longPressActionOptions.find(
			(option) => option.value === interaction.longPressAction,
		) ?? longPressActionOptions[0];

	const lineHeightOptions = [
		{
			label: translateAstra(
				"chatSessionSettings.chatMessages.lineHeight.option.sm",
			),
			value: "sm" as ChatMessageLineHeight,
		},
		{
			label: translateAstra(
				"chatSessionSettings.chatMessages.lineHeight.option.md",
			),
			value: "md" as ChatMessageLineHeight,
		},
		{
			label: translateAstra(
				"chatSessionSettings.chatMessages.lineHeight.option.lg",
			),
			value: "lg" as ChatMessageLineHeight,
		},
	];

	const textAlignOptions = [
		{
			ariaLabel: translateAstra(
				"chatSessionSettings.chatMessages.textAlign.option.start",
			),
			icon: AlignLeft,
			value: "start" as ChatMessageTextAlign,
		},
		{
			ariaLabel: translateAstra(
				"chatSessionSettings.chatMessages.textAlign.option.center",
			),
			icon: AlignCenter,
			value: "center" as ChatMessageTextAlign,
		},
		{
			ariaLabel: translateAstra(
				"chatSessionSettings.chatMessages.textAlign.option.end",
			),
			icon: AlignRight,
			value: "end" as ChatMessageTextAlign,
		},
		{
			ariaLabel: translateAstra(
				"chatSessionSettings.chatMessages.textAlign.option.justify",
			),
			icon: AlignJustify,
			value: "justify" as ChatMessageTextAlign,
		},
	];

	return (
		<div className="chat-session-settings__chat-message-tab">
			<div className="chat-session-settings__dropdown-row">
				<Label
					className="chat-session-settings__dropdown-row-title"
					id={longPressActionTitleId}
				>
					{longPressActionTitle}
				</Label>
				<div className="chat-session-settings__dropdown-controls">
					<DropdownMenu>
						<DropdownMenuTrigger asChild={true}>
							<button
								aria-label={longPressActionTitle}
								className={cn(
									buttonVariants({
										variant: "outline",
									}),
									"chat-session-settings__dropdown-trigger",
								)}
								title={translateAstra(
									activeLongPressAction.labelKey,
								)}
								type="button"
							>
								<span className="chat-session-settings__dropdown-trigger-content">
									<UiIcon
										aria-hidden={true}
										data-icon="inline-start"
										icon={activeLongPressAction.icon}
										size="sm"
									/>
									<span className="chat-session-settings__dropdown-trigger-label">
										{translateAstra(
											activeLongPressAction.labelKey,
										)}
									</span>
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
							className="chat-session-settings__dropdown"
							side="top"
						>
							<DropdownMenuGroup>
								{longPressActionOptions.map((option) => (
									<DropdownMenuItem
										className={cn(
											"chat-session-settings__dropdown-item",
											option.value ===
												interaction.longPressAction &&
												"chat-session-settings__dropdown-item--active",
										)}
										key={option.value}
										onSelect={() => {
											onInteractionChange({
												...interaction,
												longPressAction: option.value,
											});
										}}
									>
										<UiIcon
											aria-hidden={true}
											icon={option.icon}
											size="sm"
										/>
										<span>
											{translateAstra(option.labelKey)}
										</span>
									</DropdownMenuItem>
								))}
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<SettingsButtonGroupRow
				options={lineHeightOptions}
				title={translateAstra(
					"chatSessionSettings.chatMessages.lineHeight.title",
				)}
				value={appearance.lineHeight}
				onValueChange={(lineHeight) => {
					onAppearanceChange({ ...appearance, lineHeight });
				}}
			/>
			<SettingsButtonGroupRow
				options={textAlignOptions}
				title={translateAstra(
					"chatSessionSettings.chatMessages.textAlign.title",
				)}
				value={appearance.textAlign}
				onValueChange={(textAlign) => {
					onAppearanceChange({ ...appearance, textAlign });
				}}
			/>
			<div
				className="chat-session-settings__toggle-row"
				id={CHAT_SESSION_SETTINGS_DRAWER_TIMELINE_TOGGLE_ID}
			>
				<div className="chat-session-settings__toggle-row-header">
					<Label
						className="chat-session-settings__toggle-row-title"
						htmlFor={
							CHAT_SESSION_SETTINGS_DRAWER_TIMELINE_TOGGLE_SWITCH_ID
						}
					>
						{translateAstra(
							"chatSessionSettings.chatMessages.timeline.label",
						)}
					</Label>
					<Switch
						checked={appearance.showTimeline}
						id={
							CHAT_SESSION_SETTINGS_DRAWER_TIMELINE_TOGGLE_SWITCH_ID
						}
						size="default"
						type="button"
						onCheckedChange={(showTimeline) => {
							onAppearanceChange({
								...appearance,
								showTimeline,
							});
						}}
					/>
				</div>
			</div>
		</div>
	);
}
