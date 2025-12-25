/* =================================================================
 * Lore Service (logic layer)
 * - Manages lorebook state, parsing, and matching logic.
 * - Decoupled from the UI; receives dependencies via initLoreService.
 * ================================================================= */

// Module-level state for lore entries
let loreCached = []
let loreStringData = []
let loreRegexData = []

// Injected dependencies, initialized with safe defaults
let deps = {
	t: (s) => s,
	ctx: () => ({}),
	resolveCurrentEntity: () => ({ entity: null, isGroup: false }),
	getEntityNameLower: () => '',
	getSortedEntries: async () => [],
}

/**
 * Initializes the lore service with necessary dependencies from the main script.
 * @param {object} dependencies - An object containing required functions.
 */
export function initLoreService(dependencies) {
	deps = { ...deps, ...dependencies }
}

/**
 * Preprocesses an array of lore entries, splitting them into string-based and regex-based keys
 * for optimized searching.
 * @param {object[]} entries - The raw lore entries from SillyTavern.
 */
export function preprocessLore(entries) {
	loreStringData = []
	loreRegexData = [];
	(entries || []).forEach(entry => {
		const stringKeys = []
		const regexKeys = [];
		(entry.key || []).forEach(k => {
			if (typeof k === 'string' && k.startsWith('/') && k.lastIndexOf('/') > 0) {
				const lastSlash = k.lastIndexOf('/')
				const pattern = k.slice(1, lastSlash)
				const flags = k.slice(lastSlash + 1)
				try {
					regexKeys.push(new RegExp(pattern, flags))
				} catch {
					stringKeys.push(k)
				}
			} else if (typeof k === 'string')
				stringKeys.push(k)

		})
		if (regexKeys.length) loreRegexData.push({ ...entry, key: regexKeys })
		if (stringKeys.length) loreStringData.push({ ...entry, key: stringKeys })
	})
}

/**
 * Evaluates if a lore entry is active based on various filters like character name, tags, and whitelists.
 * @param {object} entry - The lore entry to evaluate.
 * @returns {{allowed: boolean, reasons: string[]}} - An object indicating if the entry is allowed and why.
 */
export function evaluateFilters(entry) {
	const reasons = []
	const nameLower = deps.getEntityNameLower()
	const { entity, isGroup } = deps.resolveCurrentEntity()
	const c = deps.ctx()
	let allowed = true

	if (entry.disable === true || entry.enabled === false) {
		allowed = false
		reasons.push('Disabled')
	}
	if (Array.isArray(entry.decorators) && entry.decorators.includes('@@dont_activate')) {
		allowed = false
		reasons.push('Suppressed by @@dont_activate')
	}

	if (entry.characterFilter && Array.isArray(entry.characterFilter.names) && entry.characterFilter.names.length > 0) {
		const list = entry.characterFilter.names.map(s => String(s).toLowerCase())
		const inList = list.includes(nameLower)
		const isExclude = !!entry.characterFilter.isExclude
		if ((isExclude && inList) || (!isExclude && !inList)) {
			allowed = false
			reasons.push(isExclude ? 'Excluded by characterFilter.names' : 'Not in characterFilter.names')
		}
	}

	if (entry.characterFilter && Array.isArray(entry.characterFilter.tags) && entry.characterFilter.tags.length > 0)
		try {
			let tagKey = null
			if (!isGroup && typeof c.characterId !== 'undefined' && c.characterId !== null) {
				const idStr = String(c.characterId)
				tagKey = Object.keys(c.tagMap || {}).find(k => k.includes(idStr)) || null
			} else if (isGroup && c.groupId != null) {
				const gid = String(c.groupId)
				tagKey = Object.keys(c.tagMap || {}).find(k => k.includes(gid)) || null
			}
			const currentTags = Array.isArray(c.tagMap?.[tagKey]) ? c.tagMap[tagKey].map(x => String(x)) : []
			const intersects = currentTags.some(tag => entry.characterFilter.tags.includes(tag))
			const isExclude = !!entry.characterFilter.isExclude
			if ((isExclude && intersects) || (!isExclude && !intersects)) {
				allowed = false
				reasons.push(isExclude ? 'Excluded by tag filter' : 'Missing required tag')
			}
		} catch {
			reasons.push('Tag filter present (could not verify)')
		}


	const wl = (entry.characterWhitelist || entry.charWhitelist || []).map(s => String(s).toLowerCase())
	const bl = (entry.characterBlacklist || entry.charBlacklist || []).map(s => String(s).toLowerCase())
	const gwl = (entry.groupWhitelist || []).map(s => String(s).toLowerCase())
	const gbl = (entry.groupBlacklist || []).map(s => String(s).toLowerCase())

	if (entity) {
		if (Array.isArray(entry.excludes)) {
			const low = entry.excludes.map(s => String(s).toLowerCase())
			if (low.includes(nameLower)) {
				allowed = false
				reasons.push('Excluded by character name')
			}
		}
		if (!Array.isArray(entity.members)) {
			if (wl.length && !wl.includes(nameLower)) {
				allowed = false
				reasons.push('Not in character whitelist')
			}
			if (bl.length && bl.includes(nameLower)) {
				allowed = false
				reasons.push('In character blacklist')
			}
		} else {
			if (gwl.length && !gwl.includes(nameLower)) {
				allowed = false
				reasons.push('Not in group whitelist')
			}
			if (gbl.length && gbl.includes(nameLower)) {
				allowed = false
				reasons.push('In group blacklist')
			}
		}
	}

	return { allowed, reasons }
}

