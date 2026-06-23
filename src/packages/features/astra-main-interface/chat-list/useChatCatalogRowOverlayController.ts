import * as React from "react";

import type { ChatCatalogEntry } from "@/packages/core/st/chat-catalog";
import type { ChatCatalogRowActionDialogState } from "@/packages/features/astra-main-interface/chat-list/ChatCatalogRowActionDialog";

type ChatCatalogRowOverlay =
	| {
			entry: ChatCatalogEntry;
			type: "actions" | "categories";
	  }
	| {
			action: ChatCatalogRowActionDialogState;
			type: "rowAction";
	  };

export interface ChatCatalogRowOverlayController {
	activeActionsEntry: ChatCatalogEntry | null;
	activeActionsEntryKey: string | null;
	activeCategoryEntry: ChatCatalogEntry | null;
	activeRowAction: ChatCatalogRowActionDialogState | null;
	closeActiveOverlay(): void;
	openActions(entry: ChatCatalogEntry): void;
	openCategories(entry: ChatCatalogEntry): void;
	queueCategories(entry: ChatCatalogEntry): void;
	queueDelete(entry: ChatCatalogEntry): void;
	queueRename(entry: ChatCatalogEntry): void;
	requestDelete(entry: ChatCatalogEntry): void;
	requestRename(entry: ChatCatalogEntry): void;
}

export function useChatCatalogRowOverlayController(): ChatCatalogRowOverlayController {
	const [activeOverlay, setActiveOverlay] =
		React.useState<ChatCatalogRowOverlay | null>(null);
	const queuedOverlaysRef = React.useRef<ChatCatalogRowOverlay[]>([]);

	const openOverlay = React.useCallback(
		(nextOverlay: ChatCatalogRowOverlay) => {
			queuedOverlaysRef.current = [];
			setActiveOverlay(nextOverlay);
		},
		[],
	);

	const queueOverlay = React.useCallback(
		(nextOverlay: ChatCatalogRowOverlay) => {
			queuedOverlaysRef.current = [
				...queuedOverlaysRef.current,
				nextOverlay,
			];
		},
		[],
	);

	const closeActiveOverlay = React.useCallback(() => {
		const [nextOverlay, ...remainingOverlays] = queuedOverlaysRef.current;
		queuedOverlaysRef.current = remainingOverlays;
		setActiveOverlay(nextOverlay ?? null);
	}, []);

	const openActions = React.useCallback(
		(entry: ChatCatalogEntry) => {
			openOverlay({
				entry,
				type: "actions",
			});
		},
		[openOverlay],
	);

	const openCategories = React.useCallback(
		(entry: ChatCatalogEntry) => {
			openOverlay({
				entry,
				type: "categories",
			});
		},
		[openOverlay],
	);

	const requestDelete = React.useCallback(
		(entry: ChatCatalogEntry) => {
			openOverlay({
				action: {
					entry,
					mode: "delete",
				},
				type: "rowAction",
			});
		},
		[openOverlay],
	);

	const requestRename = React.useCallback(
		(entry: ChatCatalogEntry) => {
			openOverlay({
				action: {
					entry,
					mode: "rename",
				},
				type: "rowAction",
			});
		},
		[openOverlay],
	);

	const queueCategories = React.useCallback(
		(entry: ChatCatalogEntry) => {
			queueOverlay({
				entry,
				type: "categories",
			});
		},
		[queueOverlay],
	);

	const queueDelete = React.useCallback(
		(entry: ChatCatalogEntry) => {
			queueOverlay({
				action: {
					entry,
					mode: "delete",
				},
				type: "rowAction",
			});
		},
		[queueOverlay],
	);

	const queueRename = React.useCallback(
		(entry: ChatCatalogEntry) => {
			queueOverlay({
				action: {
					entry,
					mode: "rename",
				},
				type: "rowAction",
			});
		},
		[queueOverlay],
	);

	const activeActionsEntry =
		activeOverlay?.type === "actions" ? activeOverlay.entry : null;
	const activeCategoryEntry =
		activeOverlay?.type === "categories" ? activeOverlay.entry : null;
	const activeRowAction =
		activeOverlay?.type === "rowAction" ? activeOverlay.action : null;

	return {
		activeActionsEntry,
		activeActionsEntryKey: activeActionsEntry?.key ?? null,
		activeCategoryEntry,
		activeRowAction,
		closeActiveOverlay,
		openActions,
		openCategories,
		queueCategories,
		queueDelete,
		queueRename,
		requestDelete,
		requestRename,
	};
}
