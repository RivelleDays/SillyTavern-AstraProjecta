import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	deleteChatMessage,
	readChatMessageDeletionSupport,
} from "@/packages/core/st/chatMessageDeletion";

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("chatMessageDeletion", () => {
	beforeEach(() => {
		delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
	});

	test("reports delete support from the public SillyTavern context", () => {
		setSillyTavernContext({
			deleteMessage: vi.fn(),
		});

		expect(readChatMessageDeletionSupport({ swipeTotal: 2 })).toEqual({
			canDeleteMessage: true,
			canDeleteSwipe: true,
		});
		expect(readChatMessageDeletionSupport({ swipeTotal: 1 })).toEqual({
			canDeleteMessage: true,
			canDeleteSwipe: false,
		});
	});

	test("deletes a whole message through the public SillyTavern context without native confirmation", async () => {
		const confirm = vi.fn(async () => true);
		const deleteMessage = vi.fn(async () => undefined);
		setSillyTavernContext({
			Popup: {
				show: {
					confirm,
				},
			},
			deleteMessage,
		});

		const result = await deleteChatMessage({
			kind: "message",
			messageId: 5,
		});

		expect(result).toEqual({ ok: true });
		expect(confirm).not.toHaveBeenCalled();
		expect(deleteMessage).toHaveBeenCalledWith(5, undefined, false);
	});

	test("deletes the current swipe through the public SillyTavern context without native confirmation", async () => {
		const confirm = vi.fn(async () => true);
		const deleteMessage = vi.fn(async () => undefined);
		setSillyTavernContext({
			Popup: {
				show: {
					confirm,
				},
			},
			deleteMessage,
		});

		const result = await deleteChatMessage({
			kind: "swipe",
			messageId: 5,
			swipeIndex: 2,
		});

		expect(result).toEqual({ ok: true });
		expect(confirm).not.toHaveBeenCalled();
		expect(deleteMessage).toHaveBeenCalledWith(5, 2, false);
	});

	test("rejects invalid target identifiers before calling SillyTavern", async () => {
		const deleteMessage = vi.fn(async () => undefined);
		setSillyTavernContext({
			deleteMessage,
		});

		await expect(
			deleteChatMessage({
				kind: "message",
				messageId: -1,
			}),
		).resolves.toEqual({
			ok: false,
			reason: "invalid-message-id",
		});
		await expect(
			deleteChatMessage({
				kind: "swipe",
				messageId: 5,
				swipeIndex: undefined,
			}),
		).resolves.toEqual({
			ok: false,
			reason: "invalid-swipe-index",
		});
		expect(deleteMessage).not.toHaveBeenCalled();
	});

	test("returns api-unavailable when SillyTavern deleteMessage is missing", async () => {
		setSillyTavernContext({});

		const result = await deleteChatMessage({
			kind: "message",
			messageId: 5,
		});

		expect(result).toEqual({
			ok: false,
			reason: "api-unavailable",
		});
	});

	test("returns delete-failed when SillyTavern deleteMessage throws", async () => {
		const deleteMessage = vi.fn(async () => {
			throw new Error("native failure");
		});
		setSillyTavernContext({
			deleteMessage,
		});

		const result = await deleteChatMessage({
			kind: "message",
			messageId: 5,
		});

		expect(result).toEqual({
			ok: false,
			reason: "delete-failed",
		});
	});
});
