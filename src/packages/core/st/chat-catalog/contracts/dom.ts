interface NativeSelectGlobals {
	$?: unknown;
	jQuery?: unknown;
}

export function findNativeGroupSelectElement(
	documentRef: Document,
	groupId: string,
): HTMLElement | null {
	for (const groupRow of Array.from(
		documentRef.querySelectorAll(".group_select"),
	)) {
		if (!(groupRow instanceof HTMLElement)) {
			continue;
		}

		const rowGroupId =
			groupRow.getAttribute("data-chid") ??
			groupRow.getAttribute("data-grid");
		if (rowGroupId === groupId) {
			return groupRow;
		}
	}

	return null;
}

export function findNativeCharacterSelectElement(
	documentRef: Document,
	characterId: number,
): HTMLElement | null {
	for (const characterRow of Array.from(
		documentRef.querySelectorAll(".character_select"),
	)) {
		if (!(characterRow instanceof HTMLElement)) {
			continue;
		}

		if (characterRow.getAttribute("data-chid") === String(characterId)) {
			return characterRow;
		}
	}

	const directRow = documentRef.getElementById(`CharID${characterId}`);
	return directRow instanceof HTMLElement ? directRow : null;
}

export function triggerNativeSelectElement(
	element: HTMLElement,
	globals: NativeSelectGlobals = globalThis as NativeSelectGlobals,
): void {
	const jquery = globals.jQuery ?? globals.$;

	if (typeof jquery === "function") {
		const wrapped = jquery(element) as { trigger?: unknown };
		if (typeof wrapped.trigger === "function") {
			wrapped.trigger("click");
			return;
		}
	}

	element.click();
}
