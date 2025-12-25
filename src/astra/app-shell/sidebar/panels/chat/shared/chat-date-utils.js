const MOMENT_FORMAT = 'YYYY/MM/DD hh:mm A';
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

function startOfWeek(date) {
	if (!(date instanceof Date)) return null;
	const weekStart = new Date(date);
	weekStart.setHours(0, 0, 0, 0);
	const day = weekStart.getDay();
	const offset = (day + 6) % 7; // Shift week start to Monday.
	weekStart.setDate(weekStart.getDate() - offset);
	return weekStart;
}

function isSameWeek(candidate, reference) {
	if (!(candidate instanceof Date) || !(reference instanceof Date)) return false;
	const weekStart = startOfWeek(reference);
	if (!weekStart) return false;
	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekEnd.getDate() + 7);
	return candidate >= weekStart && candidate < weekEnd;
}

function formatWeekdayLabel(date) {
	if (!(date instanceof Date)) return '';
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	return days[date.getDay()] ?? '';
}

function isValidMoment(momentLike) {
	if (!momentLike) return false;
	if (typeof momentLike.isValid === 'function') {
		try {
			return momentLike.isValid();
		} catch {
			return false;
		}
	}
	return typeof momentLike.format === 'function';
}

export function formatAbsoluteDate(date) {
	if (!(date instanceof Date)) return '';
	if (Number.isNaN(date.getTime())) return '';
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const hours24 = date.getHours();
	const period = hours24 >= 12 ? 'PM' : 'AM';
	const hour12 = hours24 % 12 || 12;
	const hourStr = String(hour12).padStart(2, '0');
	return `${year}/${month}/${day} ${hourStr}:${minutes} ${period}`;
}

export function formatAbsoluteMoment(momentLike) {
	if (!momentLike?.format) return '';
	if (!isValidMoment(momentLike)) return '';

	try {
		const clone = typeof momentLike.clone === 'function' ? momentLike.clone() : momentLike;
		return clone.format(MOMENT_FORMAT);
	} catch {
		try {
			const date = typeof momentLike.toDate === 'function' ? momentLike.toDate() : null;
			return date ? formatAbsoluteDate(date) : '';
		} catch {
			return '';
		}
	}
}

function formatRelativeDiff(diffMs) {
	if (!Number.isFinite(diffMs) || diffMs < 0) return '';

	if (diffMs < MINUTE_MS) return 'just now';

	const pluralizeAgo = (value, unit) => {
		const whole = Math.max(1, Math.floor(value));
		const suffix = whole === 1 ? '' : 's';
		return `${whole} ${unit}${suffix} ago`;
	};

	if (diffMs < HOUR_MS) return pluralizeAgo(diffMs / MINUTE_MS, 'minute');
	if (diffMs < DAY_MS) return pluralizeAgo(diffMs / HOUR_MS, 'hour');
	if (diffMs < DAY_MS * 2) return 'yesterday';
	if (diffMs < WEEK_MS) return pluralizeAgo(diffMs / DAY_MS, 'day');
	if (diffMs < MONTH_MS) return pluralizeAgo(diffMs / WEEK_MS, 'week');
	if (diffMs < YEAR_MS) return pluralizeAgo(diffMs / MONTH_MS, 'month');
	return pluralizeAgo(diffMs / YEAR_MS, 'year');
}

export function formatRelativeTimestamp(timestamp, { nowMs = Date.now() } = {}) {
	if (!Number.isFinite(timestamp)) return '';
	const diffMs = Math.max(0, nowMs - timestamp);
	return formatRelativeDiff(diffMs);
}

export function formatRelativeMoment(momentLike, { nowMs = Date.now() } = {}) {
	if (!isValidMoment(momentLike)) return '';
	try {
		const timestamp = typeof momentLike.valueOf === 'function' ? momentLike.valueOf() : NaN;
		if (!Number.isFinite(timestamp)) return '';
		const diffMs = Math.max(0, nowMs - timestamp);
		return formatRelativeDiff(diffMs);
	} catch {
		return '';
	}
}

