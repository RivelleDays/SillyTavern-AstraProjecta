import * as React from "react";

import { translateAstra } from "@/packages/core/i18n";
import {
	createNativeDrawerBridge,
	type NativeDrawerBridgeSnapshot,
} from "@/packages/core/st/native-drawers/createNativeDrawerBridge";
import type { I18nKey } from "@/types/i18n";

export function NativeDrawerPage({
	documentRef = document,
	hostId,
	missingMessageKey,
	sourceId,
}: {
	documentRef?: Document;
	hostId: string;
	missingMessageKey: I18nKey;
	sourceId: string;
}) {
	const hostRef = React.useRef<HTMLDivElement | null>(null);
	const [bridgeSnapshot, setBridgeSnapshot] =
		React.useState<NativeDrawerBridgeSnapshot | null>(null);
	const isMissingNativeDrawer =
		bridgeSnapshot !== null && !bridgeSnapshot.isAvailable;

	React.useLayoutEffect(() => {
		const host = hostRef.current;
		if (!(host instanceof HTMLElement)) {
			return undefined;
		}

		let isActive = true;
		const bridge = createNativeDrawerBridge({
			documentRef,
			onSnapshotChange: (snapshot) => {
				if (isActive) {
					setBridgeSnapshot(snapshot);
				}
			},
			sourceId,
		});

		bridge.attachTo(host);
		setBridgeSnapshot(bridge.getSnapshot());

		return () => {
			isActive = false;
			bridge.dispose();
		};
	}, [documentRef, sourceId]);

	return (
		<div
			className="sillytavern-interface__native-host"
			data-astra-native-drawer-host={sourceId}
			id={hostId}
			ref={hostRef}
		>
			{isMissingNativeDrawer ? (
				<p className="sillytavern-interface__placeholder-copy">
					{translateAstra(missingMessageKey)}
				</p>
			) : null}
		</div>
	);
}
