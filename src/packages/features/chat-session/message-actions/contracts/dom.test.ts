import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	dispatchNativeClick,
	dispatchNativePointerUp,
	resolveLegacyMessageActionHosts,
	resolveLoadedMessageElements,
	resolveMessageElement,
	resolveMessageMetadataElements,
	resolveMessageTemplateElement,
	resolveMessageTextGestureTarget,
	resolveNativeExtraMessageActionsRoot,
	resolveNativeMessageActionElement,
	resolveNativePromptVisibilityState,
	resolveRenderedMessageTextElement,
	hasNativeMessageEditTextarea,
} from "@/packages/features/chat-session/message-actions/contracts/dom";

describe("message-actions DOM contract", () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0"></div>
				<div class="mes" mesid="invalid"></div>
				<div class="mes" mesid="0"></div>
				<div class="mes" mesid="2">
					<div class="mesAvatarWrapper">
						<img src="/assistant.png" />
						<div class="mesIDDisplay">#2</div>
					</div>
					<div class="mes_block">
						<div class="ch_name">
							<span class="name_text">Assistant</span>
							<small class="timestamp">June 22, 2026</small>
							<span class="timestamp-icon"></span>
							<span class="mes_timer">1.2s</span>
							<span class="tokenCounterDisplay">42 tokens</span>
						</div>
						<div class="mes_text"><p>Message body</p></div>
						<div class="mes_reasoning">Reasoning body</div>
						<button class="mes_copy"></button>
						<button class="mes_hide"></button>
						<button class="mes_unhide"></button>
						<div class="extraMesButtons"></div>
					</div>
				</div>
			</div>
			<div id="message_template">
				<div class="mes">
					<div class="mes_block"></div>
				</div>
			</div>
		`;
	});

	test("resolves unique numeric message rows and message-scoped native elements", () => {
		const loadedMessages = resolveLoadedMessageElements(document);
		const messageElement = resolveMessageElement(document, 2);

		expect(loadedMessages.map(({ messageId }) => messageId)).toEqual([
			0, 2,
		]);
		expect(messageElement).toBe(document.querySelector('.mes[mesid="2"]'));
		expect(resolveMessageTemplateElement(document)).toBe(
			document.querySelector("#message_template > .mes"),
		);
		expect(resolveRenderedMessageTextElement(messageElement)).toBe(
			messageElement?.querySelector(".mes_text"),
		);
		expect(resolveNativeExtraMessageActionsRoot(messageElement)).toBe(
			messageElement?.querySelector(".extraMesButtons"),
		);
		expect(
			resolveNativeMessageActionElement({
				action: "copy",
				documentRef: document,
				messageId: 2,
			}),
		).toBe(messageElement?.querySelector(".mes_copy"));
	});

	test("exposes metadata nodes without leaking native selectors to consumers", () => {
		const messageElement = resolveMessageElement(document, 2)!;
		const metadata = resolveMessageMetadataElements(messageElement);

		expect(metadata.avatarImage).toBe(
			messageElement.querySelector(".mesAvatarWrapper img"),
		);
		expect(metadata.displayId).toBe(
			messageElement.querySelector(".mesIDDisplay"),
		);
		expect(metadata.name).toBe(messageElement.querySelector(".ch_name"));
		expect(metadata.nameText).toBe(
			messageElement.querySelector(".name_text"),
		);
		expect(metadata.timestamp).toBe(
			messageElement.querySelector(".timestamp"),
		);
		expect(metadata.timestampIcon).toBe(
			messageElement.querySelector(".timestamp-icon"),
		);
		expect(metadata.generationTime).toBe(
			messageElement.querySelector(".mes_timer"),
		);
		expect(metadata.tokenCount).toBe(
			messageElement.querySelector(".tokenCounterDisplay"),
		);
	});

	test("resolves text-only and text-or-reasoning gesture targets inside the chat", () => {
		const messageText = document.querySelector(".mes_text p")!;
		const reasoning = document.querySelector(".mes_reasoning")!;

		expect(
			resolveMessageTextGestureTarget(messageText, "text"),
		).toMatchObject({
			messageId: 2,
			messagePart: document.querySelector(".mes_text"),
		});
		expect(resolveMessageTextGestureTarget(reasoning, "text")).toBeNull();
		expect(
			resolveMessageTextGestureTarget(reasoning, "editable"),
		).toMatchObject({
			messageId: 2,
			messagePart: reasoning,
		});
	});

	test("resolves edit-state and prompt visibility contracts", () => {
		expect(hasNativeMessageEditTextarea(document)).toBe(false);
		document.body.insertAdjacentHTML(
			"beforeend",
			'<textarea class="reasoning_edit_textarea"></textarea>',
		);
		expect(hasNativeMessageEditTextarea(document)).toBe(true);

		const hideAction = resolveNativeMessageActionElement({
			action: "hide",
			documentRef: document,
			messageId: 2,
		});
		const unhideAction = resolveNativeMessageActionElement({
			action: "unhide",
			documentRef: document,
			messageId: 2,
		});
		expect(resolveNativePromptVisibilityState(hideAction)).toBe("excluded");
		expect(resolveNativePromptVisibilityState(unhideAction)).toBe(
			"included",
		);
	});

	test("finds legacy Astra action hosts in live and template messages", () => {
		document
			.querySelector('.mes[mesid="2"]')
			?.insertAdjacentHTML(
				"beforeend",
				'<div class="astra-mesActions__historyHost"></div>',
			);
		document
			.querySelector("#message_template > .mes")
			?.insertAdjacentHTML(
				"beforeend",
				'<div class="astra-messageActions__swipeHost"></div>',
			);

		expect(resolveLegacyMessageActionHosts(document)).toEqual([
			document.querySelector(".astra-mesActions__historyHost"),
			document.querySelector(".astra-messageActions__swipeHost"),
		]);
	});

	test("dispatches native activation events through the owning document", () => {
		const copyAction = resolveNativeMessageActionElement({
			action: "copy",
			documentRef: document,
			messageId: 2,
		})!;
		const pointerUp = vi.fn();
		const click = vi.fn();
		copyAction.addEventListener("pointerup", pointerUp);
		copyAction.addEventListener("click", click);

		dispatchNativePointerUp({ documentRef: document, element: copyAction });
		dispatchNativeClick({ documentRef: document, element: copyAction });

		expect(pointerUp).toHaveBeenCalledTimes(1);
		expect(click).toHaveBeenCalledTimes(1);
	});
});
