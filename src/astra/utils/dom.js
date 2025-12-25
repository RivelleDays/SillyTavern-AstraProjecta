const KEEP_OPEN_OBSERVER_FLAG = '__stKeepOpenObserver'

function coerceElement(sourceOrId) {
	if (!sourceOrId) return null
	return typeof sourceOrId === 'string'
		? document.getElementById(sourceOrId)
		: sourceOrId
}

function normalizeDrawer(node) {
	if (!node) return null
	node.classList.add('st-drawer-ported', 'openDrawer')
	node.classList.remove('closedDrawer')
	node.querySelectorAll('.closedDrawer').forEach(child => {
		child.classList.remove('closedDrawer')
		child.classList.add('openDrawer')
	})
	return node
}

function attachKeepOpenObserver(node) {
	if (!node || node[KEEP_OPEN_OBSERVER_FLAG]) return

	const observer = new MutationObserver((mutList) => {
		for (const mutation of mutList) {
			if (mutation.type !== 'attributes') continue
			if (mutation.attributeName !== 'class') continue
			if (!node.classList.contains('closedDrawer')) continue

			node.classList.remove('closedDrawer')
			node.classList.add('openDrawer')
		}
	})

	observer.observe(node, { attributes: true, attributeFilter: ['class'] })
	node[KEEP_OPEN_OBSERVER_FLAG] = observer
}

/**
 * Moves a drawer-like element (by id or node) into a target container.
 * - Ensures open state + `st-drawer-ported`
 * - Optionally keeps it open by observing future class mutations (default true)
 */
export function portDrawerInto(source, targetContainer, options = {}) {
	const { keepOpen = true } = options
	const node = coerceElement(source)
	if (!node || !targetContainer) return null

	normalizeDrawer(node)
	if (keepOpen) attachKeepOpenObserver(node)

	targetContainer.appendChild(node)
	return node
}

/** Keeps a drawer open by normalizing classes and attaching the keep-open observer. */
export function enforceDrawerAlwaysOpen(drawerIdOrNode) {
	const node = coerceElement(drawerIdOrNode)
	if (!node) return

	normalizeDrawer(node)
	attachKeepOpenObserver(node)
}

/** Ensures a dedicated title slot that visually replaces the character section. */
export function ensurePrimaryTitleSlot() {
	let slot = document.getElementById('primaryBarLeft')?.querySelector('#primaryTitleSlot')
	if (!slot) {
		// Find the left-side container to append the slot into.
		const primaryBarLeft = document.getElementById('primaryBarLeft')
		slot = document.createElement('div')
		slot.id = 'primaryTitleSlot'

		// The slot should exist within the left-side group to maintain layout.
		if (primaryBarLeft)
			primaryBarLeft.appendChild(slot)

	}
	slot.classList.add('primary-title-slot', 'astra-primary-title-slot')
	return slot
}
