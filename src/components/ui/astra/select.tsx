import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { getAstraProjectaPortalContainer } from "@/packages/core/runtime/uiScope";
import {
	Select as BaseSelect,
	SelectGroup as BaseSelectGroup,
	SelectItem as BaseSelectItem,
	SelectLabel as BaseSelectLabel,
	SelectScrollDownButton as BaseSelectScrollDownButton,
	SelectScrollUpButton as BaseSelectScrollUpButton,
	SelectSeparator as BaseSelectSeparator,
	SelectTrigger as BaseSelectTrigger,
	SelectValue as BaseSelectValue,
} from "@/components/ui/shadcn/select";

const SELECT_CONTENT_Z_INDEX = 16000;

function resolvePortalContainer(container?: HTMLElement | null) {
	return container ?? getAstraProjectaPortalContainer() ?? undefined;
}

function SelectContent({
	align = "center",
	children,
	className,
	container,
	position = "item-aligned",
	style,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
	container?: HTMLElement | null;
}) {
	const resolvedContainer = React.useMemo(
		() => resolvePortalContainer(container),
		[container],
	);

	return (
		<SelectPrimitive.Portal container={resolvedContainer}>
			<SelectPrimitive.Content
				data-slot="select-content"
				align={align}
				className={cn(
					"relative z-[16000] max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
					position === "popper" &&
						"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
					className,
				)}
				position={position}
				style={{
					...style,
					pointerEvents: "auto",
					zIndex: SELECT_CONTENT_Z_INDEX,
				}}
				{...props}
			>
				<BaseSelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cn(
						"p-1",
						position === "popper" &&
							"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<BaseSelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

export {
	BaseSelect as Select,
	SelectContent,
	BaseSelectGroup as SelectGroup,
	BaseSelectItem as SelectItem,
	BaseSelectLabel as SelectLabel,
	BaseSelectScrollDownButton as SelectScrollDownButton,
	BaseSelectScrollUpButton as SelectScrollUpButton,
	BaseSelectSeparator as SelectSeparator,
	BaseSelectTrigger as SelectTrigger,
	BaseSelectValue as SelectValue,
};
