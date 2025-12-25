import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'
import { getMobileMediaQuery, MOBILE_MEDIA_QUERY } from '../../../../mobile/utils/device.js'

/**
 * Render the AI Settings panel using pre-ported drawer items.
 * Keeps the original tab headings and external title slot behavior.
 * @param {HTMLElement} container - Target panel container in the sidebar.
 * @param {object} deps - Injected dependencies for testability and maintenance.
 * @param {function} deps.createSecondaryTabs - Tab factory.
 * @param {HTMLElement} deps.sidebarHeader - Header node for external title slot.
 * @param {HTMLElement} [deps.sidebarHeaderTitleSlot] - Optional dedicated title slot inside the header.
 * @param {Array<{id:string,title:string,content:HTMLElement}>} [deps.portedDrawerItems] - Prepared drawers.
 * @returns {{ tabsApi: any }}
 */
export function renderAiSettings(container, deps) {
	const {
		createSecondaryTabs,
		sidebarHeader,
		sidebarHeaderTitleSlot,
		portedDrawerItems = [],
	} = deps || {}

	// Reset panel content to ensure idempotent render calls
	container.innerHTML = ''

	// Tear down any previous movers to avoid duplicate listeners on re-renders
	if (window.__aiCompletionPopupMover && typeof window.__aiCompletionPopupMover.dispose === 'function') {
		try { window.__aiCompletionPopupMover.dispose() } catch (_) {}
		window.__aiCompletionPopupMover = null
	}

	/**
	 * Relocate #completion_prompt_manager_popup based on viewport.
	 * - Desktop (default): append to <main id="mainContentWrapper"> as the last child.
	 * - Mobile (max-width: 600px): insert under <div id="tabs-ai--root"> as a sibling
	 *   AFTER <div id="tabs-ai--panels">.
	 * The logic is resilient to late-mounted nodes via MutationObserver and reacts to
	 * viewport changes via matchMedia and orientationchange.
	 */
	function setupCompletionPopupRelocation(tabsRootEl) {
		// Ensure #tabs-ai--root id is present for targeting on mobile
		if (tabsRootEl && !tabsRootEl.id) {
			tabsRootEl.id = 'tabs-ai--root'
		}

		const CTRL = {
			media: getMobileMediaQuery() ?? window.matchMedia(MOBILE_MEDIA_QUERY),
			observer: null,
			disposed: false,
			dispose() {
				if (this.disposed) return
				this.disposed = true
				try { this.media.removeEventListener('change', reposition) } catch (_) {}
				window.removeEventListener('orientationchange', reposition)
				this.observer && this.observer.disconnect()
			},
		}

		const getPopup = () => document.getElementById('completion_prompt_manager_popup')
		const getMain = () => document.getElementById('mainContentWrapper')
		const getAiRoot = () => document.querySelector('#tabs-ai--root') || tabsRootEl || null
		const getPanels = () => document.querySelector('#tabs-ai--panels')

		function placeForDesktop() {
			const popup = getPopup()
			const main = getMain()
			if (!popup || !main) return
			if (popup.parentElement !== main) {
				main.appendChild(popup) // as the last child
			}
		}

		function placeForMobile() {
			const popup = getPopup()
			const root = getAiRoot()
			if (!popup || !root) return

			// Ensure popup lives directly under #tabs-ai--root and after #tabs-ai--panels when available
			const panels = getPanels()
			if (panels && panels.parentElement === root) {
				// Insert AFTER panels
				if (panels.nextSibling) {
					if (popup !== panels.nextSibling) {
						root.insertBefore(popup, panels.nextSibling)
					}
				} else {
					root.appendChild(popup)
				}
			} else {
				// Fallback: just append under root; observer will fix order once panels appear
				if (popup.parentElement !== root) {
					root.appendChild(popup)
				}
			}
		}

		function reposition() {
			if (CTRL.disposed) return
			if (CTRL.media.matches) {
				placeForMobile()
			} else {
				placeForDesktop()
			}
		}

		// React to viewport changes
		try { CTRL.media.addEventListener('change', reposition) } catch (_) {}
		window.addEventListener('orientationchange', reposition)

		// Observe DOM mutations to handle late-mounted nodes
		CTRL.observer = new MutationObserver((mutations) => {
			for (const m of mutations) {
				if (m.type !== 'childList') continue
				// If any relevant node appears, attempt to reposition once
				const added = [...m.addedNodes].filter(n => n && n.nodeType === 1)
				if (
					added.some(n =>
						n.id === 'completion_prompt_manager_popup' ||
						n.id === 'mainContentWrapper' ||
						n.id === 'tabs-ai--root' ||
						n.id === 'tabs-ai--panels' ||
						(typeof n.querySelector === 'function' &&
							n.querySelector('#completion_prompt_manager_popup, #mainContentWrapper, #tabs-ai--root, #tabs-ai--panels'))
					)
				) {
					reposition()
					break
				}
			}
		})
		CTRL.observer.observe(document.body, { childList: true, subtree: true })

		// Initial placement
		reposition()

		return CTRL
	}

	// Build tabs only when prepared drawers are available
	if (Array.isArray(portedDrawerItems) && portedDrawerItems.length > 0) {
		// Prefer centralized metadata from portedDrawerItems; fall back to known defaults
		const DEFAULTS = {
			'left-nav-panel': { icon: 'sliders-horizontal', label: 'AI Response Configuration' },
			'rm_api_block': { icon: 'plug-2', label: 'API Connections' },
			'AdvancedFormatting': { icon: 'type', label: 'AI Response Formatting' },
		}

		const AI_HEADINGS = Object.fromEntries(
			portedDrawerItems.map(item => {
				const base = DEFAULTS[item.id] || {}
				const iconName = item.icon || base.icon
				return [
					item.id,
					{
						icon: iconName ? getLucideIconMarkup(iconName) : undefined,
						label: item.heading || base.label || item.title || item.id,
					},
				]
			})
		)

		// Create secondary tabs and link title updates to the main sidebar header
		const tabs = createSecondaryTabs(portedDrawerItems, {
			headings: AI_HEADINGS,
			externalTitleSlot: sidebarHeaderTitleSlot || sidebarHeader,
			idPrefix: 'tabs-ai', // e.g. #tabs-ai--left-nav-panel
			titleSlotGuard: 'ai-settings',
		})

		// Match original layout expectations
		tabs.root.style.flexGrow = '1'
		tabs.root.style.overflowY = 'auto'

		// Mount into the panel container
		container.appendChild(tabs.root)

		// Install the relocator (works even if popup/root/panels are not present yet)
		window.__aiCompletionPopupMover = setupCompletionPopupRelocation(tabs.root)

		// Return a compatible API for upstream heading syncing
		return { tabsApi: tabs }
	}

	// Fallback when drawers are not yet ready
	container.innerHTML = '<div class="panel-subtitle" style="padding: 1rem;">Could not load AI settings content.</div>'

	// Even without tabs, install relocator so mobile placement works once tabs mount later
	window.__aiCompletionPopupMover = setupCompletionPopupRelocation(null)

	return { tabsApi: null }
}
