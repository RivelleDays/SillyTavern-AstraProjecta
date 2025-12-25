import {
	cacheMessageText,
	findSwipeByPath,
	getTextForPathWithFull,
	hydrateContinueState,
	isValidMessageText,
	markSwipeMetadata,
	REVISION_KIND,
} from '../state/continueState.js'
import {
	getChat,
	getCtx,
	getEventSource,
	getEventTypes,
	getGenerate,
	getMessageTextFromDom,
	isBusy,
	saveChat,
	updateMessageDom,
} from '../context/chatMessageContext.js'

let isListening = false
let startMes = ''
let skipNextEditHandling = false
let regeneratingMesIdx = null
let pendingStopListen = false
let overlayRefresh = null

function registerOverlayRefresh(callback) {
	overlayRefresh = typeof callback === 'function' ? callback : null
}

function refreshOverlayForMessage(mesIdx) {
	if (typeof overlayRefresh === 'function') {
		overlayRefresh(mesIdx)
	}
}

function formatMessageText(raw, message) {
	const ctx = getCtx()
	const substitute = ctx?.substituteParams ?? (value => value)
	const formatter = ctx?.messageFormatting ?? (value => value)
	let messageText = substitute(raw)
	messageText = formatter(messageText, message?.name, false, message?.is_user, null)
	return messageText
}

function getEffectiveMessageText(message, mesIdx) {
	let text = typeof message?.mes === 'string' ? message.mes : ''
	if (!isValidMessageText(text)) {
		const domText = getMessageTextFromDom(mesIdx)
		if (isValidMessageText(domText)) {
			text = domText
			if (message) {
				message.mes = domText
			}
		} else if (isValidMessageText(message?._astraContinueCachedText)) {
			text = message._astraContinueCachedText
			if (message) {
				message.mes = text
			}
		}
	}
	return text
}

function emitMessageEdited(mesIdx) {
	skipNextEditHandling = true
	const eventSource = getEventSource()
	const eventTypes = getEventTypes()
	eventSource?.emit?.(eventTypes?.MESSAGE_EDITED, mesIdx)
}

function resolveMessageTarget(mesIdx) {
	const chat = getChat()
	if (typeof mesIdx === 'number' && mesIdx >= 0 && mesIdx < chat.length) {
		return { chat, mesIdx, mes: chat[mesIdx] }
	}
	if (!chat.length) {
		return { chat, mesIdx: null, mes: null }
	}
	const lastIdx = chat.length - 1
	return { chat, mesIdx: lastIdx, mes: chat[lastIdx] }
}

function applyPathToMessage(mesIdx, path) {
	const chat = getChat()
	const message = chat?.[mesIdx]
	if (!message) return
	if (!Array.isArray(path) || path.length === 0) return

	hydrateContinueState(message)

	let swipes = message.continueHistory
	let targetSwipe = null
	let text = ''

	for (let i = 0; i < path.length; i += 1) {
		const idx = path[i]
		const swipe = swipes?.[idx]
		if (!swipe) return
		text = getTextForPathWithFull(message, path.slice(0, i + 1))
		targetSwipe = swipe
		if (i < path.length - 1) {
			swipes = swipe.swipes
		}
	}

	message.mes = text
	message.continueSwipe = targetSwipe
	message.continueSwipeId = path[path.length - 1]

	const rootIndex = path[0]
	if (message.continueHistory[rootIndex]) {
		message.continueHistory[rootIndex].active = [...path]
	}

	if (targetSwipe) {
		markSwipeMetadata(targetSwipe, targetSwipe.kind ?? REVISION_KIND.CONTINUE)
		targetSwipe.fullText = text
	}

	const messageText = formatMessageText(text, message)
	updateMessageDom(mesIdx, messageText)
	saveChat()
	emitMessageEdited(mesIdx)
	cacheMessageText(message)
	refreshOverlayForMessage(mesIdx)
}

async function triggerStandardRegenerate() {
	const regenerateButton = document.querySelector('#option_regenerate')
	if (regenerateButton) {
		regenerateButton.click()
		return true
	}

	const generate = getGenerate()
	if (typeof generate === 'function') {
		try {
			await generate('regenerate')
			return true
		} catch (error) {
			console.warn('[AstraProjecta] Failed to trigger regenerate fallback', error)
		}
	}

	return false
}

