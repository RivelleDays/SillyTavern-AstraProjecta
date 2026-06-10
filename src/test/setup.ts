import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

if (typeof globalThis.ResizeObserver === "undefined") {
	class ResizeObserverStub {
		observe() {}
		unobserve() {}
		disconnect() {}
	}

	(
		globalThis as typeof globalThis & {
			ResizeObserver?: typeof ResizeObserverStub;
		}
	).ResizeObserver = ResizeObserverStub;
}

if (typeof Element.prototype.getAnimations !== "function") {
	Element.prototype.getAnimations = () => [];
}

if (typeof Element.prototype.scrollIntoView !== "function") {
	Element.prototype.scrollIntoView = () => {};
}

if (typeof Element.prototype.hasPointerCapture !== "function") {
	Element.prototype.hasPointerCapture = () => false;
}

if (typeof Element.prototype.setPointerCapture !== "function") {
	Element.prototype.setPointerCapture = () => {};
}

if (typeof Element.prototype.releasePointerCapture !== "function") {
	Element.prototype.releasePointerCapture = () => {};
}

afterEach(() => {
	document.body.innerHTML = "";
	vi.restoreAllMocks();
	delete (globalThis as { SillyTavern?: unknown }).SillyTavern;
});
