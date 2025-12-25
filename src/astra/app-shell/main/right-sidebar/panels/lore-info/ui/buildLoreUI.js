import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'
import { buildExpandCollapse, buildSortSelect, buildToggleButton } from './controls.js'
import { createAccordionSection } from './accordion/accordionSection.js'
import { setupLoreTabs } from './tabs.js'

/** @typedef {import('./containers.js').LoreContainers} LoreContainers */

/**
 * @typedef {'flat' | 'world'} LoreSortMode
 */

/**
 * @typedef {Object} LoreUIValues
 * @property {LoreSortMode} sortModeActive
 * @property {LoreSortMode} sortModePotential
 * @property {boolean} optCaseSensitive
 * @property {boolean} optWholeWord
 */

/**
 * @typedef {Object} LoreUISetters
 * @property {(value: LoreSortMode) => void} setSortModeActive
 * @property {(value: LoreSortMode) => void} setSortModePotential
 * @property {(value: boolean) => void} setOptCaseSensitive
 * @property {(value: boolean) => void} setOptWholeWord
 */

/**
 * @typedef {Object} LoreUIFns
 * @property {(list: HTMLElement) => void} expandAllIn
 * @property {(list: HTMLElement) => void} collapseAllIn
 * @property {() => void} renderActiveList
 * @property {() => void} renderActiveListAll
 * @property {() => void} renderPotentialList
 * @property {() => void} renderPotentialListAll
 * @property {(force?: boolean) => void} updateLoreMatches
 * @property {() => void} persistState
 * @property {(tabId: string) => void} [setActiveLoreTab]
 */

const CHEVRON_DOWN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-down"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 9l6 6l6 -6" /></svg>`
const CHEVRON_UP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-up"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 15l6 -6l6 6" /></svg>`
const OVERVIEW_ICON = getLucideIconMarkup('book-marked', { strokeWidth: 2.25 })
const ACTIVE_ICON = getLucideIconMarkup('circle-check-big')
const POTENTIAL_ICON = getLucideIconMarkup('circle-fading-arrow-up')
const INFO_ICON = getLucideIconMarkup('info', { strokeWidth: 2.25 })
const TOGGLE_CASE_ICON = getLucideIconMarkup('case-sensitive', { strokeWidth: 1.75 })
const TOGGLE_WHOLE_ICON = getLucideIconMarkup('whole-word', { strokeWidth: 1.75 })

const CHEVRON_ICONS = {
	expanded: CHEVRON_UP_ICON,
	collapsed: CHEVRON_DOWN_ICON,
}

const SECTION_CLASSES = {
	active: 'lore-container lore-container-active',
	potential: 'lore-container lore-container-potential',
}

const TAB_DESCRIPTORS = [
	{ id: 'all', title: 'Overview' },
	{ id: 'active', title: 'Active' },
	{ id: 'potential', title: 'Potential' },
]

const VALID_SECTION_TYPES = new Set(['active', 'potential'])

function resolveLabelIcon({ type, collapsible, helpText }) {
	if (!VALID_SECTION_TYPES.has(type)) {
		return { labelIconMarkup: '', labelIconHelpText: '' }
	}
	if (!collapsible) {
		return {
			labelIconMarkup: INFO_ICON,
			labelIconHelpText: helpText ?? '',
		}
	}
	if (type === 'active') {
		return { labelIconMarkup: ACTIVE_ICON, labelIconHelpText: '' }
	}
	if (type === 'potential') {
		return { labelIconMarkup: POTENTIAL_ICON, labelIconHelpText: '' }
	}
	return { labelIconMarkup: '', labelIconHelpText: '' }
}

/**
 * Assemble the lore UI tab set.
 * @param {Object} params
 * @param {LoreContainers} params.containers
 * @param {string} params.panelId
 * @param {(strings: TemplateStringsArray, ...values: any[]) => string} params.t
 * @param {(items: Array<{ id: string, title: string, content: HTMLElement }>, options?: any) => { root: HTMLElement, setActive: (id: string) => void }} params.createSecondaryTabs
 * @param {LoreUIValues} params.values
 * @param {LoreUISetters} params.setters
 * @param {LoreUIFns} params.fns
 * @param {Record<string, any>} params.state
 * @param {HTMLElement} params.rightSidebarContent
 * @returns {{ root: HTMLElement, setActive: (id: string) => void }}
 */
