import { resolveFullAvatarUrl, isDataUrl } from '../../../../../../utils/avatarSources.js'

export function resolveAvatarSource({ thumbURL, fullURL, avatarId, typeHint, isUser, isSystem }) {
	const safeThumb = thumbURL ?? ''
	const safeFull = fullURL ?? ''
	const id = typeof avatarId === 'string' ? avatarId : ''
	const personaMap = globalThis.power_user?.personas ?? {}
	const charactersList = Array.isArray(globalThis.characters) ? globalThis.characters : []
	const isValidCharacter = id ? charactersList.some((entry) => entry?.avatar === id) : false

	if (isUser || (isSystem && !isValidCharacter)) {
		if (id && personaMap && Object.prototype.hasOwnProperty.call(personaMap, id) && typeof globalThis.getUserAvatar === 'function') {
			try {
				const personaUrl = globalThis.getUserAvatar(id)
				if (personaUrl) return personaUrl
			} catch (error) {
				console.warn('[AstraProjecta] failed to resolve persona avatar', error)
			}
		}

		if (!safeFull && id) {
			const personaFull = resolveFullAvatarUrl(id, { typeHint: 'persona' })
			if (personaFull) return personaFull
		}

		return safeFull || safeThumb
	}

	if (!safeThumb && !safeFull) return ''
	if (safeFull) return safeFull
	if (isDataUrl(safeThumb)) return safeThumb

	return resolveFullAvatarUrl(safeThumb, { typeHint: typeHint || 'avatar' })
}
