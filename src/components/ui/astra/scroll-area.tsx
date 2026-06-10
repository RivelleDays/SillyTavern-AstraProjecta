"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@/lib/utils";

const ASTRA_SCROLL_FADE_Y_START_ATTRIBUTE = "data-astra-scroll-fade-y-start";
const ASTRA_SCROLL_FADE_Y_END_ATTRIBUTE = "data-astra-scroll-fade-y-end";
const ASTRA_SCROLL_FADE_EDGE_EPSILON = 0.5;

type ScrollAreaRootProps = React.ComponentPropsWithoutRef<
	typeof ScrollAreaPrimitive.Root
> & {
	"data-astra-scroll-affordance"?: string;
};
type ScrollAreaRootElement = React.ElementRef<typeof ScrollAreaPrimitive.Root>;

function setBooleanAttribute(
	element: HTMLElement,
	attribute: string,
	value: boolean,
) {
	if (value) {
		if (!element.hasAttribute(attribute)) {
			element.setAttribute(attribute, "");
		}
		return;
	}

	if (element.hasAttribute(attribute)) {
		element.removeAttribute(attribute);
	}
}

function clearSurfaceScrollFadeFallback(root: HTMLElement) {
	root.removeAttribute(ASTRA_SCROLL_FADE_Y_START_ATTRIBUTE);
	root.removeAttribute(ASTRA_SCROLL_FADE_Y_END_ATTRIBUTE);
}

function syncSurfaceScrollFadeFallback(
	root: HTMLElement,
	viewport: HTMLElement,
) {
	const maxScrollTop = Math.max(
		0,
		viewport.scrollHeight - viewport.clientHeight,
	);
	const scrollTop = Math.min(maxScrollTop, Math.max(0, viewport.scrollTop));
	const hasOverflowY = maxScrollTop > ASTRA_SCROLL_FADE_EDGE_EPSILON;

	setBooleanAttribute(
		root,
		ASTRA_SCROLL_FADE_Y_START_ATTRIBUTE,
		hasOverflowY && scrollTop > ASTRA_SCROLL_FADE_EDGE_EPSILON,
	);
	setBooleanAttribute(
		root,
		ASTRA_SCROLL_FADE_Y_END_ATTRIBUTE,
		hasOverflowY &&
			maxScrollTop - scrollTop > ASTRA_SCROLL_FADE_EDGE_EPSILON,
	);
}

function useSurfaceScrollFadeFallback(
	root: HTMLElement | null,
	enabled: boolean,
) {
	React.useLayoutEffect(() => {
		if (!root) {
			return undefined;
		}

		if (!enabled) {
			clearSurfaceScrollFadeFallback(root);
			return undefined;
		}

		const viewport = root.querySelector<HTMLElement>(
			".astra-scroll-area__viewport",
		);
		if (!viewport) {
			clearSurfaceScrollFadeFallback(root);
			return undefined;
		}

		const ownerWindow = root.ownerDocument.defaultView;
		let animationFrameId: number | null = null;
		let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

		const cancelFrame = () => {
			if (animationFrameId !== null) {
				ownerWindow?.cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}

			if (timeoutId !== null) {
				globalThis.clearTimeout(timeoutId);
				timeoutId = null;
			}
		};

		const measure = () => {
			animationFrameId = null;
			timeoutId = null;
			syncSurfaceScrollFadeFallback(root, viewport);
		};

		const scheduleMeasure = () => {
			if (animationFrameId !== null || timeoutId !== null) {
				return;
			}

			if (ownerWindow?.requestAnimationFrame) {
				animationFrameId = ownerWindow.requestAnimationFrame(measure);
			} else {
				timeoutId = globalThis.setTimeout(() => {
					measure();
				}, 0);
			}
		};

		syncSurfaceScrollFadeFallback(root, viewport);
		viewport.addEventListener("scroll", scheduleMeasure, {
			passive: true,
		});

		const observer =
			typeof ResizeObserver === "function"
				? new ResizeObserver(scheduleMeasure)
				: null;
		observer?.observe(viewport);

		const content = viewport.querySelector<HTMLElement>(
			".astra-scroll-area__content",
		);
		if (content) {
			observer?.observe(content);
		}

		return () => {
			viewport.removeEventListener("scroll", scheduleMeasure);
			observer?.disconnect();
			cancelFrame();
			clearSurfaceScrollFadeFallback(root);
		};
	}, [enabled, root]);
}

