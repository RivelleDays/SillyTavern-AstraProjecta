/**
 * Render the Character Management panel with secondary tabs.
 * Keeps original DOM structure, class names, and strings unchanged.
 * Dependencies are passed in to avoid global coupling.
 *
 * @param {HTMLElement} container - Target container for the panel.
 * @param {object} deps - External dependencies injected by index.js.
 * @param {function} deps.createSecondaryTabs - Factory for secondary tabs.
 * @param {HTMLElement} deps.sidebarHeader - Shared header element for tab title slot.
 * @param {function} deps.portDrawerInto - Utility to port existing drawers into a container.
 * @returns {{ tabsApi: any }} - Exposes the tabs API for external control (title updates, etc.).
 */
import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'

const CHARACTER_MANAGE_ICON = getLucideIconMarkup('user-cog')
const CHARACTER_ADVANCED_ICON = getLucideIconMarkup('user-pen')

export function renderCharacterManagement(container, deps) {
	const {
		createSecondaryTabs,
		sidebarHeader,
		sidebarHeaderTitleSlot,
		portDrawerInto,
	} = deps

	// Reset container
	container.innerHTML = ''

	// ---- "Manage" tab content ----
	const manageContent = document.createElement('div')
	const manageDrawer = portDrawerInto('right-nav-panel', manageContent)
	if (!manageDrawer)
		manageContent.innerHTML =
			'<div class="panel-subtitle" style="padding: 1rem;">Could not load Character Management content.</div>'


	// ---- "Advanced" tab content ----
	const advancedContent = document.createElement('div')
	const advancedDrawer = portDrawerInto('character_popup', advancedContent)
	if (advancedDrawer)
		// Ensure visibility (mirrors original inline style behavior)
		advancedDrawer.style.cssText += 'display: flex !important; opacity: 1 !important;'
	else
		advancedContent.innerHTML =
			'<div class="panel-subtitle" style="padding: 1rem;">Could not load Advanced Definitions content.</div>'


	// ---- Tabs definition (IDs, titles, content) ----
	const charManagementTabItems = [
		{ id: 'char-manage', title: 'Manage', content: manageContent },
		{ id: 'char-advanced', title: 'Advanced', content: advancedContent },
	]

	// ---- Structured headings (icon + label) ----
	const CHAR_HEADINGS = {
		'char-manage': { icon: CHARACTER_MANAGE_ICON, label: 'Character Management' },
		'char-advanced': { icon: CHARACTER_ADVANCED_ICON, label: 'Advanced Definitions' },
	}

	// ---- Create tabs and attach to shared header slot ----
	const tabs = createSecondaryTabs(charManagementTabItems, {
		headings: CHAR_HEADINGS,
		externalTitleSlot: sidebarHeaderTitleSlot || sidebarHeader,
		idPrefix: 'tabs-char',
		titleSlotGuard: 'character-management',
	})

	// Mount tabs
	container.appendChild(tabs.root)

	// Expose tabs API so index.js can keep updating the sidebarHeader title
	return { tabsApi: tabs }
}
