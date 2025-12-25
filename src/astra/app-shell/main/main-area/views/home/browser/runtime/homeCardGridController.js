import {
	getHomeCardDensityState,
	HOME_CARD_DENSITY_CONFIG,
	resolveHomeCardColumnCount,
	subscribeHomeCardDensityStore,
} from '../../state/homeCardDensityStore.js'
import { readHomeCardMinWidthPx } from '../../homeCardGridCss.js'

const HOME_CARD_GRID_GAP_FALLBACK_PX = 20
const HOME_CARD_GRID_TRACK_ROUNDING_STEP = 0.5
const SIDEBAR_TRANSITION_FALLBACK_MS = 600
const HOME_CARD_MIN_WIDTH_FALLBACK_PX = 280

export function createHomeCardGridController({ grid, doc, container } = {}) {
	if (!grid) {
		return {
			setVisibleCount() {},
			destroy() {},
		}
	}

	let activeColumnCount = resolveHomeCardColumnCount(getHomeCardDensityState()?.columnCount)
	const gridLayoutState = {
		visibleCount: 0,
		lastMeasuredWidth: 0,
	}
	const gridTrackUpdateState = {
		isSidebarAnimating: false,
		pendingWidth: null,
		pendingUpdate: false,
	}

	const measureGridWidth = explicitWidth => {
		if (typeof explicitWidth === 'number' && Number.isFinite(explicitWidth) && explicitWidth > 0) {
			return explicitWidth
		}
		const viewContainer =
			(typeof container?.closest === 'function' && container.closest('.astra-home-view')) || null
		const gridViewContainer =
			(typeof grid?.closest === 'function' && grid.closest('.astra-home-view')) || null
		const targets = [container, grid, viewContainer, gridViewContainer]
		for (const target of targets) {
			if (!target) continue
			const measured = target.getBoundingClientRect?.()?.width
			if (typeof measured === 'number' && Number.isFinite(measured) && measured > 0) {
				return measured
			}
			const clientWidth = target.clientWidth
			if (typeof clientWidth === 'number' && Number.isFinite(clientWidth) && clientWidth > 0) {
				return clientWidth
			}
		}
		return 0
	}

	const commitGridTrackSizeUpdate = explicitWidth => {
		const measuredWidth = measureGridWidth(explicitWidth)
		if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) {
			return
		}
		gridLayoutState.lastMeasuredWidth = measuredWidth
		const columnGap = measureHomeCardGridGap(grid, HOME_CARD_GRID_GAP_FALLBACK_PX)
		const fallbackMinWidth =
			Number.isFinite(HOME_CARD_DENSITY_CONFIG?.minWidth) && HOME_CARD_DENSITY_CONFIG.minWidth > 0
				? HOME_CARD_DENSITY_CONFIG.minWidth
				: HOME_CARD_MIN_WIDTH_FALLBACK_PX
		const minWidth = readHomeCardMinWidthPx(grid, fallbackMinWidth)
		const { trackWidth, appliedColumns } = resolveHomeCardGridTrackSize({
			containerWidth: measuredWidth,
			desiredColumns: activeColumnCount,
			gap: columnGap,
			minWidth,
		})
		if (!Number.isFinite(trackWidth) || trackWidth <= 0) {
			return
		}
		const roundedWidth = roundHomeCardTrackSize(trackWidth)
		grid.style.setProperty('--home-card-grid-track-size', `${roundedWidth}px`)
		if (Number.isFinite(appliedColumns) && appliedColumns > 0) {
			grid.dataset.appliedColumns = `${appliedColumns}`
			grid.style.setProperty('--home-card-grid-columns', `${appliedColumns}`)
		} else {
			delete grid.dataset.appliedColumns
			grid.style.removeProperty('--home-card-grid-columns')
		}
	}

	const requestGridTrackSizeUpdate = explicitWidth => {
		if (gridTrackUpdateState.isSidebarAnimating) {
			if (Number.isFinite(explicitWidth)) {
				gridTrackUpdateState.pendingWidth = explicitWidth
				gridTrackUpdateState.pendingUpdate = false
			} else if (!Number.isFinite(gridTrackUpdateState.pendingWidth)) {
				gridTrackUpdateState.pendingUpdate = true
			}
			return
		}
		commitGridTrackSizeUpdate(explicitWidth)
	}

	const flushPendingGridTrackUpdate = () => {
		if (Number.isFinite(gridTrackUpdateState.pendingWidth)) {
			const nextWidth = gridTrackUpdateState.pendingWidth
			gridTrackUpdateState.pendingWidth = null
			gridTrackUpdateState.pendingUpdate = false
			commitGridTrackSizeUpdate(nextWidth)
			return
		}
		if (gridTrackUpdateState.pendingUpdate) {
			gridTrackUpdateState.pendingUpdate = false
			commitGridTrackSizeUpdate()
		}
	}

	const setVisibleCount = count => {
		const normalized = Number.isFinite(count) && count > 0 ? Math.max(0, Math.floor(count)) : 0
		gridLayoutState.visibleCount = normalized
		requestGridTrackSizeUpdate()
	}

	const requestDeferredGridTrackUpdate = () => {
		try {
			if (typeof requestAnimationFrame === 'function') {
				requestAnimationFrame(() => requestGridTrackSizeUpdate())
				return
			}
		} catch {
			// Ignore and fall back
		}
		try {
			if (typeof setTimeout === 'function') {
				setTimeout(() => requestGridTrackSizeUpdate(), 16)
			}
		} catch {
			// Ignore
		}
	}

	const applyColumnCountToGrid = count => {
		const resolvedCount = resolveHomeCardColumnCount(
			typeof count === 'number' && Number.isFinite(count) ? count : getHomeCardDensityState()?.columnCount,
		)
		if (!Number.isFinite(resolvedCount)) return
		activeColumnCount = resolvedCount
		grid.dataset.desiredColumns = `${resolvedCount}`
		requestGridTrackSizeUpdate()
	}

	const columnCountUnsubscribe =
		typeof subscribeHomeCardDensityStore === 'function'
			? subscribeHomeCardDensityStore(nextState => {
					applyColumnCountToGrid(nextState?.columnCount)
			  })
			: null
	applyColumnCountToGrid(activeColumnCount)

	const teardownGridResize = setupHomeCardGridResizeWatcher(grid, width => {
		requestGridTrackSizeUpdate(width)
	})

	const contentColumn = doc?.getElementById?.('contentColumn') ?? null
	const teardownContentColumnResize = contentColumn
		? setupHomeCardGridResizeWatcher(contentColumn, width => {
				requestGridTrackSizeUpdate(width)
		  })
		: null

	const teardownSidebarTransitions = setupSidebarTransitionWatcher(doc, {
		onStart: () => {
			gridTrackUpdateState.isSidebarAnimating = true
		},
		onEnd: () => {
			gridTrackUpdateState.isSidebarAnimating = false
			flushPendingGridTrackUpdate()
		},
	})

	const teardownSidebarClassWatcher = setupSidebarClassWatcher(doc, () => {
		requestGridTrackSizeUpdate()
		requestDeferredGridTrackUpdate()
	})

	const recompute = () => {
		requestGridTrackSizeUpdate()
	}

	const destroy = () => {
		if (typeof columnCountUnsubscribe === 'function') {
			columnCountUnsubscribe()
		}
		if (typeof teardownGridResize === 'function') {
			try {
				teardownGridResize()
			} catch (error) {
				console?.warn?.('[AstraProjecta] Failed to cleanup home grid resize observer.', error)
			}
		}
		if (typeof teardownContentColumnResize === 'function') {
			try {
				teardownContentColumnResize()
			} catch (error) {
				console?.warn?.('[AstraProjecta] Failed to cleanup content column resize watcher.', error)
			}
		}
		if (typeof teardownSidebarTransitions === 'function') {
			try {
				teardownSidebarTransitions()
			} catch (error) {
				console?.warn?.('[AstraProjecta] Failed to cleanup sidebar transition watcher.', error)
			}
		}
		if (typeof teardownSidebarClassWatcher === 'function') {
			try {
				teardownSidebarClassWatcher()
			} catch (error) {
				console?.warn?.('[AstraProjecta] Failed to cleanup sidebar class watcher.', error)
			}
		}
	}

	return {
		setVisibleCount,
		recompute,
		destroy,
	}
}

