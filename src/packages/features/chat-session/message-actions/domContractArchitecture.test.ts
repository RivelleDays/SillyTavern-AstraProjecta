import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { describe, expect, test } from "vitest";

const MESSAGE_ACTIONS_ROOT = join(
	process.cwd(),
	"src/packages/features/chat-session/message-actions",
);
const MESSAGE_ACTIONS_DOM_CONTRACT = join(
	MESSAGE_ACTIONS_ROOT,
	"contracts/dom.ts",
);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const RAW_NATIVE_SELECTOR_PATTERN =
	/["'`](?:#chat \.mes\[mesid\]|#message_template|\.mesIDDisplay|\.mes_avatar|\.ch_name|\.timestamp(?:-icon)?|\.mes_text|\.mes_reasoning|\.mes_copy|\.mes_hide|\.mes_unhide|\.extraMesButtons)/u;

function listProductionSourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		const stats = statSync(path);
		if (stats.isDirectory()) {
			return listProductionSourceFiles(path);
		}
		if (!SOURCE_EXTENSIONS.has(extname(path))) {
			return [];
		}
		if (path.includes(".test.") || path.includes(".test-utils.")) {
			return [];
		}
		return [path];
	});
}

describe("message-actions DOM contract boundary", () => {
	test("keeps audited SillyTavern message selectors inside contracts/dom.ts", () => {
		const offenders = listProductionSourceFiles(MESSAGE_ACTIONS_ROOT)
			.filter((path) => path !== MESSAGE_ACTIONS_DOM_CONTRACT)
			.filter((path) =>
				RAW_NATIVE_SELECTOR_PATTERN.test(readFileSync(path, "utf8")),
			);

		expect(
			offenders.map((path) => relative(process.cwd(), path)).sort(),
		).toEqual([]);
	});

	test("documents the single message-actions DOM audit point", () => {
		const agents = readFileSync(
			join(MESSAGE_ACTIONS_ROOT, "AGENTS.md"),
			"utf8",
		);

		expect(agents).toContain("contracts/dom.ts");
	});
});
