import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { renderMarkdownToHtml } from '@/astra/shared/markdown/renderMarkdown.js'
import { getLucideIconMarkup } from '@/astra/shared/icons/lucide.js'
import { HomeCardActions } from '../../components/HomeCardActions.jsx'
import { createHomeCardActionController } from '../../components/cardActionsController.js'
import { HOME_CARD_LAYOUT_IDS } from '../../state/homeCardLayoutStore.js'
import {
	resolveCharacterKey,
	resolveCharacterVersion,
	resolveCreatorName,
	resolveCreatorNotes,
	resolveCharacterCreationDate,
} from './homeCardData.js'
import { createHomeCardTagList } from './homeCardTags.js'
import { createHomeCardTokenDisplay } from './homeCardTokenDisplay.js'
import { formatCompactCount } from './homeCardNumberFormat.js'
import { disableMediaDragTargets, preventCharacterImportDrop } from '../shared/browserDomGuards.js'
import { getFallbackAvatar, resolveAvatarSource } from '../shared/avatarSources.js'

const MESSAGES_ICON_MARKUP = getLucideIconMarkup('messages-square', { size: 14 })
const AUTHOR_ICON_MARKUP = getLucideIconMarkup('user-pen', { size: 14 })
const VERSION_ICON_MARKUP = getLucideIconMarkup('square-check-big', { size: 14 })
const CREATED_ICON_MARKUP = getLucideIconMarkup('calendar', { size: 14 })
const HOME_CARD_ID_CACHE = new WeakMap()
let homeCardIdSequence = 0