function setupSidebarTransitionWatcher(doc, handlers = {}) {
	const { onStart, onEnd } = handlers ?? {}
	if (!doc) return () => {}
	const leftSidebar = doc.getElementById?.('leftSidebar')
	const sidebarContentPanel = doc.getElementById?.('sidebarContentPanel')
	const targets = [leftSidebar, sidebarContentPanel].filter(node => node && typeof node.addEventListener === 'function')
	if (!targets.length) return () => {}
	const watchedProperties = new Set(['margin-left', 'transform', 'width'])
	const activeTransitions = new Map()
	let activeCount = 0
	let fallbackTimer = null

	const clearFallbackTimer = () => {
		if (fallbackTimer === null) return
		try {
			globalThis?.clearTimeout?.(fallbackTimer)
		} catch {
			// Ignore
		}
		fallbackTimer = null
	}

	const startFallbackTimer = () => {
		if (typeof globalThis?.setTimeout !== 'function') return
		clearFallbackTimer()
		fallbackTimer = globalThis.setTimeout(() => {
			fallbackTimer = null
			if (activeCount > 0) {
				activeCount = 0
				activeTransitions.clear()
				onEnd?.()
			}
		}, SIDEBAR_TRANSITION_FALLBACK_MS)
	}

	const shouldHandleEvent = event => {
		if (!event || !event.target || !targets.includes(event.target)) {
			return false
		}
		const property = typeof event.propertyName === 'string' ? event.propertyName.toLowerCase() : ''
		return !property || watchedProperties.has(property)
	}

	const makeTransitionKey = event => {
		const id = event?.target?.id || 'sidebar-target'
		const property = typeof event?.propertyName === 'string' && event.propertyName.length ? event.propertyName : '*'
		return `${id}:${property}`
	}

	const handleTransitionStart = event => {
		if (!shouldHandleEvent(event)) return
		const key = makeTransitionKey(event)
		const nextCount = (activeTransitions.get(key) ?? 0) + 1
		activeTransitions.set(key, nextCount)
		if (activeCount === 0) {
			onStart?.()
		}
		activeCount += 1
		startFallbackTimer()
	}

	const handleTransitionEnd = event => {
		if (!shouldHandleEvent(event)) return
		const key = makeTransitionKey(event)
		const currentCount = activeTransitions.get(key) ?? 0
		if (currentCount <= 1) {
			activeTransitions.delete(key)
		} else {
			activeTransitions.set(key, currentCount - 1)
		}
		if (activeCount > 0) {
			activeCount -= 1
		}
		if (activeCount === 0) {
			clearFallbackTimer()
			onEnd?.()
		}
	}

	const cleanupFns = []
	for (const target of targets) {
		const startListener = event => handleTransitionStart(event)
		const endListener = event => handleTransitionEnd(event)
		const cancelListener = event => handleTransitionEnd(event)
		try {
			target.addEventListener('transitionstart', startListener)
			target.addEventListener('transitionend', endListener)
			target.addEventListener('transitioncancel', cancelListener)
			cleanupFns.push(() => {
				target.removeEventListener('transitionstart', startListener)
				target.removeEventListener('transitionend', endListener)
				target.removeEventListener('transitioncancel', cancelListener)
			})
		} catch {
			// Ignore listener errors
		}
	}

	return () => {
		clearFallbackTimer()
		for (const cleanup of cleanupFns) {
			try {
				cleanup()
			} catch {
				// Ignore cleanup errors
			}
		}
		activeTransitions.clear()
		activeCount = 0
	}
}

