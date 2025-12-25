/**
 * Renders the category cards that appear in the chat sidebar.
 */
export function createCategoryCards({ loadCats, loadMap, saveCats, openChatById }) {
    function render({ containerEl, allChatsIndex, isSearchMode }) {
        containerEl.style.display = isSearchMode ? 'none' : 'block';
        if (isSearchMode) {
            containerEl.innerHTML = '';
            return;
        }

        const cats = loadCats();
        const map = loadMap();
        containerEl.innerHTML = '';
        if (!cats.order.length) return;

        for (const catName of cats.order) {
            const card = document.createElement('div');
            card.className = 'chat-manager-cat-card';
            card.dataset.cat = catName;

            const header = document.createElement('div');
            header.className = 'chat-manager-cat-header';
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');

            const title = document.createElement('div');
            title.className = 'chat-manager-cat-title';
            title.textContent = catName;

            const chevron = document.createElement('span');
            chevron.className = 'chat-manager-cat-chevron';
            chevron.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`;
            header.append(title, chevron);

            const list = document.createElement('div');
            list.className = 'chat-manager-cat-list';
            list.dataset.cat = catName;

            const ordered = (cats.items[catName] || []).filter((id) => !!allChatsIndex[id]);
            const extras = [];
            for (const [cid, arr] of Object.entries(map)) {
                if ((arr || []).includes(catName) && allChatsIndex[cid] && !ordered.includes(cid)) extras.push(cid);
            }
            extras.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
            const finalIds = ordered.concat(extras);

            for (const chatId of finalIds) {
                const row = document.createElement('div');
                row.className = 'chat-manager-cat-item';
                row.dataset.chatId = chatId;

                const name = document.createElement('button');
                name.type = 'button';
                name.className = 'chat-manager-cat-item-name';
                name.textContent = chatId;
                name.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    try { await openChatById(chatId); } catch {}
                });

                row.append(name);
                list.appendChild(row);
            }

            const updateCollapse = () => {
                const collapsed = !!loadCats().collapsed[catName];
                card.classList.toggle('collapsed', collapsed);
                header.setAttribute('aria-expanded', String(!collapsed));
                list.style.display = collapsed ? 'none' : 'block';
            };
            header.addEventListener('click', () => {
                const nc = loadCats();
                nc.collapsed[catName] = !nc.collapsed[catName];
                saveCats(nc);
                updateCollapse();
            });
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    header.click();
                }
            });

            card.append(header, list);
            containerEl.appendChild(card);
            updateCollapse();
        }
    }

    return { render };
}
