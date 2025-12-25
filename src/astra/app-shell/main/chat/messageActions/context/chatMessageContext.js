const LOG_PREFIX = '[AstraProjecta]'

let getContextRef = null

function initializeEnv(getContext) {
	getContextRef = typeof getContext === 'function' ? getContext : () => globalThis?.SillyTavern?.getContext?.()
}

function getCtx() {
	return getContextRef?.() ?? null
}

function getChat() {
	return getCtx()?.chat ?? []
}

function getEventSource() {
	return getCtx()?.eventSource
}

function getEventTypes() {
	return getCtx()?.event_types ?? {}
}

function getGenerate() {
	return getCtx()?.Generate ?? getCtx()?.generate ?? globalThis?.Generate
}

function getStopButton() {
	return /** @type {HTMLElement|null} */ (document.querySelector('.mes_stop'))
}

function isBusy() {
	const stopButton = getStopButton()
	if (!stopButton) return false
	return stopButton.offsetHeight !== 0 || stopButton.offsetWidth !== 0
}

function getMessageTextFromDom(mesIdx) {
	const selector =
		typeof mesIdx === 'number'
			? `#chat .mes[mesid="${mesIdx}"] .mes_text`
			: '#chat .mes.last_mes .mes_text, #chat .mes:last-of-type .mes_text'
	const target = document.querySelector(selector)
	if (!target) return ''
	const raw = target.textContent ?? ''
	return raw
}

function updateMessageDom(mesIdx, html) {
	const target = document.querySelector(`#chat .mes[mesid="${mesIdx}"] .mes_text`)
	if (target) {
		target.innerHTML = html
	}
}

function saveChat() {
	const saver = getCtx()?.saveChatConditional
	if (typeof saver === 'function') {
		saver()
	}
}

function resolveMessageAvatarFromDom(mesIdx) {
	const targetEl =
		typeof mesIdx === 'number'
			? document.querySelector(`#chat .mes[mesid="${mesIdx}"]`)
			: document.querySelector('#chat .mes.last_mes') ??
				document.querySelector('#chat .mes:last-of-type')

	if (!targetEl) return null

	const img =
		targetEl.querySelector('.mesAvatarWrapper img') ||
		targetEl.querySelector('.mes_avatar img') ||
		targetEl.querySelector('.avatar img')

	if (!img) return null

	const src = typeof img.currentSrc === 'string' && img.currentSrc.trim() ? img.currentSrc : img.src ?? ''
	return {
		src: src || '',
		avatarId: img.dataset?.avatarId ?? '',
	}
}

function ensureActionContainer(messageEl) {
	if (!messageEl) return null
	const block = messageEl.querySelector(':scope > .mes_block') ?? messageEl
	let container = block.querySelector(':scope > .astra-messageActions')
	if (!container) {
		container = document.createElement('div')
		container.className = 'astra-messageActions'
		container.setAttribute('data-astra-component', 'message-actions')
		block.append(container)
	}

	let metaRow = container.querySelector(':scope > .astra-messageMeta')
	if (!metaRow) {
		metaRow = document.createElement('div')
		metaRow.className = 'astra-messageMeta'
		if (container.firstChild) {
			container.insertBefore(metaRow, container.firstChild)
		} else {
			container.append(metaRow)
		}
	}

	let metaLeft = metaRow.querySelector(':scope > .astra-messageMeta__left')
	let metaRight = metaRow.querySelector(':scope > .astra-messageMeta__right')
	if (!metaLeft) {
		metaLeft = document.createElement('div')
		metaLeft.className = 'astra-messageMeta__left'
		metaRow.append(metaLeft)
	}
	if (!metaRight) {
		metaRight = document.createElement('div')
		metaRight.className = 'astra-messageMeta__right'
		metaRow.append(metaRight)
	}

	let leftSlot = container.querySelector(':scope > .astra-messageActions__left')
	let rightSlot = container.querySelector(':scope > .astra-messageActions__right')
	if (!leftSlot) {
		leftSlot = document.createElement('div')
		leftSlot.className = 'astra-messageActions__left'
		if (rightSlot) {
			container.insertBefore(leftSlot, rightSlot)
		} else {
			container.append(leftSlot)
		}
	}
	if (!rightSlot) {
		rightSlot = document.createElement('div')
		rightSlot.className = 'astra-messageActions__right'
		container.append(rightSlot)
	}

	const ensureChild = (parent, className) => {
		let el = parent.querySelector(`:scope > .${className}`)
		if (!el) {
			el = document.createElement('div')
			el.className = className
			parent.append(el)
		}
		return el
	}

	const leftDefault = ensureChild(leftSlot, 'astra-messageActions__leftDefault')
	const leftEdit = ensureChild(leftSlot, 'astra-messageActions__leftEdit')
	const rightDefault = ensureChild(rightSlot, 'astra-messageActions__rightDefault')
	const rightEdit = ensureChild(rightSlot, 'astra-messageActions__rightEdit')
	const leftToggleHost = ensureChild(leftDefault, 'astra-messageActions__toggleHost')
	const leftActionsHost = ensureChild(leftDefault, 'astra-messageActions__primaryHost')
	const rightHistoryHost = ensureChild(rightDefault, 'astra-messageActions__historyHost')
	const rightNativeActionsHost = ensureChild(rightDefault, 'astra-messageActions__nativeActionsHost')
	const rightEditHost = ensureChild(rightDefault, 'astra-messageActions__rightEditHost')
	const rightSwipeHost = ensureChild(rightDefault, 'astra-messageActions__swipeHost')

	const slotSet = new Set([metaRow, leftSlot, rightSlot])
	for (const child of Array.from(container.childNodes)) {
		if (!slotSet.has(child) && child.nodeType === Node.ELEMENT_NODE) {
			leftSlot.append(child)
		}
	}
	if (container.parentElement !== block) {
		container.remove()
		block.append(container)
	}
	if (container.parentElement?.lastElementChild !== container) {
		container.parentElement?.append(container)
	}

	return {
		container,
		leftSlot,
		rightSlot,
		leftDefault,
		leftEdit,
		rightDefault,
		rightEdit,
		leftToggleHost,
		leftActionsHost,
		rightHistoryHost,
		rightNativeActionsHost,
		rightEditHost,
		rightSwipeHost,
		metaRow,
		metaLeft,
		metaRight,
	}
}

function getChatRoot() {
	return document.querySelector('#chat')
}

export {
	LOG_PREFIX,
	ensureActionContainer,
	getChat,
	getChatRoot,
	getCtx,
	getEventSource,
	getEventTypes,
	getGenerate,
	getMessageTextFromDom,
	getStopButton,
	initializeEnv,
	isBusy,
	resolveMessageAvatarFromDom,
	saveChat,
	updateMessageDom,
}