export function formatMomentDisplay(momentLike, { nowMs = Date.now() } = {}) {
	const absolute = formatAbsoluteMoment(momentLike);
	const relative = formatRelativeMoment(momentLike, { nowMs });
	return {
		absolute,
		relative: relative || absolute,
	};
}

function pickNumericValue(value) {
	if (typeof value === 'number') {
		return Number.isFinite(value) ? value : NaN;
	}
	if (typeof value === 'string') {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : NaN;
	}
	return NaN;
}

export function getChatMessageCount(chat) {
	if (!chat || typeof chat !== 'object') return 0;
	const candidates = [
		chat.chat_items,
		chat.message_count,
		chat.messageCount,
	];

	for (const candidate of candidates) {
		const numeric = pickNumericValue(candidate);
		if (Number.isFinite(numeric) && numeric >= 0) {
			return numeric;
		}
	}

	return 0;
}

export function hasChatMessages(chat) {
	const count = getChatMessageCount(chat);
	if (count > 0) return true;
	return Boolean(chat?.mes);
}

export function formatChatDateLabel(chat, { nowMs = Date.now(), emptyLabel = 'say something' } = {}) {
	const display = formatMomentDisplay(chat?.last_mes_moment, { nowMs });
	const hasMessages = hasChatMessages(chat);
	let text = hasMessages ? (display.relative || '') : emptyLabel;

	if (hasMessages) {
		const timestamp = typeof chat?.last_mes_moment?.valueOf === 'function'
			? chat.last_mes_moment.valueOf()
			: NaN;
		if (Number.isFinite(timestamp)) {
			const lastDate = new Date(timestamp);
			const nowDate = new Date(nowMs);
			if (!Number.isNaN(lastDate.getTime()) && isSameWeek(lastDate, nowDate)) {
				const diffMs = Math.max(0, nowMs - timestamp);
				if (diffMs >= DAY_MS) {
					const weekday = formatWeekdayLabel(lastDate);
					if (weekday) {
						text = weekday;
					}
				}
			}
		}
	}

	return {
		text,
		title: display.absolute || '',
		hasMessages,
		messageCount: getChatMessageCount(chat),
		display,
	};
}

export function formatCreationDisplay(chat, { timestampToMoment } = {}) {
	if (!chat) return null;

	const fromMoment = (momentLike) => {
		const absolute = formatAbsoluteMoment(momentLike);
		return absolute ? { label: absolute, title: absolute } : null;
	};

	const fromDateLike = (value) => {
		const absolute = formatAbsoluteDate(value);
		return absolute ? { label: absolute, title: absolute } : null;
	};

	if (chat.createdAtMoment?.format) {
		const formatted = fromMoment(chat.createdAtMoment);
		if (formatted) return formatted;
	}

	if (Number.isFinite(chat.createdAt)) {
		const momentCandidate = typeof timestampToMoment === 'function'
			? timestampToMoment(chat.createdAt)
			: null;
		if (isValidMoment(momentCandidate)) {
			const formatted = fromMoment(momentCandidate);
			if (formatted) return formatted;
		}

		const numericDate = new Date(chat.createdAt);
		const formatted = fromDateLike(numericDate);
		if (formatted) return formatted;
	}

	if (typeof chat.createdAtRaw === 'string') {
		const trimmed = chat.createdAtRaw.trim();
		if (trimmed) {
			const momentCandidate = typeof timestampToMoment === 'function'
				? timestampToMoment(trimmed)
				: null;
			if (isValidMoment(momentCandidate)) {
				const formatted = fromMoment(momentCandidate);
				if (formatted) return formatted;
			}

			const parsedDate = new Date(trimmed);
			const formatted = fromDateLike(parsedDate);
			if (formatted) return formatted;

			return { label: trimmed, title: trimmed };
		}
	}

	return null;
}
