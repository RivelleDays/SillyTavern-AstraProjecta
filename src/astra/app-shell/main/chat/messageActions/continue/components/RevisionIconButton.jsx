import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function RevisionIconButton({
	icon,
	label,
	onClick,
	disabled = false,
	variant = 'default',
	withProvider = false,
}) {
	const className =
		variant === 'compact' ? 'astra-messageActions__iconButton--compact' : 'astra-revisionButton'
	const content = (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className={className}
					aria-label={label}
					onClick={onClick}
					disabled={disabled}
				>
					{icon}
				</button>
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
