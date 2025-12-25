import { getPastCharacterChats } from '../../../../../../../../script.js'
import {
	getGroupPastChats,
	groups,
	selected_group,
	openGroupById,
} from '../../../../../../../group-chats.js'
import { timestampToMoment, waitUntilCondition } from '../../../../../../../utils.js'
import { createPersonaAvatarWatcher } from '../../utils/personaAvatar.js'
import { portDrawerInto, enforceDrawerAlwaysOpen, ensurePrimaryTitleSlot } from '../../utils/dom.js'
import { makeHeadingNode, createSecondaryTabs } from '../../shared/components/index.js'
import { createMainContent } from '../../app-shell/main/index.js'
import { createPrimaryBarRightSlot } from '../../app-shell/main/layout/primaryBarRightSlot.js'
import { updateMainForTab as updateMainForTabExt } from '../../app-shell/main/main-area/services/mainAreaSwitch.js'
import { renderChat, renderHomePanel } from '../../app-shell/sidebar/panels/index.js'
import {
	renderCharacterManagement,
	renderPersonaManagement,
	renderUserSettings,
} from '../../app-shell/sidebar/modules/index.js'
import { createMobileRuntime } from '@/astra/mobile'

export function createShell({
	context,
	dom,
	helpers,
	sidebarNavStore,
	globalStateStore,
	initialMainTab,
	CFG,
	}) {
		const appWrapper = document.createElement('div')
		const contentColumn = document.createElement('section')
		const mainTopBar = document.createElement('div')
		const mainRow = document.createElement('div')
		const mainContentWrapper = document.createElement('main')
	const primaryBar = document.createElement('div')
	const primaryBarRightSlot = createPrimaryBarRightSlot()
	const workspaceBridge = {
		setMode: () => {},
	}

	const mainContent = createMainContent({
		CFG,
		createPersonaAvatarWatcher,
		sidebarNavStore,
		globalStateStore,
		initialMainAreaTab: initialMainTab,
		renderHomePanel,
		renderUserSettings,
		renderCharacterManagement,
		renderPersonaManagement,
		renderChat,
		createSecondaryTabs,
		portDrawerInto,
		enforceDrawerAlwaysOpen,
		ensurePrimaryTitleSlot,
		makeHeadingNode,
		waitUntilCondition,
		updateMainForTab: updateMainForTabExt,
		mainContentWrapper,
		sheld: dom.sheld,
		getContext: helpers.getContext,
		eventSource: context.eventSource,
		eventTypes: context.event_types,
		getRequestHeaders: context.getRequestHeaders,
		getThumbnailUrl: context.getThumbnailUrl,
		getPastCharacterChats,
		getGroupPastChats,
		getCurrentChatId: context.getCurrentChatId,
		openGroupChat: context.openGroupChat,
		openCharacterChat: context.openCharacterChat,
		selectCharacterById: context.selectCharacterById,
		openGroupById,
		getGroups: () => groups ?? [],
		getSelectedGroup: () => selected_group,
		timestampToMoment,
		setWorkspaceMode: mode => workspaceBridge.setMode(mode),
	})

	const {
		leftSidebar,
		sidebarNavRail,
		sidebarHeader,
		sidebarHeaderTitleSlot,
		sidebarHeaderActions,
		primaryBarLeft,
		characterSection,
		characterIdentity,
	} = mainContent.elements

	if (leftSidebar) {
		leftSidebar.setAttribute('aria-hidden', 'false')
		appWrapper.append(leftSidebar)
	}

	appWrapper.append(contentColumn)

	const mobile = createMobileRuntime({
		appWrapper,
		contentColumn,
		leftSidebar,
		primaryBarLeft,
		getCurrentChatId: context.getCurrentChatId,
		sidebarNavStore,
		setActiveSidebarTab: mainContent.actions.setActiveSidebarTab,
		personaAvatarWatcher: mainContent.watchers.personaAvatarWatcher,
	})

	return {
		elements: {
			appWrapper,
			contentColumn,
			mainTopBar,
			mainRow,
			mainContentWrapper,
			primaryBar,
			leftSidebar,
			sidebarNavRail,
			sidebarHeader,
			sidebarHeaderTitleSlot,
			sidebarHeaderActions,
			primaryBarLeft,
			characterSection,
			characterIdentity,
			primaryBarRight: primaryBarRightSlot.element,
		},
		actions: mainContent.actions,
		state: mainContent.state,
		watchers: mainContent.watchers,
		mobile,
		slots: {
			primaryBarRight: primaryBarRightSlot,
		},
		workspaceBridge,
	}
}
