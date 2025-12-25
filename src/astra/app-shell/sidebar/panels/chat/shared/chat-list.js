import { sortChats } from './sort-chats.js';
import { formatCreationDisplay, formatChatDateLabel } from './chat-date-utils.js';
import { applyPreviewToElement } from './chat-preview-utils.js';

let chatManagerLastChatSignature = null;
let chatManagerPreviewListenerBound = false;

function ensurePreviewListener() {
	if (chatManagerPreviewListenerBound) return;
	if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;

	try {
		window.addEventListener('chat-manager-chat-preview-updated', (event) => {
			const detail = event?.detail || {};
			const chatIdRaw = typeof detail.chatId === 'string' ? detail.chatId.trim() : '';
			if (!chatIdRaw) return;
			const chatIdLower = chatIdRaw.toLowerCase();
			const nodes = document.querySelectorAll('.chat-manager-chat-list-item');
			nodes.forEach((node) => {
				const nodeId = (node?.dataset?.chatId || '').trim().toLowerCase();
				if (nodeId === chatIdLower) {
					applyPreviewToElement(node, detail.preview);
				}
			});
		});
		chatManagerPreviewListenerBound = true;
	} catch {
		/* ignore listener binding errors */
	}
}

/**
 * Renders the list of recent chats for the current character or group.
 * Dependency-injected version: supply data/intl helpers via `deps`.
 * @param {HTMLElement} container - The DOM element to render the list into.
 * @param {Object} deps - Injected dependencies (see usages below).
 */
