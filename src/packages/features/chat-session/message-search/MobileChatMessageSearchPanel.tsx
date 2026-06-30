import * as React from "react";

import { UiIcon } from "@/components/ui/shared/icon";
import { Search } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	applyChatMessageSearchHighlights,
	clearChatMessageSearchHighlights,
} from "@/packages/features/chat-session/message-search/highlight";
import { ASTRA_CHAT_MESSAGE_SEARCH_PANEL_ID } from "@/packages/features/chat-session/message-search/contracts/dom";
import type { ChatMessageSearchSnapshot } from "@/packages/features/chat-session/message-search/store";

export function MobileChatMessageSearchPanel({
	documentRef = document,
	snapshot,
}: {
	documentRef?: Document;
	snapshot: ChatMessageSearchSnapshot;
}) {
	const searchLabel = translateAstra("chatMessageSearch.search.label");

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
			</div>
		</div>
	);
}
