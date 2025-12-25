const listeners = new Set()

export const FAVORITE_FILTER_MODES = Object.freeze({
	IGNORE: 'ignore',
	INCLUDE: 'include',
	EXCLUDE: 'exclude',
})

const VALID_FAVORITE_MODES = new Set(Object.values(FAVORITE_FILTER_MODES))

let state = createInitialState()

function createInitialState() {
	return {
		mode: FAVORITE_FILTER_MODES.IGNORE,
	}
}

function normalizeFavoriteFilterMode(value, fallback = FAVORITE_FILTER_MODES.IGNORE) {
	if (typeof value === 'string' && VALID_FAVORITE_MODES.has(value)) {
		return value
	}
	return fallback
}

function emit() {
	for (const listener of listeners) {
		try {
			listener(state)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Favorite filter listener failed.', error)
		}
	}
}

function setState(updater) {
	const nextSlice = typeof updater === 'function' ? updater(state) : updater
	if (!nextSlice) return
	let nextMode = state.mode
	if (typeof nextSlice === 'string') {
		nextMode = normalizeFavoriteFilterMode(nextSlice, nextMode)
	} else if (typeof nextSlice === 'object') {
		if (typeof nextSlice.mode === 'string') {
			nextMode = normalizeFavoriteFilterMode(nextSlice.mode, nextMode)
		} else if ('favoritesOnly' in nextSlice) {
			nextMode = nextSlice.favoritesOnly
				? FAVORITE_FILTER_MODES.INCLUDE
				: FAVORITE_FILTER_MODES.IGNORE
		}
	}
	if (nextMode === state.mode) {
		return
	}
	state = { mode: nextMode }
	emit()
}

export function subscribeHomeFavoriteFilterStore(listener) {
	if (typeof listener !== 'function') {
		return () => {}
	}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function getHomeFavoriteFilterState() {
	return state
}

export function setHomeFavoriteFilterEnabled(enabled) {
	setState({ mode: Boolean(enabled) ? FAVORITE_FILTER_MODES.INCLUDE : FAVORITE_FILTER_MODES.IGNORE })
}

export function toggleHomeFavoriteFilter() {
	setState(prev =>
		prev.mode === FAVORITE_FILTER_MODES.INCLUDE
			? FAVORITE_FILTER_MODES.IGNORE
			: FAVORITE_FILTER_MODES.INCLUDE,
	)
}

export function clearHomeFavoriteFilter() {
	setState({ mode: FAVORITE_FILTER_MODES.IGNORE })
}

export function setHomeFavoriteFilterMode(mode) {
	setState({ mode })
}
