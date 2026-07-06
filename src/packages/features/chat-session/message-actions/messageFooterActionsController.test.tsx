import { act, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { ChatMessageRevisionHistoryItem } from "@/packages/core/st/chatMessageRevisionHistory";
import type { ChatMessageRevisionSnapshot } from "@/packages/core/st/chatMessageRevision";
import type { ChatMessageSwipeSnapshot } from "@/packages/core/st/chatMessageSwipe";
import { resolveLoadedMessageElements } from "@/packages/features/chat-session/message-actions/contracts/dom";
import { createMessageFooterActionsController } from "@/packages/features/chat-session/message-actions/messageFooterActionsController";

function createIdleRevisionSnapshot(): ChatMessageRevisionSnapshot {
	return {
		canContinue: false,
		canRegenerate: false,
		canUndo: false,
		isBusy: false,
		messageId: null,
		status: "idle",
		updatedAt: 0,
	};
}

function createIdleSwipeSnapshot(): ChatMessageSwipeSnapshot {
	return {
		canSwipeNext: false,
		canSwipePrevious: false,
		currentIndex: 0,
		isNativeSwipeBusy: false,
		messageId: null,
		status: "idle",
		total: 1,
		updatedAt: 0,
	};
}

describe("createMessageFooterActionsController", () => {
	test("keeps an empty connected footer host while generation blocks actions and removes it after settling", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0" is_user="false" is_system="false">
					<div class="mes_block"></div>
				</div>
			</div>
		`;
		const onOpenHistory = vi.fn();
		const controller = createMessageFooterActionsController({
			onContinue: vi.fn(),
			onOpenHistory,
			onRegenerate: vi.fn(),
			onSwipeNext: vi.fn(),
			onSwipePrevious: vi.fn(),
			onUndo: vi.fn(),
			renderImmediately: vi.fn(() => {
				controller.render({
					context: {
						chat: [
							{
								is_system: false,
								is_user: false,
							},
						],
					},
					historySnapshot: [],
					isGenerating: false,
					loadedMessages: resolveLoadedMessageElements(document),
					revisionSnapshot: createIdleRevisionSnapshot(),
					swipeSnapshot: createIdleSwipeSnapshot(),
				});
			}),
		});

		try {
			controller.render({
				context: {
					chat: [
						{
							is_system: false,
							is_user: false,
						},
					],
				},
				historySnapshot: [],
				isGenerating: true,
				loadedMessages: resolveLoadedMessageElements(document),
				revisionSnapshot: createIdleRevisionSnapshot(),
				swipeSnapshot: createIdleSwipeSnapshot(),
			});

			const blockedHost = document.querySelector(
				'.mes[mesid="0"] > .astra-mesActions',
			);
			expect(blockedHost).toBeInTheDocument();
			expect(blockedHost).toHaveAttribute(
				"data-astra-generation-blocked",
				"true",
			);
			expect(blockedHost).not.toHaveAttribute(
				"data-astra-footer-settling",
			);
			expect(blockedHost?.childElementCount).toBe(0);

			controller.render({
				context: {
					chat: [
						{
							is_system: false,
							is_user: false,
						},
					],
				},
				historySnapshot: [],
				isGenerating: false,
				loadedMessages: resolveLoadedMessageElements(document),
				revisionSnapshot: createIdleRevisionSnapshot(),
				swipeSnapshot: createIdleSwipeSnapshot(),
			});

			expect(
				document.querySelector('.mes[mesid="0"] > .astra-mesActions'),
			).toBe(blockedHost);
			expect(blockedHost).not.toHaveAttribute(
				"data-astra-generation-blocked",
			);
			expect(blockedHost).toHaveAttribute(
				"data-astra-footer-settling",
				"true",
			);
			expect(onOpenHistory).not.toHaveBeenCalled();

			await act(async () => {
				vi.advanceTimersByTime(750);
			});

			expect(
				document.querySelector('.mes[mesid="0"] > .astra-mesActions'),
			).toBeNull();
		} finally {
			controller.unmount();
			vi.useRealTimers();
		}
	});

	test("renders revision, swipe, and inline history actions for the last actionable footer message", async () => {
		const historyItem: ChatMessageRevisionHistoryItem = {
			avatarUrl: "",
			hasHistory: true,
			messageDisplayId: "#1",
			messageId: 1,
			senderName: "Assistant",
			swipeIndex: 0,
			swipeTotal: 2,
		};
		const onContinue = vi.fn();
		const onOpenHistory = vi.fn();
		const onRegenerate = vi.fn();
		const onSwipeNext = vi.fn();
		const onSwipePrevious = vi.fn();
		const onUndo = vi.fn();
		document.body.innerHTML = `
			<div id="chat">
				<div class="mes" mesid="0" is_user="false">
					<div class="mes_block"></div>
				</div>
				<div class="mes" mesid="1" is_user="false">
					<div class="mes_block"></div>
				</div>
			</div>
		`;
		const controller = createMessageFooterActionsController({
			onContinue,
			onOpenHistory,
			onRegenerate,
			onSwipeNext,
			onSwipePrevious,
			onUndo,
			renderImmediately: vi.fn(),
		});

		try {
			controller.render({
				context: {
					chat: [
						{ is_user: false },
						{
							is_system: false,
							is_user: false,
						},
					],
				},
				historySnapshot: [historyItem],
				isGenerating: false,
				loadedMessages: resolveLoadedMessageElements(document),
				revisionSnapshot: {
					canContinue: true,
					canRegenerate: true,
					canUndo: true,
					isBusy: false,
					messageId: 1,
					status: "ready",
					updatedAt: 0,
				},
				swipeSnapshot: {
					canSwipeNext: true,
					canSwipePrevious: true,
					currentIndex: 0,
					isNativeSwipeBusy: false,
					messageId: 1,
					status: "ready",
					total: 2,
					updatedAt: 0,
				},
			});

			await waitFor(() => {
				expect(
					document.querySelector(
						'.mes[mesid="1"] .astra-revisionBar',
					),
				).toBeInTheDocument();
			});
			expect(
				document.querySelector('.mes[mesid="1"] .astra-swipePager'),
			).toBeInTheDocument();
			expect(
				document.querySelector('.mes[mesid="0"] .astra-revisionBar'),
			).toBeNull();
		} finally {
			controller.unmount();
		}
	});
});
