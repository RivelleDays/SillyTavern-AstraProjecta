import { fireEvent, render, screen, within } from "@testing-library/react";
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

	test("renders an idle trigger before SillyTavern marks a prepared context", () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					hasPreparedContext: false,
					status: "idle",
				})}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: "sendForm.contextUsage.trigger.open::Open context usage details",
		});

		expect(trigger).toHaveClass("is-idle");
		expect(trigger).not.toBeDisabled();
		expect(
			trigger.querySelector(
				".astra-chat-context-usage-shortcut__idle-icon",
			),
		).toBeInTheDocument();
	});

	test("renders nothing when the context budget is unavailable", () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					maxContextTokens: 0,
					promptBudgetTokens: 0,
					reservedResponseTokens: 0,
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
				".astra-chat-context-usage-shortcut__loading-dots",
			),
		).toBeInTheDocument();
		expect(
			trigger.querySelectorAll(
				".astra-chat-context-usage-shortcut__loading-dot",
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
					".astra-chat-context-usage-shortcut__loading-dots",
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
			trigger.querySelector(
				".astra-chat-context-usage-shortcut__idle-icon",
			),
		).toBeInTheDocument();

		fireEvent.click(trigger);

		expect(
			await screen.findByText(
				"sendForm.contextUsage.idleHelper::Context usage appears after SillyTavern prepares a Chat Completion prompt.",
			),
		).toBeInTheDocument();
	});

	test("renders ready details with the v2 visual summary", async () => {
		setSillyTavernContext({
			translate: (text: string, key: string) => `${key}::${text}`,
		});
		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		render(
			<MobileChatContextUsageShortcut
				snapshot={createSnapshot({
					characterTokens: 560,
					chatHistoryTokens: 2880,
					hasDetailedBreakdown: false,
					otherPromptTokens: null,
					personaTokens: 320,
					status: "stale",
					usagePercent: 63.28,
					usedContextTokens: 5184,
					usedPromptTokens: 4160,
					worldInfoTokens: 720,
				})}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: "sendForm.contextUsage.trigger.open::Open context usage details",
		});

		expect(trigger).toHaveClass("is-normal");
		expect(trigger).not.toHaveClass("is-stale");
		expect(trigger).toHaveTextContent("63%");

		fireEvent.click(trigger);

		const popover = document.querySelector(
			".astra-chat-context-usage-shortcut__popover",
		) as HTMLElement | null;
		const headerTotal = document.querySelector(
			".astra-chat-context-usage-shortcut__header-total",
		);
		const metricTiles = document.querySelectorAll(
			".astra-chat-context-usage-shortcut__metric-tile",
		);
		const breakdownRows = document.querySelectorAll(
			".astra-chat-context-usage-shortcut__breakdown-row",
		);
		const worldInfoRow = screen
			.getByText("sendForm.contextUsage.breakdown.worldInfo::World info")
			.closest(".astra-chat-context-usage-shortcut__breakdown-row");

		expect(popover).toBeInTheDocument();
		expect(
			screen.queryByText("sendForm.contextUsage.state.stale::stale"),
		).not.toBeInTheDocument();
		expect(
			document.querySelector(
				".astra-chat-context-usage-shortcut__popover-header",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText("sendForm.contextUsage.title::Context Usage"),
		).toBeInTheDocument();
		expect(headerTotal).toHaveTextContent("5,184 / 8,192");
		expect(headerTotal).toHaveTextContent(
			"sendForm.contextUsage.unit.tokens::tokens",
		);
		expect(within(popover!).getAllByText("63%")).toHaveLength(1);
		expect(
			document.querySelector(
				".astra-chat-context-usage-shortcut__summary",
			),
		).not.toBeInTheDocument();
		expect(metricTiles).toHaveLength(4);
		expect(
			screen.getByText("sendForm.contextUsage.metric.usage::Usage"),
		).toBeInTheDocument();
		expect(
			screen.getByText("sendForm.contextUsage.remaining::Remaining"),
		).toBeInTheDocument();
		expect(screen.getByText("3,008")).toBeInTheDocument();
		expect(
			screen.getByText("sendForm.contextUsage.metric.prompt::Prompt"),
		).toBeInTheDocument();
		expect(screen.getByText("4,160 / 7,168")).toBeInTheDocument();
		expect(
			screen.getByText("sendForm.contextUsage.metric.reserve::Reserve"),
		).toBeInTheDocument();
		expect(screen.getByText("1,024")).toBeInTheDocument();
		expect(breakdownRows).toHaveLength(5);
		expect(
			worldInfoRow?.querySelector(".lucide-book-marked"),
		).toBeInTheDocument();
		for (const label of [
			"sendForm.contextUsage.breakdown.chatHistory::Chat history",
			"sendForm.contextUsage.breakdown.worldInfo::World info",
			"sendForm.contextUsage.breakdown.character::Character",
			"sendForm.contextUsage.breakdown.persona::Persona",
			"sendForm.contextUsage.breakdown.other::Other",
		]) {
			expect(screen.getByText(label)).toBeInTheDocument();
		}
		expect(screen.getByText("2,880")).toBeInTheDocument();
		expect(screen.getByText("720")).toBeInTheDocument();
		expect(screen.getByText("560")).toBeInTheDocument();
		expect(screen.getByText("320")).toBeInTheDocument();
		expect(screen.getByText("—")).toBeInTheDocument();
		expect(
			screen.getByText(
				"sendForm.contextUsage.explainer::Usage: (prompt + reserve) / max context",
			),
		).toBeInTheDocument();
		expect(
			document.querySelector(
				".astra-chat-context-usage-shortcut__explainer-icon .lucide-info",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"sendForm.contextUsage.breakdownUnavailable::Detailed token breakdown is unavailable for this snapshot.",
			),
		).toBeInTheDocument();
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
				"sendForm.contextUsage.breakdown.other::Other",
			),
		).toBeInTheDocument();
		expect(screen.getByText("373")).toBeInTheDocument();
		expect(
			screen.getByText("sendForm.contextUsage.metric.prompt::Prompt"),
		).toBeInTheDocument();
		expect(screen.getByText("2,928 / 7,168")).toBeInTheDocument();
	});
});
