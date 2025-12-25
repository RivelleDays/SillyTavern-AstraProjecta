const listeners = new Set()

const EMPTY_STATE = Object.freeze({
	selected: [],
	excluded: [],
})

const TAG_FILTER_TYPE = 'tag'

let cachedState = EMPTY_STATE
let patchApplied = false

function getFilterHandle() {
	if (globalThis?.entitiesFilter) return globalThis.entitiesFilter
	const ctx = typeof globalThis?.SillyTavern?.getContext === 'function' ? globalThis.SillyTavern.getContext() : null
	if (ctx?.entitiesFilter) return ctx.entitiesFilter
	return null
}

function readCurrentState() {
	const handle = getFilterHandle()
	if (handle?.getFilterData) {
		return readHandleState(handle)
	}
	return cachedState
}

cachedState = readCurrentState()

function readHandleState(handle) {
	try {
		const data = handle.getFilterData(TAG_FILTER_TYPE) ?? {}
		return {
			selected: normalizeTagIds(data.selected),
			excluded: normalizeTagIds(data.excluded),
		}
	} catch (error) {
		console?.warn?.('[AstraProjecta] Failed to read tag filters.', error)
		return EMPTY_STATE
	}
}

function normalizeTagIds(candidates) {
	if (!Array.isArray(candidates)) return []
	const seen = new Set()
	const normalized = []
	for (const value of candidates) {
		const key = typeof value === 'string' ? value.trim() : Number.isFinite(value) ? String(value) : ''
		if (!key || seen.has(key)) continue
		seen.add(key)
		normalized.push(key)
	}
	return normalized
}

function ensurePatchedHandle() {
	if (patchApplied) return
	const handle = getFilterHandle()
	if (!handle || typeof handle.setFilterData !== 'function') return
	const original = handle.setFilterData
	handle.setFilterData = function patchedSetFilterData(filterType, data, suppressDataChanged = false) {
		const result = original.call(this, filterType, data, suppressDataChanged)
		if (filterType === TAG_FILTER_TYPE) {
			updateCachedState()
		}
		return result
	}
	patchApplied = true
	const handleState = readHandleState(handle)
	if (haveStatesChanged(cachedState, handleState)) {
		cachedState = handleState
		emit()
	}
}

function updateCachedState() {
	const nextState = readCurrentState()
	if (!haveStatesChanged(cachedState, nextState)) return
	cachedState = nextState
	emit()
}

function haveStatesChanged(prev, next) {
	if (prev === next) return false
	if (!prev || !next) return true
	if (prev.selected.length !== next.selected.length || prev.excluded.length !== next.excluded.length) {
		return true
	}
	for (let index = 0; index < prev.selected.length; index += 1) {
		if (prev.selected[index] !== next.selected[index]) {
			return true
		}
	}
	for (let index = 0; index < prev.excluded.length; index += 1) {
		if (prev.excluded[index] !== next.excluded[index]) {
			return true
		}
	}
	return false
}

function emit() {
	for (const listener of listeners) {
		try {
			listener(cachedState)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Home tag filter listener failed.', error)
		}
	}
}

function applyTagFilterState(updater) {
	ensurePatchedHandle()
	const handle = getFilterHandle()
	const currentState = handle?.getFilterData ? readHandleState(handle) : cachedState
	const nextState = typeof updater === 'function' ? updater(currentState) : updater
	if (!nextState || typeof nextState !== 'object') return
	const normalizedState = {
		selected: normalizeTagIds(nextState.selected),
		excluded: normalizeTagIds(nextState.excluded),
	}
	if (handle?.setFilterData) {
		handle.setFilterData(TAG_FILTER_TYPE, normalizedState)
		return
	}
	cachedState = normalizedState
	emit()
}

export function getHomeTagFilterState() {
	ensurePatchedHandle()
	return cachedState
}

