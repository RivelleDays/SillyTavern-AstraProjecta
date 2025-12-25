import { resolveContext } from '@/astra/shared/characters/characterData.js'
import { buildAvatarUrlFromFileId, parseThumbnailUrl } from '@/astra/utils/avatarSources.js'

const THUMBNAIL_CACHE_PARAM = '_astraThumb'
const THUMBNAIL_TYPE_AVATAR = 'avatar'

export function resolveAvatarSource(avatarId, deps = {}) {
	const fallback = getFallbackAvatar()
	if (!avatarId || avatarId === 'none') return fallback
	const cacheValue = getAvatarCacheBusterValue(avatarId, deps?.avatarCacheBusters)
	const applyCache = url => (cacheValue ? appendCacheBuster(url, cacheValue) : url)
	const thumbnailUrl = resolveAvatarThumbnailUrl(avatarId, deps)
	if (thumbnailUrl) return applyCache(thumbnailUrl)
	try {
		const source = buildAvatarUrlFromFileId(avatarId, THUMBNAIL_TYPE_AVATAR) || fallback
		return applyCache(source)
	} catch (error) {
		console?.warn?.('[AstraProjecta] Failed to resolve avatar URL, using fallback.', error)
		return fallback
	}
}

export function registerAvatarMutationListener({ deps = {}, cache } = {}) {
	if (!cache) return null
	const { eventSource, eventTypes } = resolveEventChannels(deps)
	const editedEvent = eventTypes?.CHARACTER_EDITED
	if (!eventSource || !editedEvent) return null
	const handler = (...args) => {
		const payload = args?.[0]
		const character = payload?.detail?.character ?? payload?.character ?? payload
		const avatarId = resolveAvatarKeyFromCharacter(character)
		if (avatarId) {
			cache.set(avatarId, Date.now())
		}
	}
	eventSource.on(editedEvent, handler)
	return () => {
		if (typeof eventSource.removeListener === 'function') {
			eventSource.removeListener(editedEvent, handler)
		}
	}
}

export function getFallbackAvatar() {
	if (cachedFallbackAvatar) return cachedFallbackAvatar

	const raw =
		typeof globalThis?.default_avatar === 'string' && globalThis.default_avatar.trim()
			? globalThis.default_avatar.trim()
			: 'img/ai4.png'

	try {
		cachedFallbackAvatar = buildAvatarUrlFromFileId(raw)
	} catch {
		cachedFallbackAvatar = raw.startsWith('/') ? raw : `/${raw}`
	}

	return cachedFallbackAvatar
}

function resolveAvatarThumbnailUrl(avatarId, deps = {}) {
	const builder = resolveThumbnailBuilder(deps)
	if (!builder) return ''
	try {
		const candidate = builder(THUMBNAIL_TYPE_AVATAR, avatarId, true)
		return typeof candidate === 'string' ? candidate : ''
	} catch (error) {
		console?.warn?.('[AstraProjecta] Failed to resolve avatar thumbnail URL.', error)
		return ''
	}
}

function resolveThumbnailBuilder(deps = {}) {
	if (typeof deps?.getThumbnailUrl === 'function') {
		return deps.getThumbnailUrl
	}
	if (typeof deps?.context?.getThumbnailUrl === 'function') {
		return deps.context.getThumbnailUrl
	}
	const context = deps?.context ?? resolveContext(deps?.getContext)
	if (context && typeof context.getThumbnailUrl === 'function') {
		return context.getThumbnailUrl
	}
	if (typeof globalThis?.getThumbnailUrl === 'function') {
		return globalThis.getThumbnailUrl
	}
	return null
}

function getAvatarCacheBusterValue(avatarId, cache) {
	if (!avatarId || !cache) return null
	return cache.get(avatarId) ?? null
}

function appendCacheBuster(url, value) {
	if (!value || typeof url !== 'string') return url
	const trimmed = url.trim()
	if (!trimmed || /^data:/i.test(trimmed) || trimmed.startsWith('blob:')) {
		return trimmed
	}
	if (trimmed.includes(`${THUMBNAIL_CACHE_PARAM}=`)) {
		return trimmed
	}
	const fragmentIndex = trimmed.indexOf('#')
	const base = fragmentIndex >= 0 ? trimmed.slice(0, fragmentIndex) : trimmed
	const fragment = fragmentIndex >= 0 ? trimmed.slice(fragmentIndex) : ''
	const separator = base.includes('?') ? '&' : '?'
	const stamp = encodeURIComponent(String(value))
	return `${base}${separator}${THUMBNAIL_CACHE_PARAM}=${stamp}${fragment}`
}

function resolveEventChannels(deps = {}) {
	const context = deps?.context ?? resolveContext(deps?.getContext)
	const eventSource = deps?.eventSource ?? context?.eventSource ?? globalThis?.eventSource ?? null
	const eventTypes = deps?.eventTypes ?? context?.event_types ?? context?.eventTypes ?? globalThis?.event_types ?? null
	return { eventSource, eventTypes }
}

function resolveAvatarKeyFromCharacter(character) {
	if (!character || typeof character !== 'object') return ''
	const candidates = [
		character.avatarId,
		character.avatar,
		character.avatar_url,
		character.avatarUrl,
		character?.raw?.avatar,
		character?.raw?.avatar_url,
	]
	for (const entry of candidates) {
		const key = normalizeAvatarKey(entry)
		if (key) return key
	}
	return ''
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

let cachedFallbackAvatar = null
