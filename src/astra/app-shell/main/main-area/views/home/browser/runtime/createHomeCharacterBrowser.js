import React from 'react'
import { createRoot } from 'react-dom/client'
import {
	collectCharacters,
	computeTotalMessages,
	createCharacterRefreshScheduler,
	createCharacterStatsLookup,
	createCharacterTagsResolver,
	getCharacterStats,
	registerCharacterEventListeners,
	resolveCharacterStatsEntry,
	resolveContext,
} from '@/astra/shared/characters/characterData.js'
import { createHomeCharacterCard } from '../cards/createHomeCharacterCard.js'
import { buildHomeCardSnapshot, resolveCharacterKey } from '../cards/homeCardData.js'
import { writeHomeCardTokenCache } from '../cards/homeCardTokenDisplay.js'
import { captureScrollPosition } from '../shared/browserDomGuards.js'
import { registerAvatarMutationListener } from '../shared/avatarSources.js'
import { CHARACTER_MUTATION_REASONS } from '../../components/cardActionsController.js'
import { HomeCharacterSearch } from '../../components/HomeCharacterSearch.jsx'
import {
	applyHomeCharacterSearch,
	subscribeHomeCharacterSearchStore,
} from '../../state/homeCharacterSearchStore.js'
import { subscribeHomeTagFiltersStore } from '../../state/homeTagFilterStore.js'
import { subscribeHomeFavoriteFilterStore } from '../../state/homeFavoriteFilterStore.js'
import {
	resetHomeCharacterBrowserStats,
	setHomeCharacterBrowserStats,
} from '../../state/homeCharacterBrowserStatsStore.js'
import { canReuseHomeCardGrid, cleanupCardEntries, destroyActionHandles } from './homeBrowserCardUtils.js'
import { createHomeCardGridController } from './homeCardGridController.js'
import { createHomeCardTokenBridge } from './homeCardTokenBridge.js'
import {
	getHomeCardLayoutState,
	resolveHomeCardLayoutId,
	subscribeHomeCardLayoutStore,
} from '../../state/homeCardLayoutStore.js'

const DEFAULT_EMPTY_MESSAGE = 'No characters yet.'

