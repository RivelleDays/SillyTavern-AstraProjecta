import { eventSource, event_types, getThumbnailUrl } from '../../../../../../../script.js';
import { power_user } from '../../../../../../power-user.js';
import { getUserAvatar, user_avatar } from '../../../../../../personas.js';

const supportsPersonaThumbnails = getThumbnailUrl('persona', 'test.png', true).includes('&t=');
const DISCONNECT_RETRY_LIMIT = 10;

function resolvePersonaAvatarUrl(id) {
	if (!id) return '/img/ai4.png';
	if (supportsPersonaThumbnails) return getThumbnailUrl('persona', id, true);

	const fallback = getUserAvatar(id);
	return fallback ? `${fallback}?t=${Date.now()}` : '/img/ai4.png';
}

function getPersonaMetadata(id) {
	const personaName = power_user?.personas?.[id] || id || '';
	const personaTitle = power_user?.persona_descriptions?.[id]?.title || '';
	const title = personaTitle ? `${personaName} - ${personaTitle}` : personaName;
	return {
		alt: personaName || 'Persona Avatar',
		title,
	};
}

function ensureImageAttributes(img, { alt, title }) {
	if (alt) img.alt = alt;
	else if (!img.alt) img.alt = 'Persona Avatar';

	if (title) img.title = title;
	else img.removeAttribute('title');
}

function setImageSource(img, url) {
	if (img.src !== url) img.src = url;
}

/**
 * Creates a watcher that keeps provided <img> elements in sync with the active user persona.
 * @returns {{ addTarget: (img: HTMLImageElement | null | undefined) => void, removeTarget: (img: HTMLImageElement | null | undefined) => void, refresh: () => void }}
 */
export function createPersonaAvatarWatcher() {
	const targets = new Set();
	const disconnectCounters = new WeakMap();

	const update = () => {
		if (!targets.size) return;

		const url = resolvePersonaAvatarUrl(user_avatar);
		const metadata = getPersonaMetadata(user_avatar);

		for (const img of Array.from(targets)) {
			if (!img || !img.isConnected) {
				if (!img) {
					targets.delete(img);
					continue;
				}

				const failures = (disconnectCounters.get(img) ?? 0) + 1;
				if (failures > DISCONNECT_RETRY_LIMIT) {
					targets.delete(img);
					disconnectCounters.delete(img);
				}
				else {
					disconnectCounters.set(img, failures);
				}
				continue;
			}

			disconnectCounters.delete(img);
			try {
				setImageSource(img, url);
				ensureImageAttributes(img, metadata);
			} catch {
				targets.delete(img);
			}
		}
	};

	const scheduleUpdate = () => {
		setTimeout(update, 0);
	};

	eventSource.on(event_types.APP_READY, scheduleUpdate);
	eventSource.on(event_types.CHAT_CHANGED, scheduleUpdate);
	eventSource.on(event_types.SETTINGS_UPDATED, scheduleUpdate);

	return {
		addTarget(element) {
			if (!element) return;
			targets.add(element);
			scheduleUpdate();
		},
		removeTarget(element) {
			if (!element) return;
			targets.delete(element);
			disconnectCounters.delete(element);
		},
		refresh: update,
	};
}
