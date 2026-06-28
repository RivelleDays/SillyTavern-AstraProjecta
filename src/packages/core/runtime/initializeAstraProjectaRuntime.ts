import { THEME_BODY_CLASS } from "@/packages/core/constants";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import {
	cleanupAstraRuntimeSurface,
	type RuntimeCleanupErrorHandler,
} from "@/packages/core/runtime/runtimeCleanup";
import { configureAstraFatalErrorRecovery } from "@/packages/core/runtime/fatalErrorRecovery";
import {
	createChatBackgroundAppearanceRuntimeBridge as createDefaultChatBackgroundAppearanceRuntimeBridge,
	type ChatBackgroundAppearanceRuntimeBridge,
} from "@/packages/core/st/chat-background-appearance/applyChatBackgroundAppearance";
import {
	createChatMessageAppearanceRuntimeBridge as createDefaultChatMessageAppearanceRuntimeBridge,
	type ChatMessageAppearanceRuntimeBridge,
} from "@/packages/core/st/chat-message-appearance/applyChatMessageAppearance";

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
	createChatBackgroundAppearanceRuntimeBridge = createDefaultChatBackgroundAppearanceRuntimeBridge,
	createChatMessageAppearanceRuntimeBridge = createDefaultChatMessageAppearanceRuntimeBridge,
	createRuntime,
	documentRef = document,
	ensureUiInfrastructure = ensureAstraProjectaUiInfrastructure,
	logger,
	notify,
	onCleanupError,
	restoreNativeUi,
	windowRef = window,
}: {
	createChatBackgroundAppearanceRuntimeBridge?: (args?: {
		documentRef?: Document;
	}) => ChatBackgroundAppearanceRuntimeBridge;
	createChatMessageAppearanceRuntimeBridge?: (args?: {
		documentRef?: Document;
	}) => ChatMessageAppearanceRuntimeBridge;
	createRuntime?: (
		args?: AstraProjectaRuntimeHost,
	) => AstraProjectaChildRuntime;
	documentRef?: Document;
	ensureUiInfrastructure?: (args?: {
		documentRef?: Document;
	}) => HTMLDivElement | null;
	logger?: Pick<Console, "error">;
	notify?: (message: string) => void;
	onCleanupError?: RuntimeCleanupErrorHandler;
	restoreNativeUi?: (documentRef: Document) => void;
	windowRef?: object;
} = {}): AstraProjectaRuntime {
	let runtime: AstraProjectaChildRuntime | undefined;
	let chatBackgroundAppearanceBridge:
		| ChatBackgroundAppearanceRuntimeBridge
		| undefined;
	let chatMessageAppearanceBridge:
		| ChatMessageAppearanceRuntimeBridge
		| undefined;

	try {
		documentRef.body?.classList.add(THEME_BODY_CLASS);
		ensureUiInfrastructure({ documentRef });
		chatBackgroundAppearanceBridge =
			createChatBackgroundAppearanceRuntimeBridge({
				documentRef,
			});
		chatMessageAppearanceBridge = createChatMessageAppearanceRuntimeBridge({
			documentRef,
		});

		runtime = createRuntime?.({
			documentRef,
			windowRef,
		});
		configureAstraFatalErrorRecovery({
			documentRef,
			logger,
			notify,
			onCleanupError,
			restoreNativeUi,
			runtime,
		});
	} catch (error) {
		cleanupAstraRuntimeSurface({
			documentRef,
			onCleanupError,
			restoreNativeUi,
		});
		configureAstraFatalErrorRecovery({
			documentRef,
			logger,
			notify,
			onCleanupError,
			restoreNativeUi,
			runtime: null,
		});
		throw error;
	}

	let disposed = false;

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;

			try {
				runtime?.dispose();
			} catch (error) {
				onCleanupError?.(error);
			}

			try {
				chatBackgroundAppearanceBridge?.dispose();
			} catch (error) {
				onCleanupError?.(error);
			}

			try {
				chatMessageAppearanceBridge?.dispose();
			} catch (error) {
				onCleanupError?.(error);
			}

			cleanupAstraRuntimeSurface({
				documentRef,
				onCleanupError,
				restoreNativeUi,
			});
			configureAstraFatalErrorRecovery({
				documentRef,
				logger,
				notify,
				onCleanupError,
				restoreNativeUi,
				runtime: null,
			});
		},
	};
}