export function subscribeHomeTagFiltersStore(listener) {
	ensurePatchedHandle()
	if (typeof listener !== 'function') {
		return () => {}
	}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function cycleHomeTagFilter(tagId) {
	const key = typeof tagId === 'string' ? tagId : Number.isFinite(tagId) ? String(tagId) : ''
	if (!key) return
	applyTagFilterState(state => {
		const isSelected = state.selected.includes(key)
		const isExcluded = state.excluded.includes(key)
		if (!isSelected && !isExcluded) {
			return {
				selected: [...state.selected, key],
				excluded: state.excluded,
			}
		}
		if (isSelected) {
			return {
				selected: state.selected.filter(id => id !== key),
				excluded: [...state.excluded, key],
			}
		}
		return {
			selected: state.selected,
			excluded: state.excluded.filter(id => id !== key),
		}
	})
}

export function setHomeTagFilterState(tagId, nextState) {
	const key = typeof tagId === 'string' ? tagId : Number.isFinite(tagId) ? String(tagId) : ''
	if (!key) return
	const normalizedNextState = nextState === 'include' ? 'include' : nextState === 'exclude' ? 'exclude' : 'ignore'
	applyTagFilterState(state => {
		const isSelected = state.selected.includes(key)
		const isExcluded = state.excluded.includes(key)

		if (
			(normalizedNextState === 'include' && isSelected && !isExcluded) ||
			(normalizedNextState === 'exclude' && isExcluded && !isSelected) ||
			(normalizedNextState === 'ignore' && !isSelected && !isExcluded)
		) {
			return state
		}

		if (normalizedNextState === 'include') {
			return {
				selected: [...state.selected.filter(id => id !== key), key],
				excluded: state.excluded.filter(id => id !== key),
			}
		}

		if (normalizedNextState === 'exclude') {
			return {
				selected: state.selected.filter(id => id !== key),
				excluded: [...state.excluded.filter(id => id !== key), key],
			}
		}

		return {
			selected: state.selected.filter(id => id !== key),
			excluded: state.excluded.filter(id => id !== key),
		}
	})
}

export function clearHomeTagFilters() {
	applyTagFilterState({ selected: [], excluded: [] })
}


export function applyHomeTagFilters({ characters = [] } = {}) {
	const handle = getFilterHandle()
	const state = getHomeTagFilterState()
	const hasFilters = Boolean(state.selected.length || state.excluded.length)
	if (!hasFilters) {
		return {
			characters: characters.slice(),
			metadata: {
				filtersApplied: false,
			},
		}
	}
	const filtered = characters.filter(character =>
		characterMatchesTagFilters(character, state, handle),
	)
	return {
		characters: filtered,
		metadata: {
			filtersApplied: true,
		},
	}
}

function characterMatchesTagFilters(character, state, handle) {
	if (!character) return false
	const entity = {
		type: 'character',
		item: {
			avatar: resolveAvatarKey(character),
		},
		id: character?.id ?? '',
	}
	const hasTag = handle?.isElementTagged
		? tagId => handle.isElementTagged(entity, tagId)
		: tagId => characterHasTagLocally(character, tagId)
	if (state.excluded.some(hasTag)) {
		return false
	}
	if (state.selected.length === 0) {
		return true
	}
	return state.selected.every(hasTag)
}

function characterHasTagLocally(character, tagId) {
	const normalizedId = normalizeTagId(tagId)
	if (!normalizedId) return false
	const badges = Array.isArray(character?.tagBadges) ? character.tagBadges : []
	for (const badge of badges) {
		const badgeId = normalizeTagId(badge?.id)
		if (badgeId && badgeId === normalizedId) {
			return true
		}
	}
	return false
}

function normalizeTagId(candidate) {
	if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
	if (Number.isFinite(candidate)) return String(candidate)
	return ''
}

function resolveAvatarKey(character) {
	if (typeof character?.avatarId === 'string' && character.avatarId) return character.avatarId
	if (typeof character?.raw?.avatar === 'string' && character.raw.avatar) return character.raw.avatar
	if (typeof character?.raw?.avatar_url === 'string' && character.raw.avatar_url) return character.raw.avatar_url
	return ''
}
