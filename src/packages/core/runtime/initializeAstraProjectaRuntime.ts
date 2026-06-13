import { THEME_BODY_CLASS } from "@/packages/core/constants";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";

export interface AstraProjectaRuntimeHost {
	documentRef?: Document;
	windowRef?: object;
}

export interface AstraProjectaChildRuntime {
	dispose(): void;
}

export interface AstraProjectaRuntime {
	dispose(): void;
}

export function initializeAstraProjectaRuntime({
	createRuntime,
	documentRef = document,
	ensureUiInfrastructure = ensureAstraProjectaUiInfrastructure,
	windowRef = window,
}: {
	createRuntime?: (
		args?: AstraProjectaRuntimeHost,
	) => AstraProjectaChildRuntime;
	documentRef?: Document;
	ensureUiInfrastructure?: (args?: {
		documentRef?: Document;
	}) => HTMLDivElement | null;
	windowRef?: object;
} = {}): AstraProjectaRuntime {
	documentRef.body?.classList.add(THEME_BODY_CLASS);
	ensureUiInfrastructure({ documentRef });

	const runtime = createRuntime?.({
		documentRef,
		windowRef,
	});

	return {
		dispose() {
			runtime?.dispose();
			documentRef.body?.classList.remove(THEME_BODY_CLASS);
		},
	};
}
