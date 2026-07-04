import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/shadcn/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/shadcn/empty";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/shadcn/tooltip";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	ChevronDown,
	EllipsisVertical,
	FolderOpen,
	ListCollapse,
	ListTree,
	MessageCircle,
	PencilLine,
	Tags,
	Trash2,
	X,
} from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import type {
	ChatCategory,
	ChatCategoryStore,
} from "@/packages/core/st/chat-categories";
import type {
	ChatCatalogEntry,
	OpenChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import type { I18nKey } from "@/types/i18n";

import {
	CHAT_CATEGORY_PAGE_SIZE,
	GLOBAL_CATEGORY_TREE_INDENT,
	getCategoryEntries,
	getEntriesByKey,
	normalizeOwnerLabel,
	resolveChatLabel,
	type CategoryActionMode,
	type CategoryGroup,
	type CategoryTreeStyle,
} from "@/packages/features/astra-main-interface/chat-categories/categoryModel";

export function CategoryTreeActionsGroup({
	collapseAllLabelKey = "astraMainInterface.global.categories.action.collapseAll",
	onCollapseAll,
	onExpandAll,
	expandAllLabelKey = "astraMainInterface.global.categories.action.expandAll",
}: {
	collapseAllLabelKey?: I18nKey;
	onCollapseAll?: () => void;
	onExpandAll?: () => void;
	expandAllLabelKey?: I18nKey;
} = {}) {
	const expandAllLabel = translateAstra(expandAllLabelKey);
	const collapseAllLabel = translateAstra(collapseAllLabelKey);

	return (
		<TooltipProvider delayDuration={0}>
			<div className="astra-chat-library-category-treeActionsGroup">
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<button
							aria-label={expandAllLabel}
							className={buttonVariants({
								className: "astra-chat-library-actionButton",
								size: "icon",
								variant: "outline",
							})}
							data-size="icon"
							data-slot="button"
							data-variant="outline"
							disabled={!onExpandAll}
							type="button"
							onClick={onExpandAll}
						>
							<UiIcon
								aria-hidden={true}
								className="astra-chat-library-actionButtonIcon"
								icon={ListTree}
								size="sm"
							/>
						</button>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs">
						{expandAllLabel}
					</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild={true}>
						<button
							aria-label={collapseAllLabel}
							className={buttonVariants({
								className: "astra-chat-library-actionButton",
								size: "icon",
								variant: "outline",
							})}
							data-size="icon"
							data-slot="button"
							data-variant="outline"
							disabled={!onCollapseAll}
							type="button"
							onClick={onCollapseAll}
						>
							<UiIcon
								aria-hidden={true}
								className="astra-chat-library-actionButtonIcon"
								icon={ListCollapse}
								size="sm"
							/>
						</button>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs">
						{collapseAllLabel}
					</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	);
}

export function GlobalCategoryEmptyState({
	descriptionKey = "astraMainInterface.global.categories.empty.description",
	titleKey = "astraMainInterface.global.categories.emptyTree",
}: {
	descriptionKey?: I18nKey;
	titleKey?: I18nKey;
}) {
	return (
		<Empty className="astra-main-interface__empty-state astra-chat-library-category-emptyState">
			<EmptyHeader className="astra-main-interface__empty-header">
				<EmptyMedia
					className="astra-main-interface__empty-media"
					variant="icon"
				>
					<UiIcon aria-hidden={true} icon={Tags} size="md" />
				</EmptyMedia>
				<EmptyTitle className="astra-main-interface__empty-title">
					{translateAstra(titleKey)}
				</EmptyTitle>
				<EmptyDescription className="astra-main-interface__empty-description">
					{translateAstra(descriptionKey)}
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

function CategoryChatRow({
	entry,
	openEntryDisabled = false,
	onOpenEntry,
}: {
	entry: ChatCatalogEntry;
	openEntryDisabled?: boolean;
	onOpenEntry?: OpenChatCatalogEntry;
}) {
	const label = resolveChatLabel(entry);
	const entityName = normalizeOwnerLabel(entry);
	const hasOpenAction = Boolean(onOpenEntry);
	const canOpen = hasOpenAction && !openEntryDisabled;

	return (
		<div className="astra-chat-library-category-row" role="listitem">
			<button
				aria-label={
					hasOpenAction
						? `${translateAstra(
								"astraMainInterface.categories.chatRow.open",
							)} ${entityName} ${label}`
						: undefined
				}
				className={cn(
					"astra-chat-library-category-rowInner",
					canOpen &&
						"astra-chat-library-category-rowInner--interactive",
				)}
				disabled={!canOpen}
				type="button"
				onClick={() => {
					if (!canOpen || !onOpenEntry) {
						return;
					}

					void onOpenEntry(entry);
				}}
			>
				<span className="astra-chat-library-category-itemLabel">
					<span className="astra-chat-library-category-labelRow">
						<span
							aria-hidden={true}
							className="astra-chat-library-category-icon"
						>
							<UiIcon
								className="astra-chat-library-category-iconSvg"
								icon={MessageCircle}
								size="sm"
							/>
						</span>
						<span
							className="astra-chat-library-category-labelText"
							title={label}
						>
							{label}
						</span>
					</span>
				</span>
			</button>
		</div>
	);
}

function EmptyCategoryRow({ text }: { text: string }) {
	return (
		<div className="astra-chat-library-category-row astra-chat-library-category-row--empty">
			<div className="astra-chat-library-category-rowInner">
				<span className="astra-chat-library-category-itemLabel astra-chat-library-category-itemLabel--empty">
					<span className="astra-chat-library-category-labelRow">
						<span
							aria-hidden={true}
							className="astra-chat-library-category-icon"
						>
							<UiIcon
								className="astra-chat-library-category-iconSvg"
								icon={FolderOpen}
								size="sm"
							/>
						</span>
						<span className="astra-chat-library-category-labelText">
							{text}
						</span>
					</span>
				</span>
			</div>
		</div>
	);
}

function GlobalCategoryChatRow({
	activeChatActionsEntryKey,
	category,
	chatCategoryStore,
	entry,
	openEntryDisabled = false,
	onOpenChatActions,
	onOpenEntry,
}: {
	activeChatActionsEntryKey?: string | null;
	category: ChatCategory;
	chatCategoryStore: ChatCategoryStore;
	entry: ChatCatalogEntry;
	openEntryDisabled?: boolean;
	onOpenChatActions?: (entry: ChatCatalogEntry) => void;
	onOpenEntry?: OpenChatCatalogEntry;
}) {
	const label = resolveChatLabel(entry);
	const entityName = normalizeOwnerLabel(entry);
	const hasOpenAction = Boolean(onOpenEntry);
	const canOpen = hasOpenAction && !openEntryDisabled;
	const removeLabel = `${translateAstra(
		"astraMainInterface.global.categories.chatRow.remove",
	)}: ${category.name}`;
	const moreLabel = `${translateAstra(
		"astraMainInterface.global.categories.chatRow.more",
	)}: ${label}`;
	const actionsLabel = translateAstra(
		"astraMainInterface.global.categories.chatRow.actions",
	);

	const handleOpen = React.useCallback(() => {
		if (!canOpen || !onOpenEntry) {
			return;
		}

		void onOpenEntry(entry);
	}, [canOpen, entry, onOpenEntry]);

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (!canOpen) {
				return;
			}
			if (event.key !== "Enter" && event.key !== " ") {
				return;
			}

			event.preventDefault();
			handleOpen();
		},
		[canOpen, handleOpen],
	);

	function stopRowActivation(event: React.SyntheticEvent<HTMLButtonElement>) {
		event.stopPropagation();
	}

	return (
		<div
			aria-disabled={!canOpen}
			aria-label={
				hasOpenAction
					? `${translateAstra(
							"astraMainInterface.categories.chatRow.open",
						)} ${entityName} ${label}`
					: undefined
			}
			className="astra-chat-library-global-chatRow"
			role="button"
			tabIndex={canOpen ? 0 : -1}
			onClick={handleOpen}
			onKeyDown={handleKeyDown}
		>
			<AstraChatAvatar
				aria-hidden={true}
				avatarUrl={entry.avatarUrl}
				className="astra-chat-library-global-chatAvatar"
				collageClassName="astra-chat-library-global-chatAvatar--collage"
				collageImageClassName="astra-chat-library-global-chatAvatar-collage-image"
				fallbackClassName="astra-chat-library-global-chatAvatar-fallback"
				fallbackText={entityName.charAt(0).toUpperCase() || "?"}
				groupAvatarUrls={entry.groupAvatarUrls}
				imageClassName="astra-chat-library-global-chatAvatar-image"
			/>
			<span className="astra-chat-library-global-chatText">
				<span
					className="astra-chat-library-global-chatName"
					title={label}
				>
					{label}
				</span>
				<span
					className="astra-chat-library-global-chatEntity"
					title={entityName}
				>
					{entityName}
				</span>
			</span>
			<TooltipProvider delayDuration={0}>
				<div
					aria-label={actionsLabel}
					className="astra-chat-library-global-chatActions"
					role="group"
				>
					<Tooltip>
						<TooltipTrigger
							aria-label={removeLabel}
							className={buttonVariants({
								className:
									"astra-chat-library-global-chatActionButton astra-chat-library-global-chatRemoveAction rounded-full",
								size: "icon-sm",
								variant: "outline",
							})}
							data-size="icon-sm"
							data-slot="button"
							data-variant="outline"
							type="button"
							onClick={(event) => {
								event.stopPropagation();
								chatCategoryStore.toggleChatCategory(
									entry.key,
									category.id,
									false,
								);
							}}
							onKeyDown={stopRowActivation}
						>
							<UiIcon aria-hidden={true} icon={X} size="sm" />
						</TooltipTrigger>
						<TooltipContent className="px-2 py-1 text-xs">
							{removeLabel}
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							aria-controls="astra-main-interface-chat-actions-drawer"
							aria-expanded={
								activeChatActionsEntryKey === entry.key
							}
							aria-label={moreLabel}
							className={buttonVariants({
								className:
									"astra-chat-library-global-chatActionButton astra-chat-library-global-chatMoreAction rounded-full",
								size: "icon-sm",
								variant: "outline",
							})}
							data-size="icon-sm"
							data-slot="button"
							data-variant="outline"
							disabled={!onOpenChatActions}
							type="button"
							onClick={(event) => {
								event.stopPropagation();
								onOpenChatActions?.(entry);
							}}
							onKeyDown={stopRowActivation}
						>
							<UiIcon
								aria-hidden={true}
								icon={EllipsisVertical}
								size="sm"
							/>
						</TooltipTrigger>
						<TooltipContent className="px-2 py-1 text-xs">
							{moreLabel}
						</TooltipContent>
					</Tooltip>
				</div>
			</TooltipProvider>
		</div>
	);
}

function GlobalCategoryEmptyChatRow({ text }: { text: string }) {
	return (
		<div
			className="astra-chat-library-global-chatRow astra-chat-library-global-chatRow--empty"
			role="listitem"
		>
			<span
				aria-hidden={true}
				className="astra-chat-library-global-chatAvatar"
			>
				<UiIcon icon={MessageCircle} size="sm" />
			</span>
			<span className="astra-chat-library-global-chatText">
				<span className="astra-chat-library-global-chatName">
					{text}
				</span>
			</span>
		</div>
	);
}

function getCategoryActionLabelKey(
	category: ChatCategory,
	mode: CategoryActionMode,
): I18nKey {
	if (category.scope === "global") {
		return mode === "delete"
			? "astraMainInterface.global.categories.action.deleteCategory"
			: "astraMainInterface.global.categories.action.renameCategory";
	}

	if (category.ownerType === "group") {
		return mode === "delete"
			? "astraMainInterface.categories.action.deleteGroupCategory"
			: "astraMainInterface.categories.action.renameGroupCategory";
	}

	return mode === "delete"
		? "astraMainInterface.categories.action.deleteCharacterCategory"
		: "astraMainInterface.categories.action.renameCharacterCategory";
}

function getCategoryActionsGroupLabelKey(category: ChatCategory): I18nKey {
	return category.scope === "global"
		? "astraMainInterface.global.categories.actions.label"
		: "astraMainInterface.categories.actions.label";
}

export function ChatCategoryTree({
	activeChatActionsEntryKey,
	categories,
	chatCategoryStore,
	entries,
	expandedCategoryIds,
	onCategoryAction,
	onOpenChatActions,
	openEntryDisabled,
	onCategoryToggle,
	onOpenEntry,
}: {
	activeChatActionsEntryKey?: string | null;
	categories: ChatCategory[];
	chatCategoryStore: ChatCategoryStore;
	entries: ChatCatalogEntry[];
	expandedCategoryIds: string[];
	onCategoryAction(category: ChatCategory, mode: CategoryActionMode): void;
	onOpenChatActions?: (entry: ChatCatalogEntry) => void;
	openEntryDisabled?: boolean;
	onCategoryToggle(categoryId: string): void;
	onOpenEntry?: OpenChatCatalogEntry;
}) {
	const contentIdPrefix = React.useId();
	const [visibleCounts, setVisibleCounts] = React.useState<
		Record<string, number>
	>({});
	const entriesByKey = React.useMemo(
		() => getEntriesByKey(entries),
		[entries],
	);
	const treeStyle = React.useMemo<CategoryTreeStyle>(
		() => ({
			"--tree-indent": `${GLOBAL_CATEGORY_TREE_INDENT}px`,
		}),
		[],
	);

	return (
		<div className="astra-chat-library-category-treeLayout">
			<div
				className="astra-chat-library-category-tree astra-chat-library-global-tree"
				style={treeStyle}
			>
				{categories.map((category) => {
					const isExpanded = expandedCategoryIds.includes(
						category.id,
					);
					const contentId = `${contentIdPrefix}-${category.id}`;
					const categoryEntries = getCategoryEntries({
						categoryId: category.id,
						entriesByKey,
						store: chatCategoryStore,
					});
					const visibleCount =
						visibleCounts[category.id] ?? CHAT_CATEGORY_PAGE_SIZE;
					const visibleEntries = categoryEntries.slice(
						0,
						visibleCount,
					);
					const hasMore = visibleCount < categoryEntries.length;
					const renameCategoryLabel = `${translateAstra(
						getCategoryActionLabelKey(category, "rename"),
					)}: ${category.name}`;
					const deleteCategoryLabel = `${translateAstra(
						getCategoryActionLabelKey(category, "delete"),
					)}: ${category.name}`;

					return (
						<div
							className="astra-chat-library-global-categoryRow"
							data-category-id={category.id}
							key={category.id}
						>
							<div className="astra-chat-library-global-categoryHeaderRow">
								<button
									aria-controls={contentId}
									aria-expanded={isExpanded}
									className="astra-chat-library-global-categoryHeader"
									data-state={isExpanded ? "open" : "closed"}
									type="button"
									onClick={() => {
										onCategoryToggle(category.id);
									}}
								>
									<span className="astra-chat-library-global-categoryLabel">
										<span className="astra-chat-library-global-categoryName">
											{category.name}
										</span>
										<span className="astra-chat-library-global-categoryCount">
											({categoryEntries.length})
										</span>
										<UiIcon
											aria-hidden={true}
											className="astra-chat-library-category-chevron"
											icon={ChevronDown}
											size="sm"
										/>
									</span>
								</button>
								<TooltipProvider delayDuration={0}>
									<div
										aria-label={translateAstra(
											getCategoryActionsGroupLabelKey(
												category,
											),
										)}
										className="astra-chat-library-global-categoryActions"
										role="group"
									>
										<Tooltip>
											<TooltipTrigger
												aria-label={deleteCategoryLabel}
												className={buttonVariants({
													className:
														"astra-chat-library-global-categoryActionButton astra-chat-library-global-categoryDeleteAction rounded-full",
													size: "icon-sm",
													variant: "outline",
												})}
												data-size="icon-sm"
												data-slot="button"
												data-variant="outline"
												type="button"
												onClick={() => {
													onCategoryAction(
														category,
														"delete",
													);
												}}
											>
												<UiIcon
													aria-hidden={true}
													icon={Trash2}
													size="sm"
												/>
											</TooltipTrigger>
											<TooltipContent className="px-2 py-1 text-xs">
												{deleteCategoryLabel}
											</TooltipContent>
										</Tooltip>
										<Tooltip>
											<TooltipTrigger
												aria-label={renameCategoryLabel}
												className={buttonVariants({
													className:
														"astra-chat-library-global-categoryActionButton astra-chat-library-global-categoryRenameAction rounded-full",
													size: "icon-sm",
													variant: "outline",
												})}
												data-size="icon-sm"
												data-slot="button"
												data-variant="outline"
												type="button"
												onClick={() => {
													onCategoryAction(
														category,
														"rename",
													);
												}}
											>
												<UiIcon
													aria-hidden={true}
													icon={PencilLine}
													size="sm"
												/>
											</TooltipTrigger>
											<TooltipContent className="px-2 py-1 text-xs">
												{renameCategoryLabel}
											</TooltipContent>
										</Tooltip>
									</div>
								</TooltipProvider>
							</div>
							<div
								className="astra-chat-library-global-chatList"
								hidden={!isExpanded}
								id={contentId}
								role="list"
							>
								{visibleEntries.length > 0 ? (
									visibleEntries.map((entry) => (
										<GlobalCategoryChatRow
											activeChatActionsEntryKey={
												activeChatActionsEntryKey
											}
											category={category}
											chatCategoryStore={
												chatCategoryStore
											}
											entry={entry}
											key={entry.key}
											openEntryDisabled={
												openEntryDisabled
											}
											onOpenChatActions={
												onOpenChatActions
											}
											onOpenEntry={onOpenEntry}
										/>
									))
								) : (
									<GlobalCategoryEmptyChatRow
										text={translateAstra(
											"astraMainInterface.categories.emptyCategory",
										)}
									/>
								)}
								{hasMore ? (
									<Button
										className="astra-main-interface__load-more-button"
										type="button"
										variant="secondary"
										onClick={() => {
											setVisibleCounts((current) => ({
												...current,
												[category.id]:
													visibleCount +
													CHAT_CATEGORY_PAGE_SIZE,
											}));
										}}
									>
										{translateAstra(
											"astraMainInterface.chatMenu.loadMore",
										)}
									</Button>
								) : null}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

export function ChatCategoryAccordion({
	chatCategoryStore,
	entries,
	groups,
	labelKey = "astraMainInterface.global.categories.tree.label",
	openEntryDisabled,
	onOpenEntry,
	renderAssignmentCheckbox,
	showCategoryChatRows = true,
}: {
	chatCategoryStore: ChatCategoryStore;
	entries: ChatCatalogEntry[];
	groups: CategoryGroup[];
	labelKey?: I18nKey;
	openEntryDisabled?: boolean;
	onOpenEntry?: OpenChatCatalogEntry;
	renderAssignmentCheckbox?: (category: ChatCategory) => React.ReactNode;
	showCategoryChatRows?: boolean;
}) {
	const contentIdPrefix = React.useId();
	const [expandedGroups, setExpandedGroups] = React.useState<string[]>(() =>
		groups.map((group) => group.id),
	);
	const [visibleCounts, setVisibleCounts] = React.useState<
		Record<string, number>
	>({});
	const entriesByKey = React.useMemo(
		() => getEntriesByKey(entries),
		[entries],
	);
	const treeStyle = React.useMemo<CategoryTreeStyle>(
		() => ({
			"--tree-indent": `${GLOBAL_CATEGORY_TREE_INDENT}px`,
		}),
		[],
	);

	React.useEffect(() => {
		setExpandedGroups((current) => {
			const groupIds = groups.map((group) => group.id);
			const next = current.filter((groupId) =>
				groupIds.includes(groupId),
			);
			for (const groupId of groupIds) {
				if (!next.includes(groupId)) {
					next.push(groupId);
				}
			}
			return next;
		});
	}, [groups]);

	const handleScopeToggle = React.useCallback((groupId: string) => {
		setExpandedGroups((current) =>
			current.includes(groupId)
				? current.filter((value) => value !== groupId)
				: [...current, groupId],
		);
	}, []);
	const handleExpandAll = React.useCallback(() => {
		setExpandedGroups(groups.map((group) => group.id));
	}, [groups]);
	const handleCollapseAll = React.useCallback(() => {
		setExpandedGroups([]);
	}, []);

	return (
		<div className="astra-chat-library-category-treeLayout">
			<div className="astra-chat-library-category-treeActions">
				<span className="astra-chat-library-category-treeActionsLabel">
					{translateAstra(labelKey)}
				</span>
				<CategoryTreeActionsGroup
					onCollapseAll={handleCollapseAll}
					onExpandAll={handleExpandAll}
				/>
			</div>
			<div
				className="astra-chat-library-category-tree astra-chat-library-global-tree"
				style={treeStyle}
			>
				<div className="astra-chat-library-category-accordion">
					{groups.map((group) => {
						const isExpanded = expandedGroups.includes(group.id);
						const contentId = `${contentIdPrefix}-${group.id}`;
						const groupCount = group.categories.length;

						return (
							<div
								className="astra-chat-library-category-accordionItem"
								data-scope={group.id}
								key={group.id}
							>
								<div className="astra-chat-library-category-accordionHeader">
									<button
										aria-controls={contentId}
										aria-expanded={isExpanded}
										className="astra-chat-library-category-accordionTrigger"
										data-state={
											isExpanded ? "open" : "closed"
										}
										onClick={() =>
											handleScopeToggle(group.id)
										}
										type="button"
									>
										<span className="astra-chat-library-category-accordionTitle">
											<span
												aria-hidden={true}
												className={`astra-chat-library-category-accordionIconWrap astra-chat-library-category-accordionIconWrap--${group.iconName}`}
												data-scope={group.id}
											>
												<UiIcon
													className="astra-chat-library-category-accordionIcon"
													icon={group.icon}
													size="sm"
												/>
											</span>
											<span className="astra-chat-library-category-accordionText">
												<span className="astra-chat-library-category-accordionNameRow">
													<span className="astra-chat-library-category-accordionName">
														{group.label}
													</span>
													<span className="astra-chat-library-category-countText">
														({groupCount})
													</span>
												</span>
											</span>
										</span>
										<UiIcon
											aria-hidden={true}
											className="astra-chat-library-category-chevron"
											icon={ChevronDown}
											size="sm"
										/>
									</button>
								</div>
								<div
									className="astra-chat-library-category-accordionContent"
									data-state={isExpanded ? "open" : "closed"}
									hidden={!isExpanded}
									id={contentId}
								>
									<div className="astra-chat-library-category-accordionBody">
										{group.categories.length > 0 ? (
											group.categories.map((category) => {
												const categoryEntries =
													getCategoryEntries({
														categoryId: category.id,
														entriesByKey,
														store: chatCategoryStore,
													});
												const visibleCount =
													visibleCounts[
														category.id
													] ??
													CHAT_CATEGORY_PAGE_SIZE;
												const visibleEntries =
													categoryEntries.slice(
														0,
														visibleCount,
													);
												const hasMore =
													visibleCount <
													categoryEntries.length;

												return (
													<CategoryAccordionItem
														category={category}
														entries={visibleEntries}
														hasMore={hasMore}
														key={category.id}
														onLoadMore={() => {
															setVisibleCounts(
																(current) => ({
																	...current,
																	[category.id]:
																		visibleCount +
																		CHAT_CATEGORY_PAGE_SIZE,
																}),
															);
														}}
														openEntryDisabled={
															openEntryDisabled
														}
														onOpenEntry={
															onOpenEntry
														}
														renderAssignmentCheckbox={
															renderAssignmentCheckbox
														}
														showCategoryChatRows={
															showCategoryChatRows
														}
														totalCount={
															categoryEntries.length
														}
													/>
												);
											})
										) : (
											<EmptyCategoryRow
												text={group.emptyText}
											/>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function CategoryAccordionItem({
	category,
	entries,
	hasMore,
	onLoadMore,
	openEntryDisabled,
	onOpenEntry,
	renderAssignmentCheckbox,
	showCategoryChatRows,
	totalCount,
}: {
	category: ChatCategory;
	entries: ChatCatalogEntry[];
	hasMore: boolean;
	onLoadMore(): void;
	openEntryDisabled?: boolean;
	onOpenEntry?: OpenChatCatalogEntry;
	renderAssignmentCheckbox?: (category: ChatCategory) => React.ReactNode;
	showCategoryChatRows: boolean;
	totalCount: number;
}) {
	return (
		<div
			className="astra-chat-library-category-accordionItem astra-chat-library-category-accordionItem--category"
			data-category-id={category.id}
		>
			<div className="astra-chat-library-category-accordionHeader">
				<div
					className="astra-chat-library-category-accordionTitle astra-chat-library-category-accordionTitle--category"
					data-state="open"
				>
					<span className="astra-chat-library-category-accordionText">
						<span className="astra-chat-library-category-accordionNameRow">
							<span className="astra-chat-library-category-accordionName">
								{category.name}
							</span>
							{showCategoryChatRows ? (
								<span className="astra-chat-library-category-countText">
									({totalCount})
								</span>
							) : null}
						</span>
					</span>
					{renderAssignmentCheckbox ? (
						<span className="astra-chat-library-category-checkboxWrap">
							{renderAssignmentCheckbox(category)}
						</span>
					) : null}
				</div>
			</div>
			{showCategoryChatRows ? (
				<div
					className="astra-chat-library-category-accordionContent astra-chat-library-category-accordionContent--category"
					data-state="open"
				>
					<div
						className="astra-chat-library-category-accordionBody"
						role="list"
					>
						{entries.length > 0 ? (
							entries.map((entry) => (
								<CategoryChatRow
									entry={entry}
									key={entry.key}
									openEntryDisabled={openEntryDisabled}
									onOpenEntry={onOpenEntry}
								/>
							))
						) : (
							<EmptyCategoryRow
								text={translateAstra(
									"astraMainInterface.categories.emptyCategory",
								)}
							/>
						)}
						{hasMore ? (
							<Button
								className="astra-main-interface__load-more-button"
								type="button"
								variant="secondary"
								onClick={onLoadMore}
							>
								{translateAstra(
									"astraMainInterface.chatMenu.loadMore",
								)}
							</Button>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
