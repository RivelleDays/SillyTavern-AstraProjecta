import * as React from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogClose,
	useResponsiveDialogClose,
} from "@/components/ui/astra/ResponsiveDialog";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	CircleUser,
	FolderBookmark,
	Globe,
	PencilLine,
	Trash2,
	TriangleAlert,
} from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import type {
	ChatCategory,
	ChatCategoryStore,
} from "@/packages/core/st/chat-categories";
import type { I18nKey } from "@/types/i18n";

import {
	GLOBAL_CATEGORY_DELETE_DRAWER_ID,
	GLOBAL_CATEGORY_RENAME_DRAWER_ID,
	GLOBAL_CATEGORY_RENAME_DRAWER_INPUT_ID,
	getCategoryErrorMessage,
	getCategoryScopeIcon,
	getCategoryScopeLabelKey,
	useDelayedDrawerContentMount,
	type CategoryActionDrawerState,
	type CategoryActionMode,
} from "@/packages/features/astra-main-interface/chat-categories/categoryModel";

function getCategoryActionTitleKey(
	category: ChatCategory,
	mode: CategoryActionMode,
): I18nKey {
	if (category.scope === "global") {
		return mode === "delete"
			? "astraMainInterface.global.categories.delete.title"
			: "astraMainInterface.global.categories.rename.title";
	}

	if (category.ownerType === "group") {
		return mode === "delete"
			? "astraMainInterface.categories.delete.group.title"
			: "astraMainInterface.categories.rename.group.title";
	}

	return mode === "delete"
		? "astraMainInterface.categories.delete.character.title"
		: "astraMainInterface.categories.rename.character.title";
}

function getCategoryActionDescriptionKey(
	category: ChatCategory,
	mode: CategoryActionMode,
): I18nKey {
	if (category.scope === "global") {
		return mode === "delete"
			? "astraMainInterface.global.categories.delete.description"
			: "astraMainInterface.global.categories.rename.description";
	}

	if (category.ownerType === "group") {
		return mode === "delete"
			? "astraMainInterface.categories.delete.group.description"
			: "astraMainInterface.categories.rename.group.description";
	}

	return mode === "delete"
		? "astraMainInterface.categories.delete.character.description"
		: "astraMainInterface.categories.rename.character.description";
}

function getCategoryActionWarningTitleKey(
	category: ChatCategory,
	mode: CategoryActionMode,
): I18nKey {
	if (category.scope === "global") {
		return mode === "delete"
			? "astraMainInterface.global.categories.delete.warningTitle"
			: "astraMainInterface.global.categories.rename.warningTitle";
	}

	return mode === "delete"
		? "astraMainInterface.categories.delete.owner.warningTitle"
		: "astraMainInterface.categories.rename.owner.warningTitle";
}

function getCategoryActionWarningTextKey(
	category: ChatCategory,
	mode: CategoryActionMode,
): I18nKey {
	if (category.scope === "global") {
		return mode === "delete"
			? "astraMainInterface.global.categories.delete.warningText"
			: "astraMainInterface.global.categories.rename.warningText";
	}

	return mode === "delete"
		? "astraMainInterface.categories.delete.owner.warningText"
		: "astraMainInterface.categories.rename.owner.warningText";
}

function getCategoryRenameHintKey(category: ChatCategory): I18nKey {
	return category.scope === "global"
		? "astraMainInterface.global.categories.rename.hint"
		: "astraMainInterface.categories.rename.owner.hint";
}

export function CategoryActionDrawer({
	action,
	chatCategoryStore,
	onOpenChange,
}: {
	action: CategoryActionDrawerState | null;
	chatCategoryStore: ChatCategoryStore;
	onOpenChange(open: boolean): void;
}) {
	const [retainedAction, setRetainedAction] =
		React.useState<CategoryActionDrawerState | null>(action);
	const isOpen = action !== null;
	const shouldRenderDrawer = useDelayedDrawerContentMount(isOpen);
	const drawerAction = action ?? retainedAction;

	React.useEffect(() => {
		if (action) {
			setRetainedAction(action);
		}
	}, [action]);

	React.useEffect(() => {
		if (!shouldRenderDrawer && !isOpen) {
			setRetainedAction(null);
		}
	}, [isOpen, shouldRenderDrawer]);

	if (!shouldRenderDrawer || !drawerAction) {
		return null;
	}

	return (
		<CategoryActionDrawerSurface
			action={drawerAction}
			chatCategoryStore={chatCategoryStore}
			open={isOpen}
			onOpenChange={onOpenChange}
		/>
	);
}

