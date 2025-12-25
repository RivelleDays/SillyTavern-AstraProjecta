import { getSidebarNavRailItems } from '@/astra/app-shell/main/navigation/navConfig.js'
import { MOBILE_SIDEBAR_NAV_RAIL_ID } from '../styles/classes.js'

const SECTION_ORDER = [
	['top', 'mobile-sidebar-nav-rail__section mobile-sidebar-nav-rail__section--top'],
	['middle', 'mobile-sidebar-nav-rail__section mobile-sidebar-nav-rail__section--middle'],
	['bottom', 'mobile-sidebar-nav-rail__section mobile-sidebar-nav-rail__section--bottom'],
]

const sanitizeSectionItems = items => (Array.isArray(items) ? items : [])

const normalizeSectionsForMobile = sections => {
	const topItems = sanitizeSectionItems(sections?.top)
	const middleItems = sanitizeSectionItems(sections?.middle)
	const bottomItems = sanitizeSectionItems(sections?.bottom)

	const homeItem = [...topItems, ...middleItems, ...bottomItems].find(item => item?.id === 'home')
	const chatItem = [...topItems, ...middleItems, ...bottomItems].find(item => item?.id === 'chat')
	const normalizedTop = topItems.filter(item => item?.id !== 'chat' && item?.id !== 'home')
	const filteredMiddle = middleItems.filter(item => item?.id !== 'chat' && item?.id !== 'home')

	let normalizedMiddle = filteredMiddle
	if (homeItem || chatItem) {
		const middleWithPrimaryItems = [...filteredMiddle]
		let insertIndex = 0
		const preferredAnchors = ['ai-settings', 'user-settings']

		preferredAnchors.forEach(anchorId => {
			const anchorIndex = middleWithPrimaryItems.findIndex(item => item?.id === anchorId)
			if (anchorIndex !== -1 && anchorIndex + 1 > insertIndex) {
				insertIndex = anchorIndex + 1
			}
		})

		if (homeItem) {
			middleWithPrimaryItems.splice(insertIndex, 0, homeItem)
			insertIndex += 1
		}

		if (chatItem) {
			const chatAnchorIndex = middleWithPrimaryItems.findIndex(item => item?.id === 'home')
			const finalIndex = chatAnchorIndex !== -1 ? chatAnchorIndex + 1 : insertIndex
			middleWithPrimaryItems.splice(finalIndex, 0, chatItem)
		}

		normalizedMiddle = middleWithPrimaryItems
	}

	return {
		top: normalizedTop,
		middle: normalizedMiddle,
		bottom: bottomItems,
	}
}

const DEFAULT_SECTIONS = normalizeSectionsForMobile(getSidebarNavRailItems())

const sectionsSignature = sections => {
	if (!sections) return ''
	return JSON.stringify({
		top: Array.isArray(sections.top) ? sections.top.map(item => item.id) : [],
		middle: Array.isArray(sections.middle) ? sections.middle.map(item => item.id) : [],
		bottom: Array.isArray(sections.bottom) ? sections.bottom.map(item => item.id) : [],
	})
}

