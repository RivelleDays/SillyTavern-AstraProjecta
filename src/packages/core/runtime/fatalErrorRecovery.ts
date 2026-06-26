import { EXTENSION_LOG_PREFIX } from "@/packages/core/constants";
import { translateAstra } from "@/packages/core/i18n";
import {
	cleanupAstraRuntimeSurface,
	type RuntimeCleanupErrorHandler,
} from "@/packages/core/runtime/runtimeCleanup";

interface ToastrLike {
	error?: (message: string) => void;
}

export interface FatalRecoveryRuntime {
	dispose(): void;
}

export interface AstraFatalErrorRecoveryConfig {
	documentRef?: Document;
	logger?: Pick<Console, "error">;
	notify?: (message: string) => void;
	onCleanupError?: RuntimeCleanupErrorHandler;
	restoreNativeUi?: (documentRef: Document) => void;
	runtime?: FatalRecoveryRuntime | null;
}

let recoveryConfig: AstraFatalErrorRecoveryConfig = {};
let didRecover = false;

function defaultNotify(message: string): void {
	const toastr = (globalThis as typeof globalThis & { toastr?: ToastrLike })
		.toastr;
	toastr?.error?.call(toastr, message);
}

function getDocumentRef(): Document | undefined {
	if (recoveryConfig.documentRef) {
		return recoveryConfig.documentRef;
	}

	return typeof document === "undefined" ? undefined : document;
}

function handleCleanupError(error: unknown): void {
	recoveryConfig.onCleanupError?.(error);
	if (!recoveryConfig.onCleanupError) {
		(recoveryConfig.logger ?? console).error(
			`${EXTENSION_LOG_PREFIX} Runtime cleanup failed.`,
			error,
		);
	}
}

export function configureAstraFatalErrorRecovery(
	config: AstraFatalErrorRecoveryConfig,
): void {
	recoveryConfig = config;
	if (config.runtime) {
		didRecover = false;
	}
}

export function resetAstraFatalErrorRecoveryForTests(): void {
	recoveryConfig = {};
	didRecover = false;
}

export function reportAstraFatalError(source: string, error: unknown): void {
	if (didRecover) {
		return;
	}

	didRecover = true;
	const logger = recoveryConfig.logger ?? console;
	logger.error(
		`${EXTENSION_LOG_PREFIX} Fatal runtime error in ${source}.`,
		error,
	);

	try {
		recoveryConfig.runtime?.dispose();
	} catch (cleanupError) {
		handleCleanupError(cleanupError);
	}

	const documentRef = getDocumentRef();
	if (documentRef) {
		cleanupAstraRuntimeSurface({
			documentRef,
			onCleanupError: handleCleanupError,
			restoreNativeUi: recoveryConfig.restoreNativeUi,
		});
	}

	(recoveryConfig.notify ?? defaultNotify)(
		translateAstra("runtime.fatalRecovery.notification"),
	);
}

export function safeRuntimeCallback<TArgs extends unknown[], TResult>(
	source: string,
	callback: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
	return (...args: TArgs) => {
		try {
			return callback(...args);
		} catch (error) {
			reportAstraFatalError(source, error);
			throw error;
		}
	};
}

export function safeRuntimeAsyncCallback<TArgs extends unknown[], TResult>(
	source: string,
	callback: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
	return async (...args: TArgs) => {
		try {
			return await callback(...args);
		} catch (error) {
			reportAstraFatalError(source, error);
			throw error;
		}
	};
}
