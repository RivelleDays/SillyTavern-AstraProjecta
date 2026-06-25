import { describe, expect, test, vi } from "vitest";

import {
	renderMessageContent,
	writeRenderedMessageContent,
} from "@/packages/core/st/chatMessageRendering";

const XSS_PAYLOADS = [
	"<img src=x onerror=alert(1)>",
	"<svg onload=alert(1)>",
	'<a href="javascript:alert(1)">link</a>',
	"<script>alert(1)</script>",
] as const;

function expectNoExecutableMarkup(target: Element): void {
	expect(target.querySelector("img, svg, a, script")).toBeNull();
}

describe("chat message rendering", () => {
	test.each(XSS_PAYLOADS)(
		"renders null-context fallback payload as text: %s",
		(payload) => {
			const content = renderMessageContent({
				context: null,
				message: {
					is_system: false,
					is_user: false,
					name: "Assistant",
				},
				messageId: 0,
				text: payload,
			});
			const target = document.createElement("div");

			writeRenderedMessageContent(target, content);

			expect(content).toEqual({
				kind: "plain-text",
				value: payload,
			});
			expect(target.textContent).toBe(payload);
			expectNoExecutableMarkup(target);
		},
	);

	test("keeps formatter output as formatted HTML when formatting succeeds", () => {
		const formatter = vi.fn(() => "<p>Formatted body</p>");
		const target = document.createElement("div");
		const content = renderMessageContent({
			context: {
				messageFormatting: formatter,
			},
			message: {
				is_system: true,
				is_user: false,
				name: "System",
			},
			messageId: 7,
			text: "Raw body",
		});

		writeRenderedMessageContent(target, content);

		expect(content).toEqual({
			kind: "formatted-html",
			value: "<p>Formatted body</p>",
		});
		expect(target.innerHTML).toBe("<p>Formatted body</p>");
		expect(formatter).toHaveBeenCalledWith(
			"Raw body",
			"System",
			true,
			false,
			7,
		);
	});

	test("falls back to plain text when formatter throws", () => {
		const payload = '<a href="javascript:alert(1)">link</a>';
		const target = document.createElement("div");
		const content = renderMessageContent({
			context: {
				messageFormatting: () => {
					throw new Error("formatter unavailable");
				},
			},
			message: {
				is_system: false,
				is_user: false,
				name: "Assistant",
			},
			messageId: 0,
			text: payload,
		});

		writeRenderedMessageContent(target, content);

		expect(content).toEqual({
			kind: "plain-text",
			value: payload,
		});
		expect(target.textContent).toBe(payload);
		expectNoExecutableMarkup(target);
	});
});
