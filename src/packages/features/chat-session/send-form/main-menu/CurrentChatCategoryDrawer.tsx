import * as React from "react";

import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import type { ChatCatalogEntry } from "@/packages/core/st/chat-catalog";
import type { CurrentChatInfoSnapshot } from "@/packages/core/st/currentChatInfo";
import { asTrimmedString } from "@/packages/core/st/shared";
import { formatStAbsoluteTimestamp } from "@/packages/core/st/timestamps";
import { ChatCategoryAssignmentDrawer } from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryUi";

const JSONL_EXTENSION_PATTERN = /\.jsonl$/i;

function createCurrentChatCategoryEntry({
	chatInfoSnapshot,
	snapshot,
}: {
	chatInfoSnapshot: CurrentChatInfoSnapshot;
	snapshot: CurrentChatIdentitySnapshot;
}): ChatCatalogEntry | null {
	if (
		!snapshot.hasActiveChat ||
		(snapshot.kind !== "character" && snapshot.kind !== "group")
	) {
		return null;
	}

	const chatId = asTrimmedString(snapshot.chatFileName).replace(
		JSONL_EXTENSION_PATTERN,
		"",
	);
	if (!chatId) {
		return null;
	}

	const entityId =
		snapshot.kind === "group"
			? snapshot.groupId
			: snapshot.characterId === null
				? null
				: String(snapshot.characterId);
	if (!entityId) {
		return null;
	}

	const entry: ChatCatalogEntry = {
		avatarUrl: snapshot.thumbnailUrl,
		chatId,
		entityId,
		entityName: snapshot.entityName,
		fileName: `${chatId}.jsonl`,
		fileSize: chatInfoSnapshot.fileSize,
		isCurrent: true,
		key: `${snapshot.kind}:${entityId}:${chatId}` as ChatCatalogEntry["key"],
		kind: snapshot.kind,
		lastMessageAt: chatInfoSnapshot.lastUpdatedAt,
		lastMessageLabel:
			formatStAbsoluteTimestamp(chatInfoSnapshot.lastUpdatedAt) || "",
		lastMessagePreview: chatInfoSnapshot.lastMessagePreview,
		messageCount: chatInfoSnapshot.messageCount,
	};

	if (snapshot.kind === "character") {
		entry.characterId = snapshot.characterId;
	}

	if (snapshot.kind === "group") {
		entry.groupAvatarUrls = snapshot.groupAvatarUrls;
	}

	return entry;
}

export function CurrentChatCategoryDrawer({
	chatCategoryStore,
	chatInfoSnapshot,
	onOpenChange,
	open,
	snapshot,
}: {
	chatCategoryStore: ChatCategoryStore;
	chatInfoSnapshot: CurrentChatInfoSnapshot;
	onOpenChange(nextValue: boolean): void;
	open: boolean;
	snapshot: CurrentChatIdentitySnapshot;
}) {
	const entry = React.useMemo(
		() =>
			open
				? createCurrentChatCategoryEntry({
						chatInfoSnapshot,
						snapshot,
					})
				: null,
		[chatInfoSnapshot, open, snapshot],
	);

	return (
		<ChatCategoryAssignmentDrawer
			chatCategoryStore={chatCategoryStore}
			entry={entry}
			onOpenChange={onOpenChange}
		/>
	);
}
