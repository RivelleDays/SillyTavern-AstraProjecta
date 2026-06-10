import * as React from "react";

import { UiIcon } from "@/components/ui/shared/icon";
import { Info } from "@/components/ui/shared/icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/shared/popover";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import type { ChatContextUsageSnapshot } from "@/packages/core/st/chatContextUsage";
import {
	ContextUsageDataPill,
	ContextUsageTextRow,
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
			className="mobile-chat-context-usage-shortcut__loading-dots"
		>
			<span className="mobile-chat-context-usage-shortcut__loading-dot" />
			<span className="mobile-chat-context-usage-shortcut__loading-dot" />
			<span className="mobile-chat-context-usage-shortcut__loading-dot" />
		</span>
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
	const fieldChatHistory = translateAstra(
		"sendForm.contextUsage.field.chatHistory",
	);
	const fieldWorldInfo = translateAstra(
		"sendForm.contextUsage.field.worldInfo",
	);
	const fieldCharacterDescription = translateAstra(
		"sendForm.contextUsage.field.characterDescription",
	);
	const fieldPersonaDescription = translateAstra(
		"sendForm.contextUsage.field.personaDescription",
	);
	const fieldContextUsed = translateAstra(
		"sendForm.contextUsage.field.contextUsed",
	);
	const fieldPromptUsed = translateAstra(
		"sendForm.contextUsage.field.promptUsed",
	);
	const fieldResponseReserve = translateAstra(
		"sendForm.contextUsage.field.responseReserve",
	);

	const triggerClassName = cn(
		"mobile-chat-context-usage-shortcut__trigger",
		`is-${visualState}`,
	);

	const triggerBody = isLoading ? (
		<ContextUsageLoadingDots />
	) : (
		<>
			{isUsageReady ? (
				<span
					aria-hidden={true}
					className="mobile-chat-context-usage-shortcut__ring"
					style={
						{
							"--context-usage-value": clampedUsagePercent,
						} as React.CSSProperties
					}
				/>
			) : null}
			<span className="mobile-chat-context-usage-shortcut__label">
				{isIdle ? (
					<UiIcon
						aria-hidden={true}
						className="mobile-chat-context-usage-shortcut__idle-icon"
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
				data-slot="mobile-chat-context-usage-shortcut"
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
				data-slot="mobile-chat-context-usage-shortcut"
				title={openLabel}
				type="button"
			>
				{triggerBody}
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="mobile-chat-context-usage-shortcut__popover"
				side="top"
				sideOffset={10}
			>
				{isIdle ? (
					<div className="mobile-chat-context-usage-shortcut__popover-body">
						<p className="mobile-chat-context-usage-shortcut__helper is-alert">
							{idleHelper}
						</p>
					</div>
				) : (
					<div className="mobile-chat-context-usage-shortcut__popover-body">
						<div className="mobile-chat-context-usage-shortcut__text-grid">
							<ContextUsageTextRow
								label={fieldChatHistory}
								value={formatContextUsageTokenCount(
									snapshot.chatHistoryTokens,
								)}
							/>
							<ContextUsageTextRow
								label={fieldWorldInfo}
								value={formatContextUsageTokenCount(
									snapshot.worldInfoTokens,
								)}
							/>
							<ContextUsageTextRow
								label={fieldCharacterDescription}
								value={formatContextUsageTokenCount(
									snapshot.characterTokens,
								)}
							/>
							<ContextUsageTextRow
								label={fieldPersonaDescription}
								value={formatContextUsageTokenCount(
									snapshot.personaTokens,
								)}
							/>
						</div>
						<div
							aria-hidden={true}
							className="mobile-chat-context-usage-shortcut__divider"
						/>
						<ContextUsageDataPill
							maxContextTokens={snapshot.maxContextTokens}
							usedContextTokens={snapshot.usedContextTokens}
						/>
						<div className="mobile-chat-context-usage-shortcut__text-grid mobile-chat-context-usage-shortcut__text-grid--primary">
							<ContextUsageTextRow
								label={fieldContextUsed}
								value={formatContextUsagePercent(
									snapshot.usagePercent,
								)}
							/>
							<ContextUsageTextRow
								label={fieldResponseReserve}
								value={formatContextUsageTokenCount(
									snapshot.reservedResponseTokens,
								)}
							/>
							<ContextUsageTextRow
								label={fieldPromptUsed}
								value={`${formatContextUsageTokenCount(snapshot.usedPromptTokens)} / ${formatContextUsageTokenCount(snapshot.promptBudgetTokens)}`}
							/>
						</div>
						{!snapshot.hasDetailedBreakdown ? (
							<p className="mobile-chat-context-usage-shortcut__helper">
								{breakdownUnavailable}
							</p>
						) : null}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
