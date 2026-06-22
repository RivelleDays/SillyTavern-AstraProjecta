import { describe, expect, test } from "vitest";

import {
	resolveLastActionableFooterMessage,
	resolveMoreActionsTarget,
} from "@/packages/features/chat-session/message-actions/messageActionTargetResolver";
import {
	resolveLoadedMessageElements,
	resolveMessageElement,
	resolveNativeMessageActionElement,
} from "@/packages/features/chat-session/message-actions/contracts/dom";

describe("messageActionTargetResolver", () => {
	test("resolves unique loaded chat messages by numeric mesid", () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0"></div>
				<div class="mes" mesid="not-a-number"></div>
				<div class="mes" mesid="0"></div>
				<div class="mes" mesid="2"></div>
			</div>
		`;

		expect(resolveLoadedMessageElements(document)).toEqual([
			{
				messageElement: document.querySelector('.mes[mesid="0"]'),
				messageId: 0,
			},
			{
				messageElement: document.querySelector('.mes[mesid="2"]'),
				messageId: 2,
			},
		]);
		expect(resolveMessageElement(document, 2)).toBe(
			document.querySelector('.mes[mesid="2"]'),
		);
	});

	test("resolves a selected message target without cloning rendered content unless requested", () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0" is_user="false" timestamp="2026-06-13 00:30">
					<div class="mesAvatarWrapper">
						<img src="/assistant.png" />
						<div class="mesIDDisplay">#0</div>
					</div>
					<div class="mes_block">
						<div class="ch_name">
							Assistant
							<span class="timestamp-icon" title="Claude Sonnet"></span>
							<span class="mes_timer">1.2s</span>
							<span class="tokenCounterDisplay">42 tokens</span>
						</div>
						<div class="mes_text"><p>Rendered <strong>message</strong></p></div>
					</div>
				</div>
			</div>
		`;
		const messageElement = document.querySelector(".mes")!;
		const context = {
			chat: [
				{
					extra: { model: "claude-sonnet-4" },
					is_system: false,
					is_user: false,
					name: "Assistant from context",
					swipe_id: 1,
					swipes: ["First", "Second"],
				},
			],
		};

		const lazyTarget = resolveMoreActionsTarget({
			context,
			includeRenderedMessage: false,
			messageElement,
			messageId: 0,
		});
		expect(lazyTarget.messagePreviewText).toBe("");
		expect(lazyTarget.renderedMessageHtml).toBe("");
		expect(lazyTarget.senderName).toBe("Assistant from context");
		expect(lazyTarget.swipeIndex).toBe(1);
		expect(lazyTarget.swipeTotal).toBe(2);
		expect(lazyTarget.metadata.generationTime).toBe("1.2s");
		expect(lazyTarget.metadata.tokenCount).toBe("42 tokens");
		expect(lazyTarget.metadata.modelLabel).toBe("claude-sonnet-4");

		const renderedTarget = resolveMoreActionsTarget({
			context,
			includeRenderedMessage: true,
			messageElement,
			messageId: 0,
		});
		expect(renderedTarget.messagePreviewText).toBe("Rendered message");
		expect(renderedTarget.renderedMessageHtml).toContain(
			"Rendered <strong>message</strong>",
		);
	});

	test("finds native message actions inside the selected message only", () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0">
					<button class="mes_copy">copy zero</button>
				</div>
				<div class="mes" mesid="1">
					<button class="mes_copy">copy one</button>
				</div>
			</div>
		`;

		expect(
			resolveNativeMessageActionElement({
				action: "copy",
				documentRef: document,
				messageId: 1,
			})?.textContent,
		).toBe("copy one");
	});

	test("uses only the final loaded non-user message as the footer action target", () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0" is_user="false"></div>
				<div class="mes" mesid="1" is_user="true"></div>
			</div>
		`;
		const loadedMessages = resolveLoadedMessageElements(document);

		expect(
			resolveLastActionableFooterMessage({
				context: {
					chat: [
						{ is_user: false, swipes: ["assistant"] },
						{ is_user: true, swipes: ["user"] },
					],
				},
				loadedMessages,
			}),
		).toBeNull();

		document
			.querySelector('.mes[mesid="1"]')
			?.setAttribute("is_user", "false");
		expect(
			resolveLastActionableFooterMessage({
				context: {
					chat: [
						{ is_user: false, swipes: ["assistant"] },
						{ is_user: false, swipes: ["assistant two"] },
					],
				},
				loadedMessages,
			})?.messageId,
		).toBe(1);
	});
});
