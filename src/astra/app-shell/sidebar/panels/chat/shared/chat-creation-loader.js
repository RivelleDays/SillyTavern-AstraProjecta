const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

function resolveHeaders(factory) {
    let headers = {};
    if (typeof factory === 'function') {
        try {
            const candidate = factory();
            if (candidate && typeof candidate === 'object') {
                headers = { ...candidate };
            }
        } catch {
            /* ignore header factory errors */
        }
    }

    if (!headers['Content-Type']) {
        headers['Content-Type'] = DEFAULT_HEADERS['Content-Type'];
    }
    if (!headers.Accept) {
        headers.Accept = DEFAULT_HEADERS.Accept;
    }

    return headers;
}

function normalizeChatId(input) {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    return trimmed.replace(/\.jsonl$/i, '');
}

function makeCacheKey(scope, chatId) {
    if (!scope || !chatId) return null;
    const scopeType = scope.type || 'none';
    const scopeId = scope.id || 'na';
    return `${scopeType}:${String(scopeId).toLowerCase()}:${chatId.toLowerCase()}`;
}

function resolveScope(ctx) {
    if (!ctx || typeof ctx !== 'object') {
        return { type: 'none', id: null };
    }

    if (ctx.groupId !== undefined && ctx.groupId !== null) {
        return {
            type: 'group',
            id: String(ctx.groupId),
        };
    }

    if (ctx.characterId !== undefined && ctx.characterId !== null) {
        const characters = Array.isArray(ctx.characters) ? ctx.characters : [];
        const index = Number(ctx.characterId);
        const character = Number.isInteger(index) ? characters[index] : null;
        const avatar =
            character?.avatar ??
            ctx.activeCharacter?.avatar ??
            (typeof window !== 'undefined' && Array.isArray(window.characters)
                ? window.characters[index]?.avatar
                : null);
        const name =
            character?.name ??
            ctx.activeCharacter?.name ??
            (typeof window !== 'undefined' && Array.isArray(window.characters)
                ? window.characters[index]?.name
                : null);

        return {
            type: 'character',
            id: String(ctx.characterId),
            avatar,
            name,
        };
    }

    return { type: 'none', id: null };
}

function parseHumanizedDate(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    const match = trimmed.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})\s*@?\s*(\d{1,2})h\s*(\d{1,2})m\s*(\d{1,2})s(?:\s*(\d{1,3}))?(?:\s*ms)?$/i,
    );
    if (!match) return null;

    const [
        ,
        yearStr,
        monthStr,
        dayStr,
        hourStr,
        minuteStr,
        secondStr,
        millisecondStr,
    ] = match;

    const year = Number.parseInt(yearStr, 10);
    const month = Number.parseInt(monthStr, 10);
    const day = Number.parseInt(dayStr, 10);
    const hour = Number.parseInt(hourStr, 10);
    const minute = Number.parseInt(minuteStr, 10);
    const second = Number.parseInt(secondStr, 10);
    const ms = millisecondStr ? Number.parseInt(millisecondStr, 10) : 0;

    if (
        [year, month, day, hour, minute, second, ms].some(
            (part) => !Number.isFinite(part) || Number.isNaN(part),
        )
    ) {
        return null;
    }

    const date = new Date(year, month - 1, day, hour, minute, second, ms);
    if (Number.isNaN(date.getTime())) return null;
    return date.getTime();
}

function parseDateLike(value) {
    if (value === null || value === undefined) return null;

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return null;
        return value > 1e12 ? value : value * 1000;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (/^-?\d+$/.test(trimmed)) {
            const numeric = Number.parseInt(trimmed, 10);
            if (!Number.isFinite(numeric)) return null;
            return Math.abs(numeric) > 1e12 ? numeric : numeric * 1000;
        }
        const humanized = parseHumanizedDate(trimmed);
        if (Number.isFinite(humanized)) return humanized;
        const parsed = Date.parse(trimmed);
        if (!Number.isNaN(parsed)) return parsed;
    }

    return null;
}

function extractTimestampFromMessage(message) {
    if (!message || typeof message !== 'object') return null;
    const candidates = [
        message.send_date,
        message.create_date,
        message.createDate,
        message.timestamp,
        message.created_at,
        message.createdAt,
        message.extra?.send_date,
        message.extra?.timestamp,
        message.extra?.gen_started,
    ];

    for (const candidate of candidates) {
        const ts = parseDateLike(candidate);
        if (Number.isFinite(ts)) {
            return ts;
        }
    }

    return null;
}

