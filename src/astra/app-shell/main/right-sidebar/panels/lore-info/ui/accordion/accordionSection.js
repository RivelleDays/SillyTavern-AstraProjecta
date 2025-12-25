import { ensureAccordionSizingController } from './sizingController.js'

let accordionIdCounter = 0

/**
 * Build an accordion section inside a lore container.
 */
export function createAccordionSection({
	panelId,
	wrap,
	titleEl,
	contentEls,
	defaultExpanded = true,
	collapsible = true,
	chevronIcons = {},
	labelIconMarkup = '',
	labelIconHelpText = '',
}) {
	if (!wrap) {
		return null
	}

	const sectionId = `${panelId ?? 'lore'}-accordion-${accordionIdCounter++}`
	const controls = []
	const panelContent = []
	contentEls.forEach((node) => {
		if (!node) {
			return
		}
		const hasControlsClass = node.classList?.contains('lore-controls')
		if (hasControlsClass) {
			controls.push(node)
		} else {
			panelContent.push(node)
		}
	})

	const toggle = collapsible ? document.createElement('button') : document.createElement('div')
	toggle.className = 'panel-title lore-accordion-toggle'
	if (collapsible) {
		toggle.type = 'button'
		toggle.setAttribute('aria-controls', sectionId)
	} else {
		toggle.classList.add('lore-accordion-toggle--static')
	}
	const label = document.createElement('span')
	label.className = 'lore-accordion-label'
	const labelText = document.createElement('span')
	labelText.className = 'lore-accordion-label-text'
	labelText.textContent = titleEl?.textContent ?? ''
	if (labelIconMarkup) {
		const labelIcon = document.createElement('span')
		labelIcon.className = 'lore-accordion-label-icon'
		labelIcon.innerHTML = labelIconMarkup
		if (labelIconHelpText) {
			labelIcon.setAttribute('role', 'img')
		}
		label.append(labelIcon)
	}
	label.append(labelText)
	const toggleContent = document.createElement('span')
	toggleContent.className = 'lore-accordion-toggle-content'
	toggleContent.append(label)
	let controlsSlot = null
	if (controls.length) {
		controlsSlot = document.createElement('div')
		controlsSlot.className = 'lore-accordion-controls-slot'
		controls.forEach((node) => controlsSlot.append(node))
	}
	const icon = document.createElement('span')
	icon.className = 'lore-accordion-icon'
	if (!collapsible) {
		icon.classList.add('is-hidden')
	}
	toggle.append(toggleContent, icon)

	const panel = document.createElement('div')
	panel.className = 'lore-accordion-panel'
	panel.id = sectionId
	const panelBody = document.createElement('div')
	panelBody.className = 'lore-accordion-panel-content'
	panelContent.forEach((node) => panelBody.append(node))

	if (controlsSlot) {
		panel.append(controlsSlot)
	}
	panel.append(panelBody)

	wrap.classList.add('lore-accordion')
	if (!collapsible) {
		wrap.classList.add('lore-accordion--static')
	}
	let expanded = collapsible ? Boolean(defaultExpanded) : true
	let updateStickyState = () => {}
	const { expanded: expandedIcon = '', collapsed: collapsedIcon = '' } = chevronIcons ?? {}
	const applyExpandedState = () => {
		if (collapsible) {
			toggle.setAttribute('aria-expanded', String(expanded))
			panel.hidden = !expanded
			wrap.classList.toggle('is-collapsed', !expanded)
			icon.innerHTML = expanded ? expandedIcon : collapsedIcon
		} else {
			toggle.setAttribute('aria-expanded', 'true')
			panel.hidden = false
			wrap.classList.remove('is-collapsed')
			icon.innerHTML = ''
		}
		updateStickyState()
	}
	applyExpandedState()

	if (collapsible) {
		toggle.addEventListener('click', () => {
			expanded = !expanded
			applyExpandedState()
			runStaticSizing?.()
			if (sizingControllerHandle) {
				sizingControllerHandle.scheduleUpdate()
			}
		})
	}

	wrap.replaceChildren(toggle)
	wrap.append(panel)

	const ensureStickyAffordances = () => {
		const hostPanel = wrap.closest('.secondary-tabpanel')
		if (!hostPanel) {
			requestAnimationFrame(ensureStickyAffordances)
			return
		}
		const isAllTab = hostPanel.dataset?.tabId === 'all'
		const stickyTop = isAllTab && wrap.classList.contains('lore-container-active')
		const isPotential = wrap.classList.contains('lore-container-potential')
		const isCollapsed = wrap.classList.contains('is-collapsed')
		const stickyBottom = isAllTab && isPotential && isCollapsed
		const reserveBottomSpace = isAllTab && isPotential

		toggle.classList.toggle('is-sticky-top', stickyTop)
		toggle.classList.toggle('is-sticky-bottom', stickyBottom)
		wrap.classList.toggle('lore-accordion--sticky-top', stickyTop)
		wrap.classList.toggle('lore-accordion--sticky-bottom', reserveBottomSpace)

		if (isPotential) {
			if (isAllTab && isCollapsed) {
				wrap.style.marginTop = 'auto'
			} else {
				wrap.style.marginTop = ''
			}
		}
	}

	updateStickyState = ensureStickyAffordances
	ensureStickyAffordances()
	requestAnimationFrame(ensureStickyAffordances)

	let sizingControllerHandle = null
	let runStaticSizing = null
	function ensureSizingController() {
		const hostPanel = wrap.closest('.secondary-tabpanel')
		if (!hostPanel) {
			requestAnimationFrame(ensureSizingController)
			return
		}
		if (hostPanel.dataset?.tabId !== 'all') {
			return
		}
		const controller = ensureAccordionSizingController(hostPanel)
		sizingControllerHandle = controller?.registerSection({
			wrap,
			toggle,
			panel,
			controls: controlsSlot,
			body: panelBody,
		}) ?? null
		if (sizingControllerHandle?.scheduleUpdate) {
			sizingControllerHandle.scheduleUpdate()
		}
	}
	function scheduleAccordionUpdate() {
		if (sizingControllerHandle?.scheduleUpdate) {
			sizingControllerHandle.scheduleUpdate()
		} else {
			runStaticSizing?.()
			ensureSizingController()
		}
	}
	wrap.__loreScheduleUpdate = scheduleAccordionUpdate
	requestAnimationFrame(ensureSizingController)

	let staticSizingInitialized = false
	function ensureStaticSizing() {
		if (staticSizingInitialized || collapsible) {
			return
		}
		const hostPanel = wrap.closest('.secondary-tabpanel')
		if (!hostPanel) {
			requestAnimationFrame(ensureStaticSizing)
			return
		}
		const tabId = hostPanel.dataset?.tabId
		if (tabId !== 'active' && tabId !== 'potential') {
			return
		}
		staticSizingInitialized = true

		const parsePx = (value) => {
			const parsed = Number.parseFloat(value ?? '')
			return Number.isFinite(parsed) ? parsed : 0
		}

		const computeStaticSizing = () => {
			if (!hostPanel.isConnected) {
				return
			}
			const toggleRect = toggle.getBoundingClientRect()
			if (!toggleRect || (toggleRect.width === 0 && toggleRect.height === 0)) {
				return
			}

			const tabPanels = hostPanel.closest('.secondary-tabpanels')
			const rightSidebar = hostPanel.closest('#rightSidebar')

			const safeBottom =
				parsePx(getComputedStyle(hostPanel).getPropertyValue('--safe-bottom')) ||
				(rightSidebar ? parsePx(getComputedStyle(rightSidebar).getPropertyValue('--safe-bottom')) : 0) ||
				parsePx(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom'))

			const containerRect = tabPanels?.getBoundingClientRect() ?? rightSidebar?.getBoundingClientRect() ?? null
			const viewportBottom = containerRect
				? containerRect.bottom
				: (window.visualViewport?.height ?? window.innerHeight)
			const containerBottom = viewportBottom - safeBottom
			const availableFromRects = containerBottom - toggleRect.bottom

			const hostHeight = hostPanel.clientHeight || 0
			const toggleHeight = toggle.offsetHeight || 0
			const fallbackAvailable = hostHeight - toggleHeight

			const available = Math.max(0, Math.max(availableFromRects, fallbackAvailable))

			panel.style.maxHeight = `${available}px`
			panel.style.overflow = available > 0 ? 'hidden' : ''

			const controlsHeight = controlsSlot
				? controlsSlot.getBoundingClientRect().height || controlsSlot.offsetHeight || 0
				: 0
			const bodyAvailable = Math.max(0, available - controlsHeight)
			if (panelBody) {
				panelBody.style.maxHeight = `${bodyAvailable}px`
				panelBody.style.overflowY = bodyAvailable > 0 ? 'auto' : 'hidden'
			}
		}

		runStaticSizing = computeStaticSizing

		const resizeObserver = new ResizeObserver(computeStaticSizing)
		;[hostPanel, toggle, controlsSlot, panelBody]
			.filter(Boolean)
			.forEach((node) => resizeObserver.observe(node))

		window.addEventListener('resize', computeStaticSizing)

		const mutationObserver = new MutationObserver(computeStaticSizing)
		mutationObserver.observe(hostPanel, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] })

		computeStaticSizing()
	}
	ensureStaticSizing()

	return {
		toggle,
		panel,
		panelBody,
		controls: controlsSlot,
	}
}
