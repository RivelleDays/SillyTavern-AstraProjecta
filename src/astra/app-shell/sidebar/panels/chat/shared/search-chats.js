/**
 * Performs server-side chat search for the current entity (group or character).
 * The function is environment-friendly and works with SillyTavern globals if present.
 */
export async function searchChatsForCurrentEntity(query, opts = {}) {
    const getCtxFromST =
        (typeof SillyTavern !== 'undefined' &&
        typeof SillyTavern.getContext === 'function')
        ? () => SillyTavern.getContext()
        : () => ({});

    // Prefer caller's getContext, fallback to ST global
    const getContext = typeof opts.getContext === 'function'
        ? opts.getContext
        : getCtxFromST;

    const has = (v) => typeof v !== 'undefined' && v !== null;
    const ctx = getContext() || {};
    const globalScope = typeof globalThis !== 'undefined' ? globalThis : {};
    const selectedGroupGlobal = has(globalScope.selected_group) ? globalScope.selected_group : null;
    const charactersGlobal = Array.isArray(globalScope.characters) ? globalScope.characters : null;
    const currentCharacterIdGlobal = has(globalScope.this_chid) ? globalScope.this_chid : null;

    // Resolve active group id
    let group_id = null;
    if (has(selectedGroupGlobal)) {
        group_id = selectedGroupGlobal || null;
    } else if (has(ctx.groupId)) {
        group_id = String(ctx.groupId);
    }

    // Resolve avatar URL (only when not in a group)
    let avatar_url = null;
    if (!group_id) {
        if (
            has(currentCharacterIdGlobal) &&
            charactersGlobal
        ) {
            avatar_url = charactersGlobal[currentCharacterIdGlobal]?.avatar ?? null;
        } else if (has(ctx.characterId) && Array.isArray(ctx.characters)) {
            avatar_url = ctx.characters[ctx.characterId]?.avatar ?? null;
        }
    }

    // Header factory resolution: prefer caller, then window, then ST context
    const headerFactory =
        (typeof opts.getRequestHeaders === 'function' && opts.getRequestHeaders) ||
        (typeof window !== 'undefined' && typeof window.getRequestHeaders === 'function' && window.getRequestHeaders) ||
        (
        typeof SillyTavern !== 'undefined' &&
        typeof SillyTavern.getContext === 'function' &&
        typeof SillyTavern.getContext().getRequestHeaders === 'function' &&
        SillyTavern.getContext().getRequestHeaders
        ) ||
        null;

    const headers = headerFactory
        ? headerFactory()
        : { 'Content-Type': 'application/json', 'Accept': 'application/json' };

    const resp = await fetch('/api/chats/search', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, avatar_url, group_id }),
        credentials: 'include',
        cache: 'no-cache',
    });

    if (!resp.ok) {
        let text = '';
        try { text = await resp.text(); } catch (_) {}
        console.error('[AstraProjecta] Search request failed', {
            status: resp.status,
            statusText: resp.statusText,
            body: { query, avatar_url, group_id },
            responseText: text?.slice?.(0, 500),
        });
        throw new Error('Search failed');
    }

    return await resp.json();
}
