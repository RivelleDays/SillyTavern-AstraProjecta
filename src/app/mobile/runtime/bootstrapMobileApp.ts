import { createMobileChatSessionRuntime } from "@/app/mobile/runtime/createMobileChatSessionRuntime";
import {
	initializeAstraProjectaRuntime,
	type AstraProjectaRuntime,
} from "@/packages/core/runtime/initializeAstraProjectaRuntime";

export function bootstrapMobileApp({
	documentRef = document,
	windowRef = window,
}: {
	documentRef?: Document;
	windowRef?: object;
} = {}): AstraProjectaRuntime {
	return initializeAstraProjectaRuntime({
		createRuntime: createMobileChatSessionRuntime,
		documentRef,
		windowRef,
	});
}
