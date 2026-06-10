import { cleanup, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { showChatSwitchLoadingOverlay } from "@/packages/features/chat-session/chat-switch-loading";

describe("showChatSwitchLoadingOverlay", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	test("renders a visible status message over the native #sheld chat-session surface", async () => {
		document.body.innerHTML = `
            <div id="sheld">
                <div id="chat"></div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;

		const handle = showChatSwitchLoadingOverlay({
			documentRef: document,
			exitDurationMs: 0,
			label: "Opening chat...",
		});

		const overlay = within(sheld).getByRole("status", {
			name: "Opening chat...",
		});
		expect(sheld).toHaveAttribute(
			"data-astra-projecta-chat-switch-loading",
			"active",
		);
		expect(overlay).toHaveClass("astra-chat-switch-loading-overlay");
		expect(overlay.parentElement).toBe(sheld);
		expect(
			overlay.querySelector(".astra-chat-switch-loading-overlay__text"),
		).toHaveTextContent("Opening chat...");

		await handle.hide();

		expect(sheld).not.toHaveAttribute(
			"data-astra-projecta-chat-switch-loading",
		);
		expect(
			within(sheld).queryByRole("status", {
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
	});

	test("keeps the overlay mounted when native chat clearing removes #chat children", async () => {
		document.body.innerHTML = `
            <div id="sheld">
                <div id="chat">
                    <div class="mes">Existing message</div>
                </div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const chat = document.getElementById("chat") as HTMLElement;
		const handle = showChatSwitchLoadingOverlay({
			documentRef: document,
			exitDurationMs: 0,
			label: "Opening chat...",
		});

		chat.replaceChildren();

		expect(
			within(sheld).getByRole("status", {
				name: "Opening chat...",
			}),
		).toBeInTheDocument();

		await handle.hide();

		expect(
			within(sheld).queryByRole("status", {
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
	});

	test("uses a closing state before removing the overlay", async () => {
		vi.useFakeTimers();
		document.body.innerHTML = `
            <div id="sheld">
                <div id="chat"></div>
            </div>
        `;
		const sheld = document.getElementById("sheld") as HTMLElement;
		const handle = showChatSwitchLoadingOverlay({
			documentRef: document,
			exitDurationMs: 160,
			label: "Opening chat...",
		});

		const hidePromise = handle.hide();
		const overlay = within(sheld).getByRole("status", {
			name: "Opening chat...",
		});

		expect(sheld).toHaveAttribute(
			"data-astra-projecta-chat-switch-loading",
			"closing",
		);
		expect(overlay).toHaveAttribute("data-state", "closing");

		vi.advanceTimersByTime(159);
		expect(overlay).toBeInTheDocument();

		vi.advanceTimersByTime(1);
		await hidePromise;

		expect(
			within(sheld).queryByRole("status", {
				name: "Opening chat...",
			}),
		).not.toBeInTheDocument();
	});

	test("returns a no-op handle when #sheld is unavailable", async () => {
		document.body.innerHTML = '<div id="chat"></div>';

		const handle = showChatSwitchLoadingOverlay({
			documentRef: document,
			label: "Opening chat...",
		});

		expect(
			document.body.querySelector(".astra-chat-switch-loading-overlay"),
		).not.toBeInTheDocument();

		await expect(handle.hide()).resolves.toBeUndefined();
		expect(
			document.body.querySelector(".astra-chat-switch-loading-overlay"),
		).not.toBeInTheDocument();
	});
});
