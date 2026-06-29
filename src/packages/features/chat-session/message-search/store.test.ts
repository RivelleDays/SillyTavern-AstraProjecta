import { describe, expect, test, vi } from "vitest";

import {
	createChatMessageSearchStore,
	type ChatMessageSearchStoreSaveTextEdits,
} from "@/packages/features/chat-session/message-search/store";

function createSaveSuccess(): ChatMessageSearchStoreSaveTextEdits {
	const saveTextEdits: ChatMessageSearchStoreSaveTextEdits = async ({
		edits,
	}) => ({
		messageIds: edits.map((edit) => edit.messageId),
		ok: true,
	});

	return vi.fn(saveTextEdits);
}

describe("chat message search store", () => {
	test("opens with default options and recomputes current-chat matches", () => {
		const store = createChatMessageSearchStore({
			readMessages: () => [
				{ mes: "Alpha alpha", messageId: 0 },
				{ mes: "Beta", messageId: 1 },
			],
			saveTextEdits: createSaveSuccess(),
		});

		store.open();
		store.setQuery("alpha");

		expect(store.getSnapshot()).toMatchObject({
			activeMatchIndex: 0,
			caseSensitive: false,
			isOpen: true,
			isReplaceOpen: false,
			matchCount: 2,
			query: "alpha",
			replaceText: "",
			wholeWord: false,
		});
		expect(store.getSnapshot().activeMatch).toMatchObject({
			messageId: 0,
			start: 0,
			text: "Alpha",
		});

		store.dispose();
	});

	test("navigates matches with wraparound", () => {
		const store = createChatMessageSearchStore({
			readMessages: () => [
				{ mes: "one", messageId: 0 },
				{ mes: "one", messageId: 1 },
			],
			saveTextEdits: createSaveSuccess(),
		});

		store.open();
		store.setQuery("one");
		store.goToPrevious();
		expect(store.getSnapshot().activeMatch).toMatchObject({
			messageId: 1,
		});

		store.goToNext();
		expect(store.getSnapshot().activeMatch).toMatchObject({
			messageId: 0,
		});

		store.dispose();
	});

	test("replaces the active match and records a session undo step", async () => {
		let messages = [{ mes: "eat probiotic now", messageId: 0 }];
		const saveTextEditsImpl: ChatMessageSearchStoreSaveTextEdits = async ({
			edits,
		}) => {
			messages = messages.map((message) => {
				const edit = edits.find(
					(item) => item.messageId === message.messageId,
				);
				return edit ? { ...message, mes: edit.messageText } : message;
			});
			return {
				messageIds: edits.map((edit) => edit.messageId),
				ok: true,
			};
		};
		const saveTextEdits = vi.fn(saveTextEditsImpl);
		const store = createChatMessageSearchStore({
			readMessages: () => messages,
			saveTextEdits,
		});

		store.open();
		store.setQuery("probiotic");
		store.setReplaceText("益生菌");

		await expect(store.replaceCurrent()).resolves.toBe(true);
		expect(saveTextEdits).toHaveBeenLastCalledWith({
			edits: [{ messageId: 0, messageText: "eat 益生菌 now" }],
		});
		expect(store.getSnapshot()).toMatchObject({
			canRedo: false,
			canUndo: true,
			matchCount: 0,
		});

		await expect(store.undo()).resolves.toBe(true);
		expect(messages[0].mes).toBe("eat probiotic now");
		expect(store.getSnapshot()).toMatchObject({
			canRedo: true,
			canUndo: false,
			matchCount: 1,
		});

		store.dispose();
	});

	test("replaces all matches as one undoable operation and supports redo", async () => {
		let messages = [
			{ mes: "cat cat", messageId: 0 },
			{ mes: "cat", messageId: 1 },
		];
		const saveTextEditsImpl: ChatMessageSearchStoreSaveTextEdits = async ({
			edits,
		}) => {
			messages = messages.map((message) => {
				const edit = edits.find(
					(item) => item.messageId === message.messageId,
				);
				return edit ? { ...message, mes: edit.messageText } : message;
			});
			return {
				messageIds: edits.map((edit) => edit.messageId),
				ok: true,
			};
		};
		const saveTextEdits = vi.fn(saveTextEditsImpl);
		const store = createChatMessageSearchStore({
			readMessages: () => messages,
			saveTextEdits,
		});

		store.open();
		store.setQuery("cat");
		store.setReplaceText("dog");

		await expect(store.replaceAll()).resolves.toBe(true);
		expect(messages.map((message) => message.mes)).toEqual([
			"dog dog",
			"dog",
		]);
		expect(saveTextEdits).toHaveBeenLastCalledWith({
			edits: [
				{ messageId: 0, messageText: "dog dog" },
				{ messageId: 1, messageText: "dog" },
			],
		});

		await expect(store.undo()).resolves.toBe(true);
		expect(messages.map((message) => message.mes)).toEqual([
			"cat cat",
			"cat",
		]);

		await expect(store.redo()).resolves.toBe(true);
		expect(messages.map((message) => message.mes)).toEqual([
			"dog dog",
			"dog",
		]);

		store.dispose();
	});

	test("resets search state when the active chat changes", () => {
		const store = createChatMessageSearchStore({
			readMessages: () => [{ mes: "cat", messageId: 0 }],
			saveTextEdits: createSaveSuccess(),
		});

		store.open();
		store.setQuery("cat");
		store.setReplaceText("dog");
		store.setReplaceOpen(true);
		store.resetForChatChange();

		expect(store.getSnapshot()).toMatchObject({
			canRedo: false,
			canUndo: false,
			isOpen: false,
			isReplaceOpen: false,
			matchCount: 0,
			query: "",
			replaceText: "",
		});

		store.dispose();
	});

	test("subscribes to chat changes and removes the listener on dispose", () => {
		let listener: (() => void) | null = null;
		const unsubscribe = vi.fn(() => {
			listener = null;
		});
		const store = createChatMessageSearchStore({
			readMessages: () => [{ mes: "cat", messageId: 0 }],
			saveTextEdits: createSaveSuccess(),
			subscribeToChatChanges: (nextListener) => {
				listener = nextListener;
				return unsubscribe;
			},
		});

		store.open();
		store.setQuery("cat");
		expect(listener).not.toBeNull();
		(listener as unknown as () => void)();

		expect(store.getSnapshot()).toMatchObject({
			isOpen: false,
			matchCount: 0,
			query: "",
		});

		store.dispose();
		expect(unsubscribe).toHaveBeenCalledTimes(1);
	});
});
