import { waitFor } from "@testing-library/react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test, vi } from "vitest";

import { AstraErrorBoundary } from "@/packages/core/runtime/AstraErrorBoundary";
import {
	configureAstraFatalErrorRecovery,
	resetAstraFatalErrorRecoveryForTests,
} from "@/packages/core/runtime/fatalErrorRecovery";
import {
	ASTRA_PROJECTA_ROOT_ID,
	ensureAstraProjectaUiInfrastructure,
} from "@/packages/core/runtime/uiScope";
import {
	BASE_UI_BODY_CLASS,
	MOBILE_LAYOUT_CLASS,
	THEME_BODY_CLASS,
} from "@/packages/core/constants";

describe("AstraErrorBoundary", () => {
	afterEach(() => {
		resetAstraFatalErrorRecoveryForTests();
		document.body.className = "";
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	test("recovers native UI when a React render error reaches the boundary", async () => {
		const renderError = new Error("mobile root failed");
		const runtimeDispose = vi.fn();
		const notify = vi.fn();
		const restoreNativeUi = vi.fn();
		const logger = {
			error: vi.fn(),
		};
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
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
			restoreNativeUi,
			runtime: { dispose: runtimeDispose },
		});
		const host = document.createElement("div");
		document.body.append(host);
		const root = createRoot(host);
		function ThrowingComponent(): React.ReactElement {
			throw renderError;
		}

		root.render(
			<AstraErrorBoundary source="test-root">
				<ThrowingComponent />
			</AstraErrorBoundary>,
		);

		await waitFor(() => {
			expect(runtimeDispose).toHaveBeenCalledTimes(1);
		});
		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(document.body).not.toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).not.toHaveClass(MOBILE_LAYOUT_CLASS);
		expect(document.getElementById(ASTRA_PROJECTA_ROOT_ID)).toBeNull();
		expect(restoreNativeUi).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith(
			"[AstraProjecta] Fatal runtime error in test-root.",
			renderError,
		);
		consoleError.mockRestore();
	});
});
