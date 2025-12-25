export { createMobileRuntime } from './runtime/index.js'

export {
	MOBILE_LAYOUT_CLASS,
	MOBILE_MAIN_VISIBLE_CLASS,
	isMobileLayoutActive,
	showMobileMainArea,
	hideMobileMainArea,
	resetMobileMainArea,
	createMobileLayoutState,
	createSyncMainVisibilityFromChat,
} from './state/index.js'

export {
	MOBILE_OVERLAY_HOST_ID,
	MOBILE_SIDEBAR_HOST_ID,
	MOBILE_MAIN_HOST_ID,
	MOBILE_MAIN_CLOSE_BUTTON_ID,
} from './styles/index.js'

export { createMobileOverlayHosts, createMobileMainCloseButton } from './ui/index.js'

export { getMobileMediaQuery, isMobile } from './utils/index.js'