function CategoryActionDrawerSurface({
	action,
	chatCategoryStore,
	open,
	onOpenChange,
}: {
	action: CategoryActionDrawerState;
	chatCategoryStore: ChatCategoryStore;
	open: boolean;
	onOpenChange(open: boolean): void;
}) {
	const { category, mode } = action;
	const isDelete = mode === "delete";
	const [nextName, setNextName] = React.useState(category.name);
	const [error, setError] = React.useState("");
	const [isBusy, setIsBusy] = React.useState(false);
	const isGlobalCategory = category.scope === "global";
	const drawerId = isGlobalCategory
		? isDelete
			? GLOBAL_CATEGORY_DELETE_DRAWER_ID
			: GLOBAL_CATEGORY_RENAME_DRAWER_ID
		: isDelete
			? "astra-main-interface-category-delete-drawer"
			: "astra-main-interface-category-rename-drawer";
	const title = translateAstra(getCategoryActionTitleKey(category, mode));
	const descriptionText = translateAstra(
		getCategoryActionDescriptionKey(category, mode),
	);
	const errorId = `${drawerId}-error`;
	const hintId = `${drawerId}-hint`;
	const CategoryScopeIcon = getCategoryScopeIcon(category);

	React.useEffect(() => {
		if (!open) {
			return;
		}

		setNextName(category.name);
		setError("");
		setIsBusy(false);
	}, [category.id, category.name, mode, open]);

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	const handleConfirm = React.useCallback(
		(close: () => void) => {
			if (isBusy) {
				return;
			}

			setIsBusy(true);
			try {
				if (mode === "rename") {
					const result = chatCategoryStore.renameCategory(
						category.id,
						nextName,
					);
					if (!result.ok) {
						setError(getCategoryErrorMessage(result.reason));
						return;
					}
				} else if (!chatCategoryStore.deleteCategory(category.id)) {
					setError(getCategoryErrorMessage("missing"));
					return;
				}

				setError("");
				close();
			} finally {
				setIsBusy(false);
			}
		},
		[category.id, chatCategoryStore, isBusy, mode, nextName],
	);

	return (
		<ResponsiveDialog
			className={cn(
				"astra-main-interface-drawer astra-main-interface-chat-row-action-dialog astra-main-interface-global-category-action-drawer",
				isDelete
					? "astra-main-interface-global-category-delete-drawer"
					: "astra-main-interface-global-category-rename-drawer",
			)}
			contentId={drawerId}
			description={
				<div className="astra-dialog-current-chat-file-description">
					{descriptionText}
				</div>
			}
			footer={
				<CategoryActionDrawerFooter
					isBusy={isBusy}
					mode={mode}
					onConfirm={handleConfirm}
				/>
			}
			headerContent={
				<div className="astra-chat-library-global-categoryActionDrawer__identity">
					<span
						aria-hidden={true}
						className="astra-chat-library-global-categoryActionDrawer__identityIcon"
					>
						<UiIcon icon={FolderBookmark} size="sm" />
					</span>
					<span
						className="astra-chat-library-global-categoryActionDrawer__identityName"
						title={category.name}
					>
						{category.name}
					</span>
					<Badge
						className="astra-chat-library-global-categoryActionDrawer__identityScope"
						variant="secondary"
					>
						<UiIcon
							aria-hidden={true}
							data-icon="inline-start"
							icon={CategoryScopeIcon}
							size="xs"
						/>
						{translateAstra(getCategoryScopeLabelKey(category))}
					</Badge>
				</div>
			}
			icon={
				<UiIcon
					aria-hidden={true}
					icon={isDelete ? Trash2 : PencilLine}
					size="sm"
				/>
			}
			open={open}
			title={title}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			<div className="astra-dialog-section astra-chat-library-dialog-content astra-chat-library-global-categoryActionDrawer__content">
				<div className="astra-chat-library-dialog-alert" role="alert">
					<UiIcon
						aria-hidden={true}
						className="astra-chat-library-dialog-alert-icon"
						icon={TriangleAlert}
						size="sm"
					/>
					<div className="astra-chat-library-dialog-alert-content">
						<p className="astra-chat-library-dialog-alert-title">
							{translateAstra(
								getCategoryActionWarningTitleKey(
									category,
									mode,
								),
							)}
						</p>
						<p className="astra-chat-library-dialog-alert-text">
							{translateAstra(
								getCategoryActionWarningTextKey(category, mode),
							)}
						</p>
					</div>
				</div>
				{mode === "rename" ? (
					<CategoryRenameField
						category={category}
						error={error}
						errorId={errorId}
						hintId={hintId}
						isBusy={isBusy}
						nextName={nextName}
						onConfirm={handleConfirm}
						onErrorClear={() => {
							setError("");
						}}
						onNameChange={setNextName}
					/>
				) : null}
				{error ? (
					<p
						className="astra-chat-library-category-error"
						id={errorId}
						role="alert"
					>
						{error}
					</p>
				) : null}
			</div>
		</ResponsiveDialog>
	);
}

