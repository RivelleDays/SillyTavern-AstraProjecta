import { describe, expect, test, vi } from "vitest";

import {
	applyChatBackgroundAppearanceVariables,
	createChatBackgroundAppearanceRuntimeBridge,
} from "@/packages/core/st/chat-background-appearance/applyChatBackgroundAppearance";

function createFakeDocumentRef() {
	const body = document.createElement("body");
	return { body } as unknown as Document;
}

function createFakeStore(initialSnapshot: { blurPx: number; opacityPercent: number }) {
	const listeners = new Set<() => void>();
	let snapshot = initialSnapshot;
	return {
		dispose: vi.fn(),
		emitChange(next: { blurPx: number; opacityPercent: number }) {
			snapshot = next;
			for (const listener of listeners) {
				listener();
			}
		},
		getSnapshot: () => snapshot,
		subscribe: vi.fn((listener: () => void) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}),
	};
}

describe("applyChatBackgroundAppearanceVariables", () => {
	test("sets blur px and opacity fraction CSS custom properties from the snapshot", () => {
		const documentRef = createFakeDocumentRef();
		const store = createFakeStore({ blurPx: 3, opacityPercent: 80 });

		applyChatBackgroundAppearanceVariables({ documentRef, store });

		expect(documentRef.body.style.getPropertyValue("--astra-chat-bg-blur")).toBe(
			"3px",
		);
		expect(
			documentRef.body.style.getPropertyValue("--astra-chat-bg-opacity"),
		).toBe("0.8");
	});
});

describe("createChatBackgroundAppearanceRuntimeBridge", () => {
	test("applies the current snapshot immediately on creation", () => {
		const documentRef = createFakeDocumentRef();
		const store = createFakeStore({ blurPx: 2, opacityPercent: 50 });

		createChatBackgroundAppearanceRuntimeBridge({
			createStore: () => store,
			documentRef,
		});

		expect(documentRef.body.style.getPropertyValue("--astra-chat-bg-blur")).toBe(
			"2px",
		);
		expect(
			documentRef.body.style.getPropertyValue("--astra-chat-bg-opacity"),
		).toBe("0.5");
	});

	test("re-applies variables when the store notifies a change", () => {
		const documentRef = createFakeDocumentRef();
		const store = createFakeStore({ blurPx: 0, opacityPercent: 100 });

		createChatBackgroundAppearanceRuntimeBridge({
			createStore: () => store,
			documentRef,
		});
		store.emitChange({ blurPx: 5, opacityPercent: 25 });

		expect(documentRef.body.style.getPropertyValue("--astra-chat-bg-blur")).toBe(
			"5px",
		);
		expect(
			documentRef.body.style.getPropertyValue("--astra-chat-bg-opacity"),
		).toBe("0.25");
	});

	test("dispose unsubscribes from the store and disposes it", () => {
		const documentRef = createFakeDocumentRef();
		const store = createFakeStore({ blurPx: 1, opacityPercent: 60 });

		const bridge = createChatBackgroundAppearanceRuntimeBridge({
			createStore: () => store,
			documentRef,
		});
		bridge.dispose();
		store.emitChange({ blurPx: 4, opacityPercent: 10 });

		expect(store.dispose).toHaveBeenCalledTimes(1);
		expect(documentRef.body.style.getPropertyValue("--astra-chat-bg-blur")).toBe(
			"1px",
		);
	});
});