export function createHomeCharacterCardShowcase(doc, character, deps, existingActionHandle = null) {
	const domIdentifiers = createHomeCardDomIdentifiers(character)
	const card = doc.createElement('article')
	card.className = 'astra-home-card'
	card.dataset.layout = HOME_CARD_LAYOUT_IDS.showcase
	if (domIdentifiers.cardId) {
		card.id = domIdentifiers.cardId
	}
	card.dataset.characterId = String(character.id)
	if (typeof character?.name === 'string' && character.name.trim()) {
		card.dataset.characterName = character.name.trim()
	}
	card.dataset.expanded = 'false'
	const avatarSource = resolveAvatarSource(character.avatarId, deps)

	const avatarWrapper = doc.createElement('div')
	avatarWrapper.className = 'astra-home-card__avatar'
	preventCharacterImportDrop(avatarWrapper)

	const image = doc.createElement('img')
	image.className = 'astra-home-card__image'
	image.alt = character.name
	image.loading = 'lazy'
	image.decoding = 'async'
	image.draggable = false
	image.src = avatarSource
	image.onerror = () => {
		image.onerror = null
		image.src = getFallbackAvatar()
	}

	avatarWrapper.appendChild(image)

	const nameRow = doc.createElement('div')
	nameRow.className = 'astra-home-card__header'

	const nameLabel = doc.createElement('h3')
	nameLabel.className = 'astra-home-card__name'
	nameLabel.textContent = character.name
	nameLabel.title = character.name
	nameRow.appendChild(nameLabel)

	const tokenDisplay = createHomeCardTokenDisplay(doc, character)
	const tokenDisplayNode = tokenDisplay?.node ?? null
	const tokenDisplayController = tokenDisplay?.controller ?? null
	if (tokenDisplayNode) {
		nameRow.appendChild(tokenDisplayNode)
	}

	const hero = doc.createElement('div')
	hero.className = 'astra-home-card__hero'

	const coverFigure = doc.createElement('figure')
	coverFigure.className = 'astra-home-card__cover'

	const coverImage = doc.createElement('img')
	coverImage.className = 'astra-home-card__coverImage'
	coverImage.alt = `${character.name} cover`
	coverImage.loading = 'lazy'
	coverImage.decoding = 'async'
	coverImage.draggable = false
	coverImage.src = avatarSource
	coverImage.onerror = () => {
		coverImage.onerror = null
		coverImage.src = getFallbackAvatar()
	}
	coverFigure.appendChild(coverImage)

	const heroOverlay = doc.createElement('div')
	heroOverlay.className = 'astra-home-card__heroOverlay'

	const heroTopRow = doc.createElement('div')
	heroTopRow.className = 'astra-home-card__heroTopRow'
	const menuSlot = doc.createElement('div')
	menuSlot.className = 'astra-home-card__menuSlot'
	heroTopRow.appendChild(menuSlot)

	const headerSlot = doc.createElement('div')
	headerSlot.className = 'astra-home-card__headerSlot'
	headerSlot.append(avatarWrapper, nameRow)

	heroOverlay.append(heroTopRow, headerSlot)
	hero.append(coverFigure, heroOverlay)

	const content = doc.createElement('div')
	content.className = 'astra-home-card__content'

	const identityRow = doc.createElement('div')
	identityRow.className = 'astra-home-card__identity'

	const identityAvatar = doc.createElement('div')
	identityAvatar.className = 'astra-home-card__identityAvatar'

	const identityImage = doc.createElement('img')
	identityImage.className = 'astra-home-card__identityImage'
	identityImage.alt = `${character.name} avatar`
	identityImage.loading = 'lazy'
	identityImage.decoding = 'async'
	identityImage.draggable = false
	identityImage.width = 24
	identityImage.height = 24
	identityImage.src = avatarSource
	identityImage.onerror = () => {
		identityImage.onerror = null
		identityImage.src = getFallbackAvatar()
	}
	identityAvatar.appendChild(identityImage)

	const identityName = doc.createElement('span')
	identityName.className = 'astra-home-card__identityName'
	identityName.textContent = character.name
	identityName.title = character.name

	identityRow.append(identityAvatar, identityName)

	const contentInfo = doc.createElement('div')
	contentInfo.className = 'astra-home-card__info'

	const notes = doc.createElement('div')
	notes.className = 'astra-home-card__notes'
	preventCharacterImportDrop(notes)
	const notesText = resolveCreatorNotes(character)
	if (notesText) {
		notes.dataset.empty = 'false'
		notes.innerHTML = renderMarkdownToHtml(notesText)
	} else {
		notes.dataset.empty = 'true'
		notes.textContent = 'No creator notes yet.'
	}
	disableMediaDragTargets(notes)

	contentInfo.appendChild(notes)

	const tagsWrapper = doc.createElement('div')
	tagsWrapper.className = 'astra-home-card__tagsWrapper'
	const tagsRow = createHomeCardTagList(doc, character.tagBadges, {
		overflowId: domIdentifiers.tagsOverflowId,
	})
	let syncTagsExpanded = null
	if (tagsRow) {
		const { listNode, overflowNode, setExpandedState } = tagsRow
		if (typeof setExpandedState === 'function') {
			syncTagsExpanded = setExpandedState
			syncTagsExpanded(false)
		}
		if (listNode) {
			tagsWrapper.appendChild(listNode)
		}
		if (overflowNode) {
			tagsWrapper.appendChild(overflowNode)
		}
		contentInfo.appendChild(tagsWrapper)
	}

	content.append(identityRow, contentInfo)

	const footer = doc.createElement('div')
	footer.className = 'astra-home-card__footer'

	const footerLeft = doc.createElement('div')
	footerLeft.className = 'astra-home-card__footerLeft'
	const creationMeta = resolveCreationDateMeta(character, deps?.timestampToMoment)
	if (creationMeta) {
		const createdAt = doc.createElement('span')
		createdAt.className = 'astra-home-card__metaValue astra-home-card__metaValue--created'
		createdAt.dataset.empty = 'false'
		if (creationMeta.tooltip) {
			createdAt.title = creationMeta.tooltip
		}
		if (creationMeta.ariaLabel) {
			createdAt.setAttribute('aria-label', creationMeta.ariaLabel)
		}
		const createdIcon = doc.createElement('span')
		createdIcon.className = 'astra-home-card__metaIcon astra-home-card__metaIcon--created'
		createdIcon.innerHTML = CREATED_ICON_MARKUP
		const createdText = doc.createElement('span')
		createdText.className = 'astra-home-card__createdValue'
		createdText.textContent = creationMeta.displayText
		createdAt.append(createdIcon, createdText)
		footerLeft.appendChild(createdAt)
	} else {
		footerLeft.dataset.empty = 'true'
	}
	const author = doc.createElement('span')
	author.className = 'astra-home-card__metaValue astra-home-card__metaValue--author'
	const authorName = resolveCreatorName(character)
	const normalizedAuthorName = typeof authorName === 'string' ? authorName.trim() : ''
	if (normalizedAuthorName) {
		author.dataset.empty = 'false'
		const authorLabel = `Created by ${normalizedAuthorName}`
		author.title = authorLabel
		author.setAttribute('aria-label', authorLabel)
		const authorIcon = doc.createElement('span')
		authorIcon.className = 'astra-home-card__metaIcon astra-home-card__metaIcon--author'
		authorIcon.innerHTML = AUTHOR_ICON_MARKUP
		const authorText = doc.createElement('span')
		authorText.className = 'astra-home-card__authorName'
		authorText.textContent = normalizedAuthorName
		author.append(authorIcon, authorText)
	} else {
		author.dataset.empty = 'true'
		author.hidden = true
	}

	const footerRight = doc.createElement('div')
	footerRight.className = 'astra-home-card__footerRight'

	const version = doc.createElement('span')
	version.className = 'astra-home-card__metaValue astra-home-card__metaValue--version'
	const versionIcon = doc.createElement('span')
	versionIcon.className = 'astra-home-card__metaIcon astra-home-card__metaIcon--version'
	versionIcon.innerHTML = VERSION_ICON_MARKUP
	const versionText = doc.createElement('span')
	versionText.className = 'astra-home-card__versionValue'
	const versionValue = resolveCharacterVersion(character)
	const resolvedVersion = typeof versionValue === 'string' ? versionValue.trim() : ''
	if (resolvedVersion) {
		version.dataset.empty = 'false'
		const versionLabel = `Character version ${resolvedVersion}`
		version.title = versionLabel
		version.setAttribute('aria-label', versionLabel)
		versionText.textContent = resolvedVersion
	} else {
		version.dataset.empty = 'true'
		version.hidden = true
	}
	version.append(versionIcon, versionText)

	const messages = doc.createElement('span')
	messages.className = 'astra-home-card__metaValue astra-home-card__metaValue--messages'
	const messagesIcon = doc.createElement('span')
	messagesIcon.className = 'astra-home-card__messagesIcon'
	messagesIcon.innerHTML = MESSAGES_ICON_MARKUP
	const messagesValue = doc.createElement('span')
	messagesValue.className = 'astra-home-card__messagesValue'
	messagesValue.textContent = '—'
	messages.dataset.empty = 'true'
	messages.setAttribute('aria-label', 'Total messages')
	messages.append(messagesIcon, messagesValue)

	footerRight.append(author, version, messages)
	footer.append(footerLeft, footerRight)
	content.appendChild(footer)

	const actionSlots = {
		menu: menuSlot,
	}
	let actionHandle = existingActionHandle ?? null

	if (actionHandle) {
		try {
			actionHandle.render?.({ character, deps, slots: actionSlots })
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to update home card actions.', error)
			actionHandle.destroy?.()
			actionHandle = null
		}
	}

	if (!actionHandle) {
		actionHandle = renderHomeCardActions(doc, { character, deps, slots: actionSlots })
	}

	card.append(hero, content)

	const detachHeroHeightSync = syncHomeCardHeroHeight(card, hero)

	const applyCardExpansion = expanded => {
		const nextValue = expanded ? 'true' : 'false'
		if (card.dataset.expanded === nextValue) return
		card.dataset.expanded = nextValue
		syncTagsExpanded?.(expanded)
	}

	let pointerExpanded = false
	let focusExpanded = false

	const reconcileExpansion = () => {
		applyCardExpansion(pointerExpanded || focusExpanded)
	}

	const handlePointerEnter = () => {
		pointerExpanded = true
		tokenDisplayController?.markCardOpened?.()
		reconcileExpansion()
	}

	const handlePointerLeave = () => {
		pointerExpanded = false
		reconcileExpansion()
	}

	const handleFocusIn = () => {
		focusExpanded = true
		tokenDisplayController?.markCardOpened?.()
		reconcileExpansion()
	}

	const handleFocusOut = event => {
		const nextTarget = event?.relatedTarget
		if (nextTarget && content.contains(nextTarget)) {
			return
		}
		focusExpanded = false
		reconcileExpansion()
	}

	content.addEventListener('pointerenter', handlePointerEnter)
	card.addEventListener('pointerleave', handlePointerLeave)
	content.addEventListener('pointercancel', handlePointerLeave)
	content.addEventListener('focusin', handleFocusIn)
	content.addEventListener('focusout', handleFocusOut)

	const setTotalMessages = total => {
		const numeric = Number(total)
		if (!Number.isFinite(numeric) || numeric < 0) {
			messages.dataset.empty = 'true'
			messagesValue.textContent = '—'
			return
		}
		messages.dataset.empty = 'false'
		messagesValue.textContent = formatCompactCount(numeric)
	}

	return {
		element: card,
		setTotalMessages,
		actionHandle,
		refreshTokenFromCache() {
			return tokenDisplayController?.refreshFromCache?.() ?? false
		},
		setPreciseTokenCount(tokens, options) {
			return tokenDisplayController?.applyPreciseTokens?.(tokens, options) ?? false
		},
		destroy() {
			detachHeroHeightSync?.()
		},
	}
}


