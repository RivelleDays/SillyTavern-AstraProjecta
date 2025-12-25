import { resolveAvatarSource } from '../utils/avatarSource.js'
import { OPEN_CHARACTER_PORTRAIT_PANEL_EVENT } from './eventNames.js'

export function attachAvatarClickHandler({ zoomedAvatar, container, tabs, annotateAvatarDataset }) {
	if (!zoomedAvatar) return

	const zoomedAvatarImg = zoomedAvatar.querySelector('.zoomed_avatar_img')
	if (!zoomedAvatarImg) return

	const $document = globalThis.$?.(document)
	if (!$document) return

	let currentChar = null

	const setContainerVisibility = (isEmpty) => {
		if (container) container.hidden = isEmpty
		else zoomedAvatar.hidden = isEmpty
	}

	const requestPortraitPanelOpen = (detail = {}) => {
		const doc = globalThis.document
		if (!doc?.dispatchEvent) return

		try {
			doc.dispatchEvent(new CustomEvent(OPEN_CHARACTER_PORTRAIT_PANEL_EVENT, { detail }))
		} catch (error) {
			console.warn('[AstraProjecta] failed to announce portrait panel request', error)
		}
	}

	const clearAvatar = () => {
		currentChar = null
		zoomedAvatar.removeAttribute('forChar')
		zoomedAvatarImg.removeAttribute('src')
		zoomedAvatarImg.removeAttribute('data-izoomify-url')
		zoomedAvatarImg.removeAttribute('alt')
		setContainerVisibility(true)
	}

	const showAvatar = (charKey, charLabel, src) => {
		currentChar = charKey
		zoomedAvatar.setAttribute('forChar', charKey)
		zoomedAvatarImg.setAttribute('src', src)
		zoomedAvatarImg.setAttribute('data-izoomify-url', src)
		if (charLabel) zoomedAvatarImg.setAttribute('alt', `${charLabel} avatar`)
		else zoomedAvatarImg.removeAttribute('alt')

		setContainerVisibility(false)
		tabs?.setActive?.('avatar')
	}

	const closeButton = zoomedAvatar.querySelector('.dragClose')
	if (closeButton) {
		closeButton.addEventListener('click', (event) => {
			event.preventDefault()
			event.stopPropagation()
			clearAvatar()
		})
	}

	const avatarSelectors = '.mes .avatar, .mes .astra-messageHeader__avatar'

	// Clean up any previous handler we may have attached and remove the host handler to prevent duplicate overlays.
	$document.off('click', avatarSelectors)
	$document.on('click', avatarSelectors, function handleAvatarClick(event) {
		event.preventDefault()
		event.stopImmediatePropagation()

		const $target = globalThis.$(this)
		const messageElement = $target.closest('.mes')
		const imgElement = $target.children('img').get(0)
		if (!imgElement) return

		if (typeof annotateAvatarDataset === 'function') {
			try {
				annotateAvatarDataset(imgElement)
			} catch (error) {
				console.warn('[AstraProjecta] failed to annotate avatar dataset', error)
			}
		}

		const thumbURL = imgElement.getAttribute('src') ?? ''
		const fullURL = imgElement.dataset.avatarFull ?? ''
		const avatarId = imgElement.dataset.avatarId ?? ''
		const typeHint = imgElement.dataset.avatarType ?? ''

		if (!thumbURL && !fullURL) return

		const messageName = messageElement?.attr?.('ch_name') ?? ''
		const ownerName = imgElement.dataset.avatarOwner ?? ''
		const charLabel = messageName || ownerName || ''
		const charKey = avatarId || charLabel || (thumbURL ?? 'avatar')

		const isUser = messageElement?.attr?.('is_user') === 'true'
		const isSystem = messageElement?.attr?.('is_system') === 'true'

		const avatarSrc = resolveAvatarSource({
			thumbURL,
			fullURL,
			avatarId,
			typeHint,
			isUser,
			isSystem,
		})

		if (!avatarSrc) {
			clearAvatar()
			return
		}

		requestPortraitPanelOpen({ charKey, charLabel })

		const isContainerVisible = container ? !container.hidden : !zoomedAvatar.hidden

		if (currentChar === charKey && isContainerVisible) return

		if (currentChar && currentChar !== charKey && isContainerVisible) clearAvatar()

		showAvatar(charKey, charLabel, avatarSrc)
	})

	clearAvatar()
}
