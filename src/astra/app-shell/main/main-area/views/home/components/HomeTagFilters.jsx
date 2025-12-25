import React, {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { Funnel, Info, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import {
	clearHomeTagFilters,
	cycleHomeTagFilter,
	getHomeTagFilterState,
	subscribeHomeTagFiltersStore,
} from '../state/homeTagFilterStore.js'
import {
	FAVORITE_FILTER_MODES,
	clearHomeFavoriteFilter,
	getHomeFavoriteFilterState,
	setHomeFavoriteFilterMode,
	subscribeHomeFavoriteFilterStore,
} from '../state/homeFavoriteFilterStore.js'
import { resolveContext } from '@/astra/shared/characters/characterData.js'
import { ensureAppWrapperPortalHost } from './cardActionUtils.js'
import { FavoriteIcon } from './homeCardActionIcons.jsx'
import { HomeCardDensityControl } from './HomeCardDensityControl.jsx'
import { HomeCardLayoutControl } from './HomeCardLayoutControl.jsx'

const TAG_FILTER_DRAWER_QUERY = '(max-width: 767px)'

export function HomeTagFilters() {
	const filterState = useHomeTagFilterSnapshot()
	const favoriteFilterState = useHomeFavoriteFilterSnapshot()
	const [open, setOpen] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [availableTags, setAvailableTags] = useState(() => collectAvailableTags())
	const useDrawerSurface = useMediaQuery(TAG_FILTER_DRAWER_QUERY)
	const portalContainer = useMemo(() => ensureAppWrapperPortalHost(), [])

	useEffect(() => {
		if (!open) return undefined
		const refreshOptions = () => setAvailableTags(collectAvailableTags())
		refreshOptions()
		const context = resolveContext()
		const eventSource = context?.eventSource ?? globalThis?.eventSource ?? null
		const eventTypes = context?.eventTypes ?? globalThis?.event_types ?? null
		if (!eventSource || !eventTypes?.TAGS_UPDATED) {
			return undefined
		}
		const handler = () => refreshOptions()
		if (typeof eventSource.on === 'function') {
			eventSource.on(eventTypes.TAGS_UPDATED, handler)
		}
		return () => {
			if (typeof eventSource.off === 'function') {
				eventSource.off(eventTypes.TAGS_UPDATED, handler)
			} else if (typeof eventSource.removeListener === 'function') {
				eventSource.removeListener(eventTypes.TAGS_UPDATED, handler)
			}
		}
	}, [open])

	const filteredTags = useMemo(() => {
		const term = searchTerm.trim().toLowerCase()
		if (!term) {
			return availableTags
		}
		return availableTags.filter(tag => {
			const state = resolveTagState(filterState, tag.id)
			if (state !== 'ignore') {
				return true
			}
			return tag.name.toLowerCase().includes(term)
		})
	}, [availableTags, filterState, searchTerm])

	const favoriteFilterMode = favoriteFilterState?.mode ?? FAVORITE_FILTER_MODES.IGNORE
	const favoriteFiltersActive = favoriteFilterMode !== FAVORITE_FILTER_MODES.IGNORE
	const includeCount = filterState.selected.length
	const excludeCount = filterState.excluded.length
	const tagFilterCount = includeCount + excludeCount
	const activeFilterCount = tagFilterCount + (favoriteFiltersActive ? 1 : 0)
	const favoriteLabel =
		favoriteFilterMode === FAVORITE_FILTER_MODES.IGNORE
			? null
			: favoriteFilterMode === FAVORITE_FILTER_MODES.INCLUDE
				? 'Favorites: include'
				: 'Favorites: exclude'
	const filterTooltipDetails =
		activeFilterCount > 0
			? [
					`Include: ${includeCount}`,
					`Exclude: ${excludeCount}`,
					favoriteLabel,
				]
					.filter(Boolean)
					.join(', ')
			: null

	const favoriteToggleControl = (
		<FavoriteFilterToggle mode={favoriteFilterMode} onModeChange={setHomeFavoriteFilterMode} />
	)

	const triggerButton = onClick => (
		<Button
			type="button"
			variant="outline"
			size="icon"
			className="astra-home-filterButton"
			aria-label="Open filters"
			data-active={activeFilterCount > 0 ? 'true' : 'false'}
			onClick={onClick}
		>
			<Funnel size={16} strokeWidth={1.5} aria-hidden="true" />
			{activeFilterCount > 0 ? (
				<span className="astra-home-filterBadge" aria-label={`${activeFilterCount} filters applied`}>
					{activeFilterCount > 99 ? '99+' : activeFilterCount}
				</span>
			) : null}
		</Button>
	)

	const renderFilterTrigger = (usePopoverTrigger = false) => (
		<Tooltip>
			<TooltipTrigger asChild>
				{usePopoverTrigger ? (
					<PopoverTrigger asChild>{triggerButton(undefined)}</PopoverTrigger>
				) : (
					triggerButton(() => setOpen(true))
				)}
			</TooltipTrigger>
			<TooltipContent
				side="bottom"
				sideOffset={8}
				showArrow
				className="astra-tooltip dark px-2 py-1 text-xs"
			>
				{filterTooltipDetails ? (
					<>
						<div>Open filters</div>
						<div>{filterTooltipDetails}</div>
					</>
				) : (
					'Open filters'
				)}
			</TooltipContent>
		</Tooltip>
	)

	const content = (
		<TagFilterPanel
			searchTerm={searchTerm}
			onSearchChange={setSearchTerm}
			onClose={() => setOpen(false)}
			tags={filteredTags}
			availableTags={availableTags}
			filterState={filterState}
			hasTags={availableTags.length > 0}
			favoriteFilterMode={favoriteFilterMode}
			onFavoriteClear={clearHomeFavoriteFilter}
		/>
	)

	if (useDrawerSurface) {
		return (
			<TooltipProvider delayDuration={0}>
				<div className="astra-home-filterControl">
					{renderFilterTrigger(false)}
					{favoriteToggleControl}
					<HomeCardLayoutControl />
					<HomeCardDensityControl />
					<Drawer open={open} onOpenChange={setOpen}>
						<DrawerContent
							className="astra-drawer-surface astra-home-card__drawerSurface astra-home-filterDrawerSurface"
							container={portalContainer}
						>
							<DrawerTitle className="sr-only">Tag filters</DrawerTitle>
							<DrawerDescription className="sr-only">
								Filter character cards by tags and favorites.
							</DrawerDescription>
							{content}
						</DrawerContent>
					</Drawer>
				</div>
			</TooltipProvider>
		)
	}

	return (
		<TooltipProvider delayDuration={0}>
			<div className="astra-home-filterControl">
				<Popover modal open={open} onOpenChange={setOpen}>
					{renderFilterTrigger(true)}
					<PopoverContent
						align="start"
						side="bottom"
						sideOffset={10}
						className="astra-dialog-surface astra-home-card__dialogSurface astra-home-filterPopover"
					>
						{content}
					</PopoverContent>
				</Popover>
				{favoriteToggleControl}
				<HomeCardLayoutControl />
				<HomeCardDensityControl />
			</div>
		</TooltipProvider>
	)
}

function useHomeTagFilterSnapshot() {
	return useSyncExternalStore(
		subscribeHomeTagFiltersStore,
		() => getHomeTagFilterState(),
		() => getHomeTagFilterState(),
	)
}

function useHomeFavoriteFilterSnapshot() {
	return useSyncExternalStore(
		subscribeHomeFavoriteFilterStore,
		() => getHomeFavoriteFilterState(),
		() => getHomeFavoriteFilterState(),
	)
}

function TagFilterPanel({
	searchTerm,
	onSearchChange,
	onClose,
	tags,
	availableTags = [],
	filterState,
	hasTags,
	favoriteFilterMode = FAVORITE_FILTER_MODES.IGNORE,
	onFavoriteClear,
}) {
	const searchInputRef = useRef(null)
	const isFavoriteFilterActive = favoriteFilterMode !== FAVORITE_FILTER_MODES.IGNORE
	const hasFilters =
		filterState.selected.length > 0 || filterState.excluded.length > 0 || isFavoriteFilterActive
	const hasSelectedTags = filterState.selected.length > 0 || filterState.excluded.length > 0
	const handleSearchClear = () => {
		onSearchChange('')
		if (searchInputRef.current) {
			searchInputRef.current.focus()
		}
	}

	return (
		<Tabs defaultValue="all" className="astra-home-filterPanel astra-home-filterTabs">
			<div className="astra-home-filterPanel__header">
				<div className="astra-home-filterHeading">
					<span className="astra-home-filterHeading__label">Tag Filters</span>
					<TabsList
						className="astra-home-filterTabsList astra-home-filterHeading__tabs bg-transparent"
						aria-label="Filter sections"
					>
						<TabsTrigger
							value="all"
							className="astra-home-filterTabTrigger data-[state=active]:bg-muted data-[state=active]:shadow-none"
						>
							All
						</TabsTrigger>
						<TabsTrigger
							value="selected"
							className="astra-home-filterTabTrigger data-[state=active]:bg-muted data-[state=active]:shadow-none"
						>
							Selected
						</TabsTrigger>
					</TabsList>
				</div>
			</div>
			<div className="astra-home-card__dialogBody astra-dialog-body">
				<div className="astra-home-card__dialogContent astra-dialog-content">
					<TabsContent
						value="all"
						className="astra-home-filterTabContent astra-home-filterTabContent--all"
					>
						<div className="astra-home-searchField astra-home-filterSearch">
							<Input
								ref={searchInputRef}
								type="search"
								value={searchTerm}
								onChange={event => onSearchChange(event.target.value)}
								placeholder="Search tags..."
								className="astra-home-searchInput ps-9 pe-10"
								autoComplete="off"
							/>
							<span aria-hidden="true" className="astra-home-searchIcon">
								<Search strokeWidth={1.5} size={16} />
							</span>
							{searchTerm ? (
								<button
									type="button"
									className="astra-home-searchClear"
									onClick={handleSearchClear}
									aria-label="Clear tag search"
								>
									<X strokeWidth={1.5} size={16} />
								</button>
							) : null}
						</div>
						<div className="astra-home-filterTags" role="list">
							{tags.length ? (
								tags.map(tag => (
									<TagChip
										key={tag.id}
										tag={tag}
										state={resolveTagState(filterState, tag.id)}
										onToggle={() => cycleHomeTagFilter(tag.id)}
									/>
								))
							) : hasTags ? (
								<div className="astra-home-filterEmpty">No tags match your search.</div>
							) : (
								<div className="astra-home-filterEmpty">
									No tags are available yet. Create tags from the character editor first.
								</div>
							)}
						</div>
					</TabsContent>
					<TabsContent
						value="selected"
						className="astra-home-filterTabContent astra-home-filterTabContent--selected"
					>
						{hasSelectedTags ? (
							<TagFilterLegend
								filterState={filterState}
								availableTags={availableTags}
								onToggle={cycleHomeTagFilter}
							/>
						) : (
							<div className="astra-home-filterEmpty astra-home-filterEmpty--selected">
								No tags selected yet.
							</div>
						)}
					</TabsContent>
				</div>
			</div>
			<div className="astra-home-filterHint" role="note">
				<span className="astra-home-filterHint__icon" aria-hidden="true">
					<Info strokeWidth={1.5} size={20} />
				</span>
				<div className="astra-home-filterHint__content">
					<p className="astra-home-filterHint__text">Left click cycles Include → Exclude → Clear.</p>
				</div>
			</div>
			<div className="astra-dialog-footer astra-home-card__dialogFooter astra-home-filterFooter">
				<Button
					variant="outline"
					className="astra-home-filterClear"
					onClick={() => {
						clearHomeTagFilters()
						onSearchChange('')
						onFavoriteClear?.()
					}}
					disabled={!hasFilters}
				>
					Clear Filters
				</Button>
				<Button type="button" onClick={onClose}>
					Done
				</Button>
			</div>
		</Tabs>
	)
}

function FavoriteFilterToggle({ mode = FAVORITE_FILTER_MODES.IGNORE, onModeChange }) {
	const isInclude = mode === FAVORITE_FILTER_MODES.INCLUDE
	const isExclude = mode === FAVORITE_FILTER_MODES.EXCLUDE
	const isActive = mode !== FAVORITE_FILTER_MODES.IGNORE
	const tooltipLabel = isExclude
		? 'Exclude favorites'
		: isInclude
			? 'Include favorites'
			: 'Ignore favorites'
	const handlePressedChange = () => {
		const nextMode = isInclude
			? FAVORITE_FILTER_MODES.EXCLUDE
			: isExclude
				? FAVORITE_FILTER_MODES.IGNORE
				: FAVORITE_FILTER_MODES.INCLUDE
		onModeChange?.(nextMode)
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Toggle
					variant="outline"
					size="sm"
					className={cn(
						'astra-home-filterFavoriteToggle',
						isActive ? 'is-active' : null,
						isExclude ? 'is-exclude' : null,
					)}
					pressed={isActive}
					onPressedChange={handlePressedChange}
					aria-label={tooltipLabel}
					data-mode={mode}
				>
					{isExclude ? (
						<FavoriteExcludeIcon aria-hidden="true" />
					) : (
						<FavoriteIcon filled={isInclude} aria-hidden="true" />
					)}
				</Toggle>
			</TooltipTrigger>
			<TooltipContent
				side="bottom"
				sideOffset={8}
				showArrow
				className="astra-tooltip dark px-2 py-1 text-xs"
			>
				{tooltipLabel}
			</TooltipContent>
		</Tooltip>
	)
}

function FavoriteExcludeIcon(props = {}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="M8.34 8.34 2 9.27l5 4.87L5.82 21 12 17.77 18.18 21l-.59-3.43" />
			<path d="M18.42 12.76 22 9.27l-6.91-1L12 2l-1.44 2.91" />
			<line x1="2" x2="22" y1="2" y2="22" />
		</svg>
	)
}

function TagChip({ tag, state, onToggle }) {
	const style = {}
	if (typeof tag?.color === 'string' && tag.color) {
		style['--home-card-tag-bg'] = tag.color
	}
	if (typeof tag?.color2 === 'string' && tag.color2) {
		style['--home-card-tag-fg'] = tag.color2
	}
	const isInclude = state === 'include'
	const isExclude = state === 'exclude'

	return (
		<button
			type="button"
			onClick={onToggle}
			className={cn('astra-home-filterTag', state !== 'ignore' ? `is-${state}` : null)}
			data-state={state}
			aria-pressed={state !== 'ignore'}
			style={style}
		>
			<span className="astra-home-filterTag__label">
				{isInclude ? (
					<TagIncludeIcon className="astra-home-filterTag__icon" aria-hidden="true" />
				) : null}
				{isExclude ? (
					<TagExcludeIcon className="astra-home-filterTag__icon" aria-hidden="true" />
				) : null}
				<span className="astra-home-filterTag__name">{tag.name}</span>
			</span>
		</button>
	)
}

function resolveTagState(state, tagId) {
	if (state.selected.includes(tagId)) return 'include'
	if (state.excluded.includes(tagId)) return 'exclude'
	return 'ignore'
}

function TagFilterLegend({ filterState, availableTags, onToggle }) {
	const tagLookup = useMemo(() => {
		const map = new Map()
		for (const tag of availableTags) {
			map.set(tag.id, tag)
		}
		return map
	}, [availableTags])

	const includeTags = filterState.selected
		.map(tagId => resolveLegendTagEntry(tagLookup, tagId))
		.filter(Boolean)
	const excludeTags = filterState.excluded
		.map(tagId => resolveLegendTagEntry(tagLookup, tagId))
		.filter(Boolean)

	if (!includeTags.length && !excludeTags.length) {
		return null
	}

	return (
		<div className="astra-home-filterLegend">
			<LegendGroup
				label="Include"
				icon={<TagIncludeIcon />}
				state="include"
				tags={includeTags}
				onToggle={onToggle}
			/>
			<LegendGroup
				label="Exclude"
				icon={<TagExcludeIcon />}
				state="exclude"
				tags={excludeTags}
				onToggle={onToggle}
			/>
		</div>
	)
}

function LegendGroup({ label, icon, tags, state, onToggle }) {
	if (!tags.length) {
		return null
	}

	return (
		<div className="astra-home-filterLegendGroup" data-variant={state}>
			<span className="astra-home-filterLegendGroup__label">
				<span className="astra-home-filterLegendIcon" aria-hidden="true">
					{icon}
				</span>
				<span>{label}</span>
			</span>
			<div className="astra-home-filterLegendGroup__tags">
				{tags.map(tag => (
					<TagChip
						key={`legend-${state}-${tag.id}`}
						tag={tag}
						state={state}
						onToggle={() => onToggle?.(tag.id)}
					/>
				))}
			</div>
		</div>
	)
}

function resolveLegendTagEntry(tagLookup, tagId) {
	const normalizedId = normalizeTagId(tagId)
	if (!normalizedId) {
		return null
	}
	return tagLookup.get(normalizedId) ?? { id: normalizedId, name: normalizedId }
}

function TagIncludeIcon({ width = 16, height = 16, ...props }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
			<path d="M21.002 13c0 -.617 -.235 -1.233 -.706 -1.704l-7.71 -7.71c-.375 -.375 -.884 -.586 -1.414 -.586h-5.172c-1.657 0 -3 1.343 -3 3v5.172c0 .53 .211 1.039 .586 1.414l7.71 7.71c.471 .47 1.087 .706 1.704 .706" />
			<path d="M16 19h6" />
			<path d="M19 16v6" />
		</svg>
	)
}

