import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
} from "@/components/ui/shared/icons";
import { Label } from "@/components/ui/shadcn/label";
import { Switch } from "@/components/ui/shadcn/switch";
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

export interface ChatMessageSettingsTabProps {
	appearance: ChatMessageAppearanceInput;
	onAppearanceChange(nextAppearance: ChatMessageAppearanceInput): void;
}

export function ChatMessageSettingsTab({
	appearance,
	onAppearanceChange,
}: ChatMessageSettingsTabProps) {
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