function setupSidebarClassWatcher(doc, callback) {
	if (!doc?.body || typeof callback !== 'function' || typeof MutationObserver === 'undefined') {
		return () => {}
	}
	const observer = new MutationObserver(mutations => {
		for (const record of mutations) {
			if (record?.attributeName === 'class') {
				callback()
				break
			}
		}
	})
	try {
		observer.observe(doc.body, { attributes: true, attributeFilter: ['class'] })
	} catch {
		return () => {}
	}
	return () => {
		try {
			observer.disconnect()
		} catch {
			// Ignore disconnect errors
		}
	}
}

function setupHomeCardGridResizeWatcher(target, callback) {
	if (!target || typeof callback !== 'function') {
		return () => {}
	}
	const { schedule: scheduleWidthCallback, cancel: cancelScheduledWidthCallback } = createResizeObserverScheduler(
		target,
		callback,
	)

	if (typeof ResizeObserver === 'function') {
		let observer = null
		try {
			observer = new ResizeObserver(entries => {
				if (!entries?.length) return
				const entry = entries[entries.length - 1]
				const width = entry?.contentRect?.width
				const borderBoxSize = entry?.borderBoxSize
				if (typeof width === 'number' && Number.isFinite(width)) {
					scheduleWidthCallback(width)
					return
				}
				if (Array.isArray(borderBoxSize) && borderBoxSize.length) {
					const entryWidth = borderBoxSize[borderBoxSize.length - 1]?.inlineSize
					if (typeof entryWidth === 'number' && Number.isFinite(entryWidth)) {
						scheduleWidthCallback(entryWidth)
					}
				}
			})
			observer.observe(target)
		} catch {
			observer = null
		}
		return () => {
			try {
				observer?.disconnect?.()
			} catch {
				// Ignore disconnect errors
			}
			cancelScheduledWidthCallback()
		}
	}

	const handleResize = () => {
		scheduleWidthCallback(target.clientWidth)
	}

	try {
		window?.addEventListener?.('resize', handleResize, { passive: true })
	} catch {
		// Ignore listener errors
	}

	return () => {
		try {
			window?.removeEventListener?.('resize', handleResize)
		} catch {
			// Ignore cleanup errors
		}
		cancelScheduledWidthCallback()
	}
}

