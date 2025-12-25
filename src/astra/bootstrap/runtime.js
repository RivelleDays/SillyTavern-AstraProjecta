import { debounce_timeout } from '../../../../../../constants.js'
import { getBootstrapContext } from './context.js'
import { createBootstrapStores } from './stores.js'
import { createShell } from './shell/index.js'
import { addJQueryHighlight } from '../lib/jquery-highlight.js'
import { createRightSidebarRuntime } from '../app-shell/main/index.js'
import { attachEventHandlers } from './events.js'
import { SlashCommandParser } from '../../../../../../slash-commands/SlashCommandParser.js'
import { debounce, waitUntilCondition } from '../../../../../../utils.js'
import { CFG } from '../state/cfg.js'
import { DEFAULT_STORAGE_KEY, DEFAULT_VERSION } from '../state/globalStateStore.js'
import { NAVIGATION_TAB_IDS } from '../app-shell/main/navigation/navConfig.js'
import { CHAT_MANAGER_NAVIGATE_EVENT } from '../app-shell/sidebar/panels/chat/index.js'
import { getSortedEntries } from '../../../../../../world-info.js'
import { createMobileChatUiController } from '../mobile/ui/mobileChatHeader.js'
import { getHomeRoute, subscribeHomeRouteStore } from '../app-shell/main/main-area/views/home/state/homeRouteStore.js'
import { createMobileHomeIdentity } from '../mobile/ui/mobileHomeIdentity.js'
import { installCharacterImportDropGuard } from './guards/preventCharacterImportDrop.js'
import { initializeSendFormConnectionProfiles } from '../app-shell/main/chat/send-form/sendFormConnectionProfiles.js'
import { initializeSendFormContextUsage } from '../app-shell/main/chat/send-form/sendFormContextUsage.js'
import { installStreamingAbortGuard } from './patches/installStreamingAbortGuard.js'
import { setHomePrimaryBarHost } from '../app-shell/main/main-area/views/home/homePrimaryBarHost.js'
import { initializeMessageActions } from '../app-shell/main/chat/messageActions/index.js'

export function createBootstrapRuntime() {
	const { context, dom, helpers } = getBootstrapContext()
	if (!helpers.hasContext || !context) {
		helpers.logMissingContext()
		return null
	}

	function primeGlobalStateStore(globalStateStore) {
		if (!globalStateStore) return
		try {
			const raw = localStorage.getItem(DEFAULT_STORAGE_KEY)
			if (!raw) return
			const parsed = JSON.parse(raw)
			const storedState = parsed?.state
			if (!storedState || typeof storedState !== 'object') return
			const { __version, ...rest } = storedState
			if (typeof __version === 'number' && __version !== DEFAULT_VERSION) return
			if (typeof globalStateStore.replaceState === 'function') {
				globalStateStore.replaceState({ ...globalStateStore.getState(), ...rest }, { persist: false, skipEmit: true })
			}
		} catch {
			// Ignore storage failures and continue with defaults.
		}
	}

	installStreamingAbortGuard({
		getContext: helpers.getContext,
	})

	initializeMessageActions({
		getContext: helpers.getContext,
	})

	const stores = createBootstrapStores()
	const {
		sidebarNavStore,
		globalStateStore,
		loreState,
		persistState,
		restorePersistedState,
	} = stores

	primeGlobalStateStore(globalStateStore)

	const resolveInitialMainTab = () => {
		const candidate = globalStateStore?.getState?.()?.lastVisitedTab
		return NAVIGATION_TAB_IDS.includes(candidate) ? candidate : 'chat'
	}

	const initialMainTab = resolveInitialMainTab()

	const shell = createShell({
		context,
		dom,
		helpers,
		sidebarNavStore,
		globalStateStore,
		initialMainTab,
		CFG,
	})

	const {
		elements,
		actions,
		state,
		watchers,
		mobile,
		slots,
		workspaceBridge,
	} = shell

	const rightSidebarRuntime = createRightSidebarRuntime({
		context,
		loreState,
		persistState,
		shellState: {
			setPersistHandler: state.setPersistHandler,
			getSidebarTabContent: state.getSidebarTabContent,
		},
		shellActions: {
			resolveCurrentEntity: actions.resolveCurrentEntity,
			setAiSettingsTabsApi: actions.setAiSettingsTabsApi,
		},
		shellDom: {
			sidebarHeader: elements.sidebarHeader,
			sidebarHeaderTitleSlot: elements.sidebarHeaderTitleSlot,
			sidebarHeaderActions: elements.sidebarHeaderActions,
			characterIdentity: elements.characterIdentity,
		},
		dependencies: {
			SlashCommandParser,
			CFG,
			debounce,
		},
	})

	rightSidebarRuntime.persistHandlers.shell?.(persistState)
	rightSidebarRuntime.persistHandlers.rightSidebar?.(persistState)

	const layoutParts = assembleLayout({
		context,
		dom,
		helpers,
		elements,
		actions,
		state,
		watchers,
		mobile,
		rightSidebarRuntime,
		slots,
		workspaceBridge,
		sidebarNavStore,
	})

	const bootstrapRuntime = createRuntimeObject({
		sidebarNavStore,
		globalStateStore,
		sidebarNavRail: elements.sidebarNavRail,
		actions,
		watchers,
		slots,
	})

	attachEventHandlers({
		context,
		helpers,
		stores: {
			persistState,
			restorePersistedState,
		},
		mobileRuntime: mobile,
		shell: {
			actions,
			state,
			watchers,
		},
		rightSidebar: rightSidebarRuntime,
		dependencies: {
			debounce,
			debounceTimeout: debounce_timeout,
			waitUntilCondition,
			getSortedEntries,
		},
		layout: layoutParts,
	})

	return bootstrapRuntime
}

