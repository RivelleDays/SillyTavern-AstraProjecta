const DEFAULT_PORTAL_HOST_ID = 'astraPortalRoot'

/**
 * Ensures a stable portal host that lives on document.body.
 * This avoids appWrapper visibility toggles and transform/overflow side effects
 * that can break floating layers (dropdowns, drawers) during mobile layout moves.
 */
export function ensureAstraPortalHost(id = DEFAULT_PORTAL_HOST_ID) {
	if (typeof document === 'undefined') return undefined
	const doc = document
	const body = doc.body ?? null
	if (!body) return undefined

	let host = doc.getElementById(id)
	if (!host) {
		host = doc.createElement('div')
		host.id = id
	}

	if (host.parentElement !== body) {
		host.parentElement?.removeChild(host)
		body.appendChild(host)
	} else if (host !== body.lastChild) {
		// Keep the host at the end of body to minimize stacking surprises.
		body.appendChild(host)
	}

	return host
}

export function getDefaultPortalHostId() {
	return DEFAULT_PORTAL_HOST_ID
}
