import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const CSS_PATH = resolve(__dirname, "./message-actions.css");

function readCss() {
	return readFileSync(CSS_PATH, "utf8");
}

describe("message actions css contract", () => {
	test("keeps generation footer reservation selectors scoped to the footer slot", () => {
		const css = readCss();

		expect(css).toContain(
			'.astra-mesActions[data-astra-slot="footer"][data-astra-generation-blocked="true"]',
		);
		expect(css).toContain(
			'.astra-mesActions[data-astra-slot="footer"][data-astra-footer-settling="true"]',
		);
	});
});
