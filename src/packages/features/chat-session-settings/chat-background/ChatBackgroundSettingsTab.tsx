import { SettingsSliderRow } from "@/packages/features/chat-session-settings/chat-background/SettingsSliderRow";
import { translateAstra } from "@/packages/core/i18n";
import {
	CHAT_BACKGROUND_BLUR_DEFAULT_PX,
	CHAT_BACKGROUND_BLUR_MAX_PX,
	CHAT_BACKGROUND_BLUR_MIN_PX,
	CHAT_BACKGROUND_BLUR_STEP_PX,
	CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT,
	CHAT_BACKGROUND_OPACITY_MAX_PERCENT,
	CHAT_BACKGROUND_OPACITY_MIN_PERCENT,
	CHAT_BACKGROUND_OPACITY_STEP_PERCENT,
	type ChatBackgroundAppearanceInput,
} from "@/packages/core/st/chat-background-appearance";

export interface ChatBackgroundSettingsTabProps {
	appearance: ChatBackgroundAppearanceInput;
	onAppearanceChange(nextAppearance: ChatBackgroundAppearanceInput): void;
}

export function ChatBackgroundSettingsTab({
	appearance,
	onAppearanceChange,
}: ChatBackgroundSettingsTabProps) {
	return (
		<div className="chat-session-settings__chat-background-tab">
			<SettingsSliderRow
				defaultValue={CHAT_BACKGROUND_BLUR_DEFAULT_PX}
				description={translateAstra(
					"chatSessionSettings.chatBackground.blur.description",
				)}
				max={CHAT_BACKGROUND_BLUR_MAX_PX}
				min={CHAT_BACKGROUND_BLUR_MIN_PX}
				resetLabel={translateAstra(
					"chatSessionSettings.chatBackground.blur.reset",
				)}
				step={CHAT_BACKGROUND_BLUR_STEP_PX}
				title={translateAstra("chatSessionSettings.chatBackground.blur.title")}
				value={appearance.blurPx}
				onValueChange={(blurPx) => {
					onAppearanceChange({ ...appearance, blurPx });
				}}
			/>
			<SettingsSliderRow
				defaultValue={CHAT_BACKGROUND_OPACITY_DEFAULT_PERCENT}
				description={translateAstra(
					"chatSessionSettings.chatBackground.opacity.description",
				)}
				max={CHAT_BACKGROUND_OPACITY_MAX_PERCENT}
				min={CHAT_BACKGROUND_OPACITY_MIN_PERCENT}
				resetLabel={translateAstra(
					"chatSessionSettings.chatBackground.opacity.reset",
				)}
				step={CHAT_BACKGROUND_OPACITY_STEP_PERCENT}
				title={translateAstra(
					"chatSessionSettings.chatBackground.opacity.title",
				)}
				value={appearance.opacityPercent}
				onValueChange={(opacityPercent) => {
					onAppearanceChange({ ...appearance, opacityPercent });
				}}
			/>
		</div>
	);
}
