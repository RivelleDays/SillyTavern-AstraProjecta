import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const CSS_PATH = resolve(__dirname, "./message-actions.css");

function readCss() {
	return readFileSync(CSS_PATH, "utf8");
}

describe("message actions css contract", () => {
	test("keeps separate footer reservation selectors for generation blocked and settling states", () => {
		const css = readCss();

		expect(css).toMatch(
			/\.astra-mesActions\[data-astra-slot="footer"\]\[data-astra-generation-blocked="true"\]\s*\{/,
		);
		expect(css).toMatch(
			/\.astra-mesActions\[data-astra-slot="footer"\]\[data-astra-footer-settling="true"\]\s*\{/,
		);
		expect(css).not.toContain(
			'[data-astra-generation-blocked="true"],\n.astra-mesActions[data-astra-slot="footer"][data-astra-footer-settling="true"]',
		);
	});
});
