import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";

import {
	ASTRA_PROJECTA_PORTAL_ID,
	markAstraProjectaUiRoot,
} from "@/packages/core/runtime/uiScope";

export interface AstraReactPortalRootManager {
	ensure(): HTMLDivElement;
	getHost(): HTMLDivElement | null;
	render(node: ReactNode): void;
	unmount(): void;
}

export function createAstraReactPortalRootManager({
	documentRef = document,
	id,
}: {
	documentRef?: Document;
	id: string;
}): AstraReactPortalRootManager {
	let root: Root | null = null;
	let host: HTMLDivElement | null = null;

	function resolveContainer(): HTMLElement {
		return (
			documentRef.getElementById(ASTRA_PROJECTA_PORTAL_ID) ??
			documentRef.body ??
			documentRef.documentElement
		);
	}

	function ensure(): HTMLDivElement {
		if (root && host?.isConnected) {
			return host;
		}

		root?.unmount();
		root = null;
		host?.remove();

		host = documentRef.createElement("div");
		host.id = id;
		markAstraProjectaUiRoot(host);
		resolveContainer().appendChild(host);
		root = createRoot(host);

		return host;
	}

	function unmount() {
		root?.unmount();
		root = null;
		host?.remove();
		host = null;
	}

	return {
		ensure,
		getHost() {
			return host;
		},
		render(node) {
			ensure();
			root?.render(node);
		},
		unmount,
	};
}
