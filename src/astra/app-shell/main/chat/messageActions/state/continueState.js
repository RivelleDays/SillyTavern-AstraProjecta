const REVISION_KIND = {
	ORIGIN: 'origin',
	CONTINUE: 'continue',
	REGENERATE: 'regenerate',
	EDIT: 'edit',
}

function isValidMessageText(text) {
	return typeof text === 'string' && text.trim() && text.trim() !== '...'
}

function markSwipeMetadata(swipe, kind) {
	if (!swipe) return
	if (!swipe.kind) {
		swipe.kind = kind
	}
	if (typeof swipe.createdAt !== 'number') {
		swipe.createdAt = Date.now()
	}
}

function cacheMessageText(message) {
	if (!message) return
	if (isValidMessageText(message.mes)) {
		message._astraContinueCachedText = message.mes
	}
}

function ensureContinueData(message) {
	if (!message) return
	const swipeId = message.swipe_id ?? 0
	if (!message.continueHistory || !message.continueHistory[swipeId]) {
		if (!message.continueHistory) {
			message.continueHistory = (message.swipes ?? [message.mes]).map(it => ({
				mes: it,
				swipes: [],
				parent: [],
				active: null,
				fullText: typeof it === 'string' ? it : undefined,
				kind: REVISION_KIND.ORIGIN,
				createdAt: Date.now(),
			}))
		} else if (!message.continueHistory[swipeId]) {
			message.continueHistory[swipeId] = {
				mes: message.swipe_id === undefined ? message.mes : message.swipes[message.swipe_id],
				swipes: [],
				parent: [],
				fullText: isValidMessageText(
					message.swipe_id === undefined
						? message.mes
						: message.swipes?.[message.swipe_id] ?? message.mes,
				)
					? message.swipe_id === undefined
						? message.mes
						: message.swipes?.[message.swipe_id] ?? message.mes
					: undefined,
				kind: REVISION_KIND.ORIGIN,
				createdAt: Date.now(),
			}
		}
		message.continueSwipeId = swipeId
		message.continueSwipe = message.continueHistory[swipeId]
		message.continueHistory[swipeId].active = [...(message.continueSwipe.parent ?? []), message.continueSwipeId]
	} else {
		if (typeof message.continueSwipeId !== 'number') {
			message.continueSwipeId = swipeId
		}
		if (!message.continueSwipe) {
			message.continueSwipe = message.continueHistory[swipeId]
		}
		if (!Array.isArray(message.continueHistory[swipeId].active) || !message.continueHistory[swipeId].active.length) {
			message.continueHistory[swipeId].active = [...(message.continueSwipe?.parent ?? []), message.continueSwipeId]
		}
		if (!message.continueHistory[swipeId].kind) {
			message.continueHistory[swipeId].kind = REVISION_KIND.ORIGIN
		}
		if (typeof message.continueHistory[swipeId].createdAt !== 'number') {
			message.continueHistory[swipeId].createdAt = Date.now()
		}
		if (
			!message.continueHistory[swipeId].fullText &&
			typeof message.mes === 'string' &&
			isValidMessageText(message.mes)
		) {
			message.continueHistory[swipeId].fullText = message.mes
		}
	}

	const rootSwipe = message.continueHistory?.[swipeId]
	if (rootSwipe) {
		const active = Array.isArray(rootSwipe.active) ? rootSwipe.active : []
		const normalizedActive = active.length && active[0] === swipeId ? active : [swipeId]
		rootSwipe.active = normalizedActive

		let swipes = message.continueHistory
		let targetSwipe = null
		normalizedActive.forEach(idx => {
			const candidate = swipes?.[idx]
			if (!candidate) return
			targetSwipe = candidate
			swipes = candidate.swipes
		})

		if (targetSwipe) {
			message.continueSwipe = targetSwipe
			message.continueSwipeId = normalizedActive[normalizedActive.length - 1]
		} else {
			message.continueSwipe = rootSwipe
			message.continueSwipeId = swipeId
		}
	}
}

function hydrateContinueState(message) {
	if (!message) return
	ensureContinueData(message)

	const rootIndex = message.swipe_id ?? 0
	const history = message.continueHistory
	const rawActivePath =
		Array.isArray(history?.[rootIndex]?.active) && history[rootIndex].active.length
			? history[rootIndex].active
			: [rootIndex]
	const activePath = rawActivePath[0] === rootIndex ? rawActivePath : [rootIndex]

	let swipes = history
	let target = null
	const validPath = []

	for (const idx of activePath) {
		const swipe = swipes?.[idx]
		if (!swipe) break
		target = swipe
		validPath.push(idx)
		swipes = swipe.swipes
	}

	if (!target && history?.[rootIndex]) {
		target = history[rootIndex]
		validPath.push(rootIndex)
	}

	if (target) {
		message.continueSwipe = target
		message.continueSwipeId = validPath[validPath.length - 1]
		if (history?.[rootIndex]) {
			history[rootIndex].active = [...validPath]
		}
	}

	const rootSwipe = history?.[rootIndex]
	if (rootSwipe) {
		markSwipeMetadata(rootSwipe, REVISION_KIND.ORIGIN)
		if (!rootSwipe.fullText && typeof message.mes === 'string' && isValidMessageText(message.mes)) {
			rootSwipe.fullText = message.mes
		}
	}

	cacheMessageText(message)
}

function getTextForPath(message, path = []) {
	if (!message?.continueHistory || !Array.isArray(path)) return ''
	let swipes = message.continueHistory
	let text = ''
	for (const idx of path) {
		const swipe = swipes?.[idx]
		if (!swipe) break
		text += swipe.mes ?? ''
		swipes = swipe.swipes
	}
	return text
}

function findSwipeByPath(message, path = []) {
	if (!message?.continueHistory || !Array.isArray(path)) return null
	let swipes = message.continueHistory
	let swipe = null
	for (const idx of path) {
		swipe = swipes?.[idx]
		if (!swipe) return null
		swipes = swipe.swipes
	}
	return swipe
}

function getTextForPathWithFull(message, path = []) {
	const swipe = findSwipeByPath(message, path)
	if (typeof swipe?.fullText === 'string') return swipe.fullText
	return getTextForPath(message, path)
}

export {
	REVISION_KIND,
	cacheMessageText,
	ensureContinueData,
	findSwipeByPath,
	getTextForPath,
	getTextForPathWithFull,
	hydrateContinueState,
	isValidMessageText,
	markSwipeMetadata,
}
