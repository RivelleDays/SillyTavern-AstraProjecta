import type { ReactNode } from "react";

import type {
	SillyTavernInterfaceRouteIconKey,
	SillyTavernInterfaceRouteKey,
} from "@/app/shared/sillytavern-interface";

export interface SendFormSillyTavernInterfaceRouteIconProps {
	className?: string;
	iconKey: SillyTavernInterfaceRouteIconKey;
}

export interface SendFormSillyTavernInterfaceAdapter {
	openCurrentPage(): void;
	openRoute(pageKey: SillyTavernInterfaceRouteKey): void;
	renderRouteIcon(
		props: SendFormSillyTavernInterfaceRouteIconProps,
	): ReactNode;
}

export const NOOP_SEND_FORM_SILLYTAVERN_INTERFACE: SendFormSillyTavernInterfaceAdapter =
	{
		openCurrentPage() {},
		openRoute() {},
		renderRouteIcon() {
			return null;
		},
	};
