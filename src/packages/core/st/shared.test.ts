import { describe, expect, test } from "vitest";

import {
	asTrimmedIdentifier,
	asTrimmedPrimitiveString,
	asTrimmedString,
	normalizeChatId,
	readContextSafe,
} from "@/packages/core/st/shared";

describe("shared ST helpers", () => {
	test("trims only string values for string fields", () => {
		expect(asTrimmedString("  chapter  ")).toBe("chapter");
		expect(asTrimmedString(42)).toBe("");
		expect(asTrimmedString(false)).toBe("");
		expect(asTrimmedString(null)).toBe("");
	});

	test("trims primitive values when SillyTavern profile options allow non-string ids", () => {
		expect(asTrimmedPrimitiveString("  profile  ")).toBe("profile");
		expect(asTrimmedPrimitiveString(42)).toBe("42");
		expect(asTrimmedPrimitiveString(false)).toBe("false");
		expect(asTrimmedPrimitiveString({ value: "profile" })).toBe("");
	});

	test("normalizes identifiers from strings and finite numbers", () => {
		expect(asTrimmedIdentifier("  group-1  ")).toBe("group-1");
		expect(asTrimmedIdentifier(7)).toBe("7");
		expect(asTrimmedIdentifier(Number.NaN)).toBe("");
		expect(asTrimmedIdentifier(true)).toBe("");
	});

	test("normalizes chat ids by trimming strings and removing a jsonl suffix", () => {
		expect(normalizeChatId("  chapter-1.jsonl  ")).toBe("chapter-1");
		expect(normalizeChatId("chapter-2.JSONL")).toBe("chapter-2");
		expect(normalizeChatId("chapter-3.backup.jsonl")).toBe(
			"chapter-3.backup",
		);
		expect(normalizeChatId(42)).toBe("");
	});

	test("reads typed contexts safely", () => {
		expect(
			readContextSafe<{ chatId?: unknown }>(() => ({
				chatId: "chapter-1",
			})),
		).toEqual({ chatId: "chapter-1" });
		expect(readContextSafe(() => null)).toBeNull();
		expect(
			readContextSafe(() => {
				throw new Error("context unavailable");
			}),
		).toBeNull();
	});
});
