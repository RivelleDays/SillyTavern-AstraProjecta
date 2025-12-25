import { resolveContext } from '@/astra/shared/characters/characterData.js'

const listeners = new Set()

const DEFAULT_STATE = Object.freeze({
	status: 'idle',
	entityKey: '',
	entityType: '',
	displayName: '',
	avatarUrl: '',
	source: '',
	routeView: '',
	data: null,
	error: '',
	isEditing: false,
	isDirty: false,
	isSaving: false,
})

let state = { ...DEFAULT_STATE }
let deps = {}
let requestToken = 0
const MAX_RETRIES = 20
const RETRY_DELAY_MS = 200

function emit() {
	for (const listener of listeners) {
		try {
			listener({ ...state })
		} catch (error) {
			console?.warn?.('[AstraProjecta] Home entity store listener failed.', error)
		}
	}
}

function setState(partial = {}) {
	const next = { ...state, ...partial }
	let changed = false
	for (const key of Object.keys(next)) {
		if (next[key] !== state[key]) {
			changed = true
			break
		}
	}
	if (!changed) return state
	state = next
	emit()
	return state
}

export function initializeHomeEntityStore(options = {}) {
	deps = options
	return getHomeEntityState()
}

export function getHomeEntityState() {
	return { ...state }
}

export function subscribeHomeEntityStore(listener) {
	if (typeof listener !== 'function') return () => {}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function resetHomeEntityStore() {
	requestToken += 1
	state = { ...DEFAULT_STATE }
	emit()
}

export function setHomeEntityEditing(isEditing) {
	const nextEditing = Boolean(isEditing)
	const next = { isEditing: nextEditing }
	if (!nextEditing) {
		next.isDirty = false
		next.isSaving = false
	}
	setState(next)
}

export function toggleHomeEntityEditing() {
	setState({ isEditing: !state.isEditing })
}

export function setHomeEntityDirty(isDirty) {
	setState({ isDirty: Boolean(isDirty) })
}

export function setHomeEntitySaving(isSaving) {
	setState({ isSaving: Boolean(isSaving) })
}

export function setHomeEntityRoute(route = {}) {
	const normalized = normalizeRoute(route)
	if (!normalized) {
		resetHomeEntityStore()
		return
	}

	const isSameEntity =
		state.entityKey === normalized.entityKey && state.entityType === normalized.entityType

	setState({
		routeView: normalized.view,
		entityKey: normalized.entityKey,
		entityType: normalized.entityType,
		displayName: normalized.displayName,
		avatarUrl: normalized.avatarUrl,
		source: normalized.source,
	})

	if (!isSameEntity || state.status === 'error') {
		void loadEntity(normalized)
	}
}

export async function refreshHomeEntity() {
	if (!state.entityKey || state.routeView !== 'entity') return
	const route = {
		view: 'entity',
		entityKey: state.entityKey,
		entityType: state.entityType,
		displayName: state.displayName,
		avatarUrl: state.avatarUrl,
		source: state.source,
	}
	await loadEntity(route)
}

function normalizeRoute(route = {}) {
	if (route?.view !== 'entity') return null
	const entityKey =
		route?.entityKey !== undefined && route?.entityKey !== null
			? String(route.entityKey)
			: ''
	if (!entityKey) return null

	return {
		view: 'entity',
		entityKey,
		entityType: route?.entityType === 'group' ? 'group' : 'character',
		displayName: typeof route?.displayName === 'string' ? route.displayName : '',
		avatarUrl: typeof route?.avatarUrl === 'string' ? route.avatarUrl : '',
		source: typeof route?.source === 'string' ? route.source : '',
	}
}

function resolveRequestHeaders(options = {}) {
	const context = resolveContext(deps?.getContext)
	const getter =
		typeof deps?.getRequestHeaders === 'function'
			? deps.getRequestHeaders
			: context?.getRequestHeaders
	if (typeof getter === 'function') {
		return getter(options) ?? {}
	}
	if (options?.omitContentType) return {}
	return { 'Content-Type': 'application/json' }
}

function parseEntityKey(entityKey = '') {
	if (typeof entityKey !== 'string') return { type: 'unknown', value: '' }
	if (entityKey.startsWith('avatar:')) return { type: 'avatar', value: entityKey.slice('avatar:'.length) }
	if (entityKey.startsWith('avatar-url:')) return { type: 'avatar-url', value: entityKey.slice('avatar-url:'.length) }
	if (entityKey.startsWith('name:')) return { type: 'name', value: entityKey.slice('name:'.length) }
	const numeric = Number(entityKey)
	if (Number.isFinite(numeric)) return { type: 'id', value: numeric }
	return { type: 'raw', value: entityKey }
}

function findCharacterByKey(route, context) {
	const characters =
		Array.isArray(context?.characters) && context.characters.length ? context.characters : []
	const parsed = parseEntityKey(route.entityKey)

	if (parsed.type === 'id' && characters[parsed.value]) {
		return { character: characters[parsed.value], id: parsed.value }
	}

	const matchAvatar = value =>
		value &&
		characters.find(
			entry =>
				entry?.avatar === value ||
				entry?.avatar_id === value ||
				entry?.avatar_url === value ||
				entry?.avatarUrl === value,
		)

	if (parsed.type === 'avatar') {
		const found = matchAvatar(parsed.value)
		if (found) return { character: found, id: characters.indexOf(found) }
	}

	if (parsed.type === 'avatar-url') {
		const found = matchAvatar(parsed.value) || matchAvatar(route.avatarUrl)
		if (found) return { character: found, id: characters.indexOf(found) }
	}

	if (parsed.type === 'name') {
		const found =
			characters.find(entry => typeof entry?.name === 'string' && entry.name.trim() === parsed.value.trim()) ||
			null
		if (found) return { character: found, id: characters.indexOf(found) }
	}

	// Raw fallback: try matching avatar url, then name
	const fallbackAvatar = matchAvatar(route.entityKey) || matchAvatar(route.avatarUrl)
	if (fallbackAvatar) {
		return { character: fallbackAvatar, id: characters.indexOf(fallbackAvatar) }
	}

	const fallbackName = characters.find(entry => typeof entry?.name === 'string' && entry.name.trim() === route.displayName?.trim())
	if (fallbackName) {
		return { character: fallbackName, id: characters.indexOf(fallbackName) }
	}

	return { character: null, id: null }
}

async function loadEntity(route, attempt = 0) {
	const context = resolveContext(deps?.getContext)
	const currentToken = ++requestToken

	setState({
		status: 'loading',
		data: null,
		error: '',
		isEditing: false,
		isDirty: false,
		isSaving: false,
		entityKey: route.entityKey,
		entityType: route.entityType,
		displayName: route.displayName,
		avatarUrl: route.avatarUrl,
		source: route.source,
		routeView: 'entity',
	})

	if (!context) {
		if (currentToken !== requestToken) return
		setState({ status: 'error', error: 'Context unavailable.' })
		return
	}

	const charactersReady = Array.isArray(context?.characters) && context.characters.length
	if (!charactersReady) {
		if (attempt >= MAX_RETRIES) {
			if (currentToken !== requestToken) return
			setState({ status: 'error', error: 'Character not found.' })
			return
		}
		setTimeout(() => {
			if (currentToken !== requestToken) return
			void loadEntity(route, attempt + 1)
		}, RETRY_DELAY_MS + attempt * 50)
		return
	}

	const { character, id } = findCharacterByKey(route, context)
	if (!character) {
		if (attempt >= MAX_RETRIES) {
			if (currentToken !== requestToken) return
			setState({ status: 'error', error: 'Character not found.' })
			return
		}
		setTimeout(() => {
			if (currentToken !== requestToken) return
			void loadEntity(route, attempt + 1)
		}, RETRY_DELAY_MS + attempt * 50)
		return
	}

	let hydrated = character
	try {
		const full = await fetchCharacterDetails(character, {
			headers: resolveRequestHeaders(),
			entityKey: route.entityKey,
		})
		if (full) {
			hydrated = { ...character, ...full }
		}
	} catch (error) {
		console?.warn?.('[AstraProjecta] Failed to fetch full character.', error)
	}

	if (currentToken !== requestToken) return

	setState({
		status: 'ready',
		data: {
			character: hydrated,
			characterId: id,
		},
		error: '',
	})
}

async function fetchCharacterDetails(character, options = {}) {
	const headers = options?.headers ?? resolveRequestHeaders()

	const avatarUrl =
		typeof character?.avatar_url === 'string' && character.avatar_url.trim()
			? character.avatar_url
			: typeof character?.avatarUrl === 'string' && character.avatarUrl.trim()
				? character.avatarUrl
				: typeof character?.avatar === 'string'
					? character.avatar
					: ''

	const payload = {}
	if (avatarUrl) {
		payload.avatar_url = avatarUrl
		payload.avatar = avatarUrl
	} else if (typeof character?.avatar === 'string' && character.avatar.trim()) {
		payload.avatar = character.avatar
	}

	if (character?.id !== undefined && character?.id !== null) {
		payload.id = character.id
	}

	if (!payload.avatar_url && !payload.avatar && typeof character?.name === 'string' && character.name.trim()) {
		payload.name = character.name
	}

	if (!Object.keys(payload).length) {
		return null
	}

	try {
		const response = await fetch('/api/characters/get', {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
		})

		if (!response.ok) {
			console?.warn?.(
				'[AstraProjecta] Character details request failed.',
				response.status,
				response.statusText,
			)
			return null
		}

		const data = await response.json()
		if (!data) return null
		if (data?.character) return data.character
		return data
	} catch (error) {
		console?.warn?.('[AstraProjecta] Failed to fetch character details.', error)
		return null
	}
}
