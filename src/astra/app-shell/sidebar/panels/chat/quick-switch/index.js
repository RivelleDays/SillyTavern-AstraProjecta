import {
    characters,
    selectCharacterById,
    setActiveCharacter,
    setActiveGroup,
    this_chid,
} from '../../../../../../../../../../../script.js';

import {
    groups,
    selected_group,
    openGroupById as openGroupByIdImported,
} from '../../../../../../../../../../group-chats.js';

import { getCompositeAvatar } from '../../../../../shared/components/index.js';

export const CHAT_MANAGER_NAVIGATE_EVENT = 'astra:chat-manager-navigate';

/**
 * Mounts the avatar-only Quick Switch into a container and returns a small API.
 * - Renders up to QS_MAX recent entities (characters + groups), excluding current.
 * - Clicking an item switches chat and optionally triggers an afterNavigate callback.
 */
export function mountQuickSwitch({ container, openGroupById, openChatById } = {}) {
    const root = document.createElement('div');
    root.className = 'chat-manager-quick-switch';
    container.appendChild(root);
    const sidebarHost = container?.closest?.('#leftSidebar') ?? null;

    const QS_MAX = 25;
    const openGroup = openGroupById || openGroupByIdImported;

    function sortByRecent(a, b) {
        const ad = Number(a?.date_last_chat || 0);
        const bd = Number(b?.date_last_chat || 0);
        return bd - ad;
    }

    function collectCandidates() {
        const current =
            characters[this_chid] ??
            (groups.find(g => String(g.id) === String(selected_group)) || null);

        const currentKey = current ? (current.avatar ?? current.id) : null;

        return [...characters, ...groups]
            .filter(e => (e.avatar ?? e.id) !== currentKey)
            .sort(sortByRecent)
            .slice(0, QS_MAX);
    }

    let afterNavigate = null;

    async function refresh() {
        // Renders the switcher content based on the latest characters/groups.
        root.replaceChildren();
        const pool = collectCandidates();

        // Avoid unnecessary image work when nothing to show yet.
        if (!pool.length) return;

        const avatars = await Promise.all(pool.map(e => getCompositeAvatar(e)));
        let isNavigating = false;

        pool.forEach((ent, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chat-manager-q-item';
            btn.title = ent.name || 'Unnamed';
            btn.style.setProperty('--chat-manager-q-img', `url("${avatars[i]}")`);

            btn.addEventListener('click', async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                if (isNavigating) return;
                isNavigating = true;

                window.chatManagerQSLock = true;
                try { document.activeElement?.blur?.(); } catch {}

                try {
                    if (ent.members) {
                        try { setActiveCharacter?.(null); } catch {}
                        try { setActiveGroup?.(ent.id); } catch {}
                        if (typeof openGroup === 'function') {
                            await openGroup(ent.id);
                        } else if (typeof openChatById === 'function') {
                            await openChatById({ type: 'group', id: ent.id });
                        }
                    } else {
                        const idx = characters.indexOf(ent);
                        if (idx >= 0) {
                            try { setActiveGroup?.(null); } catch {}
                            try { setActiveCharacter?.(idx); } catch {}
                            if (typeof selectCharacterById === 'function') {
                                await selectCharacterById(idx);
                            } else if (typeof openChatById === 'function') {
                                await openChatById({ type: 'character', id: idx });
                            }
                        }
                    }

                    if (typeof afterNavigate === 'function') {
                        try { afterNavigate(); } catch {}
                    }

                    const detail = {
                        source: 'quick-switch',
                        isGroup: !!ent?.members,
                        entityId: ent?.members ? ent?.id : characters.indexOf(ent),
                        entityName: ent?.name || '',
                    };
                    try {
                        root.dispatchEvent(new CustomEvent(CHAT_MANAGER_NAVIGATE_EVENT, {
                            bubbles: true,
                            detail,
                        }));
                    } catch {}
                } catch (err) {
                    console?.warn?.('[chat-manager] Quick-switch navigation failed:', err);
                } finally {
                    setTimeout(() => { isNavigating = false; }, 50);
                    window.chatManagerQSLock = false;
                }
            });

            root.appendChild(btn);
        });
    }

    // Eager-load on mount: render immediately, then retry briefly until data arrives.
    (function eagerInit() {
        // First attempt right away so the UI does not feel empty.
        refresh();

        const deadline = Date.now() + 8000; // Hard stop to avoid runaway refreshes
        let lastCount = -1;
        let timer = null;

        const tick = async () => {
            const isConnected = root.isConnected;
            if (!isConnected && Date.now() < deadline) {
                return;
            }

            const countNow = (characters?.length || 0) + (groups?.length || 0);
            const hasUI = root.childElementCount > 0;
            const timeUp = Date.now() >= deadline;

            // Stop when something is rendered or the deadline passes.
            if (hasUI || timeUp) {
                clearInterval(timer);
                return;
            }

            // Only refresh when new data is observed to minimize work.
            if (countNow !== lastCount) {
                lastCount = countNow;
                await refresh();
            }
        };

        timer = setInterval(tick, 250);

        // Also refresh when the tab becomes visible again, to keep it fresh.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) refresh();
        }, { passive: true });

        if (sidebarHost) {
            sidebarHost.addEventListener('astra:desktop-nav-restored', refresh, { passive: true });
        }
    })();

    return {
        root,
        refresh,
        setAfterNavigate(fn) { afterNavigate = typeof fn === 'function' ? fn : null; },
        dispose() {
            if (sidebarHost) {
                sidebarHost.removeEventListener('astra:desktop-nav-restored', refresh);
            }
        },
    };
}