export function buildLoreUI({
	containers,
	panelId,
	createSecondaryTabs,
	values,
	setters,
	fns,
	state,
	rightSidebarContent,
}) {
	const {
		root,
		activeWrap,
		activeTitle,
		activeControls,
		activeList,
		activeEmpty,
		potentialWrap,
		potentialTitle,
		potentialControls,
		potentialList,
		potentialEmpty,
		allActiveList,
		allActiveEmpty,
		allPotentialList,
		allPotentialEmpty,
	} = containers

	const primaryActiveCount = document.createElement('span')
	primaryActiveCount.className = 'lore-controls-count'
	const primaryPotentialCount = document.createElement('span')
	primaryPotentialCount.className = 'lore-controls-count'

	const countRefs = {
		overviewActive: null,
		overviewPotential: null,
		primaryActive: primaryActiveCount,
		primaryPotential: primaryPotentialCount,
	}

	const {
		sortModeActive,
		sortModePotential,
		optCaseSensitive,
		optWholeWord,
	} = values

	const {
		setSortModeActive,
		setSortModePotential,
		setOptCaseSensitive,
		setOptWholeWord,
	} = setters

	const {
		expandAllIn,
		collapseAllIn,
		renderActiveList,
		renderActiveListAll,
		updateLoreMatches,
		persistState,
		setActiveLoreTab,
	} = fns

	const ACTIVE_ENTRIES_HELP_TEXT = 'Shows all currently active Worlds/Lorebook entries based on the latest message. Send at least one message before using.'
	const POTENTIAL_ENTRIES_HELP_TEXT = 'Shows entries that may activate from your input. Auto-updates and displays filters. Manually adjust settings to match global.'

	root.id = panelId

	const allActiveWrap = document.createElement('div')
	const allActiveTitle = document.createElement('div')
	const allActiveControls = document.createElement('div')

	const allPotentialWrap = document.createElement('div')
	const allPotentialTitle = document.createElement('div')
	const allPotentialControls = document.createElement('div')

	const createActiveControls = (listEl) => ([
		buildSortSelect({
			current: sortModeActive,
			onChange: (value) => {
				setSortModeActive(value)
				renderActiveList()
				renderActiveListAll()
				persistState()
			},
		}),
		buildExpandCollapse(
			() => expandAllIn(listEl),
			() => collapseAllIn(listEl),
		),
	])

	const createPotentialControls = (listEl) => ([
		buildSortSelect({
			current: sortModePotential,
			onChange: (value) => {
				setSortModePotential(value)
				updateLoreMatches(true)
				persistState()
			},
		}),
		buildToggleButton({
			label: 'Case-sensitive',
			initial: optCaseSensitive,
			icon: TOGGLE_CASE_ICON,
			onToggle: (value) => {
				setOptCaseSensitive(value)
				updateLoreMatches(true)
				persistState()
			},
		}),
		buildToggleButton({
			label: 'Match Whole Words',
			initial: optWholeWord,
			icon: TOGGLE_WHOLE_ICON,
			onToggle: (value) => {
				setOptWholeWord(value)
				updateLoreMatches(true)
				persistState()
			},
		}),
		buildExpandCollapse(
			() => expandAllIn(listEl),
			() => collapseAllIn(listEl),
		),
	])

	const panelSections = [
		{
			id: 'active',
			tabId: 'active',
			type: 'active',
			collapsible: false,
			defaultExpanded: true,
			helpText: ACTIVE_ENTRIES_HELP_TEXT,
			nodes: {
				wrap: activeWrap,
				title: activeTitle,
				controls: activeControls,
				list: activeList,
				empty: activeEmpty,
			},
			classes: {
				wrap: SECTION_CLASSES.active,
				title: '',
				controls: 'lore-controls',
				list: 'lore-list',
				empty: 'lore-empty',
			},
			text: {
				title: ACTIVE_ENTRIES_HELP_TEXT,
				empty: 'No active entries.',
			},
			contentOrder: ['controls', 'list', 'empty'],
			buildControls: () => createActiveControls(activeList),
		},
		{
			id: 'potential',
			tabId: 'potential',
			type: 'potential',
			collapsible: false,
			defaultExpanded: true,
			helpText: POTENTIAL_ENTRIES_HELP_TEXT,
			nodes: {
				wrap: potentialWrap,
				title: potentialTitle,
				controls: potentialControls,
				list: potentialList,
				empty: potentialEmpty,
			},
			classes: {
				wrap: SECTION_CLASSES.potential,
				title: '',
				controls: 'lore-controls',
				list: 'lore-list',
				empty: 'lore-empty',
			},
			text: {
				title: POTENTIAL_ENTRIES_HELP_TEXT,
				empty: 'No matching entries yet. Start typing.',
			},
			contentOrder: ['controls', 'empty', 'list'],
			buildControls: () => createPotentialControls(potentialList),
		},
		{
			id: 'all-active',
			tabId: 'all',
			type: 'active',
			collapsible: true,
			defaultExpanded: true,
			nodes: {
				wrap: allActiveWrap,
				title: allActiveTitle,
				controls: allActiveControls,
				list: allActiveList,
				empty: allActiveEmpty,
			},
			classes: {
				wrap: SECTION_CLASSES.active,
				title: 'panel-title',
				controls: 'lore-controls',
				list: 'lore-list',
				empty: 'lore-empty',
			},
			text: {
				title: 'Active Entries',
				empty: 'No active entries.',
			},
			contentOrder: ['controls', 'list', 'empty'],
			buildControls: () => createActiveControls(allActiveList),
		},
		{
			id: 'all-potential',
			tabId: 'all',
			type: 'potential',
			collapsible: true,
			defaultExpanded: true,
			nodes: {
				wrap: allPotentialWrap,
				title: allPotentialTitle,
				controls: allPotentialControls,
				list: allPotentialList,
				empty: allPotentialEmpty,
			},
			classes: {
				wrap: SECTION_CLASSES.potential,
				title: 'panel-title',
				controls: 'lore-controls',
				list: 'lore-list',
				empty: 'lore-empty',
			},
			text: {
				title: 'Potential Entries',
				empty: 'No matching entries yet. Start typing.',
			},
			contentOrder: ['controls', 'empty', 'list'],
			buildControls: () => createPotentialControls(allPotentialList),
		},
	]

	const tabRoots = new Map(TAB_DESCRIPTORS.map(({ id }) => [id, document.createElement('div')]))

	panelSections.forEach((section) => {
		const { nodes, classes, text, buildControls, contentOrder, collapsible, type, helpText } = section

		nodes.wrap.className = classes.wrap || ''
		nodes.title.className = classes.title || ''
		nodes.controls.className = classes.controls || ''
		nodes.list.className = classes.list || ''
		nodes.empty.className = classes.empty || ''

		nodes.title.textContent = text.title ?? ''
		nodes.empty.textContent = text.empty ?? ''

		nodes.controls.replaceChildren(...buildControls())

		const contentEls = (contentOrder || ['controls', 'list', 'empty'])
			.map((slot) => nodes[slot])
			.filter((el) => !!el)

		const { labelIconMarkup: resolvedLabelIconMarkup, labelIconHelpText: resolvedLabelIconHelpText } = resolveLabelIcon({ type, collapsible, helpText })
		const omitLabelIcon = section.tabId === 'all'
		const labelIconMarkup = omitLabelIcon ? '' : resolvedLabelIconMarkup
		const labelIconHelpText = omitLabelIcon ? '' : resolvedLabelIconHelpText

		createAccordionSection({
			panelId,
			wrap: nodes.wrap,
			titleEl: nodes.title,
			contentEls,
			defaultExpanded: section.defaultExpanded,
			collapsible,
			chevronIcons: CHEVRON_ICONS,
			labelIconMarkup,
			labelIconHelpText,
		})

		const tabRoot = tabRoots.get(section.tabId)
		if (tabRoot) {
			tabRoot.append(nodes.wrap)
		}

		if (section.id === 'active') {
			nodes.controls.append(primaryActiveCount)
		} else if (section.id === 'potential') {
			nodes.controls.append(primaryPotentialCount)
		}

		if (section.id === 'all-active' || section.id === 'all-potential') {
			const toggleContent = nodes.wrap.querySelector('.lore-accordion-toggle-content')
			if (toggleContent) {
				const countEl = document.createElement('span')
				countEl.className = 'lore-section-count'
				toggleContent.append(countEl)
				if (section.id === 'all-active') {
					countRefs.overviewActive = countEl
				} else {
					countRefs.overviewPotential = countEl
				}
			}
		}
	})

	const titleSlot = document.createElement('div')
	titleSlot.className = 'secondary-title-slot'
	const headingSlot = document.createElement('div')
	headingSlot.className = 'secondary-title-slot__heading'
	titleSlot.append(headingSlot)

	const tabs = createSecondaryTabs(
		TAB_DESCRIPTORS.map(({ id, title }) => ({
			id,
			title,
			content: tabRoots.get(id),
		})),
		{
			classes: {
				root: 'lore-tabs',
				tablist: 'lore-tabs-list',
				tab: 'lore-tab',
				tabpanel: 'secondary-tabpanel',
			},
			headings: {
				all: { icon: OVERVIEW_ICON, label: 'Worlds/Lorebooks Info' },
				active: { icon: ACTIVE_ICON, label: 'Active Entries' },
				potential: { icon: POTENTIAL_ICON, label: 'Potential Entries' },
			},
			idPrefix: 'tabs-lore',
			externalTitleSlot: headingSlot,
		},
	)

	setupLoreTabs(tabs, { persistState, setActiveLoreTab, state, panelRoot: root })

	tabs.root.prepend(titleSlot)

	tabs.elements = {
		titleSlot,
		headingSlot,
		overviewActiveCount: countRefs.overviewActive,
		overviewPotentialCount: countRefs.overviewPotential,
		primaryActiveCount: countRefs.primaryActive,
		primaryPotentialCount: countRefs.primaryPotential,
	}

	root.replaceChildren(tabs.root)
	rightSidebarContent.append(root)

	return tabs
}
