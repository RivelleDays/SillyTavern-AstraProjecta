import { initializeMessageRevisions } from './continue/index.js'
import { initializeMessageEditing } from './editing/editControlsHost.js'
import { initializeMessageHeader } from './meta/messageHeaderHost.js'
import { initializeMessageMeta } from './meta/messageMetaHost.js'
import { initializeNativeMessageActions } from './nativeActionsHost.js'

let hasInitialized = false

function initializeMessageActions(options = {}) {
	if (hasInitialized) return
	initializeMessageRevisions(options)
	initializeMessageEditing(options)
	initializeMessageHeader(options)
	initializeMessageMeta(options)
	initializeNativeMessageActions(options)
	hasInitialized = true
}

export {
	initializeMessageActions,
	initializeMessageEditing,
	initializeMessageHeader,
	initializeMessageRevisions,
	initializeMessageMeta,
	initializeNativeMessageActions,
}
