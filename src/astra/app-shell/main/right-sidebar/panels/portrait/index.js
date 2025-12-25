import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'
import {
	createSecondaryTabs,
	createInstructionBanner,
} from '../../../../../shared/components/index.js'
import { attachAvatarClickHandler } from './events/avatarClickHandler.js'
import { createPlaceholderSection } from './ui/placeholderSection.js'
import { extractZoomedAvatarElement } from './ui/zoomedAvatar.js'
import { createMessageAvatarDatasetController } from './utils/messageAvatarDataset.js'

const AVATAR_ICON = getLucideIconMarkup('smile-plus')
const EXPRESSIONS_ICON = getLucideIconMarkup('scan-face')

export function createCharacterPortrait({ eventSource, event_types } = {}) {
	const panel = document.createElement('div')
	panel.id = 'characterPortraitPanel'

	const avatarHost = document.createElement('div')
	avatarHost.className = 'character-portrait-avatar-host'

	const instructionsBanner = createInstructionBanner({
		text: "Click a character's avatar in the chat area to display their full portrait. Click another to change.",
		className: 'character-portrait-avatar-instructions',
	})
	avatarHost.append(instructionsBanner.root)

	const expressionsContent = createPlaceholderSection({
		title: 'Character Expressions',
		placeholder: 'Expression presets will appear here.',
	})

	const tabs = createSecondaryTabs(
		[
			{
				id: 'avatar',
				title: 'Avatar',
				content: avatarHost,
			},
			{
				id: 'expressions',
				title: 'Expressions',
				content: expressionsContent,
			},
		],
		{
			headings: {
				avatar: {
					icon: AVATAR_ICON,
					label: 'Character Avatar',
				},
				expressions: {
					icon: EXPRESSIONS_ICON,
					label: 'Character Expressions',
				},
			},
			idPrefix: 'tabs-character-portrait',
		},
	)

	panel.append(tabs.root)

	const avatarDatasetController = createMessageAvatarDatasetController({ eventSource, event_types })

	const refreshZoomedAvatar = () => {
		const existing = avatarHost.querySelector('.astra-zoomed-avatar')
		if (existing) existing.remove()

		const extracted = extractZoomedAvatarElement()
		if (!extracted?.element) return null

		avatarHost.append(extracted.element)
		attachAvatarClickHandler({
			zoomedAvatar: extracted.element,
			container: extracted.container,
			tabs,
			annotateAvatarDataset: avatarDatasetController.updateAvatarDataset,
		})

		avatarDatasetController.refreshAll()

		return extracted.element
	}

	refreshZoomedAvatar()

	return {
		panel,
		tabs,
		refreshZoomedAvatar,
	}
}
