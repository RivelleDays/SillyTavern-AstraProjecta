import * as React from "react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/astra/dropdown-menu";
import {
	ResponsiveDialog,
	ResponsiveDialogClose,
	useResponsiveDialogClose,
} from "@/components/ui/astra/ResponsiveDialog";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button, buttonVariants } from "@/components/ui/shadcn/button";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/shadcn/empty";
import { Input } from "@/components/ui/shadcn/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/shadcn/tooltip";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	Bookmark,
	ChevronDown,
	CirclePlus,
	CircleUser,
	EllipsisVertical,
	FolderBookmark,
	FolderOpen,
	Globe,
	ListCollapse,
	ListTree,
	MessageCircle,
	PencilLine,
	Tags,
	Trash2,
	TriangleAlert,
	X,
	type LucideIcon,
} from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import {
	createChatCategoryStore,
	type ChatCategory,
	type ChatCategoryScope,
	type ChatCategoryStore,
} from "@/packages/core/st/chat-categories";
import type {
	ChatCatalogEntry,
	OpenChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import { ChatCatalogRowDialogIdentityHeader } from "@/packages/features/astra-main-interface/chat-list/ChatCatalogRowActionDialog";
import type { I18nKey } from "@/types/i18n";

export const CHAT_CATEGORY_PAGE_SIZE = 50;
export const GLOBAL_CATEGORY_TREE_INDENT = 20;
export const CHAT_ROW_CATEGORY_DRAWER_ID =
	"astra-main-interface-chat-category-drawer";
export const CHAT_ROW_CATEGORY_DRAWER_SCROLLABLE_CONTENT_ID =
	"astra-main-interface-chat-category-drawer-scrollable-content";
export const CHAT_ROW_CATEGORY_DRAWER_CREATE_INPUT_ID =
	"astra-main-interface-chat-category-drawer-create-input";
export const GLOBAL_CATEGORY_RENAME_DRAWER_ID =
	"astra-main-interface-global-category-rename-drawer";
export const GLOBAL_CATEGORY_DELETE_DRAWER_ID =
	"astra-main-interface-global-category-delete-drawer";
export const GLOBAL_CATEGORY_RENAME_DRAWER_INPUT_ID =
	"astra-main-interface-global-category-rename-drawer-input";

type CategoryTreeStyle = React.CSSProperties & {
	"--tree-indent": string;
};

type CategoryScopeOption = {
	icon: LucideIcon;
	iconName: "circle-user" | "globe";
	label: string;
	value: ChatCategoryScope;
};

type CategoryGroup = {
	categories: ChatCategory[];
	emptyText: string;
	icon: LucideIcon;
	iconName: "circle-user" | "globe";
	id: string;
	label: string;
};

type ChatCategoryManagerVariant = "current" | "favorite" | "global";
type GlobalCategoryActionMode = "delete" | "rename";

interface GlobalCategoryActionDrawerState {
	category: ChatCategory;
	mode: GlobalCategoryActionMode;
}

interface ChatCategoryOwnerScope {
	label: string;
	ownerId: string;
	ownerType: "character" | "group";
}

export interface ChatCategoryManagerPageProps {
	activeChatActionsEntryKey?: string | null;
	chatCategoryStore: ChatCategoryStore;
	entries: ChatCatalogEntry[];
	isLoading?: boolean;
	openEntryDisabled?: boolean;
	onOpenChatActions?: (entry: ChatCatalogEntry) => void;
	onOpenEntry?: OpenChatCatalogEntry;
	ownerScope?: ChatCategoryOwnerScope | null;
	variant: ChatCategoryManagerVariant;
}

export interface ChatCategoryAssignmentDrawerProps {
	chatCategoryStore: ChatCategoryStore;
	entry: ChatCatalogEntry | null;
	onOpenChange(open: boolean): void;
}

function createGlobalScope(): ChatCategoryScope {
	return {
		ownerId: null,
		ownerType: null,
		scope: "global",
	};
}

function createOwnerScope(
	ownerScope: ChatCategoryOwnerScope,
): ChatCategoryScope {
	return {
		ownerId: ownerScope.ownerId,
		ownerType: ownerScope.ownerType,
		scope: "owner",
	};
}

export function useChatCategoryStore(injectedStore?: ChatCategoryStore) {
	const store = React.useMemo(
		() => injectedStore ?? createChatCategoryStore(),
		[injectedStore],
	);

	React.useEffect(() => {
		if (injectedStore) {
			return undefined;
		}

		return () => {
			store.dispose();
		};
	}, [injectedStore, store]);

	return store;
}

function useCategorySnapshot(store: ChatCategoryStore) {
	return React.useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot,
	);
}

function getCategoryErrorMessage(reason: string) {
	switch (reason) {
		case "duplicate":
			return translateAstra(
				"astraMainInterface.categories.error.duplicate",
			);
		case "empty":
			return translateAstra("astraMainInterface.categories.error.empty");
		case "invalid-name":
			return translateAstra(
				"astraMainInterface.categories.error.invalidName",
			);
		case "invalid-scope":
			return translateAstra(
				"astraMainInterface.categories.error.invalidScope",
			);
		case "missing":
			return translateAstra(
				"astraMainInterface.categories.error.missing",
			);
		case "unchanged":
			return translateAstra(
				"astraMainInterface.categories.error.unchanged",
			);
		default:
			return translateAstra(
				"astraMainInterface.categories.error.generic",
			);
	}
}

