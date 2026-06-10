import { describe, expect, test } from "vitest";

import {
	createPrimarySendActionStore,
	readPrimarySendActionSnapshot,
} from "@/packages/core/st/primarySendAction";

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

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("primary send action", () => {
	test("prefers the continue action when continue-on-send is available", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea"></textarea>
      <input id="file_form_input" type="file" />
      <button id="send_but" title="Send message"></button>
      <div id="rightSendForm"></div>
      <div id="options">
        <button id="option_continue" title="Continue reply"></button>
      </div>
    `;

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: false }],
			groupId: null,
			powerUserSettings: { continue_on_send: true },
		});

		expect(
			readPrimarySendActionSnapshot({ documentRef: document }),
		).toMatchObject({
			kind: "continue",
			label: "Continue reply",
			visible: true,
		});

		const continueButton = document.getElementById("option_continue");
		let continueClicks = 0;
		continueButton?.addEventListener("click", () => {
			continueClicks += 1;
		});

		const store = createPrimarySendActionStore({ documentRef: document });

		expect(store.trigger()).toBe(true);
		expect(continueClicks).toBe(1);

		store.dispose();
	});

	test("uses translated Astra fallback labels when native labels are missing", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea"></textarea>
      <input id="file_form_input" type="file" />
      <button id="send_but"></button>
      <button id="mes_stop"></button>
      <div id="rightSendForm"></div>
      <div id="options">
        <button id="option_continue"></button>
      </div>
    `;

		const translate = (text: string, key: string) => `${key}::${text}`;

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: false }],
			groupId: null,
			powerUserSettings: { continue_on_send: false },
			translate,
		});

		expect(
			readPrimarySendActionSnapshot({ documentRef: document }),
		).toMatchObject({
			kind: "stop",
			label: "sendForm.primaryAction.stop::Abort request",
			visible: true,
		});

		document.getElementById("mes_stop")?.remove();

		expect(
			readPrimarySendActionSnapshot({ documentRef: document }),
		).toMatchObject({
			kind: "send",
			label: "sendForm.primaryAction.send::Send a message",
			visible: true,
		});

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: false }],
			groupId: null,
			powerUserSettings: { continue_on_send: true },
			translate,
		});

		expect(
			readPrimarySendActionSnapshot({ documentRef: document }),
		).toMatchObject({
			kind: "continue",
			label: "sendForm.primaryAction.continue::Continue the last message",
			visible: true,
		});
	});

	test("keeps native action labels ahead of translated Astra fallbacks", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea"></textarea>
      <input id="file_form_input" type="file" />
      <button id="send_but" title="Native send"></button>
      <div id="rightSendForm"></div>
      <div id="options">
        <button id="option_continue" title="Native continue"></button>
      </div>
    `;

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: false }],
			groupId: null,
			powerUserSettings: { continue_on_send: true },
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		expect(
			readPrimarySendActionSnapshot({ documentRef: document }),
		).toMatchObject({
			kind: "continue",
			label: "Native continue",
			visible: true,
		});
	});

	test("keeps the send action visible when the native send button is css-hidden but SillyTavern is connected", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <button id="send_but" class="displayNone" title="Send message"></button>
      <div id="rightSendForm"></div>
    `;

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
		});

		expect(
			readPrimarySendActionSnapshot({ documentRef: document }),
		).toMatchObject({
			kind: "send",
			label: "Send message",
			visible: true,
		});

		const sendButton = document.getElementById("send_but");
		let sendClicks = 0;
		sendButton?.addEventListener("click", () => {
			sendClicks += 1;
		});

		const store = createPrimarySendActionStore({ documentRef: document });

		expect(store.trigger()).toBe(true);
		expect(sendClicks).toBe(1);

		store.dispose();
	});

	test("refreshes hidden native send visibility when SillyTavern connection status changes", async () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <button id="send_but" class="displayNone" title="Send message"></button>
      <div id="rightSendForm"></div>
    `;

		const eventSource = createEventSourceStub();
		const contextRef = {
			current: {
				chat: [{ is_system: false, is_user: true }],
				eventSource,
				eventTypes: {
					ONLINE_STATUS_CHANGED: "online_status_changed",
				},
				onlineStatus: "no_connection",
				powerUserSettings: { continue_on_send: false },
			},
		};

		setSillyTavernContext({
			get chat() {
				return contextRef.current.chat;
			},
			get eventSource() {
				return contextRef.current.eventSource;
			},
			get eventTypes() {
				return contextRef.current.eventTypes;
			},
			get onlineStatus() {
				return contextRef.current.onlineStatus;
			},
			get powerUserSettings() {
				return contextRef.current.powerUserSettings;
			},
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		expect(store.getSnapshot()).toMatchObject({
			visible: false,
		});

		contextRef.current.onlineStatus = "connected";
		eventSource.emit("online_status_changed", "connected");
		await Promise.resolve();

		expect(store.getSnapshot()).toMatchObject({
			kind: "send",
			visible: true,
		});

		store.dispose();
	});

	test("keeps the send action hidden when the native send button is css-hidden and SillyTavern is disconnected", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <button id="send_but" class="displayNone" title="Send message"></button>
      <div id="rightSendForm"></div>
    `;

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			onlineStatus: "no_connection",
			powerUserSettings: { continue_on_send: false },
		});

		expect(
			readPrimarySendActionSnapshot({ documentRef: document }),
		).toMatchObject({
			disabled: true,
			kind: "send",
			label: "Send message",
			visible: false,
		});
	});

	test("keeps the stop action ahead of a css-hidden send button while generating", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <button id="send_but" class="displayNone" title="Send message"></button>
      <button id="mes_stop" class="displayNone" title="Abort request"></button>
      <div id="rightSendForm"></div>
    `;
		document.body.dataset.generating = "true";

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
		});

		expect(
			readPrimarySendActionSnapshot({ documentRef: document }),
		).toMatchObject({
			kind: "stop",
			label: "Abort request",
			visible: true,
		});
	});
});
