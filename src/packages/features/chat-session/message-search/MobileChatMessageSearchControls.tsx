import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	ArrowDown,
	ArrowUp,
	Check,
	Redo2,
	Undo2,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	ASTRA_CHAT_MESSAGE_SEARCH_CONTROLS_ID,
	ASTRA_CHAT_MESSAGE_SEARCH_COUNTER_ID,
} from "@/packages/features/chat-session/message-search/contracts/dom";
import type {
	ChatMessageSearchSnapshot,
	ChatMessageSearchStore,
} from "@/packages/features/chat-session/message-search/store";

export function MobileChatMessageSearchControls({
	snapshot,
	store,
}: {
	snapshot: ChatMessageSearchSnapshot;
	store: ChatMessageSearchStore;
}) {
	const counterText =
		snapshot.matchCount > 0
			? `${snapshot.activeMatchIndex + 1} / ${snapshot.matchCount}`
			: "0 / 0";

	return (
		<div
			id={ASTRA_CHAT_MESSAGE_SEARCH_CONTROLS_ID}
			className="astra-chat-message-search-controls"
		>
			<div className="astra-chat-message-search-controls__cluster astra-chat-message-search-controls__cluster--start">
				<Button
					aria-label={translateAstra("chatMessageSearch.undo")}
					className="astra-chat-message-search-controls__button"
					disabled={!snapshot.canUndo || snapshot.isBusy}
					size="icon-sm"
					title={translateAstra("chatMessageSearch.undo")}
					type="button"
					variant="ghost"
					onClick={() => {
						void store.undo();
					}}
				>
					<UiIcon aria-hidden={true} icon={Undo2} size="sm" />
				</Button>
				<Button
					aria-label={translateAstra("chatMessageSearch.redo")}
					className="astra-chat-message-search-controls__button"
					disabled={!snapshot.canRedo || snapshot.isBusy}
					size="icon-sm"
					title={translateAstra("chatMessageSearch.redo")}
					type="button"
					variant="ghost"
					onClick={() => {
						void store.redo();
					}}
				>
					<UiIcon aria-hidden={true} icon={Redo2} size="sm" />
				</Button>
			</div>
			<div className="astra-chat-message-search-controls__cluster astra-chat-message-search-controls__cluster--center">
				<div
					id={ASTRA_CHAT_MESSAGE_SEARCH_COUNTER_ID}
					className="astra-chat-message-search-controls__counter"
					aria-live="polite"
				>
					{counterText}
				</div>
			</div>
			<div className="astra-chat-message-search-controls__cluster astra-chat-message-search-controls__cluster--end">
				<Button
					aria-label={translateAstra("chatMessageSearch.previous")}
					className="astra-chat-message-search-controls__button"
					disabled={!snapshot.canNavigate}
					size="icon-sm"
					title={translateAstra("chatMessageSearch.previous")}
					type="button"
					variant="ghost"
					onClick={() => {
						store.goToPrevious();
					}}
				>
					<UiIcon aria-hidden={true} icon={ArrowUp} size="sm" />
				</Button>
				<Button
					aria-label={translateAstra("chatMessageSearch.next")}
					className="astra-chat-message-search-controls__button"
					disabled={!snapshot.canNavigate}
					size="icon-sm"
					title={translateAstra("chatMessageSearch.next")}
					type="button"
					variant="ghost"
					onClick={() => {
						store.goToNext();
					}}
				>
					<UiIcon aria-hidden={true} icon={ArrowDown} size="sm" />
				</Button>
				<Button
					aria-label={translateAstra("chatMessageSearch.done")}
					className="astra-chat-message-search-controls__button--done"
					size="icon-sm"
					title={translateAstra("chatMessageSearch.done")}
					type="button"
					variant="default"
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
