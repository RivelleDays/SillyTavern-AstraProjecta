import { describe, expect, test, vi } from "vitest";

import {
	type ChatMessageRevisionHistoryItem,
	createChatMessageRevisionHistoryStore,
	readChatMessageRevisionHistorySnapshot,
} from "@/packages/core/st/chatMessageRevisionHistory";

type Listener = (...args: unknown[]) => void;

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

function renderMessageDom() {
	document.body.innerHTML = `
        <div id="chat">
            <div class="mes" mesid="0">
                <div class="mesAvatarWrapper">
                    <div class="avatar"><img src="/user-avatar.png" /></div>
                    <div class="mesIDDisplay">#0</div>
                </div>
                <div class="mes_block"><div class="ch_name">User</div></div>
            </div>
            <div class="mes" mesid="1">
                <div class="mesAvatarWrapper">
                    <div class="avatar"><img src="/assistant-avatar.png" /></div>
                    <div class="mesIDDisplay">#1</div>
                </div>
                <div class="mes_block"><div class="ch_name">Assistant</div></div>
            </div>
            <div class="mes" mesid="2">
                <div class="mesAvatarWrapper">
                    <div class="avatar"><img src="/system-avatar.png" /></div>
                    <div class="mesIDDisplay">#2</div>
                </div>
                <div class="mes_block"><div class="ch_name">System</div></div>
            </div>
            <div class="mes" mesid="3">
                <div class="mesAvatarWrapper">
                    <div class="avatar"><img src="/plain-avatar.png" /></div>
                    <div class="mesIDDisplay">#3</div>
                </div>
                <div class="mes_block"><div class="ch_name">Plain</div></div>
            </div>
        </div>
    `;
}

function byId(items: ChatMessageRevisionHistoryItem[], messageId: number) {
	return items.find((item) => item.messageId === messageId);
}

