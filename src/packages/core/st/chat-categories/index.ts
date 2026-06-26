import { getStContext } from "@/packages/core/st/context";
import {
	asTrimmedIdentifier,
	asTrimmedString,
	isRecord,
	readContextSafe,
} from "@/packages/core/st/shared";

type Listener = () => void;

type ChatCategoryOwnerType = "character" | "group";
type ChatCategoryScopeValue = "global" | "owner";
type ChatCategoryNameValidationFailure = "empty" | "invalid-name";

type StChatCategoriesContextLike = Record<string, unknown> & {
	extensionSettings?: unknown;
	saveSettingsDebounced?: () => unknown;
};

type ChatCategoriesRoot = {
	categories: {
		byId: Record<string, ChatCategory>;
		chatOrder: Record<string, string[]>;
		order: {
			global: string[];
			owner: Record<string, string[]>;
		};
	};
	chatMap: Record<string, string[]>;
	version: 1;
};

type ScopedCategoryLookup = {
	global: ChatCategory[];
	owner: ChatCategory[];
};

export const CHAT_CATEGORIES_CHANGE_EVENT =
	"astra-projecta:chat-categories-changed";
export const CHAT_CATEGORIES_SETTINGS_KEY = "chatCategories";
export const CHAT_CATEGORIES_MODULE_KEY = "astra_projecta";
const CHAT_CATEGORY_NAME_MAX_CODE_POINTS = 64;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/;

export type ChatCategoryScope =
	| {
			ownerId: null;
			ownerType: null;
			scope: "global";
	  }
	| {
			ownerId: string;
			ownerType: ChatCategoryOwnerType;
			scope: "owner";
	  };

export interface ChatCategory {
	id: string;
	name: string;
	nameKey: string;
	ownerId: string | null;
	ownerType: ChatCategoryOwnerType | null;
	scope: ChatCategoryScopeValue;
}

export interface ChatCategoriesSnapshot {
	categories: ChatCategory[];
	chatMap: Record<string, string[]>;
	updatedAt: number;
}

export type CreateChatCategoryResult =
	| {
			category: ChatCategory;
			ok: true;
	  }
	| {
			category?: ChatCategory;
			ok: false;
			reason: "duplicate" | "empty" | "invalid-name" | "invalid-scope";
	  };

export type RenameChatCategoryResult =
	| {
			category: ChatCategory;
			ok: true;
	  }
	| {
			category?: ChatCategory;
			ok: false;
			reason:
				| "duplicate"
				| "empty"
				| "invalid-name"
				| "missing"
				| "unchanged";
	  };

export interface ChatCategoryStore {
	createCategory(
		input: {
			name: string;
		} & Partial<ChatCategoryScope>,
	): CreateChatCategoryResult;
	deleteCategory(id: string): boolean;
	dispose(): void;
	getCategoryChatKeys(categoryId: string): string[];
	getChatCategoryIds(chatKey: string): string[];
	getSnapshot(): ChatCategoriesSnapshot;
	getVisibleCategories(scope?: Partial<ChatCategoryScope>): {
		all: ChatCategory[];
		global: ChatCategory[];
		owner: ChatCategory[];
	};
	moveChatKey(previousChatKey: string, nextChatKey: string): boolean;
	removeChatKey(chatKey: string): boolean;
	renameCategory(id: string, nextName: string): RenameChatCategoryResult;
	setCategoryOrder(
		scope: Partial<ChatCategoryScope>,
		nextOrder: string[],
	): string[];
	setCategoryChatOrder(categoryId: string, nextOrder: string[]): string[];
	setChatCategoryIds(chatKey: string, categoryIds: string[]): boolean;
	subscribe(listener: Listener): () => void;
	toggleChatCategory(
		chatKey: string,
		categoryId: string,
		shouldHave?: boolean,
	): boolean;
}

export interface CreateChatCategoryStoreOptions {
	createId?: () => string;
	eventTarget?: Pick<
		EventTarget,
		"addEventListener" | "dispatchEvent" | "removeEventListener"
	>;
	getContext?: () => unknown;
	now?: () => number;
}

function createEmptyRoot(): ChatCategoriesRoot {
	return {
		categories: {
			byId: {},
			chatOrder: {},
			order: {
				global: [],
				owner: {},
			},
		},
		chatMap: {},
		version: 1,
	};
}

