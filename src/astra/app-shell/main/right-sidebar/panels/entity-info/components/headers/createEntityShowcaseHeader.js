const DEFAULT_NAME = 'Character'

export function createEntityShowcaseHeader({ fallbackAvatar } = {}) {
	const root = document.createElement('header')
	root.className = 'entity-info-header entity-info-header--showcase'

	const headerContainer = document.createElement('div')
	headerContainer.className = 'charInfoHeader'
	root.append(headerContainer)

	const coverFigure = document.createElement('figure')
	coverFigure.className = 'character-info-profile-cover'

	const coverImage = document.createElement('img')
	coverImage.className = 'character-info-profile-cover__image'
	coverImage.alt = 'Character cover'
	coverImage.src = fallbackAvatar || ''
	coverImage.loading = 'lazy'
	coverImage.decoding = 'async'
	coverFigure.append(coverImage)
	headerContainer.append(coverFigure)

	const headerMeta = document.createElement('div')
	headerMeta.className = 'charInfoHeaderMeta'
	headerContainer.append(headerMeta)

	const avatarWrapper = document.createElement('figure')
	avatarWrapper.className = 'character-info-avatar'

	const avatarImage = document.createElement('img')
	avatarImage.className = 'character-info-avatar__image'
	avatarImage.src = fallbackAvatar || ''
	avatarImage.alt = 'Character portrait'
	avatarImage.loading = 'lazy'
	avatarImage.decoding = 'async'
	avatarWrapper.append(avatarImage)

	const nameHeading = document.createElement('div')
	nameHeading.className = 'character-info-name'
	nameHeading.textContent = DEFAULT_NAME

	headerMeta.append(avatarWrapper, nameHeading)

	function setName(value) {
		const text = value || DEFAULT_NAME
		nameHeading.hidden = false
		nameHeading.style.display = 'block'
		nameHeading.style.visibility = 'visible'
		nameHeading.textContent = text
		nameHeading.title = value || ''
	}

	function setAvatar(source, altText) {
		const safeSource = typeof source === 'string' && source.trim() ? source : fallbackAvatar || ''
		avatarImage.src = safeSource
		avatarImage.alt = altText || 'Character portrait'
	}

	function setCover(source, altText) {
		const safeSource = typeof source === 'string' && source.trim() ? source : fallbackAvatar || ''
		coverImage.src = safeSource
		coverImage.alt = altText || 'Character cover'
	}

	function destroy() {
		root.replaceChildren()
	}

	return {
		root,
		setName,
		setAvatar,
		setCover,
		destroy,
		elements: {
			nameHeading,
			avatarImage,
			coverImage,
			headerMeta,
		},
	}
}
