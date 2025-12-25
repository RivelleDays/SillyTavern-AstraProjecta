import { getLucideIconMarkup } from '@/astra/shared/icons/lucide';
import { createChatCategoryStore } from '../categories/category-store.js';
import { createChatNavigation } from '../shared/chat-navigation.js';
import { renderNotifications } from '../notifications/index.js';
import { createCurrent } from '../current/current-panel.js';

const NOTIFICATIONS_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-bell-ringing"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 5a2 2 0 0 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" /><path d="M21 6.727a11.05 11.05 0 0 0 -2.794 -3.727" /><path d="M3 6.727a11.05 11.05 0 0 1 2.792 -3.727" /></svg>
`.trim();
const CHAT_FALLBACK_ICON = getLucideIconMarkup('message-circle');
const CATEGORIES_ICON = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-bookmark"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z" /></svg>
`.trim();
const CURRENT_ICON = getLucideIconMarkup('messages-square');

export function renderChat(container, deps = {}) {
    if (!container) return { tabsApi: null };

    const getContext = typeof deps.getContext === 'function'
        ? deps.getContext
        : () => {
            if (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function') {
                return SillyTavern.getContext();
            }
            return {};
        };

    const { getChatFiles, openChatById } = createChatNavigation({
        getContext,
        getPastCharacterChats: deps.getPastCharacterChats,
        getGroupPastChats: deps.getGroupPastChats,
        getCurrentChatId: deps.getCurrentChatId,
        openGroupChat: deps.openGroupChat,
        openCharacterChat: deps.openCharacterChat,
    });

    const toMoment = typeof deps.toMoment === 'function' ? deps.toMoment : (value) => value;
    const makeHeadingNodeFn = typeof deps.makeHeadingNode === 'function' ? deps.makeHeadingNode : null;
    const eventSource = deps.eventSource ?? null;
    const eventTypes = deps.event_types ?? {};
    const headerEl = deps.sidebarHeader ?? null;
    const headerTitleSlot = deps.sidebarHeaderTitleSlot ?? headerEl;
    const headerActions = deps.sidebarHeaderActions ?? null;
    const headerTitleFallback = deps.sidebarTitle ?? null;
    const openGroupById = typeof deps.openGroupById === 'function' ? deps.openGroupById : null;

    const CHAT_CATEGORY_STORAGE_KEY = 'chatManager.chatCategories'; // DO NOT RENAME!!! EXISTING SAVES RELY ON THIS KEY.
    const ST_CTX = (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function')
        ? SillyTavern.getContext()
        : { extensionSettings: {}, saveSettingsDebounced: () => {}, eventSource: null };

    function computeScopeKey() {
        const c = getContext?.() ?? {};
        if (c.groupId) return `group:${String(c.groupId)}`;
        if (typeof c.characterId !== 'undefined' && c.characterId !== null) {
            return `char:${String(c.characterId)}`;
        }
        return '__global__';
    }

    const {
        loadCats,
        saveCats,
        loadMap,
        saveMap,
        ensureCategory,
        deleteCategory,
        renameCategory,
        setChatInCategory,
        removeChatFromCategory,
        handleChatRenamePersist,
    } = createChatCategoryStore(ST_CTX, CHAT_CATEGORY_STORAGE_KEY, computeScopeKey);
    void loadCats;
    void saveCats;
    void loadMap;
    void saveMap;
    void ensureCategory;
    void deleteCategory;
    void renameCategory;
    void setChatInCategory;
    void removeChatFromCategory;
    void handleChatRenamePersist;

    let refreshCategoriesAfterChange = () => {};

    setTimeout(() => {
        try {
            window.addEventListener('chat-manager-cats-changed', () => {
                try { refreshCategoriesAfterChange(); } catch {}
            });
        } catch {}
    }, 0);

    const root = document.createElement('div');
    root.className = 'chat-manager chat-panel';

    const main = document.createElement('section');
    main.className = 'chat-manager-main';

    const pageNOTIFICATIONS = document.createElement('div');
    pageNOTIFICATIONS.className = 'chat-manager-page';
    pageNOTIFICATIONS.dataset.page = 'notifications';
    renderNotifications(pageNOTIFICATIONS);

    const __ST_CTX__ = (typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function')
        ? SillyTavern.getContext()
        : { extensionSettings: {}, saveSettingsDebounced: () => {} };

    const currentPanel = createCurrent({
        getContext,
        getChatFiles,
        openChatById,
        openGroupById,
        getCurrentChatId: deps.getCurrentChatId,
        toMoment,
        stContext: __ST_CTX__,
        eventSource,
    });

    refreshCategoriesAfterChange = () => {
        try { currentPanel?.updateForContextChange?.(); } catch {}
    };

    const pageCATEGORIES = currentPanel.getCategoriesPageEl();

    main.append(currentPanel.el, pageNOTIFICATIONS, pageCATEGORIES);

    const rootFragment = document.createDocumentFragment();
    root.append(main);
    rootFragment.appendChild(root);
    container.appendChild(rootFragment);

    const headerNode = headerEl || null;

    let activeChatTab = 'current';

    function buildHeadingNode(label, iconSvg) {
        if (makeHeadingNodeFn) {
            return makeHeadingNodeFn({ icon: iconSvg, label });
        }
        const defaultTitle = headerTitleFallback || document.createElement('h2');
        defaultTitle.textContent = label;
        return defaultTitle;
    }

    function isChatPanelActive() {
        return !!headerNode && headerNode.dataset.activeTab === 'chat';
    }

    function setChatHeader(tabId) {
        if (!headerNode || !isChatPanelActive()) return;

        if (tabId === 'notifications') {
            const label = 'Notifications';
            const icon = NOTIFICATIONS_ICON;

            const headingNode = buildHeadingNode(label, icon);
            headerNode.dataset.page = tabId;
            if (headerTitleSlot) headerTitleSlot.replaceChildren(headingNode);
            renderChatHeaderActions(tabId);
            return;
        }

        if (tabId === 'categories') {
            const label = 'Category Manager';
            const icon = CATEGORIES_ICON || CHAT_FALLBACK_ICON;

            const headingNode = buildHeadingNode(label, icon);

            headerNode.dataset.page = tabId;
            if (headerTitleSlot) headerTitleSlot.replaceChildren(headingNode);
            renderChatHeaderActions(tabId);
            return;
        }

        const headingNode = buildHeadingNode(currentPanel.getTitle(), CURRENT_ICON || CHAT_FALLBACK_ICON);
        headerNode.dataset.page = tabId;
        if (headerTitleSlot) headerTitleSlot.replaceChildren(headingNode);
        renderChatHeaderActions(tabId);
    }

    function renderChatHeaderActions(tabId) {
        if (!headerActions) return;
        headerActions.replaceChildren();
        if (!isChatPanelActive()) return;

        const activeId = tabId === 'categories' || tabId === 'notifications'
            ? tabId
            : 'current';

        const headerButtons = [
            {
                id: 'categories',
                title: 'Manage categories',
                icon: CATEGORIES_ICON || CHAT_FALLBACK_ICON,
                handler: () => {
                    tabsApi.switchTo('categories');
                    currentPanel?.openCategoriesManager?.();
                },
            },
            {
                id: 'notifications',
                title: 'Notifications',
                icon: NOTIFICATIONS_ICON,
                handler: () => tabsApi.switchTo('notifications'),
            },
            {
                id: 'current',
                title: 'Chats',
                icon: CURRENT_ICON || CHAT_FALLBACK_ICON,
                handler: () => tabsApi.switchTo('current'),
            },
        ];

        headerButtons
            .filter(btn => btn.id !== activeId)
            .forEach(btn => {
                const el = document.createElement('button');
                el.type = 'button';
                el.className = 'icon-button chat-header-action';
                el.title = btn.title;
                el.innerHTML = btn.icon;
                el.addEventListener('click', btn.handler);
                headerActions.append(el);
            });
    }

    if (headerNode && typeof MutationObserver !== 'undefined') {
        const mo = new MutationObserver(() => {
            if (isChatPanelActive()) setChatHeader(activeChatTab);
        });
        mo.observe(headerNode, { attributes: true, attributeFilter: ['data-active-tab'] });
    }

    function setActivePage(tabId) {
        [...main.querySelectorAll('.chat-manager-page')].forEach(p => {
            p.style.display = p.dataset.page === tabId ? 'block' : 'none';
        });
    }

    const tabsApi = {
        switchTo(tabId) {
            activeChatTab = tabId;
            setActivePage(tabId);
            setChatHeader(tabId);
        },
        updateCurrentHeading() {
            setChatHeader(activeChatTab);
        },
    };

    currentPanel.setOpenCategoriesHandler(() => tabsApi.switchTo('categories'));

    function handleContextChanged() {
        try {
            if (activeChatTab === 'current') setChatHeader('current');
            currentPanel.updateForContextChange();
        } catch {
            // no-op
        }
    }

    (function patchCreateOrEditCharacterOnce() {
        try {
            const g = typeof window !== 'undefined' ? window : globalThis;
            if (g.createOrEditCharacter && !g.createOrEditCharacter.chatManagerPatched) {
                const original = g.createOrEditCharacter;
                g.createOrEditCharacter = async function(...args) {
                    if (g.chatManagerQSLock === true) return;
                    return await original.apply(this, args);
                };
                g.createOrEditCharacter.chatManagerPatched = true;
            }
        } catch (err) {
            console?.debug?.('[chat-manager] Editor patch skipped:', err);
        }
    })();

    handleContextChanged();
    eventSource?.on?.(eventTypes?.CHAT_CHANGED, handleContextChanged);
    eventSource?.on?.(eventTypes?.GROUP_UPDATED, handleContextChanged);
    eventSource?.on?.(eventTypes?.CHARACTER_EDITED, handleContextChanged);

    tabsApi.switchTo('current');
    setChatHeader('current');

    return { tabsApi };
}
