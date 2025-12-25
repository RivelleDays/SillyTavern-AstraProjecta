import { resolveContext } from '@/astra/shared/characters/characterData.js'
import { buildAvatarUrlFromFileId, parseThumbnailUrl } from '@/astra/utils/avatarSources.js'
import { getHomeRoute, setHomeRouteToEntity } from '../../state/homeRouteStore.js'

export function buildFormFromCharacter(character) {
	const data = character?.data ?? {}
	const extensions = data.extensions ?? {}
	const depthPrompt = extensions.depth_prompt ?? {}

	return {
		description: data.description ?? '',
		greeting: data.first_mes ?? '',
		alternateGreetings: normalizeAlternateGreetingsInput(data.alternate_greetings ?? data.alternate_grettings),
		exampleMessages: data.mes_example ?? '',
		scenario: data.scenario ?? '',
		depthPrompt: {
			prompt: depthPrompt.prompt ?? '',
			depth: Number.isFinite(Number(depthPrompt.depth)) ? Number(depthPrompt.depth) : '',
			role: depthPrompt.role ?? '',
		},
		talkativeness: resolveTalkativenessValue(data),
		personality: data.personality ?? '',
		systemPrompt: data.system_prompt ?? '',
		postHistoryInstructions: data.post_history_instructions ?? '',
		creator: data.creator ?? '',
		characterVersion: data.character_version ?? '',
		creatorNotes: data.creator_notes ?? '',
		tags: normalizeListInput(data.tags),
	}
}

function resolveTalkativenessValue(data) {
	const talkativeness = normalizeTalkativenessInput(data?.talkativeness)
	if (talkativeness !== null) return talkativeness

	const fallback = normalizeTalkativenessInput(globalThis?.talkativeness_default)
	if (fallback !== null) return fallback

	return ''
}

export function normalizeListInput(value) {
	if (Array.isArray(value)) {
		return value.join('\n')
	}
	if (typeof value === 'string') {
		return value
	}
	return ''
}

export function splitList(value) {
	if (Array.isArray(value)) {
		return value.map(item => String(item).trim()).filter(Boolean)
	}
	if (typeof value !== 'string') return []
	return value
		.split(/[\n,]+/)
		.map(entry => entry.trim())
		.filter(Boolean)
}

export function normalizeAlternateGreetingsInput(value) {
	if (Array.isArray(value)) {
		return value.map(item => (item ?? '')).map(String)
	}
	if (typeof value === 'string') {
		return [value]
	}
	return []
}

export function normalizeAlternateGreetingsForSave(value) {
	return normalizeAlternateGreetingsInput(value).map(entry => entry)
}

export function joinAlternateGreetings(value) {
	return normalizeAlternateGreetingsInput(value).join('\n\n')
}

export function isFormDirty(currentForm, baseForm) {
	const currentSignature = buildFormSignature(currentForm)
	const baseSignature = buildFormSignature(baseForm)
	return JSON.stringify(currentSignature) !== JSON.stringify(baseSignature)
}

function buildFormSignature(form) {
	if (!form) return {}
	return {
		description: normalizeTextField(form.description),
		greeting: normalizeTextField(form.greeting),
		alternateGreetings: normalizeAlternateGreetingsInput(form.alternateGreetings)
			.map(normalizeTextField)
			.filter(Boolean),
		exampleMessages: normalizeTextField(form.exampleMessages),
		scenario: normalizeTextField(form.scenario),
		depthPrompt: {
			prompt: normalizeTextField(form.depthPrompt?.prompt),
			depth: normalizeDepthSignature(form.depthPrompt?.depth),
			role: normalizeTextField(form.depthPrompt?.role).trim(),
		},
		talkativeness: normalizeTalkativenessSignature(form.talkativeness),
		personality: normalizeTextField(form.personality),
		systemPrompt: normalizeTextField(form.systemPrompt),
		postHistoryInstructions: normalizeTextField(form.postHistoryInstructions),
		creator: normalizeTextField(form.creator),
		characterVersion: normalizeTextField(form.characterVersion),
		creatorNotes: normalizeTextField(form.creatorNotes),
		tags: splitList(form.tags),
	}
}

function normalizeTextField(value) {
	if (value === null || value === undefined) return ''
	return String(value).replace(/\r\n/g, '\n')
}

function normalizeDepthSignature(value) {
	const depth = normalizeDepthValue(value)
	if (depth === '') return ''
	const numeric = Number(depth)
	return Number.isFinite(numeric) ? numeric : ''
}

function normalizeTalkativenessSignature(value) {
	const numeric = normalizeTalkativenessInput(value)
	if (numeric === null) return null
	const clamped = clamp01(numeric)
	return Math.round(clamped * 1000) / 1000
}