/**
 * Searches for lore entries where a string key matches the given word.
 * @param {string} word - The word to search for.
 * @param {object} options - Search options.
 * @param {boolean} options.optCaseSensitive - Toggles case sensitivity.
 * @param {boolean} options.optWholeWord - Toggles Match Whole Words matching.
 * @returns {object[]} - An array of matching entries.
 */
export function searchStringMatches(word, { optCaseSensitive, optWholeWord }) {
	if (!word) return []
	const res = []
	for (const entry of loreStringData) {
		if (!Array.isArray(entry.key) || entry.key.length === 0) continue
		const hit = entry.key.some(k => {
			const keyStr = String(k)
			if (optWholeWord)
				return optCaseSensitive ? keyStr === word : keyStr.toLowerCase() === word.toLowerCase()
			else {
				if (optCaseSensitive) return keyStr.includes(word)
				return keyStr.toLowerCase().includes(word.toLowerCase())
			}
		})
		if (!hit) continue

		const { allowed, reasons } = evaluateFilters(entry)
		res.push({ entry, isRegex: false, triggers: entry.key, suppressed: !allowed, reasons })
	}
	return res
}

/**
 * Searches for lore entries where a regex key matches the full text.
 * @param {string} fullText - The text to test against.
 * @returns {object[]} - An array of matching entries.
 */
export function searchRegexMatches(fullText) {
	if (!fullText) return []
	const res = []
	for (const entry of loreRegexData) {
		if (!Array.isArray(entry.key) || entry.key.length === 0) continue
		let hit = false
		for (const rx of entry.key)
			try {
				if (rx.test(fullText)) {
					hit = true
					break
				}
			} catch { /* ignored */ }

		if (!hit) continue

		const { allowed, reasons } = evaluateFilters(entry)
		res.push({ entry, isRegex: true, triggers: entry.key.map(r => r.toString()), suppressed: !allowed, reasons })
	}
	return res
}

/**
 * Collects all entries marked as 'constant' and evaluates their filters.
 * @returns {object[]} - An array of constant entries.
 */
export function collectConstantMatches() {
	const results = []
	try {
		for (const entry of loreCached || [])
			if (entry && entry.constant === true) {
				const { allowed, reasons } = evaluateFilters(entry)
				results.push({
					entry,
					isRegex: false,
					triggers: Array.isArray(entry.key) ? entry.key : [],
					suppressed: !allowed,
					reasons,
					_isConstant: true,
				})
			}

	} catch { /* ignored */ }
	return results
}

/**
 * Retrieves the source book/world name for a given lore entry.
 * @param {object} entry - The lore entry.
 * @returns {string} - The name of the source.
 */
export function getLoreSourceName(entry) {
	return (
		entry?.world ||
		entry?.group ||
		entry?.lorebook ||
		entry?.source ||
		entry?.book ||
		entry?.file ||
		entry?.filename ||
		'World Info'
	)
}

/**
 * Sort comparator for lore entries based on depth, order, and title.
 * @param {object} a - First entry.
 * @param {object} b - Second entry.
 * @returns {number}
 */
export function sortByDepthOrderTitle(a, b) {
	const da = a.depth ?? Number.MAX_SAFE_INTEGER
	const db = b.depth ?? Number.MAX_SAFE_INTEGER
	if (da !== db) return da - db
	const oa = a.order ?? Number.MAX_SAFE_INTEGER
	const ob = b.order ?? Number.MAX_SAFE_INTEGER
	if (oa !== ob) return oa - ob
	const ta = (a.comment?.length ? a.comment : (a.key || []).join(', ')).toLowerCase()
	const tb = (b.comment?.length ? b.comment : (b.key || []).join(', ')).toLowerCase()
	return ta.localeCompare(tb)
}

/**
 * Sort comparator for potential lore matches, prioritizing non-suppressed entries.
 * @param {object} a - First match record.
 * @param {object} b - Second match record.
 * @returns {number}
 */
export function sortPotentialRecords(a, b) {
	if (a.suppressed !== b.suppressed) return a.suppressed ? 1 : -1
	const sa = (a.entry.comment || '').toLowerCase()
	const sb = (b.entry.comment || '').toLowerCase()
	return sa.localeCompare(sb)
}

// A map of strategy types to their corresponding UI icons.
export const strategyIcon = { constant: '🔵', normal: '🟢', vectorized: '🔗' }

/**
 * Detects the activation strategy of a lore entry (constant, vectorized, or normal).
 * @param {object} entry - The lore entry.
 * @returns {string} - 'constant', 'vectorized', or 'normal'.
 */
export function detectStrategy(entry) {
	if (entry?.constant === true) return 'constant'
	if (entry?.vectorized === true) return 'vectorized'
	return 'normal'
}

/**
 * Provides read-only access to the cached lore entries.
 * @returns {object[]}
 */
export function getLoreCache() {
	return loreCached
}

/**
 * Fetches lore entries if the cache is empty, then preprocesses them.
 * @returns {Promise<void>}
 */
export async function updateLoreEntriesIfNeeded() {
	try {
		if (!loreCached.length) {
			loreCached = await deps.getSortedEntries()
			preprocessLore(loreCached)
		}
	} catch { /* ignored */ }
}

/**
 * Clears the internal lore cache, forcing a refresh on the next call to updateLoreEntriesIfNeeded.
 */
export function clearLoreCache() {
	loreCached = []
}
