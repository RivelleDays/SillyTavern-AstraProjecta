import { describe, expect, test } from "vitest";

import { createMessageContentSnapshot } from "@/packages/features/chat-session/message-actions/more-actions/messageContentSnapshot";

function parseSnapshot(renderedMessageHtml: string): Element | null {
	const container = document.createElement("div");
	container.innerHTML = renderedMessageHtml;
	return container.firstElementChild;
}

describe("createMessageContentSnapshot", () => {
	test("clones the rendered mes_text DOM while preserving display markup and scoped styles", () => {
		document.body.innerHTML = `
			<div class="mes" mesid="4">
				<div class="mes_block">
					<div id="source-message" class="mes_text inline_media" onclick="return false">
						<style>.mes_text .custom-quote { color: red; }</style>
						<p><q>「小蝴蝶，早安。」</q><strong>Rendered</strong></p>
						<span style="--message-tone: calm">Inline style</span>
					</div>
				</div>
			</div>
		`;
		const messageElement = document.querySelector(".mes");

		const snapshot = createMessageContentSnapshot(messageElement);
		const clone = parseSnapshot(snapshot.renderedMessageHtml);

		expect(clone).not.toBeNull();
		expect(clone).toHaveClass("mes_text");
		expect(clone).toHaveClass("inline_media");
		expect(clone?.querySelector("style")).toHaveTextContent(
			".mes_text .custom-quote",
		);
		expect(clone?.querySelector("q")).toHaveTextContent(
			"「小蝴蝶，早安。」",
		);
		expect(clone?.querySelector("strong")).toHaveTextContent("Rendered");
		expect(clone?.querySelector("[style]")).toHaveAttribute(
			"style",
			"--message-tone: calm",
		);
		expect(snapshot.messagePreviewText).toBe(
			"「小蝴蝶，早安。」 Rendered Inline style",
		);
	});

	test("scrubs duplicate ids, event attributes, scripts, autoplay, focusable state, and unsafe preview text", () => {
		document.body.innerHTML = `
			<div class="mes" mesid="7">
				<div class="mes_text" id="root-id" onmouseover="hover()">
					<style>.unsafe { color: red; }</style>
					<a id="link-id" href="/characters" onclick="openLink()">Character link</a>
					<button id="button-id" autofocus onclick="runAction()">Action</button>
					<input id="input-id" contenteditable="true" value="editable" />
					<video id="video-id" autoplay controls src="/clip.mp4"></video>
					<script>window.__astraUnsafe = true;</script>
				</div>
			</div>
		`;
		const messageElement = document.querySelector(".mes");

		const snapshot = createMessageContentSnapshot(messageElement);
		const clone = parseSnapshot(snapshot.renderedMessageHtml);

		expect(clone).not.toBeNull();
		expect(clone).not.toHaveAttribute("id");
		expect(clone).not.toHaveAttribute("onmouseover");
		expect(clone?.querySelector("script")).toBeNull();
		for (const element of Array.from(
			clone?.querySelectorAll("[id], [onclick], [autofocus], [autoplay]") ??
				[],
		)) {
			expect(element).not.toBeInTheDocument();
		}
		expect(clone?.querySelector("a")).toHaveAttribute("tabindex", "-1");
		expect(clone?.querySelector("button")).toHaveAttribute(
			"tabindex",
			"-1",
		);
		expect(clone?.querySelector("input")).toHaveAttribute(
			"tabindex",
			"-1",
		);
		expect(clone?.querySelector("video")).toHaveAttribute(
			"tabindex",
			"-1",
		);
		expect(clone?.querySelector("input")).not.toHaveAttribute(
			"contenteditable",
		);
		expect(snapshot.messagePreviewText).toBe("Character link Action");
	});

	test("returns an empty snapshot when the message has no rendered mes_text", () => {
		document.body.innerHTML = `
			<div class="mes" mesid="8">
				<div class="mes_block">Raw fallback must not be used.</div>
			</div>
		`;
		const messageElement = document.querySelector(".mes");

		expect(createMessageContentSnapshot(messageElement)).toEqual({
			messagePreviewText: "",
			renderedMessageHtml: "",
		});
		expect(createMessageContentSnapshot(null)).toEqual({
			messagePreviewText: "",
			renderedMessageHtml: "",
		});
	});
});
