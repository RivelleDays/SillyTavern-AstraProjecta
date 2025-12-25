import { parseThumbnailUrl } from '@/astra/utils/avatarSources.js'

const CHARACTER_STATS_ENDPOINT = '/api/stats/get'
const CHARACTER_STATS_CACHE_TTL = 5_000

const CHARACTER_STATS_CACHE = {
	data: null,
	timestamp: 0,
	inFlight: null,
}

export const CHARACTER_REFRESH_EVENT_KEYS = [
	'APP_READY',
	'EXTENSIONS_FIRST_LOAD',
	'SETTINGS_LOADED',
	'SETTINGS_UPDATED',
	'CHARACTER_PAGE_LOADED',
	'CHARACTER_EDITED',
	'CHARACTER_DUPLICATED',
	'CHARACTER_DELETED',
	'CHARACTER_RENAMED',
	'CHARACTER_RENAMED_IN_PAST_CHAT',
	'CHAT_CHANGED',
]

export function resolveContext(getContext) {
	if (typeof getContext === 'function') {
		try {
			const ctx = getContext()
			if (ctx) return ctx
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to obtain SillyTavern context from deps.', error)
		}
	}

	if (typeof globalThis?.SillyTavern?.getContext === 'function') {
		try {
			const ctx = globalThis.SillyTavern.getContext()
			if (ctx) return ctx
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to resolve SillyTavern context.', error)
		}
	}

	return null
}

export function collectCharacters(context, options = {}) {
	const resolveTags =
		typeof options?.resolveTags === 'function' ? options.resolveTags : null
	const computeTagSignature =
		typeof options?.computeTagSignature === 'function'
			? options.computeTagSignature
			: null

	const fromContext = Array.isArray(context?.characters) ? context.characters : null
	const fromGlobal =
		typeof globalThis !== 'undefined' && Array.isArray(globalThis.characters)
			? globalThis.characters
			: null

	const source = fromContext ?? fromGlobal ?? []

	return source.map((item, index) => {
		const safeItem = item ?? {}
		const avatarId = getAvatarKeyFromCharacter(safeItem, source)
		const version =
			typeof safeItem?.data?.character_version === 'string'
				? safeItem.data.character_version.trim()
				: ''
		const isFavorite =
			safeItem.fav === true || safeItem.fav === 'true' || safeItem.fav === 1
		const resolvedTags = resolveTags
			? resolveTags({ raw: safeItem, avatarId, index, context })
			: []
		const resolvedSignature = computeTagSignature
			? computeTagSignature({
					raw: safeItem,
					avatarId,
					index,
					tags: resolvedTags,
					context,
				})
			: ''

		return {
			id: index,
			name: resolveCharacterName(safeItem.name, index),
			avatarId,
			version,
			isFavorite,
			raw: safeItem,
			tagBadges: Array.isArray(resolvedTags) ? resolvedTags : [],
			tagSignature:
				typeof resolvedSignature === 'string' ? resolvedSignature : '',
		}
	})
}

export function createCharacterTagsResolver({ context } = {}) {
	const tagRegistry = resolveTagRegistry(context)
	const tagMap = resolveTagMap(context)
	const characterList = resolveCharacterList(context)

	const tagsById = new Map()
	const tagsByName = new Map()

	for (const tag of tagRegistry) {
		const normalized = normalizeTagForDisplay(tag)
		if (!normalized) continue
		if (normalized.id) {
			tagsById.set(normalized.id, tag)
		}
		const nameKey = normalized.name.toLowerCase()
		if (nameKey) {
			tagsByName.set(nameKey, tag)
		}
	}

	const resolveTags = (input = {}) => {
		const raw = input?.raw && typeof input.raw === 'object' ? input.raw : null
		const avatarId =
			typeof input?.avatarId === 'string' && input.avatarId
				? input.avatarId
				: getAvatarKeyFromCharacter(input, characterList) ||
					getAvatarKeyFromCharacter(raw, characterList)

		const fromMapRaw = collectTagsFromMap(avatarId)
		const fromMap = Array.isArray(fromMapRaw) ? fromMapRaw : []
		const fromRaw = collectTagsFromRaw(raw)

		const combined = []
		const seen = new Set()

		const pushTag = tagCandidate => {
			const normalized = normalizeTagForDisplay(tagCandidate)
			if (!normalized || normalized.isHidden) return
			const { isHidden, ...rest } = normalized
			const key =
				rest.id && typeof rest.id === 'string'
					? `id:${rest.id}`
					: `name:${rest.name.toLowerCase()}`
			if (key && seen.has(key)) return
			if (key) seen.add(key)
			combined.push(rest)
		}

		for (const tag of fromMap) {
			pushTag(tag)
		}

		for (const name of fromRaw) {
			const lookup =
				typeof name === 'string' && name
					? tagsByName.get(name.toLowerCase()) ?? { name }
					: null
			if (lookup) pushTag(lookup)
		}

		combined.sort(compareTagsForCard)
		return combined
	}

	const getSignature = (input = {}) => {
		const referenceTags = Array.isArray(input?.tags)
			? input.tags
			: resolveTags(input)
		return buildCharacterTagSignature(referenceTags)
	}

	const collectTagsFromMap = key => {
		if (!key || typeof key !== 'string' || !tagMap) return []
		const ids = Array.isArray(tagMap[key]) ? tagMap[key] : []
		if (!ids.length) return []
		return ids
			.map(id => {
				if (typeof id !== 'string' && !Number.isFinite(id)) return null
				const lookupKey = typeof id === 'string' ? id : String(id)
				return tagsById.get(lookupKey) ?? null
			})
			.filter(Boolean)
	}

	return {
		resolveTags,
		getSignature,
	}
}

