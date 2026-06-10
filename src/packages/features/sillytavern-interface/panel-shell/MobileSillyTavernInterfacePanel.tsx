import * as React from "react";

import { MobilePagePanel } from "@/components/ui/astra/MobilePagePanel";
import { ScrollArea } from "@/components/ui/astra/scroll-area";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	BookOpen,
	ChevronUp,
	TextAlignStart,
	X,
} from "@/components/ui/shared/icons";
import { Button } from "@/components/ui/shadcn/button";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import type { CurrentUserAvatarSnapshot } from "@/packages/core/st/currentUserAvatar";
import {
	SillyTavernInterfaceAiSettingsTabs,
	isAiSettingsSillyTavernInterfaceRoute,
} from "@/packages/features/sillytavern-interface/tools/ai-settings/SillyTavernInterfaceAiSettingsTabs";
import {
	SillyTavernInterfaceCharacterManagementTabs,
	isCharacterManagementSillyTavernInterfaceRoute,
} from "@/packages/features/sillytavern-interface/tools/character-management/SillyTavernInterfaceCharacterManagementTabs";
import {
	SillyTavernInterfacePersonaManagementTabs,
	isPersonaManagementSillyTavernInterfaceRoute,
} from "@/packages/features/sillytavern-interface/tools/persona-management/SillyTavernInterfacePersonaManagementTabs";
import { SillyTavernInterfaceMainNavigationStrip } from "@/packages/features/sillytavern-interface/route-navigation/SillyTavernInterfaceMainNavigationStrip";
import {
	LEGACY_SILLYTAVERN_INTERFACE_MAIN_NAVIGATION_VISIBILITY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_CLOSE_BUTTON_ID,
	SILLYTAVERN_INTERFACE_CLOSE_BUTTON_WRAPPER_ID,
	SILLYTAVERN_INTERFACE_CONTENT_ID,
	SILLYTAVERN_INTERFACE_ID,
	SILLYTAVERN_INTERFACE_MAIN_NAVIGATION_ID,
	SILLYTAVERN_INTERFACE_MAIN_NAVIGATION_VISIBILITY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_MENU_BUTTON_ID,
	SILLYTAVERN_INTERFACE_TITLE_ID,
} from "@/packages/features/sillytavern-interface/contracts/dom";
import {
	DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
	getDefaultSillyTavernInterfacePageDescriptors,
	getDefaultSillyTavernInterfacePageMainNavigationItems,
} from "@/packages/features/sillytavern-interface/routes/registry";
import { persistStoredAiSettingsPageKey } from "@/packages/features/sillytavern-interface/routes/subheaderStorage";
import type {
	SillyTavernInterfacePageDescriptor,
	SillyTavernInterfacePageHeaderIcon,
	SillyTavernInterfacePageMainNavigationItem,
	SillyTavernInterfacePageNavigationItem,
} from "@/packages/features/sillytavern-interface/routes/types";
import { SillyTavernInterfaceRouteIcon } from "@/packages/features/sillytavern-interface/icons/SillyTavernInterfaceRouteIcon";

export interface MobileSillyTavernInterfacePanelProps {
	activePageKey?: string;
	currentChatIdentitySnapshot?: CurrentChatIdentitySnapshot;
	defaultActivePageKey?: string;
	descriptors?: SillyTavernInterfacePageDescriptor[];
	currentUserAvatarSnapshot?: CurrentUserAvatarSnapshot;
	navigationItems?: SillyTavernInterfacePageNavigationItem[];
	onActivePageKeyChange?(pageKey: string): void;
	onOpenChange(nextOpen: boolean): void;
	open: boolean;
}

function clampScrollTop(viewport: HTMLElement, scrollTop: number) {
	const maxScrollTop = Math.max(
		0,
		viewport.scrollHeight - viewport.clientHeight,
	);

	return Math.min(Math.max(0, scrollTop), maxScrollTop);
}

function resolveActiveDescriptor({
	activePageKey,
	descriptors,
}: {
	activePageKey: string;
	descriptors: SillyTavernInterfacePageDescriptor[];
}) {
	return (
		descriptors.find((descriptor) => descriptor.key === activePageKey) ??
		descriptors[0]
	);
}

