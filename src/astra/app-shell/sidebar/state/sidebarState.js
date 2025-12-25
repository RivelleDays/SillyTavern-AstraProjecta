const PSEUDO_TABS = new Set()
const SIDEBAR_CONTENT_DISABLED_TABS = new Set(['world-info', 'extensions'])
const MOBILE_LAYOUT_CLASS = 'astra-mobile-layout'

export function createSidebarState({
    document,
    navStore,
    switchActiveSidebarContent,
    mainAreaNavigation,
    updateMainForTab,
    createMainAreaUpdateContext,
    getActiveMainAreaTab,
    setActiveMainAreaTab,
    initialActiveTab,
}) {
    const body = document?.body ?? globalThis.document?.body ?? null
    const bodyClassList = body?.classList ?? null
    const isMobileLayout = () => bodyClassList?.contains(MOBILE_LAYOUT_CLASS) ?? false

    let isSidebarFullyCollapsed = bodyClassList?.contains('sidebar-fully-collapsed') ?? false
    let isSidebarExpanded =
        bodyClassList?.contains('sidebar-expanded') ?? !(isSidebarFullyCollapsed ?? false)

	const initialTab = typeof initialActiveTab === 'string' ? initialActiveTab : 'chat'
	let activeSidebarTab = initialTab
    let persistHandler = () => {}

    function normalizeOptions(options) {
        if (typeof options === 'boolean') {
            return { fromRestore: options, preventToggle: false, skipMainAreaUpdate: false }
        }
        const safeOptions = options && typeof options === 'object' ? options : {}
        return {
            fromRestore: !!safeOptions.fromRestore,
            preventToggle: !!safeOptions.preventToggle,
            skipMainAreaUpdate: !!safeOptions.skipMainAreaUpdate,
        }
    }

    function persistState() {
        persistHandler?.()
    }

    function setPersistHandler(handler) {
        persistHandler = typeof handler === 'function' ? handler : () => {}
    }

    function setSidebarExpanded(value, { skipPersist = false } = {}) {
        const desired = !!value
        if (isMobileLayout()) {
            isSidebarExpanded = true
            if (isSidebarFullyCollapsed) {
                isSidebarFullyCollapsed = false
                bodyClassList?.remove('sidebar-fully-collapsed')
            }
            bodyClassList?.add('sidebar-expanded')
            navStore?.setIsExpanded(true)
            if (!skipPersist) persistState()
            return
        }

        isSidebarExpanded = desired
        if (isSidebarExpanded && isSidebarFullyCollapsed) {
            isSidebarFullyCollapsed = false
            bodyClassList?.remove('sidebar-fully-collapsed')
        }
        bodyClassList?.toggle('sidebar-expanded', isSidebarExpanded)
        navStore?.setIsExpanded(isSidebarExpanded)
        if (!skipPersist) persistState()
    }

    function toggleSidebarExpansion(force, options = {}) {
        if (isMobileLayout()) {
            setSidebarExpanded(true, options)
            return
        }
        const desired = typeof force === 'boolean' ? force : !isSidebarExpanded
        setSidebarExpanded(desired, options)
    }

    function setSidebarFullyCollapsed(value, { skipPersist = false } = {}) {
        const desired = !!value
        if (isMobileLayout()) {
            if (isSidebarFullyCollapsed) {
                isSidebarFullyCollapsed = false
                bodyClassList?.remove('sidebar-fully-collapsed')
                navStore?.setIsExpanded(true)
            }
            if (!skipPersist) persistState()
            return
        }

        if (desired === isSidebarFullyCollapsed) {
            if (!skipPersist) persistState()
            return
        }

        if (desired) {
            setSidebarExpanded(false, { skipPersist: true })
        }

        isSidebarFullyCollapsed = desired
        bodyClassList?.toggle('sidebar-fully-collapsed', isSidebarFullyCollapsed)

        if (!desired && !isSidebarExpanded) {
            setSidebarExpanded(true, { skipPersist: true })
        }

        if (!skipPersist) persistState()
    }

    function toggleSidebarFullyCollapsed(force, options = {}) {
        if (isMobileLayout()) {
            setSidebarFullyCollapsed(false, options)
            return
        }
        const desired = typeof force === 'boolean' ? force : !isSidebarFullyCollapsed
        setSidebarFullyCollapsed(desired, options)
    }

    async function activateManagedNavigation(tabId) {
        navStore?.setActiveTab(tabId)
        await mainAreaNavigation.activate(tabId)
    }

    async function activatePseudoTab(tabId) {
        navStore?.setActiveTab(tabId)
        await updateMainForTab(tabId, false, createMainAreaUpdateContext())
        setActiveMainAreaTab(tabId)
    }

    async function setActiveSidebarTab(tabId, options = {}) {
        const {
            fromRestore = false,
            preventToggle = false,
            skipMainAreaUpdate = false,
        } = normalizeOptions(options)
        const desiredTabId = tabId
        const isManagedTab = mainAreaNavigation.isNavigationTab(desiredTabId)
        const shouldSkipSidebarContent = SIDEBAR_CONTENT_DISABLED_TABS.has(desiredTabId)

        if (isManagedTab && desiredTabId !== 'chat') {
            const isSameTab = activeSidebarTab === desiredTabId
            activeSidebarTab = desiredTabId
            navStore?.setActiveTab(desiredTabId)
            if (!fromRestore && !isMobileLayout() && !preventToggle) {
                if (isSameTab) {
                    toggleSidebarExpansion()
                } else {
                    toggleSidebarExpansion(true)
                }
            }
            await activateManagedNavigation(desiredTabId)
            if (!shouldSkipSidebarContent) {
                await switchActiveSidebarContent(desiredTabId, { skipMainAreaUpdate: true })
            }
            return
        }

        if (PSEUDO_TABS.has(desiredTabId)) {
            await activatePseudoTab(desiredTabId)
            return
        }

        const isSameTab = activeSidebarTab === desiredTabId
        const isChatTab = desiredTabId === 'chat'
        const shouldToggle = !fromRestore && isSameTab

        activeSidebarTab = desiredTabId

        navStore?.setActiveTab(desiredTabId)

        if (!fromRestore && !isMobileLayout() && !preventToggle) {
            if (isChatTab) {
                if (shouldToggle && getActiveMainAreaTab() === 'chat') {
                    toggleSidebarExpansion()
                } else {
                    toggleSidebarExpansion(true)
                }
            } else if (shouldToggle) {
                toggleSidebarExpansion()
            } else {
                toggleSidebarExpansion(true)
            }
        }

        await switchActiveSidebarContent(desiredTabId, { skipMainAreaUpdate })

        if (isChatTab && isManagedTab) {
            await mainAreaNavigation.activate('chat')
        }

        persistState()
    }

    function getActiveSidebarTab() {
        return activeSidebarTab
    }

    function getIsSidebarExpanded() {
        return isSidebarExpanded
    }

    function getIsSidebarFullyCollapsed() {
        return isSidebarFullyCollapsed
    }

    navStore?.setActiveTab(activeSidebarTab)
    navStore?.setIsExpanded(isSidebarExpanded)

    return {
        setPersistHandler,
        setSidebarExpanded,
        toggleSidebarExpansion,
        setSidebarFullyCollapsed,
        toggleSidebarFullyCollapsed,
        setActiveSidebarTab,
        getActiveSidebarTab,
        getIsSidebarExpanded,
        getIsSidebarFullyCollapsed,
    }
}
