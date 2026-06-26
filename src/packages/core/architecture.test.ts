import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { describe, expect, test } from "vitest";

const CORE_SOURCE_ROOT = join(process.cwd(), "src/packages/core");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const APP_LAYER_IMPORT_PATTERN =
	/\bfrom\s+["']@\/app\/|\bimport\s+["']@\/app\/|\bimport\s*\(\s*["']@\/app\//u;

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

describe("core architecture boundaries", () => {
	test("production core source does not import app-layer assembly", () => {
		const offenders = listProductionSourceFiles(CORE_SOURCE_ROOT).filter(
			(path) => APP_LAYER_IMPORT_PATTERN.test(readFileSync(path, "utf8")),
		);

		expect(offenders.map((path) => relative(process.cwd(), path))).toEqual(
			[],
		);
	});
});