export function resolveCurrentCharacterId(context) {
	const candidate = context?.characterId ?? context?.character_id
	const numeric = parseMaybeInt(candidate)
	if (numeric !== null) return numeric

	const globalCandidate =
		typeof globalThis !== 'undefined'
			? globalThis.this_chid ?? globalThis.characterId ?? null
			: null
	return parseMaybeInt(globalCandidate)
}

export async function getCharacterStats({ deps, context } = {}) {
	const now = Date.now()
	if (
		CHARACTER_STATS_CACHE.data &&
		now - CHARACTER_STATS_CACHE.timestamp < CHARACTER_STATS_CACHE_TTL
	) {
		return CHARACTER_STATS_CACHE.data
	}

	if (CHARACTER_STATS_CACHE.inFlight) {
		return CHARACTER_STATS_CACHE.inFlight
	}

	const fetchPromise = requestCharacterStats({ deps, context })
		.then(stats => {
			CHARACTER_STATS_CACHE.data = stats
			CHARACTER_STATS_CACHE.timestamp = Date.now()
			return stats
		})
		.catch(error => {
			console?.warn?.('[AstraProjecta] Failed to load character stats.', error)
			return null
		})
		.finally(() => {
			CHARACTER_STATS_CACHE.inFlight = null
		})

	CHARACTER_STATS_CACHE.inFlight = fetchPromise
	return fetchPromise
}

export function createCharacterStatsLookup(stats) {
	if (!stats || typeof stats !== 'object') return null

	const map = new Map()

	for (const [key, value] of Object.entries(stats)) {
		if (!key || !value || typeof value !== 'object') continue
		map.set(String(key), value)
	}

	return map.size ? map : null
}

export function resolveCharacterStatsEntry(character, statsLookup) {
	if (!character || !statsLookup) return null

	const key = resolveCharacterStatsKey(character)
	if (!key) return null

	return statsLookup.get(key) ?? null
}

export function computeTotalMessages(statsEntry) {
	if (!statsEntry || typeof statsEntry !== 'object') return null

	const userCount = toNumber(statsEntry.user_msg_count)
	const characterCountRaw = toNumber(statsEntry.non_user_msg_count)
	const swipeCount = toNumber(statsEntry.total_swipe_count)

	const characterCount = Math.max(0, characterCountRaw - swipeCount)
	const total = userCount + characterCount

	if (!Number.isFinite(total)) return null
	return total
}

export function registerCharacterEventListeners({ deps, handler } = {}) {
	const eventSource = resolveEventSource(deps)
	const eventTypes = resolveEventTypes(deps)

	if (!eventSource || typeof eventSource.on !== 'function') return null
	if (!eventTypes) return null

	const events = CHARACTER_REFRESH_EVENT_KEYS.map(key => eventTypes[key]).filter(Boolean)
	if (!events.length) return null

	events.forEach(name => eventSource.on(name, handler))

	return () => {
		if (typeof eventSource.removeListener !== 'function') return
		events.forEach(name => eventSource.removeListener(name, handler))
	}
}

