import type { CurrentChatIdentityKind } from "@/packages/core/st/chat-identity";
import {
	NATIVE_CHARACTER_MANAGEMENT_DROPDOWN_ID,
	NATIVE_CHAT_CHARACTER_SETTINGS_OVERRIDE_OPTION_ID,
	NATIVE_GROUP_SCENARIO_BUTTON_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";

function triggerNativeCharacterSettingsOverride(
	documentRef: Document,
): boolean {
	const select = documentRef.getElementById(
		NATIVE_CHARACTER_MANAGEMENT_DROPDOWN_ID,
	);
	if (!(select instanceof HTMLSelectElement)) {
		return false;
	}

	const option = select.querySelector<HTMLOptionElement>(
		`#${NATIVE_CHAT_CHARACTER_SETTINGS_OVERRIDE_OPTION_ID}`,
	);
	if (!(option instanceof HTMLOptionElement)) {
		return false;
	}

	option.selected = true;
	select.dispatchEvent(new Event("change", { bubbles: true }));
	return true;
}

function triggerNativeGroupSettingsOverride(documentRef: Document): boolean {
	const button = documentRef.getElementById(NATIVE_GROUP_SCENARIO_BUTTON_ID);
	if (!(button instanceof HTMLElement)) {
		return false;
	}

	button.click();
	return true;
}

export function triggerNativeChatSettingsOverride({
	documentRef = document,
	kind,
}: {
	documentRef?: Document;
	kind: CurrentChatIdentityKind;
}): boolean {
	if (kind === "character") {
		return triggerNativeCharacterSettingsOverride(documentRef);
	}

	if (kind === "group") {
		return triggerNativeGroupSettingsOverride(documentRef);
	}

	return false;
}
