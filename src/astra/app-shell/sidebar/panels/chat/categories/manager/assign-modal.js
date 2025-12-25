/**
 * Handles the "assign categories" modal that appears from chat context actions.
 */
export function createAssignModal({
    loadCats,
    loadMap,
    ensureCategory,
    deleteCategory,
    setChatInCategory,
    onDataChanged,
    mountInGenericPopup,
    loadPopupModule,
}) {
    async function openAssignModal(chatId) {
        const modal = document.createElement('div');
        modal.className = 'chat-manager-assign-categories-modal';

        const header = document.createElement('div');
        header.className = 'chat-manager-modal-header';
        header.innerHTML = `<span class="chat-manager-heading">Manage categories for</span><span class="chat-manager-chip">${chatId}</span>`;

        const list = document.createElement('div');
        list.className = 'chat-manager-modal-cat-chooser';

        const addWrap = document.createElement('div');
        addWrap.className = 'chat-manager-modal-add-cat';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'New category name';
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = 'Add';

        const renderList = () => {
            list.innerHTML = '';
            const cats = loadCats();
            const map = loadMap();
            const chosen = new Set(map[chatId] || []);

            for (const name of cats.order) {
                const row = document.createElement('label');
                row.className = 'chat-manager-modal-cat-chooser-row';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = chosen.has(name);
                cb.addEventListener('change', () => {
                    setChatInCategory(chatId, name, cb.checked);
                    onDataChanged?.();
                });

                const span = document.createElement('span');
                span.textContent = name;

                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'chat-manager-inline-remove';
                del.title = 'Delete category';
                del.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
                del.addEventListener('click', () => {
                    loadPopupModule().then(({ POPUP_TYPE, callGenericPopup }) => {
                        callGenericPopup(
                            `<h3>Confirm deletion</h3><p>Delete category "<strong>${name}</strong>"?</p>`,
                            POPUP_TYPE.CONFIRM,
                        ).then((ok) => {
                            if (!ok) return;
                            deleteCategory(name);
                            renderList();
                            onDataChanged?.();
                        });
                    });
                });

                row.append(cb, span, del);
                list.appendChild(row);
            }
        };

        addBtn.addEventListener('click', () => {
            const n = ensureCategory(input.value);
            if (!n) return;
            setChatInCategory(chatId, n, true);
            input.value = '';
            renderList();
            onDataChanged?.();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addBtn.click();
        });

        addWrap.append(input, addBtn);
        modal.append(header, addWrap, list);

        const ctrl = await mountInGenericPopup(modal);
        renderList();
        input.focus();
        return ctrl;
    }

    return { openAssignModal };
}