function createDefaultId(): string {
	if (typeof globalThis.crypto?.randomUUID === "function") {
		return `cat_${globalThis.crypto.randomUUID()}`;
	}

	return `cat_${Date.now().toString(36)}_${Math.random()
		.toString(36)
		.slice(2, 8)}`;
}

function countCodePoints(value: string): number {
	return Array.from(value).length;
}

function validateCategoryName(value: unknown):
	| {
			name: string;
			ok: true;
	  }
	| {
			ok: false;
			reason: ChatCategoryNameValidationFailure;
	  } {
	const name = asTrimmedString(value);
	if (!name) {
		return { ok: false, reason: "empty" };
	}

	if (
		countCodePoints(name) > CHAT_CATEGORY_NAME_MAX_CODE_POINTS ||
		CONTROL_CHARACTER_PATTERN.test(name)
	) {
		return { ok: false, reason: "invalid-name" };
	}

	return { name, ok: true };
}

function normalizeName(value: unknown): string {
	const result = validateCategoryName(value);
	return result.ok ? result.name : "";
}

function normalizeNameKey(value: unknown): string {
	return normalizeName(value).toLocaleLowerCase();
}

function normalizeChatKey(value: unknown): string {
	return asTrimmedString(value);
}

function isOwnerType(value: unknown): value is ChatCategoryOwnerType {
	return value === "character" || value === "group";
}

function getOwnerKey(ownerType: unknown, ownerId: unknown): string | null {
	if (!isOwnerType(ownerType)) {
		return null;
	}

	const id = asTrimmedIdentifier(ownerId);
	return id ? `${ownerType}:${id}` : null;
}

function resolveInputScope(
	input: Partial<ChatCategoryScope>,
): ChatCategoryScope | null {
	if (input.scope === "global") {
		return {
			ownerId: null,
			ownerType: null,
			scope: "global",
		};
	}

	const wantsOwnerScope =
		input.scope === "owner" ||
		input.ownerType != null ||
		input.ownerId != null;

	if (wantsOwnerScope) {
		if (!isOwnerType(input.ownerType)) {
			return null;
		}

		const ownerId = asTrimmedIdentifier(input.ownerId);
		if (!ownerId) {
			return null;
		}

		return {
			ownerId,
			ownerType: input.ownerType,
			scope: "owner",
		};
	}

	return {
		ownerId: null,
		ownerType: null,
		scope: "global",
	};
}

function scopeFromCategory(category: ChatCategory): ChatCategoryScope {
	if (category.scope === "owner") {
		return {
			ownerId: category.ownerId ?? "",
			ownerType: category.ownerType ?? "character",
			scope: "owner",
		};
	}

	return {
		ownerId: null,
		ownerType: null,
		scope: "global",
	};
}

function normalizeStoredCategory(
	id: string,
	value: unknown,
): ChatCategory | null {
	if (!isRecord(value)) {
		return null;
	}

	const name = normalizeName(value.name);
	if (!name) {
		return null;
	}

	if (value.scope === "owner") {
		if (!isOwnerType(value.ownerType)) {
			return null;
		}

		const ownerId = asTrimmedIdentifier(value.ownerId);
		if (!ownerId) {
			return null;
		}

		return {
			id: asTrimmedIdentifier(value.id) || id,
			name,
			nameKey: normalizeNameKey(name),
			ownerId,
			ownerType: value.ownerType,
			scope: "owner",
		};
	}

	if (value.scope !== "global") {
		return null;
	}

	return {
		id: asTrimmedIdentifier(value.id) || id,
		name,
		nameKey: normalizeNameKey(name),
		ownerId: null,
		ownerType: null,
		scope: "global",
	};
}

function normalizeOrderList(
	list: unknown,
	fallbackIds: readonly string[],
): string[] {
	const allowed = new Set(fallbackIds);
	const seen = new Set<string>();
	const next: string[] = [];

	if (Array.isArray(list)) {
		for (const candidate of list) {
			const id = asTrimmedIdentifier(candidate);
			if (!id || !allowed.has(id) || seen.has(id)) {
				continue;
			}

			seen.add(id);
			next.push(id);
		}
	}

	for (const id of fallbackIds) {
		if (seen.has(id)) {
			continue;
		}

		seen.add(id);
		next.push(id);
	}

	return next;
}

