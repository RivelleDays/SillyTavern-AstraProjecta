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

function expectImportantDeclaration(block: string, property: string) {
	expect(block).toMatch(
		new RegExp(`(?:^|\\s)${property}:\\s*[^;]+!important;`, "u"),
	);
}

describe("mobile chat top-bar CSS contracts", () => {
	test("keeps the shell and top-bar selector contracts addressable", () => {
		const css = readCss();

		expect(css).toContain("#astra-chat-session-shell");
		expect(css).toContain("#astra-chat-top-bar-host");
		expect(css).toContain("--astra-chat-top-bar-block-size");
		expect(css).toContain(".astra-chat-top-bar");
		expect(css).toContain(".astra-chat-top-bar__astra-main-trigger");
		expect(css).toContain(".astra-chat-top-bar__astra-main-trigger-icon");
		expect(css).toContain(".astra-chat-top-bar__actions");
		expect(css).toContain(".astra-chat-top-bar__action");
		expect(css).toContain(".astra-chat-top-bar__action-icon");
		expect(css).toContain(".astra-chat-top-bar__identity");
		expect(css).toContain(".astra-chat-top-bar__avatar-frame");
		expect(css).toContain(".astra-chat-top-bar__avatar");
		expect(css).toContain(".astra-chat-top-bar__avatar-image");
		expect(css).toContain("--astra-chat-top-bar-avatar-size:");
		expect(css).toContain("var(--astra-avatar-size-min)");
		expect(css).toContain("var(--astra-avatar-size-mobile-top-bar)");
		expect(css).toContain(
			".astra-chat-top-bar__avatar.astra-chat-avatar--collage",
		);
		expect(css).toContain(".astra-chat-top-bar__name");
	});

	test("keeps wrapped #sheld owned by the top-bar shell layout contract", () => {
		const css = readCss();
		const block = readBlock(css, "& #astra-chat-session-shell > #sheld");

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
		for (const property of ["height", "min-height", "max-height"]) {
			expectImportantDeclaration(block, property);
		}
	});

	test("resolves the mobile chat shell from host viewport and safe-area contracts", () => {
		const css = readCss();
		const shellBlock = readBlock(css, "#astra-chat-session-shell");
		const topBarBlock = readBlock(css, ".astra-chat-top-bar");

		expect(shellBlock).toContain(
			"--astra-chat-top-bar-content-block-size:",
		);
		expect(shellBlock).toContain("--astra-mobile-safe-block-start:");
		expect(shellBlock).toMatch(
			/var\(\s*--tt-inset-top,\s*env\(safe-area-inset-top/u,
		);
		expect(shellBlock).toMatch(/var\(\s*--tt-base-viewport-height/u);
		expect(topBarBlock).toContain("var(--astra-mobile-safe-block-start)");
	});

	test("hides native SillyTavern top bars only under Astra mobile layout", () => {
		const css = readCss();

		expect(css).toContain("body.astra-projecta-mobile-layout {");
		expect(css).toContain("& #top-bar");
		expect(css).toContain("& #top-settings-holder");
		expect(css).toContain("& #astra-chat-session-shell > #sheld");
	});

	test("keeps the top glass overlay masked so blur fades out with the surface", () => {
		const css = readCss();
		const overlayBlock = readBlock(css, "#astra-chat-top-bar-host::before");

		expect(overlayBlock).not.toBe("");
		expect(overlayBlock).toContain("-webkit-mask-image:");
		expect(overlayBlock).toContain("mask-image:");
	});

	test("keeps the enabled back button cursor affordance explicit", () => {
		const css = readCss();

		expect(css).toMatch(
			/\.astra-chat-top-bar__astra-main-trigger(?::enabled)?\s*\{[^}]*cursor:\s*pointer;/u,
		);
	});

	test("keeps identity name constrained to a single ellipsized line", () => {
		const css = readCss();
		const identityBlock = readBlock(css, ".astra-chat-top-bar__identity");
		const nameBlock = readBlock(css, ".astra-chat-top-bar__name");

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
