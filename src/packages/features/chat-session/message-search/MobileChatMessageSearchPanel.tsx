import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	CaseSensitive,
	ChevronRight,
	Replace,
	ReplaceAll,
	Search,
	WholeWord,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	applyChatMessageSearchHighlights,
	clearChatMessageSearchHighlights,
} from "@/packages/features/chat-session/message-search/highlight";
import {
	ASTRA_CHAT_MESSAGE_REPLACE_INPUT_ID,
	ASTRA_CHAT_MESSAGE_SEARCH_INPUT_ID,
	ASTRA_CHAT_MESSAGE_SEARCH_PANEL_ID,
} from "@/packages/features/chat-session/message-search/contracts/dom";
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
	const searchPlaceholder = translateAstra(
		"chatMessageSearch.search.placeholder",
	);
	const replaceInputLabel = translateAstra(
		"chatMessageSearch.replace.inputLabel",
	);
	const replacePlaceholder = translateAstra(
		"chatMessageSearch.replace.placeholder",
	);
	const replaceToggleLabel = snapshot.isReplaceOpen
		? translateAstra("chatMessageSearch.replace.hide")
		: translateAstra("chatMessageSearch.replace.show");

	React.useEffect(() => {
		if (!snapshot.isOpen) {
			return;
		}

		const searchInput = documentRef.getElementById(
			ASTRA_CHAT_MESSAGE_SEARCH_INPUT_ID,
		);
		if (searchInput instanceof HTMLInputElement) {
			searchInput.focus();
			searchInput.select();
		}
	}, [documentRef, snapshot.isOpen]);

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
			data-replace-open={snapshot.isReplaceOpen ? "true" : "false"}
		>
			<Button
				aria-expanded={snapshot.isReplaceOpen}
				aria-label={replaceToggleLabel}
				className="astra-chat-message-search-panel__replace-toggle"
				data-replace-open={snapshot.isReplaceOpen ? "true" : "false"}
				size="icon-sm"
				title={replaceToggleLabel}
				type="button"
				variant="ghost"
				onClick={() => {
					store.setReplaceOpen(!snapshot.isReplaceOpen);
				}}
			>
				<UiIcon
					aria-hidden={true}
					className="astra-chat-message-search-panel__replace-toggle-icon"
					icon={ChevronRight}
					size="sm"
				/>
			</Button>
			<div className="astra-chat-message-search-panel__fields">
				<div className="astra-chat-message-search-panel__search-row">
					<label
						className="sr-only"
						htmlFor={ASTRA_CHAT_MESSAGE_SEARCH_INPUT_ID}
					>
						{searchLabel}
					</label>
					<div className="astra-chat-message-search-panel__input-shell">
						<UiIcon
							aria-hidden={true}
							className="astra-chat-message-search-panel__input-icon"
							icon={Search}
							size="sm"
						/>
						<Input
							id={ASTRA_CHAT_MESSAGE_SEARCH_INPUT_ID}
							aria-label={searchLabel}
							className="astra-chat-message-search-panel__input"
							placeholder={searchPlaceholder}
							type="search"
							value={snapshot.query}
							onChange={(event) => {
								store.setQuery(event.target.value);
							}}
						/>
					</div>
					<Button
						aria-label={translateAstra(
							"chatMessageSearch.matchCase",
						)}
						aria-pressed={snapshot.caseSensitive}
						className="astra-chat-message-search-panel__option"
						data-active={snapshot.caseSensitive ? "true" : "false"}
						size="icon-sm"
						title={translateAstra("chatMessageSearch.matchCase")}
						type="button"
						variant="ghost"
						onClick={() => {
							store.setCaseSensitive(!snapshot.caseSensitive);
						}}
					>
						<UiIcon aria-hidden={true} icon={CaseSensitive} size="sm" />
					</Button>
					<Button
						aria-label={translateAstra(
							"chatMessageSearch.wholeWord",
						)}
						aria-pressed={snapshot.wholeWord}
						className="astra-chat-message-search-panel__option"
						data-active={snapshot.wholeWord ? "true" : "false"}
						size="icon-sm"
						title={translateAstra("chatMessageSearch.wholeWord")}
						type="button"
						variant="ghost"
						onClick={() => {
							store.setWholeWord(!snapshot.wholeWord);
						}}
					>
						<UiIcon aria-hidden={true} icon={WholeWord} size="sm" />
					</Button>
				</div>
				{snapshot.isReplaceOpen ? (
					<div className="astra-chat-message-search-panel__replace-row">
						<label
							className="sr-only"
							htmlFor={ASTRA_CHAT_MESSAGE_REPLACE_INPUT_ID}
						>
							{replaceInputLabel}
						</label>
						<Input
							id={ASTRA_CHAT_MESSAGE_REPLACE_INPUT_ID}
							aria-label={replaceInputLabel}
							className="astra-chat-message-search-panel__replace-input"
							placeholder={replacePlaceholder}
							value={snapshot.replaceText}
							onChange={(event) => {
								store.setReplaceText(event.target.value);
							}}
						/>
						<Button
							aria-label={translateAstra(
								"chatMessageSearch.replace.one",
							)}
							className="astra-chat-message-search-panel__replace-action"
							disabled={!snapshot.canReplace || snapshot.isBusy}
							size="icon-sm"
							title={translateAstra(
								"chatMessageSearch.replace.one",
							)}
							type="button"
							variant="ghost"
							onClick={() => {
								void store.replaceCurrent();
							}}
						>
							<UiIcon aria-hidden={true} icon={Replace} size="sm" />
						</Button>
						<Button
							aria-label={translateAstra(
								"chatMessageSearch.replace.all",
							)}
							className="astra-chat-message-search-panel__replace-action"
							disabled={!snapshot.canReplace || snapshot.isBusy}
							size="icon-sm"
							title={translateAstra(
								"chatMessageSearch.replace.all",
							)}
							type="button"
							variant="ghost"
							onClick={() => {
								void store.replaceAll();
							}}
						>
							<UiIcon aria-hidden={true} icon={ReplaceAll} size="sm" />
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}
