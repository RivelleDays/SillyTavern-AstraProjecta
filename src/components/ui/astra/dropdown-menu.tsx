import * as React from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { getAstraProjectaPortalContainer } from "@/packages/core/runtime/uiScope";
import {
	DropdownMenu as BaseDropdownMenu,
	DropdownMenuCheckboxItem as BaseDropdownMenuCheckboxItem,
	DropdownMenuGroup as BaseDropdownMenuGroup,
	DropdownMenuItem as BaseDropdownMenuItem,
	DropdownMenuLabel as BaseDropdownMenuLabel,
	DropdownMenuPortal as BaseDropdownMenuPortal,
	DropdownMenuRadioGroup as BaseDropdownMenuRadioGroup,
	DropdownMenuRadioItem as BaseDropdownMenuRadioItem,
	DropdownMenuSeparator as BaseDropdownMenuSeparator,
	DropdownMenuShortcut as BaseDropdownMenuShortcut,
	DropdownMenuSub as BaseDropdownMenuSub,
	DropdownMenuSubTrigger as BaseDropdownMenuSubTrigger,
	DropdownMenuTrigger as BaseDropdownMenuTrigger,
} from "@/components/ui/shadcn/dropdown-menu";

const DROPDOWN_MENU_CONTENT_Z_INDEX = 16000;

function resolvePortalContainer(container?: HTMLElement | null) {
	return container ?? getAstraProjectaPortalContainer() ?? undefined;
}

function DropdownMenuPortal({
	container,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal> & {
	container?: HTMLElement | null;
}) {
	const resolvedContainer = React.useMemo(
		() => resolvePortalContainer(container),
		[container],
	);

	return (
		<DropdownMenuPrimitive.Portal
			data-slot="dropdown-menu-portal"
			container={resolvedContainer}
			{...props}
		/>
	);
}

function DropdownMenuContent({
	className,
	container,
	sideOffset = 4,
	style,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
	container?: HTMLElement | null;
}) {
	const resolvedContainer = React.useMemo(
		() => resolvePortalContainer(container),
		[container],
	);

	return (
		<DropdownMenuPrimitive.Portal container={resolvedContainer}>
			<DropdownMenuPrimitive.Content
				data-slot="dropdown-menu-content"
				sideOffset={sideOffset}
				className={cn(
					"z-[16000] max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
					className,
				)}
				style={{
					...style,
					pointerEvents: "auto",
					zIndex: DROPDOWN_MENU_CONTENT_Z_INDEX,
				}}
				{...props}
			/>
		</DropdownMenuPrimitive.Portal>
	);
}

function DropdownMenuSubContent({
	className,
	style,
	...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
	return (
		<DropdownMenuPrimitive.SubContent
			data-slot="dropdown-menu-sub-content"
			className={cn(
				"z-[16000] min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
				className,
			)}
			style={{
				...style,
				pointerEvents: "auto",
				zIndex: DROPDOWN_MENU_CONTENT_Z_INDEX,
			}}
			{...props}
		/>
	);
}

export {
	BaseDropdownMenu as DropdownMenu,
	BaseDropdownMenuTrigger as DropdownMenuTrigger,
	DropdownMenuContent,
	BaseDropdownMenuGroup as DropdownMenuGroup,
	BaseDropdownMenuLabel as DropdownMenuLabel,
	BaseDropdownMenuItem as DropdownMenuItem,
	BaseDropdownMenuCheckboxItem as DropdownMenuCheckboxItem,
	BaseDropdownMenuRadioGroup as DropdownMenuRadioGroup,
	BaseDropdownMenuRadioItem as DropdownMenuRadioItem,
	BaseDropdownMenuSeparator as DropdownMenuSeparator,
	BaseDropdownMenuShortcut as DropdownMenuShortcut,
	DropdownMenuPortal,
	BaseDropdownMenuPortal,
	BaseDropdownMenuSub as DropdownMenuSub,
	DropdownMenuSubContent,
	BaseDropdownMenuSubTrigger as DropdownMenuSubTrigger,
};
