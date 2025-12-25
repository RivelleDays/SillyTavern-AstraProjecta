import { MAIN_AREA_DRAWERS, NAVIGATION_TAB_IDS, getNavSectionsWithIcons } from '../navigation/navConfig.js'
import { createMainHeaderShell } from './headerShell.js'
import { createEntityContext } from './state/entityContext.js'
import { getDefaultAvatar } from './services/avatarUtils.js'
import { createPrimaryHeadingNode, applyPrimaryHeadingToSlot } from './services/primaryHeading.js'
import {
	getHomeRoute,
	initializeHomeRoute,
	setHomeRouteToBrowser,
	setHomeRoutePersistHandler,
	subscribeHomeRouteStore,
} from './views/home/state/homeRouteStore.js'
import { applyHomeRouteHeading } from './views/home/homeHeading.js'

	export function createMainAreaModule({
		document,
		updateMainForTab,
		ensurePrimaryTitleSlot,
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
		setWorkspaceMode,
		getRequestHeaders,
		getThumbnailUrl,
		timestampToMoment,
		initialActiveMainTab,
		globalStateStore,
	}) {
	const navDefinitions = navItems ?? getNavSectionsWithIcons()

	const initialHomeRoute = globalStateStore?.getState?.()?.homeRoute
	if (initialHomeRoute) {
		initializeHomeRoute(initialHomeRoute)
	}

	setHomeRoutePersistHandler(route => {
		if (!globalStateStore?.setState) return
		globalStateStore.setState({ homeRoute: route })
	})

	const headerShell = createMainHeaderShell({ document })
	const {
		characterSection,
		characterIdentity,
		characterAvatar,
		characterNameLabel,
		groupMemberCount,
		chatFileName,
		chatFileNameLabel,
		primaryTitleSlot,
		primaryTitleDivider,
	} = headerShell

    const entityContext = createEntityContext({ getContext, getGroups, getSelectedGroup })

	const initialActiveTab = NAVIGATION_TAB_IDS.includes(initialActiveMainTab)
		? initialActiveMainTab
		: 'chat'

	let activeMainAreaTab = initialActiveTab
    const characterDisplaySubscribers = new Set()
    let latestCharacterDisplayState = null

    const flattenSection = section => (Array.isArray(section) ? section : [])
    const flattenNavItems = items => [
        ...flattenSection(items?.top),
        ...flattenSection(items?.middle),
        ...flattenSection(items?.bottom),
    ]

	const resolveNavMeta = tabId => flattenNavItems(navDefinitions).find(item => item.id === tabId) ?? null

	function applyHomeHeadingFromRoute(routeOverride) {
		const route = routeOverride || getHomeRoute()
		applyHomeRouteHeading({
			route,
			titleSlot: primaryTitleSlot,
			divider: primaryTitleDivider,
			documentRef: document,
			onHomeClick: () => {
				setHomeRouteToBrowser()
			},
		})
	}

	function updatePrimaryHeading(tabId) {
        if (!primaryTitleSlot) return
		const navMeta = resolveNavMeta(tabId)
		if (!navMeta || navMeta?.id === 'chat') {
			applyPrimaryHeadingToSlot(primaryTitleSlot, null, undefined, { divider: primaryTitleDivider })
			return
		}

		if (navMeta?.id === 'home') {
			applyHomeHeadingFromRoute()
			return
		}

		const headingLabel = navMeta?.main?.headingLabel || navMeta?.title || tabId
		const headingNode = createPrimaryHeadingNode({
			document,
			navId: navMeta?.id,
			label: headingLabel,
			iconMarkup: navMeta?.iconMarkup || '',
		})
		applyPrimaryHeadingToSlot(primaryTitleSlot, headingNode, navMeta?.id, { divider: primaryTitleDivider })
	}

    let cachedContentColumn = null
    const getContentColumn = () => {
        if (cachedContentColumn && cachedContentColumn.isConnected) return cachedContentColumn
        cachedContentColumn = document?.getElementById('contentColumn') ?? null
        return cachedContentColumn
    }

    const updateContentColumnMarker = tabId => {
        const column = getContentColumn()
        if (!column) return
        if (tabId) {
            column.setAttribute('data-active-main', tabId)
        } else {
            column.removeAttribute('data-active-main')
        }
    }

    function notifyCharacterDisplaySubscribers() {
        if (!latestCharacterDisplayState) return
        characterDisplaySubscribers.forEach(handler => {
            try {
                handler({ ...latestCharacterDisplayState })
            } catch (error) {
                console?.error?.('[AstraProjecta] Failed to notify character display subscriber.', error)
            }
        })
    }

    function subscribeCharacterDisplay(handler) {
        if (typeof handler !== 'function') return () => {}
        characterDisplaySubscribers.add(handler)
        if (latestCharacterDisplayState) {
            try {
                handler({ ...latestCharacterDisplayState })
            } catch (error) {
                console?.error?.('[AstraProjecta] Failed to prime character display subscriber.', error)
            }
        }
        return () => {
            characterDisplaySubscribers.delete(handler)
        }
    }

	function setActiveMainAreaTab(tabId) {
		activeMainAreaTab = tabId
		updatePrimaryHeading(tabId)
		updateContentColumnMarker(tabId)
		if (NAVIGATION_TAB_IDS.includes(tabId) && globalStateStore?.setState) {
			globalStateStore.setState({ lastVisitedTab: tabId })
		}
	}

	const workspaceModeHandler = typeof setWorkspaceMode === 'function' ? setWorkspaceMode : () => {}

	function createMainAreaUpdateContext() {
		return {
			ensurePrimaryTitleSlot,
			waitUntilCondition,
			portDrawerInto,
			enforceDrawerAlwaysOpen,
			MAIN_AREA_DRAWERS,
			navItems: navDefinitions,
			mainContentWrapper,
			characterSection,
			sheld,
			setWorkspaceMode: workspaceModeHandler,
			primaryTitleDivider,
			getContext,
			eventSource,
			eventTypes,
			getRequestHeaders,
			getThumbnailUrl,
			timestampToMoment,
		}
	}

    const mainAreaNavigation = createMainAreaNavigation({
        updateMainForTab,
        getMainAreaUpdateContext: createMainAreaUpdateContext,
        onActiveTabChange: setActiveMainAreaTab,
    })

	updateContentColumnMarker(activeMainAreaTab)

	updatePrimaryHeading(activeMainAreaTab)

	subscribeHomeRouteStore(route => {
		if (activeMainAreaTab !== 'home') return
		applyHomeHeadingFromRoute(route)
	})

    if (eventSource?.on && eventTypes?.CHAT_CHANGED) {
        const handleChatChanged = () => {
            if (activeMainAreaTab !== 'chat') return
            if (typeof mainAreaNavigation?.activate !== 'function') return
            void mainAreaNavigation.activate('chat')
        }
        eventSource.on(eventTypes.CHAT_CHANGED, handleChatChanged)
    }

    let avatarRequestId = 0

    async function applyAvatar(entity, isGroup) {
        const fallback = getDefaultAvatar()
        const requestId = ++avatarRequestId

        characterAvatar.onerror = () => {
            characterAvatar.onerror = null
            characterAvatar.src = fallback
        }

        let source = fallback
        try {
            if (entity) {
                const { primary } = await entityContext.getEntityAvatarSources(entity, isGroup)
                source = primary || fallback
            }
        } catch {
            source = fallback
        }

        if (requestId !== avatarRequestId) return
        characterAvatar.src = source
    }

    async function updateCharacterDisplay() {
        const { entity, isGroup } = entityContext.resolveCurrentEntity()
        await applyAvatar(entity, isGroup)

        const name = entityContext.getEntityName(entity)
        characterNameLabel.textContent = name
        characterNameLabel.title = name

        let memberCount = 0
        if (isGroup) {
            memberCount = entityContext.getGroupMemberCount(entity) || 0
            groupMemberCount.textContent = String(memberCount)
            groupMemberCount.style.display = memberCount > 0 ? 'inline-flex' : 'none'
            groupMemberCount.setAttribute('aria-label', 'Group members')
        } else {
            groupMemberCount.textContent = ''
            groupMemberCount.style.display = 'none'
        }

        const currentChatName = getCurrentChatId()
        if (currentChatName) {
            chatFileNameLabel.textContent = currentChatName
            chatFileName.title = currentChatName
            chatFileName.style.display = 'flex'
        } else {
            chatFileNameLabel.textContent = ''
            chatFileName.removeAttribute('title')
            chatFileName.style.display = 'none'
        }

        const isInChat = !!currentChatName
        document.querySelectorAll('.requires-chat').forEach(element => {
            element.classList.toggle('disabled', !isInChat)
        })

        latestCharacterDisplayState = {
            entity,
            isGroup,
            name,
            nameTitle: name,
            groupMemberCount: memberCount,
            hasGroupMembers: isGroup && memberCount > 0,
            chatFileName: currentChatName ?? '',
            hasChat: isInChat,
            chatFileNameTitle: chatFileName.title || '',
            avatarSrc: characterAvatar.src,
        }

        notifyCharacterDisplaySubscribers()
    }

	return {
		elements: {
			primaryTitleSlot,
			primaryTitleDivider,
			characterSection,
            characterIdentity,
            characterAvatar,
            characterNameLabel,
            groupMemberCount,
            chatFileName,
            chatFileNameLabel,
        },
        navigation: mainAreaNavigation,
        navItems: navDefinitions,
        actions: {
            updateCharacterDisplay,
            resolveCurrentEntity: entityContext.resolveCurrentEntity,
            getEntityName: entityContext.getEntityName,
            getEntityNameLower: entityContext.getEntityNameLower,
            subscribeCharacterDisplay,
        },
        state: {
            getActiveMainAreaTab: () => activeMainAreaTab,
            setActiveMainAreaTab,
            createMainAreaUpdateContext,
            mainAreaDrawers: MAIN_AREA_DRAWERS,
        },
    }
}

export function createMainAreaNavigation({
    updateMainForTab,
    getMainAreaUpdateContext,
    onActiveTabChange = () => {},
}) {
    const navigationTabs = new Set(NAVIGATION_TAB_IDS)

    function isNavigationTab(tabId) {
        return navigationTabs.has(tabId)
    }

    async function activate(tabId) {
        switch (tabId) {
            case 'home': {
                await updateMainForTab('home', false, getMainAreaUpdateContext())
                onActiveTabChange('home')
                return true
            }
            case 'chat': {
                await updateMainForTab('chat', true, getMainAreaUpdateContext())
                onActiveTabChange('chat')
                return true
            }
            case 'world-info':
            case 'extensions': {
                await updateMainForTab(tabId, false, getMainAreaUpdateContext())
                onActiveTabChange(tabId)
                return true
            }
            default:
                return false
        }
    }

    return {
        activate,
        isNavigationTab,
    }
}
