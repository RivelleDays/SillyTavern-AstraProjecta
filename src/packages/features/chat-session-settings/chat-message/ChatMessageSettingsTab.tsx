import {
	AlignCenter,
	AlignJustify,
	AlignLeft,
	AlignRight,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import { SettingsButtonGroupRow } from "@/packages/features/chat-session-settings/chat-message/SettingsButtonGroupRow";
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
		</div>
	);
}
