import { describe, expect, test } from "vitest";

import { triggerNativeOption } from "@/packages/features/chat-session/send-form/bridges/nativeOptionBridge";

describe("triggerNativeOption", () => {
	test("prefers the visible option_close_chat candidate when duplicate ids are present", () => {
		document.body.innerHTML = `
          <div id="options">
            <button id="option_close_chat" style="display: none" type="button"></button>
            <button id="option_close_chat" type="button"></button>
          </div>
        `;

		const candidates = document.querySelectorAll<HTMLElement>(
			'#options [id="option_close_chat"]',
		);
		let hiddenClicks = 0;
		let visibleClicks = 0;

		candidates[0]?.addEventListener("click", () => {
			hiddenClicks += 1;
		});
		candidates[1]?.addEventListener("click", () => {
			visibleClicks += 1;
		});

		expect(
			triggerNativeOption({
				documentRef: document,
				nativeOptionId: "option_close_chat",
			}),
		).toBe(true);
		expect(hiddenClicks).toBe(0);
		expect(visibleClicks).toBe(1);
	});

	test("falls back to the last option_close_chat candidate when none are visible", () => {
		document.body.innerHTML = `
          <div id="options">
            <button id="option_close_chat" style="display: none" type="button"></button>
            <button id="option_close_chat" style="display: none" type="button"></button>
          </div>
        `;

		const candidates = document.querySelectorAll<HTMLElement>(
			'#options [id="option_close_chat"]',
		);
		let firstClicks = 0;
		let lastClicks = 0;

		candidates[0]?.addEventListener("click", () => {
			firstClicks += 1;
		});
		candidates[1]?.addEventListener("click", () => {
			lastClicks += 1;
		});

		expect(
			triggerNativeOption({
				documentRef: document,
				nativeOptionId: "option_close_chat",
			}),
		).toBe(true);
		expect(firstClicks).toBe(0);
		expect(lastClicks).toBe(1);
	});
});
