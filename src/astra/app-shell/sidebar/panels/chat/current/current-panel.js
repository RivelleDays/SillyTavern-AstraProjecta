import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';

import { createChatListController } from '../shared/chat-list-controller.js';
import { createChatCategoryStore } from '../categories/category-store.js';
import { createCategoriesModule } from '../categories/index.js';
import { buildCurrentPanelDom } from './current-panel-dom.js';
import { createChatListView } from './current-chat-list-view.js';
import { createContextUtils, createRequestHeadersFactory } from './context-utils.js';
import { createAutoPagerManager } from './auto-pager-manager.js';

const POPUP_MODULE_PATH = '/scripts/popup.js';
const CORE_SCRIPT_PATH = '/script.js';
const GROUP_CHATS_MODULE_PATH = '/scripts/group-chats.js';
const UTILS_MODULE_PATH = '/scripts/utils.js';

let popupModulePromise = null;
function loadPopupModule() {
    if (!popupModulePromise) {
        popupModulePromise = import(
            /* webpackIgnore: true */
            POPUP_MODULE_PATH
        );
    }
    return popupModulePromise;
}

let coreChatModulePromise = null;
function loadCoreChatModule() {
    if (!coreChatModulePromise) {
        coreChatModulePromise = import(
            /* webpackIgnore: true */
            CORE_SCRIPT_PATH
        );
    }
    return coreChatModulePromise;
}

let groupChatModulePromise = null;
function loadGroupChatModule() {
    if (!groupChatModulePromise) {
        groupChatModulePromise = import(
            /* webpackIgnore: true */
            GROUP_CHATS_MODULE_PATH
        );
    }
    return groupChatModulePromise;
}

let utilsModulePromise = null;
function loadUtilsModule() {
    if (!utilsModulePromise) {
        utilsModulePromise = import(
            /* webpackIgnore: true */
            UTILS_MODULE_PATH
        );
    }
    return utilsModulePromise;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const MESSAGE_CIRCLE_PLUS_ICON = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-message-circle-plus-icon lucide-message-circle-plus"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
        <path d="M8 12h8" />
        <path d="M12 8v8" />
    </svg>
);

const FILE_INPUT_ICON = (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-file-input-icon lucide-file-input"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M2 15h10" />
        <path d="m9 18 3-3-3-3" />
    </svg>
);

function TitlebarActions({ onNewChat, onImportChat }) {
    const [isNewChatBusy, setIsNewChatBusy] = React.useState(false);

    const handleNewChat = React.useCallback(async () => {
        if (typeof onNewChat !== 'function' || isNewChatBusy) return;
        setIsNewChatBusy(true);
        try {
            await onNewChat();
        } catch (error) {
            console?.error?.('[AstraProjecta] Failed to create a new chat from Chat Manager', error);
            window?.toastr?.error?.('Failed to start a new chat. Check the console for details.');
        } finally {
            setIsNewChatBusy(false);
        }
    }, [onNewChat, isNewChatBusy]);

    const handleImport = React.useCallback(() => {
        if (typeof onImportChat !== 'function') return;
        onImportChat();
    }, [onImportChat]);

    return (
        <div className="chat-manager-title-actions">
            <Button
                id="astra-chat-manager-new-chat"
                type="button"
                variant="default"
                className="chat-manager-title-button"
                size="sm"
                onClick={handleNewChat}
                disabled={isNewChatBusy}
            >
                {MESSAGE_CIRCLE_PLUS_ICON}
                <span>New Chat</span>
            </Button>
            <Button
                id="astra-chat-manager-import-chat"
                type="button"
                variant="outline"
                className="chat-manager-title-button"
                size="sm"
                onClick={handleImport}
                aria-label="Import chat"
                title="Import chat"
            >
                {FILE_INPUT_ICON}
            </Button>
        </div>
    );
}

/**
 * Factory for the "Current Chat" panel.
 * Encapsulates its own DOM, state, persistence, and interactions.
 */