export function resolveCharacterAvatarValue(character) {
	const candidates = [
		character?.avatar,
		character?.avatar_id,
		character?.avatarId,
		character?.avatar_url,
		character?.avatarUrl,
		character?.raw?.avatar,
		character?.raw?.avatar_url,
	]
	const resolved = candidates.find(value => typeof value === 'string' && value.trim())
	return resolved ? resolved.trim() : ''
}

export function normalizeAvatarForSave(avatar) {
	if (typeof avatar !== 'string') return ''
	const trimmed = avatar.trim()
	if (!trimmed) return ''

	const parsed = parseThumbnailUrl(trimmed)
	if (parsed?.file) {
		const decoded = decodeURIComponent(parsed.file)
		return decoded
			.replace(/^\/+/, '')
			.replace(/^characters\//, '')
	}

	if (/^(https?:|data:|blob:|\/\/)/i.test(trimmed)) {
		return trimmed
	}

	return trimmed
		.replace(/^\/+/, '')
		.replace(/^characters\//, '')
}

export function buildMergePayload({ character, characterId, form }) {
	if (characterId === null || characterId === undefined) {
		throw new Error('Character id missing; unable to save changes.')
	}

	const normalizedAvatar = normalizeAvatarForSave(resolveCharacterAvatarValue(character))
	if (!normalizedAvatar) {
		throw new Error('Character avatar missing; unable to save changes.')
	}
	const avatarUrl = resolveAvatarUrlForPayload({
		character,
		normalizedAvatar,
	})

	const baseData = character?.data && typeof character.data === 'object' ? character.data : {}
	const baseExtensions =
		baseData.extensions && typeof baseData.extensions === 'object' ? { ...baseData.extensions } : {}
	const existingDepthPrompt =
		baseExtensions.depth_prompt && typeof baseExtensions.depth_prompt === 'object'
			? baseExtensions.depth_prompt
			: {}

	const depthInput = form.depthPrompt?.depth
	const normalizedDepth = depthInput === '' || depthInput === null || depthInput === undefined
		? Number.isFinite(Number(existingDepthPrompt.depth))
			? Number(existingDepthPrompt.depth)
			: undefined
		: Number.isFinite(Number(depthInput))
			? Number(depthInput)
			: Number.isFinite(Number(existingDepthPrompt.depth))
				? Number(existingDepthPrompt.depth)
				: undefined

	const talkInput = form.talkativeness
	const talkValue =
		talkInput === '' || talkInput === null || talkInput === undefined
			? Number.isFinite(Number(baseData.talkativeness))
				? Number(baseData.talkativeness)
				: undefined
			: Number.isFinite(Number(talkInput))
				? Number(talkInput)
				: Number.isFinite(Number(baseData.talkativeness))
					? Number(baseData.talkativeness)
					: undefined

	baseExtensions.depth_prompt = {
		prompt: form.depthPrompt?.prompt ?? existingDepthPrompt.prompt ?? '',
		depth: normalizedDepth ?? 0,
		role: form.depthPrompt?.role ?? existingDepthPrompt.role ?? '',
	}

	const data = {
		...baseData,
		description: form.description ?? '',
		first_mes: form.greeting ?? '',
		alternate_greetings: normalizeAlternateGreetingsForSave(form.alternateGreetings),
		alternate_grettings: normalizeAlternateGreetingsForSave(form.alternateGreetings),
		mes_example: form.exampleMessages ?? '',
		scenario: form.scenario ?? '',
		personality: form.personality ?? '',
		system_prompt: form.systemPrompt ?? '',
		post_history_instructions: form.postHistoryInstructions ?? '',
		creator: form.creator ?? '',
		character_version: form.characterVersion ?? '',
		creator_notes: form.creatorNotes ?? '',
		tags: splitList(form.tags),
		extensions: baseExtensions,
	}

	if (talkValue !== undefined) {
		data.talkativeness = talkValue
	}

	const payload = {
		name: character?.name ?? character?.raw?.name ?? '',
		avatar: normalizedAvatar,
		avatar_url: avatarUrl,
		id: characterId,
		data,
	}

	return payload
}

function resolveAvatarUrlForPayload({ character, normalizedAvatar }) {
	const urlCandidates = [
		typeof character?.avatar_url === 'string' ? character.avatar_url.trim() : '',
		typeof character?.avatarUrl === 'string' ? character.avatarUrl.trim() : '',
		typeof character?.raw?.avatar_url === 'string' ? character.raw.avatar_url.trim() : '',
	]

	const existingUrl = urlCandidates.find(Boolean)
	if (existingUrl) return existingUrl

	const normalized = typeof normalizedAvatar === 'string' ? normalizedAvatar.trim() : ''
	if (!normalized) return ''

	try {
		return buildAvatarUrlFromFileId(normalized, 'avatar')
	} catch {
		return normalized
	}
}

export async function saveCharacterAttributes(payload, deps) {
	const headers = resolveRequestHeaders(deps)
	const response = await fetch('/api/characters/merge-attributes', {
		method: 'POST',
		headers,
		body: JSON.stringify(payload),
	})

	if (!response.ok) {
		const message = await extractError(response)
		throw new Error(message || `Save failed (${response.status})`)
	}

	return response.json().catch(() => ({}))
}

export function resolveRequestHeaders(deps, options = {}) {
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

export function notifyCharacterEdited(deps) {
	const context = resolveContext(deps?.getContext)
	const eventSource =
		deps?.eventSource ??
		deps?.event_source ??
		context?.eventSource ??
		globalThis?.eventSource ??
		globalThis?.SillyTavern?.eventSource
	const eventTypes =
		deps?.eventTypes ??
		deps?.event_types ??
		context?.eventTypes ??
		context?.event_types ??
		globalThis?.event_types ??
		globalThis?.SillyTavern?.event_types
	const key = eventTypes?.CHARACTER_EDITED ?? 'CHARACTER_EDITED'
	eventSource?.emit?.(key, { reason: 'details-edit' })
}

export async function refreshCharactersCache({ deps, characterId, payload } = {}) {
	const route = typeof getHomeRoute === 'function' ? getHomeRoute() : null
	const entityKey = route?.entityKey || null

	const merged = mergeCharacterIntoCache({ deps, characterId, payload, entityKey })
	if (merged) {
		updateHomeRouteAvatar(payload, deps)
		return true
	}

	const refresher = selectCharactersRefresher(deps)
	if (typeof refresher !== 'function') return false

	try {
		const result = refresher()
		if (result && typeof result.then === 'function') {
			await result
		}
		updateHomeRouteAvatar(payload, deps)
		return true
	} catch (error) {
		console?.warn?.('[AstraProjecta] Failed to refresh character list after save.', error)
		return false
	}
}

function mergeCharacterIntoCache({ deps, characterId, payload, entityKey } = {}) {
	const context = resolveContext(deps?.getContext)
	const candidateArrays = []
	if (Array.isArray(context?.characters)) candidateArrays.push(context.characters)
	if (Array.isArray(globalThis?.characters)) candidateArrays.push(globalThis.characters)

	if (!candidateArrays.length) return false

	const hasValidId = Number.isInteger(characterId) && characterId >= 0

	let merged = false
	for (const list of candidateArrays) {
		let targetIndex = null

		if (hasValidId && list?.[characterId]) {
			targetIndex = characterId
		} else if (Array.isArray(list)) {
			const avatarCandidates = collectAvatarCandidates(payload)
			if (avatarCandidates.length) {
				const foundIndex = list.findIndex(entry => avatarCandidates.includes(resolveCharacterAvatarValue(entry)))
				if (foundIndex !== -1) {
					targetIndex = foundIndex
				}
			}

			if (targetIndex === null && typeof payload?.name === 'string') {
				const name = payload.name.trim()
				if (name) {
					const foundNameIndex = list.findIndex(entry => typeof entry?.name === 'string' && entry.name === name)
					if (foundNameIndex !== -1) {
						targetIndex = foundNameIndex
					}
				}
			}

			if (targetIndex === null && entityKey) {
				const key = String(entityKey)
				const foundKeyIndex = list.findIndex(entry => {
					const avatar = resolveCharacterAvatarValue(entry)
					const name = typeof entry?.name === 'string' ? entry.name : ''
					return (
						avatar === key ||
						(avatar && `avatar:${avatar}` === key) ||
						name === key ||
						(name && `name:${name}` === key)
					)
				})
				if (foundKeyIndex !== -1) {
					targetIndex = foundKeyIndex
				}
			}
		}

		if (targetIndex !== null && targetIndex !== undefined && targetIndex >= 0 && list?.[targetIndex]) {
			list[targetIndex] = mergeCharacterPayload(list[targetIndex], payload)
			merged = true
		}
	}
	return merged
}

function mergeCharacterPayload(existing, payload) {
	const base = existing && typeof existing === 'object' ? existing : {}
	const patch = payload && typeof payload === 'object' ? payload : {}
	const mergedData = {
		...(base.data || {}),
		...(patch.data || {}),
	}

	const resolvedAvatar = (patch.avatar && patch.avatar.trim())
		? patch.avatar
		: (base.avatar && base.avatar.trim())
			? base.avatar
			: ''
	const resolvedAvatarUrl = (patch.avatar_url && patch.avatar_url.trim())
		? patch.avatar_url
		: (base.avatar_url && base.avatar_url.trim())
			? base.avatar_url
			: ''

	const result = {
		...base,
		...patch,
		avatar: resolvedAvatar,
		avatar_url: resolvedAvatarUrl,
		data: mergedData,
	}

	const topLevelFields = [
		'description',
		'first_mes',
		'mes_example',
		'scenario',
		'personality',
		'talkativeness',
	]
	for (const field of topLevelFields) {
		if (Object.prototype.hasOwnProperty.call(mergedData, field) && mergedData[field] !== undefined) {
			result[field] = mergedData[field]
		}
	}

	return result
}

function selectCharactersRefresher(deps) {
	const context = resolveContext(deps?.getContext)
	const candidates = [
		deps?.refreshCharacters,
		deps?.getCharacters,
		context?.refreshCharacters,
		context?.getCharacters,
		globalThis?.refreshCharacters,
		globalThis?.getCharacters,
	]
	return candidates.find(candidate => typeof candidate === 'function') || null
}

function collectAvatarCandidates(payload) {
	if (!payload || typeof payload !== 'object') return []
	const candidates = [
		payload.avatar,
		payload.avatar_url,
		payload.avatarId,
		payload.avatar_id,
	]
	return candidates
		.map(value => (typeof value === 'string' ? value.trim() : ''))
		.filter(Boolean)
}

function coalesceAvatar(...values) {
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) {
			return value.trim()
		}
	}
	return ''
}

function updateHomeRouteAvatar(payload, deps) {
	if (typeof getHomeRoute !== 'function' || typeof setHomeRouteToEntity !== 'function') return
	const route = getHomeRoute()
	if (!route || route.view !== 'entity') return

	const resolvedUrl = resolveRouteAvatarUrl({ payload, route, deps })
	if (!resolvedUrl) return

	setHomeRouteToEntity({
		...route,
		avatarUrl: resolvedUrl,
	})
}

function resolveRouteAvatarUrl({ payload, route, deps } = {}) {
	const current = typeof route?.avatarUrl === 'string' ? route.avatarUrl.trim() : ''
	if (current && (current.startsWith('http') || current.includes('/'))) {
		return current
	}

	const avatar = coalesceAvatar(
		payload?.avatar_url,
		payload?.avatar,
		payload?.avatarId,
		payload?.avatar_id,
	)
	if (!avatar) return current

	const context = resolveContext(deps?.getContext)
	const thumbGetter = selectThumbnailGetter(deps, context)
	const next = thumbGetter ? thumbGetter('avatar', avatar) : null

	return next || current || avatar
}

function selectThumbnailGetter(deps, context) {
	const candidates = [
		deps?.getThumbnailUrl,
		context?.getThumbnailUrl,
		globalThis?.getThumbnailUrl,
	]
	return candidates.find(candidate => typeof candidate === 'function') || null
}

export async function extractError(response) {
	try {
		const data = await response.json()
		if (typeof data?.message === 'string' && data.message) {
			return data.message
		}
	} catch {
		// ignore
	}
	return ''
}

export function showToast(type, message) {
	const toaster = globalThis?.toastr
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
			toaster.success(message, 'Astra Projecta')
			break;
		case 'warning':
			toaster.warning(message, 'Astra Projecta')
			break
		case 'error':
			toaster.error(message, 'Astra Projecta')
			break
		default:
			toaster.info(message, 'Astra Projecta')
			break
	}
}

export function addTagValue(existing, draft) {
	const trimmed = (draft ?? '').trim()
	if (!trimmed) return null
	const next = Array.from(new Set([...existing, trimmed]))
	return next
}

export function normalizeDepthValue(value) {
	const numeric = Number(value)
	if (Number.isFinite(numeric)) return numeric
	return ''
}

export function normalizeTalkativenessInput(value) {
	if (value === null || value === undefined) return null
	if (typeof value === 'string' && value.trim() === '') return null

	const numeric = Number(value)
	return Number.isFinite(numeric) ? numeric : null
}

export function resolveTalkativenessSliderValue(value) {
	const talkativeness = normalizeTalkativenessInput(value)
	if (talkativeness !== null) return clamp01(talkativeness)

	const fallback = normalizeTalkativenessInput(globalThis?.talkativeness_default)
	if (fallback !== null) return clamp01(fallback)

	return 0.5
}

export function clamp01(value) {
	return Math.min(1, Math.max(0, value))
}
