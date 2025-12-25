import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'
import {
	MOBILE_MAIN_CLOSE_BUTTON_ID,
	MOBILE_MAIN_HOST_ID,
	MOBILE_OVERLAY_HOST_ID,
	MOBILE_SIDEBAR_HOST_ID,
} from '../styles/classes.js'

const MOBILE_BACK_ICON = getLucideIconMarkup('arrow-left', { size: 20 })

export function createMobileOverlayHosts() {
	const overlayHost = document.createElement('div')
	overlayHost.id = MOBILE_OVERLAY_HOST_ID

	const sidebarHost = document.createElement('div')
	sidebarHost.id = MOBILE_SIDEBAR_HOST_ID

	const mainHost = document.createElement('div')
	mainHost.id = MOBILE_MAIN_HOST_ID

	overlayHost.append(sidebarHost, mainHost)

	return { overlayHost, sidebarHost, mainHost }
}

export function createMobileMainCloseButton() {
	const button = document.createElement('button')
	button.type = 'button'
	button.id = MOBILE_MAIN_CLOSE_BUTTON_ID
	button.className = 'icon-button mobile-main-close-button'
	button.title = 'Home'
	button.setAttribute('aria-label', 'Home')
	button.innerHTML = MOBILE_BACK_ICON
	return button
}

export { MOBILE_BACK_ICON }
