import { installFetchNormalizer } from './utils/fetchNormalizer.js'
import { createBootstrapRuntime } from './bootstrap/runtime.js'

let hasBootstrapped = false
let bootstrapRuntime = null

export function initializeAstraRuntime() {
	if (hasBootstrapped) return bootstrapRuntime
	hasBootstrapped = true

	installFetchNormalizer()

	bootstrapRuntime = createBootstrapRuntime()
	return bootstrapRuntime
}
