import { LOG_PREFIX, ensureActionContainer, getChat, getChatRoot, getCtx, getEventSource, getEventTypes, initializeEnv } from '../context/chatMessageContext.js'
import { timestampToMoment } from '../../../../../../../../../../utils.js'

const TIMESTAMP_FORMAT = 'LLL'
const DEFAULT_SYNC_DELAY = 80

const metaEntries = new Map()
let pendingSyncTimeout = null
let observer = null
let hasInitialized = false

function getMessageId(el) {
	const raw = Number(el?.getAttribute?.('mesid'))
	return Number.isFinite(raw) ? raw : null
}

function formatTimestamp(value) {
	const toMoment = typeof timestampToMoment === 'function' ? timestampToMoment : null
	if (!value) return ''

	if (toMoment) {
		const candidate = toMoment(value)
		if (candidate?.isValid?.()) {
			return candidate.format(TIMESTAMP_FORMAT)
		}
	}

	const date = new Date(value)
	if (!Number.isNaN(date.getTime())) {
		return date.toLocaleString()
	}

	return ''
}

function formatGenerationTimer(gen_started, gen_finished, tokenCount, reasoningDuration = null, timeToFirstToken = null) {
	if (!gen_started || !gen_finished) {
		return {}
	}

	const momentLib = globalThis?.moment
	if (typeof momentLib !== 'function') {
		const seconds = Math.max(0, (Number(gen_finished) - Number(gen_started)) / 1000)
		if (!Number.isFinite(seconds)) return {}
		return {
			timerValue: `${seconds.toFixed(1)}s`,
			timerTitle: `Time to generate: ${seconds} seconds${tokenCount ? `\nToken rate: ${Number(tokenCount / seconds).toFixed(3)} t/s` : ''}`,
		}
	}

	const dateFormat = 'HH:mm:ss D MMM YYYY'
	const start = momentLib(gen_started)
	const finish = momentLib(gen_finished)
	const seconds = finish.diff(start, 'seconds', true)
	const timerValue = `${seconds.toFixed(1)}s`
	const timerTitle = [
		`Generation queued: ${start.format(dateFormat)}`,
		`Reply received: ${finish.format(dateFormat)}`,
		`Time to generate: ${seconds} seconds`,
		timeToFirstToken ? `Time to first token: ${timeToFirstToken / 1000} seconds` : '',
		reasoningDuration > 0 ? `Time to think: ${reasoningDuration / 1000} seconds` : '',
		tokenCount > 0 ? `Token rate: ${Number(tokenCount / seconds).toFixed(3)} t/s` : '',
	].filter(Boolean).join('\n').trim()

	if (Number.isNaN(seconds) || seconds < 0) {
		return { timerValue: '', timerTitle }
	}

	return { timerValue, timerTitle }
}

function resolveTimerDisplay({ mesEl, message }) {
	const nativeTimer = mesEl?.querySelector?.('.mes_timer')
	const nativeValue = nativeTimer?.textContent?.trim?.() ?? ''
	const nativeTitle = nativeTimer?.getAttribute?.('title') ?? ''
	if (nativeValue) {
		return { value: nativeValue, title: nativeTitle }
	}

	const start = message?.gen_started
	const finish = message?.gen_finished ?? Date.now()
	if (!start) return { value: '', title: '' }

	const { timerValue, timerTitle } = formatGenerationTimer(
		start,
		finish,
		message?.extra?.token_count,
		message?.extra?.reasoning_duration,
		message?.extra?.time_to_first_token,
	)

	return { value: timerValue ?? '', title: timerTitle ?? '' }
}

function resolveTokenCount(message) {
	if (!message) return null

	const swipeIdx = Number.isInteger(message.swipe_id) ? message.swipe_id : 0
	const fromSwipe = message?.swipe_info?.[swipeIdx]?.extra?.token_count
	if (Number.isFinite(fromSwipe)) return fromSwipe

	const direct = message?.extra?.token_count
	if (Number.isFinite(direct)) return direct

	return null
}

function ensureMetaNodes(slots) {
	let entry = metaEntries.get(slots.container)
	if (entry) return entry

	const idEl = document.createElement('span')
	idEl.className = 'astra-messageMeta__item astra-messageMeta__id'

	const timerEl = document.createElement('span')
	timerEl.className = 'astra-messageMeta__item astra-messageMeta__timer'

	const tokenEl = document.createElement('span')
	tokenEl.className = 'astra-messageMeta__item astra-messageMeta__token'

	const timestampEl = document.createElement('span')
	timestampEl.className = 'astra-messageMeta__item astra-messageMeta__timestamp'

	slots.metaLeft?.append(idEl, timerEl, tokenEl)
	slots.metaRight?.append(timestampEl)

	entry = { idEl, timerEl, tokenEl, timestampEl, metaRow: slots.metaRow, lastSnapshot: null }
	metaEntries.set(slots.container, entry)
	return entry
}

