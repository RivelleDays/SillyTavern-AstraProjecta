import * as React from "react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	useAstraDrawerClose,
} from "@/components/ui/astra/drawer";
import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import { MessageCircleMore, Save } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import { ChatBackgroundSettingsTab } from "@/packages/features/chat-session-settings/chat-background/ChatBackgroundSettingsTab";
import {
	createChatBackgroundAppearanceStore,
	type ChatBackgroundAppearanceInput,
} from "@/packages/core/st/chat-background-appearance";
import {
	CHAT_SESSION_SETTINGS_DRAWER_BODY_ID,
	CHAT_SESSION_SETTINGS_DRAWER_CONTENT_ID,
	CHAT_SESSION_SETTINGS_DRAWER_DESCRIPTION_ID,
	CHAT_SESSION_SETTINGS_DRAWER_ID,
	CHAT_SESSION_SETTINGS_DRAWER_SCROLLABLE_CONTENT_ID,
	CHAT_SESSION_SETTINGS_DRAWER_TITLE_ID,
} from "@/packages/features/chat-session-settings/contracts/dom";

export interface ChatSessionSettingsDrawerProps {
	onOpenChange(nextOpen: boolean): void;
	open: boolean;
}

function isSameAppearance(
	left: ChatBackgroundAppearanceInput,
	right: ChatBackgroundAppearanceInput,
) {
	return (
		left.blurPx === right.blurPx &&
		left.opacityPercent === right.opacityPercent
	);
}

function ChatSessionSettingsDrawerFooter({
	canSave,
	onCancel,
	onSave,
}: {
	canSave: boolean;
	onCancel(): void;
	onSave(): void;
}) {
	const requestClose = useAstraDrawerClose();

	return (
		<div className="astra-dialog-footer">
			<div className="chat-session-settings-drawer__footer-actions">
				<Button
					className="chat-session-settings-drawer__action chat-session-settings-drawer__action--cancel"
					type="button"
					variant="ghost"
					onClick={() => {
						onCancel();
						requestClose();
					}}
				>
					{translateAstra("chatSessionSettings.drawer.cancel")}
				</Button>
				<Button
					className="chat-session-settings-drawer__action chat-session-settings-drawer__action--save"
					disabled={!canSave}
					type="button"
					variant="default"
					onClick={() => {
						onSave();
						requestClose();
					}}
				>
					<UiIcon aria-hidden={true} icon={Save} size="sm" />
					{translateAstra("chatSessionSettings.drawer.save")}
				</Button>
			</div>
		</div>
	);
}

export function ChatSessionSettingsDrawer({
	onOpenChange,
	open,
}: ChatSessionSettingsDrawerProps) {
	const store = React.useMemo(() => createChatBackgroundAppearanceStore(), []);
	const snapshot = React.useSyncExternalStore(
		store.subscribe,
		store.getSnapshot,
		store.getSnapshot,
	);
	const title = translateAstra("chatSessionSettings.panel.title");
	const description = translateAstra("chatSessionSettings.drawer.description");
	const persistedAppearance = React.useMemo<ChatBackgroundAppearanceInput>(
		() => ({
			blurPx: snapshot.blurPx,
			opacityPercent: snapshot.opacityPercent,
		}),
		[snapshot.blurPx, snapshot.opacityPercent],
	);
	const [draftAppearance, setDraftAppearance] =
		React.useState<ChatBackgroundAppearanceInput>(persistedAppearance);
	const canSave = !isSameAppearance(draftAppearance, persistedAppearance);

	React.useEffect(() => () => store.dispose(), [store]);

	React.useEffect(() => {
		if (!open) {
			return;
		}

		setDraftAppearance(persistedAppearance);
	}, [open, persistedAppearance]);

	const handleCancel = React.useCallback(() => {
		setDraftAppearance(persistedAppearance);
	}, [persistedAppearance]);

	const handleSave = React.useCallback(() => {
		if (!canSave) {
			return;
		}

		store.setAppearance(draftAppearance);
	}, [canSave, draftAppearance, store]);

	return (
		<Drawer
			direction="bottom"
			onOpenChange={onOpenChange}
			open={open}
			repositionInputs={false}
		>
			<DrawerContent
				aria-describedby={CHAT_SESSION_SETTINGS_DRAWER_DESCRIPTION_ID}
				aria-labelledby={CHAT_SESSION_SETTINGS_DRAWER_TITLE_ID}
				id={CHAT_SESSION_SETTINGS_DRAWER_ID}
				className="chat-session-settings-drawer"
			>
				<DrawerHeader className="sr-only">
					<DrawerTitle asChild={true}>
						<div
							aria-hidden={true}
							className="chat-session-settings-drawer__primitive-a11y-guard sr-only"
						/>
					</DrawerTitle>
					<DrawerDescription asChild={true}>
						<div
							aria-hidden={true}
							className="chat-session-settings-drawer__primitive-a11y-guard sr-only"
						/>
					</DrawerDescription>
				</DrawerHeader>
				<div className="chat-session-settings-drawer__header astra-dialog-header">
					<div className="chat-session-settings-drawer__heading astra-dialog-heading">
						<span aria-hidden={true} className="astra-dialog-icon">
							<UiIcon
								aria-hidden={true}
								icon={MessageCircleMore}
								size="sm"
							/>
						</span>
						<div className="astra-dialog-headingContent">
							<h2
								id={CHAT_SESSION_SETTINGS_DRAWER_TITLE_ID}
								className="chat-session-settings-drawer__title astra-dialog-title"
							>
								{title}
							</h2>
							<p
								id={CHAT_SESSION_SETTINGS_DRAWER_DESCRIPTION_ID}
								className="chat-session-settings-drawer__description astra-dialog-description sr-only"
							>
								{description}
							</p>
						</div>
					</div>
				</div>
				<DrawerBody
					id={CHAT_SESSION_SETTINGS_DRAWER_BODY_ID}
					className="chat-session-settings-drawer__body"
					contentProps={{
						id: CHAT_SESSION_SETTINGS_DRAWER_CONTENT_ID,
						className: "chat-session-settings-drawer__content",
					}}
					viewportProps={{
						id: CHAT_SESSION_SETTINGS_DRAWER_SCROLLABLE_CONTENT_ID,
						className: "chat-session-settings-drawer__viewport",
					}}
				>
					<ChatBackgroundSettingsTab
						appearance={draftAppearance}
						onAppearanceChange={setDraftAppearance}
					/>
				</DrawerBody>
				<ChatSessionSettingsDrawerFooter
					canSave={canSave}
					onCancel={handleCancel}
					onSave={handleSave}
				/>
			</DrawerContent>
		</Drawer>
	);
}
