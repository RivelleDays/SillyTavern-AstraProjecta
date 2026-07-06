import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import { Search, X } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	applyChatMessageSearchHighlights,
	clearChatMessageSearchHighlights,
} from "@/packages/features/chat-session/message-search/highlight";
import { ASTRA_CHAT_MESSAGE_SEARCH_PANEL_ID } from "@/packages/features/chat-session/message-search/contracts/dom";
import type { ChatMessageSearchSnapshot } from "@/packages/features/chat-session/message-search/store";

export interface MobileChatMessageSearchPanelProps {
	documentRef?: Document;
	onClose: () => void;
	snapshot: ChatMessageSearchSnapshot;
}

export function MobileChatMessageSearchPanel({
	documentRef = document,
	onClose,
	snapshot,
}: MobileChatMessageSearchPanelProps) {
	const closeLabel = translateAstra("chatMessageSearch.close");
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
				<Button
					aria-label={closeLabel}
					className="astra-chat-message-search-panel__mode-close"
					size="icon-sm"
					title={closeLabel}
					type="button"
					variant="ghost"
					onClick={onClose}
				>
					<UiIcon
						aria-hidden={true}
						className="astra-chat-message-search-panel__mode-close-icon"
						icon={X}
						size="sm"
					/>
				</Button>
			</div>
		</div>
	);
}
