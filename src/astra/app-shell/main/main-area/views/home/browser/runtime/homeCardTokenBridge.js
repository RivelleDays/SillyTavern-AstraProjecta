import {
	collectCharacters,
	resolveContext,
	resolveCurrentCharacterId,
} from '@/astra/shared/characters/characterData.js'
import { resolveCharacterKey } from '../cards/homeCardData.js'

const TOKEN_NODE_ID = 'result_info_total_tokens'
const TOKEN_MUTATION_OBSERVER_CONFIG = {
	characterData: true,
	childList: true,
	subtree: true,
}
const DEFAULT_TOKEN_SOURCE_ID = 'sillytavern.result_info_total_tokens'
const DEFAULT_TOKEN_SOURCE_LABEL = 'SillyTavern total tokens'

export function createHomeCardTokenBridge({ deps, onTokens } = {}) {
	const doc = typeof document !== 'undefined' ? document : null
	if (!doc) return null

	const MutationObserverRef =
		typeof globalThis?.MutationObserver === 'function' ? globalThis.MutationObserver : null

	let documentObserver = null
	let documentPollInterval = null
	let nodeObserverCleanup = null
	let disposed = false
	let observedNode = null
	let lastEmissionKey = null
	let lastEmissionValue = null

	function checkObservedNode() {
		if (disposed) return
		const node = doc.getElementById(TOKEN_NODE_ID)
		if (!node) {
			if (observedNode) {
				detachNodeObserver()
				observedNode = null
			}
			return
		}
		if (observedNode === node) {
			if (!isNodeInDocument(node)) {
				detachNodeObserver()
				observedNode = null
				queueNodeSearch()
			}
			return
		}
		observedNode = node
		attachNodeObserver(node)
		readTokenNode()
	}

	function attachNodeObserver(node) {
		detachNodeObserver()
		if (!node) return
		if (MutationObserverRef) {
			const observer = new MutationObserverRef(readTokenNode)
			try {
				observer.observe(node, TOKEN_MUTATION_OBSERVER_CONFIG)
				nodeObserverCleanup = () => {
					try {
						observer.disconnect()
					} catch {
						/* ignore disconnect errors */
					}
				}
			} catch {
				nodeObserverCleanup = null
			}
		} else {
			const intervalId = setInterval(readTokenNode, 1_000)
			nodeObserverCleanup = () => clearInterval(intervalId)
		}
	}

	function detachNodeObserver() {
		if (typeof nodeObserverCleanup === 'function') {
			try {
				nodeObserverCleanup()
			} catch {
				/* ignore teardown failures */
			}
		}
		nodeObserverCleanup = null
	}

	function readTokenNode() {
		if (disposed || !observedNode) return
		const tokens = parseTokenValue(observedNode.textContent)
		if (tokens === null) return

		const payload = resolveActiveCharacterPayload(tokens)
		if (!payload) return

		if (payload.characterKey === lastEmissionKey && payload.tokens === lastEmissionValue) {
			return
		}

		lastEmissionKey = payload.characterKey
		lastEmissionValue = payload.tokens

		try {
			onTokens?.(payload)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to propagate precise token update.', error)
		}
	}

	function resolveActiveCharacterPayload(tokens) {
		if (!Number.isFinite(tokens) || tokens <= 0) {
			return null
		}
		const context = resolveContext(deps?.getContext)
		if (!context) {
			return null
		}
		const currentCharacterId = resolveCurrentCharacterId(context)
		if (!Number.isFinite(currentCharacterId)) {
			return null
		}

		const characters = collectCharacters(context)
		const active = characters.find(entry => entry.id === currentCharacterId)
		if (!active) return null

		const characterKey = resolveCharacterKey(active)
		if (!characterKey) return null

		return {
			character: active,
			characterKey,
			tokens: Math.max(1, Math.round(tokens)),
			sourceId: DEFAULT_TOKEN_SOURCE_ID,
			sourceLabel: DEFAULT_TOKEN_SOURCE_LABEL,
		}
	}

	function isNodeInDocument(node) {
		if (!node) return false
		const root = doc?.documentElement ?? null
		if (!root) return false
		return root.contains(node)
	}

	function queueNodeSearch() {
		if (documentObserver || documentPollInterval) {
			return
		}
		documentPollInterval = setInterval(() => {
			if (disposed) return
			if (observedNode && isNodeInDocument(observedNode)) {
				clearInterval(documentPollInterval)
				documentPollInterval = null
				return
			}
			checkObservedNode()
		}, 1_000)
	}

	if (MutationObserverRef && doc.documentElement) {
		documentObserver = new MutationObserverRef(checkObservedNode)
		try {
			documentObserver.observe(doc.documentElement, { childList: true, subtree: true })
		} catch {
			/* ignore observer failures */
		}
	} else if (!MutationObserverRef) {
		queueNodeSearch()
	}

	checkObservedNode()

	return {
		triggerCheck() {
			checkObservedNode()
			readTokenNode()
		},
		destroy() {
			disposed = true
			if (documentObserver) {
				try {
					documentObserver.disconnect()
				} catch {
					/* ignore disconnect errors */
				}
				documentObserver = null
			}
			if (documentPollInterval) {
				clearInterval(documentPollInterval)
				documentPollInterval = null
			}
			detachNodeObserver()
			observedNode = null
		},
	}
}

function parseTokenValue(textContent) {
	if (typeof textContent !== 'string') {
		return null
	}
	const trimmed = textContent.trim()
	if (!trimmed || trimmed === '—') {
		return null
	}
	const normalized = trimmed.replace(/,/g, '').replace(/[^\d.]/g, '')
	if (!normalized) {
		return null
	}
	const numeric = Number(normalized)
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return null
	}
	return numeric
}
