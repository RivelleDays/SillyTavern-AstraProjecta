import * as React from "react";

import { translateAstra } from "@/packages/core/i18n";
import {
	ASTRA_CHAT_MAIN_MENU_CHARACTER_LIBRARY_SHORTCUT_ID,
	ASTRA_CHAT_MAIN_MENU_EXTENSION_SHORTCUTS_SECTION_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";
import { splitMobileChatMainMenuTileLabel } from "@/packages/features/chat-session/send-form/main-menu/tiles";

export interface MobileChatMainMenuExtensionShortcutsProps {
	onRequestCharacterLibrary(): void;
}

export function MobileChatMainMenuExtensionShortcuts({
	onRequestCharacterLibrary,
}: MobileChatMainMenuExtensionShortcutsProps) {
	const characterLibraryLabel = translateAstra(
		"sendForm.mainMenu.extensionShortcuts.characterLibrary",
	);
	const characterLibraryLabelLines = splitMobileChatMainMenuTileLabel(
		characterLibraryLabel,
		[1, 1],
	);

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
					<div className="astra-chat-main-menu-drawer__tile-shell">
						<button
							id={
								ASTRA_CHAT_MAIN_MENU_CHARACTER_LIBRARY_SHORTCUT_ID
							}
							aria-label={characterLibraryLabel}
							className="astra-chat-main-menu-drawer__tile"
							type="button"
							onClick={onRequestCharacterLibrary}
						>
							<span
								aria-hidden={true}
								className="astra-chat-main-menu-drawer__tile-glow"
							/>
							<span
								aria-hidden={true}
								className="astra-chat-main-menu-drawer__tile-icon astra-chat-main-menu-extension-shortcuts__icon fa-solid fa-layer-group"
							/>
							<span
								aria-hidden={true}
								className="astra-chat-main-menu-drawer__tile-deco-icon astra-chat-main-menu-extension-shortcuts__icon fa-solid fa-layer-group"
							/>
							<span
								aria-hidden={true}
								className="astra-chat-main-menu-drawer__tile-fade"
							/>
							<span className="astra-chat-main-menu-drawer__tile-title">
								{characterLibraryLabelLines.map(
									(line, index) => (
										<span
											className="astra-chat-main-menu-drawer__tile-title-line"
											key={`${line}-${index}`}
										>
											{line}
										</span>
									),
								)}
							</span>
						</button>
					</div>
					<div
						aria-hidden={true}
						className="astra-chat-main-menu-extension-shortcuts__placeholder"
					/>
				</div>
			</div>
		</section>
	);
}
