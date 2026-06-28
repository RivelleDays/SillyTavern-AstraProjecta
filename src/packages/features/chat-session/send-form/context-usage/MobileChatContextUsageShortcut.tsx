import * as React from "react";

import { UiIcon } from "@/components/ui/shared/icon";
import {
	BookMarked,
	CircleUser,
	DatabaseZap,
	Info,
	Loader,
	MessageCircleDashed,
	MessagesSquare,
	Sparkles,
	SquareDashed,
	SquareTerminal,
	type LucideIcon,
} from "@/components/ui/shared/icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/shared/popover";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatContextUsageSnapshot } from "@/packages/core/st/chatContextUsage";
import {
	formatContextUsagePercent,
	formatContextUsageTokenCount,
	hasUsableContextUsage,
	resolveContextUsageVisualState,
	shouldShowContextUsageShortcut,
} from "@/packages/features/chat-session/send-form/context-usage/presentation";

function ContextUsageLoadingDots(): React.ReactElement {
	return (
		<span
			aria-hidden={true}
			className="astra-chat-context-usage-shortcut__loading-dots"
		>
			<span className="astra-chat-context-usage-shortcut__loading-dot" />
			<span className="astra-chat-context-usage-shortcut__loading-dot" />
			<span className="astra-chat-context-usage-shortcut__loading-dot" />
		</span>
	);
}

function formatContextUsageTokenRatio(
	value: number | null,
	maxValue: number,
): string {
	return `${formatContextUsageTokenCount(value)} / ${formatContextUsageTokenCount(maxValue)}`;
}

function getContextUsageBreakdownPercent(
	value: number | null,
	denominator: number | null,
): number {
	if (value == null || denominator == null || denominator <= 0) {
		return 0;
	}

	return Math.min(100, Math.max(0, (value / denominator) * 100));
}

function ContextUsageMetricTile({
	icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
}): React.ReactElement {
	return (
		<div className="astra-chat-context-usage-shortcut__metric-tile">
			<div className="astra-chat-context-usage-shortcut__metric-label">
				<span
					aria-hidden={true}
					className="astra-chat-context-usage-shortcut__metric-icon"
				>
					<UiIcon icon={icon} size="sm" strokeWidth={2.25} />
				</span>
				<span>{label}</span>
			</div>
			<div className="astra-chat-context-usage-shortcut__metric-value">
				{value}
			</div>
		</div>
	);
}

function ContextUsageBreakdownRow({
	denominator,
	icon,
	label,
	value,
}: {
	denominator: number | null;
	icon: LucideIcon;
	label: string;
	value: number | null;
}): React.ReactElement {
	const percent = getContextUsageBreakdownPercent(value, denominator);

	return (
		<div className="astra-chat-context-usage-shortcut__breakdown-row">
			<div className="astra-chat-context-usage-shortcut__breakdown-name">
				<span
					aria-hidden={true}
					className="astra-chat-context-usage-shortcut__breakdown-icon"
				>
					<UiIcon icon={icon} size="sm" strokeWidth={2.25} />
				</span>
				<span>{label}</span>
			</div>
			<div
				aria-hidden={true}
				className="astra-chat-context-usage-shortcut__breakdown-track"
			>
				<span
					className="astra-chat-context-usage-shortcut__breakdown-fill"
					style={
						{
							"--context-usage-breakdown-value": `${percent}%`,
						} as React.CSSProperties
					}
				/>
			</div>
			<div className="astra-chat-context-usage-shortcut__breakdown-value">
				{formatContextUsageTokenCount(value)}
			</div>
		</div>
	);
}