async function regenerateLastContinue(mesIdx) {
	if (isBusy()) return
	const { mes, mesIdx: resolvedIdx } = resolveMessageTarget(mesIdx)
	if (!mes || typeof resolvedIdx !== 'number') return
	hydrateContinueState(mes)

	const rootIndex = mes.swipe_id ?? 0
	const activePath = mes.continueHistory?.[rootIndex]?.active ?? [rootIndex]
	const normalizedPath = activePath[0] === rootIndex ? activePath : [rootIndex]

	if (normalizedPath.length <= 1) {
		const rootText = getTextForPathWithFull(mes, [rootIndex]) || getEffectiveMessageText(mes, resolvedIdx)
		const rootSwipe = mes.continueHistory?.[rootIndex]
		if (rootSwipe) {
			rootSwipe.mes = rootText
			rootSwipe.fullText = rootText
			rootSwipe.active = [rootIndex]
			markSwipeMetadata(rootSwipe, REVISION_KIND.ORIGIN)
			mes.continueSwipe = rootSwipe
			mes.continueSwipeId = rootIndex
		}

		mes.mes = rootText
		const messageText = formatMessageText(`${rootText} ...`, mes)
		updateMessageDom(resolvedIdx, messageText)
		cacheMessageText(mes)
		regeneratingMesIdx = resolvedIdx
		const generate = getGenerate()
		if (typeof generate === 'function') {
			await generate('swipe')
			return
		}
		await triggerStandardRegenerate()
		return
	}

	const targetPath = normalizedPath.length > 1 ? normalizedPath.slice(0, -1) : normalizedPath
	const targetSwipe = findSwipeByPath(mes, targetPath) ?? mes.continueHistory?.[rootIndex]
	const text = getTextForPathWithFull(mes, targetPath.length ? targetPath : [rootIndex])
	mes.mes = text
	mes.continueSwipe = targetSwipe
	mes.continueSwipeId = targetPath[targetPath.length - 1] ?? rootIndex

	if (mes.continueHistory?.[rootIndex]) {
		mes.continueHistory[rootIndex].active = targetPath.length ? [...targetPath] : [rootIndex]
	}

	if (targetSwipe) {
		markSwipeMetadata(targetSwipe, targetSwipe.kind ?? REVISION_KIND.CONTINUE)
		targetSwipe.fullText = text
	}

	const messageText = formatMessageText(`${text} ...`, mes)
	updateMessageDom(resolvedIdx, messageText)

	cacheMessageText(mes)
	regeneratingMesIdx = resolvedIdx
	const generate = getGenerate()
	if (typeof generate === 'function') {
		await generate('continue')
	}
}

function undoLastContinue(mesIdx) {
	if (isBusy()) return
	const { mes, mesIdx: resolvedIdx } = resolveMessageTarget(mesIdx)
	if (!mes || typeof resolvedIdx !== 'number') return
	hydrateContinueState(mes)

	const parentPath = Array.isArray(mes.continueSwipe?.parent) ? mes.continueSwipe.parent : []
	if (!parentPath.length) return

	applyPathToMessage(resolvedIdx, parentPath)
}

async function continueLastMessage(mesIdx) {
	if (isBusy()) return
	const generate = getGenerate()
	if (typeof generate === 'function') {
		await generate('continue')
	}
}

function handleGenerationStarted(type, namedArgs, dryRun) {
	if (dryRun || !['continue', 'normal', 'swipe'].includes(type)) return
	const chat = getChat()
	if (!chat.length) return
	const mes = chat.at(-1)
	hydrateContinueState(mes)
	if (type === 'continue') {
		isListening = true
		startMes = getEffectiveMessageText(mes, chat.length - 1)
	} else if (type === 'swipe') {
		isListening = true
		startMes = ''
	}
	pendingStopListen = false
}

function handleGenerationStopped() {
	if (isListening) {
		pendingStopListen = true
	} else {
		pendingStopListen = false
	}
	isListening = false
	regeneratingMesIdx = null
}

