import { DEFAULT_AVATAR } from '@/astra/shared/components/getCompositeAvatar.js'
import { hideDrawers } from '../shared/drawers.js'
import { createHomeCharacterBrowser } from './homeCharacterBrowser.js'
import { getHomeRoute, setHomeRouteToBrowser, subscribeHomeRouteStore } from './state/homeRouteStore.js'
import { applyHomeRouteHeading } from './homeHeading.js'
import { createCharacterHomeSection } from './entity/characterHomeSection.js'
import { mountCharacterEntityReact } from './entity/mountCharacterEntityReact.js'
import { setHomeEntityEditing } from './state/homeEntityStore.js'

const HOME_CONTAINER_ID = 'astraMainHomeView'
const HOME_TAB_ID = 'home'
let homeCharacterBrowserRuntime = null
let homeRouteUnsubscribe = null
let isHomeActive = false
let characterHomeSectionRuntime = null
let homeEntityReactRuntime = null

const homeElements = {
	container: null,
	browserHost: null,
	entityHost: null,
	entityTitle: null,
	entityBody: null,
	entityBodyPrimary: null,
	entityHero: null,
	entityHeroCoverImage: null,
	entityHeroAvatarImage: null,
	entityHeroToolbar: null,
	entityHeroContent: null,
	entityHeroInfo: null,
	entityHeroFavoriteButton: null,
	entityHeroEditButton: null,
	entityHeroMoreButton: null,
}

function getDocumentReference(mainContentWrapper) {
	if (mainContentWrapper?.ownerDocument) return mainContentWrapper.ownerDocument
	return globalThis.document ?? null
}

function resolveDisplayName(route) {
	const fallback =
		route?.entityType === 'group'
			? 'Group'
			: 'Character'
	return typeof route?.displayName === 'string' && route.displayName.trim()
		? route.displayName.trim()
		: fallback
}

function resolveAvatarSource(route) {
	if (typeof route?.avatarUrl === 'string' && route.avatarUrl.trim()) {
		return route.avatarUrl.trim()
	}
	return DEFAULT_AVATAR
}

function createEntityHero(documentRef) {
	const hero = documentRef.createElement('div')
	hero.className = 'astra-home-entityHero'

	const coverFigure = documentRef.createElement('figure')
	coverFigure.className = 'astra-home-entityHero__cover'

	const coverImage = documentRef.createElement('img')
	coverImage.className = 'astra-home-entityHero__coverImage'
	coverImage.src = DEFAULT_AVATAR
	coverImage.alt = 'Character cover'
	coverImage.loading = 'lazy'
	coverImage.decoding = 'async'
	coverFigure.append(coverImage)

	const meta = documentRef.createElement('div')
	meta.className = 'astra-home-entityHero__meta'

	const avatarFigure = documentRef.createElement('figure')
	avatarFigure.className = 'astra-home-entityHero__avatar'

	const metaContent = documentRef.createElement('div')
	metaContent.className = 'astra-home-entityHero__content'

	const metaInfo = documentRef.createElement('div')
	metaInfo.className = 'astra-home-entityHero__info'

	const toolbar = documentRef.createElement('div')
	toolbar.className = 'astra-home-entityHero__toolbar'

	const avatarImage = documentRef.createElement('img')
	avatarImage.className = 'astra-home-entityHero__avatarImage'
	avatarImage.src = DEFAULT_AVATAR
	avatarImage.alt = 'Character portrait'
	avatarImage.loading = 'lazy'
	avatarImage.decoding = 'async'
	avatarFigure.append(avatarImage)

	const favoriteButton = documentRef.createElement('button')
	favoriteButton.type = 'button'
	favoriteButton.className = 'entityHero__button entityHero__button--favorite'
	favoriteButton.textContent = 'Favorite'
	favoriteButton.setAttribute('aria-label', 'Favorite character')

	const editButton = documentRef.createElement('button')
	editButton.type = 'button'
	editButton.className = 'entityHero__button entityHero__button--edit'
	editButton.textContent = 'Edit'
	editButton.setAttribute('aria-label', 'Edit character')

	const moreButton = documentRef.createElement('button')
	moreButton.type = 'button'
	moreButton.className = 'entityHero__button entityHero__button--more'
	moreButton.textContent = 'More'
	moreButton.setAttribute('aria-label', 'More actions')

	toolbar.append(favoriteButton, editButton, moreButton)
	metaContent.append(toolbar, metaInfo)

	meta.append(avatarFigure, metaContent)
	hero.append(coverFigure, meta)

	return {
		hero,
		coverImage,
		avatarImage,
		meta,
		avatarFigure,
		metaContent,
		metaInfo,
		toolbar,
		favoriteButton,
		editButton,
		moreButton,
	}
}

