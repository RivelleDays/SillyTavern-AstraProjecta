import { LOG_PREFIX, getCtx, initializeEnv } from '../context/chatMessageContext.js'
import {
	handleChatChanged,
	handleGenerationStarted,
	handleGenerationStopped,
	handleMessageEdited,
	handleMessageRendered,
	handleSwipe,
} from './continueOperations.js'
import { createActionsHost } from './hosts/continueActionsHost.js'
import { createOverlayHost } from './hosts/continueOverlayHost.js'
import { createSwipeControlsHost } from '../swipe/swipeControlsHost.js'

let hasInitialized = false

function initializeMessageRevisions({ getContext } = {}) {
	if (hasInitialized) return
	initializeEnv(getContext)
	const ctx = getCtx()

	if (!ctx?.eventSource || !ctx?.event_types) {
		console.warn(`${LOG_PREFIX} Message revisions skipped: missing SillyTavern context`)
		return
	}

	hasInitialized = true

	let actionsHost = null
	let swipeHost = null
	const overlayHost = createOverlayHost({
		onAppliedPath: () => actionsHost?.syncActions?.(),
	})

	swipeHost = createSwipeControlsHost()
	actionsHost = createActionsHost({
		onShowContinues: mesIdx => overlayHost.openOverlayForMessage(mesIdx),
		onAfterSync: ({ mesIdx, container }) => swipeHost?.syncSwipeControls?.({ mesIdx, container }),
	})

	const syncAll = () => {
		actionsHost.syncActions()
	}

	ctx.eventSource.on(ctx.event_types.GENERATION_STARTED, (...args) => {
		handleGenerationStarted(...args)
		syncAll()
	})
	ctx.eventSource.on(ctx.event_types.GENERATION_STOPPED, () => {
		handleGenerationStopped()
		syncAll()
	})
	ctx.eventSource.on(ctx.event_types.CHARACTER_MESSAGE_RENDERED, mesIdx => {
		handleMessageRendered(mesIdx)
		syncAll()
	})
	ctx.eventSource.on(ctx.event_types.USER_MESSAGE_RENDERED, mesIdx => {
		handleMessageRendered(mesIdx)
		syncAll()
	})
	ctx.eventSource.on(ctx.event_types.MESSAGE_EDITED, mesIdx => {
		handleMessageEdited(mesIdx)
		syncAll()
	})
	ctx.eventSource.on(ctx.event_types.MESSAGE_SWIPED, mesIdx => {
		handleSwipe(mesIdx)
		syncAll()
	})
	ctx.eventSource.on(ctx.event_types.MESSAGE_DELETED, () => {
		syncAll()
	})
	ctx.eventSource.on(ctx.event_types.CHAT_CHANGED, () => {
		handleChatChanged()
		syncAll()
	})

	syncAll()
}

export { initializeMessageRevisions }
export { initializeMessageRevisions as initializeContinueControls }