export function createCharacterRefreshScheduler(handler) {
	let pending = null
	const hasRaf = typeof globalThis?.requestAnimationFrame === 'function'
	const raf = hasRaf ? globalThis.requestAnimationFrame.bind(globalThis) : null
	const cancelRaf =
		hasRaf && typeof globalThis?.cancelAnimationFrame === 'function'
			? globalThis.cancelAnimationFrame.bind(globalThis)
			: null

	function schedule() {
		if (pending !== null) return
		if (raf) {
			pending = raf(() => {
				pending = null
				handler()
			})
			return
		}

		pending = setTimeout(() => {
			pending = null
			handler()
		}, 16)
	}

	schedule.cancel = () => {
		if (pending === null) return
		if (raf && cancelRaf) {
			cancelRaf(pending)
		} else {
			clearTimeout(pending)
		}
		pending = null
	}

	return schedule
}

function resolveTagRegistry(context) {
	if (Array.isArray(context?.tags)) return context.tags
	if (typeof globalThis !== 'undefined') {
		if (Array.isArray(globalThis.tags)) return globalThis.tags
		if (
			globalThis.SillyTavern &&
			typeof globalThis.SillyTavern.getContext === 'function'
		) {
			const ctx = globalThis.SillyTavern.getContext()
			if (Array.isArray(ctx?.tags)) return ctx.tags
		}
	}
	return []
}

function resolveTagMap(context) {
	const candidate =
		(context && typeof context === 'object' && (context.tagMap ?? context.tag_map)) ||
		(typeof globalThis !== 'undefined' && (globalThis.tag_map ?? null)) ||
		null

	if (candidate && typeof candidate === 'object') {
		return candidate
	}
	return null
}

function resolveCharacterList(context) {
	if (Array.isArray(context?.characters)) return context.characters
	if (typeof globalThis !== 'undefined' && Array.isArray(globalThis.characters)) {
		return globalThis.characters
	}
	return []
}

function collectTagsFromRaw(raw) {
	if (!raw || typeof raw !== 'object') return []
	const source = Array.isArray(raw.tags) ? raw.tags : []
	return source
		.map(value => (typeof value === 'string' ? value.trim() : ''))
		.filter(Boolean)
}

function normalizeAvatarKey(value) {
	if (typeof value !== 'string') return ''
	const trimmed = value.trim()
	if (!trimmed) return ''

	const parsed = parseThumbnailUrl(trimmed)
	if (parsed?.file) {
		const decoded = decodeURIComponent(parsed.file)
		return decoded.replace(/^\/+/, '')
	}

	return trimmed
}

function getAvatarKeyFromCharacter(candidate, fallbackList = []) {
	if (!candidate || typeof candidate !== 'object') return ''

	const directCandidates = [
		candidate?.avatarId,
		candidate?.avatar_id,
		candidate?.avatar,
		candidate?.avatar_url,
		candidate?.avatarUrl,
		candidate?.raw?.avatar_id,
		candidate?.raw?.avatar,
		candidate?.raw?.avatar_url,
	]

	for (const entry of directCandidates) {
		const normalized = normalizeAvatarKey(entry)
		if (normalized) return normalized
	}

	const numericId = parseMaybeInt(candidate?.id)
	if (numericId !== null && Array.isArray(fallbackList) && fallbackList[numericId]) {
		const entry = fallbackList[numericId]
		const fallbackCandidates = [
			entry.avatar,
			entry.avatar_id,
			entry.avatar_url,
			entry.avatarUrl,
			entry.avatarId,
		]
		for (const item of fallbackCandidates) {
			const normalized = normalizeAvatarKey(item)
			if (normalized) return normalized
		}
	}

	return ''
}

function normalizeTagForDisplay(tag) {
	if (!tag || typeof tag !== 'object') return null

	const name =
		typeof tag.name === 'string' && tag.name.trim() ? tag.name.trim() : ''
	if (!name) return null

	const sortOrderRaw =
		Number.isFinite(tag.sortOrder) && !Number.isNaN(tag.sortOrder)
			? Number(tag.sortOrder)
			: Number.isFinite(tag.sort_order) && !Number.isNaN(tag.sort_order)
				? Number(tag.sort_order)
				: null

	const normalizedId =
		typeof tag.id === 'string' && tag.id
			? tag.id
			: typeof tag.id === 'number' && Number.isFinite(tag.id)
				? String(tag.id)
				: null

	return {
		id: normalizedId,
		name,
		color:
			typeof tag.color === 'string' && tag.color.trim() ? tag.color.trim() : '',
		color2:
			typeof tag.color2 === 'string' && tag.color2.trim()
				? tag.color2.trim()
				: '',
		title:
			typeof tag.title === 'string' && tag.title.trim() ? tag.title.trim() : '',
		sortOrder:
			typeof sortOrderRaw === 'number' && Number.isFinite(sortOrderRaw)
				? sortOrderRaw
				: null,
		isHidden: tag.is_hidden_on_character_card === true,
	}
}

