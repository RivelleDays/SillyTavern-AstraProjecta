import React from 'react'
import { createRoot } from 'react-dom/client'
import { RevisionActionsBar } from '../components/RevisionActionsBar.jsx'
import { RevisionHistoryButton } from '../components/RevisionHistoryButton.jsx'
import {
	ensureActionContainer,
	getChat,
	getChatRoot,
	getGenerate,
	isBusy,
} from '../../context/chatMessageContext.js'
import { hydrateContinueState } from '../../state/continueState.js'
import { continueLastMessage, regenerateLastContinue, undoLastContinue } from '../continueOperations.js'

const actionRoots = new Map()
let pendingSyncTimeout = null
let chatObserver = null
let onShowContinuesRef = null
let onAfterSyncRef = null

function createActionsHost({ onShowContinues, onAfterSync } = {}) {
	onShowContinuesRef = typeof onShowContinues === 'function' ? onShowContinues : null
	onAfterSyncRef = typeof onAfterSync === 'function' ? onAfterSync : null
	return {
		syncActions,
		startObservers,
	}
}

function syncActions() {
	if (pendingSyncTimeout) {
		clearTimeout(pendingSyncTimeout)
		pendingSyncTimeout = null
	}

	startObservers()

	const chat = getChat()
	if (!chat.length) {
		unmountStaleActions(null)
		onAfterSyncRef?.({ mesIdx: null, container: null })
		return
	}

	const containersSeen = new Set()
	let lastMessageSummary = { mesIdx: null, container: null }
	const busy = isBusy()
	const generate = getGenerate()

	const messageEls = document.querySelectorAll('#chat .mes[mesid]')
	messageEls.forEach(mesEl => {
		const mesIdx = Number(mesEl.getAttribute('mesid'))
		const message = chat[mesIdx]
		if (!message) return

		hydrateContinueState(message)

		const slots = ensureActionContainer(mesEl)
		if (!slots?.container) return
		const { container, leftActionsHost, leftSlot } = {
			container: slots.container,
			leftActionsHost: slots.leftActionsHost ?? slots.leftSlot,
			leftSlot: slots.leftSlot ?? slots.container,
		}
		containersSeen.add(container)

		const isUser = !!message.is_user
		const isLast = mesIdx === chat.length - 1
		const rootIndex = message.swipe_id ?? 0
		const activePath = message.continueHistory?.[rootIndex]?.active ?? []
		const hasHistory =
			Boolean(message.continueHistory?.[rootIndex]) &&
			(
				(Array.isArray(activePath) && activePath.length > 1) ||
				(Array.isArray(message.continueHistory?.[rootIndex]?.swipes) && message.continueHistory[rootIndex].swipes.length > 0) ||
				(Array.isArray(message.swipes) && message.swipes.length > 1)
			)

		const regenerateLabel = hasHistory ? 'Regenerate last output' : 'Regenerate'
		const canUndo = !isUser && isLast && hasHistory && !busy
		const canRegenerate = !isUser && isLast && !busy && typeof generate === 'function'
		const canContinue = !isUser && isLast && !busy && typeof generate === 'function'
		const canShowContinues = hasHistory

		let rootEntry = actionRoots.get(container)
		if (!rootEntry) {
			rootEntry = {}
			actionRoots.set(container, rootEntry)
		}

		const targetSlot = leftActionsHost ?? leftSlot
		if (!rootEntry.root || rootEntry.slot !== targetSlot) {
			rootEntry.root?.unmount()
			rootEntry.root = createRoot(targetSlot)
			rootEntry.slot = targetSlot
		}

		rootEntry.root.render(
			<RevisionActionsBar
				isBusy={busy}
				canUndo={canUndo}
				canRegenerate={canRegenerate}
				canContinue={canContinue}
				onUndo={() => undoLastContinue(mesIdx)}
				onRegenerate={() => regenerateLastContinue(mesIdx)}
				onContinue={() => continueLastMessage(mesIdx)}
				regenerateLabel={regenerateLabel}
			/>,
		)

		const historySlot = slots.rightHistoryHost ?? slots.rightDefault ?? slots.rightSlot ?? slots.container
		if (historySlot) {
			if (!rootEntry.historyRoot || rootEntry.historySlot !== historySlot) {
				rootEntry.historyRoot?.unmount()
				rootEntry.historyRoot = createRoot(historySlot)
				rootEntry.historySlot = historySlot
			}

			rootEntry.historyRoot.render(
				<RevisionHistoryButton
					onClick={() => onShowContinuesRef?.(mesIdx)}
					disabled={busy || !canShowContinues}
				/>,
			)
		} else if (rootEntry.historyRoot) {
			rootEntry.historyRoot.render(null)
		}

		if (isLast) {
			lastMessageSummary = { mesIdx, container }
		}
	})

	unmountStaleActions(containersSeen)
	onAfterSyncRef?.(lastMessageSummary)
}

function startObservers() {
	if (chatObserver) return
	const chatRoot = getChatRoot()
	if (!chatRoot) return
	chatObserver = new MutationObserver(mutations => {
		const hasChanges = mutations.some(
			mutation =>
				(mutation.type === 'childList' && mutation.addedNodes?.length) ||
				(mutation.type === 'attributes' && mutation.attributeName === 'class'),
		)
		if (hasChanges) {
			scheduleSync(0)
		}
	})
	chatObserver.observe(chatRoot, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['class', 'mesid'],
	})
}

function scheduleSync(delay = 120) {
	if (pendingSyncTimeout) return
	pendingSyncTimeout = setTimeout(() => {
		pendingSyncTimeout = null
		syncActions()
	}, delay)
}

function unmountStaleActions(validContainers) {
	for (const [container, entry] of actionRoots.entries()) {
		if (!validContainers?.has?.(container)) {
			entry?.root?.unmount()
			entry?.historyRoot?.unmount()
			actionRoots.delete(container)
		}
	}
}

export { createActionsHost, scheduleSync, syncActions }
