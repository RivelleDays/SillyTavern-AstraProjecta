import { describe, expect, test, vi } from "vitest";

import {
	ASTRA_PROJECTA_PORTAL_ID,
	ASTRA_PROJECTA_ROOT_ID,
	ASTRA_PROJECTA_UI_ROOT_ATTR,
} from "@/packages/core/runtime/uiScope";
import { initializeAstraProjectaRuntime } from "@/packages/core/runtime/initializeAstraProjectaRuntime";
import { THEME_BODY_CLASS } from "@/packages/core/constants";

describe("initializeAstraProjectaRuntime", () => {
	test("applies global runtime infrastructure and disposes an injected child runtime", () => {
		const firstChildDispose = vi.fn();
		const secondChildDispose = vi.fn();
		const createRuntime = vi
			.fn()
			.mockReturnValueOnce({ dispose: firstChildDispose })
			.mockReturnValueOnce({ dispose: secondChildDispose });
		const windowRef = {
			matchMedia: vi.fn(),
		};

		const firstRuntime = initializeAstraProjectaRuntime({
			createRuntime,
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

		expect(firstChildDispose).toHaveBeenCalledTimes(1);
		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);

		const secondRuntime = initializeAstraProjectaRuntime({
			createRuntime,
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

		expect(secondChildDispose).toHaveBeenCalledTimes(1);
		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(createRuntime).toHaveBeenCalledTimes(2);
		expect(createRuntime).toHaveBeenCalledWith({
			documentRef: document,
			windowRef,
		});
		expect(firstRuntime).not.toHaveProperty("mobile");
		expect(secondRuntime).not.toHaveProperty("mobile");
	});
});
