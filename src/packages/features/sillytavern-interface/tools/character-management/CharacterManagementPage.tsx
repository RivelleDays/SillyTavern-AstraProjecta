import * as React from "react";

import { translateAstra } from "@/packages/core/i18n";
import {
	createNativeDrawerBridge,
	type NativeDrawerBridge,
	type NativeDrawerBridgeSnapshot,
} from "@/packages/core/st/native-drawers/createNativeDrawerBridge";
import {
	createNativeCompanionBridge,
	type NativeCompanionBridge,
	type NativeCompanionBridgeSnapshot,
} from "@/packages/core/st/native-companions/createNativeCompanionBridge";
import {
	CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
	CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID,
	CHARACTER_MANAGEMENT_GALLERY_SOURCE_ID,
	CHARACTER_MANAGEMENT_PRIMARY_DRAWER_ID,
	type CharacterManagementTabValue,
	cancelPendingCharacterManagementTabValueRequest,
	closeNativeCharacterGallery,
	closeNativeCharacterAdvancedPopup,
	getCharacterManagementSourceId,
	hideNativeCharacterAdvancedPopup,
	observeCharacterManagementTabValue,
	readCharacterManagementTabValue,
	readPreferredCharacterManagementTabValue,
	requestCharacterManagementTabValue,
} from "@/packages/features/sillytavern-interface/tools/character-management/characterManagementNative";
import type { I18nKey } from "@/types/i18n";

interface CharacterManagementBridges {
	advanced: NativeDrawerBridge;
	gallery: NativeCompanionBridge;
	primary: NativeDrawerBridge;
}

type CharacterManagementBridgeSnapshot =
	| NativeDrawerBridgeSnapshot
	| NativeCompanionBridgeSnapshot;

export interface CharacterManagementPageProps {
	documentRef?: Document;
	hostId: string;
	missingGalleryMessageKey: I18nKey;
	missingMessageKey: I18nKey;
}

