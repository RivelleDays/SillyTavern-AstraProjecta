import { getLucideIconMarkup } from '@/astra/shared/icons/lucide.js'
import { resolveCharacterKey, resolveCharacterVersion } from './homeCardData.js'
import { formatCompactCount } from './homeCardNumberFormat.js'

const TOKEN_ICON_MARKUP = getLucideIconMarkup('braces', { size: 14 })
const TOKEN_ESTIMATE_DIVISOR = 4
const TOKEN_CACHE_PREFIX = 'astraHomeCardToken'
const TOKEN_CACHE_VERSION = 'v1'
const TOKEN_FIELD_HASH_SEPARATOR = '\u0001'
const TOKEN_ESTIMATE_TOOLTIP =
	'Estimated token count (prompt fields ÷ 4; falls back to data_size ÷ 4)'
const TOKEN_PRECISE_TOOLTIP = 'Token count (cached precise measurement'
const TOKEN_ESTIMATE_FIELD_RESOLVERS = Object.freeze([
	character => pickFirstStringValue(character?.raw?.data?.name, character?.raw?.name, character?.name),
	character => pickFirstStringValue(character?.raw?.data?.description, character?.raw?.description),
	character => pickFirstStringValue(character?.raw?.data?.personality, character?.raw?.personality),
	character => pickFirstStringValue(character?.raw?.data?.scenario, character?.raw?.scenario),
	character => pickFirstStringValue(character?.raw?.data?.first_mes, character?.raw?.first_mes),
	character => pickFirstStringValue(character?.raw?.data?.mes_example, character?.raw?.mes_example),
	character => pickFirstStringValue(character?.raw?.data?.system_prompt),
	character => pickFirstStringValue(character?.raw?.data?.post_history_instructions),
	character => pickFirstStringValue(character?.raw?.data?.extensions?.depth_prompt?.prompt),
])

export function createHomeCardTokenDisplay(doc, character) {
	const hostDoc = doc ?? globalThis.document
	if (!hostDoc || typeof hostDoc.createElement !== 'function') {
		return null
	}
	const cachedEntry = readHomeCardTokenCache(character)
	const estimate = resolveCharacterTokenEstimate(character)
	if (cachedEntry === null && estimate === null) {
		return null
	}

	const node = hostDoc.createElement('span')
	node.className = 'astra-home-card__tokenEstimate'
	const icon = hostDoc.createElement('span')
	icon.className = 'astra-home-card__tokenEstimateIcon'
	icon.innerHTML = TOKEN_ICON_MARKUP
	const value = hostDoc.createElement('span')
	value.className = 'astra-home-card__tokenEstimateValue'
	node.append(icon, value)

	const state = {
		accuracy: 'estimate',
		sourceLabel: '',
		tokens: null,
	}

	const applyTokens = (tokens, descriptor = {}) => {
		const normalized = normalizeTokenCount(tokens)
		if (normalized === null) {
			return false
		}
		state.tokens = normalized
		state.accuracy = descriptor?.accuracy === 'precise' ? 'precise' : 'estimate'
		state.sourceLabel =
			state.accuracy === 'precise'
				? normalizeTokenSourceLabel(descriptor?.sourceLabel) ||
					normalizeTokenSourceLabel(descriptor?.sourceId)
				: ''
		node.dataset.tokenAccuracy = state.accuracy
		value.textContent = `${formatCompactCount(normalized)} tokens`
		node.title = buildTokenTooltip(state)
		if (state.accuracy === 'precise' && descriptor?.persist !== false) {
			writeHomeCardTokenCache(character, {
				tokens: normalized,
				sourceId: descriptor?.sourceId,
				sourceLabel: descriptor?.sourceLabel ?? state.sourceLabel,
			})
		}
		return true
	}

	if (cachedEntry) {
		applyTokens(cachedEntry.tokens, {
			accuracy: cachedEntry.accuracy ?? 'precise',
			persist: false,
			sourceId: cachedEntry.sourceId,
			sourceLabel: cachedEntry.sourceLabel,
		})
	} else if (estimate !== null) {
		applyTokens(estimate, { accuracy: 'estimate', persist: false })
	}

	const controller = {
		element: node,
		getState() {
			return { ...state }
		},
		markCardOpened() {
			if (state.accuracy === 'precise') {
				return
			}
			const entry = readHomeCardTokenCache(character)
			if (entry) {
				applyTokens(entry.tokens, {
					accuracy: entry.accuracy ?? 'precise',
					persist: false,
					sourceId: entry.sourceId,
					sourceLabel: entry.sourceLabel,
				})
			}
		},
		applyPreciseTokens(tokens, options = {}) {
			return applyTokens(tokens, {
				accuracy: 'precise',
				persist: options?.persist !== false,
				sourceId: options?.sourceId,
				sourceLabel: options?.sourceLabel,
			})
		},
		refreshFromCache() {
			const entry = readHomeCardTokenCache(character)
			if (!entry) return false
			return applyTokens(entry.tokens, {
				accuracy: entry.accuracy ?? 'precise',
				persist: false,
				sourceId: entry.sourceId,
				sourceLabel: entry.sourceLabel,
			})
		},
	}

	return {
		node,
		controller,
	}
}

