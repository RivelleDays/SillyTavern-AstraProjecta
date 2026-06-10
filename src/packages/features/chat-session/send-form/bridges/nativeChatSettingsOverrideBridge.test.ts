import { describe, expect, test } from "vitest";

import { triggerNativeChatSettingsOverride } from "@/packages/features/chat-session/send-form/bridges/nativeChatSettingsOverrideBridge";

describe("triggerNativeChatSettingsOverride", () => {
	test("selects the character settings override option and dispatches change for character chats", () => {
		document.body.innerHTML = `
            <select id="char-management-dropdown">
                <option id="default" selected>More...</option>
                <option id="set_chat_character_settings">Character Settings Overrides</option>
            </select>
        `;

		const select = document.getElementById(
			"char-management-dropdown",
		) as HTMLSelectElement;
		let selectedOptionId = "";
		let changeCount = 0;

		select.addEventListener("change", () => {
			changeCount += 1;
			selectedOptionId = select.selectedOptions[0]?.id ?? "";
		});

		expect(
			triggerNativeChatSettingsOverride({
				documentRef: document,
				kind: "character",
			}),
		).toBe(true);
		expect(changeCount).toBe(1);
		expect(selectedOptionId).toBe("set_chat_character_settings");
	});

	test("clicks the group scenario override button for group chats", () => {
		document.body.innerHTML = `
            <button id="rm_group_scenario" type="button"></button>
        `;

		const button = document.getElementById("rm_group_scenario");
		let clickCount = 0;
		button?.addEventListener("click", () => {
			clickCount += 1;
		});

		expect(
			triggerNativeChatSettingsOverride({
				documentRef: document,
				kind: "group",
			}),
		).toBe(true);
		expect(clickCount).toBe(1);
	});

	test("no-ops when no matching native target exists", () => {
		document.body.innerHTML = "";

		expect(
			triggerNativeChatSettingsOverride({
				documentRef: document,
				kind: "character",
			}),
		).toBe(false);
		expect(
			triggerNativeChatSettingsOverride({
				documentRef: document,
				kind: "group",
			}),
		).toBe(false);
		expect(
			triggerNativeChatSettingsOverride({
				documentRef: document,
				kind: "none",
			}),
		).toBe(false);
	});
});
