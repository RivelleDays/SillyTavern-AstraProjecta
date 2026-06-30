import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const CSS_PATH = resolve(__dirname, "./message-search.css");

function readCss() {
	return readFileSync(CSS_PATH, "utf8");
}

describe("chat message search CSS contracts", () => {
	test("keeps stable search panel and bottom-control selectors addressable", () => {
		const css = readCss();

		expect(css).toContain("#astra-chat-message-search-panel");
		expect(css).toContain("#astra-chat-session-shell:has");
		expect(css).toContain(".astra-chat-message-search-panel");
		expect(css).toContain(".astra-chat-message-search-panel__search-row");
		expect(css).toContain(".astra-chat-message-search-panel__replace-row");
		expect(css).toContain(".astra-chat-message-search-panel__input-shell");
		expect(css).toContain(".astra-chat-message-search-controls");
		expect(css).toContain(".astra-chat-message-search-controls__cluster");
		expect(css).toContain(
			".astra-chat-message-search-controls__cluster--center",
		);
		expect(css).toContain(".astra-chat-message-search-controls__counter");
		expect(css).toContain(".astra-chat-message-search-highlight");
		expect(css).toContain(".astra-chat-message-search-highlight--active");
	});

	test("keeps clickability cursor affordances explicit for enabled controls", () => {
		const css = readCss();

		expect(css).toMatch(
			/\.astra-chat-message-search-panel__option,\s*\.astra-chat-message-search-panel__replace-action,\s*\.astra-chat-message-search-controls__button\s*\{[^}]*cursor:\s*pointer;/u,
		);
		expect(css).toMatch(
			/\.astra-chat-message-search-controls__button--done\s*\{[^}]*cursor:\s*pointer;/u,
		);
		expect(css).toMatch(
			/\.astra-chat-message-search-controls__button:disabled\s*\{[^}]*cursor:\s*not-allowed;/u,
		);
	});
});
