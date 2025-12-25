import { makeHeadingNode } from './makeHeadingNode.js'
import { attachSwipeHandlers } from '../mobile/swipeHandlers.js'

/**
 * Creates a swipeable secondary tab component with an optional, shared title slot.
 * @param {Array<{id: string, title: string, content: Node}>} items
 * @param {object} [options]
 * @returns {{root: HTMLElement, setActive: function(string), next: function, prev: function, updateCurrentHeading: function, titleSlot?: HTMLElement|null, tabs: HTMLElement, panels: HTMLElement}}
 */
function createSecondaryTabs(items, options = {}) {
	const {
		headings = {},
		renderHeading,
		externalTitleSlot,
		idPrefix = 'tabs',
		titleSlotGuard,
	} = options

	const root = document.createElement('div')
	const titleSlot = externalTitleSlot ? null : document.createElement('div')
	const tabs = document.createElement('div')
	const panels = document.createElement('div')

	root.id = `${idPrefix}--root`
	root.className = 'secondary-tabs-root swipe-enabled'
	if (titleSlot) {
		titleSlot.id = `${idPrefix}--title`
		titleSlot.className = 'secondary-title-slot'
	}
	tabs.id = `${idPrefix}--tabs`
	tabs.className = 'secondary-tabs'
	panels.id = `${idPrefix}--panels`
	panels.className = 'secondary-tabpanels'

	const btnMap = new Map()
	const panelMap = new Map()

	items.forEach((it, idx) => {
		const btn = document.createElement('button')
		btn.id = `${idPrefix}--tabbtn--${it.id}`
		btn.className = 'secondary-tab'
		btn.type = 'button'
		btn.textContent = it.title
		btn.dataset.tabId = it.id

		const panel = document.createElement('div')
		panel.id = `${idPrefix}--${it.id}`
		panel.className = 'secondary-tabpanel'
		panel.dataset.tabId = it.id
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

	const slider = document.createElement('div')
	slider.className = 'secondary-tabs__slider'
	tabs.appendChild(slider)

	if (titleSlot)
		root.append(titleSlot, tabs, panels)
	else
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
		const targetSlot = externalTitleSlot || titleSlot
		if (!targetSlot) return
		if (!shouldUpdateExternalSlot(targetSlot, id)) return
		targetSlot.replaceChildren(makeHeadingNode(resolveHeadingInput(id)))
		targetSlot.dataset.activeTabId = id
	}

	function moveSliderTo(id) {
		if (!slider) return
		const btn = btnMap.get(id)
		if (!btn) return
		const { offsetWidth, offsetLeft } = btn
		slider.style.width = `${offsetWidth}px`
		slider.style.transform = `translateX(${offsetLeft}px)`
		slider.style.opacity = offsetWidth ? '1' : '0'
	}

	function setActive(id) {
		if (!btnMap.has(id) || !panelMap.has(id)) return
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
		requestAnimationFrame(() => moveSliderTo(id))
	}

	function updateCurrentHeading() {
		updateHeading(active)
	}

	function indexOfActive() { return Math.max(0, order.indexOf(active)) }
	function next() { const i = indexOfActive(); setActive(order[(i + 1) % order.length]) }
	function prev() { const i = indexOfActive(); setActive(order[(i - 1 + order.length) % order.length]) }

	updateHeading(active)
	requestAnimationFrame(() => moveSliderTo(active))

	const resizeObserver = new ResizeObserver(() => moveSliderTo(active))
	resizeObserver.observe(tabs)

	attachSwipeHandlers(root, { onLeft: next, onRight: prev })
	return { root, titleSlot, tabs, panels, setActive, next, prev, updateCurrentHeading }
}

export { createSecondaryTabs }