export function resolveCharacterTokenEstimate(character) {
	const promptEstimate = estimateTokensFromPromptFields(character)
	if (promptEstimate !== null) {
		return promptEstimate
	}
	return estimateTokensFromDataSize(character)
}

export function readHomeCardTokenCache(character) {
	const slot = resolveTokenCacheSlot(character)
	if (!slot) return null
	const storage = getLocalStorage()
	if (!storage) return null
	let raw = null
	try {
		raw = storage.getItem(slot.storageKey)
	} catch {
		return null
	}
	if (!raw) return null
	let parsed = null
	try {
		parsed = JSON.parse(raw)
	} catch {
		safeRemove(storage, slot.storageKey)
		return null
	}
	if (!parsed || parsed.identity !== slot.identity) {
		safeRemove(storage, slot.storageKey)
		return null
	}
	const tokens = normalizeTokenCount(parsed.tokens)
	if (tokens === null) {
		safeRemove(storage, slot.storageKey)
		return null
	}
	return {
		tokens,
		accuracy: parsed.accuracy === 'precise' ? 'precise' : 'estimate',
		updatedAt: Number.isFinite(parsed.updatedAt) ? parsed.updatedAt : 0,
		sourceId: normalizeTokenSourceId(parsed.sourceId),
		sourceLabel: normalizeTokenSourceLabel(parsed.sourceLabel),
	}
}

export function writeHomeCardTokenCache(character, payload = {}) {
	const slot = resolveTokenCacheSlot(character)
	if (!slot) return false
	const storage = getLocalStorage()
	if (!storage) return false
	const tokens = normalizeTokenCount(payload?.tokens)
	if (tokens === null) {
		safeRemove(storage, slot.storageKey)
		return false
	}
	if (payload?.accuracy && payload.accuracy !== 'precise') {
		return false
	}
	const entry = {
		tokens,
		accuracy: 'precise',
		updatedAt: Date.now(),
		identity: slot.identity,
	}
	const sourceId = normalizeTokenSourceId(payload?.sourceId ?? payload?.source)
	if (sourceId) {
		entry.sourceId = sourceId
	}
	const sourceLabel = normalizeTokenSourceLabel(payload?.sourceLabel)
	if (sourceLabel) {
		entry.sourceLabel = sourceLabel
	}
	return safeSet(storage, slot.storageKey, JSON.stringify(entry))
}

export function clearHomeCardTokenCache(character) {
	const slot = resolveTokenCacheSlot(character)
	if (!slot) return false
	const storage = getLocalStorage()
	if (!storage) return false
	return safeRemove(storage, slot.storageKey)
}

function estimateTokensFromPromptFields(character) {
	const fieldTexts = collectTokenEstimateFieldTexts(character)
	if (!fieldTexts.length) {
		return null
	}
	const totalLength = fieldTexts.reduce((sum, text) => sum + text.length, 0)
	return lengthToTokenEstimate(totalLength)
}

