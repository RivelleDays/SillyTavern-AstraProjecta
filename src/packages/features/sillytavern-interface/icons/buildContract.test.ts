import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

describe("SillyTavern interface route icon build contract", () => {
	test("configures raw SVG loading for the co-located icons folder", () => {
		const webpackConfigSource = readFileSync(
			resolve(process.cwd(), "webpack.config.js"),
			"utf8",
		).replaceAll('"', "'");

		expect(webpackConfigSource).toContain(
			"src/packages/features/sillytavern-interface/icons",
		);
		expect(webpackConfigSource).not.toContain(
			[
				"src/packages/features/chat-session",
				"send-form/main-menu",
				"icons",
			].join("/"),
		);
		expect(webpackConfigSource).not.toContain(
			"src/packages/features/chat-session/send-form/main-menu-icons",
		);
		expect(webpackConfigSource).toContain("resourceQuery: /raw/");
		expect(webpackConfigSource).toContain("type: 'asset/source'");
	});
});