export function MobileChatContextUsageShortcut({
	snapshot,
}: {
	snapshot: ChatContextUsageSnapshot;
}): React.ReactElement | null {
	const isUsageReady = hasUsableContextUsage(snapshot);
	if (!shouldShowContextUsageShortcut(snapshot)) {
		return null;
	}

	const visualState = resolveContextUsageVisualState(snapshot, isUsageReady);
	const isLoading = visualState === "loading";
	const isIdle = visualState === "idle";
	const isDisabled = visualState === "disabled" || isLoading;
	const clampedUsagePercent = Math.min(
		100,
		Math.max(0, snapshot.usagePercent ?? 0),
	);
	const percentLabel = isUsageReady
		? formatContextUsagePercent(clampedUsagePercent)
		: "—";
	const unavailableLabel = translateAstra(
		"sendForm.contextUsage.trigger.unavailable",
	);
	const loadingLabel = translateAstra(
		"sendForm.contextUsage.trigger.loading",
	);
	const openLabel = translateAstra("sendForm.contextUsage.trigger.open");
	const idleHelper = translateAstra("sendForm.contextUsage.idleHelper");
	const breakdownUnavailable = translateAstra(
		"sendForm.contextUsage.breakdownUnavailable",
	);
	const title = translateAstra("sendForm.contextUsage.title");
	const remainingLabel = translateAstra("sendForm.contextUsage.remaining");
	const explainer = translateAstra("sendForm.contextUsage.explainer");
	const tokensUnit = translateAstra("sendForm.contextUsage.unit.tokens");
	const metricUsage = translateAstra("sendForm.contextUsage.metric.usage");
	const metricPrompt = translateAstra("sendForm.contextUsage.metric.prompt");
	const metricReserve = translateAstra("sendForm.contextUsage.metric.reserve");
	const breakdownItems = [
		{
			icon: MessagesSquare,
			key: "chat-history",
			label: translateAstra(
				"sendForm.contextUsage.breakdown.chatHistory",
			),
			value: snapshot.chatHistoryTokens,
		},
		{
			icon: BookMarked,
			key: "world-info",
			label: translateAstra("sendForm.contextUsage.breakdown.worldInfo"),
			value: snapshot.worldInfoTokens,
		},
		{
			icon: Sparkles,
			key: "character",
			label: translateAstra("sendForm.contextUsage.breakdown.character"),
			value: snapshot.characterTokens,
		},
		{
			icon: CircleUser,
			key: "persona",
			label: translateAstra("sendForm.contextUsage.breakdown.persona"),
			value: snapshot.personaTokens,
		},
		{
			icon: SquareDashed,
			key: "other",
			label: translateAstra("sendForm.contextUsage.breakdown.other"),
			value: snapshot.otherPromptTokens,
		},
	] as const;
	const remainingContextTokens =
		snapshot.usedContextTokens == null
			? null
			: Math.max(0, snapshot.maxContextTokens - snapshot.usedContextTokens);

	const triggerClassName = cn(
		"astra-chat-context-usage-shortcut__trigger",
		`is-${visualState}`,
	);

	const triggerBody = isLoading ? (
		<ContextUsageLoadingDots />
	) : (
		<>
			{isUsageReady ? (
				<span
					aria-hidden={true}
					className="astra-chat-context-usage-shortcut__ring"
					style={
						{
							"--context-usage-value": clampedUsagePercent,
						} as React.CSSProperties
					}
				/>
			) : null}
			<span className="astra-chat-context-usage-shortcut__label">
				{isIdle ? (
					<UiIcon
						aria-hidden={true}
						className="astra-chat-context-usage-shortcut__idle-icon"
						icon={Info}
						size="sm"
						strokeWidth={2.25}
					/>
				) : (
					percentLabel
				)}
			</span>
		</>
	);

	if (isDisabled) {
		const label = isLoading ? loadingLabel : unavailableLabel;

		return (
			<button
				aria-label={label}
				className={triggerClassName}
				data-slot="astra-chat-context-usage-shortcut"
				disabled={true}
				title={label}
				type="button"
			>
				{triggerBody}
			</button>
		);
	}

	return (
		<Popover>
			<PopoverTrigger
				aria-label={openLabel}
				className={triggerClassName}
				data-slot="astra-chat-context-usage-shortcut"
				title={openLabel}
				type="button"
			>
				{triggerBody}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className={cn(
					"astra-chat-context-usage-shortcut__popover",
					`is-${visualState}`,
				)}
				side="top"
				sideOffset={10}
			>
				{isIdle ? (
					<div className="astra-chat-context-usage-shortcut__popover-body">
						<p className="astra-chat-context-usage-shortcut__helper is-alert">
							{idleHelper}
						</p>
					</div>
				) : (
					<div className="astra-chat-context-usage-shortcut__popover-body">
						<div className="astra-chat-context-usage-shortcut__popover-header">
							<div className="astra-chat-context-usage-shortcut__header-title">
								<span
									aria-hidden={true}
									className="astra-chat-context-usage-shortcut__header-icon"
								>
									<UiIcon
										icon={DatabaseZap}
										size="sm"
										strokeWidth={2.25}
									/>
								</span>
								<div className="astra-chat-context-usage-shortcut__header-copy">
									<span className="astra-chat-context-usage-shortcut__header-kicker">
										{title}
									</span>
									<span className="astra-chat-context-usage-shortcut__header-total">
										{formatContextUsageTokenRatio(
											snapshot.usedContextTokens,
											snapshot.maxContextTokens,
										)}{" "}
										{tokensUnit}
									</span>
								</div>
							</div>
						</div>
						<div className="astra-chat-context-usage-shortcut__metric-grid">
							<ContextUsageMetricTile
								icon={DatabaseZap}
								label={metricUsage}
								value={formatContextUsagePercent(
									snapshot.usagePercent,
								)}
							/>
							<ContextUsageMetricTile
								icon={Loader}
								label={remainingLabel}
								value={formatContextUsageTokenCount(
									remainingContextTokens,
								)}
							/>
							<ContextUsageMetricTile
								icon={SquareTerminal}
								label={metricPrompt}
								value={formatContextUsageTokenRatio(
									snapshot.usedPromptTokens,
									snapshot.promptBudgetTokens,
								)}
							/>
							<ContextUsageMetricTile
								icon={MessageCircleDashed}
								label={metricReserve}
								value={formatContextUsageTokenCount(
									snapshot.reservedResponseTokens,
								)}
							/>
						</div>
						<div className="astra-chat-context-usage-shortcut__breakdown">
							{breakdownItems.map(({ icon, key, label, value }) => (
								<ContextUsageBreakdownRow
									denominator={snapshot.usedPromptTokens}
									icon={icon}
									key={key}
									label={label}
									value={value}
								/>
							))}
						</div>
						<p className="astra-chat-context-usage-shortcut__explainer">
							<span
								aria-hidden={true}
								className="astra-chat-context-usage-shortcut__explainer-icon"
							>
								<UiIcon
									icon={Info}
									size="sm"
									strokeWidth={2.25}
								/>
							</span>
							<span>{explainer}</span>
						</p>
						{!snapshot.hasDetailedBreakdown ? (
							<p className="astra-chat-context-usage-shortcut__helper">
								{breakdownUnavailable}
							</p>
						) : null}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
