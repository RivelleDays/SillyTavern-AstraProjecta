import * as React from "react";

import { translateAstra } from "@/packages/core/i18n";
import type {
	ChatCatalogEntry,
	OpenChatCatalogEntry,
	OpenChatCatalogResult,
} from "@/packages/core/st/chat-catalog";
import { beginAstraChatSwitch } from "@/packages/features/chat-session/chat-switch-loading";

export interface ChatCatalogEntryOpenControllerOptions {
	onOpenSuccess?: (entry: ChatCatalogEntry) => void;
	onRequestClose?: () => void;
	openEntry: OpenChatCatalogEntry;
}

export function useChatCatalogEntryOpenController({
	onOpenSuccess,
	onRequestClose,
	openEntry,
}: ChatCatalogEntryOpenControllerOptions) {
	const [openingKey, setOpeningKey] = React.useState<string | null>(null);
	const [openError, setOpenError] = React.useState("");
	const mountedRef = React.useRef(true);
	const openingKeyRef = React.useRef<string | null>(null);

	React.useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const openEntryWithFeedback = React.useCallback(
		async (entry: ChatCatalogEntry): Promise<OpenChatCatalogResult> => {
			if (openingKeyRef.current !== null) {
				return {
					ok: false,
					reason: "open-failed",
				};
			}

			if (entry.isCurrent) {
				onRequestClose?.();
				return {
					alreadyCurrent: true,
					ok: true,
				};
			}

			const loadingAttempt = beginAstraChatSwitch(
				translateAstra("astraMainInterface.chatMenu.opening"),
			);
			openingKeyRef.current = entry.key;
			setOpeningKey(entry.key);
			setOpenError("");

			let resultPromise: ReturnType<OpenChatCatalogEntry>;

			try {
				resultPromise = openEntry(entry);
				onRequestClose?.();
			} catch {
				const failureResult = {
					ok: false,
					reason: "open-failed" as const,
				};
				await loadingAttempt.cancel();
				if (mountedRef.current) {
					openingKeyRef.current = null;
					setOpeningKey(null);
					setOpenError(
						translateAstra(
							"astraMainInterface.chatMenu.openFailure",
						),
					);
				}
				return failureResult;
			}

			const result = await resultPromise.catch(() => ({
				ok: false,
				reason: "open-failed" as const,
			}));
			if (!result.ok) {
				await loadingAttempt.cancel();
			}
			if (!mountedRef.current) {
				return result;
			}

			openingKeyRef.current = null;
			setOpeningKey(null);

			if (result.ok) {
				onOpenSuccess?.(entry);
				return result;
			}

			setOpenError(
				translateAstra("astraMainInterface.chatMenu.openFailure"),
			);
			return result;
		},
		[onOpenSuccess, onRequestClose, openEntry],
	);

	return {
		openEntry: openEntryWithFeedback,
		openError,
		openingKey,
	};
}
