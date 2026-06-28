import * as React from "react";

import { useSliderWithInput } from "@/hooks/use-slider-with-input";
import { buttonVariants } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Slider } from "@/components/ui/shadcn/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/shadcn/tooltip";
import { UiIcon } from "@/components/ui/shared/icon";
import { RotateCcw } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";

export interface SettingsSliderRowProps {
	defaultValue: number;
	max: number;
	min: number;
	onValueChange(value: number): void;
	resetLabel: string;
	step: number;
	title: string;
	value: number;
}

export function SettingsSliderRow({
	defaultValue,
	max,
	min,
	onValueChange,
	resetLabel,
	step,
	title,
	value,
}: SettingsSliderRowProps) {
	const slider = useSliderWithInput({
		defaultValue,
		max,
		min,
		onValueChange,
		value,
	});
	const isDefault = value === defaultValue;
	const titleId = React.useId();

	return (
		<div className="chat-session-settings__slider-row">
			<div className="chat-session-settings__slider-row-header">
				<Label
					className="chat-session-settings__slider-row-title"
					htmlFor={titleId}
				>
					{title}
				</Label>
				<div className="chat-session-settings__slider-row-value">
					<TooltipProvider delayDuration={0}>
						<Tooltip>
							<TooltipTrigger asChild={true}>
								<button
									aria-label={resetLabel}
									className={cn(
										buttonVariants({
											size: "icon-xs",
											variant: "ghost",
										}),
										"chat-session-settings__slider-row-reset",
									)}
									data-size="icon-xs"
									data-slot="button"
									data-variant="ghost"
									disabled={isDefault}
									type="button"
									onClick={slider.resetToDefault}
								>
									<UiIcon
										aria-hidden={true}
										icon={RotateCcw}
										size="xs"
									/>
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">
								{resetLabel}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<Input
						className="chat-session-settings__slider-row-input"
						id={titleId}
						inputMode="numeric"
						value={slider.inputValue}
						onBlur={slider.handleInputBlur}
						onChange={(event) =>
							slider.handleInputChange(event.target.value)
						}
						onKeyDown={slider.handleInputKeyDown}
					/>
				</div>
			</div>
			<div className="chat-session-settings__slider-row-controls">
				<Slider
					aria-label={title}
					className="chat-session-settings__slider"
					max={max}
					min={min}
					step={step}
					value={slider.sliderValue}
					onValueChange={slider.handleSliderChange}
				/>
			</div>
		</div>
	);
}
