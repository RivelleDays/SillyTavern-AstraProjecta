// ./src/state/store.js

function safeParse(json, fallback) {
	try { return JSON.parse(json) } catch { return fallback }
}

/**
 * createStateStore
 * @param {Object} opts
 * @param {string} opts.key         - localStorage key
 * @param {Object} opts.getters     - { stateKey: () => any }
 * @param {Object} opts.setters     - { stateKey: (value) => void }
 * @returns {{ load: () => Object, save: () => void }}
 */
export function createStateStore({ key, getters = {}, setters = {} }) {
	if (!key || typeof key !== 'string')
		throw new Error('[store] "key" is required and must be a string.')


	const read = () => safeParse(localStorage.getItem(key), {})

	const write = (obj) => {
		try { localStorage.setItem(key, JSON.stringify(obj ?? {})) }
		catch { /* ignore quota or privacy errors */ }
	}

	const collect = () => {
		const out = {}
		for (const k of Object.keys(getters))
			try { out[k] = getters[k]() } catch { /* isolate getter errors */ }

		return out
	}

	return {
		// Load from storage and apply values via setters (source of truth = storage)
		async load() {
			const data = read()
			const tasks = []

			for (const k of Object.keys(setters)) {
				if (!(k in data)) continue
				try {
					const result = setters[k](data[k])
					if (result && typeof result.then === 'function') tasks.push(result)
				} catch { /* isolate setter errors */ }
			}

			if (tasks.length) {
				try { await Promise.allSettled(tasks) } catch { /* ignore */ }
			}

			return data
		},

		// Save to storage by calling getters (source of truth = runtime)
		save() {
			write(collect())
		},
	}
}
