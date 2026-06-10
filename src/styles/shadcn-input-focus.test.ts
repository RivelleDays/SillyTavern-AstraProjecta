import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

describe("shadcn input focus overrides", () => {
	test("keeps the focused input override selector addressable", () => {
		const css = readFileSync(
			resolve(process.cwd(), "src/styles/shadcn-overrides.css"),
			"utf8",
		).replaceAll('"', "'");

		expect(css).toContain(
			"[data-slot='input']:focus-visible:not([aria-invalid='true']) {",
		);
	});
});