async function fetchCharacterCreation(chatId, scope, headers) {
    if (!chatId || !scope?.avatar) return null;
    const body = {
        file_name: chatId,
        avatar_url: scope.avatar,
    };

    if (scope.name) {
        body.ch_name = scope.name;
    }

    try {
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
        if (!Array.isArray(payload) || payload.length === 0) {
            return null;
        }

        const metadata = payload[0] && typeof payload[0] === 'object' ? payload[0] : null;
        const firstMessage = payload.length > 1 ? payload[1] : null;

        let raw = null;
        let timestamp = null;

        if (metadata) {
            raw =
                typeof metadata.create_date === 'string'
                    ? metadata.create_date.trim()
                    : null;
            timestamp =
                parseDateLike(metadata.create_date) ??
                parseDateLike(metadata.date_added) ??
                null;
        }

        if (!Number.isFinite(timestamp)) {
            timestamp = extractTimestampFromMessage(firstMessage);
        }

        if (!raw && Number.isFinite(timestamp)) {
            raw = new Date(timestamp).toISOString();
        }

        return {
            timestamp: Number.isFinite(timestamp) ? timestamp : null,
            raw: raw || null,
            source: 'character',
        };
    } catch {
        return null;
    }
}

async function fetchGroupCreation(chatId, headers) {
    if (!chatId) return null;

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
        if (!Array.isArray(payload) || payload.length === 0) {
            return null;
        }

        const firstMessage = payload[0];
        const timestamp = extractTimestampFromMessage(firstMessage);

        let raw = null;
        if (firstMessage && typeof firstMessage === 'object') {
            if (typeof firstMessage.send_date === 'string') {
                raw = firstMessage.send_date.trim();
            } else if (firstMessage.create_date) {
                raw = String(firstMessage.create_date).trim();
            }
        }

        if (!raw && Number.isFinite(timestamp)) {
            raw = new Date(timestamp).toISOString();
        }

        return {
            timestamp: Number.isFinite(timestamp) ? timestamp : null,
            raw: raw || null,
            source: 'group',
        };
    } catch {
        return null;
    }
}

export function createChatCreationLoader({ requestHeadersFactory, toMoment } = {}) {
    const cache = new Map();

    function toMomentSafe(value) {
        if (!value && value !== 0) return null;
        if (typeof toMoment !== 'function') return null;
        try {
            const result = toMoment(value);
            return result && typeof result === 'object' ? result : null;
        } catch {
            return null;
        }
    }

    async function load(scope, chat, headers) {
        const chatId = normalizeChatId(chat?.file_name);
        if (!chatId) return null;
        const cacheKey = makeCacheKey(scope, chatId);
        if (!cacheKey) return null;

        if (!cache.has(cacheKey)) {
            cache.set(
                cacheKey,
                (async () => {
                    if (scope.type === 'group') {
                        return await fetchGroupCreation(chatId, headers);
                    }
                    if (scope.type === 'character') {
                        return await fetchCharacterCreation(chatId, scope, headers);
                    }
                    return null;
                })(),
            );
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

        const headers = resolveHeaders(requestHeadersFactory);
        const processed = new Set();

        const normalizedPriority = normalizeChatId(priorityChatId)?.toLowerCase() ?? null;

        const applyCreation = (chat, creation) => {
            if (!chat || !creation) return;

            const timestamp = Number.isFinite(creation.timestamp)
                ? creation.timestamp
                : parseDateLike(creation.raw);
            const momentValue = Number.isFinite(timestamp)
                ? toMomentSafe(timestamp)
                : toMomentSafe(creation.raw);

            chat.createdAt = Number.isFinite(timestamp) ? timestamp : null;
            chat.createdAtRaw = creation.raw ?? null;
            chat.createdAtMoment = momentValue ?? null;
        };

        const processChat = async (chat) => {
            if (!chat || processed.has(chat)) return;
            processed.add(chat);
            const creation = await load(scope, chat, headers);
            if (creation) {
                applyCreation(chat, creation);
            }
        };

        if (normalizedPriority) {
            const priorityChat = chats.find((chat) => {
                const chatId = normalizeChatId(chat?.file_name)?.toLowerCase() ?? '';
                return chatId === normalizedPriority;
            });
            if (priorityChat) {
                await processChat(priorityChat);
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
        const normalized = normalizeChatId(chatId)?.toLowerCase();
        if (!normalized) return;

        for (const key of Array.from(cache.keys())) {
            if (key.endsWith(`:${normalized}`)) {
                cache.delete(key);
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
