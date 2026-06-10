import * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";

import {
	Sheet as BaseSheet,
	SheetClose as BaseSheetClose,
	SheetDescription as BaseSheetDescription,
	SheetFooter as BaseSheetFooter,
	SheetHeader as BaseSheetHeader,
	SheetTitle as BaseSheetTitle,
	SheetTrigger as BaseSheetTrigger,
} from "@/components/ui/shadcn/sheet";
import { getAstraProjectaPortalContainer } from "@/packages/core/runtime/uiScope";

function resolvePortalContainer(container?: HTMLElement | null) {
	return container ?? getAstraProjectaPortalContainer() ?? undefined;
}

function SheetPortal({
	container,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Portal> & {
	container?: HTMLElement | null;
}) {
	const resolvedContainer = React.useMemo(
		() => resolvePortalContainer(container),
		[container],
	);

	return (
		<SheetPrimitive.Portal
			container={resolvedContainer}
			data-slot="sheet-portal"
			{...props}
		/>
	);
}

const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => {
	return (
		<SheetPrimitive.Overlay
			ref={ref}
			data-slot="sheet-overlay"
			className={[
				"astra-sheet-overlay fixed inset-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			{...props}
		/>
	);
});
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const SheetContent = React.forwardRef<
	React.ElementRef<typeof SheetPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
		container?: HTMLElement | null;
		showCloseButton?: boolean;
		side?: "top" | "right" | "bottom" | "left";
	}
>(
	(
		{
			children,
			className,
			container,
			showCloseButton = false,
			side = "bottom",
			...props
		},
		ref,
	) => {
		return (
			<SheetPortal container={container}>
				<SheetOverlay />
				<SheetPrimitive.Content
					ref={ref}
					aria-describedby={props["aria-describedby"]}
					className={[
						"astra-sheet-content fixed flex min-h-0 flex-col gap-0 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500",
						side === "right"
							? "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
							: "",
						side === "left"
							? "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm"
							: "",
						side === "top"
							? "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top"
							: "",
						side === "bottom"
							? "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
							: "",
						className,
					]
						.filter(Boolean)
						.join(" ")}
					data-astra-component="Sheet"
					data-side={side}
					data-slot="sheet-content"
					{...props}
				>
					{children}
					{showCloseButton && (
						<SheetPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary">
							<XIcon className="size-4" />
							<span className="sr-only">Close</span>
						</SheetPrimitive.Close>
					)}
				</SheetPrimitive.Content>
			</SheetPortal>
		);
	},
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

export {
	BaseSheet as Sheet,
	BaseSheetClose as SheetClose,
	SheetContent,
	BaseSheetDescription as SheetDescription,
	BaseSheetFooter as SheetFooter,
	BaseSheetHeader as SheetHeader,
	SheetOverlay,
	SheetPortal,
	BaseSheetTitle as SheetTitle,
	BaseSheetTrigger as SheetTrigger,
};
