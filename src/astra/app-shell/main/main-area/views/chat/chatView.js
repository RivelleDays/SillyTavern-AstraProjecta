import { hideDrawers } from '../shared/drawers.js'
import { hideHomeView } from '../home/homeView.js'

export function showChatView({
	ensurePrimaryTitleSlot,
	characterSection,
	sheld,
	MAIN_AREA_DRAWERS,
	enforceDrawerAlwaysOpen,
	mainContentWrapper,
} = {}) {
	hideHomeView({ mainContentWrapper })

	const titleSlot = typeof ensurePrimaryTitleSlot === 'function' ? ensurePrimaryTitleSlot() : null
	if (titleSlot) {
		titleSlot.style.display = ''
	}

	if (characterSection) {
		characterSection.style.display = ''
	}

	if (sheld) {
		sheld.style.display = ''
	}

	hideDrawers(MAIN_AREA_DRAWERS, enforceDrawerAlwaysOpen)
}
