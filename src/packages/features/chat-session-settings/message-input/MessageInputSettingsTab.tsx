import { Label } from "@/components/ui/shadcn/label";
import { Switch } from "@/components/ui/shadcn/switch";
import { translateAstra } from "@/packages/core/i18n";
import {
	CHAT_SESSION_SETTINGS_DRAWER_SHORTCUTS_TOGGLE_ID,
	CHAT_SESSION_SETTINGS_DRAWER_SHORTCUTS_TOGGLE_SWITCH_ID,
} from "@/packages/features/chat-session-settings/contracts/dom";

export interface MessageInputSettingsTabProps {
	onShowShortcutsToolbarChange(nextValue: boolean): void;
	showShortcutsToolbar: boolean;
}

export function MessageInputSettingsTab({
	onShowShortcutsToolbarChange,
	showShortcutsToolbar,
}: MessageInputSettingsTabProps) {
	return (
		<div className="chat-session-settings__message-input-tab">
			<div
				className="chat-session-settings__toggle-row"
				id={CHAT_SESSION_SETTINGS_DRAWER_SHORTCUTS_TOGGLE_ID}
			>
				<Label
					className="chat-session-settings__toggle-row-title"
					htmlFor={
						CHAT_SESSION_SETTINGS_DRAWER_SHORTCUTS_TOGGLE_SWITCH_ID
					}
				>
					{translateAstra(
						"chatSessionSettings.messageInput.shortcuts.label",
					)}
				</Label>
				<Switch
					checked={showShortcutsToolbar}
					id={CHAT_SESSION_SETTINGS_DRAWER_SHORTCUTS_TOGGLE_SWITCH_ID}
					size="default"
					type="button"
					onCheckedChange={onShowShortcutsToolbarChange}
				/>
			</div>
		</div>
	);
}
