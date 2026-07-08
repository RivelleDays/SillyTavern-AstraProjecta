import { describe, expect, test, vi } from "vitest";

import {
	ASTRA_PROJECTA_PORTAL_ID,
	ASTRA_PROJECTA_ROOT_ID,
	ASTRA_PROJECTA_UI_ROOT_ATTR,
} from "@/packages/core/runtime/uiScope";
import { initializeAstraProjectaRuntime } from "@/packages/core/runtime/initializeAstraProjectaRuntime";
import {
	BASE_UI_BODY_CLASS,
	MOBILE_LAYOUT_CLASS,
	THEME_BODY_CLASS,
} from "@/packages/core/constants";

describe("initializeAstraProjectaRuntime", () => {
	test("applies global runtime infrastructure without taking over the active SillyTavern theme", () => {
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

		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
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

		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
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

	test("cleans body classes, infrastructure, and native UI when initialization fails", () => {
		const createError = new Error("runtime failed");
		const restoreNativeUi = vi.fn();
		const onCleanupError = vi.fn();

		expect(() =>
			initializeAstraProjectaRuntime({
				createRuntime: () => {
					throw createError;
				},
				documentRef: document,
				onCleanupError,
				restoreNativeUi,
			}),
		).toThrow(createError);

		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(document.body).not.toHaveClass(BASE_UI_BODY_CLASS);
		expect(document.body).not.toHaveClass(MOBILE_LAYOUT_CLASS);
		expect(document.getElementById(ASTRA_PROJECTA_ROOT_ID)).toBeNull();
		expect(document.getElementById(ASTRA_PROJECTA_PORTAL_ID)).toBeNull();
		expect(restoreNativeUi).toHaveBeenCalledWith(document);
		expect(onCleanupError).not.toHaveBeenCalled();
	});

	test("applies chat background appearance variables at startup and disposes the bridge on teardown", () => {
		const bridgeDispose = vi.fn();
		const createChatBackgroundAppearanceRuntimeBridge = vi.fn(() => ({
			dispose: bridgeDispose,
			store: {} as never,
		}));

		const runtime = initializeAstraProjectaRuntime({
			createChatBackgroundAppearanceRuntimeBridge,
			createRuntime: () => ({ dispose: vi.fn() }),
			documentRef: document,
		});

		expect(
			createChatBackgroundAppearanceRuntimeBridge,
		).toHaveBeenCalledTimes(1);
		expect(bridgeDispose).not.toHaveBeenCalled();

		runtime.dispose();

		expect(bridgeDispose).toHaveBeenCalledTimes(1);
	});

	test("disposes idempotently and continues cleanup when child disposal fails", () => {
		const disposeError = new Error("child dispose failed");
		const childDispose = vi.fn(() => {
			throw disposeError;
		});
		const restoreNativeUi = vi.fn();
		const onCleanupError = vi.fn();
		const runtime = initializeAstraProjectaRuntime({
			createRuntime: () => ({ dispose: childDispose }),
			documentRef: document,
			onCleanupError,
			restoreNativeUi,
		});

		expect(() => runtime.dispose()).not.toThrow();
		expect(() => runtime.dispose()).not.toThrow();

		expect(childDispose).toHaveBeenCalledTimes(1);
		expect(onCleanupError).toHaveBeenCalledWith(disposeError);
		expect(document.body).not.toHaveClass(THEME_BODY_CLASS);
		expect(document.getElementById(ASTRA_PROJECTA_ROOT_ID)).toBeNull();
		expect(document.getElementById(ASTRA_PROJECTA_PORTAL_ID)).toBeNull();
		expect(restoreNativeUi).toHaveBeenCalledTimes(1);
	});
});
