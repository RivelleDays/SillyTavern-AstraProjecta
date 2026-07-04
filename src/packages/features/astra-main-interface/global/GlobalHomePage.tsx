import * as React from "react";

import {
	DiscordBrand,
	GithubBrand,
	RedditBrand,
} from "@/components/ui/shared/brand-icons";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	BookOpen,
	ChevronRight,
	LibraryBig,
	Link,
	MessagesSquare,
	UserRound,
	type LucideIcon,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	openChatCatalogEntry,
	sortChatCatalogEntries,
	type ChatCatalogEntry,
	type ChatCatalogStore,
	type OpenChatCatalogEntry,
} from "@/packages/core/st/chat-catalog";
import type { SillyTavernInterfaceRouteKey } from "@/app/shared/sillytavern-interface";
import type { SendFormSillyTavernInterfaceAdapter } from "@/packages/features/chat-session/send-form/contracts/sillyTavernInterface";
import { useChatCatalogEntryOpenController } from "@/packages/features/astra-main-interface/chat-list/useChatCatalogEntryOpenController";
import {
	GLOBAL_HOME_SHORTCUTS,
	splitGlobalHomeShortcutLabel,
} from "@/packages/features/astra-main-interface/global/homeShortcuts";
import type { I18nKey } from "@/types/i18n";

const RECENT_CHAT_LIMIT = 3;

interface GlobalHomeLinkDescriptor {
	descriptionKey: I18nKey;
	href: string;
	icon: LucideIcon;
	labelKey: I18nKey;
}

interface GlobalHomeLinkGroupDescriptor {
	key: string;
	links: readonly GlobalHomeLinkDescriptor[];
	titleKey: I18nKey;
}

export interface GlobalHomePageProps {
	chatCatalogStore: ChatCatalogStore;
	onRequestChatsTab(): void;
	onRequestClose?: () => void;
	onSillyTavernInterfaceRouteOpen?: (
		routeKey: SillyTavernInterfaceRouteKey,
	) => void;
	openChat?: OpenChatCatalogEntry;
	renderSillyTavernInterfaceRouteIcon?: SendFormSillyTavernInterfaceAdapter["renderRouteIcon"];
}

const HOME_LINK_GROUPS = [
	{
		key: "sillytavern",
		links: [
			{
				descriptionKey:
					"astraMainInterface.home.links.sillytavern.githubDescription",
				href: "https://github.com/SillyTavern/SillyTavern",
				icon: GithubBrand,
				labelKey: "astraMainInterface.home.links.sillytavern.github",
			},
			{
				descriptionKey:
					"astraMainInterface.home.links.sillytavern.documentationDescription",
				href: "https://docs.sillytavern.app/",
				icon: BookOpen,
				labelKey:
					"astraMainInterface.home.links.sillytavern.documentation",
			},
			{
				descriptionKey:
					"astraMainInterface.home.links.sillytavern.discordDescription",
				href: "https://discord.gg/sillytavern",
				icon: DiscordBrand,
				labelKey: "astraMainInterface.home.links.sillytavern.discord",
			},
			{
				descriptionKey:
					"astraMainInterface.home.links.sillytavern.redditDescription",
				href: "https://www.reddit.com/r/SillyTavernAI/",
				icon: RedditBrand,
				labelKey: "astraMainInterface.home.links.sillytavern.reddit",
			},
		],
		titleKey: "astraMainInterface.home.links.sillytavern.title",
	},
	{
		key: "astra-projecta",
		links: [
			{
				descriptionKey:
					"astraMainInterface.home.links.astra.githubDescription",
				href: "https://github.com/RivelleDays/SillyTavern-AstraProjecta",
				icon: GithubBrand,
				labelKey: "astraMainInterface.home.links.astra.github",
			},
			{
				descriptionKey:
					"astraMainInterface.home.links.astra.discordDescription",
				href: "https://discord.gg/bb35eB5Zgr",
				icon: DiscordBrand,
				labelKey: "astraMainInterface.home.links.astra.discord",
			},
			{
				descriptionKey:
					"astraMainInterface.home.links.astra.rivelleDescription",
				href: "https://bio.site/rivelle",
				icon: UserRound,
				labelKey: "astraMainInterface.home.links.astra.rivelle",
			},
		],
		titleKey: "astraMainInterface.home.links.astra.title",
	},
	{
		key: "supported-extensions",
		links: [
			{
				descriptionKey:
					"astraMainInterface.home.links.supportedExtensions.characterLibraryDescription",
				href: "https://github.com/Sillyanonymous/SillyTavern-CharacterLibrary#sillytavern-character-library",
				icon: LibraryBig,
				labelKey:
					"astraMainInterface.home.links.supportedExtensions.characterLibrary",
			},
		],
		titleKey: "astraMainInterface.home.links.supportedExtensions.title",
	},
] as const satisfies readonly GlobalHomeLinkGroupDescriptor[];

