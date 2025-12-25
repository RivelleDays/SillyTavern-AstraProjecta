function isDomNode(value) {
	if (!value) return false
	const NodeCtor = globalThis.Node ?? null
	if (NodeCtor && value instanceof NodeCtor) return true
	return typeof value === 'object' && typeof value.nodeType === 'number'
}

function normalizeNodes(value) {
	if (!value) return []
	if (isDomNode(value)) return [value]
	if (Array.isArray(value)) {
		return value
			.map(node => (isDomNode(node) ? node : null))
			.filter(Boolean)
	}
	return []
}

function normalizeRenderResult(result) {
	if (!result) {
		return { nodes: [], cleanup: null }
	}

	if (isDomNode(result) || Array.isArray(result)) {
		return { nodes: normalizeNodes(result), cleanup: null }
	}

	if (typeof result === 'object') {
		const nodesValue = Object.prototype.hasOwnProperty.call(result, 'nodes')
			? result.nodes
			: null
		const nodes = normalizeNodes(nodesValue)
		const cleanup = typeof result.cleanup === 'function' ? result.cleanup : null
		return { nodes, cleanup }
	}

	return { nodes: [], cleanup: null }
}

function combineCleanups(first, second) {
	if (typeof first !== 'function') return typeof second === 'function' ? second : null
	if (typeof second !== 'function') return first
	return () => {
		try {
			first()
		} catch {}
		try {
			second()
		} catch {}
	}
}

function runCleanup(cleanup) {
	if (typeof cleanup !== 'function') return
	try {
		cleanup()
	} catch {}
}

export function createPrimaryBarRightSlot({ document: documentRef } = {}) {
	const doc = documentRef ?? globalThis.document
	const element = doc.createElement('div')
	element.id = 'primaryBarRight'

	const registrations = new Map()

	let activeId = null
	let activeCleanup = null
	let isMobileLayoutActive = false

	const noopRegistrationApi = {
		id: null,
		activate: () => false,
		unregister: () => false,
		isActive: () => false,
	}

	function mountRegistration(registration) {
		if (!registration || typeof registration.render !== 'function') {
			element.replaceChildren()
			activeCleanup = null
			return
		}

		let renderResult = null
		try {
			renderResult = registration.render({
				isMobile: isMobileLayoutActive,
				host: element,
				activeId: registration.id,
			})
		} catch (error) {
			console?.error?.('[AstraProjecta] Failed to render primaryBarRight view:', error)
		}

		const { nodes, cleanup } = normalizeRenderResult(renderResult)
		element.replaceChildren(...nodes)
		activeCleanup = cleanup ?? null

		if (typeof registration.onActivate === 'function') {
			try {
				const maybeCleanup = registration.onActivate({
					isMobile: isMobileLayoutActive,
					host: element,
					activeId: registration.id,
				})
				if (typeof maybeCleanup === 'function') {
					activeCleanup = combineCleanups(activeCleanup, maybeCleanup)
				}
			} catch (error) {
				console?.error?.('[AstraProjecta] Failed to activate primaryBarRight view:', error)
			}
		}
	}

	function runActiveCleanup() {
		runCleanup(activeCleanup)
		activeCleanup = null
	}

	function deactivateCurrent({ nextId = null } = {}) {
		if (!activeId) return

		const currentRegistration = registrations.get(activeId)
		runActiveCleanup()

		if (currentRegistration && typeof currentRegistration.onDeactivate === 'function') {
			try {
				currentRegistration.onDeactivate({
					isMobile: isMobileLayoutActive,
					host: element,
					activeId,
					nextId,
				})
			} catch (error) {
				console?.error?.('[AstraProjecta] Failed to deactivate primaryBarRight view:', error)
			}
		}

		activeId = null
	}

	function activateView(id) {
		if (!registrations.has(id)) {
			return false
		}

		const registration = registrations.get(id)
		if (!registration) return false

		if (activeId === id) {
			runActiveCleanup()
			mountRegistration(registration)
			return true
		}

		deactivateCurrent({ nextId: id })
		activeId = id
		mountRegistration(registration)
		return true
	}

	function unregisterView(id) {
		if (!registrations.has(id)) {
			return false
		}

		if (activeId === id) {
			deactivateCurrent()
			element.replaceChildren()
		}

		registrations.delete(id)
		return true
	}

	function registerView({ id, render, onActivate, onDeactivate, autoActivate } = {}) {
		if (typeof id !== 'string' || !id) {
			console?.warn?.('[AstraProjecta] registerPrimaryBarRightView requires a string id.')
			return { ...noopRegistrationApi }
		}

		if (registrations.has(id)) {
			unregisterView(id)
		}

		const registration = {
			id,
			render: typeof render === 'function' ? render : () => [],
			onActivate: typeof onActivate === 'function' ? onActivate : null,
			onDeactivate: typeof onDeactivate === 'function' ? onDeactivate : null,
		}

		registrations.set(id, registration)

		const api = {
			id,
			activate: () => activateView(id),
			unregister: () => unregisterView(id),
			isActive: () => activeId === id,
		}

		if (autoActivate) api.activate()

		return api
	}

	function setMobileState(nextIsMobile) {
		const normalized = !!nextIsMobile
		if (normalized === isMobileLayoutActive) {
			return
		}
		isMobileLayoutActive = normalized

		if (activeId) {
			const registration = registrations.get(activeId)
			runActiveCleanup()
			mountRegistration(registration)
		}
	}

	return {
		element,
		registerView,
		activateView,
		unregisterView,
		setMobileState,
		getActiveViewId: () => activeId,
	}
}
