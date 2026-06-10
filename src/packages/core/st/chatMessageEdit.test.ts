import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	copyChatMessageFromDraft,
	moveChatMessage,
	readChatMessageEditDraft,
	saveChatMessageEdit,
} from "@/packages/core/st/chatMessageEdit";

type TestMessage = {
	extra?: Record<string, unknown>;
	is_system?: boolean;
	is_user?: boolean;
	mes?: string;
	name?: string;
	send_date?: number;
	swipe_id?: number;
	swipes?: string[];
};

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("chatMessageEdit", () => {
	beforeEach(() => {
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
		document.body.innerHTML = "";
		vi.useRealTimers();
	});

	test("reads a draft from the public SillyTavern chat context", () => {
		const chat: TestMessage[] = [
			{
				extra: { reasoning: "Current reasoning" },
				is_user: false,
				mes: "Current message",
				swipe_id: 1,
				swipes: ["First swipe", "Current message"],
			},
		];
		setSillyTavernContext({ chat });

		expect(readChatMessageEditDraft({ messageId: 0 })).toEqual({
			draft: {
				canCopy: true,
				canMoveDown: false,
				canMoveUp: false,
				hasReasoning: true,
				messageId: 0,
				messageText: "Current message",
				reasoningText: "Current reasoning",
			},
			ok: true,
		});
	});

	test("saves message text and reasoning through public context surfaces", async () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0">
					<div class="mes_block">
						<div class="mes_text">Original</div>
					</div>
				</div>
			</div>
		`;
		const eventSource = { emit: vi.fn(async () => undefined) };
		const saveChat = vi.fn(async () => undefined);
		const updateMessageBlock = vi.fn();
		const chat: TestMessage[] = [
			{
				extra: { reasoning: "Old reasoning" },
				is_system: false,
				is_user: false,
				mes: "Original",
				name: "Assistant",
				swipe_id: 1,
				swipes: ["First swipe", "Original"],
			},
		];
		setSillyTavernContext({
			chat,
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_REASONING_EDITED: "message_reasoning_edited",
				MESSAGE_UPDATED: "message_updated",
			},
			messageFormatting: (value: string) => `<p>${value}</p>`,
			powerUserSettings: { trim_spaces: true },
			saveChat,
			substituteParams: (value: string) =>
				value.replaceAll("{{user}}", "Rivelle"),
			updateMessageBlock,
		});

		const result = await saveChatMessageEdit({
			hasReasoning: true,
			messageId: 0,
			messageText: "  Hello {{user}}  ",
			reasoningText: "Think about {{user}}",
		});

		expect(result).toEqual({ messageId: 0, ok: true });
		expect(chat[0].mes).toBe("Hello Rivelle");
		expect(chat[0].swipes?.[1]).toBe("Hello Rivelle");
		expect(chat[0].extra?.reasoning).toBe("Think about Rivelle");
		expect(chat[0].extra?.reasoning_type).toBe("edited");
		expect(updateMessageBlock).toHaveBeenCalledWith(0, chat[0]);
		expect(eventSource.emit).toHaveBeenCalledWith("message_edited", 0);
		expect(eventSource.emit).toHaveBeenCalledWith(
			"message_reasoning_edited",
			0,
		);
		expect(eventSource.emit).toHaveBeenCalledWith("message_updated", 0);
		expect(saveChat).toHaveBeenCalledTimes(1);
	});

	test("clears reasoning when the draft no longer has a reasoning block", async () => {
		const eventSource = { emit: vi.fn(async () => undefined) };
		const chat: TestMessage[] = [
			{
				extra: {
					reasoning: "Old reasoning",
					reasoning_duration: 123,
					reasoning_type: "edited",
				},
				is_user: false,
				mes: "Body",
				swipe_id: 0,
				swipes: ["Body"],
			},
		];
		setSillyTavernContext({
			chat,
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_REASONING_DELETED: "message_reasoning_deleted",
				MESSAGE_UPDATED: "message_updated",
			},
			saveChatConditional: vi.fn(async () => undefined),
		});

		const result = await saveChatMessageEdit({
			hasReasoning: false,
			messageId: 0,
			messageText: "Body edited",
			reasoningText: "",
		});

		expect(result).toEqual({ messageId: 0, ok: true });
		expect(chat[0].extra?.reasoning).toBeUndefined();
		expect(chat[0].extra?.reasoning_type).toBeUndefined();
		expect(chat[0].extra?.reasoning_duration).toBeUndefined();
		expect(eventSource.emit).toHaveBeenCalledWith(
			"message_reasoning_deleted",
			0,
		);
	});

	test("duplicates the current draft after the selected message", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-14T12:00:00Z"));
		const printMessages = vi.fn(async () => undefined);
		const saveChat = vi.fn(async () => undefined);
		const chat: TestMessage[] = [
			{
				extra: { reasoning: "Original reasoning" },
				is_user: false,
				mes: "Original",
				send_date: 1,
				swipe_id: 0,
				swipes: ["Original"],
			},
			{ is_user: true, mes: "Next" },
		];
		setSillyTavernContext({ chat, printMessages, saveChat });

		const result = await copyChatMessageFromDraft({
			hasReasoning: true,
			messageId: 0,
			messageText: "Copied body",
			reasoningText: "Copied reasoning",
		});

		expect(result).toEqual({ messageId: 1, ok: true });
		expect(chat).toHaveLength(3);
		expect(chat[1]).toMatchObject({
			extra: {
				reasoning: "Copied reasoning",
				reasoning_type: "edited",
			},
			mes: "Copied body",
			send_date: Date.parse("2026-01-14T12:00:00Z"),
			swipe_id: 0,
			swipes: ["Copied body"],
		});
		expect(chat[0].mes).toBe("Original");
		expect(chat[2].mes).toBe("Next");
		expect(printMessages).toHaveBeenCalledTimes(1);
		expect(saveChat).toHaveBeenCalledTimes(1);
	});

	test("moves the selected message and returns its new id", async () => {
		const printMessages = vi.fn(async () => undefined);
		const saveChat = vi.fn(async () => undefined);
		const chat: TestMessage[] = [
			{ is_user: true, mes: "First" },
			{ is_user: false, mes: "Second" },
			{ is_user: false, mes: "Third" },
		];
		setSillyTavernContext({ chat, printMessages, saveChat });

		const upResult = await moveChatMessage({
			direction: "up",
			messageId: 1,
		});
		const downResult = await moveChatMessage({
			direction: "down",
			messageId: 0,
		});

		expect(upResult).toEqual({ messageId: 0, ok: true });
		expect(downResult).toEqual({ messageId: 1, ok: true });
		expect(chat.map((message) => message.mes)).toEqual([
			"First",
			"Second",
			"Third",
		]);
		expect(printMessages).toHaveBeenCalledTimes(2);
		expect(saveChat).toHaveBeenCalledTimes(2);
	});

	test("rejects invalid message ids before mutating chat", async () => {
		const chat: TestMessage[] = [{ is_user: true, mes: "Only" }];
		const saveChat = vi.fn();
		setSillyTavernContext({ chat, saveChat });

		await expect(
			saveChatMessageEdit({
				hasReasoning: false,
				messageId: 2,
				messageText: "Nope",
				reasoningText: "",
			}),
		).resolves.toEqual({
			ok: false,
			reason: "invalid-message-id",
		});
		await expect(
			moveChatMessage({
				direction: "up",
				messageId: 0,
			}),
		).resolves.toEqual({
			ok: false,
			reason: "move-unavailable",
		});
		expect(chat).toEqual([{ is_user: true, mes: "Only" }]);
		expect(saveChat).not.toHaveBeenCalled();
	});
});
