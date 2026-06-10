"use client";

import * as React from "react";

import { ScrollArea as AstraScrollArea } from "@/components/ui/astra/scroll-area";
import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<typeof AstraScrollArea.Root>
>(({ className, children, ...props }, ref) => {
	return (
		<AstraScrollArea.Root ref={ref} className={cn(className)} {...props}>
			<AstraScrollArea.Viewport>
				<AstraScrollArea.Content>{children}</AstraScrollArea.Content>
			</AstraScrollArea.Viewport>
			<ScrollBar />
			<AstraScrollArea.Corner />
		</AstraScrollArea.Root>
	);
});

ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<typeof AstraScrollArea.Scrollbar>
>(
	(
		{ className, orientation = "vertical", keepMounted = true, ...props },
		ref,
	) => {
		return (
			<AstraScrollArea.Scrollbar
				ref={ref}
				orientation={orientation}
				keepMounted={keepMounted}
				className={cn(className)}
				{...props}
			>
				<AstraScrollArea.Thumb />
			</AstraScrollArea.Scrollbar>
		);
	},
);

ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
