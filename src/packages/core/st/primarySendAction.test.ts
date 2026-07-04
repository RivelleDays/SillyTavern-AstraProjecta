import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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
	beforeEach(() => {
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
		document.body.innerHTML = "";
		delete document.body.dataset.generating;
		delete document.body.dataset.swiping;
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

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
			isGenerating: false,
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
			label: "sendForm.primaryAction.stop::Stop generating message",
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

	test("ignores a stale generating body flag when no generation is active", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
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
			disabled: false,
			kind: "send",
			label: "Send message",
			visible: true,
		});
	});

	test("keeps the stop action ahead of a css-hidden send button while generating", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <button id="send_but" class="displayNone" title="Send message"></button>
      <button id="mes_stop" style="display: flex;" title="Abort request"></button>
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
			label: "Stop generating message",
			visible: true,
		});
	});

	test("keeps a message-edit background lock on the disabled send action", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_ENDED: "generation_ended",
				GENERATION_STARTED: "generation_started",
				GENERATION_STOPPED: "generation_stopped",
				MESSAGE_EDITED: "message_edited",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
		});

		const sendButton = document.getElementById("send_but");
		const stopButton = document.getElementById("mes_stop");
		let sendClicks = 0;
		let stopClicks = 0;
		sendButton?.addEventListener("click", () => {
			sendClicks += 1;
		});
		stopButton?.addEventListener("click", () => {
			stopClicks += 1;
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("message_edited", 0);
		document.body.dataset.generating = "true";
		stopButton?.setAttribute("style", "display: flex;");
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: true,
			kind: "send",
			label: "Send message",
			visible: true,
		});
		expect(store.trigger()).toBe(false);
		expect(sendClicks).toBe(0);
		expect(stopClicks).toBe(0);

		store.dispose();
	});

	test("keeps the continue icon disabled during a non-generation input lock", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea"></textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
      <div id="options">
        <button id="option_continue" title="Continue reply"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: false }],
			eventSource,
			eventTypes: {
				MESSAGE_EDITED: "message_edited",
			},
			groupId: null,
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: true },
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("message_edited", 0);
		document.body.dataset.generating = "true";
		document
			.getElementById("mes_stop")
			?.setAttribute("style", "display: flex;");
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: true,
			kind: "continue",
			label: "Continue reply",
			visible: true,
		});

		store.dispose();
	});

	test("shows and triggers stop after a real generation starts", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_ENDED: "generation_ended",
				GENERATION_STARTED: "generation_started",
				GENERATION_STOPPED: "generation_stopped",
				MESSAGE_EDITED: "message_edited",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
		});

		const stopButton = document.getElementById("mes_stop");
		let stopClicks = 0;
		stopButton?.addEventListener("click", () => {
			stopClicks += 1;
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("generation_started", "normal", {}, false);
		document.body.dataset.generating = "true";
		stopButton?.setAttribute("style", "display: flex;");
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			isGenerating: true,
			kind: "stop",
			label: "Stop generating message",
			visible: true,
		});
		expect(store.trigger()).toBe(true);
		expect(stopClicks).toBe(1);

		store.dispose();
	});

	test("keeps generation active when the native stop button appears after generation events", async () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" disabled title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
				GENERATION_STOPPED: "generation_stopped",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
			streamingProcessor: null,
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		const stopButton = document.getElementById("mes_stop");
		let stopClicks = 0;
		stopButton?.addEventListener("click", () => {
			stopClicks += 1;
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("generation_after_commands", "normal", {}, false);
		await Promise.resolve();

		document.body.dataset.generating = "true";
		stopButton?.setAttribute("style", "display: flex;");
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			kind: "stop",
			label: "sendForm.primaryAction.stop::Stop generating message",
			visible: true,
		});
		expect(store.trigger()).toBe(true);
		expect(stopClicks).toBe(1);

		store.dispose();
	});

	test("releases the stop action when generation ends without a settle event", async () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
				GENERATION_STOPPED: "generation_stopped",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
			streamingProcessor: null,
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("generation_after_commands", "normal", {}, false);
		await Promise.resolve();

		// SillyTavern early-return paths (failed server ping, interrupted
		// backends) unblock without ever showing #mes_stop, so hideStopButton
		// suppresses GENERATION_ENDED and no settle event ever arrives.
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			kind: "send",
			label: "Send message",
			visible: true,
		});

		store.dispose();
	});

	test("trusts the inline stop-control style over stale computed styles", async () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
				GENERATION_STOPPED: "generation_stopped",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
			streamingProcessor: null,
		});

		// WebKit returns stale computed styles for elements inside hidden
		// subtrees (the Astra mobile layout hides #nonQRFormItems), so the
		// computed display can stay "none" while the inline style says "flex".
		const stopButton = document.getElementById("mes_stop");
		const nativeGetComputedStyle = window.getComputedStyle.bind(window);
		vi.spyOn(window, "getComputedStyle").mockImplementation(
			(element, pseudo) => {
				const style = nativeGetComputedStyle(
					element as Element,
					pseudo ?? undefined,
				);
				if (element === stopButton) {
					return new Proxy(style, {
						get(target, property) {
							if (property === "display") {
								return "none";
							}
							const value = Reflect.get(target, property);
							return typeof value === "function"
								? value.bind(target)
								: value;
						},
					});
				}
				return style;
			},
		);

		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("generation_after_commands", "normal", {}, false);
		await Promise.resolve();

		document.body.dataset.generating = "true";
		stopButton?.setAttribute("style", "display: flex;");
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			kind: "stop",
			visible: true,
		});

		store.dispose();
	});

	test("restores send after group generation finishes even if the body generating flag is stale", async () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: flex;" title="Abort request"></button>
      </div>
    `;
		document.body.dataset.generating = "true";

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GROUP_WRAPPER_FINISHED: "group_wrapper_finished",
				GROUP_WRAPPER_STARTED: "group_wrapper_started",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		expect(store.getSnapshot()).toMatchObject({
			kind: "stop",
			visible: true,
		});

		document
			.getElementById("mes_stop")
			?.setAttribute("style", "display: none;");
		eventSource.emit("group_wrapper_finished");
		await Promise.resolve();

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			kind: "send",
			label: "Send message",
			visible: true,
		});

		store.dispose();
	});

	test("keeps an active generation on stop when a message edit event arrives", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_ENDED: "generation_ended",
				GENERATION_STARTED: "generation_started",
				GENERATION_STOPPED: "generation_stopped",
				MESSAGE_EDITED: "message_edited",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("generation_started", "normal", {}, false);
		document.body.dataset.generating = "true";
		document
			.getElementById("mes_stop")
			?.setAttribute("style", "display: flex;");
		store.refresh();
		eventSource.emit("message_edited", 0);
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			kind: "stop",
			visible: true,
		});

		store.dispose();
	});

	test("restores send after a background input lock ends", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_ENDED: "generation_ended",
				MESSAGE_EDITED: "message_edited",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
		});

		const stopButton = document.getElementById("mes_stop");
		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("message_edited", 0);
		document.body.dataset.generating = "true";
		stopButton?.setAttribute("style", "display: flex;");
		store.refresh();
		delete document.body.dataset.generating;
		stopButton?.setAttribute("style", "display: none;");
		eventSource.emit("generation_ended");
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			kind: "send",
			label: "Send message",
			visible: true,
		});

		store.dispose();
	});

	test("releases a wedged pending generation start when no settle event arrives", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
				GENERATION_STARTED: "generation_started",
				GENERATION_STOPPED: "generation_stopped",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
			streamingProcessor: null,
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		// SillyTavern can interrupt Generate() between GENERATION_STARTED and
		// GENERATION_AFTER_COMMANDS (slash-command interception) and unblock
		// without ever showing #mes_stop, so no settle event ever arrives.
		eventSource.emit("generation_started", "normal", {}, false);
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: true,
			isGenerating: true,
			kind: "send",
		});

		vi.advanceTimersByTime(15_000);

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			isGenerating: false,
			kind: "send",
			label: "Send message",
			visible: true,
		});

		store.dispose();
	});

	test("drops a stale event latch so later background locks stay on send", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
				GENERATION_STARTED: "generation_started",
				GENERATION_STOPPED: "generation_stopped",
				MESSAGE_EDITED: "message_edited",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
			streamingProcessor: null,
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		// A generation that dies after GENERATION_AFTER_COMMANDS but before
		// the Stop control is shown (failed server ping, blocked backend)
		// leaves the event latch armed with no settle event to release it.
		eventSource.emit("generation_started", "normal", {}, false);
		eventSource.emit("generation_after_commands", "normal", {}, false);
		store.refresh();
		vi.advanceTimersByTime(15_000);

		// A later message edit plus a background quiet-generation lock must
		// stay a disabled send action, not re-promote to stop.
		eventSource.emit("message_edited", 0);
		document.body.dataset.generating = "true";
		document
			.getElementById("mes_stop")
			?.setAttribute("style", "display: flex;");
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: true,
			kind: "send",
			label: "Send message",
			visible: true,
		});

		store.dispose();
	});

	test("keeps a live generation on stop across the evidence grace window", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" title="Send message"></button>
        <button id="mes_stop" style="display: none;" title="Abort request"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
				GENERATION_STARTED: "generation_started",
				GENERATION_STOPPED: "generation_stopped",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
			streamingProcessor: null,
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("generation_started", "normal", {}, false);
		eventSource.emit("generation_after_commands", "normal", {}, false);
		document.body.dataset.generating = "true";
		document
			.getElementById("mes_stop")
			?.setAttribute("style", "display: flex;");
		store.refresh();
		vi.advanceTimersByTime(60_000);
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			kind: "stop",
			visible: true,
		});

		store.dispose();
	});

	test("releases a stale hidden stop control after mobile generation settles", async () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="nonQRFormItems" style="display: none;">
        <div id="rightSendForm">
          <button id="send_but" title="Send message"></button>
          <button id="mes_stop" style="display: none;" title="Abort request"></button>
        </div>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_STOPPED: "generation_stopped",
			},
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
			streamingProcessor: null,
		});

		const sendButton = document.getElementById("send_but");
		const stopButton = document.getElementById("mes_stop");
		let sendClicks = 0;
		let stopClicks = 0;
		sendButton?.addEventListener("click", () => {
			sendClicks += 1;
		});
		stopButton?.addEventListener("click", () => {
			stopClicks += 1;
		});

		const store = createPrimarySendActionStore({ documentRef: document });
		eventSource.emit("generation_after_commands", "normal", {}, false);
		await Promise.resolve();

		document.body.dataset.generating = "true";
		stopButton?.setAttribute("style", "display: flex;");
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			kind: "stop",
			visible: true,
		});

		delete document.body.dataset.generating;
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			kind: "send",
			label: "Send message",
			visible: true,
		});

		eventSource.emit("generation_stopped");
		await Promise.resolve();

		expect(store.getSnapshot()).toMatchObject({
			disabled: false,
			kind: "send",
			label: "Send message",
			visible: true,
		});
		expect(store.trigger()).toBe(true);
		expect(sendClicks).toBe(1);
		expect(stopClicks).toBe(0);

		store.dispose();
	});

	test("keeps the stop fallback when mounted during an existing generation", () => {
		document.body.innerHTML = `
      <textarea id="send_textarea">hello</textarea>
      <input id="file_form_input" type="file" />
      <div id="rightSendForm">
        <button id="send_but" class="displayNone" title="Send message"></button>
        <button id="mes_stop" style="display: flex;" title="Abort request"></button>
      </div>
    `;
		document.body.dataset.generating = "true";

		setSillyTavernContext({
			chat: [{ is_system: false, is_user: true }],
			onlineStatus: "connected",
			powerUserSettings: { continue_on_send: false },
		});

		const store = createPrimarySendActionStore({ documentRef: document });

		expect(store.getSnapshot()).toMatchObject({
			kind: "stop",
			label: "Stop generating message",
			visible: true,
		});

		store.dispose();
	});
});