function TagExcludeIcon({ width = 16, height = 16, ...props }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={width}
			height={height}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M7.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
			<path d="M18.898 16.102l.699 -.699l.699 -.699c.941 -.941 .941 -2.467 0 -3.408l-7.71 -7.71c-.375 -.375 -.884 -.586 -1.414 -.586h-5.172c-1.657 0 -3 1.343 -3 3v5.172c0 .53 .211 1.039 .586 1.414l7.71 7.71c.471 .47 1.087 .706 1.704 .706" />
			<path d="M16 19h6" />
		</svg>
	)
}

function collectAvailableTags() {
	const context = resolveContext()
	const registryCandidates = [
		Array.isArray(context?.tags) ? context.tags : null,
		Array.isArray(globalThis?.tags) ? globalThis.tags : null,
	]
	const registry = registryCandidates.find(Boolean) ?? []
	const tagMapSource =
		context?.tagMap ??
		globalThis?.tag_map ??
		{}

	const usedIds = new Set()
	for (const entry of Object.values(tagMapSource)) {
		if (!Array.isArray(entry)) continue
		for (const value of entry) {
			const key = typeof value === 'string' ? value : Number.isFinite(value) ? String(value) : ''
			if (key) {
				usedIds.add(key)
			}
		}
	}

	const normalized = []
	const seen = new Set()
	for (const tag of registry) {
		const id = normalizeTagId(tag?.id)
		const name = typeof tag?.name === 'string' ? tag.name.trim() : ''
		if (!id || !name) continue
		if (seen.has(id)) continue
		if (usedIds.size && !usedIds.has(id)) continue
		seen.add(id)
		normalized.push({
			id,
			name,
			color: typeof tag?.color === 'string' ? tag.color : '',
			color2: typeof tag?.color2 === 'string' ? tag.color2 : '',
		})
	}

	normalized.sort((a, b) =>
		a.name.localeCompare(b.name, undefined, {
			sensitivity: 'base',
			numeric: true,
		}),
	)

	return normalized
}

function normalizeTagId(candidate) {
	if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
	if (Number.isFinite(candidate)) return String(candidate)
	return null
}
