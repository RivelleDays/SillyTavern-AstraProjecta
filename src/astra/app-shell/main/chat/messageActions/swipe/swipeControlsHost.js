import React from 'react'
import { createRoot } from 'react-dom/client'
import { ensureActionContainer, getChat, getCtx, getEventSource, getEventTypes } from '../context/chatMessageContext.js'
import { hydrateContinueState } from '../state/continueState.js'
import { SwipeControlsBar } from './components/SwipeControlsBar.jsx'

let swipeRoot = null
let swipeSlot = null
let pendingSyncTimeout = null
let chatObserver = null

function resolveMessageElement({ targetMesIdx, providedContainer } = {}) {
	const fromProvided = providedContainer?.closest?.('.mes')
	if (fromProvided && Number(fromProvided.getAttribute('mesid')) === targetMesIdx) {
		return fromProvided
	}

	const byMesId = document.querySelector(`#chat .mes[mesid="${targetMesIdx}"]`)
	if (byMesId) {
		return byMesId
	}

	return document.querySelector('#chat .mes.last_mes') ?? document.querySelector('#chat .mes:last-of-type')
}

function callSwipeLeft(targetMesIdx = null) {
	const ctx = getCtx()
	const swipeFn = ctx?.swipe_left ?? globalThis?.swipe_left
	if (typeof swipeFn === 'function') {
		const payload = typeof targetMesIdx === 'number' ? { forceMesId: targetMesIdx } : undefined
		swipeFn(null, payload)
		return
	}
	const buttonSelector =
		typeof targetMesIdx === 'number'
			? `#chat .mes[mesid="${targetMesIdx}"] .swipe_left, #chat .last_mes .swipe_left`
			: '#chat .last_mes .swipe_left, #chat .swipe_left'
	const btn = document.querySelector(buttonSelector)
	btn?.click()
}

function callSwipeRight(targetMesIdx = null) {
	const ctx = getCtx()
	const swipeFn = ctx?.swipe_right ?? globalThis?.swipe_right
	if (typeof swipeFn === 'function') {
		const payload = typeof targetMesIdx === 'number' ? { forceMesId: targetMesIdx } : undefined
		swipeFn(null, payload)
		return
	}
	const buttonSelector =
		typeof targetMesIdx === 'number'
			? `#chat .mes[mesid="${targetMesIdx}"] .swipe_right, #chat .last_mes .swipe_right`
			: '#chat .last_mes .swipe_right, #chat .swipe_right'
	const btn = document.querySelector(buttonSelector)
	btn?.click()
}

function unmountSwipe() {
	if (swipeRoot) {
		swipeRoot.unmount()
	}
	swipeRoot = null
	swipeSlot = null
}

function syncSwipeControls({ mesIdx: providedMesIdx = null, container: providedContainer = null } = {}) {
	if (pendingSyncTimeout) {
		clearTimeout(pendingSyncTimeout)
		pendingSyncTimeout = null
	}

	const chat = getChat()
	if (!chat.length) {
		unmountSwipe()
		return
	}

	// Always target the last message in the chat array to mirror SillyTavern swipe rules
	const targetMesIdx = chat.length - 1
	const message = chat[targetMesIdx]
	const messageEl = resolveMessageElement({ targetMesIdx, providedContainer })
	const mesIdFromDom = messageEl ? Number(messageEl.getAttribute('mesid')) : null

	if (!message || !messageEl) {
		unmountSwipe()
		scheduleSwipeSync()
		return
	}

	// Only allow swipe for last, non-user messages (match isMessageSwipeable)
	const isLast = targetMesIdx === chat.length - 1
	const hasMatchingMesId = Number.isInteger(mesIdFromDom) && mesIdFromDom === targetMesIdx
	const isSwipeable =
		isLast && !message.is_user && message?.extra?.swipeable !== false && message?.extra?.isSmallSys !== true
	if (!isSwipeable) {
		unmountSwipe()
		return
	}
	if (!hasMatchingMesId) {
		unmountSwipe()
		scheduleSwipeSync()
		return
	}

	hydrateContinueState(message)

	const slots = ensureActionContainer(messageEl)
	if (!slots?.container) {
		unmountSwipe()
		return
	}

	const rightSlot = slots.rightSwipeHost ?? slots.rightDefault ?? slots.rightSlot ?? slots.container

	const total = Array.isArray(message.swipes) && message.swipes.length ? message.swipes.length : 1
	const safeTotal = Math.max(1, total)
	const swipeId = Number.isInteger(message.swipe_id) ? message.swipe_id : 0
	const clampedIndex = Math.min(safeTotal - 1, Math.max(0, swipeId))

	if (!swipeRoot || swipeSlot !== rightSlot) {
		swipeRoot?.unmount()
		swipeRoot = createRoot(rightSlot)
		swipeSlot = rightSlot
	}

	swipeRoot.render(
		<SwipeControlsBar
			total={safeTotal}
			currentIndex={clampedIndex}
			onPrev={() => {
				if (safeTotal > 1 && clampedIndex <= 0) {
					callSwipeRight(targetMesIdx)
					return
				}
				callSwipeLeft(targetMesIdx)
			}}
			onNext={() => {
				callSwipeRight(targetMesIdx)
			}}
		/>,
	)
}

function scheduleSwipeSync(delay = 120) {
	if (pendingSyncTimeout) return
	pendingSyncTimeout = setTimeout(() => {
		pendingSyncTimeout = null
		syncSwipeControls()
	}, delay)
}

function createSwipeControlsHost() {
	const ctx = getCtx()
	const eventSource = getEventSource()
	const eventTypes = getEventTypes()
	if (ctx?.eventSource && ctx?.event_types && eventSource && eventTypes) {
		eventSource.on(eventTypes.MESSAGE_SWIPED, () => scheduleSwipeSync(0))
		eventSource.on(eventTypes.MESSAGE_SWIPE_DELETED, () => scheduleSwipeSync(0))
		eventSource.on(eventTypes.CHARACTER_MESSAGE_RENDERED, () => scheduleSwipeSync(0))
		eventSource.on(eventTypes.USER_MESSAGE_RENDERED, () => scheduleSwipeSync(0))
		eventSource.on(eventTypes.CHAT_CHANGED, () => scheduleSwipeSync(0))
		eventSource.on(eventTypes.GENERATION_STARTED, () => scheduleSwipeSync(0))
		eventSource.on(eventTypes.GENERATION_STOPPED, () => scheduleSwipeSync(0))
		eventSource.on(eventTypes.MESSAGE_EDITED, () => scheduleSwipeSync(0))
		eventSource.on(eventTypes.MESSAGE_UPDATED, () => scheduleSwipeSync(0))
	}

	if (!chatObserver) {
		const chatRoot = document.querySelector('#chat')
		if (chatRoot) {
			chatObserver = new MutationObserver(mutations => {
				const shouldSync = mutations.some(
					mutation =>
						mutation.addedNodes?.length ||
						mutation.removedNodes?.length ||
						(mutation.type === 'attributes' && (mutation.attributeName === 'mesid' || mutation.attributeName === 'class')),
				)
				if (shouldSync) {
					scheduleSwipeSync(0)
				}
			})
			chatObserver.observe(chatRoot, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ['mesid', 'class'],
			})
		}
	}

	return {
		syncSwipeControls,
	}
}

export { createSwipeControlsHost, scheduleSwipeSync, syncSwipeControls }
