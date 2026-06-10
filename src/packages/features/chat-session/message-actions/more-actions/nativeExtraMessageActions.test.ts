import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	resolveNativeExtraMessageActions,
	triggerNativeExtraMessageAction,
} from "@/packages/features/chat-session/message-actions/more-actions/nativeExtraMessageActions";

describe("nativeExtraMessageActions", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	test("resolves visible child actions even when the parent extraMesButtons menu is collapsed", () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="7">
					<div class="mes_block">
						<div class="mes_buttons">
							<div class="extraMesButtons" style="display: none;">
								<div title="Translate message" class="mes_button mes_translate fa-solid fa-language"></div>
								<button type="button" aria-label="Custom action" class="mes_button fa-regular fa-star">Custom description</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		const actions = resolveNativeExtraMessageActions({
			documentRef: document,
			messageId: 7,
		});

		expect(actions.map((action) => action.label)).toEqual([
			"Translate message",
			"Custom action",
		]);
		expect(actions[0].iconClassName).toBe("fa-solid fa-language");
		expect(actions[1].iconClassName).toBe("fa-regular fa-star");
		expect(actions[1].description).toBe("Custom description");
	});

	test("skips hidden and disabled element-level actions", () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="8">
					<div class="mes_block">
						<div class="extraMesButtons">
							<button type="button" title="Ready action" class="mes_button fa-solid fa-wand-magic-sparkles"></button>
							<button type="button" title="Disabled action" disabled class="mes_button fa-solid fa-ban"></button>
							<button type="button" title="Disabled class action" class="mes_button disabled fa-solid fa-ban"></button>
							<button type="button" title="Aria disabled action" aria-disabled="true" class="mes_button fa-solid fa-ban"></button>
							<div title="Hidden action" hidden class="mes_button fa-solid fa-eye-slash"></div>
							<div title="Display none action" class="mes_button displayNone fa-solid fa-eye-slash"></div>
							<div title="Inline hidden action" style="display: none;" class="mes_button fa-solid fa-eye-slash"></div>
							<div title="Visibility hidden action" style="visibility: hidden;" class="mes_button fa-solid fa-eye-slash"></div>
						</div>
					</div>
				</div>
			</div>
		`;

		const actions = resolveNativeExtraMessageActions({
			documentRef: document,
			messageId: 8,
		});

		expect(actions.map((action) => action.label)).toEqual([
			"Ready action",
		]);
		expect(actions[0].iconClassName).toBe(
			"fa-solid fa-wand-magic-sparkles",
		);
	});

	test("skips child actions hidden by SillyTavern message-state CSS selectors", () => {
		document.body.innerHTML = `
			<style>
				.mes[is_system="false"] .mes_unhide {
					display: none;
				}
			</style>
			<div id="chat">
				<div class="mes" mesid="10" is_system="false">
					<div class="mes_block">
						<div class="extraMesButtons" style="display: none;">
							<button type="button" title="Hide message from prompts" class="mes_button mes_hide fa-solid fa-eye-slash"></button>
							<button type="button" title="Include message in prompts" class="mes_button mes_unhide fa-solid fa-eye"></button>
						</div>
					</div>
				</div>
			</div>
		`;

		const actions = resolveNativeExtraMessageActions({
			documentRef: document,
			messageId: 10,
		});

		expect(actions.map((action) => action.label)).toEqual([
			"Hide message from prompts",
		]);
	});

	test("dispatches pointerup and click once to the original native action element", () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="9">
					<div class="extraMesButtons">
						<div title="Native action" class="mes_button fa-solid fa-bolt"></div>
					</div>
				</div>
			</div>
		`;
		const nativeAction = document.querySelector(
			".extraMesButtons .mes_button",
		) as HTMLElement;
		const pointerUp = vi.fn();
		const click = vi.fn();
		nativeAction.addEventListener("pointerup", pointerUp);
		nativeAction.addEventListener("click", click);

		const actions = resolveNativeExtraMessageActions({
			documentRef: document,
			messageId: 9,
		});
		const result = triggerNativeExtraMessageAction({
			action: actions[0],
			documentRef: document,
		});

		expect(result).toBe(true);
		expect(pointerUp).toHaveBeenCalledTimes(1);
		expect(click).toHaveBeenCalledTimes(1);
	});
});
