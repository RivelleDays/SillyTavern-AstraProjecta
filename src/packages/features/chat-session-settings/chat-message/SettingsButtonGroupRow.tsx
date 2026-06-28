import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { Label } from "@/components/ui/shadcn/label";
import { UiIcon } from "@/components/ui/shared/icon";
import type { LucideIcon } from "@/components/ui/shared/icons";

export interface SettingsButtonGroupOption<Value extends string> {
	/** Visible text label. Optional when an icon-only option is used. */
	label?: string;
	/** Icon for icon-only options. */
	icon?: LucideIcon;
	/** Required accessible name when the option renders icon-only. */
	ariaLabel?: string;
	value: Value;
}

export interface SettingsButtonGroupRowProps<Value extends string> {
	onValueChange(value: Value): void;
	options: ReadonlyArray<SettingsButtonGroupOption<Value>>;
	title: string;
	value: Value;
}

export function SettingsButtonGroupRow<Value extends string>({
	onValueChange,
	options,
	title,
	value,
}: SettingsButtonGroupRowProps<Value>) {
	const titleId = React.useId();

	return (
		<div className="chat-session-settings__button-row">
			<Label
				className="chat-session-settings__button-row-title"
				id={titleId}
			>
				{title}
			</Label>
			<div
				aria-labelledby={titleId}
				className="chat-session-settings__button-group"
				role="group"
			>
				{options.map((option) => {
					const isSelected = option.value === value;
					return (
						<Button
							key={option.value}
							aria-label={
								option.icon ? option.ariaLabel : undefined
							}
							aria-pressed={isSelected}
							className="chat-session-settings__button-group-item"
							size="sm"
							type="button"
							variant={isSelected ? "default" : "outline"}
							onClick={() => {
								onValueChange(option.value);
							}}
						>
							{option.icon ? (
								<UiIcon
									aria-hidden={true}
									icon={option.icon}
									size="sm"
								/>
							) : (
								option.label
							)}
						</Button>
					);
				})}
			</div>
		</div>
	);
}
