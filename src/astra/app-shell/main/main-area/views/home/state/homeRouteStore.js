const listeners = new Set()
let persistHandler = null

const DEFAULT_STATE = Object.freeze({
	view: 'browser',
	entityType: null,
	entityKey: null,
	displayName: '',
	avatarUrl: '',
	source: null,
})

export const HOME_ROUTE_DEFAULT_STATE = DEFAULT_STATE

let state = createDefaultState()

function createDefaultState() {
	return { ...DEFAULT_STATE }
}

function normalizeRoute(candidate) {
	const route = candidate && typeof candidate === 'object' ? candidate : {}
	const view = route.view === 'entity' ? 'entity' : 'browser'
	const entityType = route.entityType === 'group' ? 'group' : 'character'
	const entityKey =
		route.entityKey !== undefined && route.entityKey !== null ? String(route.entityKey) : ''

	if (view === 'entity' && !entityKey) {
		return createDefaultState()
	}

	return {
		view,
		entityType,
		entityKey,
		displayName: typeof route.displayName === 'string' ? route.displayName : '',
		avatarUrl: typeof route.avatarUrl === 'string' ? route.avatarUrl : '',
		source: typeof route.source === 'string' ? route.source : null,
	}
}

function emit() {
	for (const listener of listeners) {
		try {
			listener({ ...state })
		} catch (error) {
			console?.warn?.('[AstraProjecta] Home route listener failed.', error)
		}
	}
}

function setState(updater) {
	const nextSlice = typeof updater === 'function' ? updater({ ...state }) : updater
	if (!nextSlice || typeof nextSlice !== 'object') {
		return
	}
	const nextState = { ...state, ...nextSlice }
	let changed = false
	for (const key of Object.keys(nextState)) {
		if (state[key] !== nextState[key]) {
			changed = true
			break
		}
	}
	if (!changed) {
		return
	}
	state = nextState
	persistHandler?.({ ...state })
	emit()
}

export function getHomeRoute() {
	return { ...state }
}

export function subscribeHomeRouteStore(listener) {
	if (typeof listener !== 'function') {
		return () => {}
	}
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

export function setHomeRouteToBrowser() {
	setState(createDefaultState())
}

export function setHomeRouteToEntity(payload = {}) {
	const entityType = payload?.entityType === 'group' ? 'group' : 'character'
	const entityKey =
		payload?.entityKey !== undefined && payload?.entityKey !== null
			? String(payload.entityKey)
			: ''

	setState({
		view: 'entity',
		entityType,
		entityKey,
		displayName: typeof payload?.displayName === 'string' ? payload.displayName : '',
		avatarUrl: typeof payload?.avatarUrl === 'string' ? payload.avatarUrl : '',
		source: typeof payload?.source === 'string' ? payload.source : null,
	})
}

export function resetHomeRoute() {
	state = createDefaultState()
	emit()
}

export function initializeHomeRoute(snapshot) {
	state = normalizeRoute(snapshot)
	emit()
}

export function setHomeRoutePersistHandler(handler) {
	persistHandler = typeof handler === 'function' ? handler : null
}
