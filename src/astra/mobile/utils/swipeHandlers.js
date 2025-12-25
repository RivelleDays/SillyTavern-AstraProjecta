import { isMobile } from './device.js'

/**
 * Attaches swipe and wheel handlers to an element for horizontal navigation, optimized for mobile.
 * @param {HTMLElement} el
 * @param {{ onLeft?: function, onRight?: function }} param1
 */
function attachSwipeHandlers(el, { onLeft, onRight }) {
	let startX = 0, startY = 0, dragging = false
	const threshold = 30
	const wheelDeltaX = 25

	el.addEventListener('touchstart', (e) => {
		if (!isMobile()) return
		const t = e.touches[0]
		startX = t.clientX; startY = t.clientY; dragging = true
	}, { passive: true })

	el.addEventListener('touchmove', (e) => {
		if (!dragging || !isMobile()) return
		const t = e.touches[0]
		const dx = t.clientX - startX
		const dy = t.clientY - startY
		if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
			dragging = false
			dx < 0 ? onLeft?.() : onRight?.()
		}
	}, { passive: true })

	el.addEventListener('touchend', () => { dragging = false })

	el.addEventListener('mousedown', (e) => {
		if (e.button !== 0 || !isMobile()) return
		startX = e.clientX; startY = e.clientY; dragging = true
	})

	window.addEventListener('mousemove', (e) => {
		if (!dragging || !isMobile()) return
		const dx = e.clientX - startX
		const dy = e.clientY - startY
		if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
			dragging = false
			dx < 0 ? onLeft?.() : onRight?.()
		}
	})

	window.addEventListener('mouseup', () => { dragging = false })

	el.addEventListener('wheel', (e) => {
		if (!isMobile()) return
		if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > wheelDeltaX)
			e.deltaX > 0 ? onLeft?.() : onRight?.()

	}, { passive: true })
}

export { attachSwipeHandlers }
