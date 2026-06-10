import * as React from "react";

import {
	createNativeCompanionBridge,
	type NativeCompanionBridgeSnapshot,
} from "@/packages/core/st/native-companions/createNativeCompanionBridge";

export function NativeCompanionHost({
	documentRef = document,
	hostId,
	normalizeOpenDrawerVisibility = false,
	sourceId,
}: {
	documentRef?: Document;
	hostId: string;
	normalizeOpenDrawerVisibility?: boolean;
	sourceId: string;
}) {
	const hostRef = React.useRef<HTMLDivElement | null>(null);
	const [, setBridgeSnapshot] =
		React.useState<NativeCompanionBridgeSnapshot | null>(null);

	React.useLayoutEffect(() => {
		const host = hostRef.current;
		if (!(host instanceof HTMLElement)) {
			return undefined;
		}

		let isActive = true;
		const bridge = createNativeCompanionBridge({
			documentRef,
			normalizeOpenDrawerVisibility,
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
	}, [documentRef, normalizeOpenDrawerVisibility, sourceId]);

	return (
		<div
			className="sillytavern-interface__native-companion-host"
			data-astra-native-companion-host={sourceId}
			id={hostId}
			ref={hostRef}
		/>
	);
}
