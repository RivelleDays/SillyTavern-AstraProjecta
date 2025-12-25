export function destroyActionHandles(handles) {
	if (!handles) return
	for (const handle of handles) {
		if (!handle) continue
		try {
			handle.destroy?.()
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to cleanup home card actions.', error)
		}
	}
}

export function cleanupCardEntries(entries) {
	if (!Array.isArray(entries) || !entries.length) return
	for (const entry of entries) {
		if (typeof entry?.destroy !== 'function') continue
		try {
			entry.destroy()
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to cleanup home card entry.', error)
		}
	}
}

export function canReuseHomeCardGrid({ previousSnapshot, nextSnapshot, expectedLength }) {
	if (!Array.isArray(previousSnapshot) || !Array.isArray(nextSnapshot)) return false
	if (typeof expectedLength !== 'number' || expectedLength !== nextSnapshot.length) return false
	if (previousSnapshot.length !== nextSnapshot.length) return false
	for (let index = 0; index < nextSnapshot.length; index += 1) {
		if (previousSnapshot[index] !== nextSnapshot[index]) {
			return false
		}
	}
	return true
}

