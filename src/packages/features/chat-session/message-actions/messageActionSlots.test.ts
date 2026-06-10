import { describe, expect, test } from "vitest";

import {
	cleanupMessageActionSlots,
	ensureMessageActionTemplateSlots,
	ensureMessageActionSlots,
} from "@/packages/features/chat-session/message-actions/messageActionSlots";

describe("message action slots", () => {
	test("creates a direct Astra-owned footer action container without wrapper slots", () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block">
                        <div class="ch_name">
                            <div class="name_line">
                                <span class="name_text">Assistant</span>
                            </div>
                        </div>
                        <div class="mes_text">Hello</div>
                    </div>
                    <div class="flex-container swipeRightBlock flexFlowColumn flexNoGap"></div>
                </div>
            </div>
        `;
		const message = document.querySelector(".mes");
		const messageBlock = document.querySelector(".mes_block");
		const messageText = document.querySelector(".mes_text");

		const slots = ensureMessageActionSlots(message);

		expect(slots).not.toBeNull();
		expect(slots?.container).toBe(slots?.bottomContainer);
		expect(slots?.bottomContainer).toHaveClass("astra-mesActions");
		expect(slots?.bottomContainer.dataset.astraComponent).toBe(
			"mes-actions",
		);
		expect(slots?.bottomContainer.dataset.astraSlot).toBe("footer");
		expect(slots?.bottomContainer.parentElement).toBe(message);
		expect(slots?.bottomContainer.previousElementSibling).toBe(
			messageBlock,
		);
		expect(slots?.bottomContainer.nextElementSibling).toHaveClass(
			"swipeRightBlock",
		);
		expect(slots?.bottomContainer.childElementCount).toBe(0);
		expect(messageText?.parentElement).toBe(messageBlock);
		expect(
			document.querySelector(".astra-mesActions__leftDefault"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__rightDefault"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__revisionHost"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__historyHost"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__moreHost"),
		).toBeNull();
	});

	test("creates mes action container after the message body when metadata is nested in the header", () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="7">
                    <div class="astra-mesHeader">
                        <div class="astra-mesHeader__name">
                            <div class="astra-mesMeta"></div>
                        </div>
                    </div>
                    <div class="mes_block astra-mesBody">
                        <div class="mes_text">Hello</div>
                    </div>
                    <div class="flex-container swipeRightBlock flexFlowColumn flexNoGap"></div>
                </div>
            </div>
        `;
		const message = document.querySelector(".mes");
		const messageBlock = document.querySelector(".mes_block");
		const meta = document.querySelector(".astra-mesMeta");
		const swipeRightBlock = document.querySelector(".swipeRightBlock");

		const slots = ensureMessageActionSlots(message);

		expect(slots?.container).toBe(slots?.bottomContainer);
		expect(slots?.bottomContainer).toHaveClass("astra-mesActions");
		expect(slots?.bottomContainer).not.toHaveClass("astra-messageActions");
		expect(slots?.bottomContainer.dataset.astraComponent).toBe(
			"mes-actions",
		);
		expect(slots?.bottomContainer.dataset.astraSlot).toBe("footer");
		expect(slots?.bottomContainer.parentElement).toBe(message);
		expect(meta?.closest(".astra-mesHeader__name")).toBeInTheDocument();
		expect(messageBlock?.nextElementSibling).toBe(slots?.bottomContainer);
		expect(slots?.bottomContainer.nextElementSibling).toBe(swipeRightBlock);
		expect(slots?.bottomContainer.childElementCount).toBe(0);
	});

	test("injects a reusable direct footer anchor into the SillyTavern message template", () => {
		document.body.innerHTML = `
            <div id="message_template">
                <div class="mes">
                    <div class="mes_block">
                        <div class="ch_name">
                            <div class="name_line">
                                <span class="name_text">Assistant</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

		const slots = ensureMessageActionTemplateSlots(document);

		expect(slots?.bottomContainer.parentElement).toBe(
			document.querySelector("#message_template > .mes"),
		);
		expect(slots?.bottomContainer.dataset.astraSlot).toBe("footer");
		expect(slots?.bottomContainer.childElementCount).toBe(0);

		const clonedMessage = document
			.querySelector("#message_template > .mes")
			?.cloneNode(true) as Element;
		document.body.innerHTML = '<div id="chat"></div>';
		document.getElementById("chat")?.append(clonedMessage);

		const clonedSlots = ensureMessageActionSlots(clonedMessage);

		expect(clonedSlots?.bottomContainer).toBe(
			clonedMessage.querySelector(
				':scope > .astra-mesActions[data-astra-slot="footer"]',
			),
		);
		expect(
			clonedMessage.querySelectorAll(".astra-mesActions"),
		).toHaveLength(1);
		expect(clonedSlots?.bottomContainer.childElementCount).toBe(0);
	});

	test("migrates a legacy Astra-owned action container out of a message block", () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block">
                        <div class="ch_name">
                            <div class="name_line">
                                <span class="name_text">Assistant</span>
                            </div>
                        </div>
                        <div class="astra-messageActions astra-mesActions--legacy" data-astra-component="message-actions"></div>
                    </div>
                </div>
            </div>
        `;
		const message = document.querySelector(".mes");
		const messageBlock = document.querySelector(".mes_block");
		const legacyContainer = document.querySelector(".astra-messageActions");

		const slots = ensureMessageActionSlots(message);

		expect(slots?.container).toBe(legacyContainer);
		expect(slots?.container).toHaveClass("astra-mesActions--legacy");
		expect(slots?.container.parentElement).toBe(message);
		expect(slots?.container.previousElementSibling).toBe(messageBlock);
		expect(
			document.querySelector(".mes_block > .astra-mesActions"),
		).toBeNull();
	});

	test("is idempotent and cleans up empty Astra-owned containers", () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block"></div>
                </div>
            </div>
        `;
		const message = document.querySelector(".mes");
		const first = ensureMessageActionSlots(message);
		const second = ensureMessageActionSlots(message);

		expect(second?.container).toBe(first?.container);
		expect(first?.bottomContainer.parentElement).toBe(message);
		expect(document.querySelectorAll(".astra-mesActions")).toHaveLength(1);

		cleanupMessageActionSlots(first?.bottomContainer ?? null);

		expect(document.querySelector(".astra-mesActions")).toBeNull();
	});

	test("keeps non-empty Astra action containers in place during cleanup", () => {
		document.body.innerHTML = `
            <div id="chat">
                <div class="mes" mesid="0">
                    <div class="mes_block"></div>
                </div>
            </div>
        `;
		const slots = ensureMessageActionSlots(document.querySelector(".mes"));
		const removedHost = document.createElement("div");
		removedHost.className = "astra-mesActions__removedFutureHost";
		const persistentHost = document.createElement("div");
		persistentHost.className = "astra-mesActions__persistentFutureHost";
		slots?.bottomContainer.append(removedHost, persistentHost);

		cleanupMessageActionSlots(removedHost);

		expect(document.querySelector(".astra-mesActions")).toBeInTheDocument();
		expect(
			document.querySelector(".astra-mesActions__removedFutureHost"),
		).toBeNull();
		expect(
			document.querySelector(".astra-mesActions__persistentFutureHost"),
		).toBeInTheDocument();
	});
});
