import * as React from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogClose,
	useResponsiveDialogClose,
} from "@/components/ui/astra/ResponsiveDialog";
import { Button } from "@/components/ui/shadcn/button";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import { UiIcon } from "@/components/ui/shared/icon";
import { Bookmark, ChevronDown } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatCatalogEntry } from "@/packages/core/st/chat-catalog";
import type { ChatCategoryStore } from "@/packages/core/st/chat-categories";
import { ChatCatalogRowDialogIdentityHeader } from "@/packages/features/astra-main-interface/chat-list/ChatCatalogRowActionDialog";

import { ChatCategoryCreateRow } from "@/packages/features/astra-main-interface/chat-categories/ChatCategoryCreateRow";
import {
	CHAT_ROW_CATEGORY_DRAWER_CREATE_INPUT_ID,
	CHAT_ROW_CATEGORY_DRAWER_ID,
	CHAT_ROW_CATEGORY_DRAWER_SCROLLABLE_CONTENT_ID,
	areIdSetsEqual,
	buildScopeOptions,
	getCategoryGroups,
	normalizeOwnerLabel,
	useCategorySnapshot,
	useDelayedDrawerContentMount,
	type CategoryGroup,
	type ChatCategoryAssignmentDrawerProps,
} from "@/packages/features/astra-main-interface/chat-categories/categoryModel";

function ChatCategoryAssignmentList({
	draftIds,
	groups,
	isOpen,
	onDraftIdsChange,
}: {
	draftIds: string[];
	groups: CategoryGroup[];
	isOpen: boolean;
	onDraftIdsChange(nextDraftIds: string[]): void;
}) {
	const contentIdPrefix = React.useId();
	const groupIdsKey = groups.map((group) => group.id).join(":");
	const [expandedGroupIds, setExpandedGroupIds] = React.useState<string[]>(
		() => groups.map((group) => group.id),
	);
	const wasOpenRef = React.useRef(isOpen);
	const previousGroupIdsKeyRef = React.useRef(groupIdsKey);

	React.useEffect(() => {
		const didOpen = isOpen && !wasOpenRef.current;
		const didGroupsChange = groupIdsKey !== previousGroupIdsKeyRef.current;

		if (isOpen && (didOpen || didGroupsChange)) {
			setExpandedGroupIds(groups.map((group) => group.id));
		}

		wasOpenRef.current = isOpen;
		previousGroupIdsKeyRef.current = groupIdsKey;
	}, [groupIdsKey, groups, isOpen]);

	return (
		<div className="astra-main-interface-chat-category-drawer__assignment-list">
			{groups.map((group) => {
				const isExpanded = expandedGroupIds.includes(group.id);
				const contentId = `${contentIdPrefix}-${group.id}`;

				return (
					<section
						aria-label={group.label}
						className="astra-main-interface-chat-category-drawer__scope-section"
						data-scope={group.id}
						key={group.id}
					>
						<button
							aria-controls={contentId}
							aria-expanded={isExpanded}
							aria-label={`${group.label} (${group.categories.length})`}
							className="astra-main-interface-chat-category-drawer__scope-header"
							data-state={isExpanded ? "open" : "closed"}
							type="button"
							onClick={() => {
								setExpandedGroupIds((current) =>
									current.includes(group.id)
										? current.filter(
												(groupId) =>
													groupId !== group.id,
											)
										: [...current, group.id],
								);
							}}
						>
							<span className="astra-main-interface-chat-category-drawer__scope-label-row">
								<span
									aria-hidden={true}
									className={`astra-main-interface-chat-category-drawer__scope-icon astra-main-interface-chat-category-drawer__scope-icon--${group.iconName}`}
								>
									<UiIcon icon={group.icon} size="sm" />
								</span>
								<span className="astra-main-interface-chat-category-drawer__scope-label">
									{group.label}
								</span>
								<span className="astra-main-interface-chat-category-drawer__scope-count">
									({group.categories.length})
								</span>
							</span>
							<UiIcon
								aria-hidden={true}
								className="astra-chat-library-category-chevron"
								icon={ChevronDown}
								size="sm"
							/>
						</button>
						<div
							className="astra-main-interface-chat-category-drawer__category-list"
							hidden={!isExpanded}
							id={contentId}
							role="list"
						>
							{group.categories.length > 0 ? (
								group.categories.map((category) => (
									<div
										className="astra-main-interface-chat-category-drawer__category-row"
										data-category-id={category.id}
										key={category.id}
										role="listitem"
									>
										<span className="astra-main-interface-chat-category-drawer__category-name">
											{category.name}
										</span>
										<span className="astra-main-interface-chat-category-drawer__checkbox-wrap">
											<Checkbox
												aria-label={category.name}
												checked={draftIds.includes(
													category.id,
												)}
												className="astra-chat-library-category-checkbox"
												onCheckedChange={(checked) => {
													const isChecked =
														checked === true;
													const nextDraftIds =
														isChecked
															? draftIds.includes(
																	category.id,
																)
																? draftIds
																: [
																		...draftIds,
																		category.id,
																	]
															: draftIds.filter(
																	(id) =>
																		id !==
																		category.id,
																);

													onDraftIdsChange(
														nextDraftIds,
													);
												}}
											/>
										</span>
									</div>
								))
							) : (
								<div className="astra-main-interface-chat-category-drawer__empty-row">
									{translateAstra(
										"astraMainInterface.chatMenu.categoryDrawer.empty",
									)}
								</div>
							)}
						</div>
					</section>
				);
			})}
		</div>
	);
}