export function createMobileNavRail({
	document: documentParam,
	navStore,
	onSelectTab,
	personaAvatarWatcher,
} = {}) {
	const documentRef = documentParam ?? globalThis.document
	if (!documentRef) {
		return {
			element: null,
			mount: () => {},
			unmount: () => {},
			destroy: () => {},
		}
	}

	const navElement = documentRef.createElement('nav')
	navElement.id = MOBILE_SIDEBAR_NAV_RAIL_ID
	navElement.className = 'mobile-sidebar-nav-rail'

	/** @type {Map<string, HTMLButtonElement>} */
	const navButtons = new Map()
	/** @type {Map<string, HTMLElement>} */
	const sectionNodes = new Map()
	let personaAvatarImage = null
	let unsubscribe = null
	let lastSectionsSignature = ''

	SECTION_ORDER.forEach(([key, className]) => {
		const section = documentRef.createElement('div')
		section.className = className
		sectionNodes.set(key, section)
		navElement.append(section)
	})

	const personaWatcher = personaAvatarWatcher ?? null

	const cleanupPersonaWatcher = () => {
		if (personaAvatarImage && typeof personaWatcher?.removeTarget === 'function') {
			personaWatcher.removeTarget(personaAvatarImage)
		}
		personaAvatarImage = null
	}

	const appendPersonaAvatarTarget = target => {
		if (!target) return
		if (target.id === 'personaManagementNavAvatar') {
			target.id = 'mobilePersonaManagementNavAvatar'
		}
		personaAvatarImage = target
		if (typeof personaWatcher?.addTarget === 'function') {
			personaWatcher.addTarget(personaAvatarImage)
		}
	}

	const handleNavSelect = item => {
		if (!item || typeof item.id !== 'string') return
		void onSelectTab?.(item.id)
	}

	const createNavButton = item => {
		const button = documentRef.createElement('button')
		button.type = 'button'
		button.className = 'sidebar-nav-button mobile-sidebar-nav-rail__button'
		button.dataset.tabId = item.id
		button.setAttribute('aria-pressed', 'false')

		if (item.title) {
			button.title = item.title
			button.setAttribute('aria-label', item.title)
		} else {
			button.setAttribute('aria-label', item.id)
		}

		if (typeof item.iconMarkup === 'string' && item.iconMarkup.length > 0) {
			const iconWrapper = documentRef.createElement('span')
			iconWrapper.className = 'mobile-sidebar-nav-rail__icon'
			iconWrapper.innerHTML = item.iconMarkup
			button.append(iconWrapper)
		} else if (item.title) {
			button.textContent = item.title.slice(0, 2).toUpperCase()
		} else {
			button.textContent = item.id.slice(0, 2).toUpperCase()
		}

		button.addEventListener('click', () => handleNavSelect(item))
		return button
	}

	const renderNormalizedSections = normalizedSections => {
		cleanupPersonaWatcher()
		navButtons.clear()

		SECTION_ORDER.forEach(([key]) => {
			const section = sectionNodes.get(key)
			if (section) section.replaceChildren()
		})

		const appendSection = (key, items) => {
			const section = sectionNodes.get(key)
			if (!section) return
			;(Array.isArray(items) ? items : []).forEach(item => {
				if (!item?.id) return
				const button = createNavButton(item)
				navButtons.set(item.id, button)
				section.append(button)

				if (item.id === 'persona-management') {
					const avatar = button.querySelector('#personaManagementNavAvatar, #mobilePersonaManagementNavAvatar')
					if (avatar instanceof HTMLImageElement) {
						appendPersonaAvatarTarget(avatar)
					}
				}
			})
		}

		appendSection('top', normalizedSections.top)
		appendSection('middle', normalizedSections.middle)
		appendSection('bottom', normalizedSections.bottom)
	}

	const updateActiveTab = activeTab => {
		navButtons.forEach((button, tabId) => {
			const isActive = tabId === activeTab
			button.classList.toggle('active', isActive)
			button.setAttribute('aria-pressed', String(isActive))
		})
	}

	const syncFromStore = () => {
		if (!navStore) {
			renderNormalizedSections(DEFAULT_SECTIONS)
			lastSectionsSignature = sectionsSignature(DEFAULT_SECTIONS)
			updateActiveTab('chat')
			return
		}

		const snapshot = typeof navStore.getSnapshot === 'function' ? navStore.getSnapshot() : null
		if (!snapshot) {
			renderNormalizedSections(DEFAULT_SECTIONS)
			lastSectionsSignature = sectionsSignature(DEFAULT_SECTIONS)
			updateActiveTab('chat')
			return
		}

		const normalized = normalizeSectionsForMobile(snapshot.sections)
		const signature = sectionsSignature(normalized)
		if (signature !== lastSectionsSignature) {
			renderNormalizedSections(normalized)
			lastSectionsSignature = signature
		}

		updateActiveTab(snapshot.activeTab)
	}

	syncFromStore()

	if (navStore && typeof navStore.subscribe === 'function') {
		unsubscribe = navStore.subscribe(syncFromStore)
	}

	return {
		element: navElement,
		mount(container, { before } = {}) {
			if (!container || !navElement) return
			if (navElement.parentNode === container) return
			if (before && before.parentNode === container) {
				container.insertBefore(navElement, before)
			} else {
				container.append(navElement)
			}
		},
		unmount() {
			if (navElement?.parentNode) {
				navElement.parentNode.removeChild(navElement)
			}
		},
		destroy() {
			if (typeof unsubscribe === 'function') {
				unsubscribe()
				unsubscribe = null
			}
			cleanupPersonaWatcher()
			if (navElement?.parentNode) {
				navElement.parentNode.removeChild(navElement)
			}
		},
	}
}