function createResizeObserverScheduler(target, callback) {
	let pendingWidth = null
	let pendingFrameId = null
	let usingTimeout = false
	const raf = globalThis?.requestAnimationFrame ?? globalThis?.webkitRequestAnimationFrame
	const cancelRaf = globalThis?.cancelAnimationFrame ?? globalThis?.webkitCancelAnimationFrame

	const flush = () => {
		pendingFrameId = null
		usingTimeout = false
		const width = pendingWidth
		pendingWidth = null
		if (Number.isFinite(width)) {
			callback(width)
		}
	}

	const schedule = width => {
		pendingWidth = Number.isFinite(width) ? width : target?.clientWidth
		if (pendingFrameId !== null) {
			return
		}
		if (typeof raf === 'function') {
			pendingFrameId = raf(flush)
			usingTimeout = false
			return
		}
		const timer = globalThis?.setTimeout
		if (typeof timer === 'function') {
			usingTimeout = true
			pendingFrameId = timer(() => {
				flush()
			}, 16)
		} else {
			flush()
		}
	}

	const cancel = () => {
		if (pendingFrameId === null) {
			return
		}
		if (usingTimeout) {
			try {
				globalThis?.clearTimeout?.(pendingFrameId)
			} catch {
				// Ignore
			}
		} else if (typeof cancelRaf === 'function') {
			try {
				cancelRaf(pendingFrameId)
			} catch {
				// Ignore
			}
		}
		pendingFrameId = null
		usingTimeout = false
		pendingWidth = null
	}

	return { schedule, cancel }
}

