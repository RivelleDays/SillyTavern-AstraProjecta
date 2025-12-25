import React from 'react'
import { createRoot } from 'react-dom/client'
import { getHomeRoute, subscribeHomeRouteStore } from '../state/homeRouteStore.js'
import { CharacterEntityRoot } from './CharacterEntityRoot.jsx'
import { initializeHomeEntityStore, setHomeEntityRoute } from '../state/homeEntityStore.js'

export function mountCharacterEntityReact({ panelMains, deps = {} } = {}) {
	if (!panelMains || typeof panelMains.get !== 'function') return null
	const detailsHost = panelMains.get('details')
	if (!detailsHost) return null

	initializeHomeEntityStore(deps)

	detailsHost.replaceChildren()

	const detailsRoot = createRoot(detailsHost)
	detailsRoot.render(<CharacterEntityRoot deps={deps} />)

	const unsubscribeRoute = subscribeHomeRouteStore(route => {
		setHomeEntityRoute(route)
	})
	setHomeEntityRoute(getHomeRoute())

	return {
		destroy() {
			try {
				detailsRoot.unmount()
			} catch {
				// no-op
			}
			if (typeof unsubscribeRoute === 'function') {
				unsubscribeRoute()
			}
		},
	}
}
