import * as React from "react";

import { getDefaultLayoutModeStore } from "@/packages/core/layout-mode";

export function useIsMobileLayout() {
	const layoutModeStore = React.useMemo(
		() =>
			getDefaultLayoutModeStore({
				windowRef: typeof window === "undefined" ? undefined : window,
			}),
		[],
	);

	return React.useSyncExternalStore(
		layoutModeStore.subscribe,
		() => layoutModeStore.getSnapshot().resolvedMode === "mobile",
		() => false,
	);
}

export function useIsMobile() {
	return useIsMobileLayout();
}
