import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readCss() {
	return readFileSync(
		resolve(process.cwd(), "src/app/mobile/styles/chat-send-form.css"),
		"utf8",
	);
}

function expectSelectors(css: string, selectors: string[]) {
	const searchableCss = css.replace(/\s+/gu, " ");
	for (const selector of selectors) {
		expect(searchableCss).toContain(selector.replace(/\s+/gu, " "));
	}
}

function readBlock(css: string, selector: string): string {
	const pattern = new RegExp(
		`${selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*\\{(?<body>[^}]*)\\}`,
		"u",
	);
	const match = pattern.exec(css);
	return match?.groups?.body ?? "";
}

function readSlice(
	css: string,
	startPattern: string,
	endPattern: string,
): string {
	const startIndex = css.indexOf(startPattern);
	if (startIndex === -1) {
		return "";
	}

	const endIndex = css.indexOf(endPattern, startIndex + startPattern.length);
	return endIndex === -1
		? css.slice(startIndex)
		: css.slice(startIndex, endIndex);
}

function expectSingleLineEllipsis(block: string) {
	expect(block).toContain("min-width: 0;");
	expect(block).toContain("overflow: hidden;");
	expect(block).toContain("text-overflow: ellipsis;");
	expect(block).toContain("white-space: nowrap;");
}

