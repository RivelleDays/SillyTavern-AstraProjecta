import { resolveEntityMeta } from './panels/entity-info/index.js'

const DEFAULT_LAST_PANEL = 'chatInfo'

export function createRightSidebarController({
	resolveCurrentEntity,
	eventSource,
	event_types: eventTypes,
} = {}) {
	let state = {
		activePanel: null,
		lastPanel: DEFAULT_LAST_PANEL,
		isOpen: false,
	}
	let persistHandler = null
	let panelIds = new Set()

	const stateListeners = new Set()
	const entityInfoLabelListeners = new Set()

	const entityInfoUpdateEvents = [
		eventTypes?.CHAT_CHANGED,
		eventTypes?.CHARACTER_PAGE_LOADED,
		eventTypes?.CHARACTER_EDITED,
		eventTypes?.GROUP_UPDATED,
		eventTypes?.CHAT_DELETED,
		eventTypes?.GROUP_CHAT_DELETED,
	].filter(Boolean)

	if (eventSource?.on) {
		entityInfoUpdateEvents.forEach(eventName => {
			eventSource.on(eventName, notifyEntityInfoLabelListeners)
		})
	}

	function setPanelIds(ids) {
		panelIds = new Set((Array.isArray(ids) ? ids : []).filter(Boolean))
	}

	function isValidPanelId(panelId) {
		return panelIds.has(panelId)
	}

	function getState() {
		return { ...state }
	}

	function getPersistencePayload(nextState = state) {
		return {
			activePanel: nextState.activePanel,
			lastPanel: nextState.lastPanel,
			isOpen: nextState.isOpen,
		}
	}

	function getStateSnapshot() {
		return getPersistencePayload()
	}

	function applySnapshot(snapshot) {
		const prev = getState()
		if (!snapshot || typeof snapshot !== 'object') {
			const next = {
				activePanel: null,
				lastPanel: prev.lastPanel,
				isOpen: false,
			}
			setState(next, { previousState: prev, persist: false })
			return getState()
		}

		const candidateLastPanel = isValidPanelId(snapshot.lastPanel)
			? snapshot.lastPanel
			: prev.lastPanel
		const candidateActivePanel = isValidPanelId(snapshot.activePanel)
			? snapshot.activePanel
			: null
		const shouldOpen = !!snapshot.isOpen && !!candidateActivePanel

		let nextLastPanel = candidateLastPanel
		if (!isValidPanelId(nextLastPanel) && candidateActivePanel) {
			nextLastPanel = candidateActivePanel
		}
		if (!isValidPanelId(nextLastPanel)) {
			nextLastPanel = prev.lastPanel
		}
		if (!isValidPanelId(nextLastPanel)) {
			nextLastPanel = DEFAULT_LAST_PANEL
		}

		const next = {
			activePanel: shouldOpen ? candidateActivePanel : null,
			lastPanel: nextLastPanel,
			isOpen: shouldOpen,
		}

		setState(next, { previousState: prev, persist: false })
		return getState()
	}

	function setState(nextState, { previousState, persist = true } = {}) {
		const prev = previousState || getState()
		state = nextState
		const changed =
			prev.activePanel !== state.activePanel ||
			prev.lastPanel !== state.lastPanel ||
			prev.isOpen !== state.isOpen

		if (!changed) {
			return
		}

		const snapshot = getState()
		stateListeners.forEach(listener => {
			listener({
				state: snapshot,
				previousState: prev,
			})
		})

		if (persist && typeof persistHandler === 'function') {
			persistHandler(getPersistencePayload(snapshot))
		}
	}

	function togglePanel(panelId) {
		if (panelId && !isValidPanelId(panelId)) {
			return getState()
		}

		const prev = getState()

		if (prev.isOpen && panelId && prev.activePanel === panelId) {
			const next = {
				activePanel: null,
				lastPanel: panelId,
				isOpen: false,
			}
			setState(next, { previousState: prev })
			return getState()
		}

		const candidate = panelId && isValidPanelId(panelId) ? panelId : prev.lastPanel
		const next = {
			activePanel: isValidPanelId(candidate) ? candidate : null,
			lastPanel: isValidPanelId(candidate) ? candidate : prev.lastPanel,
			isOpen: true,
		}
		setState(next, { previousState: prev })
		return getState()
	}

	function openPanel(panelId) {
		if (!isValidPanelId(panelId)) {
			return getState()
		}

		const prev = getState()
		const stateChanged = prev.activePanel !== panelId || !prev.isOpen
		const next = {
			activePanel: panelId,
			lastPanel: panelId,
			isOpen: true,
		}
		setState(next, { previousState: prev, persist: stateChanged })
		return getState()
	}

	function closePanel() {
		const prev = getState()
		if (!prev.isOpen) {
			return prev
		}

		const next = {
			activePanel: null,
			lastPanel: prev.lastPanel,
			isOpen: false,
		}
		setState(next, { previousState: prev })
		return getState()
	}

	function setLastPanel(panelId) {
		if (!isValidPanelId(panelId)) {
			return getState()
		}

		const prev = getState()
		if (prev.lastPanel === panelId) {
			return prev
		}

		const next = {
			...prev,
			lastPanel: panelId,
		}
		setState(next, { previousState: prev, persist: false })
		return getState()
	}

	function getLastPanel() {
		return state.lastPanel
	}

	function setPersistHandler(handler) {
		persistHandler = typeof handler === 'function' ? handler : null
	}

	function subscribe(listener) {
		if (typeof listener !== 'function') {
			return () => {}
		}
		stateListeners.add(listener)
		return () => {
			stateListeners.delete(listener)
		}
	}

	function getEntityInfoLabel() {
		const meta = resolveEntityMeta(resolveCurrentEntity)
		const labelSource = meta?.name || 'Entity'
		return `${labelSource} Info`
	}

	function notifyEntityInfoLabelListeners() {
		const label = getEntityInfoLabel()
		entityInfoLabelListeners.forEach(listener => {
			listener(label)
		})
	}

	function subscribeToEntityInfoLabel(listener) {
		if (typeof listener !== 'function') {
			return () => {}
		}
		entityInfoLabelListeners.add(listener)
		return () => {
			entityInfoLabelListeners.delete(listener)
		}
	}

	notifyEntityInfoLabelListeners()

	return {
		getState,
		togglePanel,
		openPanel,
		closePanel,
		setLastPanel,
		getLastPanel,
		setPersistHandler,
		setPanelIds,
		isValidPanelId,
		subscribe,
		getEntityInfoLabel,
		subscribeToEntityInfoLabel,
		refreshEntityInfoLabel: notifyEntityInfoLabelListeners,
		getStateSnapshot,
		applySnapshot,
	}
}
