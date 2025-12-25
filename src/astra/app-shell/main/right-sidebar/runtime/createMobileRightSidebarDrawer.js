import React, { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import { MOBILE_OVERLAY_HOST_ID } from '@/astra/mobile/styles/index.js'
import { getMobileMediaQuery, isMobile } from '@/astra/mobile/utils/index.js'

// Keep the drawer mounted long enough for exit animations to finish.
const DRAWER_EXIT_FALLBACK_MS = 560

function DrawerPanelHost({ contentNode }) {
	const hostRef = useRef(null)

	useEffect(() => {
		const target = hostRef.current
		if (!target || !(contentNode instanceof HTMLElement)) {
			return undefined
		}

		const parent = contentNode.parentElement
		const nextSibling = contentNode.nextSibling
		target.append(contentNode)

		return () => {
			if (!parent) return
			if (nextSibling && nextSibling.parentNode === parent) {
				parent.insertBefore(contentNode, nextSibling)
				return
			}
			parent.append(contentNode)
		}
	}, [contentNode])

	return (
		<div className="astra-mobile-right-sidebar-drawer__panel" ref={hostRef} data-astra-mobile-right-sidebar="true" />
	)
}

function MobileRightSidebarDrawer({
	open,
	contentNode,
	container,
	onOpenChange,
	title,
}) {
	const drawerTitle = title || 'Sidebar panel'
	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent
				className="astra-mobile-right-sidebar-drawer"
				container={container}
			>
				<DrawerTitle className="sr-only">{drawerTitle}</DrawerTitle>
				<DrawerDescription className="sr-only">
					Right sidebar drawer content
				</DrawerDescription>
				<div className="astra-mobile-right-sidebar-drawer__body">
					<DrawerPanelHost contentNode={contentNode} />
				</div>
			</DrawerContent>
		</Drawer>
	)
}

function resolveOverlayContainer(overlayHostId = MOBILE_OVERLAY_HOST_ID) {
	const overlay = overlayHostId ? document.getElementById(overlayHostId) : null
	if (overlay instanceof HTMLElement) return overlay
	return document.body ?? null
}

function subscribeToMediaQuery(mediaQuery, handler) {
	if (!mediaQuery || typeof handler !== 'function') return () => {}
	if (typeof mediaQuery.addEventListener === 'function') {
		mediaQuery.addEventListener('change', handler)
		return () => mediaQuery.removeEventListener('change', handler)
	}
	if (typeof mediaQuery.addListener === 'function') {
		mediaQuery.addListener(handler)
		return () => mediaQuery.removeListener(handler)
	}
	return () => {}
}

export function createMobileRightSidebarDrawer({
	rightSidebar,
	controller,
	overlayHostId = MOBILE_OVERLAY_HOST_ID,
	getEntityInfoLabel,
	isMobileLayoutActive,
	allowedPanelIds = ['lore', 'entityInfo', 'chatInfo', 'backgrounds', 'portrait'],
} = {}) {
	if (!rightSidebar || !controller) return null

	const allowedPanels = new Set(allowedPanelIds)
	const panelNodes = new Map([
		['lore', rightSidebar.loreContainers?.root ?? null],
		['entityInfo', rightSidebar.entityInfoPanel ?? null],
		['chatInfo', rightSidebar.chatInfoPanel ?? null],
		['backgrounds', rightSidebar.backgroundPanel ?? null],
		['portrait', rightSidebar.portraitPanel ?? null],
	])
	let drawerRoot = null
	let host = null
	let activeContentNode = null
	let teardownTimer = null
	const ensureRoot = () => {
		if (drawerRoot && host) return true
		const container = resolveOverlayContainer(overlayHostId)
		if (!container) return false
		host = document.createElement('div')
		host.id = 'astraMobileRightSidebarDrawerHost'
		container.append(host)
		drawerRoot = createRoot(host)
		return true
	}

	const clearTeardownTimer = () => {
		if (teardownTimer) {
			clearTimeout(teardownTimer)
			teardownTimer = null
		}
	}

	const resolvePanelTitle = (panelId) => {
		switch (panelId) {
			case 'lore':
				return 'Lore and Worlds'
			case 'entityInfo':
				return typeof getEntityInfoLabel === 'function' ? getEntityInfoLabel() : 'Entity Info'
			case 'chatInfo':
				return 'Chat Info'
			case 'backgrounds':
				return 'Backgrounds'
			case 'portrait':
				return 'Character Portrait'
			default:
				return 'Sidebar panel'
		}
	}

	const renderDrawer = ({ open, contentNode, panelId }) => {
		if (!ensureRoot()) return
		const container = resolveOverlayContainer(overlayHostId)
		const handleOpenChange = (nextOpen) => {
			if (!nextOpen) {
				controller?.closePanel?.()
			}
		}

		drawerRoot.render(
			<MobileRightSidebarDrawer
				open={open}
				contentNode={contentNode}
				container={container}
				onOpenChange={handleOpenChange}
				title={resolvePanelTitle(panelId)}
			/>,
		)
	}

	const teardownDrawer = () => {
		const cleanup = () => {
			if (drawerRoot) {
				drawerRoot.render(null)
				drawerRoot.unmount()
				drawerRoot = null
			}
			if (host?.parentNode) {
				host.parentNode.removeChild(host)
			}
			host = null
			activeContentNode = null
			document.body.classList.remove('astra-mobile-right-sidebar-drawer-open')
			teardownTimer = null
		}
		if (teardownTimer) {
			cleanup()
			return
		}
		teardownTimer = window.setTimeout(cleanup, DRAWER_EXIT_FALLBACK_MS)
	}

	const syncFromState = (stateParam) => {
		const snapshot = stateParam || controller?.getState?.()
		const mediaQuery = getMobileMediaQuery()
		const matchesMedia = mediaQuery ? mediaQuery.matches : false
		const isMobileActive = typeof isMobileLayoutActive === 'function'
			? !!isMobileLayoutActive()
			: isMobile()

		const shouldUseDrawer = (matchesMedia || isMobileActive) &&
			snapshot?.isOpen &&
			allowedPanels.has(snapshot.activePanel)

		if (!shouldUseDrawer) {
			if (!drawerRoot) {
				document.body.classList.remove('astra-mobile-right-sidebar-drawer-open')
				return
			}
			renderDrawer({ open: false, contentNode: activeContentNode, panelId: snapshot?.activePanel })
			teardownDrawer()
			return
		}

		const panelId = snapshot.activePanel
		const contentNode = panelNodes.get(panelId)
		if (!contentNode) {
			if (!drawerRoot) {
				document.body.classList.remove('astra-mobile-right-sidebar-drawer-open')
				return
			}
			renderDrawer({ open: false, contentNode: activeContentNode, panelId })
			teardownDrawer()
			return
		}

		clearTeardownTimer()
		activeContentNode = contentNode
		renderDrawer({ open: true, contentNode, panelId })
		document.body.classList.add('astra-mobile-right-sidebar-drawer-open')
	}

	const unsubscribeController = controller.subscribe?.(({ state }) => {
		syncFromState(state)
	})

	const mediaQuery = getMobileMediaQuery()
	const unsubscribeMedia = subscribeToMediaQuery(mediaQuery, () => {
		syncFromState(controller?.getState?.())
	})

	syncFromState(controller?.getState?.())

	return {
		sync: syncFromState,
		destroy: () => {
			if (typeof unsubscribeController === 'function') unsubscribeController()
			if (typeof unsubscribeMedia === 'function') unsubscribeMedia()
			teardownDrawer()
		},
	}
}
