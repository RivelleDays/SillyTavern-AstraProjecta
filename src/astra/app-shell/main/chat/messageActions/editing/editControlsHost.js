import React from 'react'
import { createRoot } from 'react-dom/client'
import { LOG_PREFIX, ensureActionContainer, getChat, getChatRoot, getCtx, initializeEnv } from '../context/chatMessageContext.js'
import { EditModeActions } from './components/EditModeActions.jsx'
import { EditToggleButton } from './components/EditToggleButton.jsx'

const editEntries = new Map()
let pendingSyncTimeout = null
let observer = null
let hasInitialized = false
let activeEditId = null
let coreChatModulePromise = null

const DEFAULT_SYNC_DELAY = 100

async function getCoreChatModule() {
	if (!coreChatModulePromise) {
		coreChatModulePromise = import(
			/* webpackIgnore: true */
			'/script.js'
		)
	}
	return coreChatModulePromise
}

function getMessageId(el) {
	const raw = Number(el?.getAttribute?.('mesid'))
	return Number.isFinite(raw) ? raw : null
}

function detectActiveEditId() {
	const editArea = document.querySelector('#curEditTextarea, .edit_textarea')
	if (!editArea) return null
	const mesEl = editArea.closest?.('.mes')
	return getMessageId(mesEl)
}

function waitForEditRelease(targetMesId = null, { attempts = 5, delay = 50 } = {}) {
	return new Promise(resolve => {
		let remaining = attempts
		const tick = () => {
			const current = detectActiveEditId()
			if (current === null || current === targetMesId || remaining <= 0) {
				resolve()
				return
			}
			remaining -= 1
			setTimeout(tick, delay)
		}
		tick()
	})
}

async function closeExistingEditIfNeeded(nextMesId) {
	const existingEditId = detectActiveEditId()
	if (existingEditId === null || existingEditId === nextMesId) return

	// Mirror native behavior: finish the existing edit before opening a new one
	triggerHiddenButton(existingEditId, '.mes_edit_done')

	// Fallback to cancel if done button is missing (unlikely but safer)
	if (detectActiveEditId() === existingEditId) {
		triggerHiddenButton(existingEditId, '.mes_edit_cancel')
	}

	await waitForEditRelease(nextMesId)
}

async function startEdit(mesId) {
	await closeExistingEditIfNeeded(mesId)

	const chatModule = await getCoreChatModule().catch(error => {
		console?.error?.(`${LOG_PREFIX} Failed to load SillyTavern core for editing`, error)
		return null
	})
	const messageEdit = chatModule?.messageEdit ?? chatModule?.default?.messageEdit
	if (typeof messageEdit !== 'function') {
		console?.warn?.(`${LOG_PREFIX} Missing messageEdit from core script`)
		return
	}
	try {
		await messageEdit(mesId)
		activeEditId = detectActiveEditId() ?? mesId
	} catch (error) {
		console?.error?.(`${LOG_PREFIX} Failed to enter edit mode for message #${mesId}`, error)
	}
	scheduleSync(0)
}

