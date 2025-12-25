import {
	clearLoreCache,
	updateLoreEntriesIfNeeded,
	getLoreSourceName,
	sortByDepthOrderTitle,
	sortPotentialRecords,
	strategyIcon,
	detectStrategy,
	searchStringMatches,
	searchRegexMatches,
	collectConstantMatches,
} from '../services/loreMatching.js'
import { buildExpandCollapse, buildSortSelect, buildToggleButton } from './controls.js'

/** @typedef {import('./containers.js').LoreContainers} LoreContainers */

/**
 * Builds the lore panel controller responsible for rendering and wiring reactive lore UI pieces.
 * @param {Object} params
 * @param {LoreContainers} params.containers
 * @param {HTMLSpanElement} params.badge
 * @param {Record<string, any>} params.state
 * @param {() => 'flat' | 'world'} params.getSortModeActive
 * @param {() => 'flat' | 'world'} params.getSortModePotential
 * @param {() => boolean} params.getOptCaseSensitive
 * @param {() => boolean} params.getOptWholeWord
 * @param {typeof import('../../../../../../slash-commands/SlashCommandParser.js').SlashCommandParser} params.SlashCommandParser
 * @param {Record<string, any>} params.CFG
 * @param {(strings: TemplateStringsArray, ...values: any[]) => string} params.t
 * @param {(fn: (...args: any[]) => void, wait?: number) => (...args: any[]) => void} params.debounce
 * @param {{ on: (type: string, handler: (...args: any[]) => void) => void }} params.eventSource
 * @param {Record<string, string>} params.eventTypes
 * @returns {Record<string, any>}
 */
