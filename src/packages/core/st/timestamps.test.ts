import { afterEach, describe, expect, test } from "vitest";

import {
	formatStTimestampDateDivider,
	formatStTimestampTimeOnly,
	getStTimestampLocalDateKey,
	parseStTimestampToMs,
} from "@/packages/core/st/timestamps";

const LOCAL_JUNE_4_2026_1134 = new Date(2026, 5, 4, 11, 34).getTime();

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("SillyTavern timestamps", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		document.documentElement.removeAttribute("lang");
		localStorage.clear();
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
	});

	test("formats a parsed timestamp as a locale-aware time-only label", () => {
		expect(
			formatStTimestampTimeOnly(LOCAL_JUNE_4_2026_1134, {
				locale: "en-US",
			}),
		).toBe("11:34 AM");
		expect(
			formatStTimestampTimeOnly(LOCAL_JUNE_4_2026_1134, {
				locale: "zh-TW",
			}),
		).toBe("上午11:34");
	});

	test("formats a parsed timestamp as a locale-aware date divider label", () => {
		expect(
			formatStTimestampDateDivider(LOCAL_JUNE_4_2026_1134, {
				locale: "en-US",
			}),
		).toBe("June 4, 2026");
		expect(
			formatStTimestampDateDivider(LOCAL_JUNE_4_2026_1134, {
				locale: "zh-TW",
			}),
		).toBe("2026年6月4日");
	});

	test("uses SillyTavern timestampToMoment formatting for compact timestamp labels", () => {
		const calls: string[] = [];
		setSillyTavernContext({
			timestampToMoment: () => ({
				format: (pattern: string) => {
					calls.push(pattern);
					return pattern === "LT" ? "上午 11:34" : "2026年6月4日";
				},
				valueOf: () => LOCAL_JUNE_4_2026_1134,
			}),
		});

		expect(formatStTimestampTimeOnly("June 4, 2026 11:34 AM")).toBe(
			"上午 11:34",
		);
		expect(formatStTimestampDateDivider("June 4, 2026 11:34 AM")).toBe(
			"2026年6月4日",
		);
		expect(calls).toEqual(["LT", "LL"]);
	});

	test("uses ui_language_select as the Intl fallback locale when SillyTavern moment formatting is unavailable", () => {
		document.body.innerHTML = `
			<select id="ui_language_select">
				<option value="">Default</option>
				<option value="zh-TW" selected>Chinese</option>
			</select>
		`;

		expect(formatStTimestampTimeOnly(LOCAL_JUNE_4_2026_1134)).toBe(
			"上午11:34",
		);
		expect(formatStTimestampDateDivider(LOCAL_JUNE_4_2026_1134)).toBe(
			"2026年6月4日",
		);
	});

	test("uses localStorage language as the Intl fallback locale when the UI language select is default", () => {
		document.body.innerHTML = `
			<select id="ui_language_select">
				<option value="" selected>Default</option>
				<option value="zh-TW">Chinese</option>
			</select>
		`;
		localStorage.setItem("language", "zh-TW");

		expect(formatStTimestampTimeOnly(LOCAL_JUNE_4_2026_1134)).toBe(
			"上午11:34",
		);
		expect(formatStTimestampDateDivider(LOCAL_JUNE_4_2026_1134)).toBe(
			"2026年6月4日",
		);
	});

	test("builds local date keys for grouping messages by the user calendar day", () => {
		expect(getStTimestampLocalDateKey(LOCAL_JUNE_4_2026_1134)).toBe(
			"2026-06-04",
		);
	});

	test("uses SillyTavern timestampToMoment before local Date parsing", () => {
		setSillyTavernContext({
			timestampToMoment: (value: unknown) => ({
				valueOf: () =>
					value === "June 4, 2026 11:34 AM"
						? LOCAL_JUNE_4_2026_1134
						: Number.NaN,
			}),
		});

		expect(parseStTimestampToMs("June 4, 2026 11:34 AM")).toBe(
			LOCAL_JUNE_4_2026_1134,
		);
	});

	test("returns empty labels and no day key for invalid timestamps", () => {
		expect(formatStTimestampTimeOnly("not-a-date")).toBe("");
		expect(formatStTimestampDateDivider("not-a-date")).toBe("");
		expect(getStTimestampLocalDateKey("not-a-date")).toBe("");
	});
});
