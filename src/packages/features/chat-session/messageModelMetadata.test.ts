import { describe, expect, test } from "vitest";

import {
	formatMessageModelLabel,
	resolveMessageModelIconKey,
	resolveMessageModelLabel,
} from "@/packages/features/chat-session/messageModelMetadata";

describe("formatMessageModelLabel", () => {
	test("keeps the compact model segment used by message metadata surfaces", () => {
		expect(formatMessageModelLabel("makersuite - gemini-2.0-flash")).toBe(
			"gemini-2.0-flash",
		);
		expect(
			formatMessageModelLabel("openrouter/google/gemini-2.5-pro"),
		).toBe("gemini-2.5-pro");
		expect(formatMessageModelLabel("  Claude 3.7 Sonnet  ")).toBe(
			"Claude 3.7 Sonnet",
		);
		expect(formatMessageModelLabel("")).toBe("");
	});
});

describe("resolveMessageModelLabel", () => {
	test("uses chat message model before the native timestamp icon title", () => {
		expect(
			resolveMessageModelLabel({
				iconTitle: "makersuite - gemini-2.0-flash",
				model: "openrouter/google/gemini-2.5-pro",
			}),
		).toBe("gemini-2.5-pro");
	});

	test("falls back to the native timestamp icon title when chat model data is absent", () => {
		expect(
			resolveMessageModelLabel({
				iconTitle: "makersuite - gemini-2.0-flash",
			}),
		).toBe("gemini-2.0-flash");
	});
});

describe("resolveMessageModelIconKey", () => {
	test("derives the provider SVG key from chat message model data", () => {
		expect(
			resolveMessageModelIconKey({
				iconTitle: "",
				model: "openrouter/google/gemini-2.5-pro",
			}),
		).toBe("vertexai");
		expect(
			resolveMessageModelIconKey({
				model: "anthropic/claude-3.7-sonnet",
			}),
		).toBe("claude");
	});

	test("falls back to native icon title provider hints", () => {
		expect(
			resolveMessageModelIconKey({
				iconTitle: "makersuite - gemini-2.0-flash",
			}),
		).toBe("vertexai");
	});
});
