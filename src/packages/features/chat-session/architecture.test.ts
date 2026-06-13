import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { describe, expect, test } from "vitest";

const CHAT_SESSION_SOURCE_ROOT = join(
	process.cwd(),
	"src/packages/features/chat-session",
);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SILLYTAVERN_INTERFACE_IMPORT_PATTERN =
	/\bfrom\s+["']@\/packages\/features\/sillytavern-interface(?:\/|["'])|\bimport\s+["']@\/packages\/features\/sillytavern-interface(?:\/|["'])|\bimport\s*\(\s*["']@\/packages\/features\/sillytavern-interface(?:\/|["'])/u;

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

		if (path.includes(".test.")) {
			return [];
		}

		return [path];
	});
}

describe("chat-session architecture boundaries", () => {
	test("production chat-session source does not import sillytavern-interface feature internals", () => {
		const offenders = listProductionSourceFiles(
			CHAT_SESSION_SOURCE_ROOT,
		).filter((path) =>
			SILLYTAVERN_INTERFACE_IMPORT_PATTERN.test(
				readFileSync(path, "utf8"),
			),
		);

		expect(
			offenders.map((path) => relative(process.cwd(), path)).sort(),
		).toEqual([]);
	});
});
