const listeners = new Set()

const DEFAULT_STATE = Object.freeze({
	totalCharacters: 0,
	visibleCharacters: 0,
	searchActive: false,
	tagFiltersActive: false,
	favoriteFilterActive: false,
})

let state = createDefaultState()

function createDefaultState() {
	return { ...DEFAULT_STATE }
}

function emit() {
	for (const listener of listeners) {
		try {
			listener(state)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Home browser stats listener failed.', error)
		}
	}
}

function setState(updater) {
	const nextSlice = typeof updater === 'function' ? updater(state) : updater
	if (!nextSlice || typeof nextSlice !== 'object') {
		return
	}
	const nextState = { ...state, ...nextSlice }
	let changed = false
	for (const key of Object.keys(nextState)) {
		if (state[key] !== nextState[key]) {
			changed = true
			break
		}
	}
	if (!changed) {
		return
	}
	state = nextState
	emit()
}

export function subscribeHomeCharacterBrowserStatsStore(listener) {
	if (typeof listener !== 'function') {
		return () => {}
	}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function getHomeCharacterBrowserStats() {
	return state
}

export function setHomeCharacterBrowserStats(nextState) {
	setState(nextState)
}

export function resetHomeCharacterBrowserStats() {
	setState(createDefaultState())
}
