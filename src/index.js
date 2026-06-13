import { bootstrapMobileApp } from "@/app/mobile/runtime/bootstrapMobileApp";
import "./styles/globals.css";

const ASTRA_PROJECTA_RUNTIME_KEY = "__astraProjectaRuntime";
const runtimeTarget = globalThis;

function bootstrapRuntime() {
	runtimeTarget[ASTRA_PROJECTA_RUNTIME_KEY]?.dispose?.();
	runtimeTarget[ASTRA_PROJECTA_RUNTIME_KEY] = bootstrapMobileApp();
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrapRuntime, {
		once: true,
	});
} else {
	bootstrapRuntime();
}
