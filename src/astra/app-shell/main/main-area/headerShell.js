import { TOGGLE_ENTITY_INFO_PANEL_EVENT } from '../right-sidebar/panels/entity-info/events/eventNames.js'

export function createMainHeaderShell({ document }) {
    const characterSection = document.createElement('div')
    characterSection.id = 'characterSection'

    const characterIdentity = document.createElement('button')
    characterIdentity.id = 'characterIdentity'
    characterIdentity.type = 'button'
    characterIdentity.addEventListener('click', event => {
        if (characterIdentity.classList.contains('entity-info-trigger')) return
        event.preventDefault()
        const toggleEvent = new CustomEvent(TOGGLE_ENTITY_INFO_PANEL_EVENT, { bubbles: true })
        characterIdentity.dispatchEvent(toggleEvent)
    })

    const avatarWrapper = document.createElement('div')
    avatarWrapper.id = 'avatarWrapper'

    const characterAvatar = document.createElement('img')
    characterAvatar.id = 'characterAvatar'
    characterAvatar.alt = 'Character Avatar'
    avatarWrapper.append(characterAvatar)

    const characterName = document.createElement('div')
    characterName.id = 'characterName'

    const characterNameLabel = document.createElement('span')
    characterNameLabel.id = 'characterNameLabel'

    const groupMemberCount = document.createElement('span')
    groupMemberCount.id = 'groupMemberCount'
    groupMemberCount.title = 'Group members'

    characterName.append(characterNameLabel, groupMemberCount)

    characterIdentity.append(avatarWrapper, characterName)

    const chatFileName = document.createElement('div')
    chatFileName.id = 'chatFileName'
    chatFileName.classList.add('chat-header-role')

    const chatFileNameLabel = document.createElement('span')
    chatFileNameLabel.id = 'chatFileNameLabel'
    chatFileNameLabel.classList.add('chat-header-role__name')

    const chatManagerCatRoleIcon = document.createElement('div')
    chatManagerCatRoleIcon.id = 'chatManagerCatRoleIcon'
    chatManagerCatRoleIcon.setAttribute('aria-hidden', 'true')
    chatManagerCatRoleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-point chat-header-role__icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 7a5 5 0 1 1 -4.995 5.217l-.005 -.217l.005 -.217a5 5 0 0 1 4.995 -4.783z" /></svg>`
    const chatManagerCatRoleIconSvg = chatManagerCatRoleIcon.querySelector('svg')
    if (chatManagerCatRoleIconSvg) {
        chatManagerCatRoleIconSvg.setAttribute('aria-hidden', 'true')
        chatManagerCatRoleIconSvg.setAttribute('focusable', 'false')
        chatManagerCatRoleIconSvg.classList.add('chat-header-role__icon')
    }

    chatFileName.append(chatFileNameLabel)

    characterSection.append(characterIdentity, chatManagerCatRoleIcon, chatFileName)

    const existingTitleSlot = document.getElementById('primaryTitleSlot')
    const primaryTitleSlot =
        existingTitleSlot instanceof HTMLElement ? existingTitleSlot : document.createElement('div')
    primaryTitleSlot.id = 'primaryTitleSlot'
    primaryTitleSlot.className = 'primary-title-slot astra-primary-title-slot'
    primaryTitleSlot.style.display = 'none'
    primaryTitleSlot.replaceChildren()

    const existingDivider = document.getElementById('primaryTitleDivider')
    const primaryTitleDivider =
        existingDivider instanceof HTMLElement ? existingDivider : document.createElement('div')
    primaryTitleDivider.id = 'primaryTitleDivider'
    primaryTitleDivider.className = 'astra-primary-divider'

    return {
        characterSection,
        characterIdentity,
        avatarWrapper,
        characterAvatar,
        characterName,
        characterNameLabel,
        groupMemberCount,
        chatFileName,
        chatFileNameLabel,
        chatManagerCatRoleIcon,
        primaryTitleSlot,
        primaryTitleDivider,
    }
}
