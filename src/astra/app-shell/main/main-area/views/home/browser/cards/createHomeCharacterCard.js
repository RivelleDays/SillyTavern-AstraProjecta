import { HOME_CARD_LAYOUT_IDS, resolveHomeCardLayoutId } from '../../state/homeCardLayoutStore.js'
import { createHomeCharacterCardClassicPortrait } from './createHomeCharacterCardClassicPortrait.js'
import { createHomeCharacterCardShowcase } from './createHomeCharacterCardShowcase.js'

export function createHomeCharacterCard(doc, character, deps, existingActionHandle = null, options = {}) {
	const layoutId = resolveHomeCardLayoutId(options?.layoutId)
	if (layoutId === HOME_CARD_LAYOUT_IDS.showcase) {
		return createHomeCharacterCardShowcase(doc, character, deps, existingActionHandle)
	}
	return createHomeCharacterCardClassicPortrait(doc, character, deps, existingActionHandle)
}

