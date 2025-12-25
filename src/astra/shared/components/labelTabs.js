/**
 * Creates a compact tab interface rendered as label-style buttons.
 * @param {Array<{ id: string, label: string, content: Node, disabled?: boolean }>} items
 * @param {object} [options]
 * @param {string} [options.idPrefix]
 * @param {string} [options.defaultActiveId]
 * @param {(info: { id: string, button: HTMLElement, panel: HTMLElement }) => void} [options.onChange]
 * @returns {{
 *  root: HTMLElement,
 *  tabs: HTMLElement,
 *  panels: HTMLElement,
 *  setActive: (id: string, options?: { focus?: boolean, silent?: boolean }) => void,
 *  getActive: () => string | null,
 *  setAvailability: (id: string, state: { disabled?: boolean }) => void,
 *  isDisabled: (id: string) => boolean
 * }}
 */
function createLabelTabs(items, options = {}) {
	const { idPrefix = 'label-tabs', defaultActiveId, onChange } = options

	const root = document.createElement('div')
	const tabs = document.createElement('div')
	const panels = document.createElement('div')

	root.className = 'label-tabs-root'
	root.id = `${idPrefix}--root`

	tabs.className = 'label-tabs'
	tabs.id = `${idPrefix}--tabs`
	tabs.setAttribute('role', 'tablist')

	panels.className = 'label-tabpanels'
	panels.id = `${idPrefix}--panels`

	const order = []
	let enabledOrder = []
	const buttonMap = new Map()
	const panelMap = new Map()
	const entries = []
	const entryMap = new Map()

	function appendContent(target, node) {
		if (node instanceof Node) {
			target.append(node)
			return
		}
		const text = document.createTextNode(node ?? '')
		target.append(text)
	}

	items.forEach((item) => {
		if (!item || !item.id) return

		const btn = document.createElement('button')
		btn.type = 'button'
		btn.className = 'label-tab'
		btn.dataset.tabId = item.id
		btn.id = `${idPrefix}--tab--${item.id}`
		btn.textContent = item.label ?? item.title ?? item.id
		btn.setAttribute('role', 'tab')
		btn.setAttribute('aria-selected', 'false')
		btn.tabIndex = -1

		const panel = document.createElement('div')
		panel.className = 'label-tabpanel'
		panel.dataset.tabId = item.id
		panel.id = `${idPrefix}--panel--${item.id}`
		panel.setAttribute('role', 'tabpanel')
		panel.setAttribute('aria-labelledby', btn.id)
		panel.hidden = true
		appendContent(panel, item.content ?? '')

		btn.setAttribute('aria-controls', panel.id)

		btn.addEventListener('click', () => {
			setActive(item.id)
		})
		btn.addEventListener('keydown', (event) => {
			const { key } = event
			const currentIndex = enabledOrder.indexOf(item.id)
			if (currentIndex === -1 || enabledOrder.length === 0) return

			if (key === 'ArrowRight' || key === 'ArrowDown') {
				event.preventDefault()
				const nextIndex = (currentIndex + 1) % enabledOrder.length
				focusByEnabledIndex(nextIndex)
			} else if (key === 'ArrowLeft' || key === 'ArrowUp') {
				event.preventDefault()
				const prevIndex = (currentIndex - 1 + enabledOrder.length) % enabledOrder.length
				focusByEnabledIndex(prevIndex)
			} else if (key === 'Home') {
				event.preventDefault()
				focusByEnabledIndex(0)
			} else if (key === 'End') {
				event.preventDefault()
				focusByEnabledIndex(enabledOrder.length - 1)
			}
		})

		const entry = {
			id: item.id,
			button: btn,
			panel,
			disabled: Boolean(item.disabled),
			index: entries.length,
		}

		buttonMap.set(item.id, btn)
		panelMap.set(item.id, panel)
		entryMap.set(item.id, entry)
		entries.push(entry)
		updateEntryState(entry)
	})

	refreshOrder()
	root.append(tabs, panels)

	let activeId = null

	function focusByEnabledIndex(idx) {
		const count = enabledOrder.length
		if (count === 0) return
		const normalized = ((idx % count) + count) % count
		const id = enabledOrder[normalized]
		if (!id) return
		setActive(id, { focus: true })
	}

	function refreshOrder() {
		const sorted = entries.slice().sort((a, b) => {
			if (a.disabled === b.disabled) return a.index - b.index
			return a.disabled ? 1 : -1
		})

		order.length = 0
		enabledOrder = []

		for (const entry of sorted) {
			order.push(entry.id)
			if (!entry.disabled) {
				enabledOrder.push(entry.id)
			}
			tabs.append(entry.button)
			panels.append(entry.panel)
		}
	}

	function updateEntryState(entry) {
		const { button, disabled } = entry
		if (!button) return
		button.disabled = disabled
		button.setAttribute('aria-disabled', disabled ? 'true' : 'false')
		button.classList.toggle('label-tab--disabled', disabled)
		if (disabled) {
			button.tabIndex = -1
		}
	}

	function clearActive({ silent = false } = {}) {
		activeId = null
		delete root.dataset.activeTabId
		for (const tabId of order) {
			const button = buttonMap.get(tabId)
			const panel = panelMap.get(tabId)
			if (button) {
				button.classList.remove('active')
				button.setAttribute('aria-selected', 'false')
				button.tabIndex = -1
			}
			if (panel) {
				panel.classList.remove('active')
				panel.hidden = true
			}
		}
	}

	function ensureActiveTab({ silent = false } = {}) {
		if (activeId && !entryMap.get(activeId)?.disabled) return
		const firstEnabled = enabledOrder[0]
		if (firstEnabled) {
			setActive(firstEnabled, { silent })
		} else {
			clearActive({ silent: true })
		}
	}

	function setActive(id, { focus = false, silent = false } = {}) {
		const entry = entryMap.get(id)
		if (!entry || entry.disabled) return
		if (activeId === id) {
			if (focus) entry.button?.focus()
			return
		}

		activeId = id
		root.dataset.activeTabId = id

		for (const tabId of order) {
			const button = buttonMap.get(tabId)
			const panel = panelMap.get(tabId)
			const tabEntry = entryMap.get(tabId)
			const isActive = tabId === id

			if (button) {
				button.classList.toggle('active', isActive)
				button.setAttribute('aria-selected', isActive ? 'true' : 'false')
				const canFocus = Boolean(tabEntry && !tabEntry.disabled)
				button.tabIndex = isActive && canFocus ? 0 : -1
				if (focus && isActive && canFocus) button.focus()
			}
			if (panel) {
				panel.classList.toggle('active', isActive)
				panel.hidden = !isActive
			}
		}

		if (!silent && typeof onChange === 'function') {
			const button = buttonMap.get(id) ?? null
			const panel = panelMap.get(id) ?? null
			onChange({ id, button, panel })
		}
	}

	if (order.length > 0) {
		if (defaultActiveId && order.includes(defaultActiveId)) {
			setActive(defaultActiveId, { silent: true })
		}
		if (!activeId) {
			ensureActiveTab({ silent: true })
		}
	} else {
		clearActive({ silent: true })
	}

	function getActive() {
		return activeId
	}

	function setAvailability(id, { disabled }) {
		const entry = entryMap.get(id)
		if (!entry) return

		const nextDisabled = Boolean(disabled)
		if (entry.disabled === nextDisabled) return

		entry.disabled = nextDisabled
		updateEntryState(entry)
		refreshOrder()
		ensureActiveTab()
	}

	function isDisabled(id) {
		return Boolean(entryMap.get(id)?.disabled)
	}

	return { root, tabs, panels, setActive, getActive, setAvailability, isDisabled }
}

export { createLabelTabs }
