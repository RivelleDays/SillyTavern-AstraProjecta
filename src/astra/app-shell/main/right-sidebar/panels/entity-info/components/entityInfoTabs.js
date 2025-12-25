import { createAccentTabs } from '../../../../../../shared/components/index.js'

function noop() {}

export function createEntityInfoTabs(items, options = {}) {
	const {
		idPrefix = 'entity-info-tabs',
		titleSlot = null,
		tabsSlot = null,
		onChange,
	} = options

	const tabsChangeHandler =
		typeof onChange === 'function'
			? (next, prev) => {
				try {
					onChange(next, prev)
				} catch (error) {
					console.debug('Entity info tabs: onChange handler failed.', error)
				}
			}
			: noop

	const accentTabs = createAccentTabs(items, {
		idPrefix,
		externalTitleSlot: titleSlot,
		onChange: (next, prev) => {
			if (tabsSlot) {
				tabsSlot.dataset.activeTab = next
			}
			tabsChangeHandler(next, prev)
		},
	})

	const { tabs, panels, root } = accentTabs
	root.classList.add('entity-info-tabs-root')
	panels.classList.add('entity-info-tabs__panels')
	tabs.classList.add('entity-info-tabs__tablist')
	tabs.querySelectorAll('.accent-tab').forEach(tab => tab.classList.add('entity-info-tabs__tab'))
	panels.querySelectorAll('.accent-tabpanel').forEach(panel => panel.classList.add('entity-info-tabs__panel'))

	if (tabsSlot) {
		tabsSlot.replaceChildren(tabs)
		tabsSlot.dataset.activeTab = items[0]?.id ?? ''
	} else {
		root.prepend(tabs)
	}

	function destroy() {
		if (tabsSlot && tabsSlot.contains(tabs)) {
			tabsSlot.removeChild(tabs)
			tabsSlot.dataset.activeTab = ''
		}
		root.replaceChildren()
	}

	return {
		root,
		panels,
		tabs,
		accentTabs,
		destroy,
	}
}
