import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'
import {
	createCharacterStatsLookup,
	createCharacterTagsResolver,
	createCharacterRefreshScheduler,
	collectCharacters,
	computeTotalMessages,
	getCharacterStats,
	registerCharacterEventListeners,
	resolveCharacterStatsEntry,
	resolveContext,
	resolveCurrentCharacterId,
} from '@/astra/shared/characters/characterData.js'
import { buildAvatarUrlFromFileId } from '@/astra/utils/avatarSources.js'

const CHARACTER_CARDS_HEADING = {
	icon: getLucideIconMarkup('sparkle', {
		className: 'lucide lucide-sparkle-icon lucide-sparkle',
	}),
	label: 'Character Cards',
}

const MESSAGE_COUNT_ICON = getLucideIconMarkup('messages-square', {
	className: 'lucide lucide-messages-square-icon lucide-messages-square',
})

const MESSAGE_COUNT_FORMATTER = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 0,
})

const MAX_VISIBLE_TAGS_PER_CARD = 1

let teardownActiveListeners = null

export function renderCharacterCards(container, deps = {}) {
	if (!(container instanceof HTMLElement)) {
		return { updateHeading: () => {}, destroy: () => {} }
	}

	if (typeof teardownActiveListeners === 'function') {
		teardownActiveListeners()
		teardownActiveListeners = null
	}

	const doc = container.ownerDocument ?? globalThis?.document ?? null
	if (!doc) {
		return { updateHeading: () => {}, destroy: () => {} }
	}

	container.innerHTML = ''
	container.dataset.panelId = 'character-cards'

	const panel = doc.createElement('div')
	panel.className = 'character-cards-panel'

	const emptyState = doc.createElement('div')
	emptyState.className = 'character-cards-empty panel-subtitle'
	emptyState.textContent = 'No characters available yet.'

	const grid = doc.createElement('div')
	grid.className = 'character-cards-grid'

	panel.append(emptyState, grid)
	container.appendChild(panel)

	const renderState = createRenderState()

	function buildHeadingNode() {
		if (typeof deps.makeHeadingNode === 'function') {
			return deps.makeHeadingNode(CHARACTER_CARDS_HEADING)
		}

		const wrapper = doc.createElement('span')
		wrapper.className = 'character-cards-heading-fallback'

		const iconWrapper = doc.createElement('span')
		iconWrapper.className = 'character-cards-heading-icon'
		iconWrapper.innerHTML = CHARACTER_CARDS_HEADING.icon

		const label = doc.createElement('span')
		label.className = 'character-cards-heading-label'
		label.textContent = CHARACTER_CARDS_HEADING.label

		wrapper.append(iconWrapper, label)
		return wrapper
	}

	const titleSlot = deps.sidebarHeaderTitleSlot || deps.sidebarHeader

	function updateHeading() {
		if (!(titleSlot instanceof HTMLElement)) return
		titleSlot.replaceChildren(buildHeadingNode())
	}

	updateHeading()

	const refreshNow = () => {
		void renderCards({ doc, grid, emptyState, deps, state: renderState })
	}
	refreshNow()

	const scheduleRefresh = createCharacterRefreshScheduler(refreshNow)
	const teardownEvents = registerCharacterEventListeners({ deps, handler: scheduleRefresh })

	teardownActiveListeners = () => {
		scheduleRefresh.cancel()
		if (typeof teardownEvents === 'function') teardownEvents()
	}

	return {
		updateHeading,
		refresh: refreshNow,
		destroy() {
			resetRenderState(renderState)
			if (typeof teardownActiveListeners === 'function') {
				teardownActiveListeners()
				teardownActiveListeners = null
			}
		},
	}
}

