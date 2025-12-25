import { NAVIGATION_TAB_IDS } from '@/astra/app-shell/main/navigation/navConfig.js'
import {
	getHomeRoute,
	subscribeHomeRouteStore,
} from '@/astra/app-shell/main/main-area/views/home/state/homeRouteStore.js'
import {
	createMobileLayoutState,
	MOBILE_LAYOUT_CLASS,
	MOBILE_MAIN_VISIBLE_CLASS,
} from '../state/layoutState.js'
import { isMobileLayoutActive } from '../state/index.js'
import { createMobileOverlayHosts, createMobileMainCloseButton, createMobileNavRail } from '../ui/index.js'
import { getMobileMediaQuery, isMobile } from '../utils/index.js'

const MAIN_AREA_TAB_IDS = new Set(NAVIGATION_TAB_IDS.filter(tabId => tabId !== 'chat'))

export function createMobileShellRuntime({
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
}) {
	const { overlayHost, sidebarHost, mainHost } = createMobileOverlayHosts()
	const mobileMainCloseButton = createMobileMainCloseButton()
	const layoutState = createMobileLayoutState({
		getCurrentChatId,
		hideMainArea,
		isLayoutActive: isMobileLayoutActive,
	})
	const syncMainVisibility = layoutState.syncMainVisibility
	const documentRef = globalThis.document ?? null

	const getActiveNavTab = () => {
		if (!sidebarNavStore || typeof sidebarNavStore.getSnapshot !== 'function') {
			return null
		}
		const snapshot = sidebarNavStore.getSnapshot()
		return snapshot?.activeTab ?? null
	}

	const mobileNavRail = createMobileNavRail({
		document: documentRef,
		navStore: sidebarNavStore,
		onSelectTab: tabId => {
			if (!tabId) return
			const previousActiveTab = getActiveNavTab()
			if (typeof setActiveSidebarTab === 'function') {
				void setActiveSidebarTab(tabId)
			}
			if (previousActiveTab === tabId) {
				return
			}
			if (MAIN_AREA_TAB_IDS.has(tabId)) {
				if (typeof showMainArea === 'function') {
					showMainArea()
				}
			} else if (typeof hideMainArea === 'function') {
				hideMainArea()
			}
		},
		personaAvatarWatcher,
	})

	let desktopNavRail = leftSidebar?.querySelector?.('#sidebarNavRail') ?? null
	let desktopNavPlaceholder = null
	let isMobileNavMounted = false
	let homeRouteUnsubscribe = null

	const getSidebarContentPanel = () =>
		leftSidebar?.querySelector?.('#sidebarContentPanel') ?? null

	function detachDesktopNav() {
		if (!leftSidebar) return
		if (desktopNavPlaceholder) return

		if (!desktopNavRail || !desktopNavRail.isConnected) {
			desktopNavRail = leftSidebar.querySelector?.('#sidebarNavRail') ?? desktopNavRail
		}
		if (!desktopNavRail || desktopNavRail.parentNode !== leftSidebar) return

		if (documentRef && typeof documentRef.createComment === 'function') {
			desktopNavPlaceholder = documentRef.createComment('astra-mobile-desktop-nav')
			leftSidebar.replaceChild(desktopNavPlaceholder, desktopNavRail)
		} else {
			leftSidebar.removeChild(desktopNavRail)
		}
	}

	function restoreDesktopNav() {
		if (!leftSidebar || !desktopNavRail) return
		let restored = false
		if (desktopNavPlaceholder && desktopNavPlaceholder.parentNode === leftSidebar) {
			leftSidebar.replaceChild(desktopNavRail, desktopNavPlaceholder)
			desktopNavPlaceholder = null
			restored = true
		} else {
			if (!desktopNavRail.parentNode) {
				leftSidebar.insertBefore(desktopNavRail, leftSidebar.firstChild)
				restored = true
			} else {
				restored = true
			}
			desktopNavPlaceholder = null
		}
		if (restored) {
			try {
				leftSidebar.dispatchEvent(new CustomEvent('astra:desktop-nav-restored'))
			} catch {
				// no-op
			}
		}
	}

	function attachMobileNav() {
		if (!leftSidebar) return
		if (!mobileNavRail || typeof mobileNavRail.mount !== 'function') return
		if (isMobileNavMounted) return
		const beforeNode = getSidebarContentPanel()
		mobileNavRail.mount(leftSidebar, { before: beforeNode ?? null })
		isMobileNavMounted = true
	}

	function detachMobileNav() {
		if (!isMobileNavMounted) return
		if (mobileNavRail && typeof mobileNavRail.unmount === 'function') {
			mobileNavRail.unmount()
		}
		isMobileNavMounted = false
	}

	let isMobileShellDetached = false

	function mount() {
		if (appWrapper?.parentNode) {
			appWrapper.after(overlayHost)
		} else if (!overlayHost.isConnected) {
			document.body.append(overlayHost)
		}
		if (leftSidebar && leftSidebar.parentNode !== sidebarHost) {
			sidebarHost.append(leftSidebar)
		}
		detachDesktopNav()
		attachMobileNav()
		if (contentColumn && contentColumn.parentNode !== mainHost) {
			mainHost.append(contentColumn)
		}
		if (appWrapper) {
			appWrapper.style.display = 'none'
		}
		isMobileShellDetached = true
	}

	function unmount() {
		if (!isMobileShellDetached) return
		detachMobileNav()
		restoreDesktopNav()
		if (leftSidebar && appWrapper) appWrapper.append(leftSidebar)
		if (contentColumn && appWrapper) appWrapper.append(contentColumn)
		if (appWrapper) {
			appWrapper.style.display = ''
		}
		if (overlayHost.isConnected) overlayHost.remove()
		isMobileShellDetached = false
	}

	mobileMainCloseButton.addEventListener('click', hideMainArea)

	function addMobileMainCloseButton() {
		if (!primaryBarLeft) return
		if (!mobileMainCloseButton.isConnected) {
			primaryBarLeft.prepend(mobileMainCloseButton)
		}
	}

	function removeMobileMainCloseButton() {
		if (mobileMainCloseButton.isConnected) {
			mobileMainCloseButton.remove()
		}
	}

	const mobileMediaQuery = getMobileMediaQuery()

	function applyMobileLayout() {
		addMobileMainCloseButton()
		document.body.classList.add(MOBILE_LAYOUT_CLASS, 'sidebar-expanded')
		document.body.classList.remove('sidebar-fully-collapsed')
		hideMainArea()
		sidebarNavStore?.setIsExpanded(true)
	}

	function applyDesktopLayout() {
		removeMobileMainCloseButton()
		document.body.classList.remove(MOBILE_LAYOUT_CLASS)
		document.body.classList.remove(MOBILE_MAIN_VISIBLE_CLASS)
		resetMainArea()
		sidebarNavStore?.setIsExpanded(!document.body.classList.contains('sidebar-fully-collapsed'))
	}

	function handleMobileChange(event) {
		if (!event) return
		if (event.matches) {
			applyMobileLayout()
			mount()
		} else {
			unmount()
			applyDesktopLayout()
		}
	}

	function initializeLayout() {
		const isMobileDevice = isMobile()
		if (isMobileDevice) {
			addMobileMainCloseButton()
			document.body.classList.add(MOBILE_LAYOUT_CLASS, 'sidebar-expanded')
			document.body.classList.remove('sidebar-fully-collapsed')
			hideMainArea()
		} else {
			removeMobileMainCloseButton()
			document.body.classList.add('sidebar-expanded')
			resetMainArea()
		}

		sidebarNavStore?.setIsExpanded(!document.body.classList.contains('sidebar-fully-collapsed'))

		if (mobileMediaQuery) {
			if (typeof mobileMediaQuery.addEventListener === 'function') {
				mobileMediaQuery.addEventListener('change', handleMobileChange)
			} else if (typeof mobileMediaQuery.addListener === 'function') {
				mobileMediaQuery.addListener(handleMobileChange)
			}
			handleMobileChange(mobileMediaQuery)
		} else if (isMobileDevice) {
			mount()
		}

		return { isMobileDevice, mobileMediaQuery }
	}

	function attachSidebarInteractions({ chatManagerNavigateEvent } = {}) {
		if (!leftSidebar) return () => {}
		const onSidebarClick = event => {
			if (!isMobileLayoutActive()) return
			const target = event.target instanceof Element ? event.target : null
			if (!target) return
			if (target.closest('.chat-manager-chat-list-item')) {
				showMainArea()
			}
		}

		const onNavigate = () => {
			showMainArea()
		}

		const onHomeEntityOpen = () => {
			if (!isMobileLayoutActive()) return
			if (typeof setActiveSidebarTab === 'function') {
				void setActiveSidebarTab('home')
			}
			if (typeof showMainArea === 'function') {
				showMainArea()
			}
		}

		leftSidebar.addEventListener('click', onSidebarClick)
		if (chatManagerNavigateEvent) {
			leftSidebar.addEventListener(chatManagerNavigateEvent, onNavigate)
		}
		leftSidebar.addEventListener('astra:home-route:entity-open', onHomeEntityOpen)

		return () => {
			leftSidebar.removeEventListener('click', onSidebarClick)
			if (chatManagerNavigateEvent) {
				leftSidebar.removeEventListener(chatManagerNavigateEvent, onNavigate)
			}
			leftSidebar.removeEventListener('astra:home-route:entity-open', onHomeEntityOpen)
		}
	}

	function syncHomeRouteVisibility() {
		if (!isMobileLayoutActive()) return
		const route = typeof getHomeRoute === 'function' ? getHomeRoute() : null
		if (!route || route.view !== 'entity') return
		const activeTab = getActiveNavTab()
		if (activeTab !== 'home') return
		if (typeof showMainArea === 'function') {
			showMainArea()
		}
	}

	function attachHomeRouteVisibility() {
		if (homeRouteUnsubscribe || typeof subscribeHomeRouteStore !== 'function') return () => {}
		homeRouteUnsubscribe = subscribeHomeRouteStore(syncHomeRouteVisibility)
		syncHomeRouteVisibility()
		return () => {
			homeRouteUnsubscribe?.()
			homeRouteUnsubscribe = null
		}
	}

	function attachTouchGestures() {
		// Mobile swipe-to-close gesture intentionally disabled.
		return () => {}
	}

	attachHomeRouteVisibility()

	return {
		mount,
		unmount,
		syncMainVisibility,
		layout: {
			classes: layoutState.classes,
			isActive: isMobileLayoutActive,
			initialize: initializeLayout,
			attachSidebarInteractions,
			attachTouchGestures,
			showMainArea,
			hideMainArea,
			resetMainArea,
		},
	}
}
