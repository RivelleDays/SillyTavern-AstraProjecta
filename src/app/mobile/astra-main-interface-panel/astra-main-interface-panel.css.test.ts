import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readPanelCss() {
	return readFileSync(
		resolve(
			process.cwd(),
			"src/app/mobile/astra-main-interface-panel/astra-main-interface-panel.css",
		),
		"utf8",
	);
}

describe("astra-main-interface-panel.css", () => {
	test("is imported by the emitted global stylesheet", () => {
		const globalsCss = readFileSync(
			resolve(process.cwd(), "src/styles/globals.css"),
			"utf8",
		).replaceAll('"', "'");

		expect(globalsCss).toContain(
			"@import '../app/mobile/astra-main-interface-panel/astra-main-interface-panel.css';",
		);
	});

	test("keeps Astra main-interface panel shell selectors addressable", () => {
		const css = readPanelCss();

		expect(css).toContain(".astra-main-interface-panel");
		expect(css).toContain(".astra-main-interface-panel__header");
		expect(css).toContain(".astra-main-interface-panel__header-bar");
		expect(css).toContain(".astra-main-interface-panel__header-main");
		expect(css).toContain(".astra-main-interface-panel__header-end");
		expect(css).toContain(".astra-main-interface-panel__header-content");
		expect(css).toContain(".astra-main-interface-panel__title");
		expect(css).toContain(".astra-main-interface-panel__close-button");
		expect(css).toContain(".astra-main-interface-panel__body");
		expect(css).toContain(".astra-main-interface-panel__scroll-area");
		expect(css).toContain(".astra-main-interface-panel__viewport");
		expect(css).toContain(".astra-main-interface-panel__content");
		expect(css).toContain(".astra-main-interface-panel__scrollbar");
		expect(css).not.toContain(".astra-mobile-page-panel__body-header");
	});
});