describe("chat-send-form.css", () => {
	test("uses the resolved mobile body class instead of a local 1000px media query", () => {
		const css = readCss();

		expect(css).not.toContain("@media screen and (max-width: 1000px)");
		expect(css).toContain("body.astra-projecta-mobile-layout");
		expect(css).toContain("&.no-blur #top-bar");
		expect(css).toContain("&.PWA #sheld");
	});

	test("keeps semantic mobile chat composer host selectors addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"--astra-mobile-visual-viewport-bottom",
			"--astra-mobile-safe-bottom-effective",
			"--astra-chat-top-bar-block-size",
			"#send_form",
			"#send_form #leftSendForm",
			"#send_form #rightSendForm",
			"#send_form #nonQRFormItems",
			"&.PWA #sheld",
			"#astra-chat-composer-shell",
			"#astra-chat-composer-shell::before",
			"#astra-chat-composer-shell > #form_sheld",
			"#form_sheld",
			"#astra-chat-composer-host",
			"#astra-chat-shortcuts-host",
			"#astra-chat-quick-replies-host",
			"#astra-chat-input-host",
			".astra-chat-input__field > #astra-chat-quick-replies-host",
			"#astra-chat-quick-replies-host > #qr--bar",
			"#send_form > #astra-chat-composer-host",
			".astra-chat-composer",
			".astra-chat-composer__input-region",
			".astra-chat-composer__shortcuts-region",
			'.astra-chat-composer[data-shortcuts-visible="false"]',
			'.astra-chat-composer[data-shortcuts-visible="false"] .astra-chat-composer__shortcuts-region',
			".astra-chat-composer__input-region > #astra-chat-input-host",
			".astra-chat-composer__shortcuts-region > #astra-chat-shortcuts-host",
		]);

		const composerHostBlock = readBlock(
			css,
			"#send_form > #astra-chat-composer-host",
		);

		expect(composerHostBlock).toContain("--astra-chat-spacing");
		expect(css).not.toContain(
			"#form_sheld > #astra-chat-quick-replies-host",
		);
		expect(css).not.toContain("astra-send-form-input-row");
	});

	test("keeps the bottom glass overlay masked so blur fades in with the surface", () => {
		const css = readCss();
		const overlayBlock = readBlock(
			css,
			"#astra-chat-composer-shell::before",
		);

		expect(overlayBlock).not.toBe("");
		expect(overlayBlock).toContain("-webkit-mask-image:");
		expect(overlayBlock).toContain("mask-image:");
	});

	test("keeps the Astra composer as the sole bottom-inset owner", () => {
		const css = readCss();
		const formSheldBlock = readBlock(
			css,
			"#astra-chat-composer-shell > #form_sheld",
		);

		expect(formSheldBlock).toMatch(/padding-bottom:\s*[^;]+!important;/u);
	});

	test("keeps mobile send-form input row selector and token contracts addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			".mobile-send-form-shortcuts",
			".mobile-send-form-shortcuts__strip",
			".mobile-send-form-shortcuts__featured-group",
			".mobile-send-form-shortcuts__regular-group",
			"#sillytavern-interface-panel-trigger",
			".mobile-send-form-shortcuts__featured-button",
			".astra-chat-input",
			".astra-chat-input__content",
			".astra-chat-input__avatar-button",
			".astra-chat-input__field",
			".astra-chat-input__textarea-slot",
			".astra-chat-input__textarea-slot[hidden]",
			".astra-chat-input__field > #astra-chat-quick-replies-host[hidden]",
			".astra-chat-input__toolbar",
			".astra-chat-input__actions",
			".astra-chat-input__quick-reply-toggle",
			".astra-chat-input__send-button",
			".astra-chat-input__tool-button:not(:disabled)",
			".astra-chat-input__tool-button:disabled",
		]);
		expect(css).toContain("--astra-send-form-textarea-flex-basis:");
		expect(css).toContain("--astra-send-form-avatar-size:");
		expect(css).not.toContain(".astra-chat-input__tools-composing");
		expect(css).not.toContain('[data-left-state="composing"]');
	});

	test("keeps mobile quick reply host styling scoped to Astra token contracts", () => {
		const css = readCss();
		const quickReplySlice = readBlock(
			css,
			".astra-chat-input__field > #astra-chat-quick-replies-host",
		);

		expectSelectors(css, [
			".astra-chat-input__field > #astra-chat-quick-replies-host",
			"#astra-chat-quick-replies-host > #qr--bar > .qr--buttons",
			"#astra-chat-quick-replies-host > #qr--bar .qr--button",
			"#astra-chat-quick-replies-host > #qr--bar .qr--button-expander",
		]);
		expect(quickReplySlice).toContain("--astra-send-form-quick-reply-gap:");
		expect(quickReplySlice).toContain(
			"--astra-send-form-quick-reply-button-padding-x:",
		);
		expect(quickReplySlice).toContain(
			"--astra-send-form-quick-reply-button-padding-y:",
		);
		expect(quickReplySlice).toContain(
			"--astra-send-form-quick-reply-button-font-size:",
		);
		expect(quickReplySlice).toContain(
			"--astra-send-form-quick-reply-max-block-size:",
		);
		expect(quickReplySlice).toContain(
			"--astra-send-form-quick-reply-expander-size:",
		);
		expect(quickReplySlice).not.toContain("!important");
		expect(quickReplySlice).not.toContain("--mobileQRsBarHeight");
		expect(quickReplySlice).not.toContain("var(--mainFontSize)");
		expect(quickReplySlice).not.toContain("var(--SmartThemeBodyColor)");
	});

	test("keeps mobile quick reply menu and popout styling on Astra token contracts", () => {
		const css = readCss();
		const quickReplyMenuSlice = readSlice(
			css,
			"\t& {\n\t\t--astra-send-form-menu-surface-padding-inline:",
			".astra-chat-composer {",
		);

		expectSelectors(css, [
			"& .ctx-menu",
			"& .ctx-sub-menu",
			"& .ctx-item + .ctx-header",
			"& .list-group .list-group-item.ctx-header",
			"& .list-group .list-group-item.ctx-item",
			"& .ctx-item:hover",
			"& .ctx-item .qr--button-icon",
			"& .ctx-item .qr--button-label",
			"& .ctx-item .ctx-expander",
		]);
		expect(css).toMatch(
			/&\s+#qr--popout\s*>\s*\.qr--body\s*>\s*\.qr--buttons\s*\{/u,
		);
		expect(css).toMatch(
			/&\s+#qr--popout\s*>\s*\.qr--body\s*>\s*\.qr--buttons\.qr--color\s*\{/u,
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-surface-padding-inline:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-surface-padding-block:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-surface:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-border-color:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-section-gap:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-section-separator-color:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-label-padding-inline:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-label-font-size:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-row-height:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-row-padding-inline:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-row-padding-block:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-row-gap:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-row-radius:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-row-font-size:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-row-font-weight:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--astra-send-form-menu-row-hover-surface:",
		);
		expect(quickReplyMenuSlice).not.toContain("!important");
		expect(quickReplyMenuSlice).not.toContain("--mobileQRsBarHeight");
		expect(quickReplyMenuSlice).not.toContain("var(--mainFontSize)");
		expect(quickReplyMenuSlice).not.toContain("var(--SmartThemeBodyColor)");
		expect(quickReplyMenuSlice).not.toContain("backdrop-filter");
		expect(quickReplyMenuSlice).not.toContain("-webkit-backdrop-filter");
	});

	test("keeps the inline send button on the input-row size token", () => {
		const css = readCss();
		const block = readBlock(css, ".astra-chat-input__send-button");

		expect(block).not.toBe("");
		expect(block).toContain(
			"var(--astra-send-form-inline-send-button-size)",
		);
		expect(block).toContain(
			"min-width: var(--astra-send-form-inline-send-button-size)",
		);
		expect(block).not.toContain("var(--astra-button-min-size)");
	});

	test("keeps options and extensions drawer selector contracts addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"#astra-send-form-options-drawer",
			"#astra-send-form-options-drawer-scrollable-content",
			"#astra-send-form-options-drawer-menu",
			".astra-send-form-options-drawer__scroll-area",
			".astra-send-form-options-drawer__group",
			".astra-send-form-options-drawer__group-label",
			".astra-send-form-options-drawer__item",
			".astra-send-form-options-drawer__item:not(:disabled)",
			".astra-send-form-options-drawer__item:disabled",
			".astra-send-form-options-drawer__item--destructive",
			".astra-send-form-options-drawer__toggle",
			".astra-send-form-options-drawer__toggle-label",
			"#astra-send-form-extensions-drawer",
			"#astra-send-form-extensions-drawer-scrollable-content",
			".astra-send-form-extensions-drawer__content",
			".astra-send-form-extensions-drawer__label",
			".astra-send-form-extensions-drawer__menu-host",
			"#astra-send-form-extensions-drawer #extensionsMenu",
			'.astra-scroll-area__scrollbar[data-orientation="vertical"]',
		]);
		expect(css).toMatch(
			/\.astra-send-form-options-drawer__scroll-area\s+\.astra-scroll-area__scrollbar\[data-orientation="vertical"\]/u,
		);
		expect(css).toMatch(
			/\.astra-send-form-extensions-drawer__scroll-area\s+\.astra-scroll-area__scrollbar\[data-orientation="vertical"\]/u,
		);
		expect(css).not.toContain(
			".astra-send-form-options-drawer__scroll-area .astra-scroll-area__thumb",
		);
		expect(css).not.toContain(
			".astra-send-form-extensions-drawer__scroll-area .astra-scroll-area__thumb",
		);
		expect(css).not.toContain(
			".astra-send-form-options-drawer__scroll-area .astra-scroll-area__scrollbar::before",
		);
		expect(css).not.toContain(
			".astra-send-form-extensions-drawer__scroll-area .astra-scroll-area__scrollbar::before",
		);
		expect(css).not.toContain(".astra-send-form-extensions-drawer__item");
		expect(css).not.toContain(
			".astra-send-form-options-drawer__toggle-switch",
		);
		expect(css).not.toContain("[data-slot='field-content']");
		expect(css).not.toContain("[data-slot='field-label']");
		expect(css).not.toContain("--astra-send-form-drawer-content-padding:");
		expect(css).not.toContain(
			"--astra-send-form-options-scroll-fade-size:",
		);
		expect(css).not.toContain(
			"#astra-send-form-options-drawer-scrollable-content:not([data-has-overflow-y])",
		);
	});

	test("keeps context usage and chat library dialog selector contracts addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			".astra-send-form-surface-label",
			".astra-chat-context-usage-shortcut__trigger:not(:disabled)",
			".astra-chat-context-usage-shortcut__trigger:disabled",
			".astra-chat-context-usage-shortcut__popover-header",
			".astra-chat-context-usage-shortcut__header-title",
			".astra-chat-context-usage-shortcut__header-icon",
			".astra-chat-context-usage-shortcut__header-copy",
			".astra-chat-context-usage-shortcut__header-kicker",
			".astra-chat-context-usage-shortcut__header-total",
			".astra-chat-context-usage-shortcut__metric-grid",
			".astra-chat-context-usage-shortcut__metric-tile",
			".astra-chat-context-usage-shortcut__metric-label",
			".astra-chat-context-usage-shortcut__metric-icon",
			".astra-chat-context-usage-shortcut__metric-value",
			".astra-chat-context-usage-shortcut__breakdown",
			".astra-chat-context-usage-shortcut__breakdown-row",
			".astra-chat-context-usage-shortcut__breakdown-name",
			".astra-chat-context-usage-shortcut__breakdown-icon",
			".astra-chat-context-usage-shortcut__breakdown-track",
			".astra-chat-context-usage-shortcut__breakdown-fill",
			".astra-chat-context-usage-shortcut__breakdown-value",
			".astra-chat-context-usage-shortcut__explainer",
			".astra-chat-context-usage-shortcut__explainer-icon",
			".astra-chat-context-usage-shortcut__helper.is-alert",
			".astra-chat-library-missing-dialog__empty",
			".astra-chat-library-missing-dialog__repository-field",
			".astra-chat-library-missing-dialog__repository-input",
			".astra-chat-library-missing-dialog__copy-button:not(:disabled)",
			".astra-chat-library-missing-dialog__copy-button:disabled",
			".astra-chat-library-missing-dialog__copy-icon",
			".astra-chat-library-dialog-action--confirm:disabled",
			".astra-chat-library-dialog-action--confirm[disabled]",
			".astra-chat-library-dialog-footer--delete",
			".astra-chat-library-dialog-action--delete",
		]);
		expect(css).not.toContain("var(--SmartThemeBodyColor)");
		expect(css).not.toContain(
			".astra-chat-context-usage-shortcut__summary",
		);
		expect(css).not.toContain(
			".astra-chat-library-missing-dialog__repository-link",
		);
	});

	test("keeps current chat main-menu drawer selector contracts addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"#astra-chat-main-menu-drawer",
			".astra-chat-main-menu-drawer__header",
			".astra-chat-main-menu-drawer__scrollable-content",
			".astra-chat-main-menu-drawer__content",
			".astra-chat-main-menu-drawer__header-row",
			".astra-chat-main-menu-drawer__header-main",
			".astra-chat-main-menu-drawer__avatar-frame",
			".astra-chat-main-menu-drawer__avatar",
			".astra-chat-main-menu-drawer__avatar.astra-chat-avatar--collage",
			".astra-chat-main-menu-drawer__avatar .astra-chat-avatar__collage-image",
			".astra-chat-main-menu-drawer__name-stack",
			".astra-chat-main-menu-drawer__actions",
			".astra-chat-main-menu-drawer__action-button",
			".astra-chat-main-menu-drawer__entity-name",
			".astra-chat-main-menu-drawer__chat-file-name",
			".astra-chat-main-menu-drawer__detail-section",
			".astra-chat-main-menu-drawer__detail-row",
			".astra-chat-main-menu-drawer__detail-term",
			".astra-chat-main-menu-drawer__detail-definition",
			".astra-chat-main-menu-drawer__detail-connection-provider",
			".astra-chat-main-menu-drawer__detail-connection-provider-icon",
			".astra-chat-main-menu-drawer__detail-connection-provider-icon svg",
			".astra-chat-main-menu-drawer__detail-connection-provider-label",
			".astra-chat-main-menu-drawer__detail-connection-model",
			".astra-chat-main-menu-drawer__detail-helper",
			".astra-chat-main-menu-drawer__detail-separator",
			".astra-chat-main-menu-drawer__detail-context-row",
			".astra-chat-main-menu-drawer__detail-context-summary",
			".astra-chat-main-menu-drawer__detail-context-usage",
			".astra-chat-main-menu-drawer__detail-usage-percent",
			".astra-chat-main-menu-drawer__detail-usage-counts",
			".astra-chat-main-menu-drawer__controls-section",
			".astra-chat-main-menu-drawer__control",
			".astra-chat-main-menu-drawer__control-label",
			".astra-chat-main-menu-drawer__control-trigger",
			".astra-chat-main-menu-drawer__control-value",
			".astra-chat-main-menu-drawer__control-content",
			".astra-chat-main-menu-drawer__control-option",
			".astra-chat-main-menu-drawer__control-option-label",
			".astra-chat-main-menu-drawer__control-helper",
			".astra-chat-main-menu-drawer__empty-state",
			".astra-chat-main-menu-tabs",
			".astra-chat-main-menu-tabs__panel",
			".astra-chat-main-menu-tabs__panel--sillytavern",
			".astra-chat-main-menu-tabs__panel--extensions",
			".astra-chat-main-menu-drawer__shortcut-grid",
			".astra-chat-main-menu-extension-shortcuts",
			".astra-chat-main-menu-extension-shortcuts__content",
			".astra-chat-main-menu-extension-shortcuts__grid",
			".astra-chat-main-menu-extension-shortcuts__icon",
			".astra-chat-main-menu-extension-shortcuts__placeholder",
			".astra-chat-main-menu-drawer__tile-shell",
			".astra-chat-main-menu-drawer__tile",
			".astra-chat-main-menu-drawer__tile-title",
			".astra-chat-main-menu-drawer__tile-title-line",
			".astra-chat-main-menu-drawer__tile-icon",
			".astra-chat-main-menu-drawer__tile-icon.fa-solid",
			".astra-chat-main-menu-drawer__tile-glow",
			".astra-chat-main-menu-drawer__tile-fade",
			".astra-chat-main-menu-drawer__tile-deco-icon",
			".astra-chat-main-menu-drawer__tile-deco-icon.fa-solid",
			".astra-chat-main-menu-drawer__footer",
			".astra-chat-main-menu-drawer__current-user-section",
			".astra-chat-main-menu-drawer__current-user-card",
			".astra-chat-main-menu-drawer__current-user-row",
			".astra-chat-main-menu-drawer__current-user-main",
			".astra-chat-main-menu-drawer__current-user-frame",
			".astra-chat-main-menu-drawer__current-user-image",
			".astra-chat-main-menu-drawer__current-user-name-stack",
			".astra-chat-main-menu-drawer__current-user-actions",
			"@media (hover: hover) and (pointer: fine)",
		]);
		expect(css).toContain("--astra-chat-main-menu-drawer-avatar-size:");
		expect(css).toContain("var(--astra-avatar-size-min)");
		expect(css).toContain(
			"var(--astra-avatar-size-mobile-main-menu-drawer)",
		);
	});

	test("keeps main-menu drawer names constrained to single ellipsized lines", () => {
		const css = readCss();

		for (const selector of [
			".astra-chat-main-menu-drawer__header-row",
			".astra-chat-main-menu-drawer__header-main",
			".astra-chat-main-menu-drawer__name-stack",
			".astra-chat-main-menu-drawer__current-user-row",
			".astra-chat-main-menu-drawer__current-user-main",
			".astra-chat-main-menu-drawer__current-user-name-stack",
		]) {
			const block = readBlock(css, selector);

			expect(block, selector).not.toBe("");
			expect(block, selector).toContain("min-width: 0;");
			expect(block, selector).toContain("max-width: 100%;");
		}

		for (const selector of [
			".astra-chat-main-menu-drawer__entity-name",
			".astra-chat-main-menu-drawer__chat-file-name",
			".astra-chat-main-menu-drawer__current-user-name",
			".astra-chat-main-menu-drawer__current-user-subtitle",
		]) {
			const block = readBlock(css, selector);

			expect(block, selector).not.toBe("");
			expect(block, selector).toContain("display: block;");
			expect(block, selector).toContain("width: 100%;");
			expect(block, selector).toContain("max-width: 100%;");
			expectSingleLineEllipsis(block);
		}
	});

	test("routes main-menu drawer icon action sizes through the shared button token", () => {
		const css = readCss();
		const actionButtonBlock = readBlock(
			css,
			'.astra-chat-main-menu-drawer__action-button[data-slot="button"]',
		);
		const currentUserActionBlock = readBlock(
			css,
			".astra-chat-main-menu-drawer__current-user-action",
		);

		expect(actionButtonBlock).not.toBe("");
		expect(actionButtonBlock).toContain("var(--astra-button-min-size)");
		expect(currentUserActionBlock).not.toContain(
			"var(--astra-button-min-size)",
		);
	});

	test("does not keep removed main-menu drawer selector contracts", () => {
		const css = readCss();

		expect(css).not.toContain(".astra-chat-main-menu-sheet");
		expect(css).not.toContain(".astra-chat-main-menu-sheet__header");
		expect(css).not.toContain(".astra-chat-main-menu-sheet__header-main");
		expect(css).not.toContain(".astra-chat-main-menu-sheet__icon");
		expect(css).not.toContain(".astra-chat-main-menu-sheet__title");
		expect(css).not.toContain(".astra-chat-main-menu-sheet__content");
		expect(css).not.toContain(".astra-chat-main-menu-sheet__footer");
		expect(css).not.toContain(".astra-chat-main-menu-sheet__close-button");
		expect(css).not.toContain(
			".astra-chat-main-menu-drawer__tile-icon-box",
		);
		expect(css).not.toContain(".astra-chat-main-menu-drawer__meta-row");
		expect(css).not.toContain(".astra-chat-main-menu-drawer__meta-stats");
		expect(css).not.toContain(".astra-chat-main-menu-drawer__meta-item");
		expect(css).not.toContain(".astra-chat-main-menu-drawer__meta-icon");
		expect(css).not.toContain(".astra-chat-main-menu-drawer__meta-value");
		expect(css).not.toContain(
			".astra-chat-main-menu-drawer__details-toggle",
		);
		expect(css).not.toContain(
			".astra-chat-main-menu-drawer__detail-accordion",
		);
		expect(css).not.toContain(".astra-chat-main-menu-drawer__detail-table");
		expect(css).not.toContain(
			".astra-chat-main-menu-drawer__detail-usage-fallback",
		);
		expect(css).not.toContain(".astra-chat-main-menu-drawer__grid");
		expect(css).not.toContain(
			".astra-chat-main-menu-extension-shortcuts__toggle",
		);
		expect(css).not.toContain(
			".astra-chat-main-menu-extension-shortcuts__toggle-icon",
		);
	});
});
