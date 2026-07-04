import * as React from "react";

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
import {
	CircleUser,
	Globe,
	type LucideIcon,
} from "@/components/ui/shared/icons";
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

export type CategoryTreeStyle = React.CSSProperties & {
	"--tree-indent": string;
};

export type CategoryScopeOption = {
	icon: LucideIcon;
	iconName: "circle-user" | "globe";
	label: string;
	value: ChatCategoryScope;
};

export type CategoryGroup = {
	categories: ChatCategory[];
	emptyText: string;
	icon: LucideIcon;
	iconName: "circle-user" | "globe";
	id: string;
	label: string;
};

export type ChatCategoryManagerVariant = "current" | "favorite" | "global";
export type CategoryActionMode = "delete" | "rename";

export interface CategoryActionDrawerState {
	category: ChatCategory;
	mode: CategoryActionMode;
}

export interface ChatCategoryOwnerScope {
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

export function createGlobalScope(): ChatCategoryScope {
	return {
		ownerId: null,
		ownerType: null,
		scope: "global",
	};
}

export function createOwnerScope(
	ownerScope: ChatCategoryOwnerScope,
): ChatCategoryScope {
	return {
		ownerId: ownerScope.ownerId,
		ownerType: ownerScope.ownerType,
		scope: "owner",
	};
}

export function createOwnerScopeOption(
	ownerScope: ChatCategoryOwnerScope,
): CategoryScopeOption {
	return {
		icon: CircleUser,
		iconName: "circle-user",
		label: translateAstra(
			ownerScope.ownerType === "group"
				? "astraMainInterface.categories.scope.group"
				: "astraMainInterface.categories.scope.character",
		),
		value: createOwnerScope(ownerScope),
	};
}

export function createGlobalScopeOption(): CategoryScopeOption {
	return {
		icon: Globe,
		iconName: "globe",
		label: translateAstra("astraMainInterface.categories.scope.global"),
		value: createGlobalScope(),
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

export function useCategorySnapshot(store: ChatCategoryStore) {
	return React.useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot,
	);
}

export function getCategoryErrorMessage(reason: string) {
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

export function areIdSetsEqual(
	left: readonly string[],
	right: readonly string[],
) {
	if (left.length !== right.length) {
		return false;
	}

	const rightSet = new Set(right);
	return left.every((id) => rightSet.has(id));
}

export function normalizeOwnerLabel(entry: ChatCatalogEntry) {
	return (
		entry.entityName.trim() ||
		translateAstra("astraMainInterface.chatMenu.untitledChat")
	);
}

export function resolveChatLabel(entry: ChatCatalogEntry) {
	return (
		entry.chatId ||
		entry.fileName ||
		translateAstra("astraMainInterface.chatMenu.untitledChat")
	);
}

export function getEntriesByKey(entries: ChatCatalogEntry[]) {
	return new Map(entries.map((entry) => [entry.key, entry] as const));
}

export function getCategoryEntries({
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

export function buildScopeOptions(
	ownerScope?: ChatCategoryOwnerScope | null,
): CategoryScopeOption[] {
	const options: CategoryScopeOption[] = [];

	if (ownerScope) {
		options.push(createOwnerScopeOption(ownerScope));
	}

	options.push(createGlobalScopeOption());

	return options;
}

export function buildCategoryPageCreateScopeOptions({
	ownerScope,
	variant,
}: {
	ownerScope?: ChatCategoryOwnerScope | null;
	variant: ChatCategoryManagerVariant;
}): CategoryScopeOption[] {
	if (variant === "global") {
		return [createGlobalScopeOption()];
	}

	return ownerScope ? [createOwnerScopeOption(ownerScope)] : [];
}

export function getCategoryPageCreateKey(
	ownerScope: ChatCategoryOwnerScope | null | undefined,
	field: "add" | "inputLabel" | "placeholder",
): I18nKey {
	if (ownerScope?.ownerType === "group") {
		switch (field) {
			case "add":
				return "astraMainInterface.categories.create.group.add";
			case "inputLabel":
				return "astraMainInterface.categories.create.group.inputLabel";
			case "placeholder":
				return "astraMainInterface.categories.create.group.placeholder";
		}
	}

	switch (field) {
		case "add":
			return "astraMainInterface.categories.create.character.add";
		case "inputLabel":
			return "astraMainInterface.categories.create.character.inputLabel";
		case "placeholder":
			return "astraMainInterface.categories.create.character.placeholder";
	}
}

export function getScopeOptionKey(scope: ChatCategoryScope) {
	return scope.scope === "global"
		? "global"
		: `${scope.ownerType}:${scope.ownerId}`;
}

export function getCategoryGroups({
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

export function getCategoryScopeLabelKey(category: ChatCategory): I18nKey {
	if (category.scope === "global") {
		return "astraMainInterface.categories.scope.global";
	}

	return category.ownerType === "group"
		? "astraMainInterface.categories.scope.group"
		: "astraMainInterface.categories.scope.character";
}

export function getCategoryScopeIcon(category: ChatCategory) {
	return category.scope === "global" ? Globe : CircleUser;
}

export function useDelayedDrawerContentMount(isOpen: boolean) {
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
