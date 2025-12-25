import React, { useMemo, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/astra/shared/ui/dropdownMenu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckIcon, LayoutTemplate } from 'lucide-react'
import {
	HOME_CARD_LAYOUT_OPTIONS,
	getHomeCardLayoutState,
	setHomeCardLayout,
	subscribeHomeCardLayoutStore,
} from '../state/homeCardLayoutStore.js'

function useHomeCardLayoutState() {
	return useSyncExternalStore(
		subscribeHomeCardLayoutStore,
		() => getHomeCardLayoutState(),
		() => getHomeCardLayoutState(),
	)
}

export function HomeCardLayoutControl() {
	const { layoutId } = useHomeCardLayoutState()
	const selected = useMemo(() => {
		return HOME_CARD_LAYOUT_OPTIONS.find(option => option.id === layoutId) ?? HOME_CARD_LAYOUT_OPTIONS[0]
	}, [layoutId])

	return (
		<TooltipProvider delayDuration={0}>
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="astra-home-layoutButton"
								aria-label="Choose card layout"
							>
								<LayoutTemplate size={16} strokeWidth={1.5} aria-hidden="true" />
							</Button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent
						side="bottom"
						sideOffset={8}
						showArrow
						className="astra-tooltip dark px-2 py-1 text-xs"
					>
						{selected ? `Card layout: ${selected.label}` : 'Choose card layout'}
					</TooltipContent>
				</Tooltip>
				<DropdownMenuContent
					align="start"
					side="bottom"
					sideOffset={10}
					className="astra-dropdown-menu astra-home-layoutDropdown"
				>
					{HOME_CARD_LAYOUT_OPTIONS.map(option => {
						const isSelected = option.id === layoutId
						return (
							<DropdownMenuItem
								key={option.id}
								className="astra-dropdown-option astra-home-layoutChoice"
								onSelect={event => {
									event.preventDefault()
									setHomeCardLayout(option.id)
								}}
							>
								<span className="astra-home-layoutChoice__content">
									<span className="astra-home-layoutChoice__label">{option.label}</span>
									{option.description ? (
										<span className="astra-home-layoutChoice__description">{option.description}</span>
									) : null}
								</span>
								{isSelected ? (
									<CheckIcon
										className="astra-dropdown-option__check astra-home-layoutChoice__check"
										size={16}
										aria-hidden="true"
									/>
								) : null}
							</DropdownMenuItem>
						)
					})}
				</DropdownMenuContent>
			</DropdownMenu>
		</TooltipProvider>
	)
}

