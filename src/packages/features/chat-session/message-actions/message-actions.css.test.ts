import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const CSS_PATH = resolve(__dirname, "./message-actions.css");

function readCss() {
	return readFileSync(CSS_PATH, "utf8");
}

describe("message actions css contract", () => {
	test("does not keep generation-specific footer reservation selectors", () => {
		const css = readCss();

		expect(css).not.toContain("data-astra-generation-blocked");
		expect(css).not.toContain("data-astra-footer-settling");
	});
});