function handleMessageRendered(mesIdx) {
	const chat = getChat()
	const mes = chat?.[mesIdx]
	if (!mes) return

	hydrateContinueState(mes)
	const effectiveMesText = getEffectiveMessageText(mes, mesIdx)
	if (isValidMessageText(effectiveMesText)) {
		mes.mes = effectiveMesText
	}

	const listening = isListening || pendingStopListen

	if (listening) {
		if (effectiveMesText === startMes) return
		if (!isValidMessageText(effectiveMesText)) return
		isListening = false
		pendingStopListen = false

		if (startMes === '') {
			const base = mes.continueHistory[mes.swipe_id ?? 0]
			if (base) {
				base.mes = effectiveMesText
				base.fullText = effectiveMesText
				markSwipeMetadata(
					base,
					regeneratingMesIdx === mesIdx ? REVISION_KIND.REGENERATE : REVISION_KIND.CONTINUE,
				)
			}
		} else {
			const [, ...rest] = effectiveMesText.split(startMes)
			const newMes = rest.join(startMes)
			const swipe = {
				mes: newMes,
				swipes: [],
				parent: [...(mes.continueSwipe?.parent ?? []), mes.continueSwipeId].filter(idx => idx !== undefined),
				fullText: effectiveMesText,
				kind: regeneratingMesIdx === mesIdx ? REVISION_KIND.REGENERATE : REVISION_KIND.CONTINUE,
				createdAt: Date.now(),
			}
			let swipes = mes.continueHistory
			swipe.parent.forEach(idx => {
				swipes = swipes[idx].swipes
			})
			swipes.push(swipe)
			mes.continueSwipe = swipe
			mes.continueSwipeId = swipes.length - 1
			const rootIndex = swipe.parent[0] ?? mes.swipe_id ?? 0
			if (mes.continueHistory[rootIndex]) {
				mes.continueHistory[rootIndex].active = [...swipe.parent, mes.continueSwipeId]
			}
		}
		regeneratingMesIdx = null
	}

	const rootIndex = mes.swipe_id ?? 0
	const rootSwipe = mes.continueHistory[rootIndex]
	let activePath = rootSwipe?.active?.length ? [...rootSwipe.active] : [rootIndex]

	if (rootSwipe && !isValidMessageText(rootSwipe.mes) && activePath.length === 1 && isValidMessageText(effectiveMesText)) {
		rootSwipe.mes = effectiveMesText
		rootSwipe.fullText = effectiveMesText
		rootSwipe.active = [rootIndex]
		mes.continueSwipe = rootSwipe
		mes.continueSwipeId = rootIndex
		activePath = [...rootSwipe.active]
	}

	let swipes = mes.continueHistory
	let currentText = ''
	activePath.forEach(idx => {
		const swipe = swipes?.[idx]
		if (!swipe) return
		currentText += swipe.mes ?? ''
		swipes = swipe.swipes
	})

	if (typeof mes.mes === 'string' && mes.mes.length > currentText.length) {
		const delta = mes.mes.substring(currentText.length)
		if (!delta) {
			saveChat()
			return
		}
		const swipe = {
			mes: delta,
			swipes: [],
			parent: [...activePath],
			fullText: mes.mes,
			kind: REVISION_KIND.CONTINUE,
			createdAt: Date.now(),
		}
		let target = mes.continueHistory
		let isValidPath = true
		swipe.parent.forEach(idx => {
			if (!target?.[idx]) {
				isValidPath = false
				return
			}
			target = target[idx].swipes
		})
		if (isValidPath && Array.isArray(target)) {
			target.push(swipe)
			mes.continueSwipe = swipe
			mes.continueSwipeId = target.length - 1
			mes.continueHistory[rootIndex].active = [...swipe.parent, mes.continueSwipeId]
		}
	}

	const resolvedPath = mes.continueHistory[rootIndex]?.active ?? []
	const activeSwipe = findSwipeByPath(mes, resolvedPath)
	if (activeSwipe) {
		if (!isValidMessageText(activeSwipe.fullText)) {
			activeSwipe.fullText = getTextForPathWithFull(mes, resolvedPath)
		}
		markSwipeMetadata(activeSwipe, activeSwipe.kind ?? REVISION_KIND.CONTINUE)
	}

	cacheMessageText(mes)
	if (!isListening && regeneratingMesIdx === mesIdx) {
		regeneratingMesIdx = null
	}
	saveChat()
	refreshOverlayForMessage(mesIdx)
}