export function CharacterManagementPage({
	documentRef = document,
	hostId,
	missingGalleryMessageKey,
	missingMessageKey,
}: CharacterManagementPageProps) {
	const hostRef = React.useRef<HTMLDivElement | null>(null);
	const bridgesRef = React.useRef<CharacterManagementBridges | null>(null);
	const previousActiveTabValueRef =
		React.useRef<CharacterManagementTabValue | null>(null);
	const activeTabValueRef = React.useRef<CharacterManagementTabValue>(
		readPreferredCharacterManagementTabValue({ documentRef }),
	);
	const [activeTabValue, setActiveTabValue] =
		React.useState<CharacterManagementTabValue>(() =>
			readPreferredCharacterManagementTabValue({ documentRef }),
		);
	const [bridgeSnapshot, setBridgeSnapshot] =
		React.useState<CharacterManagementBridgeSnapshot | null>(null);
	const isMissingNativeSurface =
		bridgeSnapshot !== null && !bridgeSnapshot.isAvailable;

	activeTabValueRef.current = activeTabValue;

	const syncBridgeSnapshot = React.useCallback(() => {
		const bridges = bridgesRef.current;

		if (!bridges) {
			return;
		}

		const activeBridge = (() => {
			switch (activeTabValueRef.current) {
				case "advanced":
					return bridges.advanced;
				case "images":
					return bridges.gallery;
				default:
					return bridges.primary;
			}
		})();

		setBridgeSnapshot(activeBridge.getSnapshot());
	}, []);

	const syncActiveBridge = React.useCallback(() => {
		const host = hostRef.current;
		const bridges = bridgesRef.current;

		if (!(host instanceof HTMLElement) || !bridges) {
			return;
		}

		const activeTabValue = activeTabValueRef.current;
		const shouldCloseAdvanced =
			previousActiveTabValueRef.current === "advanced" &&
			activeTabValue !== "advanced";
		if (
			previousActiveTabValueRef.current === "images" &&
			activeTabValue !== "images"
		) {
			bridges.gallery.restore();
			closeNativeCharacterGallery(documentRef);
		}
		if (shouldCloseAdvanced) {
			bridges.advanced.restore();
			hideNativeCharacterAdvancedPopup(documentRef);
		}

		switch (activeTabValue) {
			case "advanced":
				bridges.gallery.restore();
				bridges.primary.restore();
				bridges.advanced.attachTo(host);
				bridges.advanced.sync();
				break;
			case "images":
				if (!shouldCloseAdvanced) {
					bridges.advanced.restore();
				}
				bridges.primary.restore();
				bridges.gallery.attachTo(host);
				bridges.gallery.sync();
				break;
			default:
				if (!shouldCloseAdvanced) {
					bridges.advanced.restore();
				}
				bridges.gallery.restore();
				bridges.primary.attachTo(host);
				bridges.primary.sync();
				break;
		}

		previousActiveTabValueRef.current = activeTabValue;
	}, [documentRef]);

	React.useLayoutEffect(() => {
		const host = hostRef.current;

		if (!(host instanceof HTMLElement)) {
			return undefined;
		}

		let isActive = true;
		const handleSnapshotChange = () => {
			if (isActive) {
				syncBridgeSnapshot();
			}
		};
		const bridges = {
			advanced: createNativeDrawerBridge({
				documentRef,
				normalizeAttachedVisibility: {
					display: "flex",
					opacity: "1",
					skipWhenAttribute:
						CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
					transition: "none",
				},
				onSnapshotChange: handleSnapshotChange,
				sourceId: CHARACTER_MANAGEMENT_ADVANCED_POPUP_ID,
			}),
			gallery: createNativeCompanionBridge({
				documentRef,
				normalizeAttachedVisibility: {
					display: "flex",
					opacity: "1",
					transition: "none",
				},
				onSnapshotChange: handleSnapshotChange,
				restoreRemovedSource: false,
				sourceId: CHARACTER_MANAGEMENT_GALLERY_SOURCE_ID,
			}),
			primary: createNativeDrawerBridge({
				documentRef,
				onSnapshotChange: handleSnapshotChange,
				sourceId: CHARACTER_MANAGEMENT_PRIMARY_DRAWER_ID,
			}),
		} satisfies CharacterManagementBridges;

		bridgesRef.current = bridges;
		syncActiveBridge();
		syncBridgeSnapshot();
		const preferredValue = readPreferredCharacterManagementTabValue({
			documentRef,
		});
		if (
			preferredValue === "advanced" &&
			preferredValue !== readCharacterManagementTabValue(documentRef)
		) {
			requestCharacterManagementTabValue({
				canOpenEditTab: true,
				documentRef,
				value: preferredValue,
			});
		}

		return () => {
			isActive = false;
			const shouldCloseGallery = activeTabValueRef.current === "images";
			cancelPendingCharacterManagementTabValueRequest(documentRef);
			bridges.advanced.dispose();
			closeNativeCharacterAdvancedPopup(documentRef);
			bridges.gallery.dispose();
			if (shouldCloseGallery) {
				closeNativeCharacterGallery(documentRef);
			}
			bridges.primary.dispose();
			bridgesRef.current = null;
			previousActiveTabValueRef.current = null;
		};
	}, [documentRef, syncActiveBridge, syncBridgeSnapshot]);

	React.useLayoutEffect(() => {
		syncActiveBridge();
		syncBridgeSnapshot();
	}, [activeTabValue, syncActiveBridge, syncBridgeSnapshot]);

	React.useLayoutEffect(() => {
		if (!documentRef) {
			return undefined;
		}

		setActiveTabValue(
			readPreferredCharacterManagementTabValue({ documentRef }),
		);

		return observeCharacterManagementTabValue({
			documentRef,
			onValueChange: setActiveTabValue,
		});
	}, [documentRef]);

	return (
		<div
			className="sillytavern-interface__native-host"
			data-astra-native-companion-host={
				activeTabValue === "images"
					? getCharacterManagementSourceId(activeTabValue)
					: undefined
			}
			data-astra-native-drawer-host={
				activeTabValue === "images"
					? undefined
					: getCharacterManagementSourceId(activeTabValue)
			}
			id={hostId}
			ref={hostRef}
		>
			{isMissingNativeSurface ? (
				<p className="sillytavern-interface__placeholder-copy">
					{translateAstra(
						activeTabValue === "images"
							? missingGalleryMessageKey
							: missingMessageKey,
					)}
				</p>
			) : null}
		</div>
	);
}
