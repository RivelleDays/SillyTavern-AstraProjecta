import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";
import type { ChatContextUsageSnapshot } from "@/packages/core/st/chatContextUsage";
import { MobileChatContextUsageShortcut } from "@/packages/features/chat-session/send-form/context-usage/MobileChatContextUsageShortcut";

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function createSnapshot(
	overrides: Partial<ChatContextUsageSnapshot> = {},
): ChatContextUsageSnapshot {
	return {
		activityStatus: "idle",
		characterTokens: null,
		chatHistoryTokens: null,
		hasDetailedBreakdown: false,
		hasPreparedContext: true,
		mainApi: "openai",
		maxContextTokens: 8192,
		otherPromptTokens: null,
		personaTokens: null,
		promptBudgetTokens: 7168,
		reservedResponseTokens: 1024,
		status: "idle",
		updatedAt: 0,
		usagePercent: null,
		usedContextTokens: null,
		usedPromptTokens: null,
		worldInfoTokens: null,
		...overrides,
	};
}

describe("MobileChatContextUsageShortcut", () => {
	test("renders nothing for unsupported providers", () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					mainApi: "kobold",
					status: "unsupported",
				})}
			/>,
		);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	test("renders nothing before SillyTavern marks a prepared context", () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					hasPreparedContext: false,
					status: "ready",
					usagePercent: 42,
					usedContextTokens: 3424,
					usedPromptTokens: 2400,
				})}
			/>,
		);

		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	test("renders a disabled loading trigger while prompt usage is pending", () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					status: "pending",
				})}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: "sendForm.contextUsage.trigger.loading::Loading context usage",
		});

		expect(trigger).toBeDisabled();
		expect(trigger).toHaveClass("is-loading");
		expect(
			trigger.querySelector(
				".mobile-chat-context-usage-shortcut__loading-dots",
			),
		).toBeInTheDocument();
		expect(
			trigger.querySelectorAll(
				".mobile-chat-context-usage-shortcut__loading-dot",
			),
		).toHaveLength(3);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	test.each(["generating", "refreshing"] as const)(
		"keeps the percent trigger while a ready snapshot is %s",
		(activityStatus) => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					activityStatus,
					status: "ready",
					usagePercent: 42,
					usedContextTokens: 3424,
					usedPromptTokens: 2400,
				})}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: "sendForm.contextUsage.trigger.open::Open context usage details",
		});

		expect(trigger).not.toBeDisabled();
		expect(trigger).toHaveClass("is-normal");
		expect(trigger).toHaveTextContent("42%");
		expect(
			trigger.querySelector(
				".mobile-chat-context-usage-shortcut__loading-dots",
			),
		).not.toBeInTheDocument();
		},
	);

	test("renders a disabled unavailable trigger when usage cannot be calculated", () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					status: "unavailable",
				})}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: "sendForm.contextUsage.trigger.unavailable::Context usage unavailable",
		});

		expect(trigger).toBeDisabled();
		expect(trigger).toHaveClass("is-disabled");
		expect(trigger).toHaveTextContent("—");
	});

	test("renders an idle placeholder after context is prepared but before usage is calculated", async () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		render(<MobileChatContextUsageShortcut snapshot={createSnapshot()} />);

		const trigger = screen.getByRole("button", {
			name: "sendForm.contextUsage.trigger.open::Open context usage details",
		});

		expect(trigger).toHaveClass("is-idle");
		expect(trigger).not.toBeDisabled();
		expect(
			trigger.querySelector(".mobile-chat-context-usage-shortcut__idle-icon"),
		).toBeInTheDocument();

		fireEvent.click(trigger);

		expect(
			await screen.findByText(
				"sendForm.contextUsage.idleHelper::Context usage appears after SillyTavern prepares a Chat Completion prompt.",
			),
		).toBeInTheDocument();
	});

	test("renders warning details without stale visual state", async () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					characterTokens: 750,
					chatHistoryTokens: 2000,
					hasDetailedBreakdown: false,
					personaTokens: 500,
					status: "stale",
					usagePercent: 97,
					usedContextTokens: 7946,
					usedPromptTokens: 6922,
					worldInfoTokens: 500,
				})}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: "sendForm.contextUsage.trigger.open::Open context usage details",
		});

		expect(trigger).toHaveClass("is-warning");
		expect(trigger).not.toHaveClass("is-stale");
		expect(trigger).toHaveTextContent("97%");

		fireEvent.click(trigger);

		expect(
			screen.queryByText("sendForm.contextUsage.state.stale::stale"),
		).not.toBeInTheDocument();
		expect(
			document.querySelector(
				".mobile-chat-context-usage-shortcut__popover-header",
			),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(
				"sendForm.contextUsage.title::Context Usage",
			),
		).not.toBeInTheDocument();
		expect(
			screen.getByText(
				"sendForm.contextUsage.field.chatHistory::Chat History",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"sendForm.contextUsage.field.promptUsed::Prompt Manager Total",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"sendForm.contextUsage.breakdownUnavailable::Detailed token breakdown is unavailable for this snapshot.",
			),
		).toBeInTheDocument();

		const responseReserve = screen.getByText(
			"sendForm.contextUsage.field.responseReserve::Response Reserve",
		);
		const promptUsed = screen.getByText(
			"sendForm.contextUsage.field.promptUsed::Prompt Manager Total",
		);

		expect(
			responseReserve.compareDocumentPosition(promptUsed) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	test("renders the full state when the context budget is exhausted", () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					status: "ready",
					usagePercent: 100,
					usedContextTokens: 8192,
					usedPromptTokens: 7168,
				})}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: "sendForm.contextUsage.trigger.open::Open context usage details",
		});

		expect(trigger).toHaveClass("is-full");
		expect(trigger).toHaveTextContent("100%");
	});

	test("renders live Prompt Manager totals with uncategorized prompt tokens", async () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					characterTokens: 750,
					chatHistoryTokens: 1805,
					hasDetailedBreakdown: true,
					otherPromptTokens: 373,
					personaTokens: 0,
					status: "ready",
					usagePercent: 50,
					usedContextTokens: 4976,
					usedPromptTokens: 2928,
					worldInfoTokens: 0,
				})}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", {
				name: "sendForm.contextUsage.trigger.open::Open context usage details",
			}),
		);

		expect(
			await screen.findByText(
				"sendForm.contextUsage.field.otherPrompt::Other Prompt",
			),
		).toBeInTheDocument();
		expect(screen.getByText("373")).toBeInTheDocument();
		expect(
			screen.getByText(
				"sendForm.contextUsage.field.promptUsed::Prompt Manager Total",
			),
		).toBeInTheDocument();
		expect(screen.getByText("2,928 / 7,168")).toBeInTheDocument();
	});
});
