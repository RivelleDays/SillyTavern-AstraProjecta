import { useEffect, useState } from 'react'

export function useMediaQuery(query) {
	const getMatches = () => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
			return false
		}
		return window.matchMedia(query).matches
	}

	const [matches, setMatches] = useState(getMatches)

	useEffect(() => {
		if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
			return undefined
		}

		const mediaQuery = window.matchMedia(query)
		const handler = event => setMatches(event.matches)

		setMatches(mediaQuery.matches)
		mediaQuery.addEventListener('change', handler)
		return () => {
			mediaQuery.removeEventListener('change', handler)
		}
	}, [query])

	return matches
}