function createHomeView(mainContentWrapper) {
	const documentRef = getDocumentReference(mainContentWrapper)
	if (!documentRef || !mainContentWrapper) return null

	const container = documentRef.createElement('section')
	container.id = HOME_CONTAINER_ID
	container.className = 'astra-home-view'
	container.dataset.tabId = HOME_TAB_ID
	container.setAttribute('aria-label', 'Astra Home')

	const browserHost = documentRef.createElement('div')
	browserHost.className = 'astra-home-view__browserHost'

	const entityHost = documentRef.createElement('div')
	entityHost.className = 'astra-home-view__entityHost'
	entityHost.style.display = 'none'
	entityHost.dataset.state = 'placeholder'

	const entityTitle = documentRef.createElement('h2')
	entityTitle.className = 'astra-home-entityPlaceholder__title'
	entityTitle.textContent = 'Character page'

	const entityHeroNodes = createEntityHero(documentRef)
	entityHeroNodes.metaInfo.append(entityTitle)

	const entityBody = documentRef.createElement('div')
	entityBody.className = 'astra-home-entityBody'

	const entityBodyPrimary = documentRef.createElement('div')
	entityBodyPrimary.className =
		'astra-home-entityBody__main'
	entityBodyPrimary.textContent = 'Select a character or group to view its details.'

	entityBody.append(entityBodyPrimary)

	entityHost.append(entityHeroNodes.hero, entityBody)
	container.append(browserHost, entityHost)

	mainContentWrapper.append(container)

	homeElements.container = container
	homeElements.browserHost = browserHost
	homeElements.entityHost = entityHost
	homeElements.entityTitle = entityTitle
	homeElements.entityBody = entityBody
	homeElements.entityBodyPrimary = entityBodyPrimary
	homeElements.entityHero = entityHeroNodes.hero
	homeElements.entityHeroCoverImage = entityHeroNodes.coverImage
	homeElements.entityHeroAvatarImage = entityHeroNodes.avatarImage
	homeElements.entityHeroToolbar = entityHeroNodes.toolbar
	homeElements.entityHeroContent = entityHeroNodes.metaContent
	homeElements.entityHeroInfo = entityHeroNodes.metaInfo
	homeElements.entityHeroFavoriteButton = entityHeroNodes.favoriteButton
	homeElements.entityHeroEditButton = entityHeroNodes.editButton
	homeElements.entityHeroMoreButton = entityHeroNodes.moreButton

	return container
}

function getHomeContainer(mainContentWrapper) {
	const documentRef = getDocumentReference(mainContentWrapper)
	return homeElements.container ?? documentRef?.getElementById(HOME_CONTAINER_ID) ?? null
}

function ensureHomeElements(mainContentWrapper) {
	const existingContainer = getHomeContainer(mainContentWrapper)
	if (existingContainer) {
		if (!homeElements.container) {
			homeElements.container = existingContainer
			homeElements.browserHost = existingContainer.querySelector('.astra-home-view__browserHost')
			homeElements.entityHost = existingContainer.querySelector('.astra-home-view__entityHost')
			homeElements.entityTitle = existingContainer.querySelector('.astra-home-entityPlaceholder__title')
			homeElements.entityBody = existingContainer.querySelector('.astra-home-entityBody')
			homeElements.entityBodyPrimary = existingContainer.querySelector('.astra-home-entityBody__main')
			homeElements.entityHero = existingContainer.querySelector('.astra-home-entityHero')
			homeElements.entityHeroCoverImage = existingContainer.querySelector(
				'.astra-home-entityHero__coverImage',
			)
			homeElements.entityHeroAvatarImage = existingContainer.querySelector(
				'.astra-home-entityHero__avatarImage',
			)
			homeElements.entityHeroToolbar = existingContainer.querySelector('.astra-home-entityHero__toolbar')
			homeElements.entityHeroContent = existingContainer.querySelector('.astra-home-entityHero__content')
			homeElements.entityHeroInfo = existingContainer.querySelector('.astra-home-entityHero__info')
			homeElements.entityHeroFavoriteButton = existingContainer.querySelector(
				'.entityHero__button--favorite',
			)
			homeElements.entityHeroEditButton = existingContainer.querySelector('.entityHero__button--edit')
			homeElements.entityHeroMoreButton = existingContainer.querySelector('.entityHero__button--more')
		}
		return homeElements
	}
	createHomeView(mainContentWrapper)
	return homeElements
}

function bindEntityHeroActions() {
	const { entityHeroEditButton } = homeElements
	if (entityHeroEditButton && !entityHeroEditButton.dataset.bound) {
		entityHeroEditButton.dataset.bound = 'true'
		entityHeroEditButton.addEventListener('click', event => {
			event.preventDefault()
			setHomeEntityEditing(true)
		})
	}
}

