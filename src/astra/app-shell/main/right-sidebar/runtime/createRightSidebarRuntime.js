import { createRightSidebar, createLorePanelController, buildLoreUI } from '../index.js'
import { renderAiSettings } from '../../../sidebar/modules/index.js'
import { createSecondaryTabs } from '../../../../shared/components/index.js'
import { portDrawerInto } from '../../../../utils/dom.js'
import { isMobileLayoutActive } from '@/astra/mobile/state/layout.js'
import { createMobileRightSidebarDrawer } from './createMobileRightSidebarDrawer.js'

// Centralized drawer mapping with titles, long-form headings, and icon names.
// Icons are lucide names consumed downstream by the AI Settings renderer.
const DRAWER_MAPPINGS = [
	{
		id: 'left-nav-panel',
		title: 'Config',
		heading: 'AI Response Configuration',
		icon: 'sliders-horizontal',
	},
	{
		id: 'rm_api_block',
		title: 'API',
		heading: 'API Connections',
		icon: 'plug-2',
	},
	{
		id: 'AdvancedFormatting',
		title: 'Advanced',
		heading: 'AI Response Formatting',
		icon: 'type',
	},
]

function preparePortedDrawers(mappings = DRAWER_MAPPINGS) {
	const tabItems = []

	mappings.forEach(mapping => {
		const stagingContainer = document.createElement('div')
		const drawerElement = portDrawerInto(mapping.id, stagingContainer)
		if (drawerElement) {
			tabItems.push({
				id: mapping.id,
				title: mapping.title,
				// Provide extended metadata for downstream renderers
				heading: mapping.heading,
				icon: mapping.icon,
				content: drawerElement,
			})
		}
	})

	return tabItems
}

export function createRightSidebarRuntime({
	context,
	loreState,
	persistState,
	shellState,
	shellActions,
	shellDom,
	dependencies,
}) {
	const { eventSource, event_types } = context
	const {
		resolveCurrentEntity,
		setAiSettingsTabsApi,
	} = shellActions
	const {
		setPersistHandler,
		getSidebarTabContent,
	} = shellState
	const { sidebarHeader, sidebarHeaderTitleSlot, sidebarHeaderActions, characterIdentity } = shellDom
	const {
		SlashCommandParser,
		CFG,
		debounce,
	} = dependencies

	const rightSidebar = createRightSidebar({
		eventSource,
		event_types,
		resolveCurrentEntity,
	})

	const mobileDrawer = createMobileRightSidebarDrawer({
		rightSidebar,
		controller: rightSidebar.controller,
		getEntityInfoLabel: () => rightSidebar.controller?.getEntityInfoLabel?.(),
		isMobileLayoutActive,
	})

	if (characterIdentity && typeof rightSidebar.registerEntityInfoTrigger === 'function') {
		rightSidebar.registerEntityInfoTrigger(characterIdentity)
	}

	const loreController = createLorePanelController({
		containers: rightSidebar.loreContainers,
		badge: rightSidebar.loreBadge,
		state: loreState.state,
		getSortModeActive: loreState.getSortModeActive,
		getSortModePotential: loreState.getSortModePotential,
		getOptCaseSensitive: loreState.getOptCaseSensitive,
		getOptWholeWord: loreState.getOptWholeWord,
		SlashCommandParser,
		CFG,
		debounce,
		eventSource,
		eventTypes: event_types,
	})

	function initializeLoreUI() {
		const loreTabsApi = buildLoreUI({
			containers: rightSidebar.loreContainers,
			panelId: CFG.lore.panelId,
			createSecondaryTabs,
			values: loreState.getValues(),
			setters: {
				setSortModeActive: loreState.setSortModeActive,
				setSortModePotential: loreState.setSortModePotential,
				setOptCaseSensitive: loreState.setOptCaseSensitive,
				setOptWholeWord: loreState.setOptWholeWord,
			},
			fns: {
				expandAllIn: loreController.expandAllIn,
				collapseAllIn: loreController.collapseAllIn,
				renderActiveList: loreController.renderActiveList,
				renderActiveListAll: loreController.renderActiveListAll,
				renderPotentialList: loreController.renderPotentialList,
				renderPotentialListAll: loreController.renderPotentialListAll,
				updateLoreMatches: loreController.updateLoreMatches,
				persistState,
				setActiveLoreTab: loreController.setActiveLoreTab,
			},
			state: loreState.state,
			rightSidebarContent: rightSidebar.rightSidebarContent,
		})

		if (loreTabsApi?.elements && typeof loreController.registerLoreCounters === 'function') {
			loreController.registerLoreCounters(loreTabsApi.elements)
		}

		return loreTabsApi
	}

	function hydrateAiSettingsTab() {
		const portedDrawerItems = preparePortedDrawers()
		const backgroundDrawer = portDrawerInto('Backgrounds', rightSidebar.backgroundDrawerHost ?? rightSidebar.backgroundPanel)
		if (!backgroundDrawer) {
			console.warn('[AstraProjecta] Failed to port Backgrounds drawer into the right sidebar.')
		}

		const sidebarTabs = getSidebarTabContent()
		if (sidebarTabs?.['ai-settings']) {
			const { tabsApi } = renderAiSettings(sidebarTabs['ai-settings'], {
				createSecondaryTabs,
				sidebarHeader,
				sidebarHeaderTitleSlot,
				sidebarHeaderActions,
				portedDrawerItems,
			})
			if (typeof setAiSettingsTabsApi === 'function') setAiSettingsTabsApi(tabsApi)
		}
	}

	return {
		rightSidebar,
		controllers: {
			lore: {
				initializeLoreUI,
				renderActiveList: loreController.renderActiveList,
				renderActiveListAll: loreController.renderActiveListAll,
				renderPotentialList: loreController.renderPotentialList,
				renderPotentialListAll: loreController.renderPotentialListAll,
				updateLoreMatches: loreController.updateLoreMatches,
				updateLoreBadge: loreController.updateLoreBadge,
				expandAllIn: loreController.expandAllIn,
				collapseAllIn: loreController.collapseAllIn,
				setActiveLoreTab: loreController.setActiveLoreTab,
				hookTextareaListeners: loreController.hookTextareaListeners,
				subscribeWorldInfoEvents: loreController.subscribeWorldInfoEvents,
			},
		},
		persistHandlers: {
			shell: handler => setPersistHandler?.(handler),
			rightSidebar: handler => rightSidebar.setPersistHandler?.(handler),
		},
		registers: {
			hydrateAiSettingsTab,
			registerLoreCounters: loreController.registerLoreCounters,
		},
		mobileDrawer,
	}
}
