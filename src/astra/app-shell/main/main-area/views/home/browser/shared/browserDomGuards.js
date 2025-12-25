const BLOCKED_DROP_EVENTS = ['dragenter', 'dragover', 'drop']

export function preventCharacterImportDrop(node) {
	if (!node) return
	const handler = event => {
		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation?.()
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'none'
		}
	}
	for (const type of BLOCKED_DROP_EVENTS) {
		node.addEventListener(type, handler)
	}
}

export function disableMediaDragTargets(root) {
	if (!root) return
	const mediaNodes = root.querySelectorAll?.('img, video') ?? []
	for (const element of mediaNodes) {
		element.draggable = false
		element.addEventListener('dragstart', event => {
			event.preventDefault()
		})
	}
}

export function captureScrollPosition(node) {
	if (!node) {
		return () => {}
	}
	const snapshot = {
		top: typeof node.scrollTop === 'number' ? node.scrollTop : 0,
		left: typeof node.scrollLeft === 'number' ? node.scrollLeft : 0,
	}
	let restored = false
	return () => {
		if (restored || !node) return
		restored = true
		try {
			if (typeof node.scrollTo === 'function') {
				node.scrollTo({ top: snapshot.top, left: snapshot.left })
			} else {
				if (typeof node.scrollTop === 'number') {
					node.scrollTop = snapshot.top
				}
				if (typeof node.scrollLeft === 'number') {
					node.scrollLeft = snapshot.left
				}
			}
		} catch {
			// ignore scroll restoration failures
		}
	}
}
