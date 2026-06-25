import * as React from "react";

import { UiIcon } from "@/components/ui/shared/icon";
import { DatabaseZap } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";
import type { ChatContextUsageSnapshot } from "@/packages/core/st/chatContextUsage";

export type ContextUsageVisualState =
	| "normal"
	| "warning"
	| "full"
	| "disabled"
	| "loading"
	| "idle";

const numberFormatter = new Intl.NumberFormat("en-US");
const SUPPORTED_CONTEXT_USAGE_MAIN_API = "openai";

export function formatContextUsageTokenCount(value: number | null): string {
	if (value == null) {
		return "—";
	}

	return numberFormatter.format(value);
}

export function formatContextUsagePercent(value: number | null): string {
	if (value == null) {
		return "—";
	}

	return `${Math.max(0, Math.round(value))}%`;
}

export function hasUsableContextUsage(
	snapshot: ChatContextUsageSnapshot,
): boolean {
	return (
		snapshot.usedContextTokens != null &&
		snapshot.usedPromptTokens != null &&
		snapshot.usagePercent != null
	);
}

export function shouldShowContextUsageShortcut(
	snapshot: ChatContextUsageSnapshot,
): boolean {
	if (
		snapshot.mainApi !== SUPPORTED_CONTEXT_USAGE_MAIN_API ||
		snapshot.maxContextTokens <= 0
	) {
		return false;
	}

	if (snapshot.activityStatus !== "idle") {
		return true;
	}

	if (hasUsableContextUsage(snapshot)) {
		return true;
	}

	return (
		snapshot.status === "idle" ||
		snapshot.status === "pending" ||
		snapshot.status === "unavailable"
	);
}

export function resolveContextUsageVisualState(
	snapshot: ChatContextUsageSnapshot,
	isUsageReady: boolean,
): ContextUsageVisualState {
	if (
		!isUsageReady &&
		(snapshot.activityStatus === "generating" ||
			snapshot.activityStatus === "refreshing")
	) {
		return "loading";
	}

	if (snapshot.status === "unsupported") {
		return "disabled";
	}

	if (snapshot.status === "unavailable") {
		return "disabled";
	}

	if (!isUsageReady && snapshot.status === "pending") {
		return "loading";
	}

	if (snapshot.status === "idle") {
		return "idle";
	}

	if (!isUsageReady) {
		return "idle";
	}

	if ((snapshot.usagePercent ?? 0) >= 100) {
		return "full";
	}

	if ((snapshot.usagePercent ?? 0) >= 95) {
		return "warning";
	}

	return "normal";
}

export function ContextUsageTextRow({
	label,
	value,
	valueClassName,
}: {
	label: string;
	value: string;
	valueClassName?: string;
}): React.ReactElement {
	return (
		<div className="astra-chat-context-usage-shortcut__text-row">
			<span className="astra-chat-context-usage-shortcut__text-label">
				{label}
			</span>
			<span
				className={cn(
					"astra-chat-context-usage-shortcut__text-value",
					valueClassName,
				)}
			>
				{value}
			</span>
		</div>
	);
}

export function ContextUsageDataPill({
	className,
	maxContextTokens,
	usedContextTokens,
}: {
	className?: string;
	maxContextTokens: number;
	usedContextTokens: number | null;
}): React.ReactElement {
	return (
		<div
			aria-live="polite"
			className={cn(
				"astra-chat-context-usage-shortcut__data-pill",
				className,
			)}
		>
			<span
				aria-hidden={true}
				className="astra-chat-context-usage-shortcut__data-pill-icon"
			>
				<UiIcon icon={DatabaseZap} size="sm" strokeWidth={2.25} />
			</span>
			<span className="astra-chat-context-usage-shortcut__data-pill-value">
				{formatContextUsageTokenCount(usedContextTokens)}
			</span>
			<span className="astra-chat-context-usage-shortcut__data-pill-max">
				<span className="astra-chat-context-usage-shortcut__data-pill-separator">
					/
				</span>
				<span className="astra-chat-context-usage-shortcut__data-pill-max-value">
					{formatContextUsageTokenCount(maxContextTokens)}
				</span>
			</span>
		</div>
	);
}
