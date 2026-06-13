import { getStContext } from "@/packages/core/st/context";
import { isRecord, normalizeChatId } from "@/packages/core/st/shared";

type StRenameContextLike = Record<string, unknown> & {
	renameChat?: unknown;
};

export interface RenameCurrentChatInput {
	oldFileName: string;
	newFileName: string;
}

export type RenameCurrentChatResult =
	| {
			ok: true;
	  }
	| {
			ok: false;
			reason: "api-unavailable" | "invalid-name" | "rename-failed";
	  };

export function normalizeChatFileName(value: string): string {
	return normalizeChatId(value);
}

function readRenameChatApi():
	| ((oldFileName: string, newName: string) => unknown)
	| null {
	let rawContext: unknown;

	try {
		rawContext = getStContext();
	} catch {
		return null;
	}

	if (!isRecord(rawContext)) {
		return null;
	}

	const context = rawContext as StRenameContextLike;
	return typeof context.renameChat === "function"
		? (context.renameChat as (
				oldFileName: string,
				newName: string,
			) => unknown)
		: null;
}

export async function renameCurrentChat({
	newFileName,
	oldFileName,
}: RenameCurrentChatInput): Promise<RenameCurrentChatResult> {
	const currentName = normalizeChatFileName(oldFileName);
	const nextName = normalizeChatFileName(newFileName);

	if (!currentName || !nextName || currentName === nextName) {
		return {
			ok: false,
			reason: "invalid-name",
		};
	}

	const renameChat = readRenameChatApi();
	if (!renameChat) {
		return {
			ok: false,
			reason: "api-unavailable",
		};
	}

	try {
		await renameChat(currentName, nextName);
		return {
			ok: true,
		};
	} catch {
		return {
			ok: false,
			reason: "rename-failed",
		};
	}
}
