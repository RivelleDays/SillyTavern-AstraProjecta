import { hideMobileMainArea, resetMobileMainArea, showMobileMainArea } from '../state/index.js'
import { createMobileShellRuntime } from './shell.js'

export function createMobileRuntime({
	appWrapper,
	contentColumn,
	leftSidebar,
	primaryBarLeft,
	getCurrentChatId,
	sidebarNavStore,
	setActiveSidebarTab,
	personaAvatarWatcher,
}) {
	const showMainArea = () => showMobileMainArea({ contentColumn, leftSidebar })
	const hideMainArea = () => hideMobileMainArea({ contentColumn, leftSidebar })
	const resetMainArea = () => resetMobileMainArea({ contentColumn, leftSidebar })

	const runtime = createMobileShellRuntime({
		appWrapper,
		contentColumn,
		leftSidebar,
		primaryBarLeft,
		getCurrentChatId,
		sidebarNavStore,
		setActiveSidebarTab,
		personaAvatarWatcher,
		showMainArea,
		hideMainArea,
		resetMainArea,
	})

	return {
		...runtime,
		layout: {
			...runtime.layout,
		},
		syncMainVisibilityFromChat: runtime.syncMainVisibility,
		initializeLayout: runtime.layout.initialize,
		attachSidebarInteractions: runtime.layout.attachSidebarInteractions,
		attachTouchGestures: runtime.layout.attachTouchGestures,
		isLayoutActive: runtime.layout.isActive,
		showMainArea: runtime.layout.showMainArea,
		hideMainArea: runtime.layout.hideMainArea,
		resetMainArea: runtime.layout.resetMainArea,
		MOBILE_LAYOUT_CLASS: runtime.layout.classes.layout,
		MOBILE_MAIN_VISIBLE_CLASS: runtime.layout.classes.mainVisible,
	}
}
