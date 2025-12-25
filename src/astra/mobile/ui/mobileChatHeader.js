import { MOBILE_MAIN_CLOSE_BUTTON_ID } from '../styles/classes.js'

const noop = () => {}
const MOBILE_FORM_SHELL_WRAPPER_ID = 'mobileFormShellWrapper'
const NodeCtor = globalThis?.Node ?? null

function getCloseButton(documentRef) {
	return documentRef?.getElementById?.(MOBILE_MAIN_CLOSE_BUTTON_ID) ?? null
}

function cloneButton({ document: documentRef, template, id, fallbackLabel }) {
	const doc = documentRef ?? globalThis.document
	if (!doc) return null

	let button = null
	if (template instanceof HTMLElement) {
		button = template.cloneNode(true)
	} else {
		button = doc.createElement('button')
		button.type = 'button'
		button.textContent = fallbackLabel
	}

	button.id = id
	button.type = 'button'
	button.classList.add('icon-button', 'mobile-chat-header__action')
	const title = template instanceof HTMLElement && template.title ? template.title : fallbackLabel
	if (title) {
		button.title = title
		button.setAttribute('aria-label', title)
	}
	return button
}

function isDomNode(value) {
	if (!value || !NodeCtor) return false
	return value instanceof NodeCtor
}

function mirrorActiveState(source, target) {
	if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) return noop
	const sync = () => {
		target.classList.toggle('active', source.classList.contains('active'))
	}
	sync()
	const observer = new MutationObserver(sync)
	observer.observe(source, { attributes: true, attributeFilter: ['class'] })
	return () => observer.disconnect()
}

function mirrorBadge(source, target) {
	if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) return noop
	const sync = () => {
		target.textContent = source.textContent
		target.style.display = source.style.display
	}
	sync()
	const observer = new MutationObserver(sync)
	observer.observe(source, {
		characterData: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['style', 'class'],
	})
	return () => observer.disconnect()
}

