import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readSource(relativePath: string): string {
	return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("mobile chat input tool drawer contract", () => {
	test("replaces the menu proxy button with the Astra mobile options menu", () => {
		const sendFormSource = readSource(
			"src/packages/features/chat-session/send-form/shell/AstraMobileSendForm.tsx",
		);
		const inputRowSource = readSource(
			"src/packages/features/chat-session/send-form/shell/MobileChatInput.tsx",
		);
		const shortcutsToolbarSource = readSource(
			"src/packages/features/chat-session/send-form/shell/MobileSendFormShortcutsToolbar.tsx",
		);
		const optionsMenuSource = readSource(
			"src/packages/features/chat-session/send-form/options-menu/MobileSendFormOptionsMenu.tsx",
		);
		const extensionsMenuSource = readSource(
			"src/packages/features/chat-session/send-form/extensions-menu/MobileSendFormExtensionsMenu.tsx",
		);
		const extensionsBridgeSource = readSource(
			"src/packages/features/chat-session/send-form/extensions-menu/nativeExtensionsMenuBridge.ts",
		);

		expect(inputRowSource).toContain("MobileSendFormOptionsMenu");
		expect(inputRowSource).toContain("MobileSendFormExtensionsMenu");
		expect(sendFormSource).toContain("MobileChatMainMenuDrawer");
		expect(inputRowSource).not.toContain("data-interaction-blocked");
		expect(inputRowSource).not.toContain("expandLeftControlsLabel");
		expect(inputRowSource).not.toContain("onExpandLeftControlsClick");
		expect(inputRowSource).not.toContain(
			"astra-chat-input__tools-composing",
		);
		expect(sendFormSource).not.toContain("armLeftControlsInteractionBlock");
		expect(sendFormSource).not.toContain("isComposingLeftControlsTarget");
		expect(sendFormSource).not.toContain(
			".astra-chat-input__tools-composing",
		);
		expect(inputRowSource).not.toContain("interactionBlocked={");
		expect(inputRowSource).toContain("documentRef={documentRef}");
		expect(inputRowSource).toContain("ASTRA_CHAT_MAIN_MENU_DRAWER_ID");
			expect(sendFormSource).not.toContain("MobileSillyTavernInterfacePanel");
			expect(shortcutsToolbarSource).toContain("BrainCircuit");
			expect(shortcutsToolbarSource).toContain("ChevronDown");
			expect(sendFormSource).not.toContain("SILLYTAVERN_INTERFACE_ID");
			expect(shortcutsToolbarSource).toContain(
				"SILLYTAVERN_INTERFACE_TRIGGER_ID",
			);
		expect(sendFormSource).not.toContain("MOBILE_SEND_FORM_PAGE_PANEL_ID");
		expect(sendFormSource).not.toContain(
			"MOBILE_SEND_FORM_PAGE_PANEL_TRIGGER_ID",
		);
		expect(sendFormSource).not.toContain("handlePresetChange");
		expect(sendFormSource).not.toContain("applyPreset(");
		expect(sendFormSource).not.toContain("onPresetChange={");
		expect(sendFormSource).not.toContain("NATIVE_OPTIONS_BUTTON_ID");
		expect(sendFormSource).not.toContain("triggerNativeButton");
		expect(optionsMenuSource).toContain("ASTRA_SEND_FORM_MENU_BUTTON_ID");
		expect(optionsMenuSource).toContain("interactionBlocked = false");
		expect(extensionsMenuSource).toContain(
			"ASTRA_SEND_FORM_EXTENSION_SHORTCUTS_BUTTON_ID",
		);
		expect(extensionsMenuSource).toContain("interactionBlocked = false");
		expect(extensionsMenuSource).toContain(
			"ASTRA_SEND_FORM_EXTENSIONS_DRAWER_ID",
		);
		expect(extensionsBridgeSource).toContain("NATIVE_EXTENSIONS_MENU_ID");
		expect(extensionsBridgeSource).toContain(
			"NATIVE_EXTENSIONS_MENU_BUTTON_ID",
		);
	});

	test("uses the Astra drawer compatibility wrapper for mobile send-form menu surfaces", () => {
		const optionsMenuSource = readSource(
			"src/packages/features/chat-session/send-form/options-menu/MobileSendFormOptionsMenu.tsx",
		);

		expect(optionsMenuSource).toMatch(
			/from ["']@\/components\/ui\/astra\/drawer["']/,
		);
		expect(optionsMenuSource).toContain("DrawerBody");
		expect(optionsMenuSource).toContain("DrawerContent");
		expect(optionsMenuSource).toContain("repositionInputs={false}");
		expect(optionsMenuSource).toContain("onPointerDownCapture");
	});

	test("keeps semantic input host and trigger ids before className in source", () => {
		const sendFormSource = readSource(
			"src/packages/features/chat-session/send-form/shell/AstraMobileSendForm.tsx",
		);
		const inputSource = readSource(
			"src/packages/features/chat-session/send-form/shell/MobileChatInput.tsx",
		);

		expect(sendFormSource).toMatch(
			/<div\s+id=\{ASTRA_CHAT_INPUT_HOST_ID\}\s+className="astra-chat-input-host"/,
		);
		expect(inputSource).toMatch(
			/<button\s+[^>]*id=\{ASTRA_CHAT_MAIN_MENU_TRIGGER_ID\}\s+className="astra-chat-input__avatar-button astra-chat-main-menu__trigger"/,
		);
	});

	test("keeps mobile send-form shortcuts on compact button sizes", () => {
		const shortcutsToolbarSource = readSource(
			"src/packages/features/chat-session/send-form/shell/MobileSendFormShortcutsToolbar.tsx",
		);

		expect(shortcutsToolbarSource).toContain('size="sm"');
		expect(shortcutsToolbarSource).toContain('size="icon-sm"');
		expect(shortcutsToolbarSource).not.toContain('size="default"');
		expect(shortcutsToolbarSource).not.toContain('size="icon"');
	});

	test("keeps mobile send-form shortcut icons on the medium Astra icon token", () => {
		const shortcutsToolbarSource = readSource(
			"src/packages/features/chat-session/send-form/shell/MobileSendFormShortcutsToolbar.tsx",
		);

		expect(shortcutsToolbarSource).toContain("icon={BrainCircuit}");
		expect(shortcutsToolbarSource).toContain("icon={ChevronDown}");
		expect(shortcutsToolbarSource).toContain("icon={ShortcutIcon}");
		expect(shortcutsToolbarSource).toContain('size="md"');
	});

	test("keeps src/components/ui/astra focused on the documented overlay compatibility exceptions", () => {
		const astraEntries = readdirSync(
			resolve(process.cwd(), "src/components/ui/astra"),
		).sort();

		expect(astraEntries).toEqual([
			"AGENTS.md",
			"MobilePagePanel.test.tsx",
			"MobilePagePanel.tsx",
			"ResponsiveDialog.test.tsx",
			"ResponsiveDialog.tsx",
			"drawer.test.tsx",
			"drawer.tsx",
			"dropdown-menu.test.tsx",
			"dropdown-menu.tsx",
			"scroll-area.test.tsx",
			"scroll-area.tsx",
			"select.test.tsx",
			"select.tsx",
			"sheet.test.tsx",
			"sheet.tsx",
			"smooth-tabs.css",
			"smooth-tabs.test.tsx",
			"smooth-tabs.tsx",
		]);
	});
});