function resolveCreationDateMeta(character, timestampToMoment) {
	const rawValue = resolveCharacterCreationDate(character)
	if (!rawValue) return null
	const normalized = rawValue.trim()
	const fallbackLabel = `Created ${normalized}`
	const createPayload = (label, display) => ({
		displayText: display,
		tooltip: label,
		ariaLabel: label,
	})
	if (typeof timestampToMoment === 'function') {
		try {
			const momentValue = timestampToMoment(normalized)
			if (momentValue && typeof momentValue.isValid === 'function' && momentValue.isValid()) {
				const displayDate = momentValue.format('ll')
				const detailed = momentValue.format('LLL')
				const label = `Created ${detailed}`
				return createPayload(label, displayDate)
			}
		} catch {
			/* ignore invalid timestamps */
		}
	}
	return createPayload(fallbackLabel, normalized)
}

function renderHomeCardActions(doc, { character, deps, slots } = {}) {
	const hostDoc = doc ?? globalThis.document
	if (!hostDoc || typeof hostDoc.createElement !== 'function') {
		return null
	}
	const hostNode = hostDoc.createElement('div')
	try {
		const root = createRoot(hostNode)
		let lastOptions = { character, deps, slots }
		const renderWithOptions = options => {
			lastOptions = options ?? lastOptions
			try {
				const controllerOptions = {
					character: lastOptions?.character,
					deps: lastOptions?.deps,
				}
				const actions = createHomeCardActionController(controllerOptions)
				const identity = resolveHomeCardIdentity(lastOptions?.character, lastOptions?.deps)
				flushSync(() => {
					root.render(
						React.createElement(HomeCardActions, {
							actions,
							slots: lastOptions?.slots,
							identity,
						}),
					)
				})
			} catch (renderError) {
				console?.warn?.('[AstraProjecta] Failed to render home card actions.', renderError)
			}
		}
		renderWithOptions(lastOptions)
		return {
			render: renderWithOptions,
			destroy() {
				try {
					root.unmount()
				} catch (error) {
					console?.warn?.('[AstraProjecta] Failed to unmount home card actions.', error)
				}
			},
		}
	} catch (error) {
		console?.warn?.('[AstraProjecta] Failed to render home card actions.', error)
		return null
	}
}

