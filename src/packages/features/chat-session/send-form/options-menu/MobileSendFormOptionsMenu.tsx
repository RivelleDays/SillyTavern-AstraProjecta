import * as React from "react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/astra/drawer";
import { UiIcon } from "@/components/ui/shared/icon";
import { Menu } from "@/components/ui/shared/icons";
import { buttonVariants } from "@/components/ui/shadcn/button";
import { Label } from "@/components/ui/shadcn/label";
import { Switch } from "@/components/ui/shadcn/switch";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";
import {
	ASTRA_SEND_FORM_MENU_BUTTON_ID,
	ASTRA_SEND_FORM_OPTIONS_DRAWER_DESCRIPTION_ID,
	ASTRA_SEND_FORM_OPTIONS_DRAWER_ID,
	ASTRA_SEND_FORM_OPTIONS_DRAWER_MENU_ID,
	ASTRA_SEND_FORM_OPTIONS_DRAWER_SCROLLABLE_CONTENT_ID,
	ASTRA_SEND_FORM_OPTIONS_DRAWER_TITLE_ID,
	ASTRA_SEND_FORM_SHORTCUTS_TOGGLE_ID,
	ASTRA_SEND_FORM_SHORTCUTS_TOGGLE_SWITCH_ID,
	NATIVE_OPTIONS_ROOT_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";
import { triggerNativeOption } from "@/packages/features/chat-session/send-form/bridges/nativeOptionBridge";
import {
	isMenuOpenKeyboardEvent,
	releaseSendFormFocus,
} from "@/packages/features/chat-session/send-form/bridges/focusRelease";
import { buildMobileSendFormMenuGroups } from "@/packages/features/chat-session/send-form/options-menu/menuModel";
import type { MobileSendFormMenuActionDescriptor } from "@/packages/features/chat-session/send-form/options-menu/types";

interface StContextLike {
	Popup?: {
		show?: {
			confirm?: unknown;
		};
	};
	chatId?: unknown;
	eventSource?: unknown;
	eventTypes?: unknown;
	event_types?: unknown;
	executeSlashCommandsWithOptions?: unknown;
}

function useMenuVersion(documentRef: Document) {
	const [, bumpVersion] = React.useReducer((value: number) => value + 1, 0);

	React.useEffect(() => {
		const refresh = () => {
			bumpVersion();
		};

		let eventSource: EventSourceLike | null = null;
		let activeEventNames: string[] = [];

		try {
			const rawContext = getStContext();
			const context = isRecord(rawContext)
				? (rawContext as StContextLike & Record<string, unknown>)
				: null;

			eventSource =
				context && isRecord(context.eventSource)
					? (context.eventSource as EventSourceLike)
					: null;

			const eventTypes = context ? resolveEventTypes(context) : {};

			activeEventNames = [
				eventTypes.APP_READY,
				eventTypes.CHAT_CHANGED,
				eventTypes.CHAT_LOADED,
				eventTypes.SETTINGS_UPDATED,
				eventTypes.MESSAGE_SENT,
			].filter(
				(eventName): eventName is string =>
					typeof eventName === "string" && eventName.length > 0,
			);

			if (eventSource) {
				for (const eventName of activeEventNames) {
					eventSource.on(eventName, refresh);
				}
			}
		} catch {
			eventSource = null;
			activeEventNames = [];
		}

		const observer = new MutationObserver(refresh);
		const optionsRoot = documentRef.getElementById(NATIVE_OPTIONS_ROOT_ID);

		if (optionsRoot) {
			observer.observe(optionsRoot, {
				attributeFilter: ["class", "hidden", "style"],
				attributes: true,
				childList: true,
				subtree: true,
			});
		} else if (documentRef.body) {
			observer.observe(documentRef.body, {
				attributeFilter: ["class", "style"],
				attributes: true,
				childList: true,
				subtree: true,
			});
		}

		return () => {
			if (eventSource) {
				for (const eventName of activeEventNames) {
					eventSource.removeListener(eventName, refresh);
				}
			}

			observer.disconnect();
		};
	}, [documentRef]);
}

function reloadPage() {
	window.location.reload();
}

async function triggerMenuAction({
	action,
	documentRef,
	onPageReload,
}: {
	action: MobileSendFormMenuActionDescriptor;
	documentRef: Document;
	onPageReload: () => void;
}) {
	if (!action.isEnabled) {
		return;
	}

	if (action.kind === "page-reload") {
		onPageReload();
		return;
	}

	if (action.kind === "native-option") {
		triggerNativeOption({
			documentRef,
			nativeOptionId: action.nativeOptionId,
		});
		return;
	}

	let context: StContextLike | null = null;
	try {
		const rawContext = getStContext();
		context = isRecord(rawContext) ? (rawContext as StContextLike) : null;
	} catch {
		return;
	}

	if (!context) {
		return;
	}

	const popupConfirm = context.Popup?.show?.confirm;
	const executeSlashCommandsWithOptions =
		context.executeSlashCommandsWithOptions;
	const chatId =
		typeof context.chatId === "string" ? context.chatId.trim() : "";

	if (
		typeof popupConfirm !== "function" ||
		typeof executeSlashCommandsWithOptions !== "function" ||
		(action.requiresActiveChat && chatId.length === 0)
	) {
		return;
	}

	const confirmed = await popupConfirm(action.confirmTitle);
	if (!confirmed) {
		return;
	}

	await executeSlashCommandsWithOptions(action.command);
}

export function MobileSendFormOptionsMenu({
	documentRef = document,
	interactionBlocked = false,
	onPageReload = reloadPage,
	onShowShortcutsToolbarChange = () => {},
	showShortcutsToolbar = true,
}: {
	documentRef?: Document;
	interactionBlocked?: boolean;
	onPageReload?: () => void;
	onShowShortcutsToolbarChange?(nextValue: boolean): void;
	showShortcutsToolbar?: boolean;
}) {
	const [isOpen, setIsOpen] = React.useState(false);
	const triggerLabel = translateAstra("sendForm.options.trigger");
	const title = translateAstra("sendForm.options.title");
	const description = translateAstra("sendForm.options.description");
	const shortcutsVisibilityLabel = translateAstra(
		"sendForm.options.shortcutsVisibility",
	);

	useMenuVersion(documentRef);

	const groups = buildMobileSendFormMenuGroups({ documentRef });

	const handleActionClick = React.useCallback(
		async (action: MobileSendFormMenuActionDescriptor) => {
			await triggerMenuAction({ action, documentRef, onPageReload });
			setIsOpen(false);
		},
		[documentRef, onPageReload],
	);

	const handleOpenRequest = React.useCallback(() => {
		if (interactionBlocked) {
			return;
		}

		releaseSendFormFocus(documentRef);
		setIsOpen(true);
	}, [documentRef, interactionBlocked]);

	const handleTriggerPointerDownCapture = React.useCallback(() => {
		if (interactionBlocked) {
			return;
		}

		releaseSendFormFocus(documentRef);
	}, [documentRef, interactionBlocked]);

	const handleTriggerKeyDownCapture = React.useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (interactionBlocked) {
				return;
			}

			if (!isMenuOpenKeyboardEvent(event.nativeEvent)) {
				return;
			}

			releaseSendFormFocus(documentRef);
		},
		[documentRef, interactionBlocked],
	);

	return (
		<Drawer
			direction="bottom"
			onOpenChange={setIsOpen}
			open={isOpen}
			repositionInputs={false}
		>
			<button
				aria-controls={ASTRA_SEND_FORM_OPTIONS_DRAWER_ID}
				aria-expanded={isOpen}
				aria-label={triggerLabel}
				id={ASTRA_SEND_FORM_MENU_BUTTON_ID}
				className={cn(
					buttonVariants({
						size: "icon-xs",
						variant: "ghost",
					}),
					"astra-chat-input__tool-button",
				)}
				title={triggerLabel}
				type="button"
				onClick={handleOpenRequest}
				onKeyDownCapture={handleTriggerKeyDownCapture}
				onPointerDownCapture={handleTriggerPointerDownCapture}
			>
				<UiIcon aria-hidden={true} icon={Menu} size="sm" />
			</button>
			<DrawerContent
				aria-describedby={
					ASTRA_SEND_FORM_OPTIONS_DRAWER_DESCRIPTION_ID
				}
				aria-labelledby={ASTRA_SEND_FORM_OPTIONS_DRAWER_TITLE_ID}
				id={ASTRA_SEND_FORM_OPTIONS_DRAWER_ID}
				className="astra-send-form-options-drawer"
			>
				<DrawerHeader className="sr-only">
					<DrawerTitle asChild={true}>
						<span>
							<span
								id={ASTRA_SEND_FORM_OPTIONS_DRAWER_TITLE_ID}
								data-slot="drawer-title"
							>
								{title}
							</span>
						</span>
					</DrawerTitle>
					<DrawerDescription asChild={true}>
						<span>
							<span
								id={
									ASTRA_SEND_FORM_OPTIONS_DRAWER_DESCRIPTION_ID
								}
								data-slot="drawer-description"
							>
								{description}
							</span>
						</span>
					</DrawerDescription>
				</DrawerHeader>
				<DrawerBody
					scrollAreaProps={{
						className:
							"astra-send-form-options-drawer__scroll-area",
					}}
					viewportProps={{
						className:
							"astra-send-form-options-drawer__scrollable-content",
						id: ASTRA_SEND_FORM_OPTIONS_DRAWER_SCROLLABLE_CONTENT_ID,
					}}
				>
					<div
						id={ASTRA_SEND_FORM_OPTIONS_DRAWER_MENU_ID}
						className="astra-send-form-options-drawer__menu"
					>
						{groups.map((group) => {
							const groupSection = (
								<section
									className={`astra-send-form-options-drawer__group astra-send-form-options-drawer__group--${group.key}`}
									key={group.key}
								>
									<div className="astra-send-form-options-drawer__group-label astra-send-form-surface-label">
										{group.label}
									</div>
									<div className="astra-send-form-options-drawer__group-items">
										{group.actions.map((action) => {
											return (
												<button
													className={[
														"astra-send-form-options-drawer__item",
														action.variant ===
														"destructive"
															? "astra-send-form-options-drawer__item--destructive"
															: "",
													]
														.join(" ")
														.trim()}
													disabled={!action.isEnabled}
													key={action.key}
													type="button"
													onClick={() => {
														void handleActionClick(
															action,
														);
													}}
												>
													<UiIcon
														aria-hidden={true}
														icon={action.icon}
														size="sm"
													/>
													<span>{action.label}</span>
												</button>
											);
										})}
									</div>
								</section>
							);

							if (group.key !== "danger-zone") {
								return groupSection;
							}

							return (
								<React.Fragment key={group.key}>
									<section className="astra-send-form-options-drawer__group astra-send-form-options-drawer__group--shortcuts-visibility">
										<div className="astra-send-form-options-drawer__group-items">
											<div
												id={
													ASTRA_SEND_FORM_SHORTCUTS_TOGGLE_ID
												}
												className="astra-send-form-options-drawer__toggle"
											>
												<Label
													className="astra-send-form-options-drawer__toggle-label"
													htmlFor={
														ASTRA_SEND_FORM_SHORTCUTS_TOGGLE_SWITCH_ID
													}
												>
													{shortcutsVisibilityLabel}
												</Label>
												<Switch
													checked={
														showShortcutsToolbar
													}
													id={
														ASTRA_SEND_FORM_SHORTCUTS_TOGGLE_SWITCH_ID
													}
													size="default"
													type="button"
													onCheckedChange={
														onShowShortcutsToolbarChange
													}
												/>
											</div>
										</div>
									</section>
									{groupSection}
								</React.Fragment>
							);
						})}
					</div>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
