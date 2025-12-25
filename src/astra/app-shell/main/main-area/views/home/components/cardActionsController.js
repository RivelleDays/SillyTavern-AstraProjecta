import { resolveContext } from '@/astra/shared/characters/characterData.js'

const ALLOWED_FILE_EXTENSIONS = new Set(['png', 'json', 'yaml', 'yml', 'charx', 'byaf'])
export const FILE_ACCEPT_ATTRIBUTE = '.png,.json,.yaml,.yml,.charx,.byaf'

export const CHARACTER_MUTATION_REASONS = Object.freeze({
	favoriteToggle: 'favorite-toggle',
})

export function createHomeCardActionController({ character, deps } = {}) {
	const state = {
		isBusy: false,
		isFavorite: Boolean(character?.isFavorite),
	}

	const runExclusive = async task => {
		if (state.isBusy || typeof task !== 'function') return
		state.isBusy = true
		try {
			await task()
		} catch (error) {
			console?.error?.('[AstraProjecta] Failed to run character action.', error)
			showToast('error', 'Something went wrong while handling this card.', 'Astra Projecta')
		} finally {
			state.isBusy = false
		}
	}

	const exportAs = format =>
		runExclusive(() => exportCharacterCard({ character, deps, format }))
	const openSource = urlOverride =>
		runExclusive(() => openCharacterSource({ character, sourceOverride: urlOverride }))
	const replaceFromFile = file =>
		runExclusive(() => replaceCharacterWithFile({ character, deps, file }))
	const replaceFromUrl = url =>
		runExclusive(() => replaceCharacterFromUrl({ character, deps, url }))
	const viewCharacter = () => runExclusive(() => viewCharacterDetails({ character, deps }))
	const openChat = () => runExclusive(() => openCharacterChatFromCard({ character, deps }))
	const toggleFavorite = () =>
		runExclusive(() => toggleFavoriteState({ character, deps, state }))
	const getFavoriteState = () => Boolean(state.isFavorite)
	const getSourceUrl = () => resolveCharacterSourceUrl(character?.raw) || ''
	const canOpenSourceLink = Boolean(getSourceUrl())

	return {
		exportAsPng: () => exportAs('png'),
		exportAsJson: () => exportAs('json'),
		canOpenSourceLink,
		getSourceUrl,
		getFavoriteState,
		openSourceLink: openSource,
		replaceCharacterFromFile: replaceFromFile,
		replaceCharacterFromUrl: replaceFromUrl,
		viewCharacter,
		openChat,
		toggleFavorite,
	}
}

async function exportCharacterCard({ character, deps, format }) {
	const avatarFile = resolveAvatarFileName(character)
	if (!avatarFile) {
		showToast('info', 'This character card does not have an exportable avatar.')
		return
	}

	try {
		const headers = resolveRequestHeaders(deps)
		const response = await fetch('/api/characters/export', {
			method: 'POST',
			headers,
			body: JSON.stringify({
				format,
				avatar_url: avatarFile,
			}),
		})

		if (!response.ok) {
			throw new Error(`Export failed (${response.status})`)
		}

		const blob = await response.blob()
		const downloadName = resolveExportFileName(avatarFile, format)
		triggerFileDownload(blob, downloadName)
		showToast('success', `Exported ${format.toUpperCase()} for ${character?.name ?? 'character'}`)
	} catch (error) {
		console?.error?.('[AstraProjecta] Failed to export character.', error)
		showToast('error', 'Failed to export this character card.')
	}
}

async function openCharacterSource({ character, sourceOverride }) {
	const source = typeof sourceOverride === 'string' && sourceOverride ? sourceOverride : resolveCharacterSourceUrl(character?.raw)
	if (!source) {
		showToast('info', 'This character does not have a source link.')
		return
	}

	try {
		const target = new URL(source, window.location.origin)
		window.open(target.href, '_blank', 'noopener')
	} catch {
		window.open(source, '_blank', 'noopener')
	}
}

