const PRIMARY_HEADING_ID_MAP = {
	home: 'sillyTavernPrimaryHeading',
	'world-info': 'worldsLorebooksPrimaryHeading',
	extensions: 'extensionsPrimaryHeading',
}

function resolvePrimaryHeadingId(navId) {
	if (!navId) return 'astraPrimaryHeading'
	return PRIMARY_HEADING_ID_MAP[navId] || `astraPrimaryHeading-${navId}`
}

export function createPrimaryHeadingNode({
	navId,
	label,
	iconMarkup,
	document: doc = globalThis.document,
}) {
	const documentRef = doc ?? globalThis.document
	if (!documentRef) return null
	const heading = documentRef.createElement('div')
	heading.id = resolvePrimaryHeadingId(navId)
	heading.className = 'astra-primary-heading'
	heading.dataset.mainNavId = navId || ''

	if (iconMarkup) {
		const iconWrap = documentRef.createElement('span')
		iconWrap.className = 'astra-primary-heading__icon'
		iconWrap.innerHTML = iconMarkup
		heading.append(iconWrap)
	}

	const labelNode = documentRef.createElement('span')
	labelNode.className = 'astra-primary-heading__label'
	labelNode.textContent = label || ''
	heading.append(labelNode)

	return heading
}

export function applyPrimaryHeadingToSlot(slot, headingNode, navId, options = {}) {
	if (!slot) return
	const { divider } = options

	if (headingNode) {
		slot.replaceChildren(headingNode)
		slot.style.display = ''
		slot.classList.add('astra-primary-title-slot--active')
		if (navId) {
			slot.setAttribute('data-primary-heading', navId)
		} else {
			slot.removeAttribute('data-primary-heading')
		}
		if (divider) divider.style.display = ''
		return
	}

	slot.replaceChildren()
	slot.style.display = 'none'
	slot.classList.remove('astra-primary-title-slot--active')
	slot.removeAttribute('data-primary-heading')
	if (divider) divider.style.display = ''
}

export { resolvePrimaryHeadingId }
