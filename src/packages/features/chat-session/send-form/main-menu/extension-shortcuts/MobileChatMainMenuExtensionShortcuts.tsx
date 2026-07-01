import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { ChevronDown, ChevronRight } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import {
	ASTRA_CHAT_MAIN_MENU_CHARACTER_LIBRARY_SHORTCUT_ID,
	ASTRA_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_CONTENT_ID,
	ASTRA_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_SECTION_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";

export interface MobileChatMainMenuExtensionShortcutsProps {
	expanded: boolean;
	onExpandedChange(nextExpanded: boolean): void;
	onRequestCharacterLibrary(): void;
}

export function MobileChatMainMenuExtensionShortcuts({
	expanded,
	onExpandedChange,
	onRequestCharacterLibrary,
}: MobileChatMainMenuExtensionShortcutsProps) {
	const ToggleIcon = expanded ? ChevronDown : ChevronRight;
	const toggleLabel = translateAstra(
		expanded
			? "sendForm.mainMenu.extensionShortcuts.collapse"
			: "sendForm.mainMenu.extensionShortcuts.expand",
	);

	return (
		<section
			id={ASTRA_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_SECTION_ID}
			aria-label={translateAstra(
				"sendForm.mainMenu.extensionShortcuts.region",
			)}
			className="astra-chat-main-menu-extension-shortcuts"
		>
			<Button
				aria-controls={
					ASTRA_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_CONTENT_ID
				}
				aria-expanded={expanded}
				aria-label={toggleLabel}
				className="astra-chat-main-menu-extension-shortcuts__toggle"
				size="sm"
				type="button"
				variant="ghost"
				onClick={() => {
					onExpandedChange(!expanded);
				}}
			>
				<span className="astra-chat-main-menu-extension-shortcuts__title">
					{translateAstra(
						"sendForm.mainMenu.extensionShortcuts.title",
					)}
				</span>
				<ToggleIcon
					aria-hidden={true}
					className="astra-chat-main-menu-extension-shortcuts__toggle-icon"
					size={16}
				/>
			</Button>
			{expanded ? (
				<div
					id={ASTRA_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_CONTENT_ID}
					className="astra-chat-main-menu-extension-shortcuts__content"
				>
					<div className="astra-chat-main-menu-extension-shortcuts__grid">
						<button
							id={
								ASTRA_CHAT_MAIN_MENU_CHARACTER_LIBRARY_SHORTCUT_ID
							}
							className="astra-chat-main-menu-extension-shortcuts__button"
							type="button"
							onClick={onRequestCharacterLibrary}
						>
							<span
								aria-hidden={true}
								className="astra-chat-main-menu-extension-shortcuts__icon fa-solid fa-layer-group"
							/>
							<span className="astra-chat-main-menu-extension-shortcuts__label">
								{translateAstra(
									"sendForm.mainMenu.extensionShortcuts.characterLibrary",
								)}
							</span>
						</button>
						<div
							aria-hidden={true}
							className="astra-chat-main-menu-extension-shortcuts__placeholder"
						/>
					</div>
				</div>
			) : null}
		</section>
	);
}