function areIdSetsEqual(left: readonly string[], right: readonly string[]) {
	if (left.length !== right.length) {
		return false;
	}

	const rightSet = new Set(right);
	return left.every((id) => rightSet.has(id));
}

function normalizeOwnerLabel(entry: ChatCatalogEntry) {
	return (
		entry.entityName.trim() ||
		translateAstra("astraMainInterface.chatMenu.untitledChat")
	);
}

function resolveChatLabel(entry: ChatCatalogEntry) {
	return (
		entry.chatId ||
		entry.fileName ||
		translateAstra("astraMainInterface.chatMenu.untitledChat")
	);
}

function getEntriesByKey(entries: ChatCatalogEntry[]) {
	return new Map(entries.map((entry) => [entry.key, entry] as const));
}

function getCategoryEntries({
	categoryId,
	entriesByKey,
	store,
}: {
	categoryId: string;
	entriesByKey: Map<string, ChatCatalogEntry>;
	store: ChatCategoryStore;
}) {
	return store.getCategoryChatKeys(categoryId).flatMap((chatKey) => {
		const entry = entriesByKey.get(chatKey);
		return entry ? [entry] : [];
	});
}

function buildScopeOptions(
	ownerScope?: ChatCategoryOwnerScope | null,
): CategoryScopeOption[] {
	const options: CategoryScopeOption[] = [];

	if (ownerScope) {
		options.push({
			icon: CircleUser,
			iconName: "circle-user",
			label: translateAstra(
				ownerScope.ownerType === "group"
					? "astraMainInterface.categories.scope.group"
					: "astraMainInterface.categories.scope.character",
			),
			value: createOwnerScope(ownerScope),
		});
	}

	options.push({
		icon: Globe,
		iconName: "globe",
		label: translateAstra("astraMainInterface.categories.scope.global"),
		value: createGlobalScope(),
	});

	return options;
}

function getScopeOptionKey(scope: ChatCategoryScope) {
	return scope.scope === "global"
		? "global"
		: `${scope.ownerType}:${scope.ownerId}`;
}

function getCategoryGroups({
	chatCategoryStore,
	ownerScope,
}: {
	chatCategoryStore: ChatCategoryStore;
	ownerScope?: ChatCategoryOwnerScope | null;
}): CategoryGroup[] {
	const visible = chatCategoryStore.getVisibleCategories(
		ownerScope ? createOwnerScope(ownerScope) : undefined,
	);
	const groups: CategoryGroup[] = [];

	if (ownerScope) {
		groups.push({
			categories: visible.owner,
			emptyText: translateAstra(
				"astraMainInterface.global.categories.scope.currentContext.empty",
			),
			icon: CircleUser,
			iconName: "circle-user",
			id: "owner",
			label: ownerScope.label,
		});
	}

	groups.push({
		categories: visible.global,
		emptyText: ownerScope
			? translateAstra("astraMainInterface.chatMenu.categoryDrawer.empty")
			: translateAstra("astraMainInterface.global.categories.emptyTree"),
		icon: Globe,
		iconName: "globe",
		id: "global",
		label: translateAstra("astraMainInterface.sections.global"),
	});

	return groups;
}

