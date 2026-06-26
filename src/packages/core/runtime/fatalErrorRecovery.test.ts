import { describe, expect, test, vi, afterEach } from "vitest";

import {
	configureAstraFatalErrorRecovery,
	resetAstraFatalErrorRecoveryForTests,
	safeRuntimeAsyncCallback,
	safeRuntimeCallback,
} from "@/packages/core/runtime/fatalErrorRecovery";
import {
	ASTRA_PROJECTA_PORTAL_ID,
	ASTRA_PROJECTA_ROOT_ID,
	ensureAstraProjectaUiInfrastructure,
} from "@/packages/core/runtime/uiScope";
import {
	BASE_UI_BODY_CLASS,
	MOBILE_LAYOUT_CLASS,
	THEME_BODY_CLASS,
} from "@/packages/core/constants";

describe("fatalErrorRecovery", () => {
	afterEach(() => {
		resetAstraFatalErrorRecoveryForTests();
		document.body.className = "";
		document.body.innerHTML = "";
	});

	test("recovers once from a safe runtime callback while preserving the original error", () => {
		const originalError = new Error("render callback failed");
		const runtimeDispose = vi.fn();
		const notify = vi.fn();
		const restoreNativeUi = vi.fn();
		const onCleanupError = vi.fn();
		const logger = {
			error: vi.fn(),
		};
		document.body.classList.add(
			THEME_BODY_CLASS,
			BASE_UI_BODY_CLASS,
			MOBILE_LAYOUT_CLASS,
		);
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		configureAstraFatalErrorRecovery({
			documentRef: document,
			logger,
			notify,
			onCleanupError,
			restoreNativeUi,
			runtime: { dispose: runtimeDispose },
		});
		const callback = safeRuntimeCallback("message-actions", () => {
			throw originalError;
		});

		expect(() => callback()).toThrow(originalError);
		expect(() => callback()).toThrow(originalError);

		expect(runtimeDispose).toHaveBeenCalledTimes(1);
		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(document.body).not.toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).not.toHaveClass(MOBILE_LAYOUT_CLASS);
		expect(document.getElementById(ASTRA_PROJECTA_ROOT_ID)).toBeNull();
		expect(document.getElementById(ASTRA_PROJECTA_PORTAL_ID)).toBeNull();
		expect(restoreNativeUi).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			"[AstraProjecta] Fatal runtime error in message-actions.",
			originalError,
		);
		expect(onCleanupError).not.toHaveBeenCalled();
	});

	test("safe async runtime callbacks reject with the original error after recovery", async () => {
		const originalError = new Error("async callback failed");
		const runtimeDispose = vi.fn();
		const logger = {
			error: vi.fn(),
		};
		configureAstraFatalErrorRecovery({
			documentRef: document,
			logger,
			notify: vi.fn(),
			runtime: { dispose: runtimeDispose },
		});
		const callback = safeRuntimeAsyncCallback("chat-catalog", async () => {
			throw originalError;
		});

		await expect(callback()).rejects.toThrow(originalError);

		expect(runtimeDispose).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			"[AstraProjecta] Fatal runtime error in chat-catalog.",
			originalError,
		);
	});

	test("keeps fatal recovery one-shot when runtime disposal clears the active config", () => {
		const originalError = new Error("render callback failed");
		const logger = {
			error: vi.fn(),
		};
		const notify = vi.fn();
		const runtimeDispose = vi.fn(() => {
			configureAstraFatalErrorRecovery({
				documentRef: document,
				logger,
				notify,
				runtime: null,
			});
		});
		configureAstraFatalErrorRecovery({
			documentRef: document,
			logger,
			notify,
			runtime: { dispose: runtimeDispose },
		});
		const callback = safeRuntimeCallback("message-actions", () => {
			throw originalError;
		});

		expect(() => callback()).toThrow(originalError);
		expect(() => callback()).toThrow(originalError);

		expect(runtimeDispose).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledTimes(1);
	});
});
