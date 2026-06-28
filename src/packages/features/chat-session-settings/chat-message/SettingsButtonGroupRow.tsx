import * as React from "react";

import { Label } from "@/components/ui/shadcn/label";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@/components/ui/shadcn/toggle-group";
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
			<ToggleGroup
				aria-labelledby={titleId}
				className="chat-session-settings__button-group"
				size="sm"
				type="single"
				value={value}
				variant="outline"
				onValueChange={(next) => {
					// Radix emits "" when the active item is toggled off; this is a
					// single-select control, so keep the current selection instead.
					if (next) {
						onValueChange(next as Value);
					}
				}}
			>
				{options.map((option) => (
					<ToggleGroupItem
						key={option.value}
						aria-label={option.icon ? option.ariaLabel : undefined}
						className="chat-session-settings__button-group-item"
						value={option.value}
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
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	);
}
