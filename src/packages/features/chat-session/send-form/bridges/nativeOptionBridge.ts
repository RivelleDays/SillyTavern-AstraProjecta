function isElementVisible(element: HTMLElement): boolean {
	if (
		!element.isConnected ||
		element.classList.contains("displayNone") ||
		element.hasAttribute("hidden")
	) {
		return false;
	}

	if (
		typeof window === "undefined" ||
		typeof window.getComputedStyle !== "function"
	) {
		return true;
	}

	const style = window.getComputedStyle(element);
	return style.display !== "none" && style.visibility !== "hidden";
}

function getNativeOptionCandidates(
	nativeOptionId: string,
	documentRef: Document,
): HTMLElement[] {
	return Array.from(
		documentRef.querySelectorAll<HTMLElement>(
			`#options [id="${nativeOptionId}"]`,
		),
	);
}

function pickNativeOptionTarget(
	nativeOptionId: string,
	candidates: readonly HTMLElement[],
): HTMLElement | null {
	const visibleCandidate = candidates.find((candidate) =>
		isElementVisible(candidate),
	);
	if (visibleCandidate) {
		return visibleCandidate;
	}

	if (nativeOptionId === "option_close_chat") {
		return candidates.at(-1) ?? null;
	}

	return candidates.at(0) ?? null;
}

export function triggerNativeOption({
	documentRef = document,
	nativeOptionId,
}: {
	documentRef?: Document;
	nativeOptionId: string;
}): boolean {
	const candidates = getNativeOptionCandidates(nativeOptionId, documentRef);
	if (!candidates.length) {
		return false;
	}

	const target = pickNativeOptionTarget(nativeOptionId, candidates);
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	target.click();
	return true;
}
