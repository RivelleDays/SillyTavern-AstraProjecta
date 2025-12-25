export function hideDrawers(drawerIds = [], enforceDrawerAlwaysOpen) {
	const ids = Array.isArray(drawerIds) ? drawerIds : []
	for (const id of ids) {
		if (!id) continue
		const drawer = document.getElementById(id)
		if (!drawer) continue
		drawer.classList.add('openDrawer')
		drawer.classList.remove('closedDrawer')
		drawer.style.display = 'none'
		if (typeof enforceDrawerAlwaysOpen === 'function') {
			enforceDrawerAlwaysOpen(id)
		}
	}
}
