const noop = () => {}

export const MOBILE_LAYOUT_CLASS = 'astra-mobile-layout'
export const MOBILE_MAIN_VISIBLE_CLASS = 'astra-mobile-main-visible'

export function createSyncMainVisibilityFromChat({
	getCurrentChatId,
	hideMainArea,
	isLayoutActive,
} = {}) {
	const resolveChatId = typeof getCurrentChatId === 'function' ? getCurrentChatId : () => null
	const ensureLayoutActive = typeof isLayoutActive === 'function' ? isLayoutActive : () => false
	const ensureHideMainArea = typeof hideMainArea === 'function' ? hideMainArea : noop

	return () => {
		if (!ensureLayoutActive()) return
		const activeChatId = resolveChatId()
		if (!activeChatId) ensureHideMainArea()
	}
}

export function createMobileLayoutState(dependencies = {}) {
	const syncMainVisibilityFromChat = createSyncMainVisibilityFromChat(dependencies)

	return {
		classes: {
			layout: MOBILE_LAYOUT_CLASS,
			mainVisible: MOBILE_MAIN_VISIBLE_CLASS,
		},
		syncMainVisibilityFromChat,
		syncMainVisibility: syncMainVisibilityFromChat,
	}
}