function setItem(el, value, title = '') {
	if (!el) return
	const safeValue = value ?? ''
	el.textContent = safeValue
	if (title) {
		el.title = title
	} else {
		el.removeAttribute('title')
	}
	el.dataset.empty = safeValue ? 'false' : 'true'
}

function syncMessageMetaForElement(mesEl) {
	const mesId = getMessageId(mesEl)
	const chat = getChat()
	const message = typeof mesId === 'number' ? chat?.[mesId] : null
	if (!message) return null

	const slots = ensureActionContainer(mesEl)
	if (!slots?.metaLeft || !slots?.metaRight) return null

	const entry = ensureMetaNodes(slots)

	const idText = Number.isFinite(mesId) ? `#${mesId}` : ''
	const timerDisplay = resolveTimerDisplay({ mesEl, message })
	const tokenCount = resolveTokenCount(message)
	const timestamp = formatTimestamp(message?.send_date)
	const snapshot = {
		idText,
		timerValue: timerDisplay.value ?? '',
		timerTitle: timerDisplay.title ?? '',
		tokenText: tokenCount != null ? `${tokenCount}t` : '',
		timestamp: timestamp ?? '',
	}

	const prev = entry.lastSnapshot
	const isSame =
		prev &&
		prev.idText === snapshot.idText &&
		prev.timerValue === snapshot.timerValue &&
		prev.timerTitle === snapshot.timerTitle &&
		prev.tokenText === snapshot.tokenText &&
		prev.timestamp === snapshot.timestamp

	if (!isSame) {
		setItem(entry.idEl, snapshot.idText)
		setItem(entry.timerEl, snapshot.timerValue, snapshot.timerTitle)
		setItem(entry.tokenEl, snapshot.tokenText)
		setItem(entry.timestampEl, snapshot.timestamp)
		entry.lastSnapshot = snapshot
	}

	const hasContent = [idText, timerDisplay.value, tokenCount != null ? `${tokenCount}t` : '', timestamp].some(Boolean)
	if (entry.metaRow) {
		entry.metaRow.dataset.astraEmpty = hasContent ? 'false' : 'true'
	}

	return slots.container
}

function cleanupEntries(liveContainers) {
	for (const [container] of metaEntries.entries()) {
		if (!liveContainers.has(container) || !container.isConnected) {
			metaEntries.delete(container)
		}
	}
}

function syncMessageMeta() {
	const containers = new Set()
	const messageEls = document.querySelectorAll('#chat .mes[mesid]')

	messageEls.forEach(mesEl => {
		const container = syncMessageMetaForElement(mesEl)
		if (container) {
			containers.add(container)
		}
	})

	cleanupEntries(containers)
}

function scheduleMessageMetaSync(delay = DEFAULT_SYNC_DELAY) {
	if (pendingSyncTimeout) return
	pendingSyncTimeout = setTimeout(() => {
		pendingSyncTimeout = null
		syncMessageMeta()
	}, delay)
}

function attachEvents() {
	const eventSource = getEventSource()
	const eventTypes = getEventTypes()
	if (!eventSource || !eventTypes) return

	const syncEventKeys = [
		'MESSAGE_SWIPED',
		'MESSAGE_SWIPE_DELETED',
		'MESSAGE_UPDATED',
		'MESSAGE_EDITED',
		'MESSAGE_DELETED',
		'CHAT_CHANGED',
		'USER_MESSAGE_RENDERED',
		'CHARACTER_MESSAGE_RENDERED',
		'GENERATION_STARTED',
		'GENERATION_STOPPED',
	]

	syncEventKeys.forEach(key => {
		const type = eventTypes[key]
		if (type) {
			eventSource.on(type, () => scheduleMessageMetaSync(0))
		}
	})
}

function startObservers() {
	if (observer) return
	const chatRoot = getChatRoot()
	if (!chatRoot) return
	observer = new MutationObserver(mutations => {
		const hasChanges = mutations.some(
			mutation =>
				mutation.addedNodes?.length ||
				mutation.removedNodes?.length ||
				(mutation.type === 'attributes' && (mutation.attributeName === 'mesid' || mutation.attributeName === 'class')),
		)
		if (hasChanges) {
			scheduleMessageMetaSync(0)
		}
	})
	observer.observe(chatRoot, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['mesid', 'class'],
	})
}

function initializeMessageMeta({ getContext } = {}) {
	if (hasInitialized) return
	initializeEnv(getContext)
	const ctx = getCtx()
	if (!ctx?.eventSource || !ctx?.event_types) {
		console.warn(`${LOG_PREFIX} Message meta skipped: missing SillyTavern context`)
		return
	}
	hasInitialized = true

	attachEvents()
	startObservers()
	syncMessageMeta()
}

export {
	initializeMessageMeta,
	scheduleMessageMetaSync,
	syncMessageMeta,
}