async function renderCards({ doc, grid, emptyState, deps, state }) {
	grid.setAttribute('aria-busy', 'true')

	const scrollContainer =
		grid.closest('.character-cards-panel') ?? grid.parentElement ?? null
	const previousScrollTop =
		scrollContainer && typeof scrollContainer.scrollTop === 'number'
			? scrollContainer.scrollTop
			: null

	const context = resolveContext(deps.getContext)
	const { resolveTags, getSignature: getTagSignature } = createCharacterTagsResolver({
		context,
	})
	const characters = collectCharacters(context, {
		resolveTags,
		computeTagSignature: getTagSignature,
	})
	const currentCharacterId = resolveCurrentCharacterId(context)
	const selectCharacter = resolveCharacterSelector(deps, context, characters)

	if (!characters.length) {
		emptyState.style.display = ''
		if (state) resetRenderState(state)
		grid.replaceChildren()
		grid.setAttribute('aria-busy', 'false')
		if (scrollContainer && previousScrollTop !== null) {
			scrollContainer.scrollTop = previousScrollTop
		}
		return
	}

	emptyState.style.display = 'none'

	const nextSignatures = createCharacterSignatures(characters)
	const canReuse =
		state &&
		canReuseCardsForActiveUpdate({
			state,
			characters,
			signatures: nextSignatures,
		})

	let cards = []

	if (canReuse) {
		updateStateWithNewCharacters(state, characters)
		updateActiveCardState(state, currentCharacterId)
		state.lastCharacterSignatures = nextSignatures
		state.lastActiveId = currentCharacterId
		state.orderedCardIds = characters.map(character => character.id)
		cards = characters
			.map(character => state.cardsById.get(character.id))
			.filter(Boolean)
	} else {
		if (state) {
			state.cardsById.clear()
			state.orderedCardIds = []
		}
		grid.replaceChildren()

		for (const character of characters) {
			const { element, setTotalMessages } = createCharacterCard(doc, character, {
				currentCharacterId,
				selectCharacter,
			})
			grid.appendChild(element)
			const record = { character, element, setTotalMessages }
			cards.push(record)
			if (state) {
				state.cardsById.set(character.id, record)
				state.orderedCardIds.push(character.id)
			}
		}

		if (state) {
			state.lastCharacterSignatures = nextSignatures
			state.lastActiveId = currentCharacterId
		}
	}

	grid.setAttribute('aria-busy', 'false')

	if (scrollContainer && previousScrollTop !== null) {
		scrollContainer.scrollTop = previousScrollTop
	}

	try {
		const stats = await getCharacterStats({ deps, context })
		const statsLookup = createCharacterStatsLookup(stats)
		if (!statsLookup) return

		for (const { character, element, setTotalMessages } of cards) {
			if (!(element instanceof HTMLElement) || !element.isConnected) continue
			const statsEntry = resolveCharacterStatsEntry(character, statsLookup)
			if (!statsEntry) {
				setTotalMessages(null)
				continue
			}
			const totalMessages = computeTotalMessages(statsEntry)
			setTotalMessages(totalMessages)
		}
	} catch {
		// Ignore fetch errors – cards already display a graceful fallback.
	}
}

function createCharacterSignatures(characters = []) {
	return characters.map(createCharacterSignature)
}

function canReuseCardsForActiveUpdate({ state, characters, signatures }) {
	if (!state) return false
	if (!Array.isArray(characters) || !characters.length) return false
	if (!(state.cardsById instanceof Map)) return false
	if (state.cardsById.size !== characters.length) return false

	if (!Array.isArray(state.orderedCardIds) || state.orderedCardIds.length !== characters.length) {
		return false
	}

	if (!Array.isArray(signatures) || signatures.length !== characters.length) return false
	if (
		!Array.isArray(state.lastCharacterSignatures) ||
		state.lastCharacterSignatures.length !== characters.length
	) {
		return false
	}

	for (let index = 0; index < characters.length; index += 1) {
		const character = characters[index]
		const expectedId = state.orderedCardIds[index]
		if (character?.id !== expectedId) return false

		const signature = signatures[index]
		const previousSignature = state.lastCharacterSignatures[index]
		if (signature !== previousSignature) return false

		if (!state.cardsById.has(character.id)) return false
	}

	return true
}

function updateStateWithNewCharacters(state, characters = []) {
	if (!state || !(state.cardsById instanceof Map)) return
	for (const character of characters) {
		if (!character) continue
		const existing = state.cardsById.get(character.id)
		if (!existing) continue
		existing.character = character
	}
}

function updateActiveCardState(state, currentCharacterId) {
	if (!state || !(state.cardsById instanceof Map)) return
	const targetId = typeof currentCharacterId === 'number' ? currentCharacterId : null
	for (const { character, element } of state.cardsById.values()) {
		if (!(element instanceof HTMLElement)) continue
		const isActive = targetId !== null && typeof character?.id === 'number' && character.id === targetId
		element.classList.toggle('is-active', isActive)
		element.setAttribute('aria-pressed', isActive ? 'true' : 'false')
	}
}

