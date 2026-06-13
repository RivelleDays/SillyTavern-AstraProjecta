import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, test } from "vitest";

const tempDirs: string[] = [];

const silentLogger = {
	log() {},
	warn() {},
	error() {},
};

function createFixture(files: Record<string, string>) {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "astra-st-shared-"));
	tempDirs.push(tempDir);

	for (const [relativePath, content] of Object.entries(files)) {
		const filePath = path.join(tempDir, relativePath);
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, content, "utf8");
	}

	return tempDir;
}

async function loadRun() {
	const scriptUrl = pathToFileURL(
		path.resolve(process.cwd(), "scripts/check-st-shared-helpers.mjs"),
	).href;
	const module = (await import(scriptUrl)) as {
		run: (options?: {
			logger?: typeof silentLogger;
			repoRoot?: string;
		}) => {
			violations: string[];
		};
	};

	return module.run;
}

afterEach(() => {
	while (tempDirs.length > 0) {
		const tempDir = tempDirs.pop();

		if (tempDir) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	}
});

describe("check-st-shared-helpers", () => {
	test("fails when production source defines canonical ST helpers outside shared.ts", async () => {
		const run = await loadRun();
		const repoRoot = createFixture({
			"src/packages/core/st/shared.ts":
				"export function asTrimmedString(value: unknown): string { return ''; }\n",
			"src/packages/features/chat-session/example.ts": [
				"function asTrimmedString(value: unknown): string {",
				"\treturn typeof value === 'string' ? value.trim() : '';",
				"}",
				"",
			].join("\n"),
		});

		expect(() => run({ logger: silentLogger, repoRoot })).toThrow(
			/asTrimmedString/,
		);
	});

	test("allows canonical definitions in shared.ts and ignores tests", async () => {
		const run = await loadRun();
		const repoRoot = createFixture({
			"src/packages/core/st/shared.ts": [
				"export function asTrimmedString(value: unknown): string {",
				"\treturn typeof value === 'string' ? value.trim() : '';",
				"}",
				"",
			].join("\n"),
			"src/packages/core/st/shared.test.ts": [
				"function asTrimmedString(value: unknown): string {",
				"\treturn '';",
				"}",
				"",
			].join("\n"),
			"src/packages/features/chat-session/example.ts":
				"import { asTrimmedString } from '@/packages/core/st/shared';\n",
		});

		expect(() => run({ logger: silentLogger, repoRoot })).not.toThrow();
	});
});
