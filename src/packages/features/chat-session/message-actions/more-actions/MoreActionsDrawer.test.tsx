import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import {
	MoreActionsDrawer,
	type MessageActionsTarget,
} from "@/packages/features/chat-session/message-actions/more-actions/MoreActionsDrawer";
import { Delete } from "@/components/ui/shared/icons";

function mockMobileLayout() {
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: vi.fn(() => ({
			addEventListener: vi.fn(),
			matches: true,
			removeEventListener: vi.fn(),
		})),
		writable: true,
	});
}

function createTarget(
	overrides: Partial<MessageActionsTarget> = {},
): MessageActionsTarget {
	return {
		avatarUrl: "/assistant-avatar.png",
		isSystem: false,
		isUser: false,
		messageDisplayId: "#12",
		messageId: 12,
		metadata: {
			bookmarkLink: "Checkpoint #359 - 2025-10-05@16h29m18s",
			generationTime: "4.2s",
			modelIconHtml:
				'<span class="icon-svg timestamp-icon custom-model-icon" title="makersuite - gemini-2.0-flash"><span class="model-glyph"></span></span>',
			modelLabel: "gemini-2.0-flash",
			timestamp: "January 14, 2026 9:03 PM",
			tokenCount: "321 tokens",
		},
		messagePreviewText: "「小蝴蝶，早安。」 Rendered body",
		renderedMessageHtml:
			'<div class="mes_text inline_media"><p><q>「小蝴蝶，早安。」</q><strong>Rendered body</strong></p></div>',
		senderName: "Assistant",
		swipeIndex: 2,
		swipeTotal: 4,
		...overrides,
	};
}

function createActions() {
	return {
		copy: {
			disabled: false,
			onClick: vi.fn(),
		},
		edit: {
			disabled: false,
			onClick: vi.fn(),
		},
		history: {
			disabled: false,
			onClick: vi.fn(),
		},
		promptVisibility: {
			disabled: false,
			isExcluded: false,
			onClick: vi.fn(),
		},
	};
}

