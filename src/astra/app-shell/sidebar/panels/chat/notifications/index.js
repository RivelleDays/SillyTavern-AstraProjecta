import { getLucideIconMarkup } from '@/astra/shared/icons/lucide';

const TOAST_LEVEL_ICONS = {
	warning: getLucideIconMarkup('triangle-alert'),
	error: getLucideIconMarkup('shield-alert'),
	info: getLucideIconMarkup('info'),
	success: getLucideIconMarkup('check'),
};

const store = (() => {
	/** Avoid double-wrapping toastr across hot reloads */
	if (window.__st_toastCapture) return window.__st_toastCapture

	const levels = ['info', 'success', 'warning', 'error']
	const records = []
	let seq = 0
	let wrapped = false

	function wrapToastrOnce() {
		if (wrapped || typeof window.toastr !== 'object') return
		wrapped = true

		levels.forEach(level => {
			if (typeof window.toastr[level] !== 'function') return

			const original = window.toastr[level].bind(window.toastr)

			window.toastr[level] = (message, title, options) => {
				const $res = original(message, title, options)

				try {
					const el = $res?.[0]
					const msgHTML = el?.querySelector?.('.toast-message')?.innerHTML ?? String(message ?? '')
					const onclick = options?.onclick || null
					records.push({
						id: ++seq,
						level,
						title: typeof title === 'string' ? title : '',
						messageHTML: msgHTML,
						timestamp: new Date(),
						onclick,
						read: false,
					})

					// 🔔 Immediately notify any listeners (e.g., the notifications panel) to re-render
					window.dispatchEvent(new CustomEvent('stnp:new-toast'))
				} catch { /* be forgiving */ }

				return $res
			}
		})
	}

	function markAllRead() { records.forEach(r => r.read = true) }
	function clearAll() { records.length = 0 }
	function list() { return records.slice().sort((a, b) => b.timestamp - a.timestamp) }

	// Initialize immediately (safe no-op if toastr is not present yet)
	wrapToastrOnce()

	window.__st_toastCapture = { list, markAllRead, clearAll, wrapToastrOnce }
	return window.__st_toastCapture
})()

// Maps toast level -> leading SVG icon (Lucide). Returns an Element.
function createLevelIcon(level) {
	const span = document.createElement('span')
	span.className = 'stnp-sev-icon'
	span.innerHTML = TOAST_LEVEL_ICONS[level] || TOAST_LEVEL_ICONS.info
	return span.firstElementChild || span
}

/** Renders a simple history panel into the provided container element. */
export function renderNotifications(container) {
	// --- Shell ---
	container.innerHTML = ''
	const wrap = document.createElement('div')
	wrap.className = 'stnp-wrap'

	// Header with actions
	const header = document.createElement('div')
	header.className = 'stnp-head'

	const title = document.createElement('div')
	title.className = 'stnp-title'

	const actions = document.createElement('div')
	actions.className = 'stnp-actions'

	const btnRead = document.createElement('button')
	btnRead.type = 'button'
	btnRead.className = 'stnp-btn stnp-btn-read'
	btnRead.textContent = 'Mark all as read'
	btnRead.title = 'Set every notification as read'

	const btnClear = document.createElement('button')
	btnClear.type = 'button'
	btnClear.className = 'stnp-btn stnp-btn-clear'
	btnClear.textContent = 'Clear all'
	btnClear.title = 'Remove all records'

	actions.append(btnRead, btnClear)
	header.append(title, actions)

	// List container
	const list = document.createElement('div')
	list.className = 'stnp-list'

	// Empty state
	const empty = document.createElement('div')
	empty.className = 'stnp-empty'
	empty.textContent = 'No notifications yet.'

	wrap.append(header, list, empty)
	container.appendChild(wrap)

	// --- Render logic ---
	function render() {
		const items = store.list()
		list.innerHTML = ''
		empty.style.display = items.length ? 'none' : ''

		for (const item of items) {
			const row = document.createElement('div')
			row.className = 'stnp-item'
			row.dataset.level = item.level
			if (item.read) row.classList.add('is-read')

			// Top-left: severity badge
			const sev = document.createElement('span')
			sev.className = 'stnp-sev'
			sev.appendChild(createLevelIcon(item.level)) // icon first
			sev.appendChild(document.createTextNode(' ' + item.level)) // then text

			// Top-right: timestamp (and optional action)
			const meta = document.createElement('div')
			meta.className = 'stnp-meta'

			const ts = document.createElement('time')
			ts.className = 'stnp-ts'
			ts.dateTime = item.timestamp.toISOString()
			ts.textContent = item.timestamp.toLocaleString()
			meta.appendChild(ts)

			if (typeof item.onclick === 'function') {
				const open = document.createElement('button')
				open.type = 'button'
				open.className = 'stnp-mini'
				open.title = 'Trigger notification action'
				open.textContent = 'Open'
				open.addEventListener('click', () => { try { item.onclick() } catch { } })
				meta.appendChild(open)
			}

			// Second row: body (optional title + message HTML)
			const body = document.createElement('div')
			body.className = 'stnp-body'

			if (item.title) {
				const ttl = document.createElement('div')
				ttl.className = 'stnp-titleline'
				ttl.textContent = item.title
				body.appendChild(ttl)
			}

			const msg = document.createElement('div')
			msg.className = 'stnp-msg'
			msg.innerHTML = item.messageHTML
			body.appendChild(msg)

			// Place elements into 2-row grid
			row.append(sev, meta, body)
			list.appendChild(row)
		}
	}

	// --- Actions ---
	btnRead.addEventListener('click', () => { store.markAllRead(); render() })
	btnClear.addEventListener('click', () => { store.clearAll(); render() })

	// Ensure wrapper is active (safe if already wrapped)
	store.wrapToastrOnce()

	// Initial paint
	render()

	// Re-render on every new toast (authoritative signal from our wrapper)
	const rerenderOnToast = () => { requestAnimationFrame(render) }
	window.addEventListener('stnp:new-toast', rerenderOnToast);

	// Robustly attach an observer once #toast-container exists (some skins add it later)
	// We only use this as a secondary signal in case third-party code mutates toasts post-factum.
	(function attachToastObserverRobustly() {
		const tryAttach = () => {
			const toastContainer = document.querySelector('#toast-container')
			if (!toastContainer) return false
			const mo = new MutationObserver(() => render())
			mo.observe(toastContainer, { childList: true, subtree: true })
			return true
		}

		if (tryAttach()) return

		// If container isn't in DOM yet, watch <body> until it appears
		const bodyMO = new MutationObserver(() => {
			if (tryAttach()) bodyMO.disconnect()
		})
		bodyMO.observe(document.body, { childList: true, subtree: true })
	})()

	// --- Actions ---
	btnRead.addEventListener('click', () => { store.markAllRead(); render() })
	btnClear.addEventListener('click', () => { store.clearAll(); render() })

	// Ensure hook is active (safe if already wrapped)
	store.wrapToastrOnce()

	// Initial paint + small observer to auto-refresh on new toasts
	render()

	// Mutation observer on toastr container (if present) to refresh after new toasts appear
	try {
		const toastContainer = document.querySelector('#toast-container')
		if (toastContainer) {
			const mo = new MutationObserver(() => render())
			mo.observe(toastContainer, { childList: true, subtree: true })
		}
	} catch { /* optional */ }
}
