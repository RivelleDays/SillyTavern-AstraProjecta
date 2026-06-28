export interface SettingsSectionMarkerProps {
	label: string;
}

/**
 * Section divider styled after shadcn's "separator" Marker, with the left line
 * omitted: label first, then a line filling the remaining width on the right.
 */
export function SettingsSectionMarker({ label }: SettingsSectionMarkerProps) {
	return (
		<div className="chat-session-settings__section-marker">
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