export function createLorePanelController({
	containers,
	badge,
	state,
	getSortModeActive,
	getSortModePotential,
	getOptCaseSensitive,
	getOptWholeWord,
	SlashCommandParser,
	CFG,
	debounce: debounceFn,
	eventSource,
	eventTypes,
}) {
	let activeEntries = []
	let allActiveEntries = []
	let lastPotentialMatches = []
	let lastAllPotentialMatches = []
	let skipNextEntriesLoaded = false
	let isProcessingEntriesLoaded = false
	const VALID_TAB_IDS = new Set(['all', 'active', 'potential'])

	const {
		root,
		activeList,
		activeEmpty,
		allActiveList,
		allActiveEmpty,
		potentialList,
		potentialEmpty,
		allPotentialList,
		allPotentialEmpty,
	} = containers
	const loreLists = [activeList, allActiveList, potentialList, allPotentialList].filter(Boolean)
	const counterNodes = {
		overviewActive: null,
		overviewPotential: null,
		primaryActive: null,
		primaryPotential: null,
	}

	function buildEntryKey(entry) {
		if (!entry || typeof entry !== 'object') return null
		const world = entry.world != null ? String(entry.world) : ''
		if (entry.uid != null) return `${world}::uid::${entry.uid}`
		if (entry.id != null) return `${world}::id::${entry.id}`
		if (entry.entryId != null) return `${world}::entryId::${entry.entryId}`
		if (entry.comment) return `${world}::comment::${entry.comment}`
		if (Array.isArray(entry.key) && entry.key.length) return `${world}::key::${entry.key.join('|')}`
		return null
	}

	function filterMatchesAgainstActive(matches) {
		if (!Array.isArray(matches) || matches.length === 0) return Array.isArray(matches) ? matches.slice() : []
		if (!Array.isArray(activeEntries) || activeEntries.length === 0) return matches.slice()
		const activeKeys = new Set(activeEntries.map(buildEntryKey).filter(Boolean))
		if (!activeKeys.size) return matches.slice()
		return matches.filter(match => {
			const key = buildEntryKey(match?.entry)
			if (!key) return true
			return !activeKeys.has(key)
		})
	}

	function getCurrentTextarea() { return document.getElementById('send_textarea') }

	function toggleLoreItemState(item, forceExpanded) {
		if (!item) return
		const expanded = typeof forceExpanded === 'boolean' ? forceExpanded : !item.classList.contains('expanded')
		item.classList.toggle('expanded', expanded)
		item.setAttribute('aria-expanded', String(expanded))
	}

	function attachFilterNoteToggle(note, item) {
		if (!note || !item) return
		note.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			toggleLoreItemState(item)
		})
	}

	function getCurrentWordFromTextarea() {
		const textarea = getCurrentTextarea()
		if (!textarea) return ''

		const value = textarea.value || ''
		const pos = textarea.selectionStart || value.length
		let start = 0
		for (let i = pos - 1; i >= 0; i--)
			if (/\s/.test(value[i])) {
				start = i + 1
				break
			}

		return value.substring(start, pos)
	}

	async function enrichSticky(entries) {
		try {
			for (const entry of entries) {
				if (entry.type !== 'wi') continue
				const sticky = parseInt(await SlashCommandParser.commands['wi-get-timed-effect'].callback({
					effect: 'sticky',
					format: 'number',
					file: `${entry.world}`,
					_scope: null,
					_abortController: null,
				}, entry.uid))
				entry.sticky = Number.isFinite(sticky) ? sticky : 0
			}
		} catch { /* ignored */ }
	}

	function handleLoreItemToggle(event) {
		const head = event.target.closest('.lore-head')
		if (!head) return
		if (root && !root.contains(head)) return
		if (event.target.closest('.lore-check') || event.target.closest('.lore-sort')) return
		const item = head.closest('.lore-item')
		if (!item) return
		toggleLoreItemState(item)
	}

	if (root) root.addEventListener('click', handleLoreItemToggle)

	function buildActiveItem(entry) {
		const item = document.createElement('div')
		item.className = 'lore-item'
		item.setAttribute('aria-expanded', 'false')

		const head = document.createElement('div')
		head.className = 'lore-head'

		const triggersText = Array.isArray(entry.key) ? entry.key.join(', ') : ''
		const titleText = entry.comment?.length ? entry.comment : triggersText || 'Untitled'
		const strategy = strategyIcon[detectStrategy(entry)] || ''
		const world = entry.world || 'World Info'

		const topRow = document.createElement('div')
		topRow.className = 'lore-source-row'

		const sourceEl = document.createElement('div')
		sourceEl.className = 'lore-source'
		sourceEl.textContent = world
		topRow.appendChild(sourceEl)

		let filterNote
		if (Number(entry.sticky) > 0) {
			filterNote = document.createElement('button')
			filterNote.type = 'button'
			filterNote.className = 'lore-filter-note'
			filterNote.textContent = `📌 ${entry.sticky}`
		}

		const bottomRow = document.createElement('div')
		bottomRow.className = 'lore-bottom-row'

		const titleEl = document.createElement('div')
		titleEl.className = 'lore-title'
		if (strategy) {
			const iconEl = document.createElement('span')
			iconEl.className = 'lore-strategy-icon'
			iconEl.textContent = strategy
			iconEl.setAttribute('aria-hidden', 'true')
			titleEl.appendChild(iconEl)
		}
		const titleTextEl = document.createElement('span')
		titleTextEl.className = 'lore-title-text'
		titleTextEl.textContent = titleText
		titleTextEl.title = titleText
		titleEl.appendChild(titleTextEl)

		const triggersEl = document.createElement('span')
		triggersEl.className = 'lore-triggers'
		triggersEl.title = triggersText
		triggersEl.textContent = triggersText

		bottomRow.append(titleEl, triggersEl)
		head.append(topRow, bottomRow)

		const body = document.createElement('div')
		body.className = 'lore-body'
		const snippetEl = document.createElement('div')
		snippetEl.className = 'lore-snippet'
		snippetEl.textContent = String(entry.content ?? '')
		body.append(snippetEl)

		item.append(head)
		if (filterNote) {
			attachFilterNoteToggle(filterNote, item)
			item.append(filterNote)
		}
		item.append(body)

		return item
	}

	function buildPotentialItem(match) {
		const item = document.createElement('div')
		item.className = 'lore-item'
		item.setAttribute('aria-expanded', 'false')

		const head = document.createElement('div')
		head.className = 'lore-head'

		const sourceName = getLoreSourceName(match.entry)
		const titleText = match.entry?.comment || 'Untitled'
		const strategy = strategyIcon[detectStrategy(match.entry)] || ''
		const triggersText = (match.triggers || []).join(', ')

		const topRow = document.createElement('div')
		topRow.className = 'lore-source-row'

		const sourceEl = document.createElement('div')
		sourceEl.className = 'lore-source'
		sourceEl.textContent = sourceName
		topRow.appendChild(sourceEl)

		let filterNote
		if (match.suppressed) {
			item.classList.add('excluded')
			filterNote = document.createElement('button')
			filterNote.type = 'button'
			filterNote.className = 'lore-filter-note'
			const dot = document.createElement('span')
			dot.className = 'lore-filter-note-dot'
			dot.textContent = '●'
			const text = document.createElement('span')
			text.className = 'lore-filter-note-text'
			text.textContent = match.reasons.join('; ')
			filterNote.append(dot, text)
			filterNote.title = match.reasons.join('; ')
		}

		const bottomRow = document.createElement('div')
		bottomRow.className = 'lore-bottom-row'

		const titleEl = document.createElement('div')
		titleEl.className = 'lore-title'
		if (strategy) {
			const iconEl = document.createElement('span')
			iconEl.className = 'lore-strategy-icon'
			iconEl.textContent = strategy
			iconEl.setAttribute('aria-hidden', 'true')
			titleEl.appendChild(iconEl)
		}
		const titleTextEl = document.createElement('span')
		titleTextEl.className = 'lore-title-text'
		titleTextEl.textContent = titleText
		titleTextEl.title = titleText
		titleEl.appendChild(titleTextEl)

		const triggersEl = document.createElement('span')
		triggersEl.className = 'lore-triggers'
		triggersEl.title = triggersText
		triggersEl.textContent = triggersText

		bottomRow.append(titleEl, triggersEl)
		head.append(topRow, bottomRow)

		const body = document.createElement('div')
		body.className = 'lore-body'
		const snippetEl = document.createElement('div')
		snippetEl.className = 'lore-snippet'
		snippetEl.textContent = String(match.entry?.content ?? '')
		body.append(snippetEl)

		item.append(head)
		if (filterNote) {
			attachFilterNoteToggle(filterNote, item)
			item.append(filterNote)
		}
		item.append(body)

		return item
	}

	function expandAllIn(listEl) {
		listEl.querySelectorAll('.lore-item').forEach(item => {
			item.classList.add('expanded')
			item.setAttribute('aria-expanded', 'true')
		})
		scheduleAccordionUpdateFor(listEl, { deferCount: 2 })
	}

	function collapseAllIn(listEl) {
		listEl.querySelectorAll('.lore-item').forEach(item => {
			item.classList.remove('expanded')
			item.setAttribute('aria-expanded', 'false')
		})
		scheduleAccordionUpdateFor(listEl, { deferCount: 1 })
	}

	function collapseAllLoreItems() {
		loreLists.forEach(listEl => collapseAllIn(listEl))
	}

		function scheduleAccordionUpdateFor(listEl, { deferCount = 1 } = {}) {
			if (!listEl) return
			const container = listEl.closest('.lore-accordion')
			const scheduler = container?.__loreScheduleUpdate
			if (typeof scheduler !== 'function') {
				return
			}

			let framesRemaining = Math.max(1, Math.trunc(deferCount))
			const scheduleNext = () => {
				if (framesRemaining-- > 0) {
					requestAnimationFrame(scheduleNext)
					return
				}
				scheduler()
			}

			requestAnimationFrame(scheduleNext)
		}

	function getPotentialCounts(matches) {
		const rows = Array.isArray(matches) ? matches : []
		let enabled = 0
		for (const match of rows) {
			if (!match?.suppressed) enabled += 1
		}
		return {
			total: rows.length,
			enabled,
			filtered: rows.length - enabled,
		}
	}

	function updateCounters() {
		const hasCounters = Boolean(
			counterNodes.overviewActive ||
			counterNodes.overviewPotential ||
			counterNodes.primaryActive ||
			counterNodes.primaryPotential,
		)
		if (!hasCounters) return

		const activeCount = Array.isArray(activeEntries) ? activeEntries.length : 0
		const { total: potentialTotal, enabled: potentialEnabled } = getPotentialCounts(lastAllPotentialMatches)

		if (counterNodes.overviewActive) {
			counterNodes.overviewActive.textContent = String(activeCount)
		}

		if (counterNodes.overviewPotential) {
			counterNodes.overviewPotential.textContent = `${potentialEnabled}/${potentialTotal}`
		}

		if (counterNodes.primaryActive) {
			counterNodes.primaryActive.textContent = String(activeCount)
		}

		if (counterNodes.primaryPotential) {
			counterNodes.primaryPotential.textContent = `${potentialEnabled}/${potentialTotal}`
		}
	}

	function renderActiveListTo(listEl, emptyEl, entries = activeEntries) {
		if (!listEl || !emptyEl) return
		const rows = Array.isArray(entries) ? entries : []
		listEl.innerHTML = ''
		const hasEntries = rows.length > 0
		listEl.style.display = hasEntries ? '' : 'none'
		emptyEl.style.display = hasEntries ? 'none' : 'block'
		if (!hasEntries) {
			updateCounters()
			return
		}

		if (getSortModeActive() === 'world') {
			listEl.classList.add('group-by-world')
			const grouped = new Map()
			rows.forEach(entry => {
				const world = entry.world || 'World Info'
				if (!grouped.has(world)) grouped.set(world, [])
				grouped.get(world).push(entry)
			})
			Array.from(grouped.keys()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach(world => {
				const header = document.createElement('div')
				header.className = 'wi-world-row'
				header.textContent = world
				listEl.appendChild(header)
				grouped.get(world).slice().sort(sortByDepthOrderTitle).forEach(entry => listEl.appendChild(buildActiveItem(entry)))
			})
		} else {
			listEl.classList.remove('group-by-world')
			rows.slice().sort(sortByDepthOrderTitle).forEach(entry => listEl.appendChild(buildActiveItem(entry)))
		}
			if (listEl === allActiveList) {
				scheduleAccordionUpdateFor(listEl, { deferCount: 2 })
		}
		updateCounters()
	}

	function renderPotentialListTo(listEl, emptyEl, matches) {
		if (!listEl || !emptyEl) return
		const rows = Array.isArray(matches) ? matches : []
		listEl.innerHTML = ''
		const hasMatches = rows.length > 0
		listEl.style.display = hasMatches ? '' : 'none'
		emptyEl.style.display = hasMatches ? 'none' : 'block'
		if (!hasMatches) {
			updateCounters()
			return
		}

		const renderRows = (collection) => {
			const constants = collection.filter(match => match?.entry?.constant === true)
			const others = collection.filter(match => match?.entry?.constant !== true)
			const maxRows = Math.max(0, (CFG?.lore?.potentialMaxRows ?? 0) - constants.length)
			const finalRows = [...constants, ...others.slice(0, maxRows)]
			finalRows.forEach(match => listEl.appendChild(buildPotentialItem(match)))
		}

		if (getSortModePotential() === 'world') {
			listEl.classList.add('group-by-world')
			const grouped = new Map()
			rows.forEach(match => {
				const source = getLoreSourceName(match.entry)
				if (!grouped.has(source)) grouped.set(source, [])
				grouped.get(source).push(match)
			})
			Array.from(grouped.keys()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach(source => {
				const header = document.createElement('div')
				header.className = 'wi-world-row'
				header.textContent = source
				listEl.appendChild(header)
				renderRows(grouped.get(source).slice().sort(sortPotentialRecords))
			})
		} else {
			listEl.classList.remove('group-by-world')
			renderRows(rows.slice().sort(sortPotentialRecords))
		}
			if (listEl === allPotentialList) {
				scheduleAccordionUpdateFor(listEl, { deferCount: 2 })
		}
		updateCounters()
	}

	const updateLoreMatches = debounceFn((force) => {
		const textarea = getCurrentTextarea()
		const fullText = textarea?.value || ''
		const currentWord = getCurrentWordFromTextarea()

		if (!force && state._lastWord === currentWord && state._lastFull === fullText) return
		state._lastWord = currentWord
		state._lastFull = fullText

		const options = {
			optCaseSensitive: getOptCaseSensitive(),
			optWholeWord: getOptWholeWord(),
		}

		const byString = searchStringMatches(currentWord, options)
		const byRegex = searchRegexMatches(fullText)
		const constants = collectConstantMatches()

		const seen = new Set()
		const matches = [...constants, ...byString, ...byRegex].filter(match => {
			const key = `${match.entry?.world || ''}::${match.entry?.uid || match.entry?.comment || (match.triggers || []).join('|')}`
			if (seen.has(key)) return false
			seen.add(key)
			return true
		})

		const filteredMatches = filterMatchesAgainstActive(matches)
		lastPotentialMatches = filteredMatches
		lastAllPotentialMatches = filteredMatches.slice()

		renderPotentialListTo(potentialList, potentialEmpty, lastPotentialMatches)
		renderPotentialListTo(allPotentialList, allPotentialEmpty, lastAllPotentialMatches)
	}, 200)

	function hookTextareaListeners() {
		const textarea = getCurrentTextarea()
		if (!textarea) return
		['input', 'keyup', 'mouseup'].forEach(eventName => textarea.addEventListener(eventName, () => updateLoreMatches(false)))
	}

	async function refreshLoreEntries({ preserveActive = false } = {}) {
		try {
			clearLoreCache()
			if (!preserveActive) {
				activeEntries = []
				allActiveEntries = []
			}
			skipNextEntriesLoaded = true
			try {
				await updateLoreEntriesIfNeeded()
			} finally {
				skipNextEntriesLoaded = false
			}
			allActiveEntries = Array.isArray(activeEntries) ? activeEntries.slice() : []
			renderActiveListTo(activeList, activeEmpty, activeEntries)
			renderActiveListTo(allActiveList, allActiveEmpty, allActiveEntries)
			updateLoreMatches(true)
			updateLoreBadge()
		} catch (error) {
			console.error('[AstraProjecta] UI Extension: Error during lore refresh:', error)
		}
	}

	async function forceLoreRefresh() {
		await refreshLoreEntries()
	}

	function subscribeWorldInfoEvents() {
		eventSource.on(eventTypes.CHAT_CHANGED, () => {
			collapseAllLoreItems()
			void forceLoreRefresh()
		})

		// Preserve the display of active entries when WI content changes; only refresh potential matches.
		eventSource.on(eventTypes.WORLDINFO_UPDATED, () => { void refreshLoreEntries({ preserveActive: true }) })
		eventSource.on(eventTypes.WORLDINFO_SETTINGS_UPDATED, () => updateLoreMatches(true))
		eventSource.on(eventTypes.WORLDINFO_ENTRIES_LOADED, () => {
			if (skipNextEntriesLoaded) {
				skipNextEntriesLoaded = false
				return
			}
			if (isProcessingEntriesLoaded) return
			isProcessingEntriesLoaded = true
			void (async () => {
				try {
					await refreshLoreEntries({ preserveActive: true })
				} catch (error) {
					console.error('[AstraProjecta] UI Extension: Error refreshing lore after entries loaded event:', error)
				} finally {
					isProcessingEntriesLoaded = false
				}
			})()
		})

		eventSource.on(eventTypes.WORLD_INFO_ACTIVATED, async (entries) => {
			try {
				activeEntries = (entries || []).map(entry => ({ ...entry, type: 'wi' }))
				allActiveEntries = activeEntries.slice()
				await enrichSticky(activeEntries)
			} catch { /* ignored */ }
			renderActiveListTo(activeList, activeEmpty, activeEntries)
			renderActiveListTo(allActiveList, allActiveEmpty, allActiveEntries)
			lastPotentialMatches = filterMatchesAgainstActive(lastPotentialMatches)
			lastAllPotentialMatches = filterMatchesAgainstActive(lastAllPotentialMatches)
			renderPotentialListTo(potentialList, potentialEmpty, lastPotentialMatches)
			renderPotentialListTo(allPotentialList, allPotentialEmpty, lastAllPotentialMatches)
			updateLoreBadge()
			updateLoreMatches(true)
		})

		const originalDebug = console.debug
		console.debug = function (...args) {
			if (args[0] === '[WI] Found 0 world lore entries. Sorted by strategy') {
				activeEntries = []
				allActiveEntries = []
				renderActiveListTo(activeList, activeEmpty, activeEntries)
				renderActiveListTo(allActiveList, allActiveEmpty, allActiveEntries)
				updateLoreBadge()
			}
			return originalDebug.call(this, ...args)
		}
	}

	function updateLoreBadge() {
		const count = Array.isArray(activeEntries) ? activeEntries.length : 0
		badge.textContent = String(count)
		badge.style.display = count > 0 ? 'flex' : 'none'
	}

	function setActiveLoreTab(tabId) {
		const next = VALID_TAB_IDS.has(tabId) ? tabId : 'all'
		if (next === 'all') {
			renderActiveListTo(allActiveList, allActiveEmpty, allActiveEntries)
			renderPotentialListTo(allPotentialList, allPotentialEmpty, lastAllPotentialMatches)
		}
		updateCounters()
	}

	function registerLoreCounters(elements = {}) {
		counterNodes.overviewActive = elements?.overviewActiveCount ?? null
		counterNodes.overviewPotential = elements?.overviewPotentialCount ?? null
		counterNodes.primaryActive = elements?.primaryActiveCount ?? null
		counterNodes.primaryPotential = elements?.primaryPotentialCount ?? null
		updateCounters()
	}

	return {
		controls: {
			buildSortSelect,
			buildExpandCollapse,
			buildToggleButton,
		},
		renderActiveList: () => renderActiveListTo(activeList, activeEmpty, activeEntries),
		renderActiveListAll: (_options) => renderActiveListTo(allActiveList, allActiveEmpty, allActiveEntries),
		renderPotentialList: (matches, _options) => renderPotentialListTo(potentialList, potentialEmpty, matches ?? lastPotentialMatches),
		renderPotentialListAll: (matches, _options) => renderPotentialListTo(allPotentialList, allPotentialEmpty, matches ?? lastAllPotentialMatches),
		updateLoreMatches,
		hookTextareaListeners,
		subscribeWorldInfoEvents,
		updateLoreBadge,
		forceLoreRefresh,
		expandAllIn,
		collapseAllIn,
		setActiveLoreTab,
		registerLoreCounters,
	}
}
