export function extractZoomedAvatarElement() {
	const templateHost = document.getElementById('zoomed_avatar_template')
	const templateAvatar = templateHost?.querySelector('.zoomed_avatar')
	if (!templateHost || !templateAvatar) return null

	const templateMarkup = templateAvatar.outerHTML
	templateAvatar.remove()
	templateHost.innerHTML = templateMarkup

	templateAvatar.setAttribute('style', 'display: flex;')
	templateAvatar.classList.add('astra-zoomed-avatar')

	const dragGrabber = templateAvatar.querySelector('.drag-grabber')
	if (dragGrabber) dragGrabber.remove()

	const closeButton = templateAvatar.querySelector('.dragClose')
	if (closeButton?.id) closeButton.removeAttribute('id')

	const zoomedAvatarContainer = templateAvatar.querySelector('.zoomed_avatar_container')
	if (zoomedAvatarContainer) zoomedAvatarContainer.hidden = true

	return {
		element: templateAvatar,
		container: zoomedAvatarContainer ?? null,
	}
}