export function CategoryTreeActionsGroup({
	onCollapseAll,
	onExpandAll,
}: {
	onCollapseAll?: () => void;
	onExpandAll?: () => void;
} = {}) {
	const expandAllLabel = translateAstra(
		"astraMainInterface.global.categories.action.expandAll",
	);
	const collapseAllLabel = translateAstra(
		"astraMainInterface.global.categories.action.collapseAll",
	);

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

function ChatCategoryCreateRow({
	actions,
	addLabelKey = "astraMainInterface.global.categories.create.add",
	chatCategoryStore,
	inputId,
	inputLabelKey = "astraMainInterface.global.categories.create.inputLabel",
	placeholderKey = "astraMainInterface.global.categories.create.placeholder",
	scopeOptions,
	showScopeSelect = false,
}: {
	actions?: React.ReactNode;
	addLabelKey?: I18nKey;
	chatCategoryStore: ChatCategoryStore;
	inputId: string;
	inputLabelKey?: I18nKey;
	placeholderKey?: I18nKey;
	scopeOptions: CategoryScopeOption[];
	showScopeSelect?: boolean;
}) {
	const [name, setName] = React.useState("");
	const [selectedScopeKey, setSelectedScopeKey] = React.useState(() =>
		getScopeOptionKey(scopeOptions[0]?.value ?? createGlobalScope()),
	);
	const [error, setError] = React.useState("");
	const selectedScope =
		scopeOptions.find(
			(option) => getScopeOptionKey(option.value) === selectedScopeKey,
		) ?? scopeOptions[0];
	const canCreate = name.trim().length > 0 && Boolean(selectedScope);
	const isMultiScope = showScopeSelect && scopeOptions.length > 1;
	const displayedScope = selectedScope ?? scopeOptions[0];
	const scopeInputLabel = translateAstra(
		"astraMainInterface.categories.scope.inputLabel",
	);

	React.useEffect(() => {
		if (
			scopeOptions.some(
				(option) =>
					getScopeOptionKey(option.value) === selectedScopeKey,
			)
		) {
			return;
		}

		setSelectedScopeKey(
			getScopeOptionKey(scopeOptions[0]?.value ?? createGlobalScope()),
		);
	}, [scopeOptions, selectedScopeKey]);

	const handleCreate = React.useCallback(() => {
		if (!canCreate || !displayedScope) {
			return;
		}

		const result = chatCategoryStore.createCategory({
			name,
			...displayedScope.value,
		});

		if (!result.ok) {
			setError(getCategoryErrorMessage(result.reason));
			return;
		}

		setName("");
		setError("");
	}, [canCreate, chatCategoryStore, displayedScope, name]);

	const handleScopeSelect = React.useCallback(
		(nextScopeKey: string) => {
			if (
				!scopeOptions.some(
					(option) =>
						getScopeOptionKey(option.value) === nextScopeKey,
				)
			) {
				return;
			}

			setSelectedScopeKey(nextScopeKey);
			setError("");
		},
		[scopeOptions],
	);

	return (
		<div className="astra-chat-library-category-create">
			<div
				className={
					showScopeSelect
						? "astra-chat-library-category-createRow"
						: "astra-chat-library-category-createRow astra-chat-library-category-createRow--single"
				}
			>
				{showScopeSelect && displayedScope ? (
					isMultiScope ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								aria-label={`${scopeInputLabel}: ${displayedScope.label}`}
								className={buttonVariants({
									className:
										"astra-chat-library-category-selectTrigger",
									size: "icon",
									variant: "outline",
								})}
								data-size="icon"
								data-slot="select-trigger"
								title={displayedScope.label}
								type="button"
							>
								<UiIcon
									aria-hidden={true}
									data-icon="inline-start"
									icon={displayedScope.icon}
									size="sm"
								/>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="start"
								className="astra-chat-library-category-selectMenu"
							>
								{scopeOptions.map((option) => {
									const optionKey = getScopeOptionKey(
										option.value,
									);

									return (
										<DropdownMenuItem
											className="astra-chat-library-category-selectItem"
											data-state={
												optionKey === selectedScopeKey
													? "checked"
													: "unchecked"
											}
											key={optionKey}
											onClick={() => {
												handleScopeSelect(optionKey);
											}}
										>
											<UiIcon
												aria-hidden={true}
												icon={option.icon}
												size="sm"
											/>
											<span>{option.label}</span>
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button
							aria-label={`${scopeInputLabel}: ${displayedScope.label}`}
							className="astra-chat-library-category-selectTrigger"
							data-size="icon"
							data-slot="select-trigger"
							disabled={true}
							size="icon"
							title={displayedScope.label}
							type="button"
							variant="outline"
						>
							<UiIcon
								aria-hidden={true}
								data-icon="inline-start"
								icon={displayedScope.icon}
								size="sm"
							/>
						</Button>
					)
				) : null}
				<div className="astra-main-interface__search-shell astra-chat-library-category-inputWrap">
					<UiIcon
						aria-hidden={true}
						className="astra-main-interface__search-icon"
						icon={FolderOpen}
						size="sm"
					/>
					<Input
						aria-label={translateAstra(inputLabelKey)}
						className="astra-main-interface__search-input astra-chat-library-category-input"
						id={inputId}
						placeholder={translateAstra(placeholderKey)}
						type="text"
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setError("");
						}}
						onKeyDown={(event) => {
							if (event.key !== "Enter") {
								return;
							}

							event.preventDefault();
							handleCreate();
						}}
					/>
					<Button
						aria-label={translateAstra(addLabelKey)}
						className="astra-chat-library-category-addButton"
						disabled={!canCreate}
						size="icon-sm"
						type="button"
						variant="ghost"
						onClick={handleCreate}
					>
						<UiIcon
							aria-hidden={true}
							icon={CirclePlus}
							size="sm"
						/>
					</Button>
				</div>
				{actions}
			</div>
			<p
				className="astra-chat-library-category-error"
				hidden={!error}
				role={error ? "alert" : undefined}
			>
				{error}
			</p>
		</div>
	);
}

function GlobalCategoryEmptyState({
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

function GlobalChatCategoryTree({
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
	onCategoryAction(
		category: ChatCategory,
		mode: GlobalCategoryActionMode,
	): void;
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
						"astraMainInterface.global.categories.action.renameCategory",
					)}: ${category.name}`;
					const deleteCategoryLabel = `${translateAstra(
						"astraMainInterface.global.categories.action.deleteCategory",
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
											"astraMainInterface.global.categories.actions.label",
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

function ChatCategoryAccordion({
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

function ChatCategoryAssignmentList({
	draftIds,
	groups,
	isOpen,
	onDraftIdsChange,
}: {
	draftIds: string[];
	groups: CategoryGroup[];
	isOpen: boolean;
	onDraftIdsChange(nextDraftIds: string[]): void;
}) {
	const contentIdPrefix = React.useId();
	const groupIdsKey = groups.map((group) => group.id).join(":");
	const [expandedGroupIds, setExpandedGroupIds] = React.useState<string[]>(
		() => groups.map((group) => group.id),
	);
	const wasOpenRef = React.useRef(isOpen);
	const previousGroupIdsKeyRef = React.useRef(groupIdsKey);

	React.useEffect(() => {
		const didOpen = isOpen && !wasOpenRef.current;
		const didGroupsChange = groupIdsKey !== previousGroupIdsKeyRef.current;

		if (isOpen && (didOpen || didGroupsChange)) {
			setExpandedGroupIds(groups.map((group) => group.id));
		}

		wasOpenRef.current = isOpen;
		previousGroupIdsKeyRef.current = groupIdsKey;
	}, [groupIdsKey, groups, isOpen]);

	return (
		<div className="astra-main-interface-chat-category-drawer__assignment-list">
			{groups.map((group) => {
				const isExpanded = expandedGroupIds.includes(group.id);
				const contentId = `${contentIdPrefix}-${group.id}`;

				return (
					<section
						aria-label={group.label}
						className="astra-main-interface-chat-category-drawer__scope-section"
						data-scope={group.id}
						key={group.id}
					>
						<button
							aria-controls={contentId}
							aria-expanded={isExpanded}
							aria-label={`${group.label} (${group.categories.length})`}
							className="astra-main-interface-chat-category-drawer__scope-header"
							data-state={isExpanded ? "open" : "closed"}
							type="button"
							onClick={() => {
								setExpandedGroupIds((current) =>
									current.includes(group.id)
										? current.filter(
												(groupId) =>
													groupId !== group.id,
											)
										: [...current, group.id],
								);
							}}
						>
							<span className="astra-main-interface-chat-category-drawer__scope-label-row">
								<span
									aria-hidden={true}
									className={`astra-main-interface-chat-category-drawer__scope-icon astra-main-interface-chat-category-drawer__scope-icon--${group.iconName}`}
								>
									<UiIcon icon={group.icon} size="sm" />
								</span>
								<span className="astra-main-interface-chat-category-drawer__scope-label">
									{group.label}
								</span>
								<span className="astra-main-interface-chat-category-drawer__scope-count">
									({group.categories.length})
								</span>
							</span>
							<UiIcon
								aria-hidden={true}
								className="astra-chat-library-category-chevron"
								icon={ChevronDown}
								size="sm"
							/>
						</button>
						<div
							className="astra-main-interface-chat-category-drawer__category-list"
							hidden={!isExpanded}
							id={contentId}
							role="list"
						>
							{group.categories.length > 0 ? (
								group.categories.map((category) => (
									<div
										className="astra-main-interface-chat-category-drawer__category-row"
										data-category-id={category.id}
										key={category.id}
										role="listitem"
									>
										<span className="astra-main-interface-chat-category-drawer__category-name">
											{category.name}
										</span>
										<span className="astra-main-interface-chat-category-drawer__checkbox-wrap">
											<Checkbox
												aria-label={category.name}
												checked={draftIds.includes(
													category.id,
												)}
												className="astra-chat-library-category-checkbox"
												onCheckedChange={(checked) => {
													const isChecked =
														checked === true;
													const nextDraftIds =
														isChecked
															? draftIds.includes(
																	category.id,
																)
																? draftIds
																: [
																		...draftIds,
																		category.id,
																	]
															: draftIds.filter(
																	(id) =>
																		id !==
																		category.id,
																);

													onDraftIdsChange(
														nextDraftIds,
													);
												}}
											/>
										</span>
									</div>
								))
							) : (
								<div className="astra-main-interface-chat-category-drawer__empty-row">
									{translateAstra(
										"astraMainInterface.chatMenu.categoryDrawer.empty",
									)}
								</div>
							)}
						</div>
					</section>
				);
			})}
		</div>
	);
}

function GlobalCategoryActionDrawer({
	action,
	chatCategoryStore,
	onOpenChange,
}: {
	action: GlobalCategoryActionDrawerState | null;
	chatCategoryStore: ChatCategoryStore;
	onOpenChange(open: boolean): void;
}) {
	const [retainedAction, setRetainedAction] =
		React.useState<GlobalCategoryActionDrawerState | null>(action);
	const isOpen = action !== null;
	const shouldRenderDrawer = useDelayedDrawerContentMount(isOpen);
	const drawerAction = action ?? retainedAction;

	React.useEffect(() => {
		if (action) {
			setRetainedAction(action);
		}
	}, [action]);

	React.useEffect(() => {
		if (!shouldRenderDrawer && !isOpen) {
			setRetainedAction(null);
		}
	}, [isOpen, shouldRenderDrawer]);

	if (!shouldRenderDrawer || !drawerAction) {
		return null;
	}

	return (
		<GlobalCategoryActionDrawerSurface
			action={drawerAction}
			chatCategoryStore={chatCategoryStore}
			open={isOpen}
			onOpenChange={onOpenChange}
		/>
	);
}

function GlobalCategoryActionDrawerSurface({
	action,
	chatCategoryStore,
	open,
	onOpenChange,
}: {
	action: GlobalCategoryActionDrawerState;
	chatCategoryStore: ChatCategoryStore;
	open: boolean;
	onOpenChange(open: boolean): void;
}) {
	const { category, mode } = action;
	const isDelete = mode === "delete";
	const [nextName, setNextName] = React.useState(category.name);
	const [error, setError] = React.useState("");
	const [isBusy, setIsBusy] = React.useState(false);
	const drawerId = isDelete
		? GLOBAL_CATEGORY_DELETE_DRAWER_ID
		: GLOBAL_CATEGORY_RENAME_DRAWER_ID;
	const title = translateAstra(
		isDelete
			? "astraMainInterface.global.categories.delete.title"
			: "astraMainInterface.global.categories.rename.title",
	);
	const descriptionText = translateAstra(
		isDelete
			? "astraMainInterface.global.categories.delete.description"
			: "astraMainInterface.global.categories.rename.description",
	);
	const errorId = `${drawerId}-error`;
	const hintId = `${drawerId}-hint`;

	React.useEffect(() => {
		if (!open) {
			return;
		}

		setNextName(category.name);
		setError("");
		setIsBusy(false);
	}, [category.id, category.name, mode, open]);

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	const handleConfirm = React.useCallback(
		(close: () => void) => {
			if (isBusy) {
				return;
			}

			setIsBusy(true);
			try {
				if (mode === "rename") {
					const result = chatCategoryStore.renameCategory(
						category.id,
						nextName,
					);
					if (!result.ok) {
						setError(getCategoryErrorMessage(result.reason));
						return;
					}
				} else if (!chatCategoryStore.deleteCategory(category.id)) {
					setError(getCategoryErrorMessage("missing"));
					return;
				}

				setError("");
				close();
			} finally {
				setIsBusy(false);
			}
		},
		[category.id, chatCategoryStore, isBusy, mode, nextName],
	);

	return (
		<ResponsiveDialog
			className={cn(
				"astra-main-interface-drawer astra-main-interface-chat-row-action-dialog astra-main-interface-global-category-action-drawer",
				isDelete
					? "astra-main-interface-global-category-delete-drawer"
					: "astra-main-interface-global-category-rename-drawer",
			)}
			contentId={drawerId}
			description={
				<div className="astra-dialog-current-chat-file-description">
					{descriptionText}
				</div>
			}
			footer={
				<GlobalCategoryActionDrawerFooter
					isBusy={isBusy}
					mode={mode}
					onConfirm={handleConfirm}
				/>
			}
			headerContent={
				<div className="astra-chat-library-global-categoryActionDrawer__identity">
					<span
						aria-hidden={true}
						className="astra-chat-library-global-categoryActionDrawer__identityIcon"
					>
						<UiIcon icon={FolderBookmark} size="sm" />
					</span>
					<span
						className="astra-chat-library-global-categoryActionDrawer__identityName"
						title={category.name}
					>
						{category.name}
					</span>
					<Badge
						className="astra-chat-library-global-categoryActionDrawer__identityScope"
						variant="secondary"
					>
						<UiIcon
							aria-hidden={true}
							data-icon="inline-start"
							icon={Globe}
							size="xs"
						/>
						{translateAstra(
							"astraMainInterface.categories.scope.global",
						)}
					</Badge>
				</div>
			}
			icon={
				<UiIcon
					aria-hidden={true}
					icon={isDelete ? Trash2 : PencilLine}
					size="sm"
				/>
			}
			open={open}
			title={title}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			<div className="astra-dialog-section astra-chat-library-dialog-content astra-chat-library-global-categoryActionDrawer__content">
				<div className="astra-chat-library-dialog-alert" role="alert">
					<UiIcon
						aria-hidden={true}
						className="astra-chat-library-dialog-alert-icon"
						icon={TriangleAlert}
						size="sm"
					/>
					<div className="astra-chat-library-dialog-alert-content">
						<p className="astra-chat-library-dialog-alert-title">
							{translateAstra(
								isDelete
									? "astraMainInterface.global.categories.delete.warningTitle"
									: "astraMainInterface.global.categories.rename.warningTitle",
							)}
						</p>
						<p className="astra-chat-library-dialog-alert-text">
							{translateAstra(
								isDelete
									? "astraMainInterface.global.categories.delete.warningText"
									: "astraMainInterface.global.categories.rename.warningText",
							)}
						</p>
					</div>
				</div>
				{mode === "rename" ? (
					<GlobalCategoryRenameField
						error={error}
						errorId={errorId}
						hintId={hintId}
						isBusy={isBusy}
						nextName={nextName}
						onConfirm={handleConfirm}
						onErrorClear={() => {
							setError("");
						}}
						onNameChange={setNextName}
					/>
				) : null}
				{error ? (
					<p
						className="astra-chat-library-category-error"
						id={errorId}
						role="alert"
					>
						{error}
					</p>
				) : null}
			</div>
		</ResponsiveDialog>
	);
}

function GlobalCategoryActionDrawerFooter({
	isBusy,
	mode,
	onConfirm,
}: {
	isBusy: boolean;
	mode: GlobalCategoryActionMode;
	onConfirm(close: () => void): void;
}) {
	const close = useResponsiveDialogClose();
	const isDelete = mode === "delete";

	return (
		<div
			className={
				isDelete
					? "astra-chat-library-dialog-footer astra-chat-library-dialog-footer--global-category-delete"
					: "astra-chat-library-dialog-footer astra-chat-library-dialog-footer--global-category-rename"
			}
		>
			{isDelete ? (
				<Button
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--delete"
					disabled={isBusy}
					type="button"
					variant="ghost"
					onClick={() => {
						onConfirm(close);
					}}
				>
					<UiIcon aria-hidden={true} icon={Trash2} size="sm" />
					{isBusy
						? translateAstra(
								"astraMainInterface.global.categories.delete.deleting",
							)
						: translateAstra(
								"astraMainInterface.global.categories.delete.confirm",
							)}
				</Button>
			) : null}
			<div className="astra-chat-library-dialog-footer-actions">
				<ResponsiveDialogClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						disabled={isBusy}
						type="button"
						variant={isDelete ? "default" : "ghost"}
					>
						{translateAstra(
							isDelete
								? "astraMainInterface.global.categories.delete.close"
								: "astraMainInterface.global.categories.rename.cancel",
						)}
					</Button>
				</ResponsiveDialogClose>
				{mode === "rename" ? (
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--confirm"
						disabled={isBusy}
						type="button"
						variant="default"
						onClick={() => {
							onConfirm(close);
						}}
					>
						<UiIcon
							aria-hidden={true}
							icon={PencilLine}
							size="sm"
						/>
						{isBusy
							? translateAstra(
									"astraMainInterface.global.categories.rename.renaming",
								)
							: translateAstra(
									"astraMainInterface.global.categories.rename.confirm",
								)}
					</Button>
				) : null}
			</div>
		</div>
	);
}

function GlobalCategoryRenameField({
	error,
	errorId,
	hintId,
	isBusy,
	nextName,
	onConfirm,
	onErrorClear,
	onNameChange,
}: {
	error: string;
	errorId: string;
	hintId: string;
	isBusy: boolean;
	nextName: string;
	onConfirm(close: () => void): void;
	onErrorClear(): void;
	onNameChange(nextName: string): void;
}) {
	const close = useResponsiveDialogClose();

	return (
		<div className="astra-chat-library-global-categoryActionDrawer__field astra-chat-library-dialog-field">
			<Input
				aria-describedby={error ? `${hintId} ${errorId}` : hintId}
				aria-invalid={Boolean(error)}
				aria-label={translateAstra(
					"astraMainInterface.global.categories.rename.inputLabel",
				)}
				disabled={isBusy}
				id={GLOBAL_CATEGORY_RENAME_DRAWER_INPUT_ID}
				placeholder={translateAstra(
					"astraMainInterface.global.categories.rename.placeholder",
				)}
				value={nextName}
				onChange={(event) => {
					onNameChange(event.target.value);
					onErrorClear();
				}}
				onKeyDown={(event) => {
					if (event.key !== "Enter") return;
					event.preventDefault();
					onConfirm(close);
				}}
			/>
			<p
				className="astra-chat-library-global-categoryActionDrawer__hint astra-chat-library-dialog-description"
				id={hintId}
			>
				{translateAstra(
					"astraMainInterface.global.categories.rename.hint",
				)}
			</p>
		</div>
	);
}

export function ChatCategoryManagerPage({
	activeChatActionsEntryKey,
	chatCategoryStore,
	entries,
	isLoading = false,
	openEntryDisabled = false,
	onOpenChatActions,
	onOpenEntry,
	ownerScope,
	variant,
}: ChatCategoryManagerPageProps) {
	const categorySnapshot = useCategorySnapshot(chatCategoryStore);
	const inputId = React.useId();
	const groups = React.useMemo(
		() =>
			getCategoryGroups({
				chatCategoryStore,
				ownerScope,
			}),
		[categorySnapshot, chatCategoryStore, ownerScope],
	);
	const categories = React.useMemo(
		() => groups.flatMap((group) => group.categories),
		[groups],
	);
	const isGlobal = variant === "global";
	const globalCategoryIds = React.useMemo(
		() => (isGlobal ? categories.map((category) => category.id) : []),
		[categories, isGlobal],
	);
	const [globalExpandedCategoryIds, setGlobalExpandedCategoryIds] =
		React.useState<string[]>([]);
	const [globalCategoryAction, setGlobalCategoryAction] =
		React.useState<GlobalCategoryActionDrawerState | null>(null);
	const previousGlobalCategoryIdsRef = React.useRef<string[]>([]);
	const emptyTitleKey: I18nKey =
		variant === "favorite"
			? "astraMainInterface.favorite.categories.empty.title"
			: variant === "current"
				? "astraMainInterface.currentContext.categories.empty.title"
				: "astraMainInterface.global.categories.emptyTree";
	const emptyDescriptionKey: I18nKey =
		variant === "favorite"
			? "astraMainInterface.favorite.categories.empty.description"
			: variant === "current"
				? "astraMainInterface.currentContext.categories.empty.description"
				: "astraMainInterface.global.categories.empty.description";
	const createScopeOptions = React.useMemo(
		() => buildScopeOptions(isGlobal ? null : ownerScope),
		[isGlobal, ownerScope],
	);
	const handleGlobalCategoryToggle = React.useCallback(
		(categoryId: string) => {
			setGlobalExpandedCategoryIds((current) =>
				current.includes(categoryId)
					? current.filter((value) => value !== categoryId)
					: [...current, categoryId],
			);
		},
		[],
	);
	const handleExpandAllGlobalCategories = React.useCallback(() => {
		setGlobalExpandedCategoryIds(globalCategoryIds);
	}, [globalCategoryIds]);
	const handleCollapseAllGlobalCategories = React.useCallback(() => {
		setGlobalExpandedCategoryIds([]);
	}, []);
	const handleGlobalCategoryAction = React.useCallback(
		(category: ChatCategory, mode: GlobalCategoryActionMode) => {
			setGlobalCategoryAction({ category, mode });
		},
		[],
	);
	const handleGlobalCategoryActionOpenChange = React.useCallback(
		(open: boolean) => {
			if (!open) {
				setGlobalCategoryAction(null);
			}
		},
		[],
	);

	React.useEffect(() => {
		if (!isGlobal) {
			previousGlobalCategoryIdsRef.current = [];
			return;
		}

		const previousCategoryIds = previousGlobalCategoryIdsRef.current;
		previousGlobalCategoryIdsRef.current = globalCategoryIds;
		setGlobalExpandedCategoryIds((current) => {
			const next = current.filter((categoryId) =>
				globalCategoryIds.includes(categoryId),
			);
			for (const categoryId of globalCategoryIds) {
				if (
					!previousCategoryIds.includes(categoryId) &&
					!next.includes(categoryId)
				) {
					next.push(categoryId);
				}
			}

			return areIdSetsEqual(next, current) ? current : next;
		});
	}, [globalCategoryIds, isGlobal]);

	return (
		<div
			className={
				isGlobal
					? "astra-chat-library-global-manager"
					: "astra-chat-library-global-manager astra-chat-library-scoped-manager"
			}
		>
			<div className="astra-main-interface__toolbar astra-main-interface__toolbar--categories">
				<ChatCategoryCreateRow
					actions={
						isGlobal ? (
							<CategoryTreeActionsGroup
								onCollapseAll={
									handleCollapseAllGlobalCategories
								}
								onExpandAll={handleExpandAllGlobalCategories}
							/>
						) : undefined
					}
					addLabelKey={
						isGlobal
							? "astraMainInterface.global.categories.create.add"
							: "astraMainInterface.chatMenu.categoryDrawer.create.add"
					}
					chatCategoryStore={chatCategoryStore}
					inputId={inputId}
					inputLabelKey={
						isGlobal
							? "astraMainInterface.global.categories.create.inputLabel"
							: "astraMainInterface.chatMenu.categoryDrawer.create.inputLabel"
					}
					placeholderKey={
						isGlobal
							? "astraMainInterface.global.categories.create.placeholder"
							: "astraMainInterface.chatMenu.categoryDrawer.create.placeholder"
					}
					scopeOptions={createScopeOptions}
					showScopeSelect={!isGlobal}
				/>
			</div>
			<div
				aria-busy={isLoading}
				className={cn(
					"astra-chat-library-category-panel",
					isGlobal
						? "astra-chat-library-global-panel"
						: "astra-chat-library-scoped-panel",
				)}
			>
				{categories.length > 0 ? (
					isGlobal ? (
						<GlobalChatCategoryTree
							activeChatActionsEntryKey={
								activeChatActionsEntryKey
							}
							categories={categories}
							chatCategoryStore={chatCategoryStore}
							entries={entries}
							expandedCategoryIds={globalExpandedCategoryIds}
							onCategoryAction={handleGlobalCategoryAction}
							onOpenChatActions={onOpenChatActions}
							openEntryDisabled={openEntryDisabled}
							onCategoryToggle={handleGlobalCategoryToggle}
							onOpenEntry={onOpenEntry}
						/>
					) : (
						<ChatCategoryAccordion
							chatCategoryStore={chatCategoryStore}
							entries={entries}
							groups={groups}
							openEntryDisabled={openEntryDisabled}
							onOpenEntry={onOpenEntry}
						/>
					)
				) : (
					<>
						<div className="astra-chat-library-category-treeLayout">
							<div
								className="astra-chat-library-category-tree astra-chat-library-global-tree astra-chat-library-category-tree--empty"
								style={
									{
										"--tree-indent": `${GLOBAL_CATEGORY_TREE_INDENT}px`,
									} as CategoryTreeStyle
								}
							/>
						</div>
						<GlobalCategoryEmptyState
							descriptionKey={emptyDescriptionKey}
							titleKey={emptyTitleKey}
						/>
					</>
				)}
			</div>
			{isGlobal ? (
				<GlobalCategoryActionDrawer
					action={globalCategoryAction}
					chatCategoryStore={chatCategoryStore}
					onOpenChange={handleGlobalCategoryActionOpenChange}
				/>
			) : null}
		</div>
	);
}

export function ChatCategoryAssignmentDrawer({
	chatCategoryStore,
	entry,
	onOpenChange,
}: ChatCategoryAssignmentDrawerProps) {
	const categorySnapshot = useCategorySnapshot(chatCategoryStore);
	const [retainedEntry, setRetainedEntry] =
		React.useState<ChatCatalogEntry | null>(entry);
	const isOpen = entry !== null;
	const shouldRenderDrawer = useDelayedDrawerContentMount(isOpen);
	const drawerEntry = entry ?? retainedEntry;
	const ownerScope = drawerEntry
		? {
				label: normalizeOwnerLabel(drawerEntry),
				ownerId: drawerEntry.entityId,
				ownerType: drawerEntry.kind,
			}
		: null;
	const groups = React.useMemo(
		() =>
			getCategoryGroups({
				chatCategoryStore,
				ownerScope,
			}),
		[categorySnapshot, chatCategoryStore, ownerScope],
	);
	const categories = groups.flatMap((group) => group.categories);
	const [draftIds, setDraftIds] = React.useState<string[]>([]);
	const persistedIds = drawerEntry
		? chatCategoryStore.getChatCategoryIds(drawerEntry.key)
		: [];
	const hasChanges = !areIdSetsEqual(draftIds, persistedIds);
	const title = translateAstra(
		"astraMainInterface.chatMenu.categoryDrawer.title",
	);
	const description = translateAstra(
		"astraMainInterface.chatMenu.categoryDrawer.description",
	);
	const inputScopeOptions = React.useMemo(
		() => buildScopeOptions(ownerScope),
		[ownerScope],
	);

	React.useEffect(() => {
		if (entry) {
			setRetainedEntry(entry);
			setDraftIds(chatCategoryStore.getChatCategoryIds(entry.key));
		}
	}, [chatCategoryStore, entry]);

	React.useEffect(() => {
		if (!shouldRenderDrawer && !isOpen) {
			setRetainedEntry(null);
		}
	}, [isOpen, shouldRenderDrawer]);

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	if (!shouldRenderDrawer || !drawerEntry) {
		return null;
	}

	const footer = (
		<ChatCategoryAssignmentDrawerFooter
			canSave={hasChanges}
			onSave={() => {
				chatCategoryStore.setChatCategoryIds(
					drawerEntry.key,
					draftIds,
				);
			}}
		/>
	);

	return (
		<ResponsiveDialog
			className="astra-main-interface-drawer astra-main-interface-chat-row-action-dialog astra-main-interface-chat-category-drawer"
			contentId={CHAT_ROW_CATEGORY_DRAWER_ID}
			description={
				<div className="astra-dialog-current-chat-file-description">
					{description}
					<span className="astra-dialog-current-chat-file-token">
						<span className="astra-dialog-current-chat-file-name">
							{drawerEntry.chatId}
						</span>
					</span>
				</div>
			}
			footer={footer}
			headerContent={
				<ChatCatalogRowDialogIdentityHeader entry={drawerEntry} />
			}
			icon={<UiIcon aria-hidden={true} icon={Bookmark} size="sm" />}
			open={isOpen}
			scrollBody={true}
			title={title}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			<div
				className="astra-dialog-section astra-chat-library-dialog-content"
				id={CHAT_ROW_CATEGORY_DRAWER_SCROLLABLE_CONTENT_ID}
			>
				<div className="astra-main-interface-chat-category-drawer__panel">
					<ChatCategoryAssignmentList
						draftIds={draftIds}
						groups={groups}
						isOpen={isOpen}
						onDraftIdsChange={setDraftIds}
					/>
					<div className="astra-main-interface-chat-category-drawer__create">
						<ChatCategoryCreateRow
							addLabelKey="astraMainInterface.chatMenu.categoryDrawer.create.add"
							chatCategoryStore={chatCategoryStore}
							inputId={CHAT_ROW_CATEGORY_DRAWER_CREATE_INPUT_ID}
							inputLabelKey="astraMainInterface.chatMenu.categoryDrawer.create.inputLabel"
							placeholderKey="astraMainInterface.chatMenu.categoryDrawer.create.placeholder"
							scopeOptions={inputScopeOptions}
							showScopeSelect={true}
						/>
					</div>
				</div>
			</div>
		</ResponsiveDialog>
	);
}

function ChatCategoryAssignmentDrawerFooter({
	canSave,
	onSave,
}: {
	canSave: boolean;
	onSave(): void;
}) {
	const close = useResponsiveDialogClose();

	return (
		<div className="astra-chat-library-dialog-footer astra-chat-library-dialog-footer--categories">
			<div className="astra-chat-library-dialog-footer-actions">
				<ResponsiveDialogClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						type="button"
						variant="ghost"
					>
						{translateAstra(
							"astraMainInterface.chatMenu.categoryDrawer.close",
						)}
					</Button>
				</ResponsiveDialogClose>
				<Button
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--save"
					disabled={!canSave}
					type="button"
					variant="default"
					onClick={() => {
						onSave();
						close();
					}}
				>
					{translateAstra(
						"astraMainInterface.chatMenu.categoryDrawer.save",
					)}
				</Button>
			</div>
		</div>
	);
}

function useDelayedDrawerContentMount(isOpen: boolean) {
	const [isContentMounted, setIsContentMounted] = React.useState(isOpen);

	React.useEffect(() => {
		if (isOpen) {
			setIsContentMounted(true);
			return undefined;
		}

		if (!isContentMounted) {
			return undefined;
		}

		const timeoutId = setTimeout(() => {
			setIsContentMounted(false);
		}, 650);

		return () => {
			clearTimeout(timeoutId);
		};
	}, [isContentMounted, isOpen]);

	return isOpen || isContentMounted;
}
