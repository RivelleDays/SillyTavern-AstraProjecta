import { createSidebarNavStore } from '../state/sidebarNavStore.js'
import { getDefaultGlobalStore } from '../state/globalStateStore.js'
import { createLoreState } from '../app-shell/main/right-sidebar/state/loreState.js'

export function createBootstrapStores() {
	const sidebarNavStore = createSidebarNavStore()
	const globalStateStore = getDefaultGlobalStore()

	const loreStores = createLoreState()

	return {
		sidebarNavStore,
		globalStateStore,
		...loreStores,
	}
}
