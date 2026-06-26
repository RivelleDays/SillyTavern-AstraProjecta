import {
	BASE_UI_BODY_CLASS,
	MOBILE_LAYOUT_CLASS,
	THEME_BODY_CLASS,
} from "@/packages/core/constants";
import { removeAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";

export type RuntimeCleanupErrorHandler = (error: unknown) => void;

export interface AstraRuntimeSurfaceCleanupOptions {
	documentRef?: Document;
	onCleanupError?: RuntimeCleanupErrorHandler;
	restoreNativeUi?: (documentRef: Document) => void;
}

export function removeAllAstraBodyClasses(documentRef: Document): void {
	documentRef.body?.classList.remove(
		THEME_BODY_CLASS,
		BASE_UI_BODY_CLASS,
		MOBILE_LAYOUT_CLASS,
	);
}

export function cleanupAstraRuntimeSurface({
	documentRef = document,
	onCleanupError,
	restoreNativeUi,
}: AstraRuntimeSurfaceCleanupOptions = {}): void {
	removeAllAstraBodyClasses(documentRef);
	removeAstraProjectaUiInfrastructure({ documentRef });

	if (!restoreNativeUi) {
		return;
	}

	try {
		restoreNativeUi(documentRef);
	} catch (error) {
		onCleanupError?.(error);
	}
}
