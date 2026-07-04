import * as React from "react";

import { cn } from "@/lib/utils";
import type { ChatCategory } from "@/packages/core/st/chat-categories";
import type { I18nKey } from "@/types/i18n";

import { CategoryActionDrawer } from "@/packages/features/astra-main-interface/chat-categories/CategoryActionDrawer";
import { ChatCategoryCreateRow } from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryCreateRow";
import {
	CategoryTreeActionsGroup,
	ChatCategoryTree,
	GlobalCategoryEmptyState,
} from "@/packages/features/astra-main-interface/chat-categories/CategoryTree";
import {
	GLOBAL_CATEGORY_TREE_INDENT,
	areIdSetsEqual,
	buildCategoryPageCreateScopeOptions,
	createOwnerScope,
	getCategoryPageCreateKey,
	useCategorySnapshot,
	type CategoryActionDrawerState,
	type CategoryActionMode,
	type CategoryTreeStyle,
	type ChatCategoryManagerPageProps,
} from "@/packages/features/astra-main-interface/chat-categories/categoryModel";

export { ChatCategoryAssignmentDrawer } from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryAssignmentDrawer";
export { CategoryTreeActionsGroup } from "@/packages/features/astra-main-interface/chat-categories/CategoryTree";
export {
	CHAT_CATEGORY_PAGE_SIZE,
	CHAT_ROW_CATEGORY_DRAWER_CREATE_INPUT_ID,
	CHAT_ROW_CATEGORY_DRAWER_ID,
	CHAT_ROW_CATEGORY_DRAWER_SCROLLABLE_CONTENT_ID,
	GLOBAL_CATEGORY_DELETE_DRAWER_ID,
	GLOBAL_CATEGORY_RENAME_DRAWER_ID,
	GLOBAL_CATEGORY_RENAME_DRAWER_INPUT_ID,
	GLOBAL_CATEGORY_TREE_INDENT,
	useChatCategoryStore,
	type ChatCategoryAssignmentDrawerProps,
	type ChatCategoryManagerPageProps,
} from "@/packages/features/astra-main-interface/chat-categories/categoryModel";

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
	const isGlobal = variant === "global";
	const categories = React.useMemo(() => {
		const visible = chatCategoryStore.getVisibleCategories(
			ownerScope ? createOwnerScope(ownerScope) : undefined,
		);

		return isGlobal ? visible.global : visible.owner;
	}, [categorySnapshot, chatCategoryStore, isGlobal, ownerScope]);
	const categoryIds = React.useMemo(
		() => categories.map((category) => category.id),
		[categories],
	);
	const [expandedCategoryIds, setExpandedCategoryIds] = React.useState<
		string[]
	>([]);
	const [categoryAction, setCategoryAction] =
		React.useState<CategoryActionDrawerState | null>(null);
	const previousCategoryIdsRef = React.useRef<string[]>([]);
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
		() =>
			buildCategoryPageCreateScopeOptions({
				ownerScope,
				variant,
			}),
		[ownerScope, variant],
	);
	const handleCategoryToggle = React.useCallback((categoryId: string) => {
		setExpandedCategoryIds((current) =>
			current.includes(categoryId)
				? current.filter((value) => value !== categoryId)
				: [...current, categoryId],
		);
	}, []);
	const handleExpandAllCategories = React.useCallback(() => {
		setExpandedCategoryIds(categoryIds);
	}, [categoryIds]);
	const handleCollapseAllCategories = React.useCallback(() => {
		setExpandedCategoryIds([]);
	}, []);
	const handleCategoryAction = React.useCallback(
		(category: ChatCategory, mode: CategoryActionMode) => {
			setCategoryAction({ category, mode });
		},
		[],
	);
	const handleCategoryActionOpenChange = React.useCallback(
		(open: boolean) => {
			if (!open) {
				setCategoryAction(null);
			}
		},
		[],
	);

	React.useEffect(() => {
		const previousCategoryIds = previousCategoryIdsRef.current;
		previousCategoryIdsRef.current = categoryIds;
		setExpandedCategoryIds((current) => {
			const next = current.filter((categoryId) =>
				categoryIds.includes(categoryId),
			);
			for (const categoryId of categoryIds) {
				if (
					!previousCategoryIds.includes(categoryId) &&
					!next.includes(categoryId)
				) {
					next.push(categoryId);
				}
			}

			return areIdSetsEqual(next, current) ? current : next;
		});
	}, [categoryIds]);

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
						<CategoryTreeActionsGroup
							collapseAllLabelKey={
								isGlobal
									? "astraMainInterface.global.categories.action.collapseAll"
									: "astraMainInterface.categories.action.collapseAll"
							}
							expandAllLabelKey={
								isGlobal
									? "astraMainInterface.global.categories.action.expandAll"
									: "astraMainInterface.categories.action.expandAll"
							}
							onCollapseAll={handleCollapseAllCategories}
							onExpandAll={handleExpandAllCategories}
						/>
					}
					addLabelKey={
						isGlobal
							? "astraMainInterface.global.categories.create.add"
							: getCategoryPageCreateKey(ownerScope, "add")
					}
					chatCategoryStore={chatCategoryStore}
					inputId={inputId}
					inputLabelKey={
						isGlobal
							? "astraMainInterface.global.categories.create.inputLabel"
							: getCategoryPageCreateKey(ownerScope, "inputLabel")
					}
					placeholderKey={
						isGlobal
							? "astraMainInterface.global.categories.create.placeholder"
							: getCategoryPageCreateKey(
									ownerScope,
									"placeholder",
								)
					}
					scopeOptions={createScopeOptions}
					showScopeSelect={false}
				/>
			</div>
			<div
				aria-busy={isLoading}
				className={cn(
					"astra-chat-library-category-panel",
					"astra-chat-library-global-panel",
					!isGlobal && "astra-chat-library-scoped-panel",
				)}
			>
				{categories.length > 0 ? (
					<ChatCategoryTree
						activeChatActionsEntryKey={activeChatActionsEntryKey}
						categories={categories}
						chatCategoryStore={chatCategoryStore}
						entries={entries}
						expandedCategoryIds={expandedCategoryIds}
						onCategoryAction={handleCategoryAction}
						onOpenChatActions={onOpenChatActions}
						openEntryDisabled={openEntryDisabled}
						onCategoryToggle={handleCategoryToggle}
						onOpenEntry={onOpenEntry}
					/>
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
			<CategoryActionDrawer
				action={categoryAction}
				chatCategoryStore={chatCategoryStore}
				onOpenChange={handleCategoryActionOpenChange}
			/>
		</div>
	);
}
