import { initializeAstraRuntime } from './astra/bootstrap.js'
import './styles/globals.css'
import './astra/style.css'

function bootstrapAstraProjecta() {
	const runtime = initializeAstraRuntime()
	if (!runtime) {
		console.error('[AstraProjecta] Failed to initialize runtime.')
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', bootstrapAstraProjecta, { once: true })
} else {
	bootstrapAstraProjecta()
}