function compareTagsForCard(a, b) {
	const orderA =
		typeof a?.sortOrder === 'number' && Number.isFinite(a.sortOrder)
			? a.sortOrder
			: Number.POSITIVE_INFINITY
	const orderB =
		typeof b?.sortOrder === 'number' && Number.isFinite(b.sortOrder)
			? b.sortOrder
			: Number.POSITIVE_INFINITY

	if (orderA !== orderB) return orderA - orderB

	const nameA = typeof a?.name === 'string' ? a.name : ''
	const nameB = typeof b?.name === 'string' ? b.name : ''

	return nameA.localeCompare(nameB, undefined, {
		sensitivity: 'base',
		numeric: true,
	})
}

function buildCharacterTagSignature(tags = []) {
	if (!Array.isArray(tags) || !tags.length) return ''
	const payload = tags.map(tag => ({
		id: typeof tag?.id === 'string' ? tag.id : null,
		name: typeof tag?.name === 'string' ? tag.name : '',
		color: typeof tag?.color === 'string' ? tag.color : '',
		color2: typeof tag?.color2 === 'string' ? tag.color2 : '',
		sortOrder:
			typeof tag?.sortOrder === 'number' && Number.isFinite(tag.sortOrder)
				? tag.sortOrder
				: null,
		title: typeof tag?.title === 'string' ? tag.title : '',
	}))
	return JSON.stringify(payload)
}

function resolveCharacterName(name, index) {
	if (typeof name === 'string' && name.trim()) return name.trim()
	return `Character ${index + 1}`
}

function parseMaybeInt(value) {
	const number = Number(value)
	return Number.isFinite(number) ? number : null
}

async function requestCharacterStats({ deps, context } = {}) {
	const headers = resolveRequestHeaders({ deps, context })
	if (!headers) return null

	const response = await fetch(CHARACTER_STATS_ENDPOINT, {
		method: 'POST',
		headers,
		body: JSON.stringify({}),
		cache: 'no-cache',
	})

	if (!response?.ok) {
		throw new Error(
			`Failed to fetch character stats: ${response?.status ?? 'unknown'} ${response?.statusText ?? ''}`.trim()
		)
	}

	try {
		const data = await response.json()
		return data && typeof data === 'object' ? data : null
	} catch (error) {
		console?.warn?.('[AstraProjecta] Failed to parse character stats response.', error)
		return null
	}
}

function resolveRequestHeaders({ deps, context } = {}) {
	const candidates = [
		typeof deps?.getRequestHeaders === 'function' ? deps.getRequestHeaders : null,
		typeof context?.getRequestHeaders === 'function'
			? context.getRequestHeaders
			: null,
		typeof globalThis?.getRequestHeaders === 'function'
			? globalThis.getRequestHeaders
			: null,
	]

	for (const candidate of candidates) {
		if (!candidate) continue
		try {
			const headers = candidate()
			if (headers && typeof headers === 'object') return headers
		} catch (error) {
			console?.warn?.(
				'[AstraProjecta] Failed to resolve request headers from SillyTavern.',
				error
			)
		}
	}

	const token =
		(typeof context?.token === 'string' && context.token) ||
		(typeof globalThis?.token === 'string' && globalThis.token) ||
		null

	if (!token) return null

	return {
		'Content-Type': 'application/json',
		'X-CSRF-Token': token,
	}
}

function resolveCharacterStatsKey(character) {
	const rawAvatar =
		typeof character?.raw?.avatar === 'string' ? character.raw.avatar.trim() : ''
	if (rawAvatar) return rawAvatar

	const avatarId =
		typeof character?.avatarId === 'string' ? character.avatarId.trim() : ''
	if (avatarId) return avatarId

	return ''
}

function toNumber(value) {
	const numeric = Number(value)
	return Number.isFinite(numeric) ? numeric : 0
}

function resolveEventSource(deps) {
	if (deps?.eventSource) return deps.eventSource
	if (deps?.event_source) return deps.event_source

	const context = resolveContext(deps?.getContext)
	if (context?.eventSource) return context.eventSource

	if (globalThis?.eventSource) return globalThis.eventSource
	if (globalThis?.SillyTavern?.eventSource) return globalThis.SillyTavern.eventSource

	return null
}

function resolveEventTypes(deps) {
	if (deps?.eventTypes) return deps.eventTypes
	if (deps?.event_types) return deps.event_types

	const context = resolveContext(deps?.getContext)
	if (context?.event_types) return context.event_types

	if (globalThis?.event_types) return globalThis.event_types
	if (globalThis?.SillyTavern?.event_types) return globalThis.SillyTavern.event_types

	return null
}
