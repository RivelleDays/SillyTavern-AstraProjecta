// @ts-check

/**
 * @typedef {{ id: string, title?: string, iconMarkup?: string, [key: string]: unknown }} SidebarNavItem
 * @typedef {{ top: SidebarNavItem[], middle: SidebarNavItem[], bottom: SidebarNavItem[] }} SidebarNavSections
 * @typedef {{ activeTab: string, isExpanded: boolean, sections: SidebarNavSections }} SidebarNavSnapshot
 * @typedef {{
 *   subscribe(listener: () => void): () => void
 *   getSnapshot(): SidebarNavSnapshot
 *   getServerSnapshot(): SidebarNavSnapshot
 *   setActiveTab(tabId: string): void
 *   setIsExpanded(expanded: boolean): void
 *   setSections(sections: SidebarNavSections | null | undefined): void
 * }} SidebarNavStore
 */

/**
 * Create a shallow copy of nav sections to avoid accidental shared references.
 * @param {SidebarNavSections | null | undefined} sections
 * @returns {SidebarNavSections}
 */
function cloneSections(sections) {
	if (!sections)
		return /** @type {SidebarNavSections} */ ({
			top: [],
			middle: [],
			bottom: [],
		})

	return /** @type {SidebarNavSections} */ ({
		top: Array.isArray(sections.top) ? [...sections.top] : [],
		middle: Array.isArray(sections.middle) ? [...sections.middle] : [],
		bottom: Array.isArray(sections.bottom) ? [...sections.bottom] : [],
	})
}

/**
 * Build a reactive sidebar navigation store compatible with React's external store API.
 * @param {Partial<SidebarNavSnapshot>} [initialState]
 * @returns {SidebarNavStore}
 */
export function createSidebarNavStore(initialState = {}) {
	/** @type {SidebarNavSnapshot} */
	let state = {
		activeTab: initialState.activeTab ?? 'chat',
		isExpanded: initialState.isExpanded ?? true,
		sections: cloneSections(initialState.sections),
	}

	/** @type {Set<() => void>} */
	const listeners = new Set()

	function emit() {
		listeners.forEach(listener => {
			try {
				listener()
			} catch {
				// Swallow listener errors to keep the store resilient.
			}
		})
	}

	/**
	 * @param {Partial<SidebarNavSnapshot>} partial
	 */
	function update(partial) {
		state = { ...state, ...partial }
		emit()
	}

	return {
		/**
		 * Subscribe to state changes.
		 * @param {() => void} listener
		 * @returns {() => void}
		 */
		subscribe(listener) {
			if (typeof listener !== 'function') return () => {}
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		/**
		 * Capture the latest snapshot for frameworks using the external store API.
		 * @returns {SidebarNavSnapshot}
		 */
		getSnapshot() {
			return state
		},
		/**
		 * SSR-friendly snapshot accessor.
		 * @returns {SidebarNavSnapshot}
		 */
		getServerSnapshot() {
			return state
		},
		/**
		 * Persist the active tab identifier.
		 * @param {string} tabId
		 */
		setActiveTab(tabId) {
			if (typeof tabId !== 'string') return
			update({ activeTab: tabId })
		},
		/**
		 * Persist the expansion state.
		 * @param {boolean} expanded
		 */
		setIsExpanded(expanded) {
			update({ isExpanded: !!expanded })
		},
		/**
		 * Replace the navigation sections displayed in the rail.
		 * @param {SidebarNavSections | null | undefined} sections
		 */
		setSections(sections) {
			update({ sections: cloneSections(sections) })
		},
	}
}
