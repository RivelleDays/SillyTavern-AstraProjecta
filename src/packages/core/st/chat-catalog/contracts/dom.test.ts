import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	findNativeCharacterSelectElement,
	findNativeGroupSelectElement,
	triggerNativeSelectElement,
} from "@/packages/core/st/chat-catalog/contracts/dom";

describe("chat-catalog DOM contract", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	test("finds character rows by data id and falls back to the legacy direct id", () => {
		document.body.innerHTML = `
			<button class="character_select" data-chid="2"></button>
			<button id="CharID7"></button>
		`;

		expect(findNativeCharacterSelectElement(document, 2)).toBe(
			document.querySelector('.character_select[data-chid="2"]'),
		);
		expect(findNativeCharacterSelectElement(document, 7)).toBe(
			document.getElementById("CharID7"),
		);
		expect(findNativeCharacterSelectElement(document, 9)).toBeNull();
	});

	test("finds group rows across current and legacy id attributes", () => {
		document.body.innerHTML = `
			<button class="group_select" data-chid="alpha"></button>
			<button class="group_select" data-grid="beta"></button>
		`;

		expect(findNativeGroupSelectElement(document, "alpha")).toBe(
			document.querySelector('.group_select[data-chid="alpha"]'),
		);
		expect(findNativeGroupSelectElement(document, "beta")).toBe(
			document.querySelector('.group_select[data-grid="beta"]'),
		);
		expect(findNativeGroupSelectElement(document, "missing")).toBeNull();
	});

	test("prefers the available jQuery trigger contract", () => {
		const element = document.createElement("button");
		const trigger = vi.fn();
		const jquery = vi.fn(() => ({ trigger }));

		triggerNativeSelectElement(element, { jQuery: jquery });

		expect(jquery).toHaveBeenCalledWith(element);
		expect(trigger).toHaveBeenCalledWith("click");
	});

	test("falls back to native click when jQuery is unavailable", () => {
		const element = document.createElement("button");
		const click = vi.spyOn(element, "click");

		triggerNativeSelectElement(element, {});

		expect(click).toHaveBeenCalledTimes(1);
	});
});