describe("MoreActionsDrawer", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
		mockMobileLayout();
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("renders the custom summary, assistant model row, preview, and action footer", async () => {
		const onOpenChange = vi.fn();
		const actions = createActions();

		render(
			<MoreActionsDrawer
				open={true}
				target={createTarget()}
				actions={actions}
				onOpenChange={onOpenChange}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		const title = document.getElementById(
			"astra-message-more-actions-drawer-title",
		);
		const description = document.getElementById(
			"astra-message-more-actions-drawer-description",
		);

		expect(dialog).toHaveAttribute(
			"id",
			"astra-message-more-actions-drawer",
		);
		expect(dialog).toHaveAttribute(
			"aria-labelledby",
			"astra-message-more-actions-drawer-title",
		);
		expect(dialog).toHaveAttribute(
			"aria-describedby",
			"astra-message-more-actions-drawer-description",
		);
		expect(title).toHaveTextContent("Message Actions");
		expect(description).toHaveTextContent(
			"Actions for the selected message.",
		);
		expect(title).toHaveAttribute("data-slot", "drawer-title");
		expect(description).toHaveAttribute("data-slot", "drawer-description");
		expect(dialog).toHaveClass("astra-drawer-surface");
		expect(dialog).toHaveClass("astra-messageMoreActionsDrawer");
		expect(
			dialog.querySelector(
				".astra-dialog-identity.astra-messageMoreActionsDrawer__identity",
			),
		).toBeNull();
		expect(dialog.querySelector(".astra-dialog-icon")).toBeNull();
		expect(dialog.querySelector(".astra-dialog-headingContent")).toBeNull();
		expect(
			dialog.querySelector(
				".astra-dialog-header, .astra-dialog-heading, .astra-dialog-body, .astra-dialog-footer, .astra-dialog-content",
			),
		).toBeNull();

		const header = document.getElementById(
			"astra-message-more-actions-drawer-header",
		);
		const summary = header?.querySelector(
			":scope > .astra-messageMoreActionsDrawer__summary",
		);
		const identityMain = summary?.querySelector(
			".astra-messageMoreActionsDrawer__identityMain",
		);
		const identityAvatar = identityMain?.querySelector(
			".astra-messageMoreActionsDrawer__identityAvatar",
		);
		const identityText = summary?.querySelector(
			".astra-messageMoreActionsDrawer__identityText",
		);
		const identityNameRow = identityText?.querySelector(
			":scope > .astra-messageMoreActionsDrawer__identityNameRow",
		);
		const identityBadges = identityMain?.querySelector(
			":scope > .astra-messageMoreActionsDrawer__identityBadges",
		);
		const identityMetaLine = identityText?.querySelector(
			":scope > .astra-messageMoreActionsDrawer__identityMetaLine",
		);

		expect(summary).toBeInTheDocument();
		expect(identityMain).toBeInTheDocument();
		expect(identityMain).toHaveClass("astra-dialog-identity");
		expect(identityAvatar).toHaveClass("astra-dialog-identityAvatar");
		expect(summary?.querySelector("img")).toHaveClass(
			"astra-dialog-identityImage",
		);
		expect(identityText).toBeInTheDocument();
		expect(identityNameRow).toBeInTheDocument();
		expect(identityBadges).toBeInTheDocument();
		expect(
			identityNameRow?.querySelector(
				":scope > .astra-messageMoreActionsDrawer__identityBadges",
			),
		).toBeNull();
		expect(identityMain?.lastElementChild).toBe(identityBadges);
		expect(identityMetaLine).toBeNull();
		expect(identityText?.lastElementChild).toBe(identityNameRow);
		expect(summary?.querySelector("img")).toHaveAttribute(
			"src",
			"/assistant-avatar.png",
		);
		expect(summary?.querySelector("img")).not.toHaveAttribute("width");
		expect(summary?.querySelector("img")).not.toHaveAttribute("height");
		expect(
			within(identityNameRow as HTMLElement).getByText("Assistant"),
		).toBeInTheDocument();
		expect(
			identityNameRow?.querySelector(
				".astra-messageMoreActionsDrawer__identityName",
			),
		).toHaveClass("astra-dialog-identityName");
		expect(
			within(header as HTMLElement).queryByText(
				"January 14, 2026 9:03 PM",
			),
		).toBeNull();
		expect(
			within(identityBadges as HTMLElement).getByLabelText("Message: 12"),
		).toHaveTextContent("12");
		expect(
			within(identityBadges as HTMLElement).getByLabelText(
				"Message tokens: 321 tokens",
			),
		).toHaveTextContent("321 tokens");
		expect(
			identityBadges?.querySelector(".lucide-braces"),
		).toBeInTheDocument();
		expect(
			identityBadges?.querySelector(
				".astra-messageMoreActionsDrawer__identityBadge",
			),
		).toHaveClass("astra-dialog-identityMesBadge");
		expect(
			within(identityBadges as HTMLElement).queryByLabelText("Swipe: 3"),
		).toBeNull();
		expect(within(header as HTMLElement).queryByText("4.2s")).toBeNull();
		expect(
			within(header as HTMLElement).queryByText("gemini-2.0-flash"),
		).toBeNull();

		const detailSection = document.getElementById(
			"astra-message-more-actions-drawer-heading",
		);
		const detailRows = Array.from(
			detailSection?.querySelectorAll(
				".astra-messageMoreActionsDrawer__detailRow",
			) ?? [],
		);
		const separators = Array.from(
			detailSection?.querySelectorAll(
				".astra-messageMoreActionsDrawer__detailSeparator",
			) ?? [],
		);
		const sentRow = detailRows.find((row) =>
			row.textContent?.includes("Sent"),
		);
		const modelRow = detailRows.find((row) =>
			row.textContent?.includes("Model"),
		);
		const generationRow = detailRows.find((row) =>
			row.textContent?.includes("Generation time"),
		);
		const modelName = modelRow?.querySelector(
			".astra-messageMoreActionsDrawer__modelName",
		);
		const modelIcon = modelName?.querySelector(
			".astra-messageMoreActionsDrawer__modelIcon .timestamp-icon.custom-model-icon",
		);
		const modelStats = generationRow?.querySelector(
			".astra-messageMoreActionsDrawer__modelStats",
		);
		const generationTime = modelStats?.querySelector(
			".astra-messageMoreActionsDrawer__modelStatsValue",
		);

		expect(detailSection).toBeInTheDocument();
		expect(detailSection).toHaveClass(
			"astra-messageMoreActionsDrawer__heading",
			"astra-messageMoreActionsDrawer__detailSection",
			"astra-messageMoreActionsDrawer__modelDataRow",
		);
		expect(header?.nextElementSibling).toBe(detailSection);
		expect(detailRows).toHaveLength(3);
		expect(separators).toHaveLength(2);
		expect(
			within(sentRow as HTMLElement).getByText("Sent"),
		).toBeInTheDocument();
		expect(
			within(sentRow as HTMLElement).getByText(
				"January 14, 2026 9:03 PM",
			),
		).toBeInTheDocument();
		expect(
			sentRow?.querySelector(
				".astra-messageMoreActionsDrawer__detailIcon--sent",
			),
		).toBeInTheDocument();
		expect(
			within(modelRow as HTMLElement).getByText("Model"),
		).toBeInTheDocument();
		expect(
			modelRow?.querySelector(
				".astra-messageMoreActionsDrawer__detailIcon--model",
			),
		).toBeInTheDocument();
		expect(
			within(generationRow as HTMLElement).getByText("Generation time"),
		).toBeInTheDocument();
		expect(
			generationRow?.querySelector(
				".astra-messageMoreActionsDrawer__detailIcon--generation",
			),
		).toBeInTheDocument();
		expect(
			detailSection?.querySelector(
				".astra-messageMoreActionsDrawer__metadataHeading",
			),
		).toBeNull();
		expect(modelName).toHaveClass(
			"astra-messageMoreActionsDrawer__modelName",
		);
		expect(modelName).not.toHaveClass("astra-mesModel");
		expect(modelName).toHaveTextContent("gemini-2.0-flash");
		expect(modelName?.querySelector(".astra-mesModel__label")).toBeNull();
		expect(
			modelName?.querySelector(
				".astra-messageMoreActionsDrawer__modelLabel",
			),
		).toHaveTextContent("gemini-2.0-flash");
		expect(modelName?.querySelector(".lucide-bot")).toBeNull();
		expect(modelIcon).toBeInTheDocument();
		expect(modelIcon).toHaveClass("icon-svg");
		expect(modelIcon).toHaveAttribute(
			"title",
			"makersuite - gemini-2.0-flash",
		);
		expect(modelIcon?.querySelector(".model-glyph")).toBeInTheDocument();
		expect(generationTime).toHaveTextContent("4.2s");
		expect(generationTime).toHaveAttribute(
			"aria-label",
			"Generation time: 4.2s",
		);
		expect(
			within(dialog).queryByText(
				"Checkpoint #359 - 2025-10-05@16h29m18s",
			),
		).toBeNull();
		expect(dialog.querySelector("[aria-expanded]")).toBeNull();

		const body = document.getElementById(
			"astra-message-more-actions-drawer-body",
		);
		const scrollableContent = document.getElementById(
			"astra-message-more-actions-drawer-scrollable-content",
		);
		const content = document.getElementById(
			"astra-message-more-actions-drawer-content",
		);
		const preview = content?.querySelector(
			'.astra-messageMoreActionsDrawer__messagePreview.mes[data-astra-message-preview="true"]',
		);
		const renderedMessage = preview?.querySelector(
			".mes_text.inline_media",
		);
		expect(renderedMessage?.querySelector("q")).toHaveTextContent(
			"「小蝴蝶，早安。」",
		);
		expect(renderedMessage?.querySelector("strong")).toHaveTextContent(
			"Rendered body",
		);

		expect(body).toHaveClass("astra-messageMoreActionsDrawer__body");
		expect(scrollableContent).toHaveClass(
			"astra-messageMoreActionsDrawer__scrollableContent",
		);
		expect(content).toHaveClass("astra-messageMoreActionsDrawer__content");
		const footer = document.getElementById(
			"astra-message-more-actions-drawer-footer",
		);
		expect(footer).toHaveClass("astra-messageMoreActionsDrawer__footer");
		const footerButtons = within(footer as HTMLElement).getAllByRole(
			"button",
		);
		expect(footerButtons).toHaveLength(5);
		expect(
			footerButtons.map((button) => button.getAttribute("aria-label")),
		).toEqual([
			"Copy message text",
			"Exclude message from prompts",
			"More actions",
			"Revision history",
			"Edit message",
		]);
		expect(
			within(footer as HTMLElement).getByText("Copy"),
		).toBeInTheDocument();
		expect(
			within(footer as HTMLElement).getByText("Exclude"),
		).toBeInTheDocument();
		expect(
			within(footer as HTMLElement).getByText("History"),
		).toBeInTheDocument();
		expect(
			within(footer as HTMLElement).getByText("Edit"),
		).toBeInTheDocument();
		expect(within(footer as HTMLElement).queryByText("More")).toBeNull();
		expect(
			within(footer as HTMLElement).queryByRole("button", {
				name: "Close",
			}),
		).toBeNull();
		expect(footerButtons[0]).toHaveClass(
			"astra-messageMoreActionsDrawer__footerAction",
		);
		expect(footerButtons[2]).toHaveClass(
			"astra-messageMoreActionsDrawer__footerMoreAction",
		);
		expect(footerButtons[2]).not.toHaveClass(
			"astra-messageMoreActionsDrawer__footerAction",
		);
		expect(footerButtons[2]).toBeDisabled();
		expect(
			footerButtons[2].querySelector(
				".astra-messageMoreActionsDrawer__footerMorePill",
			),
		).toBeInTheDocument();
		expect(
			footerButtons[2].querySelector(
				".astra-messageMoreActionsDrawer__footerMoreActionIcon",
			),
		).toBeInTheDocument();
		expect(
			footerButtons[2].querySelector(
				".astra-messageMoreActionsDrawer__footerActionIcon",
			),
		).toBeNull();
		expect(footer?.querySelector(".lucide-clipboard")).toBeInTheDocument();
		expect(footer?.querySelector(".lucide-eye")).toBeInTheDocument();
		expect(footer?.querySelector(".lucide-eye-off")).toBeNull();
		expect(footer?.querySelector(".lucide-plus")).toBeInTheDocument();
		expect(footer?.querySelector(".lucide-history")).toBeInTheDocument();
		expect(
			footer?.querySelector(".lucide-pencil-line"),
		).toBeInTheDocument();

		footerButtons[0].click();
		footerButtons[1].click();
		footerButtons[3].click();
		footerButtons[4].click();
		expect(actions.copy.onClick).toHaveBeenCalledTimes(1);
		expect(actions.promptVisibility.onClick).toHaveBeenCalledTimes(1);
		expect(actions.history.onClick).toHaveBeenCalledTimes(1);
		expect(actions.edit.onClick).toHaveBeenCalledTimes(1);
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	test("loads a sanitized provider SVG when the model row has no native timestamp icon clone", async () => {
		const fetchProviderIcon = vi.fn(async () => ({
			ok: true,
			text: async () =>
				'<svg viewBox="0 0 24 24" onload="alert(1)"><defs><linearGradient id="paint"><stop offset="0%" /></linearGradient></defs><script>alert(1)</script><path onclick="alert(1)" fill="url(#paint)" d="M4 12h16" /></svg>',
		}));
		vi.stubGlobal("fetch", fetchProviderIcon);

		render(
			<MoreActionsDrawer
				open={true}
				target={createTarget({
					metadata: {
						modelIconKey: "astra-test-provider-ready",
						modelLabel: "gemini-2.5-pro",
					},
				})}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		const modelName = dialog.querySelector(
			".astra-messageMoreActionsDrawer__modelName",
		);

		await waitFor(() => {
			expect(
				modelName?.querySelector(
					".astra-messageMoreActionsDrawer__modelIcon svg",
				),
			).toBeInTheDocument();
		});

		const svg = modelName?.querySelector("svg");
		const path = modelName?.querySelector("path");
		expect(fetchProviderIcon).toHaveBeenCalledWith(
			"/img/astra-test-provider-ready.svg",
		);
		expect(modelName).toHaveTextContent("gemini-2.5-pro");
		expect(svg).not.toHaveAttribute("onload");
		expect(svg?.querySelector("script")).toBeNull();
		expect(path).not.toHaveAttribute("onclick");
		expect(path?.getAttribute("fill")).toMatch(
			/^url\(#astra-provider-icon-/,
		);
	});

	test("keeps the model label visible when provider SVG fallback loading fails", async () => {
		const fetchProviderIcon = vi.fn(async () => ({
			ok: false,
			text: async () => "",
		}));
		vi.stubGlobal("fetch", fetchProviderIcon);

		render(
			<MoreActionsDrawer
				open={true}
				target={createTarget({
					metadata: {
						modelIconKey: "astra-test-provider-missing",
						modelLabel: "gemini-2.5-pro",
					},
				})}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		const modelName = dialog.querySelector(
			".astra-messageMoreActionsDrawer__modelName",
		);

		await waitFor(() => {
			expect(fetchProviderIcon).toHaveBeenCalledWith(
				"/img/astra-test-provider-missing.svg",
			);
		});
		await waitFor(() => {
			expect(
				modelName?.querySelector(
					".astra-messageMoreActionsDrawer__modelIcon",
				),
			).toBeNull();
		});
		expect(modelName).toHaveTextContent("gemini-2.5-pro");
	});

	test("renders an icon-only extra action strip above the body", async () => {
		const deleteSwipe = vi.fn();
		const translateMessage = vi.fn();

		render(
			<MoreActionsDrawer
				open={true}
				target={createTarget()}
				actions={createActions()}
				extraActions={[
					{
						id: "delete-swipe",
						icon: Delete,
						label: "Delete current swipe",
						onClick: deleteSwipe,
						variant: "danger",
					},
					{
						iconClassName: "fa-solid fa-language",
						id: "native-translate",
						label: "Translate message",
						onClick: translateMessage,
						variant: "native",
					},
				]}
				onOpenChange={() => {}}
			/>,
		);

		await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		const body = document.getElementById(
			"astra-message-more-actions-drawer-body",
		);
		const strip = document.getElementById(
			"astra-message-more-actions-drawer-extra-actions",
		);
		const viewport = document.getElementById(
			"astra-message-more-actions-drawer-extra-actions-viewport",
		);
		const content = document.getElementById(
			"astra-message-more-actions-drawer-extra-actions-content",
		);
		const scrollbar = document.getElementById(
			"astra-message-more-actions-drawer-extra-actions-scrollbar",
		);
		const footer = document.getElementById(
			"astra-message-more-actions-drawer-footer",
		);

		expect(strip).toHaveClass(
			"astra-messageMoreActionsDrawer__extraActions",
		);
		expect(strip).toHaveAttribute(
			"aria-label",
			"Additional message actions",
		);
		expect(viewport).toHaveClass(
			"astra-messageMoreActionsDrawer__extraActionsViewport",
		);
		expect(content).toHaveClass(
			"astra-messageMoreActionsDrawer__extraActionsContent",
		);
		expect(scrollbar).toHaveClass(
			"astra-messageMoreActionsDrawer__extraActionsScrollbar",
		);
		expect(
			Boolean(
				body &&
				strip &&
				strip.compareDocumentPosition(body) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			),
		).toBe(true);
		expect(
			Boolean(
				body &&
				footer &&
				body.compareDocumentPosition(footer) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			),
		).toBe(true);

		const buttons = within(content as HTMLElement).getAllByRole("button");
		expect(
			buttons.map((button) => button.getAttribute("aria-label")),
		).toEqual(["Delete current swipe", "Translate message"]);
		expect(buttons[0]).toHaveClass(
			"astra-messageMoreActionsDrawer__extraActionButton",
			"astra-messageMoreActionsDrawer__extraActionButton--danger",
		);
		expect(buttons[1]).toHaveClass(
			"astra-messageMoreActionsDrawer__extraActionButton",
			"astra-messageMoreActionsDrawer__extraActionButton--native",
		);
		expect(
			buttons[0].querySelector(
				".astra-messageExtraActionsDrawer__actionIcon",
			),
		).toBeInTheDocument();
		expect(
			buttons[1].querySelector(
				".astra-messageExtraActionsDrawer__actionIcon",
			),
		).toBeInTheDocument();
		expect(buttons[0].textContent).toBe("");
		expect(buttons[1].textContent).toBe("");
		expect(buttons[0].querySelector(".lucide-delete")).toBeInTheDocument();
		expect(buttons[1].querySelector(".fa-language")).toBeInTheDocument();

		buttons[0].click();
		buttons[1].click();
		expect(deleteSwipe).toHaveBeenCalledTimes(1);
		expect(translateMessage).toHaveBeenCalledTimes(1);
	});

	test("enables the center More footer button only when a More action is provided", async () => {
		const moreAction = vi.fn();
		const { rerender } = render(
			<MoreActionsDrawer
				open={true}
				target={createTarget()}
				actions={createActions()}
				onOpenChange={() => {}}
			/>,
		);

		const disabledFooter = document.getElementById(
			"astra-message-more-actions-drawer-footer",
		);
		const disabledMoreButton = within(
			disabledFooter as HTMLElement,
		).getByRole("button", {
			name: "More actions",
		});
		expect(disabledMoreButton).toBeDisabled();

		rerender(
			<MoreActionsDrawer
				open={true}
				target={createTarget()}
				actions={{
					...createActions(),
					more: {
						disabled: false,
						onClick: moreAction,
					},
				}}
				onOpenChange={() => {}}
			/>,
		);

		const enabledFooter = document.getElementById(
			"astra-message-more-actions-drawer-footer",
		);
		const enabledMoreButton = within(
			enabledFooter as HTMLElement,
		).getByRole("button", {
			name: "More actions",
		});
		expect(enabledMoreButton).not.toBeDisabled();

		enabledMoreButton.click();
		expect(moreAction).toHaveBeenCalledTimes(1);
	});

	test("uses Include copy for messages excluded from prompts", async () => {
		const actions = createActions();
		actions.promptVisibility.isExcluded = true;

		render(
			<MoreActionsDrawer
				open={true}
				target={createTarget({ isSystem: true })}
				actions={actions}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		const footer = document.getElementById(
			"astra-message-more-actions-drawer-footer",
		);
		const includeButton = within(footer as HTMLElement).getByRole(
			"button",
			{
				name: "Include message in prompts",
			},
		);
		const heading = document.getElementById(
			"astra-message-more-actions-drawer-heading",
		);

		expect(within(dialog).getByText("Include")).toBeInTheDocument();
		expect(heading).toHaveClass(
			"astra-messageMoreActionsDrawer__modelDataRow",
		);
		expect(heading).toHaveClass(
			"astra-messageMoreActionsDrawer__detailSection",
		);
		expect(heading).not.toHaveClass("sr-only");
		expect(
			heading?.querySelector(
				".astra-messageMoreActionsDrawer__detailRow",
			),
		).toBeInTheDocument();
		expect(
			heading?.querySelector(
				".astra-messageMoreActionsDrawer__modelName",
			),
		).toHaveTextContent("gemini-2.0-flash");
		expect(
			heading?.querySelector(
				".astra-messageMoreActionsDrawer__modelStats",
			),
		).toHaveTextContent("4.2s");
		expect(within(footer as HTMLElement).queryByText("Exclude")).toBeNull();
		expect(
			includeButton.querySelector(".lucide-eye-off"),
		).toBeInTheDocument();
		expect(includeButton.querySelector(".lucide-eye-closed")).toBeNull();
		expect(includeButton.querySelector(".lucide-eye")).toBeNull();
	});

	test("hides absent optional metadata without placeholders", async () => {
		render(
			<MoreActionsDrawer
				open={true}
				target={createTarget({
					metadata: {},
				})}
				onOpenChange={() => {}}
			/>,
		);

		const dialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		const header = document.getElementById(
			"astra-message-more-actions-drawer-header",
		);
		const identityText = header?.querySelector(
			".astra-messageMoreActionsDrawer__identityText",
		);
		const heading = document.getElementById(
			"astra-message-more-actions-drawer-heading",
		);

		expect(
			dialog.querySelector(
				".astra-messageMoreActionsDrawer__metadataHeading",
			),
		).toBeNull();
		expect(
			header?.querySelector(".astra-messageMoreActionsDrawer__summary"),
		).toBeInTheDocument();
		expect(
			within(header as HTMLElement).getByText("Assistant"),
		).toBeInTheDocument();
		expect(
			identityText?.querySelector(
				":scope > .astra-messageMoreActionsDrawer__identityMetaLine",
			),
		).toBeNull();
		expect(
			header?.querySelector(
				".astra-messageMoreActionsDrawer__identityTimestamp",
			),
		).toBeNull();
		expect(
			header?.querySelector(".astra-messageMoreActionsDrawer__modelName"),
		).toBeNull();
		expect(
			header?.querySelector(
				".astra-messageMoreActionsDrawer__identityBadges",
			),
		).toBeInTheDocument();
		expect(
			within(header as HTMLElement).queryByLabelText(/Message tokens:/),
		).toBeNull();
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveClass("astra-messageMoreActionsDrawer__heading");
		expect(heading).toHaveClass("sr-only");
		expect(heading).not.toHaveClass(
			"astra-messageMoreActionsDrawer__detailSection",
		);
		expect(heading).not.toHaveClass(
			"astra-messageMoreActionsDrawer__modelDataRow",
		);
		expect(
			heading?.querySelector(
				".astra-messageMoreActionsDrawer__modelName",
			),
		).toBeNull();
		expect(
			heading?.querySelector(
				".astra-messageMoreActionsDrawer__modelStats",
			),
		).toBeNull();
		expect(dialog.querySelector(".astra-dialog-icon")).toBeNull();
		expect(dialog.querySelector(".astra-dialog-headingContent")).toBeNull();
		expect(
			dialog.querySelector(
				".astra-dialog-header, .astra-dialog-heading, .astra-dialog-body, .astra-dialog-footer, .astra-dialog-content",
			),
		).toBeNull();
	});

	test("renders only available model-row values for normal assistant messages", async () => {
		const { rerender } = render(
			<MoreActionsDrawer
				open={true}
				target={createTarget({
					metadata: {
						generationTime: "4.2s",
					},
				})}
				onOpenChange={() => {}}
			/>,
		);

		const generationOnlyDialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		let modelRow = generationOnlyDialog.querySelector(
			"#astra-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__modelDataRow",
		);
		expect(modelRow).toBeInTheDocument();
		expect(modelRow).toHaveClass(
			"astra-messageMoreActionsDrawer__detailSection",
		);
		expect(
			modelRow?.querySelector(
				".astra-messageMoreActionsDrawer__modelName",
			),
		).toBeNull();
		expect(
			within(modelRow as HTMLElement).getByText("4.2s"),
		).toBeInTheDocument();

		rerender(
			<MoreActionsDrawer
				open={true}
				target={createTarget({
					metadata: {
						modelIconHtml:
							'<span class="icon-svg timestamp-icon custom-model-icon" title="makersuite - gemini-2.0-flash"></span>',
						modelLabel: "gemini-2.0-flash",
					},
				})}
				onOpenChange={() => {}}
			/>,
		);

		const modelOnlyDialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		modelRow = modelOnlyDialog.querySelector(
			"#astra-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__modelDataRow",
		);
		expect(modelRow).toBeInTheDocument();
		expect(modelRow).toHaveClass(
			"astra-messageMoreActionsDrawer__detailSection",
		);
		expect(
			within(modelRow as HTMLElement).getByText("gemini-2.0-flash"),
		).toBeInTheDocument();
		expect(
			modelRow?.querySelector(
				".astra-messageMoreActionsDrawer__modelStats",
			),
		).toBeNull();
	});

	test("renders the model row for user and system messages when model metadata exists", async () => {
		const { rerender } = render(
			<MoreActionsDrawer
				open={true}
				target={createTarget({
					isUser: true,
				})}
				onOpenChange={() => {}}
			/>,
		);

		const userDialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		const userHeading = document.getElementById(
			"astra-message-more-actions-drawer-heading",
		);
		expect(
			userDialog.querySelector(
				"#astra-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__modelDataRow",
			),
		).toBeInTheDocument();
		expect(userHeading).not.toHaveClass("sr-only");
		expect(
			within(userDialog).getByText("gemini-2.0-flash"),
		).toBeInTheDocument();
		expect(within(userDialog).getByText("4.2s")).toBeInTheDocument();

		rerender(
			<MoreActionsDrawer
				open={true}
				target={createTarget({
					isSystem: true,
				})}
				onOpenChange={() => {}}
			/>,
		);

		const systemDialog = await screen.findByRole("dialog", {
			name: "Message Actions",
		});
		const systemHeading = document.getElementById(
			"astra-message-more-actions-drawer-heading",
		);
		expect(
			systemDialog.querySelector(
				"#astra-message-more-actions-drawer-heading.astra-messageMoreActionsDrawer__modelDataRow",
			),
		).toBeInTheDocument();
		expect(systemHeading).not.toHaveClass("sr-only");
		expect(
			within(systemDialog).getByText("gemini-2.0-flash"),
		).toBeInTheDocument();
		expect(within(systemDialog).getByText("4.2s")).toBeInTheDocument();
	});
});
