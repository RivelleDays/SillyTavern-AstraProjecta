import * as React from "react";

import { ScrollArea } from "@/components/ui/astra/scroll-area";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import { Globe2, UserRound } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import {
	FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE,
	FAVORITE_CHAT_ENTITY_GLOBAL_SCOPE_VALUE,
	type FavoriteChatEntitiesSnapshot,
	type FavoriteChatEntitiesStore,
	type FavoriteChatEntity,
	type FavoriteChatEntityNavigationScopeValue,
} from "@/packages/core/st/favorite-chat-entities";

export type AstraMainInterfaceScopeValue =
	FavoriteChatEntityNavigationScopeValue;

export interface AstraMainInterfaceScopeStripProps {
	className?: string;
	currentIdentitySnapshot: CurrentChatIdentitySnapshot;
	favoriteChatEntitiesStore?: FavoriteChatEntitiesStore | null;
	onValueChange(value: AstraMainInterfaceScopeValue): void;
	value: AstraMainInterfaceScopeValue;
}

const EMPTY_FAVORITE_SNAPSHOT: FavoriteChatEntitiesSnapshot = {
	currentScopeValue: null,
	entities: [],
	excludedCurrentEntity: null,
	limit: 25,
	totalFavoriteCount: 0,
	updatedAt: 0,
};

export function resolveAstraMainInterfaceScopeTitle({
	currentIdentitySnapshot,
	favoriteChatEntitiesSnapshot,
	value,
}: {
	currentIdentitySnapshot: CurrentChatIdentitySnapshot;
	favoriteChatEntitiesSnapshot?: FavoriteChatEntitiesSnapshot | null;
	value: AstraMainInterfaceScopeValue;
}) {
	if (value === FAVORITE_CHAT_ENTITY_GLOBAL_SCOPE_VALUE) {
		return translateAstra("astraMainInterface.title.global");
	}

	if (value === FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE) {
		return resolveCurrentScopeLabel(currentIdentitySnapshot);
	}

	const favoriteSnapshot = favoriteChatEntitiesSnapshot ?? null;
	const favoriteEntity =
		favoriteSnapshot?.entities.find(
			(entity) => entity.scopeValue === value,
		) ??
		(favoriteSnapshot?.excludedCurrentEntity?.scopeValue === value
			? favoriteSnapshot.excludedCurrentEntity
			: null);
	const favoriteName = favoriteEntity?.entityName.trim();

	return favoriteName || translateAstra("astraMainInterface.title");
}

