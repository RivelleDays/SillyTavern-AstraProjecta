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
				{ mes: "Alpha alpha", messageId: 0, swipeId: null },
				{ mes: "Beta", messageId: 1, swipeId: null },
			],
			saveTextEdits: createSaveSuccess(),
		});

		store.open();
		store.setQuery("alpha");

		expect(store.getSnapshot()).toMatchObject({
			activeMatchIndex: 0,
			caseSensitive: false,
			isOpen: true,
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
				{ mes: "one", messageId: 0, swipeId: null },
				{ mes: "one", messageId: 1, swipeId: null },
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

	test("keeps match case and whole word options functional", () => {
		const store = createChatMessageSearchStore({
			readMessages: () => [
				{ mes: "Alpha alpha", messageId: 0, swipeId: null },
			],
			saveTextEdits: createSaveSuccess(),
		});

		store.open();
		store.setQuery("alpha");
		expect(store.getSnapshot()).toMatchObject({
			caseSensitive: false,
			matchCount: 2,
			wholeWord: false,
		});

		store.setCaseSensitive(true);
		expect(store.getSnapshot()).toMatchObject({
			activeMatchIndex: 0,
			caseSensitive: true,
			matchCount: 1,
		});
		expect(store.getSnapshot().activeMatch).toMatchObject({
			start: 6,
			text: "alpha",
		});

		store.setCaseSensitive(false);
		store.setWholeWord(true);
		expect(store.getSnapshot()).toMatchObject({
			caseSensitive: false,
			matchCount: 2,
			wholeWord: true,
		});

		store.dispose();
	});

	test("replaces the active match and records a session undo step", async () => {
		let messages = [
			{ mes: "eat probiotic now", messageId: 0, swipeId: null },
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
		store.setQuery("probiotic");
		store.setReplaceText("益生菌");

		await expect(store.replaceCurrent()).resolves.toBe(true);
		expect(saveTextEdits).toHaveBeenLastCalledWith({
			edits: [
				{ messageId: 0, messageText: "eat 益生菌 now", swipeId: null },
			],
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

	test("replaces the active case-sensitive match", async () => {
		let messages = [{ mes: "Cat cat", messageId: 0, swipeId: null }];
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
		store.setCaseSensitive(true);

		await expect(store.replaceCurrent()).resolves.toBe(true);
		expect(messages[0].mes).toBe("Cat dog");
		expect(saveTextEdits).toHaveBeenLastCalledWith({
			edits: [{ messageId: 0, messageText: "Cat dog", swipeId: null }],
		});

		store.dispose();
	});

	test("replaces all matches as one undoable operation and supports redo", async () => {
		let messages = [
			{ mes: "Cat cat cat", messageId: 0, swipeId: null },
			{ mes: "cat", messageId: 1, swipeId: 2 },
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
		store.setCaseSensitive(true);

		await expect(store.replaceAll()).resolves.toBe(true);
		expect(messages.map((message) => message.mes)).toEqual([
			"Cat dog dog",
			"dog",
		]);
		expect(saveTextEdits).toHaveBeenLastCalledWith({
			edits: [
				{ messageId: 0, messageText: "Cat dog dog", swipeId: null },
				{ messageId: 1, messageText: "dog", swipeId: 2 },
			],
		});

		await expect(store.undo()).resolves.toBe(true);
		expect(messages.map((message) => message.mes)).toEqual([
			"Cat cat cat",
			"cat",
		]);

		await expect(store.redo()).resolves.toBe(true);
		expect(messages.map((message) => message.mes)).toEqual([
			"Cat dog dog",
			"dog",
		]);

		store.dispose();
	});

	test("replaces case-insensitive matches by position", async () => {
		let messages = [{ mes: "Cat cat CAT", messageId: 0, swipeId: null }];
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
		expect(messages[0].mes).toBe("dog dog dog");

		store.dispose();
	});

	test("does not save replace all when there are no matches", async () => {
		const saveTextEdits = createSaveSuccess();
		const store = createChatMessageSearchStore({
			readMessages: () => [{ mes: "Cat", messageId: 0, swipeId: null }],
			saveTextEdits,
		});

		store.open();
		store.setQuery("cat");
		expect(store.getSnapshot()).toMatchObject({
			canReplace: true,
			matchCount: 1,
		});

		store.setCaseSensitive(true);
		expect(store.getSnapshot()).toMatchObject({
			canReplace: false,
			matchCount: 0,
		});
		await expect(store.replaceAll()).resolves.toBe(false);
		expect(saveTextEdits).not.toHaveBeenCalled();
		expect(store.getSnapshot()).toMatchObject({
			canUndo: false,
			isBusy: false,
		});

		store.dispose();
	});

	test("returns false and restores busy state when replace all save throws", async () => {
		const warnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => undefined);
		const saveTextEdits = vi.fn(async () => {
			throw new Error("save failed");
		});
		const store = createChatMessageSearchStore({
			readMessages: () => [{ mes: "cat", messageId: 0, swipeId: null }],
			saveTextEdits,
		});

		store.open();
		store.setQuery("cat");
		store.setReplaceText("dog");

		await expect(store.replaceAll()).resolves.toBe(false);
		expect(saveTextEdits).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			canUndo: false,
			isBusy: false,
			lastReplaceFailureReason: "exception",
			matchCount: 1,
		});
		expect(warnSpy).toHaveBeenCalledWith(
			"[AstraProjecta] Chat message replacement failed.",
			"exception",
		);

		store.dispose();
		warnSpy.mockRestore();
	});

	test("keeps undo history when replace all save returns a failure result", async () => {
		const warnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => undefined);
		const saveTextEdits = vi.fn(
			async () =>
				({
					ok: false,
					reason: "save-failed",
				}) as const,
		);
		const store = createChatMessageSearchStore({
			readMessages: () => [{ mes: "cat", messageId: 0, swipeId: null }],
			saveTextEdits,
		});

		store.open();
		store.setQuery("cat");
		store.setReplaceText("dog");

		await expect(store.replaceAll()).resolves.toBe(false);
		expect(saveTextEdits).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			canUndo: false,
			isBusy: false,
			lastReplaceFailureReason: "save-failed",
			matchCount: 1,
		});
		expect(warnSpy).toHaveBeenCalledWith(
			"[AstraProjecta] Chat message replacement failed.",
			"save-failed",
		);

		store.dispose();
		warnSpy.mockRestore();
	});

	test("keeps undo and redo history when a save throws", async () => {
		const warnSpy = vi
			.spyOn(console, "warn")
			.mockImplementation(() => undefined);
		let shouldThrow = false;
		let messages = [{ mes: "cat", messageId: 0, swipeId: null }];
		const saveTextEditsImpl: ChatMessageSearchStoreSaveTextEdits = async ({
			edits,
		}) => {
			if (shouldThrow) {
				throw new Error("save failed");
			}

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

		shouldThrow = true;
		await expect(store.undo()).resolves.toBe(false);
		expect(messages[0].mes).toBe("dog");
		expect(store.getSnapshot()).toMatchObject({
			canRedo: false,
			canUndo: true,
			isBusy: false,
			lastReplaceFailureReason: "exception",
		});

		shouldThrow = false;
		await expect(store.undo()).resolves.toBe(true);
		expect(messages[0].mes).toBe("cat");
		expect(store.getSnapshot()).toMatchObject({
			canRedo: true,
			canUndo: false,
			lastReplaceFailureReason: null,
		});

		shouldThrow = true;
		await expect(store.redo()).resolves.toBe(false);
		expect(messages[0].mes).toBe("cat");
		expect(store.getSnapshot()).toMatchObject({
			canRedo: true,
			canUndo: false,
			isBusy: false,
			lastReplaceFailureReason: "exception",
		});

		store.dispose();
		warnSpy.mockRestore();
	});

	test("resets search state when the active chat changes", () => {
		const store = createChatMessageSearchStore({
			readMessages: () => [{ mes: "cat", messageId: 0, swipeId: null }],
			saveTextEdits: createSaveSuccess(),
		});

		store.open();
		store.setQuery("cat");
		store.setReplaceText("dog");
		store.resetForChatChange();

		expect(store.getSnapshot()).toMatchObject({
			canRedo: false,
			canUndo: false,
			isOpen: false,
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
			readMessages: () => [{ mes: "cat", messageId: 0, swipeId: null }],
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
