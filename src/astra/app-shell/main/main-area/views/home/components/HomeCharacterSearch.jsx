import React, {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/astra/shared/ui/dropdownMenu'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import {
	Braces,
	Calendar,
	CheckIcon,
	ChevronDownIcon,
	History,
	MessagesSquare,
	Search,
	Shuffle,
	Star,
	Type,
	X,
} from 'lucide-react'
import {
	HOME_CHARACTER_SORT_CHOICES,
	getHomeCharacterSearchState,
	setHomeCharacterSearchQuery,
	selectHomeCharacterSortChoice,
	toggleHomeCharacterSortDirection,
	resolveHomeCharacterSortLabel,
	subscribeHomeCharacterSearchStore,
} from '../state/homeCharacterSearchStore.js'
import { HomeTagFilters } from './HomeTagFilters.jsx'
import {
	getHomeCharacterBrowserStats,
	subscribeHomeCharacterBrowserStatsStore,
} from '../state/homeCharacterBrowserStatsStore.js'
import { HomeQuickActions } from './HomeQuickActions.jsx'

function useHomeSearchState() {
	return useSyncExternalStore(
		subscribeHomeCharacterSearchStore,
		() => getHomeCharacterSearchState(),
		() => getHomeCharacterSearchState(),
	)
}

function useHomeBrowserStats() {
	return useSyncExternalStore(
		subscribeHomeCharacterBrowserStatsStore,
		() => getHomeCharacterBrowserStats(),
		() => getHomeCharacterBrowserStats(),
	)
}

const SORT_CHOICE_ICONS = Object.freeze({
	name: Type,
	createdAt: Calendar,
	favorite: Star,
	lastChat: History,
	chatCount: MessagesSquare,
	tokenCount: Braces,
	random: Shuffle,
})

const SortChoiceIcon = ({ choice }) => {
	if (!choice) return null
	const IconComponent = SORT_CHOICE_ICONS[choice.field]
	if (!IconComponent) return null
	return (
		<span className="astra-home-sortChoice__symbol" aria-hidden="true">
			<IconComponent strokeWidth={1.5} size={16} />
		</span>
	)
}

const SortAscendingIcon = ({ size = 18 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M4 6h7" />
		<path d="M4 12h7" />
		<path d="M4 18h9" />
		<path d="M15 9l3 -3l3 3" />
		<path d="M18 6v12" />
	</svg>
)

const SortDescendingIcon = ({ size = 18 }) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M4 6h9" />
		<path d="M4 12h7" />
		<path d="M4 18h7" />
		<path d="M15 15l3 3l3 -3" />
		<path d="M18 6v12" />
	</svg>
)

function HomeRosterHeading() {
	const stats = useHomeBrowserStats()
	const totalCharacters = resolveCount(stats?.totalCharacters)
	const visibleCharacters = resolveCount(stats?.visibleCharacters)
	const filtersActive = Boolean(
		stats?.searchActive || stats?.tagFiltersActive || stats?.favoriteFilterActive,
	)
	const countCopy =
		filtersActive && totalCharacters > 0
			? `${visibleCharacters.toLocaleString()} of ${totalCharacters.toLocaleString()} ${getCharacterLabel(totalCharacters)}`
			: `${visibleCharacters.toLocaleString()} ${getCharacterLabel(visibleCharacters)}`

	return (
		<div className="astra-home-browser__headingRow">
			<div className="astra-home-collectionHeadingGroup">
				<div className="astra-home-collectionHeading" aria-live="polite">
					<span className="astra-home-collectionHeading__count">{countCopy}</span>
				</div>
			</div>
		</div>
	)
}

function resolveCount(value) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : 0
}

function getCharacterLabel(count) {
	return count === 1 ? 'character' : 'characters'
}