function useFavoriteChatEntitiesSnapshot(
	store: FavoriteChatEntitiesStore | null | undefined,
) {
	const subscribe = React.useCallback(
		(listener: () => void) =>
			store?.subscribe(listener) ?? (() => undefined),
		[store],
	);
	const getSnapshot = React.useCallback(
		() => store?.getSnapshot() ?? EMPTY_FAVORITE_SNAPSHOT,
		[store],
	);

	return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function resolveCurrentScopeLabel(snapshot: CurrentChatIdentitySnapshot) {
	if (snapshot.hasActiveChat && snapshot.entityName.trim()) {
		return snapshot.entityName.trim();
	}

	return translateAstra("astraMainInterface.sections.currentContext");
}

function resolveFallbackText(label: string) {
	return label.trim().charAt(0).toLocaleUpperCase() || "?";
}

function ScopeButton({
	children,
	className,
	label,
	onSelect,
	selected,
	value,
}: {
	children: React.ReactNode;
	className?: string;
	label: string;
	onSelect(value: AstraMainInterfaceScopeValue): void;
	selected: boolean;
	value: AstraMainInterfaceScopeValue;
}) {
	return (
		<button
			aria-label={label}
			aria-selected={selected}
			className={cn(
				"astra-main-interface__scope-button",
				selected && "astra-main-interface__scope-button--active",
				className,
			)}
			data-scope-value={value}
			data-state={selected ? "active" : "inactive"}
			role="tab"
			title={label}
			type="button"
			onClick={() => {
				onSelect(value);
			}}
		>
			<span className="astra-main-interface__scope-button-frame">
				{children}
			</span>
			<span
				aria-hidden={true}
				className="astra-main-interface__scope-active-dot"
			/>
		</button>
	);
}

function FavoriteScopeButton({
	entity,
	onSelect,
	selected,
}: {
	entity: FavoriteChatEntity;
	onSelect(value: AstraMainInterfaceScopeValue): void;
	selected: boolean;
}) {
	return (
		<ScopeButton
			className={cn(
				"astra-main-interface__scope-button--favorite",
				`astra-main-interface__scope-button--${entity.kind}`,
			)}
			label={entity.entityName}
			selected={selected}
			value={entity.scopeValue}
			onSelect={onSelect}
		>
			<AstraChatAvatar
				alt={entity.entityName}
				avatarUrl={entity.avatarUrl}
				className="astra-main-interface__scope-avatar"
				fallbackText={resolveFallbackText(entity.entityName)}
				groupAvatarUrls={entity.groupAvatarUrls}
				imageClassName="astra-main-interface__scope-avatar-image"
				loading="lazy"
			/>
		</ScopeButton>
	);
}

export function AstraMainInterfaceScopeStrip({
	className,
	currentIdentitySnapshot,
	favoriteChatEntitiesStore,
	onValueChange,
	value,
}: AstraMainInterfaceScopeStripProps) {
	const favoritesSnapshot = useFavoriteChatEntitiesSnapshot(
		favoriteChatEntitiesStore,
	);
	const currentLabel = resolveCurrentScopeLabel(currentIdentitySnapshot);
	const hasCurrentAvatar =
		currentIdentitySnapshot.thumbnailUrl ||
		currentIdentitySnapshot.groupAvatarUrls.length > 0;

	return (
		<div
			aria-label={translateAstra("astraMainInterface.sections.label")}
			className={cn("astra-main-interface__scope-strip", className)}
			id="astra-main-interface-scope-strip"
			role="tablist"
		>
			<div
				className="astra-main-interface__scope-pinned"
				id="astra-main-interface-scope-pinned"
			>
				<ScopeButton
					className="astra-main-interface__scope-button--global"
					label={translateAstra("astraMainInterface.sections.global")}
					selected={value === FAVORITE_CHAT_ENTITY_GLOBAL_SCOPE_VALUE}
					value={FAVORITE_CHAT_ENTITY_GLOBAL_SCOPE_VALUE}
					onSelect={onValueChange}
				>
					<UiIcon
						aria-hidden={true}
						className="astra-main-interface__scope-icon"
						icon={Globe2}
						size="sm"
					/>
				</ScopeButton>
				<ScopeButton
					className="astra-main-interface__scope-button--current"
					label={currentLabel}
					selected={
						value ===
						FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE
					}
					value={FAVORITE_CHAT_ENTITY_CURRENT_CONTEXT_SCOPE_VALUE}
					onSelect={onValueChange}
				>
					{hasCurrentAvatar ? (
						<AstraChatAvatar
							alt={currentLabel}
							avatarUrl={currentIdentitySnapshot.thumbnailUrl}
							className="astra-main-interface__scope-avatar"
							fallbackText={resolveFallbackText(currentLabel)}
							groupAvatarUrls={
								currentIdentitySnapshot.groupAvatarUrls
							}
							imageClassName="astra-main-interface__scope-avatar-image"
							loading="eager"
						/>
					) : (
						<UiIcon
							aria-hidden={true}
							className="astra-main-interface__scope-icon"
							icon={UserRound}
							size="sm"
						/>
					)}
				</ScopeButton>
			</div>

			<div
				aria-hidden={true}
				className="astra-main-interface__scope-divider"
				id="astra-main-interface-scope-divider"
			/>

			<ScrollArea.Root
				className="astra-main-interface__scope-favorites"
				id="astra-main-interface-scope-favorites"
			>
				<ScrollArea.Viewport
					className="astra-main-interface__scope-favorites-viewport"
					id="astra-main-interface-scope-favorites-viewport"
				>
					<ScrollArea.Content
						className="astra-main-interface__scope-favorites-content"
						id="astra-main-interface-scope-favorites-content"
					>
						{favoritesSnapshot.entities.map((entity) => (
							<FavoriteScopeButton
								entity={entity}
								key={entity.scopeValue}
								selected={value === entity.scopeValue}
								onSelect={onValueChange}
							/>
						))}
					</ScrollArea.Content>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar
					className="astra-main-interface__scope-favorites-scrollbar"
					id="astra-main-interface-scope-favorites-scrollbar"
					keepMounted={true}
					orientation="horizontal"
				>
					<ScrollArea.Thumb />
				</ScrollArea.Scrollbar>
				<ScrollArea.Corner />
			</ScrollArea.Root>
		</div>
	);
}