function assembleLayout({
	context,
	dom,
	helpers,
	elements,
	actions,
	state,
	watchers,
	mobile,
	rightSidebarRuntime,
	slots,
	workspaceBridge,
	sidebarNavStore,
}) {
	const {
		appWrapper,
		contentColumn,
		mainTopBar,
		mainRow,
		mainContentWrapper,
		primaryBar,
		leftSidebar,
		primaryBarLeft,
		primaryBarRight,
	} = elements

	const {
		initializeSidebarPanels,
		setActiveSidebarTab,
		updateCharacterDisplay,
		getEntityNameLower,
		subscribeCharacterDisplay,
	} = actions

	const {
		getActiveSidebarTab,
	} = state

	const {
		personaAvatarWatcher,
	} = watchers

	const {
		syncMainVisibility,
		layout,
	} = mobile

	const {
		initialize: initializeMobileLayout,
		isActive: isMobileLayoutActive,
		attachSidebarInteractions,
		attachTouchGestures,
	} = layout ?? {}

	const { rightSidebar, controllers } = rightSidebarRuntime

	const mobileChatUi = createMobileChatUiController({
		document: globalThis.document,
		primaryBarLeft,
		rightSidebar,
		subscribeCharacterDisplay,
	})
	const mobileHomeIdentity = createMobileHomeIdentity({
		document: globalThis.document,
	})

	const primaryBarRightSlot = slots?.primaryBarRight
	const {
		isMobileDevice,
		mobileMediaQuery,
	} = initializeMobileLayout?.() ?? { isMobileDevice: false, mobileMediaQuery: null }

	const isMobileLayoutInitiallyActive =
		typeof isMobileLayoutActive === 'function' ? !!isMobileLayoutActive() : !!isMobileDevice

	primaryBarRightSlot?.setMobileState?.(isMobileLayoutInitiallyActive)
	if (isMobileLayoutInitiallyActive) mobileChatUi.enterMobileLayout()
	else mobileChatUi.exitMobileLayout()

	const syncMobileChatHeaderState = () => {
		const isMobile = typeof isMobileLayoutActive === 'function' ? !!isMobileLayoutActive() : false
		const activeTab = typeof getActiveSidebarTab === 'function' ? getActiveSidebarTab() : null
		const shouldShowFileName = isMobile && activeTab === 'chat'
		mobileChatUi.setFileNameVisible?.(shouldShowFileName)

		if (isMobile && activeTab === 'home') {
			const route = typeof getHomeRoute === 'function' ? getHomeRoute() : null
			mobileHomeIdentity.update(route)
			mobileHomeIdentity.mount(primaryBarLeft)
		} else {
			mobileHomeIdentity.unmount()
		}
	}

	syncMobileChatHeaderState()

	if (mobileMediaQuery) {
		const handleMobileLayoutChange = event => {
			const isMobileMatch = !!event?.matches
			primaryBarRightSlot?.setMobileState?.(isMobileMatch)
			if (isMobileMatch) mobileChatUi.enterMobileLayout()
			else mobileChatUi.exitMobileLayout()
			syncMobileChatHeaderState()
		}
		if (typeof mobileMediaQuery.addEventListener === 'function') {
			mobileMediaQuery.addEventListener('change', handleMobileLayoutChange)
		} else if (typeof mobileMediaQuery.addListener === 'function') {
			mobileMediaQuery.addListener(handleMobileLayoutChange)
		}
	}

	if (sidebarNavStore && typeof sidebarNavStore.subscribe === 'function') {
		sidebarNavStore.subscribe(syncMobileChatHeaderState)
	}

	if (typeof subscribeHomeRouteStore === 'function') {
		subscribeHomeRouteStore(syncMobileChatHeaderState)
	}

	const HTMLElementCtor = globalThis.HTMLElement ?? null
	const isElement = node => {
		if (!node) return false
		if (HTMLElementCtor) return node instanceof HTMLElementCtor
		const NodeCtor = globalThis.Node ?? null
		return NodeCtor ? node instanceof NodeCtor : false
	}

	const primaryBarViewRegistrations = new Map()
	if (typeof primaryBarRightSlot?.registerView === 'function') {
		const homePrimaryBarHost = document.createElement('div')
		homePrimaryBarHost.id = 'astraHomePrimaryBarActions'
		homePrimaryBarHost.className = 'astra-home-details__primaryBarHost'
		setHomePrimaryBarHost(homePrimaryBarHost)

		const registerWorkspaceView = (mode, nodesFactory) => {
			const registration = primaryBarRightSlot.registerView({
				id: `workspace:${mode}`,
				render: () => {
					const nodes = (nodesFactory?.() ?? []).filter(isElement)
					return { nodes }
				},
			})
			primaryBarViewRegistrations.set(mode, registration)
		}

		registerWorkspaceView('home', () => [homePrimaryBarHost])

		registerWorkspaceView('chat', () => [
			rightSidebar.loreButton,
			rightSidebar.chatInfoButton,
			rightSidebar.backgroundButton,
			rightSidebar.portraitButton,
		])

		const createSecondaryNodes = () => [
			rightSidebar.loreButton,
			rightSidebar.chatInfoButton,
		]

		registerWorkspaceView('world-info', createSecondaryNodes)
		registerWorkspaceView('extensions', createSecondaryNodes)
	}

	const workspaceSnapshots = new Map()
		const defaultWorkspaceSnapshots = new Map([
			['home', { activePanel: null, lastPanel: 'chatInfo', isOpen: false }],
			['chat', { activePanel: null, lastPanel: 'chatInfo', isOpen: false }],
			['world-info', { activePanel: null, lastPanel: 'lore', isOpen: false }],
			['extensions', { activePanel: null, lastPanel: 'chatInfo', isOpen: false }],
		])
	const cloneSidebarSnapshot = snapshot => {
		if (!snapshot || typeof snapshot !== 'object') return null
		return {
			activePanel: typeof snapshot.activePanel === 'string' ? snapshot.activePanel : null,
			lastPanel: typeof snapshot.lastPanel === 'string' ? snapshot.lastPanel : null,
			isOpen: !!snapshot.isOpen,
		}
	}

	const bg1 = document.getElementById('bg1')
	const bg1OriginalParent = bg1?.parentElement ?? null
	const bg1OriginalNextSibling = bg1?.nextSibling ?? null

	const updateBg1Placement = isChatMode => {
		if (!bg1) return
		if (isChatMode) {
			bg1.style.display = ''
			bg1.classList.add('astra-column-background')
			if (contentColumn) {
				contentColumn.prepend(bg1)
			}
			return
		}

		bg1.classList.remove('astra-column-background')
		if (bg1OriginalParent) {
			bg1OriginalParent.insertBefore(bg1, bg1OriginalNextSibling ?? null)
		}
		bg1.style.display = 'none'
	}

	let currentWorkspaceMode = null
	const normalizeWorkspaceMode = value => {
		if (!value) return 'home'
		if (value === 'home' || value === 'chat') return value
		if (value === 'world-info' || value === 'extensions') return value
		return 'chat'
	}

	const setWorkspaceMode = requestedMode => {
		const targetMode = normalizeWorkspaceMode(requestedMode)
		if (currentWorkspaceMode === targetMode) {
			updateBg1Placement(targetMode === 'chat')
			return true
		}

		const registration = primaryBarViewRegistrations.get(targetMode) ?? primaryBarViewRegistrations.get('chat')

		if (currentWorkspaceMode && typeof rightSidebar.getStateSnapshot === 'function') {
			const existingSnapshot = rightSidebar.getStateSnapshot()
			workspaceSnapshots.set(currentWorkspaceMode, cloneSidebarSnapshot(existingSnapshot))
		}

		registration?.activate?.()

		const snapshot = workspaceSnapshots.has(targetMode)
			? cloneSidebarSnapshot(workspaceSnapshots.get(targetMode))
			: null
		const fallback = defaultWorkspaceSnapshots.has(targetMode)
			? cloneSidebarSnapshot(defaultWorkspaceSnapshots.get(targetMode))
			: null
		if (typeof rightSidebar.restoreStateSnapshot === 'function') {
			rightSidebar.restoreStateSnapshot(snapshot ?? fallback)
		}

			currentWorkspaceMode = targetMode
			updateBg1Placement(targetMode === 'chat')
			if (targetMode === 'home') {
				rightSidebar.closeRightSidebar?.()
			}
			return true
		}

	if (workspaceBridge && typeof workspaceBridge === 'object') {
		workspaceBridge.setMode = setWorkspaceMode
	}

	setWorkspaceMode('home')

	addJQueryHighlight()

	if (dom.sheld) {
		const computedStyle = getComputedStyle(dom.sheld)
		if (computedStyle.display === 'grid') dom.sheld.classList.add('flexPatch')
	}

	appWrapper.id = 'appWrapper'
	contentColumn.id = 'contentColumn'
	mainRow.id = 'mainRow'
	rightSidebar.rightSidebar.id = 'rightSidebar'
	rightSidebar.rightSidebarContent.id = 'rightSidebarContent'
	mainContentWrapper.id = 'mainContentWrapper'
	mainTopBar.id = 'mainTopBar'
	primaryBar.id = 'primaryTopBar'

	const primaryBarRightElement = primaryBarRight ?? document.createElement('div')
	if (!primaryBarRightElement.id) {
		primaryBarRightElement.id = 'primaryBarRight'
	}
	primaryBar.append(primaryBarLeft, primaryBarRightElement)
	mainTopBar.append(primaryBar)

	if (elements.characterIdentity && typeof rightSidebar.registerEntityInfoTrigger === 'function') {
		rightSidebar.registerEntityInfoTrigger(elements.characterIdentity)
	}

	const topBar = document.getElementById('top-bar')
	const topSettingsHolder = document.getElementById('top-settings-holder')
	const movingDivs = document.getElementById('movingDivs')

	;[
		topBar,
		topSettingsHolder,
		movingDivs,
		dom.sheld,
	].forEach(node => {
		if (node) mainContentWrapper.append(node)
	})

	controllers.lore.initializeLoreUI()

	rightSidebar.chatInfoPanel.style.display = 'none'
	rightSidebar.entityInfoPanel.style.display = 'none'
	rightSidebar.backgroundPanel.style.display = 'none'
	rightSidebar.portraitPanel.style.display = 'none'
	rightSidebar.rightSidebarContent.append(
		rightSidebar.chatInfoPanel,
		rightSidebar.entityInfoPanel,
		rightSidebar.backgroundPanel,
		rightSidebar.portraitPanel,
	)

	if (!isMobileDevice) {
		if (currentWorkspaceMode === 'chat') {
			rightSidebar.openRightSidebarPanel('chatInfo')
		} else {
			rightSidebar.closeRightSidebar?.()
		}
	}

	mainRow.append(mainContentWrapper, rightSidebar.rightSidebar)
	contentColumn.append(mainTopBar, mainRow)
	installCharacterImportDropGuard({ host: contentColumn })
	if (isMobileLayoutActive?.()) {
		mobile.mount()
	} else {
		if (leftSidebar) appWrapper.append(leftSidebar)
		if (contentColumn) appWrapper.append(contentColumn)
	}

	attachSidebarInteractions?.({ chatManagerNavigateEvent: CHAT_MANAGER_NAVIGATE_EVENT })
	attachTouchGestures?.()

	document.body.prepend(appWrapper)
	void initializeSendFormConnectionProfiles({ document: globalThis.document })
	void initializeSendFormContextUsage({ document: globalThis.document })

	initializeSidebarPanels()
	setActiveSidebarTab(getActiveSidebarTab(), true)

	updateCharacterDisplay()
	if (typeof rightSidebar.updateEntityInfo === 'function') rightSidebar.updateEntityInfo()
	personaAvatarWatcher.refresh()

	return {
		isMobileDevice,
		syncMainVisibility,
		getEntityNameLower,
		registerPrimaryBarRightView: primaryBarRightSlot?.registerView,
		activatePrimaryBarRightView: primaryBarRightSlot?.activateView,
		unregisterPrimaryBarRightView: primaryBarRightSlot?.unregisterView,
		setWorkspaceMode,
	}
}

