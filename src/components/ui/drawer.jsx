import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

const Drawer = ({ autoFocus = true, ...props }) => (
  <DrawerPrimitive.Root autoFocus={autoFocus} {...props} />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn(
      "astra-drawer__overlay fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef(
  ({ className, children, container, onOpenAutoFocus, tabIndex, ...props }, forwardedRef) => {
    const contentRef = React.useRef(null)
    const setRefs = React.useCallback((node) => {
      contentRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    }, [forwardedRef])

    const handleOpenAutoFocus = React.useCallback((event) => {
      if (typeof onOpenAutoFocus === 'function') {
        onOpenAutoFocus(event)
      }
      if (event?.defaultPrevented) return
      const node = contentRef.current
      if (node && typeof node.focus === 'function') {
        node.focus({ preventScroll: true })
      }
    }, [onOpenAutoFocus])

    return (
      <DrawerPortal container={container}>
        <DrawerOverlay />
        <DrawerPrimitive.Content
          ref={setRefs}
          className={cn(
            "astra-drawer fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border border-border bg-background shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
            className,
          )}
          data-astra-component="Drawer"
          onOpenAutoFocus={handleOpenAutoFocus}
          tabIndex={tabIndex ?? -1}
          {...props}
        >
          <div className="astra-drawer__handle mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
          {children}
        </DrawerPrimitive.Content>
      </DrawerPortal>
    )
  },
);
DrawerContent.displayName = DrawerPrimitive.Content.displayName;

const DrawerHeader = ({ className, ...props }) => (
  <div
    className={cn("grid gap-1.5 text-center sm:text-left", className)}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2",
      className,
    )}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerClose,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
