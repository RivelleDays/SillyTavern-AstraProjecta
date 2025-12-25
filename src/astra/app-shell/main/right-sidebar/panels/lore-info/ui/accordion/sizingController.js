export const ACCORDION_SIZING_KEY = Symbol('loreAccordionSizing')

/**
 * Ensure the shared sizing controller for the "All" tab accordions exists.
 * Dynamically distributes vertical space so accordion panels keep their toggles visible.
 */
export function ensureAccordionSizingController(hostPanel) {
	if (!hostPanel) {
		return null
	}
	if (hostPanel[ACCORDION_SIZING_KEY]) {
		return hostPanel[ACCORDION_SIZING_KEY]
	}

	const sections = []
	let rafId = null
	let fallbackTimeoutId = null

	const scheduleUpdate = () => {
		if (rafId != null) {
			return
		}
		rafId = requestAnimationFrame(() => {
			rafId = null
			runUpdate()
		})

		if (fallbackTimeoutId == null) {
			fallbackTimeoutId = setTimeout(() => {
				fallbackTimeoutId = null
				if (!hostPanel.isConnected || !hostPanel.classList.contains('active')) {
					return
				}
				runUpdate()
			}, 180)
		}
	}

	const runUpdate = () => {
		if (!hostPanel.isConnected || !hostPanel.classList.contains('active')) {
			return
		}
		const connected = sections
			.filter((section) => section.wrap.isConnected && hostPanel.contains(section.wrap))
		if (connected.length === 0) {
			return
		}
		const computed = getComputedStyle(hostPanel)
		const gapValue = parseFloat(computed.rowGap || computed.gap || '0') || 0
		const togglesHeight = connected.reduce((sum, section) => sum + section.toggle.offsetHeight, 0)
		const hostHeight = hostPanel.clientHeight
		if (hostHeight <= 0) {
			return
		}
		const availableViewport = Math.max(0, hostHeight - togglesHeight - gapValue * Math.max(0, connected.length - 1))
		const expanded = connected.filter((section) => !section.panel.hidden)
		const expandedCount = expanded.length

		if (expandedCount === 0) {
			return
		}

		if (availableViewport <= 0) {
			expanded.forEach((section) => {
				section.panel.style.maxHeight = ''
				section.panel.style.overflow = ''
				if (section.body) {
					section.body.style.maxHeight = ''
					section.body.style.overflowY = ''
				}
			})
			return
		}

		connected.forEach((section) => {
			if (section.panel.hidden) {
				section.panel.style.maxHeight = '0px'
				section.panel.style.overflow = 'hidden'
				if (section.body) {
					section.body.style.maxHeight = '0px'
					section.body.style.overflowY = 'hidden'
				}
			}
		})

		const PLACEHOLDER_HEIGHT = 60
		const allocations = new Map()

		const getSectionOffset = (data) => (
			data.section.wrap.classList.contains('lore-container-active') ? 40 : 0
		)

		const expandedData = expanded.map((section) => {
			const controlsHeight = section.controls ? section.controls.offsetHeight || 0 : 0
			const placeholderEl = section.body?.querySelector('.lore-empty') ?? null
			let placeholderVisible = false
			if (placeholderEl) {
				const inlineDisplay = placeholderEl.style?.display
				if (inlineDisplay) {
					placeholderVisible = inlineDisplay !== 'none'
				} else {
					const computed = getComputedStyle(placeholderEl)
					placeholderVisible = computed.display !== 'none' && computed.visibility !== 'hidden'
				}
			}
				return {
					section,
					controlsHeight,
					placeholderVisible,
				}
			})

		const getDesiredPanelHeight = (data) => {
			const bodyScrollHeight = data.section.body?.scrollHeight ?? 0
			return data.controlsHeight + bodyScrollHeight + getSectionOffset(data)
		}

		const assignAllocation = (data, target, { isPlaceholder = false } = {}) => {
			const desired = getDesiredPanelHeight(data)
			const placeholderBaseline = data.placeholderVisible
				? data.controlsHeight + PLACEHOLDER_HEIGHT + getSectionOffset(data)
				: desired
			const safeDesired = Math.max(desired, placeholderBaseline)
			const clamped = Math.max(0, Math.min(target, safeDesired))

			allocations.set(data.section, {
				target: clamped,
				controlsHeight: data.controlsHeight,
				isPlaceholder,
			})
			return clamped
		}

		let remaining = availableViewport

		expandedData.forEach((data) => {
			if (!data.placeholderVisible) {
				return
			}
			const requiresOffset = data.section.wrap.classList.contains('lore-container-active')
			const desired = data.controlsHeight + PLACEHOLDER_HEIGHT + (requiresOffset ? 40 : 0)
			const target = Math.min(desired, remaining)

			const granted = assignAllocation(data, target, { isPlaceholder: true })
			remaining = Math.max(0, remaining - granted)
		})

		let regularSections = expandedData.filter((data) => !allocations.has(data.section))
		let regularRemaining = remaining

		const activeSection = regularSections.find((data) => data.section.wrap.classList.contains('lore-container-active'))
		const potentialSection = regularSections.find((data) => data.section.wrap.classList.contains('lore-container-potential'))

		if (activeSection && potentialSection) {
			const activeDesired = getDesiredPanelHeight(activeSection)
			const potentialDesired = getDesiredPanelHeight(potentialSection)

			const activeBase = activeSection.controlsHeight + getSectionOffset(activeSection)
			const potentialBase = potentialSection.controlsHeight + getSectionOffset(potentialSection)
			const totalBase = activeBase + potentialBase

			let pairAvailable = regularRemaining
			let targetActive = 0
			let targetPotential = 0

			if (pairAvailable > 0 && totalBase > 0) {
				if (pairAvailable < totalBase) {
					const scale = pairAvailable / totalBase
					targetActive = activeBase * scale
					targetPotential = potentialBase * scale
					pairAvailable = 0
				} else {
					targetActive = activeBase
					targetPotential = potentialBase
					pairAvailable -= totalBase

					const halfShare = pairAvailable / 2
					targetActive += halfShare
					targetPotential += pairAvailable - halfShare
					pairAvailable = 0
				}
			} else if (pairAvailable > 0) {
				const halfShare = pairAvailable / 2
				targetActive += halfShare
				targetPotential += pairAvailable - halfShare
				pairAvailable = 0
			}

			targetActive = Math.min(targetActive, activeDesired)
			targetPotential = Math.min(targetPotential, potentialDesired)

			const pairInitialSum = targetActive + targetPotential
			let leftover = Math.max(0, regularRemaining - pairInitialSum)
			if (leftover > 0) {
				const activeCapacity = Math.max(0, activeDesired - targetActive)
				const potentialCapacity = Math.max(0, potentialDesired - targetPotential)
				const capacitySum = activeCapacity + potentialCapacity
				if (capacitySum > 0) {
					const activeExtra = Math.min(activeCapacity, leftover * (activeCapacity / capacitySum))
					const potentialExtra = Math.min(potentialCapacity, leftover - activeExtra)
					targetActive += activeExtra
					targetPotential += potentialExtra
					leftover = Math.max(0, regularRemaining - (targetActive + targetPotential))
				}
				if (leftover > 0) {
					if (activeDesired > targetActive) {
						const take = Math.min(activeDesired - targetActive, leftover)
						targetActive += take
						leftover -= take
					}
					if (leftover > 0 && potentialDesired > targetPotential) {
						const take = Math.min(potentialDesired - targetPotential, leftover)
						targetPotential += take
						leftover -= take
					}
				}
			}

			const assignedActive = assignAllocation(activeSection, targetActive)
			const assignedPotential = assignAllocation(potentialSection, targetPotential)

			const totalAssigned = assignedActive + assignedPotential
			regularRemaining = Math.max(0, regularRemaining - totalAssigned)

			regularSections = regularSections.filter(
				(data) => data !== activeSection && data !== potentialSection,
			)
		}

		const totalRegular = regularSections.length

		regularSections.forEach((data, index) => {
			if (allocations.has(data.section)) {
				return
			}
			if (regularRemaining <= 0) {
				assignAllocation(data, 0)
				return
			}

			const desired = getDesiredPanelHeight(data)
			const sectionsLeft = totalRegular - index
			const averageShare = sectionsLeft > 0 ? regularRemaining / sectionsLeft : regularRemaining
			const rawTarget = index === totalRegular - 1
				? regularRemaining
				: Math.min(averageShare, regularRemaining)
			const target = Math.min(desired, rawTarget)
			const clamped = Math.max(0, target)

			assignAllocation(data, clamped)
			regularRemaining = Math.max(0, regularRemaining - clamped)
		})

		expanded.forEach((section) => {
			const allocation = allocations.get(section) ?? {
				target: 0,
				controlsHeight: section.controls ? section.controls.offsetHeight || 0 : 0,
				isPlaceholder: false,
			}

			const requiresOffset = section.wrap.classList.contains('lore-container-active')
			const clamped = Math.max(0, allocation.target)
			const adjustedMax = Math.max(0, clamped - (requiresOffset ? 40 : 0))

			section.panel.style.maxHeight = `${adjustedMax}px`
			section.panel.style.overflow = 'hidden'

			const bodyAvailable = Math.max(0, adjustedMax - allocation.controlsHeight)
			if (section.body) {
				const bodyTarget = allocation.isPlaceholder
					? Math.min(bodyAvailable, PLACEHOLDER_HEIGHT)
					: bodyAvailable
				section.body.style.maxHeight = `${bodyTarget}px`
				section.body.style.overflowY = allocation.isPlaceholder
					? 'hidden'
					: (bodyTarget > 0 ? 'auto' : 'hidden')
			}
		})
	}

	const resizeObserver = new ResizeObserver(scheduleUpdate)
	resizeObserver.observe(hostPanel)

	const mutationObserver = new MutationObserver(scheduleUpdate)
	mutationObserver.observe(hostPanel, { attributes: true, attributeFilter: ['class', 'hidden'] })

	window.addEventListener('resize', scheduleUpdate)

	hostPanel[ACCORDION_SIZING_KEY] = {
		registerSection(section) {
			if (!sections.includes(section)) {
				sections.push(section)
				resizeObserver.observe(section.toggle)
				resizeObserver.observe(section.panel)
				if (section.controls) {
					resizeObserver.observe(section.controls)
				}
				if (section.body) {
					resizeObserver.observe(section.body)
				}
			}
			scheduleUpdate()
			return { scheduleUpdate }
		},
		scheduleUpdate,
	}

	return hostPanel[ACCORDION_SIZING_KEY]
}
