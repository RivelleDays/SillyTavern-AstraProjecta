const MOBILE_MEDIA_QUERY = '(max-width: 600px)'
let mediaQueryList = null

function getMobileMediaQuery() {
	if (!mediaQueryList && typeof window !== 'undefined') {
		mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY)
	}
	return mediaQueryList
}

function isMobile() {
	const mql = getMobileMediaQuery()
	return mql ? mql.matches : false
}

export {
	MOBILE_MEDIA_QUERY,
	getMobileMediaQuery,
	isMobile,
}