function getAvatarFallbackText(
	snapshot: CurrentUserAvatarSnapshot | undefined,
): string {
	const source = snapshot?.displayName || snapshot?.personaName || "";
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

function resolveHeaderIcon(
	descriptor: SillyTavernInterfacePageDescriptor,
): SillyTavernInterfacePageHeaderIcon | null {
	if (descriptor.headerIcon) {
		return descriptor.headerIcon;
	}

	if (descriptor.icon) {
		return {
			icon: descriptor.icon,
			kind: "lucide",
		};
	}

	return null;
}

function renderHeaderIcon({
	currentChatIdentitySnapshot,
	currentUserAvatarSnapshot,
	descriptor,
}: {
	currentChatIdentitySnapshot?: CurrentChatIdentitySnapshot;
	currentUserAvatarSnapshot?: CurrentUserAvatarSnapshot;
	descriptor: SillyTavernInterfacePageDescriptor;
}): React.ReactNode {
	const headerIcon = resolveHeaderIcon(descriptor);

	if (!headerIcon) {
		return null;
	}

	let iconContent: React.ReactNode;
	let iconKind: SillyTavernInterfacePageHeaderIcon["kind"] = headerIcon.kind;

	switch (headerIcon.kind) {
		case "current-chat-avatar":
			if (
				currentChatIdentitySnapshot?.hasActiveChat &&
				currentChatIdentitySnapshot.avatarSource !== "fallback" &&
				currentChatIdentitySnapshot.thumbnailUrl
			) {
				iconContent = (
					<AstraChatAvatar
						aria-hidden={true}
						avatarUrl={currentChatIdentitySnapshot.thumbnailUrl}
						className="sillytavern-interface__title-avatar"
						collageClassName="sillytavern-interface__title-avatar--collage"
						collageImageClassName="sillytavern-interface__title-avatar-collage-image"
						groupAvatarUrls={
							currentChatIdentitySnapshot.groupAvatarUrls
						}
						imageClassName="sillytavern-interface__title-avatar-image"
					/>
				);
			} else {
				iconKind = "main-menu-svg";
				iconContent = (
					<SillyTavernInterfaceRouteIcon
						className="sillytavern-interface__title-svg-icon"
						iconKey={headerIcon.fallbackIconKey}
					/>
				);
			}
			break;
		case "current-user-avatar":
			iconContent = currentUserAvatarSnapshot?.thumbnailUrl ? (
				<img
					alt=""
					className="sillytavern-interface__title-avatar-image"
					draggable={false}
					src={currentUserAvatarSnapshot.thumbnailUrl}
				/>
			) : (
				<span className="sillytavern-interface__title-avatar-fallback">
					{getAvatarFallbackText(currentUserAvatarSnapshot)}
				</span>
			);
			break;
		case "main-menu-svg":
			iconContent = (
				<SillyTavernInterfaceRouteIcon
					className="sillytavern-interface__title-svg-icon"
					iconKey={headerIcon.iconKey}
				/>
			);
			break;
		default:
			iconContent = (
				<UiIcon
					aria-hidden={true}
					className="sillytavern-interface__title-lucide-icon"
					icon={headerIcon.icon}
					size="md"
				/>
			);
			break;
	}

	return (
		<span
			aria-hidden={true}
			className="sillytavern-interface__title-icon-frame"
			data-icon-kind={iconKind}
		>
			{iconContent}
		</span>
	);
}

function resolvePanelTitle({
	currentChatIdentitySnapshot,
	currentUserAvatarSnapshot,
	descriptor,
}: {
	currentChatIdentitySnapshot?: CurrentChatIdentitySnapshot;
	currentUserAvatarSnapshot?: CurrentUserAvatarSnapshot;
	descriptor: SillyTavernInterfacePageDescriptor;
}): React.ReactNode {
	const headerIcon = renderHeaderIcon({
		currentChatIdentitySnapshot,
		currentUserAvatarSnapshot,
		descriptor,
	});

	return (
		<div
			className={cn(
				"sillytavern-interface__title-row",
				!headerIcon && "sillytavern-interface__title-row--text-only",
			)}
		>
			{headerIcon}
			<div className="sillytavern-interface__title-stack">
				<div className="sillytavern-interface__title-label">
					{descriptor.title}
				</div>
				{descriptor.headerSummary ? (
					<div
						aria-hidden={true}
						className="sillytavern-interface__title-summary"
					>
						{descriptor.headerSummary}
					</div>
				) : null}
			</div>
		</div>
	);
}

function renderDocsLink(
	descriptor: SillyTavernInterfacePageDescriptor,
): React.ReactNode {
	if (!descriptor.docsHref) {
		return null;
	}

	return (
		<Button
			asChild={true}
			className="sillytavern-interface__docs-button"
			size="icon-sm"
			variant="ghost"
		>
			<a
				aria-label={translateAstra("sillyTavernInterface.docs.open")}
				href={descriptor.docsHref}
				rel="noreferrer"
				target="_blank"
			>
				<UiIcon
					aria-hidden={true}
					className="sillytavern-interface__docs-button-icon"
					icon={BookOpen}
					size="sm"
				/>
			</a>
		</Button>
	);
}

function readStoredMainNavigationVisibility(): boolean {
	const storage = globalThis.window?.localStorage;
	if (!storage) {
		return true;
	}

	try {
		const storedValue = storage.getItem(
			SILLYTAVERN_INTERFACE_MAIN_NAVIGATION_VISIBILITY_STORAGE_KEY,
		);

		if (storedValue === "false") {
			return false;
		}

		if (storedValue === "true") {
			return true;
		}

		const legacyStoredValue = storage.getItem(
			LEGACY_SILLYTAVERN_INTERFACE_MAIN_NAVIGATION_VISIBILITY_STORAGE_KEY,
		);

		if (legacyStoredValue === "false" || legacyStoredValue === "true") {
			storage.setItem(
				SILLYTAVERN_INTERFACE_MAIN_NAVIGATION_VISIBILITY_STORAGE_KEY,
				legacyStoredValue,
			);
			return legacyStoredValue === "true";
		}
	} catch {
		return true;
	}

	return true;
}

function persistMainNavigationVisibility(isVisible: boolean) {
	const storage = globalThis.window?.localStorage;
	if (!storage) {
		return;
	}

	try {
		storage.setItem(
			SILLYTAVERN_INTERFACE_MAIN_NAVIGATION_VISIBILITY_STORAGE_KEY,
			String(isVisible),
		);
	} catch {
		// Keep the in-memory preference active when storage is unavailable.
	}
}

export function MobileSillyTavernInterfacePanel({
	activePageKey,
	currentChatIdentitySnapshot,
	currentUserAvatarSnapshot,
	defaultActivePageKey = DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
	descriptors,
	onActivePageKeyChange,
	onOpenChange,
	open,
}: MobileSillyTavernInterfacePanelProps) {
	const [isMainNavigationVisible, setIsMainNavigationVisible] =
		React.useState(readStoredMainNavigationVisibility);
	const [uncontrolledActivePageKey, setUncontrolledActivePageKey] =
		React.useState(defaultActivePageKey);
	const scrollPositionsRef = React.useRef(new Map<string, number>());
	const viewportRef = React.useRef<HTMLDivElement | null>(null);
	const wasOpenRef = React.useRef(open);
	const resolvedDescriptors =
		descriptors && descriptors.length > 0
			? descriptors
			: getDefaultSillyTavernInterfacePageDescriptors();
	const mainNavigationItems = React.useMemo<
		SillyTavernInterfacePageMainNavigationItem[]
	>(() => getDefaultSillyTavernInterfacePageMainNavigationItems(), []);
	const resolvedActivePageKey = activePageKey ?? uncontrolledActivePageKey;
	const activeDescriptor = resolveActiveDescriptor({
		activePageKey: resolvedActivePageKey,
		descriptors: resolvedDescriptors,
	});
	const headerDescriptor = isAiSettingsSillyTavernInterfaceRoute(
		activeDescriptor.key,
	)
		? (resolvedDescriptors.find(
				(descriptor) =>
					descriptor.key === DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
			) ?? activeDescriptor)
		: activeDescriptor;

	React.useEffect(() => {
		const wasOpen = wasOpenRef.current;

		if (activePageKey === undefined && open && !wasOpen) {
			setUncontrolledActivePageKey(defaultActivePageKey);
		}

		if (!open && wasOpen) {
			scrollPositionsRef.current.clear();
		}

		wasOpenRef.current = open;
	}, [activePageKey, defaultActivePageKey, open]);

	React.useEffect(() => {
		if (!isAiSettingsSillyTavernInterfaceRoute(activeDescriptor.key)) {
			return;
		}

		persistStoredAiSettingsPageKey(
			globalThis.window?.localStorage,
			activeDescriptor.key,
		);
	}, [activeDescriptor.key]);

	const handlePanelOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			onOpenChange(nextOpen);
		},
		[onOpenChange],
	);

	const handleMainNavigationToggle = React.useCallback(() => {
		setIsMainNavigationVisible((currentValue) => {
			const nextValue = !currentValue;
			persistMainNavigationVisibility(nextValue);

			return nextValue;
		});
	}, []);

	const saveActivePageScrollPosition = React.useCallback(() => {
		const viewport = viewportRef.current;
		if (!(viewport instanceof HTMLElement) || !open) {
			return;
		}

		scrollPositionsRef.current.set(
			activeDescriptor.key,
			viewport.scrollTop,
		);
	}, [activeDescriptor.key, open]);

	const restoreActivePageScrollPosition = React.useCallback(() => {
		const viewport = viewportRef.current;
		if (!(viewport instanceof HTMLElement) || !open) {
			return;
		}

		const restoredScrollTop = clampScrollTop(
			viewport,
			scrollPositionsRef.current.get(activeDescriptor.key) ?? 0,
		);

		if (viewport.scrollTop !== restoredScrollTop) {
			viewport.scrollTop = restoredScrollTop;
		}
	}, [activeDescriptor.key, open]);

	React.useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (!(viewport instanceof HTMLElement) || !open) {
			return undefined;
		}

		restoreActivePageScrollPosition();

		if (typeof ResizeObserver !== "function") {
			return undefined;
		}

		const observer = new ResizeObserver(() => {
			restoreActivePageScrollPosition();
		});
		const content = viewport.querySelector(
			".sillytavern-interface-panel__content",
		);

		observer.observe(viewport);
		if (content instanceof HTMLElement) {
			observer.observe(content);
		}

		return () => {
			observer.disconnect();
		};
	}, [activeDescriptor.key, open, restoreActivePageScrollPosition]);

	const handleViewportScroll = React.useCallback(
		(event: React.UIEvent<HTMLDivElement>) => {
			const viewport = event.currentTarget;

			scrollPositionsRef.current.set(
				activeDescriptor.key,
				viewport.scrollTop,
			);
		},
		[activeDescriptor.key],
	);

	const handlePageSelect = React.useCallback(
		(nextPageKey: string) => {
			saveActivePageScrollPosition();

			if (activePageKey === undefined) {
				setUncontrolledActivePageKey(nextPageKey);
			}

			onActivePageKeyChange?.(nextPageKey);
		},
		[activePageKey, onActivePageKeyChange, saveActivePageScrollPosition],
	);
	const aiSettingsTabs = isAiSettingsSillyTavernInterfaceRoute(
		activeDescriptor.key,
	) ? (
		<SillyTavernInterfaceAiSettingsTabs
			activePageKey={activeDescriptor.key}
			onPageSelect={handlePageSelect}
		/>
	) : null;
	const characterManagementTabs =
		isCharacterManagementSillyTavernInterfaceRoute(activeDescriptor.key) ? (
			<SillyTavernInterfaceCharacterManagementTabs
				currentChatIdentitySnapshot={currentChatIdentitySnapshot}
			/>
		) : null;
	const personaManagementTabs = isPersonaManagementSillyTavernInterfaceRoute(
		activeDescriptor.key,
	) ? (
		<SillyTavernInterfacePersonaManagementTabs />
	) : null;
	const descriptorSubheader =
		activeDescriptor.breadcrumb || activeDescriptor.sectionNav ? (
			<div className="sillytavern-interface__subheader-row">
				<div className="sillytavern-interface__subheader-start">
					{activeDescriptor.breadcrumb ?? null}
				</div>
				<div className="sillytavern-interface__subheader-end">
					{activeDescriptor.sectionNav ?? null}
				</div>
			</div>
		) : null;
	const subheader =
		aiSettingsTabs ||
		characterManagementTabs ||
		personaManagementTabs ||
		descriptorSubheader ? (
			<>
				{aiSettingsTabs}
				{characterManagementTabs}
				{personaManagementTabs}
				{descriptorSubheader}
			</>
		) : undefined;
	const panelTitle = resolvePanelTitle({
		currentChatIdentitySnapshot,
		currentUserAvatarSnapshot,
		descriptor: headerDescriptor,
	});
	const bodyOverlay = activeDescriptor.bodyOverlay?.();

	return (
		<>
			<MobilePagePanel
				accessibleTitle={panelTitle}
				className="sillytavern-interface-panel"
				id={SILLYTAVERN_INTERFACE_ID}
				open={open}
				onOpenChange={handlePanelOpenChange}
			>
				<div className="sillytavern-interface-panel__header">
					<div className="sillytavern-interface-panel__header-main">
						<div
							className="sillytavern-interface-panel__title"
							id={SILLYTAVERN_INTERFACE_TITLE_ID}
						>
							{panelTitle}
						</div>
					</div>
					<div className="sillytavern-interface-panel__header-end">
						{renderDocsLink(activeDescriptor)}
					</div>
				</div>
				{subheader ? (
					<div className="sillytavern-interface-panel__subheader">
						{subheader}
					</div>
				) : null}
				<div className="sillytavern-interface-panel__body">
					<ScrollArea.Root
						className="sillytavern-interface-panel__scroll-area"
						data-astra-scroll-affordance="surface"
					>
						<ScrollArea.Viewport
							ref={viewportRef}
							className="sillytavern-interface-panel__viewport"
							onScroll={handleViewportScroll}
						>
							<ScrollArea.Content
								className="sillytavern-interface-panel__content"
								id={SILLYTAVERN_INTERFACE_CONTENT_ID}
								style={{
									boxSizing: "border-box",
									minWidth: "0",
									width: "100%",
								}}
							>
								{activeDescriptor.render()}
							</ScrollArea.Content>
						</ScrollArea.Viewport>
						<ScrollArea.Scrollbar
							className="sillytavern-interface-panel__scrollbar"
							keepMounted={true}
							orientation="vertical"
						>
							<ScrollArea.Thumb />
						</ScrollArea.Scrollbar>
						<ScrollArea.Corner />
					</ScrollArea.Root>
					{bodyOverlay ? (
						<div className="sillytavern-interface-panel__body-overlay">
							{bodyOverlay}
						</div>
					) : null}
					<div
						className="sillytavern-interface-panel__footer-accessory"
						data-state={isMainNavigationVisible ? "open" : "closed"}
					>
						<SillyTavernInterfaceMainNavigationStrip
							activePageKey={resolvedActivePageKey}
							ariaLabel={translateAstra(
								"sillyTavernInterface.mainNav.label",
							)}
							id={SILLYTAVERN_INTERFACE_MAIN_NAVIGATION_ID}
							items={mainNavigationItems}
							visible={isMainNavigationVisible}
							onPageSelect={handlePageSelect}
						/>
					</div>
					<div className="sillytavern-interface-panel__footer">
						<div className="sillytavern-interface-panel__footer-main">
							<div className="sillytavern-interface__body-header-row">
								<Button
									className="sillytavern-interface__section-nav-button"
									disabled={true}
									size="sm"
									type="button"
									variant="ghost"
								>
									<UiIcon
										aria-hidden={true}
										className="sillytavern-interface__section-nav-button-icon"
										icon={TextAlignStart}
										size="sm"
									/>
									<span className="sillytavern-interface__section-nav-button-label">
										{translateAstra(
											"sillyTavernInterface.sectionNav.button",
										)}
									</span>
								</Button>
							</div>
						</div>
						<div className="sillytavern-interface-panel__footer-center">
							<Button
								aria-controls={
									SILLYTAVERN_INTERFACE_MAIN_NAVIGATION_ID
								}
								aria-expanded={isMainNavigationVisible}
								aria-label={translateAstra(
									"sillyTavernInterface.mainNav.toggle",
								)}
								className="sillytavern-interface__main-nav-toggle-button"
								data-expanded={
									isMainNavigationVisible ? "true" : "false"
								}
								id={SILLYTAVERN_INTERFACE_MENU_BUTTON_ID}
								size="icon-sm"
								type="button"
								variant="default"
								onClick={handleMainNavigationToggle}
							>
								<UiIcon
									aria-hidden={true}
									className="sillytavern-interface__main-nav-toggle-button-icon"
									icon={ChevronUp}
									size="sm"
								/>
							</Button>
						</div>
						<div
							className="sillytavern-interface-panel__footer-end"
							id={SILLYTAVERN_INTERFACE_CLOSE_BUTTON_WRAPPER_ID}
						>
							<Button
								aria-label={translateAstra(
									"sillyTavernInterface.close",
								)}
								className="sillytavern-interface-panel__close-button"
								id={SILLYTAVERN_INTERFACE_CLOSE_BUTTON_ID}
								size="icon-sm"
								type="button"
								variant="ghost"
								onClick={() => {
									handlePanelOpenChange(false);
								}}
							>
								<UiIcon aria-hidden={true} icon={X} size="sm" />
							</Button>
						</div>
					</div>
				</div>
			</MobilePagePanel>
		</>
	);
}
