let homePrimaryBarHost = null

const isDomNode = node => node && typeof node === 'object' && typeof node.nodeType === 'number'

export function setHomePrimaryBarHost(node) {
	if (!isDomNode(node)) {
		homePrimaryBarHost = null
		return null
	}
	homePrimaryBarHost = node
	return homePrimaryBarHost
}

export function getHomePrimaryBarHost(documentRef = globalThis.document) {
	if (homePrimaryBarHost) {
		return homePrimaryBarHost
	}

	const doc = documentRef ?? globalThis.document
	if (!doc) return null

	const existing = doc.getElementById('astraHomePrimaryBarActions')
	if (isDomNode(existing)) {
		homePrimaryBarHost = existing
		return homePrimaryBarHost
	}

	return null
}
