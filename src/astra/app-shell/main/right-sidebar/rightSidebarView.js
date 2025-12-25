import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'
import { createChatInfo } from './panels/chat-info/index.js'
import { createCharacterPortrait } from './panels/portrait/index.js'
import { OPEN_CHARACTER_PORTRAIT_PANEL_EVENT } from './panels/portrait/events/eventNames.js'
import { createLoreContainers } from './panels/lore-info/ui/containers.js'
import { createEntityInfoPanel } from './panels/entity-info/index.js'
import { TOGGLE_ENTITY_INFO_PANEL_EVENT } from './panels/entity-info/events/eventNames.js'

const LOREBOOKS_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-world-search"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M21 12a9 9 0 1 0 -9 9" /><path d="M3.6 9h16.8" /><path d="M3.6 15h7.9" /><path d="M11.5 3a17 17 0 0 0 0 18" /><path d="M12.5 3a16.984 16.984 0 0 1 2.574 8.62" /><path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M20.2 20.2l1.8 1.8" /></svg>'
const STUDIO_ICON = '<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-sparkles"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6z" /></svg>'
const SPRITE_ICON = '<svg  xmlns="http://www.w3.org/2000/svg"  width="24"  height="24"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="2"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-video"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 10l4.553 -2.276a1 1 0 0 1 1.447 .894v6.764a1 1 0 0 1 -1.447 .894l-4.553 -2.276v-4z" /><path d="M3 6m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /></svg>'
const BACKGROUND_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-photo"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 8h.01" /><path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z" /><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5" /><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3" /></svg>'
const BACKGROUND_HEADING_ICON = getLucideIconMarkup('image')

