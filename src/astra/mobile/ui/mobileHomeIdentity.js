import { getDefaultAvatar } from '@/astra/app-shell/main/main-area/services/avatarUtils.js'
import { isMobileLayoutActive } from '../state/layout.js'

const FALLBACK_AVATAR = getDefaultAvatar()

const resolveDisplayName = route => {
	if (typeof route?.displayName === 'string' && route.displayName.trim()) return route.displayName.trim()
	return route?.entityType === 'group' ? 'Group' : 'Character'
}

export function createMobileHomeIdentity({ document: documentParam } = {}) {
	const documentRef = documentParam ?? globalThis.document
	if (!documentRef) {
		return { element: null, mount: () => {}, unmount: () => {}, update: () => {} }
	}

	const wrapper = documentRef.createElement('div')
	wrapper.id = 'astraMobileHomeIdentity'
	wrapper.className = 'astra-mobile-home-identity'
	wrapper.hidden = true

	const avatar = documentRef.createElement('span')
	avatar.className = 'astra-mobile-home-identity__avatar'
	avatar.style.backgroundImage = `url("${FALLBACK_AVATAR}")`
	avatar.setAttribute('aria-hidden', 'true')

	const text = documentRef.createElement('div')
	text.className = 'astra-mobile-home-identity__text'

	const name = documentRef.createElement('span')
	name.className = 'astra-mobile-home-identity__name'
	name.textContent = 'Character'

	text.append(name)
	wrapper.append(avatar, text)

	const update = route => {
		const isEntity = route?.view === 'entity'
		const isMobile = isMobileLayoutActive()
		const shouldShow = isMobile && isEntity
		wrapper.hidden = !shouldShow
		if (!shouldShow) return

		const displayName = resolveDisplayName(route)
		name.textContent = displayName
		const avatarUrl =
			typeof route?.avatarUrl === 'string' && route.avatarUrl.trim()
				? route.avatarUrl.trim()
				: FALLBACK_AVATAR
		avatar.style.backgroundImage = `url("${avatarUrl}")`
	}

	const mount = host => {
		if (!host || wrapper.parentNode === host) return
		const closeButton = host.querySelector?.('#mobileMainCloseButton')
		if (closeButton?.nextSibling) host.insertBefore(wrapper, closeButton.nextSibling)
		else host.append(wrapper)
	}

	const unmount = () => {
		wrapper.hidden = true
		if (wrapper.parentNode) {
			wrapper.parentNode.removeChild(wrapper)
		}
	}

	return { element: wrapper, mount, unmount, update }
}
