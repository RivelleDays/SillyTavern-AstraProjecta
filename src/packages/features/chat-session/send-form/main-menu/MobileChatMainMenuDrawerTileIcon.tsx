import * as React from "react";

import { SillyTavernInterfaceRouteIcon } from "@/packages/features/sillytavern-interface/icons/SillyTavernInterfaceRouteIcon";
import type { MobileChatMainMenuTileIconKey } from "@/packages/features/sillytavern-interface/icons/registry";

export function MobileChatMainMenuDrawerTileIcon({
	className,
	iconKey,
}: {
	className?: string;
	iconKey: MobileChatMainMenuTileIconKey;
}) {
	return (
		<SillyTavernInterfaceRouteIcon
			className={className}
			iconKey={iconKey}
		/>
	);
}
