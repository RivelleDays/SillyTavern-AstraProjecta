import * as React from "react";

import { UiIcon } from "@/components/ui/shared/icon";
import {
	Braces,
	MessageCircleMore,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";

export interface MessageActionsIdentityHeaderTarget {
	avatarUrl: string;
	messageDisplayId: string;
	messageId: number;
	metadata: {
		timestamp?: string;
		tokenCount?: string;
	};
	senderName: string;
}

function formatNumericBadgeText(value: string, fallbackValue?: number): string {
	const match = value.match(/\d+/);
	if (match) {
		return match[0];
	}

	return typeof fallbackValue === "number" ? String(fallbackValue) : "-";
}

export function MessageActionsIdentityHeader({
	target,
}: {
	target: MessageActionsIdentityHeaderTarget | null;
}) {
	const messageLabel = translateAstra(
		"messageActions.revisionHistory.meta.message",
	);
	const tokenLabel = translateAstra("messageActions.more.meta.tokens");
	const metadata = target?.metadata ?? {};
	const senderName =
		typeof target?.senderName === "string" && target.senderName.trim()
			? target.senderName.trim()
			: "Character";
	const messageDisplayId = target?.messageDisplayId || "-";
	const tokenCount = metadata.tokenCount?.trim() || "";
	const messageBadgeText = formatNumericBadgeText(
		messageDisplayId,
		target?.messageId,
	);

	return (
		<div className="astra-messageMoreActionsDrawer__summary">
			<div className="astra-dialog-identity astra-messageMoreActionsDrawer__identityMain">
				<div className="astra-dialog-identityAvatar astra-messageMoreActionsDrawer__identityAvatar">
					{target?.avatarUrl ? (
						<img
							alt={`${senderName} avatar`}
							className="astra-dialog-identityImage astra-messageMoreActionsDrawer__identityImage"
							decoding="async"
							draggable={false}
							loading="lazy"
							src={target.avatarUrl}
						/>
					) : null}
				</div>
				<div className="astra-messageMoreActionsDrawer__identityText">
					<div className="astra-messageMoreActionsDrawer__identityNameRow">
						<span
							className="astra-dialog-identityName astra-messageMoreActionsDrawer__identityName"
							title={senderName}
						>
							{senderName}
						</span>
					</div>
				</div>
				<div className="astra-messageMoreActionsDrawer__identityBadges">
					<span
						aria-label={`${messageLabel}: ${messageBadgeText}`}
						className="astra-dialog-identityMesBadge astra-messageMoreActionsDrawer__identityBadge"
						title={`${messageLabel}: ${messageBadgeText}`}
					>
						<UiIcon
							aria-hidden={true}
							className="astra-dialog-identityMesBadgeIcon astra-messageMoreActionsDrawer__identityBadgeIcon"
							icon={MessageCircleMore}
							size="xs"
						/>
						{messageBadgeText}
					</span>
					{tokenCount ? (
						<span
							aria-label={`${tokenLabel}: ${tokenCount}`}
							className="astra-dialog-identityMesBadge astra-messageMoreActionsDrawer__identityBadge"
							title={`${tokenLabel}: ${tokenCount}`}
						>
							<UiIcon
								aria-hidden={true}
								className="astra-dialog-identityMesBadgeIcon astra-messageMoreActionsDrawer__identityBadgeIcon"
								icon={Braces}
								size="xs"
							/>
							{tokenCount}
						</span>
					) : null}
				</div>
			</div>
		</div>
	);
}
