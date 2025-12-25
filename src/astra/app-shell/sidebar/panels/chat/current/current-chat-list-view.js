import { getLucideIconMarkup } from '@/astra/shared/icons/lucide';
import { formatCreationDisplay, formatChatDateLabel } from '../shared/chat-date-utils.js';
import { applyPreviewToElement } from '../shared/chat-preview-utils.js';

const CHAT_ITEM_CLASS = 'chat-manager-chat-list-item';
const COUNTER_ICON = getLucideIconMarkup('message-circle-more');
const EXPORT_JSON_ICON = getLucideIconMarkup('download');
const EXPORT_TEXT_ICON = getLucideIconMarkup('file-text');
const DELETE_ICON = getLucideIconMarkup('trash-2');
const RENAME_ICON = getLucideIconMarkup('pencil-line');
const TAG_ICON = getLucideIconMarkup('bookmark');

/**
 * Factory for rendering chat list rows within the current panel.
 * Decouples DOM interaction logic from the main panel controller.
 */
export function createChatListView({
    getCurrentChatId,
    openChatById,
    promptRenameChat,
    promptDeleteChat,
    exportChatAsJsonl,
    exportChatAsText,
    categories,
}) {
    const rowRefs = new Map();

    function rememberRow(chatId, row) {
        const key = typeof chatId === 'string' ? chatId.trim().toLowerCase() : '';
        if (!key) return;
        rowRefs.set(key, row);
    }

    function forgetAllRows() {
        rowRefs.clear();
    }

    function findRow(chatId) {
        const key = typeof chatId === 'string' ? chatId.trim().toLowerCase() : '';
        if (!key) return null;
        return rowRefs.get(key) || null;
    }

    function createActionButton({ title, iconSvg, onClick }) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chatActionButton';
        button.title = title;
        button.setAttribute('aria-label', title);
        button.innerHTML = iconSvg;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            onClick?.();
        });
        return button;
    }

    function render(containerEl, items, { isSearchActive }) {
        containerEl.innerHTML = '';
        forgetAllRows();
        const currentId = getCurrentChatId?.();
        const currentIdLower = typeof currentId === 'string' ? currentId.trim().toLowerCase() : null;
        const nowMs = Date.now();

        if (!items || items.length === 0) {
            const emptyMessage = isSearchActive
                ? 'No chats match your search.'
                : 'No recent chats for this entity.';
            containerEl.innerHTML = `<div class="chat-list-empty">${emptyMessage}</div>`;
            return;
        }

        for (const chat of items) {
            const chatId = String(chat.file_name || '').trim();
            const chatIdLower = chatId.toLowerCase();
            const row = document.createElement('div');
            row.className = CHAT_ITEM_CLASS;
            row.dataset.chatId = chatId;
            row.classList.toggle('selected', currentIdLower ? chatIdLower === currentIdLower : chatId === currentId);

            applyPreviewToElement(row, chat.previewBackground);
            rememberRow(chatId, row);

            row.addEventListener('click', async () => {
                if (chatId === currentId) return;
                try { await openChatById(chatId); } catch {}
            });

            const chatName = document.createElement('div');
            chatName.className = 'chatName';
            chatName.textContent = chatId;
            chatName.title = chatId;

            const chatDate = document.createElement('div');
            chatDate.className = 'chatDate';
            const dateMeta = formatChatDateLabel(chat, { nowMs });
            chatDate.textContent = dateMeta.text;
            chatDate.title = dateMeta.title;

            const chronology = document.createElement('div');
            chronology.className = 'chatDates';
            chronology.append(chatDate);

            const creationInfo = formatCreationDisplay(chat);
            if (creationInfo) {
                const createdEl = document.createElement('small');
                createdEl.className = 'chatDate chatCreated';
                createdEl.textContent = creationInfo.label;
                createdEl.title = creationInfo.title;
                chronology.append(createdEl);
            }

            const chatMessage = document.createElement('div');
            chatMessage.className = 'chatMessage';
            chatMessage.textContent = chat.mes || '';
            chatMessage.title = chat.mes || '';

            const footer = document.createElement('div');
            footer.className = 'chatFooter';

            const counterBlock = document.createElement('div');
            counterBlock.className = 'counterBlock';
            counterBlock.innerHTML = COUNTER_ICON;
            const counterValue = document.createElement('span');
            counterValue.className = 'counterValue';
            counterValue.textContent = String(dateMeta.messageCount);
            counterBlock.appendChild(counterValue);

            const fileSize = document.createElement('span');
            fileSize.className = 'fileSize';
            fileSize.textContent = chat.file_size || '';
            fileSize.title = chat.file_size || '';

            const exportJsonBtn = createActionButton({
                title: 'Export JSONL chat file',
                iconSvg: EXPORT_JSON_ICON,
                onClick: () => { void exportChatAsJsonl?.(chatId); },
            });
            exportJsonBtn.classList.add('chatActionExportJsonl');

            const exportTextBtn = createActionButton({
                title: 'Download chat as plain text document',
                iconSvg: EXPORT_TEXT_ICON,
                onClick: () => { void exportChatAsText?.(chatId); },
            });
            exportTextBtn.classList.add('chatActionExportText');

            const deleteBtn = createActionButton({
                title: 'Delete chat file',
                iconSvg: DELETE_ICON,
                onClick: () => { void promptDeleteChat(chatId); },
            });
            deleteBtn.classList.add('chatActionDelete');

            const renameBtn = createActionButton({
                title: 'Rename chat file',
                iconSvg: RENAME_ICON,
                onClick: () => { void promptRenameChat(chatId); },
            });
            renameBtn.classList.add('chatActionRename');

            const tagBtn = createActionButton({
                title: 'Assign categories',
                iconSvg: TAG_ICON,
                onClick: () => {
                    try { categories.openAssignModal(chatId); } catch (err) {
                        console?.error?.('Failed to open category modal', err);
                    }
                },
            });
            tagBtn.classList.add('chatActionTag', 'chat-manager-tag-btn');

            footer.append(
                counterBlock,
                fileSize,
                exportJsonBtn,
                exportTextBtn,
                deleteBtn,
                renameBtn,
                tagBtn,
            );

            row.dataset.createdAt = Number.isFinite(chat.createdAt) ? String(chat.createdAt) : '';
            row.append(chatName, chronology, chatMessage, footer);
            containerEl.appendChild(row);
        }
    }

    return {
        render,
        updatePreview(chatId, preview) {
            const row = findRow(chatId);
            if (!row) return;
            applyPreviewToElement(row, preview);
        },
        itemClassName: CHAT_ITEM_CLASS,
    };
}