function areStringArraysEqual(
	left: readonly string[],
	right: readonly string[],
): boolean {
	return (
		left.length === right.length &&
		left.every((entry, index) => entry === right[index])
	);
}

function compareCategories(left: ChatCategory, right: ChatCategory): number {
	return (
		left.name.localeCompare(right.name, undefined, {
			sensitivity: "base",
		}) || left.id.localeCompare(right.id)
	);
}

function orderCategoriesByIds(
	categories: ChatCategory[],
	orderedIds: readonly string[],
): ChatCategory[] {
	const remaining = new Map(
		categories.map((category) => [category.id, category] as const),
	);
	const ordered: ChatCategory[] = [];

	for (const id of orderedIds) {
		const category = remaining.get(id);
		if (!category) {
			continue;
		}

		ordered.push(category);
		remaining.delete(id);
	}

	if (remaining.size > 0) {
		ordered.push(...Array.from(remaining.values()).sort(compareCategories));
	}

	return ordered;
}

function normalizeRoot(rawRoot: unknown): ChatCategoriesRoot {
	const root = isRecord(rawRoot)
		? (rawRoot as Partial<ChatCategoriesRoot>)
		: {};
	const rawCategories: Record<string, unknown> = isRecord(root.categories)
		? root.categories
		: {};
	const rawById = isRecord(rawCategories.byId) ? rawCategories.byId : {};
	const byId: Record<string, ChatCategory> = {};

	for (const [id, value] of Object.entries(rawById)) {
		const category = normalizeStoredCategory(id, value);
		if (category) {
			byId[category.id] = category;
		}
	}

	const validCategoryIds = Object.keys(byId);
	const globalIds = Object.values(byId)
		.filter((category) => category.scope === "global")
		.sort(compareCategories)
		.map((category) => category.id);
	const ownerGroups = new Map<string, ChatCategory[]>();

	for (const category of Object.values(byId)) {
		if (category.scope !== "owner") {
			continue;
		}

		const ownerKey = getOwnerKey(category.ownerType, category.ownerId);
		if (!ownerKey) {
			continue;
		}

		const categories = ownerGroups.get(ownerKey) ?? [];
		categories.push(category);
		ownerGroups.set(ownerKey, categories);
	}

	const rawOrder: Record<string, unknown> = isRecord(rawCategories.order)
		? rawCategories.order
		: {};
	const rawOwnerOrder = isRecord(rawOrder.owner) ? rawOrder.owner : {};
	const ownerOrder: Record<string, string[]> = {};

	for (const [ownerKey, categories] of ownerGroups.entries()) {
		const fallbackIds = categories
			.sort(compareCategories)
			.map((category) => category.id);
		ownerOrder[ownerKey] = normalizeOrderList(
			rawOwnerOrder[ownerKey],
			fallbackIds,
		);
	}

	const validIdSet = new Set(validCategoryIds);
	const chatMap: Record<string, string[]> = {};
	const rawChatMap = isRecord(root.chatMap) ? root.chatMap : {};

	for (const [rawChatKey, rawCategoryIds] of Object.entries(rawChatMap)) {
		const chatKey = normalizeChatKey(rawChatKey);
		if (!chatKey || !Array.isArray(rawCategoryIds)) {
			continue;
		}

		const uniqueIds = Array.from(
			new Set(
				rawCategoryIds
					.map((categoryId) => asTrimmedIdentifier(categoryId))
					.filter((categoryId) => validIdSet.has(categoryId)),
			),
		);
		if (uniqueIds.length > 0) {
			chatMap[chatKey] = uniqueIds;
		}
	}

	const chatKeysByCategory = collectChatKeysByCategory(chatMap);
	const chatOrder: Record<string, string[]> = {};
	const rawChatOrder = isRecord(rawCategories.chatOrder)
		? rawCategories.chatOrder
		: {};

	for (const categoryId of validCategoryIds) {
		const assignedKeys = chatKeysByCategory[categoryId] ?? [];
		const normalized = normalizeOrderList(
			rawChatOrder[categoryId],
			assignedKeys,
		);
		if (normalized.length > 0) {
			chatOrder[categoryId] = normalized;
		}
	}

	return {
		categories: {
			byId,
			chatOrder,
			order: {
				global: normalizeOrderList(rawOrder.global, globalIds),
				owner: ownerOrder,
			},
		},
		chatMap,
		version: 1,
	};
}