function handleMessageEdited(mesIdx) {
	const chat = getChat()
	const message = chat?.[mesIdx]
	if (!message || !message.continueHistory) return

	if (skipNextEditHandling) {
		skipNextEditHandling = false
		cacheMessageText(message)
		return
	}

	hydrateContinueState(message)

	let swipes = message.continueHistory
	let swipe
	let text = ''
	const active = []
	const rootIndex = message.swipe_id ?? 0
	const rawActivePath = message.continueHistory[rootIndex]?.active ?? []
	const activePath = rawActivePath[0] === rootIndex ? rawActivePath : [rootIndex]

	for (const idx of activePath) {
		swipe = swipes[idx]
		const newText = `${text}${swipes[idx].mes ?? ''}`
		if (!message.mes.startsWith(newText) && !(swipe.parent.length === 0 && newText === '')) {
			const newSwipe = {
				mes: message.mes.substring(text.length),
				parent: [...swipe.parent],
				swipes: [],
				fullText: message.mes,
				kind: REVISION_KIND.EDIT,
				createdAt: Date.now(),
			}
			if (swipe.parent.length === 0) {
				const rootIndex = message.swipe_id ?? 0
				newSwipe.parent = [rootIndex]
				swipes[idx].swipes.push(newSwipe)
				const newIdx = swipes[idx].swipes.length - 1
				message.continueHistory[rootIndex].active = [rootIndex, newIdx]
				message.continueSwipe = newSwipe
				message.continueSwipeId = newIdx
				text = message.mes
			} else {
				const newIdx = swipes.length
				swipes.push(newSwipe)
				active.push(newIdx)
				message.continueHistory[message.swipe_id ?? 0].active = active
				message.continueSwipe = newSwipe
				message.continueSwipeId = newIdx
				text = message.mes
			}
			break
		}
		active.push(idx)
		swipes = swipe.swipes
		text = newText
	}

	if (text.length < message.mes.length) {
		const newSwipe = {
			mes: message.mes.substring(text.length),
			parent: [...(swipe?.parent ?? []), active.slice(-1)[0]],
			swipes: [],
			fullText: message.mes,
			kind: REVISION_KIND.EDIT,
			createdAt: Date.now(),
		}
		swipe?.swipes?.push(newSwipe)
		message.continueSwipe = newSwipe
		message.continueSwipeId = (swipe?.swipes?.length ?? 1) - 1
		message.continueHistory[message.swipe_id ?? 0].active = [
			...(newSwipe.parent ?? []),
			message.continueSwipeId,
		].filter(idx => idx !== undefined)
	}

	const updatedPath = message.continueHistory[rootIndex]?.active ?? []
	const normalizedUpdatedPath =
		updatedPath[0] === rootIndex ? updatedPath : [rootIndex]
	const activeSwipe = findSwipeByPath(message, normalizedUpdatedPath)
	if (activeSwipe) {
		if (typeof activeSwipe.fullText !== 'string') {
			activeSwipe.fullText = message.mes
		}
		markSwipeMetadata(activeSwipe, activeSwipe.kind ?? REVISION_KIND.EDIT)
	}
	const rootSwipe = message.continueHistory[rootIndex]
	if (rootSwipe) {
		markSwipeMetadata(rootSwipe, rootSwipe.kind ?? REVISION_KIND.ORIGIN)
	}

	cacheMessageText(message)
	saveChat()
	refreshOverlayForMessage(mesIdx)
}

function handleSwipe(mesId) {
	const chat = getChat()
	const mes = chat?.[mesId]
	if (!mes) return
	hydrateContinueState(mes)
	if (!mes.continueHistory) return

	const rootIndex = mes.swipe_id ?? 0
	const swipeText = getEffectiveMessageText(mes, mesId)
	if (isValidMessageText(swipeText) && mes.continueHistory[rootIndex]) {
		mes.mes = swipeText
		mes.continueHistory[rootIndex].mes = swipeText
		mes.continueHistory[rootIndex].fullText = swipeText
		markSwipeMetadata(mes.continueHistory[rootIndex], REVISION_KIND.ORIGIN)
	}

	let swipes = mes.continueHistory
	let swipe
	let swipeIdx
	const rawActivePath = mes.continueHistory[rootIndex]?.active ?? []
	const activePath = rawActivePath[0] === rootIndex ? rawActivePath : [rootIndex]

	activePath.forEach(idx => {
		const nextSwipe = swipes?.[idx]
		if (!nextSwipe) return
		swipeIdx = idx
		swipe = nextSwipe
		swipes = nextSwipe.swipes
	})

	mes.continueSwipeId = typeof swipeIdx === 'number' ? swipeIdx : rootIndex
	mes.continueSwipe = swipe ?? mes.continueHistory[rootIndex]
}

function handleChatChanged() {
	const chat = getChat()
	chat.forEach(mes => hydrateContinueState(mes))
}

export {
	applyPathToMessage,
	continueLastMessage,
	handleChatChanged,
	handleGenerationStarted,
	handleGenerationStopped,
	handleMessageEdited,
	handleMessageRendered,
	handleSwipe,
	registerOverlayRefresh,
	regenerateLastContinue,
	undoLastContinue,
}
