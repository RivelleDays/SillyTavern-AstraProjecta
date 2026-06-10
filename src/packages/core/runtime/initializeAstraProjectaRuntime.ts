import {
	createMobileChatSessionRuntime,
	type MobileChatSessionRuntime,
} from "@/app/mobile/runtime/createMobileChatSessionRuntime";
import { THEME_BODY_CLASS } from "@/packages/core/constants";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";

interface WindowLike {
	matchMedia?: Window["matchMedia"];
}

export interface AstraProjectaRuntime {
	dispose(): void;
	mobile: MobileChatSessionRuntime;
}

export function initializeAstraProjectaRuntime({
	createMobileRuntime = createMobileChatSessionRuntime,
	documentRef = document,
	ensureUiInfrastructure = ensureAstraProjectaUiInfrastructure,
	windowRef = window,
}: {
	createMobileRuntime?: (args?: {
		documentRef?: Document;
		windowRef?: WindowLike;
	}) => MobileChatSessionRuntime;
	documentRef?: Document;
	ensureUiInfrastructure?: (args?: {
		documentRef?: Document;
	}) => HTMLDivElement | null;
	windowRef?: WindowLike;
} = {}): AstraProjectaRuntime {
	documentRef.body?.classList.add(THEME_BODY_CLASS);
	ensureUiInfrastructure({ documentRef });

	const mobile = createMobileRuntime({
		documentRef,
		windowRef,
	});

	return {
		dispose() {
			mobile.dispose();
			documentRef.body?.classList.remove(THEME_BODY_CLASS);
		},
		mobile,
	};
}