function ensureCharacterHomeSection() {
	const host = homeElements.entityBodyPrimary
	if (!host) return null

	const shouldRecreate =
		!characterHomeSectionRuntime ||
		!characterHomeSectionRuntime.root?.isConnected ||
		characterHomeSectionRuntime.root.parentElement !== host

	if (shouldRecreate) {
		characterHomeSectionRuntime = createCharacterHomeSection(host)
	}

	return characterHomeSectionRuntime
}

function updateEntityPlaceholder(route) {
	const {
		entityHost,
		entityTitle,
		entityBodyPrimary,
		entityBody,
		entityHero,
		entityHeroCoverImage,
		entityHeroAvatarImage,
	} = homeElements
	if (!entityHost) return

	entityHost.dataset.entityType = route?.entityType || ''
	entityHost.dataset.entityKey = route?.entityKey || ''

	const displayName = resolveDisplayName(route)
	const avatarSource = resolveAvatarSource(route)
	const typeLabel = route?.entityType === 'group' ? 'Group' : 'Character'

	if (entityTitle) {
		entityTitle.textContent = displayName
	}

	if (entityHero) {
		entityHero.dataset.view = route?.view || ''
		entityHero.dataset.entityType = route?.entityType || ''
	}

	if (entityHeroCoverImage) {
		entityHeroCoverImage.src = avatarSource
		entityHeroCoverImage.alt = `${displayName || typeLabel} cover`
	}

	if (entityHeroAvatarImage) {
		entityHeroAvatarImage.src = avatarSource
		entityHeroAvatarImage.alt = `${displayName || typeLabel} portrait`
	}

	const section = ensureCharacterHomeSection()

	if (section?.update) {
		section.update(route)
	} else if (entityBodyPrimary) {
		entityBodyPrimary.textContent =
			route?.entityType === 'group'
				? 'Group page placeholder. Editing tools coming soon.'
				: 'Character page placeholder. Editing tools coming soon.'
	} else if (entityBody && entityBody.childElementCount === 0) {
		entityBody.textContent =
			route?.entityType === 'group'
				? 'Group page placeholder. Editing tools coming soon.'
				: 'Character page placeholder. Editing tools coming soon.'
	}
}

export function hideHomeView({ mainContentWrapper } = {}) {
	const container = getHomeContainer(mainContentWrapper)
	if (!container) return
	container.style.display = 'none'
	isHomeActive = false
}

export function showHomeView({
	mainContentWrapper,
	characterSection,
	sheld,
	ensurePrimaryTitleSlot,
	MAIN_AREA_DRAWERS,
	enforceDrawerAlwaysOpen,
	primaryTitleDivider,
	getContext,
	eventSource,
	eventTypes,
	getRequestHeaders,
	getThumbnailUrl,
	timestampToMoment,
} = {}) {
	if (!mainContentWrapper) return

	const elements = ensureHomeElements(mainContentWrapper)
	const container = elements.container
	if (!container) return
	bindEntityHeroActions()

	hideDrawers(MAIN_AREA_DRAWERS, enforceDrawerAlwaysOpen)

	isHomeActive = true

	if (characterSection) {
		characterSection.style.display = 'none'
	}

	if (sheld) {
		sheld.style.display = 'none'
	}

	container.style.display = ''

	const syncRoute = route => {
		if (!route || typeof route !== 'object') return
		const isEntityView = route.view === 'entity'
		if (elements.browserHost) {
			elements.browserHost.style.display = isEntityView ? 'none' : ''
		}
		if (elements.entityHost) {
			elements.entityHost.style.display = isEntityView ? 'flex' : 'none'
		}

		updateEntityPlaceholder(route)

		if (isHomeActive) {
			const titleSlot = typeof ensurePrimaryTitleSlot === 'function' ? ensurePrimaryTitleSlot() : null
			applyHomeRouteHeading({
				route,
				titleSlot,
				divider: primaryTitleDivider,
				documentRef: titleSlot?.ownerDocument,
				onHomeClick: setHomeRouteToBrowser,
			})
		}
	}

	if (!homeRouteUnsubscribe) {
		homeRouteUnsubscribe = subscribeHomeRouteStore(syncRoute)
	}

	syncRoute(getHomeRoute())

	const runtimeDeps = {
		getContext,
		eventSource,
		eventTypes,
		getRequestHeaders,
		getThumbnailUrl,
		timestampToMoment,
	}

	if (!homeEntityReactRuntime) {
		const sectionRuntime = ensureCharacterHomeSection()
		if (sectionRuntime?.panelMains) {
			homeEntityReactRuntime = mountCharacterEntityReact({
				panelMains: sectionRuntime.panelMains,
				deps: runtimeDeps,
			})
		}
	}

	if (!homeCharacterBrowserRuntime) {
		homeCharacterBrowserRuntime = createHomeCharacterBrowser(elements.browserHost, runtimeDeps)
	} else if (typeof homeCharacterBrowserRuntime.refresh === 'function') {
		homeCharacterBrowserRuntime.refresh()
	}
}
