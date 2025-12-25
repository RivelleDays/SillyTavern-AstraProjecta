import { resolveCharacterKey } from '../browser/cards/homeCardData.js'
import { applyHomeTagFilters } from './homeTagFilterStore.js'
import { FAVORITE_FILTER_MODES, getHomeFavoriteFilterState } from './homeFavoriteFilterStore.js'

const listeners = new Set()

const SORT_PREFERENCE_STORAGE_KEY = 'astra.home.searchSortPreferences'

const DEFAULT_SORT_FIELD = 'createdAt'
const DEFAULT_SORT_DIRECTION = 'desc'

const createSortChoice = ({
	id,
	field,
	label,
	defaultDirection = DEFAULT_SORT_DIRECTION,
	directionLabels = {},
	lockedDirection = null,
}) =>
	Object.freeze({
		id,
		field,
		label,
		defaultDirection,
		directionLabels,
		lockedDirection,
	})

export const HOME_CHARACTER_SORT_CHOICES = Object.freeze([
	createSortChoice({
		id: 'name',
		field: 'name',
		label: 'Name',
		defaultDirection: 'desc',
		directionLabels: {
			desc: 'Name (A-Z)',
			asc: 'Name (Z-A)',
		},
	}),
	createSortChoice({
		id: 'createdAt',
		field: 'createdAt',
		label: 'Created',
		defaultDirection: 'desc',
		directionLabels: {
			desc: 'Newest',
			asc: 'Oldest',
		},
	}),
	createSortChoice({
		id: 'favorite',
		field: 'favorite',
		label: 'Favorites',
		defaultDirection: 'desc',
		directionLabels: {
			desc: 'Favorites',
		},
		lockedDirection: 'desc',
	}),
	createSortChoice({
		id: 'lastChat',
		field: 'lastChat',
		label: 'Recent',
		defaultDirection: 'desc',
		directionLabels: {
			desc: 'Recent',
		},
		lockedDirection: 'desc',
	}),
	createSortChoice({
		id: 'chatCount',
		field: 'chatCount',
		label: 'Chat Count',
		defaultDirection: 'desc',
		directionLabels: {
			desc: 'Most Chats',
			asc: 'Least Chats',
		},
	}),
	createSortChoice({
		id: 'tokenCount',
		field: 'tokenCount',
		label: 'Token Count',
		defaultDirection: 'desc',
		directionLabels: {
			desc: 'Most Tokens',
			asc: 'Least Tokens',
		},
	}),
	createSortChoice({
		id: 'random',
		field: 'random',
		label: 'Random',
		defaultDirection: 'desc',
		directionLabels: {
			desc: 'Random',
		},
		lockedDirection: 'desc',
	}),
])

const SORT_CHOICE_LOOKUP = new Map()
const SORT_FIELD_LOOKUP = new Map()

for (const choice of HOME_CHARACTER_SORT_CHOICES) {
	SORT_CHOICE_LOOKUP.set(choice.id, choice)
	SORT_FIELD_LOOKUP.set(choice.field, choice)
}

let state = {
	searchQuery: '',
	searchSortActive: false,
	sortField: DEFAULT_SORT_FIELD,
	sortDirection: DEFAULT_SORT_DIRECTION,
}

hydrateStoredSortPreferences()

const emit = () => {
	for (const listener of listeners) {
		try {
			listener(state)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Home search listener failed.', error)
		}
	}
}

const setState = updater => {
	const nextState = typeof updater === 'function' ? updater(state) : updater
	if (!nextState || typeof nextState !== 'object') return
	let changed = false
	const prevSortField = state.sortField
	const prevSortDirection = state.sortDirection
	const updated = { ...state }
	for (const [key, value] of Object.entries(nextState)) {
		if (updated[key] !== value) {
			updated[key] = value
			changed = true
		}
	}
	if (!changed) return
	state = updated
	emit()
	if (state.sortField !== prevSortField || state.sortDirection !== prevSortDirection) {
		persistSortPreferences(state)
	}
}

