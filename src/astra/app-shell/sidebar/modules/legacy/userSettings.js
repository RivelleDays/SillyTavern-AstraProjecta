import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'

const SETTINGS_ICON = getLucideIconMarkup('settings')
const ASTRA_ICON = getLucideIconMarkup('asterisk')

export function renderUserSettings(container, {
	createSecondaryTabs,
	sidebarHeader,
	sidebarHeaderTitleSlot,
	portDrawerInto,
}) {
	container.innerHTML = ''

	// Prepare content for the SillyTavern settings tab (ported from the host drawer)
	const stSettingsContent = document.createElement('div')
	const userSettingsDrawer = portDrawerInto('user-settings-block', stSettingsContent)
	if (!userSettingsDrawer)
		stSettingsContent.innerHTML = '<div class="panel-subtitle" style="padding: 1rem;">Could not load SillyTavern Settings.</div>'


	// Placeholder content for your custom expansion settings tab
	const astraProjectaContent = document.createElement('div')
	astraProjectaContent.innerHTML = '<div class="panel-subtitle" style="padding: 1rem;">Content for AstraProjecta is not yet implemented.</div>'

	// Define tab items and their headings (IDs preserved for stable selectors)
	const items = [
		{ id: 'st-user-settings', title: 'SillyTavern', content: stSettingsContent },
		{ id: 'astra-projecta', title: 'AstraProjecta', content: astraProjectaContent },
	]

	const HEADINGS = {
		'st-user-settings': { icon: SETTINGS_ICON, label: 'SillyTavern Settings' },
		'astra-projecta': { icon: ASTRA_ICON, label: 'AstraProjecta Settings' },
	}

	// Build secondary tabs and mount into the container, using the shared header slot
	const tabs = createSecondaryTabs(items, {
		headings: HEADINGS,
		externalTitleSlot: sidebarHeaderTitleSlot || sidebarHeader,
		idPrefix: 'tabs-user', // Produces stable IDs like #tabs-user--st-user-settings, etc.
		titleSlotGuard: 'user-settings',
	})

	container.appendChild(tabs.root)

	// Expose the tabs API to the caller so index.js can track/update the current heading
	return { tabsApi: tabs }
}