function createRuntimeObject({
	sidebarNavStore,
	globalStateStore,
	sidebarNavRail,
	actions,
	watchers,
	slots,
}) {
	const runtime = {
		sidebarNavStore,
		globalStateStore,
	}

	const primaryBarSlot = slots?.primaryBarRight
	const noopRegister = () => ({
		id: null,
		activate: () => false,
		unregister: () => false,
		isActive: () => false,
	})
	const noopBoolean = () => false
	const noopGetActive = () => null

	runtime.services = {
		shell: {
			mount: () => runtime,
		},
	sidebarNav: {
		store: sidebarNavStore,
		hostElement: sidebarNavRail,
		selectTab: tabId => {
			if (typeof tabId === 'string') void actions.setActiveSidebarTab?.(tabId)
		},
		toggleSidebarExpansion: force => {
			if (typeof force === 'boolean') actions.toggleSidebarExpansion?.(force)
			else actions.toggleSidebarExpansion?.()
		},
		closeChat: () => {
			actions.closeChat?.()
		},
		personaAvatarWatcher: watchers.personaAvatarWatcher,
	},
	state: {
		store: globalStateStore,
		setState: globalStateStore.setState,
		getState: globalStateStore.getState,
		subscribe: globalStateStore.subscribe,
	},
	layout: {
		primaryBarRight: {
			registerView: primaryBarSlot?.registerView ?? noopRegister,
			activateView: primaryBarSlot?.activateView ?? noopBoolean,
			unregisterView: primaryBarSlot?.unregisterView ?? noopBoolean,
			getActiveViewId: primaryBarSlot?.getActiveViewId ?? noopGetActive,
		},
	},
}

	return runtime
}
