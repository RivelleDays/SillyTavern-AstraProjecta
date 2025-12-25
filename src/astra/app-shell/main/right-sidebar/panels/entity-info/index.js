import { createCharacterView } from './views/characterView.js'
import { createGroupView } from './views/groupView.js'

const ENTITY_TYPE_LABELS = {
	character: 'Character',
	group: 'Group',
}

const VIEW_FACTORIES = {
	character: createCharacterView,
	group: createGroupView,
}

export function resolveEntityMeta(resolveCurrentEntity, resolution) {
	const fallback = {
		name: 'SillyTavern',
		type: null,
		typeLabel: '',
		hasEntity: false,
		entity: null,
		isGroup: false,
	}

	let resolved = resolution
	if (!resolved && typeof resolveCurrentEntity === 'function') {
		resolved = resolveCurrentEntity() || {}
	}

	if (!resolved || typeof resolved !== 'object') {
		return fallback
	}

	const { entity = null, isGroup = false } = resolved
	if (!entity) {
		return fallback
	}

	const type = isGroup ? 'group' : 'character'
	const name = entity.name || entity.display_name || entity.id || 'SillyTavern'
	const typeLabel = ENTITY_TYPE_LABELS[type] || ''

	return {
		name,
		type,
		typeLabel,
		hasEntity: true,
		entity,
		isGroup: !!isGroup,
	}
}

export function createEntityInfoPanel({ resolveCurrentEntity, eventSource, event_types } = {}) {
	const panel = document.createElement('div')
	panel.id = 'entityInfoPanel'
	panel.className = 'entity-info-panel'

	const toolbar = document.createElement('div')
	toolbar.className = 'entity-info-toolbar'

	const toolbarTabsSlot = document.createElement('div')
	toolbarTabsSlot.className = 'entity-info-toolbar__tabs'

	toolbar.append(toolbarTabsSlot)
	toolbar.hidden = true

	const body = document.createElement('div')
	body.className = 'entityInfoContent'
	panel.append(toolbar, body)

	let activeViewType = null
	let activeViewInstance = null

	function resetToolbar() {
		toolbarTabsSlot.replaceChildren()
		toolbarTabsSlot.dataset.activeTab = ''
		toolbarTabsSlot.scrollLeft = 0
	}

	function setPanelState(type, hasEntity) {
		panel.classList.toggle('entity-info-panel--empty', !hasEntity)
		panel.classList.toggle('character-info-panel', hasEntity && type === 'character')
		panel.classList.toggle('group-info-panel', hasEntity && type === 'group')
		panel.dataset.viewType = hasEntity ? type : ''
		toolbar.hidden = !hasEntity
		if (!hasEntity) {
			resetToolbar()
		}
	}

	function ensureView(type) {
		const factory = type ? VIEW_FACTORIES[type] : null
		if (factory && activeViewType === type && activeViewInstance) {
			return activeViewInstance
		}

		if (typeof activeViewInstance?.destroy === 'function') {
			activeViewInstance.destroy()
		}
		resetToolbar()

		activeViewInstance = null
		activeViewType = null
		body.replaceChildren()

		if (!factory) {
			return null
		}

		const view = factory({
			eventSource,
			event_types,
			resolveCurrentEntity,
			toolbar: {
				element: toolbar,
				tabsSlot: toolbarTabsSlot,
			},
		})
		activeViewInstance = view
		activeViewType = type

		if (view?.root) {
			body.append(view.root)
		}

		return view
	}

	const applyEntityInfo = () => {
		const resolution =
			typeof resolveCurrentEntity === 'function' ? resolveCurrentEntity() || {} : {}
		const meta = resolveEntityMeta(resolveCurrentEntity, resolution)
		const viewType = meta.hasEntity ? meta.type : null

		setPanelState(meta.type, meta.hasEntity)

		const view = ensureView(viewType)
		if (typeof view?.update === 'function') {
			view.update({
				entity: meta.entity,
				meta,
			})
		}
	}

	applyEntityInfo()

	const trackEvents = [
		event_types?.CHAT_CHANGED,
		event_types?.CHARACTER_PAGE_LOADED,
		event_types?.CHARACTER_EDITED,
		event_types?.GROUP_UPDATED,
		event_types?.CHAT_DELETED,
		event_types?.GROUP_CHAT_DELETED,
	].filter(Boolean)

	if (eventSource?.on) {
		trackEvents.forEach(eventName => {
			eventSource.on(eventName, applyEntityInfo)
		})
	}

	return {
		panel,
		updateEntityInfo: applyEntityInfo,
	}
}
