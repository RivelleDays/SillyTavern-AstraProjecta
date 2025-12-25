import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function SwipeControlButton({ label, onClick, icon, hidden = false }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className="astra-swipePager__button"
					onClick={onClick}
					data-hidden={hidden ? 'true' : 'false'}
					aria-label={label}
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
}

export function SwipeControlsBar({ total = 1, currentIndex = 0, onPrev, onNext }) {
	const safeTotal = Math.max(1, total)
	const clampedIndex = Math.min(safeTotal - 1, Math.max(0, currentIndex))
	const displayCurrent = clampedIndex + 1
	const hasMultiple = safeTotal > 1
	const hidePrev = !hasMultiple

	return (
		<TooltipProvider delayDuration={0}>
			<div className="astra-swipePager" data-hidden="false">
				<SwipeControlButton
					label="Swipe message left"
					onClick={onPrev}
					icon={<ChevronLeft size={16} strokeWidth={2.5} aria-hidden="true" />}
					hidden={hidePrev}
				/>
				<span className="astra-swipePager__counter" aria-live="polite" aria-atomic="true">
					{displayCurrent} / {safeTotal}
				</span>
				<SwipeControlButton
					label="Swipe message right"
					onClick={onNext}
					icon={<ChevronRight size={16} strokeWidth={2.5} aria-hidden="true" />}
					hidden={false}
				/>
			</div>
		</TooltipProvider>
	)
}
