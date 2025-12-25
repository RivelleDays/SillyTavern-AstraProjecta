const HOME_CARD_MIN_WIDTH_PROPERTY = '--home-card-min-width'
const DEFAULT_ROOT_FONT_SIZE_PX = 16

function parsePixelLength(candidate, fallbackPx) {
	const trimmed = typeof candidate === 'string' ? candidate.trim() : ''
	if (!trimmed) return fallbackPx
	const numeric = Number.parseFloat(trimmed)
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return fallbackPx
	}
	if (!trimmed.endsWith('rem') && !trimmed.endsWith('em')) {
		return numeric
	}
	return null
}

function getRootFontSizePx(doc, view) {
	try {
		const computed = view?.getComputedStyle?.(doc?.documentElement)
		const parsed = Number.parseFloat(computed?.fontSize ?? '')
		if (Number.isFinite(parsed) && parsed > 0) {
			return parsed
		}
	} catch {
		// Ignore style read errors
	}
	return DEFAULT_ROOT_FONT_SIZE_PX
}

function getElementFontSizePx(node, view, fallbackPx) {
	try {
		const computed = view?.getComputedStyle?.(node)
		const parsed = Number.parseFloat(computed?.fontSize ?? '')
		if (Number.isFinite(parsed) && parsed > 0) {
			return parsed
		}
	} catch {
		// Ignore style read errors
	}
	return fallbackPx
}

export function readHomeCardMinWidthPx(node, fallbackPx = 280) {
	if (!node) return fallbackPx
	const doc = node.ownerDocument
	const view = doc?.defaultView ?? globalThis
	if (!doc || typeof view?.getComputedStyle !== 'function') {
		return fallbackPx
	}
	try {
		const styles = view.getComputedStyle(node)
		const raw = styles?.getPropertyValue?.(HOME_CARD_MIN_WIDTH_PROPERTY)
		const direct = parsePixelLength(raw, fallbackPx)
		if (direct !== null) {
			return direct
		}

		const trimmed = typeof raw === 'string' ? raw.trim() : ''
		const numeric = Number.parseFloat(trimmed)
		if (!Number.isFinite(numeric) || numeric <= 0) {
			return fallbackPx
		}
		if (trimmed.endsWith('rem')) {
			return numeric * getRootFontSizePx(doc, view)
		}
		if (trimmed.endsWith('em')) {
			return numeric * getElementFontSizePx(node, view, getRootFontSizePx(doc, view))
		}
		return fallbackPx
	} catch {
		return fallbackPx
	}
}

