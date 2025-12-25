const PANEL_ID = 'astraChatSendFormPanel'
const PANEL_CLASS = 'astra-chat-send-panel'
const SELECT_HOST_CLASS = 'astra-chat-send-panel__select-host'
const LEFT_SLOT_CLASS = 'astra-chat-send-panel__left'
const RIGHT_SLOT_CLASS = 'astra-chat-send-panel__right'

function ensureSlot({ panel, selector, create }) {
	let slot = panel.querySelector(selector)
	if (!(slot instanceof HTMLElement)) {
		slot = create()
		panel.append(slot)
	}
	return slot
}

export function ensureSendFormPanel(document) {
	if (!document) return null

	const formShell = document.getElementById('form_sheld')
	const sendForm = document.getElementById('send_form')
	if (!(formShell instanceof HTMLElement) || !(sendForm instanceof HTMLElement)) return null

	const sendFormHost = sendForm.parentElement
	if (!(sendFormHost instanceof HTMLElement)) return null

	let panel = document.getElementById(PANEL_ID)
	if (!(panel instanceof HTMLElement)) {
		panel = document.createElement('div')
		panel.id = PANEL_ID
		panel.className = PANEL_CLASS
	}

	if (panel.parentElement !== sendFormHost || panel.nextElementSibling !== sendForm) {
		sendFormHost.insertBefore(panel, sendForm)
	}

	const leftSlot = ensureSlot({
		panel,
		selector: `.${LEFT_SLOT_CLASS}`,
		create: () => {
			const slot = document.createElement('div')
			slot.className = LEFT_SLOT_CLASS
			panel.prepend(slot)
			return slot
		},
	})

	const rightSlot = ensureSlot({
		panel,
		selector: `.${RIGHT_SLOT_CLASS}`,
		create: () => {
			const slot = document.createElement('div')
			slot.className = RIGHT_SLOT_CLASS
			return slot
		},
	})

	const selectHost = ensureSlot({
		panel,
		selector: `.${SELECT_HOST_CLASS}`,
		create: () => {
			const slot = document.createElement('div')
			slot.className = SELECT_HOST_CLASS
			slot.setAttribute('aria-hidden', 'true')
			return slot
		},
	})

	return {
		panel,
		leftSlot,
		rightSlot,
		selectHost,
	}
}

export const sendFormPanelIds = {
	PANEL_ID,
	PANEL_CLASS,
	SELECT_HOST_CLASS,
	LEFT_SLOT_CLASS,
	RIGHT_SLOT_CLASS,
}