function measureHomeCardGridGap(node, fallback = HOME_CARD_GRID_GAP_FALLBACK_PX) {
	if (!node) return fallback
	try {
		const styles = node.ownerDocument?.defaultView?.getComputedStyle?.(node)
		if (!styles) return fallback
		const rawGap = styles.columnGap ?? styles.gridColumnGap ?? styles.gap ?? ''
		const numericGap = Number.parseFloat(rawGap)
		return Number.isFinite(numericGap) && numericGap >= 0 ? numericGap : fallback
	} catch {
		return fallback
	}
}

function roundHomeCardTrackSize(value) {
	if (!Number.isFinite(value)) {
		return value
	}
	const step =
		Number.isFinite(HOME_CARD_GRID_TRACK_ROUNDING_STEP) && HOME_CARD_GRID_TRACK_ROUNDING_STEP > 0
			? HOME_CARD_GRID_TRACK_ROUNDING_STEP
			: 1
	const rounded = Math.round(value / step) * step
	const normalized = Number.isFinite(rounded) ? rounded : value
	if (normalized === 0) return 0
	if (step >= 1) {
		return Math.round(normalized)
	}
	let decimals = 3
	try {
		const stepString = step.toString()
		if (stepString && !stepString.includes('e')) {
			const [, fractional = ''] = stepString.split('.')
			if (fractional) {
				decimals = Math.min(4, fractional.length)
			}
		}
	} catch {
		decimals = 3
	}
	return Number(normalized.toFixed(decimals))
}

function resolveHomeCardGridTrackSize({ containerWidth, desiredColumns, gap, minWidth: minWidthOverride }) {
	const minWidth =
		Number.isFinite(minWidthOverride) && minWidthOverride > 0
			? minWidthOverride
			: Number.isFinite(HOME_CARD_DENSITY_CONFIG?.minWidth) && HOME_CARD_DENSITY_CONFIG.minWidth > 0
				? HOME_CARD_DENSITY_CONFIG.minWidth
				: HOME_CARD_MIN_WIDTH_FALLBACK_PX
	const minColumns =
		Number.isFinite(HOME_CARD_DENSITY_CONFIG?.minColumns) && HOME_CARD_DENSITY_CONFIG.minColumns > 0
			? HOME_CARD_DENSITY_CONFIG.minColumns
			: 1
	const maxColumns =
		Number.isFinite(HOME_CARD_DENSITY_CONFIG?.maxColumns) && HOME_CARD_DENSITY_CONFIG.maxColumns > 0
			? HOME_CARD_DENSITY_CONFIG.maxColumns
			: minColumns
	const safeGap = Number.isFinite(gap) && gap >= 0 ? gap : HOME_CARD_GRID_GAP_FALLBACK_PX
	const safeContainer = Number.isFinite(containerWidth) && containerWidth > 0 ? containerWidth : 0
	const desired = resolveHomeCardColumnCount(desiredColumns)
	const desiredClamped = Math.min(Math.max(desired, minColumns), maxColumns)
	const columnFloor = Math.max(minColumns, 1)
	if (safeContainer <= 0) {
		return {
			trackWidth: minWidth,
			appliedColumns: Math.min(Math.max(desiredClamped, columnFloor), maxColumns),
		}
	}
	const measureForColumns = columns => {
		if (!Number.isFinite(columns) || columns <= 0) return minWidth
		return (safeContainer - safeGap * (columns - 1)) / columns
	}
	let appliedColumns = Math.min(Math.max(desiredClamped, columnFloor), maxColumns)
	let trackWidth = measureForColumns(appliedColumns)
	while (appliedColumns > columnFloor && (!Number.isFinite(trackWidth) || trackWidth < minWidth)) {
		appliedColumns -= 1
		trackWidth = measureForColumns(appliedColumns)
	}
	if (!Number.isFinite(trackWidth) || trackWidth <= 0) {
		trackWidth = minWidth
	}
	if (trackWidth < minWidth) {
		trackWidth = minWidth
	}
	return { trackWidth, appliedColumns }
}
