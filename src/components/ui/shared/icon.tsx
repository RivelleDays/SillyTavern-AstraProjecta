import * as React from "react";

import type { LucideIcon, LucideProps } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";

type UiIconSize = "xs" | "sm" | "md";

const ICON_SIZE_VAR_BY_TOKEN: Record<UiIconSize, string> = {
	md: "var(--astra-icon-size-md)",
	sm: "var(--astra-icon-size-sm)",
	xs: "var(--astra-icon-size-xs)",
};

export function UiIcon({
	className,
	icon: Icon,
	size = "sm",
	style,
	strokeWidth = "var(--astra-icon-stroke-width)",
	...props
}: Omit<LucideProps, "size"> & {
	icon: LucideIcon;
	size?: UiIconSize;
}) {
	return (
		<Icon
			className={cn(
				"shrink-0 size-[var(--astra-ui-icon-size)]",
				className,
			)}
			data-slot="ui-icon"
			size={ICON_SIZE_VAR_BY_TOKEN[size]}
			strokeWidth={strokeWidth}
			style={
				{
					"--astra-ui-icon-size": ICON_SIZE_VAR_BY_TOKEN[size],
					...style,
				} as React.CSSProperties
			}
			{...props}
		/>
	);
}
