import { getLucideIconMarkup } from '@/astra/shared/icons/lucide.js'
import {
	getHomeTagFilterState,
	setHomeTagFilterState,
} from '../../state/homeTagFilterStore.js'

const HOME_CARD_TAG_LIMITS = Object.freeze({
	collapsed: 6,
	expanded: 12,
})
const TAG_OVERFLOW_ICON_MARKUP = getLucideIconMarkup('ellipsis', { size: 14 })

export function createHomeCardTagList(doc, tags = [], options = {}) {
	if (!Array.isArray(tags) || !tags.length) {
		return null
	}

	const container = doc.createElement('div')
	container.className = 'astra-home-card__tags'

	const tagPills = []
	for (const tag of tags) {
		const pill = doc.createElement('span')
		pill.className = 'astra-home-card__tag'
		pill.textContent = tag?.name ?? ''
		pill.title = tag?.title || tag?.name || ''

		if (tag?.id) {
			const tagId = String(tag.id)
			pill.dataset.tagId = tagId
			pill.tabIndex = 0
			pill.setAttribute('role', 'button')
			attachTagFilterToggle(pill, tagId)
		}

		if (typeof tag?.color === 'string' && tag.color) {
			pill.style.setProperty('--home-card-tag-bg', tag.color)
		}

		if (typeof tag?.color2 === 'string' && tag.color2) {
			pill.style.setProperty('--home-card-tag-fg', tag.color2)
		}

		tagPills.push(pill)
		container.appendChild(pill)
	}

	let overflowNode = null
	if (tags.length > HOME_CARD_TAG_LIMITS.collapsed) {
		overflowNode = doc.createElement('div')
		overflowNode.className = 'astra-home-card__tag astra-home-card__tag--overflow'
		if (typeof options?.overflowId === 'string' && options.overflowId) {
			overflowNode.id = options.overflowId
		}
	}

	const describeOverflow = count => `${count} more tag${count === 1 ? '' : 's'} hidden`

	const applyVisibleLimit = limit => {
		const safeLimit = Math.max(0, Math.min(Number(limit) || 0, tags.length))
		for (const [index, pill] of tagPills.entries()) {
			pill.hidden = index >= safeLimit
		}
		const overflowCount = Math.max(0, tags.length - safeLimit)
		if (overflowNode) {
			if (overflowCount > 0) {
				overflowNode.hidden = false
				overflowNode.innerHTML = TAG_OVERFLOW_ICON_MARKUP
				const description = describeOverflow(overflowCount)
				overflowNode.title = description
				overflowNode.setAttribute('aria-label', description)
			} else {
				overflowNode.hidden = true
				overflowNode.title = ''
				overflowNode.removeAttribute('aria-label')
			}
		}
	}

	const setExpandedState = expanded => {
		const limits = expanded ? HOME_CARD_TAG_LIMITS.expanded : HOME_CARD_TAG_LIMITS.collapsed
		const effectiveLimit = Math.max(
			0,
			Math.min(Number.isFinite(limits) ? limits : HOME_CARD_TAG_LIMITS.collapsed, tags.length),
		)
		applyVisibleLimit(effectiveLimit)
	}

	setExpandedState(false)

	return {
		listNode: container,
		overflowNode,
		setExpandedState,
	}
}

function attachTagFilterToggle(pill, tagId) {
	if (!pill || !tagId) return

	const handleActivate = event => {
		if (event?.type === 'keydown') {
			const key = event.key
			if (key !== 'Enter' && key !== ' ') return
			event.preventDefault()
		}
		const state = getHomeTagFilterState()
		const isExcluded = Array.isArray(state?.excluded) && state.excluded.includes(tagId)
		if (isExcluded) return
		const isSelected = Array.isArray(state?.selected) && state.selected.includes(tagId)
		setHomeTagFilterState(tagId, isSelected ? 'ignore' : 'include')
	}

	pill.addEventListener('click', handleActivate)
	pill.addEventListener('keydown', handleActivate)
}
