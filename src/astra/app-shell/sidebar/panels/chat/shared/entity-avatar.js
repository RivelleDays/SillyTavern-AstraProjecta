import { getCompositeAvatar } from '../../../../../shared/components/index.js';

const SAFE_AVATAR = '/img/five.png';

function resolveCurrentEntity(getContext) {
    const c = (typeof getContext === 'function' ? getContext() : {}) || {};
    if (c.groupId) {
        const gid = String(c.groupId);
        const group = (c.groups ?? []).find(g => String(g.id) === gid) || c.activeGroup || null;
        return { entity: group, isGroup: !!group };
    }
    if (typeof c.characterId !== 'undefined' && c.characterId !== null) {
        const ch = (c.characters ?? [])[c.characterId] || null;
        return { entity: ch, isGroup: false };
    }
    return { entity: null, isGroup: false };
}

export function bind(imgEl, getContext) {
    let disposed = false;
    let requestId = 0;

    imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.src = SAFE_AVATAR;
    };

    async function apply() {
        if (disposed) return;
        const { entity } = resolveCurrentEntity(getContext);
        const currentId = ++requestId;

        let source = SAFE_AVATAR;
        try {
            source = await getCompositeAvatar(entity, { fallback: SAFE_AVATAR });
        } catch {
            source = SAFE_AVATAR;
        }

        if (disposed || currentId !== requestId) return;
        imgEl.src = source;
    }

    apply();

    return {
        update() { apply(); },
        dispose() { disposed = true; requestId += 1; imgEl.onerror = null; },
    };
}
