import * as React from "react";

import {
	ResponsiveDialog,
	ResponsiveDialogClose,
} from "@/components/ui/astra/ResponsiveDialog";
import { Button } from "@/components/ui/shadcn/button";
import { Checkbox } from "@/components/ui/shadcn/checkbox";
import { Label } from "@/components/ui/shadcn/label";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	ChevronDown,
	ChevronRight,
	Hash,
	History,
	ListCollapse,
	ListTree,
	MessageCircleMore,
	MessageCircle,
	PencilLine,
	RefreshCw,
	StepForward,
} from "@/components/ui/shared/icons";
import type { ChatMessageRevisionHistoryItem } from "@/packages/core/st/chatMessageRevisionHistory";
import { applyChatMessageRevisionPath } from "@/packages/core/st/chatMessageRevision";
import {
	type ChatMessageRevisionTreeNode,
	readChatMessageRevisionTreeSnapshot,
} from "@/packages/core/st/chatMessageRevisionTree";
import { translateAstra } from "@/packages/core/i18n";

export interface RevisionHistoryDrawerProps {
	item: ChatMessageRevisionHistoryItem | null;
	onRevisionApplied?(): void;
	onOpenChange(nextValue: boolean): void;
	open: boolean;
}

const KIND_ICON = {
	continue: StepForward,
	edit: PencilLine,
	nativeSwipe: MessageCircleMore,
	origin: MessageCircle,
	regenerate: RefreshCw,
} as const satisfies Record<
	ChatMessageRevisionTreeNode["kind"],
	typeof MessageCircle
>;

type CheckboxCheckedState = boolean | "indeterminate";

const SHOW_FULL_TEXT_STORAGE_KEY =
	"astra_projecta.message_revision_history.show_full_text";
const INCLUDE_UNCHANGED_TEXT_STORAGE_KEY =
	"astra_projecta.message_revision_history.include_unchanged_text";
const REVISION_HISTORY_DIALOG_ID = "astra-message-revision-history-dialog";
const REVISION_HISTORY_EXPAND_TEXT_TOGGLE_ID =
	"astra-message-revision-history-dialog-expand-text-toggle";
const REVISION_HISTORY_INCLUDE_UNCHANGED_TEXT_TOGGLE_ID =
	"astra-message-revision-history-dialog-include-unchanged-text-toggle";

function formatNumericBadgeText(value: string, fallbackValue?: number): string {
	const match = value.match(/\d+/);
	if (match) {
		return match[0];
	}

	return typeof fallbackValue === "number" ? String(fallbackValue) : "-";
}

function readStoredBooleanPreference(key: string, fallbackValue = false) {
	try {
		const value = globalThis.window?.localStorage?.getItem(key);
		if (value === "true") {
			return true;
		}

		if (value === "false") {
			return false;
		}
	} catch {
		return fallbackValue;
	}

	return fallbackValue;
}

function persistBooleanPreference(key: string, value: boolean) {
	try {
		globalThis.window?.localStorage?.setItem(key, String(value));
	} catch {
		// Keep the in-memory preference active when browser storage is unavailable.
	}
}