export function subscribeHomeCharacterSearchStore(listener) {
	if (typeof listener !== 'function') {
		return () => {}
	}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function getHomeCharacterSearchState() {
	return state
}

export function setHomeCharacterSearchQuery(nextValue) {
	const value = typeof nextValue === 'string' ? nextValue : ''
	const hasQuery = Boolean(value.trim())
	setState({
		searchQuery: value,
		searchSortActive: hasQuery,
	})
}

function getChoiceForField(fieldId) {
	return SORT_FIELD_LOOKUP.get(fieldId) ?? null
}

function getFirstAvailableLabel(choice) {
	if (!choice?.directionLabels) return choice?.label ?? ''
	for (const directionKey of ['asc', 'desc']) {
		if (choice.directionLabels[directionKey]) {
			return choice.directionLabels[directionKey]
		}
	}
	const [fallback] = Object.values(choice.directionLabels)
	return fallback ?? choice?.label ?? ''
}

function resolveChoiceLabel(choice, direction) {
	if (!choice) return ''
	if (choice.lockedDirection) {
		return choice.directionLabels[choice.lockedDirection] ?? choice.label
	}
	if (direction && choice.directionLabels[direction]) {
		return choice.directionLabels[direction]
	}
	return choice.directionLabels[choice.defaultDirection] ?? getFirstAvailableLabel(choice)
}

export function resolveHomeCharacterSortLabel(fieldOrChoice, direction) {
	const choice =
		typeof fieldOrChoice === 'string' ? getChoiceForField(fieldOrChoice) : fieldOrChoice ?? null
	return resolveChoiceLabel(choice, direction)
}

export function setHomeCharacterSortField(fieldId, directionOverride = null) {
	const choice = getChoiceForField(fieldId)
	if (!choice) return
	setState(prev => {
		const update = {
			sortField: fieldId,
		}
		if (choice.lockedDirection) {
			update.sortDirection = choice.lockedDirection
		} else if (
			(directionOverride === 'asc' || directionOverride === 'desc') &&
			choice.directionLabels?.[directionOverride]
		) {
			update.sortDirection = directionOverride
		} else if (prev.sortField !== fieldId) {
			update.sortDirection = choice.defaultDirection ?? DEFAULT_SORT_DIRECTION
		}
		return update
	})
}

export function selectHomeCharacterSortChoice(choiceId, directionOverride = null) {
	const choice = SORT_CHOICE_LOOKUP.get(choiceId)
	if (!choice) return
	const directionToApply =
		choice.lockedDirection ?? (directionOverride === 'asc' || directionOverride === 'desc' ? directionOverride : null)
	setHomeCharacterSortField(choice.field, directionToApply)
}

export function setHomeCharacterSortDirection(direction) {
	if (direction !== 'asc' && direction !== 'desc') return
	const choice = getChoiceForField(state.sortField)
	if (!choice || choice.lockedDirection) return
	if (!choice.directionLabels?.[direction]) return
	setState({ sortDirection: direction })
}

export function toggleHomeCharacterSortDirection() {
	const choice = getChoiceForField(state.sortField)
	if (!choice || choice.lockedDirection) return
	const nextDirection = state.sortDirection === 'asc' ? 'desc' : 'asc'
	if (!choice.directionLabels?.[nextDirection]) return
	setState({ sortDirection: nextDirection })
}

function hydrateStoredSortPreferences() {
	const stored = readStoredSortPreferences()
	if (!stored) return
	const choice = getChoiceForField(stored.sortField)
	if (!choice) return
	state = {
		...state,
		sortField: choice.field,
		sortDirection: resolveStoredSortDirection(choice, stored.sortDirection),
	}
}

function resolveStoredSortDirection(choice, desiredDirection) {
	if (!choice) return DEFAULT_SORT_DIRECTION
	if (choice.lockedDirection) return choice.lockedDirection
	if (desiredDirection && choice.directionLabels?.[desiredDirection]) {
		return desiredDirection
	}
	return choice.defaultDirection ?? DEFAULT_SORT_DIRECTION
}

function readStoredSortPreferences() {
	const storage = getLocalStorageHandle()
	if (!storage) return null
	try {
		const raw = storage.getItem(SORT_PREFERENCE_STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		if (!parsed || typeof parsed !== 'object') return null
		return parsed
	} catch (error) {
		return null
	}
}

function persistSortPreferences(currentState) {
	const storage = getLocalStorageHandle()
	if (!storage) return
	try {
		storage.setItem(
			SORT_PREFERENCE_STORAGE_KEY,
			JSON.stringify({
				sortField: currentState.sortField,
				sortDirection: currentState.sortDirection,
			}),
		)
	} catch (error) {
		// Swallow quota/privacy restriction errors silently
	}
}

function getLocalStorageHandle() {
	try {
		if (typeof window !== 'undefined' && window?.localStorage) {
			return window.localStorage
		}
	} catch (error) {
		return null
	}
	try {
		if (typeof globalThis !== 'undefined' && globalThis?.localStorage) {
			return globalThis.localStorage
		}
	} catch (error) {
		return null
	}
	return null
}

const SEARCH_THRESHOLD = 0.32

const FALLBACK_TEXT_RESOLVERS = Object.freeze({
	name: character => (typeof character?.name === 'string' ? character.name : ''),
	creator: character => {
		const raw = character?.raw ?? {}
		const fromData =
			typeof raw?.data?.creator === 'string' ? raw.data.creator : ''
		if (fromData) return fromData
		return typeof raw?.creator === 'string' ? raw.creator : ''
	},
	creatorNotes: character => {
		const raw = character?.raw ?? {}
		const fromData =
			typeof raw?.data?.creator_notes === 'string'
				? raw.data.creator_notes
				: ''
		if (fromData) return fromData
		const legacy = typeof raw?.creatorcomment === 'string' ? raw.creatorcomment : ''
		return legacy
	},
	description: character => {
		const raw = character?.raw ?? {}
		if (typeof raw?.data?.description === 'string') {
			return raw.data.description
		}
		return typeof raw?.description === 'string' ? raw.description : ''
	},
	personality: character => {
		const raw = character?.raw ?? {}
		if (typeof raw?.data?.personality === 'string') {
			return raw.data.personality
		}
		return typeof raw?.personality === 'string' ? raw.personality : ''
	},
	scenario: character => {
		const raw = character?.raw ?? {}
		if (typeof raw?.data?.scenario === 'string') return raw.data.scenario
		return typeof raw?.scenario === 'string' ? raw.scenario : ''
	},
	tags: character => {
		if (typeof character?.tagSignature === 'string') {
			return character.tagSignature
		}
		if (Array.isArray(character?.tagBadges)) {
			return character.tagBadges.map(tag => tag?.name ?? '').join(' ')
		}
		if (Array.isArray(character?.raw?.tags)) {
			return character.raw.tags.join(' ')
		}
		return ''
	},
})

const SORT_ACCESSORS = Object.freeze({
	name: character => (typeof character?.name === 'string' ? character.name.trim() : ''),
	createdAt: character => {
		const raw = character?.raw ?? {}
		return resolveTimestamp(raw?.create_date ?? raw?.date_added)
	},
	lastChat: character => resolveTimestamp(character?.raw?.date_last_chat),
	chatCount: character => resolveNumber(character?.raw?.chat_size),
	tokenCount: character => resolveNumber(character?.raw?.data_size),
	favorite: character => (character?.isFavorite ? 1 : resolveBoolean(character?.raw?.fav) ? 1 : 0),
})

function resolveTimestamp(value) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}
	if (typeof value === 'string' && value) {
		const numeric = Number(value)
		if (Number.isFinite(numeric)) {
			return numeric
		}
		const parsed = Date.parse(value)
		if (!Number.isNaN(parsed)) {
			return parsed
		}
	}
	return null
}