describe("chat message revision history adapter", () => {
	test("detects user, assistant, and system revision history for the active swipe without mutating chat data", () => {
		renderMessageDom();
		const chat = [
			{
				is_user: true,
				mes: "User edited",
				name: "User",
				swipe_id: 1,
				swipes: ["User first", "User alternate"],
				continueHistory: [
					{
						active: [0],
						fullText: "User first",
						mes: "User first",
						parent: [],
						swipes: [],
					},
					{
						active: [1, 0],
						fullText: "User alternate",
						mes: "User alternate",
						parent: [],
						swipes: [
							{
								fullText: "User edited",
								mes: " edited",
								parent: [1],
								swipes: [],
							},
						],
					},
				],
			},
			{
				is_user: false,
				mes: "Assistant edited",
				name: "Assistant",
				swipe_id: 0,
				continueHistory: [
					{
						active: [0, 0],
						fullText: "Assistant base",
						mes: "Assistant base",
						parent: [],
						swipes: [
							{
								fullText: "Assistant edited",
								mes: " edited",
								parent: [0],
								swipes: [],
							},
						],
					},
				],
			},
			{
				is_system: true,
				mes: "System edited",
				name: "System",
				swipe_id: 0,
				continueHistory: [
					{
						active: [0, 0],
						fullText: "System base",
						mes: "System base",
						parent: [],
						swipes: [],
					},
				],
			},
			{
				is_user: false,
				mes: "Plain",
				name: "Plain",
				swipe_id: 0,
				swipes: ["Plain"],
			},
		];
		const before = JSON.stringify(chat);

		const items = readChatMessageRevisionHistorySnapshot({
			context: { chat },
			documentRef: document,
		});

		expect(items.map((item) => item.messageId)).toEqual([0, 1, 2]);
		expect(byId(items, 0)).toMatchObject({
			avatarUrl: expect.stringContaining("/user-avatar.png"),
			hasHistory: true,
			messageDisplayId: "#0",
			senderName: "User",
			swipeIndex: 1,
			swipeTotal: 2,
		});
		expect(byId(items, 1)).toMatchObject({
			avatarUrl: expect.stringContaining("/assistant-avatar.png"),
			hasHistory: true,
			messageDisplayId: "#1",
			senderName: "Assistant",
			swipeIndex: 0,
			swipeTotal: 1,
		});
		expect(byId(items, 2)).toMatchObject({
			avatarUrl: expect.stringContaining("/system-avatar.png"),
			hasHistory: true,
			messageDisplayId: "#2",
			senderName: "System",
			swipeIndex: 0,
			swipeTotal: 1,
		});
		expect(JSON.stringify(chat)).toBe(before);
	});

	test("exposes native swipes alone as revision history without mutating chat data", () => {
		renderMessageDom();
		const chat = [
			{
				is_user: false,
				mes: "Alternate",
				name: "Assistant",
				swipe_id: 1,
				swipes: ["Base", "Alternate"],
			},
		];
		const before = JSON.stringify(chat);

		const items = readChatMessageRevisionHistorySnapshot({
			context: { chat },
			documentRef: document,
		});

		expect(items).toMatchObject([
			{
				hasHistory: true,
				messageId: 0,
				senderName: "Assistant",
				swipeIndex: 1,
				swipeTotal: 2,
			},
		]);
		expect(JSON.stringify(chat)).toBe(before);
	});

	test("keeps native swipe history visible when Astra revisions belong to a different swipe", () => {
		renderMessageDom();

		const items = readChatMessageRevisionHistorySnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Alternate",
						name: "Assistant",
						swipe_id: 1,
						swipes: ["Base", "Alternate"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Base",
								mes: "Base",
								parent: [],
								swipes: [
									{
										fullText: "Base edited",
										mes: " edited",
										parent: [0],
										swipes: [],
									},
								],
							},
							{
								active: [1],
								fullText: "Alternate",
								mes: "Alternate",
								parent: [],
								swipes: [],
							},
						],
					},
				],
			},
			documentRef: document,
		});

		expect(items).toMatchObject([
			{
				hasHistory: true,
				messageId: 0,
				senderName: "Assistant",
				swipeIndex: 1,
				swipeTotal: 2,
			},
		]);
	});

	test("detects namespaced Astra revision history before legacy continue history", () => {
		renderMessageDom();
		const chat = [
			{
				astra_projecta: {
					revisionHistory: {
						roots: [
							{
								active: [0, 0],
								fullText: "Namespaced base",
								kind: "origin",
								mes: "Namespaced base",
								parent: [],
								swipes: [
									{
										fullText: "Namespaced edit",
										kind: "edit",
										mes: " edit",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				},
				continueHistory: [
					{
						active: [0],
						fullText: "Legacy base",
						mes: "Legacy base",
						parent: [],
						swipes: [],
					},
				],
				is_user: false,
				mes: "Namespaced edit",
				name: "Assistant",
				swipe_id: 0,
				swipes: ["Namespaced edit"],
			},
		];
		const before = JSON.stringify(chat);

		const items = readChatMessageRevisionHistorySnapshot({
			context: { chat },
			documentRef: document,
		});

		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			hasHistory: true,
			messageId: 0,
			swipeIndex: 0,
		});
		expect(JSON.stringify(chat)).toBe(before);
	});

	test("falls back to message identity when DOM metadata is absent", () => {
		document.body.innerHTML = '<div id="chat"></div>';

		const items = readChatMessageRevisionHistorySnapshot({
			context: {
				chat: [
					{
						avatarUrl: "/message-avatar.png",
						is_user: false,
						mes: "Base edited",
						name: "Narrator",
						swipe_id: 0,
						swipes: ["Base"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Base",
								mes: "Base",
								parent: [],
								swipes: [
									{
										fullText: "Base edited",
										mes: " edited",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			documentRef: document,
		});

		expect(items).toEqual([
			expect.objectContaining({
				avatarUrl: "/message-avatar.png",
				messageDisplayId: "#0",
				messageId: 0,
				senderName: "Narrator",
			}),
		]);
	});

	test("uses name_text instead of header model metadata when DOM sender name is needed", () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"><img src="/assistant-avatar.png" /></div>
                        <div class="mesIDDisplay">#0</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">
                            <span class="name_text">Assistant</span>
                            <span class="astra-mesModel">
                                <span class="timestamp-icon" title="openrouter/google/gemini-2.5-pro"></span>
                                <span class="astra-mesModel__label">gemini-2.5-pro</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

		const items = readChatMessageRevisionHistorySnapshot({
			context: {
				chat: [
					{
						is_user: false,
						mes: "Base edited",
						swipe_id: 0,
						swipes: ["Base edited"],
						continueHistory: [
							{
								active: [0, 0],
								fullText: "Base",
								mes: "Base",
								parent: [],
								swipes: [
									{
										fullText: "Base edited",
										mes: " edited",
										parent: [0],
										swipes: [],
									},
								],
							},
						],
					},
				],
			},
			documentRef: document,
		});

		expect(items).toEqual([
			expect.objectContaining({
				messageId: 0,
				senderName: "Assistant",
			}),
		]);
	});

	test("refreshes subscribers on SillyTavern events and removes listeners on dispose", () => {
		renderMessageDom();
		const eventSource = createEventSourceStub();
		const contextRef: { current: Record<string, unknown> } = {
			current: {
				chat: [{ is_user: false, mes: "Plain", name: "Plain" }],
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					MESSAGE_EDITED: "message_edited",
					MESSAGE_SWIPED: "message_swiped",
				},
			},
		};
		setSillyTavernContext(contextRef);
		const listener = vi.fn();
		const store = createChatMessageRevisionHistoryStore({
			documentRef: document,
		});

		store.subscribe(listener);
		expect(eventSource.listenerCount("message_edited")).toBe(1);

		contextRef.current = {
			...contextRef.current,
			chat: [
				{
					is_user: false,
					mes: "Plain",
					name: "Plain",
					swipe_id: 0,
					swipes: ["Plain"],
					continueHistory: [
						{
							active: [0, 0],
							fullText: "Plain",
							mes: "Plain",
							parent: [],
							swipes: [
								{
									fullText: "Plain edited",
									mes: " edited",
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
		expect(store.getSnapshot()).toHaveLength(1);

		store.dispose();
		expect(eventSource.listenerCount("message_edited")).toBe(0);

		eventSource.emit("message_edited", 0);
		expect(listener).toHaveBeenCalledTimes(1);
	});
});
