import { describe, expect, test, vi } from "vitest";

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("translateAstra", () => {
	test("uses SillyTavern translate with the English fallback text and Astra key", async () => {
		const modulePath = "./i18n";
		const module = await import(modulePath).catch(() => null);

		expect(module).not.toBeNull();

		if (!module) {
			return;
		}

		const translate = vi.fn((text: string, key: string) => {
			return `${key}::${text}`;
		});

		setSillyTavernContext({
			translate,
		});

		expect(
			module.translateAstra("sendForm.options.group.promptPanels"),
		).toBe("sendForm.options.group.promptPanels::Prompt Panels");
		expect(translate).toHaveBeenCalledWith(
			"Prompt Panels",
			"sendForm.options.group.promptPanels",
		);
	});

	test("falls back to the English catalog when SillyTavern translate is unavailable", async () => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);

		const modulePath = "./i18n";
		const module = await import(modulePath).catch(() => null);

		expect(module).not.toBeNull();

		if (!module) {
			return;
		}

		expect(module.translateAstra("sendForm.primaryAction.send")).toBe(
			"Send a message",
		);
	});
});
