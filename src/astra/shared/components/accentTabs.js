import { makeHeadingNode } from './makeHeadingNode.js'
import { attachSwipeHandlers } from '../mobile/swipeHandlers.js'

/**
 * Creates a swipeable accent tab component.
 * @param {Array<{id: string, title: string, icon?: string, content: Node}>} items
 * @param {object} [options]
 * @returns {{
 *  root: HTMLElement,
 *  setActive: function(string),
 *  next: function,
 *  prev: function,
 *  updateCurrentHeading: function,
 *  tabs: HTMLElement,
 *  panels: HTMLElement
 * }}
 */
function createAccentTabs(items, options = {}) {
	const {
		headings = {},
		renderHeading,
		externalTitleSlot,
		idPrefix = 'accent-tabs',
		titleSlotGuard,
		onChange,
	} = options

	const root = document.createElement('div')
	const tabs = document.createElement('div')
	const panels = document.createElement('div')

	root.className = 'accent-tabs-root swipe-enabled'
	root.id = `${idPrefix}--root`
	tabs.className = 'accent-tabs'
	tabs.id = `${idPrefix}--tabs`
	panels.className = 'accent-tabpanels'
	panels.id = `${idPrefix}--panels`

	const btnMap = new Map()
	const panelMap = new Map()

	items.forEach((it, idx) => {
		const btn = document.createElement('button')
		btn.className = 'accent-tab'
		btn.type = 'button'
		btn.dataset.tabId = it.id
		btn.id = `${idPrefix}--tabbtn--${it.id}`
		btn.title = it.title ?? ''
		if (it.icon) {
			btn.innerHTML = it.icon
			if (it.title) btn.setAttribute('aria-label', it.title)
		} else {
			btn.textContent = it.title ?? it.id
		}

		const panel = document.createElement('div')
		panel.className = 'accent-tabpanel'
		panel.dataset.tabId = it.id
		panel.id = `${idPrefix}--${it.id}`
		panel.append(it.content)

		btn.addEventListener('click', () => setActive(it.id))
		tabs.appendChild(btn)
		panels.appendChild(panel)

		btnMap.set(it.id, btn)
		panelMap.set(it.id, panel)

		if (idx === 0) {
			btn.classList.add('active')
			panel.classList.add('active')
		}
	})

	root.append(tabs, panels)

	const order = items.map(i => i.id)
	let active = order[0]

	function resolveHeadingInput(id) {
		let h = headings?.[id]
		if (!h) h = items.find(x => x.id === id)?.heading
		if (!h && typeof renderHeading === 'function') h = renderHeading(id, items)
		return h ?? items.find(x => x.id === id)?.title ?? id
	}

	function shouldUpdateExternalSlot(target, nextId) {
		if (!externalTitleSlot || !target) return true
		if (!titleSlotGuard) return true

		const activeTabId = target.dataset?.activeTab

		try {
			if (typeof titleSlotGuard === 'function') {
				return !!titleSlotGuard({ activeSidebarTab: activeTabId, nextTabId: nextId, slot: target })
			}
		} catch {
			return true
		}

		if (typeof titleSlotGuard === 'string') {
			return activeTabId === titleSlotGuard
		}

		return true
	}

	function updateHeading(id) {
		const targetSlot = externalTitleSlot
		if (!targetSlot) return
		if (!shouldUpdateExternalSlot(targetSlot, id)) return
		targetSlot.replaceChildren(makeHeadingNode(resolveHeadingInput(id)))
		targetSlot.dataset.activeTabId = id
	}

	function setActive(id) {
		if (!btnMap.has(id) || !panelMap.has(id)) return
		if (id === active) return
		const prevId = active
		const prevIdx = order.indexOf(prevId)
		const nextIdx = order.indexOf(id)
		const dir = nextIdx > prevIdx ? 'left' : 'right'

		btnMap.forEach(b => b.classList.toggle('active', b.dataset.tabId === id))
		panelMap.forEach(p => p.classList.toggle('active', p.dataset.tabId === id))

		const panel = panelMap.get(id)
		panel.classList.add('animating', dir === 'left' ? 'from-right' : 'from-left')
		panel.addEventListener('animationend', () => {
			panel.classList.remove('animating', 'from-right', 'from-left')
		}, { once: true })

		active = id
		updateHeading(id)

		if (typeof onChange === 'function') {
			try {
				onChange(id, prevId)
			} catch (error) {
				console.debug('Accent tabs: onChange handler failed.', error)
			}
		}
	}

	function updateCurrentHeading() {
		updateHeading(active)
	}

	function indexOfActive() {
		return Math.max(0, order.indexOf(active))
	}
	function next() {
		const i = indexOfActive()
		setActive(order[(i + 1) % order.length])
	}
	function prev() {
		const i = indexOfActive()
		setActive(order[(i - 1 + order.length) % order.length])
	}

	updateHeading(active)

	attachSwipeHandlers(root, { onLeft: next, onRight: prev })
	return { root, tabs, panels, setActive, next, prev, updateCurrentHeading }
}

export { createAccentTabs }
