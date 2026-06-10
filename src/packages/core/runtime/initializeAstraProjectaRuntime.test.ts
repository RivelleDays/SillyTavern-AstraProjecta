import { describe, expect, test, vi } from "vitest";

import {
	ASTRA_PROJECTA_PORTAL_ID,
	ASTRA_PROJECTA_ROOT_ID,
	ASTRA_PROJECTA_UI_ROOT_ATTR,
} from "@/packages/core/runtime/uiScope";
import { initializeAstraProjectaRuntime } from "@/packages/core/runtime/initializeAstraProjectaRuntime";
import { THEME_BODY_CLASS } from "@/packages/core/constants";

describe("initializeAstraProjectaRuntime", () => {
	test("applies the global theme body class and leaves mobile feature mounting to the mobile runtime", () => {
		const firstMobileDispose = vi.fn();
		const secondMobileDispose = vi.fn();
		const createMobileRuntime = vi
			.fn()
			.mockReturnValueOnce({ dispose: firstMobileDispose })
			.mockReturnValueOnce({ dispose: secondMobileDispose });
		const windowRef = {
			matchMedia: vi.fn(),
		};

		const firstRuntime = initializeAstraProjectaRuntime({
			createMobileRuntime,
			documentRef: document,
			windowRef: windowRef as never,
		});

		expect(document.body).toHaveClass(THEME_BODY_CLASS);
		expect(
			document.querySelectorAll(`#${ASTRA_PROJECTA_ROOT_ID}`),
		).toHaveLength(1);
		expect(
			document.querySelectorAll(`#${ASTRA_PROJECTA_PORTAL_ID}`),
		).toHaveLength(1);
		expect(document.getElementById(ASTRA_PROJECTA_ROOT_ID)).toHaveAttribute(
			ASTRA_PROJECTA_UI_ROOT_ATTR,
		);

		firstRuntime.dispose();

		expect(firstMobileDispose).toHaveBeenCalledTimes(1);
		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);

		const secondRuntime = initializeAstraProjectaRuntime({
			createMobileRuntime,
			documentRef: document,
			windowRef: windowRef as never,
		});

		expect(document.body).toHaveClass(THEME_BODY_CLASS);
		expect(
			document.querySelectorAll(`#${ASTRA_PROJECTA_ROOT_ID}`),
		).toHaveLength(1);
		expect(
			document.querySelectorAll(`#${ASTRA_PROJECTA_PORTAL_ID}`),
		).toHaveLength(1);

		secondRuntime.dispose();

		expect(secondMobileDispose).toHaveBeenCalledTimes(1);
		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(createMobileRuntime).toHaveBeenCalledTimes(2);
		expect(firstRuntime).not.toHaveProperty("messageHeaderLayout");
		expect(secondRuntime).not.toHaveProperty("messageHeaderLayout");
	});
});