function createHomeCardDomIdentifiers(character) {
	const suffix = resolveHomeCardDomIdSuffix(character)
	const cardId = suffix ? `astra-home-card-${suffix}` : ''
	const tagsOverflowId = suffix ? `astraHomeCardTagsOverflow-${suffix}` : ''
	return {
		cardId,
		tagsOverflowId,
	}
}

function resolveHomeCardDomIdSuffix(character) {
	if (character && typeof character === 'object') {
		const cached = HOME_CARD_ID_CACHE.get(character)
		if (cached) {
			return cached
		}
		const computed = computeHomeCardDomIdSuffix(character)
		HOME_CARD_ID_CACHE.set(character, computed)
		return computed
	}
	return computeHomeCardDomIdSuffix(character)
}

function computeHomeCardDomIdSuffix(character) {
	const fromKey = sanitizeDomIdSegment(resolveCharacterKey(character))
	if (fromKey) {
		return `character-${fromKey}`
	}
	const fromName = sanitizeDomIdSegment(typeof character?.name === 'string' ? character.name : '')
	if (fromName) {
		return `name-${fromName}`
	}
	const fromAvatar = sanitizeDomIdSegment(typeof character?.avatarId === 'string' ? character.avatarId : '')
	if (fromAvatar) {
		return `avatar-${fromAvatar}`
	}
	homeCardIdSequence += 1
	return `generated-${homeCardIdSequence}`
}

function resolveHomeCardIdentity(character, deps = {}) {
	if (!character) return null
	const name = typeof character?.name === 'string' && character.name.trim() ? character.name.trim() : 'Character'
	return {
		name,
		avatarUrl: resolveAvatarSource(character?.avatarId, deps),
	}
}

function sanitizeDomIdSegment(value) {
	if (typeof value !== 'string') {
		return ''
	}
	const normalized = value.trim().toLowerCase()
	if (!normalized) {
		return ''
	}
	return normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function syncHomeCardHeroHeight(card, hero) {
	if (!card || !hero) return null
	if (typeof ResizeObserver === 'undefined') {
		return null
	}

	const applyHeroHeight = nextHeight => {
		const numericHeight = typeof nextHeight === 'number' ? nextHeight : Number(nextHeight)
		if (!Number.isFinite(numericHeight) || numericHeight <= 0) {
			return
		}
		card.style.setProperty('--home-card-hero-height', `${numericHeight}px`)
	}

	const observer = new ResizeObserver(entries => {
		for (const entry of entries) {
			const blockSize = resolveResizeEntryBlockSize(entry)
			if (blockSize) {
				applyHeroHeight(blockSize)
			}
		}
	})
	observer.observe(hero)

	return () => observer.disconnect()
}

function resolveResizeEntryBlockSize(entry) {
	if (!entry) return null
	const borderBoxSize = Array.isArray(entry?.borderBoxSize)
		? entry.borderBoxSize[0]
		: entry?.borderBoxSize
	if (borderBoxSize && typeof borderBoxSize?.blockSize === 'number') {
		return borderBoxSize.blockSize
	}
	const contentRect = entry?.contentRect
	if (contentRect && typeof contentRect?.height === 'number') {
		return contentRect.height
	}
	return null
}
