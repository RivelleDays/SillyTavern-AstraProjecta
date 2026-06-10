import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const CSS_PATH = resolve(__dirname, "./mobile-chat-top-bar.css");

function readCss() {
	return readFileSync(CSS_PATH, "utf8");
}

function readBlock(css: string, selector: string): string {
	const pattern = new RegExp(
		`${selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*\\{(?<body>[^}]*)\\}`,
		"u",
	);
	const match = pattern.exec(css);
	return match?.groups?.body ?? "";
}

describe("mobile chat top-bar CSS contracts", () => {
	test("keeps the shell and top-bar selector contracts addressable", () => {
		const css = readCss();

		expect(css).toContain("#mobile-chat-top-bar-shell");
		expect(css).toContain("#mobile-chat-top-bar-host");
		expect(css).toContain("--mobile-chat-top-bar-block-size");
		expect(css).toContain(".mobile-chat-top-bar");
		expect(css).toContain(".mobile-chat-top-bar__astra-main-trigger");
		expect(css).toContain(".mobile-chat-top-bar__astra-main-trigger-icon");
		expect(css).toContain(".mobile-chat-top-bar__identity");
		expect(css).toContain(".mobile-chat-top-bar__avatar-frame");
		expect(css).toContain(".mobile-chat-top-bar__avatar");
		expect(css).toContain(".mobile-chat-top-bar__avatar-image");
		expect(css).toContain("--mobile-chat-top-bar-avatar-size:");
		expect(css).toContain("var(--astra-avatar-size-min)");
		expect(css).toContain("var(--astra-avatar-size-mobile-top-bar)");
		expect(css).toContain(
			".mobile-chat-top-bar__avatar.astra-chat-avatar--collage",
		);
		expect(css).toContain(".mobile-chat-top-bar__name");
	});

	test("keeps wrapped #sheld owned by the top-bar shell layout contract", () => {
		const css = readCss();
		const block = readBlock(css, "#mobile-chat-top-bar-shell > #sheld");

		expect(block).not.toBe("");
		expect(block).toContain("position:");
		expect(block).toContain("top:");
		expect(block).toContain("left:");
		expect(block).toContain("right:");
		expect(block).toContain("margin:");
		expect(block).toContain("flex:");
		expect(block).toContain("height:");
		expect(block).toContain("max-height:");
		expect(block).toContain("min-height:");
		expect(block).toContain("width:");
	});

	test("hides native SillyTavern top bars only under Astra mobile layout", () => {
		const css = readCss();

		expect(css).toContain("body.astra-projecta-mobile-layout {");
		expect(css).toContain("& #top-bar");
		expect(css).toContain("& #top-settings-holder");
	});

	test("keeps the enabled back button cursor affordance explicit", () => {
		const css = readCss();

		expect(css).toMatch(
			/\.mobile-chat-top-bar__astra-main-trigger(?::enabled)?\s*\{[^}]*cursor:\s*pointer;/u,
		);
	});

	test("keeps identity name constrained to a single ellipsized line", () => {
		const css = readCss();
		const identityBlock = readBlock(css, ".mobile-chat-top-bar__identity");
		const nameBlock = readBlock(css, ".mobile-chat-top-bar__name");

		expect(identityBlock).toContain("width:");
		expect(identityBlock).toContain("max-width:");
		expect(identityBlock).toContain("min-width: 0;");
		expect(nameBlock).toContain("display: block;");
		expect(nameBlock).toContain("width: 100%;");
		expect(nameBlock).toContain("max-width: 100%;");
		expect(nameBlock).toContain("min-width: 0;");
		expect(nameBlock).toContain("overflow: hidden;");
		expect(nameBlock).toContain("text-overflow: ellipsis;");
		expect(nameBlock).toContain("white-space: nowrap;");
	});
});