function getChatCatalogRowChatId(entry: ChatCatalogEntry) {
	return (
		entry.chatId ||
		translateAstra("astraMainInterface.chatMenu.untitledChat")
	);
}

function getEntryFallbackInitial(entry: ChatCatalogEntry) {
	return entry.entityName.trim().charAt(0).toUpperCase() || "?";
}

function GlobalHomeSectionHeader({
	action,
	icon,
	title,
}: {
	action?: React.ReactNode;
	icon: LucideIcon;
	title: string;
}) {
	return (
		<div className="astra-main-interface-home__section-header">
			<span
				aria-hidden={true}
				className="astra-main-interface-home__section-icon"
			>
				<UiIcon icon={icon} size="sm" />
			</span>
			<span className="astra-main-interface-home__section-title">
				{title}
			</span>
			{action ? (
				<div className="astra-main-interface-home__section-action">
					{action}
				</div>
			) : null}
		</div>
	);
}

function GlobalHomeShortcuts({
	onRouteOpen,
	renderRouteIcon,
}: {
	onRouteOpen?: (routeKey: SillyTavernInterfaceRouteKey) => void;
	renderRouteIcon?: SendFormSillyTavernInterfaceAdapter["renderRouteIcon"];
}) {
	return (
		<div
			aria-label={translateAstra(
				"astraMainInterface.home.shortcuts.label",
			)}
			className="astra-main-interface-home__shortcut-row"
			role="group"
		>
			{GLOBAL_HOME_SHORTCUTS.map((shortcut) => {
				const label = translateAstra(shortcut.labelKey);
				const labelLines = splitGlobalHomeShortcutLabel(
					label,
					shortcut.labelLines,
				);

				return (
					<button
						aria-label={label}
						className="astra-main-interface-home__shortcut"
						key={shortcut.key}
						type="button"
						onClick={() => {
							onRouteOpen?.(shortcut.routeKey);
						}}
					>
						<span className="astra-main-interface-home__shortcut-icon">
							{renderRouteIcon?.({
								className:
									"astra-main-interface-home__shortcut-icon-svg",
								iconKey: shortcut.iconKey,
							})}
						</span>
						<span
							aria-hidden={true}
							className="astra-main-interface-home__shortcut-deco-icon"
						>
							{renderRouteIcon?.({
								className:
									"astra-main-interface-home__shortcut-deco-icon-svg",
								iconKey: shortcut.iconKey,
							})}
						</span>
						<span className="astra-main-interface-home__shortcut-label">
							{labelLines.map((line) => (
								<span
									className="astra-main-interface-home__shortcut-label-line"
									key={line}
								>
									{line}
								</span>
							))}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function GlobalHomeCarouselSlot() {
	return (
		<section
			aria-label={translateAstra(
				"astraMainInterface.home.carousel.title",
			)}
			className="astra-main-interface-home__carousel-slot"
		>
			<div className="astra-main-interface-home__carousel-copy">
				<span className="astra-main-interface-home__carousel-title">
					{translateAstra("astraMainInterface.home.carousel.title")}
				</span>
				<span className="astra-main-interface-home__carousel-description">
					{translateAstra(
						"astraMainInterface.home.carousel.description",
					)}
				</span>
			</div>
		</section>
	);
}

function GlobalHomeRecentChatRow({
	disabled,
	entry,
	onOpen,
}: {
	disabled: boolean;
	entry: ChatCatalogEntry;
	onOpen(entry: ChatCatalogEntry): void;
}) {
	const chatId = getChatCatalogRowChatId(entry);
	const lastMessageLabel =
		entry.lastMessageLabel ||
		translateAstra("astraMainInterface.chatMenu.unknownDate");

	const handleOpen = React.useCallback(() => {
		if (disabled) return;

		onOpen(entry);
	}, [disabled, entry, onOpen]);

	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (disabled) return;
			if (event.key !== "Enter" && event.key !== " ") return;

			event.preventDefault();
			onOpen(entry);
		},
		[disabled, entry, onOpen],
	);

	return (
		<div
			aria-disabled={disabled}
			aria-label={`Open ${entry.entityName} ${chatId}`}
			className="astra-main-interface-home__recent-row"
			role="button"
			tabIndex={disabled ? -1 : 0}
			onClick={handleOpen}
			onKeyDown={handleKeyDown}
		>
			<div className="astra-main-interface-home__recent-main">
				<span
					className="astra-main-interface-home__recent-name"
					title={entry.fileName}
				>
					{chatId}
				</span>
				<span
					className="astra-main-interface-home__recent-preview"
					title={entry.lastMessagePreview}
				>
					{entry.lastMessagePreview ||
						translateAstra("astraMainInterface.chatMenu.noPreview")}
				</span>
			</div>
			<div className="astra-main-interface-home__recent-meta">
				<AstraChatAvatar
					aria-hidden={true}
					avatarUrl={entry.avatarUrl}
					className="astra-main-interface-home__recent-avatar"
					collageClassName="astra-main-interface-home__recent-avatar--collage"
					collageImageClassName="astra-main-interface-home__recent-avatar-collage-image"
					fallbackClassName="astra-main-interface-home__recent-avatar-fallback"
					fallbackText={getEntryFallbackInitial(entry)}
					groupAvatarUrls={
						entry.kind === "group"
							? entry.groupAvatarUrls
							: undefined
					}
					imageClassName="astra-main-interface-home__recent-avatar-image"
				/>
				<span
					className="astra-main-interface-home__recent-entity"
					title={entry.entityName}
				>
					{entry.entityName}
				</span>
				<span className="astra-main-interface-home__recent-time">
					{lastMessageLabel}
				</span>
			</div>
		</div>
	);
}

function GlobalHomeRecentChats({
	entries,
	onRequestChatsTab,
	onRequestClose,
	openChat,
	status,
}: {
	entries: ChatCatalogEntry[];
	onRequestChatsTab(): void;
	onRequestClose?: () => void;
	openChat: OpenChatCatalogEntry;
	status: string;
}) {
	const {
		openEntry: openChatWithFeedback,
		openError,
		openingKey,
	} = useChatCatalogEntryOpenController({
		onRequestClose,
		openEntry: openChat,
	});
	const sortedEntries = React.useMemo(
		() =>
			sortChatCatalogEntries(entries, "most-recent").slice(
				0,
				RECENT_CHAT_LIMIT,
			),
		[entries],
	);
	const isLoading = status === "loading";
	const isError = status === "error";
	const showState = isLoading || isError || sortedEntries.length === 0;
	const stateText = isLoading
		? translateAstra("astraMainInterface.home.recent.loading")
		: isError
			? translateAstra("astraMainInterface.home.recent.error")
			: translateAstra("astraMainInterface.home.recent.empty");

	const handleOpenRow = React.useCallback(
		(entry: ChatCatalogEntry) => {
			void openChatWithFeedback(entry);
		},
		[openChatWithFeedback],
	);

	return (
		<section className="astra-main-interface-home__section astra-main-interface-home__recent">
			<GlobalHomeSectionHeader
				action={
					<button
						aria-label={translateAstra(
							"astraMainInterface.home.recent.viewAllLabel",
						)}
						className="astra-main-interface-home__recent-view-all"
						type="button"
						onClick={onRequestChatsTab}
					>
						<span>
							{translateAstra(
								"astraMainInterface.home.recent.viewAll",
							)}
						</span>
						<UiIcon
							aria-hidden={true}
							icon={ChevronRight}
							size="xs"
						/>
					</button>
				}
				icon={MessagesSquare}
				title={translateAstra("astraMainInterface.home.recent.title")}
			/>
			{openError ? (
				<div
					className="astra-main-interface-home__inline-error"
					role="alert"
				>
					{openError}
				</div>
			) : null}
			{showState ? (
				<div className="astra-main-interface-home__recent-state">
					{stateText}
				</div>
			) : (
				<div
					aria-label={translateAstra(
						"astraMainInterface.home.recent.listLabel",
					)}
					className="astra-main-interface-home__recent-list"
					role="list"
				>
					{sortedEntries.map((entry) => (
						<div
							className="astra-main-interface-home__recent-item"
							key={entry.key}
							role="listitem"
						>
							<GlobalHomeRecentChatRow
								disabled={openingKey !== null}
								entry={entry}
								onOpen={handleOpenRow}
							/>
						</div>
					))}
				</div>
			)}
		</section>
	);
}

function GlobalHomeLinks() {
	return (
		<section className="astra-main-interface-home__section astra-main-interface-home__links">
			<GlobalHomeSectionHeader
				icon={Link}
				title={translateAstra("astraMainInterface.home.links.title")}
			/>
			<div className="astra-main-interface-home__link-groups">
				{HOME_LINK_GROUPS.map((group) => (
					<section
						className="astra-main-interface-home__link-group"
						key={group.key}
					>
						<div className="astra-main-interface-home__link-group-title">
							{translateAstra(group.titleKey)}
						</div>
						<div className="astra-main-interface-home__link-list">
							{group.links.map((link) => {
								const title = translateAstra(link.labelKey);
								const description = translateAstra(
									link.descriptionKey,
								);

								return (
									<a
										aria-label={`${title} ${description}`}
										className="astra-main-interface-home__link"
										href={link.href}
										key={link.href}
										rel="noreferrer"
										target="_blank"
									>
										<span
											aria-hidden={true}
											className="astra-main-interface-home__link-icon"
										>
											<UiIcon
												icon={link.icon}
												size="sm"
											/>
										</span>
										<span className="astra-main-interface-home__link-text">
											<span className="astra-main-interface-home__link-title">
												{title}
											</span>
											<span className="astra-main-interface-home__link-description">
												{description}
											</span>
										</span>
									</a>
								);
							})}
						</div>
					</section>
				))}
			</div>
		</section>
	);
}

export function GlobalHomePage({
	chatCatalogStore,
	onRequestChatsTab,
	onRequestClose,
	onSillyTavernInterfaceRouteOpen,
	openChat = (entry) => openChatCatalogEntry(entry),
	renderSillyTavernInterfaceRouteIcon,
}: GlobalHomePageProps) {
	const snapshot = React.useSyncExternalStore(
		chatCatalogStore.subscribe,
		chatCatalogStore.getSnapshot,
		chatCatalogStore.getSnapshot,
	);

	return (
		<div className="astra-main-interface-home">
			<GlobalHomeShortcuts
				renderRouteIcon={renderSillyTavernInterfaceRouteIcon}
				onRouteOpen={onSillyTavernInterfaceRouteOpen}
			/>
			<GlobalHomeCarouselSlot />
			<GlobalHomeRecentChats
				entries={snapshot.entries}
				openChat={openChat}
				status={snapshot.status}
				onRequestChatsTab={onRequestChatsTab}
				onRequestClose={onRequestClose}
			/>
			<GlobalHomeLinks />
		</div>
	);
}
