import React from 'react'
import { createRoot } from 'react-dom/client'
import { getFallbackAvatar } from '@/astra/app-shell/main/main-area/views/home/browser/shared/avatarSources.js'
import { resolveFullAvatarUrl } from '@/astra/utils/avatarSources.js'
import { RevisionOverlay } from '../components/RevisionOverlay.jsx'
import { getChat, getCtx, resolveMessageAvatarFromDom, saveChat } from '../../context/chatMessageContext.js'
import { hydrateContinueState } from '../../state/continueState.js'
import { applyPathToMessage, registerOverlayRefresh } from '../continueOperations.js'

let overlayContainer = null
let overlayRoot = null
let overlayState = {
	open: false,
	messageIndex: null,
}
let onPathApplied = null

function ensureOverlayRoot() {
	if (overlayContainer) return
	overlayContainer = document.createElement('div')
	overlayContainer.id = 'astra-continue-overlay-host'
	document.body.append(overlayContainer)
	overlayRoot = createRoot(overlayContainer)
	renderOverlay({ open: false, messageIndex: null })
}

function refreshOverlayForMessage(mesIdx) {
	if (!overlayState.open) return
	if (overlayState.messageIndex !== mesIdx) return
	renderOverlay({ open: true, messageIndex: mesIdx })
}

function renderOverlay(nextState) {
	overlayState = { ...overlayState, ...nextState }
	const { open, messageIndex } = overlayState
	const chat = getChat()
	const message = typeof messageIndex === 'number' ? chat?.[messageIndex] : null
	if (message) {
		hydrateContinueState(message)
	}

	if (!overlayRoot) return
	overlayRoot.render(
		<RevisionOverlay
			open={Boolean(open && message)}
			message={message}
			identity={resolveIdentity(message, messageIndex)}
			container={overlayContainer}
			onClose={() => renderOverlay({ open: false, messageIndex: null })}
			onSelectPath={path => {
				if (typeof messageIndex === 'number') {
					applyPathToMessage(messageIndex, path)
					onPathApplied?.()
				}
			}}
			onCollapseStateChange={collapsedPaths => {
				if (typeof messageIndex !== 'number') return
				const chatMessages = getChat()
				const targetMessage = chatMessages?.[messageIndex]
				if (!targetMessage) return
				targetMessage._astraContinueCollapsedPaths = Array.isArray(collapsedPaths)
					? collapsedPaths
					: []
				saveChat()
			}}
		/>,
	)
}

function openOverlayForMessage(mesIdx) {
	const chat = getChat()
	const message = chat?.[mesIdx]
	if (!message) return
	hydrateContinueState(message)
	renderOverlay({ open: true, messageIndex: mesIdx })
}

function resolveIdentity(message, mesIdx) {
	if (!message) return null
	const mesId = resolveMesId(message, mesIdx)
	const ctx = getCtx()
	const activeCharacterId = typeof ctx?.characterId === 'number' ? ctx.characterId : null
	const activeCharacter =
		typeof activeCharacterId === 'number' ? ctx?.characters?.[activeCharacterId] : null
	const domAvatar = resolveMessageAvatarFromDom(mesIdx)
	const domAvatarId = typeof domAvatar?.avatarId === 'string' ? domAvatar.avatarId : ''
	const avatarCandidates = [
		domAvatar?.src,
		message.avatarUrl,
		message.avatar,
		message.character_avatar,
		message.ch_avatar,
		message.img,
		message.avatar_url,
		message.avatarId,
		message.avatar_file,
		message.avatarFile,
		domAvatarId,
		activeCharacter?.avatar,
		activeCharacter?.avatarId,
	]
	const rawAvatar = avatarCandidates.find(url => typeof url === 'string' && url.trim()) ?? ''
	const avatarUrl =
		rawAvatar && rawAvatar !== domAvatarId
			? resolveFullAvatarUrl(rawAvatar, { typeHint: message?.is_user ? 'persona' : 'avatar' })
			: ''
	const fallbackAvatar = getFallbackAvatar()
	const name =
		typeof message.name === 'string'
			? message.name.trim()
			: typeof activeCharacter?.name === 'string'
				? activeCharacter.name
				: ''
	if (!name && !avatarUrl && !fallbackAvatar) return null
	return {
		name: name || 'Character',
		avatarUrl: avatarUrl || domAvatar?.src || fallbackAvatar || undefined,
		mesId: mesId ?? undefined,
	}
}

function resolveMesId(message, mesIdx) {
	if (typeof message?.mesid !== 'undefined') return message.mesid
	if (typeof message?.mesId !== 'undefined') return message.mesId
	if (typeof mesIdx === 'number') {
		const domMes = document.querySelector(`#chat .mes[mesid="${mesIdx}"]`)
		const domMesId = domMes?.getAttribute('mesid')
		if (domMesId) return domMesId
		return mesIdx + 1
	}
	return null
}

function createOverlayHost({ onAppliedPath } = {}) {
	onPathApplied = typeof onAppliedPath === 'function' ? onAppliedPath : null
	registerOverlayRefresh(refreshOverlayForMessage)
	ensureOverlayRoot()
	return {
		openOverlayForMessage,
		renderOverlay,
	}
}

export { createOverlayHost, openOverlayForMessage, renderOverlay }
