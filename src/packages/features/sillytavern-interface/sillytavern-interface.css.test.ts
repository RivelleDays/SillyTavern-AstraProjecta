import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readCss() {
	return readFileSync(
		resolve(
			process.cwd(),
			"src/packages/features/sillytavern-interface/sillytavern-interface.css",
		),
		"utf8",
	);
}

function normalizeStyleSource(source: string): string {
	return source.replaceAll('"', "'").replace(/\s+/g, " ").trim();
}

function expectSelectors(css: string, selectors: string[]) {
	const normalizedCss = normalizeStyleSource(css);
	for (const selector of selectors) {
		const normalizedSelector = normalizeStyleSource(selector);
		expect(
			normalizedCss.includes(normalizedSelector),
			`Expected CSS to contain selector ${selector}`,
		).toBe(true);
	}
}

describe("sillytavern-interface.css", () => {
	test("keeps SillyTavern interface selector contracts addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"#sillytavern-interface-panel-trigger",
			".sillytavern-interface-panel",
			".sillytavern-interface-panel__header",
			".sillytavern-interface-panel__header-main",
			".sillytavern-interface-panel__header-end",
			".sillytavern-interface-panel__title",
			".sillytavern-interface-panel__subheader",
			".sillytavern-interface-panel__body",
			".sillytavern-interface-panel__body-overlay",
			".sillytavern-interface-panel__scroll-area",
			".sillytavern-interface-panel__viewport",
			".sillytavern-interface-panel__content",
			".sillytavern-interface-panel__footer-accessory",
			".sillytavern-interface-panel__footer-accessory[data-state='closed']",
			".sillytavern-interface-panel__footer",
			".sillytavern-interface-panel__footer-main",
			".sillytavern-interface-panel__footer-center",
			".sillytavern-interface-panel__footer-end",
			".sillytavern-interface-panel__close-button",
			".sillytavern-interface__body-header-row",
			".sillytavern-interface__main-nav-strip",
			".sillytavern-interface__main-nav-list",
			".sillytavern-interface__main-nav-item",
			".sillytavern-interface__main-nav-item[data-slot='button'][data-variant='ghost'][data-active='true']",
			".sillytavern-interface__main-nav-item-icon",
			".sillytavern-interface__main-nav-toggle-button[data-expanded='true']",
			".sillytavern-interface__main-nav-toggle-button-icon",
			".sillytavern-interface__main-nav-strip[data-state='closed']",
			"@media (prefers-reduced-motion: reduce)",
			".sillytavern-interface__title-row",
			".sillytavern-interface__title-icon-frame",
			".sillytavern-interface__title-svg-icon",
			".sillytavern-interface__title-avatar",
			".sillytavern-interface__title-avatar-image",
			".sillytavern-interface__title-avatar--collage",
			".sillytavern-interface__title-avatar-collage-image",
			".sillytavern-interface__title-icon-frame[data-icon-kind='current-user-avatar']",
			".sillytavern-interface__title-icon-frame[data-icon-kind='current-chat-avatar']",
			".sillytavern-interface__title-stack",
			".sillytavern-interface__title-summary",
			".sillytavern-interface__docs-button",
		]);
		expect(css).toContain("--sillytavern-interface-title-avatar-size:");
		expect(css).toContain("var(--astra-avatar-size-min)");
		expect(css).toContain(
			"var(--astra-avatar-size-sillytavern-interface-title)",
		);
		expect(css).not.toContain(".astra-mobile-page-panel__body-header");
		expect(css).not.toContain(".astra-mobile-page-panel__body-overlay");
		expect(css).not.toContain(".astra-mobile-page-panel__subheader");
		expect(css).not.toContain(
			".sillytavern-interface__main-nav-item-label",
		);
		expect(css).not.toContain(".sillytavern-interface__title-icon {");
	});
});
