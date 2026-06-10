import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";
import { getAstraProjectaPortalContainer } from "@/packages/core/runtime/uiScope";
import { ScrollArea as AstraScrollArea } from "@/components/ui/astra/scroll-area";

const DrawerContainerContext = React.createContext<
	HTMLElement | null | undefined
>(undefined);
const AstraDrawerCloseContext = React.createContext<(() => void) | null>(null);
const ASTRA_DRAWER_EXIT_MS = 500;

type DrawerProps = React.ComponentProps<typeof DrawerPrimitive.Root> & {
	exitDurationMs?: number;
	onExitComplete?: () => void;
};

function useLatestRef<T>(value: T) {
	const ref = React.useRef(value);
	React.useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref;
}

function resolvePortalContainer(container?: HTMLElement | null) {
	return container ?? getAstraProjectaPortalContainer() ?? undefined;
}

function Drawer({
	autoFocus = false,
	container,
	defaultOpen = false,
	exitDurationMs = ASTRA_DRAWER_EXIT_MS,
	onAnimationEnd,
	onExitComplete,
	onOpenChange,
	open,
	...props
}: DrawerProps) {
	const resolvedContainer = React.useMemo(
		() => resolvePortalContainer(container),
		[container],
	);
	const [visualOpen, setVisualOpen] = React.useState(
		open ?? defaultOpen ?? false,
	);
	const visualOpenRef = React.useRef(visualOpen);
	const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const shouldNotifyParentOnExitRef = React.useRef(false);
	const isExitPendingRef = React.useRef(false);
	const exitDurationMsRef = useLatestRef(exitDurationMs);
	const onAnimationEndRef = useLatestRef(onAnimationEnd);
	const onExitCompleteRef = useLatestRef(onExitComplete);
	const onOpenChangeRef = useLatestRef(onOpenChange);

	const cancelExitTimer = React.useCallback(() => {
		if (closeTimerRef.current) {
			clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}

		isExitPendingRef.current = false;
		shouldNotifyParentOnExitRef.current = false;
	}, []);

	const completeExit = React.useCallback(() => {
		if (closeTimerRef.current) {
			clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}

		if (!isExitPendingRef.current) {
			return;
		}

		const shouldNotifyParent = shouldNotifyParentOnExitRef.current;
		isExitPendingRef.current = false;
		shouldNotifyParentOnExitRef.current = false;

		onAnimationEndRef.current?.(false);
		onExitCompleteRef.current?.();

		if (shouldNotifyParent) {
			onOpenChangeRef.current?.(false);
		}
	}, [onAnimationEndRef, onExitCompleteRef, onOpenChangeRef]);

	const requestClose = React.useCallback(
		({ notifyParent = true }: { notifyParent?: boolean } = {}) => {
			if (!visualOpenRef.current) {
				if (isExitPendingRef.current && notifyParent) {
					shouldNotifyParentOnExitRef.current = true;
				}

				return;
			}

			shouldNotifyParentOnExitRef.current =
				shouldNotifyParentOnExitRef.current || notifyParent;

			visualOpenRef.current = false;
			setVisualOpen(false);
			isExitPendingRef.current = true;

			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
			}

			closeTimerRef.current = setTimeout(
				completeExit,
				exitDurationMsRef.current,
			);
		},
		[completeExit, exitDurationMsRef],
	);

	const handlePrimitiveOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				requestClose({ notifyParent: true });
				return;
			}

			cancelExitTimer();
			visualOpenRef.current = true;
			setVisualOpen(true);
			onOpenChangeRef.current?.(true);
		},
		[cancelExitTimer, onOpenChangeRef, requestClose],
	);

	const handleAnimationEnd = React.useCallback(
		(nextOpen: boolean) => {
			if (nextOpen) {
				onAnimationEndRef.current?.(true);
				return;
			}

			completeExit();
		},
		[completeExit, onAnimationEndRef],
	);

	React.useEffect(() => {
		if (open === undefined) {
			return;
		}

		if (open) {
			cancelExitTimer();
			visualOpenRef.current = true;
			setVisualOpen(true);
			return;
		}

		if (visualOpenRef.current) {
			requestClose({ notifyParent: false });
		}
	}, [cancelExitTimer, open, requestClose]);

	React.useEffect(() => {
		return () => {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
			}
		};
	}, []);

	return (
		<DrawerContainerContext.Provider value={resolvedContainer ?? null}>
			<AstraDrawerCloseContext.Provider
				value={() => {
					requestClose({ notifyParent: true });
				}}
			>
				<DrawerPrimitive.Root
					autoFocus={autoFocus}
					container={resolvedContainer}
					data-slot="drawer"
					onAnimationEnd={handleAnimationEnd}
					open={visualOpen}
					onOpenChange={handlePrimitiveOpenChange}
					{...props}
				/>
			</AstraDrawerCloseContext.Provider>
		</DrawerContainerContext.Provider>
	);
}

function useAstraDrawerClose() {
	const requestClose = React.useContext(AstraDrawerCloseContext);

	if (!requestClose) {
		throw new Error(
			"useAstraDrawerClose must be used inside an Astra Drawer.",
		);
	}

	return requestClose;
}

