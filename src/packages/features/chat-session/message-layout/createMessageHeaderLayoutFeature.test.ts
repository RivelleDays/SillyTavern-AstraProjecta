import { waitFor } from "@testing-library/dom";
import {
	afterEach,
	describe,
	expect,
	test,
	vi,
	type MockInstance,
} from "vitest";

import {
	formatStTimestampDateDivider,
	formatStTimestampTimeOnly,
} from "@/packages/core/st/timestamps";
import { createMessageHeaderLayoutFeature } from "@/packages/features/chat-session/message-layout/createMessageHeaderLayoutFeature";

function renderMessage(
	messageId = 0,
	{
		includeTimer = true,
		includeTimestamp = true,
		messageTimestamp,
		timestampIcon = false,
		timestampIconMarkup,
		timestampText = "June 1, 2026 10:00 AM",
		timerText = "4.2s",
	}: {
		includeTimer?: boolean;
		includeTimestamp?: boolean;
		messageTimestamp?: string;
		timestampIcon?: boolean;
		timestampIconMarkup?: string;
		timestampText?: string;
		timerText?: string;
	} = {},
) {
	const resolvedTimestampIconMarkup =
		timestampIconMarkup ??
		(timestampIcon
			? '<svg class="icon-svg timestamp-icon" title="makersuite - gemini-2.0-flash" viewBox="0 0 24 24"><path d="M4 12h16"></path></svg>'
			: "");

	document.body.innerHTML = `
        <div id="chat">
            <div class="mes" mesid="${messageId}"${
				messageTimestamp ? ` timestamp="${messageTimestamp}"` : ""
			}>
                <div class="for_checkbox"></div>
                <input type="checkbox" class="del_checkbox">
                <div class="mesAvatarWrapper">
                    <div class="avatar">
                        <img src="">
                    </div>
                    <div class="mesIDDisplay">#${messageId}</div>
                    ${
						includeTimer
							? `<div class="mes_timer">${timerText}</div>`
							: ""
					}
                    <div class="tokenCounterDisplay">321 tokens</div>
                </div>
                <div class="swipe_left fa-solid fa-chevron-left"></div>
                <div class="mes_block">
                    <div class="ch_name flex-container justifySpaceBetween">
                        <div class="flex-container flex1 alignitemscenter">
                            <div class="flex-container alignItemsBaseline">
                                <span class="name_text">Assistant</span>
                                ${
									includeTimestamp
										? `<small class="timestamp" title="makersuite - gemini-2.0-flash">${timestampText}</small>`
										: ""
								}
                                ${resolvedTimestampIconMarkup}
                            </div>
                        </div>
                        <div class="mes_buttons"></div>
                    </div>
                    <details class="mes_reasoning_details"></details>
                    <div class="mes_text">Hello</div>
                </div>
            </div>
        </div>
    `;
}

function renderMessages(
	messages: Array<{
		className?: string;
		id: number;
		messageTimestamp?: string;
		timestampText: string;
	}>,
) {
	document.body.innerHTML = `
        <div id="chat">
            ${messages
				.map(
					(message) => `
                <div class="mes${message.className ? ` ${message.className}` : ""}" mesid="${message.id}"${
					message.messageTimestamp
						? ` timestamp="${message.messageTimestamp}"`
						: ""
				}>
                    <div class="mesAvatarWrapper">
                        <div class="avatar"></div>
                        <div class="mesIDDisplay">#${message.id}</div>
                        <div class="tokenCounterDisplay">321 tokens</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">
                            <span class="name_text">Assistant</span>
                            <small class="timestamp">${message.timestampText}</small>
                        </div>
                        <div class="mes_text">Message ${message.id}</div>
                    </div>
                </div>
            `,
				)
				.join("")}
        </div>
    `;
}

function renderMessageWithReasoning({
	includeReasoningHeader = true,
	messageId = 0,
}: {
	includeReasoningHeader?: boolean;
	messageId?: number;
} = {}) {
	document.body.innerHTML = `
        <div id="chat">
            <div class="mes reasoning" mesid="${messageId}">
                <div class="mesAvatarWrapper">
                    <div class="avatar">
                        <img src="">
                    </div>
                    <div class="mesIDDisplay">#${messageId}</div>
                    <div class="tokenCounterDisplay">321 tokens</div>
                </div>
                <div class="mes_block">
                    <div class="ch_name">
                        <span class="name_text">Assistant</span>
                        <small class="timestamp">June 1, 2026 10:00 AM</small>
                        <div class="mes_buttons"></div>
                    </div>
                    <details class="mes_reasoning_details" open>
                        ${
							includeReasoningHeader
								? `
                            <summary class="mes_reasoning_summary flex-container">
                                <div class="mes_reasoning_header_block flex-container">
                                    <div class="mes_reasoning_header flex-container">
                                        <span class="mes_reasoning_header_title">Thought for 8 seconds</span>
                                        <div class="mes_reasoning_arrow fa-solid fa-chevron-up"></div>
                                    </div>
                                </div>
                                <div class="mes_reasoning_actions flex-container">
                                    <div class="mes_reasoning_copy mes_button fa-solid fa-copy"></div>
                                    <div class="mes_reasoning_edit mes_button fa-solid fa-pencil"></div>
                                </div>
                            </summary>
                        `
								: ""
						}
                        <div class="mes_reasoning">Visible reasoning text</div>
                    </details>
                    <div class="mes_text">Hello</div>
                </div>
            </div>
        </div>
    `;
}

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function createEventSource() {
	const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

	return {
		emit(eventName: string, ...args: unknown[]) {
			for (const listener of listeners.get(eventName) ?? []) {
				listener(...args);
			}
		},
		on: vi.fn(
			(eventName: string, listener: (...args: unknown[]) => void) => {
				const eventListeners = listeners.get(eventName) ?? new Set();
				eventListeners.add(listener);
				listeners.set(eventName, eventListeners);
			},
		),
		removeListener: vi.fn(
			(eventName: string, listener: (...args: unknown[]) => void) => {
				listeners.get(eventName)?.delete(listener);
			},
		),
	};
}

function installAnimationFrameQueue() {
	const callbacks: FrameRequestCallback[] = [];
	const originalRequestAnimationFrame = window.requestAnimationFrame;
	const originalCancelAnimationFrame = window.cancelAnimationFrame;
	const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
		callbacks.push(callback);
		return callbacks.length;
	});
	const cancelAnimationFrame = vi.fn((handle: number) => {
		callbacks[handle - 1] = () => {};
	});

	Object.defineProperty(window, "requestAnimationFrame", {
		configurable: true,
		value: requestAnimationFrame,
		writable: true,
	});
	Object.defineProperty(window, "cancelAnimationFrame", {
		configurable: true,
		value: cancelAnimationFrame,
		writable: true,
	});

	return {
		flushFrames() {
			const scheduledCallbacks = callbacks.splice(0);
			for (const callback of scheduledCallbacks) {
				callback(0);
			}
		},
		requestAnimationFrame,
		restore() {
			Object.defineProperty(window, "requestAnimationFrame", {
				configurable: true,
				value: originalRequestAnimationFrame,
				writable: true,
			});
			Object.defineProperty(window, "cancelAnimationFrame", {
				configurable: true,
				value: originalCancelAnimationFrame,
				writable: true,
			});
		},
	};
}

function collectCommentValues(root: Node | null): string[] {
	if (!root) {
		return [];
	}

	const comments: string[] = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
	let currentNode = walker.nextNode();
	while (currentNode) {
		comments.push(currentNode.nodeValue ?? "");
		currentNode = walker.nextNode();
	}

	return comments;
}

