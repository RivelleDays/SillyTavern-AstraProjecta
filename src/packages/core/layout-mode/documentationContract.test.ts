import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readSource(relativePath: string): string {
	return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("layout-mode and wrapper documentation contracts", () => {
	test("documents the centralized 1000px auto-mode contract and its routing path", () => {
		const readme = readSource("README.md");
		const rootSourceAgents = readSource("src/AGENTS.md");
		const coreAgents = readSource("src/packages/core/AGENTS.md");
		const layoutModeAgents = readSource(
			"src/packages/core/layout-mode/AGENTS.md",
		);
		const mobileRuntimeAgents = readSource(
			"src/app/mobile/runtime/AGENTS.md",
		);

		expect(readme).toContain(
			"mobile shell activates at widths of 1000px and below",
		);
		expect(readme).toContain("Supported through the mobile shell range");
		expect(readme).not.toContain("designed for widths below 600px");
		expect(rootSourceAgents).toContain("layout-mode");
		expect(coreAgents).toContain("layout-mode/");
		expect(layoutModeAgents).toContain("screen and (max-width: 1000px)");
		expect(layoutModeAgents).toContain("`auto`");
		expect(layoutModeAgents).toContain("`force-mobile`");
		expect(layoutModeAgents).toContain("`force-desktop`");
		expect(layoutModeAgents).toContain("isMobile()");
		expect(mobileRuntimeAgents).toContain("shared layout-mode contract");
	});

	test("documents Astra wrapper precedence when shadcn and Astra names overlap", () => {
		const uiAgents = readSource("src/components/ui/AGENTS.md");
		const shadcnAgents = readSource("src/components/ui/shadcn/AGENTS.md");
		const astraAgents = readSource("src/components/ui/astra/AGENTS.md");

		expect(uiAgents).toContain("same-name Astra wrapper");
		expect(uiAgents).toContain("prefer the Astra version");
		expect(shadcnAgents).toContain("same-name Astra wrapper");
		expect(shadcnAgents).toContain("prefer the Astra version");
		expect(astraAgents).toContain("canonical SillyTavern-adapted import");
	});

	test("documents the send-form drawer drift mitigation as an intentional compatibility guard", () => {
		const optionsMenuAgents = readSource(
			"src/packages/features/chat-session/send-form/options-menu/AGENTS.md",
		);
		const astraAgents = readSource("src/components/ui/astra/AGENTS.md");

		expect(optionsMenuAgents).toContain("Chrome device preview");
		expect(optionsMenuAgents).toContain("releaseSendFormFocus");
		expect(optionsMenuAgents).toContain("repositionInputs={false}");
		expect(astraAgents).toContain("feature-local");
		expect(astraAgents).toContain("Vaul");
	});
});
