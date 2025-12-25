import { getNavSectionsWithIcons, NAVIGATION_TAB_IDS } from '../main/navigation/navConfig.js'
import { createSidebarState } from './state/sidebarState.js'
import { power_user } from '../../../../../../../power-user.js'
import { user_avatar } from '../../../../../../../personas.js'
import { bindEntityAvatar, mountQuickSwitch } from './panels/chat/index.js'

const SIDEBAR_TOGGLE_ICON =
    '<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="1.75"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-layout-sidebar"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" /><path d="M9 4l0 16" /></svg>'

export function createSidebarShell({
    document,
    createPersonaAvatarWatcher,
    sidebarNavStore,
    initialActiveTab,
    navItems,
    mainAreaNavigation,
    createMainAreaUpdateContext,
    updateMainForTab,
    getActiveMainAreaTab,
    setActiveMainAreaTab,
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
    resolveCurrentEntity,
    getEntityName,
    getEntityNameLower,
    timestampToMoment,
    makeHeadingNode,
}) {
    const personaAvatarWatcher = createPersonaAvatarWatcher()

    const leftSidebar = document.createElement('aside')
    leftSidebar.id = 'leftSidebar'

    const sidebarContentPanel = document.createElement('section')
    sidebarContentPanel.id = 'sidebarContentPanel'

    const sidebarNavRail = document.createElement('nav')
    sidebarNavRail.id = 'sidebarNavRail'

    const sidebarNavTop = document.createElement('div')
    sidebarNavTop.className = 'sidebar-nav-top'

    const sidebarNavDivider = document.createElement('div')
    sidebarNavDivider.className = 'sidebar-nav-divider'

    const sidebarNavMiddle = document.createElement('div')
    sidebarNavMiddle.className = 'sidebar-nav-middle'

    const sidebarQuickSwitchHost = document.createElement('div')
    sidebarQuickSwitchHost.className = 'sidebar-nav-quick-switch'
    sidebarNavMiddle.appendChild(sidebarQuickSwitchHost)

    const sidebarNavBottom = document.createElement('div')
    sidebarNavBottom.className = 'sidebar-nav-bottom'

    sidebarNavRail.append(
        sidebarNavTop,
        sidebarNavDivider,
        sidebarNavMiddle,
        sidebarNavBottom,
    )

    const sidebarHeader = document.createElement('header')
    sidebarHeader.id = 'sidebarHeader'
    const sidebarHeaderTitleSlot = document.createElement('div')
    sidebarHeaderTitleSlot.className = 'sidebar-header-title-slot'
    const sidebarHeaderActions = document.createElement('div')
    sidebarHeaderActions.className = 'sidebar-header-actions'
    sidebarHeader.dataset.activeTab = 'chat'
    sidebarHeaderTitleSlot.dataset.activeTab = 'chat'

    const sidebarTitle = document.createElement('h2')
    sidebarTitle.id = 'sidebarTitle'

    const sidebarContent = document.createElement('div')
    sidebarContent.id = 'sidebarContent'

    const sidebarFooter = document.createElement('footer')
    sidebarFooter.id = 'sidebarFooter'

    const sidebarFooterBar = document.createElement('div')
    sidebarFooterBar.className = 'sidebar-footer-bar'

    const sidebarFooterCover = document.createElement('div')
    sidebarFooterCover.className = 'sidebar-footer-bar__cover'

    const sidebarFooterOverlay = document.createElement('div')
    sidebarFooterOverlay.className = 'sidebar-footer-bar__overlay'

    const personaButton = document.createElement('button')
    personaButton.type = 'button'
    personaButton.className = 'sidebar-footer-bar__personaButton'
    personaButton.title = 'Open Persona Management'

    const personaAvatar = document.createElement('span')
    personaAvatar.className = 'sidebar-footer-bar__avatar'
    const footerPersonaAvatarImage = document.createElement('img')
    footerPersonaAvatarImage.className = 'sidebar-footer-bar__avatarImage'
    footerPersonaAvatarImage.alt = 'Persona Avatar'
    footerPersonaAvatarImage.loading = 'lazy'
    footerPersonaAvatarImage.decoding = 'async'
    footerPersonaAvatarImage.draggable = false
    footerPersonaAvatarImage.src = '/img/ai4.png'
    personaAvatar.appendChild(footerPersonaAvatarImage)

    const personaIdentity = document.createElement('div')
    personaIdentity.className = 'sidebar-footer-bar__identity'
    const personaName = document.createElement('span')
    personaName.className = 'sidebar-footer-bar__name'
    personaName.textContent = 'Persona'
    const personaAlias = document.createElement('span')
    personaAlias.className = 'sidebar-footer-bar__alias'
    personaAlias.dataset.empty = 'true'
    personaIdentity.append(personaName, personaAlias)

    personaButton.append(personaAvatar, personaIdentity)

    const footerActions = document.createElement('div')
    footerActions.className = 'sidebar-footer-bar__actions'

    sidebarFooterOverlay.append(personaButton, footerActions)
    sidebarFooterBar.append(sidebarFooterCover, sidebarFooterOverlay)
    sidebarFooter.appendChild(sidebarFooterBar)

    const sidebarToggleButton = document.createElement('button')
    sidebarToggleButton.id = 'sidebarToggleButton'
    sidebarToggleButton.className = 'icon-button sidebar-toggle-button'
    sidebarToggleButton.title = 'Toggle Sidebar'
    sidebarToggleButton.innerHTML = SIDEBAR_TOGGLE_ICON
    // Click handler attached after sidebar state is created.

    const personaNavConfig = navItems ?? getNavSectionsWithIcons()
    const sidebarNavConfig = {
        top: personaNavConfig.top.filter(item => item.sidebar?.includeInNavRail !== false),
        middle: personaNavConfig.middle.filter(item => item.sidebar?.includeInNavRail !== false),
        bottom: personaNavConfig.bottom.filter(item => item.sidebar?.includeInNavRail !== false),
    }

    sidebarNavStore?.setSections(sidebarNavConfig)

    const allNavItems = [
        ...personaNavConfig.top,
        ...personaNavConfig.middle,
        ...personaNavConfig.bottom,
    ]

    function closeChat() {
        document.getElementById('option_close_chat')?.click()
    }

    sidebarHeaderTitleSlot.append(sidebarTitle)
    sidebarHeader.append(sidebarHeaderTitleSlot, sidebarHeaderActions)
    sidebarContentPanel.append(sidebarHeader, sidebarContent, sidebarFooter)

    leftSidebar.append(sidebarNavRail, sidebarContentPanel)

    const sidebarTabContent = {}
    let aiSettingsTabsApi = null
    let userSettingsTabsApi = null
    let charManagementTabsApi = null
    let personaManagementTabsApi = null

    function initializeSidebarPanels() {
        allNavItems.forEach(item => {
            const contentWrapper = document.createElement('div')
            contentWrapper.className = 'sidebar-tab-content'
            contentWrapper.dataset.tabId = item.id
            contentWrapper.style.display = 'none'
            contentWrapper.style.flexDirection = 'column'

            switch (item.id) {
                case 'ai-settings':
                    break
                case 'user-settings': {
                    const { tabsApi } = renderUserSettings(contentWrapper, {
                        createSecondaryTabs,
                        sidebarHeader: sidebarHeaderTitleSlot,
                        sidebarHeaderTitleSlot,
                        portDrawerInto,
                    })
                    userSettingsTabsApi = tabsApi
                    break
                }
                case 'character-management': {
                    const { tabsApi } = renderCharacterManagement(contentWrapper, {
                        createSecondaryTabs,
                        sidebarHeader: sidebarHeaderTitleSlot,
                        sidebarHeaderTitleSlot,
                        portDrawerInto,
                    })
                    charManagementTabsApi = tabsApi
                    break
                }
                case 'persona-management': {
                    const { tabsApi } = renderPersonaManagement(contentWrapper, {
                        createSecondaryTabs,
                        sidebarHeader: sidebarHeaderTitleSlot,
                        sidebarHeaderTitleSlot,
                        portDrawerInto,
                    })
                    personaManagementTabsApi = tabsApi
                    break
                }
                case 'chat': {
                    renderChat(contentWrapper, {
                        getContext,
                        eventSource,
                        event_types: eventTypes,
                        getPastCharacterChats,
                        getGroupPastChats,
                        getCurrentChatId,
                        openGroupChat,
                        openCharacterChat,
                        openGroupById,
                        portDrawerInto,
                        enforceDrawerAlwaysOpen,
                        resolveCurrentEntity,
                        getEntityName,
                        getEntityNameLower,
                        toMoment: timestampToMoment,
                        sidebarHeader,
                        sidebarHeaderTitleSlot,
                        sidebarHeaderActions,
                        sidebarTitle,
                        makeHeadingNode,
                    })
                    break
                }
                case 'home': {
                    renderHomePanel?.(contentWrapper, {
                        sidebarHeader: sidebarHeaderTitleSlot,
                        sidebarHeaderTitleSlot,
                        sidebarTitle,
                        getContext,
                        eventSource,
                        eventTypes,
                        makeHeadingNode,
                        mainAreaNavigation,
                    })
                    break
                }
                case 'world-info':
                case 'extensions': {
                    // Managed navigation panels intentionally left empty.
                    break
                }
                default: {
                    contentWrapper.innerHTML = `<div class="panel-subtitle" style="padding: 1rem;">\n                    Content for ${item.title || 'Menu'} is not yet implemented.\n                </div>`
                }
            }

            sidebarTabContent[item.id] = contentWrapper
            sidebarContent.appendChild(contentWrapper)
        })
    }

    async function switchActiveSidebarContent(tabId, { skipMainAreaUpdate = false } = {}) {
        sidebarHeader.dataset.activeTab = tabId
        sidebarHeaderTitleSlot.dataset.activeTab = tabId
        sidebarHeaderActions.replaceChildren()

        const isAiSettings = tabId === 'ai-settings'
        const isUserSettings = tabId === 'user-settings'
        const isCharManagement = tabId === 'character-management'
        const isPersonaManagement = tabId === 'persona-management'

        document.body.classList.toggle('ai-settings-active', isAiSettings)

        if (isAiSettings && aiSettingsTabsApi) {
            aiSettingsTabsApi.updateCurrentHeading()
        } else if (isUserSettings && userSettingsTabsApi) {
            userSettingsTabsApi.updateCurrentHeading()
        } else if (isCharManagement && charManagementTabsApi) {
            charManagementTabsApi.updateCurrentHeading()
        } else if (isPersonaManagement && personaManagementTabsApi) {
            personaManagementTabsApi.updateCurrentHeading()
        } else if (tabId !== 'chat') {
            const activeItem = allNavItems.find(item => item.id === tabId)
            sidebarTitle.textContent = activeItem ? activeItem.title : 'Menu'
            const headingNode = sidebarTitle
            sidebarHeaderTitleSlot.replaceChildren(headingNode)
        }

        Object.values(sidebarTabContent).forEach(panel => {
            panel.style.display = 'none'
        })

        if (sidebarTabContent[tabId]) {
            sidebarTabContent[tabId].style.display = 'flex'
            sidebarTabContent[tabId].style.flexDirection = 'column'
        }

        switch (tabId) {
            case 'user-settings': {
                const container = sidebarTabContent['user-settings']
                if (!container.querySelector('#user-settings-block')) {
                    const newContainer = container.querySelector('[data-tab-id="st-user-settings"]')
                    if (newContainer) portDrawerInto('user-settings-block', newContainer)
                }
                break
            }
            default:
                break
        }

        if (!skipMainAreaUpdate) {
            await updateMainForTab(tabId, false, createMainAreaUpdateContext())
        }
    }

    const sidebarState = createSidebarState({
        document,
        navStore: sidebarNavStore,
        switchActiveSidebarContent,
        mainAreaNavigation,
        updateMainForTab,
        createMainAreaUpdateContext,
        getActiveMainAreaTab,
        setActiveMainAreaTab,
        initialActiveTab,
    })

    sidebarToggleButton.addEventListener('click', () => {
        if (document.body.classList.contains('astra-mobile-layout')) return
        sidebarState.toggleSidebarFullyCollapsed()
    })

    /** @type {Map<string, HTMLButtonElement>} */
    const navButtons = new Map()
    /** @type {Map<string, { update?: () => void, dispose?: () => void }>} */
    const navAvatarBindings = new Map()
    let navPersonaAvatarImage = null
    let lastSectionsSignature = ''

    function sectionsSignature(sections) {
        if (!sections) return ''
        return JSON.stringify({
            top: Array.isArray(sections.top) ? sections.top.map(item => item.id) : [],
            middle: Array.isArray(sections.middle) ? sections.middle.map(item => item.id) : [],
            bottom: Array.isArray(sections.bottom) ? sections.bottom.map(item => item.id) : [],
        })
    }

    function handleNavSelect(item, options) {
        if (!item || typeof item.id !== 'string') return
        void sidebarState.setActiveSidebarTab(item.id, options)
    }

    function createNavButton(item) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'sidebar-nav-button'
        button.title = item.title || ''
        button.dataset.tabId = item.id
        button.setAttribute('aria-pressed', 'false')

        if (item.id === 'chat') {
            const avatarImg = document.createElement('img')
            avatarImg.className = 'sidebar-nav-chat-avatar'
            avatarImg.alt = 'Current chat avatar'
            avatarImg.referrerPolicy = 'no-referrer'
            avatarImg.loading = 'lazy'
            avatarImg.decoding = 'async'
            avatarImg.draggable = false
            button.append(avatarImg)
            const avatarBinding = bindEntityAvatar?.(avatarImg, () => getContext?.() ?? {})
            if (avatarBinding) {
                navAvatarBindings.set('chat', avatarBinding)
            }
        } else if (typeof item.iconMarkup === 'string' && item.iconMarkup.length > 0) {
            const iconWrapper = document.createElement('span')
            iconWrapper.className = 'nav-icon-fallback'
            iconWrapper.innerHTML = item.iconMarkup
            button.append(iconWrapper)
        }

        button.addEventListener('click', () => handleNavSelect(item))
        return button
    }

    function cleanupNavAvatarBindings() {
        navAvatarBindings.forEach(binding => {
            binding?.dispose?.()
        })
        navAvatarBindings.clear()
    }

    function renderNavSections(sections) {
        const safeSections = sections ?? { top: [], middle: [], bottom: [] }

        if (navPersonaAvatarImage && typeof personaAvatarWatcher?.removeTarget === 'function') {
            personaAvatarWatcher.removeTarget(navPersonaAvatarImage)
        }

        cleanupNavAvatarBindings()
        navPersonaAvatarImage = null
        navButtons.clear()

        sidebarNavTop.replaceChildren()
        sidebarNavMiddle.replaceChildren()
        sidebarNavBottom.replaceChildren()
        if (sidebarQuickSwitchHost) sidebarNavMiddle.appendChild(sidebarQuickSwitchHost)

        const appendSection = (container, items) => {
            const shouldAttach = container !== sidebarNavMiddle // middle rail stays empty but we still track its tabs
            items.forEach(item => {
                if (!item?.id) return
                const button = createNavButton(item)
                navButtons.set(item.id, button)
                if (!shouldAttach) return
                container.append(button)

                if (item.id === 'persona-management') {
                    const avatar = button.querySelector('#personaManagementNavAvatar')
                    if (avatar instanceof HTMLImageElement) {
                        navPersonaAvatarImage = avatar
                    }
                }
            })
        }

        appendSection(sidebarNavTop, Array.isArray(safeSections.top) ? safeSections.top : [])
        appendSection(sidebarNavMiddle, Array.isArray(safeSections.middle) ? safeSections.middle : [])
        appendSection(sidebarNavBottom, Array.isArray(safeSections.bottom) ? safeSections.bottom : [])

        if (navPersonaAvatarImage && typeof personaAvatarWatcher?.addTarget === 'function') {
            personaAvatarWatcher.addTarget(navPersonaAvatarImage)
        }

        lastSectionsSignature = sectionsSignature(safeSections)
    }

    function updateActiveTab(activeTab) {
        navButtons.forEach((button, tabId) => {
            const isActive = tabId === activeTab
            button.classList.toggle('active', isActive)
            button.setAttribute('aria-pressed', String(isActive))
        })
    }

    function syncFromStore() {
        if (!sidebarNavStore || typeof sidebarNavStore.getSnapshot !== 'function') return
        const snapshot = sidebarNavStore.getSnapshot()
        if (!snapshot) return

        const signature = sectionsSignature(snapshot.sections)
        if (signature !== lastSectionsSignature) {
            renderNavSections(snapshot.sections)
        }

        const hasActiveTab = navButtons.has(snapshot.activeTab)
        const safeActiveTab = hasActiveTab ? snapshot.activeTab : 'chat'

        if (!hasActiveTab && sidebarState) {
            void sidebarState.setActiveSidebarTab(safeActiveTab, true)
            return
        }

        updateActiveTab(safeActiveTab)
    }

    if (sidebarNavStore && typeof sidebarNavStore.subscribe === 'function') {
        sidebarNavStore.subscribe(syncFromStore)
        syncFromStore()
    } else {
        renderNavSections(sidebarNavConfig)
        updateActiveTab('chat')
    }

    const quickSwitch = mountQuickSwitch({
        container: sidebarQuickSwitchHost,
        openGroupById,
    })

    quickSwitch?.setAfterNavigate(() => {
        void sidebarState.setActiveSidebarTab('chat', {
            preventToggle: true,
            skipMainAreaUpdate: true,
        })
    })

    const refreshQuickSwitch = () => {
        quickSwitch?.refresh?.()
    }

    const refreshChatNavAvatar = () => {
        navAvatarBindings.get('chat')?.update?.()
    }

    const handleChatContextChanged = () => {
        refreshQuickSwitch()
        refreshChatNavAvatar()
    }

    ;[
        eventTypes?.CHAT_CHANGED,
        eventTypes?.GROUP_UPDATED,
        eventTypes?.CHARACTER_EDITED,
    ].forEach(eventName => {
        if (!eventName || typeof eventSource?.on !== 'function') return
        eventSource.on(eventName, handleChatContextChanged)
    })

    function setAiSettingsTabsApi(api) {
        aiSettingsTabsApi = api || null
    }

    function resolvePersonaIdentity() {
        const personaId = typeof user_avatar === 'string' ? user_avatar : ''
        const nameRaw = power_user?.personas?.[personaId]
        const name = typeof nameRaw === 'string' && nameRaw.trim().length > 0 ? nameRaw.trim() : '[Unnamed Persona]'
        const aliasRaw = power_user?.persona_descriptions?.[personaId]?.title
        const alias = typeof aliasRaw === 'string' ? aliasRaw.trim() : ''
        return { name, alias, personaId }
    }

    function syncPersonaIdentity() {
        const { name, alias } = resolvePersonaIdentity()
        personaName.textContent = name
        personaAlias.textContent = alias
        personaAlias.dataset.empty = alias ? 'false' : 'true'
    }

    function getActiveTopNavTab() {
        const activeMain = typeof getActiveMainAreaTab === 'function'
            ? getActiveMainAreaTab()
            : 'chat'
        return NAVIGATION_TAB_IDS.includes(activeMain) ? activeMain : 'chat'
    }

    function createFooterActionButton(tabId, options) {
        const navItem = allNavItems.find(item => item.id === tabId)
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'sidebar-footer-bar__actionButton astra-home-card__heroMenuButton'
        button.title = navItem?.title || 'Open'
        button.dataset.tabId = tabId

        if (typeof navItem?.iconMarkup === 'string' && navItem.iconMarkup.length > 0) {
            const iconWrapper = document.createElement('span')
            iconWrapper.className = 'sidebar-footer-bar__actionIcon'
            iconWrapper.innerHTML = navItem.iconMarkup
            button.appendChild(iconWrapper)
        }

        button.addEventListener('click', () => {
            const activeSidebarTab = sidebarState.getActiveSidebarTab?.()
            const isSameTab = activeSidebarTab === tabId
            if (isSameTab) {
                const topNavTab = getActiveTopNavTab()
                void sidebarState.setActiveSidebarTab(topNavTab, {
                    preventToggle: true,
                    skipMainAreaUpdate: true,
                })
                return
            }

            handleNavSelect(navItem || { id: tabId }, options)
        })
        return button
    }

    const footerNavOptions = { preventToggle: true, skipMainAreaUpdate: true }
    const personaNavItem = allNavItems.find(item => item.id === 'persona-management') || { id: 'persona-management' }
    personaButton.addEventListener('click', () => {
        const activeSidebarTab = sidebarState.getActiveSidebarTab?.()
        const isSameTab = activeSidebarTab === 'persona-management'
        if (isSameTab) {
            const topNavTab = getActiveTopNavTab()
            void sidebarState.setActiveSidebarTab(topNavTab, {
                preventToggle: true,
                skipMainAreaUpdate: true,
            })
            return
        }

        handleNavSelect(personaNavItem, footerNavOptions)
    })

    const characterManagementButton = createFooterActionButton('character-management', footerNavOptions)
    const aiSettingsButton = createFooterActionButton('ai-settings', footerNavOptions)
    const userSettingsButton = createFooterActionButton('user-settings', footerNavOptions)
    footerActions.append(characterManagementButton, aiSettingsButton, userSettingsButton)

    if (footerPersonaAvatarImage && typeof personaAvatarWatcher?.addTarget === 'function') {
        personaAvatarWatcher.addTarget(footerPersonaAvatarImage)
    }

    syncPersonaIdentity()

    const personaIdentityEvents = [
        eventTypes?.APP_READY,
        eventTypes?.SETTINGS_UPDATED,
        eventTypes?.CHAT_CHANGED,
    ].filter(Boolean)

    personaIdentityEvents.forEach(eventName => {
        if (!eventName || typeof eventSource?.on !== 'function') return
        eventSource.on(eventName, () => {
            syncPersonaIdentity()
        })
    })

    return {
        elements: {
            leftSidebar,
            sidebarNavRail,
            sidebarContentPanel,
            sidebarHeader,
            sidebarHeaderTitleSlot,
            sidebarHeaderActions,
            sidebarTitle,
            sidebarContent,
            sidebarFooter,
            sidebarToggleButton,
        },
        nav: {
            navItems: personaNavConfig,
            sidebarNavConfig,
        },
        actions: {
            initializeSidebarPanels,
            setAiSettingsTabsApi,
            setActiveSidebarTab: sidebarState.setActiveSidebarTab,
            toggleSidebarExpansion: sidebarState.toggleSidebarExpansion,
            toggleSidebarFullyCollapsed: sidebarState.toggleSidebarFullyCollapsed,
            closeChat,
        },
        state: {
            setSidebarExpanded: sidebarState.setSidebarExpanded,
            setSidebarFullyCollapsed: sidebarState.setSidebarFullyCollapsed,
            setPersistHandler: sidebarState.setPersistHandler,
            getActiveSidebarTab: sidebarState.getActiveSidebarTab,
            getIsSidebarExpanded: sidebarState.getIsSidebarExpanded,
            getIsSidebarFullyCollapsed: sidebarState.getIsSidebarFullyCollapsed,
            getSidebarTabContent: () => sidebarTabContent,
        },
        watchers: {
            personaAvatarWatcher,
        },
    }
}
