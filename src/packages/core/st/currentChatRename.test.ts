import { afterEach, describe, expect, test, vi } from "vitest";

import { renameCurrentChat } from "@/packages/core/st/currentChatRename";

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("renameCurrentChat", () => {
	afterEach(() => {
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("calls the current SillyTavern renameChat context API with normalized names", async () => {
		const renameChat = vi.fn().mockResolvedValue(undefined);
		setSillyTavernContext({ renameChat });

		await expect(
			renameCurrentChat({
				newFileName: "chapter-2.jsonl",
				oldFileName: "chapter-1",
			}),
		).resolves.toEqual({ ok: true });

		expect(renameChat).toHaveBeenCalledWith("chapter-1", "chapter-2");
	});

	test("returns a failure result when the public rename API is unavailable", async () => {
		setSillyTavernContext({});

		await expect(
			renameCurrentChat({
				newFileName: "chapter-2",
				oldFileName: "chapter-1",
			}),
		).resolves.toEqual({
			ok: false,
			reason: "api-unavailable",
		});
	});
});
