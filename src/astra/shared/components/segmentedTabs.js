/**
 * Creates a non-swipe segmented tab control that uses dedicated segmented tab styling.
 * @param {Array<{id: string, label: string, iconClasses?: string[], content: Node}>} items
 * @param {{ idPrefix?: string, rootClassName?: string, onChange?: (id: string) => void }} options
 */
function createSegmentedTabs(items, options = {}) {
	const { idPrefix = 'segmented-tabs', rootClassName = '', onChange } = options

	const root = document.createElement('div')
	root.className = ['segmented-tabs-root', rootClassName].filter(Boolean).join(' ')

	const tabs = document.createElement('div')
	tabs.className = 'segmented-tabs'
	tabs.id = `${idPrefix}--tabs`

	const panels = document.createElement('div')
	panels.className = 'segmented-tabpanels'
	panels.id = `${idPrefix}--panels`

	const buttonMap = new Map()
	const panelMap = new Map()
	const order = []

	items.forEach((item, index) => {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = 'segmented-tab'
		button.dataset.tabId = item.id
		button.id = `${idPrefix}--tabbtn--${item.id}`

		if (Array.isArray(item.iconClasses) && item.iconClasses.length) {
			const icon = document.createElement('i')
			icon.classList.add(...item.iconClasses)
			button.append(icon)
		}

		const label = document.createElement('span')
		label.textContent = item.label
		button.append(label)

		const panel = document.createElement('div')
		panel.className = 'segmented-tabpanel'
		panel.dataset.tabId = item.id
		panel.id = `${idPrefix}--panel--${item.id}`
		if (item.content) panel.append(item.content)

		if (index === 0) {
			button.classList.add('active')
			panel.classList.add('active')
		}

		button.addEventListener('click', () => setActive(item.id))

		buttonMap.set(item.id, button)
		panelMap.set(item.id, panel)
		order.push(item.id)

		tabs.append(button)
		panels.append(panel)
	})

	let activeId = order[0] || null

	function setActive(id) {
		if (!buttonMap.has(id) || !panelMap.has(id) || id === activeId) return
		const nextIdx = order.indexOf(id)
		if (nextIdx < 0) return

		buttonMap.forEach((btn, btnId) => {
			btn.classList.toggle('active', btnId === id)
		})

		panelMap.forEach((panel, panelId) => {
			panel.classList.toggle('active', panelId === id)
		})

		activeId = id
		if (typeof onChange === 'function') onChange(id)
	}

	root.append(tabs, panels)

	return {
		root,
		tabs,
		panels,
		setActive,
		getActive: () => activeId,
		getPanel: id => panelMap.get(id) || null,
	}
}

export { createSegmentedTabs }