function createCharacterSignature(character) {
	if (!character || typeof character !== 'object') {
		return JSON.stringify({ id: null })
	}

	const rawAvatar =
		typeof character?.raw?.avatar === 'string' ? character.raw.avatar.trim() : ''
	const rawChat = typeof character?.raw?.chat === 'string' ? character.raw.chat.trim() : ''

	return JSON.stringify({
		id: typeof character.id === 'number' ? character.id : null,
		name: typeof character.name === 'string' ? character.name : '',
		avatarId: typeof character.avatarId === 'string' ? character.avatarId : '',
		version: typeof character.version === 'string' ? character.version : '',
		isFavorite: character.isFavorite === true,
		tags:
			typeof character.tagSignature === 'string' ? character.tagSignature : '',
		rawAvatar,
		rawChat,
	})
}

function createRenderState() {
	return {
		cardsById: new Map(),
		orderedCardIds: [],
		lastCharacterSignatures: [],
		lastActiveId: null,
	}
}

function resetRenderState(state) {
	if (!state) return
	if (state.cardsById instanceof Map) {
		state.cardsById.clear()
	}
	state.orderedCardIds = []
	state.lastCharacterSignatures = []
	state.lastActiveId = null
}

function resolveCharacterSelector(deps, context, characters = []) {
	const selectCharacterFn =
		getCallable([
			deps?.selectCharacterById,
			context?.selectCharacterById,
			globalThis?.selectCharacterById,
		]) ?? null

	if (selectCharacterFn) {
		return character => {
			if (!character || typeof character.id !== 'number') return
			try {
				const result = selectCharacterFn(character.id)
				if (result instanceof Promise) {
					void result.catch(error => {
						console?.error?.('[AstraProjecta] Failed to switch character.', error)
					})
				}
			} catch (error) {
				console?.error?.('[AstraProjecta] Failed to switch character.', error)
			}
		}
	}

	const openChatFn =
		getCallable([
			deps?.openCharacterChat,
			context?.openCharacterChat,
			globalThis?.openCharacterChat,
		]) ?? null

	if (openChatFn) {
		return character => {
			if (!character) return
			const chatName = resolveChatFileName(character, context, characters)
			if (!chatName) return
			try {
				const result = openChatFn(chatName)
				if (result instanceof Promise) {
					void result.catch(error => {
						console?.error?.('[AstraProjecta] Failed to open character chat.', error)
					})
				}
			} catch (error) {
				console?.error?.('[AstraProjecta] Failed to open character chat.', error)
			}
		}
	}

	if (typeof globalThis?.select_selected_character === 'function') {
		return character => {
			if (!character || typeof character.id !== 'number') return
			try {
				globalThis.select_selected_character(character.id, { switchMenu: true })
			} catch (error) {
				console?.error?.('[AstraProjecta] Failed to select character.', error)
			}
		}
	}

	return null
}

function getCallable(candidates) {
	return candidates.find(candidate => typeof candidate === 'function') || null
}

function resolveChatFileName(character, context, characters) {
	const rawChat =
		typeof character?.raw?.chat === 'string' ? character.raw.chat.trim() : ''
	if (rawChat) return rawChat

	const id = typeof character?.id === 'number' ? character.id : null
	if (id === null) return ''

	const contextList = Array.isArray(context?.characters) ? context.characters : null
	const fromContext =
		contextList && typeof contextList[id]?.chat === 'string'
			? contextList[id].chat.trim()
			: ''
	if (fromContext) return fromContext

	const globalList =
		typeof globalThis !== 'undefined' && Array.isArray(globalThis.characters)
			? globalThis.characters
			: null
	const fromGlobal =
		globalList && typeof globalList[id]?.chat === 'string'
			? globalList[id].chat.trim()
			: ''
	if (fromGlobal) return fromGlobal

	const fromCollected =
		Array.isArray(characters) && typeof characters[id]?.raw?.chat === 'string'
			? characters[id].raw.chat.trim()
			: ''

	return fromCollected
}