async function replaceCharacterWithFile({ character, deps, file }) {
	if (!(file instanceof File)) {
		showToast('info', 'Please choose a valid character card file.')
		return
	}

	const context = resolveContext(deps?.getContext)
	const avatarFile = resolveAvatarFileName(character)
	await importCharacterFile({ file, avatarFile, deps, context })
}

async function replaceCharacterFromUrl({ character, deps, url }) {
	const context = resolveContext(deps?.getContext)
	const avatarFile = resolveAvatarFileName(character)
	const normalizedUrl = typeof url === 'string' ? url.trim() : ''
	if (!normalizedUrl) {
		showToast('info', 'Please provide a character card URL.')
		return
	}

	try {
		const headers = resolveRequestHeaders(deps)
		const endpoint = isProbablyUrl(normalizedUrl) ? '/api/content/importURL' : '/api/content/importUUID'
		const request = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({ url: normalizedUrl }),
		})

		if (!request.ok) {
			throw new Error(`Import request failed (${request.status})`)
		}

		const customType = request.headers.get('X-Custom-Content-Type')
		if (customType && customType !== 'character') {
			showToast('warning', 'The provided link does not contain a character card.')
			return
		}

		const blob = await request.blob()
		const downloadName = extractFilenameFromDisposition(request.headers.get('Content-Disposition'))
		const file = new File([blob], downloadName ?? 'character-card.png', { type: blob.type })

		await importCharacterFile({ file, avatarFile, deps, context })
	} catch (error) {
		console?.error?.('[AstraProjecta] Failed to import character from URL.', error)
		showToast('error', 'Failed to import the character from the provided URL.')
	}
}

async function viewCharacterDetails({ character, deps }) {
	const id = resolveCharacterId(character)
	if (id === null) {
		showToast('info', 'Unable to determine which character to open.')
		return
	}

	const context = resolveContext(deps?.getContext)
	const selectFn = getCallable([
		deps?.selectCharacterById,
		context?.selectCharacterById,
		globalThis?.selectCharacterById,
	])

	if (selectFn) {
		try {
			const result = selectFn(id, { switchMenu: true })
			if (result instanceof Promise) {
				await result
			}
			return
		} catch (error) {
			console?.error?.('[AstraProjecta] Failed to select character.', error)
			showToast('error', 'Failed to open this character.')
			return
		}
	}

	if (typeof globalThis?.select_selected_character === 'function') {
		try {
			globalThis.select_selected_character(id, { switchMenu: true })
			return
		} catch (error) {
			console?.error?.('[AstraProjecta] Failed to use legacy selector.', error)
		}
	}

	showToast('info', 'This action requires an up-to-date SillyTavern client.')
}

async function openCharacterChatFromCard({ character, deps }) {
	const context = resolveContext(deps?.getContext)
	const openChatFn = getCallable([
		deps?.openCharacterChat,
		context?.openCharacterChat,
		globalThis?.openCharacterChat,
	])

	if (!openChatFn) {
		showToast('info', 'Unable to open chats in this environment.')
		return
	}

	const chatFile = resolveChatFileName(character, context)
	if (!chatFile) {
		showToast('info', 'This character does not have an associated chat yet.')
		return
	}

	try {
		const result = openChatFn(chatFile)
		if (result instanceof Promise) {
			await result
		}
	} catch (error) {
		console?.error?.('[AstraProjecta] Failed to open chat from character card.', error)
		showToast('error', 'Failed to open this chat.')
	}
}

