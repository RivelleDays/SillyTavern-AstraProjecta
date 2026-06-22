import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { describe, expect, test } from "vitest";

const FEATURES_SOURCE_ROOT = join(process.cwd(), "src/packages/features");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const PLATFORM_APP_IMPORT_PATTERN =
	/\bfrom\s+["']@\/app\/(?:mobile|desktop)(?:\/|["'])|\bimport\s+["']@\/app\/(?:mobile|desktop)(?:\/|["'])|\bimport\s*\(\s*["']@\/app\/(?:mobile|desktop)(?:\/|["'])/u;

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

describe("feature architecture boundaries", () => {
	test("production features do not import platform app assemblies", () => {
		const offenders = listProductionSourceFiles(
			FEATURES_SOURCE_ROOT,
		).filter((path) =>
			PLATFORM_APP_IMPORT_PATTERN.test(readFileSync(path, "utf8")),
		);

		expect(
			offenders.map((path) => relative(process.cwd(), path)).sort(),
		).toEqual([]);
	});
});