export function createRightSidebarView({
	controller,
	resolveCurrentEntity,
	eventSource,
	event_types: eventTypes,
} = {}) {
	const rightSidebar = document.createElement('aside')
	rightSidebar.id = 'rightSidebar'

	const rightSidebarContent = document.createElement('div')
	rightSidebarContent.id = 'rightSidebarContent'
	rightSidebar.append(rightSidebarContent)

	const loreContainers = createLoreContainers()

	const { panel: chatInfoPanel } = createChatInfo()
	const { panel: entityInfoPanel, updateEntityInfo } = createEntityInfoPanel({
		resolveCurrentEntity,
		eventSource,
		event_types: eventTypes,
	})
	const { panel: portraitPanel, refreshZoomedAvatar } = createCharacterPortrait({
		eventSource,
		event_types: eventTypes,
	})

	const backgroundPanel = document.createElement('div')
	backgroundPanel.id = 'backgroundPanel'
	const backgroundTitleSlot = document.createElement('div')
	backgroundTitleSlot.className = 'secondary-title-slot'
	const backgroundHeadingSlot = document.createElement('div')
	backgroundHeadingSlot.className = 'secondary-title-slot__heading'

	const backgroundHeading = document.createElement('div')
	backgroundHeading.className = 'sts-heading'

	const backgroundHeadingIcon = document.createElement('span')
	backgroundHeadingIcon.className = 'sts-heading__icon'
	backgroundHeadingIcon.innerHTML = BACKGROUND_HEADING_ICON

	const backgroundHeadingDivider = document.createElement('span')
	backgroundHeadingDivider.className = 'sts-heading__divider'

	const backgroundHeadingLabel = document.createElement('span')
	backgroundHeadingLabel.className = 'sts-heading__label'
	backgroundHeadingLabel.textContent = 'Backgrounds'

	backgroundHeading.append(backgroundHeadingIcon, backgroundHeadingDivider, backgroundHeadingLabel)
	backgroundHeadingSlot.append(backgroundHeading)
	backgroundTitleSlot.append(backgroundHeadingSlot)

	const backgroundDrawerHost = document.createElement('div')
	backgroundDrawerHost.id = 'backgroundDrawerHost'

	backgroundPanel.append(backgroundTitleSlot, backgroundDrawerHost)

	const loreButton = document.createElement('button')
	loreButton.id = 'loreButton'
	loreButton.className = 'icon-button'
	loreButton.innerHTML = LOREBOOKS_ICON
	loreButton.title = 'Worlds/Lorebooks Info'

	const loreBadge = document.createElement('span')
	loreBadge.className = 'lore-badge'
	loreBadge.textContent = '0'
	loreBadge.style.display = 'none'
	loreButton.append(loreBadge)

	const chatInfoButton = document.createElement('button')
	chatInfoButton.id = 'chatInfoButton'
	chatInfoButton.className = 'icon-button'
	chatInfoButton.innerHTML = STUDIO_ICON
	chatInfoButton.title = 'Chat Info'

	const backgroundButton = document.createElement('button')
	backgroundButton.id = 'backgroundButton'
	backgroundButton.className = 'icon-button'
	backgroundButton.innerHTML = BACKGROUND_ICON
	backgroundButton.title = 'Backgrounds'

	const portraitButton = document.createElement('button')
	portraitButton.id = 'portraitButton'
	portraitButton.className = 'icon-button'
	portraitButton.innerHTML = SPRITE_ICON
	portraitButton.title = 'Character Portrait'

	const entityInfoTriggers = new Set()
	const entityInfoTriggerHandlers = new Map()

	const rightSidebarPanelElements = {
		lore: { button: loreButton, panel: loreContainers.root },
		chatInfo: { button: chatInfoButton, panel: chatInfoPanel },
		entityInfo: { button: null, panel: entityInfoPanel, triggers: entityInfoTriggers },
		backgrounds: { button: backgroundButton, panel: backgroundPanel },
		portrait: { button: portraitButton, panel: portraitPanel },
	}

	controller?.setPanelIds(Object.keys(rightSidebarPanelElements))

	function applyPanelState(stateParam) {
		const snapshot = stateParam || controller?.getState() || {
			activePanel: null,
			isOpen: false,
		}
		const { activePanel, isOpen } = snapshot
		const isSidebarOpen = !!isOpen

		document.body.classList.toggle('right-sidebar-open', isSidebarOpen)

		Object.entries(rightSidebarPanelElements).forEach(([panelId, entry]) => {
			const isActivePanel = panelId === activePanel && isSidebarOpen

			if (entry.button) {
				entry.button.classList.toggle('active', isActivePanel)
			}

			if (entry.triggers instanceof Set) {
				entry.triggers.forEach(trigger => {
					trigger.classList.toggle('active', isActivePanel)
					trigger.setAttribute('aria-expanded', String(isActivePanel))
				})
			}

			if (entry.panel) {
				entry.panel.style.display = isActivePanel ? '' : 'none'
			}
		})
	}

	controller?.subscribe(({ state }) => {
		applyPanelState(state)
	})

	function updateEntityInfoTriggerLabels(label = controller.getEntityInfoLabel()) {
		const resolvedLabel = label || controller.getEntityInfoLabel()
		entityInfoTriggers.forEach(trigger => {
			trigger.title = resolvedLabel
			trigger.setAttribute('aria-label', resolvedLabel)
		})
	}

	controller?.subscribeToEntityInfoLabel(updateEntityInfoTriggerLabels)

	function toggleRightSidebar(panelId) {
		if (panelId && !rightSidebarPanelElements[panelId]) {
			return
		}
		controller?.togglePanel(panelId)
	}

	function openRightSidebarPanel(panelId) {
		if (!panelId || !rightSidebarPanelElements[panelId]) {
			return
		}
		const previousState = controller?.getState() || {}
		controller?.openPanel(panelId)
		const state = controller?.getState() || {}

		if (
			state.activePanel === previousState.activePanel &&
			state.isOpen === previousState.isOpen &&
			state.lastPanel === previousState.lastPanel
		) {
			applyPanelState(state)
		}
	}

	function handleEntityInfoToggle() {
		toggleRightSidebar('entityInfo')
		if (typeof updateEntityInfo === 'function') {
			updateEntityInfo()
		}
		updateEntityInfoTriggerLabels()
	}

	function registerEntityInfoTrigger(triggerElement) {
		if (!(triggerElement instanceof HTMLElement)) {
			return
		}
		if (entityInfoTriggerHandlers.has(triggerElement)) {
			return
		}

		const handleClick = event => {
			event.preventDefault()
			handleEntityInfoToggle()
		}

		triggerElement.addEventListener('click', handleClick)

		let handleKeyDown = null
		if (triggerElement.tagName !== 'BUTTON') {
			if (!triggerElement.hasAttribute('role')) {
				triggerElement.setAttribute('role', 'button')
			}
			if (triggerElement.tabIndex < 0) {
				triggerElement.tabIndex = 0
			}
			handleKeyDown = event => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					handleEntityInfoToggle()
				}
			}
			triggerElement.addEventListener('keydown', handleKeyDown)
		}

		triggerElement.classList.add('entity-info-trigger')
		triggerElement.setAttribute('aria-haspopup', 'true')
		if (entityInfoPanel.id) {
			triggerElement.setAttribute('aria-controls', entityInfoPanel.id)
		}

		entityInfoTriggerHandlers.set(triggerElement, { handleClick, handleKeyDown })
		entityInfoTriggers.add(triggerElement)

		updateEntityInfoTriggerLabels()
		applyPanelState()
		controller?.refreshEntityInfoLabel()
	}

	loreButton.addEventListener('click', () => toggleRightSidebar('lore'))
	chatInfoButton.addEventListener('click', () => toggleRightSidebar('chatInfo'))
	backgroundButton.addEventListener('click', () => toggleRightSidebar('backgrounds'))
	portraitButton.addEventListener('click', () => toggleRightSidebar('portrait'))

	document.addEventListener(TOGGLE_ENTITY_INFO_PANEL_EVENT, handleEntityInfoToggle)
	document.addEventListener(OPEN_CHARACTER_PORTRAIT_PANEL_EVENT, () => {
		openRightSidebarPanel('portrait')
	})

	controller?.refreshEntityInfoLabel()
	applyPanelState()

	return {
		rightSidebar,
		rightSidebarContent,
		loreContainers,
		chatInfoPanel,
		entityInfoPanel,
		backgroundPanel,
		backgroundDrawerHost,
		portraitPanel,
		refreshZoomedAvatar,
		loreButton,
		loreBadge,
		chatInfoButton,
		backgroundButton,
		portraitButton,
		registerEntityInfoTrigger,
		toggleRightSidebar,
		openRightSidebarPanel,
		closeRightSidebar: () => {
			controller?.closePanel()
		},
		getPanelElements: () => rightSidebarPanelElements,
		getActivePanel: () => controller?.getState().activePanel ?? null,
		getIsOpen: () => !!controller?.getState().isOpen,
		getLastPanel: () => controller?.getLastPanel() ?? 'chatInfo',
		setLastPanel: panelId => {
			controller?.setLastPanel(panelId)
		},
		setPersistHandler: handler => {
			controller?.setPersistHandler(handler)
		},
		updateEntityInfo,
		getStateSnapshot: () => controller?.getStateSnapshot?.() ?? {
			activePanel: controller?.getState?.().activePanel ?? null,
			lastPanel: controller?.getLastPanel?.() ?? 'chatInfo',
			isOpen: controller?.getState?.().isOpen ?? false,
		},
		restoreStateSnapshot: snapshot => {
			controller?.applySnapshot?.(snapshot)
		},
	}
}
