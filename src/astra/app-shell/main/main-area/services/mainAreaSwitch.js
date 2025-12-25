import { showChatView } from '../views/chat/chatView.js'
import { showHomeView, hideHomeView } from '../views/home/homeView.js'
import { createPrimaryHeadingNode, applyPrimaryHeadingToSlot } from './primaryHeading.js'

/**
 * Move a drawer-like panel into the main area and show a structured heading.
 * Expects DOM handles and utilities via `deps`.
 */

function flattenNavSections(navItems) {
	if (!navItems) return []
	const coerceArray = section => (Array.isArray(section) ? section : [])
	return [
		...coerceArray(navItems.top),
		...coerceArray(navItems.middle),
		...coerceArray(navItems.bottom),
	]
}

function resolveNavMeta(navItems, navId) {
	return flattenNavSections(navItems).find(item => item.id === navId) ?? null
}

export async function switchMainToDrawer(
	{ navId, drawerId, labelFallback },
	deps
) {
	const {
		ensurePrimaryTitleSlot,
		waitUntilCondition,
		portDrawerInto,
		enforceDrawerAlwaysOpen,
		MAIN_AREA_DRAWERS,
		navItems,
		mainContentWrapper,
		characterSection,
		sheld,
		primaryTitleDivider,
	} = deps

	hideHomeView({ mainContentWrapper })

	// Rebuild the flattened nav registry on demand from injected navItems.
	const navMeta = resolveNavMeta(navItems, navId)

	const titleSlot = ensurePrimaryTitleSlot()

	// Resolve icon/label from the nav registry, with a safe fallback.
	const heading = createPrimaryHeadingNode({
		navId: navMeta?.id ?? navId,
		label: navMeta?.main?.headingLabel || navMeta?.title || labelFallback,
		iconMarkup: navMeta?.iconMarkup || '',
	})

	// Show heading and hide the character section.
	applyPrimaryHeadingToSlot(titleSlot, heading, navMeta?.id ?? navId, { divider: primaryTitleDivider })
	if (characterSection) characterSection.style.display = 'none'

	// Ensure the target drawer exists (wait briefly if needed).
	const resolvedDrawerId = drawerId ?? navMeta?.main?.drawerId
	if (!resolvedDrawerId) return

	const ensureDrawer = () => document.getElementById(resolvedDrawerId)
	let target = ensureDrawer()
	if (!target)
		try {
			await waitUntilCondition(() => !!ensureDrawer(), 3000)
			target = ensureDrawer()
		} catch {
			/* ignore */
		}

	// If the drawer doesn't exist, create a container (keeps behavior stable).
	if (!target) {
		target = document.createElement('div')
		target.id = resolvedDrawerId
		target.className = 'drawer-content'
	}

	// Normalize state and mount into the main area using the shared helper.
	const mountedDrawer = portDrawerInto(target, mainContentWrapper)
	if (mountedDrawer)
		mountedDrawer.style.display = ''


	// Keep it open and hide other main-area drawers.
	enforceDrawerAlwaysOpen(resolvedDrawerId)
	if (sheld) sheld.style.display = 'none'

	for (const id of MAIN_AREA_DRAWERS || []) {
		if (id === resolvedDrawerId) continue
		const other = document.getElementById(id)
		if (other) other.style.display = 'none'
	}
}

/**
	 * Switch the main area based on the active sidebar tab.
	 * Rules mirror the original: WI/Ext open drawers; home forces the home view;
	 * all other tabs keep the current main view unless `forceChat` is true.
	 */
export async function updateMainForTab(tabId, forceChat = false, deps) {
	const {
		navItems,
		setWorkspaceMode,
		mainContentWrapper,
	} = deps

	const navMeta = resolveNavMeta(navItems, tabId)
	const behavior = navMeta?.main?.type
	const targetViewId = navMeta?.main?.viewId || tabId
	const shouldForceChat = forceChat || navMeta?.main?.force === true

	if (typeof setWorkspaceMode === 'function') {
		setWorkspaceMode(targetViewId)
	}

	if (behavior === 'drawer') {
		hideHomeView({ mainContentWrapper })
		await switchMainToDrawer(
			{
				navId: targetViewId,
				drawerId: navMeta?.main?.drawerId,
				labelFallback: navMeta?.main?.headingLabel || navMeta?.title || targetViewId,
			},
			deps
		)
		return
	}

		if (behavior === 'view') {
			if (shouldForceChat || targetViewId === 'chat') {
				showChatView(deps)
				return
			}
			if (targetViewId === 'home') {
				showHomeView({
					...deps,
				})
				return
			}

		// Unknown views fall back to chat for safety.
		showChatView(deps)
		return
	}

	if (shouldForceChat) {
		showChatView(deps)
	}
}
