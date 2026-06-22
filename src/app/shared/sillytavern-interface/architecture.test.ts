import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const CONTRACT_PATH = join(
	process.cwd(),
	"src/app/shared/sillytavern-interface/index.ts",
);
const IMPLEMENTATION_PATTERN =
	/\b(?:document|window|HTMLElement|MutationObserver|ResizeObserver|React)\b/u;

describe("shared SillyTavern interface contracts", () => {
	test("stay free of platform and DOM implementation details", () => {
		const source = readFileSync(CONTRACT_PATH, "utf8");

		expect(source).not.toMatch(IMPLEMENTATION_PATTERN);
	});
});
