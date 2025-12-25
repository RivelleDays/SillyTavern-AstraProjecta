const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'data:', 'blob:']);

function extractUrl(candidate) {
    if (typeof candidate !== 'string' || !candidate.trim()) return null;
    const trimmed = candidate.trim();
    const urlMatch = trimmed.match(/url\((['"]?)(.*?)\1\)/i);
    if (urlMatch) {
        return urlMatch[2];
    }
    return trimmed;
}

function resolveThumbnailGetter() {
    if (typeof window !== 'undefined') {
        if (typeof window.getThumbnailUrl === 'function') {
            return (file) => window.getThumbnailUrl('bg', file);
        }
        if (window.SillyTavern && typeof window.SillyTavern.getThumbnailUrl === 'function') {
            return (file) => window.SillyTavern.getThumbnailUrl('bg', file);
        }
    }
    return (file) => `/thumbnail?type=bg&file=${encodeURIComponent(file)}`;
}

function normalizeChatKey(input) {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    return trimmed.replace(/\.jsonl$/i, '');
}

function findGroupInContext(ctx, groupId) {
    if (!groupId || !ctx) return null;
    const stringId = String(groupId);
    const groupsList = Array.isArray(ctx.groups) ? ctx.groups : [];
    let group = groupsList.find((entry) => entry && String(entry.id) === stringId) || null;
    if (!group && ctx.activeGroup && String(ctx.activeGroup.id) === stringId) {
        group = ctx.activeGroup;
    }
    if (!group && ctx.group && String(ctx.group.id) === stringId) {
        group = ctx.group;
    }
    return group || null;
}

function extractGroupBackgroundFromContext(scope, chat) {
    const group = scope?.group;
    if (!group || typeof group !== 'object') return null;

    const chatId = normalizeChatKey(chat?.file_name);
    if (!chatId) return null;

    if (typeof group.past_metadata === 'object' && group.past_metadata !== null) {
        const keysToCheck = [
            chatId,
            `${chatId}.jsonl`,
            encodeURIComponent(chatId),
        ];

        for (const key of keysToCheck) {
            if (!Object.hasOwn(group.past_metadata, key)) continue;
            const entry = group.past_metadata[key];
            if (entry && typeof entry === 'object') {
                const preview = parseMetadataForPreview(entry);
                if (preview) {
                    return preview;
                }
            }
        }
    }

    const activeChatId = normalizeChatKey(group.chat_id);
    if (activeChatId && activeChatId === chatId && group.chat_metadata && typeof group.chat_metadata === 'object') {
        return parseMetadataForPreview(group.chat_metadata);
    }

    return null;
}

function normalizeLocalPath(pathValue) {
    if (!pathValue) return null;
    let localPath = pathValue.replace(/^\/+/, '');
    localPath = localPath.replace(/^backgrounds%2F/i, 'backgrounds/');
    if (!/^backgrounds\//i.test(localPath)) return null;
    const encoded = localPath.slice('backgrounds/'.length);
    try {
        return decodeURIComponent(encoded);
    } catch {
        return encoded;
    }
}

function sanitizeUrl(rawUrl) {
    if (!rawUrl) return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;

    if (/^javascript:/i.test(trimmed)) return null;
    if (/^data:/i.test(trimmed) && !/^data:image\//i.test(trimmed) && !/^data:video\//i.test(trimmed)) {
        return null;
    }

    if (/^(?:https?:|data:|blob:)/i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
        } catch {
            return null;
        }
        return trimmed;
    }

    if (trimmed.startsWith('//')) {
        const schemaUrl = `https:${trimmed}`;
        try {
            const parsed = new URL(schemaUrl);
            if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
            return schemaUrl;
        } catch {
            return null;
        }
    }

    if (trimmed.startsWith('backgrounds%2F') || trimmed.startsWith('backgrounds/')) {
        return trimmed;
    }

    if (trimmed.startsWith('/')) {
        return trimmed;
    }

    return null;
}

function buildCssUrl(url) {
    if (!url) return null;
    const safe = url.replace(/"/g, '\\"');
    return `url("${safe}")`;
}

function parseMetadataForPreview(metadata) {
    if (!metadata || typeof metadata !== 'object') return null;

    const candidates = [];
    if (typeof metadata.custom_background === 'string') {
        candidates.push({ value: metadata.custom_background, source: 'custom_background' });
    }

    if (Array.isArray(metadata.chat_backgrounds) && metadata.chat_backgrounds.length > 0) {
        for (let idx = metadata.chat_backgrounds.length - 1; idx >= 0; idx -= 1) {
            const item = metadata.chat_backgrounds[idx];
            if (typeof item === 'string') {
                candidates.push({ value: item, source: 'chat_backgrounds' });
            }
        }
    }

    const getThumbnailUrl = resolveThumbnailGetter();

    for (const candidate of candidates) {
        const extracted = extractUrl(candidate.value);
        const sanitized = sanitizeUrl(extracted);
        if (!sanitized) continue;

        const localFile = normalizeLocalPath(sanitized);
        if (localFile) {
            const previewUrl = getThumbnailUrl(localFile);
            const originalUrl = `backgrounds/${encodeURIComponent(localFile)}`;
            return {
                cssImage: buildCssUrl(previewUrl),
                previewUrl,
                originalUrl,
                source: candidate.source,
                metadata,
            };
        }

        return {
            cssImage: buildCssUrl(sanitized),
            previewUrl: sanitized,
            originalUrl: sanitized,
            source: candidate.source,
            metadata,
        };
    }

    return null;
}

function resolveHeaders(factory) {
    if (typeof factory === 'function') {
        try {
            const headers = factory();
            if (headers && typeof headers === 'object') {
                return headers;
            }
        } catch {
            /* no-op */
        }
    }
    return { ...DEFAULT_HEADERS };
}

function resolveScope(ctx) {
    if (!ctx || typeof ctx !== 'object') {
        return { type: 'none', id: null };
    }

    if (ctx.groupId !== undefined && ctx.groupId !== null) {
        const id = String(ctx.groupId);
        const group = findGroupInContext(ctx, id);
        return { type: 'group', id, group };
    }

    if (ctx.characterId !== undefined && ctx.characterId !== null) {
        const charId = String(ctx.characterId);
        const characters = Array.isArray(ctx.characters) ? ctx.characters : null;
        const numericId = Number(charId);
        const lookup = Number.isInteger(numericId) && characters ? characters[numericId] : null;
        const avatar = lookup?.avatar
            ?? ctx.activeCharacter?.avatar
            ?? (typeof window !== 'undefined' && Array.isArray(window.characters)
                ? window.characters[ctx.characterId]?.avatar
                : null);
        const name = lookup?.name ?? ctx.activeCharacter?.name ?? null;
        return { type: 'character', id: charId, avatar, name, characters };
    }

    return { type: 'none', id: null };
}

function makeCacheKey(scope, chatId) {
    if (!scope || !chatId) return null;
    return `${scope.type || 'none'}:${scope.id || 'na'}:${chatId}`.toLowerCase();
}

async function fetchCharacterMetadata(chatId, scope, headers) {
    if (!scope.avatar) return null;
    try {
        const body = {
            file_name: chatId,
            avatar_url: scope.avatar,
        };
        if (scope.name) {
            body.ch_name = scope.name;
        }

        const response = await fetch('/api/chats/get', {
            method: 'POST',
            headers,
            credentials: 'include',
            cache: 'no-cache',
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json();
        return parseMetadataForPreview(payload?.[0]?.chat_metadata);
    } catch {
        return null;
    }
}

async function fetchGroupMetadata(chatId, headers) {
    try {
        const response = await fetch('/api/chats/group/get', {
            method: 'POST',
            headers,
            credentials: 'include',
            cache: 'no-cache',
            body: JSON.stringify({ id: chatId }),
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json();
        return parseMetadataForPreview(payload?.[0]?.chat_metadata);
    } catch {
        return null;
    }
}

export function createChatBackgroundLoader({ requestHeadersFactory, onPreviewLoaded } = {}) {
    const cache = new Map();

    function emitPreview({ chat, preview, scope }) {
        const chatId = String(chat?.file_name ?? '').trim();
        if (!chatId) return;
        if (typeof onPreviewLoaded === 'function') {
            try {
                onPreviewLoaded({ chatId, preview, scopeType: scope?.type || null });
            } catch {
                /* no-op */
            }
        }

        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            try {
                window.dispatchEvent(new CustomEvent('chat-manager-chat-preview-updated', {
                    detail: {
                        chatId,
                        preview,
                        scopeType: scope?.type || null,
                        scopeId: scope?.id || null,
                    },
                }));
            } catch {
                /* ignore dispatch failures */
            }
        }
    }

    async function loadForChat(scope, chat) {
        const chatId = String(chat?.file_name ?? '').trim();
        if (!chatId) return null;
        const cacheKey = makeCacheKey(scope, chatId);
        if (!cacheKey) return null;

        if (!cache.has(cacheKey)) {
            if (scope.type === 'group') {
                const contextPreview = extractGroupBackgroundFromContext(scope, chat);
                if (contextPreview) {
                    cache.set(cacheKey, Promise.resolve(contextPreview));
                }
            }
        }

        if (!cache.has(cacheKey)) {
            cache.set(cacheKey, (async () => {
                const headers = resolveHeaders(requestHeadersFactory);
                if (scope.type === 'group') {
                    const fromContext = extractGroupBackgroundFromContext(scope, chat);
                    if (fromContext) {
                        return fromContext;
                    }
                    return await fetchGroupMetadata(chatId, headers);
                }
                if (scope.type === 'character') {
                    return await fetchCharacterMetadata(chatId, scope, headers);
                }
                return null;
            })());
        }

        try {
            return await cache.get(cacheKey);
        } catch {
            cache.delete(cacheKey);
            return null;
        }
    }

    async function hydrate(chats, ctx, { priorityChatId = null } = {}) {
        if (!Array.isArray(chats) || chats.length === 0) return;
        const scope = resolveScope(ctx);
        if (!scope || scope.type === 'none') return;

        const processed = new Set();
        const lowercasePriority = typeof priorityChatId === 'string'
            ? priorityChatId.trim().toLowerCase()
            : null;
        const normalizedPriority = normalizeChatKey(priorityChatId)?.toLowerCase() ?? lowercasePriority;

        const processChat = async (chat) => {
            if (!chat) return;
            const preview = await loadForChat(scope, chat);
            chat.previewBackground = preview || null;
            emitPreview({ chat, preview: chat.previewBackground, scope });
        };

        if (normalizedPriority) {
            const priorityChat = chats.find((chat) => {
                const chatId = String(chat?.file_name ?? '').trim();
                if (!chatId) return false;
                const normalized = normalizeChatKey(chatId);
                if (normalized && normalized.toLowerCase() === normalizedPriority) {
                    return true;
                }
                return chatId.toLowerCase() === normalizedPriority;
            });

            if (priorityChat) {
                await processChat(priorityChat);
                processed.add(priorityChat);
            }
        }

        const tasks = [];
        for (const chat of chats) {
            if (processed.has(chat)) continue;
            tasks.push(processChat(chat));
        }

        if (tasks.length > 0) {
            await Promise.allSettled(tasks);
        }
    }

    function invalidate(chatId) {
        if (!chatId) {
            cache.clear();
            return;
        }

        const raw = String(chatId).trim();
        if (!raw) return;

        const variants = new Set([raw.toLowerCase()]);
        const normalized = normalizeChatKey(raw);
        if (normalized && normalized.toLowerCase() !== raw.toLowerCase()) {
            variants.add(normalized.toLowerCase());
        }

        for (const key of Array.from(cache.keys())) {
            const lowerKey = key.toLowerCase();
            for (const variant of variants) {
                if (lowerKey.endsWith(`:${variant}`)) {
                    cache.delete(key);
                    break;
                }
            }
        }
    }

    function clear() {
        cache.clear();
    }

    return {
        hydrate,
        invalidate,
        clear,
    };
}