async function toggleFavoriteState({ character, deps, state }) {
	const context = resolveContext(deps?.getContext)
	const targetName =
		typeof character?.raw?.name === 'string' && character.raw.name
			? character.raw.name
			: character?.name

	if (!targetName) {
		showToast('info', 'This character card is missing required data.')
		return
	}

	const nextFavorite = !state.isFavorite
	const characterId = resolveCharacterId(character)
	const payload = {
		name: targetName,
		avatar: resolveAvatarFileName(character) || '',
		data: {
			extensions: {
				fav: nextFavorite,
			},
		},
		fav: nextFavorite,
	}

	try {
		const headers = resolveRequestHeaders(deps)
		const response = await fetch('/api/characters/merge-attributes', {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
		})
		if (!response.ok) {
			const message = await safeExtractErrorMessage(response)
			throw new Error(message || `Favorite toggle failed (${response.status})`)
		}

		state.isFavorite = nextFavorite
		if (character) {
			character.isFavorite = nextFavorite
			if (character.raw && typeof character.raw === 'object') {
				character.raw.fav = nextFavorite
				if (!character.raw.data || typeof character.raw.data !== 'object') {
					character.raw.data = {}
				}
				if (!character.raw.data.extensions || typeof character.raw.data.extensions !== 'object') {
					character.raw.data.extensions = {}
				}
				character.raw.data.extensions.fav = nextFavorite
			}
		}

		notifyCharacterMutated(deps, context, {
			reason: CHARACTER_MUTATION_REASONS.favoriteToggle,
			characterId,
			favorite: nextFavorite,
		})
		showToast('success', nextFavorite ? 'Character added to favorites.' : 'Character removed from favorites.')
	} catch (error) {
		console?.error?.('[AstraProjecta] Failed to toggle favorite.', error)
		showToast('error', 'Failed to update favorite state.')
	}
}

async function safeExtractErrorMessage(response) {
	try {
		const data = await response.json()
		if (typeof data?.message === 'string' && data.message) {
			return data.message
		}
		return ''
	} catch {
		return ''
	}
}

async function importCharacterFile({ file, avatarFile, deps, context }) {
	const extension = resolveFileExtension(file?.name)
	if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
		showToast('info', 'Unsupported file type. Please select a PNG, JSON, YAML, CHARX, or BYAF card.')
		return
	}

	const headers = resolveRequestHeaders(deps, { omitContentType: true })
	const formData = new FormData()
	formData.append('avatar', file)
	formData.append('file_type', extension)
	formData.append('user_name', context?.name1 ?? 'User')
	if (avatarFile) {
		formData.append('preserved_name', avatarFile)
	}

	try {
		const response = await fetch('/api/characters/import', {
			method: 'POST',
			body: formData,
			headers,
			cache: 'no-cache',
		})

		if (!response.ok) {
			throw new Error(`Import failed (${response.status})`)
		}

		const data = await response.json()
		if (data?.error) {
			throw new Error('Import returned an error payload.')
		}

		await refreshCharacterRegistry(context)
		notifyCharacterMutated(deps, context)
		showToast('success', 'Character card replaced successfully.')
	} catch (error) {
		console?.error?.('[AstraProjecta] Failed to replace character card.', error)
		showToast('error', 'Failed to replace this character card.')
	}
}

function triggerFileDownload(blob, filename) {
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.setAttribute('download', filename)
	document.body.appendChild(anchor)
	anchor.click()
	document.body.removeChild(anchor)
	URL.revokeObjectURL(url)
}

function resolveAvatarFileName(character) {
	if (typeof character?.raw?.avatar === 'string' && character.raw.avatar) {
		return character.raw.avatar
	}
	if (typeof character?.avatarId === 'string' && character.avatarId) {
		return character.avatarId
	}
	return ''
}

function resolveExportFileName(avatarName, format) {
	const base = avatarName?.replace(/\.[^/.]+$/, '') ?? 'character'
	return `${base}.${format}`
}

