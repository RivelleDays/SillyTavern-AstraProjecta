import { MOBILE_LAYOUT_CLASS, MOBILE_MAIN_VISIBLE_CLASS } from './layoutState.js'

// NOTE:
// Radix DropdownMenu (via shadcn/ui) renders its content inside a portal wrapper
// that lives outside of the column we toggle aria-hidden on. When that wrapper
// inherits aria-hidden from other ancestors (e.g., SillyTavern shell), Radix keeps
// focus on the floating menu and Chromium still warns that focus falls under an
// aria-hidden tree even once we blur nodes contained inside the column. Until
// Radix/shadcn exposes better focus-handling hooks, we mitigate by blurring any
// element linked to the column (including label/control relationships) before
// hiding it, but the underlying warning can still surface in rare timing races.

function escapeAttributeValue(value) {
	if (typeof value !== 'string' || !value) return ''
	if (typeof globalThis.CSS?.escape === 'function') {
		return globalThis.CSS.escape(value)
	}
	return value.replace(/["\\]/g, '\\$&')
}

function parseIdList(value) {
	if (typeof value !== 'string' || !value) return []
	return value
		.split(/\s+/)
		.map(token => token.trim())
		.filter(Boolean)
}

function containerOwnsLabelReference(container, node) {
	const ids = parseIdList(node?.getAttribute?.('aria-labelledby') ?? '')
	if (!ids.length) return false
	return ids.some(id => {
		const referencedNode = document.getElementById(id)
		return referencedNode ? container.contains(referencedNode) : false
	})
}

function containerOwnsControlledNode(container, node) {
	const id = node?.id ?? ''
	if (!id) return false
	const selector = `[aria-controls~="${escapeAttributeValue(id)}"]`
	try {
		const controller = container.querySelector(selector)
		return Boolean(controller)
	} catch {
		return false
	}
}

function isNodeLinkedToContainer(node, container) {
	if (!node || !container) return false
	let current = node
	while (current) {
		if (container.contains(current)) return true
		if (containerOwnsLabelReference(container, current)) return true
		if (containerOwnsControlledNode(container, current)) return true
		current = current.parentElement
	}
	return false
}

function releaseFocusForContainer(container) {
	if (!container) return
	const activeElement = document.activeElement
	if (!activeElement) return
	if (!isNodeLinkedToContainer(activeElement, container)) return
	if (typeof activeElement.blur === 'function') {
		activeElement.blur()
	}
	if (document.body && activeElement !== document.body && typeof document.body.focus === 'function') {
		document.body.focus({ preventScroll: true })
	}
}

function disableColumn(column) {
	if (!column) return
	releaseFocusForContainer(column)
	column.setAttribute('aria-hidden', 'true')
	column.setAttribute('inert', '')
}

function enableColumn(column) {
	if (!column) return
	column.removeAttribute('aria-hidden')
	column.removeAttribute('inert')
}

function resetColumn(column) {
	column?.removeAttribute('aria-hidden')
	column?.removeAttribute('inert')
}

export function isMobileLayoutActive() {
	return document.body.classList.contains(MOBILE_LAYOUT_CLASS)
}

export function showMobileMainArea({ contentColumn, leftSidebar } = {}) {
	if (!isMobileLayoutActive()) return
	document.body.classList.add(MOBILE_MAIN_VISIBLE_CLASS)
	enableColumn(contentColumn)
	disableColumn(leftSidebar)
}

export function hideMobileMainArea({ contentColumn, leftSidebar } = {}) {
	if (!isMobileLayoutActive()) return
	document.body.classList.remove(MOBILE_MAIN_VISIBLE_CLASS)
	disableColumn(contentColumn)
	enableColumn(leftSidebar)
}

export function resetMobileMainArea({ contentColumn, leftSidebar } = {}) {
	document.body.classList.remove(MOBILE_MAIN_VISIBLE_CLASS)
	resetColumn(contentColumn)
	resetColumn(leftSidebar)
}
