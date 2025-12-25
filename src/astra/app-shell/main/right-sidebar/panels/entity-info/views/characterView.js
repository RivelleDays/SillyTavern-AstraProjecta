import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'
import { renderMarkdownToHtml } from '@/astra/shared/markdown/renderMarkdown.js'
import { resolveFullAvatarUrl, buildAvatarUrlFromFileId } from '../../../../../../utils/avatarSources.js'
import { createLabelTabs } from '../../../../../../shared/components/index.js'
import { createEntityInfoTabs } from '../components/entityInfoTabs.js'
import { createEntityShowcaseHeader } from '../components/headers/createEntityShowcaseHeader.js'
import { createCharacterGalleryView } from './characterGalleryView.js'

const FALLBACK_AVATAR = '/img/five.png'
const AVATAR_TYPE_HINT = 'avatar'
const URL_FIELDS = [
	'avatar_url',
	'avatar_img',
	'img',
	'image_url',
	'thumbnail',
]
const ID_FIELDS = ['avatar', 'avatarId', 'avatar_file', 'avatarFile']
const NUMBER_FORMATTER = new Intl.NumberFormat()
const CHARACTERS_PER_TOKEN_RATIO = 3.35
const TOKENS_ICON = getLucideIconMarkup('braces')
const VIEW_MODE_TOGGLE_ICON = getLucideIconMarkup('arrow-right-left')
const PROFILE_TAB_ICON = getLucideIconMarkup('sparkle')
const CARD_INFO_TAB_ICON = getLucideIconMarkup('id-card-lanyard')
const LOREBOOK_TAB_ICON = getLucideIconMarkup('book-lock')
const GALLERY_TAB_ICON = getLucideIconMarkup('images')

const CARD_VIEW_MODE_STORAGE_PREFIX = 'astra.characterInfoCard.viewMode.'

function resolveLocalStorage() {
	try {
		const scope = typeof globalThis !== 'undefined' ? globalThis : window
		return scope?.localStorage ?? null
	} catch (error) {
		console.debug('Character view: localStorage is unavailable.', error)
		return null
	}
}

function readCardViewModePreference(key) {
	if (typeof key !== 'string' || !key) return null
	const storage = resolveLocalStorage()
	if (!storage) return null

	try {
		const value = storage.getItem(key)
		return value === 'preview' ? 'preview' : value === 'raw' ? 'raw' : null
	} catch (error) {
		console.debug('Character view: failed to read view mode preference.', error)
		return null
	}
}

function persistCardViewModePreference(key, mode) {
	if (typeof key !== 'string' || !key) return
	const storage = resolveLocalStorage()
	if (!storage) return

	try {
		if (mode === 'preview' || mode === 'raw') {
			storage.setItem(key, mode)
		} else {
			storage.removeItem(key)
		}
	} catch (error) {
		console.debug('Character view: failed to persist view mode preference.', error)
	}
}

function resolveCharacterAvatar(entity) {
	if (!entity || typeof entity !== 'object') {
		return FALLBACK_AVATAR
	}

	for (const field of URL_FIELDS) {
		const candidate = entity[field]
		if (typeof candidate === 'string' && candidate.trim()) {
			const resolved = resolveFullAvatarUrl(candidate, { typeHint: AVATAR_TYPE_HINT })
			if (resolved) return resolved
		}
	}

	for (const field of ID_FIELDS) {
		const candidate = entity[field]
		if (typeof candidate === 'string' && candidate.trim()) {
			const resolved = buildAvatarUrlFromFileId(candidate, AVATAR_TYPE_HINT)
			if (resolved) return resolved
		}
	}

	return FALLBACK_AVATAR
}

function formatNumber(value) {
	if (value === null || value === undefined) return null
	const numeric = Number(value)
	if (!Number.isFinite(numeric)) return null
	return NUMBER_FORMATTER.format(numeric)
}

