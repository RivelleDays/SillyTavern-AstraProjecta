export function createChatCategoryStore(ST_CTX, MODULE_NAME, getScopeKey) {
    // Isolate host context safely
    const ctx = ST_CTX || {};
    const extensionSettings = ctx.extensionSettings || {};
    const saveSettingsDebounced = typeof ctx.saveSettingsDebounced === 'function' ? ctx.saveSettingsDebounced : () => {};
    const eventSource = ctx.eventSource || null;
    const eventTypes = ctx.eventTypes || ctx.event_types || {};

    // Per-entity defaults
    const DEFAULTS = Object.freeze({
        cats: { order: [], collapsed: {}, items: {} }, // items[name] = string[] of chatIds
        map: {},                                        // map[chatId] = string[] of category names
    });

    // Ensure the module root is scoped by entity (character / group)
    function ensureScopedRoot() {
        if (!extensionSettings[MODULE_NAME]) {
            extensionSettings[MODULE_NAME] = { scoped: {} };
        }
        const root = extensionSettings[MODULE_NAME];
        if (!root.scoped || typeof root.scoped !== 'object') {
            root.scoped = {};
        }

        // One-time migration of legacy top-level into a non-active legacy namespace.
        // This avoids cross-entity sharing while preserving old data for manual reference.
        if (root.cats || root.map) {
            const legacyKey = '__legacy__';
            if (!root.scoped[legacyKey]) {
                root.scoped[legacyKey] = {
                    cats: normalizeCats(root.cats),
                    map: normalizeMap(root.map),
                };
            }
            delete root.cats;
            delete root.map;
            try { saveSettingsDebounced(); } catch {}
        }
        return root;
    }

    // Resolve the current scope key dynamically so switching character/group swaps storage
    function currentScopeKey() {
        try {
            const key = typeof getScopeKey === 'function' ? getScopeKey() : null;
            return String(key || '__global__');
        } catch {
            return '__global__';
        }
    }

    // Lightweight announcer so UI listens once and re-renders on changes
    function emitCatsChanged() {
        try { window.dispatchEvent(new CustomEvent('chat-manager-cats-changed')); } catch {}
    }

    // Normalizers keep structure predictable and deduped
    function normalizeCats(raw) {
        const def = { order: [], collapsed: {}, items: {} };
        const d = (raw && typeof raw === 'object') ? raw : def;
        d.order = Array.isArray(d.order) ? d.order.filter(Boolean) : [];
        d.collapsed = (d.collapsed && typeof d.collapsed === 'object') ? d.collapsed : {};
        d.items = (d.items && typeof d.items === 'object') ? d.items : {};
        for (const k of Object.keys(d.items)) {
            const arr = Array.isArray(d.items[k]) ? d.items[k] : [];
            d.items[k] = Array.from(new Set(arr.filter(Boolean)));
        }
        return d;
    }
    function normalizeMap(raw) {
        const m = (raw && typeof raw === 'object') ? raw : {};
        for (const k of Object.keys(m)) {
            const arr = Array.isArray(m[k]) ? m[k] : [];
            m[k] = Array.from(new Set(arr.filter(Boolean)));
        }
        return m;
    }

    // Entity-scoped state accessors
    function getState() {
        const root = ensureScopedRoot();
        const key = currentScopeKey();

        if (!root.scoped[key]) {
            root.scoped[key] = structuredClone(DEFAULTS);
        }
        const st = root.scoped[key];

        // Always keep normalized before use
        if (!st.cats) st.cats = structuredClone(DEFAULTS.cats);
        if (!st.map)  st.map  = {};
        st.cats = normalizeCats(st.cats);
        st.map  = normalizeMap(st.map);

        return st;
    }

    function saveCats(nextCats) {
        const root = ensureScopedRoot();
        const key = currentScopeKey();
        if (!root.scoped[key]) root.scoped[key] = structuredClone(DEFAULTS);
        root.scoped[key].cats = normalizeCats(nextCats);
        saveSettingsDebounced();
        emitCatsChanged();
    }
    function saveMap(nextMap) {
        const root = ensureScopedRoot();
        const key = currentScopeKey();
        if (!root.scoped[key]) root.scoped[key] = structuredClone(DEFAULTS);
        root.scoped[key].map = normalizeMap(nextMap);
        saveSettingsDebounced();
        emitCatsChanged();
    }

    function loadCats() { return getState().cats; }
    function loadMap()  { return getState().map;  }
    function normalizeName(s) { return String(s || '').trim(); }

    function ensureCategory(name) {
        const n = normalizeName(name);
        if (!n) return null;
        const cats = loadCats();
        if (!cats.order.includes(n)) cats.order.push(n);
        if (!cats.items[n]) cats.items[n] = [];
        if (typeof cats.collapsed[n] !== 'boolean') cats.collapsed[n] = false;
        saveCats(cats);
        return n;
    }

    function deleteCategory(name) {
        const n = normalizeName(name);
        const cats = loadCats();
        const map = loadMap();

        delete cats.items[n];
        delete cats.collapsed[n];
        cats.order = cats.order.filter(x => x !== n);

        for (const cid of Object.keys(map)) {
            map[cid] = (map[cid] || []).filter(c => c !== n);
            if (!map[cid].length) delete map[cid];
        }

        saveCats(cats);
        saveMap(map);
    }

    function renameCategory(oldName, newName) {
        const on = normalizeName(oldName), nn = normalizeName(newName);
        if (!on || !nn || on === nn) return;

        const cats = loadCats();
        const map  = loadMap();

        if (!cats.items[on]) return;

        if (!cats.items[nn]) cats.items[nn] = [];
        cats.items[nn] = Array.from(new Set([...(cats.items[nn] || []), ...(cats.items[on] || [])]));
        delete cats.items[on];

        cats.collapsed[nn] = cats.collapsed[on] ?? false;
        delete cats.collapsed[on];

        cats.order = cats.order.map(x => (x === on ? nn : x)).filter(Boolean);

        for (const [cid, arr] of Object.entries(map)) {
            if ((arr || []).includes(on)) {
                map[cid] = Array.from(new Set([...(arr || []).filter(c => c !== on), nn]));
            }
        }

        saveCats(cats);
        saveMap(map);
    }

    function setChatInCategory(chatId, catName, shouldBeIn) {
        const n = ensureCategory(catName);
        if (!n) return;

        const cats = loadCats();
        const map  = loadMap();

        const list = new Set(cats.items[n] || []);
        const current = new Set(map[chatId] || []);

        if (shouldBeIn) {
            list.add(chatId);
            current.add(n);
            cats.items[n] = [chatId, ...[...list].filter(id => id !== chatId)];
        } else {
            list.delete(chatId);
            current.delete(n);
            cats.items[n] = [...list];
        }

        if (current.size) map[chatId] = [...current];
        else delete map[chatId];

        saveCats(cats);
        saveMap(map);
    }

    function removeChatFromCategory(chatId, catName) {
        setChatInCategory(chatId, catName, false);
    }

    // Rename propagation within the same scope only
    function handleChatRenamePersist(oldNameRaw, newNameRaw) {
        const oldId = String(oldNameRaw || '').replace('.jsonl', '').trim();
        const newId = String(newNameRaw || '').replace('.jsonl', '').trim();
        if (!oldId || !newId || oldId === newId) return;

        const cats = loadCats();
        const map  = loadMap();
        let changed = false;

        for (const cat of cats.order) {
            const arr = cats.items[cat] || [];
            const idx = arr.indexOf(oldId);
            if (idx !== -1) {
                arr[idx] = newId;
                cats.items[cat] = Array.from(new Set(arr));
                changed = true;
            }
        }

        if (map[oldId]) {
            map[newId] = Array.from(new Set([...(map[newId] || []), ...map[oldId]]));
            delete map[oldId];
            changed = true;
        }

        if (changed) {
            saveCats(cats);
            saveMap(map);
        }
    }

    // Wire rename listener (kept local to scope)
    (function wireChatRenameListener() {
        const ev = eventSource;
        const et = eventTypes || {};
        const candidateType =
            et.CHAT_RENAMED ||
            et.CHAT_FILE_RENAMED ||
            et.CHAT_NAME_CHANGED ||
            et.CHAT_CHANGED;

        if (ev && typeof ev.on === 'function' && candidateType) {
            ev.on(candidateType, (payload) => {
                const oldName = payload?.oldFileName ?? payload?.old ?? payload?.old_name ?? payload?.oldId;
                const newName = payload?.newFileName ?? payload?.new ?? payload?.new_name ?? payload?.newId;
                if (oldName && newName) handleChatRenamePersist(oldName, newName);
            });
        }

        try { window.chatManagerHandleChatRename = handleChatRenamePersist; } catch {}
    })();

    return {
        loadCats, saveCats, loadMap, saveMap,
        ensureCategory, deleteCategory, renameCategory,
        setChatInCategory, removeChatFromCategory, handleChatRenamePersist
    };
}
