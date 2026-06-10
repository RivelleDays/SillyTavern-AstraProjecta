import * as React from "react";

import { cn } from "@/lib/utils";
import {
	SILLYTAVERN_INTERFACE_ROUTE_ICON_SOURCES,
	type SillyTavernInterfaceRouteIconKey,
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
