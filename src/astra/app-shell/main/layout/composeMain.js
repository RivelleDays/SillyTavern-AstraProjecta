import { getNavSectionsWithIcons } from '../navigation/navConfig.js'
import { createMainAreaModule } from '../main-area/mainAreaModule.js'
import { createSidebarShell } from '../../sidebar/sidebarShell.js'

export function createMainContent(deps) {
	const {
		document: documentParam,
        createPersonaAvatarWatcher,
			sidebarNavStore,
		globalStateStore,
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
		updateMainForTab,
		mainContentWrapper,
		sheld,
		getContext,
		eventSource,
		eventTypes,
		getRequestHeaders,
		getThumbnailUrl,
		getPastCharacterChats,
		getGroupPastChats,
		getCurrentChatId,
		openGroupChat,
		openCharacterChat,
		selectCharacterById,
		openGroupById,
		getGroups,
		getSelectedGroup,
		timestampToMoment,
		setWorkspaceMode,
		initialMainAreaTab,
	} = deps

    const documentRef = documentParam ?? globalThis.document

    const navItems = getNavSectionsWithIcons()

	const workspaceModeHandler = typeof setWorkspaceMode === 'function' ? setWorkspaceMode : () => {}

	const mainArea = createMainAreaModule({
		document: documentRef,
		updateMainForTab,
		ensurePrimaryTitleSlot,
		makeHeadingNode,
		waitUntilCondition,
		portDrawerInto,
		enforceDrawerAlwaysOpen,
		mainContentWrapper,
		sheld,
		getContext,
		getGroups,
		getSelectedGroup,
		getCurrentChatId,
		eventSource,
		eventTypes,
		navItems,
		setWorkspaceMode: workspaceModeHandler,
		getRequestHeaders,
		getThumbnailUrl,
		timestampToMoment,
		initialActiveMainTab: initialMainAreaTab,
		globalStateStore,
	})

	const sidebar = createSidebarShell({
        document: documentRef,
        createPersonaAvatarWatcher,
        sidebarNavStore,
        navItems,
        mainAreaNavigation: mainArea.navigation,
        createMainAreaUpdateContext: mainArea.state.createMainAreaUpdateContext,
        updateMainForTab,
        getActiveMainAreaTab: mainArea.state.getActiveMainAreaTab,
        setActiveMainAreaTab: mainArea.state.setActiveMainAreaTab,
		initialActiveTab: initialMainAreaTab,
        renderHomePanel,
        renderUserSettings,
        renderCharacterManagement,
        renderPersonaManagement,
        renderChat,
        createSecondaryTabs,
        portDrawerInto,
        enforceDrawerAlwaysOpen,
        getContext,
        eventSource,
        eventTypes,
        getPastCharacterChats,
		getGroupPastChats,
		getCurrentChatId,
		openGroupChat,
		openCharacterChat,
		selectCharacterById,
		openGroupById,
		resolveCurrentEntity: mainArea.actions.resolveCurrentEntity,
		getEntityName: mainArea.actions.getEntityName,
		getEntityNameLower: mainArea.actions.getEntityNameLower,
		timestampToMoment,
		makeHeadingNode,
	})

    const primaryBarLeft = documentRef.createElement('div')
    primaryBarLeft.id = 'primaryBarLeft'
    primaryBarLeft.append(
        sidebar.elements.sidebarToggleButton,
        mainArea.elements.primaryTitleDivider,
        mainArea.elements.characterSection,
        mainArea.elements.primaryTitleSlot,
    )

    return {
        elements: {
            leftSidebar: sidebar.elements.leftSidebar,
            sidebarNavRail: sidebar.elements.sidebarNavRail,
            sidebarContentPanel: sidebar.elements.sidebarContentPanel,
            sidebarHeader: sidebar.elements.sidebarHeader,
            sidebarHeaderTitleSlot: sidebar.elements.sidebarHeaderTitleSlot,
            sidebarHeaderActions: sidebar.elements.sidebarHeaderActions,
            sidebarTitle: sidebar.elements.sidebarTitle,
            sidebarContent: sidebar.elements.sidebarContent,
            sidebarFooter: sidebar.elements.sidebarFooter,
            primaryBarLeft,
            characterSection: mainArea.elements.characterSection,
            characterIdentity: mainArea.elements.characterIdentity,
        },
        nav: {
            navItems: mainArea.navItems,
        },
        actions: {
            initializeSidebarPanels: sidebar.actions.initializeSidebarPanels,
            setActiveSidebarTab: sidebar.actions.setActiveSidebarTab,
            toggleSidebarExpansion: sidebar.actions.toggleSidebarExpansion,
            closeChat: sidebar.actions.closeChat,
            updateCharacterDisplay: mainArea.actions.updateCharacterDisplay,
            resolveCurrentEntity: mainArea.actions.resolveCurrentEntity,
            getEntityName: mainArea.actions.getEntityName,
            getEntityNameLower: mainArea.actions.getEntityNameLower,
            setAiSettingsTabsApi: sidebar.actions.setAiSettingsTabsApi,
            subscribeCharacterDisplay: mainArea.actions.subscribeCharacterDisplay,
        },
        state: {
            getActiveSidebarTab: sidebar.state.getActiveSidebarTab,
            getIsSidebarExpanded: sidebar.state.getIsSidebarExpanded,
            setSidebarExpanded: sidebar.state.setSidebarExpanded,
            setPersistHandler: sidebar.state.setPersistHandler,
            getSidebarTabContent: sidebar.state.getSidebarTabContent,
            MAIN_AREA_DRAWERS: mainArea.state.mainAreaDrawers,
        },
        watchers: {
            personaAvatarWatcher: sidebar.watchers.personaAvatarWatcher,
        },
    }
}
