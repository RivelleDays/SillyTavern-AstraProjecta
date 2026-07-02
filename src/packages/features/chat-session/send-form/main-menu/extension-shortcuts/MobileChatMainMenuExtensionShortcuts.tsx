import * as React from "react";

import { translateAstra } from "@/packages/core/i18n";
import {
	ASTRA_CHAT_MAIN_MENU_CHARACTER_LIBRARY_SHORTCUT_ID,
	ASTRA_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_SECTION_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";

export interface MobileChatMainMenuExtensionShortcutsProps {
	onRequestCharacterLibrary(): void;
}

export function MobileChatMainMenuExtensionShortcuts({
	onRequestCharacterLibrary,
}: MobileChatMainMenuExtensionShortcutsProps) {
	return (
		<section
			id={ASTRA_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_SECTION_ID}
			aria-label={translateAstra(
				"sendForm.mainMenu.extensionShortcuts.region",
			)}
			className="astra-chat-main-menu-extension-shortcuts"
		>
			<div className="astra-chat-main-menu-extension-shortcuts__content">
				<div className="astra-chat-main-menu-extension-shortcuts__grid">
					<button
						id={ASTRA_CHAT_MAIN_MENU_CHARACTER_LIBRARY_SHORTCUT_ID}
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
		</section>
	);
}
