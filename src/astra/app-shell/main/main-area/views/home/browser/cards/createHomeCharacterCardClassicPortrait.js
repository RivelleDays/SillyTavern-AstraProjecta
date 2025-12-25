import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { renderMarkdownToHtml } from '@/astra/shared/markdown/renderMarkdown.js'
import { getLucideIconMarkup } from '@/astra/shared/icons/lucide.js'
import { HomeCardActions } from '../../components/HomeCardActions.jsx'
import { createHomeCardActionController } from '../../components/cardActionsController.js'
import { HOME_CARD_LAYOUT_IDS } from '../../state/homeCardLayoutStore.js'
import { disableMediaDragTargets, preventCharacterImportDrop } from '../shared/browserDomGuards.js'
import { getFallbackAvatar, resolveAvatarSource } from '../shared/avatarSources.js'
import { formatCompactCount } from './homeCardNumberFormat.js'
import { createHomeCardTagList } from './homeCardTags.js'
import { createHomeCardTokenDisplay } from './homeCardTokenDisplay.js'
import { resolveCharacterVersion, resolveCreatorName, resolveCreatorNotes } from './homeCardData.js'

const MESSAGES_ICON_MARKUP = getLucideIconMarkup('messages-square', { size: 14 })
const AUTHOR_ICON_MARKUP = getLucideIconMarkup('user-pen', { size: 14 })
const VERSION_ICON_MARKUP = getLucideIconMarkup('square-check-big', { size: 14 })

export function createHomeCharacterCardClassicPortrait(doc, character, deps, existingActionHandle = null) {
	const card = doc.createElement('article')
	card.className = 'astra-home-card'
	card.dataset.layout = HOME_CARD_LAYOUT_IDS.classicPortrait
	card.dataset.characterId = String(character.id)
	if (typeof character?.name === 'string' && character.name.trim()) {
		card.dataset.characterName = character.name.trim()
	}

	const avatarSource = resolveAvatarSource(character.avatarId, deps)

	const hero = doc.createElement('div')
	hero.className = 'astra-home-card__hero'
	preventCharacterImportDrop(hero)

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

	const classicOverlayBody = doc.createElement('div')
	classicOverlayBody.className = 'astra-home-card__classicOverlayBody'

	const headerSlot = doc.createElement('div')
	headerSlot.className = 'astra-home-card__headerSlot'

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

	const nameLabel = doc.createElement('h3')
	nameLabel.className = 'astra-home-card__name'
	nameLabel.textContent = character.name
	nameLabel.title = character.name

	const tokenDisplay = createHomeCardTokenDisplay(doc, character)
	const tokenDisplayNode = tokenDisplay?.node ?? null
	const tokenDisplayController = tokenDisplay?.controller ?? null

	const classicContent = doc.createElement('div')
	classicContent.className = 'astra-home-card__classicContent'
	const classicContentTop = doc.createElement('div')
	classicContentTop.className = 'astra-home-card__classicContentTop'

	const metaRow = doc.createElement('div')
	metaRow.className = 'astra-home-card__metaRow'

	const metaLeft = doc.createElement('div')
	metaLeft.className = 'astra-home-card__metaCluster astra-home-card__metaCluster--left'
	metaLeft.appendChild(messages)

	if (tokenDisplayNode) {
		const metaRight = doc.createElement('div')
		metaRight.className = 'astra-home-card__metaCluster astra-home-card__metaCluster--right'
		metaRight.appendChild(tokenDisplayNode)
		metaRow.append(metaLeft, metaRight)
	} else {
		metaRow.appendChild(metaLeft)
	}

	classicContentTop.append(nameLabel, metaRow)
	classicContent.appendChild(classicContentTop)

	headerSlot.appendChild(classicContent)

	classicOverlayBody.appendChild(headerSlot)
	heroOverlay.append(heroTopRow, classicOverlayBody)
	hero.append(coverFigure, heroOverlay)
	disableMediaDragTargets(hero)

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

	const content = doc.createElement('div')
	content.className = 'astra-home-card__content'

	const contentInfo = doc.createElement('div')
	contentInfo.className = 'astra-home-card__info'

	const notesText = resolveCreatorNotes(character)
	const normalizedNotesText = typeof notesText === 'string' ? notesText.trim() : ''
	if (normalizedNotesText) {
		const notes = doc.createElement('div')
		notes.className = 'astra-home-card__notes'
		preventCharacterImportDrop(notes)
		notes.dataset.empty = 'false'
		notes.innerHTML = renderMarkdownToHtml(normalizedNotesText)
		disableMediaDragTargets(notes)
		contentInfo.appendChild(notes)
	}

	const tagsRow = createHomeCardTagList(doc, character.tagBadges)
	if (tagsRow) {
		const tagsWrapper = doc.createElement('div')
		tagsWrapper.className = 'astra-home-card__tagsWrapper'
		const { listNode, overflowNode } = tagsRow
		if (listNode) {
			tagsWrapper.appendChild(listNode)
		}
		if (overflowNode) {
			tagsWrapper.appendChild(overflowNode)
		}
		if (tagsWrapper.childElementCount > 0) {
			contentInfo.appendChild(tagsWrapper)
		}
	}

	if (contentInfo.childElementCount > 0) {
		content.appendChild(contentInfo)
	}

	const footerHasContent = !author.hidden || !version.hidden
	if (footerHasContent) {
		const footer = doc.createElement('div')
		footer.className = 'astra-home-card__footer'
		const footerRight = doc.createElement('div')
		footerRight.className = 'astra-home-card__footerRight'

		footerRight.append(author, version)
		footer.appendChild(footerRight)
		content.appendChild(footer)
	}

	classicOverlayBody.appendChild(content)
	card.appendChild(hero)

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
		destroy() {},
	}
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

function resolveHomeCardIdentity(character, deps = {}) {
	if (!character) return null
	const name = typeof character?.name === 'string' && character.name.trim() ? character.name.trim() : 'Character'
	return {
		name,
		avatarUrl: resolveAvatarSource(character?.avatarId, deps),
	}
}
