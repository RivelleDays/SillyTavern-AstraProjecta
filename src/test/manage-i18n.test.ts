import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

const silentLogger = {
	log() {},
	warn() {},
	error() {},
};

function createFixture(files: Record<string, string>) {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "astra-i18n-"));
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
		path.resolve(process.cwd(), "scripts/manage-i18n.mjs"),
	).href;
	const module = (await import(scriptUrl)) as {
		run: (options?: {
			logger?: typeof silentLogger;
			repoRoot?: string;
		}) => {
			outputFile: string;
			unusedKeys: string[];
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

describe("manage-i18n", () => {
	it("fails when locales/en.json contains unused keys", async () => {
		const run = await loadRun();
		const repoRoot = createFixture({
			"locales/en.json": `${JSON.stringify(
				{
					"menu.one": "One",
					"menu.two": "Two",
				},
				null,
				4,
			)}\n`,
			"src/packages/example.ts": "export const label = 'menu.one';\n",
		});

		expect(() => run({ logger: silentLogger, repoRoot })).toThrow(
			/unused i18n keys/i,
		);
	});

	it("ignores generated types and test files when checking key usage", async () => {
		const run = await loadRun();
		const repoRoot = createFixture({
			"locales/en.json": `${JSON.stringify(
				{
					"menu.one": "One",
				},
				null,
				4,
			)}\n`,
			"src/test/example.test.ts":
				"expect('menu.one').toBe('menu.one');\n",
			"src/types/i18n.d.ts":
				"export interface I18nMessages { 'menu.one': string; }\n",
		});

		expect(() => run({ logger: silentLogger, repoRoot })).toThrow(
			/unused i18n keys/i,
		);
	});

	it("accepts exact literals and dynamic prefixes, then regenerates types", async () => {
		const run = await loadRun();
		const repoRoot = createFixture({
			"locales/en.json": `${JSON.stringify(
				{
					"menu.one": "One",
					"menu.two": "Two",
					"toolbar.label": "Toolbar",
				},
				null,
				4,
			)}\n`,
			"src/packages/example.ts": [
				"export const firstKey = 'menu.one';",
				`export const dynamicKey = \`menu.\${section}\`;`,
				"export const toolbarKey = 'toolbar.label';",
				"",
			].join("\n"),
		});

		expect(() => run({ logger: silentLogger, repoRoot })).not.toThrow();

		const outputFile = path.join(repoRoot, "src/types/i18n.d.ts");
		const output = fs.readFileSync(outputFile, "utf8");

		expect(output).toContain('"menu.one": string;');
		expect(output).toContain('"menu.two": string;');
		expect(output).toContain('"toolbar.label": string;');
	});
});