function collectChatKeysByCategory(
	chatMap: Record<string, string[]>,
): Record<string, string[]> {
	const result: Record<string, string[]> = {};

	for (const [chatKey, categoryIds] of Object.entries(chatMap)) {
		for (const categoryId of categoryIds) {
			const existing = result[categoryId] ?? [];
			if (!existing.includes(chatKey)) {
				existing.push(chatKey);
			}
			result[categoryId] = existing;
		}
	}

	return result;
}

function resolveSettingsRoot(
	context: StChatCategoriesContextLike | null,
): ChatCategoriesRoot | null {
	if (!context) {
		return null;
	}

	if (!isRecord(context.extensionSettings)) {
		context.extensionSettings = {};
	}

	const extensionSettings = context.extensionSettings as Record<
		string,
		unknown
	>;

	if (!isRecord(extensionSettings[CHAT_CATEGORIES_MODULE_KEY])) {
		extensionSettings[CHAT_CATEGORIES_MODULE_KEY] = {};
	}

	const moduleSettings = extensionSettings[
		CHAT_CATEGORIES_MODULE_KEY
	] as Record<string, unknown>;
	const root = normalizeRoot(moduleSettings[CHAT_CATEGORIES_SETTINGS_KEY]);
	moduleSettings[CHAT_CATEGORIES_SETTINGS_KEY] = root;
	return root;
}

function toSnapshot(root: ChatCategoriesRoot, updatedAt: number) {
	const order = root.categories.order;
	const byId = root.categories.byId;
	const globalCategories = orderCategoriesByIds(
		Object.values(byId).filter((category) => category.scope === "global"),
		order.global,
	);
	const ownerCategories = Object.entries(order.owner)
		.sort(([left], [right]) => left.localeCompare(right))
		.flatMap(([ownerKey, orderedIds]) =>
			orderCategoriesByIds(
				Object.values(byId).filter((category) => {
					const categoryOwnerKey = getOwnerKey(
						category.ownerType,
						category.ownerId,
					);
					return (
						category.scope === "owner" &&
						categoryOwnerKey === ownerKey
					);
				}),
				orderedIds,
			),
		);

	return {
		categories: [...globalCategories, ...ownerCategories],
		chatMap: Object.fromEntries(
			Object.entries(root.chatMap).map(([chatKey, categoryIds]) => [
				chatKey,
				[...categoryIds],
			]),
		),
		updatedAt,
	};
}

function cloneCategory(category: ChatCategory): ChatCategory {
	return { ...category };
}

function cloneCategories(categories: ChatCategory[]): ChatCategory[] {
	return categories.map(cloneCategory);
}

