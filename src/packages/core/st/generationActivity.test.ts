import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	createGenerationActivityStore,
	readGenerationActivitySnapshot,
} from "@/packages/core/st/generationActivity";

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

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("generation activity adapter", () => {
	beforeEach(() => {
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
		document.body.innerHTML = "";
		delete document.body.dataset.generating;
	});

	test("tracks user-visible generation after commands and clears on settled events", () => {
		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
				GENERATION_STOPPED: "generation_stopped",
			},
		});
		const listener = vi.fn();
		const store = createGenerationActivityStore({
			documentRef: document,
			now: () => 10,
		});

		store.subscribe(listener);
		eventSource.emit("generation_after_commands", "normal", {}, false);

		expect(store.getSnapshot()).toEqual({
			isGenerating: true,
			isGroupGenerating: false,
			isStreaming: false,
			updatedAt: 10,
		});

		eventSource.emit("generation_ended");

		expect(store.getSnapshot()).toEqual({
			isGenerating: false,
			isGroupGenerating: false,
			isStreaming: false,
			updatedAt: 10,
		});
		expect(listener).toHaveBeenCalledTimes(2);

		eventSource.emit("generation_after_commands", "normal", {}, false);
		eventSource.emit("chat_changed");

		expect(store.getSnapshot()).toMatchObject({
			isGenerating: false,
			isGroupGenerating: false,
		});

		store.dispose();
		expect(eventSource.listenerCount("generation_after_commands")).toBe(0);
	});

	test("ignores dry runs and non-user-visible generation types", () => {
		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
			},
		});
		const listener = vi.fn();
		const store = createGenerationActivityStore({ documentRef: document });

		store.subscribe(listener);
		eventSource.emit("generation_after_commands", "normal", {}, true);
		eventSource.emit("generation_after_commands", "normal", {
			dryRun: true,
		});
		eventSource.emit("generation_after_commands", "quiet", {}, false);
		eventSource.emit("generation_after_commands", "impersonate", {}, false);

		expect(store.getSnapshot()).toMatchObject({
			isGenerating: false,
			isGroupGenerating: false,
			isStreaming: false,
		});
		expect(listener).not.toHaveBeenCalled();

		store.dispose();
	});

	test("keeps group generation active until the group wrapper finishes", () => {
		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
				GROUP_WRAPPER_FINISHED: "group_wrapper_finished",
				GROUP_WRAPPER_STARTED: "group_wrapper_started",
			},
		});
		const store = createGenerationActivityStore({ documentRef: document });

		eventSource.emit("group_wrapper_started");
		eventSource.emit("generation_after_commands", "normal", {}, false);
		eventSource.emit("generation_ended");

		expect(store.getSnapshot()).toMatchObject({
			isGenerating: true,
			isGroupGenerating: true,
		});

		eventSource.emit("group_wrapper_finished");

		expect(store.getSnapshot()).toMatchObject({
			isGenerating: false,
			isGroupGenerating: false,
		});

		store.dispose();
	});

	test("refresh clears a wedged generation latch when no live evidence remains", () => {
		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
			},
		});
		const listener = vi.fn();
		const store = createGenerationActivityStore({ documentRef: document });

		store.subscribe(listener);
		eventSource.emit("generation_after_commands", "normal", {}, false);
		expect(store.getSnapshot()).toMatchObject({ isGenerating: true });

		// SillyTavern ended generation on an early-return path without
		// emitting GENERATION_ENDED; a later reconcile refresh must self-heal.
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({
			isGenerating: false,
			isGroupGenerating: false,
			isStreaming: false,
		});
		expect(listener).toHaveBeenCalledTimes(2);

		store.dispose();
	});

	test("refresh keeps the generation latch while live evidence remains", () => {
		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			eventSource,
			eventTypes: {
				GENERATION_AFTER_COMMANDS: "generation_after_commands",
				GENERATION_ENDED: "generation_ended",
			},
		});
		const store = createGenerationActivityStore({ documentRef: document });

		eventSource.emit("generation_after_commands", "normal", {}, false);
		document.body.dataset.generating = "true";

		store.refresh();

		expect(store.getSnapshot()).toMatchObject({ isGenerating: true });

		delete document.body.dataset.generating;
		store.refresh();

		expect(store.getSnapshot()).toMatchObject({ isGenerating: false });

		store.dispose();
	});

	test("uses streaming and visible stop fallbacks without trusting stale body flags", () => {
		document.body.innerHTML = `<button id="mes_stop" style="display: flex;"></button>`;
		document.body.dataset.generating = "true";
		setSillyTavernContext({
			streamingProcessor: { isFinished: false },
		});

		expect(
			readGenerationActivitySnapshot({ documentRef: document }),
		).toMatchObject({
			isGenerating: true,
			isStreaming: true,
		});

		document
			.getElementById("mes_stop")
			?.setAttribute("style", "display: none;");
		setSillyTavernContext({
			streamingProcessor: null,
		});

		expect(
			readGenerationActivitySnapshot({ documentRef: document }),
		).toMatchObject({
			isGenerating: false,
			isStreaming: false,
		});
	});
});
