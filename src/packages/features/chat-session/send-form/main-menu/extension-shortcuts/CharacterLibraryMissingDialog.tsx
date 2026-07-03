import * as React from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogClose,
} from "@/components/ui/astra/ResponsiveDialog";
import { Button } from "@/components/ui/shadcn/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/shadcn/empty";
import { Input } from "@/components/ui/shadcn/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/shadcn/tooltip";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	Check,
	Copy,
	SquareArrowOutUpRight,
	TriangleAlert,
} from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
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
	const repositoryInputId = React.useId();
	const copiedResetTimerRef = React.useRef<ReturnType<
		typeof setTimeout
	> | null>(null);
	const [copied, setCopied] = React.useState(false);

	const clearCopiedResetTimer = React.useCallback(() => {
		if (!copiedResetTimerRef.current) {
			return;
		}

		clearTimeout(copiedResetTimerRef.current);
		copiedResetTimerRef.current = null;
	}, []);

	React.useEffect(() => {
		return clearCopiedResetTimer;
	}, [clearCopiedResetTimer]);

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	const handleCopyRepositoryUrl = React.useCallback(() => {
		const clipboard = navigator.clipboard;
		const selectRepositoryInput = () => {
			const input = document.getElementById(repositoryInputId);

			if (input instanceof HTMLInputElement) {
				input.select();
			}
		};

		if (!clipboard?.writeText) {
			selectRepositoryInput();
			return;
		}

		void clipboard
			.writeText(CHARACTER_LIBRARY_REPOSITORY_URL)
			.then(() => {
				clearCopiedResetTimer();
				setCopied(true);
				copiedResetTimerRef.current = setTimeout(() => {
					setCopied(false);
					copiedResetTimerRef.current = null;
				}, 1500);
			})
			.catch(() => {
				selectRepositoryInput();
			});
	}, [clearCopiedResetTimer, repositoryInputId]);

	const title = translateAstra(
		"sendForm.mainMenu.extensionShortcuts.missing.title",
	);
	const description = translateAstra(
		"sendForm.mainMenu.extensionShortcuts.missing.description",
	);
	const repositoryUrlLabel = translateAstra(
		"sendForm.mainMenu.extensionShortcuts.missing.repositoryUrlLabel",
	);
	const copyLabel = translateAstra(
		"sendForm.mainMenu.extensionShortcuts.missing.copyRepositoryUrl",
	);
	const copiedLabel = translateAstra(
		"sendForm.mainMenu.extensionShortcuts.missing.copied",
	);
	const copyButtonLabel = copied ? copiedLabel : copyLabel;

	const footer = (
		<div className="astra-chat-library-dialog-footer">
			<div className="astra-chat-library-dialog-footer-actions">
				<ResponsiveDialogClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						type="button"
						variant="ghost"
					>
						{translateAstra(
							"sendForm.mainMenu.extensionShortcuts.missing.close",
						)}
					</Button>
				</ResponsiveDialogClose>
				<Button
					asChild={true}
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--confirm"
					variant="default"
				>
					<a
						href={CHARACTER_LIBRARY_REPOSITORY_URL}
						rel="noreferrer"
						target="_blank"
					>
						<UiIcon
							aria-hidden={true}
							data-icon="inline-start"
							icon={SquareArrowOutUpRight}
							size="sm"
						/>
						{translateAstra(
							"sendForm.mainMenu.extensionShortcuts.github",
						)}
					</a>
				</Button>
			</div>
		</div>
	);

	return (
		<ResponsiveDialog
			description={description}
			footer={footer}
			hideHeader={true}
			hideHeading={true}
			id={ASTRA_CHAT_MAIN_MENU_CHARACTER_LIBRARY_MISSING_DIALOG_ID}
			icon={<UiIcon aria-hidden={true} icon={TriangleAlert} size="sm" />}
			open={open}
			title={title}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			<div className="astra-dialog-section astra-chat-library-dialog-content">
				<Empty className="astra-chat-library-missing-dialog__empty">
					<EmptyHeader className="astra-chat-library-missing-dialog__empty-header">
						<EmptyMedia
							className="astra-chat-library-missing-dialog__empty-icon"
							variant="icon"
						>
							<UiIcon
								aria-hidden={true}
								icon={TriangleAlert}
								size="sm"
							/>
						</EmptyMedia>
						<EmptyTitle>{title}</EmptyTitle>
						<EmptyDescription>{description}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent className="astra-chat-library-missing-dialog__empty-content">
						<div className="astra-chat-library-missing-dialog__repository-field">
							<label
								className="astra-chat-library-missing-dialog__repository-label"
								htmlFor={repositoryInputId}
							>
								{repositoryUrlLabel}
							</label>
							<div className="astra-chat-library-missing-dialog__repository-control">
								<Input
									readOnly={true}
									className="astra-chat-library-missing-dialog__repository-input"
									id={repositoryInputId}
									type="text"
									value={CHARACTER_LIBRARY_REPOSITORY_URL}
									onFocus={(event) => {
										event.currentTarget.select();
									}}
								/>
								<TooltipProvider delayDuration={0}>
									<Tooltip>
										<TooltipTrigger asChild={true}>
											<button
												aria-label={copyButtonLabel}
												className="astra-chat-library-missing-dialog__copy-button"
												disabled={copied}
												type="button"
												onClick={
													handleCopyRepositoryUrl
												}
											>
												<span
													aria-hidden={true}
													className={cn(
														"astra-chat-library-missing-dialog__copy-icon",
														"astra-chat-library-missing-dialog__copy-icon--copied",
													)}
													data-visible={
														copied
															? "true"
															: "false"
													}
												>
													<UiIcon
														aria-hidden={true}
														icon={Check}
														size="sm"
													/>
												</span>
												<span
													aria-hidden={true}
													className={cn(
														"astra-chat-library-missing-dialog__copy-icon",
														"astra-chat-library-missing-dialog__copy-icon--copy",
													)}
													data-visible={
														copied
															? "false"
															: "true"
													}
												>
													<UiIcon
														aria-hidden={true}
														icon={Copy}
														size="sm"
													/>
												</span>
											</button>
										</TooltipTrigger>
										<TooltipContent className="astra-chat-library-missing-dialog__copy-tooltip">
											{copyButtonLabel}
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</div>
					</EmptyContent>
				</Empty>
			</div>
		</ResponsiveDialog>
	);
}
