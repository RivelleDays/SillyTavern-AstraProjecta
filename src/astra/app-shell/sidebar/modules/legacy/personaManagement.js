/**
 * Render the Persona Management panel into the given container.
 * - Keeps internal .persona_management_* DOM handling intact.
 * - Uses injected deps to avoid global coupling.
 * - Returns { tabsApi } for external header/title synchronization.
 *
 * @param {HTMLElement} container
 * @param {{ createSecondaryTabs: Function, sidebarHeader: HTMLElement, portDrawerInto: Function }} deps
 * @returns {{ tabsApi: any }}
 */
import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'

const PERSONA_MANAGE_ICON = getLucideIconMarkup('user-cog')
const PERSONA_EDIT_ICON = getLucideIconMarkup('user-pen')

export function renderPersonaManagement(container, deps) {
	const {
		createSecondaryTabs,
		sidebarHeader,
		sidebarHeaderTitleSlot,
		portDrawerInto,
	} = deps
	container.innerHTML = ''

	// Source drawer from the host document
	const manageContent = document.createElement('div')
	const editContent = document.createElement('div')

	const personaManagementDrawer = portDrawerInto('PersonaManagement', manageContent)

	if (personaManagementDrawer) {
		// Extract the "Edit" block to its own tab if present
		const currentPersonaEl = personaManagementDrawer.querySelector('.persona_management_current_persona')
		if (currentPersonaEl)
			editContent.appendChild(currentPersonaEl)
		else
			editContent.innerHTML = '<div class="panel-subtitle" style="padding:1rem;">Could not find the persona editing block.</div>'


		// Move the whole drawer into "Manage" tab
		// Optional: reorder globals before main block for better layout parity
		const globalSettingsEl = manageContent.querySelector('.persona_management_global_settings')
		const blockEl = manageContent.querySelector('#persona-management-block')
		if (globalSettingsEl && blockEl && globalSettingsEl !== blockEl.previousElementSibling)
			blockEl.parentNode.insertBefore(globalSettingsEl, blockEl)

	} else {
		const err = '<div class="panel-subtitle" style="padding:1rem;">Could not find #PersonaManagement in the page.</div>'
		manageContent.innerHTML = err
		editContent.innerHTML = err
	}

	// Tab items + headings hooked to the shared sidebar header
	const items = [
		{ id: 'persona-manage', title: 'Manage', content: manageContent },
		{ id: 'persona-edit', title: 'Edit', content: editContent },
	]

	const HEADINGS = {
		'persona-manage': { icon: PERSONA_MANAGE_ICON, label: 'Persona Management' },
		'persona-edit': { icon: PERSONA_EDIT_ICON, label: 'Persona Editing' },
	}

	// Build secondary tabs and link the title to the main sidebar header
	const tabs = createSecondaryTabs(items, {
		headings: HEADINGS,
		externalTitleSlot: sidebarHeaderTitleSlot || sidebarHeader,
		idPrefix: 'tabs-persona',
		titleSlotGuard: 'persona-management',
	})

	container.appendChild(tabs.root)
	return { tabsApi: tabs }
}
