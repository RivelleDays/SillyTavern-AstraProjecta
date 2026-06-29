import * as React from "react";

export interface SettingsSectionGroupProps {
	children: React.ReactNode;
	label: string;
}

export function SettingsSectionGroup({
	children,
	label,
}: SettingsSectionGroupProps) {
	const titleId = React.useId();

	return (
		<section
			aria-labelledby={titleId}
			className="chat-session-settings__section"
		>
			<h3 id={titleId} className="chat-session-settings__section-title">
				{label}
			</h3>
			<div className="chat-session-settings__section-card">
				{children}
			</div>
		</section>
	);
}