function CategoryActionDrawerFooter({
	isBusy,
	mode,
	onConfirm,
}: {
	isBusy: boolean;
	mode: CategoryActionMode;
	onConfirm(close: () => void): void;
}) {
	const close = useResponsiveDialogClose();
	const isDelete = mode === "delete";

	return (
		<div
			className={
				isDelete
					? "astra-chat-library-dialog-footer astra-chat-library-dialog-footer--global-category-delete"
					: "astra-chat-library-dialog-footer astra-chat-library-dialog-footer--global-category-rename"
			}
		>
			{isDelete ? (
				<Button
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--delete"
					disabled={isBusy}
					type="button"
					variant="ghost"
					onClick={() => {
						onConfirm(close);
					}}
				>
					<UiIcon aria-hidden={true} icon={Trash2} size="sm" />
					{isBusy
						? translateAstra(
								"astraMainInterface.global.categories.delete.deleting",
							)
						: translateAstra(
								"astraMainInterface.global.categories.delete.confirm",
							)}
				</Button>
			) : null}
			<div className="astra-chat-library-dialog-footer-actions">
				<ResponsiveDialogClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						disabled={isBusy}
						type="button"
						variant={isDelete ? "default" : "ghost"}
					>
						{translateAstra(
							isDelete
								? "astraMainInterface.global.categories.delete.close"
								: "astraMainInterface.global.categories.rename.cancel",
						)}
					</Button>
				</ResponsiveDialogClose>
				{mode === "rename" ? (
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--confirm"
						disabled={isBusy}
						type="button"
						variant="default"
						onClick={() => {
							onConfirm(close);
						}}
					>
						<UiIcon
							aria-hidden={true}
							icon={PencilLine}
							size="sm"
						/>
						{isBusy
							? translateAstra(
									"astraMainInterface.global.categories.rename.renaming",
								)
							: translateAstra(
									"astraMainInterface.global.categories.rename.confirm",
								)}
					</Button>
				) : null}
			</div>
		</div>
	);
}

function CategoryRenameField({
	category,
	error,
	errorId,
	hintId,
	isBusy,
	nextName,
	onConfirm,
	onErrorClear,
	onNameChange,
}: {
	category: ChatCategory;
	error: string;
	errorId: string;
	hintId: string;
	isBusy: boolean;
	nextName: string;
	onConfirm(close: () => void): void;
	onErrorClear(): void;
	onNameChange(nextName: string): void;
}) {
	const close = useResponsiveDialogClose();

	return (
		<div className="astra-chat-library-global-categoryActionDrawer__field astra-chat-library-dialog-field">
			<Input
				aria-describedby={error ? `${hintId} ${errorId}` : hintId}
				aria-invalid={Boolean(error)}
				aria-label={translateAstra(
					"astraMainInterface.global.categories.rename.inputLabel",
				)}
				disabled={isBusy}
				id={GLOBAL_CATEGORY_RENAME_DRAWER_INPUT_ID}
				placeholder={translateAstra(
					"astraMainInterface.global.categories.rename.placeholder",
				)}
				value={nextName}
				onChange={(event) => {
					onNameChange(event.target.value);
					onErrorClear();
				}}
				onKeyDown={(event) => {
					if (event.key !== "Enter") return;
					event.preventDefault();
					onConfirm(close);
				}}
			/>
			<p
				className="astra-chat-library-global-categoryActionDrawer__hint astra-chat-library-dialog-description"
				id={hintId}
			>
				{translateAstra(getCategoryRenameHintKey(category))}
			</p>
		</div>
	);
}