function triggerHiddenButton(mesId, selector) {
	const target = document.querySelector(`#chat .mes[mesid="${mesId}"] ${selector}`)
	if (!target) return

	// Prevent duplicate reasoning editors from stacking
	if (selector === '.mes_edit_add_reasoning') {
		const mesEl = target.closest('.mes')
		if (mesEl?.querySelector('.reasoning_edit_textarea')) {
			return
		}
	}

	target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function cleanupEntries(liveContainers) {
	for (const [container, entry] of editEntries.entries()) {
		if (!liveContainers.has(container) || !container.isConnected) {
			entry?.toggleRoot?.unmount()
			entry?.editRoot?.unmount()
			editEntries.delete(container)
		}
	}
}

function renderToggle({ entry, mesId, slots }) {
	const hasActiveEdit = activeEditId !== null && activeEditId !== mesId
	if (hasActiveEdit) {
		entry.toggleRoot?.render(null)
		return
	}

	const toggleHost =
		slots.rightEditHost ??
		slots.rightDefault ??
		slots.rightSlot ??
		slots.leftToggleHost ??
		slots.leftDefault ??
		slots.leftSlot ??
		slots.container
	if (!toggleHost) return

	if (!entry.toggleRoot || entry.toggleSlot !== toggleHost) {
		entry.toggleRoot?.unmount()
		entry.toggleRoot = createRoot(toggleHost)
		entry.toggleSlot = toggleHost
	}

	entry.toggleRoot.render(
		<EditToggleButton
			onClick={() => startEdit(mesId)}
		/>,
	)
}

function renderEditBar({ entry, mesId, slots }) {
	const editHost = slots.leftEdit ?? slots.leftSlot ?? slots.container
	if (!editHost) return

	if (!entry.editRoot || entry.editSlot !== editHost) {
		entry.editRoot?.unmount()
		entry.editRoot = createRoot(editHost)
		entry.editSlot = editHost
	}

	const chat = getChat()
	const lastIdx = chat.length - 1
	const message = chat[mesId]
	const canMoveUp = typeof mesId === 'number' ? mesId > 0 : true
	const canMoveDown = typeof mesId === 'number' ? mesId < lastIdx : true
	const mesEl = slots.container?.closest?.('.mes')
	const reasoningState = mesEl?.dataset?.reasoningState
	const hasReasoningClass = mesEl?.classList?.contains?.('reasoning')
	const hasStoredReasoning = Boolean(message?.extra?.reasoning)
	const hasReasoningTextarea = Boolean(mesEl?.querySelector?.('.reasoning_edit_textarea'))
	const hideReasonButton = hasStoredReasoning && reasoningState !== 'hidden' && hasReasoningClass

	entry.editRoot.render(
		<EditModeActions
			onCopy={() => triggerHiddenButton(mesId, '.mes_edit_copy')}
			onReason={() => triggerHiddenButton(mesId, '.mes_edit_add_reasoning')}
			onMoveUp={() => triggerHiddenButton(mesId, '.mes_edit_up')}
			onMoveDown={() => triggerHiddenButton(mesId, '.mes_edit_down')}
			onDelete={() => triggerHiddenButton(mesId, '.mes_edit_delete')}
			onConfirm={() => triggerHiddenButton(mesId, '.mes_edit_done')}
			onCancel={() => triggerHiddenButton(mesId, '.mes_edit_cancel')}
			canMoveUp={canMoveUp}
			canMoveDown={canMoveDown}
			rightSlot={slots.rightEdit ?? slots.rightSlot}
			showReasoningButton={!hideReasonButton}
			disableReasonButton={hasReasoningTextarea}
		/>,
	)
}

function syncMessage(mesEl) {
	const mesId = getMessageId(mesEl)
	const slots = ensureActionContainer(mesEl)
	if (!slots?.container || mesId === null) return null

	const { container } = slots
	const isEditing = mesId === activeEditId
	const isToggleDisabled = activeEditId !== null && mesId !== activeEditId

	let entry = editEntries.get(container)
	if (!entry) {
		entry = {}
		editEntries.set(container, entry)
	}

	container.dataset.astraEditing = isEditing ? 'true' : 'false'
	container.dataset.astraEditDisabled = isToggleDisabled ? 'true' : 'false'

	renderToggle({ entry, mesId, slots })

	if (isEditing) {
		renderEditBar({ entry, mesId, slots })
	} else if (entry.editRoot) {
		entry.editRoot.render(null)
	}

	return container
}

function syncEditingState() {
	activeEditId = detectActiveEditId()
}

function syncAll() {
	if (!getCtx()?.eventSource) return
	syncEditingState()
	const containers = new Set()
	const messageEls = document.querySelectorAll('#chat .mes')

	messageEls.forEach(mesEl => {
		const container = syncMessage(mesEl)
		if (container) {
			containers.add(container)
		}
	})

	cleanupEntries(containers)
}

function scheduleSync(delay = DEFAULT_SYNC_DELAY) {
	if (pendingSyncTimeout) {
		return
	}
	pendingSyncTimeout = setTimeout(() => {
		pendingSyncTimeout = null
		syncAll()
	}, delay)
}

function startObservers() {
	if (observer) return
	const chatRoot = getChatRoot()
	if (!chatRoot) return
	observer = new MutationObserver(mutations => {
		const shouldSync = mutations.some(mutation => mutation.addedNodes?.length || mutation.removedNodes?.length)
		const hasEditChange = mutations.some(mutation => {
			if (mutation.type === 'attributes' && mutation.attributeName === 'mesid') return true
			return Array.from(mutation.addedNodes ?? []).some(node =>
				node instanceof HTMLElement && (node.id === 'curEditTextarea' || node.classList?.contains('edit_textarea')),
			)
		})
		if (shouldSync || hasEditChange) {
			scheduleSync(hasEditChange ? 0 : DEFAULT_SYNC_DELAY)
		}
	})
	observer.observe(chatRoot, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['mesid'],
	})
}

function attachEvents() {
	const ctx = getCtx()
	const eventSource = ctx?.eventSource
	const eventTypes = ctx?.event_types
	if (!eventSource || !eventTypes) return

	const syncEvents = [
		eventTypes.MESSAGE_EDITED,
		eventTypes.MESSAGE_UPDATED,
		eventTypes.MESSAGE_DELETED,
		eventTypes.CHAT_CHANGED,
		eventTypes.MESSAGE_SWIPED,
		eventTypes.USER_MESSAGE_RENDERED,
		eventTypes.CHARACTER_MESSAGE_RENDERED,
	]

	syncEvents.forEach(type => {
		eventSource.on(type, () => scheduleSync(0))
	})
}

function initializeMessageEditing({ getContext } = {}) {
	if (hasInitialized) return
	initializeEnv(getContext)
	const ctx = getCtx()
	if (!ctx?.eventSource || !ctx?.event_types) {
		console.warn(`${LOG_PREFIX} Message editing controls skipped: missing SillyTavern context`)
		return
	}
	hasInitialized = true

	attachEvents()
	startObservers()
	syncAll()
}

export { initializeMessageEditing }
