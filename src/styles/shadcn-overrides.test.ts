import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readCss() {
	return readFileSync(
		resolve(process.cwd(), "src/styles/shadcn-overrides.css"),
		"utf8",
	);
}

function readGlobalsCss() {
	return readFileSync(
		resolve(process.cwd(), "src/styles/globals.css"),
		"utf8",
	);
}

function normalizeStyleSource(source: string): string {
	return source
		.replaceAll('"', "'")
		.replace(/\(\s+/g, "(")
		.replace(/\s+\)/g, ")")
		.replace(/\s+/g, " ")
		.trim();
}

function expectSelectors(css: string, selectors: string[]) {
	const normalizedCss = normalizeStyleSource(css);
	for (const selector of selectors) {
		const normalizedSelector = normalizeStyleSource(selector);
		expect(
			normalizedCss.includes(normalizedSelector),
			`Expected CSS to contain selector ${selector}`,
		).toBe(true);
	}
}

function readBlock(css: string, selector: string): string {
	const normalizedCss = normalizeStyleSource(css);
	const normalizedSelector = normalizeStyleSource(selector);
	const pattern = new RegExp(
		`${normalizedSelector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*\\{(?<body>[^}]*)\\}`,
		"u",
	);
	const match = pattern.exec(normalizedCss);
	return match?.groups?.body ?? "";
}