function createCharacterCard(doc, character, options) {
	const { currentCharacterId, selectCharacter } = options
	const card = doc.createElement('button')
	card.type = 'button'
	card.className = 'character-card'
	card.dataset.chid = String(character.id)
	card.setAttribute('aria-pressed', character.id === currentCharacterId ? 'true' : 'false')

	card.title = character.name

	if (character.id === currentCharacterId) {
		card.classList.add('is-active')
	}

	if (character.isFavorite) {
		card.classList.add('is-favorite')
	}

	const avatarWrapper = doc.createElement('div')
	avatarWrapper.className = 'character-card__avatar'

	const image = doc.createElement('img')
	image.className = 'character-card__image'
	image.alt = character.name
	image.loading = 'lazy'
	image.decoding = 'async'
	image.src = resolveAvatarSource(character.avatarId)
	image.onerror = () => {
		image.onerror = null
		image.src = getFallbackAvatar()
	}

	avatarWrapper.appendChild(image)

	const body = doc.createElement('div')
	body.className = 'character-card__body'

	const nameRow = doc.createElement('div')
	nameRow.className = 'character-card__header'

	body.appendChild(nameRow)

	const statsRow = doc.createElement('div')
	statsRow.className = 'character-card__stats'

	const statsIcon = doc.createElement('span')
	statsIcon.className = 'character-card__statsIcon'
	statsIcon.innerHTML = MESSAGE_COUNT_ICON

	const statsValue = doc.createElement('span')
	statsValue.className = 'character-card__statsValue'

	statsRow.append(statsIcon, statsValue)
	statsRow.hidden = true

	const nameLabel = doc.createElement('span')
	nameLabel.className = 'character-card__name'
	nameLabel.textContent = character.name
	nameLabel.title = character.name

	nameRow.append(statsRow, nameLabel)

	const tagBadges = Array.isArray(character?.tagBadges) ? character.tagBadges : []
	const tagsRow = createCharacterTagList(doc, tagBadges)

	card.appendChild(avatarWrapper)
	if (tagsRow) {
		card.appendChild(tagsRow)
	}
	card.appendChild(body)

	if (typeof selectCharacter === 'function') {
		card.addEventListener('click', () => {
			selectCharacter(character)
		})
	}

	const updateStatsDisplay = totalMessages => {
		const numeric = Number(totalMessages)
		const hasValue = Number.isFinite(numeric) && numeric > 0
		statsRow.classList.toggle('is-empty', !hasValue)
		if (!hasValue) {
			statsRow.hidden = true
			statsRow.style.display = 'none'
			statsValue.textContent = ''
			return
		}
		statsRow.hidden = false
		statsRow.style.display = ''
		const formatted = formatMessageCount(numeric)
		statsValue.textContent = formatted ?? ''
	}

	updateStatsDisplay(null)

	return {
		element: card,
		setTotalMessages(totalMessages) {
			updateStatsDisplay(totalMessages)
		},
	}
}

function createCharacterTagList(doc, tags = []) {
	if (!Array.isArray(tags) || !tags.length) return null

	const container = doc.createElement('div')
	container.className = 'character-card__tags'

	const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS_PER_CARD)

	for (const tag of visibleTags) {
		if (!tag || typeof tag !== 'object') continue
		const name = typeof tag.name === 'string' ? tag.name : ''
		if (!name) continue

		const pill = doc.createElement('span')
		pill.className = 'character-card__tag'
		pill.textContent = name
		pill.title = typeof tag.title === 'string' && tag.title
			? tag.title
			: name

		if (tag.id) {
			pill.dataset.tagId = String(tag.id)
		}

		if (Number.isFinite(tag.sortOrder)) {
			pill.dataset.sortOrder = String(tag.sortOrder)
		}

		if (typeof tag.color === 'string' && tag.color) {
			pill.style.setProperty('--character-card-tag-bg', tag.color)
		}

		if (typeof tag.color2 === 'string' && tag.color2) {
			pill.style.setProperty('--character-card-tag-fg', tag.color2)
		}

		container.appendChild(pill)
	}

	return container.childElementCount > 0 ? container : null
}

function resolveAvatarSource(avatarId) {
	const fallback = getFallbackAvatar()
	if (!avatarId || avatarId === 'none') return fallback
	try {
		return buildAvatarUrlFromFileId(avatarId, 'avatar') || fallback
	} catch (error) {
		console?.warn?.('[AstraProjecta] Failed to resolve avatar URL, using fallback.', error)
		return fallback
	}
}

let cachedFallbackAvatar = null
function getFallbackAvatar() {
	if (cachedFallbackAvatar) return cachedFallbackAvatar

	const raw =
		typeof globalThis?.default_avatar === 'string' && globalThis.default_avatar.trim()
			? globalThis.default_avatar.trim()
			: 'img/ai4.png'

	try {
		cachedFallbackAvatar = buildAvatarUrlFromFileId(raw)
	} catch {
		cachedFallbackAvatar = raw.startsWith('/') ? raw : `/${raw}`
	}

	return cachedFallbackAvatar
}

function formatMessageCount(value) {
	if (value === null || value === undefined) return null
	const numeric = Number(value)
	if (!Number.isFinite(numeric)) return null
	return MESSAGE_COUNT_FORMATTER.format(numeric)
}
