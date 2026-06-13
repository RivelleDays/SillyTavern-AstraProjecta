import { describe, expect, test, vi } from "vitest";

const runtimeMocks = vi.hoisted(() => ({
	createMobileChatSessionRuntime: vi.fn(() => ({ dispose: vi.fn() })),
	initializeAstraProjectaRuntime: vi.fn(() => ({ dispose: vi.fn() })),
}));

vi.mock("@/packages/core/runtime/initializeAstraProjectaRuntime", () => ({
	initializeAstraProjectaRuntime:
		runtimeMocks.initializeAstraProjectaRuntime,
}));

vi.mock("@/app/mobile/runtime/createMobileChatSessionRuntime", () => ({
	createMobileChatSessionRuntime:
		runtimeMocks.createMobileChatSessionRuntime,
}));

describe("bootstrapMobileApp", () => {
	test("injects the mobile runtime factory into the core runtime", async () => {
		const windowRef = {
			matchMedia: vi.fn(),
		};
		const coreRuntime = { dispose: vi.fn() };
		runtimeMocks.initializeAstraProjectaRuntime.mockReturnValueOnce(
			coreRuntime,
		);
		const { bootstrapMobileApp } = await import(
			"@/app/mobile/runtime/bootstrapMobileApp"
		);

		const runtime = bootstrapMobileApp({
			documentRef: document,
			windowRef: windowRef as never,
		});

		expect(runtime).toBe(coreRuntime);
		expect(
			runtimeMocks.initializeAstraProjectaRuntime,
		).toHaveBeenCalledWith({
			createRuntime: runtimeMocks.createMobileChatSessionRuntime,
			documentRef: document,
			windowRef,
		});
	});
});
