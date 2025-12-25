const STOP_ERROR_FRAGMENT = 'signal is aborted without reason'
const ABORT_ERROR_NAME = 'AbortError'

function isAbortSignalNoise(error) {
	if (!error || typeof error !== 'object') return false
	const message = typeof error.message === 'string' ? error.message.toLowerCase() : ''
	return error.name === ABORT_ERROR_NAME && message.includes(STOP_ERROR_FRAGMENT)
}

function createAbortReason() {
	const message = 'Generation stopped'
	if (typeof DOMException === 'function') {
		try {
			return new DOMException(message, ABORT_ERROR_NAME)
		} catch {
			// Ignore DOMException construction issues in older browsers.
		}
	}
	const fallback = new Error(message)
	fallback.name = ABORT_ERROR_NAME
	return fallback
}

function safeAbortController(controller) {
	if (!controller || typeof controller.abort !== 'function') return
	try {
		controller.abort(createAbortReason())
	} catch (error) {
		if (!isAbortSignalNoise(error)) {
			throw error
		}
	}
}

function patchProcessor(processor, patchedSet) {
	if (!processor || patchedSet.has(processor)) return
	const originalStop = typeof processor.onStopStreaming === 'function' ? processor.onStopStreaming : null
	if (!originalStop) return

	processor.onStopStreaming = function patchedStopStreaming(...args) {
		try {
			return originalStop.apply(this, args)
		} catch (error) {
			if (isAbortSignalNoise(error)) {
				safeAbortController(this?.abortController)
				this.isFinished = true
				return null
			}
			throw error
		}
	}

	patchedSet.add(processor)
}

export function installStreamingAbortGuard({ getContext }) {
	const resolveContext = typeof getContext === 'function' ? getContext : null
	if (!resolveContext) return null

	const patchedProcessors = new WeakSet()
	const applyPatch = () => {
		const context = resolveContext()
		if (!context) return
		patchProcessor(context.streamingProcessor, patchedProcessors)
	}

	const initialContext = resolveContext()
	const eventSource = initialContext?.eventSource
	const eventTypes = initialContext?.eventTypes || initialContext?.event_types

	if (!eventSource || typeof eventSource.on !== 'function') {
		applyPatch()
		return null
	}

	const listeners = []
	const registerListener = (eventName) => {
		if (!eventName) return
		const handler = () => applyPatch()
		eventSource.on(eventName, handler)
		listeners.push({ eventName, handler })
	}

	;[
		eventTypes?.GENERATION_STARTED,
		eventTypes?.STREAM_TOKEN_RECEIVED,
		eventTypes?.GENERATION_STOPPED,
	].forEach(registerListener)

	applyPatch()

	return {
		destroy: () => {
			const remover =
				typeof eventSource.off === 'function'
					? eventSource.off.bind(eventSource)
					: typeof eventSource.removeListener === 'function'
						? eventSource.removeListener.bind(eventSource)
						: null
			if (!remover) return
			listeners.forEach(({ eventName, handler }) => remover(eventName, handler))
		},
	}
}