export function HomeCharacterSearch() {
	const inputRef = useRef(null)
	const sortControlsRef = useRef(null)
	const [sortDropdownWidth, setSortDropdownWidth] = useState(null)
	const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
	const { searchQuery, searchSortActive, sortField, sortDirection } = useHomeSearchState()
	const sortChoiceGroups = useMemo(() => {
		const toggleable = []
		const locked = []
		for (const choice of HOME_CHARACTER_SORT_CHOICES) {
			if (choice.lockedDirection) {
				locked.push(choice)
			} else {
				toggleable.push(choice)
			}
		}
		return { toggleable, locked }
	}, [])

	const trimmedQuery = searchQuery.trim()
	const searchActive = searchSortActive && Boolean(trimmedQuery)

	useEffect(() => {
		if (searchActive) {
			setSortDropdownOpen(false)
		}
	}, [searchActive])

	const selectedChoice =
		useMemo(
			() => HOME_CHARACTER_SORT_CHOICES.find(choice => choice.field === sortField) ?? null,
			[sortField],
		)

	const selectedLabel = useMemo(() => {
		if (searchActive) return 'Search Results'
		const resolvedLabel = resolveHomeCharacterSortLabel(selectedChoice, sortDirection)
		return resolvedLabel || 'Select Sort Field'
	}, [searchActive, selectedChoice, sortDirection])

	const directionLocked = Boolean(selectedChoice?.lockedDirection)

	const renderSortOption = option => {
		const isSelected = option.field === sortField
		const optionDirection = option.lockedDirection ?? sortDirection
		const optionLabel = resolveHomeCharacterSortLabel(option, optionDirection)
		return (
			<DropdownMenuItem
				key={option.id}
				className="astra-dropdown-option astra-home-sortChoice"
				onSelect={event => {
					event.preventDefault()
					selectHomeCharacterSortChoice(option.id, optionDirection)
				}}
			>
				<span className="astra-home-sortChoice__content">
					<SortChoiceIcon choice={option} />
					<span className="astra-dropdown-option__label astra-home-sortChoice__text">{optionLabel}</span>
				</span>
				{isSelected ? (
					<CheckIcon
						className="astra-dropdown-option__check astra-home-sortChoice__check"
						size={16}
						aria-hidden="true"
					/>
				) : null}
			</DropdownMenuItem>
		)
	}

	const handleClear = () => {
		setHomeCharacterSearchQuery('')
		if (inputRef.current) {
			inputRef.current.focus()
		}
	}

	const handleSortDropdownOpenChange = nextOpen => {
		if (searchActive) {
			setSortDropdownOpen(false)
			return
		}
		setSortDropdownOpen(nextOpen)
	}

	useLayoutEffect(() => {
		if (typeof window === 'undefined') return undefined
		const controlsNode = sortControlsRef.current
		if (!controlsNode) return undefined

		const updateWidth = nextWidth => {
			const resolvedWidth =
				typeof nextWidth === 'number' && !Number.isNaN(nextWidth)
					? nextWidth
					: controlsNode.getBoundingClientRect().width
			setSortDropdownWidth(prev => {
				if (typeof resolvedWidth !== 'number' || Number.isNaN(resolvedWidth)) return prev
				if (prev === null || Math.abs(prev - resolvedWidth) > 0.5) {
					return resolvedWidth
				}
				return prev
			})
		}

		updateWidth()

		if (typeof ResizeObserver === 'undefined') {
			const handleResize = () => updateWidth()
			window.addEventListener('resize', handleResize)
			return () => window.removeEventListener('resize', handleResize)
		}

		const observer = new ResizeObserver(entries => {
			const entry = Array.isArray(entries) ? entries[0] : undefined
			const measuredWidth = entry?.contentRect?.width
			if (typeof measuredWidth === 'number') {
				updateWidth(measuredWidth)
			}
		})
		observer.observe(controlsNode)

		return () => observer.disconnect()
		}, [])

	return (
		<>
			<HomeRosterHeading />
			<HomeQuickActions />
			<div className="astra-home-browser__controls">
				<div className="astra-home-browser__controlsLeft">
					<HomeTagFilters />
				</div>
				<div className="astra-home-browser__controlsRight" role="search">
					<div className="astra-home-searchField">
						<Input
							ref={inputRef}
							type="search"
							value={searchQuery}
							onChange={event => setHomeCharacterSearchQuery(event.target.value)}
							placeholder="Search..."
							className="astra-home-searchInput ps-9 pe-10"
							autoComplete="off"
						/>
						<span aria-hidden="true" className="astra-home-searchIcon">
							<Search strokeWidth={1.5} size={16} />
						</span>
						{searchQuery ? (
							<button
								type="button"
								className="astra-home-searchClear"
								onClick={handleClear}
								aria-label="Clear search"
							>
								<X strokeWidth={1.5} size={16} />
							</button>
						) : null}
					</div>
					<ButtonGroup ref={sortControlsRef} className="astra-home-sortControls" aria-live="polite">
						<DropdownMenu
							open={searchActive ? false : sortDropdownOpen}
							onOpenChange={handleSortDropdownOpenChange}
						>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="astra-home-sortButton astra-button-group__item"
									aria-label="Select sort field"
									disabled={searchActive}
								>
									<span className="astra-home-sortButton__selection">
										{!searchActive && selectedChoice ? <SortChoiceIcon choice={selectedChoice} /> : null}
										<span className="astra-home-sortChoice__text">{selectedLabel}</span>
									</span>
									<ChevronDownIcon className="-me-1 opacity-60" size={16} aria-hidden="true" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="start"
								side="bottom"
								sideOffset={8}
								className="astra-dropdown-menu astra-home-sortDropdown"
								style={sortDropdownWidth ? { width: sortDropdownWidth } : undefined}
							>
								{sortChoiceGroups.toggleable.map(renderSortOption)}
								{sortChoiceGroups.locked.length ? (
									<>
										<DropdownMenuSeparator className="astra-home-sortDropdown__separator" />
										{sortChoiceGroups.locked.map(renderSortOption)}
									</>
								) : null}
							</DropdownMenuContent>
						</DropdownMenu>
						<Toggle
							variant="outline"
							className="astra-home-sortToggle astra-button-group__item"
							pressed={sortDirection === 'desc'}
							onPressedChange={toggleHomeCharacterSortDirection}
							disabled={searchActive || directionLocked}
							aria-label={`Switch to ${sortDirection === 'desc' ? 'ascending' : 'descending'} order`}
						>
							<span aria-hidden="true">
								{sortDirection === 'desc' ? (
									<SortDescendingIcon size={18} />
								) : (
									<SortAscendingIcon size={18} />
								)}
							</span>
						</Toggle>
					</ButtonGroup>
				</div>
			</div>
		</>
	)
}