export function createMobileChatUiController({
	document: documentRef,
	primaryBarLeft,
	rightSidebar,
	subscribeCharacterDisplay,
} = {}) {
	const doc = documentRef ?? globalThis.document
	if (!doc) {
		return {
			enterMobileLayout: noop,
			exitMobileLayout: noop,
		}
	}

	const header = doc.createElement('div')
	header.id = 'mobileChatHeader'
	header.className = 'mobile-chat-header'
	const formShellWrapper = doc.createElement('div')
	formShellWrapper.id = MOBILE_FORM_SHELL_WRAPPER_ID
	formShellWrapper.className = 'mobile-form-shell-wrapper'

	const identityButton = doc.createElement('button')
	identityButton.id = 'mobileCharacterIdentity'
	identityButton.type = 'button'
	identityButton.className = 'mobile-chat-header__identity'
	identityButton.setAttribute('aria-haspopup', 'true')

	const avatarWrapper = doc.createElement('div')
	avatarWrapper.className = 'mobile-chat-header__avatar'

	const avatar = doc.createElement('img')
	avatar.id = 'mobileCharacterAvatar'
	avatar.alt = 'Character Avatar'
	avatarWrapper.append(avatar)

	const identityText = doc.createElement('div')
	identityText.className = 'mobile-chat-header__identity-text'

	const identityName = doc.createElement('span')
	identityName.className = 'mobile-chat-header__identity-name'

	const groupCount = doc.createElement('span')
	groupCount.className = 'mobile-chat-header__group-count'
	groupCount.setAttribute('aria-label', 'Group members')
	groupCount.style.display = 'none'

	const identityChevron = doc.createElement('span')
	identityChevron.className = 'mobile-chat-header__identity-chevron'
	identityChevron.setAttribute('aria-hidden', 'true')
	identityChevron.innerHTML =
		'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>'

	identityText.append(identityName, groupCount, identityChevron)
	identityButton.append(avatarWrapper, identityText)

	const actionsContainer = doc.createElement('div')
	actionsContainer.className = 'mobile-chat-header__actions'

	const mobileLoreButton = cloneButton({
		document: doc,
		template: rightSidebar?.loreButton,
		id: 'mobileLoreButton',
		fallbackLabel: 'Lore',
	})
	const mobileChatInfoButton = cloneButton({
		document: doc,
		template: rightSidebar?.chatInfoButton,
		id: 'mobileChatInfoButton',
		fallbackLabel: 'Info',
	})

	const mobileLoreBadge = mobileLoreButton?.querySelector('.lore-badge') ?? null
	if (mobileLoreBadge instanceof HTMLElement) {
		mobileLoreBadge.style.display = 'none'
	}

	const resizeButtonIcon = button => {
		if (!(button instanceof HTMLElement)) return
		const icon = button.querySelector('svg')
		if (!icon) return
		icon.setAttribute('width', '20')
		icon.setAttribute('height', '20')
		icon.style.width = '20px'
		icon.style.height = '20px'
	}

	if (mobileLoreButton) {
		mobileLoreButton.addEventListener('click', event => {
			event.preventDefault()
			rightSidebar?.toggleRightSidebar?.('lore')
		})
		resizeButtonIcon(mobileLoreButton)
		actionsContainer.append(mobileLoreButton)
	}

	if (mobileChatInfoButton) {
		mobileChatInfoButton.addEventListener('click', event => {
			event.preventDefault()
			rightSidebar?.toggleRightSidebar?.('chatInfo')
		})
		resizeButtonIcon(mobileChatInfoButton)
		actionsContainer.append(mobileChatInfoButton)
	}

	header.append(identityButton, actionsContainer)

	if (typeof rightSidebar?.registerEntityInfoTrigger === 'function') {
		rightSidebar.registerEntityInfoTrigger(identityButton)
	}

	if (rightSidebar?.loreButton && mobileLoreButton) {
		mirrorActiveState(rightSidebar.loreButton, mobileLoreButton)
	}
	if (rightSidebar?.chatInfoButton && mobileChatInfoButton) {
		mirrorActiveState(rightSidebar.chatInfoButton, mobileChatInfoButton)
	}
	if (rightSidebar?.loreBadge && mobileLoreBadge) {
		mirrorBadge(rightSidebar.loreBadge, mobileLoreBadge)
	}

	let mobileChatFileName = null
	let mobileChatFileNameLabel = null
	const chatFileNameTemplate = doc.getElementById('chatFileName')
	if (chatFileNameTemplate instanceof HTMLElement) {
		mobileChatFileName = chatFileNameTemplate.cloneNode(true)
		mobileChatFileName.id = 'mobileChatFileName'
		mobileChatFileName.classList.add('mobile-chat-file-name')
		const templateLabel =
			mobileChatFileName.querySelector('#chatFileNameLabel') ??
			mobileChatFileName.querySelector('.chat-header-role__name')
		if (templateLabel instanceof HTMLElement) {
			templateLabel.id = 'mobileChatFileNameLabel'
			templateLabel.classList.add('mobile-chat-file-name__label')
			templateLabel.textContent = ''
			mobileChatFileNameLabel = templateLabel
		}
	} else {
		mobileChatFileName = doc.createElement('div')
		mobileChatFileName.id = 'mobileChatFileName'
		mobileChatFileName.className = 'mobile-chat-file-name'

		mobileChatFileNameLabel = doc.createElement('span')
		mobileChatFileNameLabel.id = 'mobileChatFileNameLabel'
		mobileChatFileNameLabel.className = 'mobile-chat-file-name__label'
		mobileChatFileName.append(mobileChatFileNameLabel)
	}

	let latestDisplayState = null
	let isMobileLayoutActive = false
	let originalFormParent = null
	let originalFormNextSibling = null
	let headerHost = null
	let isFileNameVisible = true

	function renderDisplayState(state) {
		if (!state) return
		const {
			name = '',
			nameTitle = '',
			groupMemberCount = 0,
			hasGroupMembers = false,
			chatFileName = '',
			hasChat = false,
			chatFileNameTitle = '',
			avatarSrc = '',
		} = state

		identityName.textContent = name
		identityName.title = nameTitle || name

		if (identityButton) {
			const ariaLabel = name ? `Open ${name} details` : 'Open entity details'
			identityButton.setAttribute('aria-label', ariaLabel)
		}

		if (avatarSrc) avatar.src = avatarSrc
		else avatar.removeAttribute('src')

		if (hasGroupMembers) {
			groupCount.textContent = String(groupMemberCount)
			groupCount.style.display = 'inline-flex'
			groupCount.classList.add('is-visible')
		} else {
			groupCount.textContent = ''
			groupCount.style.display = 'none'
			groupCount.classList.remove('is-visible')
		}

		if (mobileChatFileNameLabel) {
			mobileChatFileNameLabel.textContent = chatFileName
		}

		if (mobileChatFileName) {
			if (chatFileNameTitle) mobileChatFileName.title = chatFileNameTitle
			else mobileChatFileName.removeAttribute('title')
			mobileChatFileName.style.display = hasChat && isFileNameVisible ? 'inline-flex' : 'none'
		}

		if (isMobileLayoutActive) {
			ensureChatFileNameInBar()
			mountMobileRegion()
		}
	}

	const unsubscribeCharacterDisplay =
		typeof subscribeCharacterDisplay === 'function'
			? subscribeCharacterDisplay(state => {
					latestDisplayState = state
					if (isMobileLayoutActive) renderDisplayState(state)
			  })
			: null

	function ensureChatFileNameInBar() {
		if (!(primaryBarLeft instanceof HTMLElement) || !(mobileChatFileName instanceof HTMLElement)) return
		if (mobileChatFileName.isConnected) return
		const closeButton = getCloseButton(doc)
		if (closeButton?.parentNode === primaryBarLeft) {
			primaryBarLeft.insertBefore(mobileChatFileName, closeButton.nextSibling)
		} else {
			primaryBarLeft.prepend(mobileChatFileName)
		}
	}

	const attachHeaderToHost = () => {
		const targetHost = headerHost ?? formShellWrapper
		if (!targetHost || !(targetHost instanceof HTMLElement)) return
		if (header.parentNode !== targetHost) {
			if (header.parentNode) {
				header.parentNode.removeChild(header)
			}
			// Place header after close button if present for consistent top bar layout.
			const closeButton = targetHost.querySelector?.('#mobileMainCloseButton')
			if (closeButton?.nextSibling) {
				targetHost.insertBefore(header, closeButton.nextSibling)
			} else {
				targetHost.prepend(header)
			}
		}
	}

	function ensureWrapperWithForm() {
		const formShell = doc.getElementById('form_sheld')
		if (!(formShell instanceof HTMLElement) || !formShell.parentNode) return null

			if (!formShellWrapper.isConnected) {
				originalFormParent = formShell.parentNode
				originalFormNextSibling = isDomNode(formShell.nextSibling) ? formShell.nextSibling : null
				formShellWrapper.append(formShell)
				originalFormParent.insertBefore(formShellWrapper, originalFormNextSibling)
			} else if (!formShellWrapper.contains(formShell)) {
				formShellWrapper.append(formShell)
			}

		attachHeaderToHost()

		return formShell
	}

	function mountMobileRegion() {
		const formShell = ensureWrapperWithForm()
		if (!formShell) return
	}

	function restoreFormShell() {
		const formShell = doc.getElementById('form_sheld')
		if (formShell instanceof HTMLElement && formShellWrapper.contains(formShell)) {
			formShellWrapper.removeChild(formShell)
				if (originalFormParent instanceof HTMLElement) {
					if (isDomNode(originalFormNextSibling) && originalFormNextSibling.parentNode === originalFormParent) {
					originalFormParent.insertBefore(formShell, originalFormNextSibling)
				} else {
					originalFormParent.appendChild(formShell)
				}
			} else {
				formShellWrapper.parentNode?.insertBefore(formShell, formShellWrapper)
			}
		}
	}

	function unmountMobileRegion() {
		if (header.isConnected) header.remove()
		restoreFormShell()
		if (formShellWrapper.isConnected) formShellWrapper.remove()
		if (mobileChatFileName?.isConnected) mobileChatFileName.remove()
		originalFormParent = null
		originalFormNextSibling = null
	}

	function enterMobileLayout() {
		isMobileLayoutActive = true
		ensureChatFileNameInBar()
		mountMobileRegion()
		if (latestDisplayState) renderDisplayState(latestDisplayState)
	}

	function exitMobileLayout() {
		isMobileLayoutActive = false
		unmountMobileRegion()
	}

	function setHeaderHost(host, { detachIfMissing = false } = {}) {
		headerHost = host ?? null
		if (!headerHost && detachIfMissing && header.parentNode) {
			header.parentNode.removeChild(header)
		}
		if (isMobileLayoutActive) {
			attachHeaderToHost()
		}
	}

	return {
		enterMobileLayout,
		exitMobileLayout,
		setHeaderHost,
		getHeaderNode: () => header,
		setFileNameVisible: visible => {
			isFileNameVisible = !!visible
			if (mobileChatFileName) {
				const hasChat = latestDisplayState?.hasChat
				mobileChatFileName.style.display = hasChat && isFileNameVisible ? 'inline-flex' : 'none'
			}
		},
		destroy: () => {
			unsubscribeCharacterDisplay?.()
			unmountMobileRegion()
		},
	}
}
