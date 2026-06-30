import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import { Check, Search } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	applyChatMessageSearchHighlights,
	clearChatMessageSearchHighlights,
} from "@/packages/features/chat-session/message-search/highlight";
import { ASTRA_CHAT_MESSAGE_SEARCH_PANEL_ID } from "@/packages/features/chat-session/message-search/contracts/dom";
import type {
	ChatMessageSearchSnapshot,
	ChatMessageSearchStore,
} from "@/packages/features/chat-session/message-search/store";

export function MobileChatMessageSearchPanel({
	documentRef = document,
	snapshot,
	store,
}: {
	documentRef?: Document;
	snapshot: ChatMessageSearchSnapshot;
	store: ChatMessageSearchStore;
}) {
	const searchLabel = translateAstra("chatMessageSearch.search.label");
	const doneLabel = translateAstra("chatMessageSearch.done");
	const counterText =
		snapshot.matchCount > 0
			? `${snapshot.activeMatchIndex + 1} / ${snapshot.matchCount}`
			: "0 / 0";

	React.useEffect(() => {
		applyChatMessageSearchHighlights({ documentRef, snapshot });

		return () => {
			clearChatMessageSearchHighlights(documentRef);
		};
	}, [documentRef, snapshot]);

	return (
		<div
			id={ASTRA_CHAT_MESSAGE_SEARCH_PANEL_ID}
			className="astra-chat-message-search-panel"
			data-replace-visible={snapshot.replaceVisible ? "true" : "false"}
		>
			<div className="astra-chat-message-search-panel__mode">
				<div className="astra-chat-message-search-panel__mode-icon">
					<UiIcon aria-hidden={true} icon={Search} size="sm" />
				</div>
				<div className="astra-chat-message-search-panel__mode-title">
					{searchLabel}
				</div>
				<div
					className="astra-chat-message-search-panel__mode-counter"
					aria-live="polite"
				>
					{counterText}
				</div>
				<Button
					aria-label={doneLabel}
					className="astra-chat-message-search-panel__mode-close"
					size="icon-sm"
					title={doneLabel}
					type="button"
					variant="ghost"
					onClick={() => {
						store.close();
					}}
				>
					<UiIcon aria-hidden={true} icon={Check} size="sm" />
				</Button>
			</div>
		</div>
	);
}
