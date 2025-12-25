import { CFG } from '../../../../state/cfg.js'
import { createStateStore } from '../../../../state/store.js'

const SORT_MODE_WORLD = 'world'
const SORT_MODE_FLAT = 'flat'

function normalizeSortMode(value) {
	return value === SORT_MODE_WORLD ? SORT_MODE_WORLD : SORT_MODE_FLAT
}

export function createLoreState() {
	let sortModeActive = SORT_MODE_FLAT
	let sortModePotential = SORT_MODE_FLAT
	let optCaseSensitive = true
	let optWholeWord = true

	const loreEphemeralState = {
		_lastWord: '',
		_lastFull: '',
	}

	const stateStore = createStateStore({
		key: CFG.storageKey,
		getters: {
			sortModeActive: () => sortModeActive,
			sortModePotential: () => sortModePotential,
			optCaseSensitive: () => optCaseSensitive,
			optWholeWord: () => optWholeWord,
		},
		setters: {
			sortModeActive: value => {
				sortModeActive = normalizeSortMode(value)
			},
			sortModePotential: value => {
				sortModePotential = normalizeSortMode(value)
			},
			optCaseSensitive: value => {
				optCaseSensitive = !!value
			},
			optWholeWord: value => {
				optWholeWord = !!value
			},
		},
	})

	let isRestoringState = true

	function persistState(force = false) {
		if (isRestoringState && !force) return
		stateStore.save()
	}

	async function restorePersistedState() {
		try {
			await stateStore.load()
		} finally {
			isRestoringState = false
			persistState(true)
		}
	}

	const loreState = {
		state: loreEphemeralState,
		getValues: () => ({
			sortModeActive,
			sortModePotential,
			optCaseSensitive,
			optWholeWord,
		}),
		getSortModeActive: () => sortModeActive,
		setSortModeActive: value => {
			sortModeActive = value
		},
		getSortModePotential: () => sortModePotential,
		setSortModePotential: value => {
			sortModePotential = value
		},
		getOptCaseSensitive: () => optCaseSensitive,
		setOptCaseSensitive: value => {
			optCaseSensitive = value
		},
		getOptWholeWord: () => optWholeWord,
		setOptWholeWord: value => {
			optWholeWord = value
		},
	}

	return {
		loreState,
		persistState,
		restorePersistedState,
		stateStore,
	}
}
