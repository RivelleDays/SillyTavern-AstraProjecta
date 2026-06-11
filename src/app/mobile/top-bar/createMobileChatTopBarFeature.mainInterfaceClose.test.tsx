import * as React from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";

vi.mock("@/packages/features/astra-main-interface", () => ({
	AstraMainInterface({ onRequestClose }: { onRequestClose?: () => void }) {
		return (
			<button type="button" onClick={onRequestClose}>
				Open mocked chat
			</button>
		);
	},
	AstraMainInterfaceScopeStrip() {
		return (
			<div aria-label="Main UI sections" role="tablist">
				Mocked main sections
			</div>
		);
	},
	resolveAstraMainInterfaceScopeTitle() {
		return "SillyTavern";
	},
}));

function createIdentitySnapshot(): CurrentChatIdentitySnapshot {
	return {
		avatarSource: "character-thumbnail",
		characterId: 0,
		chatFileName: "chapter-1",
		entityName: "Hero",
		groupAvatarUrls: [],
		groupId: null,
		hasActiveChat: true,
		kind: "character",
		thumbnailUrl: "/thumbs/avatar/hero.png",
		updatedAt: 0,
	};
}

function createIdentityStoreStub() {
	const snapshot = createIdentitySnapshot();
	const store = {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn(() => () => undefined),
	};
	const factory = vi.fn(() => store);

	return {
		factory,
		store,
	};
}

describe("createMobileChatTopBarFeature main interface close wiring", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	test("passes an onRequestClose callback into AstraMainInterface", async () => {
		const { createMobileChatTopBarFeature } =
			await import("@/app/mobile/top-bar/createMobileChatTopBarFeature");
		document.body.innerHTML = '<div id="sheld"></div>';
		const store = createIdentityStoreStub();
		const feature = createMobileChatTopBarFeature({
			createCurrentChatIdentityStore: store.factory,
			documentRef: document,
		});

		act(() => {
			feature.mount();
		});

		fireEvent.click(
			await screen.findByRole("button", {
				name: "Open Main UI",
			}),
		);
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Open mocked chat",
			}),
		);

		await waitFor(() => {
			expect(
				document.getElementById("mobile-astra-main-interface-panel"),
			).toHaveAttribute("data-state", "closed");
			expect(
				document.getElementById("mobile-astra-main-interface-panel"),
			).toHaveAttribute("inert");
		});
		expect(
			document.getElementById("mobile-astra-main-interface-panel"),
		).not.toHaveAttribute("aria-hidden");

		act(() => {
			feature.dispose();
		});
	});
});
