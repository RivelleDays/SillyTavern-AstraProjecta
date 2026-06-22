import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { createMessageHeaderActionRoots } from "@/packages/features/chat-session/message-actions/messageHeaderActionRoots";
import { resolveLoadedMessageElements } from "@/packages/features/chat-session/message-actions/contracts/dom";

describe("createMessageHeaderActionRoots", () => {
	test("renders actions into direct Astra message headers", async () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0">
					<div class="astra-mesHeader"></div>
				</div>
			</div>
		`;
		const onEdit = vi.fn();
		const onMore = vi.fn();
		const roots = createMessageHeaderActionRoots({
			renderActions: (messageId) => (
				<>
					<button type="button" onClick={() => onEdit(messageId)}>
						Edit {messageId}
					</button>
					<button type="button" onClick={() => onMore(messageId)}>
						More {messageId}
					</button>
				</>
			),
		});

		roots.render(resolveLoadedMessageElements(document));

		const host = document.querySelector(".astra-mesHeaderActions");
		expect(host).toHaveAttribute(
			"data-astra-component",
			"mes-header-actions",
		);
		fireEvent.click(await screen.findByRole("button", { name: "Edit 0" }));
		fireEvent.click(screen.getByRole("button", { name: "More 0" }));
		expect(onEdit).toHaveBeenCalledWith(0);
		expect(onMore).toHaveBeenCalledWith(0);

		roots.unmountAll();
	});

	test("removes stale action roots when messages leave or lose their header", async () => {
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0">
					<div class="astra-mesHeader"></div>
				</div>
				<div class="mes" mesid="1">
					<div class="astra-mesHeader"></div>
				</div>
			</div>
		`;
		const roots = createMessageHeaderActionRoots({
			renderActions: (messageId) => (
				<button type="button">Action {messageId}</button>
			),
		});

		roots.render(resolveLoadedMessageElements(document));
		expect(
			await screen.findByRole("button", { name: "Action 0" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Action 1" }),
		).toBeInTheDocument();

		document.querySelector('.mes[mesid="0"]')?.remove();
		document
			.querySelector('.mes[mesid="1"] .astra-mesHeader')
			?.classList.remove("astra-mesHeader");
		roots.render(resolveLoadedMessageElements(document));

		expect(screen.queryByRole("button", { name: "Action 0" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Action 1" })).toBeNull();
		expect(document.querySelector(".astra-mesHeaderActions")).toBeNull();

		roots.unmountAll();
	});
});