const ScrollAreaRoot = React.forwardRef<
	ScrollAreaRootElement,
	ScrollAreaRootProps
>(({ className, ...props }, ref) => {
	const [rootElement, setRootElement] =
		React.useState<ScrollAreaRootElement | null>(null);
	const hasSurfaceScrollAffordance =
		props["data-astra-scroll-affordance"] === "surface";

	const setRootRefs = React.useCallback(
		(node: ScrollAreaRootElement | null) => {
			setRootElement(node);

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

	useSurfaceScrollFadeFallback(rootElement, hasSurfaceScrollAffordance);

	return (
		<ScrollAreaPrimitive.Root
			ref={setRootRefs}
			className={cn(
				"astra-scroll-area relative flex min-h-0 min-w-0",
				className,
			)}
			data-astra-component="ScrollArea"
			data-slot="scroll-area"
			{...props}
		/>
	);
});
ScrollAreaRoot.displayName =
	ScrollAreaPrimitive.Root.displayName ?? "ScrollAreaRoot";

const ScrollAreaViewport = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.Viewport>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Viewport>
>(({ className, ...props }, ref) => {
	return (
		<ScrollAreaPrimitive.Viewport
			ref={ref}
			className={cn(
				"astra-scroll-area__viewport flex-1 min-h-0 min-w-0 rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
				className,
			)}
			data-slot="scroll-area-viewport"
			{...props}
		/>
	);
});
ScrollAreaViewport.displayName =
	ScrollAreaPrimitive.Viewport.displayName ?? "ScrollAreaViewport";

const ScrollAreaContent = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Content>
>(({ className, ...props }, ref) => {
	return (
		<ScrollAreaPrimitive.Content
			ref={ref}
			className={cn("astra-scroll-area__content min-w-full", className)}
			data-slot="scroll-area-content"
			{...props}
		/>
	);
});
ScrollAreaContent.displayName =
	ScrollAreaPrimitive.Content.displayName ?? "ScrollAreaContent";

const ScrollAreaScrollbar = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.Scrollbar>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(
	(
		{ className, keepMounted = true, orientation = "vertical", ...props },
		ref,
	) => {
		return (
			<ScrollAreaPrimitive.Scrollbar
				ref={ref}
				className={cn(
					"astra-scroll-area__scrollbar flex touch-none p-px transition-[opacity,background-color] select-none",
					orientation === "vertical" &&
						"h-full w-2.5 border-l border-l-transparent",
					orientation === "horizontal" &&
						"h-2.5 flex-col border-t border-t-transparent",
					className,
				)}
				data-slot="scroll-area-scrollbar"
				keepMounted={keepMounted}
				orientation={orientation}
				{...props}
			/>
		);
	},
);
ScrollAreaScrollbar.displayName =
	ScrollAreaPrimitive.Scrollbar.displayName ?? "ScrollAreaScrollbar";

const ScrollAreaThumb = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.Thumb>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Thumb>
>(({ className, ...props }, ref) => {
	return (
		<ScrollAreaPrimitive.Thumb
			ref={ref}
			className={cn(
				"astra-scroll-area__thumb relative flex-1 rounded-full bg-border",
				className,
			)}
			data-slot="scroll-area-thumb"
			{...props}
		/>
	);
});
ScrollAreaThumb.displayName =
	ScrollAreaPrimitive.Thumb.displayName ?? "ScrollAreaThumb";

const ScrollAreaCorner = React.forwardRef<
	React.ElementRef<typeof ScrollAreaPrimitive.Corner>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Corner>
>(({ className, ...props }, ref) => {
	return (
		<ScrollAreaPrimitive.Corner
			ref={ref}
			className={cn(
				"astra-scroll-area__corner bg-transparent",
				className,
			)}
			data-slot="scroll-area-corner"
			{...props}
		/>
	);
});
ScrollAreaCorner.displayName =
	ScrollAreaPrimitive.Corner.displayName ?? "ScrollAreaCorner";

const ScrollArea = {
	Root: ScrollAreaRoot,
	Viewport: ScrollAreaViewport,
	Content: ScrollAreaContent,
	Scrollbar: ScrollAreaScrollbar,
	Thumb: ScrollAreaThumb,
	Corner: ScrollAreaCorner,
};

export {
	ScrollArea,
	ScrollAreaContent,
	ScrollAreaCorner,
	ScrollAreaRoot,
	ScrollAreaScrollbar,
	ScrollAreaThumb,
	ScrollAreaViewport,
};
