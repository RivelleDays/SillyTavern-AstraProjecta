// Sort chat list by name, message count, or last message time.
// Expected item fields:
// - file_name: string
// - last_mes_moment: moment-like object with .diff(other)
// - last_mes: (optional) ISO string or epoch for fallback
// - chat_items: (optional) message count (number or numeric string)
export function sortChats(chats, order = 'time-desc') {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    const nameAsc = (a, b) => collator.compare(a.file_name, b.file_name);
    const nameDesc = (a, b) => collator.compare(b.file_name, a.file_name);

    const timeValue = (x) => {
        // Prefer moment-like; otherwise parse last_mes; fallback to 0
        if (x && x.last_mes_moment && typeof x.last_mes_moment.diff === 'function') return x.last_mes_moment;
        const raw = x?.last_mes;
        const n = typeof raw === 'number' ? raw : (raw ? Date.parse(raw) : 0);
        return { diff: (other) => n - (typeof other === 'object' && typeof other.diff === 'function'
        ? 0
        : (typeof other === 'number' ? other : (other ? Date.parse(other) : 0))) };
    };

    const timeAsc = (a, b) => timeValue(a).diff(timeValue(b));
    const timeDesc = (a, b) => timeValue(b).diff(timeValue(a));

    const messageValue = (x) => {
        const raw = x?.chat_items;
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
        if (typeof raw === 'string' && raw.trim()) {
            const cleaned = raw.replace(/[^\d.-]/g, '');
            const parsed = Number.parseInt(cleaned, 10);
            if (Number.isFinite(parsed)) return parsed;
        }
        return 0;
    };

    const messagesDesc = (a, b) => {
        const diff = messageValue(b) - messageValue(a);
        return diff !== 0 ? diff : timeDesc(a, b);
    };
    const messagesAsc = (a, b) => {
        const diff = messageValue(a) - messageValue(b);
        return diff !== 0 ? diff : timeDesc(a, b);
    };

    const sorted = [...(chats || [])];
    sorted.sort((a, b) => {
        switch (order) {
        case 'name-asc': return nameAsc(a, b) || timeDesc(a, b);
        case 'name-desc': return nameDesc(a, b) || timeDesc(a, b);
        case 'time-asc': return timeAsc(a, b) || nameAsc(a, b);
        case 'messages-desc': return messagesDesc(a, b);
        case 'messages-asc': return messagesAsc(a, b);
        case 'time-desc':
        default: return timeDesc(a, b) || nameAsc(a, b);
        }
    });
    return sorted;
}
