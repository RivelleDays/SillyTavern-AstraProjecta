import { createSecondaryTabs } from '@/astra/shared/components/secondaryTabs.js'

const TAB_CONFIG = [
	{
		id: 'overview',
		title: 'Overview',
		asideTitle: 'Left column · Overview',
		asideText: 'Pin highlights or a short blurb for this character.',
		description: 'Overview panel content placeholder.',
	},
	{
		id: 'details',
		title: 'Details',
		asideTitle: 'Left column · Details',
		asideText: 'Use this slot for notes that stay pinned across detail edits.',
		description: 'Details panel content placeholder.',
	},
	{
		id: 'gallery',
		title: 'Gallery',
		asideTitle: 'Left column · Gallery',
		asideText: 'Reserve this space for cover art attribution or media tips.',
		description: 'Gallery panel content placeholder.',
	},
	{
		id: 'style',
		title: 'Style',
		asideTitle: 'Left column · Style',
		asideText: 'Keep styling guidance or theme toggles here.',
		description: 'Style panel content placeholder.',
	},
]

function createPanelContent(documentRef, tab) {
	const panel = documentRef.createElement('div')
	panel.id = `astra-home-entityTabs__panel--${tab.id}`
	panel.className = `astra-home-entityTabs__panel astra-home-entityTabs__panel--${tab.id}`

	const grid = documentRef.createElement('div')
	grid.className = 'astra-home-entityTabs__panelGrid'

	const aside = documentRef.createElement('div')
	aside.className = 'astra-home-entityTabs__panelAside'

	const asideTitle = documentRef.createElement('p')
	asideTitle.className = 'astra-home-entityTabs__panelAsideTitle'
	asideTitle.textContent = tab.asideTitle || `${tab.title} side content`

	const asideText = documentRef.createElement('p')
	asideText.className = 'astra-home-entityTabs__panelAsideText'
	asideText.textContent =
		tab.asideText ||
		'Reserved side content for this tab.'

	aside.append(asideTitle, asideText)

	const main = documentRef.createElement('div')
	main.className = 'astra-home-entityTabs__panelMain'

	const heading = documentRef.createElement('h3')
	heading.className = 'astra-home-entityTabs__panelHeading'
	heading.textContent = tab.title

	const description = documentRef.createElement('p')
	description.className = 'astra-home-entityTabs__panelDescription'
	description.textContent = tab.description || `${tab.title} panel`

	main.append(heading, description)
	grid.append(aside, main)
	panel.append(grid)

	return { panel, panelMain: main, panelAside: aside }
}

export function createCharacterHomeSection(host, { idPrefix = 'home-entityTabs' } = {}) {
	const documentRef = host?.ownerDocument
	if (!host || !documentRef) return null

	const root = documentRef.createElement('div')
	root.id = 'astra-home-entityTabs'
	root.className = 'astra-home-entityTabs'

	const intro = documentRef.createElement('p')
	intro.id = 'astra-home-entityTabs__intro'
	intro.className = 'astra-home-entityTabs__intro'

	const panelsById = new Map()
	const panelMainsById = new Map()
	const items = TAB_CONFIG.map(tab => {
		const panelContent = createPanelContent(documentRef, tab)
		panelsById.set(tab.id, panelContent.panel)
		panelMainsById.set(tab.id, panelContent.panelMain)
		return {
			id: tab.id,
			title: tab.title,
			content: panelContent.panel,
		}
	})

	const tabsApi = createSecondaryTabs(items, { idPrefix })

	if (tabsApi.titleSlot) {
		tabsApi.titleSlot.style.display = 'none'
		tabsApi.titleSlot.setAttribute('aria-hidden', 'true')
	}

	root.append(intro, tabsApi.root)
	host.replaceChildren(root)

	function update(route) {
		const hasEntity = route?.view === 'entity'
		const isGroup = route?.entityType === 'group'

		const placeholderText = !hasEntity
			? 'Select a character or group to view its details.'
			: isGroup
				? 'Group page placeholder. Editing tools coming soon.'
				: ''

		intro.textContent = placeholderText
		root.dataset.entityType = route?.entityType || ''
		root.dataset.entityKey = route?.entityKey || ''
		root.dataset.view = route?.view || ''
	}

	update()

	return {
		root,
		update,
		setActive: tabsApi.setActive,
		tabs: tabsApi.tabs,
		panels: tabsApi.panels,
		panelMains: panelMainsById,
		titleSlot: tabsApi.titleSlot,
	}
}