export function RevisionHistoryDrawer({
	item,
	onRevisionApplied,
	onOpenChange,
	open,
}: RevisionHistoryDrawerProps) {
	const [collapsedPaths, setCollapsedPaths] = React.useState<Set<string>>(
		() => new Set(),
	);
	const [showFullText, setShowFullText] = React.useState(() =>
		readStoredBooleanPreference(SHOW_FULL_TEXT_STORAGE_KEY),
	);
	const [includeUnchangedText, setIncludeUnchangedText] = React.useState(() =>
		readStoredBooleanPreference(INCLUDE_UNCHANGED_TEXT_STORAGE_KEY),
	);
	const [, forceRevisionSnapshotRefresh] = React.useReducer(
		(value: number) => value + 1,
		0,
	);
	const title = translateAstra("messageActions.revisionHistory.title");
	const messageLabel = translateAstra(
		"messageActions.revisionHistory.meta.message",
	);
	const swipeLabel = translateAstra(
		"messageActions.revisionHistory.meta.swipe",
	);
	const senderName =
		typeof item?.senderName === "string" && item.senderName.trim()
			? item.senderName.trim()
			: "Character";
	const messageDisplayId = item?.messageDisplayId || "-";
	const messageBadgeText = formatNumericBadgeText(
		messageDisplayId,
		item?.messageId,
	);
	const swipeDisplayId =
		typeof item?.swipeIndex === "number"
			? String(item.swipeIndex + 1)
			: "-";
	const treeSnapshot = item
		? readChatMessageRevisionTreeSnapshot({
				messageId: item.messageId,
				swipeIndex: item.swipeIndex,
			})
		: null;
	const topLevelNodes = React.useMemo(
		() => treeSnapshot?.displayRoots ?? [],
		[treeSnapshot],
	);
	const activeDisplayRootPath = React.useMemo(
		() =>
			resolveActiveDisplayRootPath(
				topLevelNodes,
				treeSnapshot?.activePath ?? [],
			),
		[topLevelNodes, treeSnapshot?.activePath],
	);
	const allPathKeys = React.useMemo(
		() => topLevelNodes.flatMap((node) => collectPathKeys(node)),
		[topLevelNodes],
	);
	const hasTree = Boolean(
		treeSnapshot?.status === "ready" && topLevelNodes.length,
	);
	const isAllCollapsed =
		allPathKeys.length > 0 && collapsedPaths.size >= allPathKeys.length;

	React.useEffect(() => {
		if (open && item && treeSnapshot?.status === "idle") {
			onOpenChange(false);
		}
	}, [item, onOpenChange, open, treeSnapshot?.status]);

	const handleToggleCollapse = React.useCallback((path: number[]) => {
		const key = serializePath(path);
		if (!key) {
			return;
		}

		setCollapsedPaths((previous) => {
			const next = new Set(previous);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	}, []);

	const handleExpandAll = React.useCallback(() => {
		setCollapsedPaths(new Set());
	}, []);

	const handleCollapseAll = React.useCallback(() => {
		setCollapsedPaths(new Set(allPathKeys));
	}, [allPathKeys]);

	const handleShowFullTextChange = React.useCallback(
		(checked: CheckboxCheckedState) => {
			const nextValue = Boolean(checked);
			setShowFullText(nextValue);
			persistBooleanPreference(SHOW_FULL_TEXT_STORAGE_KEY, nextValue);
		},
		[],
	);

	const handleIncludeUnchangedTextChange = React.useCallback(
		(checked: CheckboxCheckedState) => {
			const nextValue = Boolean(checked);
			setIncludeUnchangedText(nextValue);
			persistBooleanPreference(
				INCLUDE_UNCHANGED_TEXT_STORAGE_KEY,
				nextValue,
			);
		},
		[],
	);

	const handleSelectPath = React.useCallback(
		(path: number[]) => {
			if (!item) {
				return;
			}

			const didApply = applyChatMessageRevisionPath({
				messageId: item.messageId,
				path,
			});
			if (didApply) {
				forceRevisionSnapshotRefresh();
				onRevisionApplied?.();
			}
		},
		[item, onRevisionApplied],
	);

	const headerContent = (
		<div className="astra-dialog-identity astra-revisionHistoryDrawer__identity">
			<div className="astra-dialog-identityAvatar">
				{item?.avatarUrl ? (
					<img
						alt={`${senderName} avatar`}
						className="astra-dialog-identityImage"
						decoding="async"
						draggable={false}
						height={24}
						loading="lazy"
						src={item.avatarUrl}
						width={24}
					/>
				) : null}
			</div>
			<span className="astra-dialog-identityName" title={senderName}>
				{senderName}
			</span>
			<span
				aria-label={`${messageLabel}: ${messageBadgeText}`}
				className="astra-dialog-identityMesBadge"
				title={`${messageLabel}: ${messageBadgeText}`}
			>
				<UiIcon
					aria-hidden={true}
					className="astra-dialog-identityMesBadgeIcon"
					icon={MessageCircleMore}
					size="xs"
				/>
				{messageBadgeText}
			</span>
			<span
				aria-label={`${swipeLabel}: ${swipeDisplayId}`}
				className="astra-dialog-identityMesBadge"
				title={`${swipeLabel}: ${swipeDisplayId}`}
			>
				<UiIcon
					aria-hidden={true}
					className="astra-dialog-identityMesBadgeIcon"
					icon={Hash}
					size="xs"
				/>
				{swipeDisplayId}
			</span>
		</div>
	);
	const footer = (
		<div className="astra-revisionHistoryDrawer__footer">
			<div className="astra-revisionHistoryDrawer__modes">
				<span className="astra-revisionHistoryDrawer__modeOption">
					<Checkbox
						aria-label={translateAstra(
							"messageActions.revisionHistory.expandText",
						)}
						checked={showFullText}
						id={REVISION_HISTORY_EXPAND_TEXT_TOGGLE_ID}
						onCheckedChange={handleShowFullTextChange}
					/>
					<Label
						className="astra-revisionHistoryDrawer__modeLabel"
						htmlFor={REVISION_HISTORY_EXPAND_TEXT_TOGGLE_ID}
					>
						{translateAstra(
							"messageActions.revisionHistory.expandText",
						)}
					</Label>
				</span>
				<span className="astra-revisionHistoryDrawer__modeOption">
					<Checkbox
						aria-label={translateAstra(
							"messageActions.revisionHistory.includeUnchangedText",
						)}
						checked={includeUnchangedText}
						id={REVISION_HISTORY_INCLUDE_UNCHANGED_TEXT_TOGGLE_ID}
						onCheckedChange={handleIncludeUnchangedTextChange}
					/>
					<Label
						className="astra-revisionHistoryDrawer__modeLabel"
						htmlFor={
							REVISION_HISTORY_INCLUDE_UNCHANGED_TEXT_TOGGLE_ID
						}
					>
						{translateAstra(
							"messageActions.revisionHistory.includeUnchangedText",
						)}
					</Label>
				</span>
			</div>
			<div className="astra-revisionHistoryDrawer__footerButtons">
				<div className="astra-revisionHistoryDrawer__footerUtilityButtons">
					<Button
						disabled={!collapsedPaths.size}
						type="button"
						variant="outline"
						onClick={handleExpandAll}
					>
						<UiIcon aria-hidden={true} icon={ListTree} size="sm" />
						{translateAstra(
							"messageActions.revisionHistory.expandAll",
						)}
					</Button>
					<Button
						disabled={!hasTree || isAllCollapsed}
						type="button"
						variant="outline"
						onClick={handleCollapseAll}
					>
						<UiIcon
							aria-hidden={true}
							icon={ListCollapse}
							size="sm"
						/>
						{translateAstra(
							"messageActions.revisionHistory.collapseAll",
						)}
					</Button>
				</div>
				<ResponsiveDialogClose asChild={true}>
					<Button type="button" variant="default">
						{translateAstra("messageActions.revisionHistory.done")}
					</Button>
				</ResponsiveDialogClose>
			</div>
		</div>
	);

	const handleOpenAutoFocus = React.useCallback((event: Event) => {
		event.preventDefault();
	}, []);

	return (
		<ResponsiveDialog
			description={translateAstra(
				"messageActions.revisionHistory.description",
			)}
			footer={footer}
			headerContent={headerContent}
			id={REVISION_HISTORY_DIALOG_ID}
			icon={<UiIcon aria-hidden={true} icon={History} size="sm" />}
			open={open && Boolean(item)}
			scrollBody={true}
			title={title}
			onOpenAutoFocus={handleOpenAutoFocus}
			onOpenChange={onOpenChange}
		>
			{hasTree && treeSnapshot ? (
				<ul
					aria-label={translateAstra(
						"messageActions.revisionHistory.treeLabel",
					)}
					className="astra-revisionHistoryTree"
					role="tree"
				>
					{topLevelNodes.map((node) => (
						<RevisionHistoryTreeNode
							key={serializePath(node.path)}
							activeDisplayRootPath={activeDisplayRootPath}
							activeFullText={treeSnapshot.activeFullText}
							activePath={treeSnapshot.activePath}
							collapsedPaths={collapsedPaths}
							node={node}
							showFullText={showFullText}
							includeUnchangedText={includeUnchangedText}
							onSelect={handleSelectPath}
							onToggleCollapse={handleToggleCollapse}
						/>
					))}
				</ul>
			) : (
				<div className="astra-revisionHistoryEmpty">
					{translateAstra("messageActions.revisionHistory.empty")}
				</div>
			)}
		</ResponsiveDialog>
	);
}

function RevisionHistoryTreeNode({
	activeDisplayRootPath,
	activeFullText,
	activePath,
	collapsedPaths,
	depth = 0,
	includeUnchangedText,
	node,
	showFullText,
	onSelect,
	onToggleCollapse,
}: {
	activeDisplayRootPath: number[];
	activeFullText: string;
	activePath: number[];
	collapsedPaths: Set<string>;
	depth?: number;
	includeUnchangedText: boolean;
	node: ChatMessageRevisionTreeNode;
	showFullText: boolean;
	onSelect(path: number[]): void;
	onToggleCollapse(path: number[]): void;
}) {
	const pathKey = serializePath(node.path);
	const isCollapsed = collapsedPaths.has(pathKey);
	const isActive = pathsMatch(node.path, activePath);
	const isUsed = Boolean(
		activeFullText &&
		pathStartsWith(activePath, node.path) &&
		pathStartsWith(node.path, activeDisplayRootPath),
	);
	const hasChildren = node.children.length > 0;
	const label = resolveNodeText({ includeUnchangedText, node });
	const kindLabel = translateAstra(
		`messageActions.revisionHistory.kind.${node.kind}` as const,
	);
	const checkboxLabel = translateAstra(
		isUsed
			? "messageActions.revisionHistory.activeCheckbox.current"
			: "messageActions.revisionHistory.activeCheckbox.apply",
	);
	const kindIcon = KIND_ICON[node.kind];
	const timestamp = formatTimestamp(node.createdAt);
	const handleSelect = React.useCallback(() => {
		onSelect(node.path);
	}, [node.path, onSelect]);
	const handleKeyDown = React.useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (event.key !== "Enter" && event.key !== " ") {
				return;
			}

			event.preventDefault();
			handleSelect();
		},
		[handleSelect],
	);

	return (
		<li
			className="astra-revisionHistoryTreeNode"
			data-active={isActive ? "true" : "false"}
			data-used={isUsed ? "true" : "false"}
			role="none"
		>
			<div
				aria-current={isActive ? "true" : undefined}
				aria-expanded={hasChildren ? !isCollapsed : undefined}
				aria-level={depth + 1}
				aria-selected={isActive ? "true" : "false"}
				className="astra-revisionHistoryTreeNode__button"
				role="treeitem"
				style={
					{
						"--revision-history-depth": depth,
					} as React.CSSProperties
				}
				tabIndex={0}
				onClick={handleSelect}
				onKeyDown={handleKeyDown}
			>
				<div className="astra-revisionHistoryTreeNode__content">
					<div className="astra-revisionHistoryTreeNode__meta">
						<div className="astra-revisionHistoryTreeNode__metaMain">
							<span
								className="astra-revisionHistoryTreeNode__chip"
								data-kind={node.kind}
							>
								<UiIcon
									aria-hidden={true}
									icon={kindIcon}
									size="xs"
								/>
								{kindLabel}
							</span>
							{timestamp ? (
								<span className="astra-revisionHistoryTreeNode__time">
									{timestamp}
								</span>
							) : null}
						</div>
						<div className="astra-revisionHistoryTreeNode__metaActions">
							{hasChildren ? (
								<button
									aria-label={translateAstra(
										isCollapsed
											? "messageActions.revisionHistory.expandEntry"
											: "messageActions.revisionHistory.collapseEntry",
									)}
									aria-expanded={!isCollapsed}
									className="astra-revisionHistoryTreeNode__collapseToggle"
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										onToggleCollapse(node.path);
									}}
								>
									<UiIcon
										icon={
											isCollapsed
												? ChevronRight
												: ChevronDown
										}
										size="xs"
									/>
								</button>
							) : null}
							<Checkbox
								aria-label={checkboxLabel}
								checked={isUsed}
								className="astra-revisionHistoryTreeNode__activeCheckbox"
								disabled={isUsed}
								onCheckedChange={() => {
									onSelect(node.path);
								}}
								onClick={(event) => {
									event.stopPropagation();
								}}
								onKeyDown={(event) => {
									event.stopPropagation();
								}}
							/>
						</div>
					</div>
					<div
						className="astra-revisionHistoryTreeNode__textWrapper"
						data-full-text={showFullText ? "true" : "false"}
					>
						<span className="astra-revisionHistoryTreeNode__text">
							{label}
						</span>
					</div>
				</div>
			</div>
			{hasChildren && !isCollapsed ? (
				<ul className="astra-revisionHistoryTreeList" role="group">
					{node.children.map((child) => (
						<RevisionHistoryTreeNode
							key={serializePath(child.path)}
							activeDisplayRootPath={activeDisplayRootPath}
							activeFullText={activeFullText}
							activePath={activePath}
							collapsedPaths={collapsedPaths}
							depth={depth + 1}
							includeUnchangedText={includeUnchangedText}
							node={child}
							showFullText={showFullText}
							onSelect={onSelect}
							onToggleCollapse={onToggleCollapse}
						/>
					))}
				</ul>
			) : null}
		</li>
	);
}

