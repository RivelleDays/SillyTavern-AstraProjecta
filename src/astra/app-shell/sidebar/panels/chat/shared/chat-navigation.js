/**
 * Keep these pure and injectable so paths stay stable.
 */
export function createChatNavigation(deps) {
    const {
        getContext,            // () => { groupId?, characterId? }
        getPastCharacterChats, // (characterId) => Promise<Array>
        getGroupPastChats,     // (groupId) => Promise<Array>
        getCurrentChatId,      // () => string | null
        openGroupChat,         // (groupId, chatId) => Promise<void>
        openCharacterChat,     // (chatId) => Promise<void>
    } = deps || {};

    /**
     * Returns recent chats depending on current entity (group or character).
     */
    async function getChatFiles() {
        const c = typeof getContext === 'function' ? (getContext() || {}) : {};
        const chatId = typeof getCurrentChatId === 'function' ? getCurrentChatId() : null;

        if (!chatId) return [];
        if (c.groupId && typeof getGroupPastChats === 'function') {
        return await getGroupPastChats(c.groupId);
        }
        if (typeof c.characterId !== 'undefined' && typeof getPastCharacterChats === 'function') {
        return await getPastCharacterChats(c.characterId);
        }
        return [];
    }

    /**
     * Opens a chat file by id, respecting current entity (group vs character).
     */
    async function openChatById(chatId) {
        if (!chatId) return;
        const c = typeof getContext === 'function' ? (getContext() || {}) : {};

        if (typeof openGroupChat === 'function' && c.groupId) {
        await openGroupChat(c.groupId, chatId);
        return;
        }
        if (typeof openCharacterChat === 'function' && typeof c.characterId !== 'undefined') {
        await openCharacterChat(chatId);
        return;
        }
    }

    return { getChatFiles, openChatById };
}
