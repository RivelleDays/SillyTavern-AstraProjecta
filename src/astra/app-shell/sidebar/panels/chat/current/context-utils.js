const DEFAULT_TITLE = 'Current Chat';

function invokeContext(getContext) {
    if (typeof getContext !== 'function') return {};
    try {
        const ctx = getContext();
        return ctx && typeof ctx === 'object' ? ctx : {};
    } catch {
        return {};
    }
}

export function createContextUtils({ getContext } = {}) {
    function resolveCurrentEntity() {
        const ctx = invokeContext(getContext);
        if (ctx.groupId !== undefined && ctx.groupId !== null) {
            const groupId = String(ctx.groupId);
            const groups = Array.isArray(ctx.groups) ? ctx.groups : [];
            const group =
                groups.find((entry) => entry && String(entry.id) === groupId) ||
                ctx.activeGroup ||
                null;
            return { entity: group, isGroup: !!group };
        }

        if (ctx.characterId !== undefined && ctx.characterId !== null) {
            const characters = Array.isArray(ctx.characters) ? ctx.characters : [];
            const index = Number(ctx.characterId);
            const character = Number.isInteger(index) ? characters[index] : null;
            return { entity: character ?? null, isGroup: false };
        }

        return { entity: null, isGroup: false };
    }

    function getEntityName(entity) {
        return entity?.name || entity?.id || DEFAULT_TITLE;
    }

    function resolveChatScope() {
        const ctx = invokeContext(getContext);
        const groupId = ctx.groupId ?? null;
        const hasCharacter = ctx.characterId !== undefined && ctx.characterId !== null;
        return {
            ctx,
            isGroup: !!groupId,
            groupId,
            characterId: hasCharacter ? ctx.characterId : null,
        };
    }

    function computeScopeKey() {
        const ctx = invokeContext(getContext);
        if (ctx.groupId !== undefined && ctx.groupId !== null) {
            return `group:${String(ctx.groupId)}`;
        }
        if (ctx.characterId !== undefined && ctx.characterId !== null) {
            return `char:${String(ctx.characterId)}`;
        }
        return '__global__';
    }

    return {
        resolveCurrentEntity,
        getEntityName,
        resolveChatScope,
        computeScopeKey,
    };
}

export function createRequestHeadersFactory(ST) {
    return () => {
        if (ST && typeof ST.getRequestHeaders === 'function') {
            try {
                const headers = ST.getRequestHeaders();
                if (headers && typeof headers === 'object') {
                    return headers;
                }
            } catch {
                /* ignore */
            }
        }

        if (typeof window !== 'undefined') {
            if (typeof window.getRequestHeaders === 'function') {
                try {
                    const headers = window.getRequestHeaders();
                    if (headers && typeof headers === 'object') {
                        return headers;
                    }
                } catch {
                    /* ignore */
                }
            }

            if (window.SillyTavern && typeof window.SillyTavern.getRequestHeaders === 'function') {
                try {
                    const headers = window.SillyTavern.getRequestHeaders();
                    if (headers && typeof headers === 'object') {
                        return headers;
                    }
                } catch {
                    /* ignore */
                }
            }
        }

        return { 'Content-Type': 'application/json', Accept: 'application/json' };
    };
}
