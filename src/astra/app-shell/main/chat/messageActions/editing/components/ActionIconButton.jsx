import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { isMobile } from '@/astra/mobile/utils/device.js'

export function ActionIconButton({
	icon,
	label,
	onClick,
	disabled = false,
	buttonClassName = 'astra-revisionButton',
	withProvider = true,
}) {
	const button = (
		<button
			type="button"
			className={buttonClassName}
			aria-label={label}
			onClick={onClick}
			disabled={disabled}
		>
			{icon}
		</button>
	)

	// Skip tooltips on mobile to avoid flicker/overlay jumps when tapping.
	if (isMobile()) {
		return button
	}

	const content = (
		<Tooltip>
			<TooltipTrigger asChild>
				{button}
			</TooltipTrigger>
			<TooltipContent
				side="top"
				sideOffset={6}
				showArrow
				className="astra-tooltip px-2 py-1 text-xs"
			>
				{label}
			</TooltipContent>
		</Tooltip>
	)

	if (withProvider) {
		return (
			<TooltipProvider delayDuration={0}>
				{content}
			</TooltipProvider>
		)
	}

	return content
}