function resolveCharacterSourceUrl(raw) {
	if (!raw) return ''
	const extensions = raw?.data?.extensions ?? {}

	if (typeof extensions?.chub?.full_path === 'string' && extensions.chub.full_path) {
		return `https://chub.ai/characters/${extensions.chub.full_path}`
	}

	if (typeof extensions?.pygmalion_id === 'string' && extensions.pygmalion_id) {
		return `https://pygmalion.chat/${extensions.pygmalion_id}`
	}

	if (typeof extensions?.github_repo === 'string' && extensions.github_repo) {
		return `https://github.com/${extensions.github_repo}`
	}

	if (typeof extensions?.source_url === 'string' && extensions.source_url) {
		return extensions.source_url
	}

	if (Array.isArray(extensions?.risuai?.source) && extensions.risuai.source[0]?.startsWith?.('risurealm:')) {
		const realmId = extensions.risuai.source[0].split(':')[1]
		return realmId ? `https://realm.risuai.net/character/${realmId}` : ''
	}

	if (typeof extensions?.perchance_data?.slug === 'string' && extensions.perchance_data.slug) {
		return `https://perchance.org/ai-character-chat?data=${extensions.perchance_data.slug}`
	}

	return ''
}

function resolveRequestHeaders(deps, options = {}) {
	const context = resolveContext(deps?.getContext)
	const getter =
		typeof deps?.getRequestHeaders === 'function'
			? deps.getRequestHeaders
			: context?.getRequestHeaders
	if (typeof getter === 'function') {
		return getter(options) ?? {}
	}
	if (options?.omitContentType) {
		return {}
	}
	return { 'Content-Type': 'application/json' }
}

function notifyCharacterMutated(deps, context, payload) {
	const eventSource = deps?.eventSource ?? context?.eventSource
	const eventTypes = deps?.eventTypes ?? context?.eventTypes
	const eventKey = eventTypes?.CHARACTER_EDITED ?? 'CHARACTER_EDITED'
	eventSource?.emit?.(eventKey, payload)
}

async function refreshCharacterRegistry(context) {
	const refreshers = [
		context?.getCharacters,
		globalThis?.getCharacters,
	]
	for (const refresh of refreshers) {
		if (typeof refresh !== 'function') {
			continue
		}
		try {
			const result = refresh()
			if (result instanceof Promise) {
				await result
			}
			return true
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to refresh characters after import.', error)
		}
	}
	return false
}

function resolveCharacterId(character) {
	const numeric = Number(character?.id)
	return Number.isFinite(numeric) ? numeric : null
}

function resolveChatFileName(character, context) {
	if (typeof character?.raw?.chat === 'string' && character.raw.chat) {
		return character.raw.chat.trim()
	}

	const id = resolveCharacterId(character)
	if (id === null) return ''

	const fromContextList =
		Array.isArray(context?.characters) && context.characters[id]
			? context.characters[id]
			: null
	const contextChat =
		typeof fromContextList?.chat === 'string' ? fromContextList.chat.trim() : ''
	if (contextChat) return contextChat

	const globalList =
		typeof globalThis !== 'undefined' && Array.isArray(globalThis.characters)
			? globalThis.characters
			: null
	const globalChat =
		globalList && typeof globalList[id]?.chat === 'string' ? globalList[id].chat.trim() : ''
	if (globalChat) return globalChat

	return ''
}

function getCallable(candidates = []) {
	return candidates.find(candidate => typeof candidate === 'function') ?? null
}

function showToast(type, message, title) {
	const toaster = globalThis.toastr
	if (!toaster) {
		if (type === 'error') {
			console?.error?.('[AstraProjecta]', message)
		} else {
			console?.info?.('[AstraProjecta]', message)
		}
		return
	}
	switch (type) {
		case 'success':
			toaster.success(message, title)
			break
		case 'info':
			toaster.info(message, title)
			break
		case 'warning':
			toaster.warning(message, title)
			break
		case 'error':
		default:
			toaster.error(message, title)
			break
	}
}

function resolveFileExtension(filename = '') {
	const [, ext = ''] = filename.toLowerCase().match(/\.([a-z0-9]+)$/) ?? []
	return ext
}

function extractFilenameFromDisposition(disposition) {
	if (!disposition) return null
	const match = disposition?.match(/filename="?([^"]+)"?/)
	return match ? match[1] : null
}

function isProbablyUrl(value = '') {
	try {
		const parsed = new URL(value)
		return !!parsed?.protocol
	} catch {
		return false
	}
}
