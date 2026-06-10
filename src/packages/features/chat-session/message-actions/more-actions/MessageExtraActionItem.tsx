import * as React from "react";

import { UiIcon } from "@/components/ui/shared/icon";
import type { LucideIcon } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";

export type MessageExtraActionVariant = "danger" | "native";

export interface MessageExtraActionItem {
	description?: string;
	disabled?: boolean;
	icon?: LucideIcon;
	iconClassName?: string;
	id: string;
	label: string;
	onClick?: () => void | Promise<void>;
	variant?: MessageExtraActionVariant;
}

export function isMessageExtraActionDisabled(
	action: MessageExtraActionItem | undefined,
) {
	return action?.disabled === true || typeof action?.onClick !== "function";
}

export function MessageExtraActionIcon({
	action,
}: {
	action: Pick<MessageExtraActionItem, "icon" | "iconClassName">;
}) {
	return (
		<span className="astra-messageExtraActionsDrawer__actionIcon">
			{action.icon ? (
				<UiIcon aria-hidden={true} icon={action.icon} size="sm" />
			) : (
				<span
					aria-hidden={true}
					className={cn(
						"astra-messageExtraActionsDrawer__nativeIcon",
						action.iconClassName,
					)}
				/>
			)}
		</span>
	);
}
