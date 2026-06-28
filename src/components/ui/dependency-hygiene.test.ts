import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

type PackageJson = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

const REMOVED_RUNTIME_DEPENDENCIES = [
	"@hookform/resolvers",
	"cmdk",
	"date-fns",
	"embla-carousel-react",
	"input-otp",
	"next-themes",
	"react-day-picker",
	"react-hook-form",
	"react-resizable-panels",
	"recharts",
	"sonner",
	"zod",
] as const;

const RETAINED_SHADCN_FILES = [
	"AGENTS.md",
	"badge.tsx",
	"button.tsx",
	"checkbox.tsx",
	"dropdown-menu.tsx",
	"empty.tsx",
	"field.tsx",
	"input.tsx",
	"label.tsx",
	"select.tsx",
	"separator.tsx",
	"sheet.tsx",
	"slider.tsx",
	"switch.tsx",
	"tabs.tsx",
	"textarea.tsx",
	"tooltip.tsx",
] as const;

function readPackageJson(): PackageJson {
	return JSON.parse(
		readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
	) as PackageJson;
}

function parseDeclaredMajor(versionRange: string): number {
	const match = versionRange.match(/\d+/u);
	if (!match) {
		throw new Error(`Unable to parse package major from ${versionRange}`);
	}
	return Number(match[0]);
}

describe("dependency hygiene", () => {
	test("keeps React runtime and React type majors aligned", () => {
		const packageJson = readPackageJson();
		const dependencies = packageJson.dependencies ?? {};
		const devDependencies = packageJson.devDependencies ?? {};

		expect(parseDeclaredMajor(devDependencies["@types/react"])).toBe(
			parseDeclaredMajor(dependencies.react),
		);
		expect(parseDeclaredMajor(devDependencies["@types/react-dom"])).toBe(
			parseDeclaredMajor(dependencies["react-dom"]),
		);
	});

	test("keeps unused heavy shadcn dependencies out of direct runtime dependencies", () => {
		const packageJson = readPackageJson();
		const dependencies = packageJson.dependencies ?? {};

		for (const dependency of REMOVED_RUNTIME_DEPENDENCIES) {
			expect(dependencies).not.toHaveProperty(dependency);
		}
		expect(dependencies).not.toHaveProperty("shadcn");
	});

	test("keeps the vendored shadcn folder pruned to the used primitive allowlist", () => {
		const actualFiles = readdirSync(
			resolve(process.cwd(), "src/components/ui/shadcn"),
		).sort();

		expect(actualFiles).toEqual([...RETAINED_SHADCN_FILES].sort());
	});
});
