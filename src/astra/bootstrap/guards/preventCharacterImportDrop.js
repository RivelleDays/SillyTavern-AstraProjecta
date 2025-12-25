const DROP_EVENTS = ['dragenter', 'dragover', 'drop']
const DEFAULT_ALLOW_SELECTOR = '[data-astra-allow-character-drop="true"]'

function isEventWithinHost(event, host) {
	if (!host || !event) return false
	const target = event.target
	if (target && host.contains(target)) {
		return true
	}
	const path = typeof event.composedPath === 'function' ? event.composedPath() : undefined
	if (Array.isArray(path)) {
		return path.includes(host)
	}
	return false
}

function resolveAllowedNode({ event, host, allowSelector }) {
	if (!allowSelector || !host || !event) return null
	const target = event.target
	if (target?.closest) {
		const closest = target.closest(allowSelector)
		if (closest && host.contains(closest)) {
			return closest
		}
	}
	const path = typeof event.composedPath === 'function' ? event.composedPath() : undefined
	if (Array.isArray(path)) {
		for (const node of path) {
			if (node instanceof Element && host.contains(node) && node.matches(allowSelector)) {
				return node
			}
		}
	}
	return null
}

function shouldGuardEvent({ event, host, allowSelector } = {}) {
	if (!host || !event) return false
	if (!isEventWithinHost(event, host)) return false
	const allowedNode = resolveAllowedNode({ event, host, allowSelector })
	if (allowedNode) return false
	return true
}

function guardHandlerFactory({ host, allowSelector }) {
	return event => {
		if (!shouldGuardEvent({ event, host, allowSelector })) {
			return
		}

		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation?.()
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'none'
		}
	}
}

export function installCharacterImportDropGuard({
	host,
	root = document,
	allowSelector = DEFAULT_ALLOW_SELECTOR,
} = {}) {
	if (!host || !root) return () => {}
	const handler = guardHandlerFactory({ host, allowSelector })
	for (const type of DROP_EVENTS) {
		root.addEventListener(type, handler, { capture: true })
	}
	return () => {
		for (const type of DROP_EVENTS) {
			root.removeEventListener(type, handler, { capture: true })
		}
	}
}
