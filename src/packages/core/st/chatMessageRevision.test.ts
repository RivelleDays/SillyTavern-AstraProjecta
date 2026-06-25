import { describe, expect, test, vi } from "vitest";

import {
	applyChatMessageRevisionPath,
	createChatMessageRevisionStore,
	readChatMessageRevisionSnapshot,
} from "@/packages/core/st/chatMessageRevision";

type Listener = (...args: unknown[]) => void;

type TestRevisionNode = {
	active?: number[] | null;
	createdAt?: number;
	fullText?: string;
	kind?: string;
	mes?: string;
	parent?: number[];
	swipes?: TestRevisionNode[];
};

type TestMessage = {
	_astraContinueCachedText?: string;
	astra_projecta?: {
		revisionHistory?: {
			roots?: TestRevisionNode[];
		};
	};
	continueHistory?: TestRevisionNode[];
	continueSwipe?: TestRevisionNode;
	continueSwipeId?: number;
	extra?: Record<string, unknown>;
	is_system?: boolean;
	is_user: boolean;
	mes?: string;
	name?: string;
	swipe_id?: number;
	swipes?: string[];
};

const XSS_PAYLOADS = [
	"<img src=x onerror=alert(1)>",
	"<svg onload=alert(1)>",
	'<a href="javascript:alert(1)">link</a>',
	"<script>alert(1)</script>",
] as const;

function createEventSourceStub() {
	const listeners = new Map<string, Set<Listener>>();

	return {
		emit(event: string, ...args: unknown[]) {
			const activeListeners = listeners.get(event);
			if (!activeListeners) {
				return;
			}

			for (const listener of activeListeners) {
				listener(...args);
			}
		},
		listenerCount(event: string) {
			return listeners.get(event)?.size ?? 0;
		},
		on(event: string, listener: Listener) {
			const activeListeners = listeners.get(event) ?? new Set<Listener>();
			activeListeners.add(listener);
			listeners.set(event, activeListeners);
		},
		removeListener(event: string, listener: Listener) {
			listeners.get(event)?.delete(listener);
		},
	};
}

function setSillyTavernContext(context: unknown | { current: unknown }) {
	const contextRef =
		typeof context === "object" && context !== null && "current" in context
			? context
			: { current: context };

	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => contextRef.current,
	};
}

function createIdleSnapshot(updatedAt = 0) {
	return {
		canContinue: false,
		canRegenerate: false,
		canUndo: false,
		isBusy: false,
		messageId: null,
		status: "idle" as const,
		updatedAt,
	};
}

