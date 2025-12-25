const DEFAULT_AVATAR = '/img/five.png'

export function thumbFromFileId(fileId) {
    return fileId ? `/thumbnail?type=avatar&file=${encodeURIComponent(fileId)}` : DEFAULT_AVATAR
}

export function isPlaceholderAvatar(url) {
    if (!url) return true
    const trimmed = url.trim()
    if (!trimmed) return true
    return (
        trimmed.includes('/img/ai') ||
        /img\/ai\d+\.png/.test(trimmed) ||
        trimmed.includes('/img/five') ||
        trimmed.startsWith('img/ai') ||
        trimmed.startsWith('/img/ai')
    )
}

export function hasCustomAvatarUrl(url) {
    if (!url) return false
    return !isPlaceholderAvatar(url)
}

export function getSingleCharacterAvatarUrl(character) {
    if (!character) return DEFAULT_AVATAR
    if (hasCustomAvatarUrl(character.avatar_url)) return character.avatar_url
    if (character.avatar) return thumbFromFileId(character.avatar)
    return DEFAULT_AVATAR
}

export function getGroupMemberFileIds(group) {
    if (!group) return []
    const members = [
        ...(group.members ?? []),
        ...(group.disabled_members ?? []),
    ].filter(member => member !== undefined && member !== null)
    return members.filter((member, index, list) => index === list.indexOf(member))
}

export function getGroupMemberCount(group) {
    return new Set(getGroupMemberFileIds(group)).size
}

export function getGroupAvatarSources(group) {
    return getGroupMemberFileIds(group).map(thumbFromFileId)
}

export function getDefaultAvatar() {
    return DEFAULT_AVATAR
}
