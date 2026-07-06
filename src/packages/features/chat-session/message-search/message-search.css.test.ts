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
		expect(css).toContain('[data-replace-visible="true"]');
		expect(css).toContain(".astra-chat-message-search-panel");
		expect(css).toContain(".astra-chat-message-search-panel__mode");
		expect(css).toContain(".astra-chat-message-search-panel__mode-close");
		expect(css).toContain(".astra-chat-message-search-panel__search-row");
		expect(css).toContain(".astra-chat-message-search-panel__replace-row");
		expect(css).toContain(".astra-chat-message-search-panel__input-shell");
		expect(css).toContain(
			".astra-chat-message-search-panel__options-trigger",
		);
		expect(css).toContain(
			".astra-chat-message-search-panel__options-popover",
		);
		expect(css).toContain(".astra-chat-message-search-panel__option-row");
		expect(css).toContain(".astra-chat-message-search-controls");
		expect(css).toContain(".astra-chat-message-search-controls__surface");
		expect(css).toContain(".astra-chat-message-search-controls__row");
		expect(css).toContain(".astra-chat-message-search-controls__cluster");
		expect(css).toContain(
			".astra-chat-message-search-controls__cluster--nav",
		);
		expect(css).toContain(
			".astra-chat-message-search-controls__cluster--history",
		);
		expect(css).toContain(".astra-chat-message-search-controls__counter");
		expect(css).toContain(".astra-chat-message-search-highlight");
		expect(css).toContain(".astra-chat-message-search-highlight--active");
	});

	test("keeps clickability cursor affordances explicit for enabled controls", () => {
		const css = readCss();

		expect(css).toMatch(
			/\.astra-chat-message-search-panel__mode-close,\s*\.astra-chat-message-search-panel__options-trigger,\s*\.astra-chat-message-search-panel__replace-action,\s*\.astra-chat-message-search-controls__button\s*\{[^}]*cursor:\s*pointer;/u,
		);
		expect(css).toMatch(
			/\.astra-chat-message-search-panel__option-checkbox\s*\{[^}]*cursor:\s*pointer;/u,
		);
		expect(css).toMatch(
			/\.astra-chat-message-search-controls__button--done\s*\{[^}]*cursor:\s*pointer;/u,
		);
		expect(css).toMatch(
			/\.astra-chat-message-search-panel__replace-action:disabled,\s*\.astra-chat-message-search-controls__button:disabled\s*\{[^}]*cursor:\s*not-allowed;/u,
		);
	});
});