export function createHomeCharacterBrowser(container, deps = {}) {
	const doc = container.ownerDocument ?? globalThis.document
	if (!doc) return { refresh() {}, destroy() {} }

	container.classList.add('astra-home-browser-container')
	container.replaceChildren()

	const browser = doc.createElement('div')
	browser.className = 'astra-home-browser'

	const controlsHost = doc.createElement('div')
	controlsHost.className = 'astra-home-browser__controlsRegion'

	const viewHost = doc.createElement('div')
	viewHost.className = 'astra-home-browser__view'
	viewHost.dataset.empty = 'true'

	const grid = doc.createElement('div')
	grid.className = 'astra-home-card-grid'
	grid.setAttribute('aria-live', 'polite')

	const {
		setVisibleCount: setGridVisibleCount,
		recompute: recomputeGridTracks,
		destroy: destroyGridController,
	} = createHomeCardGridController({
		grid,
		doc,
		container: viewHost,
	})

	const emptyState = doc.createElement('div')
	emptyState.className = 'astra-home-browser__empty'
	emptyState.textContent = DEFAULT_EMPTY_MESSAGE

	const setSingleCardState = count => {
		if (count === 1) {
			grid.dataset.singleCard = 'true'
		} else {
			delete grid.dataset.singleCard
		}
	}

	const setViewEmptyState = (isEmpty, message) => {
		viewHost.dataset.empty = isEmpty ? 'true' : 'false'
		const copy = typeof message === 'string' && message ? message : DEFAULT_EMPTY_MESSAGE
		emptyState.textContent = copy
	}

	const requestGridRecompute = () => {
		if (typeof recomputeGridTracks !== 'function') {
			return
		}
		try {
			if (typeof requestAnimationFrame === 'function') {
				requestAnimationFrame(() => recomputeGridTracks())
				return
			}
		} catch {
			// Ignore and fall through to direct recompute
		}
		recomputeGridTracks()
	}

	viewHost.append(grid, emptyState)
	browser.append(controlsHost, viewHost)
	container.appendChild(browser)

	const controlsRoot = createRoot(controlsHost)
	controlsRoot.render(<HomeCharacterSearch />)

	let refreshToken = 0

	const renderState = {
		teardown: null,
		schedule: null,
		lastSnapshot: null,
		cardLayoutId: null,
		cardEntries: [],
	}
	const actionHandleRegistry = new Map()
	const messageTotals = new Map()
	const avatarCacheBusters = new Map()

	const scheduleRefresh = createCharacterRefreshScheduler(() => {
		void refresh()
	})
	renderState.schedule = scheduleRefresh

	const teardownFilters = subscribeHomeCharacterSearchStore(() => {
		scheduleRefresh()
	})
	const teardownTagFilters = subscribeHomeTagFiltersStore(() => {
		scheduleRefresh()
	})
	const teardownFavoriteFilters = subscribeHomeFavoriteFilterStore(() => {
		scheduleRefresh()
	})
	const teardownCardLayout = subscribeHomeCardLayoutStore(() => {
		scheduleRefresh()
	})

	const handleCharacterEvent = (...args) => {
		if (shouldIgnoreCharacterMutationEvent(args?.[0])) {
			return
		}
		scheduleRefresh()
	}

	const teardownEvents = registerCharacterEventListeners({
		deps,
		handler: handleCharacterEvent,
	})
	renderState.teardown = teardownEvents

	const avatarMutationTeardown = registerAvatarMutationListener({
		deps,
		cache: avatarCacheBusters,
	})

	const handlePreciseTokenUpdate = payload => {
		const normalizedTokens = normalizeTokenValue(payload?.tokens)
		if (normalizedTokens === null) {
			return
		}
		const character = payload?.character ?? null
		const characterKey = payload?.characterKey ?? (character ? resolveCharacterKey(character) : '')
		if (!character || !characterKey) {
			return
		}
		writeHomeCardTokenCache(character, {
			tokens: normalizedTokens,
			sourceId: payload?.sourceId,
			sourceLabel: payload?.sourceLabel,
		})
		for (const entry of renderState.cardEntries) {
			if (entry?.characterKey !== characterKey) continue
			if (typeof entry?.setPreciseTokenCount === 'function') {
				entry.setPreciseTokenCount(normalizedTokens, {
					sourceId: payload?.sourceId,
					sourceLabel: payload?.sourceLabel,
				})
			}
		}
	}

	const tokenBridge = createHomeCardTokenBridge({
		deps,
		onTokens: handlePreciseTokenUpdate,
	})

	async function refresh() {
		const token = ++refreshToken
		grid.setAttribute('aria-busy', 'true')

		const cardLayoutId = resolveHomeCardLayoutId(getHomeCardLayoutState()?.layoutId)
		grid.dataset.cardLayout = cardLayoutId

		const context = resolveContext(deps?.getContext)
		const resolvedDeps = context ? { ...deps, context, avatarCacheBusters } : { ...deps, avatarCacheBusters }
		const { resolveTags } = createCharacterTagsResolver({ context })
		const characters = collectCharacters(context, {
			resolveTags,
		})

		const { characters: filteredCharacters, metadata } = applyHomeCharacterSearch({
			characters,
		})
		const searchActive = Boolean(metadata?.searchActive)
		const tagFiltersActive = Boolean(metadata?.tagFiltersActive)
		const favoriteFiltersActive = Boolean(metadata?.favoriteFiltersActive)
		setHomeCharacterBrowserStats({
			totalCharacters: characters.length,
			visibleCharacters: filteredCharacters.length,
			searchActive,
			tagFiltersActive,
			favoriteFilterActive: favoriteFiltersActive,
		})

		setSingleCardState(filteredCharacters.length)
		setGridVisibleCount(filteredCharacters.length)

		if (!characters.length) {
			setViewEmptyState(true)
			setGridVisibleCount(0)
			const restoreScroll = captureScrollPosition(container)
			grid.replaceChildren()
			restoreScroll()
			grid.setAttribute('aria-busy', 'false')
			destroyActionHandles(actionHandleRegistry.values())
			actionHandleRegistry.clear()
			cleanupCardEntries(renderState.cardEntries)
			renderState.cardEntries = []
			renderState.lastSnapshot = null
			messageTotals.clear()
			requestGridRecompute()
			return
		}

		if (!filteredCharacters.length) {
			let emptyMessage = DEFAULT_EMPTY_MESSAGE
			if (searchActive) {
				emptyMessage = 'No characters match your search.'
			} else if (tagFiltersActive || favoriteFiltersActive) {
				emptyMessage = 'No characters match your filters.'
			}
			setViewEmptyState(true, emptyMessage)
			setGridVisibleCount(0)
			const restoreScroll = captureScrollPosition(container)
			grid.replaceChildren()
			restoreScroll()
			grid.setAttribute('aria-busy', 'false')
			destroyActionHandles(actionHandleRegistry.values())
			actionHandleRegistry.clear()
			cleanupCardEntries(renderState.cardEntries)
			renderState.cardEntries = []
			renderState.lastSnapshot = null
			messageTotals.clear()
			requestGridRecompute()
			return
		}

		setViewEmptyState(false)

		const nextSnapshot = filteredCharacters.map((character, index) => buildHomeCardSnapshot(character, index))
		const reuseCards = canReuseHomeCardGrid({
			previousSnapshot: renderState.lastSnapshot,
			nextSnapshot,
			expectedLength: renderState.cardEntries.length,
		}) && renderState.cardLayoutId === cardLayoutId

		let cards = []

		if (reuseCards) {
			cards = renderState.cardEntries
			for (let index = 0; index < cards.length; index += 1) {
				if (cards[index]) {
					cards[index].character = filteredCharacters[index]
				}
			}
		} else {
			const previousActionHandles = new Map(actionHandleRegistry)
			actionHandleRegistry.clear()
			const restoreScroll = captureScrollPosition(container)
			const previousEntries = renderState.cardEntries
			cards = filteredCharacters.map(character => {
				const characterKey = resolveCharacterKey(character)
				const existingHandle = characterKey ? previousActionHandles.get(characterKey) ?? null : null
				if (existingHandle && characterKey) {
					previousActionHandles.delete(characterKey)
				}
				const {
					element,
					setTotalMessages,
					actionHandle,
					destroy: destroyCard,
					setPreciseTokenCount,
				} = createHomeCharacterCard(doc, character, resolvedDeps, existingHandle, { layoutId: cardLayoutId })
				if (actionHandle && characterKey) {
					actionHandleRegistry.set(characterKey, actionHandle)
				}
				const cardEntry = {
					character,
					characterKey,
					element,
					setTotalMessages,
					destroy: destroyCard,
					setPreciseTokenCount,
				}
				if (characterKey && messageTotals.has(characterKey)) {
					setTotalMessages(messageTotals.get(characterKey))
				}
				return cardEntry
			})

			grid.replaceChildren(...cards.map(entry => entry.element))
			restoreScroll()
			destroyActionHandles(previousActionHandles.values())
			cleanupCardEntries(previousEntries)
		}
		renderState.cardEntries = cards
		renderState.lastSnapshot = nextSnapshot
		renderState.cardLayoutId = cardLayoutId
		grid.setAttribute('aria-busy', 'false')

		const seenKeys = new Set()
		for (const entry of cards) {
			if (entry?.characterKey) {
				seenKeys.add(entry.characterKey)
			}
		}

		for (const key of messageTotals.keys()) {
			if (!seenKeys.has(key)) {
				messageTotals.delete(key)
			}
		}

		try {
			const stats = await getCharacterStats({ deps: resolvedDeps, context })
			if (token !== refreshToken) return
			const lookup = createCharacterStatsLookup(stats)
			if (!lookup) {
				for (const card of cards) {
					if (card.characterKey) {
						messageTotals.delete(card.characterKey)
					}
					card.setTotalMessages(null)
				}
				return
			}

			for (const card of cards) {
				const statsEntry = resolveCharacterStatsEntry(card.character, lookup)
				const total = computeTotalMessages(statsEntry)
				if (card.characterKey) {
					if (total === null || total === undefined) {
						messageTotals.delete(card.characterKey)
					} else {
						messageTotals.set(card.characterKey, total)
					}
				}
				card.setTotalMessages(total)
			}
		} catch {
			for (const card of cards) {
				if (card.characterKey && messageTotals.has(card.characterKey)) {
					card.setTotalMessages(messageTotals.get(card.characterKey))
					continue
				}
				card.setTotalMessages(null)
			}
		}
		requestGridRecompute()
	}

	void refresh()

	return {
		refresh() {
			void refresh()
		},
		destroy() {
			if (typeof renderState.schedule?.cancel === 'function') {
				renderState.schedule.cancel()
			}
			if (typeof renderState.teardown === 'function') {
				renderState.teardown()
			}
			destroyActionHandles(actionHandleRegistry.values())
			actionHandleRegistry.clear()
			cleanupCardEntries(renderState.cardEntries)
			renderState.cardEntries = []
			renderState.lastSnapshot = null
			messageTotals.clear()
			avatarCacheBusters.clear()
			resetHomeCharacterBrowserStats()
			container.replaceChildren()
			if (typeof avatarMutationTeardown === 'function') {
				avatarMutationTeardown()
			}
			if (typeof teardownFilters === 'function') {
				teardownFilters()
			}
			if (typeof teardownTagFilters === 'function') {
				teardownTagFilters()
			}
			if (typeof teardownFavoriteFilters === 'function') {
				teardownFavoriteFilters()
			}
			if (typeof teardownCardLayout === 'function') {
				teardownCardLayout()
			}
			if (tokenBridge && typeof tokenBridge.destroy === 'function') {
				tokenBridge.destroy()
			}
			if (typeof destroyGridController === 'function') {
				try {
					destroyGridController()
				} catch (error) {
					console?.warn?.('[AstraProjecta] Failed to cleanup home grid controller.', error)
				}
			}
			if (controlsRoot) {
				try {
					controlsRoot.unmount()
				} catch (error) {
					console?.warn?.('[AstraProjecta] Failed to unmount search controls.', error)
				}
			}
		},
	}
}

function normalizeTokenValue(value) {
	const numeric = Number(value)
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return null
	}
	return Math.max(1, Math.round(numeric))
}

function shouldIgnoreCharacterMutationEvent(detail) {
	if (!detail || typeof detail !== 'object') return false
	const reason = typeof detail.reason === 'string' ? detail.reason : ''
	return reason === CHARACTER_MUTATION_REASONS.favoriteToggle
}