export function ChatCategoryAssignmentDrawer({
	chatCategoryStore,
	entry,
	onOpenChange,
}: ChatCategoryAssignmentDrawerProps) {
	const categorySnapshot = useCategorySnapshot(chatCategoryStore);
	const [retainedEntry, setRetainedEntry] =
		React.useState<ChatCatalogEntry | null>(entry);
	const isOpen = entry !== null;
	const shouldRenderDrawer = useDelayedDrawerContentMount(isOpen);
	const drawerEntry = entry ?? retainedEntry;
	const ownerScope = drawerEntry
		? {
				label: normalizeOwnerLabel(drawerEntry),
				ownerId: drawerEntry.entityId,
				ownerType: drawerEntry.kind,
			}
		: null;
	const groups = React.useMemo(
		() =>
			getCategoryGroups({
				chatCategoryStore,
				ownerScope,
			}),
		[categorySnapshot, chatCategoryStore, ownerScope],
	);
	const categories = groups.flatMap((group) => group.categories);
	const [draftIds, setDraftIds] = React.useState<string[]>([]);
	const persistedIds = drawerEntry
		? chatCategoryStore.getChatCategoryIds(drawerEntry.key)
		: [];
	const hasChanges = !areIdSetsEqual(draftIds, persistedIds);
	const title = translateAstra(
		"astraMainInterface.chatMenu.categoryDrawer.title",
	);
	const description = translateAstra(
		"astraMainInterface.chatMenu.categoryDrawer.description",
	);
	const inputScopeOptions = React.useMemo(
		() => buildScopeOptions(ownerScope),
		[ownerScope],
	);

	React.useEffect(() => {
		if (entry) {
			setRetainedEntry(entry);
			setDraftIds(chatCategoryStore.getChatCategoryIds(entry.key));
		}
	}, [chatCategoryStore, entry]);

	React.useEffect(() => {
		if (!shouldRenderDrawer && !isOpen) {
			setRetainedEntry(null);
		}
	}, [isOpen, shouldRenderDrawer]);

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	if (!shouldRenderDrawer || !drawerEntry) {
		return null;
	}

	const footer = (
		<ChatCategoryAssignmentDrawerFooter
			canSave={hasChanges}
			onSave={() => {
				chatCategoryStore.setChatCategoryIds(drawerEntry.key, draftIds);
			}}
		/>
	);

	return (
		<ResponsiveDialog
			className="astra-main-interface-drawer astra-main-interface-chat-row-action-dialog astra-main-interface-chat-category-drawer"
			contentId={CHAT_ROW_CATEGORY_DRAWER_ID}
			description={
				<div className="astra-dialog-current-chat-file-description">
					{description}
					<span className="astra-dialog-current-chat-file-token">
						<span className="astra-dialog-current-chat-file-name">
							{drawerEntry.chatId}
						</span>
					</span>
				</div>
			}
			footer={footer}
			headerContent={
				<ChatCatalogRowDialogIdentityHeader entry={drawerEntry} />
			}
			icon={<UiIcon aria-hidden={true} icon={Bookmark} size="sm" />}
			open={isOpen}
			scrollBody={true}
			title={title}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			<div
				className="astra-dialog-section astra-chat-library-dialog-content"
				id={CHAT_ROW_CATEGORY_DRAWER_SCROLLABLE_CONTENT_ID}
			>
				<div className="astra-main-interface-chat-category-drawer__panel">
					<ChatCategoryAssignmentList
						draftIds={draftIds}
						groups={groups}
						isOpen={isOpen}
						onDraftIdsChange={setDraftIds}
					/>
					<div className="astra-main-interface-chat-category-drawer__create">
						<ChatCategoryCreateRow
							addLabelKey="astraMainInterface.chatMenu.categoryDrawer.create.add"
							chatCategoryStore={chatCategoryStore}
							inputId={CHAT_ROW_CATEGORY_DRAWER_CREATE_INPUT_ID}
							inputLabelKey="astraMainInterface.chatMenu.categoryDrawer.create.inputLabel"
							placeholderKey="astraMainInterface.chatMenu.categoryDrawer.create.placeholder"
							scopeOptions={inputScopeOptions}
							showScopeSelect={true}
						/>
					</div>
				</div>
			</div>
		</ResponsiveDialog>
	);
}

function ChatCategoryAssignmentDrawerFooter({
	canSave,
	onSave,
}: {
	canSave: boolean;
	onSave(): void;
}) {
	const close = useResponsiveDialogClose();

	return (
		<div className="astra-chat-library-dialog-footer astra-chat-library-dialog-footer--categories">
			<div className="astra-chat-library-dialog-footer-actions">
				<ResponsiveDialogClose asChild={true}>
					<Button
						className="astra-chat-library-dialog-action astra-chat-library-dialog-action--close"
						type="button"
						variant="ghost"
					>
						{translateAstra(
							"astraMainInterface.chatMenu.categoryDrawer.close",
						)}
					</Button>
				</ResponsiveDialogClose>
				<Button
					className="astra-chat-library-dialog-action astra-chat-library-dialog-action--save"
					disabled={!canSave}
					type="button"
					variant="default"
					onClick={() => {
						onSave();
						close();
					}}
				>
					{translateAstra(
						"astraMainInterface.chatMenu.categoryDrawer.save",
					)}
				</Button>
			</div>
		</div>
	);
}
