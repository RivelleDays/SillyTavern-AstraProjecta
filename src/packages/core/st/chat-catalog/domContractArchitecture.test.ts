import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { describe, expect, test } from "vitest";

const CHAT_CATALOG_ROOT = join(
	process.cwd(),
	"src/packages/core/st/chat-catalog",
);
const CHAT_CATALOG_DOM_CONTRACT = join(CHAT_CATALOG_ROOT, "contracts/dom.ts");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const RAW_NATIVE_SELECTOR_PATTERN =
	/character_select|group_select|CharID|["']data-chid["']|["']data-grid["']|\.trigger\(["']click["']\)/u;

function listProductionSourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		const stats = statSync(path);
		if (stats.isDirectory()) {
			return listProductionSourceFiles(path);
		}
		if (!SOURCE_EXTENSIONS.has(extname(path)) || path.includes(".test.")) {
			return [];
		}
		return [path];
	});
}

describe("chat-catalog DOM contract boundary", () => {
	test("keeps native entity-row selectors inside contracts/dom.ts", () => {
		const offenders = listProductionSourceFiles(CHAT_CATALOG_ROOT)
			.filter((path) => path !== CHAT_CATALOG_DOM_CONTRACT)
			.filter((path) =>
				RAW_NATIVE_SELECTOR_PATTERN.test(readFileSync(path, "utf8")),
			);

		expect(
			offenders.map((path) => relative(process.cwd(), path)).sort(),
		).toEqual([]);
	});

	test("documents the single chat-catalog DOM audit point", () => {
		const agents = readFileSync(
			join(CHAT_CATALOG_ROOT, "AGENTS.md"),
			"utf8",
		);

		expect(agents).toContain("contracts/dom.ts");
	});
});
