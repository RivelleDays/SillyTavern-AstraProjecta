import * as React from "react";

import { buttonVariants } from "@/components/ui/shadcn/button";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import { Input } from "@/components/ui/shadcn/input";
import { Label } from "@/components/ui/shadcn/label";
import { Separator } from "@/components/ui/shadcn/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/shadcn/tooltip";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	ChevronDown,
	Replace,
	ReplaceAll,
	Search,
} from "@/components/ui/shared/icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/shared/popover";
import { cn } from "@/lib/utils";
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
	const searchOptionsLabel = translateAstra(
		"chatMessageSearch.options.label",
	);
	const replaceToggleLabel = translateAstra(
		"chatMessageSearch.replace.toggle",
	);
	const matchCaseOptionId = React.useId();
	const wholeWordOptionId = React.useId();
	const replaceOptionId = React.useId();

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
			data-replace-visible={snapshot.replaceVisible ? "true" : "false"}
		>
			<div className="astra-chat-message-search-panel__fields">
				<div className="astra-chat-message-search-panel__search-row">
					<Label
						className="sr-only"
						htmlFor={ASTRA_CHAT_MESSAGE_SEARCH_INPUT_ID}
					>
						{searchLabel}
					</Label>
					<div className="astra-chat-message-search-panel__input-shell">
						<Popover>
							<PopoverTrigger
								aria-label={searchOptionsLabel}
								className={cn(
									buttonVariants({
										size: "icon-sm",
										variant: "ghost",
									}),
									"astra-chat-message-search-panel__options-trigger",
								)}
								title={searchOptionsLabel}
								type="button"
							>
								<UiIcon
									aria-hidden={true}
									className="astra-chat-message-search-panel__options-search-icon"
									icon={Search}
									size="sm"
								/>
								<UiIcon
									aria-hidden={true}
									className="astra-chat-message-search-panel__options-chevron"
									icon={ChevronDown}
									size="xs"
								/>
							</PopoverTrigger>
							<PopoverContent
								align="start"
								className="astra-chat-message-search-panel__options-popover"
								side="bottom"
							>
								<div className="astra-chat-message-search-panel__options-title">
									{searchOptionsLabel}
								</div>
								<div className="astra-chat-message-search-panel__option-list">
									<div className="astra-chat-message-search-panel__option-row">
										<Checkbox
											aria-label={translateAstra(
												"chatMessageSearch.matchCase",
											)}
											checked={snapshot.caseSensitive}
											className="astra-chat-message-search-panel__option-checkbox"
											id={matchCaseOptionId}
											onCheckedChange={(checked) => {
												store.setCaseSensitive(
													checked === true,
												);
											}}
										/>
										<Label
											className="astra-chat-message-search-panel__option-label"
											htmlFor={matchCaseOptionId}
										>
											{translateAstra(
												"chatMessageSearch.matchCase",
											)}
										</Label>
									</div>
									<div className="astra-chat-message-search-panel__option-row">
										<Checkbox
											aria-label={translateAstra(
												"chatMessageSearch.wholeWord",
											)}
											checked={snapshot.wholeWord}
											className="astra-chat-message-search-panel__option-checkbox"
											id={wholeWordOptionId}
											onCheckedChange={(checked) => {
												store.setWholeWord(
													checked === true,
												);
											}}
										/>
										<Label
											className="astra-chat-message-search-panel__option-label"
											htmlFor={wholeWordOptionId}
										>
											{translateAstra(
												"chatMessageSearch.wholeWord",
											)}
										</Label>
									</div>
									<Separator className="astra-chat-message-search-panel__option-separator" />
									<div className="astra-chat-message-search-panel__option-row">
										<Checkbox
											aria-label={replaceToggleLabel}
											checked={snapshot.replaceVisible}
											className="astra-chat-message-search-panel__option-checkbox"
											id={replaceOptionId}
											onCheckedChange={(checked) => {
												store.setReplaceVisible(
													checked === true,
												);
											}}
										/>
										<Label
											className="astra-chat-message-search-panel__option-label"
											htmlFor={replaceOptionId}
										>
											{replaceToggleLabel}
										</Label>
									</div>
								</div>
							</PopoverContent>
						</Popover>
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
				</div>
				{snapshot.replaceVisible ? (
					<div className="astra-chat-message-search-panel__replace-row">
						<Label
							className="sr-only"
							htmlFor={ASTRA_CHAT_MESSAGE_REPLACE_INPUT_ID}
						>
							{replaceInputLabel}
						</Label>
						<div className="astra-chat-message-search-panel__input-shell">
							<Input
								id={ASTRA_CHAT_MESSAGE_REPLACE_INPUT_ID}
								aria-label={replaceInputLabel}
								className="astra-chat-message-search-panel__input astra-chat-message-search-panel__replace-input"
								placeholder={replacePlaceholder}
								value={snapshot.replaceText}
								onChange={(event) => {
									store.setReplaceText(event.target.value);
								}}
							/>
						</div>
						<TooltipProvider delayDuration={0}>
							<Tooltip>
								<TooltipTrigger
									aria-label={translateAstra(
										"chatMessageSearch.replace.one",
									)}
									className={cn(
										buttonVariants({
											size: "icon-sm",
											variant: "outline",
										}),
										"astra-chat-message-search-panel__replace-action",
									)}
									disabled={
										!snapshot.canReplace || snapshot.isBusy
									}
									type="button"
									onClick={() => {
										void store.replaceCurrent();
									}}
								>
									<UiIcon
										aria-hidden={true}
										icon={Replace}
										size="sm"
									/>
								</TooltipTrigger>
								<TooltipContent className="px-2 py-1 text-xs">
									{translateAstra(
										"chatMessageSearch.replace.one",
									)}
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger
									aria-label={translateAstra(
										"chatMessageSearch.replace.all",
									)}
									className={cn(
										buttonVariants({
											size: "icon-sm",
											variant: "outline",
										}),
										"astra-chat-message-search-panel__replace-action",
									)}
									disabled={
										!snapshot.canReplace || snapshot.isBusy
									}
									type="button"
									onClick={() => {
										void store.replaceAll();
									}}
								>
									<UiIcon
										aria-hidden={true}
										icon={ReplaceAll}
										size="sm"
									/>
								</TooltipTrigger>
								<TooltipContent className="px-2 py-1 text-xs">
									{translateAstra(
										"chatMessageSearch.replace.all",
									)}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				) : null}
			</div>
		</div>
	);
}
