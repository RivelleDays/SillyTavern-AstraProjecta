const LOG_PREFIX = '[AstraProjecta]'

function resolveContextGetter() {
	const getter = globalThis?.SillyTavern?.getContext
	return typeof getter === 'function' ? getter.bind(globalThis.SillyTavern) : null
}

export function getBootstrapContext() {
	const getContext = resolveContextGetter()
	const context = typeof getContext === 'function' ? getContext() : null

	const dom = {
		sheld: /** @type {HTMLDivElement|null} */ (document.getElementById('sheld')),
		chat: /** @type {HTMLDivElement|null} */ (document.getElementById('chat')),
	}

	const helpers = {
		getContext,
		hasContext: Boolean(getContext),
		logMissingContext: () => {
			console.error(`${LOG_PREFIX} SillyTavern context unavailable.`)
		},
	}

	return { context, dom, helpers }
}