export async function renderCurrentChatList(container, deps) {
	ensurePreviewListener();

	// Build a signature that also tracks preview background changes
	function datasetSignature(list) {
		return list.map((chat) => {
			if (!chat) return '';
			const preview = chat.previewBackground || null;
			const previewSig = preview
				? `${preview.previewUrl || ''}::${preview.cssImage || ''}::${preview.originalUrl || ''}`
				: '::';
			const creationSig = chat.createdAt
				? String(chat.createdAt)
				: (chat.createdAtRaw || '');
			return `${chat.file_name ?? ''}#${chat.last_mes ?? ''}#${previewSig}#${creationSig}`;
		}).join('|');
	}

	// No-op placeholder kept for parity with original flow
	function togglePageLoading() { /* intentionally empty to avoid jank */ }

	// Render list items into the container
	function renderItems(containerEl, chats, currentId) {
		containerEl.innerHTML = '';

		const nowMs = Date.now();

		for (const chat of chats) {
			const item = document.createElement('div');
			item.className = 'chat-manager-chat-list-item';
			item.classList.toggle('selected', chat.file_name === currentId);
			item.dataset.chatId = chat.file_name;
			item.dataset.createdAt = Number.isFinite(chat.createdAt) ? String(chat.createdAt) : '';

			applyPreviewToElement(item, chat.previewBackground);

			// Navigate to the selected chat
			item.addEventListener('click', async () => {
				if (chat.file_name === currentId) return;
				try {
					await deps.openChatById(chat.file_name);
				} catch {
					/* soft-fail without overlay */
				}
			});

			// Line 1: name
			const nameContainer = document.createElement('div');
			nameContainer.className = 'chatNameContainer';
			const chatName = document.createElement('div');
			chatName.className = 'chatName';
			chatName.textContent = chat.file_name;
			chatName.title = chat.file_name;
			nameContainer.append(chatName);

			// Line 2: date + stats
			const metaRow = document.createElement('div');
			metaRow.className = 'chatMeta';

			const chatDate = document.createElement('small');
			chatDate.className = 'chatDate';
			const dateMeta = formatChatDateLabel(chat, { nowMs });
			chatDate.textContent = dateMeta.text;
			chatDate.title = dateMeta.title;

			const chatStats = document.createElement('div');
			chatStats.className = 'chatStats';

			const counterBlock = document.createElement('div');
			counterBlock.className = 'counterBlock';
			const counterIcon = document.createElement('i');
			counterIcon.className = 'fa-solid fa-comment fa-xs';
			const counterText = document.createElement('small');
			counterText.textContent = String(dateMeta.messageCount);
			counterBlock.append(counterIcon, counterText);

			const fileSize = document.createElement('small');
			fileSize.className = 'fileSize';
			fileSize.textContent = chat.file_size;
			chatStats.append(counterBlock, fileSize);

			const chronology = document.createElement('div');
			chronology.className = 'chatDates';
			chronology.append(chatDate);

			const creationInfo = formatCreationDisplay(chat, { timestampToMoment: deps.timestampToMoment });
			if (creationInfo?.label) {
				const created = document.createElement('small');
				created.className = 'chatDate chatCreated';
				created.textContent = creationInfo.label;
				created.title = creationInfo.title || creationInfo.label;
				chronology.append(created);
			}

			metaRow.append(chronology, chatStats);

			// Line 3: last message (clamped by CSS)
			const messageContainer = document.createElement('div');
			messageContainer.className = 'chatMessageContainer';
			const chatMessage = document.createElement('div');
			chatMessage.className = 'chatMessage';
			chatMessage.textContent = chat.mes;
			chatMessage.title = chat.mes;
			messageContainer.append(chatMessage);

			item.append(nameContainer, metaRow, messageContainer);
			containerEl.appendChild(item);
		}
	}

	// Resolve current chat id
	const currentChatId = deps.getCurrentChatId();

	if (!currentChatId) {
		container.innerHTML = '<div class="chat-list-empty">No chat selected.</div>';
		chatManagerLastChatSignature = null;
		return;
	}

	// Load and normalize chat files
	const raw = await deps.getChatFiles();
	const normalized = raw.map(chat => {
		chat.last_mes_moment = deps.timestampToMoment(chat.last_mes);
		chat.file_name = String(chat.file_name).replace('.jsonl', '');
		return chat;
	});

	const resolveSortOrder = () => {
		if (typeof deps.getChatSortOrder === 'function') {
			try {
				const candidate = deps.getChatSortOrder();
				if (typeof candidate === 'string' && candidate) return candidate;
			} catch {
				/* ignore resolution errors */
			}
		}
		if (typeof deps.chatSortOrder === 'string' && deps.chatSortOrder) return deps.chatSortOrder;
		if (typeof deps.sortOrder === 'string' && deps.sortOrder) return deps.sortOrder;
		return 'time-desc';
	};

	const sortOrder = resolveSortOrder();
	const sortImpl = typeof deps.sortChats === 'function' ? deps.sortChats : sortChats;

	let chats;
	try {
		const baseList = Array.isArray(normalized) ? [...normalized] : [];
		const maybeSorted = sortImpl(baseList, sortOrder);
		chats = Array.isArray(maybeSorted) ? maybeSorted : null;
	} catch {
		chats = null;
	}

	if (!Array.isArray(chats) || chats.length !== normalized.length) {
		chats = [...normalized].sort((a, b) => deps.sortMoments(a.last_mes_moment, b.last_mes_moment));
	}

	if (chats.length === 0) {
		container.innerHTML = '<div class="chat-list-empty">No recent chats for this entity.</div>';
		chatManagerLastChatSignature = null;
		return;
	}

	const sigNow = datasetSignature(chats);

	// If only the selection changed, patch classes without rebuilding
	if (chatManagerLastChatSignature === sigNow && container.childElementCount > 0) {
		[...container.querySelectorAll('.chat-manager-chat-list-item')].forEach(el => {
			const name = el.querySelector('.chatName')?.textContent || '';
			el.classList.toggle('selected', name === currentChatId);
		});
		togglePageLoading(container, false);
		return;
	}

	// Full rebuild
	renderItems(container, chats, currentChatId);
	chatManagerLastChatSignature = sigNow;

	togglePageLoading(container, false);
}
