import { fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import {
	createQuickShortcutStore,
	readQuickShortcutSnapshots,
	type QuickShortcutDescriptor,
} from "@/packages/core/st/quickShortcuts";

type Listener = (...args: unknown[]) => void;

const QUICK_SHORTCUT_DESCRIPTORS: readonly QuickShortcutDescriptor[] = [
	{
		fallbackLabelKey: "sendForm.shortcuts.continue",
		fallbackOptionId: "option_continue",
		id: "continue",
		nativeButtonId: "mes_continue",
		settingKey: "quick_continue",
	},
	{
		fallbackLabelKey: "sendForm.shortcuts.impersonate",
		fallbackOptionId: "option_impersonate",
		id: "impersonate",
		nativeButtonId: "mes_impersonate",
		settingKey: "quick_impersonate",
	},
];

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

function setSillyTavernContext(context: unknown | { current: unknown }) {
	const contextRef =
		typeof context === "object" && context !== null && "current" in context
			? context
			: { current: context };

	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => contextRef.current,
	};
}

describe("quick shortcuts store", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("reads shortcut visibility from settings and native option availability", () => {
		document.body.innerHTML = `
      <div id="options">
        <button id="option_continue" title="Continue reply" type="button"></button>
        <button id="option_impersonate" title="Write as user" type="button"></button>
      </div>
    `;

		setSillyTavernContext({
			powerUserSettings: {
				quick_continue: true,
				quick_impersonate: false,
			},
		});

		expect(
			readQuickShortcutSnapshots({
				descriptors: QUICK_SHORTCUT_DESCRIPTORS,
				documentRef: document,
			}),
		).toEqual([
			{
				id: "continue",
				isAvailable: true,
				isEnabledInSettings: true,
				isVisible: true,
				label: "Continue reply",
			},
			{
				id: "impersonate",
				isAvailable: true,
				isEnabledInSettings: false,
				isVisible: false,
				label: "Write as user",
			},
		]);
	});

	test("refreshes immediately when quick shortcut toggles change", async () => {
		document.body.innerHTML = `
      <input id="quick_continue" checked type="checkbox" />
      <input id="quick_impersonate" type="checkbox" />
      <div id="options">
        <button id="option_continue" title="Continue reply" type="button"></button>
        <button id="option_impersonate" title="Write as user" type="button"></button>
      </div>
    `;

		const contextRef = {
			current: {
				powerUserSettings: {
					quick_continue: true,
					quick_impersonate: false,
				},
			},
		};
		setSillyTavernContext(contextRef);

		const store = createQuickShortcutStore({
			descriptors: QUICK_SHORTCUT_DESCRIPTORS,
			documentRef: document,
		});
		const continueToggle = document.getElementById(
			"quick_continue",
		) as HTMLInputElement;
		const impersonateToggle = document.getElementById(
			"quick_impersonate",
		) as HTMLInputElement;

		contextRef.current = {
			...contextRef.current,
			powerUserSettings: {
				quick_continue: false,
				quick_impersonate: true,
			},
		};
		continueToggle.checked = false;
		impersonateToggle.checked = true;

		fireEvent.input(continueToggle);
		fireEvent.input(impersonateToggle);

		await waitFor(() => {
			expect(store.getSnapshot()).toEqual([
				{
					id: "continue",
					isAvailable: true,
					isEnabledInSettings: false,
					isVisible: false,
					label: "Continue reply",
				},
				{
					id: "impersonate",
					isAvailable: true,
					isEnabledInSettings: true,
					isVisible: true,
					label: "Write as user",
				},
			]);
		});

		store.dispose();
	});

	test("refreshes when SillyTavern emits settings updates", async () => {
		document.body.innerHTML = `
      <div id="options">
        <button id="option_continue" title="Continue reply" type="button"></button>
        <button id="option_impersonate" title="Write as user" type="button"></button>
      </div>
    `;

		const eventSource = createEventSourceStub();
		const contextRef = {
			current: {
				eventSource,
				eventTypes: {
					SETTINGS_UPDATED: "settings_updated",
				},
				powerUserSettings: {
					quick_continue: false,
					quick_impersonate: false,
				},
			},
		};
		setSillyTavernContext(contextRef);

		const store = createQuickShortcutStore({
			descriptors: QUICK_SHORTCUT_DESCRIPTORS,
			documentRef: document,
		});

		contextRef.current = {
			...contextRef.current,
			powerUserSettings: {
				quick_continue: true,
				quick_impersonate: true,
			},
		};

		eventSource.emit("settings_updated");

		await waitFor(() => {
			expect(store.getSnapshot()).toEqual([
				{
					id: "continue",
					isAvailable: true,
					isEnabledInSettings: true,
					isVisible: true,
					label: "Continue reply",
				},
				{
					id: "impersonate",
					isAvailable: true,
					isEnabledInSettings: true,
					isVisible: true,
					label: "Write as user",
				},
			]);
		});

		store.dispose();
	});

	test("hides shortcuts when their native options are not visible", () => {
		document.body.innerHTML = `
      <div id="options">
        <button id="option_continue" style="display: none;" title="Continue reply" type="button"></button>
        <button hidden id="option_impersonate" title="Write as user" type="button"></button>
      </div>
    `;

		setSillyTavernContext({
			powerUserSettings: {
				quick_continue: true,
				quick_impersonate: true,
			},
		});

		expect(
			readQuickShortcutSnapshots({
				descriptors: QUICK_SHORTCUT_DESCRIPTORS,
				documentRef: document,
			}),
		).toEqual([
			{
				id: "continue",
				isAvailable: false,
				isEnabledInSettings: true,
				isVisible: false,
				label: "Continue reply",
			},
			{
				id: "impersonate",
				isAvailable: false,
				isEnabledInSettings: true,
				isVisible: false,
				label: "Write as user",
			},
		]);
	});

	test("returns unavailable snapshots when the native options root is missing", () => {
		document.body.innerHTML = "";

		setSillyTavernContext({
			powerUserSettings: {
				quick_continue: true,
				quick_impersonate: false,
			},
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		expect(
			readQuickShortcutSnapshots({
				descriptors: QUICK_SHORTCUT_DESCRIPTORS,
				documentRef: document,
			}),
		).toEqual([
			{
				id: "continue",
				isAvailable: false,
				isEnabledInSettings: true,
				isVisible: false,
				label: "sendForm.shortcuts.continue::Continue the last message",
			},
			{
				id: "impersonate",
				isAvailable: false,
				isEnabledInSettings: false,
				isVisible: false,
				label: "sendForm.shortcuts.impersonate::Ask AI to write your message for you",
			},
		]);
	});
});
