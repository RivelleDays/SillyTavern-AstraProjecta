import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const CSS_PATH = resolve(__dirname, "./chat-session-settings.css");

function readCss() {
	return readFileSync(CSS_PATH, "utf8");
}

describe("chat-session-settings CSS contracts", () => {
	test("keeps the drawer shell selector contracts addressable", () => {
		const css = readCss();

		expect(css).toContain(".chat-session-settings-drawer {");
		expect(css).toContain(".chat-session-settings-drawer__header");
		expect(css).toContain(".chat-session-settings-drawer__title");
		expect(css).toContain(".chat-session-settings-drawer__description");
		expect(css).toContain(".chat-session-settings-drawer__body");
		expect(css).toContain(".chat-session-settings-drawer__viewport");
		expect(css).toContain(".chat-session-settings-drawer__content");
		expect(css).toContain(".chat-session-settings-drawer__footer-actions");
		expect(css).toContain(".chat-session-settings-drawer__action");
		expect(css).toContain(
			".chat-session-settings-drawer__action--save:disabled svg",
		);
	});

	test("keeps the background settings selector contracts addressable", () => {
		const css = readCss();

		expect(css).toContain(".chat-session-settings__chat-background-tab");
		expect(css).toContain(".chat-session-settings__slider-row");
		expect(css).toContain(".chat-session-settings__slider-row-header");
		expect(css).toContain(".chat-session-settings__slider-row-title");
		expect(css).toContain(".chat-session-settings__slider-row-value");
		expect(css).toContain(".chat-session-settings__slider-row-controls");
		expect(css).toContain(".chat-session-settings__slider");
		expect(css).toContain(".chat-session-settings__slider-row-input");
	});

	test("keeps the grouped section selector contracts addressable", () => {
		const css = readCss();

		expect(css).toContain(".chat-session-settings__section-title");
		expect(css).toContain(".chat-session-settings__section-card");
		expect(css).toContain(".chat-session-settings__section-card >");
		expect(css).toContain(".chat-session-settings__toggle-row-header");
		expect(css).not.toContain(
			".chat-session-settings__toggle-row-description",
		);
		expect(css).not.toContain(".chat-session-settings__section-marker");
		expect(css).not.toContain(
			".chat-session-settings__section-marker-icon",
		);
		expect(css).not.toContain(
			".chat-session-settings__section-marker-label",
		);
		expect(css).not.toContain(
			".chat-session-settings__section-marker-line",
		);
	});

	test("does not reuse sillytavern-interface-panel or astra-main-interface-panel selectors", () => {
		const css = readCss();

		expect(css).not.toContain("sillytavern-interface-panel__");
		expect(css).not.toContain("astra-main-interface-panel__");
	});

	test("does not keep deprecated page-panel selectors", () => {
		const css = readCss();

		expect(css).not.toContain("chat-session-settings-panel__");
	});

	test("does not keep removed slider-row description selectors", () => {
		const css = readCss();

		expect(css).not.toContain(
			"chat-session-settings__slider-row-description",
		);
	});
});
