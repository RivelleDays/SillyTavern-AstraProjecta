import {
    getDefaultAvatar,
    getGroupMemberCount,
    getSingleCharacterAvatarUrl,
    hasCustomAvatarUrl,
    thumbFromFileId,
} from '../services/avatarUtils.js'
import { getCompositeAvatar } from '../../../../shared/components/index.js'

export function createEntityContext({ getContext, getGroups, getSelectedGroup }) {
    function getGroupsList() {
        return getGroups?.() ?? []
    }

    function getSelectedGroupId() {
        return getSelectedGroup?.()
    }

    function resolveCurrentEntity() {
        const ctx = getContext()
        const groupId = ctx.groupId ?? getSelectedGroupId()
        let entity = null
        if (ctx.groupId !== null && typeof ctx.groupId !== 'undefined') {
            entity = getGroupsList().find(group => String(group.id) === String(groupId)) || null
        } else if (typeof ctx.characterId !== 'undefined' && ctx.characterId !== null) {
            const characters = ctx.characters ?? []
            entity = characters[ctx.characterId] || null
        }
        return {
            entity,
            isGroup: !!entity && Array.isArray(entity.members),
        }
    }

    function getEntityName(entity) {
        return entity?.name || entity?.id || 'SillyTavern'
    }

    function getEntityNameLower() {
        const { entity } = resolveCurrentEntity()
        return String(getEntityName(entity)).toLowerCase()
    }

    async function getEntityAvatarSources(entity, isGroup) {
        if (!entity) return { primary: getDefaultAvatar(), carousel: [] }
        if (isGroup) {
            if (hasCustomAvatarUrl(entity.avatar_url)) {
                return { primary: entity.avatar_url, carousel: [] }
            }
            if (entity.avatar) {
                return { primary: thumbFromFileId(entity.avatar), carousel: [] }
            }
            const composite = await getCompositeAvatar(entity, { fallback: getDefaultAvatar(), size: 60 })
            return { primary: composite, carousel: [] }
        }
        return {
            primary: getSingleCharacterAvatarUrl(entity),
            carousel: [],
        }
    }

    return {
        resolveCurrentEntity,
        getEntityName,
        getEntityNameLower,
        getEntityAvatarSources,
        getGroupMemberCount,
    }
}
