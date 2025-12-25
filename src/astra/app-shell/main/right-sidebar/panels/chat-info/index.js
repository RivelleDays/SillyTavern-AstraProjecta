import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'
import { createSecondaryTabs, createSegmentedTabs } from '../../../../../shared/components/index.js'

const NOTE_ICON = getLucideIconMarkup('sticky-note')
const ADVANCED_ICON = getLucideIconMarkup('wrench')

function createTabContent({ description }) {
	const wrapper = document.createElement('div')
	if (description) {
		const subtitle = document.createElement('div')
		subtitle.className = 'panel-subtitle'
		subtitle.textContent = description
		wrapper.append(subtitle)
	}
	return wrapper
}

function relocateExistingContent(selector, target) {
	if (!target) return

	const resolveNode = () => {
		if (typeof selector === 'function') return selector()
		if (!selector) return null
		return document.querySelector(selector)
	}

	const moveNode = (node) => {
		if (!node || node === target) return
		if (target.contains(node)) return
		target.append(node)
	}

	const initialNode = resolveNode()
	if (initialNode) {
		moveNode(initialNode)
		return
	}

	const observer = new MutationObserver(() => {
		const nextNode = resolveNode()
		if (!nextNode) return
		observer.disconnect()
		moveNode(nextNode)
	})

	const observerTarget = document.body || document.documentElement
	if (!observerTarget) return
	observer.observe(observerTarget, { childList: true, subtree: true })
}

function createAdvancedControlsSection() {
	const config = [
		{
			id: 'cfg',
			label: 'CFG Scale',
			selector: 'div[name="cfgConfigHolder"]',
			iconClasses: ['fa-lg', 'fa-solid', 'fa-scale-balanced'],
		},
		{
			id: 'logprobs',
			label: 'Token Probabilities',
			selector: '.logprobs_panel_content.inline-drawer-content.flex-container.flexFlowColumn',
			iconClasses: ['fa-lg', 'fa-solid', 'fa-pie-chart'],
		},
	]

	const items = config.map(({ id, label, iconClasses }) => ({
		id,
		label,
		iconClasses,
	}))

	const segmented = createSegmentedTabs(items, {
		idPrefix: 'chat-info-advanced',
		rootClassName: 'chat-info-advanced',
	})

	segmented.root.id = 'chatInfoAdvanced'

	config.forEach(({ id, selector }) => {
		const panel = segmented.getPanel(id)
		if (!panel) return
		relocateExistingContent(selector, panel)
	})

	return { root: segmented.root, setActive: segmented.setActive }
}

export function createChatInfo() {
	const panel = document.createElement('div')
	panel.id = 'chatInfoPanel'

	const noteTabContent = createTabContent({})
	noteTabContent.classList.add('chat-info-note-container')
	relocateExistingContent('div[name="floatingPromptHolder"]', noteTabContent)

	const advancedControls = createAdvancedControlsSection()
	const advancedTabContent = createTabContent({})
	advancedTabContent.classList.add('chat-info-advanced-container')
	advancedTabContent.append(advancedControls.root)

	const items = [
		{
			id: 'note',
			buttonLabel: 'Note',
			heading: "Author's Note",
			content: noteTabContent,
			icon: NOTE_ICON,
		},
		{
			id: 'advanced',
			buttonLabel: 'Advanced',
			heading: 'Advanced Controls',
			content: advancedTabContent,
			icon: ADVANCED_ICON,
		},
	]

	const tabs = createSecondaryTabs(
		items.map(({ id, buttonLabel, content, description }) => ({
			id,
			title: buttonLabel,
			content: content ?? createTabContent({ description }),
		})),
		{
			headings: Object.fromEntries(items.map(({ id, icon, heading }) => [id, { icon, label: heading }])),
			idPrefix: 'tabs-chat-info',
		},
	)

	panel.append(tabs.root)

	return {
		panel,
		tabs,
	}
}
