import * as React from "react";

import {
	AstraSlidingTabs,
	type AstraSlidingTabItem,
} from "@/components/ui/shared/sliding-tabs";
import { translateAstra } from "@/packages/core/i18n";
import { DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY } from "@/app/shared/sillytavern-interface";
import type { I18nKey } from "@/types/i18n";

interface AiSettingsTabDefinition {
	key: string;
	labelKey: I18nKey;
	pageKey: string;
}

const AI_SETTINGS_TAB_DEFINITIONS = [
	{
		key: "config",
		labelKey: "sillyTavernInterface.aiSettingsTabs.config",
		pageKey: DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY,
	},
	{
		key: "api",
		labelKey: "sillyTavernInterface.aiSettingsTabs.api",
		pageKey: "connection-profile",
	},
	{
		key: "advanced",
		labelKey: "sillyTavernInterface.aiSettingsTabs.advanced",
		pageKey: "advanced-formatting",
	},
] as const satisfies readonly AiSettingsTabDefinition[];

const AI_SETTINGS_PAGE_KEYS = new Set<string>(
	AI_SETTINGS_TAB_DEFINITIONS.map((item) => item.pageKey),
);

export function isAiSettingsSillyTavernInterfaceRoute(pageKey: string) {
	return AI_SETTINGS_PAGE_KEYS.has(pageKey);
}

export interface SillyTavernInterfaceAiSettingsTabsProps {
	activePageKey: string;
	onPageSelect(pageKey: string): void;
}

export function SillyTavernInterfaceAiSettingsTabs({
	activePageKey,
	onPageSelect,
}: SillyTavernInterfaceAiSettingsTabsProps) {
	const resolvedActivePageKey = isAiSettingsSillyTavernInterfaceRoute(
		activePageKey,
	)
		? activePageKey
		: DEFAULT_SILLYTAVERN_INTERFACE_PAGE_KEY;
	const items = React.useMemo<AstraSlidingTabItem[]>(
		() =>
			AI_SETTINGS_TAB_DEFINITIONS.map((item) => ({
				label: translateAstra(item.labelKey),
				value: item.pageKey,
			})),
		[],
	);

	return (
		<AstraSlidingTabs
			ariaLabel={translateAstra(
				"sillyTavernInterface.aiSettingsTabs.label",
			)}
			items={items}
			value={resolvedActivePageKey}
			onValueChange={onPageSelect}
		/>
	);
}
