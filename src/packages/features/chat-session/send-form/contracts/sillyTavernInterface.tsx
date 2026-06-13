import * as React from "react";

import type {
	SillyTavernInterfaceRouteIconKey,
	SillyTavernInterfaceRouteKey,
} from "@/app/shared/sillytavern-interface";

export interface MobileSendFormSillyTavernInterfaceRouteIconProps {
	className?: string;
	iconKey: SillyTavernInterfaceRouteIconKey;
}

export interface MobileSendFormSillyTavernInterfaceAdapter {
	openCurrentPage(): void;
	openRoute(pageKey: SillyTavernInterfaceRouteKey): void;
	renderRouteIcon(
		props: MobileSendFormSillyTavernInterfaceRouteIconProps,
	): React.ReactNode;
}

export const NOOP_MOBILE_SEND_FORM_SILLYTAVERN_INTERFACE: MobileSendFormSillyTavernInterfaceAdapter =
	{
		openCurrentPage() {},
		openRoute() {},
		renderRouteIcon() {
			return null;
		},
	};
