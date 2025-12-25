import { getLucideIconMarkup } from '@/astra/shared/icons/lucide';

const LIST_ICON = getLucideIconMarkup('text-align-justify');

/**
 * Builds the static DOM tree for the "Current" chat panel and returns the
 * relevant element references used by the panel controller.
 */
export function buildCurrentPanelDom() {
    const root = document.createElement('div');
    root.className = 'chat-manager-page';
    root.dataset.page = 'current';

    // --- Top bar: controls and search ---
    const topbar = document.createElement('div');
    topbar.className = 'chat-manager-topbar';

    const sortControl = document.createElement('div');
    sortControl.className = 'chat-manager-sort-control';

    const sortIcon = document.createElement('div');
    sortIcon.className = 'chat-manager-sort-icon';
    sortIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>`;

    const sortSelect = document.createElement('select');
    sortSelect.className = 'chat-manager-sort-select';
    sortSelect.innerHTML = `
        <option value="time-desc">Recent Chats</option>
        <option value="time-asc">Earliest Chats</option>
        <option value="messages-desc">Most Messages</option>
        <option value="messages-asc">Fewest Messages</option>
        <option value="name-asc">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
    `;

    sortControl.append(sortIcon, sortSelect);

    const searchWrap = document.createElement('div');
    searchWrap.className = 'chat-manager-search';
    const searchIcon = document.createElement('div');
    searchIcon.className = 'chat-manager-search-icon';
    searchIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>`;
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.autocomplete = 'off';
    searchInput.placeholder = 'Search chats...';
    searchWrap.append(searchIcon, searchInput);

    topbar.append(searchWrap);

    // --- Categories and title ---
    const categoriesWrap = document.createElement('div');
    categoriesWrap.className = 'chat-manager-categories';

    const listTitle = document.createElement('div');
    listTitle.className = 'chat-manager-list-title chat-manager-cat-title';
    listTitle.textContent = 'Chat List';

    const listIcon = document.createElement('div');
    listIcon.className = 'chat-manager-list-icon';
    listIcon.innerHTML = LIST_ICON;

    const titleLeft = document.createElement('div');
    titleLeft.className = 'chat-manager-list-title-group';
    titleLeft.append(listIcon, listTitle);

    const titleBar = document.createElement('div');
    titleBar.className = 'chat-manager-titlebar';
    titleBar.append(titleLeft, sortControl);

    const titleActionsHost = document.createElement('div');
    titleActionsHost.className = 'chat-manager-title-actions';

    // --- Chat list + actions ---
    const chatList = document.createElement('div');
    chatList.className = 'chat-manager-list';

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'chat-manager-actions';

    const showAllButton = document.createElement('button');
    showAllButton.type = 'button';
    showAllButton.className = 'chat-manager-show-all';

    const showMoreButton = document.createElement('button');
    showMoreButton.type = 'button';
    showMoreButton.className = 'chat-manager-show-more';
    showMoreButton.textContent = 'More chats';

    actionsWrap.append(showAllButton, showMoreButton);

    root.append(topbar, categoriesWrap, titleBar, titleActionsHost, chatList, actionsWrap);

    const autoPagerSentinel = document.createElement('div');
    autoPagerSentinel.className = 'chat-manager-auto-loader';
    autoPagerSentinel.setAttribute('aria-hidden', 'true');
    autoPagerSentinel.textContent = 'Loading more chats...';

    return {
        root,
        topbar,
        searchInput,
        sortSelect,
        categoriesWrap,
        chatList,
        showAllButton,
        showMoreButton,
        actionsWrap,
        autoPagerSentinel,
        titlebarButtonsHost: titleActionsHost,
    };
}
