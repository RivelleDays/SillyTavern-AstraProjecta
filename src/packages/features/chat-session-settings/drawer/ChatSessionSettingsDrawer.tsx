import * as React from "react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/astra/drawer";
import { translateAstra } from "@/packages/core/i18n";
import { ChatBackgroundSettingsTab } from "@/packages/features/chat-session-settings/chat-background/ChatBackgroundSettingsTab";
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

export function ChatSessionSettingsDrawer({
	onOpenChange,
	open,
}: ChatSessionSettingsDrawerProps) {
	const title = translateAstra("chatSessionSettings.panel.title");
	const description = translateAstra("chatSessionSettings.drawer.description");

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
				<div className="chat-session-settings-drawer__header">
					<h2
						id={CHAT_SESSION_SETTINGS_DRAWER_TITLE_ID}
						className="chat-session-settings-drawer__title"
					>
						{title}
					</h2>
					<p
						id={CHAT_SESSION_SETTINGS_DRAWER_DESCRIPTION_ID}
						className="chat-session-settings-drawer__description"
					>
						{description}
					</p>
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
					<ChatBackgroundSettingsTab />
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}
