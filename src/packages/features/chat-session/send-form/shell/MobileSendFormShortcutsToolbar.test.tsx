import * as React from "react";

import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
	HatGlasses,
	MessageCirclePlus,
	RefreshCcw,
} from "@/components/ui/shared/icons";
import type { ChatContextUsageSnapshot } from "@/packages/core/st/chatContextUsage";
import { SILLYTAVERN_INTERFACE_TRIGGER_ID } from "@/packages/features/chat-session/send-form/contracts/dom";
import { MobileSendFormShortcutsToolbar } from "@/packages/features/chat-session/send-form/shell/MobileSendFormShortcutsToolbar";

function createContextUsageSnapshot(): ChatContextUsageSnapshot {
	return {
		activityStatus: "idle",
		characterTokens: 0,
		chatHistoryTokens: 0,
		hasDetailedBreakdown: false,
		hasPreparedContext: false,
		mainApi: "",
		maxContextTokens: 0,
		otherPromptTokens: null,
		personaTokens: 0,
		promptBudgetTokens: 0,
		reservedResponseTokens: 0,
		status: "idle",
		updatedAt: 0,
		usagePercent: 0,
		usedContextTokens: 0,
		usedPromptTokens: 0,
		worldInfoTokens: 0,
	};
}

describe("MobileSendFormShortcutsToolbar", () => {
	test("separates the featured ST trigger from regular shortcut actions with div item wrappers", () => {
		const onPermanentShortcutClick = vi.fn();
		const onQuickShortcutClick = vi.fn();
		const onSillyTavernInterfaceOpen = vi.fn();

		const { container } = render(
			<MobileSendFormShortcutsToolbar
				contextUsageSnapshot={createContextUsageSnapshot()}
				label="Chat shortcuts"
				permanentShortcutActions={[
					{
						icon: MessageCirclePlus,
						id: "start-new-chat",
						label: "Start new chat",
					},
					{
						icon: RefreshCcw,
						id: "reload-page",
						label: "Reload page",
					},
				]}
				showContextUsageShortcut={false}
				sillyTavernInterfaceTriggerLabel="ST menu"
				visibleQuickShortcuts={[
					{
						icon: HatGlasses,
						id: "impersonate",
						label: "Ask AI to write your message for you",
					},
				]}
				onPermanentShortcutClick={onPermanentShortcutClick}
				onQuickShortcutClick={onQuickShortcutClick}
				onSillyTavernInterfaceOpen={onSillyTavernInterfaceOpen}
			/>,
		);

		const strip = container.querySelector(
			".mobile-send-form-shortcuts__strip",
		) as HTMLElement;
		const featuredGroup = strip.querySelector(
			".mobile-send-form-shortcuts__featured-group",
		) as HTMLElement;
		const regularGroup = strip.querySelector(
			".mobile-send-form-shortcuts__regular-group",
		) as HTMLElement;

		expect(Array.from(strip.children)).toEqual([
			featuredGroup,
			regularGroup,
		]);

		const featuredItem = document.getElementById(
			"astra-send-form-shortcut-item-sillytavern-interface",
		);
		const startNewChatItem = document.getElementById(
			"astra-send-form-shortcut-item-start-new-chat",
		);
		const reloadPageItem = document.getElementById(
			"astra-send-form-shortcut-item-reload-page",
		);
		const impersonateItem = document.getElementById(
			"astra-send-form-shortcut-item-impersonate",
		);

		expect(featuredItem?.tagName).toBe("DIV");
		expect(startNewChatItem?.tagName).toBe("DIV");
		expect(reloadPageItem?.tagName).toBe("DIV");
		expect(impersonateItem?.tagName).toBe("DIV");
		expect(featuredGroup).toContainElement(featuredItem);
		expect(Array.from(regularGroup.children)).toEqual([
			startNewChatItem,
			reloadPageItem,
			impersonateItem,
		]);

		const trigger = within(featuredGroup).getByRole("button", {
			name: "ST menu",
		});
		expect(trigger).toHaveAttribute("id", SILLYTAVERN_INTERFACE_TRIGGER_ID);
		expect(trigger).toHaveClass(
			"mobile-send-form-shortcuts__featured-button",
		);

		const startNewChat = within(regularGroup).getByRole("button", {
			name: "Start new chat",
		});
		const reloadPage = within(regularGroup).getByRole("button", {
			name: "Reload page",
		});
		const impersonate = within(regularGroup).getByRole("button", {
			name: "Ask AI to write your message for you",
		});

		expect(startNewChat.textContent).toBe("");
		expect(reloadPage.textContent).toBe("");
		expect(impersonate.textContent).toBe("");

		fireEvent.click(startNewChat);
		fireEvent.click(reloadPage);
		fireEvent.click(impersonate);
		fireEvent.click(trigger);

		expect(onPermanentShortcutClick).toHaveBeenNthCalledWith(
			1,
			"start-new-chat",
		);
		expect(onPermanentShortcutClick).toHaveBeenNthCalledWith(
			2,
			"reload-page",
		);
		expect(onQuickShortcutClick).toHaveBeenCalledWith("impersonate");
		expect(onSillyTavernInterfaceOpen).toHaveBeenCalledTimes(1);
	});
});
