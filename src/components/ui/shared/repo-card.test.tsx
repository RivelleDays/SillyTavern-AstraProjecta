import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { RepoCard } from "@/components/ui/shared/repo-card";

describe("RepoCard", () => {
	test("renders a safe GitHub repo preview link with optional metadata", () => {
		render(
			<RepoCard
				ariaLabel="RivelleDays/SillyTavern-AstraProjecta on GitHub"
				description="AstraProjecta extension UI"
				forks={42}
				fullName="RivelleDays/SillyTavern-AstraProjecta"
				href="https://github.com/RivelleDays/SillyTavern-AstraProjecta"
				language="TypeScript"
				languageColor="#3178c6"
				license="MIT"
				stars={128}
				topics={["sillytavern", "extension"]}
			/>,
		);

		const link = screen.getByRole("link", {
			name: "RivelleDays/SillyTavern-AstraProjecta on GitHub",
		});

		expect(link).toHaveAttribute(
			"href",
			"https://github.com/RivelleDays/SillyTavern-AstraProjecta",
		);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noreferrer");
		expect(link).toHaveAttribute("data-slot", "repo-card");
		expect(link).toHaveClass("astra-repo-card");
		expect(link.querySelector('[data-slot="repo-name"]')).toHaveTextContent(
			"RivelleDays/SillyTavern-AstraProjecta",
		);
		expect(
			link.querySelector('[data-slot="repo-description"]'),
		).toHaveTextContent("AstraProjecta extension UI");
		expect(link).toHaveTextContent("TypeScript");
		expect(link).toHaveTextContent("128");
		expect(link).toHaveTextContent("42");
		expect(link).toHaveTextContent("MIT");
		expect(link).toHaveTextContent("sillytavern");
		expect(link).toHaveTextContent("extension");
	});
});
