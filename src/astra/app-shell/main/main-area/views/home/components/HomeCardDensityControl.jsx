import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import {
	HOME_CARD_DENSITY_CONFIG,
	getHomeCardDensityState,
	resolveHomeCardColumnCount,
	setHomeCardDensity,
	subscribeHomeCardDensityStore,
} from '../state/homeCardDensityStore.js'
import { readHomeCardMinWidthPx } from '../homeCardGridCss.js'

const HOME_CARD_GRID_GAP_FALLBACK_PX = 20

function useHomeCardDensityState() {
	return useSyncExternalStore(
		subscribeHomeCardDensityStore,
		() => getHomeCardDensityState(),
		() => getHomeCardDensityState(),
	)
}

function measureGridWidth(node) {
	if (!node) return 0
	const rectWidth = node.getBoundingClientRect?.()?.width
	if (typeof rectWidth === 'number' && Number.isFinite(rectWidth) && rectWidth > 0) {
		return rectWidth
	}
	const clientWidth = node.clientWidth
	if (typeof clientWidth === 'number' && Number.isFinite(clientWidth) && clientWidth > 0) {
		return clientWidth
	}
	return 0
}

function measureGridGap(node) {
	if (!node || typeof globalThis?.getComputedStyle !== 'function') {
		return HOME_CARD_GRID_GAP_FALLBACK_PX
	}
	try {
		const styles = globalThis.getComputedStyle(node)
		const gapValue =
			styles?.getPropertyValue?.('column-gap') ||
			styles?.getPropertyValue?.('grid-column-gap') ||
			styles?.getPropertyValue?.('gap')
		const parsed = Number.parseFloat(gapValue ?? '')
		if (Number.isFinite(parsed) && parsed >= 0) {
			return parsed
		}
	} catch {
		// Ignore style read errors
	}
	return HOME_CARD_GRID_GAP_FALLBACK_PX
}

function computeAppliedColumns(desiredColumns, { width, gap, minWidth }) {
	const minColumns = Number.isFinite(HOME_CARD_DENSITY_CONFIG?.minColumns)
		? HOME_CARD_DENSITY_CONFIG.minColumns
		: 1
	const maxColumns = Number.isFinite(HOME_CARD_DENSITY_CONFIG?.maxColumns)
		? HOME_CARD_DENSITY_CONFIG.maxColumns
		: minColumns
	const fallbackMinWidth = Number.isFinite(HOME_CARD_DENSITY_CONFIG?.minWidth)
		? HOME_CARD_DENSITY_CONFIG.minWidth
		: 280
	const resolvedMinWidth = Number.isFinite(minWidth) && minWidth > 0 ? minWidth : fallbackMinWidth
	const safeGap = Number.isFinite(gap) && gap >= 0 ? gap : HOME_CARD_GRID_GAP_FALLBACK_PX
	const safeWidth = Number.isFinite(width) && width > 0 ? width : 0
	let applied = resolveHomeCardColumnCount(desiredColumns)
	applied = Math.min(Math.max(applied, minColumns), maxColumns)
	if (!safeWidth) {
		return applied
	}
	const measure = columns => ((safeWidth - safeGap * (columns - 1)) / columns || 0)
	let trackWidth = measure(applied)
	while (applied > 1 && (!Number.isFinite(trackWidth) || trackWidth < resolvedMinWidth)) {
		applied -= 1
		trackWidth = measure(applied)
	}
	return Math.min(Math.max(applied, minColumns), maxColumns)
}

function useHomeGridMetrics() {
	const [metrics, setMetrics] = useState({
		width: 0,
		gap: HOME_CARD_GRID_GAP_FALLBACK_PX,
		minWidth: Number.isFinite(HOME_CARD_DENSITY_CONFIG?.minWidth) ? HOME_CARD_DENSITY_CONFIG.minWidth : 280,
	})

	useEffect(() => {
		const grid =
			typeof document !== 'undefined' && document?.querySelector
				? document.querySelector('.astra-home-card-grid')
				: null
		if (!grid) return undefined

		const updateMetrics = () => {
			const nextWidth = measureGridWidth(grid)
			const nextGap = measureGridGap(grid)
			const nextMinWidth = readHomeCardMinWidthPx(
				grid,
				Number.isFinite(HOME_CARD_DENSITY_CONFIG?.minWidth) ? HOME_CARD_DENSITY_CONFIG.minWidth : 280,
			)
			setMetrics(current => {
				if (current.width === nextWidth && current.gap === nextGap && current.minWidth === nextMinWidth) {
					return current
				}
				return { width: nextWidth, gap: nextGap, minWidth: nextMinWidth }
			})
		}

		updateMetrics()

		let resizeObserver = null
		if (typeof globalThis?.ResizeObserver === 'function') {
			resizeObserver = new globalThis.ResizeObserver(() => updateMetrics())
			try {
				resizeObserver.observe(grid)
			} catch {
				// Ignore observer failures
			}
		}

		return () => {
			if (resizeObserver) {
				try {
					resizeObserver.disconnect()
				} catch {
					// Ignore teardown failures
				}
			}
		}
	}, [])

	return metrics
}

export function HomeCardDensityControl({ className } = {}) {
	const { columnCount } = useHomeCardDensityState()
	const [draftCount, setDraftCount] = useState(columnCount)
	const gridMetrics = useHomeGridMetrics()

	useEffect(() => {
		setDraftCount(columnCount)
	}, [columnCount])

	const sliderValue = useMemo(() => [draftCount], [draftCount])
	const ticks = useMemo(() => {
		const values = []
		for (
			let value = HOME_CARD_DENSITY_CONFIG.minColumns;
			value <= HOME_CARD_DENSITY_CONFIG.maxColumns;
			value += 1
		) {
			const applied = computeAppliedColumns(value, gridMetrics)
			values.push({
				value,
				isCapped: applied < value,
			})
		}
		return values
	}, [gridMetrics])

	const handleSliderChange = value => {
		if (!Array.isArray(value) || !value.length) return
		const nextCount = resolveHomeCardColumnCount(value[0])
		setDraftCount(nextCount)
		setHomeCardDensity(nextCount)
	}

	const handleSliderCommit = value => {
		if (!Array.isArray(value) || !value.length) return
		const nextCount = resolveHomeCardColumnCount(value[0])
		setHomeCardDensity(nextCount)
	}

	const sliderValueText = useMemo(() => `${columnCount} columns`, [columnCount])
	const sliderMin = HOME_CARD_DENSITY_CONFIG.minColumns
	const sliderMax = HOME_CARD_DENSITY_CONFIG.maxColumns
	const sliderStep = 1

	return (
		<div className={cn('astra-home-densityControl', className)}>
			<Slider
				id="astra-home-density-slider"
				value={sliderValue}
				min={sliderMin}
				max={sliderMax}
				step={sliderStep}
				onValueChange={handleSliderChange}
				onValueCommit={handleSliderCommit}
				aria-label="Home card columns"
				aria-valuetext={sliderValueText}
				className="astra-home-densityControl__slider"
			/>
			<div className="astra-home-densityControl__ticks" aria-hidden="true">
				{ticks.map(tick => (
					<span
						key={tick.value}
						className={cn(
							'astra-home-densityControl__tick',
							tick.isCapped && 'is-muted',
							!tick.isCapped && tick.value === columnCount && 'is-active',
						)}
					>
						<span className="astra-home-densityControl__tickLabel">{tick.value}</span>
					</span>
				))}
			</div>
		</div>
	)
}
