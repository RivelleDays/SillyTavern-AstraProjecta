import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	batchSaveChatMessageTextEdits,
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

const XSS_PAYLOADS = [
	"<img src=x onerror=alert(1)>",
	"<svg onload=alert(1)>",
	'<a href="javascript:alert(1)">link</a>',
	"<script>alert(1)</script>",
] as const;

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function renderMessageTarget(): Element {
	document.body.innerHTML = `
		<div id="chat">
			<div class="mes" mesid="0">
				<div class="mes_block">
					<div class="mes_text">Original</div>
				</div>
			</div>
		</div>
	`;

	const target = document.querySelector(".mes_text");
	expect(target).toBeInstanceOf(Element);
	return target as Element;
}

function expectNoExecutableMarkup(target: Element): void {
	expect(target.querySelector("img, svg, a, script")).toBeNull();
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

	test("keeps formatted edit fallback output as SillyTavern HTML", async () => {
		const target = renderMessageTarget();
		const chat: TestMessage[] = [
			{
				is_user: false,
				mes: "Original",
				name: "Assistant",
			},
		];
		setSillyTavernContext({
			chat,
			messageFormatting: (value: string) => `<p>${value}</p>`,
			saveChatConditional: vi.fn(async () => undefined),
		});

		await expect(
			saveChatMessageEdit({
				hasReasoning: false,
				messageId: 0,
				messageText: "Formatted body",
				reasoningText: "",
			}),
		).resolves.toEqual({ messageId: 0, ok: true });
		expect(target.innerHTML).toBe("<p>Formatted body</p>");
	});

	test.each(XSS_PAYLOADS)(
		"writes formatter-missing edit fallback payload as text: %s",
		async (payload) => {
			const target = renderMessageTarget();
			const chat: TestMessage[] = [
				{
					is_user: false,
					mes: "Original",
					name: "Assistant",
				},
			];
			setSillyTavernContext({
				chat,
				saveChatConditional: vi.fn(async () => undefined),
			});

			await expect(
				saveChatMessageEdit({
					hasReasoning: false,
					messageId: 0,
					messageText: payload,
					reasoningText: "",
				}),
			).resolves.toEqual({ messageId: 0, ok: true });
			expect(target.textContent).toBe(payload);
			expectNoExecutableMarkup(target);
		},
	);

	test("writes formatter-throwing edit fallback payload as text", async () => {
		const target = renderMessageTarget();
		const payload = '<a href="javascript:alert(1)">link</a>';
		const chat: TestMessage[] = [
			{
				is_user: false,
				mes: "Original",
				name: "Assistant",
			},
		];
		setSillyTavernContext({
			chat,
			messageFormatting: () => {
				throw new Error("formatter unavailable");
			},
			saveChatConditional: vi.fn(async () => undefined),
		});

		await expect(
			saveChatMessageEdit({
				hasReasoning: false,
				messageId: 0,
				messageText: payload,
				reasoningText: "",
			}),
		).resolves.toEqual({ messageId: 0, ok: true });
		expect(target.textContent).toBe(payload);
		expectNoExecutableMarkup(target);
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

	test("batch saves message text edits with one chat save", async () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0"><div class="mes_block"><div class="mes_text">Old one</div></div></div>
				<div class="mes" mesid="1"><div class="mes_block"><div class="mes_text">Old two</div></div></div>
			</div>
		`;
		const eventSource = { emit: vi.fn(async () => undefined) };
		const saveChat = vi.fn(async () => undefined);
		const chat: TestMessage[] = [
			{
				is_user: true,
				mes: "Old one",
				swipe_id: 0,
				swipes: ["Old one"],
			},
			{
				is_user: false,
				mes: "Old two",
				swipe_id: 1,
				swipes: ["First", "Old two"],
			},
		];
		setSillyTavernContext({
			chat,
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_UPDATED: "message_updated",
			},
			messageFormatting: (value: string) => `<p>${value}</p>`,
			saveChat,
		});

		const result = await batchSaveChatMessageTextEdits({
			edits: [
				{ messageId: 0, messageText: "New one" },
				{ messageId: 1, messageText: "New two" },
			],
		});

		expect(result).toEqual({ messageIds: [0, 1], ok: true });
		expect(chat[0].mes).toBe("New one");
		expect(chat[0].swipes?.[0]).toBe("New one");
		expect(chat[1].mes).toBe("New two");
		expect(chat[1].swipes?.[1]).toBe("New two");
		expect(document.querySelector('.mes[mesid="0"] .mes_text')).toHaveTextContent(
			"New one",
		);
		expect(document.querySelector('.mes[mesid="1"] .mes_text')).toHaveTextContent(
			"New two",
		);
		expect(eventSource.emit).toHaveBeenCalledWith("message_edited", 0);
		expect(eventSource.emit).toHaveBeenCalledWith("message_updated", 0);
		expect(eventSource.emit).toHaveBeenCalledWith("message_edited", 1);
		expect(eventSource.emit).toHaveBeenCalledWith("message_updated", 1);
		expect(saveChat).toHaveBeenCalledTimes(1);
	});

	test("batch edits clear stale display text and preserve reasoning display text", async () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0"><div class="mes_block"><div class="mes_text">Translated cat</div></div></div>
			</div>
		`;
		const saveChat = vi.fn(async () => undefined);
		const chat: TestMessage[] = [
			{
				extra: {
					display_text: "Translated cat",
					reasoning_display_text: "Translated reasoning",
				},
				is_user: false,
				mes: "cat",
				name: "Assistant",
			},
		];
		setSillyTavernContext({
			chat,
			messageFormatting: (value: string) => `<p>${value}</p>`,
			saveChat,
		});

		await expect(
			batchSaveChatMessageTextEdits({
				edits: [{ messageId: 0, messageText: "dog" }],
			}),
		).resolves.toEqual({ messageIds: [0], ok: true });

		expect(chat[0].mes).toBe("dog");
		expect(chat[0].extra?.display_text).toBeUndefined();
		expect(chat[0].extra?.reasoning_display_text).toBe(
			"Translated reasoning",
		);
		expect(
			document.querySelector('.mes[mesid="0"] .mes_text'),
		).toHaveTextContent("dog");
		expect(saveChat).toHaveBeenCalledTimes(1);
	});

	test("batch edits save before best-effort update lifecycle", async () => {
		const calls: string[] = [];
		const eventSource = {
			emit: vi.fn(async (eventName: string, messageId: number) => {
				calls.push(`${eventName}:${messageId}`);
			}),
		};
		const saveChat = vi.fn(async () => {
			calls.push("save");
		});
		const updateMessageBlock = vi.fn((messageId: number) => {
			calls.push(`update:${messageId}`);
		});
		const chat: TestMessage[] = [
			{ is_user: false, mes: "Old one" },
			{ is_user: true, mes: "Old two" },
		];
		setSillyTavernContext({
			chat,
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_UPDATED: "message_updated",
			},
			saveChat,
			updateMessageBlock,
		});

		await expect(
			batchSaveChatMessageTextEdits({
				edits: [
					{ messageId: 0, messageText: "New one" },
					{ messageId: 1, messageText: "New two" },
				],
			}),
		).resolves.toEqual({ messageIds: [0, 1], ok: true });

		expect(calls).toEqual([
			"save",
			"message_edited:0",
			"update:0",
			"message_updated:0",
			"message_edited:1",
			"update:1",
			"message_updated:1",
		]);
	});

	test("batch edit keeps saved text when post-save events fail", async () => {
		const chat: TestMessage[] = [
			{
				extra: { display_text: "Translated original" },
				is_user: false,
				mes: "Original",
				swipe_id: 0,
				swipes: ["Original"],
			},
		];
		const saveChat = vi.fn(async () => undefined);
		const eventSource = {
			emit: vi.fn(async (eventName: string) => {
				if (eventName === "message_updated") {
					throw new Error("listener failed");
				}
			}),
		};
		setSillyTavernContext({
			chat,
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_UPDATED: "message_updated",
			},
			saveChat,
			updateMessageBlock: vi.fn(),
		});

		await expect(
			batchSaveChatMessageTextEdits({
				edits: [{ messageId: 0, messageText: "Changed" }],
			}),
		).resolves.toEqual({ messageIds: [0], ok: true });

		expect(chat[0].mes).toBe("Changed");
		expect(chat[0].swipes?.[0]).toBe("Changed");
		expect(chat[0].extra?.display_text).toBeUndefined();
		expect(saveChat).toHaveBeenCalledTimes(1);
	});

	test("batch edit falls back to rendered DOM when updateMessageBlock fails", async () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0"><div class="mes_block"><div class="mes_text">Old cat</div></div></div>
			</div>
		`;
		const chat: TestMessage[] = [
			{
				is_user: false,
				mes: "Old cat",
				name: "Assistant",
			},
		];
		const saveChat = vi.fn(async () => undefined);
		setSillyTavernContext({
			chat,
			messageFormatting: (value: string) => `<p>${value}</p>`,
			saveChat,
			updateMessageBlock: vi.fn(() => {
				throw new Error("render failed");
			}),
		});

		await expect(
			batchSaveChatMessageTextEdits({
				edits: [{ messageId: 0, messageText: "New dog" }],
			}),
		).resolves.toEqual({ messageIds: [0], ok: true });

		expect(document.querySelector('.mes[mesid="0"] .mes_text')).toHaveTextContent(
			"New dog",
		);
		expect(saveChat).toHaveBeenCalledTimes(1);
	});

	test("batch saves explicit hidden swipe text without mutating visible text", async () => {
		const saveChat = vi.fn(async () => undefined);
		const chat: TestMessage[] = [
			{
				is_user: false,
				mes: "Visible current",
				swipe_id: 0,
				swipes: ["Visible current", "Hidden target"],
			},
		];
		setSillyTavernContext({ chat, saveChat });

		await expect(
			batchSaveChatMessageTextEdits({
				edits: [
					{
						messageId: 0,
						messageText: "Hidden edited",
						swipeId: 1,
					},
				],
			}),
		).resolves.toEqual({ messageIds: [0], ok: true });

		expect(chat[0].mes).toBe("Visible current");
		expect(chat[0].swipes).toEqual(["Visible current", "Hidden edited"]);
		expect(saveChat).toHaveBeenCalledTimes(1);
	});

	test("batch edit rejects invalid explicit swipe ids before mutating chat", async () => {
		const saveChat = vi.fn(async () => undefined);
		const chat: TestMessage[] = [
			{
				is_user: false,
				mes: "Visible current",
				swipe_id: 0,
				swipes: ["Visible current"],
			},
		];
		setSillyTavernContext({ chat, saveChat });

		await expect(
			batchSaveChatMessageTextEdits({
				edits: [
					{
						messageId: 0,
						messageText: "Nope",
						swipeId: 3,
					},
				],
			}),
		).resolves.toEqual({
			ok: false,
			reason: "invalid-message-id",
		});

		expect(chat[0].mes).toBe("Visible current");
		expect(chat[0].swipes).toEqual(["Visible current"]);
		expect(saveChat).not.toHaveBeenCalled();
	});

	test("batch edit restores original chat messages when save fails", async () => {
		const chat: TestMessage[] = [
			{
				extra: { display_text: "Translated original" },
				is_user: true,
				mes: "Original",
				swipe_id: 0,
				swipes: ["Original", "Hidden"],
			},
		];
		const saveChat = vi.fn(async () => {
			throw new Error("disk full");
		});
		setSillyTavernContext({ chat, saveChat });

		await expect(
			batchSaveChatMessageTextEdits({
				edits: [{ messageId: 0, messageText: "Changed", swipeId: 1 }],
			}),
		).resolves.toEqual({
			ok: false,
			reason: "save-failed",
		});

		expect(chat[0].mes).toBe("Original");
		expect(chat[0].swipes?.[0]).toBe("Original");
		expect(chat[0].swipes?.[1]).toBe("Hidden");
		expect(chat[0].extra?.display_text).toBe("Translated original");
		expect(saveChat).toHaveBeenCalledTimes(1);
	});
});