function resolveNumber(value) {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (typeof value === 'string' && value.trim()) {
		const numeric = Number(value)
		if (Number.isFinite(numeric)) return numeric
	}
	return null
}

function resolveBoolean(value) {
	if (value === true || value === 'true' || value === 1) return true
	if (value === false || value === 'false' || value === 0) return false
	return Boolean(value)
}

const SEARCH_KEY_FALLBACK = character => {
	const segments = []
	for (const resolver of Object.values(FALLBACK_TEXT_RESOLVERS)) {
		const resolved = resolver(character)
		if (typeof resolved === 'string' && resolved) {
			segments.push(resolved)
		}
	}
	return segments.join(' ')
}

function buildFuseDataset(characters) {
	return characters.map(character => ({
		character,
		name: FALLBACK_TEXT_RESOLVERS.name(character),
		creator: FALLBACK_TEXT_RESOLVERS.creator(character),
		creatorNotes: FALLBACK_TEXT_RESOLVERS.creatorNotes(character),
		description: FALLBACK_TEXT_RESOLVERS.description(character),
		personality: FALLBACK_TEXT_RESOLVERS.personality(character),
		scenario: FALLBACK_TEXT_RESOLVERS.scenario(character),
		tags: FALLBACK_TEXT_RESOLVERS.tags(character),
	}))
}

function runFuzzySearch(characters, query) {
	const FuseLib = globalThis?.SillyTavern?.libs?.Fuse ?? globalThis?.Fuse ?? null
	if (!FuseLib) {
		return runFallbackSearch(characters, query)
	}
	const dataset = buildFuseDataset(characters)
	const fuse = new FuseLib(dataset, {
		includeScore: true,
		ignoreLocation: true,
		threshold: SEARCH_THRESHOLD,
		keys: [
			{ name: 'name', weight: 3 },
			{ name: 'creator', weight: 1 },
			{ name: 'creatorNotes', weight: 1 },
			{ name: 'description', weight: 1 },
			{ name: 'scenario', weight: 1 },
			{ name: 'personality', weight: 0.5 },
			{ name: 'tags', weight: 1 },
		],
	})
	const scoreMap = new Map()
	const ordered = fuse.search(query).map((entry, idx) => {
		const key = resolveCharacterKey(entry.item.character) ?? `index-${idx}`
		scoreMap.set(String(key), typeof entry.score === 'number' ? entry.score : idx)
		return entry.item.character
	})
	return {
		characters: ordered,
		scoreMap,
	}
}