function getTokenNodeText(id) {
	const node = typeof document !== 'undefined' ? document.getElementById(id) : null
	if (!node) return null
	const text = node.textContent
	if (typeof text !== 'string') return null
	const trimmed = text.trim()
	return trimmed || null
}

function estimateTokenCount(text) {
	if (typeof text !== 'string') return 0
	const value = text.trim()
	if (!value) return 0
	return Math.ceil(value.length / CHARACTERS_PER_TOKEN_RATIO)
}

export function createCharacterView({ toolbar, eventSource, event_types } = {}) {
	const toolbarElement = toolbar?.element ?? null
	const toolbarTabsSlot = toolbar?.tabsSlot ?? null

	const root = document.createElement('article')
	root.className = 'entity-info-character charInfo'

	const headerHost = document.createElement('div')
	headerHost.className = 'entity-info-header-host'

	const showcaseHeader = createEntityShowcaseHeader({ fallbackAvatar: FALLBACK_AVATAR })
	headerHost.append(showcaseHeader.root)

	const bodyContainer = document.createElement('section')
	bodyContainer.className = 'charInfoBody'

	const statList = document.createElement('ul')
	statList.className = 'character-info-top__stats'

	const topDetails = document.createElement('div')
	topDetails.className = 'character-info-top__details'

	function makeStatItem(icon) {
		const item = document.createElement('li')
		item.className = 'character-info-top__stat'

		const iconWrapper = document.createElement('span')
		iconWrapper.className = 'character-info-top__stat-icon'
		iconWrapper.setAttribute('aria-hidden', 'true')
		iconWrapper.innerHTML = icon

		const content = document.createElement('div')
		content.className = 'character-info-top__stat-content'

		const primaryEl = document.createElement('span')
		primaryEl.className = 'character-info-top__stat-primary'
		primaryEl.textContent = '—'

		const secondaryEl = document.createElement('span')
		secondaryEl.className = 'character-info-top__stat-secondary'
		secondaryEl.hidden = true

		content.append(primaryEl, secondaryEl)
		item.append(iconWrapper, content)

		return { item, primary: primaryEl, secondary: secondaryEl }
	}

	const tokensStat = makeStatItem(TOKENS_ICON)

	const accentTabsContainer = document.createElement('div')
	accentTabsContainer.className = 'character-info-accent-tabs'

	const profilePanel = document.createElement('div')
	profilePanel.className = 'character-info-profile-panel'

	function makeAccentPanel(text) {
		const block = document.createElement('div')
		block.className = 'character-info-accent-panel'
		block.textContent = text
		return block
	}

	function createCardInfoContentView({ multiline = true, placeholder = '—', onChange, storageKey } = {}) {
		const toolbar = document.createElement('div')
		toolbar.className = 'character-info-card-toolbar'

		const controls = document.createElement('div')
		controls.className = 'character-info-card-toolbar__controls'
		toolbar.append(controls)

		const toggleButton = document.createElement('button')
		toggleButton.type = 'button'
		toggleButton.className = 'character-info-card-toolbar__toggle'
		toggleButton.setAttribute('aria-pressed', 'false')
		toggleButton.disabled = true

		const iconWrapper = document.createElement('span')
		iconWrapper.className = 'character-info-card-toolbar__toggle-icon'
		iconWrapper.setAttribute('aria-hidden', 'true')
		iconWrapper.innerHTML = VIEW_MODE_TOGGLE_ICON

		const toggleLabel = document.createElement('span')
		toggleLabel.className = 'character-info-card-toolbar__toggle-label'
		toggleLabel.textContent = 'Markdown Preview'

		controls.append(toggleButton)
		toggleButton.append(iconWrapper, toggleLabel)

		const tokensDisplay = document.createElement('span')
		tokensDisplay.className = 'character-info-card-toolbar__tokens'
		tokensDisplay.textContent = '— Tokens'
		toolbar.append(tokensDisplay)

		const contentWrapper = document.createElement('div')
		contentWrapper.className = 'character-info-field__content-wrapper'
		contentWrapper.dataset.viewMode = 'raw'

		const rawContent = document.createElement(multiline ? 'pre' : 'div')
		rawContent.className = 'character-info-field__content character-info-field__content--raw'
		rawContent.textContent = placeholder

		const previewContent = document.createElement('div')
		previewContent.className = 'character-info-field__content character-info-field__content--preview'
		previewContent.hidden = true
		previewContent.textContent = placeholder

		contentWrapper.append(rawContent, previewContent)

		const preferenceKey = typeof storageKey === 'string' && storageKey ? storageKey : null
		const storedViewMode = preferenceKey ? readCardViewModePreference(preferenceKey) : null
		let preferredViewMode = storedViewMode ?? 'raw'
		let currentText = ''
		let hasContent = false
		let viewMode = 'raw'

		function updateToggleLabel() {
			const label = viewMode === 'preview' ? 'Raw Source' : 'Markdown Preview'
			toggleLabel.textContent = label
			toggleButton.title = label
			toggleButton.setAttribute('aria-pressed', viewMode === 'preview' ? 'true' : 'false')
			toggleButton.dataset.viewMode = viewMode
			toolbar.dataset.viewMode = viewMode
			contentWrapper.dataset.viewMode = viewMode
		}

		function updateTokens() {
			if (!hasContent) {
				tokensDisplay.textContent = '— Tokens'
				tokensDisplay.dataset.empty = 'true'
				return
			}

			const count = estimateTokenCount(currentText)
			if (count > 0) {
				const formatted = formatNumber(count) ?? String(count)
				tokensDisplay.textContent = `${formatted} Tokens`
				tokensDisplay.dataset.empty = 'false'
			} else {
				tokensDisplay.textContent = '— Tokens'
				tokensDisplay.dataset.empty = 'true'
			}
		}

		function updatePreview() {
			if (!hasContent) {
				previewContent.innerHTML = ''
				previewContent.textContent = placeholder
				return
			}

			const html = renderMarkdownToHtml(currentText)
			if (html) {
				previewContent.innerHTML = html
			} else {
				previewContent.textContent = currentText
			}
		}

		function setViewMode(nextMode, { persistPreference = true } = {}) {
			const targetMode = nextMode === 'preview' ? 'preview' : 'raw'
			if (targetMode === viewMode) {
				if (persistPreference && targetMode !== preferredViewMode) {
					preferredViewMode = targetMode
					if (preferenceKey) {
						persistCardViewModePreference(preferenceKey, preferredViewMode)
					}
				}
				return
			}
			viewMode = targetMode
			rawContent.hidden = viewMode === 'preview'
			previewContent.hidden = viewMode !== 'preview'
			updateToggleLabel()

			if (persistPreference) {
				preferredViewMode = viewMode
				if (preferenceKey) {
					persistCardViewModePreference(preferenceKey, preferredViewMode)
				}
			}
		}

		function setValue(nextValue) {
			const text = typeof nextValue === 'string' ? nextValue.trim() : ''
			const contentChanged = hasContent !== Boolean(text)
			currentText = text
			hasContent = Boolean(text)

			if (hasContent) {
				rawContent.textContent = currentText
			} else {
				rawContent.textContent = placeholder
			}

			updatePreview()
			updateTokens()

			toggleButton.disabled = !hasContent
			if (!hasContent && viewMode === 'preview') {
				setViewMode('raw', { persistPreference: false })
			}

			if (hasContent && preferredViewMode !== viewMode) {
				setViewMode(preferredViewMode, { persistPreference: false })
			}

			if (typeof onChange === 'function' && contentChanged) {
				onChange(hasContent)
			}
		}

		toggleButton.addEventListener('click', () => {
			if (toggleButton.disabled) return
			setViewMode(viewMode === 'preview' ? 'raw' : 'preview')
		})

		// Initialize default state.
		setViewMode(preferredViewMode, { persistPreference: false })
		updateToggleLabel()
		updateTokens()

		return {
			toolbar,
			container: contentWrapper,
			rawContent,
			previewContent,
			tokensDisplay,
			toggleButton,
			setValue,
			setViewMode,
			isEmpty: () => !hasContent,
			hasContent: () => hasContent,
		}
	}

	function createCardInfoTextTab({ id, label, multiline = true, placeholder = '—' } = {}) {
		const node = document.createElement('div')
		node.className = 'character-info-card-tab'

		const storageKey =
			typeof id === 'string' && id ? `${CARD_VIEW_MODE_STORAGE_PREFIX}${id}` : null

		const fieldView = createCardInfoContentView({
			multiline,
			placeholder,
			onChange(hasContent) {
				node.dataset.empty = hasContent ? 'false' : 'true'
			},
			storageKey,
		})

		node.append(fieldView.container, fieldView.toolbar)

		function setValue(nextValue) {
			fieldView.setValue(nextValue)
		}

		function isEmpty() {
			return fieldView.isEmpty()
		}

		node.dataset.empty = 'true'
		fieldView.setValue(null)

		return { id, label, node, content: fieldView.rawContent, setValue, isEmpty }
	}

	function pickString(...candidates) {
		for (const candidate of candidates) {
			if (typeof candidate !== 'string') continue
			const trimmed = candidate.trim()
			if (trimmed) return trimmed
		}

		return null
	}

	function resolveCardDataSources(entity) {
		if (!entity || typeof entity !== 'object') {
			return { entity: null, data: null, cardData: null }
		}

		const data = entity.data && typeof entity.data === 'object' ? entity.data : null
		const card = entity.card && typeof entity.card === 'object' ? entity.card : null
		const cardData = card?.data && typeof card.data === 'object' ? card.data : null

		return { entity, data, cardData }
	}

	function createCardInfoPanel() {
		const panel = document.createElement('div')
		panel.className = 'character-info-card-panel'

		const descriptionField = createCardInfoTextTab({ id: 'description', label: 'Description' })
		const personalityField = createCardInfoTextTab({ id: 'personality', label: 'Personality' })
		const scenarioField = createCardInfoTextTab({ id: 'scenario', label: 'Scenario' })

		const cardTabs = createLabelTabs(
			[
				{
					id: descriptionField.id,
					label: descriptionField.label,
					content: descriptionField.node,
					disabled: descriptionField.isEmpty(),
				},
				{
					id: personalityField.id,
					label: personalityField.label,
					content: personalityField.node,
					disabled: personalityField.isEmpty(),
				},
				{
					id: scenarioField.id,
					label: scenarioField.label,
					content: scenarioField.node,
					disabled: scenarioField.isEmpty(),
				},
			],
			{
				idPrefix: 'character-info-card',
				defaultActiveId: descriptionField.id,
			},
		)

		panel.append(cardTabs.root)

		function syncCardTabAvailability() {
			cardTabs.setAvailability(descriptionField.id, { disabled: descriptionField.isEmpty() })
			cardTabs.setAvailability(personalityField.id, { disabled: personalityField.isEmpty() })
			cardTabs.setAvailability(scenarioField.id, { disabled: scenarioField.isEmpty() })
		}

		syncCardTabAvailability()

		function update({ meta, entity } = {}) {
			const sources = resolveCardDataSources(entity ?? null)

			const description = pickString(
				meta?.description,
				sources.data?.description,
				sources.cardData?.description,
				sources.entity?.description,
			)
			descriptionField.setValue(description)

			const personality = pickString(
				meta?.personality,
				sources.data?.personality,
				sources.cardData?.personality,
				sources.entity?.personality,
			)
			personalityField.setValue(personality)

			const scenario = pickString(
				meta?.scenario,
				sources.data?.scenario,
				sources.cardData?.scenario,
				sources.entity?.scenario,
			)
			scenarioField.setValue(scenario)

			syncCardTabAvailability()
		}

		return { panel, update, tabs: cardTabs }
	}

	const cardInfoPanel = createCardInfoPanel()

	const galleryView = createCharacterGalleryView({ eventSource, event_types })

	const syncGalleryActive = isActive => {
		if (typeof galleryView.setActive === 'function') {
			galleryView.setActive(isActive).catch(error => {
				console.debug('Character view: failed to update gallery state.', error)
			})
		}
	}

	const tabItems = [
		{
			id: 'profile',
			title: 'Profile',
			icon: PROFILE_TAB_ICON,
			content: profilePanel,
		},
		{
			id: 'card-info',
			title: 'Card Info',
			icon: CARD_INFO_TAB_ICON,
			content: cardInfoPanel.panel,
		},
		{
			id: 'lorebook',
			title: 'Character Book',
			icon: LOREBOOK_TAB_ICON,
			content: makeAccentPanel('Character Book content placeholder.'),
		},
		{
			id: 'gallery',
			title: 'Gallery',
			icon: GALLERY_TAB_ICON,
			content: galleryView.root,
		},
	]

	const entityTabs = createEntityInfoTabs(tabItems, {
		idPrefix: 'character-info-accent',
		tabsSlot: toolbarTabsSlot,
		onChange: (nextId) => {
			root.dataset.activeTab = nextId || ''
			syncGalleryActive(nextId === 'gallery')
		},
	})

	accentTabsContainer.append(entityTabs.root)

	statList.append(tokensStat.item)
	topDetails.append(statList)
	profilePanel.append(topDetails)

	bodyContainer.append(accentTabsContainer)
	root.append(headerHost)
	if (toolbarElement) {
		root.append(toolbarElement)
	}
	root.append(bodyContainer)

	const initialTabId = tabItems[0]?.id ?? ''
	if (initialTabId) {
		root.dataset.activeTab = initialTabId
	} else {
		delete root.dataset.activeTab
	}
	entityTabs.accentTabs.updateCurrentHeading()
	syncGalleryActive(initialTabId === 'gallery')

	tokensStat.primary.textContent = 'Tokens —'
	tokensStat.secondary.hidden = true

	function updateTokensStat() {
		const totalText = getTokenNodeText('result_info_total_tokens')
		const permanentText = getTokenNodeText('result_info_permanent_tokens')

		const totalDisplay = totalText ? formatNumber(totalText) ?? totalText : null
		const permanentDisplay = permanentText ? formatNumber(permanentText) ?? permanentText : null

		if (totalDisplay) {
			tokensStat.primary.textContent = `${totalDisplay} Tokens`
		} else {
			tokensStat.primary.textContent = 'Tokens —'
		}

		if (permanentDisplay) {
			tokensStat.secondary.textContent = `(${permanentDisplay} permanent)`
			tokensStat.secondary.hidden = false
		} else {
			tokensStat.secondary.hidden = true
			tokensStat.secondary.textContent = ''
		}
	}

	function update({ meta, entity } = {}) {
		const targetEntity = entity || meta?.entity || null
		const displayName = meta?.name || targetEntity?.name || targetEntity?.display_name || ''

		if (meta?.name) {
			root.dataset.entityName = String(meta.name)
		} else {
			delete root.dataset.entityName
		}

		const resolvedAvatar = resolveCharacterAvatar(targetEntity) || FALLBACK_AVATAR
		const coverAlt = displayName ? `${displayName} cover` : 'Character cover'
		const avatarAlt = displayName ? `${displayName} portrait` : 'Character portrait'

		showcaseHeader.setCover(resolvedAvatar, coverAlt)
		showcaseHeader.setAvatar(resolvedAvatar, avatarAlt)
		showcaseHeader.setName(displayName)

		updateTokensStat()
		cardInfoPanel.update({ meta, entity: targetEntity })
		galleryView.update?.({ meta, entity: targetEntity })
	}

	function destroy() {
		entityTabs.destroy()
		showcaseHeader.destroy()
		delete root.dataset.activeTab
		delete root.dataset.entityName
		syncGalleryActive(false)
		galleryView.destroy?.()

		root.replaceChildren()
	}

	return {
		root,
		update,
		destroy,
	}
}
