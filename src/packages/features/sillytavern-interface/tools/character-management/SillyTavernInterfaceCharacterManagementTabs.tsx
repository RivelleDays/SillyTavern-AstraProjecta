import * as React from "react";

import {
	AstraSlidingTabs,
	type AstraSlidingTabItem,
} from "@/components/ui/shared/sliding-tabs";
import { translateAstra } from "@/packages/core/i18n";
import type { CurrentChatIdentitySnapshot } from "@/packages/core/st/chat-identity";
import {
	type CharacterManagementTabValue,
	canOpenCharacterEditTab,
	canOpenCharacterGalleryTab,
	getDefaultCharacterManagementDocumentRef,
	isCharacterManagementSillyTavernInterfaceRoute,
	observeCharacterManagementTabValue,
	readCharacterManagementTabValue,
	readPreferredCharacterManagementTabValue,
	requestCharacterManagementTabValue,
} from "@/packages/features/sillytavern-interface/tools/character-management/characterManagementNative";

export { isCharacterManagementSillyTavernInterfaceRoute } from "@/packages/features/sillytavern-interface/tools/character-management/characterManagementNative";

export interface SillyTavernInterfaceCharacterManagementTabsProps {
	currentChatIdentitySnapshot?: CurrentChatIdentitySnapshot;
	documentRef?: Document;
}

export function SillyTavernInterfaceCharacterManagementTabs({
	currentChatIdentitySnapshot,
	documentRef: providedDocumentRef,
}: SillyTavernInterfaceCharacterManagementTabsProps) {
	const documentRef =
		providedDocumentRef ?? getDefaultCharacterManagementDocumentRef();
	const canOpenEditTab = canOpenCharacterEditTab(currentChatIdentitySnapshot);
	const canOpenGalleryTab = canOpenCharacterGalleryTab(
		currentChatIdentitySnapshot,
	);
	const [activeTabValue, setActiveTabValue] =
		React.useState<CharacterManagementTabValue>(() =>
			readPreferredCharacterManagementTabValue({
				canOpenEditTab,
				documentRef,
			}),
		);
	const items = React.useMemo<AstraSlidingTabItem[]>(
		() => [
			{
				label: translateAstra(
					"sillyTavernInterface.characterManagementTabs.cards",
				),
				value: "cards",
			},
			{
				disabled: !canOpenEditTab,
				label: translateAstra(
					"sillyTavernInterface.characterManagementTabs.edit",
				),
				value: "edit",
			},
			{
				label: translateAstra(
					"sillyTavernInterface.characterManagementTabs.advanced",
				),
				value: "advanced",
			},
			{
				disabled: !canOpenGalleryTab,
				label: translateAstra(
					"sillyTavernInterface.characterManagementTabs.gallery",
				),
				value: "images",
			},
		],
		[canOpenEditTab, canOpenGalleryTab],
	);

	React.useLayoutEffect(() => {
		if (!documentRef) {
			return undefined;
		}

		const preferredValue = readPreferredCharacterManagementTabValue({
			canOpenEditTab,
			canOpenGalleryTab,
			documentRef,
		});

		setActiveTabValue(preferredValue);
		if (preferredValue !== readCharacterManagementTabValue(documentRef)) {
			requestCharacterManagementTabValue({
				canOpenEditTab,
				canOpenGalleryTab,
				documentRef,
				value: preferredValue,
			});
		}

		return observeCharacterManagementTabValue({
			documentRef,
			onValueChange: setActiveTabValue,
		});
	}, [canOpenEditTab, canOpenGalleryTab, documentRef]);

	const handleTabChange = React.useCallback(
		(nextValue: string) => {
			if (
				nextValue !== "advanced" &&
				nextValue !== "cards" &&
				nextValue !== "edit" &&
				nextValue !== "images"
			) {
				return;
			}

			if (nextValue === "edit" && !canOpenEditTab) {
				return;
			}

			if (nextValue === "images" && !canOpenGalleryTab) {
				return;
			}

			setActiveTabValue(nextValue);
			requestCharacterManagementTabValue({
				canOpenEditTab,
				canOpenGalleryTab,
				documentRef,
				value: nextValue,
			});
		},
		[canOpenEditTab, canOpenGalleryTab, documentRef],
	);

	return (
		<AstraSlidingTabs
			ariaLabel={translateAstra(
				"sillyTavernInterface.characterManagementTabs.label",
			)}
			items={items}
			value={activeTabValue}
			onValueChange={handleTabChange}
		/>
	);
}
