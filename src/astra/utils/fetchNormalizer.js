let hasPatchedFetch = false;

/**
 * Normalizes problematic fetch URLs (e.g. ":7860/character_list") by attaching
 * the current location's protocol/hostname so the request becomes valid.
 */
export function installFetchNormalizer() {
	if (hasPatchedFetch) return;

	if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
		return;
	}

	const { fetch: originalFetch, location } = window;
	if (!location) return;

	const { protocol, hostname, port } = location;

	const resolveBarePortUrl = (inputUrl) => {
		if (!inputUrl || typeof inputUrl !== 'string') return inputUrl;

		const trimmed = inputUrl.trim();
		if (!trimmed) return inputUrl;

		// Already absolute (includes protocol), return as-is.
		if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;

		// Handle URLs that start with just a port, e.g. ":7860/character_list".
		const barePortMatch = /^:(\d+)(\/.*)?$/i.exec(trimmed);
		if (barePortMatch) {
			const [, barePort, path = '' ] = barePortMatch;
			const host = hostname || 'localhost';
			return `${protocol}//${host}:${barePort}${path}`;
		}

		// Handle hosts without protocol (localhost:7860, 127.0.0.1:7860, etc.)
		const hostWithoutSchemeMatch = /^(localhost|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?(\/.*)?$/i.exec(trimmed);
		if (hostWithoutSchemeMatch) {
			return `${protocol}//${trimmed}`;
		}

		// Handle URLs starting with "//" (scheme-relative).
		if (trimmed.startsWith('//')) {
			return `${protocol}${trimmed}`;
		}

		// For bare paths ("/api/..." or "api/..."), leave them untouched.
		return inputUrl;
	};

	window.fetch = function patchedFetch(input, init) {
		let normalizedInput = input;

		try {
			if (typeof input === 'string') {
				normalizedInput = resolveBarePortUrl(input);
			} else if (typeof Request !== 'undefined' && input instanceof Request) {
				const normalizedUrl = resolveBarePortUrl(input.url);
				if (normalizedUrl !== input.url) {
					normalizedInput = new Request(normalizedUrl, input);
				}
			}
		} catch (error) {
			console.warn('[AstraProjecta] Failed to normalize fetch input', error);
		}

		return originalFetch.call(this, normalizedInput, init);
	};

	hasPatchedFetch = true;

	// Preserve a way to restore or inspect the original fetch if needed.
	window.AstraProjecta = window.AstraProjecta || {};
	window.AstraProjecta.originalFetch = originalFetch;
	window.AstraProjecta.fetchPatched = true;
	window.AstraProjecta.fetchNormalizerPort = port || null;
}
