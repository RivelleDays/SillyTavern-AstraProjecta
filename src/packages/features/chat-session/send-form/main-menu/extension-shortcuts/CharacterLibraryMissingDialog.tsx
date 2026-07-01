import * as React from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogClose,
} from "@/components/ui/astra/ResponsiveDialog";
import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import { ExternalLink, TriangleAlert } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import { ASTRA_CHAT_MAIN_MENU_CHARACTER_LIBRARY_MISSING_DIALOG_ID } from "@/packages/features/chat-session/send-form/contracts/dom";

const CHARACTER_LIBRARY_REPOSITORY_URL =
	"https://github.com/Sillyanonymous/SillyTavern-CharacterLibrary";

export interface CharacterLibraryMissingDialogProps {
	onOpenChange(nextValue: boolean): void;
	open: boolean;
}

export function CharacterLibraryMissingDialog({
	onOpenChange,
	open,
}: CharacterLibraryMissingDialogProps) {
	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);
	const footer = (
		<div className="astra-chat-library-dialog-footer">
			<ResponsiveDialogClose asChild={true}>
				<Button
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
					type="button"
					variant="default"
				>
					{translateAstra(
						"sendForm.mainMenu.extensionShortcuts.missing.close",
					)}
				</Button>
			</ResponsiveDialogClose>
		</div>
	);

	return (
		<ResponsiveDialog
			description={translateAstra(
				"sendForm.mainMenu.extensionShortcuts.missing.description",
			)}
			footer={footer}
			id={ASTRA_CHAT_MAIN_MENU_CHARACTER_LIBRARY_MISSING_DIALOG_ID}
			icon={<UiIcon aria-hidden={true} icon={TriangleAlert} size="sm" />}
			open={open}
			title={translateAstra(
				"sendForm.mainMenu.extensionShortcuts.missing.title",
			)}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			<div className="astra-dialog-section astra-chat-library-dialog-content">
				<p className="astra-chat-library-dialog-text">
					{translateAstra(
						"sendForm.mainMenu.extensionShortcuts.missing.description",
					)}
				</p>
				<a
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--confirm"
					href={CHARACTER_LIBRARY_REPOSITORY_URL}
					rel="noreferrer"
					target="_blank"
				>
					<UiIcon aria-hidden={true} icon={ExternalLink} size="sm" />
					{translateAstra(
						"sendForm.mainMenu.extensionShortcuts.github",
					)}
				</a>
			</div>
		</ResponsiveDialog>
	);
}
