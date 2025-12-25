import { ACCORDION_SIZING_KEY } from './accordion/sizingController.js'

const VALID_TABS = new Set(['all', 'active', 'potential'])

/**
 * Wrap the secondary tabs API with lore-specific behavior.
 */
export function setupLoreTabs(tabs, { persistState, setActiveLoreTab, state, panelRoot }) {
	if (!tabs || typeof tabs.setActive !== 'function') {
		return tabs
	}
	const originalSetActive = tabs.setActive.bind(tabs)

	const scheduleAllPanelUpdate = () => {
		if (!panelRoot) {
			return
		}
		requestAnimationFrame(() => {
			const hostPanel = panelRoot.querySelector('.secondary-tabpanel.active[data-tab-id="all"]')
			hostPanel?.[ACCORDION_SIZING_KEY]?.scheduleUpdate()
		})
	}

	tabs.setActive = (id) => {
		const nextId = VALID_TABS.has(id) ? id : 'all'
		originalSetActive(nextId)
		if (state) {
			state.activeLoreTab = nextId
		}
		if (typeof setActiveLoreTab === 'function') {
			setActiveLoreTab(nextId)
		}
		if (typeof persistState === 'function') {
			persistState()
		}
		if (nextId === 'all') {
			scheduleAllPanelUpdate()
		}
		return nextId
	}

	const initialTab = state && VALID_TABS.has(state.activeLoreTab)
		? state.activeLoreTab
		: 'all'

	if (initialTab !== 'all') {
		tabs.setActive(initialTab)
	} else {
		if (state) {
			state.activeLoreTab = 'all'
		}
		if (typeof setActiveLoreTab === 'function') {
			setActiveLoreTab('all')
		}
	}

	return tabs
}
