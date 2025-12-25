// Controls loading, sorting, and paginating chat lists for the current entity.

import { sortChats } from './sort-chats.js';
import { searchChatsForCurrentEntity } from './search-chats.js';
import { createChatBackgroundLoader } from './chat-background-loader.js';
import { createChatCreationLoader } from './chat-creation-loader.js';

/**
 * Creates a controller for chat list retrieval, search, sorting, and pagination.
 * @param {Object} deps
 * @param {Function} deps.getChatFiles - Returns chat files for current entity.
 * @param {Function} deps.getContext - Returns app context for search.
 * @param {Function} [deps.toMoment] - Optional timestamp->moment converter.
 * @param {Function} [deps.onPreviewLoaded] - Notified when a preview finishes loading.
 */
export function createChatListController({ getChatFiles, getContext, toMoment, requestHeadersFactory, onPreviewLoaded }) {
    const PAGE_SIZE = 10;
    const SHOW_ALL_INITIAL_PAGES = 3;
    const AUTO_PAGE_STEP_PAGES = 2;
    let visibleCount = PAGE_SIZE;
    let autoPaging = false;

    // Resolve a moment-like converter without hard-coding a dependency.
    const globalTimestampToMoment =
        typeof globalThis !== 'undefined' && typeof globalThis.timestampToMoment === 'function'
            ? globalThis.timestampToMoment
            : undefined;

    const momentify =
        typeof toMoment === 'function'
            ? toMoment
            : (ts) =>
                (typeof globalTimestampToMoment === 'function'
                    ? globalTimestampToMoment(ts)
                    : { format: () => '', valueOf: () => (ts ?? 0) });

    const backgroundLoader = createChatBackgroundLoader({ requestHeadersFactory, onPreviewLoaded });
    const creationLoader = createChatCreationLoader({ requestHeadersFactory, toMoment: momentify });

    async function loadRaw(query) {
        const q = String(query || '').trim();
        const isSearchMode = q.length > 0;

        if (isSearchMode) {
            const raw = await searchChatsForCurrentEntity(q, { getContext });
            return {
                isSearchMode: true,
                items: raw.map(x => ({
                    file_name: String(x.file_name).replace('.jsonl', ''),
                    last_mes: x.last_mes,
                    last_mes_moment: momentify(x.last_mes),
                    mes: x.preview_message,
                    chat_items: x.message_count,
                    file_size: x.file_size,
                })),
            };
        }

        const raw = await getChatFiles();
        return {
            isSearchMode: false,
            items: raw.map(chat => {
                chat.last_mes_moment = momentify(chat.last_mes);
                chat.file_name = String(chat.file_name).replace('.jsonl', '');
                return chat;
            }),
        };
    }

    function paginate(sorted, isSearchMode) {
        if (isSearchMode) {
            return {
                toRender: sorted,
                hasMore: false,
                visibleCount: sorted.length,
                isAutoPaging: false,
            };
        }

        const limit = Math.min(sorted.length, Math.max(PAGE_SIZE, visibleCount));
        const toRender = sorted.slice(0, limit);
        const hasMore = sorted.length > limit;

        return {
            toRender,
            hasMore,
            visibleCount: limit,
            isAutoPaging: autoPaging && !isSearchMode,
        };
    }

    return {
        /** Resets the pagination to the first page. */
        reset() {
            autoPaging = false;
            visibleCount = PAGE_SIZE;
        },

        /** Advances pagination by one page. */
        showMore() {
            autoPaging = false;
            visibleCount += PAGE_SIZE;
            return visibleCount;
        },

        /** Shows all chats by lifting the pagination limit. */
        showAll() {
            autoPaging = true;
            const target = PAGE_SIZE * SHOW_ALL_INITIAL_PAGES;
            if (!Number.isFinite(visibleCount) || visibleCount < target) {
                visibleCount = target;
            }
            return visibleCount;
        },

        /** Returns current visible count. */
        getVisibleCount() { return Math.max(PAGE_SIZE, visibleCount); },
        stopAutoPaging() { autoPaging = false; },
        isAutoPagingEnabled() { return autoPaging; },
        autoLoadNextChunk(multiplier = AUTO_PAGE_STEP_PAGES) {
            if (!autoPaging) return visibleCount;
            const pages = Math.max(1, multiplier);
            visibleCount += PAGE_SIZE * pages;
            return visibleCount;
        },

        /**
         * Loads, sorts, and paginates chat items for the provided query and sort.
         * @param {Object} opts
         * @param {string} [opts.query=''] - Search query; empty means list mode.
         * @param {string} [opts.sort='time-desc'] - Sort key consumed by sortChats().
         */
        async load({ query = '', sort = 'time-desc', currentChatId = null } = {}) {
            const ctx = typeof getContext === 'function' ? (getContext() || {}) : {};
            const { isSearchMode, items } = await loadRaw(query);
            const sortedItems = sortChats(items, sort);
            const { toRender, hasMore, isAutoPaging } = paginate(sortedItems, isSearchMode);
            try {
                await backgroundLoader.hydrate(toRender, ctx, { priorityChatId: currentChatId });
            } catch {
                /* soft-fail */
            }
            try {
                await creationLoader.hydrate(toRender, ctx, { priorityChatId: currentChatId });
            } catch {
                /* soft-fail */
            }
            return { isSearchMode, sortedItems, toRender, hasMore, isAutoPaging };
        },
        clearPreviewCache() {
            backgroundLoader.clear();
            creationLoader.clear();
        },
        invalidatePreview(chatId) {
            backgroundLoader.invalidate(chatId);
            creationLoader.invalidate(chatId);
        },
    };
}
