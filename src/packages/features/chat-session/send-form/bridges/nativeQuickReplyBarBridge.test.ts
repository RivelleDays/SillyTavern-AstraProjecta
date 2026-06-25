import { waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { createNativeQuickReplyBarBridge } from "@/packages/features/chat-session/send-form/bridges/nativeQuickReplyBarBridge";

describe("createNativeQuickReplyBarBridge", () => {
	test("attaches an existing quick reply bar to the provided host and restores it on dispose", async () => {
		document.body.innerHTML = `
      <div id="form_sheld">
        <div id="astra-chat-quick-replies-host"></div>
        <form id="send_form">
          <div id="qr--bar">Quick reply</div>
          <div id="nonQRFormItems"></div>
        </form>
      </div>
    `;

		const host = document.getElementById("astra-chat-quick-replies-host");
		const sendForm = document.getElementById("send_form");
		const nonQrFormItems = document.getElementById("nonQRFormItems");
		if (
			!(host instanceof HTMLElement) ||
			!(sendForm instanceof HTMLElement) ||
			!(nonQrFormItems instanceof HTMLElement)
		) {
			throw new Error("expected quick reply bridge fixture");
		}

		const bridge = createNativeQuickReplyBarBridge({
			documentRef: document,
		});
		bridge.attachTo(host);

		await waitFor(() => {
			expect(host.querySelector("#qr--bar")).toBeInTheDocument();
		});
		expect(bridge.getSnapshot()).toMatchObject({
			isAttachedToHost: true,
			isAvailable: true,
		});

		bridge.dispose();

		const restoredBar = document.getElementById("qr--bar");
		expect(restoredBar?.parentElement).toBe(sendForm);
		expect(restoredBar?.nextElementSibling).toBe(nonQrFormItems);
	});

	test("re-attaches replacement quick reply bars that appear after the first one is removed", async () => {
		document.body.innerHTML = `
      <div id="form_sheld">
        <div id="astra-chat-quick-replies-host"></div>
        <form id="send_form">
          <div id="qr--bar">Initial</div>
          <div id="nonQRFormItems"></div>
        </form>
      </div>
    `;

		const host = document.getElementById("astra-chat-quick-replies-host");
		const sendForm = document.getElementById("send_form");
		const nonQrFormItems = document.getElementById("nonQRFormItems");
		const initialBar = document.getElementById("qr--bar");
		if (
			!(host instanceof HTMLElement) ||
			!(sendForm instanceof HTMLElement) ||
			!(nonQrFormItems instanceof HTMLElement) ||
			!(initialBar instanceof HTMLElement)
		) {
			throw new Error("expected replacement quick reply fixture");
		}

		const bridge = createNativeQuickReplyBarBridge({
			documentRef: document,
		});
		bridge.attachTo(host);

		await waitFor(() => {
			expect(initialBar.parentElement).toBe(host);
		});

		initialBar.remove();

		const replacementBar = document.createElement("div");
		replacementBar.id = "qr--bar";
		replacementBar.textContent = "Replacement";
		sendForm.insertBefore(replacementBar, nonQrFormItems);

		await waitFor(() => {
			expect(replacementBar.parentElement).toBe(host);
		});

		bridge.dispose();

		expect(replacementBar.parentElement).toBe(sendForm);
		expect(replacementBar.nextElementSibling).toBe(nonQrFormItems);
	});

	test("keeps restore as a no-op when the original parent disconnects", async () => {
		document.body.innerHTML = `
      <div id="root">
        <form id="send_form">
          <div id="qr--bar">Quick reply</div>
        </form>
      </div>
      <div id="astra-chat-quick-replies-host"></div>
    `;

		const host = document.getElementById("astra-chat-quick-replies-host");
		const sendForm = document.getElementById("send_form");
		if (
			!(host instanceof HTMLElement) ||
			!(sendForm instanceof HTMLElement)
		) {
			throw new Error("expected disconnected parent fixture");
		}

		const bridge = createNativeQuickReplyBarBridge({
			documentRef: document,
		});
		bridge.attachTo(host);

		await waitFor(() => {
			expect(host.querySelector("#qr--bar")).toBeInTheDocument();
		});

		sendForm.remove();
		bridge.restore();

		expect(host.querySelector("#qr--bar")).toBeInTheDocument();
		expect(bridge.getSnapshot().isAttachedToHost).toBe(true);

		bridge.dispose();
	});
});
