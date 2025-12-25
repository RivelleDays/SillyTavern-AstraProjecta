import { getLucideIconMarkup } from '@/astra/shared/icons/lucide';

const CATEGORY_RENAME_ICON = getLucideIconMarkup('folder-pen');
const CATEGORY_DELETE_ICON = getLucideIconMarkup('folder-x');
const CHAT_RENAME_ICON = getLucideIconMarkup('pencil-line', { size: 18 });

/**
 * Builds and manages the Category Manager page (including drag and drop).
 */
export function createCategoryManagerPage({
    loadCats,
    saveCats,
    loadMap,
    saveMap,
    ensureCategory,
    deleteCategory,
    renameCategory,
    removeChatFromCategory,
    handleChatRenamePersist,
    openChatById,
    onDataChanged,
    getContext,
    loadPopupModule,
    getSortableDelay,
}) {
    const categoriesPageEl = document.createElement('div');
    categoriesPageEl.className = 'chat-manager-page';
    categoriesPageEl.dataset.page = 'categories';

    function getSortableLib() {
        try {
            const jq = window?.jQuery || window?.$;
            return jq && typeof jq.fn?.sortable === 'function' ? jq : null;
        } catch {
            return null;
        }
    }

    function arraysEqual(a = [], b = []) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    function mapsEqual(a = {}, b = {}) {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        if (aKeys.length !== bKeys.length) return false;
        const keys = new Set([...aKeys, ...bKeys]);
        for (const key of keys) {
            if (!arraysEqual(a[key] || [], b[key] || [])) return false;
        }
        return true;
    }

    function renderCategoryManagerPage() {
        categoriesPageEl.innerHTML = '';

        const cats = loadCats();

        const addWrap = document.createElement('div');
        addWrap.className = 'chat-manager-add-cat';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'New category name';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = 'Add';
        addBtn.addEventListener('click', () => {
            const n = ensureCategory(input.value);
            if (n) {
                renderCategoryManagerPage();
                onDataChanged?.();
            }
        });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBtn.click(); });
        addWrap.append(input, addBtn);

        const list = document.createElement('div');
        list.className = 'chat-manager-manager-list';

        for (const name of cats.order) {
            const row = document.createElement('div');
            row.className = 'chat-manager-manager-row';
            row.dataset.catName = name;

            const left = document.createElement('div');
            left.className = 'chat-manager-manager-left';

            const title = document.createElement('span');
            title.className = 'chat-manager-manager-title';
            title.textContent = name;

            const members = (cats.items[name] || []).filter(Boolean);
            const count = document.createElement('span');
            count.className = 'chat-manager-manager-count';
            count.textContent = `${members.length}`;

            left.append(title, count);

            const right = document.createElement('div');
            right.className = 'chat-manager-manager-right';

            const renameBtn = document.createElement('button');
            renameBtn.type = 'button';
            renameBtn.title = 'Rename category';
            renameBtn.innerHTML = CATEGORY_RENAME_ICON;
            renameBtn.addEventListener('click', async () => {
                const { POPUP_TYPE, callGenericPopup } = await loadPopupModule();
                const nn = await callGenericPopup(
                    `<h3>Rename category</h3><p>Enter a new name for "<strong>${name}</strong>":</p>`,
                    POPUP_TYPE.INPUT,
                    '',
                    name,
                );
                const next = String(nn || '').trim();
                if (!next) return;
                renameCategory(name, next);
                renderCategoryManagerPage();
                onDataChanged?.();
            });

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.title = 'Delete category';
            delBtn.innerHTML = CATEGORY_DELETE_ICON;
            delBtn.addEventListener('click', async () => {
                const { POPUP_TYPE, callGenericPopup } = await loadPopupModule();
                const ok = await callGenericPopup(
                    `<h3>Confirm deletion</h3><p>Delete category "<strong>${name}</strong>"?</p>`,
                    POPUP_TYPE.CONFIRM,
                );
                if (!ok) return;
                deleteCategory(name);
                renderCategoryManagerPage();
                onDataChanged?.();
            });

            right.append(delBtn, renameBtn);
            row.append(left, right);

            const sub = document.createElement('div');
            sub.className = 'chat-manager-manager-sub chat-manager-chip-zone';
            sub.dataset.catName = name;

            for (const chatId of members) {
                const chip = document.createElement('div');
                chip.className = 'chat-manager-chip-row';
                chip.dataset.chatId = chatId;
                chip.dataset.catName = name;

                const label = document.createElement('button');
                label.type = 'button';
                label.className = 'chat-manager-chip';
                label.textContent = chatId;
                label.title = 'Open chat';
                label.addEventListener('click', async () => {
                    try { await openChatById(chatId); } catch {}
                });

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'chat-manager-cat-item-remove';
                removeBtn.title = 'Remove from this category';
                removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
                removeBtn.addEventListener('click', async () => {
                    const { POPUP_TYPE, callGenericPopup } = await loadPopupModule();
                    const ok = await callGenericPopup(
                        `<h3>Confirm removal</h3>
                        <p>Remove "<strong>${chatId}</strong>" from category "<strong>${name}</strong>"?</p>`,
                        POPUP_TYPE.CONFIRM,
                    );
                    if (!ok) return;
                    removeChatFromCategory(chatId, name);
                    const cur = loadCats();
                    cur.items[name] = (cur.items[name] || []).filter((id) => id !== chatId);
                    saveCats(cur);
                    renderCategoryManagerPage();
                    onDataChanged?.();
                });

                const renameChatBtn = document.createElement('button');
                renameChatBtn.type = 'button';
                renameChatBtn.className = 'chat-manager-cat-item-rename chat-manager-cat-item-remove';
                renameChatBtn.title = 'Rename this chat';
                renameChatBtn.innerHTML = CHAT_RENAME_ICON;
                renameChatBtn.addEventListener('click', async () => {
                    const { POPUP_TYPE, callGenericPopup } = await loadPopupModule();
                    const html = `<h3>Rename chat</h3><p>Enter a new name for <strong>${chatId}</strong>:</p>`;
                    const next = String((await callGenericPopup(html, POPUP_TYPE.INPUT, '', chatId)) || '').trim();
                    if (!next || next === chatId) return;

                    const ctx = getContext?.() ?? null;
                    try {
                        if (ctx?.renameChat) await ctx.renameChat(chatId, next);
                        else throw new Error('renameChat() is not available in context');
                        handleChatRenamePersist(chatId, next);
                        renderCategoryManagerPage();
                        onDataChanged?.();
                    } catch (err) {
                        const msg = err?.message || 'Unknown error';
                        await callGenericPopup(`<h3>Rename failed</h3><p>${msg}</p>`, POPUP_TYPE.ALERT);
                    }
                });

                chip.append(label, removeBtn, renameChatBtn);
                sub.appendChild(chip);
            }

            row.appendChild(sub);
            list.appendChild(row);
        }

        categoriesPageEl.append(addWrap, list);
        setupCategorySortable(list);
        setupChipSortables(list);
        input.focus();
    }

    function persistCategoryOrderFromDom(listEl) {
        const order = Array.from(listEl.querySelectorAll('.chat-manager-manager-row'))
            .map((node) => node.dataset.catName)
            .filter(Boolean);
        if (!order.length) return;

        const current = loadCats();
        if (arraysEqual(order, current.order || [])) return;

        const nextItems = {};
        for (const [cat, arr] of Object.entries(current.items || {})) {
            nextItems[cat] = Array.isArray(arr) ? [...arr] : [];
        }

        const nextCats = {
            order,
            collapsed: { ...current.collapsed },
            items: nextItems,
        };

        saveCats(nextCats);
        onDataChanged?.();
        renderCategoryManagerPage();
    }

    function setupCategorySortable(listEl) {
        const jq = getSortableLib();
        if (!jq) return;

        const $list = jq(listEl);
        const instance = $list.sortable('instance');
        if (instance) $list.sortable('destroy');

        $list.sortable({
            items: '.chat-manager-manager-row',
            handle: '.chat-manager-manager-left',
            axis: 'y',
            delay: getSortableDelay(),
            tolerance: 'pointer',
            placeholder: 'chat-manager-drop-line',
            helper: 'clone',
            start: (_event, ui) => {
                listEl.classList.add('chat-manager-drag-active');
                ui.item.addClass('chat-manager-is-dragging');
            },
            stop: (_event, ui) => {
                ui.item.removeClass('chat-manager-is-dragging');
                listEl.classList.remove('chat-manager-drag-active');
                persistCategoryOrderFromDom(listEl);
            },
        });
    }

    function persistChipAssignmentsFromDom() {
        const prevCats = loadCats();
        const prevMap = loadMap();

        const nextItems = {};
        for (const [cat, arr] of Object.entries(prevCats.items || {})) {
            nextItems[cat] = Array.isArray(arr) ? [...arr] : [];
        }

        const zones = categoriesPageEl.querySelectorAll('.chat-manager-chip-zone');
        const nextMap = {};
        let didChange = false;

        for (const zone of zones) {
            const catName = zone.dataset.catName;
            if (!catName) continue;
            const ids = Array.from(zone.querySelectorAll('.chat-manager-chip-row'))
                .map((row) => row.dataset.chatId)
                .filter(Boolean);

            if (!arraysEqual(ids, nextItems[catName] || [])) {
                didChange = true;
            }
            nextItems[catName] = ids;

            for (const id of ids) {
                if (!nextMap[id]) nextMap[id] = [];
                nextMap[id].push(catName);
            }
        }

        if (!didChange && !mapsEqual(prevMap, nextMap)) {
            didChange = true;
        }

        if (!didChange) return;

        const nextCats = {
            order: [...prevCats.order],
            collapsed: { ...prevCats.collapsed },
            items: nextItems,
        };

        saveCats(nextCats);
        saveMap(nextMap);
        onDataChanged?.();
        renderCategoryManagerPage();
    }

    function setupChipSortables(rootEl) {
        const jq = getSortableLib();
        if (!jq) return;

        const $root = jq(rootEl);
        const $zones = $root.find('.chat-manager-chip-zone');

        $zones.each((_, zone) => {
            const $zone = jq(zone);
            const instance = $zone.sortable('instance');
            if (instance) $zone.sortable('destroy');
        });

        $zones.sortable({
            connectWith: '.chat-manager-chip-zone',
            items: '.chat-manager-chip-row',
            handle: '.chat-manager-chip',
            delay: getSortableDelay(),
            tolerance: 'pointer',
            placeholder: 'chat-manager-chip-slot',
            helper: 'clone',
            cancel: '.chat-manager-cat-item-remove, .chat-manager-cat-item-rename',
            start: (_event, ui) => {
                const $zone = ui.item.closest('.chat-manager-chip-zone');
                jq(categoriesPageEl).find('.chat-manager-chip-zone').removeClass('chat-manager-chip-drag-active');
                if ($zone) $zone.addClass('chat-manager-chip-drag-active');
                ui.item.addClass('chat-manager-chip-dragging');
            },
            stop: (_event, ui) => {
                jq(categoriesPageEl).find('.chat-manager-chip-zone').removeClass('chat-manager-chip-drag-active');
                ui.item.removeClass('chat-manager-chip-dragging');
                const $targetZone = ui.item.closest('.chat-manager-chip-zone');
                const targetCat = $targetZone?.data('catName');
                if (targetCat) ui.item.attr('data-cat-name', targetCat);
                persistChipAssignmentsFromDom();
            },
        });
    }

    function getCategoriesPageEl() {
        return categoriesPageEl;
    }

    return {
        getCategoriesPageEl,
        renderCategoryManagerPage,
    };
}
