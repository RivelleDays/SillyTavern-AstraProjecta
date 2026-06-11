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
	for (const selector of selectors) {
		expect(css).toContain(selector);
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

function readSlice(css: string, startPattern: string, endPattern: string): string {
	const startIndex = css.indexOf(startPattern);
	if (startIndex === -1) {
		return "";
	}

	const endIndex = css.indexOf(endPattern, startIndex + startPattern.length);
	return endIndex === -1 ? css.slice(startIndex) : css.slice(startIndex, endIndex);
}

function expectSingleLineEllipsis(block: string) {
	expect(block).toContain("min-width: 0;");
	expect(block).toContain("overflow: hidden;");
	expect(block).toContain("text-overflow: ellipsis;");
	expect(block).toContain("white-space: nowrap;");
}

describe("chat-send-form.css", () => {
	test("keeps the legacy mobile send-form host selectors for compatibility", () => {
		const css = readCss();

		expectSelectors(css, [
			"--astra-mobile-visual-viewport-bottom",
			"--astra-mobile-safe-bottom-effective",
			"--mobile-chat-top-bar-block-size",
			"#send_form",
			"#send_form #leftSendForm",
			"#send_form #rightSendForm",
			"#send_form #nonQRFormItems",
			"body.PWA #form_sheld",
			"#form_sheld",
			"#form_sheld::before",
			"#mobile-send-form-shortcuts-host",
			"#mobile-send-form-quick-reply-host",
			"#mobile-send-form-input-row-host",
			"#form_sheld > #mobile-send-form-shortcuts-host",
			"#form_sheld > #mobile-send-form-quick-reply-host",
			"#mobile-send-form-quick-reply-host > #qr--bar",
			"#send_form > #mobile-send-form-input-row-host",
		]);
	});

	test("keeps mobile send-form input row selector and token contracts addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			".mobile-send-form-shortcuts",
			".mobile-send-form-shortcuts__strip",
			".mobile-send-form-input-row",
			".mobile-send-form-input-row__left",
			".mobile-send-form-input-row__textarea-host",
			".mobile-send-form-input-row__textarea-main",
			".mobile-send-form-input-row__textarea-actions",
			".mobile-send-form-input-row__send-button",
			".mobile-send-form-input-row__left-control-button:not(:disabled)",
			".mobile-send-form-input-row__left-control-button:disabled",
		]);
		expect(css).toContain("--mobile-send-form-textarea-flex-basis:");
		expect(css).toContain("--mobile-send-form-avatar-size:");
		expect(css).toContain(
			"var(--astra-avatar-size-mobile-send-form-trigger)",
		);
	});

	test("keeps mobile quick reply host styling scoped to Astra token contracts", () => {
		const css = readCss();
		const quickReplySlice = readSlice(
			css,
			"#form_sheld > #mobile-send-form-quick-reply-host",
			"#send_form > #mobile-send-form-input-row-host",
		);

		expectSelectors(css, [
			"#mobile-send-form-quick-reply-host > #qr--bar > .qr--buttons",
			"#mobile-send-form-quick-reply-host > #qr--bar .qr--button",
			"#mobile-send-form-quick-reply-host > #qr--bar .qr--button-expander",
		]);
		expect(quickReplySlice).toContain("--mobile-send-form-quick-reply-gap:");
		expect(quickReplySlice).toContain(
			"--mobile-send-form-quick-reply-button-padding-x:",
		);
		expect(quickReplySlice).toContain(
			"--mobile-send-form-quick-reply-button-padding-y:",
		);
		expect(quickReplySlice).toContain(
			"--mobile-send-form-quick-reply-button-font-size:",
		);
		expect(quickReplySlice).toContain(
			"--mobile-send-form-quick-reply-max-block-size:",
		);
		expect(quickReplySlice).toContain(
			"--mobile-send-form-quick-reply-expander-size:",
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
			"body.astra-projecta-mobile-layout {",
			"#send_form > #mobile-send-form-input-row-host",
		);

		expectSelectors(css, [
			"body.astra-projecta-mobile-layout #qr--popout > .qr--body > .qr--buttons",
			"body.astra-projecta-mobile-layout #qr--popout > .qr--body > .qr--buttons.qr--color",
			"body.astra-projecta-mobile-layout .ctx-menu",
			"body.astra-projecta-mobile-layout .ctx-sub-menu",
			"body.astra-projecta-mobile-layout .ctx-item + .ctx-header",
			"body.astra-projecta-mobile-layout .list-group .list-group-item.ctx-header",
			"body.astra-projecta-mobile-layout .list-group .list-group-item.ctx-item",
			"body.astra-projecta-mobile-layout .ctx-item:hover",
			"body.astra-projecta-mobile-layout .ctx-item .qr--button-icon",
			"body.astra-projecta-mobile-layout .ctx-item .qr--button-label",
			"body.astra-projecta-mobile-layout .ctx-item .ctx-expander",
		]);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-surface-padding-inline:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-surface-padding-block:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-surface:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-border-color:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-section-gap:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-section-separator-color:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-label-padding-inline:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-label-font-size:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-row-height:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-row-padding-inline:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-row-padding-block:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-row-gap:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-row-radius:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-row-font-size:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-row-font-weight:",
		);
		expect(quickReplyMenuSlice).toContain(
			"--mobile-send-form-menu-row-hover-surface:",
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
		const block = readBlock(
			css,
			".mobile-send-form-input-row__send-button",
		);

		expect(block).not.toBe("");
		expect(block).toContain(
			"var(--mobile-send-form-inline-send-button-size)",
		);
		expect(block).toContain(
			"min-width: var(--mobile-send-form-inline-send-button-size)",
		);
		expect(block).not.toContain("var(--astra-button-min-size)");
	});

	test("keeps options and extensions drawer selector contracts addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"#mobile-send-form-options-drawer",
			"#mobile-send-form-options-drawer-scrollable-content",
			"#mobile-send-form-options-drawer-menu",
			".mobile-send-form-options-drawer__scroll-area",
			".mobile-send-form-options-drawer__group",
			".mobile-send-form-options-drawer__group-label",
			".mobile-send-form-options-drawer__item",
			".mobile-send-form-options-drawer__item:not(:disabled)",
			".mobile-send-form-options-drawer__item:disabled",
			".mobile-send-form-options-drawer__item--destructive",
			".mobile-send-form-options-drawer__toggle",
			".mobile-send-form-options-drawer__toggle-label",
			"#mobile-send-form-extensions-drawer",
			"#mobile-send-form-extensions-drawer-scrollable-content",
			".mobile-send-form-extensions-drawer__content",
			".mobile-send-form-extensions-drawer__label",
			".mobile-send-form-extensions-drawer__menu-host",
			"#mobile-send-form-extensions-drawer #extensionsMenu",
			'.astra-scroll-area__scrollbar[data-orientation="vertical"]',
		]);
		expect(css).toMatch(
			/\.mobile-send-form-options-drawer__scroll-area\s+\.astra-scroll-area__scrollbar\[data-orientation="vertical"\]/u,
		);
		expect(css).toMatch(
			/\.mobile-send-form-extensions-drawer__scroll-area\s+\.astra-scroll-area__scrollbar\[data-orientation="vertical"\]/u,
		);
		expect(css).not.toContain(
			".mobile-send-form-options-drawer__scroll-area .astra-scroll-area__thumb",
		);
		expect(css).not.toContain(
			".mobile-send-form-extensions-drawer__scroll-area .astra-scroll-area__thumb",
		);
		expect(css).not.toContain(
			".mobile-send-form-options-drawer__scroll-area .astra-scroll-area__scrollbar::before",
		);
		expect(css).not.toContain(
			".mobile-send-form-extensions-drawer__scroll-area .astra-scroll-area__scrollbar::before",
		);
		expect(css).not.toContain(".mobile-send-form-extensions-drawer__item");
		expect(css).not.toContain(
			".mobile-send-form-options-drawer__toggle-switch",
		);
		expect(css).not.toContain("[data-slot='field-content']");
		expect(css).not.toContain("[data-slot='field-label']");
		expect(css).not.toContain("--mobile-send-form-drawer-content-padding:");
		expect(css).not.toContain(
			"--mobile-send-form-options-scroll-fade-size:",
		);
		expect(css).not.toContain(
			"#mobile-send-form-options-drawer-scrollable-content:not([data-has-overflow-y])",
		);
	});

	test("keeps context usage and chat library dialog selector contracts addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			".mobile-send-form-surface-label",
			".mobile-chat-context-usage-shortcut__trigger:not(:disabled)",
			".mobile-chat-context-usage-shortcut__trigger:disabled",
			".mobile-chat-context-usage-shortcut__helper.is-alert",
			".astra-chat-library-dialog-action--confirm:disabled",
			".astra-chat-library-dialog-action--confirm[disabled]",
			".astra-chat-library-dialog-footer--delete",
			".astra-chat-library-dialog-action--delete",
		]);
		expect(css).not.toContain("var(--SmartThemeBodyColor)");
	});

	test("keeps current chat main-menu drawer selector contracts addressable", () => {
		const css = readCss();

		expectSelectors(css, [
			"#mobile-chat-main-menu-drawer",
			".mobile-chat-main-menu-drawer__header",
			".mobile-chat-main-menu-drawer__scrollable-content",
			".mobile-chat-main-menu-drawer__content",
			".mobile-chat-main-menu-drawer__header-row",
			".mobile-chat-main-menu-drawer__header-main",
			".mobile-chat-main-menu-drawer__avatar-frame",
			".mobile-chat-main-menu-drawer__avatar",
			".mobile-chat-main-menu-drawer__avatar.astra-chat-avatar--collage",
			".mobile-chat-main-menu-drawer__avatar .astra-chat-avatar__collage-image",
			".mobile-chat-main-menu-drawer__name-stack",
			".mobile-chat-main-menu-drawer__actions",
			".mobile-chat-main-menu-drawer__action-button",
			".mobile-chat-main-menu-drawer__entity-name",
			".mobile-chat-main-menu-drawer__chat-file-name",
			".mobile-chat-main-menu-drawer__detail-section",
			".mobile-chat-main-menu-drawer__detail-row",
			".mobile-chat-main-menu-drawer__detail-term",
			".mobile-chat-main-menu-drawer__detail-definition",
			".mobile-chat-main-menu-drawer__detail-connection-provider",
			".mobile-chat-main-menu-drawer__detail-connection-provider-icon",
			".mobile-chat-main-menu-drawer__detail-connection-provider-icon svg",
			".mobile-chat-main-menu-drawer__detail-connection-provider-label",
			".mobile-chat-main-menu-drawer__detail-connection-model",
			".mobile-chat-main-menu-drawer__detail-helper",
			".mobile-chat-main-menu-drawer__detail-separator",
			".mobile-chat-main-menu-drawer__detail-context-row",
			".mobile-chat-main-menu-drawer__detail-context-summary",
			".mobile-chat-main-menu-drawer__detail-context-usage",
			".mobile-chat-main-menu-drawer__detail-usage-percent",
			".mobile-chat-main-menu-drawer__detail-usage-counts",
			".mobile-chat-main-menu-drawer__control-helper",
			".mobile-chat-main-menu-drawer__empty-state",
			".mobile-chat-main-menu-drawer__grid",
			".mobile-chat-main-menu-drawer__tile-shell",
			".mobile-chat-main-menu-drawer__tile",
			".mobile-chat-main-menu-drawer__tile-title",
			".mobile-chat-main-menu-drawer__tile-title-line",
			".mobile-chat-main-menu-drawer__tile-glow",
			".mobile-chat-main-menu-drawer__tile-fade",
			".mobile-chat-main-menu-drawer__tile-deco-icon",
			".mobile-chat-main-menu-drawer__footer",
			".mobile-chat-main-menu-drawer__current-user-section",
			".mobile-chat-main-menu-drawer__current-user-card",
			".mobile-chat-main-menu-drawer__current-user-row",
			".mobile-chat-main-menu-drawer__current-user-main",
			".mobile-chat-main-menu-drawer__current-user-frame",
			".mobile-chat-main-menu-drawer__current-user-image",
			".mobile-chat-main-menu-drawer__current-user-name-stack",
			".mobile-chat-main-menu-drawer__current-user-actions",
			".mobile-chat-main-menu-drawer__current-user-action",
			"@media (hover: hover) and (pointer: fine)",
		]);
		expect(css).toContain("--mobile-chat-main-menu-drawer-avatar-size:");
		expect(css).toContain("var(--astra-avatar-size-min)");
		expect(css).toContain(
			"var(--astra-avatar-size-mobile-main-menu-drawer)",
		);
	});

	test("keeps main-menu drawer names constrained to single ellipsized lines", () => {
		const css = readCss();

		for (const selector of [
			".mobile-chat-main-menu-drawer__header-row",
			".mobile-chat-main-menu-drawer__header-main",
			".mobile-chat-main-menu-drawer__name-stack",
			".mobile-chat-main-menu-drawer__current-user-row",
			".mobile-chat-main-menu-drawer__current-user-main",
			".mobile-chat-main-menu-drawer__current-user-name-stack",
		]) {
			const block = readBlock(css, selector);

			expect(block, selector).not.toBe("");
			expect(block, selector).toContain("min-width: 0;");
			expect(block, selector).toContain("max-width: 100%;");
		}

		for (const selector of [
			".mobile-chat-main-menu-drawer__entity-name",
			".mobile-chat-main-menu-drawer__chat-file-name",
			".mobile-chat-main-menu-drawer__current-user-name",
			".mobile-chat-main-menu-drawer__current-user-subtitle",
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

		for (const selector of [
			".mobile-chat-main-menu-drawer__action-button",
			".mobile-chat-main-menu-drawer__current-user-action",
		]) {
			const block = readBlock(css, selector);

			expect(block, selector).not.toBe("");
			expect(block, selector).toContain("var(--astra-button-min-size)");
		}
	});

	test("does not keep removed main-menu drawer selector contracts", () => {
		const css = readCss();

		expect(css).not.toContain(".mobile-chat-main-menu-sheet");
		expect(css).not.toContain(".mobile-chat-main-menu-sheet__header");
		expect(css).not.toContain(".mobile-chat-main-menu-sheet__header-main");
		expect(css).not.toContain(".mobile-chat-main-menu-sheet__icon");
		expect(css).not.toContain(".mobile-chat-main-menu-sheet__title");
		expect(css).not.toContain(".mobile-chat-main-menu-sheet__content");
		expect(css).not.toContain(".mobile-chat-main-menu-sheet__footer");
		expect(css).not.toContain(".mobile-chat-main-menu-sheet__close-button");
		expect(css).not.toContain(
			".mobile-chat-main-menu-drawer__tile-icon-box",
		);
		expect(css).not.toContain(".mobile-chat-main-menu-drawer__meta-row");
		expect(css).not.toContain(".mobile-chat-main-menu-drawer__meta-stats");
		expect(css).not.toContain(".mobile-chat-main-menu-drawer__meta-item");
		expect(css).not.toContain(".mobile-chat-main-menu-drawer__meta-icon");
		expect(css).not.toContain(".mobile-chat-main-menu-drawer__meta-value");
		expect(css).not.toContain(
			".mobile-chat-main-menu-drawer__details-toggle",
		);
		expect(css).not.toContain(
			".mobile-chat-main-menu-drawer__detail-accordion",
		);
		expect(css).not.toContain(
			".mobile-chat-main-menu-drawer__detail-table",
		);
		expect(css).not.toContain(
			".mobile-chat-main-menu-drawer__detail-usage-fallback",
		);
	});
});
