const listeners = new Set()

const HOME_CARD_MIN_WIDTH = 280
const HOME_CARD_MIN_COLUMNS = 2
const HOME_CARD_MAX_COLUMNS = 6
const DEFAULT_COLUMN_COUNT = 4
const STORAGE_KEY = 'astra.home.cardDensity'

const LEGACY_PRESET_WIDTHS = new Map([
	['density-280', 280],
	['density-320', 320],
	['density-360', 360],
	['density-400', 400],
	['density-420', 420],
])

export const HOME_CARD_DENSITY_CONFIG = Object.freeze({
	minWidth: HOME_CARD_MIN_WIDTH,
	minColumns: HOME_CARD_MIN_COLUMNS,
	maxColumns: HOME_CARD_MAX_COLUMNS,
	defaultColumns: DEFAULT_COLUMN_COUNT,
})

let state = {
	columnCount: DEFAULT_COLUMN_COUNT,
}

hydrateStoredDensity()

const emit = () => {
	for (const listener of listeners) {
		try {
			listener(state)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Home card density listener failed.', error)
		}
	}
}

const setState = updater => {
	const nextState = typeof updater === 'function' ? updater(state) : updater
	if (!nextState || typeof nextState !== 'object') return
	const columnCount = resolveHomeCardColumnCount(nextState.columnCount)
	if (!Number.isFinite(columnCount) || columnCount === state.columnCount) return
	state = { columnCount }
	emit()
	persistDensity(state)
}

export function getHomeCardDensityState() {
	return state
}

export function subscribeHomeCardDensityStore(listener) {
	if (typeof listener !== 'function') {
		return () => {}
	}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function setHomeCardDensity(columnCount) {
	const resolvedCount = resolveHomeCardColumnCount(columnCount)
	if (!Number.isFinite(resolvedCount)) return
	setState({ columnCount: resolvedCount })
}

export function resolveHomeCardColumnCount(candidate) {
	const numeric =
		typeof candidate === 'number' ? candidate : Number.parseFloat(typeof candidate === 'string' ? candidate : '')
	if (!Number.isFinite(numeric)) {
		return HOME_CARD_DENSITY_CONFIG.defaultColumns
	}
	const min = Number.isFinite(HOME_CARD_MIN_COLUMNS) ? HOME_CARD_MIN_COLUMNS : 1
	const max = Number.isFinite(HOME_CARD_MAX_COLUMNS) ? HOME_CARD_MAX_COLUMNS : min
	const clamped = Math.min(Math.max(Math.round(numeric), min), max)
	return Number.isFinite(clamped) ? clamped : HOME_CARD_DENSITY_CONFIG.defaultColumns
}

function hydrateStoredDensity() {
	const storage = getLocalStorageHandle()
	if (!storage) return
	try {
		const raw = storage.getItem(STORAGE_KEY)
		if (!raw) return
		const parsed = JSON.parse(raw)
		if (!parsed || typeof parsed !== 'object') return
		if (typeof parsed.columnCount === 'number') {
			state = { columnCount: resolveHomeCardColumnCount(parsed.columnCount) }
			return
		}
		if (typeof parsed.columnWidth === 'number') {
			state = { columnCount: mapLegacyWidthToColumns(parsed.columnWidth) }
			return
		}
		const legacyId = typeof parsed.densityId === 'string' ? parsed.densityId : ''
		if (legacyId && LEGACY_PRESET_WIDTHS.has(legacyId)) {
			const legacyWidth = LEGACY_PRESET_WIDTHS.get(legacyId)
			state = { columnCount: mapLegacyWidthToColumns(legacyWidth) }
		}
	} catch {
		// Ignore malformed data
	}
}

function persistDensity(currentState) {
	const storage = getLocalStorageHandle()
	if (!storage) return
	try {
		storage.setItem(STORAGE_KEY, JSON.stringify({ columnCount: currentState.columnCount }))
	} catch {
		// Ignore quota/privacy errors
	}
}

function mapLegacyWidthToColumns(widthCandidate) {
	const minWidth = Number.isFinite(HOME_CARD_MIN_WIDTH) ? HOME_CARD_MIN_WIDTH : 280
	const maxWidth = 420
	const numeric = Number.parseFloat(widthCandidate)
	if (!Number.isFinite(numeric)) {
		return HOME_CARD_DENSITY_CONFIG.defaultColumns
	}
	const width = Math.min(Math.max(numeric, minWidth), maxWidth)
	const span = maxWidth - minWidth || 1
	const ratio = (width - minWidth) / span
	const inverted = 1 - Math.min(Math.max(ratio, 0), 1)
	const minColumns = Number.isFinite(HOME_CARD_MIN_COLUMNS) ? HOME_CARD_MIN_COLUMNS : 2
	const maxColumns = Number.isFinite(HOME_CARD_MAX_COLUMNS) ? HOME_CARD_MAX_COLUMNS : minColumns
	const mapped = minColumns + (maxColumns - minColumns) * inverted
	return resolveHomeCardColumnCount(mapped)
}

function getLocalStorageHandle() {
	try {
		if (typeof window !== 'undefined' && window?.localStorage) {
			return window.localStorage
		}
	} catch {
		// Ignore
	}
	try {
		if (typeof globalThis !== 'undefined' && globalThis?.localStorage) {
			return globalThis.localStorage
		}
	} catch {
		// Ignore
	}
	return null
}