function resolveNodeText({
	includeUnchangedText,
	node,
}: {
	includeUnchangedText: boolean;
	node: ChatMessageRevisionTreeNode;
}) {
	if (includeUnchangedText) {
		return node.fullText || node.compactText || node.text || "(empty)";
	}

	return node.compactText || node.text || node.fullText || "(empty)";
}

function serializePath(path: number[]) {
	return path.join(".");
}

function pathsMatch(first: number[], second: number[]) {
	return (
		first.length === second.length &&
		first.every((value, index) => value === second[index])
	);
}

function pathStartsWith(path: number[], prefix: number[]) {
	return prefix.every((value, index) => path[index] === value);
}

function resolveActiveDisplayRootPath(
	roots: ChatMessageRevisionTreeNode[],
	activePath: number[],
) {
	return roots.reduce<number[]>((bestMatch, root) => {
		if (
			pathStartsWith(activePath, root.path) &&
			root.path.length > bestMatch.length
		) {
			return root.path;
		}

		return bestMatch;
	}, []);
}

function collectPathKeys(node: ChatMessageRevisionTreeNode): string[] {
	return [
		serializePath(node.path),
		...node.children.flatMap((child) => collectPathKeys(child)),
	].filter(Boolean);
}

function formatTimestamp(value: number | null) {
	if (typeof value !== "number" || value <= 0) {
		return null;
	}

	const date = new Date(value);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const seconds = String(date.getSeconds()).padStart(2, "0");

	return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}
