import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/shadcn/button";
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
	ArrowDown,
	ArrowUp,
	Check,
	ChevronDown,
	Redo2,
	Replace,
	ReplaceAll,
	Search,
	Undo2,
} from "@/components/ui/shared/icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/shared/popover";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import {
	ASTRA_CHAT_MESSAGE_REPLACE_INPUT_ID,
	ASTRA_CHAT_MESSAGE_SEARCH_CONTROLS_ID,
	ASTRA_CHAT_MESSAGE_SEARCH_COUNTER_ID,
	ASTRA_CHAT_MESSAGE_SEARCH_INPUT_ID,
} from "@/packages/features/chat-session/message-search/contracts/dom";
import type {
	ChatMessageSearchSnapshot,
	ChatMessageSearchStore,
} from "@/packages/features/chat-session/message-search/store";

export function MobileChatMessageSearchControls({
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
	const counterText =
		snapshot.matchCount > 0
			? `${snapshot.activeMatchIndex + 1} / ${snapshot.matchCount}`
			: "0 / 0";

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

	return (
		<div
			id={ASTRA_CHAT_MESSAGE_SEARCH_CONTROLS_ID}
			className="astra-chat-message-search-controls"
		>
			<div className="astra-chat-message-search-controls__surface">
				<div className="astra-chat-message-search-panel__search-row astra-chat-message-search-controls__row astra-chat-message-search-controls__row--search">
					<Label
						className="sr-only"
						htmlFor={ASTRA_CHAT_MESSAGE_SEARCH_INPUT_ID}
					>
						{searchLabel}
					</Label>
					<div className="astra-chat-message-search-panel__input-shell astra-chat-message-search-controls__input-shell">
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
								side="top"
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
							className="astra-chat-message-search-panel__input astra-chat-message-search-controls__input"
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
					<div className="astra-chat-message-search-panel__replace-row astra-chat-message-search-controls__row astra-chat-message-search-controls__row--replace">
						<Label
							className="sr-only"
							htmlFor={ASTRA_CHAT_MESSAGE_REPLACE_INPUT_ID}
						>
							{replaceInputLabel}
						</Label>
						<div className="astra-chat-message-search-panel__input-shell astra-chat-message-search-controls__input-shell">
							<Input
								id={ASTRA_CHAT_MESSAGE_REPLACE_INPUT_ID}
								aria-label={replaceInputLabel}
								className="astra-chat-message-search-panel__input astra-chat-message-search-panel__replace-input astra-chat-message-search-controls__input"
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
				<div className="astra-chat-message-search-controls__row astra-chat-message-search-controls__row--actions">
					<div
						id={ASTRA_CHAT_MESSAGE_SEARCH_COUNTER_ID}
						className="astra-chat-message-search-controls__counter"
						aria-live="polite"
					>
						{counterText}
					</div>
					<div className="astra-chat-message-search-controls__cluster astra-chat-message-search-controls__cluster--history">
						<Button
							aria-label={translateAstra(
								"chatMessageSearch.undo",
							)}
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
							aria-label={translateAstra(
								"chatMessageSearch.redo",
							)}
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
					<div className="astra-chat-message-search-controls__cluster astra-chat-message-search-controls__cluster--nav">
						<Button
							aria-label={translateAstra(
								"chatMessageSearch.previous",
							)}
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
							<UiIcon
								aria-hidden={true}
								icon={ArrowUp}
								size="sm"
							/>
						</Button>
						<Button
							aria-label={translateAstra(
								"chatMessageSearch.next",
							)}
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
							<UiIcon
								aria-hidden={true}
								icon={ArrowDown}
								size="sm"
							/>
						</Button>
					</div>
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
		</div>
	);
}
