import { createRightSidebarController } from './rightSidebarController.js'
import { createRightSidebarView } from './rightSidebarView.js'

export function createRightSidebar(options = {}) {
	const controller = createRightSidebarController(options)
	const view = createRightSidebarView({
		...options,
		controller,
	})
	return {
		...view,
		controller,
	}
}
