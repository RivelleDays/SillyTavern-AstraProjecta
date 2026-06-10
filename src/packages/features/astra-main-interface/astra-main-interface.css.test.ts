import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readFeatureCss() {
	return readFileSync(
		resolve(
			process.cwd(),
			"src/packages/features/astra-main-interface/astra-main-interface.css",
		),
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

function expectStyleContains(css: string, expected: string) {
	expect(normalizeStyleSource(css)).toContain(normalizeStyleSource(expected));
}

function readBlock(css: string, selector: string): string {
	const pattern = new RegExp(
		`${selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*\\{(?<body>[^}]*)\\}`,
		"u",
	);
	const match = pattern.exec(css);
	return match?.groups?.body ?? "";
}

function readStandaloneBlock(css: string, selector: string): string {
	const pattern = new RegExp(
		`(?:^|\\n\\n)${selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\s*\\{(?<body>[^}]*)\\}`,
		"u",
	);
	const match = pattern.exec(css);
	return match?.groups?.body ?? "";
}

function expectSingleLineEllipsis(block: string) {
	expect(block).toContain("min-width: 0;");
	expect(block).toContain("overflow: hidden;");
	expect(block).toContain("text-overflow: ellipsis;");
	expect(block).toContain("white-space: nowrap;");
}

describe("astra-main-interface.css", () => {
	test("is imported by the emitted global stylesheet", () => {
		const globalsCss = readFileSync(
			resolve(process.cwd(), "src/styles/globals.css"),
			"utf8",
		).replaceAll('"', "'");

		expect(globalsCss).toContain(
			"@import '../packages/features/astra-main-interface/astra-main-interface.css';",
		);
	});

	test("keeps chat menu selector contracts addressable", () => {
		const css = readFeatureCss();

		expect(css).toContain(".astra-main-interface");
		expect(css).toContain(".astra-main-interface__section-tabs");
		expect(css).toContain(".astra-main-interface__scope-strip");
		expect(css).toContain(".astra-main-interface__scope-pinned");
		expect(css).toContain(".astra-main-interface__scope-button");
		expect(css).toContain(".astra-main-interface__scope-favorites");
		expect(css).toContain(
			".astra-main-interface__scope-favorites-scrollbar",
		);
		expect(css).toContain(".astra-main-interface__secondary-tabs");
		expect(css).toContain(".astra-main-interface__global-tabs");
		expect(css).toContain(".astra-main-interface__current-context-tabs");
		expect(css).toContain(".astra-main-interface__favorite-tabs");
		expect(css).toContain(
			"#mobile-astra-main-interface-content > .astra-main-interface",
		);
		expect(css).toContain(
			".astra-main-interface-panel__body > .astra-smooth-tabs__list-frame",
		);
		expect(css).toContain(
			".astra-main-interface__secondary-tabs .astra-smooth-tabs__list-frame",
		);
		expect(css).toContain(
			".astra-main-interface__secondary-tabs .astra-smooth-tabs__list",
		);
		expect(css).toContain(
			".astra-main-interface__secondary-tabs .astra-smooth-tabs__viewport",
		);
		expect(css).toContain(
			".astra-main-interface__secondary-tabs .astra-smooth-tabs__panel",
		);
		expect(css).toContain(".astra-main-interface__category-tab-panel");
		expect(css).toContain(
			".astra-main-interface__global-category-tab-panel",
		);
		expect(css).toContain(
			".astra-main-interface__current-context-category-tab-panel",
		);
		expect(css).toContain(
			".astra-main-interface__favorite-category-tab-panel",
		);
		expect(css).not.toContain(
			".astra-smooth-tabs__panel[data-route='global-categories']",
		);
		expect(css).not.toContain(
			".astra-main-interface__global-tabs-panel--chats",
		);
		expect(css).toContain(".astra-main-interface__tab-panel");
		expect(css).toContain(".astra-main-interface__tab-panel--categories");
		expect(css).toContain(".astra-main-interface__tab-scroll-area");
		expect(css).toContain(".astra-main-interface__tab-scroll-viewport");
		expect(css).toContain(".astra-main-interface__tab-scroll-content");
		expect(css).toContain(".astra-main-interface__tab-scrollbar");
		expect(css).toContain(".astra-main-interface__placeholder");
		expect(css).toContain(".astra-main-interface__placeholder-action");
		expect(css).not.toContain(".astra-main-interface__route-header");
		expect(css).not.toContain(".astra-main-interface__route-title");
		expect(css).toContain(".astra-main-interface__toolbar");
		expect(css).toContain(".astra-main-interface__toolbar--categories");
		expect(css).not.toContain(".astra-main-interface__status-row");
		expect(css).toContain(".astra-main-interface__search-input");
		expect(css).toContain(".astra-main-interface__search-clear-button");
		expect(css).toContain(".astra-main-interface__controls-trigger");
		expect(css).toContain(".astra-main-interface-controls-drawer");
		expect(css).toContain(".astra-main-interface-drawer");
		expect(css).toContain(".astra-main-interface-chat-actions-drawer");
		expect(css).toContain(".astra-main-interface-chat-category-drawer");
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__header",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__title",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__identity",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__avatar",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__avatar--collage",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__avatar-collage-image",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__scroll-area",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__scrollable-content",
		);
		for (const selector of [
			".astra-main-interface-chat-actions-drawer__menu",
			".astra-main-interface-chat-actions-drawer__group",
			".astra-main-interface-chat-actions-drawer__group-label",
			".astra-main-interface-chat-actions-drawer__group-items",
			".astra-main-interface-chat-actions-drawer__item",
			".astra-main-interface-chat-actions-drawer__item--destructive",
		]) {
			expect(css).toContain(selector);
		}
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__export-summary",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__footer-actions",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-actions-drawer__footer-action",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-category-drawer__header",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-category-drawer__description",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-category-drawer__scroll-area",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-category-drawer__scrollable-content",
		);
		expect(css).toContain(
			".astra-drawer__overlay:has(+ .astra-main-interface-drawer)",
		);
		expect(css).toContain("--astra-main-interface-drawer-overlay-layer");
		expect(css).toContain("--astra-main-interface-drawer-surface-layer");
		expect(css).toContain(
			".astra-main-interface-controls-drawer__scroll-area",
		);
		expect(css).toContain(".astra-main-interface-controls-drawer__menu");
		expect(css).toContain(".astra-main-interface-controls-drawer__group");
		expect(css).not.toContain(
			".astra-main-interface-controls-drawer__group-label",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__sort-row",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__sort-label",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__sort-controls",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__sort-field-trigger",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__preview-lines-row",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__preview-lines-label",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__preview-lines-controls",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__preview-lines-trigger",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__preview-lines-trigger-label",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__preview-lines-item",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__avatar-toggle",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__avatar-toggle-label",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__sort-direction",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__sort-direction-button",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__sort-direction-button--active",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__refresh-button",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__dropdown",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__sort-dropdown",
		);
		expect(css).toContain(
			".astra-main-interface-controls-drawer__preview-lines-dropdown",
		);
		expect(css).toContain(".astra-main-interface-controls-drawer__item");
		expect(css).toContain(".astra-main-interface__empty-header");
		expect(css).toContain(".astra-main-interface__empty-media");
		expect(css).toContain(".astra-main-interface__empty-title");
		expect(css).toContain(".astra-main-interface__empty-description");
		expect(css).toContain(".astra-main-interface__empty-actions");
		expect(css).toContain(".astra-main-interface__empty-action");
		expect(css).toContain(".astra-chat-library-global-manager");
		expect(css).toContain(".astra-chat-library-category-inputWrap");
		expect(css).toContain(".astra-chat-library-category-selectTrigger");
		expect(css).toContain(".astra-chat-library-category-selectIcon");
		expect(css).toContain(".astra-chat-library-category-selectMenu");
		expect(css).toContain(".astra-chat-library-category-selectItem");
		expect(css).toContain(".astra-chat-library-category-panel");
		expectStyleContains(
			css,
			".astra-main-interface__tab-panel--categories .astra-chat-library-category-panel",
		);
		expect(css).toContain(".astra-chat-library-category-treeLayout");
		expect(css).toMatch(
			/\.astra-main-interface__category-tab-panel\s+\.astra-chat-library-category-treeLayout/,
		);
		expect(css).not.toMatch(
			/\.astra-main-interface-chat-category-drawer\s+\.astra-chat-library-category-treeLayout/,
		);
		expect(css).not.toMatch(
			/^\.astra-chat-library-category-treeLayout\s*\{/m,
		);
		expect(css).toContain(".astra-chat-library-category-treeActions");
		expect(css).toContain(".astra-chat-library-category-treeActionsLabel");
		expect(css).toContain(".astra-chat-library-category-tree");
		expect(css).toContain(".astra-chat-library-category-tree--empty");
		expect(css).toContain(".astra-chat-library-category-emptyState");
		expect(css).toContain(".astra-chat-library-category-accordion");
		expect(css).toContain(".astra-chat-library-category-accordionItem");
		expect(css).toContain(".astra-chat-library-category-accordionHeader");
		expect(css).toContain(".astra-chat-library-category-accordionTrigger");
		expect(css).toContain(".astra-chat-library-category-accordionTitle");
		expect(css).toContain(
			".astra-chat-library-category-accordionTitle--category",
		);
		expect(css).toContain(".astra-chat-library-category-accordionIconWrap");
		expect(css).toContain(".astra-chat-library-category-accordionIcon");
		expect(css).toContain(".astra-chat-library-category-accordionText");
		expect(css).toContain(".astra-chat-library-category-accordionNameRow");
		expect(css).toContain(".astra-chat-library-category-accordionName");
		expect(css).toContain(".astra-chat-library-category-chevron");
		expect(css).toContain(".astra-chat-library-category-accordionContent");
		expect(css).toContain(".astra-chat-library-category-accordionBody");
		expect(css).not.toContain(".astra-chat-library-dialog-category-panel");
		expect(css).toContain(".astra-chat-library-global-tree");
		expect(css).toContain(".astra-chat-library-global-categoryRow");
		expect(css).toContain(".astra-chat-library-global-categoryHeaderRow");
		expect(css).toContain(".astra-chat-library-global-categoryHeader");
		expect(css).toContain(".astra-chat-library-global-categoryLabel");
		expect(css).toContain(".astra-chat-library-global-categoryName");
		expect(css).toContain(".astra-chat-library-global-categoryCount");
		expect(css).toContain(".astra-chat-library-global-categoryActions");
		expect(css).toContain(
			".astra-chat-library-global-categoryActionButton",
		);
		expect(css).toContain(
			".astra-chat-library-global-categoryRenameAction",
		);
		expect(css).toContain(
			".astra-chat-library-global-categoryDeleteAction",
		);
		expect(css).toContain(
			".astra-chat-library-global-categoryActionDrawer__identity",
		);
		expect(css).toContain(
			".astra-chat-library-global-categoryActionDrawer__identityIcon",
		);
		expect(css).toContain(
			".astra-chat-library-global-categoryActionDrawer__identityName",
		);
		expect(css).toContain(
			".astra-chat-library-global-categoryActionDrawer__identityScope",
		);
		expect(css).not.toContain(
			".astra-chat-library-global-categoryActionDrawer__notice",
		);
		expect(css).not.toContain(
			".astra-chat-library-global-categoryActionDrawer__noticeIcon",
		);
		expect(css).not.toContain(
			".astra-chat-library-global-categoryActionDrawer__noticeContent",
		);
		expect(css).not.toContain(
			".astra-chat-library-global-categoryActionDrawer__noticeTitle",
		);
		expect(css).not.toContain(
			".astra-chat-library-global-categoryActionDrawer__noticeText",
		);
		expect(css).toContain(".astra-chat-library-global-chatList");
		expect(css).toContain(".astra-chat-library-global-chatRow");
		expect(css).toContain(".astra-chat-library-global-chatAvatar");
		expect(css).toContain(".astra-chat-library-global-chatAvatar--collage");
		expect(css).toMatch(
			/\.astra-chat-library-global-chatAvatar--collage\[data-count=["']1["']\]/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-global-chatAvatar--collage\[data-count=["']2["']\]/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-global-chatAvatar--collage\[data-count=["']3["']\]/,
		);
		expect(css).toContain(".astra-chat-library-global-empty");
		expect(css).toContain(".astra-chat-library-category-row--empty");
		expect(css).toContain(
			".astra-chat-library-category-rowInner--interactive",
		);
		expect(css).toContain(".astra-chat-library-category-checkbox");
		expect(css).toContain(
			".astra-main-interface-chat-category-drawer__panel",
		);
		expect(css).toContain(
			".astra-main-interface-chat-category-drawer__assignment-list",
		);
		expect(css).toContain(
			".astra-main-interface-chat-category-drawer__scope-section",
		);
		expect(css).toContain(
			".astra-main-interface-chat-category-drawer__category-row",
		);
		expect(css).toContain(
			".astra-main-interface-chat-category-drawer__checkbox-wrap",
		);
		expect(css).toContain(
			".astra-main-interface-chat-category-drawer__create",
		);
		expect(css).not.toContain(".astra-chat-library-category-itemActions");
		expect(css).toContain(".astra-chat-library-actionButton");
		expect(css).toContain(".astra-chat-library-dialog-footer");
		expect(css).toContain(".astra-chat-library-dialog-footer-actions");
		expect(css).toContain(".astra-chat-library-dialog-action");
		expect(css).toContain(".astra-main-interface__chat-list");
		expect(css).not.toContain(".astra-main-interface__chat-switch-overlay");
		expect(css).toContain(".astra-main-interface-chat-row");
		expect(css).not.toContain(
			".astra-main-interface__tab-scroll-content .astra-main-interface-chat-row__body",
		);
		expect(css).not.toContain(".astra-mobile-page-panel__content");
		expect(css).toContain(".astra-main-interface-chat-row__body--current");
		expect(css).not.toContain(
			".astra-main-interface-chat-row__body::after",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-row__body--current::after",
		);
		expect(css).toMatch(
			/\.astra-main-interface__chat-list-item:not\(:last-child\)\s+\.astra-main-interface-chat-row__body:not\(\s*\.astra-main-interface-chat-row__body--current\s*\)\s*\{/,
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-row__current-indicator",
		);
		expect(css).toMatch(
			/\.astra-main-interface-chat-row\[data-preview-lines=["']1["']\]\s+\.astra-main-interface-chat-row__preview/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-chat-row\[data-preview-lines=["']2["']\]\s+\.astra-main-interface-chat-row__preview/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-chat-row\[data-preview-lines=["']3["']\]\s+\.astra-main-interface-chat-row__preview/,
		);
		expect(css).toContain(".astra-main-interface-chat-row__avatar");
		expect(css).toContain(
			".astra-main-interface-chat-row__current-avatar-shell",
		);
		expect(css).toContain("--astra-main-interface-scope-avatar-size:");
		expect(css).toContain("var(--astra-avatar-size-main-interface-scope)");
		expect(css).toContain("--astra-main-interface-chat-row-avatar-size:");
		expect(css).toContain(
			"var(--astra-avatar-size-main-interface-chat-row)",
		);
		expect(css).toContain("--astra-chat-library-global-chat-avatar-size:");
		expect(css).toContain("var(--astra-avatar-size-chat-library-row)");
		expect(css).toContain(".astra-main-interface-chat-row__avatar-status");
		expect(css).toContain(
			".astra-main-interface-chat-row__avatar--collage",
		);
		expect(css).toContain(
			".astra-main-interface-chat-row__avatar-collage-image",
		);
		expect(css).toContain(".astra-main-interface-chat-row__header-row");
		expect(css).toContain(".astra-main-interface-chat-row__name-stack");
		expect(css).not.toContain(".astra-main-interface-chat-row__badge");
		expect(css).toContain(".astra-main-interface-chat-row__footer");
		expect(css).toContain(".astra-main-interface-chat-row__stat");
		expect(css).toContain(".astra-main-interface-chat-row__stat-icon");
		expect(css).toContain(".astra-main-interface-chat-row__actions");
		expect(css).toContain(".astra-main-interface-chat-row__action-button");
		expectStyleContains(
			css,
			".astra-main-interface-chat-row__action-button--categories[data-state='on']",
		);
		expect(css).not.toContain(".astra-main-interface-current-chat-row__");
		expect(css).toContain(".astra-main-interface__load-more-button");
		expect(css).toContain(".astra-main-interface__sentinel");
		expect(css).not.toContain(".astra-main-interface__field-label");
	});

	test("keeps favorite scope scrollbar hidden while preserving scroll structure", () => {
		const css = readFeatureCss();

		expect(css).toContain(
			".astra-main-interface__scope-favorites-viewport",
		);
		expect(css).toContain(
			".astra-main-interface__scope-favorites-viewport::-webkit-scrollbar",
		);
		expect(css).toContain(
			".astra-main-interface__scope-favorites-scrollbar",
		);
		expect(css).not.toContain(
			".astra-main-interface__scope-favorites-scrollbar[data-has-overflow-x]",
		);
	});

	test("keeps favorite scope horizontal edge mask hooks addressable", () => {
		const css = readFeatureCss();

		expect(css).toContain("--astra-main-interface-scope-scroll-fade-size:");
		expect(css).toContain(
			"--astra-main-interface-scope-scroll-mask-visible:",
		);
		expect(css).toContain(
			"--astra-main-interface-scope-scroll-mask-hidden:",
		);
		expectStyleContains(
			css,
			".astra-main-interface__scope-favorites[data-overflow-x-end]:not([data-overflow-x-start])\n    .astra-main-interface__scope-favorites-viewport",
		);
		expectStyleContains(
			css,
			".astra-main-interface__scope-favorites[data-overflow-x-start]:not([data-overflow-x-end])\n    .astra-main-interface__scope-favorites-viewport",
		);
		expectStyleContains(
			css,
			".astra-main-interface__scope-favorites[data-overflow-x-start][data-overflow-x-end]\n    .astra-main-interface__scope-favorites-viewport",
		);
		expectStyleContains(
			css,
			".astra-main-interface__scope-favorites:not([data-has-overflow-x])\n    .astra-main-interface__scope-favorites-viewport",
		);
	});

	test("keeps scope strip divider hooks addressable", () => {
		const css = readFeatureCss();

		expect(css).toContain(".astra-main-interface__scope-divider");
		expect(css).toContain("--astra-main-interface-scope-divider-height:");
	});

	test("keeps scope strip gaps on a shared token", () => {
		const css = readFeatureCss();
		const scopeGapToken = "--astra-main-interface-scope-gap";
		const tokenBackedGap = new RegExp(
			`gap:\\s*[^;]*var\\(${scopeGapToken}\\)[^;]*;`,
		);

		expect(
			readStandaloneBlock(css, ".astra-main-interface__scope-strip"),
		).toContain(`${scopeGapToken}:`);
		expect(
			readStandaloneBlock(css, ".astra-main-interface__scope-strip"),
		).toMatch(tokenBackedGap);
		expect(readBlock(css, ".astra-main-interface__scope-pinned")).toMatch(
			tokenBackedGap,
		);
		expect(
			readBlock(css, ".astra-main-interface__scope-favorites-content"),
		).toMatch(tokenBackedGap);
	});

	test("keeps enabled and disabled cursor affordance contracts explicit", () => {
		const css = readFeatureCss();

		expect(css).toMatch(
			/\.astra-main-interface-chat-row:not\(\[aria-disabled=["']true["']\]\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-chat-row\[aria-disabled=["']true["']\]\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-chat-row__action-button:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-chat-row__action-button:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-chat-actions-drawer__item:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-chat-actions-drawer__item:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-chat-row__action-button:not\(\s*\.astra-main-interface-chat-row__action-button--menu\s*\):hover:not\(:disabled\)/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__search-clear-button:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__search-clear-button:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__controls-trigger:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__controls-trigger:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface\s+\.astra-sliding-tabs__trigger:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__scope-button:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface\s+\.astra-smooth-tabs__trigger:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__placeholder-action:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__sort-field-trigger:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__sort-field-trigger:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__preview-lines-trigger:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__preview-lines-trigger:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__sort-direction-button:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__sort-direction-button:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__refresh-button:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__refresh-button:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__item:not\(\[data-disabled\]\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface-controls-drawer__item\[data-disabled\]\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__empty-action:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__empty-action:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-actionButton:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-actionButton:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-category-addButton:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-category-addButton:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-category-selectTrigger:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-category-selectTrigger:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-category-accordionTrigger:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-category-accordionTrigger:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-global-categoryHeader:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-global-categoryHeader:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-global-categoryActionButton:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-global-categoryActionButton:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-global-chatRow:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-global-chatRow:disabled\s*\{[^}]*cursor:\s*default;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-category-rowInner--interactive:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-category-checkbox\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-category-checkbox:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-dialog-action:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-chat-library-dialog-action:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__load-more-button:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(css).toMatch(
			/\.astra-main-interface__load-more-button:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
	});

	test("uses current chat indicators without filled row background", () => {
		const css = readFeatureCss();
		const currentBodyBlock = readBlock(
			css,
			".astra-main-interface-chat-row__body--current",
		);
		const currentAvatarShellBlock = readBlock(
			css,
			".astra-main-interface-chat-row__current-avatar-shell",
		);
		const avatarStatusBlock = readBlock(
			css,
			".astra-main-interface-chat-row__avatar-status",
		);

		expect(currentBodyBlock).not.toBe("");
		expect(css).toContain(".astra-main-interface-chat-row__body--current");
		expect(css).not.toContain(
			".astra-main-interface-chat-row__body--current::before",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-row__body--current::after",
		);
		expect(css).not.toContain(
			".astra-main-interface-chat-row__current-indicator",
		);
		expect(currentAvatarShellBlock).not.toBe("");
		expect(avatarStatusBlock).not.toBe("");
		expect(avatarStatusBlock).toContain("var(--color-base)");
		expect(avatarStatusBlock).not.toContain("var(--background)");
	});

	test("keeps chat identity fields constrained to single ellipsized lines", () => {
		const css = readFeatureCss();

		for (const selector of [
			".astra-main-interface-chat-row__header",
			".astra-main-interface-chat-row__header-row",
			".astra-main-interface-chat-row__name-stack",
			".astra-main-interface-chat-row__time-row",
			".astra-main-interface-chat-row__main",
		]) {
			const block = readBlock(css, selector);

			expect(block, selector).not.toBe("");
			expect(block, selector).toContain("min-width: 0;");
			expect(block, selector).toContain("max-width: 100%;");
		}

		const sharedIdentityBlock =
			readBlock(
				css,
				".astra-main-interface-chat-row__entity,\n.astra-main-interface-chat-row__chat-name,\n.astra-main-interface-chat-row__preview,\n.astra-main-interface-chat-row__date",
			) ||
			readBlock(
				css,
				".astra-main-interface-chat-row__entity,\r\n.astra-main-interface-chat-row__chat-name,\r\n.astra-main-interface-chat-row__preview,\r\n.astra-main-interface-chat-row__date",
			);

		expect(sharedIdentityBlock).not.toBe("");
		expect(sharedIdentityBlock).toContain("display: block;");
		expect(sharedIdentityBlock).toContain("width: 100%;");
		expect(sharedIdentityBlock).toContain("max-width: 100%;");
		expectSingleLineEllipsis(sharedIdentityBlock);
	});

	test("routes reusable icon action sizes through the shared button token", () => {
		const css = readFeatureCss();

		for (const selector of [
			".astra-main-interface__search-clear-button",
			".astra-chat-library-actionButton",
			".astra-chat-library-category-addButton",
			".astra-main-interface-chat-row__action-button",
			".astra-main-interface-chat-row__action-button--menu",
		]) {
			const block = readBlock(css, selector);

			expect(block, selector).not.toBe("");
			expect(block, selector).toContain("var(--astra-button-min-size)");
		}
	});

	test("routes global category action buttons through the small shared button token", () => {
		const css = readFeatureCss();
		const buttonBlock = readBlock(
			css,
			".astra-chat-library-global-categoryActionButton",
		);

		expect(buttonBlock).not.toBe("");
		expect(buttonBlock).toContain("var(--astra-button-size-sm)");
		expect(buttonBlock).not.toContain("32px");
		expect(css).toMatch(
			/\.astra-chat-library-global-categoryActionButton:not\(:disabled\):hover,\s*\.astra-chat-library-global-categoryActionButton:focus-visible\s*\{/,
		);
	});
});