function expectAstraHistory(message: TestMessage): TestRevisionNode[] {
	const roots = message.astra_projecta?.revisionHistory?.roots;
	expect(roots).toBeDefined();
	return roots ?? [];
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

function createRevisionMessage(revisionText: string): TestMessage {
	return {
		continueHistory: [
			{
				active: [0],
				fullText: "Original",
				kind: "origin",
				mes: "Original",
				parent: [],
				swipes: [
					{
						fullText: revisionText,
						kind: "edit",
						mes: revisionText,
						parent: [0],
						swipes: [],
					},
				],
			},
		],
		is_user: false,
		mes: "Original",
		name: "Assistant",
		swipe_id: 0,
		swipes: ["Original"],
	};
}

function expectNoExecutableMarkup(target: Element): void {
	expect(target.querySelector("img, svg, a, script")).toBeNull();
}

describe("chat message revision adapter", () => {
	test("stays idle for empty, user, small-system, and disabled last messages", () => {
		setSillyTavernContext({ chat: [], Generate: vi.fn() });
		expect(readChatMessageRevisionSnapshot()).toEqual(createIdleSnapshot());

		setSillyTavernContext({
			chat: [{ is_user: true, mes: "hello" }],
			Generate: vi.fn(),
		});
		expect(readChatMessageRevisionSnapshot()).toEqual(createIdleSnapshot());

		setSillyTavernContext({
			chat: [{ extra: { isSmallSys: true }, is_user: false }],
			Generate: vi.fn(),
		});
		expect(readChatMessageRevisionSnapshot()).toEqual(createIdleSnapshot());

		setSillyTavernContext({
			chat: [{ extra: { swipeable: false }, is_user: false }],
			Generate: vi.fn(),
		});
		expect(readChatMessageRevisionSnapshot()).toEqual(createIdleSnapshot());
	});

	test("reads revision action availability without hydrating history data", () => {
		const message: TestMessage = {
			is_user: false,
			mes: "Base response",
			swipe_id: 0,
			swipes: ["Base response"],
		};
		setSillyTavernContext({
			chat: [{ is_user: true, mes: "hello" }, message],
			Generate: vi.fn(),
		});

		expect(readChatMessageRevisionSnapshot()).toMatchObject({
			canContinue: true,
			canRegenerate: true,
			canUndo: false,
			isBusy: false,
			messageId: 1,
			status: "ready",
		});
		expect(message.continueHistory).toBeUndefined();
		expect(message.astra_projecta).toBeUndefined();
		expect(message.continueSwipeId).toBeUndefined();
		expect(message.continueSwipe).toBeUndefined();
	});

	test("records a manual edit from the first observed message baseline", () => {
		const eventSource = createEventSourceStub();
		const message: TestMessage = {
			is_user: false,
			mes: "Original",
			swipe_id: 0,
			swipes: ["Original"],
		};
		setSillyTavernContext({
			chat: [message],
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
			},
			Generate: vi.fn(),
			saveChatConditional: vi.fn(),
		});
		const store = createChatMessageRevisionStore();

		message.mes = "Original edited";
		message.swipes = ["Original edited"];
		eventSource.emit("message_edited", 0);

		const rootRevision = expectAstraHistory(message)[0];
		expect(rootRevision).toMatchObject({
			active: [0, 0],
			fullText: "Original",
			kind: "origin",
			mes: "Original",
			parent: [],
		});
		expect(rootRevision.swipes?.[0]).toMatchObject({
			fullText: "Original edited",
			kind: "edit",
			mes: " edited",
			parent: [0],
		});

		store.dispose();
	});

	test("writes namespaced history when undoing a legacy child revision", async () => {
		const saveChatConditional = vi.fn();
		const legacyRoot: TestRevisionNode = {
			active: [0, 0],
			fullText: "Base response",
			kind: "origin",
			mes: "Base response",
			parent: [],
			swipes: [
				{
					fullText: "Base response More",
					kind: "continue",
					mes: " More",
					parent: [0],
					swipes: [],
				},
			],
		};
		const message: TestMessage = {
			continueHistory: [legacyRoot],
			is_user: false,
			mes: "Base response More",
			swipe_id: 0,
			swipes: ["Base response More"],
		};
		setSillyTavernContext({
			chat: [message],
			eventSource: { emit: vi.fn() },
			eventTypes: { MESSAGE_EDITED: "message_edited" },
			Generate: vi.fn(),
			saveChatConditional,
		});
		const store = createChatMessageRevisionStore();

		await expect(store.undoLastRevision()).resolves.toBe(true);

		expect(message.mes).toBe("Base response");
		expect(message.swipes?.[0]).toBe("Base response");
		expect(expectAstraHistory(message)[0].active).toEqual([0]);
		expect(message.continueHistory?.[0]).toBe(legacyRoot);
		expect(message.continueHistory?.[0].active).toEqual([0, 0]);
		expect(message.continueSwipeId).toBeUndefined();
		expect(message.continueSwipe).toBeUndefined();
		expect(saveChatConditional).toHaveBeenCalledTimes(1);

		store.dispose();
	});

	test("undoes the active namespaced child revision and saves the chat", async () => {
		const saveChatConditional = vi.fn();
		const message: TestMessage = {
			astra_projecta: {
				revisionHistory: {
					roots: [
						{
							active: [0, 0],
							fullText: "Base response",
							kind: "origin",
							mes: "Base response",
							parent: [],
							swipes: [
								{
									fullText: "Base response More",
									kind: "continue",
									mes: " More",
									parent: [0],
									swipes: [],
								},
							],
						},
					],
				},
			},
			is_user: false,
			mes: "Base response More",
			swipe_id: 0,
			swipes: ["Base response More"],
		};
		setSillyTavernContext({
			chat: [message],
			eventSource: { emit: vi.fn() },
			eventTypes: { MESSAGE_EDITED: "message_edited" },
			Generate: vi.fn(),
			saveChatConditional,
		});
		const store = createChatMessageRevisionStore();

		await expect(store.undoLastRevision()).resolves.toBe(true);

		expect(message.mes).toBe("Base response");
		expect(message.swipes?.[0]).toBe("Base response");
		expect(expectAstraHistory(message)[0].active).toEqual([0]);
		expect(message.continueSwipeId).toBeUndefined();
		expect(message.continueSwipe).toBeUndefined();
		expect(saveChatConditional).toHaveBeenCalledTimes(1);

		store.dispose();
	});

	test("regenerates root revisions with swipe generation and child revisions with continue generation", async () => {
		const eventSource = createEventSourceStub();
		const generate = vi.fn();
		const rootMessage: TestMessage = {
			is_user: false,
			mes: "Root",
			swipe_id: 0,
			swipes: ["Root"],
		};
		setSillyTavernContext({
			chat: [rootMessage],
			eventSource,
			eventTypes: {
				CHARACTER_MESSAGE_RENDERED: "character_message_rendered",
				GENERATION_STARTED: "generation_started",
				GENERATION_STOPPED: "generation_stopped",
			},
			Generate: generate,
		});
		let store = createChatMessageRevisionStore();

		await expect(store.regenerateLastRevision()).resolves.toBe(true);
		eventSource.emit("generation_started", "swipe", {}, false);
		rootMessage.mes = "Regenerated root";
		eventSource.emit("character_message_rendered", 0);

		expect(generate).toHaveBeenLastCalledWith("swipe");
		expect(rootMessage.mes).toBe("Regenerated root");
		expect(rootMessage.swipes?.[0]).toBe("Regenerated root");
		expect(expectAstraHistory(rootMessage)[0]).toMatchObject({
			active: [0, 0],
			fullText: "Root",
			kind: "origin",
			mes: "Root",
			parent: [],
			swipes: [
				expect.objectContaining({
					fullText: "Regenerated root",
					kind: "regenerate",
					mes: "Regenerated root",
					parent: [0],
				}),
			],
		});

		expect(
			applyChatMessageRevisionPath({
				messageId: 0,
				path: [0],
			}),
		).toBe(true);
		expect(rootMessage.mes).toBe("Root");
		expect(rootMessage.swipes?.[0]).toBe("Root");
		expect(expectAstraHistory(rootMessage)[0].active).toEqual([0]);
		store.dispose();

		const childMessage: TestMessage = {
			is_user: false,
			mes: "Root Child",
			swipe_id: 0,
			continueHistory: [
				{
					active: [0, 0],
					fullText: "Root",
					kind: "origin",
					mes: "Root",
					parent: [],
					swipes: [
						{
							fullText: "Root Child",
							kind: "continue",
							mes: " Child",
							parent: [0],
							swipes: [],
						},
					],
				},
			],
		};
		setSillyTavernContext({
			chat: [childMessage],
			Generate: generate,
		});
		store = createChatMessageRevisionStore();

		await expect(store.regenerateLastRevision()).resolves.toBe(true);

		expect(generate).toHaveBeenLastCalledWith("continue");
		expect(childMessage.mes).toBe("Root");
		expect(expectAstraHistory(childMessage)[0].active).toEqual([0]);
		expect(childMessage.continueSwipeId).toBeUndefined();
		expect(childMessage.continueSwipe).toBeUndefined();

		store.dispose();
	});

	test("records root regenerate after swipe generation resolves without a render event", async () => {
		const saveChatConditional = vi.fn();
		const rootMessage: TestMessage = {
			is_user: false,
			mes: "Root",
			swipe_id: 0,
			swipes: ["Root"],
		};
		const generate = vi.fn(async (type: string) => {
			expect(type).toBe("swipe");
			rootMessage.mes = "Regenerated root";
			rootMessage.swipes = ["Regenerated root"];
		});
		setSillyTavernContext({
			chat: [rootMessage],
			Generate: generate,
			saveChatConditional,
		});
		const store = createChatMessageRevisionStore();

		await expect(store.regenerateLastRevision()).resolves.toBe(true);

		const rootRevision = expectAstraHistory(rootMessage)[0];
		expect(rootMessage.mes).toBe("Regenerated root");
		expect(rootMessage.swipes?.[0]).toBe("Regenerated root");
		expect(rootRevision).toMatchObject({
			active: [0, 0],
			fullText: "Root",
			kind: "origin",
			mes: "Root",
			parent: [],
		});
		expect(rootRevision.swipes).toHaveLength(1);
		expect(rootRevision.swipes?.[0]).toMatchObject({
			fullText: "Regenerated root",
			kind: "regenerate",
			mes: "Regenerated root",
			parent: [0],
		});
		expect(saveChatConditional).toHaveBeenCalledTimes(1);

		store.dispose();
	});

	test("does not duplicate root regenerate when render handling already recorded it", async () => {
		const eventSource = createEventSourceStub();
		const saveChatConditional = vi.fn();
		const rootMessage: TestMessage = {
			is_user: false,
			mes: "Root",
			swipe_id: 0,
			swipes: ["Root"],
		};
		const generate = vi.fn(async () => {
			eventSource.emit("generation_started", "swipe", {}, false);
			rootMessage.mes = "Regenerated root";
			rootMessage.swipes = ["Regenerated root"];
			eventSource.emit("character_message_rendered", 0);
		});
		setSillyTavernContext({
			chat: [rootMessage],
			eventSource,
			eventTypes: {
				CHARACTER_MESSAGE_RENDERED: "character_message_rendered",
				GENERATION_STARTED: "generation_started",
			},
			Generate: generate,
			saveChatConditional,
		});
		const store = createChatMessageRevisionStore();

		await expect(store.regenerateLastRevision()).resolves.toBe(true);

		const rootRevision = expectAstraHistory(rootMessage)[0];
		expect(rootRevision.swipes).toHaveLength(1);
		expect(rootRevision.active).toEqual([0, 0]);
		expect(saveChatConditional).toHaveBeenCalledTimes(1);

		store.dispose();
	});

	test("keeps root regenerate as a child when generation stops before render", async () => {
		const eventSource = createEventSourceStub();
		const saveChatConditional = vi.fn();
		const rootMessage: TestMessage = {
			is_user: false,
			mes: "Root",
			swipe_id: 0,
			swipes: ["Root"],
		};
		const generate = vi.fn(async () => {
			eventSource.emit("generation_started", "swipe", {}, false);
			eventSource.emit("generation_stopped");
			rootMessage.mes = "Regenerated root";
			rootMessage.swipes = ["Regenerated root"];
			eventSource.emit("character_message_rendered", 0);
		});
		setSillyTavernContext({
			chat: [rootMessage],
			eventSource,
			eventTypes: {
				CHARACTER_MESSAGE_RENDERED: "character_message_rendered",
				GENERATION_STARTED: "generation_started",
				GENERATION_STOPPED: "generation_stopped",
			},
			Generate: generate,
			saveChatConditional,
		});
		const store = createChatMessageRevisionStore();

		await expect(store.regenerateLastRevision()).resolves.toBe(true);

		const rootRevision = expectAstraHistory(rootMessage)[0];
		expect(rootMessage.mes).toBe("Regenerated root");
		expect(rootMessage.swipes?.[0]).toBe("Regenerated root");
		expect(rootRevision).toMatchObject({
			active: [0, 0],
			fullText: "Root",
			kind: "origin",
			mes: "Root",
			parent: [],
		});
		expect(rootRevision.swipes).toHaveLength(1);
		expect(rootRevision.swipes?.[0]).toMatchObject({
			fullText: "Regenerated root",
			kind: "regenerate",
			mes: "Regenerated root",
			parent: [0],
		});
		expect(saveChatConditional).toHaveBeenCalledTimes(1);

		store.dispose();
	});

	test("keeps child regenerate marked as regenerate when generation stops before render", async () => {
		const eventSource = createEventSourceStub();
		const saveChatConditional = vi.fn();
		const message: TestMessage = {
			astra_projecta: {
				revisionHistory: {
					roots: [
						{
							active: [0, 0],
							fullText: "Root",
							kind: "origin",
							mes: "Root",
							parent: [],
							swipes: [
								{
									fullText: "Root Child",
									kind: "continue",
									mes: " Child",
									parent: [0],
									swipes: [],
								},
							],
						},
					],
				},
			},
			is_user: false,
			mes: "Root Child",
			swipe_id: 0,
			swipes: ["Root Child"],
		};
		const generate = vi.fn(async () => {
			eventSource.emit("generation_started", "continue", {}, false);
			eventSource.emit("generation_stopped");
			message.mes = "Root Regenerated child";
			message.swipes = ["Root Regenerated child"];
			eventSource.emit("character_message_rendered", 0);
		});
		setSillyTavernContext({
			chat: [message],
			eventSource,
			eventTypes: {
				CHARACTER_MESSAGE_RENDERED: "character_message_rendered",
				GENERATION_STARTED: "generation_started",
				GENERATION_STOPPED: "generation_stopped",
			},
			Generate: generate,
			saveChatConditional,
		});
		const store = createChatMessageRevisionStore();

		await expect(store.regenerateLastRevision()).resolves.toBe(true);

		const rootRevision = expectAstraHistory(message)[0];
		expect(rootRevision.active).toEqual([0, 1]);
		expect(rootRevision.swipes).toHaveLength(2);
		expect(rootRevision.swipes?.[0]).toMatchObject({
			fullText: "Root Child",
			kind: "continue",
			parent: [0],
		});
		expect(rootRevision.swipes?.[1]).toMatchObject({
			fullText: "Root Regenerated child",
			kind: "regenerate",
			mes: " Regenerated child",
			parent: [0],
		});
		expect(message.swipes?.[0]).toBe("Root Regenerated child");
		expect(saveChatConditional).toHaveBeenCalledTimes(1);

		store.dispose();
	});

	test("regenerates an active root replacement as a sibling revision", async () => {
		const saveChatConditional = vi.fn();
		const message: TestMessage = {
			astra_projecta: {
				revisionHistory: {
					roots: [
						{
							active: [0, 0],
							fullText: "Root",
							kind: "origin",
							mes: "Root",
							parent: [],
							swipes: [
								{
									fullText: "First regenerated root",
									kind: "regenerate",
									mes: "First regenerated root",
									parent: [0],
									swipes: [],
								},
							],
						},
					],
				},
			},
			is_user: false,
			mes: "First regenerated root",
			swipe_id: 0,
			swipes: ["First regenerated root"],
		};
		const generate = vi.fn(async (type: string) => {
			expect(type).toBe("swipe");
			message.mes = "Second regenerated root";
			message.swipes = ["Second regenerated root"];
		});
		setSillyTavernContext({
			chat: [message],
			Generate: generate,
			saveChatConditional,
		});
		const store = createChatMessageRevisionStore();

		await expect(store.regenerateLastRevision()).resolves.toBe(true);

		const rootRevision = expectAstraHistory(message)[0];
		expect(generate).toHaveBeenCalledWith("swipe");
		expect(rootRevision.active).toEqual([0, 1]);
		expect(rootRevision.swipes).toHaveLength(2);
		expect(rootRevision.swipes?.[0]).toMatchObject({
			fullText: "First regenerated root",
			kind: "regenerate",
			parent: [0],
		});
		expect(rootRevision.swipes?.[1]).toMatchObject({
			fullText: "Second regenerated root",
			kind: "regenerate",
			mes: "Second regenerated root",
			parent: [0],
		});
		expect(message.swipes?.[0]).toBe("Second regenerated root");
		expect(message.continueSwipeId).toBeUndefined();
		expect(message.continueSwipe).toBeUndefined();
		expect(saveChatConditional).toHaveBeenCalledTimes(1);

		store.dispose();
	});

	test("records continue and edit revisions under the active regenerated root", async () => {
		const eventSource = createEventSourceStub();
		const saveChatConditional = vi.fn();
		const generate = vi.fn();
		const message: TestMessage = {
			astra_projecta: {
				revisionHistory: {
					roots: [
						{
							active: [0, 0],
							fullText: "Root",
							kind: "origin",
							mes: "Root",
							parent: [],
							swipes: [
								{
									fullText: "Regenerated root",
									kind: "regenerate",
									mes: "Regenerated root",
									parent: [0],
									swipes: [],
								},
							],
						},
					],
				},
			},
			is_user: false,
			mes: "Regenerated root",
			swipe_id: 0,
			swipes: ["Regenerated root"],
		};
		setSillyTavernContext({
			chat: [message],
			eventSource,
			eventTypes: {
				CHARACTER_MESSAGE_RENDERED: "character_message_rendered",
				GENERATION_STARTED: "generation_started",
				MESSAGE_EDITED: "message_edited",
			},
			Generate: generate,
			saveChatConditional,
		});
		const store = createChatMessageRevisionStore();

		await expect(store.continueLastMessage()).resolves.toBe(true);
		eventSource.emit("generation_started", "continue", {}, false);
		message.mes = "Regenerated root Continued";
		eventSource.emit("character_message_rendered", 0);

		const regeneratedRevision = expectAstraHistory(message)[0].swipes?.[0];
		expect(regeneratedRevision?.swipes?.[0]).toMatchObject({
			fullText: "Regenerated root Continued",
			kind: "continue",
			mes: " Continued",
			parent: [0, 0],
		});
		expect(expectAstraHistory(message)[0].active).toEqual([0, 0, 0]);

		message.mes = "Regenerated root Continued edited";
		eventSource.emit("message_edited", 0);

		expect(regeneratedRevision?.swipes?.[0]?.swipes?.[0]).toMatchObject({
			fullText: "Regenerated root Continued edited",
			kind: "edit",
			mes: " edited",
			parent: [0, 0, 0],
		});
		expect(expectAstraHistory(message)[0].active).toEqual([0, 0, 0, 0]);
		expect(message.swipes?.[0]).toBe("Regenerated root Continued edited");
		expect(message.continueSwipeId).toBeUndefined();
		expect(message.continueSwipe).toBeUndefined();

		store.dispose();
	});

	test("applies a selected Astra revision path and syncs formatted system text plus active swipe text", () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block">
                        <div class="mes_text">System base</div>
                    </div>
                </div>
            </div>
        `;
		const saveChatConditional = vi.fn();
		const eventSource = { emit: vi.fn() };
		const messageFormatting = vi.fn(
			(
				value: string,
				_name: unknown,
				isSystem: boolean,
				isUser: unknown,
			) =>
				`${isSystem ? "system" : "not-system"}:${isUser ? "user" : "not-user"}:${value}`,
		);
		const message: TestMessage = {
			is_system: true,
			is_user: false,
			mes: "System base",
			name: "System",
			swipe_id: 0,
			swipes: ["System base"],
			continueHistory: [
				{
					active: [0, 0],
					fullText: "System base",
					kind: "origin",
					mes: "System base",
					parent: [],
					swipes: [
						{
							fullText: "System base edited",
							kind: "edit",
							mes: " edited",
							parent: [0],
							swipes: [],
						},
					],
				},
			],
		};
		setSillyTavernContext({
			chat: [message],
			eventSource,
			eventTypes: { MESSAGE_EDITED: "message_edited" },
			messageFormatting,
			saveChatConditional,
			substituteParams: (value: string) => value,
		});

		expect(
			applyChatMessageRevisionPath({
				messageId: 0,
				path: [0, 0],
			}),
		).toBe(true);

		expect(message.mes).toBe("System base edited");
		expect(message.swipes?.[0]).toBe("System base edited");
		expect(expectAstraHistory(message)[0].active).toEqual([0, 0]);
		expect(message.continueHistory?.[0].active).toEqual([0, 0]);
		expect(message.continueSwipeId).toBeUndefined();
		expect(message.continueSwipe).toBeUndefined();
		expect(document.querySelector(".mes_text")?.innerHTML).toBe(
			"system:not-user:System base edited",
		);
		expect(messageFormatting).toHaveBeenCalledWith(
			"System base edited",
			"System",
			true,
			false,
			0,
		);
		expect(saveChatConditional).toHaveBeenCalledTimes(1);
		expect(eventSource.emit).toHaveBeenCalledWith("message_edited", 0);
	});

	test("keeps formatted revision fallback output as SillyTavern HTML", () => {
		const target = renderMessageTarget();
		const message = createRevisionMessage("Formatted body");
		setSillyTavernContext({
			chat: [message],
			messageFormatting: (value: string) => `<p>${value}</p>`,
			saveChatConditional: vi.fn(),
			substituteParams: (value: string) => value,
		});

		expect(
			applyChatMessageRevisionPath({
				messageId: 0,
				path: [0, 0],
			}),
		).toBe(true);
		expect(target.innerHTML).toBe("<p>Formatted body</p>");
	});

	test.each(XSS_PAYLOADS)(
		"writes formatter-missing revision fallback payload as text: %s",
		(payload) => {
			const target = renderMessageTarget();
			const message = createRevisionMessage(payload);
			setSillyTavernContext({
				chat: [message],
				saveChatConditional: vi.fn(),
				substituteParams: (value: string) => value,
			});

			expect(
				applyChatMessageRevisionPath({
					messageId: 0,
					path: [0, 0],
				}),
			).toBe(true);
			expect(target.textContent).toBe(payload);
			expectNoExecutableMarkup(target);
		},
	);

	test("writes formatter-throwing revision fallback payload as text", () => {
		const target = renderMessageTarget();
		const payload = '<a href="javascript:alert(1)">link</a>';
		const message = createRevisionMessage(payload);
		setSillyTavernContext({
			chat: [message],
			messageFormatting: () => {
				throw new Error("formatter unavailable");
			},
			saveChatConditional: vi.fn(),
			substituteParams: (value: string) => value,
		});

		expect(() =>
			applyChatMessageRevisionPath({
				messageId: 0,
				path: [0, 0],
			}),
		).not.toThrow();
		expect(target.textContent).toBe(payload);
		expectNoExecutableMarkup(target);
	});

	test("does not apply a selected revision while native generation is busy", () => {
		document.body.innerHTML = `
            <button class="mes_stop">Stop</button>
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block">
                        <div class="mes_text">Base edited</div>
                    </div>
                </div>
            </div>
        `;
		const stopButton = document.querySelector(".mes_stop");
		Object.defineProperty(stopButton, "offsetHeight", {
			configurable: true,
			value: 1,
		});
		const saveChatConditional = vi.fn();
		const eventSource = { emit: vi.fn() };
		const message: TestMessage = {
			astra_projecta: {
				revisionHistory: {
					roots: [
						{
							active: [0, 0],
							fullText: "Base",
							kind: "origin",
							mes: "Base",
							parent: [],
							swipes: [
								{
									fullText: "Base edited",
									kind: "edit",
									mes: " edited",
									parent: [0],
									swipes: [],
								},
							],
						},
					],
				},
			},
			is_user: false,
			mes: "Base edited",
			swipe_id: 0,
			swipes: ["Base edited"],
		};
		setSillyTavernContext({
			chat: [message],
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_SWIPED: "message_swiped",
			},
			messageFormatting: (value: string) => value,
			saveChatConditional,
			substituteParams: (value: string) => value,
		});

		expect(
			applyChatMessageRevisionPath({
				messageId: 0,
				path: [0],
			}),
		).toBe(false);

		expect(message.mes).toBe("Base edited");
		expect(message.swipes?.[0]).toBe("Base edited");
		expect(expectAstraHistory(message)[0].active).toEqual([0, 0]);
		expect(document.querySelector(".mes_text")?.innerHTML).toBe(
			"Base edited",
		);
		expect(saveChatConditional).not.toHaveBeenCalled();
		expect(eventSource.emit).not.toHaveBeenCalled();
	});

	test("applies a native swipe path and emits swipe plus edit events", () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block">
                        <div class="mes_text">Second</div>
                    </div>
                </div>
            </div>
        `;
		const saveChatConditional = vi.fn();
		const eventSource = { emit: vi.fn() };
		const message: TestMessage = {
			is_user: false,
			mes: "Second",
			name: "Assistant",
			swipe_id: 1,
			swipes: ["First", "Second"],
		};
		setSillyTavernContext({
			chat: [message],
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
				MESSAGE_SWIPED: "message_swiped",
			},
			messageFormatting: (value: string) => value,
			saveChatConditional,
			substituteParams: (value: string) => value,
		});

		expect(
			applyChatMessageRevisionPath({
				messageId: 0,
				path: [0],
			}),
		).toBe(true);

		expect(message.mes).toBe("First");
		expect(message.swipe_id).toBe(0);
		expect(message.swipes?.[0]).toBe("First");
		expect(expectAstraHistory(message)[0].active).toEqual([0]);
		expect(document.querySelector(".mes_text")?.innerHTML).toBe("First");
		expect(saveChatConditional).toHaveBeenCalledTimes(1);
		expect(eventSource.emit).toHaveBeenCalledWith("message_swiped", 0);
		expect(eventSource.emit).toHaveBeenCalledWith("message_edited", 0);
	});

	test("continues the last message through the native generator", async () => {
		const generate = vi.fn();
		setSillyTavernContext({
			chat: [{ is_user: false, mes: "Root" }],
			Generate: generate,
		});
		const store = createChatMessageRevisionStore();

		await expect(store.continueLastMessage()).resolves.toBe(true);

		expect(generate).toHaveBeenCalledWith("continue");

		store.dispose();
	});

	test("records generated continue and edit changes into namespaced history without writing on native swipe", () => {
		const eventSource = createEventSourceStub();
		const message: TestMessage = {
			is_user: false,
			mes: "Root",
			swipe_id: 0,
			swipes: ["Root"],
		};
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				chat: [message],
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHARACTER_MESSAGE_RENDERED: "character_message_rendered",
					GENERATION_STARTED: "generation_started",
					GENERATION_STOPPED: "generation_stopped",
					MESSAGE_EDITED: "message_edited",
					MESSAGE_SWIPED: "message_swiped",
					USER_MESSAGE_RENDERED: "user_message_rendered",
				},
				Generate: vi.fn(),
				saveChatConditional: vi.fn(),
			},
		};
		setSillyTavernContext(contextRef);
		const store = createChatMessageRevisionStore();

		eventSource.emit("generation_started", "continue", {}, false);
		message.mes = "Root Added";
		eventSource.emit("character_message_rendered", 0);

		const history = expectAstraHistory(message);
		expect(history[0].active).toEqual([0, 0]);
		expect(history[0].swipes?.[0]).toMatchObject({
			fullText: "Root Added",
			kind: "continue",
			mes: " Added",
			parent: [0],
		});

		message.mes = "Root Edited";
		eventSource.emit("message_edited", 0);

		expect(history[0].active).toEqual([0, 1]);
		expect(history[0].swipes?.[1]).toMatchObject({
			fullText: "Root Edited",
			kind: "edit",
			mes: " Edited",
			parent: [0],
		});

		message.swipe_id = 1;
		message.swipes = ["Root Edited", "Alternate"];
		message.mes = "Alternate";
		eventSource.emit("message_swiped", 0);

		expect(history[1]).toBeUndefined();
		expect(message.continueHistory).toBeUndefined();
		expect(message.continueSwipeId).toBeUndefined();
		expect(message.continueSwipe).toBeUndefined();

		store.dispose();
	});

	test("removes matching namespaced revision root when a native swipe is deleted", () => {
		const eventSource = createEventSourceStub();
		const message: TestMessage = {
			astra_projecta: {
				revisionHistory: {
					roots: [
						{
							active: [0],
							fullText: "First",
							kind: "origin",
							mes: "First",
							parent: [],
							swipes: [],
						},
						{
							active: [1, 0],
							fullText: "Second",
							kind: "origin",
							mes: "Second",
							parent: [],
							swipes: [
								{
									fullText: "Second edited",
									kind: "edit",
									mes: " edited",
									parent: [1],
									swipes: [],
								},
							],
						},
						{
							active: [2],
							fullText: "Third",
							kind: "origin",
							mes: "Third",
							parent: [],
							swipes: [],
						},
					],
				},
			},
			is_user: false,
			mes: "Third",
			swipe_id: 1,
			swipes: ["First", "Third"],
		};
		setSillyTavernContext({
			chat: [message],
			eventSource,
			eventTypes: { MESSAGE_SWIPE_DELETED: "message_swipe_deleted" },
			Generate: vi.fn(),
		});
		const store = createChatMessageRevisionStore();

		eventSource.emit("message_swipe_deleted", 0, 1);

		const history = expectAstraHistory(message);
		expect(history).toHaveLength(2);
		expect(history[0]).toMatchObject({
			active: [0],
			fullText: "First",
			parent: [],
		});
		expect(history[1]).toMatchObject({
			active: [1],
			fullText: "Third",
			parent: [],
		});
		expect(history[1].swipes).toEqual([]);

		store.dispose();
	});

	test("refreshes subscribers on SillyTavern events and removes listeners on dispose", () => {
		const eventSource = createEventSourceStub();
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				chat: [{ is_user: false, mes: "Root" }],
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					CHARACTER_MESSAGE_RENDERED: "character_message_rendered",
					GENERATION_STARTED: "generation_started",
					GENERATION_STOPPED: "generation_stopped",
					MESSAGE_DELETED: "message_deleted",
					MESSAGE_EDITED: "message_edited",
					MESSAGE_SWIPED: "message_swiped",
					MESSAGE_UPDATED: "message_updated",
					USER_MESSAGE_RENDERED: "user_message_rendered",
				},
				Generate: vi.fn(),
			},
		};
		setSillyTavernContext(contextRef);
		const listener = vi.fn();
		const store = createChatMessageRevisionStore();

		store.subscribe(listener);
		expect(eventSource.listenerCount("message_edited")).toBe(1);

		contextRef.current = {
			...contextRef.current,
			chat: [
				{
					is_user: false,
					mes: "Root Child",
					continueHistory: [
						{
							active: [0, 0],
							fullText: "Root",
							kind: "origin",
							mes: "Root",
							parent: [],
							swipes: [
								{
									fullText: "Root Child",
									kind: "continue",
									mes: " Child",
									parent: [0],
									swipes: [],
								},
							],
						},
					],
				},
			],
		};
		eventSource.emit("message_edited", 0);

		expect(listener).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			canUndo: true,
			messageId: 0,
			status: "ready",
		});

		store.dispose();
		expect(eventSource.listenerCount("message_edited")).toBe(0);

		eventSource.emit("message_edited", 0);
		expect(listener).toHaveBeenCalledTimes(1);
	});
});
