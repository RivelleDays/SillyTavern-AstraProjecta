import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function normalizeStyleSource(source: string): string {
	return source
		.replaceAll('"', "'")
		.replace(/\(\s+/g, "(")
		.replace(/\s+\)/g, ")")
		.replace(/\s+/g, " ")
		.trim();
}

describe("globals.css", () => {
	const canonicalTintSteps = [
		"t5",
		"t10",
		"t20",
		"t30",
		"t40",
		"t50",
		"t60",
		"t70",
		"t80",
		"t90",
	];

	test("imports the full Tailwind default theme statically for emitted CSS output", () => {
		const css = normalizeStyleSource(
			readFileSync(
				resolve(process.cwd(), "src/styles/globals.css"),
				"utf8",
			),
		);

		expect(css).toContain(
			"@import 'tailwindcss/theme.css' layer(theme) theme(static);",
		);
	});

	test("imports the message-actions stylesheet for the single-message actions contract", () => {
		const css = normalizeStyleSource(
			readFileSync(
				resolve(process.cwd(), "src/styles/globals.css"),
				"utf8",
			),
		);
		const messageActionsCss = normalizeStyleSource(
			readFileSync(
				resolve(
					process.cwd(),
					"src/packages/features/chat-session/message-actions/message-actions.css",
				),
				"utf8",
			),
		);

		expect(css).toContain(
			"@import '../packages/features/chat-session/message-actions/message-actions.css';",
		);
		expect(messageActionsCss).not.toContain(
			".astra-mesActions__leftDefault",
		);
		expect(messageActionsCss).not.toContain(
			".astra-mesActions__revisionHost",
		);
		expect(messageActionsCss).not.toContain(
			".astra-mesActions__rightDefault",
		);
		expect(messageActionsCss).not.toContain(
			".astra-mesActions__historyHost",
		);
		expect(messageActionsCss).not.toContain(".astra-mesActions__moreHost");
		expect(messageActionsCss).not.toContain(".astra-mesActions__swipeHost");
		expect(messageActionsCss).toContain(".astra-mesHeaderActions");
		expect(messageActionsCss).toContain(".astra-mesHeaderActions__button");
		expect(messageActionsCss).toContain(
			".astra-mesHeaderActions__button--edit",
		);
		expect(messageActionsCss).toContain(
			".astra-mesHeaderActions__button--more",
		);
		expect(messageActionsCss).toContain(".astra-revisionBar");
		expect(messageActionsCss).toContain(".astra-revisionBar__button");
		expect(messageActionsCss).toContain(".astra-swipePager");
		expect(messageActionsCss).toContain(".astra-swipePager__button");
		expect(messageActionsCss).toContain("var(--astra-button-min-size)");
		expect(messageActionsCss).toContain("var(--astra-button-icon-size)");
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__header",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__heading",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__body",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__scrollableContent",
		);
		expect(messageActionsCss).toContain(
			"#mobile-message-more-actions-drawer-content",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__content",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__footer",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActions",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActionsViewport",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActionsContent",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActionsScrollbar",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActionButton",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActionButton--danger",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActionButton--native",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__footerAction",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__footerActionIcon",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__footerActionLabel",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__footerMoreAction",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__footerMoreActionIcon",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__footerMorePill",
		);
		expect(messageActionsCss).toContain(".astra-messageEditDrawer");
		expect(messageActionsCss).toContain(".astra-messageEditDrawer__header");
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__extraActions",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__extraActionsContent",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__extraActionsGroup",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__extraActionsGroup--start",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__extraActionsGroup--end",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__extraActionButton",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__extraActionButton--danger",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__extraActionButton--native",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__extraActionIcon",
		);
		expect(messageActionsCss).toContain(".astra-messageEditDrawer__body");
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__scrollableContent",
		);
		expect(messageActionsCss).toContain(
			"#mobile-message-edit-drawer-content",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__content",
		);
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__fieldGroup",
		);
		expect(messageActionsCss).toContain(".astra-messageEditDrawer__field");
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__textarea",
		);
		expect(messageActionsCss).toContain(".astra-messageEditDrawer__footer");
		expect(messageActionsCss).toContain(
			".astra-messageEditDrawer__footerAction",
		);
		expect(messageActionsCss).toContain(".astra-messageExtraActionsDrawer");
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__body",
		);
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__header",
		);
		expect(messageActionsCss).toContain(".astra-chat-library-dialog-meta");
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__messageMeta",
		);
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__messagePreview",
		);
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__scrollableContent",
		);
		expect(messageActionsCss).toContain(
			"#mobile-message-extra-actions-drawer-content",
		);
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__group",
		);
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__groupLabel",
		);
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__action",
		);
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__action--danger",
		);
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__nativeIcon",
		);
		expect(messageActionsCss).toContain(
			".astra-messageExtraActionsDrawer__empty",
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageExtraActionsDrawer__groupContent\s*>\s*\.astra-messageExtraActionsDrawer__action\s*\+\s*\.astra-messageExtraActionsDrawer__action\s*\{/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageExtraActionsDrawer__messagePreview\s*\{[^}]*-webkit-line-clamp:\s*3;/,
		);
		expect(messageActionsCss).not.toContain(
			".astra-messageExtraActionsDrawer__heading {",
		);
		expect(messageActionsCss).not.toContain(
			".astra-messageExtraActionsDrawer__headingPreview",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__detailSection",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__detailRow",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__detailSeparator",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__detailTerm",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__detailIcon",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__detailDefinition",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__messageBody",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__messageScrollableContent",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__messageContent",
		);
		expect(messageActionsCss).toContain(
			".astra-messageDeleteConfirmationDrawer__messagePreview",
		);
		expect(messageActionsCss).not.toContain(
			".astra-messageDeleteConfirmationDrawer__renderedMessageSection",
		);
		expect(messageActionsCss).not.toContain(
			".astra-messageDeleteConfirmationDrawer__messageScrollRoot",
		);
		expect(messageActionsCss).not.toContain(
			"#mobile-message-more-actions-drawer .astra-dialog-content",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__summary",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__identityMain",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__identityText",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__identityNameRow",
		);
		expect(messageActionsCss).not.toContain(
			".astra-messageMoreActionsDrawer__identityMetaLine",
		);
		expect(messageActionsCss).not.toContain(
			".astra-messageMoreActionsDrawer__identityTimestamp",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__identityBadges",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__modelDataRow",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__detailSection",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__detailRow",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__detailSeparator",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__detailTerm",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__detailIcon",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__detailDefinition",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__modelName",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__modelIcon",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__modelLabel",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__modelStats",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__modelStatsValue",
		);
		expect(messageActionsCss).toContain(
			".astra-swipePager__button[data-swipe-feedback='active']",
		);
		expect(messageActionsCss).toContain(".astra-swipePager__counter");
		expect(messageActionsCss).toContain(".swipeRightBlock");
		expect(messageActionsCss).toContain(".swipe_left");
		expect(messageActionsCss).toContain(".swipe_right");
		expect(messageActionsCss).toContain(".swipes-counter");
		expect(messageActionsCss).toMatch(
			/\.astra-revisionBar__button:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-revisionBar__button:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-swipePager__button:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-mesHeaderActions__button:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-mesHeaderActions__button:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageMoreActionsDrawer__footerAction:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageMoreActionsDrawer__footerAction:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageMoreActionsDrawer__footerMoreAction:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageMoreActionsDrawer__footerMoreAction:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageMoreActionsDrawer__extraActionButton:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageMoreActionsDrawer__extraActionButton:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageEditDrawer__extraActionButton:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageEditDrawer__extraActionButton:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageEditDrawer__footerAction:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageEditDrawer__footerAction:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActions[data-overflow-x-end]:not([data-overflow-x-start]) .astra-messageMoreActionsDrawer__extraActionsViewport",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActions[data-overflow-x-start]:not([data-overflow-x-end]) .astra-messageMoreActionsDrawer__extraActionsViewport",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActions[data-overflow-x-start][data-overflow-x-end] .astra-messageMoreActionsDrawer__extraActionsViewport",
		);
		expect(messageActionsCss).toContain(
			".astra-messageMoreActionsDrawer__extraActions:not([data-has-overflow-x]) .astra-messageMoreActionsDrawer__extraActionsViewport",
		);
		expect(messageActionsCss).not.toContain(
			".astra-messageEditDrawer__extraActionsViewport",
		);
		expect(messageActionsCss).not.toContain(
			".astra-messageEditDrawer__extraActionsScrollbar",
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageExtraActionsDrawer__action:not\(:disabled\)\s*\{[^}]*cursor:\s*pointer;/,
		);
		expect(messageActionsCss).toMatch(
			/\.astra-messageExtraActionsDrawer__action:disabled\s*\{[^}]*cursor:\s*not-allowed;/,
		);
		const footerRule =
			messageActionsCss.match(
				/\.astra-messageMoreActionsDrawer__footer\s*\{[^}]*\}/,
			)?.[0] ?? "";
		expect(footerRule).toContain(".astra-messageMoreActionsDrawer__footer");
		expect(footerRule).toMatch(/justify-items:\s*center;/);
		const footerActionRule =
			messageActionsCss.match(
				/\.astra-messageMoreActionsDrawer__footerAction\s*\{[^}]*\}/,
			)?.[0] ?? "";
		const footerMoreActionRule =
			messageActionsCss.match(
				/\.astra-messageMoreActionsDrawer__footerMoreAction\s*\{[^}]*\}/,
			)?.[0] ?? "";
		expect(footerActionRule).not.toContain("-webkit-fill-available");
		expect(footerMoreActionRule).not.toContain("-webkit-fill-available");
		const footerActionHoverRule =
			messageActionsCss.match(
				/\.astra-messageMoreActionsDrawer__footerAction:hover:not\(:disabled\)\s*\{[^}]*\}/,
			)?.[0] ?? "";
		expect(footerActionHoverRule).toContain(
			".astra-messageMoreActionsDrawer__footerAction:hover:not(:disabled)",
		);
		expect(footerActionHoverRule).not.toMatch(/background\s*:/);
	});

	test("imports the message-layout stylesheet for the mobile SillyTavern message header bridge", () => {
		const css = normalizeStyleSource(
			readFileSync(
				resolve(process.cwd(), "src/styles/globals.css"),
				"utf8",
			),
		);
		const messageLayoutCss = normalizeStyleSource(
			readFileSync(
				resolve(
					process.cwd(),
					"src/packages/features/chat-session/message-layout/message-layout.css",
				),
				"utf8",
			),
		);
		const compactMessageLayoutCss = messageLayoutCss.replace(/\s+/g, " ");

		expect(css).toContain(
			"@import '../packages/features/chat-session/message-layout/message-layout.css';",
		);
		expect(compactMessageLayoutCss).toContain(
			"body.astra-projecta-mobile-layout {",
		);
		expect(compactMessageLayoutCss).toContain("& #chat .mes {");
		expect(compactMessageLayoutCss).not.toContain(
			"body.astra-projecta-theme #chat .mes",
		);
		expect(compactMessageLayoutCss).toContain("& #chat .mes .mes_text {");
		expect(compactMessageLayoutCss).toContain(
			"-webkit-touch-callout: none;",
		);
		expect(compactMessageLayoutCss).toContain("-webkit-user-select: none;");
		expect(compactMessageLayoutCss).toContain("user-select: none;");
		expect(compactMessageLayoutCss).toContain(
			".mes[data-astra-message-prompt-excluded='true']",
		);
		expect(compactMessageLayoutCss).toContain(".astra-mesHeader");
		expect(compactMessageLayoutCss).toContain(".astra-mesHeader__name");
		expect(compactMessageLayoutCss).toContain(".astra-mesBody");
		expect(compactMessageLayoutCss).toContain(".astra-mesMeta");
		expect(compactMessageLayoutCss).toContain(".astra-mesMeta__items");
		expect(compactMessageLayoutCss).toContain(".astra-mesMeta__item");
		expect(compactMessageLayoutCss).not.toContain(".astra-mesMeta__icon");
		expect(compactMessageLayoutCss).toContain(".astra-mesMeta__separator");
		expect(compactMessageLayoutCss).toContain(".astra-mesModel");
		expect(compactMessageLayoutCss).toContain(".astra-mesModel[hidden]");
		expect(compactMessageLayoutCss).toContain(".astra-mesModel__label");
		expect(compactMessageLayoutCss).toContain(".astra-mesMeta__time");
		expect(compactMessageLayoutCss).toContain(
			".astra-mesMeta__time > .timestamp",
		);
		expect(compactMessageLayoutCss).toContain(".astra-mesNativeControls");
		expect(compactMessageLayoutCss).toContain(
			".astra-mesHeader__name > .ch_name",
		);
		expect(compactMessageLayoutCss).toContain(".astra-mesDate");
		expect(compactMessageLayoutCss).toContain(".astra-mesDate__line");
		expect(compactMessageLayoutCss).toContain(".astra-mesDate__label");
		expect(compactMessageLayoutCss).toContain("& #chat .mes.lastInContext");
		expect(compactMessageLayoutCss).toContain(".astra-mesContextBoundary");
		expect(compactMessageLayoutCss).toContain(
			".astra-mesContextBoundary__tag",
		);
		expect(compactMessageLayoutCss).toContain(
			".astra-mesContextBoundary__tagIcon",
		);
		expect(compactMessageLayoutCss).toContain(
			".astra-mesContextBoundary__title",
		);
		expect(messageLayoutCss).toContain(
			"native reasoning action strip causes issues in Astra mobile layout",
		);
		expect(compactMessageLayoutCss).toContain(".mes_reasoning_details");
		expect(compactMessageLayoutCss).toContain(".mes_reasoning_summary");
		expect(compactMessageLayoutCss).toContain(
			".mes_reasoning_header_block",
		);
		expect(compactMessageLayoutCss).toContain(".mes_reasoning_header");
		expect(compactMessageLayoutCss).toContain(
			".mes_reasoning_header_title",
		);
		expect(compactMessageLayoutCss).toContain(".mes_reasoning");
		expect(compactMessageLayoutCss).toContain(
			".mes_reasoning_actions.flex-container",
		);
		expect(compactMessageLayoutCss).toContain(
			".mes_reasoning_arrow.fa-solid.fa-chevron-up",
		);
		expect(compactMessageLayoutCss).toContain(
			".astra-mesReasoningChevron",
		);
		expect(compactMessageLayoutCss).toContain(
			".astra-mesReasoningSparkle",
		);
		expect(compactMessageLayoutCss).toContain(
			".mes_reasoning_details[open] .astra-mesReasoningChevron",
		);
		expect(compactMessageLayoutCss).toContain(
			".mes_reasoning_details[open] .mes_reasoning_header",
		);
		expect(compactMessageLayoutCss).toContain(
			".mes:has(.mes_reasoning:empty) .astra-mesReasoningChevron",
		);
		expect(messageLayoutCss).toContain("-webkit-backdrop-filter");
		expect(messageLayoutCss).toContain("backdrop-filter");
		expect(messageLayoutCss).toContain("var(--astra-mobile-glass-blur)");
		expect(messageLayoutCss).toContain(
			"var(--astra-mobile-glass-saturate)",
		);
		expect(messageLayoutCss).toContain("var(--border-color-base)");
		expect(messageLayoutCss).toContain("var(--color-base)");
		expect(messageLayoutCss).toContain("var(--color-base-t80)");
	});

	test("imports the chat-scroll stylesheet for the mobile native #chat scrollbar bridge", () => {
		const css = normalizeStyleSource(
			readFileSync(
				resolve(process.cwd(), "src/styles/globals.css"),
				"utf8",
			),
		);
		const chatScrollCss = normalizeStyleSource(
			readFileSync(
				resolve(
					process.cwd(),
					"src/packages/features/chat-session/chat-scroll/chat-scroll.css",
				),
				"utf8",
			),
		);
		const compactChatScrollCss = chatScrollCss.replace(/\s+/g, " ");

		expect(css).toContain(
			"@import '../packages/features/chat-session/chat-scroll/chat-scroll.css';",
		);
		expect(compactChatScrollCss).toContain(
			"body.astra-projecta-mobile-layout {",
		);
		expect(compactChatScrollCss).toContain(
			"& #chat[data-astra-projecta-chat-scroll='native']",
		);
		expect(compactChatScrollCss).toContain(
			"& #chat[data-astra-projecta-chat-scroll='native']::-webkit-scrollbar",
		);
		expect(compactChatScrollCss).toContain(
			"& #chat[data-astra-projecta-chat-scroll='native']::-webkit-scrollbar-thumb",
		);
		expect(chatScrollCss).toContain("--astra-chat-scroll-inline-padding:");
		expect(chatScrollCss).toContain(
			"--astra-chat-scroll-glass-clearance-block-start:",
		);
		expect(chatScrollCss).toContain("--astra-chat-scroll-mask-visible:");
		expect(chatScrollCss).toContain("--astra-chat-scroll-mask-hidden:");
		expect(chatScrollCss).toContain(
			"--astra-chat-scroll-mask-fade-block-start:",
		);
		expect(chatScrollCss).toContain(
			"--astra-chat-scroll-mask-fade-block-end:",
		);
		expect(chatScrollCss).toContain("padding-block-start:");
		expect(compactChatScrollCss).toContain(
			"&[data-astra-projecta-native-popup-active='true'] #chat[data-astra-projecta-chat-scroll='native']",
		);
		expect(chatScrollCss).not.toContain(
			"--astra-chat-scroll-fade-background:",
		);
		expect(chatScrollCss).not.toContain(
			"--astra-chat-scroll-fade-inline-outset:",
		);
		expect(compactChatScrollCss).toContain(
			"#chat[data-astra-projecta-chat-scroll='native'][data-astra-projecta-chat-scroll-y-start]",
		);
		expect(compactChatScrollCss).toContain(
			"#chat[data-astra-projecta-chat-scroll='native'][data-astra-projecta-chat-scroll-y-end]",
		);
		expect(compactChatScrollCss).toContain(
			"#chat[data-astra-projecta-chat-scroll='native'][data-astra-projecta-chat-scroll-y-start][data-astra-projecta-chat-scroll-y-end]",
		);
		expect(compactChatScrollCss).not.toContain(
			"#chat[data-astra-projecta-chat-scroll='native']::before",
		);
		expect(compactChatScrollCss).not.toContain(
			"#chat[data-astra-projecta-chat-scroll='native']::after",
		);
		expect(chatScrollCss).not.toContain(":has(dialog.popup");
		expect(chatScrollCss).not.toContain(":has(#shadow_popup");
		expect(chatScrollCss).not.toContain(":has(#bulk_tag_shadow_popup");
		expect(chatScrollCss).not.toContain(":has(#shadow_select_chat_popup");
		expect(chatScrollCss).toContain("-webkit-mask-image:");
		expect(chatScrollCss).toContain("mask-image:");
		expect(chatScrollCss).not.toContain(
			".astra-scroll-area__viewport #chat",
		);
	});

	test("imports the chat-switch loading stylesheet for the native #sheld overlay", () => {
		const css = normalizeStyleSource(
			readFileSync(
				resolve(process.cwd(), "src/styles/globals.css"),
				"utf8",
			),
		);
		const loadingCss = normalizeStyleSource(
			readFileSync(
				resolve(
					process.cwd(),
					"src/packages/features/chat-session/chat-switch-loading/chat-switch-loading.css",
				),
				"utf8",
			),
		);

		expect(css).toContain(
			"@import '../packages/features/chat-session/chat-switch-loading/chat-switch-loading.css';",
		);
		expect(loadingCss).toContain("body.astra-projecta-mobile-layout {");
		expect(loadingCss).toMatch(
			/#sheld\s*>\s*\.astra-chat-switch-loading-overlay/,
		);
		expect(loadingCss).toContain(
			".astra-chat-switch-loading-overlay[data-state='closing']",
		);
		expect(loadingCss).toContain(
			".astra-chat-switch-loading-overlay__text",
		);
	});

	test("keeps Astra semantic theme tokens inline and static so utilities and emitted variables both work", () => {
		const css = readFileSync(
			resolve(process.cwd(), "src/styles/globals.css"),
			"utf8",
		);

		expect(css).toContain("@theme inline static {");
	});

	test("defines the global Astra theme body contract with SmartTheme mappings", () => {
		const css = readFileSync(
			resolve(process.cwd(), "src/styles/globals.css"),
			"utf8",
		);

		expect(css).toContain("body.astra-projecta-theme {");
		expect(css).toContain("--SmartThemeBodyColor:");
		expect(css).toContain("--SmartThemeBorderColor:");
		expect(css).toContain("--astra-projecta-theme-surface-base:");
	});

	test("defines the base-ui body contract for shadcn tokens and mobile safe area", () => {
		const css = readFileSync(
			resolve(process.cwd(), "src/styles/globals.css"),
			"utf8",
		);

		expect(css).toContain("body.astra-projecta-base-ui-body {");
		expect(css).toContain("--background:");
		expect(css).toContain("--surface-base:");
		expect(css).toContain("--color-base:");
		expect(css).toContain("--color-muted:");
		expect(css).toContain("--warning:");
		expect(css).toContain("--warning-foreground:");
		expect(css).toContain("--color-warning:");
		expect(css).toContain("--color-warning-foreground:");
		expect(css).toContain("--color-danger:");
		expect(css).toContain("--border-color-base:");
		expect(css).toContain("--border-color-accent:");
		expect(css).toContain("--border-width-base:");
		for (const prefix of [
			"--color-base",
			"--color-muted",
			"--color-danger",
			"--color-warning",
			"--color-ring",
			"--border-color-base",
			"--border-color-danger",
			"--border-color-warning",
			"--surface-background",
			"--surface-muted",
			"--surface-accent",
			"--surface-primary",
		]) {
			for (const step of canonicalTintSteps) {
				expect(css).toContain(`${prefix}-${step}:`);
			}
		}
		for (const removedToken of [
			"--surface-base-t10:",
			"--surface-base-t20:",
			"--color-base-t7:",
			"--color-base-t8:",
			"--color-base-t26:",
			"--color-base-t42:",
			"--color-muted-t88:",
			"--color-muted-t92:",
			"--color-muted-t94:",
			"--border-color-base-t72:",
			"--border-color-base-t78:",
			"--border-color-warning-t54:",
			"--border-color-warning-t56:",
			"--color-ring-t35:",
			"--color-ring-t54:",
			"--surface-muted-t42:",
			"--surface-muted-t52:",
			"--surface-accent-t36:",
		]) {
			expect(css).not.toContain(removedToken);
		}
		expect(css).toContain("--popover:");
		expect(css).toContain("--popover-foreground:");
		expect(css).toContain("--safe-bottom:");
		expect(css).toContain("--astra-mobile-visual-viewport-bottom:");
		expect(css).toContain("--astra-mobile-safe-bottom-effective:");
		expect(css).toContain("--astra-mobile-glass-blur:");
		expect(css).toContain("--astra-mobile-glass-saturate:");
		expect(css).toContain("--astra-mobile-glass-top-fade-size:");
		expect(css).toContain("--astra-mobile-glass-bottom-fade-size:");
		expect(css).toContain("--astra-mobile-glass-top-surface:");
		expect(css).toContain("--astra-mobile-glass-bottom-surface:");
		expect(css).toContain(
			"--astra-chat-scroll-glass-clearance-block-start:",
		);
		expect(css).toContain("--astra-icon-size-xs:");
		expect(css).toContain("--astra-icon-size-sm:");
		expect(css).toContain("--astra-icon-size-md:");
		expect(css).toContain("--astra-icon-stroke-width:");
		expect(css).toContain("--astra-button-size-default: 36px;");
		expect(css).toContain("--astra-button-size-sm: 32px;");
		expect(css).toContain(
			"--astra-button-min-size: var(--astra-button-size-default);",
		);
		expect(css).toContain("--astra-button-min-size:");
		expect(css).toContain("--astra-button-icon-size:");
		expect(css).toContain("--astra-avatar-size-min:");
		expect(css).toContain("--astra-avatar-size-dialog-identity:");
		expect(css).toContain("--astra-avatar-size-mobile-top-bar:");
		expect(css).toContain("--astra-avatar-size-mobile-send-form-trigger:");
		expect(css).toContain("--astra-avatar-size-mobile-main-menu-drawer:");
		expect(css).toContain(
			"--astra-avatar-size-sillytavern-interface-title:",
		);
		expect(css).toContain("--astra-avatar-size-main-interface-scope:");
		expect(css).toContain("--astra-avatar-size-main-interface-chat-row:");
		expect(css).toContain("--astra-avatar-size-chat-library-row:");
		expect(css).not.toContain(
			"#form_sheld,\n  #send_form,\n  #mobile-chat-shortcuts-host",
		);
	});
});
