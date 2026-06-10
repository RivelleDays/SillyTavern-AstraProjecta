import * as React from "react";

import { translateAstra } from "@/packages/core/i18n";
import {
	createNativeDrawerBridge,
	type NativeDrawerBridgeSnapshot,
} from "@/packages/core/st/native-drawers/createNativeDrawerBridge";
import {
	getDefaultPersonaManagementDocumentRef,
	observePersonaManagementTabValue,
	readPreferredPersonaManagementTabValue,
} from "@/packages/features/sillytavern-interface/tools/persona-management/personaManagementState";
import type { I18nKey } from "@/types/i18n";

const PERSONA_MANAGEMENT_SOURCE_ID = "PersonaManagement";

export interface PersonaManagementPageProps {
	documentRef?: Document;
	hostId: string;
	missingMessageKey: I18nKey;
}

export function PersonaManagementPage({
	documentRef: providedDocumentRef,
	hostId,
	missingMessageKey,
}: PersonaManagementPageProps) {
	const documentRef =
		providedDocumentRef ??
		getDefaultPersonaManagementDocumentRef() ??
		document;
	const hostRef = React.useRef<HTMLDivElement | null>(null);
	const [activeTabValue, setActiveTabValue] = React.useState(() =>
		readPreferredPersonaManagementTabValue({
			documentRef,
		}),
	);
	const [bridgeSnapshot, setBridgeSnapshot] =
		React.useState<NativeDrawerBridgeSnapshot | null>(null);
	const isMissingNativeDrawer =
		bridgeSnapshot !== null && !bridgeSnapshot.isAvailable;

	React.useLayoutEffect(() => {
		const host = hostRef.current;

		if (!(host instanceof HTMLElement) || !documentRef) {
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
			sourceId: PERSONA_MANAGEMENT_SOURCE_ID,
		});

		bridge.attachTo(host);
		setBridgeSnapshot(bridge.getSnapshot());

		return () => {
			isActive = false;
			bridge.dispose();
		};
	}, [documentRef]);

	React.useLayoutEffect(() => {
		if (!documentRef) {
			return undefined;
		}

		setActiveTabValue(
			readPreferredPersonaManagementTabValue({
				documentRef,
			}),
		);

		return observePersonaManagementTabValue({
			documentRef,
			onValueChange: setActiveTabValue,
		});
	}, [documentRef]);

	return (
		<div
			className="sillytavern-interface__native-host"
			data-astra-native-drawer-host={PERSONA_MANAGEMENT_SOURCE_ID}
			data-persona-management-tab={activeTabValue}
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
