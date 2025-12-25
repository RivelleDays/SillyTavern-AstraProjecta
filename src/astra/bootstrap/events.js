import {
	initLoreService,
	updateLoreEntriesIfNeeded,
} from '../app-shell/main/right-sidebar/panels/lore-info/index.js'

export function attachEventHandlers({
	context,
	helpers,
	stores,
	mobileRuntime,
	shell,
	rightSidebar,
	dependencies,
}) {
	const { eventSource, event_types } = context ?? {}
	if (!eventSource || typeof eventSource.on !== 'function') return

	const {
		debounce,
		debounceTimeout,
		getSortedEntries,
	} = dependencies ?? {}

	const {
		restorePersistedState,
	} = stores ?? {}

	const {
		actions,
	} = shell ?? {}

	const {
		updateCharacterDisplay,
		resolveCurrentEntity,
		getEntityNameLower,
	} = actions ?? {}

	const { syncMainVisibility } = mobileRuntime ?? {}

	const {
		rightSidebar: rightSidebarApi,
		controllers,
		registers,
	} = rightSidebar ?? {}

	const loreController = controllers?.lore ?? {}

	const updateDebounced = debounce?.(() => {
		updateCharacterDisplay?.()
		rightSidebarApi?.updateEntityInfo?.()
	}, debounceTimeout?.short ?? 200)

	if (typeof eventSource.on === 'function') {
		eventSource.on(event_types?.CHAT_CHANGED, updateDebounced)
		eventSource.on(event_types?.CHARACTER_PAGE_LOADED, updateDebounced)
		eventSource.on(event_types?.CHARACTER_EDITED, updateDebounced)
		eventSource.on(event_types?.GROUP_UPDATED, updateDebounced)
		eventSource.on(event_types?.CHAT_DELETED, updateDebounced)
		eventSource.on(event_types?.GROUP_CHAT_DELETED, updateDebounced)

		eventSource.on(event_types?.CHAT_DELETED, () => {
			syncMainVisibility?.()
		})
		eventSource.on(event_types?.GROUP_CHAT_DELETED, () => {
			syncMainVisibility?.()
		})
		eventSource.on(event_types?.CHAT_CHANGED, () => {
			syncMainVisibility?.()
			rightSidebarApi?.refreshZoomedAvatar?.()
			loreController.updateLoreMatches?.(true)
			loreController.renderActiveList?.()
			loreController.renderActiveListAll?.()
			loreController.updateLoreBadge?.()
		})
		eventSource.on(event_types?.CHARACTER_EDITED, () => {
			rightSidebarApi?.refreshZoomedAvatar?.()
		})
	}

	eventSource.once?.(event_types?.APP_READY, async () => {
		initLoreService({
			getSortedEntries,
			ctx: helpers?.getContext,
			resolveCurrentEntity,
			getEntityNameLower,
		})

		registers?.hydrateAiSettingsTab?.()

		loreController.subscribeWorldInfoEvents?.()
		await updateLoreEntriesIfNeeded()
		loreController.hookTextareaListeners?.()

		loreController.renderActiveList?.()
		loreController.renderActiveListAll?.()
		loreController.updateLoreMatches?.(true)
		loreController.updateLoreBadge?.()

		await restorePersistedState?.()
	})
}
