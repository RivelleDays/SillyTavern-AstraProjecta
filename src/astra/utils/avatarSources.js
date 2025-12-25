import { getUserAvatar as getPersonaAvatar } from '../../../../../../personas.js'

const DATA_URL_REGEX = /^data:([a-z]+\/[a-z0-9-+.]+(;[a-z-]+=[a-z0-9-]+)*;?)?(base64)?,([a-z0-9!$&',()*+;=\-_%.~:@/?#]+)?$/i
const ABSOLUTE_URL_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i

const DEFAULT_USER_AVATAR_PATH = 'User Avatars/'

function getDefaultOrigin() {
	if (typeof window !== 'undefined' && window?.location?.origin) return window.location.origin
	return 'http://localhost'
}

function ensureProtocol(url) {
	if (!url) return ''
	if (url.startsWith('//')) {
		const protocol = typeof window !== 'undefined' && window?.location?.protocol ? window.location.protocol : 'https:'
		return `${protocol}${url}`
	}
	return url
}

function ensureLeadingSlash(value) {
	if (!value) return ''
	const trimmed = value.trim()
	if (!trimmed) return ''
	if (ABSOLUTE_URL_REGEX.test(trimmed) || DATA_URL_REGEX.test(trimmed) || trimmed.startsWith('blob:')) {
		return trimmed
	}
	if (trimmed.startsWith('//')) return ensureProtocol(trimmed)
	if (trimmed.startsWith('/')) return trimmed
	return `/${trimmed}`
}

export function isDataUrl(url) {
	return typeof url === 'string' && DATA_URL_REGEX.test(url)
}

export function isAbsoluteUrl(url) {
	return typeof url === 'string' && (ABSOLUTE_URL_REGEX.test(url) || url.startsWith('//'))
}

export function parseThumbnailUrl(url) {
	if (typeof url !== 'string') return null
	const trimmed = url.trim()
	if (!trimmed) return null

	try {
		const parsed = new URL(trimmed, getDefaultOrigin())
		if (parsed.pathname !== '/thumbnail') return null

		const type = parsed.searchParams.get('type') ?? ''
		const file = parsed.searchParams.get('file') ?? ''
		if (!file) return null
		return {
			type: type.toLowerCase(),
			file,
			url: trimmed,
		}
	} catch {
		return null
	}
}

function buildPersonaPath(fileId, basePath = DEFAULT_USER_AVATAR_PATH) {
	const normalizedFile = fileId.replace(/^\/+/, '')
	if (!normalizedFile) return ''

	const normalizedBase = (basePath || DEFAULT_USER_AVATAR_PATH).trim().replace(/^\/+/, '')
	if (!normalizedBase) return ensureLeadingSlash(normalizedFile)

	if (normalizedFile.startsWith(normalizedBase)) return ensureLeadingSlash(normalizedFile)

	const baseWithSlash = normalizedBase.endsWith('/') ? normalizedBase : `${normalizedBase}/`
	return ensureLeadingSlash(`${baseWithSlash}${normalizedFile}`)
}

function resolvePersonaAvatarUrl(fileId) {
	if (!fileId) return ''

	if (typeof getPersonaAvatar === 'function') {
		try {
			const url = getPersonaAvatar(fileId)
			if (url) return ensureLeadingSlash(url)
		} catch (error) {
			console.warn('[AstraProjecta] failed to resolve persona avatar via imported getUserAvatar', error)
		}
	}

	if (typeof globalThis.getUserAvatar === 'function') {
		try {
			const url = globalThis.getUserAvatar(fileId)
			if (url) return ensureLeadingSlash(url)
		} catch (error) {
			console.warn('[AstraProjecta] failed to resolve persona avatar via getUserAvatar', error)
		}
	}

	const basePath = typeof globalThis.USER_AVATAR_PATH === 'string' && globalThis.USER_AVATAR_PATH.trim()
		? globalThis.USER_AVATAR_PATH
		: DEFAULT_USER_AVATAR_PATH

	return buildPersonaPath(fileId, basePath)
}

function resolveCharacterAvatarUrl(fileId) {
	if (!fileId) return ''

	if (typeof globalThis.formatCharacterAvatar === 'function') {
		try {
			const url = globalThis.formatCharacterAvatar(fileId)
			if (url) return ensureLeadingSlash(url)
		} catch (error) {
			console.warn('[AstraProjecta] failed to resolve character avatar via formatCharacterAvatar', error)
		}
	}

	if (typeof globalThis.getCharacterAvatar === 'function') {
		try {
			const url = globalThis.getCharacterAvatar(fileId)
			if (url) return ensureLeadingSlash(url)
		} catch (error) {
			console.warn('[AstraProjecta] failed to resolve character avatar via getCharacterAvatar', error)
		}
	}

	if (fileId.startsWith('characters/')) return ensureLeadingSlash(fileId)

	return ensureLeadingSlash(`characters/${fileId}`)
}

function resolveGenericAvatarUrl(fileId) {
	if (!fileId) return ''
	return ensureLeadingSlash(fileId)
}

export function buildAvatarUrlFromFileId(fileId, type = '') {
	if (!fileId) return ''

	const trimmed = fileId.trim()
	if (!trimmed) return ''

	if (isAbsoluteUrl(trimmed) || DATA_URL_REGEX.test(trimmed) || trimmed.startsWith('blob:')) {
		return ensureProtocol(trimmed)
	}

	if (trimmed.startsWith('/')) return trimmed
	if (trimmed.startsWith('//')) return ensureProtocol(trimmed)

	const normalizedType = type.toLowerCase()
	if (normalizedType === 'persona') return resolvePersonaAvatarUrl(trimmed)
	if (normalizedType === 'avatar') return resolveCharacterAvatarUrl(trimmed)

	return resolveGenericAvatarUrl(trimmed)
}

export function resolveFullAvatarUrl(thumbUrl, { typeHint = '' } = {}) {
	if (!thumbUrl) return ''
	if (isDataUrl(thumbUrl) || isAbsoluteUrl(thumbUrl) || thumbUrl.startsWith('blob:')) {
		return ensureProtocol(thumbUrl)
	}

	const parsed = parseThumbnailUrl(thumbUrl)
	if (!parsed) {
		return ensureLeadingSlash(thumbUrl)
	}

	const type = parsed.type || typeHint
	return buildAvatarUrlFromFileId(parsed.file, type)
}

export function getAvatarSources(thumbUrl, options = {}) {
	const full = resolveFullAvatarUrl(thumbUrl, options)
	return {
		thumb: thumbUrl,
		full,
	}
}
