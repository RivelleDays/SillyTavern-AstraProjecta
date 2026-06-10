import * as React from "react";

import {
	SILLYTAVERN_INTERFACE_ROUTES,
	DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
	isDefaultSillyTavernInterfacePageKey,
	persistStoredSillyTavernInterfacePageKey,
	readStoredSillyTavernInterfacePageKey,
	type SillyTavernInterfaceRouteKey,
} from "@/packages/features/sillytavern-interface";
import { readStoredAiSettingsPageKey } from "@/packages/features/sillytavern-interface/routes/subheaderStorage";

type ScheduledOpenHandleKind = "frame" | "timeout";

export interface SillyTavernInterfaceController {
	activePageKey: string;
	clearPendingOpen(): void;
	handleActivePageKeyChange(pageKey: string): void;
	handleOpenChange(nextOpen: boolean): void;
	open: boolean;
	openCurrentPage(): void;
	openRoute(
		pageKey: SillyTavernInterfaceRouteKey,
		options?: {
			beforeOpen?: () => void;
		},
	): void;
}

export function useSillyTavernInterfaceController({
	documentRef,
}: {
	documentRef: Document;
}): SillyTavernInterfaceController {
	const [open, setOpen] = React.useState(false);
	const [activePageKey, setActivePageKey] = React.useState<string>(() =>
		readStoredSillyTavernInterfacePageKey(
			documentRef.defaultView?.localStorage,
		),
	);
	const openHandleRef = React.useRef<
		number | ReturnType<typeof setTimeout> | null
	>(null);
	const openHandleKindRef = React.useRef<ScheduledOpenHandleKind | null>(
		null,
	);

	const clearPendingOpen = React.useCallback(() => {
		const handle = openHandleRef.current;
		const handleKind = openHandleKindRef.current;

		if (handle === null) {
			return;
		}

		openHandleRef.current = null;
		openHandleKindRef.current = null;

		if (handleKind === "frame") {
			documentRef.defaultView?.cancelAnimationFrame(handle as number);
			return;
		}

		clearTimeout(handle as ReturnType<typeof setTimeout>);
	}, [documentRef]);

	React.useEffect(() => {
		return () => {
			clearPendingOpen();
		};
	}, [clearPendingOpen]);

	const handleOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				clearPendingOpen();
			}

			setOpen(nextOpen);
		},
		[clearPendingOpen],
	);

	const handleActivePageKeyChange = React.useCallback(
		(nextPageKey: string) => {
			const resolvedPageKey = isDefaultSillyTavernInterfacePageKey(
				nextPageKey,
			)
				? nextPageKey
				: DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY;

			setActivePageKey(resolvedPageKey);
			persistStoredSillyTavernInterfacePageKey(
				documentRef.defaultView?.localStorage,
				resolvedPageKey,
			);
		},
		[documentRef],
	);

	const scheduleOpen = React.useCallback(() => {
		const openPanel = () => {
			openHandleRef.current = null;
			openHandleKindRef.current = null;
			setOpen(true);
		};
		const view = documentRef.defaultView;

		if (typeof view?.requestAnimationFrame === "function") {
			openHandleKindRef.current = "frame";
			openHandleRef.current = view.requestAnimationFrame(openPanel);
			return;
		}

		openHandleKindRef.current = "timeout";
		openHandleRef.current = setTimeout(openPanel, 0);
	}, [documentRef]);

	const openCurrentPage = React.useCallback(() => {
		clearPendingOpen();
		setOpen(true);
	}, [clearPendingOpen]);

	const openRoute = React.useCallback(
		(
			pageKey: SillyTavernInterfaceRouteKey,
			options: {
				beforeOpen?: () => void;
			} = {},
		) => {
			const resolvedPageKey =
				pageKey === SILLYTAVERN_INTERFACE_ROUTES.aiSettings
					? readStoredAiSettingsPageKey(
							documentRef.defaultView?.localStorage,
						)
					: pageKey;

			clearPendingOpen();
			handleActivePageKeyChange(resolvedPageKey);
			options.beforeOpen?.();
			scheduleOpen();
		},
		[
			clearPendingOpen,
			documentRef,
			handleActivePageKeyChange,
			scheduleOpen,
		],
	);

	return {
		activePageKey,
		clearPendingOpen,
		handleActivePageKeyChange,
		handleOpenChange,
		open,
		openCurrentPage,
		openRoute,
	};
}
