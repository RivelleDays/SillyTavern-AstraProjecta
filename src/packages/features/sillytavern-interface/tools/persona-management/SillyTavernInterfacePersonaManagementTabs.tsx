import * as React from "react";

import {
	AstraSlidingTabs,
	type AstraSlidingTabItem,
} from "@/components/ui/shared/sliding-tabs";
import { translateAstra } from "@/packages/core/i18n";
import {
	getDefaultPersonaManagementDocumentRef,
	isPersonaManagementSillyTavernInterfaceRoute,
	observePersonaManagementTabValue,
	readPreferredPersonaManagementTabValue,
	requestPersonaManagementTabValue,
} from "@/packages/features/sillytavern-interface/tools/persona-management/personaManagementState";

export { isPersonaManagementSillyTavernInterfaceRoute } from "@/packages/features/sillytavern-interface/tools/persona-management/personaManagementState";

export interface SillyTavernInterfacePersonaManagementTabsProps {
	documentRef?: Document;
}

export function SillyTavernInterfacePersonaManagementTabs({
	documentRef: providedDocumentRef,
}: SillyTavernInterfacePersonaManagementTabsProps) {
	const documentRef =
		providedDocumentRef ?? getDefaultPersonaManagementDocumentRef();
	const [activeTabValue, setActiveTabValue] = React.useState(() =>
		readPreferredPersonaManagementTabValue({
			documentRef,
		}),
	);
	const items = React.useMemo<AstraSlidingTabItem[]>(
		() => [
			{
				label: translateAstra(
					"sillyTavernInterface.personaManagementTabs.personas",
				),
				value: "personas",
			},
			{
				label: translateAstra(
					"sillyTavernInterface.personaManagementTabs.edit",
				),
				value: "edit",
			},
		],
		[],
	);

	React.useLayoutEffect(() => {
		if (!documentRef) {
			return undefined;
		}

		setActiveTabValue(
			readPreferredPersonaManagementTabValue({
				documentRef,
			}),
		);

		return observePersonaManagementTabValue({
			documentRef,
			onValueChange: setActiveTabValue,
		});
	}, [documentRef]);

	const handleTabChange = React.useCallback(
		(nextValue: string) => {
			if (nextValue !== "personas" && nextValue !== "edit") {
				return;
			}

			setActiveTabValue(nextValue);
			requestPersonaManagementTabValue({
				documentRef,
				value: nextValue,
			});
		},
		[documentRef],
	);

	return (
		<AstraSlidingTabs
			ariaLabel={translateAstra(
				"sillyTavernInterface.personaManagementTabs.label",
			)}
			items={items}
			value={activeTabValue}
			onValueChange={handleTabChange}
		/>
	);
}