function estimateTokensFromDataSize(character) {
	const rawValue =
		typeof character?.raw?.data_size === 'number'
			? character.raw.data_size
			: Number(character?.raw?.data_size ?? Number.NaN)
	return lengthToTokenEstimate(rawValue)
}

function collectTokenEstimateFieldTexts(character) {
	if (!Array.isArray(TOKEN_ESTIMATE_FIELD_RESOLVERS)) {
		return []
	}
	const values = []
	for (const resolver of TOKEN_ESTIMATE_FIELD_RESOLVERS) {
		if (typeof resolver !== 'function') continue
		try {
			const text = resolver(character)
			if (typeof text === 'string' && text.length) {
				values.push(text)
			}
		} catch {
			/* ignore resolver failures */
		}
	}
	return values
}

function lengthToTokenEstimate(length) {
	const normalized = Number(length)
	if (!Number.isFinite(normalized) || normalized <= 0) {
		return null
	}
	const rounded = Math.max(1, Math.round(normalized / TOKEN_ESTIMATE_DIVISOR))
	if (!Number.isFinite(rounded) || rounded <= 0) {
		return null
	}
	return rounded
}

function pickFirstStringValue(...candidates) {
	for (const candidate of candidates) {
		if (typeof candidate === 'string' && candidate.length) {
			return candidate
		}
	}
	return null
}

function resolveTokenCacheSlot(character) {
	const identity = createTokenIdentitySignature(character)
	if (!identity) {
		return null
	}
	return {
		identity,
		storageKey: `${TOKEN_CACHE_PREFIX}:${TOKEN_CACHE_VERSION}:${hashString(identity)}`,
	}
}

function createTokenIdentitySignature(character) {
	const key = normalizeCacheSegment(resolveCharacterKey(character))
	const version = normalizeCacheSegment(resolveCharacterVersion(character))
	const dataSize = Number(character?.raw?.data_size ?? Number.NaN)
	const fieldTexts = collectTokenEstimateFieldTexts(character)
	const fieldHash = fieldTexts.length ? hashString(fieldTexts.join(TOKEN_FIELD_HASH_SEPARATOR)) : ''
	const sizeSegment = Number.isFinite(dataSize) ? `size:${dataSize}` : ''
	const identity = [key, version, sizeSegment, fieldHash].filter(Boolean).join('|')
	return identity || ''
}

function normalizeCacheSegment(value) {
	if (value === null || value === undefined) {
		return ''
	}
	const normalized = String(value).trim()
	if (!normalized) {
		return ''
	}
	return normalized
}

function hashString(value) {
	const normalized = typeof value === 'string' ? value : String(value ?? '')
	let hash = 2166136261
	for (let index = 0; index < normalized.length; index += 1) {
		hash ^= normalized.charCodeAt(index)
		hash = (hash * 16777619) >>> 0
	}
	return hash.toString(16)
}

function normalizeTokenCount(value) {
	const numeric = Number(value)
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return null
	}
	return Math.max(1, Math.round(numeric))
}

function getLocalStorage() {
	try {
		if (typeof globalThis?.localStorage !== 'undefined') {
			return globalThis.localStorage
		}
	} catch {
		/* ignore access errors */
	}
	return null
}

function safeSet(storage, key, value) {
	try {
		storage.setItem(key, value)
		return true
	} catch {
		return false
	}
}

function safeRemove(storage, key) {
	try {
		storage.removeItem(key)
		return true
	} catch {
		return false
	}
}

function normalizeTokenSourceId(value) {
	if (typeof value !== 'string') {
		return ''
	}
	const trimmed = value.trim()
	return trimmed
}

function normalizeTokenSourceLabel(value) {
	if (typeof value !== 'string') {
		return ''
	}
	const trimmed = value.trim()
	return trimmed
}

function buildTokenTooltip(state) {
	if (state.accuracy === 'precise') {
		const suffix = state.sourceLabel ? ` from ${state.sourceLabel}` : ''
		return `${TOKEN_PRECISE_TOOLTIP}${suffix})`
	}
	return TOKEN_ESTIMATE_TOOLTIP
}
