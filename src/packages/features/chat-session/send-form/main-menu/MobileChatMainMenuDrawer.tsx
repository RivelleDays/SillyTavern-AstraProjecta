import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	preloadProviderSvgIcon,
	ProviderSvgIcon,
} from "@/components/ui/shared/provider-svg-icon";
import {
	ArrowRightLeft,
	Brain,
	Bookmark,
	Bolt,
	Bot,
	DatabaseZap,
	NotebookPen,
	PencilLine,
	Trash2,
} from "@/components/ui/shared/icons";
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/astra/drawer";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import type { ChatContextUsageSnapshot } from "@/packages/core/st/chatContextUsage";
import type { CurrentConnectionInfoSnapshot } from "@/packages/core/st/currentConnectionInfo";
import type { CurrentChatInfoSnapshot } from "@/packages/core/st/currentChatInfo";
import type { CurrentPresetProfileControlsSnapshot } from "@/packages/core/st/currentPresetProfileControls";
import type { CurrentUserAvatarSnapshot } from "@/packages/core/st/currentUserAvatar";
import {
	SILLYTAVERN_INTERFACE_ROUTES,
	type SillyTavernInterfaceRouteKey,
} from "@/app/shared/sillytavern-interface";
import type { SendFormSillyTavernInterfaceAdapter } from "@/packages/features/chat-session/send-form/contracts/sillyTavernInterface";
import {
	ASTRA_CHAT_MAIN_MENU_DRAWER_BODY_ID,
	ASTRA_CHAT_MAIN_MENU_DRAWER_CONTENT_ID,
	ASTRA_CHAT_MAIN_MENU_DRAWER_DESCRIPTION_ID,
	ASTRA_CHAT_MAIN_MENU_DRAWER_FOOTER_ID,
	ASTRA_CHAT_MAIN_MENU_DRAWER_HEADER_ID,
	ASTRA_CHAT_MAIN_MENU_DRAWER_ID,
	ASTRA_CHAT_MAIN_MENU_DRAWER_SCROLLABLE_CONTENT_ID,
	ASTRA_CHAT_MAIN_MENU_DRAWER_TITLE_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";
import {
	formatContextUsagePercent,
	formatContextUsageTokenCount,
	hasUsableContextUsage,
} from "@/packages/features/chat-session/send-form/context-usage/presentation";
import { MobileChatMainMenuDrawerControls } from "@/packages/features/chat-session/send-form/main-menu/MobileChatMainMenuDrawerControls";
import {
	ASTRA_CHAT_MAIN_MENU_TILES,
	splitMobileChatMainMenuTileLabel,
} from "@/packages/features/chat-session/send-form/main-menu/tiles";
import { MobileChatMainMenuDrawerDetails } from "@/packages/features/chat-session/send-form/main-menu/MobileChatMainMenuDrawerDetails";

const ASTRA_CHAT_MAIN_MENU_HEADER_ACTIONS = [
	{
		key: "delete",
		icon: Trash2,
		labelKey: "sendForm.mainMenu.action.deleteChat",
	},
	{
		key: "categories",
		icon: Bookmark,
		labelKey: "sendForm.mainMenu.action.editCategories",
	},
	{
		key: "rename",
		icon: PencilLine,
		labelKey: "sendForm.mainMenu.action.renameChat",
	},
] as const;

const ASTRA_CHAT_MAIN_MENU_CURRENT_USER_ACTIONS = [
	{
		icon: NotebookPen,
		key: "chatSettingsOverride",
		labelKey: "sendForm.mainMenu.currentUser.action.chatSettingsOverride",
		sillyTavernInterfacePageKey: undefined,
	},
	{
		icon: ArrowRightLeft,
		key: "personaSwitch",
		labelKey: "sendForm.mainMenu.currentUser.action.personaSwitch",
		sillyTavernInterfacePageKey: undefined,
	},
	{
		icon: Bolt,
		key: "personaManagement",
		labelKey: "sendForm.mainMenu.currentUser.action.personaManagement",
		sillyTavernInterfacePageKey:
			SILLYTAVERN_INTERFACE_ROUTES.personaManagement,
	},
] as const;

function getContextUsageSummaryText(
	snapshot: ChatContextUsageSnapshot,
): string {
	return `${formatContextUsagePercent(snapshot.usagePercent)} (${formatContextUsageTokenCount(snapshot.usedContextTokens)} / ${formatContextUsageTokenCount(snapshot.maxContextTokens)})`;
}

function renderContextUsageSummary(
	snapshot: ChatContextUsageSnapshot,
): React.ReactElement {
	return (
		<>
			<span className="astra-chat-main-menu-drawer__detail-usage-percent">
				{formatContextUsagePercent(snapshot.usagePercent)}
			</span>
			<span className="astra-chat-main-menu-drawer__detail-usage-counts">
				({formatContextUsageTokenCount(snapshot.usedContextTokens)} /{" "}
				{formatContextUsageTokenCount(snapshot.maxContextTokens)})
			</span>
		</>
	);
}

function getChatInfoHelperText(snapshot: CurrentChatInfoSnapshot): string {
	if (
		snapshot.metadataStatus === "pending" &&
		snapshot.lastUpdatedAt === null
	) {
		return translateAstra(
			snapshot.metadataReason === "context-not-ready"
				? "sendForm.mainMenu.meta.waitingForContext"
				: "sendForm.mainMenu.meta.loading",
		);
	}

	if (snapshot.metadataStatus === "stale") {
		return translateAstra("sendForm.mainMenu.meta.stale");
	}

	if (snapshot.metadataStatus === "unavailable") {
		return translateAstra("sendForm.mainMenu.meta.unavailable");
	}

	return "";
}

function getCurrentUserSubtitle(snapshot: CurrentUserAvatarSnapshot): {
	labelKey:
		| "sendForm.mainMenu.currentUser.personaName"
		| "sendForm.mainMenu.currentUser.personaTitle";
	value: string;
} | null {
	if (snapshot.personaTitle) {
		return {
			labelKey: "sendForm.mainMenu.currentUser.personaTitle",
			value: snapshot.personaTitle,
		};
	}

	if (snapshot.personaName && snapshot.personaName !== snapshot.displayName) {
		return {
			labelKey: "sendForm.mainMenu.currentUser.personaName",
			value: snapshot.personaName,
		};
	}

	return null;
}

function getAvatarFallbackText(snapshot: CurrentUserAvatarSnapshot): string {
	const source = snapshot.displayName || snapshot.personaName;
	const parts = source
		.split(/\s+/)
		.map((part) => part.trim())
		.filter(Boolean);

	if (parts.length === 0) {
		return "?";
	}

	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}

	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function canRequestChatSettingsOverride(
	snapshot: CurrentChatIdentitySnapshot,
): boolean {
	return (
		snapshot.hasActiveChat &&
		(snapshot.kind === "character" || snapshot.kind === "group")
	);
}

export function MobileChatMainMenuDrawer({
	chatContextUsageSnapshot,
	chatInfoSnapshot,
	controlsBusy = false,
	currentConnectionSnapshot,
	currentPresetProfileControlsSnapshot,
	currentUserSnapshot,
	onConnectionProfileChange,
	onSillyTavernInterfaceShortcutSelect,
	onRequestChatSettingsOverride,
	open,
	onOpenChange,
	onRequestCategories,
	onRequestDelete,
	onRequestRename,
	renderSillyTavernInterfaceRouteIcon = () => null,
	snapshot,
}: {
	chatContextUsageSnapshot: ChatContextUsageSnapshot;
	chatInfoSnapshot: CurrentChatInfoSnapshot;
	controlsBusy?: boolean;
	currentConnectionSnapshot?: CurrentConnectionInfoSnapshot;
	currentPresetProfileControlsSnapshot?: CurrentPresetProfileControlsSnapshot;
	currentUserSnapshot?: CurrentUserAvatarSnapshot;
	onConnectionProfileChange?(profileId: string): void;
	onOpenChange(nextValue: boolean): void;
	onSillyTavernInterfaceShortcutSelect?(
		pageKey: SillyTavernInterfaceRouteKey,
	): void;
	onRequestChatSettingsOverride?(): void;
	onRequestCategories?(): void;
	onRequestDelete?(): void;
	onRequestRename?(): void;
	open: boolean;
	renderSillyTavernInterfaceRouteIcon?: SendFormSillyTavernInterfaceAdapter["renderRouteIcon"];
	snapshot: CurrentChatIdentitySnapshot;
}) {
	const [isDrawerHostMounted, setIsDrawerHostMounted] = React.useState(open);
	const title = translateAstra("sendForm.mainMenu.title");
	const description = translateAstra("sendForm.mainMenu.description");
	const avatarLabel = translateAstra("sendForm.mainMenu.avatar");
	const emptyStateLabel = translateAstra("sendForm.mainMenu.empty");
	const apiRowLabel = translateAstra("sendForm.mainMenu.meta.api");
	const modelLabel = translateAstra("sendForm.mainMenu.meta.model");
	const modelTitle = translateAstra("sendForm.mainMenu.meta.modelTitle");
	const currentUserActionsLabel = translateAstra(
		"sendForm.mainMenu.currentUser.actions",
	);
	const currentUserAvatarLabel = translateAstra(
		"sendForm.avatar.currentUser",
	);
	const currentUserCardLabel = translateAstra(
		"sendForm.mainMenu.currentUser.card",
	);
	const contextUsageLabel = translateAstra("sendForm.contextUsage.title");
	const displayName = snapshot.hasActiveChat
		? snapshot.entityName
		: emptyStateLabel;
	const currentUserSubtitle = currentUserSnapshot
		? getCurrentUserSubtitle(currentUserSnapshot)
		: null;
	const hasCurrentUserCard = Boolean(currentUserSnapshot?.displayName);
	const hasCurrentConnectionDetail = Boolean(
		currentConnectionSnapshot?.status === "ready" &&
		currentConnectionSnapshot?.hasActiveConnection &&
		currentConnectionSnapshot.apiLabel &&
		currentConnectionSnapshot.modelLabel,
	);
	React.useEffect(() => {
		preloadProviderSvgIcon(currentConnectionSnapshot?.apiIconKey ?? "");
	}, [currentConnectionSnapshot?.apiIconKey]);
	const hasModelDetail = Boolean(chatInfoSnapshot.dominantModel);
	const hasContextUsageDetail =
		chatInfoSnapshot.hasActiveChat &&
		hasUsableContextUsage(chatContextUsageSnapshot);
	const detailHelperText = getChatInfoHelperText(chatInfoSnapshot);
	const contextUsageSummaryText = hasContextUsageDetail
		? getContextUsageSummaryText(chatContextUsageSnapshot)
		: "";
	const detailRows: Array<{ key: string; node: React.ReactElement }> = [];

	if (hasCurrentConnectionDetail && currentConnectionSnapshot) {
		detailRows.push({
			key: "current-connection",
			node: (
				<dl
					aria-label={`${apiRowLabel}: ${currentConnectionSnapshot.apiLabel}, ${currentConnectionSnapshot.modelLabel}`}
					className="astra-chat-main-menu-drawer__detail-row astra-chat-main-menu-drawer__detail-connection-row"
					title={apiRowLabel}
				>
					<dt className="astra-chat-main-menu-drawer__detail-term">
						<UiIcon
							aria-hidden={true}
							className="astra-chat-main-menu-drawer__detail-icon"
							icon={Brain}
							size="xs"
						/>
						<span>{apiRowLabel}</span>
					</dt>
					<dd className="astra-chat-main-menu-drawer__detail-connection-summary">
						<span
							className="astra-chat-main-menu-drawer__detail-connection-provider"
							title={currentConnectionSnapshot.apiLabel}
						>
							<ProviderSvgIcon
								className="astra-chat-main-menu-drawer__detail-connection-provider-icon"
								iconKey={currentConnectionSnapshot.apiIconKey}
							/>
							<span className="astra-chat-main-menu-drawer__detail-connection-provider-label">
								{currentConnectionSnapshot.apiLabel}
							</span>
						</span>
						<span
							className="astra-chat-main-menu-drawer__detail-connection-model"
							title={currentConnectionSnapshot.modelLabel}
						>
							{currentConnectionSnapshot.modelLabel}
						</span>
					</dd>
				</dl>
			),
		});
	}

	if (hasModelDetail) {
		detailRows.push({
			key: "model",
			node: (
				<dl
					aria-label={`${modelTitle}: ${chatInfoSnapshot.dominantModel}`}
					className="astra-chat-main-menu-drawer__detail-row"
					title={modelTitle}
				>
					<dt className="astra-chat-main-menu-drawer__detail-term">
						<UiIcon
							aria-hidden={true}
							className="astra-chat-main-menu-drawer__detail-icon"
							icon={Bot}
							size="xs"
						/>
						<span>{modelLabel}</span>
					</dt>
					<dd
						className="astra-chat-main-menu-drawer__detail-definition"
						title={chatInfoSnapshot.dominantModel || undefined}
					>
						{chatInfoSnapshot.dominantModel}
					</dd>
				</dl>
			),
		});
	}

	if (hasContextUsageDetail) {
		detailRows.push({
			key: "context-usage",
			node: (
				<dl
					aria-label={`${contextUsageLabel}: ${contextUsageSummaryText}`}
					className="astra-chat-main-menu-drawer__detail-row astra-chat-main-menu-drawer__detail-context-row"
					title={`${contextUsageLabel}: ${contextUsageSummaryText}`}
				>
					<dt className="astra-chat-main-menu-drawer__detail-term">
						<UiIcon
							aria-hidden={true}
							className="astra-chat-main-menu-drawer__detail-icon"
							icon={DatabaseZap}
							size="xs"
						/>
						<span>{contextUsageLabel}</span>
					</dt>
					<dd className="astra-chat-main-menu-drawer__detail-context-summary">
						<span className="astra-chat-main-menu-drawer__detail-context-usage">
							{renderContextUsageSummary(
								chatContextUsageSnapshot,
							)}
						</span>
					</dd>
				</dl>
			),
		});
	}

	const hasDetailItems = detailRows.length > 0;
	const tiles = ASTRA_CHAT_MAIN_MENU_TILES.map((tile) => {
		const label = translateAstra(tile.labelKey);
		return {
			...tile,
			label,
			lines: splitMobileChatMainMenuTileLabel(label, tile.labelLines),
		};
	});

	React.useEffect(() => {
		if (open) {
			setIsDrawerHostMounted(true);
		}
	}, [open]);

	const handleExitComplete = React.useCallback(() => {
		setIsDrawerHostMounted(false);
	}, []);

	const shouldRenderDrawer = open || isDrawerHostMounted;

	if (!shouldRenderDrawer) {
		return null;
	}

	return (
		<Drawer
			direction="bottom"
			onExitComplete={handleExitComplete}
			onOpenChange={onOpenChange}
			open={open}
			repositionInputs={false}
		>
			<DrawerContent
				aria-describedby={ASTRA_CHAT_MAIN_MENU_DRAWER_DESCRIPTION_ID}
				aria-labelledby={ASTRA_CHAT_MAIN_MENU_DRAWER_TITLE_ID}
				id={ASTRA_CHAT_MAIN_MENU_DRAWER_ID}
				className="astra-chat-main-menu-drawer"
			>
				<DrawerHeader className="sr-only">
					<DrawerTitle asChild={true}>
						<div
							aria-hidden={true}
							className="astra-chat-main-menu-drawer__primitive-a11y-guard sr-only"
						/>
					</DrawerTitle>
					<DrawerDescription asChild={true}>
						<div
							aria-hidden={true}
							className="astra-chat-main-menu-drawer__primitive-a11y-guard sr-only"
						/>
					</DrawerDescription>
					<div
						id={ASTRA_CHAT_MAIN_MENU_DRAWER_TITLE_ID}
						data-slot="drawer-title"
					>
						{title}
					</div>
					<div
						id={ASTRA_CHAT_MAIN_MENU_DRAWER_DESCRIPTION_ID}
						data-slot="drawer-description"
					>
						{description}
					</div>
				</DrawerHeader>
				<div
					id={ASTRA_CHAT_MAIN_MENU_DRAWER_HEADER_ID}
					className="astra-chat-main-menu-drawer__header"
				>
					<div
						className={cn(
							"astra-chat-main-menu-drawer__header-row",
							!snapshot.hasActiveChat &&
								"astra-chat-main-menu-drawer__empty-state",
						)}
					>
						<div className="astra-chat-main-menu-drawer__header-main">
							<div className="astra-chat-main-menu-drawer__avatar-frame">
								<AstraChatAvatar
									alt={avatarLabel}
									avatarUrl={snapshot.thumbnailUrl}
									className="astra-chat-main-menu-drawer__avatar"
									groupAvatarUrls={
										snapshot.kind === "group"
											? snapshot.groupAvatarUrls
											: undefined
									}
									loading="eager"
								/>
							</div>
							<div className="astra-chat-main-menu-drawer__name-stack">
								<div
									className="astra-chat-main-menu-drawer__entity-name"
									title={displayName}
								>
									{displayName}
								</div>
								{snapshot.hasActiveChat ? (
									<div
										className="astra-chat-main-menu-drawer__chat-file-name"
										title={snapshot.chatFileName}
									>
										{snapshot.chatFileName}
									</div>
								) : null}
							</div>
						</div>
						<div
							aria-label={translateAstra(
								"sendForm.mainMenu.actions",
							)}
							className="astra-chat-main-menu-drawer__actions"
						>
							{ASTRA_CHAT_MAIN_MENU_HEADER_ACTIONS.map(
								({ icon: Icon, key, labelKey }) => (
									<Button
										aria-label={translateAstra(labelKey)}
										className="astra-chat-main-menu-drawer__action-button rounded-full"
										key={labelKey}
										size="icon"
										type="button"
										variant="outline"
										onClick={
											key === "delete"
												? onRequestDelete
												: key === "categories"
													? onRequestCategories
												: key === "rename"
													? onRequestRename
													: undefined
										}
									>
										<Icon aria-hidden={true} size={16} />
									</Button>
								),
							)}
						</div>
					</div>
				</div>
				<DrawerBody
					id={ASTRA_CHAT_MAIN_MENU_DRAWER_BODY_ID}
					className="astra-chat-main-menu-drawer__body"
					viewportProps={{
						id: ASTRA_CHAT_MAIN_MENU_DRAWER_SCROLLABLE_CONTENT_ID,
						className:
							"astra-chat-main-menu-drawer__scrollable-content",
					}}
				>
					<div
						id={ASTRA_CHAT_MAIN_MENU_DRAWER_CONTENT_ID}
						className="astra-chat-main-menu-drawer__content"
					>
						{hasDetailItems ? (
							<MobileChatMainMenuDrawerDetails
								helperText={detailHelperText}
								rows={detailRows}
							/>
						) : null}
						<div
							aria-label={translateAstra(
								"sendForm.mainMenu.tileGrid",
							)}
							className="astra-chat-main-menu-drawer__grid"
						>
							{tiles.map(
								({
									iconKey,
									key,
									label,
									lines,
									sillyTavernInterfacePageKey,
									wrapperId,
								}) => (
									<div
										id={wrapperId}
										className="astra-chat-main-menu-drawer__tile-shell"
										key={key}
									>
										<button
											aria-label={label}
											className="astra-chat-main-menu-drawer__tile"
											type="button"
											onClick={() => {
												onSillyTavernInterfaceShortcutSelect?.(
													sillyTavernInterfacePageKey,
												);
											}}
										>
											<span
												aria-hidden={true}
												className="astra-chat-main-menu-drawer__tile-glow"
											/>
											{renderSillyTavernInterfaceRouteIcon(
												{
													className:
														"astra-chat-main-menu-drawer__tile-deco-icon",
													iconKey,
												},
											)}
											<span
												aria-hidden={true}
												className="astra-chat-main-menu-drawer__tile-fade"
											/>
											<span className="astra-chat-main-menu-drawer__tile-title">
												{lines.map((line, index) => (
													<span
														className="astra-chat-main-menu-drawer__tile-title-line"
														key={`${key}-${index}`}
													>
														{line}
													</span>
												))}
											</span>
										</button>
									</div>
								),
							)}
						</div>
						{currentPresetProfileControlsSnapshot ? (
							<MobileChatMainMenuDrawerControls
								busy={controlsBusy}
								snapshot={currentPresetProfileControlsSnapshot}
								onConnectionProfileChange={
									onConnectionProfileChange
								}
							/>
						) : null}
					</div>
				</DrawerBody>
				{hasCurrentUserCard && currentUserSnapshot ? (
					<div
						id={ASTRA_CHAT_MAIN_MENU_DRAWER_FOOTER_ID}
						className="astra-chat-main-menu-drawer__footer"
					>
						<div
							aria-label={currentUserCardLabel}
							className="astra-chat-main-menu-drawer__current-user-section"
						>
							<div className="astra-chat-main-menu-drawer__current-user-card">
								<div className="astra-chat-main-menu-drawer__current-user-row">
									<div className="astra-chat-main-menu-drawer__current-user-main">
										<div className="astra-chat-main-menu-drawer__avatar-frame astra-chat-main-menu-drawer__current-user-frame">
											{currentUserSnapshot.thumbnailUrl ? (
												<img
													alt={currentUserAvatarLabel}
													className="astra-chat-main-menu-drawer__avatar astra-chat-main-menu-drawer__current-user-image"
													draggable={false}
													loading="eager"
													src={
														currentUserSnapshot.thumbnailUrl
													}
												/>
											) : (
												<span className="astra-chat-main-menu-drawer__current-user-fallback">
													{getAvatarFallbackText(
														currentUserSnapshot,
													)}
												</span>
											)}
										</div>
										<div className="astra-chat-main-menu-drawer__name-stack astra-chat-main-menu-drawer__current-user-name-stack">
											<div
												className="astra-chat-main-menu-drawer__entity-name astra-chat-main-menu-drawer__current-user-name"
												title={
													currentUserSnapshot.displayName
												}
											>
												{
													currentUserSnapshot.displayName
												}
											</div>
											{currentUserSubtitle ? (
												<div
													aria-label={`${translateAstra(currentUserSubtitle.labelKey)}: ${currentUserSubtitle.value}`}
													className="astra-chat-main-menu-drawer__chat-file-name astra-chat-main-menu-drawer__current-user-subtitle"
													title={
														currentUserSubtitle.value
													}
												>
													{currentUserSubtitle.value}
												</div>
											) : null}
										</div>
									</div>
									<div
										aria-label={currentUserActionsLabel}
										className="astra-chat-main-menu-drawer__actions astra-chat-main-menu-drawer__current-user-actions"
									>
										{ASTRA_CHAT_MAIN_MENU_CURRENT_USER_ACTIONS.map(
											({
												icon: Icon,
												key,
												labelKey,
												sillyTavernInterfacePageKey,
											}) => {
												const isChatSettingsOverrideAction =
													key ===
													"chatSettingsOverride";
												const isDisabled =
													isChatSettingsOverrideAction
														? !onRequestChatSettingsOverride ||
															!canRequestChatSettingsOverride(
																snapshot,
															)
														: sillyTavernInterfacePageKey ===
																undefined ||
															!onSillyTavernInterfaceShortcutSelect;

												return (
													<Button
														aria-label={translateAstra(
															labelKey,
														)}
														className="astra-chat-main-menu-drawer__action-button astra-chat-main-menu-drawer__current-user-action rounded-full"
														disabled={isDisabled}
														key={key}
														size="icon"
														type="button"
														variant="outline"
														onClick={() => {
															if (
																isChatSettingsOverrideAction
															) {
																onRequestChatSettingsOverride?.();
																return;
															}

															if (
																sillyTavernInterfacePageKey
															) {
																onSillyTavernInterfaceShortcutSelect?.(
																	sillyTavernInterfacePageKey,
																);
															}
														}}
													>
														<Icon
															aria-hidden={true}
															size={16}
														/>
													</Button>
												);
											},
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				) : null}
			</DrawerContent>
		</Drawer>
	);
}