function runFallbackSearch(characters, query) {
	const normalized = query.toLowerCase()
	const scoreMap = new Map()
	const matches = []
	characters.forEach((character, index) => {
		const haystack = SEARCH_KEY_FALLBACK(character).toLowerCase()
		if (!haystack || !haystack.includes(normalized)) {
			return
		}
		const key = resolveCharacterKey(character) ?? `index-${index}`
		scoreMap.set(String(key), index)
		matches.push(character)
	})
	return {
		characters: matches,
		scoreMap,
	}
}

function getSearchScore(scoreMap, character, fallback) {
	if (!scoreMap) return fallback
	const key = resolveCharacterKey(character)
	if (key && scoreMap.has(String(key))) {
		return scoreMap.get(String(key))
	}
	return fallback
}

function sortByDescriptor(characters, fieldId, direction) {
	if (!fieldId) return characters.slice()
	const accessor = SORT_ACCESSORS[fieldId]
	if (typeof accessor !== 'function') {
		return characters.slice()
	}
	const factor = resolveSortFactor(fieldId, direction)
	return characters.slice().sort((a, b) => {
		const result = compareValues(accessor(a), accessor(b))
		return result * factor
	})
}

function resolveSortFactor(fieldId, direction) {
	if (fieldId === 'name') {
		return direction === 'asc' ? -1 : 1
	}
	return direction === 'asc' ? 1 : -1
}

function sortBySearchScore(characters, scoreMap) {
	return characters.slice().sort((a, b) => {
		const aScore = getSearchScore(scoreMap, a, Number.POSITIVE_INFINITY)
		const bScore = getSearchScore(scoreMap, b, Number.POSITIVE_INFINITY)
		return aScore - bScore
	})
}

function compareValues(aValue, bValue) {
	const aMissing =
		aValue === null || aValue === undefined || (typeof aValue === 'string' && !aValue.trim())
	const bMissing =
		bValue === null || bValue === undefined || (typeof bValue === 'string' && !bValue.trim())
	if (aMissing && bMissing) return 0
	if (aMissing) return 1
	if (bMissing) return -1
	if (typeof aValue === 'string' || typeof bValue === 'string') {
		return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' })
	}
	const aNumeric = Number(aValue)
	const bNumeric = Number(bValue)
	if (Number.isFinite(aNumeric) && Number.isFinite(bNumeric)) {
		if (aNumeric === bNumeric) return 0
		return aNumeric > bNumeric ? 1 : -1
	}
	return 0
}

function sortRandomly(characters) {
	const cloned = characters.slice()
	for (let index = cloned.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1))
		const temp = cloned[index]
		cloned[index] = cloned[swapIndex]
		cloned[swapIndex] = temp
	}
	return cloned
}

export function applyHomeCharacterSearch({ characters = [] } = {}) {
	const currentState = getHomeCharacterSearchState()
	const hasQuery = Boolean(currentState.searchQuery.trim())
	let workingCharacters = characters.slice()
	let scoreMap = null

	if (hasQuery) {
		const searchOutcome = runFuzzySearch(characters, currentState.searchQuery.trim())
		workingCharacters = searchOutcome.characters
		scoreMap = searchOutcome.scoreMap
	}

	const shouldUseSearchSort = hasQuery && currentState.searchSortActive

	const tagFilterOutcome = applyHomeTagFilters({ characters: workingCharacters })
	workingCharacters = tagFilterOutcome.characters
	const tagFiltersActive = Boolean(tagFilterOutcome?.metadata?.filtersApplied)

	const favoriteFilterState = getHomeFavoriteFilterState()
	const favoriteFilterMode = favoriteFilterState?.mode ?? FAVORITE_FILTER_MODES.IGNORE
	const favoriteFiltersActive = favoriteFilterMode !== FAVORITE_FILTER_MODES.IGNORE
	if (favoriteFilterMode === FAVORITE_FILTER_MODES.INCLUDE) {
		workingCharacters = workingCharacters.filter(character => isFavoriteCharacter(character))
	} else if (favoriteFilterMode === FAVORITE_FILTER_MODES.EXCLUDE) {
		workingCharacters = workingCharacters.filter(character => !isFavoriteCharacter(character))
	}

	let sortedCharacters = []
	if (shouldUseSearchSort) {
		sortedCharacters = sortBySearchScore(workingCharacters, scoreMap)
	} else if (currentState.sortField === 'random') {
		sortedCharacters = sortRandomly(workingCharacters)
	} else {
		sortedCharacters = sortByDescriptor(workingCharacters, currentState.sortField, currentState.sortDirection)
	}

	return {
		characters: sortedCharacters,
		metadata: {
			searchActive: hasQuery,
			searchApplied: shouldUseSearchSort,
			tagFiltersActive,
			favoriteFiltersActive,
		},
	}
}

function isFavoriteCharacter(character) {
	return Boolean(character?.isFavorite || resolveBoolean(character?.raw?.fav))
}