describe("createMessageHeaderLayoutFeature", () => {
	afterEach(() => {
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
		vi.unstubAllGlobals();
	});

	test("moves avatar metadata and name into a reversible Astra-owned message header", () => {
		renderMessage();
		const message = document.querySelector(".mes");
		const messageBlock = document.querySelector(".mes_block");
		const avatarWrapper = document.querySelector(".mesAvatarWrapper");
		const messageId = document.querySelector(".mesIDDisplay");
		const timer = document.querySelector(".mes_timer");
		const tokenCounter = document.querySelector(".tokenCounterDisplay");
		const name = document.querySelector(".ch_name");
		const nameText = document.querySelector(".name_text");
		const reasoning = document.querySelector(".mes_reasoning_details");

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const header = document.querySelector(".astra-mesHeader");
		const nameWrapper = document.querySelector(".astra-mesHeader__name");
		const identityLine = document.querySelector(
			".astra-mesHeader__identityLine",
		);
		const nameTextWrapper = document.querySelector(".astra-mesNameText");
		const modelMeta = document.querySelector(".astra-mesModel");
		const metadata = document.querySelector(".astra-mesMeta");
		const metadataItems = document.querySelector(".astra-mesMeta__items");
		const metadataChips = document.querySelectorAll(".astra-mesMeta__item");
		const metadataSeparators = document.querySelectorAll(
			".astra-mesMeta__separator",
		);
		const timestampMeta = document.querySelector(".astra-mesMeta__time");

		expect(message).toHaveClass("astra-mes");
		expect(header?.parentElement).toBe(message);
		expect(header?.nextElementSibling).toBe(messageBlock);
		expect(header?.firstElementChild).toBe(avatarWrapper);
		expect(nameWrapper?.parentElement).toBe(header);
		expect(nameWrapper?.children[0]).toBe(identityLine);
		expect(nameWrapper?.children[1]).toBe(metadata);
		expect(nameWrapper?.children[2]).toBe(name);
		expect(identityLine?.children[0]).toBe(nameTextWrapper);
		expect(identityLine?.children[1]).toBe(modelMeta);
		expect(nameTextWrapper?.parentElement).toBe(identityLine);
		expect(nameTextWrapper?.firstElementChild).toBe(nameText);
		expect(nameText?.parentElement).toBe(nameTextWrapper);
		expect(name?.parentElement).toBe(nameWrapper);
		expect(collectCommentValues(name)).toContain(
			"astra-mesNameText:name_text",
		);
		expect(messageBlock).toHaveClass("astra-mesBody");
		expect(messageBlock?.firstElementChild).toBe(reasoning);
		expect(metadata?.parentElement).toBe(nameWrapper);
		expect(metadata?.children[0]).toBe(metadataItems);
		expect(metadata?.children).toHaveLength(1);
		expect(metadataChips).toHaveLength(3);
		expect(metadataSeparators).toHaveLength(3);
		expect(metadataSeparators[0]?.parentElement).toBe(metadataItems);
		expect(metadataSeparators[1]?.parentElement).toBe(metadataItems);
		expect(metadataSeparators[2]?.parentElement).toBe(metadataItems);
		expect(metadataItems?.children[0]).toBe(metadataChips[0]);
		expect(metadataItems?.children[1]).toBe(metadataSeparators[0]);
		expect(metadataItems?.children[2]).toBe(metadataChips[1]);
		expect(metadataItems?.children[3]).toBe(metadataSeparators[1]);
		expect(metadataItems?.children[4]).toBe(metadataChips[2]);
		expect(metadataItems?.children[5]).toBe(metadataSeparators[2]);
		expect(metadataItems?.children[6]).toBe(timestampMeta);
		expect(metadataSeparators[0]?.querySelector("svg")).toHaveClass(
			"lucide-dot",
		);
		expect(metadata?.querySelector(".astra-mesMeta__icon")).toBeNull();
		expect(metadata?.querySelector(".lucide-hash")).toBeNull();
		expect(metadata?.querySelector(".lucide-timer")).toBeNull();
		expect(metadata?.querySelector(".lucide-braces")).toBeNull();
		expect(metadataChips[0]?.children).toHaveLength(1);
		expect(metadataChips[0]?.children[0]).toBe(messageId);
		expect(messageId).toHaveTextContent("#0");
		expect(metadataChips[1]?.children).toHaveLength(1);
		expect(metadataChips[1]?.children[0]).toBe(timer);
		expect(metadataChips[2]?.children).toHaveLength(1);
		expect(metadataChips[2]?.children[0]).toBe(tokenCounter);
		expect(timestampMeta?.parentElement).toBe(metadataItems);
		expect(reasoning?.parentElement).toBe(messageBlock);
		expect(message?.querySelector(":scope > .mesAvatarWrapper")).toBeNull();

		feature.unmount();

		expect(document.querySelector(".astra-mesHeader")).toBeNull();
		expect(document.querySelector(".astra-mesHeader__name")).toBeNull();
		expect(document.querySelector(".astra-mesNameText")).toBeNull();
		expect(document.querySelector(".astra-mesMeta__item")).toBeNull();
		expect(message).not.toHaveClass("astra-mes");
		expect(messageBlock).not.toHaveClass("astra-mesBody");
		expect(message?.querySelector(":scope > .mesAvatarWrapper")).toBe(
			avatarWrapper,
		);
		expect(avatarWrapper?.children[0]).toHaveClass("avatar");
		expect(avatarWrapper?.children[1]).toBe(messageId);
		expect(messageId).toHaveTextContent("#0");
		expect(avatarWrapper?.children[2]).toBe(timer);
		expect(avatarWrapper?.children[3]).toBe(tokenCounter);
		expect(messageBlock?.firstElementChild).toBe(name);
		expect(name?.parentElement).toBe(messageBlock);
		expect(name?.querySelector(".name_text")).toBe(nameText);
	});

	test("adds one reversible Astra-owned reasoning chevron to native reasoning headers", () => {
		renderMessageWithReasoning();
		const reasoningDetails = document.querySelector(
			".mes_reasoning_details",
		);
		const reasoningHeader = document.querySelector(
			".mes_reasoning_header",
		);
		const nativeReasoningArrow = document.querySelector(
			".mes_reasoning_arrow",
		);
		const reasoningBody = document.querySelector(".mes_reasoning");

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		try {
			feature.mount();
			feature.mount();

			const astraChevrons = document.querySelectorAll(
				".astra-mesReasoningChevron",
			);
			const astraChevron = astraChevrons[0];

			expect(astraChevrons).toHaveLength(1);
			expect(astraChevron).toBeInstanceOf(SVGSVGElement);
			expect(astraChevron).toHaveClass("lucide-chevron-right");
			expect(astraChevron).toHaveAttribute("aria-hidden", "true");
			expect(astraChevron?.parentElement).toBe(reasoningHeader);
			expect(astraChevron?.previousElementSibling).toHaveClass(
				"mes_reasoning_header_title",
			);
			expect(astraChevron?.nextElementSibling).toBe(
				nativeReasoningArrow,
			);
			expect(reasoningDetails).toBeInTheDocument();
			expect(reasoningBody).toHaveTextContent("Visible reasoning text");
		} finally {
			feature.unmount();
		}

		expect(document.querySelector(".astra-mesReasoningChevron")).toBeNull();
		expect(document.querySelector(".mes_reasoning_details")).toBe(
			reasoningDetails,
		);
		expect(document.querySelector(".mes_reasoning_header")).toBe(
			reasoningHeader,
		);
		expect(document.querySelector(".mes_reasoning_arrow")).toBe(
			nativeReasoningArrow,
		);
		expect(document.querySelector(".mes_reasoning")).toBe(reasoningBody);
	});

	test("skips Astra reasoning chevrons when native reasoning headers are missing", () => {
		renderMessageWithReasoning({ includeReasoningHeader: false });
		const reasoningDetails = document.querySelector(
			".mes_reasoning_details",
		);
		const reasoningBody = document.querySelector(".mes_reasoning");

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		expect(document.querySelector(".astra-mesReasoningChevron")).toBeNull();
		expect(document.querySelector(".mes_reasoning_details")).toBe(
			reasoningDetails,
		);
		expect(document.querySelector(".mes_reasoning")).toBe(reasoningBody);

		feature.unmount();

		expect(document.querySelector(".astra-mesReasoningChevron")).toBeNull();
		expect(document.querySelector(".mes_reasoning_details")).toBe(
			reasoningDetails,
		);
	});

	test("builds the direct mobile mes frame with body metadata and native control compatibility slots", () => {
		renderMessage(3);
		const message = document.querySelector(".mes");
		const messageBlock = document.querySelector(".mes_block");
		const avatarWrapper = document.querySelector(".mesAvatarWrapper");
		const name = document.querySelector(".ch_name");
		const nameText = document.querySelector(".name_text");
		const reasoning = document.querySelector(".mes_reasoning_details");
		const messageText = document.querySelector(".mes_text");
		const messageButtons = document.querySelector(".mes_buttons");
		const timestamp = document.querySelector(".timestamp");

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const header = document.querySelector(".astra-mesHeader");
		const headerName = document.querySelector(".astra-mesHeader__name");
		const identityLine = document.querySelector(
			".astra-mesHeader__identityLine",
		);
		const nameTextWrapper = document.querySelector(".astra-mesNameText");
		const modelMeta = document.querySelector(".astra-mesModel");
		const body = document.querySelector(".astra-mesBody");
		const meta = document.querySelector(".astra-mesMeta");
		const metaItems = document.querySelector(".astra-mesMeta__items");
		const metaTime = document.querySelector(".astra-mesMeta__time");
		const nativeControls = document.querySelector(
			".astra-mesNativeControls",
		);

		expect(message).toHaveClass("astra-mes");
		expect(header?.parentElement).toBe(message);
		expect(header?.nextElementSibling).toBe(messageBlock);
		expect(header?.firstElementChild).toBe(avatarWrapper);
		expect(headerName?.parentElement).toBe(header);
		expect(headerName?.children[0]).toBe(identityLine);
		expect(headerName?.children[1]).toBe(meta);
		expect(headerName?.children[2]).toBe(name);
		expect(identityLine?.children[0]).toBe(nameTextWrapper);
		expect(identityLine?.children[1]).toBe(modelMeta);
		expect(nameTextWrapper?.firstElementChild).toBe(nameText);
		expect(name?.parentElement).toBe(headerName);
		expect(collectCommentValues(name)).toContain(
			"astra-mesNativeControls:mes_buttons",
		);
		expect(body).toBe(messageBlock);
		expect(messageBlock).toHaveClass("astra-mesBody");
		expect(messageBlock?.firstElementChild).toBe(reasoning);
		expect(messageText?.parentElement).toBe(messageBlock);
		expect(nativeControls?.parentElement).toBe(messageBlock);
		expect(messageBlock?.lastElementChild).toBe(nativeControls);
		expect(messageButtons?.parentElement).toBe(nativeControls);
		expect(meta?.parentElement).toBe(headerName);
		expect(meta?.children[0]).toBe(metaItems);
		expect(meta?.children).toHaveLength(1);
		expect(
			metaItems?.querySelectorAll(".astra-mesMeta__item"),
		).toHaveLength(3);
		expect(metaItems?.lastElementChild).toBe(metaTime);
		expect(metaTime?.parentElement).toBe(metaItems);
		expect(metaTime?.firstElementChild).toBe(timestamp);

		feature.unmount();

		expect(document.querySelector(".astra-mesHeader")).toBeNull();
		expect(document.querySelector(".astra-mesMeta")).toBeNull();
		expect(document.querySelector(".astra-mesNativeControls")).toBeNull();
		expect(document.querySelector(".astra-mesNameText")).toBeNull();
		expect(message).not.toHaveClass("astra-mes");
		expect(messageBlock).not.toHaveClass("astra-mesBody");
		expect(messageBlock?.firstElementChild).toBe(name);
		expect(name?.querySelector(".name_text")).toBe(nameText);
		expect(messageButtons?.parentElement).toBe(name);
	});

	test("does not render an empty metadata chip when mes_timer is absent", () => {
		renderMessage(1, { includeTimer: false });
		const messageId = document.querySelector(".mesIDDisplay");
		const tokenCounter = document.querySelector(".tokenCounterDisplay");

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const metadataChips = document.querySelectorAll(".astra-mesMeta__item");
		const metadataItems = document.querySelector(".astra-mesMeta__items");
		const separators = document.querySelectorAll(
			".astra-mesMeta__separator",
		);

		expect(metadataChips).toHaveLength(2);
		expect(metadataChips[0]?.children[0]).toBe(messageId);
		expect(messageId).toHaveTextContent("#1");
		expect(metadataItems?.querySelector(".mes_timer")).toBeNull();
		expect(metadataItems?.querySelector(".astra-mesMeta__icon")).toBeNull();
		expect(metadataItems?.querySelector(".lucide-hash")).toBeNull();
		expect(metadataItems?.querySelector(".lucide-timer")).toBeNull();
		expect(metadataItems?.querySelector(".lucide-braces")).toBeNull();
		expect(metadataChips[1]?.children[0]).toBe(tokenCounter);
		expect(separators).toHaveLength(2);
		expect(separators[0]?.parentElement).toBe(metadataItems);
		expect(separators[1]?.parentElement).toBe(metadataItems);
		expect(metadataItems?.lastElementChild).toBe(
			document.querySelector(".astra-mesMeta__time"),
		);

		feature.unmount();

		expect(messageId).toHaveTextContent("#1");
	});

	test("does not render an empty metadata chip when mes_timer has no text", () => {
		renderMessage(2, { timerText: "" });
		const avatarWrapper = document.querySelector(".mesAvatarWrapper");
		const timer = document.querySelector(".mes_timer");

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const metadataItems = document.querySelector(".astra-mesMeta__items");

		expect(timer).toBeInTheDocument();
		expect(timer?.parentElement).toBe(avatarWrapper);
		expect(timer).not.toBeVisible();
		expect(metadataItems?.querySelector(".lucide-timer")).toBeNull();
		expect(document.querySelectorAll(".astra-mesMeta__item")).toHaveLength(
			2,
		);
		expect(metadataItems?.lastElementChild).toBe(
			document.querySelector(".astra-mesMeta__time"),
		);

		feature.unmount();

		expect(document.querySelector(".mesAvatarWrapper")?.children[2]).toBe(
			timer,
		);
	});

	test("places timestamp in the single metadata items row without separators when metadata is empty", () => {
		renderMessage(4, { timerText: "" });
		const messageId = document.querySelector(".mesIDDisplay");
		const tokenCounter = document.querySelector(".tokenCounterDisplay");
		messageId!.textContent = "";
		tokenCounter!.textContent = "";

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const metadata = document.querySelector(".astra-mesMeta");
		const metadataItems = document.querySelector(".astra-mesMeta__items");
		const timestampMeta = document.querySelector(".astra-mesMeta__time");

		expect(metadata?.children).toHaveLength(1);
		expect(metadata?.children[0]).toBe(metadataItems);
		expect(metadataItems?.children).toHaveLength(1);
		expect(metadataItems?.firstElementChild).toBe(timestampMeta);
		expect(timestampMeta?.parentElement).toBe(metadataItems);
		expect(
			metadataItems?.querySelector(".astra-mesMeta__separator"),
		).toBeNull();

		feature.unmount();

		expect(messageId).toHaveTextContent("");
		expect(tokenCounter).toHaveTextContent("");
	});

	test("does not render a trailing metadata separator when timestamp is absent", () => {
		renderMessage(5, { includeTimestamp: false });

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const metadata = document.querySelector(".astra-mesMeta");
		const metadataItems = document.querySelector(".astra-mesMeta__items");
		const metadataChips = document.querySelectorAll(".astra-mesMeta__item");
		const separators = document.querySelectorAll(
			".astra-mesMeta__separator",
		);

		expect(document.querySelector(".astra-mesMeta__time")).toBeNull();
		expect(metadata?.children).toHaveLength(1);
		expect(metadata?.children[0]).toBe(metadataItems);
		expect(metadataChips).toHaveLength(3);
		expect(separators).toHaveLength(2);
		expect(metadataItems?.children[0]).toBe(metadataChips[0]);
		expect(metadataItems?.children[1]).toBe(separators[0]);
		expect(metadataItems?.children[2]).toBe(metadataChips[1]);
		expect(metadataItems?.children[3]).toBe(separators[1]);
		expect(metadataItems?.children[4]).toBe(metadataChips[2]);
		expect(metadataItems?.lastElementChild).toBe(metadataChips[2]);

		feature.unmount();
	});

	test("shows timestamp metadata when the native timestamp element was hidden before mount", () => {
		renderMessage(5);
		const timestamp = document.querySelector(".timestamp");
		if (timestamp instanceof HTMLElement) {
			timestamp.hidden = true;
		}

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		try {
			feature.mount();

			const timestampMeta = document.querySelector(
				".astra-mesMeta__time",
			);

			expect(document.body).not.toHaveClass("no-timestamps");
			expect(timestampMeta).toBeInTheDocument();
			expect(timestampMeta?.firstElementChild).toBe(timestamp);
			expect(timestamp).not.toHaveAttribute("hidden");
			expect(timestamp).toHaveTextContent("10:00 AM");
		} finally {
			feature.dispose();
		}

		expect(timestamp).toHaveAttribute("hidden");
	});

	test("recomputes metadata items and separators when SillyTavern display body classes change", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessage(6);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const metadata = document.querySelector(".astra-mesMeta");
			const metadataItems = document.querySelector(
				".astra-mesMeta__items",
			);
			const messageId = document.querySelector(".mesIDDisplay");
			const timer = document.querySelector(".mes_timer");
			const tokenCounter = document.querySelector(".tokenCounterDisplay");
			const timestampMeta = document.querySelector(
				".astra-mesMeta__time",
			);

			expect(
				metadataItems?.querySelectorAll(".astra-mesMeta__item"),
			).toHaveLength(3);
			expect(
				metadataItems?.querySelectorAll(".astra-mesMeta__separator"),
			).toHaveLength(3);

			document.body.classList.add("no-mesIDDisplay", "no-tokenCount");
			await Promise.resolve();
			frame.flushFrames();

			const remainingItems = metadataItems?.querySelectorAll(
				".astra-mesMeta__item",
			);
			const remainingSeparators = metadataItems?.querySelectorAll(
				".astra-mesMeta__separator",
			);
			expect(remainingItems).toHaveLength(1);
			expect(remainingItems?.[0]?.firstElementChild).toBe(timer);
			expect(remainingSeparators).toHaveLength(1);
			expect(metadataItems?.children[0]).toBe(remainingItems?.[0]);
			expect(metadataItems?.children[1]).toBe(remainingSeparators?.[0]);
			expect(metadataItems?.children[2]).toBe(timestampMeta);
			expect(messageId?.parentElement).toHaveClass("mesAvatarWrapper");
			expect(tokenCounter?.parentElement).toHaveClass("mesAvatarWrapper");

			document.body.classList.add("no-timer", "no-timestamps");
			await Promise.resolve();
			frame.flushFrames();

			expect(metadata).not.toBeVisible();
			expect(metadataItems).not.toBeVisible();
			expect(
				metadataItems?.querySelector(".astra-mesMeta__separator"),
			).toBeNull();
			expect(
				metadataItems?.querySelector(".astra-mesMeta__item"),
			).toBeNull();
			expect(timestampMeta?.parentElement).not.toBe(metadataItems);

			document.body.classList.remove(
				"no-mesIDDisplay",
				"no-tokenCount",
				"no-timer",
				"no-timestamps",
			);
			await Promise.resolve();
			frame.flushFrames();

			expect(metadata).toBeVisible();
			expect(
				metadataItems?.querySelectorAll(".astra-mesMeta__item"),
			).toHaveLength(3);
			expect(
				metadataItems?.querySelectorAll(".astra-mesMeta__separator"),
			).toHaveLength(3);
			expect(metadataItems?.lastElementChild).toBe(timestampMeta);
		} finally {
			feature?.dispose();
			frame.restore();
			document.body.classList.remove(
				"no-mesIDDisplay",
				"no-tokenCount",
				"no-timer",
				"no-timestamps",
			);
		}
	});

	test("syncs Astra prompt exclusion state onto message elements and removes it on unmount", async () => {
		const frame = installAnimationFrameQueue();
		const eventSource = createEventSource();
		const chat: Array<Record<string, unknown>> = [
			{
				is_system: true,
			},
		];
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessage();
			setSillyTavernContext({
				chat,
				eventSource,
				eventTypes: {
					MESSAGE_UPDATED: "message_updated",
				},
			});
			const message = document.querySelector(".mes");
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			expect(message).toHaveAttribute(
				"data-astra-message-prompt-excluded",
				"true",
			);

			chat[0].is_system = false;
			eventSource.emit("message_updated", 0);
			await Promise.resolve();
			frame.flushFrames();

			expect(message).not.toHaveAttribute(
				"data-astra-message-prompt-excluded",
			);

			delete chat[0].is_system;
			message?.setAttribute("is_system", "true");
			eventSource.emit("message_updated", 0);
			await Promise.resolve();
			frame.flushFrames();

			expect(message).toHaveAttribute(
				"data-astra-message-prompt-excluded",
				"true",
			);

			feature.unmount();

			expect(message).not.toHaveAttribute(
				"data-astra-message-prompt-excluded",
			);
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("moves timestamp and timestamp icon into the header with the compact model label", () => {
		renderMessage(0, { timestampIcon: true });
		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "makersuite - gemini-2.0-flash",
					},
				},
			],
		});
		const messageBlock = document.querySelector(".mes_block");
		const timestampParent = document.querySelector(".alignItemsBaseline");
		const nameText = document.querySelector(".name_text");
		const timestamp = document.querySelector(".timestamp");
		const timestampIcon = document.querySelector(".timestamp-icon");

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const metadata = document.querySelector(".astra-mesMeta");
		const headerName = document.querySelector(".astra-mesHeader__name");
		const identityLine = document.querySelector(
			".astra-mesHeader__identityLine",
		);
		const nameTextWrapper = document.querySelector(".astra-mesNameText");
		const modelMeta = document.querySelector(".astra-mesModel");
		const timestampMeta = document.querySelector(".astra-mesMeta__time");
		const modelLabel = document.querySelector(".astra-mesModel__label");

		expect(document.querySelector(".astra-mesMetaBar")).toBeNull();
		expect(metadata?.parentElement).toBe(headerName);
		expect(timestampMeta?.parentElement).toBe(
			document.querySelector(".astra-mesMeta__items"),
		);
		expect(metadata?.lastElementChild).toBe(
			document.querySelector(".astra-mesMeta__items"),
		);
		expect(nameTextWrapper?.parentElement).toBe(identityLine);
		expect(nameTextWrapper?.firstElementChild).toBe(nameText);
		expect(modelMeta?.parentElement).toBe(identityLine);
		expect(nameTextWrapper?.nextElementSibling).toBe(modelMeta);
		expect(modelMeta?.children[0]).toBe(timestampIcon);
		expect(modelMeta?.children[1]).toBe(modelLabel);
		expect(modelLabel).toHaveTextContent("gemini-2.0-flash");
		expect(timestampMeta?.firstElementChild).toBe(timestamp);
		expect(timestamp).toHaveTextContent(
			formatStTimestampTimeOnly("June 1, 2026 10:00 AM"),
		);
		expect(timestamp).toHaveAttribute("title", "June 1, 2026 10:00 AM");
		expect(timestamp?.parentElement).not.toBe(timestampParent);
		expect(collectCommentValues(timestampParent)).toContain(
			"astra-mesNameText:name_text",
		);
		expect(messageBlock?.querySelector(".ch_name")).toBeNull();
		expect(
			document.querySelector(".astra-mesHeader__name > .ch_name"),
		).toBeTruthy();

		feature.unmount();

		expect(document.querySelector(".astra-mesNameText")).toBeNull();
		expect(document.querySelector(".astra-mesMeta__time")).toBeNull();
		expect(nameText?.parentElement).toBe(timestampParent);
		expect(timestampIcon?.parentElement).toBe(timestampParent);
		expect(timestamp?.parentElement).toBe(timestampParent);
		expect(nameText?.nextElementSibling).toBe(timestamp);
		expect(timestamp?.nextElementSibling).toBe(timestampIcon);
		expect(timestamp).toHaveTextContent("June 1, 2026 10:00 AM");
		expect(timestamp).toHaveAttribute(
			"title",
			"makersuite - gemini-2.0-flash",
		);
	});

	test("uses chat send_date before DOM timestamps for compact time labels and date dividers", () => {
		renderMessage(0, {
			messageTimestamp: "June 1, 2026 10:00 AM",
			timestampText: "June 1, 2026 10:00 AM",
		});
		setSillyTavernContext({
			chat: [
				{
					send_date: "June 4, 2026 11:34 AM",
				},
			],
		});

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		expect(document.querySelector(".timestamp")).toHaveTextContent(
			formatStTimestampTimeOnly("June 4, 2026 11:34 AM"),
		);
		expect(
			document.querySelector(".astra-mesDate__label"),
		).toHaveTextContent(
			formatStTimestampDateDivider("June 4, 2026 11:34 AM"),
		);

		feature.dispose();
	});

	test("formats compact timestamps and date dividers with SillyTavern localized moment labels", () => {
		renderMessage(0, {
			messageTimestamp: "June 4, 2026 11:34 AM",
			timestampText: "June 4, 2026 11:34 AM",
		});
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: (pattern: string) =>
					pattern === "LT" ? "上午 11:34" : "2026年6月4日",
				valueOf: () => new Date(2026, 5, 4, 11, 34).getTime(),
			}),
		});

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		expect(document.querySelector(".timestamp")).toHaveTextContent(
			"上午 11:34",
		);
		expect(
			document.querySelector(".astra-mesDate__label"),
		).toHaveTextContent("2026年6月4日");

		feature.dispose();
	});

	test("inserts one date divider before the first message for each local day and removes them on unmount", () => {
		renderMessages([
			{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
			{ id: 1, timestampText: "June 4, 2026 11:34 AM" },
			{ id: 2, timestampText: "June 5, 2026 12:05 AM" },
		]);
		const firstMessage = document.querySelector('.mes[mesid="0"]');
		const secondMessage = document.querySelector('.mes[mesid="1"]');
		const thirdMessage = document.querySelector('.mes[mesid="2"]');

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const dividers = Array.from(
			document.querySelectorAll(".astra-mesDate"),
		);
		const labels = dividers.map(
			(divider) =>
				divider.querySelector(".astra-mesDate__label")?.textContent,
		);

		expect(dividers).toHaveLength(2);
		expect(labels).toEqual([
			formatStTimestampDateDivider("June 4, 2026 9:00 AM"),
			formatStTimestampDateDivider("June 5, 2026 12:05 AM"),
		]);
		expect(firstMessage?.previousElementSibling).toBe(dividers[0]);
		expect(secondMessage?.previousElementSibling).not.toHaveClass(
			"astra-mesDate",
		);
		expect(thirdMessage?.previousElementSibling).toBe(dividers[1]);

		feature.unmount();

		expect(document.querySelector(".astra-mesDate")).toBeNull();
		expect(firstMessage?.previousElementSibling).toBeNull();
		expect(secondMessage?.previousElementSibling).toBe(firstMessage);
		expect(thirdMessage?.previousElementSibling).toBe(secondMessage);
	});

	test("inserts an Astra context boundary before the last message included in prompt context", () => {
		renderMessages([
			{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
			{
				className: "lastInContext",
				id: 1,
				timestampText: "June 4, 2026 11:34 AM",
			},
		]);
		const firstMessage = document.querySelector('.mes[mesid="0"]');
		const contextMessage = document.querySelector('.mes[mesid="1"]');

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		try {
			feature.mount();

			const boundary = document.getElementById(
				"astra-mesContextBoundary",
			);
			expect(boundary).toBeInstanceOf(HTMLDivElement);
			expect(boundary).toHaveClass("astra-mesContextBoundary");
			expect(boundary).toHaveAttribute(
				"data-astra-component",
				"message-context-boundary",
			);
			expect(boundary).toHaveAttribute("role", "separator");
			expect(boundary).toHaveAttribute(
				"aria-label",
				"Context: Chat history starts here",
			);
			expect(
				boundary?.querySelector(".astra-mesContextBoundary__tag"),
			).toHaveTextContent("Context");
			const tag = boundary?.querySelector(
				".astra-mesContextBoundary__tag",
			);
			const tagIcon = tag?.querySelector(".lucide-messages-square");
			expect(tagIcon).toBeInstanceOf(SVGSVGElement);
			expect(tagIcon).toHaveAttribute("aria-hidden", "true");
			expect(tagIcon?.nextSibling?.textContent).toBe("Context");
			expect(
				boundary?.querySelector(".astra-mesContextBoundary__title"),
			).toHaveTextContent("Chat history starts here");
			expect(contextMessage?.previousElementSibling).toBe(boundary);
			expect(firstMessage?.nextElementSibling).toBe(boundary);
		} finally {
			feature.dispose();
		}
	});

	test("places the context boundary after the date divider when both target the same message", () => {
		renderMessages([
			{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
			{
				className: "lastInContext",
				id: 1,
				timestampText: "June 5, 2026 12:05 AM",
			},
		]);
		const contextMessage = document.querySelector('.mes[mesid="1"]');

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		try {
			feature.mount();

			const boundary = document.getElementById(
				"astra-mesContextBoundary",
			);
			const previousDivider = boundary?.previousElementSibling;
			expect(contextMessage?.previousElementSibling).toBe(boundary);
			expect(previousDivider).toHaveClass("astra-mesDate");
			expect(previousDivider?.nextElementSibling).toBe(boundary);
			expect(
				previousDivider?.querySelector(".astra-mesDate__label"),
			).toHaveTextContent(
				formatStTimestampDateDivider("June 5, 2026 12:05 AM"),
			);
		} finally {
			feature.dispose();
		}
	});

	test("does not reinsert the date divider or context boundary when both already frame the same message", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;
		let insertBeforeSpy: MockInstance | null = null;

		try {
			renderMessages([
				{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
				{
					className: "lastInContext",
					id: 1,
					timestampText: "June 5, 2026 12:05 AM",
				},
			]);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const chatRoot = document.getElementById("chat") as HTMLDivElement;
			const contextMessage = document.querySelector('.mes[mesid="1"]');
			const boundary = document.getElementById(
				"astra-mesContextBoundary",
			);
			const divider = boundary?.previousElementSibling;
			expect(divider).toHaveClass("astra-mesDate");
			expect(boundary?.nextElementSibling).toBe(contextMessage);
			insertBeforeSpy = vi.spyOn(chatRoot, "insertBefore");

			const messageText = document.querySelector(
				'.mes[mesid="1"] .mes_text',
			);
			messageText?.append(document.createElement("span"));
			await Promise.resolve();
			frame.flushFrames();

			expect(insertBeforeSpy).not.toHaveBeenCalled();
			expect(boundary?.previousElementSibling).toBe(divider);
			expect(boundary?.nextElementSibling).toBe(contextMessage);
		} finally {
			insertBeforeSpy?.mockRestore();
			feature?.dispose();
			frame.restore();
		}
	});

	test("keeps the context boundary node stable during unrelated message subtree mutations", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessages([
				{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
				{
					className: "lastInContext",
					id: 1,
					timestampText: "June 4, 2026 11:34 AM",
				},
			]);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const boundary = document.getElementById(
				"astra-mesContextBoundary",
			);
			expect(boundary).toBeInTheDocument();

			const messageText = document.querySelector(
				'.mes[mesid="1"] .mes_text',
			);
			messageText?.append(document.createElement("span"));
			await Promise.resolve();
			frame.flushFrames();

			expect(document.getElementById("astra-mesContextBoundary")).toBe(
				boundary,
			);
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("moves and removes the context boundary when lastInContext changes", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessages([
				{
					className: "lastInContext",
					id: 0,
					timestampText: "June 4, 2026 9:00 AM",
				},
				{ id: 1, timestampText: "June 4, 2026 11:34 AM" },
			]);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const firstMessage = document.querySelector('.mes[mesid="0"]');
			const secondMessage = document.querySelector('.mes[mesid="1"]');
			const boundary = document.getElementById(
				"astra-mesContextBoundary",
			);
			expect(firstMessage?.previousElementSibling).toBe(boundary);

			firstMessage?.classList.remove("lastInContext");
			secondMessage?.classList.add("lastInContext");
			await Promise.resolve();
			frame.flushFrames();

			expect(document.getElementById("astra-mesContextBoundary")).toBe(
				boundary,
			);
			expect(secondMessage?.previousElementSibling).toBe(boundary);

			secondMessage?.classList.remove("lastInContext");
			await Promise.resolve();
			frame.flushFrames();

			expect(
				document.getElementById("astra-mesContextBoundary"),
			).toBeNull();
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("resyncs the context boundary after SillyTavern prepares generation data", async () => {
		const frame = installAnimationFrameQueue();
		const eventSource = createEventSource();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessages([
				{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
				{ id: 1, timestampText: "June 4, 2026 11:34 AM" },
			]);
			setSillyTavernContext({
				eventSource,
				eventTypes: {
					GENERATE_AFTER_DATA: "generate_after_data",
				},
			});
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			expect(
				document.getElementById("astra-mesContextBoundary"),
			).toBeNull();

			const contextMessage = document.querySelector('.mes[mesid="1"]');
			contextMessage?.classList.add("lastInContext");
			eventSource.emit("generate_after_data");
			await Promise.resolve();
			frame.flushFrames();

			const boundary = document.getElementById(
				"astra-mesContextBoundary",
			);
			expect(contextMessage?.previousElementSibling).toBe(boundary);
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("removes the context boundary on unmount without changing the native lastInContext marker", () => {
		renderMessages([
			{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
			{
				className: "lastInContext",
				id: 1,
				timestampText: "June 4, 2026 11:34 AM",
			},
		]);
		const contextMessage = document.querySelector('.mes[mesid="1"]');

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		try {
			feature.mount();

			expect(
				document.getElementById("astra-mesContextBoundary"),
			).toBeInTheDocument();

			feature.unmount();

			expect(
				document.getElementById("astra-mesContextBoundary"),
			).toBeNull();
			expect(contextMessage).toHaveClass("lastInContext");
			expect(contextMessage?.previousElementSibling).toBe(
				document.querySelector('.mes[mesid="0"]'),
			);
		} finally {
			feature.dispose();
		}
	});

	test("rebuilds date dividers for messages added after mount without duplicates", async () => {
		renderMessages([{ id: 0, timestampText: "June 4, 2026 9:00 AM" }]);

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();
		document.getElementById("chat")?.insertAdjacentHTML(
			"beforeend",
			`
                <div class="mes" mesid="1">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"></div>
                        <div class="mesIDDisplay">#1</div>
                        <div class="tokenCounterDisplay">321 tokens</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">
                            <span class="name_text">Assistant</span>
                            <small class="timestamp">June 5, 2026 12:05 AM</small>
                        </div>
                        <div class="mes_text">Message 1</div>
                    </div>
                </div>
            `,
		);

		await waitFor(() => {
			expect(document.querySelectorAll(".astra-mesDate")).toHaveLength(2);
		});

		const labels = Array.from(
			document.querySelectorAll(".astra-mesDate__label"),
		).map((label) => label.textContent);
		expect(labels).toEqual([
			formatStTimestampDateDivider("June 4, 2026 9:00 AM"),
			formatStTimestampDateDivider("June 5, 2026 12:05 AM"),
		]);

		feature.dispose();
	});

	test("keeps date divider nodes stable during unrelated message subtree mutations", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessages([
				{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
				{ id: 1, timestampText: "June 4, 2026 11:34 AM" },
			]);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const divider = document.querySelector(".astra-mesDate");
			expect(divider).toBeInTheDocument();

			const messageText = document.querySelector(
				'.mes[mesid="1"] .mes_text',
			);
			messageText?.append(document.createElement("span"));
			await Promise.resolve();
			frame.flushFrames();

			expect(document.querySelector(".astra-mesDate")).toBe(divider);
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("preserves the existing divider when a same-day message is added", async () => {
		renderMessages([{ id: 0, timestampText: "June 4, 2026 9:00 AM" }]);

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const divider = document.querySelector(".astra-mesDate");
		document.getElementById("chat")?.insertAdjacentHTML(
			"beforeend",
			`
                <div class="mes" mesid="1">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"></div>
                        <div class="mesIDDisplay">#1</div>
                        <div class="tokenCounterDisplay">321 tokens</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">
                            <span class="name_text">Assistant</span>
                            <small class="timestamp">June 4, 2026 11:34 AM</small>
                        </div>
                        <div class="mes_text">Message 1</div>
                    </div>
                </div>
            `,
		);

		await waitFor(() => {
			expect(document.querySelectorAll(".astra-mesHeader")).toHaveLength(
				2,
			);
		});

		expect(document.querySelectorAll(".astra-mesDate")).toHaveLength(1);
		expect(document.querySelector(".astra-mesDate")).toBe(divider);

		feature.dispose();
	});

	test("adds only the new cross-day divider while preserving existing dividers", async () => {
		renderMessages([{ id: 0, timestampText: "June 4, 2026 9:00 AM" }]);

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		const firstDivider = document.querySelector(".astra-mesDate");
		document.getElementById("chat")?.insertAdjacentHTML(
			"beforeend",
			`
                <div class="mes" mesid="1">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"></div>
                        <div class="mesIDDisplay">#1</div>
                        <div class="tokenCounterDisplay">321 tokens</div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name">
                            <span class="name_text">Assistant</span>
                            <small class="timestamp">June 5, 2026 12:05 AM</small>
                        </div>
                        <div class="mes_text">Message 1</div>
                    </div>
                </div>
            `,
		);

		await waitFor(() => {
			expect(document.querySelectorAll(".astra-mesDate")).toHaveLength(2);
		});

		const dividers = document.querySelectorAll(".astra-mesDate");
		expect(dividers[0]).toBe(firstDivider);
		expect(dividers[1]).not.toBe(firstDivider);

		feature.dispose();
	});

	test("moves a day divider to the next same-day message when the first message is removed", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessages([
				{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
				{ id: 1, timestampText: "June 4, 2026 11:34 AM" },
			]);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const divider = document.querySelector(".astra-mesDate");
			const firstMessage = document.querySelector('.mes[mesid="0"]');
			const secondMessage = document.querySelector('.mes[mesid="1"]');

			firstMessage?.remove();
			await Promise.resolve();
			frame.flushFrames();

			expect(document.querySelector(".astra-mesDate")).toBe(divider);
			expect(secondMessage?.previousElementSibling).toBe(divider);
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("leaves unparseable timestamps untouched and does not create date dividers for them", () => {
		renderMessage(0, { timestampText: "not-a-real-timestamp" });
		const timestamp = document.querySelector(".timestamp");

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		expect(timestamp).toHaveTextContent("not-a-real-timestamp");
		expect(document.querySelector(".astra-mesDate")).toBeNull();

		feature.dispose();
	});

	test("formats slash-delimited model ids for the timestamp model label", () => {
		renderMessage(0, { timestampIcon: true });
		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
				},
			],
		});

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();

		expect(
			document.querySelector(".astra-mesModel__label"),
		).toHaveTextContent("gemini-2.5-pro");

		feature.dispose();
	});

	test("falls back to the native timestamp icon title for the compact model label", () => {
		renderMessage(0, { timestampIcon: true });
		setSillyTavernContext({
			chat: [
				{
					extra: {},
				},
			],
		});

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		try {
			feature.mount();

			expect(
				document.querySelector(".astra-mesModel__label"),
			).toHaveTextContent("gemini-2.0-flash");
		} finally {
			feature.dispose();
		}
	});

	test("hides header model metadata when SillyTavern model icons are disabled", async () => {
		const frame = installAnimationFrameQueue();
		const eventSource = createEventSource();
		const context = {
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
				},
			],
			eventSource,
			eventTypes: {
				SETTINGS_UPDATED: "settings_updated",
			},
			powerUserSettings: {
				messageModelIconEnabled: false,
			},
		};
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessage(0, { timestampIcon: true });
			setSillyTavernContext(context);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const modelMeta = document.querySelector(".astra-mesModel");
			expect(modelMeta).toHaveAttribute("hidden");
			expect(
				document.querySelector(".astra-mesModel__label"),
			).toHaveTextContent("gemini-2.5-pro");

			context.powerUserSettings.messageModelIconEnabled = true;
			eventSource.emit("settings_updated");
			await Promise.resolve();
			frame.flushFrames();

			expect(modelMeta).not.toHaveAttribute("hidden");
			expect(
				document.querySelector(".astra-mesModel__label"),
			).toHaveTextContent("gemini-2.5-pro");
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("hides header model metadata when SillyTavern timestamp_model_icon is disabled", async () => {
		const frame = installAnimationFrameQueue();
		const eventSource = createEventSource();
		const context = {
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
				},
			],
			eventSource,
			eventTypes: {
				SETTINGS_UPDATED: "settings_updated",
			},
			powerUserSettings: {
				timestamp_model_icon: false,
			},
		};
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessage(0, { timestampIcon: true });
			setSillyTavernContext(context);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const modelMeta = document.querySelector(".astra-mesModel");
			expect(modelMeta).toHaveAttribute("hidden");
			expect(
				document.querySelector(".astra-mesModel__label"),
			).toHaveTextContent("gemini-2.5-pro");

			context.powerUserSettings.timestamp_model_icon = true;
			eventSource.emit("settings_updated");
			await Promise.resolve();
			frame.flushFrames();

			expect(modelMeta).not.toHaveAttribute("hidden");
			expect(
				document.querySelector(".astra-mesModel__label"),
			).toHaveTextContent("gemini-2.5-pro");
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("hides header model metadata when the no-modelIcons body class changes", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessage(0, { timestampIcon: true });
			setSillyTavernContext({
				chat: [
					{
						extra: {
							model: "openrouter/google/gemini-2.5-pro",
						},
					},
				],
			});
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const modelMeta = document.querySelector(".astra-mesModel");
			expect(modelMeta).not.toHaveAttribute("hidden");

			document.body.classList.add("no-modelIcons");
			await Promise.resolve();
			frame.flushFrames();

			expect(modelMeta).toHaveAttribute("hidden");
			expect(
				document.querySelector(".astra-mesModel__label"),
			).toHaveTextContent("gemini-2.5-pro");

			document.body.classList.remove("no-modelIcons");
			await Promise.resolve();
			frame.flushFrames();

			expect(modelMeta).not.toHaveAttribute("hidden");
		} finally {
			feature?.dispose();
			frame.restore();
			document.body.classList.remove("no-modelIcons");
		}
	});

	test("keeps the header model chip hidden without fetching a fallback when no native timestamp icon exists", () => {
		const fetchProviderIcon = vi.fn(async () => ({
			ok: true,
			text: async () =>
				'<svg viewBox="0 0 24 24" onclick="alert(1)"><defs><linearGradient id="paint"><stop offset="0%" /></linearGradient></defs><path onclick="alert(1)" fill="url(#paint)" d="M4 12h16"></path></svg>',
		}));
		vi.stubGlobal("fetch", fetchProviderIcon);
		renderMessage();
		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
				},
			],
			powerUserSettings: {
				messageModelIconEnabled: true,
			},
		});

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		try {
			feature.mount();

			const modelMeta = document.querySelector(".astra-mesModel");
			expect(modelMeta).toHaveAttribute("hidden");
			expect(modelMeta?.childElementCount).toBe(0);
			expect(document.querySelector(".astra-mesModel__label")).toBeNull();
			expect(
				document.querySelector(".astra-mesModel__fallbackIcon"),
			).toBeNull();
			expect(fetchProviderIcon).not.toHaveBeenCalled();

			feature.dispose();

			expect(
				document.querySelector(".astra-mesModel__fallbackIcon"),
			).toBeNull();
			expect(document.querySelector(".astra-mesModel")).toBeNull();
			expect(document.querySelector(".timestamp")).toBeInTheDocument();
		} finally {
			feature.dispose();
		}
	});

	test("moves a native span timestamp icon into the visible header model chip", () => {
		renderMessage(0, {
			timestampIconMarkup:
				'<span class="icon-svg timestamp-icon custom-model-icon" title="makersuite - gemini-2.0-flash"><span class="model-glyph"></span></span>',
		});
		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
				},
			],
			powerUserSettings: {
				messageModelIconEnabled: true,
			},
		});

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		try {
			feature.mount();

			const modelMeta = document.querySelector(".astra-mesModel");
			const modelIcon = modelMeta?.querySelector(
				":scope > .timestamp-icon.custom-model-icon",
			);
			const modelLabel = modelMeta?.querySelector(
				":scope > .astra-mesModel__label",
			);

			expect(modelMeta).not.toHaveAttribute("hidden");
			expect(modelMeta?.children[0]).toBe(modelIcon);
			expect(modelMeta?.children[1]).toBe(modelLabel);
			expect(modelIcon?.localName).toBe("span");
			expect(modelIcon?.querySelector(".model-glyph")).toBeInTheDocument();
			expect(modelLabel).toHaveTextContent("gemini-2.5-pro");
			expect(
				document.querySelector(".astra-mesMeta__time .timestamp-icon"),
			).toBeNull();
		} finally {
			feature.dispose();
		}
	});

	test("keeps hidden model metadata stable when model metadata exists without a native timestamp icon and model icons are disabled", async () => {
		const frame = installAnimationFrameQueue();
		const eventSource = createEventSource();
		const hiddenMutations: MutationRecord[] = [];
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;
		let modelObserver: MutationObserver | null = null;

		try {
			renderMessage();
			setSillyTavernContext({
				chat: [
					{
						extra: {
							model: "openrouter/google/gemini-2.5-pro",
						},
					},
				],
				eventSource,
				eventTypes: {
					SETTINGS_UPDATED: "settings_updated",
				},
				powerUserSettings: {
					messageModelIconEnabled: false,
				},
			});
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const modelMeta = document.querySelector(".astra-mesModel");
			expect(modelMeta).toHaveAttribute("hidden");
			expect(modelMeta?.childElementCount).toBe(0);

			if (modelMeta) {
				modelObserver = new MutationObserver((mutations) => {
					hiddenMutations.push(...mutations);
				});
				modelObserver.observe(modelMeta, {
					attributeFilter: ["hidden"],
					attributes: true,
				});
			}

			eventSource.emit("settings_updated");
			await Promise.resolve();
			frame.flushFrames();
			await Promise.resolve();

			expect(modelMeta).toHaveAttribute("hidden");
			expect(hiddenMutations).toHaveLength(0);
		} finally {
			modelObserver?.disconnect();
			feature?.dispose();
			frame.restore();
		}
	});

	test("shows the hidden model chip when a native timestamp SVG is inserted after mount", async () => {
		const frame = installAnimationFrameQueue();
		const fetchProviderIcon = vi.fn(async () => ({
			ok: true,
			text: async () =>
				'<svg viewBox="0 0 24 24"><path d="M4 12h16"></path></svg>',
		}));
		vi.stubGlobal("fetch", fetchProviderIcon);
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessage();
			setSillyTavernContext({
				chat: [
					{
						extra: {
							model: "openrouter/google/gemini-2.5-pro",
						},
					},
				],
				powerUserSettings: {
					messageModelIconEnabled: true,
				},
			});
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});
			feature.mount();

			const modelMeta = document.querySelector(".astra-mesModel");
			expect(modelMeta).toHaveAttribute("hidden");
			expect(
				modelMeta?.querySelector(
					":scope > .astra-mesModel__fallbackIcon",
				),
			).toBeNull();
			expect(fetchProviderIcon).not.toHaveBeenCalled();

			const timestamp = document.querySelector(".timestamp");
			const timestampIcon = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"svg",
			);
			timestampIcon.classList.add(
				"icon-svg",
				"timestamp-icon",
				"custom-model-icon",
			);
			timestampIcon.setAttribute(
				"title",
				"makersuite - gemini-2.0-flash",
			);
			timestampIcon.setAttribute("viewBox", "0 0 24 24");
			const path = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"path",
			);
			path.setAttribute("d", "M1 12h22");
			timestampIcon.appendChild(path);
			timestamp?.after(timestampIcon);

			await Promise.resolve();
			frame.flushFrames();

			const modelLabel = modelMeta?.querySelector(
				":scope > .astra-mesModel__label",
			);
			const nativeIcon = modelMeta?.querySelector(
				":scope > .timestamp-icon.custom-model-icon",
			);

			expect(modelMeta).not.toHaveAttribute("hidden");
			expect(modelMeta?.children[0]).toBe(nativeIcon);
			expect(modelMeta?.children[1]).toBe(modelLabel);
			expect(modelLabel).toHaveTextContent("gemini-2.5-pro");
			expect(
				modelMeta?.querySelector(
					":scope > .astra-mesModel__fallbackIcon",
				),
			).toBeNull();
			expect(
				document.querySelectorAll(".astra-mesModel__label"),
			).toHaveLength(1);
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("moves a native SVG timestamp icon into the visible header model chip", () => {
		renderMessage(0, {
			timestampIconMarkup:
				'<svg class="icon-svg timestamp-icon custom-model-icon" title="makersuite - gemini-2.0-flash" viewBox="0 0 24 24"><path d="M4 12h16"></path></svg>',
		});
		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
				},
			],
			powerUserSettings: {
				messageModelIconEnabled: true,
			},
		});

		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		try {
			feature.mount();

			const modelMeta = document.querySelector(".astra-mesModel");
			const modelIcon = modelMeta?.querySelector(
				":scope > .timestamp-icon.custom-model-icon",
			);
			const modelLabel = modelMeta?.querySelector(
				":scope > .astra-mesModel__label",
			);

			expect(modelMeta).not.toHaveAttribute("hidden");
			expect(modelMeta?.children[0]).toBe(modelIcon);
			expect(modelMeta?.children[1]).toBe(modelLabel);
			expect(modelIcon?.localName).toBe("svg");
			expect(modelLabel).toHaveTextContent("gemini-2.5-pro");
			expect(
				document.querySelector(".astra-mesMeta__time .timestamp-icon"),
			).toBeNull();
		} finally {
			feature.dispose();
		}
	});

	test("keeps the model chip visible while SVGInject replaces a native timestamp image", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessage();
			setSillyTavernContext({
				chat: [
					{
						extra: {
							model: "openrouter/google/gemini-2.5-pro",
						},
					},
				],
			});
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});
			feature.mount();

			const timestamp = document.querySelector(".timestamp");
			const timestampImage = document.createElement("img");
			timestampImage.className = "icon-svg timestamp-icon";
			timestampImage.title = "makersuite - gemini-2.0-flash";
			timestamp?.after(timestampImage);

			await Promise.resolve();
			frame.flushFrames();

			const modelMeta = document.querySelector(".astra-mesModel");

			expect(modelMeta).not.toHaveAttribute("hidden");
			expect(modelMeta?.children[0]).toBe(timestampImage);
			expect(
				document.querySelectorAll(".astra-mesModel__label"),
			).toHaveLength(1);
			expect(
				document.querySelector(".astra-mesModel__label"),
			).toHaveTextContent("gemini-2.5-pro");
			expect(
				document.querySelector(".astra-mesMeta__time .timestamp-icon"),
			).toBeNull();

			const timestampIcon = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"svg",
			);
			timestampIcon.classList.add("icon-svg", "timestamp-icon");
			timestampIcon.setAttribute(
				"title",
				"makersuite - gemini-2.0-flash",
			);
			timestampIcon.setAttribute("viewBox", "0 0 24 24");
			timestampImage.replaceWith(timestampIcon);

			await Promise.resolve();
			frame.flushFrames();

			expect(modelMeta).not.toHaveAttribute("hidden");
			expect(modelMeta?.children[0]).toBe(timestampIcon);
			expect(
				document.querySelectorAll(".astra-mesModel__label"),
			).toHaveLength(1);
			expect(
				document.querySelector(".astra-mesModel__label"),
			).toHaveTextContent("gemini-2.5-pro");
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("ignores unrelated descendant class mutations while observing lastInContext message class changes", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessages([
				{ id: 0, timestampText: "June 4, 2026 9:00 AM" },
				{ id: 1, timestampText: "June 4, 2026 11:34 AM" },
			]);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();
			frame.requestAnimationFrame.mockClear();

			const messageText = document.querySelector(
				'.mes[mesid="1"] .mes_text',
			);
			messageText?.classList.add("unrelated-native-state");
			await Promise.resolve();

			expect(frame.requestAnimationFrame).not.toHaveBeenCalled();

			const secondMessage = document.querySelector('.mes[mesid="1"]');
			secondMessage?.classList.add("lastInContext");
			await Promise.resolve();

			expect(frame.requestAnimationFrame).toHaveBeenCalledTimes(1);

			frame.flushFrames();

			const boundary = document.getElementById(
				"astra-mesContextBoundary",
			);
			expect(boundary).toBeInTheDocument();
			expect(secondMessage?.previousElementSibling).toBe(boundary);
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("applies the header layout to messages added after mount", async () => {
		document.body.innerHTML = '<div id="chat"></div>';
		const feature = createMessageHeaderLayoutFeature({
			documentRef: document,
		});

		feature.mount();
		document.getElementById("chat")?.insertAdjacentHTML(
			"beforeend",
			`
                <div class="mes" mesid="1">
                    <div class="mesAvatarWrapper">
                        <div class="avatar"></div>
                        <div class="mesIDDisplay"></div>
                        <div class="mes_timer"></div>
                        <div class="tokenCounterDisplay"></div>
                    </div>
                    <div class="mes_block">
                        <div class="ch_name"></div>
                        <div class="mes_text"></div>
                    </div>
                </div>
            `,
		);

		await waitFor(() => {
			expect(
				document.querySelector('.mes[mesid="1"] .astra-mesHeader'),
			).toBeInTheDocument();
		});

		feature.dispose();

		expect(document.querySelector(".astra-mesHeader")).toBeNull();
	});

	test("coalesces chat mutation batches and ignores its own wrapper mutations", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			document.body.innerHTML = '<div id="chat"></div>';
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();
			document.getElementById("chat")?.insertAdjacentHTML(
				"beforeend",
				`
                    <div class="mes" mesid="1">
                        <div class="mesAvatarWrapper">
                            <div class="avatar"></div>
                            <div class="mesIDDisplay"></div>
                            <div class="mes_timer"></div>
                            <div class="tokenCounterDisplay"></div>
                        </div>
                        <div class="mes_block">
                            <div class="ch_name"></div>
                            <div class="mes_text"></div>
                        </div>
                    </div>
                    <div class="mes" mesid="2">
                        <div class="mesAvatarWrapper">
                            <div class="avatar"></div>
                            <div class="mesIDDisplay"></div>
                            <div class="mes_timer"></div>
                            <div class="tokenCounterDisplay"></div>
                        </div>
                        <div class="mes_block">
                            <div class="ch_name"></div>
                            <div class="mes_text"></div>
                        </div>
                    </div>
                `,
			);

			await Promise.resolve();

			expect(frame.requestAnimationFrame).toHaveBeenCalledTimes(1);

			frame.flushFrames();

			expect(document.querySelectorAll(".astra-mesHeader")).toHaveLength(
				2,
			);

			frame.requestAnimationFrame.mockClear();
			await Promise.resolve();
			frame.flushFrames();

			expect(frame.requestAnimationFrame).not.toHaveBeenCalled();
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("keeps metadata row nodes stable when native metadata text changes", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessage(7);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const metadataItems = document.querySelector(
				".astra-mesMeta__items",
			);
			const timer = document.querySelector(".mes_timer");
			const tokenCounter = document.querySelector(".tokenCounterDisplay");
			expect(metadataItems).toBeInstanceOf(HTMLDivElement);
			expect(timer).toBeInstanceOf(HTMLDivElement);
			expect(tokenCounter).toBeInstanceOf(HTMLDivElement);

			const initialChildren = Array.from(metadataItems?.childNodes ?? []);

			if (timer instanceof HTMLDivElement) {
				timer.textContent = "4.3s";
			}
			if (tokenCounter instanceof HTMLDivElement) {
				tokenCounter.textContent = "322t";
			}
			await Promise.resolve();
			frame.flushFrames();

			const nextChildren = Array.from(metadataItems?.childNodes ?? []);
			expect(nextChildren).toHaveLength(initialChildren.length);
			for (const [index, child] of initialChildren.entries()) {
				expect(nextChildren[index]).toBe(child);
			}
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});

	test("continues observing prompt exclusion attributes after a child-list resync", async () => {
		const frame = installAnimationFrameQueue();
		let feature: ReturnType<
			typeof createMessageHeaderLayoutFeature
		> | null = null;

		try {
			renderMessage(8);
			feature = createMessageHeaderLayoutFeature({
				documentRef: document,
			});

			feature.mount();

			const message = document.querySelector(".mes");
			const timer = document.querySelector(".mes_timer");
			expect(message).toBeInstanceOf(HTMLDivElement);
			expect(timer).toBeInstanceOf(HTMLDivElement);

			if (timer instanceof HTMLDivElement) {
				timer.textContent = "4.3s";
			}
			await Promise.resolve();
			frame.flushFrames();

			message?.setAttribute("is_system", "true");
			await Promise.resolve();
			frame.flushFrames();

			expect(message).toHaveAttribute(
				"data-astra-message-prompt-excluded",
				"true",
			);
		} finally {
			feature?.dispose();
			frame.restore();
		}
	});
});
