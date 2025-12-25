const listeners = new Set()

const STORAGE_KEY = 'astra.home.cardLayout'

export const HOME_CARD_LAYOUT_IDS = Object.freeze({
	classicPortrait: 'classic-portrait',
	showcase: 'showcase',
})

export const HOME_CARD_LAYOUT_OPTIONS = Object.freeze([
	Object.freeze({
		id: HOME_CARD_LAYOUT_IDS.classicPortrait,
		label: 'Classic Portrait',
		description: '2:3 portrait card (no notes).',
	}),
	Object.freeze({
		id: HOME_CARD_LAYOUT_IDS.showcase,
		label: 'Showcase',
		description: 'Hero cover card with expanded details.',
	}),
])

const HOME_CARD_LAYOUT_LOOKUP = new Set(HOME_CARD_LAYOUT_OPTIONS.map(option => option.id))
const DEFAULT_LAYOUT_ID = HOME_CARD_LAYOUT_IDS.classicPortrait

let state = {
	layoutId: DEFAULT_LAYOUT_ID,
}

hydrateStoredLayout()

const emit = () => {
	for (const listener of listeners) {
		try {
			listener(state)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Home card layout listener failed.', error)
		}
	}
}

const setState = updater => {
	const nextState = typeof updater === 'function' ? updater(state) : updater
	if (!nextState || typeof nextState !== 'object') return
	const layoutId = resolveHomeCardLayoutId(nextState.layoutId)
	if (!layoutId || layoutId === state.layoutId) return
	state = { layoutId }
	emit()
	persistLayout(state)
}

export function getHomeCardLayoutState() {
	return state
}

export function subscribeHomeCardLayoutStore(listener) {
	if (typeof listener !== 'function') {
		return () => {}
	}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function setHomeCardLayout(layoutId) {
	const resolved = resolveHomeCardLayoutId(layoutId)
	if (!resolved) return
	setState({ layoutId: resolved })
}

export function resolveHomeCardLayoutId(candidate) {
	const normalized = typeof candidate === 'string' ? candidate.trim() : ''
	if (normalized && HOME_CARD_LAYOUT_LOOKUP.has(normalized)) {
		return normalized
	}
	return DEFAULT_LAYOUT_ID
}

function hydrateStoredLayout() {
	const storage = getLocalStorageHandle()
	if (!storage) return
	try {
		const raw = storage.getItem(STORAGE_KEY)
		const resolved = resolveHomeCardLayoutId(raw)
		state = { layoutId: resolved }
	} catch {
		// Ignore stored preference failures
	}
}

function persistLayout(currentState) {
	const storage = getLocalStorageHandle()
	if (!storage) return
	try {
		storage.setItem(STORAGE_KEY, currentState.layoutId)
	} catch {
		// Ignore quota/privacy errors
	}
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
