import React from 'react'
import { createRoot } from 'react-dom/client'
import { HomeSidebarQuickCharacters } from './HomeSidebarQuickCharacters.jsx'

let homePanelRoot = null

export function renderHomePanel(container, deps = {}) {
	if (!(container instanceof HTMLElement)) return
	container.classList.add('sidebar-home-panel')
	container.replaceChildren()

	const quickHost = container.ownerDocument?.createElement('div') ?? document.createElement('div')
	quickHost.className = 'sidebar-home-panel__quickHost'

	container.append(quickHost)

	if (homePanelRoot) {
		try {
			homePanelRoot.unmount()
		} catch {
			// no-op
		}
		homePanelRoot = null
	}

	try {
		homePanelRoot = createRoot(quickHost)
		homePanelRoot.render(<HomeSidebarQuickCharacters deps={deps} />)
	} catch (error) {
		console?.error?.('[AstraProjecta] Failed to render sidebar home quick characters.', error)
	}
}
