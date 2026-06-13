import * as React from "react";

import type { SillyTavernInterfaceRouteIconKey } from "@/app/shared/sillytavern-interface";
import { cn } from "@/lib/utils";
import {
	SILLYTAVERN_INTERFACE_ROUTE_ICON_SOURCES,
} from "@/packages/features/sillytavern-interface/icons/registry";

export function SillyTavernInterfaceRouteIcon({
	className,
	iconKey,
}: {
	className?: string;
	iconKey: SillyTavernInterfaceRouteIconKey;
}) {
	return (
		<span
			aria-hidden={true}
			className={cn(className)}
			dangerouslySetInnerHTML={{
				__html: SILLYTAVERN_INTERFACE_ROUTE_ICON_SOURCES[iconKey],
			}}
		/>
	);
}