export function createChatCategoryStore({
	createId = createDefaultId,
	eventTarget = typeof window === "undefined" ? undefined : window,
	getContext = getStContext,
	now = Date.now,
}: CreateChatCategoryStoreOptions = {}): ChatCategoryStore {
	const listeners = new Set<Listener>();
	let disposed = false;
	let isDispatchingChange = false;
	let snapshotCache: ChatCategoriesSnapshot | null = null;
	let updatedAt = now();

	function getRootAndContext(): {
		context: StChatCategoriesContextLike | null;
		root: ChatCategoriesRoot;
	} {
		const context =
			readContextSafe<StChatCategoriesContextLike>(getContext);
		const root = resolveSettingsRoot(context) ?? createEmptyRoot();
		return { context, root };
	}

	function notify() {
		if (disposed) {
			return;
		}

		for (const listener of listeners) {
			listener();
		}
	}

	function handleExternalChange() {
		if (isDispatchingChange) {
			return;
		}

		updatedAt = now();
		snapshotCache = null;
		notify();
	}

	try {
		eventTarget?.addEventListener(
			CHAT_CATEGORIES_CHANGE_EVENT,
			handleExternalChange,
		);
	} catch {
		// Cross-surface sync is best-effort.
	}

	function persist(context: StChatCategoriesContextLike | null) {
		updatedAt = now();
		snapshotCache = null;

		try {
			context?.saveSettingsDebounced?.();
		} catch {
			// Settings writes are best-effort from extension UI.
		}

		notify();

		try {
			isDispatchingChange = true;
			eventTarget?.dispatchEvent(
				new CustomEvent(CHAT_CATEGORIES_CHANGE_EVENT),
			);
		} catch {
			// Cross-window notification is best-effort.
		} finally {
			isDispatchingChange = false;
		}
	}

	function findCategoryByName(
		root: ChatCategoriesRoot,
		name: string,
		scope: ChatCategoryScope,
	): ChatCategory | null {
		const nameKey = normalizeNameKey(name);
		if (!nameKey) {
			return null;
		}

		return (
			Object.values(root.categories.byId).find(
				(category) =>
					category.nameKey === nameKey &&
					category.scope === scope.scope &&
					category.ownerType === scope.ownerType &&
					category.ownerId === scope.ownerId,
			) ?? null
		);
	}

	function getScopedCategories(
		root: ChatCategoriesRoot,
		scope?: Partial<ChatCategoryScope>,
	): ScopedCategoryLookup {
		const inputScope = scope ? resolveInputScope(scope) : null;
		const all = Object.values(root.categories.byId);
		const global = orderCategoriesByIds(
			all.filter((category) => category.scope === "global"),
			root.categories.order.global,
		);

		if (!inputScope || inputScope.scope !== "owner") {
			return {
				global,
				owner: [],
			};
		}

		const ownerKey = getOwnerKey(inputScope.ownerType, inputScope.ownerId);
		const owner = orderCategoriesByIds(
			all.filter(
				(category) =>
					category.scope === "owner" &&
					category.ownerType === inputScope.ownerType &&
					category.ownerId === inputScope.ownerId,
			),
			ownerKey ? (root.categories.order.owner[ownerKey] ?? []) : [],
		);

		return {
			global,
			owner,
		};
	}

	function getAssignedChatKeys(
		root: ChatCategoriesRoot,
		categoryId: string,
	): string[] {
		if (!root.categories.byId[categoryId]) {
			return [];
		}

		const assigned = Object.entries(root.chatMap).flatMap(
			([chatKey, categoryIds]) =>
				categoryIds.includes(categoryId) ? [chatKey] : [],
		);
		return normalizeOrderList(
			root.categories.chatOrder[categoryId],
			assigned,
		);
	}

	function removeCategoryFromChatOrders(
		root: ChatCategoriesRoot,
		categoryId: string,
	) {
		delete root.categories.chatOrder[categoryId];
		for (const [chatKey, categoryIds] of Object.entries(root.chatMap)) {
			const nextIds = categoryIds.filter((id) => id !== categoryId);
			if (nextIds.length > 0) {
				root.chatMap[chatKey] = nextIds;
			} else {
				delete root.chatMap[chatKey];
			}
		}
	}

	return {
		createCategory(input) {
			const nameResult = validateCategoryName(input.name);
			if (!nameResult.ok) {
				return { ok: false, reason: nameResult.reason };
			}
			const name = nameResult.name;

			const scope = resolveInputScope(input);
			if (!scope) {
				return { ok: false, reason: "invalid-scope" };
			}

			const { context, root } = getRootAndContext();
			const existing = findCategoryByName(root, name, scope);
			if (existing) {
				return {
					category: cloneCategory(existing),
					ok: false,
					reason: "duplicate",
				};
			}

			const id = createId();
			const category: ChatCategory = {
				id,
				name,
				nameKey: normalizeNameKey(name),
				ownerId: scope.ownerId,
				ownerType: scope.ownerType,
				scope: scope.scope,
			};

			root.categories.byId[id] = category;
			if (scope.scope === "global") {
				root.categories.order.global.push(id);
			} else {
				const ownerKey = getOwnerKey(scope.ownerType, scope.ownerId);
				if (ownerKey) {
					const ownerOrder =
						root.categories.order.owner[ownerKey] ?? [];
					ownerOrder.push(id);
					root.categories.order.owner[ownerKey] = ownerOrder;
				}
			}

			persist(context);
			return { category: cloneCategory(category), ok: true };
		},

		deleteCategory(id) {
			const categoryId = asTrimmedIdentifier(id);
			if (!categoryId) {
				return false;
			}

			const { context, root } = getRootAndContext();
			const category = root.categories.byId[categoryId];
			if (!category) {
				return false;
			}

			delete root.categories.byId[categoryId];
			root.categories.order.global = root.categories.order.global.filter(
				(entry) => entry !== categoryId,
			);
			for (const [ownerKey, orderedIds] of Object.entries(
				root.categories.order.owner,
			)) {
				const nextIds = orderedIds.filter(
					(entry) => entry !== categoryId,
				);
				if (nextIds.length > 0) {
					root.categories.order.owner[ownerKey] = nextIds;
				} else {
					delete root.categories.order.owner[ownerKey];
				}
			}
			removeCategoryFromChatOrders(root, categoryId);
			persist(context);
			return true;
		},

		dispose() {
			disposed = true;
			try {
				eventTarget?.removeEventListener(
					CHAT_CATEGORIES_CHANGE_EVENT,
					handleExternalChange,
				);
			} catch {
				// Best-effort cleanup for injected event targets.
			}
			listeners.clear();
		},

		getCategoryChatKeys(categoryId) {
			const { root } = getRootAndContext();
			return getAssignedChatKeys(root, asTrimmedIdentifier(categoryId));
		},

		getChatCategoryIds(chatKey) {
			const key = normalizeChatKey(chatKey);
			if (!key) {
				return [];
			}

			const { root } = getRootAndContext();
			return [...(root.chatMap[key] ?? [])];
		},

		getSnapshot() {
			if (snapshotCache) {
				return snapshotCache;
			}

			const { root } = getRootAndContext();
			const snapshot = toSnapshot(root, updatedAt);
			snapshotCache = {
				categories: cloneCategories(snapshot.categories),
				chatMap: snapshot.chatMap,
				updatedAt: snapshot.updatedAt,
			};
			return snapshotCache;
		},

		getVisibleCategories(scope) {
			const { root } = getRootAndContext();
			const scoped = getScopedCategories(root, scope);
			return {
				all: cloneCategories([...scoped.owner, ...scoped.global]),
				global: cloneCategories(scoped.global),
				owner: cloneCategories(scoped.owner),
			};
		},

		moveChatKey(previousChatKey, nextChatKey) {
			const previousKey = normalizeChatKey(previousChatKey);
			const nextKey = normalizeChatKey(nextChatKey);
			if (!previousKey || !nextKey || previousKey === nextKey) {
				return false;
			}

			const { context, root } = getRootAndContext();
			const previousCategoryIds = root.chatMap[previousKey] ?? [];
			if (previousCategoryIds.length === 0) {
				return false;
			}

			const mergedIds = Array.from(
				new Set([
					...(root.chatMap[nextKey] ?? []),
					...previousCategoryIds,
				]),
			);
			root.chatMap[nextKey] = mergedIds;
			delete root.chatMap[previousKey];

			for (const [categoryId, orderedKeys] of Object.entries(
				root.categories.chatOrder,
			)) {
				const nextKeys = orderedKeys.map((chatKey) =>
					chatKey === previousKey ? nextKey : chatKey,
				);
				root.categories.chatOrder[categoryId] = Array.from(
					new Set(nextKeys),
				);
			}

			persist(context);
			return true;
		},

		removeChatKey(chatKey) {
			const key = normalizeChatKey(chatKey);
			if (!key) {
				return false;
			}

			const { context, root } = getRootAndContext();
			if (!root.chatMap[key]) {
				return false;
			}

			delete root.chatMap[key];
			for (const [categoryId, orderedKeys] of Object.entries(
				root.categories.chatOrder,
			)) {
				const nextKeys = orderedKeys.filter((entry) => entry !== key);
				if (nextKeys.length > 0) {
					root.categories.chatOrder[categoryId] = nextKeys;
				} else {
					delete root.categories.chatOrder[categoryId];
				}
			}

			persist(context);
			return true;
		},

		renameCategory(id, nextName) {
			const categoryId = asTrimmedIdentifier(id);
			const nameResult = validateCategoryName(nextName);
			if (!nameResult.ok) {
				return { ok: false, reason: nameResult.reason };
			}
			const name = nameResult.name;

			const { context, root } = getRootAndContext();
			const category = root.categories.byId[categoryId];
			if (!category) {
				return { ok: false, reason: "missing" };
			}

			const nameKey = normalizeNameKey(name);
			if (category.nameKey === nameKey) {
				return {
					category: cloneCategory(category),
					ok: false,
					reason: "unchanged",
				};
			}

			const duplicate = findCategoryByName(
				root,
				name,
				scopeFromCategory(category),
			);
			if (duplicate && duplicate.id !== category.id) {
				return {
					category: cloneCategory(duplicate),
					ok: false,
					reason: "duplicate",
				};
			}

			category.name = name;
			category.nameKey = nameKey;
			persist(context);
			return { category: cloneCategory(category), ok: true };
		},

		setCategoryOrder(scope, nextOrder) {
			const inputScope = resolveInputScope(scope);
			if (!inputScope) {
				return [];
			}

			const { context, root } = getRootAndContext();
			const scoped = getScopedCategories(root, inputScope);
			const fallbackIds =
				inputScope.scope === "global"
					? scoped.global.map((category) => category.id)
					: scoped.owner.map((category) => category.id);

			if (fallbackIds.length === 0) {
				return [];
			}

			const normalized = normalizeOrderList(nextOrder, fallbackIds);
			if (inputScope.scope === "global") {
				if (
					areStringArraysEqual(
						root.categories.order.global,
						normalized,
					)
				) {
					return normalized;
				}

				root.categories.order.global = normalized;
				persist(context);
				return normalized;
			}

			const ownerKey = getOwnerKey(
				inputScope.ownerType,
				inputScope.ownerId,
			);
			if (!ownerKey) {
				return [];
			}

			const previousOrder = root.categories.order.owner[ownerKey] ?? [];
			if (areStringArraysEqual(previousOrder, normalized)) {
				return normalized;
			}

			root.categories.order.owner[ownerKey] = normalized;
			persist(context);
			return normalized;
		},

		setCategoryChatOrder(categoryId, nextOrder) {
			const id = asTrimmedIdentifier(categoryId);
			const { context, root } = getRootAndContext();
			if (!id || !root.categories.byId[id]) {
				return [];
			}

			const normalized = normalizeOrderList(
				nextOrder,
				Object.entries(root.chatMap).flatMap(
					([chatKey, categoryIds]) =>
						categoryIds.includes(id) ? [chatKey] : [],
				),
			);
			if (normalized.length > 0) {
				root.categories.chatOrder[id] = normalized;
			} else {
				delete root.categories.chatOrder[id];
			}

			persist(context);
			return normalized;
		},

		setChatCategoryIds(chatKey, categoryIds) {
			const key = normalizeChatKey(chatKey);
			if (!key) {
				return false;
			}

			const { context, root } = getRootAndContext();
			const validIds = new Set(Object.keys(root.categories.byId));
			const nextIds = Array.from(
				new Set(
					categoryIds
						.map((categoryId) => asTrimmedIdentifier(categoryId))
						.filter((categoryId) => validIds.has(categoryId)),
				),
			);
			const previousIds = root.chatMap[key] ?? [];
			const previousSet = new Set(previousIds);
			const nextSet = new Set(nextIds);

			for (const categoryId of previousSet) {
				if (nextSet.has(categoryId)) {
					continue;
				}

				const nextOrder = (
					root.categories.chatOrder[categoryId] ?? []
				).filter((entry) => entry !== key);
				if (nextOrder.length > 0) {
					root.categories.chatOrder[categoryId] = nextOrder;
				} else {
					delete root.categories.chatOrder[categoryId];
				}
			}

			for (const categoryId of nextSet) {
				if (previousSet.has(categoryId)) {
					continue;
				}

				const order = root.categories.chatOrder[categoryId] ?? [];
				if (!order.includes(key)) {
					root.categories.chatOrder[categoryId] = [...order, key];
				}
			}

			if (nextIds.length > 0) {
				root.chatMap[key] = nextIds;
			} else {
				delete root.chatMap[key];
			}

			persist(context);
			return true;
		},

		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		toggleChatCategory(chatKey, categoryId, shouldHave) {
			const key = normalizeChatKey(chatKey);
			const id = asTrimmedIdentifier(categoryId);
			if (!key || !id) {
				return false;
			}

			const currentIds = this.getChatCategoryIds(key);
			const current = new Set(currentIds);
			const nextValue =
				shouldHave === undefined ? !current.has(id) : shouldHave;

			if (nextValue) {
				current.add(id);
			} else {
				current.delete(id);
			}

			return this.setChatCategoryIds(key, Array.from(current));
		},
	};
}
