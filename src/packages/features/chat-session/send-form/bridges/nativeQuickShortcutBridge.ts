import type { SendFormShortcutDescriptor } from "@/packages/features/chat-session/send-form/contracts/shortcuts";
import { triggerNativeOption } from "@/packages/features/chat-session/send-form/bridges/nativeOptionBridge";

function getNativeQuickButton(
	nativeButtonId: string,
	documentRef: Document,
): HTMLElement | null {
	const element = documentRef.getElementById(nativeButtonId);
	return element instanceof HTMLElement ? element : null;
}

export function triggerNativeQuickShortcut({
	descriptor,
	documentRef = document,
}: {
	descriptor: SendFormShortcutDescriptor;
	documentRef?: Document;
}): boolean {
	const nativeButton = getNativeQuickButton(
		descriptor.nativeButtonId,
		documentRef,
	);
	if (nativeButton instanceof HTMLElement) {
		nativeButton.click();
		return true;
	}

	return triggerNativeOption({
		documentRef,
		nativeOptionId: descriptor.fallbackOptionId,
	});
}