export function createCurrent({
    getContext,
    getChatFiles,
    openChatById,
    getCurrentChatId,
    toMoment,
    stContext,
    eventSource,
    }) {
    // --- helpers ---
    const ST = stContext || { extensionSettings: {}, saveSettingsDebounced: () => {} };
    let refreshChatList = () => {};
    let autoPager = null;
    const requestHeadersFactory = createRequestHeadersFactory(ST);

    const {
        root: el,
        searchInput,
        sortSelect,
        categoriesWrap,
        chatList: chatListEl,
        showAllButton: showAllBtn,
        showMoreButton: showMoreBtn,
        actionsWrap,
        autoPagerSentinel,
        titlebarButtonsHost,
    } = buildCurrentPanelDom();

    const {
        resolveCurrentEntity,
        getEntityName,
        resolveChatScope,
        computeScopeKey,
    } = createContextUtils({ getContext });

    const showAllLabelDefault = 'All chats';
    const showAllLabelReset = 'Back to paged view';
    const showAllTitleDefault = 'Load all chats progressively';
    const showAllTitleReset = 'Return to the paged list';

    let titleButtonsRoot = null;

    async function handleNewChatFromManager() {
        const coreModule = await loadCoreChatModule();
        const { doNewChat } = coreModule || {};
        if (typeof doNewChat !== 'function') {
            throw new Error('doNewChat() is unavailable in SillyTavern core.');
        }

        await doNewChat({ deleteCurrentChat: false });

        const closeButton = document.getElementById('select_chat_cross');
        if (closeButton instanceof HTMLElement) {
            try {
                closeButton.click();
            } catch {
                try {
                    closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                } catch {}
            }
        }
    }

    function triggerChatImportDialog() {
        const input = document.getElementById('chat_import_file');
        if (input instanceof HTMLInputElement) {
            input.click();
            return;
        }
        const fallbackButton = document.getElementById('chat_import_button');
        if (fallbackButton instanceof HTMLElement) {
            fallbackButton.click();
            return;
        }
        console?.warn?.('[AstraProjecta] Chat import controls are not available in the DOM.');
    }

    if (titlebarButtonsHost) {
        try {
            titleButtonsRoot = createRoot(titlebarButtonsHost);
            titleButtonsRoot.render(
                <TitlebarActions
                    onNewChat={handleNewChatFromManager}
                    onImportChat={triggerChatImportDialog}
                />
            );
        } catch (error) {
            console?.error?.('[AstraProjecta] Failed to render Chat Manager actions', error);
        }
    }

    showAllBtn.textContent = showAllLabelDefault;
    showAllBtn.title = showAllTitleDefault;

    let needsRefreshAfterExpand = false;
    let sidebarExpansionObserver = null;

    // --- debounce ---
    function debounce(fn, delay = 250) {
        let t = null;
        function wrapped(...args) {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), delay);
        }
        wrapped.flush = (...args) => {
            clearTimeout(t);
            return fn(...args);
        };
        wrapped.cancel = () => { clearTimeout(t); };
        return wrapped;
    }

    // --- category persistence ---
    const CHAT_CATEGORY_STORAGE_KEY = 'chatManager.chatCategories'; // DO NOT RENAME!!! EXISTING SAVES RELY ON THIS KEY.
    const {
        loadCats, saveCats, loadMap, saveMap,
        ensureCategory, deleteCategory, renameCategory,
        setChatInCategory, removeChatFromCategory, handleChatRenamePersist
    } = createChatCategoryStore(ST, CHAT_CATEGORY_STORAGE_KEY, computeScopeKey);
    // categories module wiring
    const categories = createCategoriesModule({
        store: {
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
        },
        openChatById,
        onDataChanged: () => { try { updateChatListDisplay(); } catch {} },
        getContext,
    });
    // Re-render on cross-tab category changes
    try {
        window.addEventListener('chat-manager-cats-changed', () => {
        try { updateChatListDisplay(); } catch {}
        });
    } catch {}

    function removeChatFromAllCategories(chatId) {
        if (!chatId || typeof loadMap !== 'function' || typeof removeChatFromCategory !== 'function') return;
        try {
            const map = loadMap();
            const related = Array.isArray(map?.[chatId]) ? map[chatId] : [];
            const uniqueCats = Array.from(new Set(related));
            for (const catName of uniqueCats) {
                try { removeChatFromCategory(chatId, catName); } catch (err) {
                    console?.warn?.('[chat-manager] Failed to remove chat from category', catName, err);
                }
            }
        } catch (err) {
            console?.warn?.('[chat-manager] Could not load category map for deletion', err);
        }
    }

    async function promptRenameChat(chatId) {
        if (!chatId) return;
        const { ctx } = resolveChatScope();
        const { POPUP_TYPE, callGenericPopup } = await loadPopupModule();

        const safeId = escapeHtml(chatId);
        const html = `<h3>Rename chat</h3><p>Enter a new name for <strong>${safeId}</strong>:</p>`;
        const next = String((await callGenericPopup(html, POPUP_TYPE.INPUT, '', chatId)) || '').trim();
        if (!next || next === chatId) return;

        try {
            if (typeof ctx?.renameChat !== 'function') {
                throw new Error('renameChat() is not available in context');
            }
            await ctx.renameChat(chatId, next);
            handleChatRenamePersist(chatId, next);
            categories.renderCategoryManagerPage?.();
            controller.reset?.();
            refreshChatList(true);
            window?.toastr?.success?.('Chat renamed.');
        } catch (err) {
            console?.error?.('Failed to rename chat', err);
            await callGenericPopup(
                `<h3>Rename failed</h3><p>${escapeHtml(err?.message || 'Unknown error')}</p>`,
                POPUP_TYPE.ALERT,
            );
        }
    }

    async function promptDeleteChat(chatId) {
        if (!chatId) return;

        const { POPUP_TYPE, callGenericPopup } = await loadPopupModule();
        const safeId = escapeHtml(chatId);
        const confirmHtml = `<h3>Delete the Chat File?</h3>
            <p>This will permanently remove "<strong>${safeId}</strong>".</p>`;
        const ok = await callGenericPopup(confirmHtml, POPUP_TYPE.CONFIRM);
        if (!ok) return;

        const { isGroup, groupId, characterId } = resolveChatScope();

        try {
            if (isGroup) {
                const { deleteGroupChatByName } = await loadGroupChatModule();
                await deleteGroupChatByName(String(groupId), chatId);
            } else if (characterId !== null && characterId !== undefined) {
                const { deleteCharacterChatByName } = await loadCoreChatModule();
                await deleteCharacterChatByName(String(characterId), chatId);
            } else {
                throw new Error('No active chat entity selected.');
            }
            removeChatFromAllCategories(chatId);
            categories.renderCategoryManagerPage?.();
            controller.reset?.();
            refreshChatList(true);
            window?.toastr?.success?.('Chat deleted.');
        } catch (err) {
            console?.error?.('Failed to delete chat', err);
            window?.toastr?.error?.('Failed to delete chat. See console for details.');
            await callGenericPopup(
                `<h3>Delete failed</h3><p>${escapeHtml(err?.message || 'Unknown error')}</p>`,
                POPUP_TYPE.ALERT,
            );
        }
    }

    async function exportChatFile(chatId, format) {
        const targetId = String(chatId ?? '').trim();
        if (!targetId) return;

        const exportFormat = format === 'jsonl' ? 'jsonl' : 'txt';
        const { ctx, isGroup, characterId } = resolveChatScope();

        try {
            const [coreModule, utilsModule] = await Promise.all([
                loadCoreChatModule(),
                loadUtilsModule(),
            ]);

            const { saveChatConditional } = coreModule || {};
            const { download, delay } = utilsModule || {};

            if (typeof saveChatConditional === 'function') {
                await saveChatConditional();
            }

            const headers = typeof requestHeadersFactory === 'function'
                ? { ...requestHeadersFactory() }
                : {};

            if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
            if (!headers.Accept) headers.Accept = 'application/json';

            const payload = {
                is_group: !!isGroup,
                avatar_url: isGroup ? null : ctx?.characters?.[characterId]?.avatar ?? null,
                file: `${targetId}.jsonl`,
                exportfilename: `${targetId}.${exportFormat}`,
                format: exportFormat,
            };

            const response = await fetch('/api/chats/export', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });

            let data = {};
            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                const message = data?.message || 'Failed to export chat.';
                window?.toastr?.error?.(`Error: ${message}`);
                return;
            }

            if (typeof delay === 'function') {
                try { await delay(250); } catch {}
            }

            const mimeType = exportFormat === 'txt' ? 'text/plain' : 'application/octet-stream';
            const fileName = payload.exportfilename;
            const content = data?.result ?? '';

            if (typeof download === 'function') {
                download(content, fileName, mimeType);
            } else {
                try {
                    const blob = new Blob([content], { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = fileName;
                    anchor.click();
                    URL.revokeObjectURL(url);
                } catch (err) {
                    console?.error?.('[AstraProjecta] Fallback download failed', err);
                    window?.toastr?.error?.('Chat exported but download failed.');
                    return;
                }
            }

            window?.toastr?.success?.(data?.message || 'Chat exported.');
        } catch (err) {
            console?.error?.('[AstraProjecta] Failed to export chat', err);
            window?.toastr?.error?.('Failed to export chat. See console for details.');
        }
    }

    async function exportChatAsJsonl(chatId) {
        await exportChatFile(chatId, 'jsonl');
    }

    async function exportChatAsText(chatId) {
        await exportChatFile(chatId, 'txt');
    }

    const chatListView = createChatListView({
        getCurrentChatId,
        openChatById,
        promptRenameChat,
        promptDeleteChat,
        exportChatAsJsonl,
        exportChatAsText,
        categories,
    });

    // Programmatic navigation hooks for the Current tab
    let __openCategories = null;

    function setOpenCategoriesHandler(fn) {
        __openCategories = (typeof fn === 'function')
            ? (...args) => { categories.renderCategoryManagerPage(); return fn(...args); }
            : null;
    }

    function openCategoriesManager() {
        try { categories.renderCategoryManagerPage(); } catch {}
        try { __openCategories?.(); } catch {}
    }

    function getCategoriesPageEl() {
        return categories.getCategoriesPageEl();
    }

    // --- state / controller ---
    let currentSortOrder = 'time-desc';

    const controller = createChatListController({
        getChatFiles,
        getContext,
        toMoment,
        requestHeadersFactory,
        onPreviewLoaded: ({ chatId, preview }) => {
            try { chatListView.updatePreview?.(chatId, preview); } catch {}
        },
    });
    const EVENT_CHAT_CHANGED = 'chat_id_changed';
    const EVENT_GROUP_UPDATED = 'group_updated';
    const EVENT_CHAT_CREATED = 'chat_created';
    const EVENT_GROUP_CHAT_CREATED = 'group_chat_created';
    const eventSubscriptions = [];
    let metadataRefreshTimer = null;
    let restoreSaveMetadata = null;

    const performInvalidate = (chatId = null) => {
        const id = chatId ?? (typeof getCurrentChatId === 'function' ? getCurrentChatId() : null);
        if (id) {
            controller.invalidatePreview?.(id);
        } else {
            controller.clearPreviewCache?.();
        }
    };

    const scheduleBackgroundRefresh = ({ immediate = false, chatId = null, delay = 750 } = {}) => {
        performInvalidate(chatId);
        if (metadataRefreshTimer) {
            clearTimeout(metadataRefreshTimer);
            metadataRefreshTimer = null;
        }
        if (immediate) {
            refreshChatList(true);
            return;
        }
        metadataRefreshTimer = setTimeout(() => {
            performInvalidate(chatId);
            refreshChatList(true);
            metadataRefreshTimer = null;
        }, Math.max(0, delay));
    };

    const subscribeEvent = (eventName, handler) => {
        if (!eventName || typeof handler !== 'function') return;
        if (!eventSource?.on) return;
        try {
            eventSource.on(eventName, handler);
            eventSubscriptions.push({ eventName, handler });
        } catch {}
    };

    autoPager = createAutoPagerManager({
        chatListEl,
        autoPagerSentinel,
        controller,
    });

    try { categories.renderCategoryManagerPage(); } catch {}

    const updateChatListDisplay = debounce(async () => {
        const query = searchInput.value.trim();
        const currentChatId = typeof getCurrentChatId === 'function' ? getCurrentChatId() : null;

        try {
            const { isSearchMode, sortedItems, toRender, hasMore, isAutoPaging } = await controller.load({
                query,
                sort: currentSortOrder,
                currentChatId,
            });

            const index = {};
            for (const it of sortedItems) index[it.file_name] = it;
            categories.render({ containerEl: categoriesWrap, allChatsIndex: index, isSearchMode, sort: currentSortOrder });

            categoriesWrap.style.display = '';
            const showActions = !isSearchMode && (hasMore || isAutoPaging);
            actionsWrap.style.display = showActions ? 'flex' : 'none';
            showAllBtn.style.display = showActions ? 'flex' : 'none';
            showMoreBtn.style.display = (!isSearchMode && hasMore && !isAutoPaging) ? 'flex' : 'none';
            showAllBtn.textContent = isAutoPaging ? showAllLabelReset : showAllLabelDefault;
            showAllBtn.title = isAutoPaging ? showAllTitleReset : showAllTitleDefault;
            showAllBtn.classList.toggle('chat-manager-active', isAutoPaging);

            chatListView.render(chatListEl, toRender, { isSearchActive: isSearchMode || !!query });
            autoPager.ensure({
                enabled: isAutoPaging,
                hasMore,
                onRequestMore: () =>
                    (typeof updateChatListDisplay.flush === 'function'
                        ? updateChatListDisplay.flush()
                        : updateChatListDisplay()),
            });
        } catch (e) {
            autoPager.teardown();
            chatListEl.innerHTML = '<div class="chat-list-empty">Could not load chats. Try again.</div>';
            categoriesWrap.style.display = 'none';
            actionsWrap.style.display = 'none';
        } finally {
            autoPager.markSettled();
        }
    }, 200);

    refreshChatList = (immediate = false) => {
        const runner = immediate && typeof updateChatListDisplay.flush === 'function'
            ? updateChatListDisplay.flush()
            : updateChatListDisplay();
        if (runner && typeof runner.catch === 'function') {
            runner.catch(() => {});
        }
        return runner;
    };

    try {
        const ctx = resolveChatScope().ctx;
        const et = ctx?.eventTypes || ctx?.event_types || {};
        const refreshEvents = new Set([
            et.CHAT_DELETED,
            et.GROUP_CHAT_DELETED,
            et.CHAT_RENAMED,
            et.CHAT_FILE_RENAMED,
            et.CHAT_NAME_CHANGED,
        ].filter(Boolean));
        refreshEvents.forEach((type) => {
            subscribeEvent(type, () => scheduleBackgroundRefresh({ immediate: true }));
        });
    } catch {}

    subscribeEvent(EVENT_CHAT_CHANGED, (nextChatId) => {
        scheduleBackgroundRefresh({ immediate: true, chatId: nextChatId });
    });
    subscribeEvent(EVENT_GROUP_UPDATED, () => {
        scheduleBackgroundRefresh({ chatId: null, delay: 600 });
    });
    subscribeEvent(EVENT_CHAT_CREATED, () => {
        scheduleBackgroundRefresh({ immediate: true });
    });
    subscribeEvent(EVENT_GROUP_CHAT_CREATED, () => {
        scheduleBackgroundRefresh({ immediate: true });
    });

    if (ST && typeof ST.saveMetadataDebounced === 'function' && !ST.saveMetadataDebounced.chatManagerChatPreviewWrapped) {
        const originalSaveMetadataDebounced = ST.saveMetadataDebounced;
        const wrappedSaveMetadataDebounced = function (...args) {
            const result = originalSaveMetadataDebounced.apply(ST, args);
            scheduleBackgroundRefresh({ chatId: null, delay: 600 });
            return result;
        };
        wrappedSaveMetadataDebounced.chatManagerChatPreviewWrapped = true;
        ST.saveMetadataDebounced = wrappedSaveMetadataDebounced;
        restoreSaveMetadata = () => {
            try {
                if (ST.saveMetadataDebounced === wrappedSaveMetadataDebounced) {
                    ST.saveMetadataDebounced = originalSaveMetadataDebounced;
                }
            } catch {}
        };
    }

    if (typeof MutationObserver !== 'undefined' && document?.body) {
        let lastSidebarExpanded = document.body.classList.contains('sidebar-expanded');
        sidebarExpansionObserver = new MutationObserver(() => {
            const expanded = document.body.classList.contains('sidebar-expanded');
            if (expanded === lastSidebarExpanded) return;

            if (!expanded) {
                needsRefreshAfterExpand = true;
                controller.reset();
                autoPager.teardown();
                updateChatListDisplay.cancel?.();
            } else if (needsRefreshAfterExpand) {
                needsRefreshAfterExpand = false;
                const immediate = typeof updateChatListDisplay.flush === 'function'
                    ? updateChatListDisplay.flush()
                    : updateChatListDisplay();
                if (immediate && typeof immediate.catch === 'function') {
                    immediate.catch(() => {});
                }
            }

            lastSidebarExpanded = expanded;
        });
        try {
            sidebarExpansionObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        } catch {}
    }


    // --- wire controls ---
    sortSelect.addEventListener('change', () => {
        currentSortOrder = sortSelect.value;
        updateChatListDisplay();
    });

    // No Refresh click handler; controller resets occur via other interactions.
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query) {
            controller.stopAutoPaging?.();
            autoPager.teardown();
        } else {
            controller.reset();
        }
        updateChatListDisplay();
    });
    showAllBtn.addEventListener('click', () => {
        const autoPagingActive = typeof controller.isAutoPagingEnabled === 'function'
            ? controller.isAutoPagingEnabled()
            : false;

        if (autoPagingActive) {
            controller.reset();
            autoPager.teardown();
        } else {
            controller.showAll();
        }

        const immediate = typeof updateChatListDisplay.flush === 'function'
            ? updateChatListDisplay.flush()
            : updateChatListDisplay();
        if (immediate && typeof immediate.catch === 'function') {
            immediate.catch(() => {});
        }
    });
    showMoreBtn.addEventListener('click', () => {
        controller.stopAutoPaging?.();
        controller.showMore();
        updateChatListDisplay();
    });
    // --- public API ---
    function updateForContextChange() {
        needsRefreshAfterExpand = false;
        controller.reset();
        autoPager.teardown();
        try { categories.renderCategoryManagerPage(); } catch {}
        updateChatListDisplay();
    }
    function reset() {
        needsRefreshAfterExpand = false;
        controller.reset();
        autoPager.teardown();
        updateChatListDisplay();
    }
    function getTitle() {
        const { entity } = resolveCurrentEntity();
        return getEntityName(entity);
    }
    function destroy() {
        if (metadataRefreshTimer) {
            clearTimeout(metadataRefreshTimer);
            metadataRefreshTimer = null;
        }
        if (eventSubscriptions.length && eventSource?.removeListener) {
            for (const { eventName, handler } of eventSubscriptions.splice(0)) {
                try { eventSource.removeListener(eventName, handler); } catch {}
            }
        }
        if (restoreSaveMetadata) {
            try { restoreSaveMetadata(); } catch {}
            restoreSaveMetadata = null;
        }
        try { sortSelect.replaceWith(sortSelect.cloneNode(true)); } catch {}
        try { searchInput.replaceWith(searchInput.cloneNode(true)); } catch {}
        try { showAllBtn.replaceWith(showAllBtn.cloneNode(true)); } catch {}
        try { showMoreBtn.replaceWith(showMoreBtn.cloneNode(true)); } catch {}
        try { sidebarExpansionObserver?.disconnect(); } catch {}
        try { titleButtonsRoot?.unmount(); } catch {}
        titleButtonsRoot = null;
        autoPager.teardown();
        try { el.remove(); } catch {}
    }

    // Initial population
    updateChatListDisplay();

    return {
        el,
        updateForContextChange,
        reset,
        getTitle,
        destroy,
        getCategoriesPageEl,
        setOpenCategoriesHandler,
        openCategoriesManager,
    };
}
