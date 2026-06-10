import * as React from "react";

import type { LucideIcon } from "@/components/ui/shared/icons";
import type { SillyTavernInterfaceRouteIconKey } from "@/packages/features/sillytavern-interface/icons/registry";

export type SillyTavernInterfacePageHeaderIcon =
	| {
			icon: LucideIcon;
			kind: "lucide";
	  }
	| {
			iconKey: SillyTavernInterfaceRouteIconKey;
			kind: "main-menu-svg";
	  }
	| {
			fallbackIconKey: SillyTavernInterfaceRouteIconKey;
			kind: "current-chat-avatar";
	  }
	| {
			kind: "current-user-avatar";
	  };

export interface SillyTavernInterfacePageDescriptor {
	bodyOverlay?: () => React.ReactNode;
	breadcrumb?: React.ReactNode;
	docsHref?: string;
	headerIcon?: SillyTavernInterfacePageHeaderIcon;
	headerSummary?: React.ReactNode;
	icon?: LucideIcon;
	key: string;
	render(): React.ReactNode;
	sectionNav?: React.ReactNode;
	title: React.ReactNode;
}

export interface SillyTavernInterfacePageNavigationPageItem {
	icon: LucideIcon;
	key: string;
	label: string;
	pageKey: string;
	type: "page";
}
export type SillyTavernInterfacePageNavigationItem =
	SillyTavernInterfacePageNavigationPageItem;

export interface SillyTavernInterfacePageMainNavigationItem {
	activePageKeys?: readonly string[];
	icon: LucideIcon;
	key: string;
	label: string;
	pageKey: string;
}
