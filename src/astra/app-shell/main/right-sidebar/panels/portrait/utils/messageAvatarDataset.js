import { getAvatarSources, parseThumbnailUrl } from '../../../../../../utils/avatarSources.js'

function guessAvatarTypeFromMessage(messageElement) {
	if (!messageElement) return ''

	const element = messageElement instanceof HTMLElement ? messageElement : messageElement?.get?.(0)
	if (!element) return ''

	const isUser = element.getAttribute('is_user') === 'true'
	return isUser ? 'persona' : 'avatar'
}

export function updateAvatarDataset(imgElement, { typeHint } = {}) {
	if (!(imgElement instanceof HTMLImageElement)) return { thumb: '', full: '' }

	const thumb = imgElement.getAttribute('src') ?? ''
	if (!thumb) {
		delete imgElement.dataset.avatarThumb
		delete imgElement.dataset.avatarFull
		delete imgElement.dataset.avatarId
		return { thumb: '', full: '' }
	}

	const hint = typeHint || guessAvatarTypeFromMessage(imgElement.closest('.mes'))
	const { thumb: resolvedThumb, full } = getAvatarSources(thumb, hint ? { typeHint: hint } : {})

	delete imgElement.dataset.avatarThumb

	if (full) imgElement.dataset.avatarFull = full
	else delete imgElement.dataset.avatarFull

	const parsed = parseThumbnailUrl(resolvedThumb)
	if (parsed?.file) {
		imgElement.dataset.avatarId = parsed.file
		if (parsed.type) imgElement.dataset.avatarType = parsed.type
		else if (hint) imgElement.dataset.avatarType = hint
	} else if (hint && !imgElement.dataset.avatarType) {
		imgElement.dataset.avatarType = hint
	}

	const ownerName = imgElement.closest('.mes')?.getAttribute('ch_name')
	if (ownerName) imgElement.dataset.avatarOwner = ownerName

	return { thumb: resolvedThumb, full }
}

function refreshMessageAvatarsInNode(root) {
	const scope = root ?? document
	const images = scope.querySelectorAll('.mes .avatar img')
	images.forEach(img => updateAvatarDataset(img))
}

function refreshMessageAvatarById(messageId) {
	if (messageId === undefined || messageId === null) {
		refreshMessageAvatarsInNode()
		return
	}

	const selector = `.mes[mesid="${messageId}"] .avatar img`
	const images = document.querySelectorAll(selector)
	if (images.length) {
		images.forEach(img => updateAvatarDataset(img))
	} else {
		refreshMessageAvatarsInNode()
	}
}

export function createMessageAvatarDatasetController({ eventSource, event_types } = {}) {
	refreshMessageAvatarsInNode()

	const handleRender = (messageId) => {
		refreshMessageAvatarById(messageId)
	}

	const bindListener = (eventName) => {
		if (!eventName || !eventSource || typeof eventSource.on !== 'function') return
		eventSource.on(eventName, handleRender)
	}

	if (event_types) {
		bindListener(event_types.CHARACTER_MESSAGE_RENDERED)
		bindListener(event_types.USER_MESSAGE_RENDERED)
	}

	return {
		refreshAll: () => refreshMessageAvatarsInNode(),
		refreshMessage: (messageId) => refreshMessageAvatarById(messageId),
		updateAvatarDataset,
	}
}