function DrawerTrigger({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
	return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
	container,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal> & {
	container?: HTMLElement | null;
}) {
	const rootContainer = React.useContext(DrawerContainerContext);
	const resolvedContainer =
		container !== undefined
			? resolvePortalContainer(container)
			: (rootContainer ?? resolvePortalContainer());

	return (
		<DrawerPrimitive.Portal
			container={resolvedContainer}
			data-slot="drawer-portal"
			{...props}
		/>
	);
}

function DrawerClose({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
	return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

const DrawerOverlay = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => {
	return (
		<DrawerPrimitive.Overlay
			ref={ref}
			className={cn(
				"astra-drawer__overlay fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
				className,
			)}
			data-slot="drawer-overlay"
			{...props}
		/>
	);
});
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
		container?: HTMLElement | null;
	}
>(
	(
		{ children, className, container, onOpenAutoFocus, tabIndex, ...props },
		ref,
	) => {
		const contentRef = React.useRef<React.ElementRef<
			typeof DrawerPrimitive.Content
		> | null>(null);

		const handleRef = React.useCallback(
			(node: React.ElementRef<typeof DrawerPrimitive.Content> | null) => {
				contentRef.current = node;

				if (typeof ref === "function") {
					ref(node);
					return;
				}

				if (ref) {
					ref.current = node;
				}
			},
			[ref],
		);

		const handleOpenAutoFocus = React.useCallback(
			(event: Event) => {
				if (typeof onOpenAutoFocus === "function") {
					onOpenAutoFocus(event);
				} else {
					event.preventDefault();
				}

				if (event.defaultPrevented) {
					return;
				}

				contentRef.current?.focus({ preventScroll: true });
			},
			[onOpenAutoFocus],
		);

		return (
			<DrawerPortal container={container}>
				<DrawerOverlay />
				<DrawerPrimitive.Content
					ref={handleRef}
					className={cn(
						"astra-drawer group/drawer-content fixed z-50 flex h-auto flex-col bg-background outline-none",
						"data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
						"data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
						"data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
						"data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
						className,
					)}
					data-astra-component="Drawer"
					data-slot="drawer-content"
					onOpenAutoFocus={handleOpenAutoFocus}
					tabIndex={tabIndex ?? -1}
					{...props}
				>
					<div aria-hidden={true} className="astra-drawer__handle" />
					{children}
				</DrawerPrimitive.Content>
			</DrawerPortal>
		);
	},
);
DrawerContent.displayName = DrawerPrimitive.Content.displayName;

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-0.5 p-4 text-center", className)}
			data-slot="drawer-header"
			{...props}
		/>
	);
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("mt-auto flex flex-col gap-2 p-4", className)}
			data-slot="drawer-footer"
			{...props}
		/>
	);
}

type DrawerBodyProps = React.ComponentPropsWithoutRef<"div"> & {
	scrollAreaProps?: Omit<
		React.ComponentPropsWithoutRef<typeof AstraScrollArea.Root>,
		"children"
	>;
	viewportProps?: Omit<
		React.ComponentPropsWithoutRef<typeof AstraScrollArea.Viewport>,
		"children"
	>;
	contentProps?: Omit<
		React.ComponentPropsWithoutRef<typeof AstraScrollArea.Content>,
		"children"
	>;
	scrollbarProps?: Omit<
		React.ComponentPropsWithoutRef<typeof AstraScrollArea.Scrollbar>,
		"children" | "orientation"
	>;
};

const DrawerBody = React.forwardRef<HTMLDivElement, DrawerBodyProps>(
	(
		{
			children,
			className,
			contentProps,
			scrollAreaProps,
			scrollbarProps,
			viewportProps,
			...props
		},
		ref,
	) => {
		const { className: scrollAreaClassName, ...resolvedScrollAreaProps } =
			scrollAreaProps ?? {};
		const { className: viewportClassName, ...resolvedViewportProps } =
			viewportProps ?? {};
		const { className: contentClassName, ...resolvedContentProps } =
			contentProps ?? {};
		const {
			className: scrollbarClassName,
			keepMounted = true,
			...resolvedScrollbarProps
		} = scrollbarProps ?? {};

		return (
			<div
				ref={ref}
				className={cn(
					"astra-drawer__body flex flex-1 min-h-0 flex-col",
					className,
				)}
				data-slot="drawer-body"
				{...props}
			>
				<AstraScrollArea.Root
					className={cn(
						"astra-drawer__scroll-area flex-1",
						scrollAreaClassName,
					)}
					data-astra-scroll-affordance="surface"
					{...resolvedScrollAreaProps}
				>
					<AstraScrollArea.Viewport
						className={cn(
							"astra-drawer__viewport",
							viewportClassName,
						)}
						{...resolvedViewportProps}
					>
						<AstraScrollArea.Content
							className={cn(
								"astra-drawer__body-content",
								contentClassName,
							)}
							{...resolvedContentProps}
						>
							{children}
						</AstraScrollArea.Content>
					</AstraScrollArea.Viewport>
					<AstraScrollArea.Scrollbar
						className={cn(scrollbarClassName)}
						keepMounted={keepMounted}
						orientation="vertical"
						{...resolvedScrollbarProps}
					>
						<AstraScrollArea.Thumb />
					</AstraScrollArea.Scrollbar>
					<AstraScrollArea.Corner />
				</AstraScrollArea.Root>
			</div>
		);
	},
);
DrawerBody.displayName = "DrawerBody";

const DrawerTitle = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => {
	return (
		<DrawerPrimitive.Title
			ref={ref}
			className={cn("font-semibold text-foreground", className)}
			data-slot="drawer-title"
			{...props}
		/>
	);
});
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => {
	return (
		<DrawerPrimitive.Description
			ref={ref}
			className={cn("text-sm text-muted-foreground", className)}
			data-slot="drawer-description"
			{...props}
		/>
	);
});
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerOverlay,
	DrawerPortal,
	DrawerTitle,
	DrawerTrigger,
	useAstraDrawerClose,
};