describe("shadcn-overrides.css", () => {
	test("keeps shadcn override selectors scoped away from SillyTavern globals", () => {
		const css = readCss();

		expectSelectors(css, [
			"[data-slot='button'][data-size='default']",
			"[data-slot='button'][data-variant='default']",
			"[data-slot='button'][data-variant='secondary']",
			"[data-slot='button'][data-variant='destructive']",
			"[data-slot='button'][data-variant='outline']",
			"[data-slot='button'][data-variant='ghost']",
		]);
		expect(css).toContain("SillyTavern applies input/select/button");
		expect(css).not.toMatch(
			/(^|\n)\s*input,\s*\n\s*select,\s*\n\s*button\s*\{/,
		);
	});

	test("keeps Drawer and Dialog close primitives aligned with shadcn Button overrides", () => {
		const css = readCss();

		expectSelectors(css, [
			"[data-slot='dialog-close'][data-size='default']",
			"[data-slot='drawer-close'][data-size='default']",
			"[data-slot='dialog-close'][data-size='icon']",
			"[data-slot='drawer-close'][data-size='icon']",
			"[data-slot='dialog-close'][data-size='icon-sm']",
			"[data-slot='drawer-close'][data-size='icon-sm']",
			"[data-slot='dialog-close'][data-variant='default']",
			"[data-slot='drawer-close'][data-variant='default']",
			"[data-slot='dialog-close'][data-variant='secondary']",
			"[data-slot='drawer-close'][data-variant='secondary']",
			"[data-slot='dialog-close'][data-variant='destructive']",
			"[data-slot='drawer-close'][data-variant='destructive']",
			"[data-slot='dialog-close'][data-variant='outline']",
			"[data-slot='drawer-close'][data-variant='outline']",
			"[data-slot='dialog-close'][data-variant='ghost']",
			"[data-slot='drawer-close'][data-variant='ghost']",
			"[data-slot='dialog-close'][data-variant='link']",
			"[data-slot='drawer-close'][data-variant='link']",
		]);
	});

	test("keeps button-like cursor selectors scoped to Astra-owned slot contracts", () => {
		const css = readCss();

		expectSelectors(css, [
			"[data-slot='button']:not(:disabled)",
			"[data-slot='button']:disabled",
			"[data-slot='select-trigger']:not(:disabled)",
			"[data-slot='switch']:not(:disabled)",
			"[data-slot='checkbox']:not(:disabled)",
			"[data-slot='radio-group-item']:not(:disabled)",
			"[data-slot='toggle']:not(:disabled)",
			"[data-slot='toggle-group-item']:not(:disabled)",
			"[data-slot='popover-trigger']:not(:disabled)",
			"[data-slot='dialog-trigger']:not(:disabled)",
			"[data-slot='sheet-trigger']:not(:disabled)",
			"[data-slot='drawer-trigger']:not(:disabled)",
			"[data-slot='alert-dialog-trigger']:not(:disabled)",
			"[data-slot='dialog-close']:not(:disabled)",
			"[data-slot='sheet-close']:not(:disabled)",
			"[data-slot='drawer-close']:not(:disabled)",
			"[data-slot='alert-dialog-action']:not(:disabled)",
			"[data-slot='alert-dialog-cancel']:not(:disabled)",
		]);
		expect(css).not.toContain("[data-slot='select-item']:not(:disabled)");
		expect(css).not.toContain(
			"[data-slot='select-scroll-up-button']:not(:disabled)",
		);
		expect(css).not.toContain(
			"[data-slot='select-scroll-down-button']:not(:disabled)",
		);
	});

	test("routes shadcn icon button sizing through Astra button tokens", () => {
		const css = readCss();

		expectSelectors(css, [
			"[data-slot='button'][data-size='icon']",
			"[data-slot='button'][data-size='icon-sm']",
		]);
		const defaultIconButtonOverride = readBlock(
			css,
			"[data-slot='button'][data-size='icon'], [data-slot='dialog-close'][data-size='icon'], [data-slot='drawer-close'][data-size='icon']",
		);
		const smallIconButtonOverride = readBlock(
			css,
			"[data-slot='button'][data-size='icon-sm'], [data-slot='dialog-close'][data-size='icon-sm'], [data-slot='drawer-close'][data-size='icon-sm']",
		);

		expect(defaultIconButtonOverride).not.toBe("");
		expect(defaultIconButtonOverride).toContain(
			"var(--astra-button-size-default)",
		);
		expect(defaultIconButtonOverride).toContain(
			"var(--astra-button-icon-size)",
		);
		expect(smallIconButtonOverride).not.toBe("");
		expect(smallIconButtonOverride).toContain(
			"var(--astra-button-size-sm)",
		);
		expect(smallIconButtonOverride).toContain(
			"var(--astra-button-icon-size)",
		);
		expect(css).not.toContain("[data-slot='button'][data-size='icon-xs']");
	});

	test("keeps checked checkbox indicators scoped away from SillyTavern button color globals", () => {
		const css = readCss();

		expectSelectors(css, ["[data-slot='checkbox'][data-state='checked']"]);
	});

	test("keeps SillyTavern panel sliding-tab triggers pointer-addressable when enabled", () => {
		const css = readCss();

		expect(css).toMatch(
			/\.sillytavern-interface-panel__subheader\s+\.astra-sliding-tabs__trigger:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
	});

	test("keeps Vaul drawer and shared drawer hooks addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"[data-vaul-drawer][data-vaul-drawer-direction='bottom']",
			".astra-drawer {",
			"--drawer-content-padding:",
			"--astra-drawer-top-gap:",
		]);
		expect(css).not.toContain("astraDrawerEnterFromBottom");
		expect(css).not.toContain("astraDrawerExitToBottom");
		expect(css).not.toContain("--astra-drawer-motion-duration");
		expect(css).not.toContain("--astra-drawer-overlay-motion-duration");
		expect(css).not.toContain("--astra-drawer-margin-top:");
		expect(css).not.toContain(
			".mobile-send-form-options-drawer__toggle-switch",
		);
	});

	test("keeps shared Astra scroll affordance hooks addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"--astra-surface-scroll-fade-size:",
			"--astra-surface-scroll-mask-visible:",
			"--astra-surface-scroll-mask-hidden:",
			"[data-astra-scroll-affordance='surface'] .astra-scroll-area__viewport",
			"[data-astra-scroll-affordance='surface'][data-overflow-y-end]:not([data-overflow-y-start])\n    .astra-scroll-area__viewport",
			"[data-astra-scroll-affordance='surface'][data-astra-scroll-fade-y-end]:not([data-astra-scroll-fade-y-start])\n    .astra-scroll-area__viewport",
			"[data-astra-scroll-affordance='surface'][data-overflow-y-start]:not([data-overflow-y-end])\n    .astra-scroll-area__viewport",
			"[data-astra-scroll-affordance='surface'][data-astra-scroll-fade-y-start]:not([data-astra-scroll-fade-y-end])\n    .astra-scroll-area__viewport",
			"[data-astra-scroll-affordance='surface'][data-overflow-y-start][data-overflow-y-end]\n    .astra-scroll-area__viewport",
			"[data-astra-scroll-affordance='surface'][data-astra-scroll-fade-y-start][data-astra-scroll-fade-y-end]\n    .astra-scroll-area__viewport",
			"[data-astra-scroll-affordance='surface']\n    .astra-scroll-area__viewport:not([data-has-overflow-y])",
			"[data-astra-scroll-affordance='surface'] .astra-scroll-area__scrollbar",
			"[data-astra-scroll-affordance='surface']\n    .astra-scroll-area__scrollbar:not([data-has-overflow-y])",
			"[data-astra-scroll-affordance='surface']\n    .astra-scroll-area__scrollbar[data-has-overflow-y][data-hovering]",
			"[data-astra-scroll-affordance='surface']\n    .astra-scroll-area__scrollbar[data-has-overflow-y][data-scrolling]",
		]);
		expect(css).not.toContain("#mobile-astra-main-interface-panel");
		expect(css).not.toContain(".astra-main-interface-panel__scrollbar");
		expect(css).not.toContain(".astra-main-interface-panel__scroll-area");
		expect(css).not.toContain(
			"[data-astra-scroll-affordance='surface']::before",
		);
		expect(css).not.toContain(
			"[data-astra-scroll-affordance='surface']::after",
		);
		expect(css).not.toContain(
			".astra-main-interface-panel__scroll-area::before",
		);
		expect(css).not.toContain(
			".astra-main-interface-panel__scroll-area::after",
		);
		expect(css).not.toContain(
			".astra-main-interface-panel__scroll-area[data-overflow-y-start]",
		);
		expect(css).not.toContain(
			".astra-main-interface-panel__scroll-area[data-overflow-y-end]",
		);
		expect(css).not.toContain(
			".astra-main-interface-panel__scroll-area .astra-main-interface-panel__viewport {\n    mask-image: none",
		);
		expect(css).not.toContain(
			"[data-astra-scroll-affordance='surface'][data-astra-scroll-affordance-mode='managed']",
		);
		expect(css).not.toContain(
			'[data-astra-scroll-affordance="surface"][data-astra-scroll-affordance-mode="managed"]',
		);
		expect(css).not.toContain("data-astra-has-overflow-y");
	});

	test("keeps native popup background scroll interlock hooks addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"html[data-astra-projecta-native-popup-active='true']",
			"body.astra-projecta-mobile-layout[data-astra-projecta-native-popup-active='true']",
			"body.astra-projecta-mobile-layout[data-astra-projecta-native-popup-active='true'] [data-vaul-overlay]",
			"body.astra-projecta-mobile-layout[data-astra-projecta-native-popup-active='true'] [data-vaul-drawer]",
			"body.astra-projecta-mobile-layout[data-astra-projecta-native-popup-active='true'] .astra-drawer",
			"body.astra-projecta-mobile-layout[data-astra-projecta-native-popup-active='true'] .astra-mobile-page-panel",
			"body.astra-projecta-mobile-layout[data-astra-projecta-native-popup-active='true']\n        [data-astra-scroll-affordance='surface']\n        .astra-scroll-area__viewport",
			"body.astra-projecta-mobile-layout[data-astra-projecta-native-popup-active='true']\n        [data-astra-scroll-affordance='surface']\n        .astra-scroll-area__scrollbar",
			"body.astra-projecta-mobile-layout[data-astra-projecta-native-popup-active='true']\n        dialog.popup\n        .popup-content",
			"body.astra-projecta-mobile-layout:has(#shadow_select_chat_popup[style*='display: block'])",
			"body.astra-projecta-mobile-layout:has(#shadow_select_chat_popup[style*='display:block'])",
		]);
	});

	test("keeps page-panel and main-menu character drawer rules split", () => {
		const css = readCss();

		expectSelectors(css, [
			".sillytavern-interface__native-host\n    > .astra-projecta-native-drawer-ported[data-astra-projecta-native-drawer-source='right-nav-panel']",
			".mobile-chat-main-menu-sheet__native-host\n    > .astra-projecta-native-drawer-ported[data-astra-projecta-native-drawer-source='right-nav-panel']",
			".sillytavern-interface__native-host\n    [data-astra-projecta-native-drawer-source='right-nav-panel']\n    .scrollableInner",
			".mobile-chat-main-menu-sheet__native-host\n    [data-astra-projecta-native-drawer-source='right-nav-panel']\n    .scrollableInner",
		]);
		expect(css).not.toContain(
			".sillytavern-interface__native-host\n    > .astra-projecta-native-drawer-ported[data-astra-projecta-native-drawer-source='right-nav-panel'],\n.mobile-chat-main-menu-sheet__native-host\n    > .astra-projecta-native-drawer-ported[data-astra-projecta-native-drawer-source='right-nav-panel']",
		);
		expect(css).not.toContain(
			"[data-astra-projecta-native-drawer-source='right-nav-panel'] .scrollableInner {\n    min-height: 0;",
		);
	});

	test("keeps dialog, sheet, and mobile page-panel primitive hooks addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			".astra-dialog-current-chat-file-name",
			".astra-dialog-identityImage.astra-chat-avatar--collage",
			".astra-dialog-identityImage .astra-chat-avatar__collage-image",
			".astra-sheet-overlay",
			".astra-sheet-content",
			".astra-sheet-content[data-side='bottom']",
			"--astra-mobile-visual-viewport-bottom",
			".astra-mobile-page-panel",
			".astra-sliding-tabs",
			".astra-sliding-tabs__list",
			".astra-sliding-tabs__trigger",
			".astra-sliding-tabs__trigger::after",
			".astra-sliding-tabs__trigger-icon",
			".astra-sliding-tabs__trigger-label",
			".astra-sliding-tabs__indicator",
			".sillytavern-interface__native-host",
			".sillytavern-interface__native-host > .astra-projecta-native-drawer-ported",
		]);
		expect(css).not.toContain(
			"--astra-mobile-page-panel-subheader-height:",
		);
		expect(css).not.toContain(".astra-mobile-page-panel__header");
		expect(css).not.toContain(".astra-mobile-page-panel__body-header");
		expect(css).not.toContain(".astra-mobile-page-panel__body-overlay");
		expect(css).not.toContain(".astra-dialog-inline-code");
	});

	test("keeps shared dialog identity names constrained to one line", () => {
		const css = readCss();
		const identityBlock = readBlock(css, ".astra-dialog-identity");
		const avatarBlock = readBlock(css, ".astra-dialog-identityAvatar");
		const imageBlock = readBlock(css, ".astra-dialog-identityImage");
		const nameBlock = readBlock(css, ".astra-dialog-identityName");

		expect(identityBlock).not.toBe("");
		expect(identityBlock).toContain("width: 100%;");
		expect(identityBlock).toContain("max-width: 100%;");
		expect(identityBlock).toContain("min-width: 0;");
		expect(avatarBlock).not.toBe("");
		expect(avatarBlock).toContain(
			"--astra-dialog-identity-avatar-size:",
		);
		expect(avatarBlock).toContain("var(--astra-avatar-size-min)");
		expect(avatarBlock).toContain(
			"var(--astra-avatar-size-dialog-identity)",
		);
		expect(imageBlock).not.toBe("");
		expect(imageBlock).toContain(
			"var(--astra-dialog-identity-avatar-size)",
		);
		expect(nameBlock).not.toBe("");
		expect(nameBlock).toContain("display: block;");
		expect(nameBlock).toContain("width: 100%;");
		expect(nameBlock).toContain("max-width: 100%;");
		expect(nameBlock).toContain("min-width: 0;");
		expect(nameBlock).toContain("overflow: hidden;");
		expect(nameBlock).toContain("text-overflow: ellipsis;");
		expect(nameBlock).toContain("white-space: nowrap;");
	});

	test("keeps shared sliding tabs away from WebKit fill-available sizing", () => {
		const css = readCss();
		const listRule = css.match(
			/\.astra-sliding-tabs__list\s*\{[^}]*\}/,
		)?.[0];

		expect(listRule).toBeDefined();
		expect(listRule).not.toContain("-webkit-fill-available");
	});

	test("keeps Astra motion tokens and sliding-tabs animation hooks addressable", () => {
		const globalsCss = readGlobalsCss();
		const css = readCss();

		expectSelectors(globalsCss, [
			"--motion-ease-standard:",
			"--motion-ease-emphasized:",
			"--motion-ease-standard-exit:",
		]);
		expectSelectors(css, [
			"--astra-sliding-tabs-motion-ease:",
			"--motion-ease-emphasized",
			"--overlay-ease-emphasized",
			"@media (prefers-reduced-motion: reduce)",
			".astra-sliding-tabs__indicator",
		]);
	});

	test("keeps page-panel native drawer host selectors addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"#sillytavern-interface-panel-ai-response-configuration-host",
			"#sillytavern-interface-panel-connection-profile-host",
			"#sillytavern-interface-panel-advanced-formatting-host",
			"#sillytavern-interface-panel-user-settings-host",
			"#sillytavern-interface-panel-lorebook-host",
			"#sillytavern-interface-panel-extensions-host",
			"#sillytavern-interface-panel-backgrounds-host",
			"#sillytavern-interface-panel-persona-management-host",
			"#sillytavern-interface-panel-character-management-host",
			"#sillytavern-interface-panel-prompt-manager-popup-host",
			"[data-astra-projecta-native-drawer-source='left-nav-panel']",
			"[data-astra-projecta-native-drawer-source='rm_api_block']",
			"[data-astra-projecta-native-drawer-source='AdvancedFormatting']",
			"[data-astra-projecta-native-drawer-source='WorldInfo']",
			"[data-astra-projecta-native-drawer-source='rm_extensions_block']",
			"[data-astra-projecta-native-drawer-source='Backgrounds']",
			"[data-astra-projecta-native-drawer-source='PersonaManagement']",
			"[data-astra-projecta-native-drawer-source='right-nav-panel']",
			"[data-astra-projecta-native-drawer-source='character_popup']",
			"[data-astra-projecta-character-management-advanced-close-pending='true']",
			"[data-astra-projecta-native-companion-source='completion_prompt_manager_popup']",
			"[data-astra-projecta-native-companion-source='gallery']",
			"#left-nav-panel.astra-projecta-native-drawer-ported[data-astra-projecta-native-drawer-source='left-nav-panel']",
			"#sillytavern-interface-panel-prompt-manager-popup-host\n    > #completion_prompt_manager_popup.astra-projecta-native-companion-ported[data-astra-projecta-native-companion-source='completion_prompt_manager_popup']",
			"#sillytavern-interface-panel-character-management-host\n    > #gallery.astra-projecta-native-companion-ported[data-astra-projecta-native-companion-source='gallery']",
			"[data-astra-projecta-native-drawer-source='left-nav-panel']\n    > .scrollableInner",
			"#PersonaManagement.astra-projecta-native-drawer-ported[data-astra-projecta-native-drawer-source='PersonaManagement']",
			"[data-astra-projecta-native-drawer-source='PersonaManagement']\n    #persona-management-block",
			"#sillytavern-interface-panel-persona-management-host[data-persona-management-tab='personas']\n    .persona_management_left_column",
			"#sillytavern-interface-panel-persona-management-host[data-persona-management-tab='edit']\n    .persona_management_right_column",
			"#right-nav-panel.astra-projecta-native-drawer-ported[data-astra-projecta-native-drawer-source='right-nav-panel']",
			"#character_popup.astra-projecta-native-drawer-ported[data-astra-projecta-native-drawer-source='character_popup']",
			"[data-astra-projecta-native-drawer-source='character_popup'] #character_cross",
			"[data-astra-projecta-native-drawer-source='right-nav-panel'] #avatar_div_div",
			"[data-astra-projecta-native-drawer-source='right-nav-panel'] #avatar_load_preview",
			"#left-nav-panel.astra-projecta-native-drawer-ported[data-astra-projecta-native-drawer-source='left-nav-panel'].fillLeft\n    > .scrollableInner",
		]);
	});

	test("keeps main-menu sheet and native drawer selector hooks addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			".mobile-chat-main-menu-sheet",
			".mobile-chat-main-menu-sheet__header",
			".mobile-chat-main-menu-sheet__header-main",
			".mobile-chat-main-menu-sheet__icon",
			".mobile-chat-main-menu-sheet__title",
			".mobile-chat-main-menu-sheet__content",
			".mobile-chat-main-menu-sheet__viewport",
			".mobile-chat-main-menu-sheet__body",
			".mobile-chat-main-menu-sheet__footer",
			".mobile-chat-main-menu-sheet__close-button",
			".mobile-chat-main-menu-sheet__native-host",
			"#mobile-chat-main-menu-lorebook-host",
			"#mobile-chat-main-menu-extensions-host",
			"#mobile-chat-main-menu-backgrounds-host",
			"#mobile-chat-main-menu-character-management-host",
			".mobile-chat-main-menu-backgrounds-tab-scroll-area",
			".mobile-chat-main-menu-backgrounds-tab-scroll-area__content-host",
			"[data-astra-projecta-native-drawer-source='Backgrounds'] #auto_background",
			"[data-astra-projecta-native-drawer-source='Backgrounds'] #bg_add_folder_button",
			"[data-astra-projecta-native-drawer-source='Backgrounds'] #add_background_button_top",
		]);
	});
});
