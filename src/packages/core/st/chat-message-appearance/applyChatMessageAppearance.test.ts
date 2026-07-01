import { describe, expect, test, vi } from "vitest";

import {
	applyChatMessageAppearanceVariables,
	createChatMessageAppearanceRuntimeBridge,
} from "@/packages/core/st/chat-message-appearance/applyChatMessageAppearance";
import type {
	ChatMessageLineHeight,
	ChatMessageTextAlign,
} from "@/packages/core/st/chat-message-appearance";

type FakeSnapshot = {
	lineHeight: ChatMessageLineHeight;
	showTimeline: boolean;
	textAlign: ChatMessageTextAlign;
};

function createFakeDocumentRef() {
	const body = document.createElement("body");
	return { body } as unknown as Document;
}

function createFakeStore(initialSnapshot: FakeSnapshot) {
	const listeners = new Set<() => void>();
	let snapshot = initialSnapshot;
	return {
		dispose: vi.fn(),
		emitChange(next: FakeSnapshot) {
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

describe("applyChatMessageAppearanceVariables", () => {
	test("maps line height enum to a calc() value and forwards text align", () => {
		const documentRef = createFakeDocumentRef();
		const store = createFakeStore({
			lineHeight: "lg",
			showTimeline: true,
			textAlign: "center",
		});

		applyChatMessageAppearanceVariables({ documentRef, store });

		expect(
			documentRef.body.style.getPropertyValue("--astra-mes-line-height"),
		).toBe("calc(var(--mainFontSize) + 0.8rem)");
		expect(
			documentRef.body.style.getPropertyValue("--astra-mes-text-align"),
		).toBe("center");
	});

	test("toggles the chat timeline hidden body class from the snapshot", () => {
		const documentRef = createFakeDocumentRef();
		const store = createFakeStore({
			lineHeight: "md",
			showTimeline: false,
			textAlign: "start",
		});

		applyChatMessageAppearanceVariables({ documentRef, store });

		expect(documentRef.body.classList).toContain(
			"astra-projecta-chat-timeline-hidden",
		);

		store.emitChange({
			lineHeight: "md",
			showTimeline: true,
			textAlign: "start",
		});
		applyChatMessageAppearanceVariables({ documentRef, store });

		expect(documentRef.body.classList).not.toContain(
			"astra-projecta-chat-timeline-hidden",
		);
	});
});

describe("createChatMessageAppearanceRuntimeBridge", () => {
	test("applies the current snapshot immediately on creation", () => {
		const documentRef = createFakeDocumentRef();
		const store = createFakeStore({
			lineHeight: "sm",
			showTimeline: true,
			textAlign: "justify",
		});

		createChatMessageAppearanceRuntimeBridge({
			createStore: () => store,
			documentRef,
		});

		expect(
			documentRef.body.style.getPropertyValue("--astra-mes-line-height"),
		).toBe("calc(var(--mainFontSize) + 0.4rem)");
		expect(
			documentRef.body.style.getPropertyValue("--astra-mes-text-align"),
		).toBe("justify");
	});

	test("re-applies variables when the store notifies a change", () => {
		const documentRef = createFakeDocumentRef();
		const store = createFakeStore({
			lineHeight: "md",
			showTimeline: true,
			textAlign: "start",
		});

		createChatMessageAppearanceRuntimeBridge({
			createStore: () => store,
			documentRef,
		});
		store.emitChange({
			lineHeight: "lg",
			showTimeline: false,
			textAlign: "end",
		});

		expect(
			documentRef.body.style.getPropertyValue("--astra-mes-line-height"),
		).toBe("calc(var(--mainFontSize) + 0.8rem)");
		expect(
			documentRef.body.style.getPropertyValue("--astra-mes-text-align"),
		).toBe("end");
		expect(documentRef.body.classList).toContain(
			"astra-projecta-chat-timeline-hidden",
		);
	});

	test("dispose unsubscribes from the store and disposes it", () => {
		const documentRef = createFakeDocumentRef();
		const store = createFakeStore({
			lineHeight: "md",
			showTimeline: true,
			textAlign: "start",
		});

		const bridge = createChatMessageAppearanceRuntimeBridge({
			createStore: () => store,
			documentRef,
		});
		bridge.dispose();
		store.emitChange({
			lineHeight: "lg",
			showTimeline: false,
			textAlign: "end",
		});

		expect(store.dispose).toHaveBeenCalledTimes(1);
		expect(
			documentRef.body.style.getPropertyValue("--astra-mes-line-height"),
		).toBe("calc(var(--mainFontSize) + 0.6rem)");
	});
});
