import { UiIcon } from "@/components/ui/shared/icon";
import type { LucideIcon } from "@/components/ui/shared/icons";

export interface SettingsSectionMarkerProps {
	icon?: LucideIcon;
	label: string;
}

/**
 * Section divider styled after shadcn's "separator" Marker, with the left line
 * omitted: optional icon and label, then a line filling the remaining width.
 */
export function SettingsSectionMarker({
	icon: Icon,
	label,
}: SettingsSectionMarkerProps) {
	return (
		<div className="chat-session-settings__section-marker">
			{Icon ? (
				<span
					aria-hidden={true}
					className="chat-session-settings__section-marker-icon"
				>
					<UiIcon aria-hidden={true} icon={Icon} size="xs" />
				</span>
			) : null}
			<span className="chat-session-settings__section-marker-label">
				{label}
			</span>
			<span
				aria-hidden={true}
				className="chat-session-settings__section-marker-line"
			/>
		</div>
	);
}
