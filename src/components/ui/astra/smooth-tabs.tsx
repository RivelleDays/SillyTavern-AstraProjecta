import * as React from "react";
import { createPortal } from "react-dom";

import { UiIcon } from "@/components/ui/shared/icon";
import type { LucideIcon } from "@/components/ui/shared/icons";
import { cn } from "@/lib/utils";

type AstraSmoothTabPanelProps = React.HTMLAttributes<HTMLElement> & {
	[dataAttribute: `data-${string}`]: string | number | boolean | undefined;
};

export interface AstraSmoothTabItem<TValue extends string = string> {
	content: React.ReactNode;
	disabled?: boolean;
	icon?: LucideIcon;
	label: React.ReactNode;
	panelClassName?: string;
	panelProps?: AstraSmoothTabPanelProps;
	value: TValue;
}

export interface AstraSmoothTabsProps<TValue extends string = string> {
	ariaLabel: string;
	className?: string;
	items: readonly AstraSmoothTabItem<TValue>[];
	listClassName?: string;
	listFramePortalTarget?: HTMLElement | null;
	onValueChange(value: TValue): void;
	panelClassName?: string;
	trackClassName?: string;
	triggerClassName?: string;
	value: TValue;
	viewportClassName?: string;
	viewportMode?: AstraSmoothTabsViewportMode;
}

type DirectionLock = "horizontal" | "vertical" | null;
type AstraSmoothTabsViewportMode = "auto-height" | "fill";

interface IndicatorBounds {
	left: number;
	width: number;
}

const HORIZONTAL_LOCK_THRESHOLD = 4;
const QUICK_FLICK_MAX_MS = 300;
const QUICK_FLICK_MIN_PX = 20;
const WIDE_DRAG_RATIO = 0.15;
const EDGE_RESISTANCE = 6;
const WHEEL_THRESHOLD = 20;
const WHEEL_COOLDOWN_MS = 500;
const HIDDEN_INDICATOR_BOUNDS: IndicatorBounds = {
	left: 0,
	width: 0,
};

function findActiveTrigger(list: HTMLElement, value: string) {
	return (
		Array.from(
			list.querySelectorAll<HTMLButtonElement>(
				"[data-astra-smooth-tab-value]",
			),
		).find((trigger) => trigger.dataset.astraSmoothTabValue === value) ??
		null
	);
}

function shouldIgnoreSwipe(target: EventTarget | null) {
	if (!(target instanceof Element)) {
		return false;
	}

	if (
		target.closest(
			[
				"[data-astra-smooth-tabs-swipe-ignore]",
				"[data-swipe-ignore]",
			].join(", "),
		)
	) {
		return true;
	}

	if (
		target.closest(
			[
				"button",
				"a",
				"input",
				"select",
				"textarea",
				"label",
				"[contenteditable]",
				'[role="link"]',
				'[role="menuitem"]',
				'[role="option"]',
				'[role="slider"]',
				'[role="tab"]',
				'[role="textbox"]',
			].join(", "),
		)
	) {
		return true;
	}

	const roleButton = target.closest('[role="button"]');

	return Boolean(
		roleButton &&
		!roleButton.closest("[data-astra-smooth-tabs-swipe-allow]"),
	);
}

function getClampedIndex(index: number, maxIndex: number) {
	if (!Number.isFinite(index)) {
		return 0;
	}

	return Math.min(Math.max(index, 0), Math.max(maxIndex, 0));
}

function getElementWidth(element: HTMLElement | null) {
	if (!element) {
		return 0;
	}

	return element.offsetWidth || element.getBoundingClientRect().width || 0;
}

function getElementHeight(element: HTMLElement | null) {
	if (!element) {
		return 0;
	}

	return element.scrollHeight || element.getBoundingClientRect().height || 0;
}

export function AstraSmoothTabs<TValue extends string = string>({
	ariaLabel,
	className,
	items,
	listClassName,
	listFramePortalTarget,
	onValueChange,
	panelClassName,
	trackClassName,
	triggerClassName,
	value,
	viewportClassName,
	viewportMode = "auto-height",
}: AstraSmoothTabsProps<TValue>) {
	const idBase = React.useId();
	const listFrameRef = React.useRef<HTMLDivElement | null>(null);
	const viewportRef = React.useRef<HTMLDivElement | null>(null);
	const panelRefs = React.useRef(new Map<TValue, HTMLElement>());
	const startXRef = React.useRef(0);
	const startYRef = React.useRef(0);
	const startTimeRef = React.useRef(0);
	const currentXRef = React.useRef(0);
	const directionLockRef = React.useRef<DirectionLock>(null);
	const isTouchingRef = React.useRef(false);
	const wheelCooldownRef = React.useRef(false);
	const wheelTimerRef = React.useRef<ReturnType<
		typeof globalThis.setTimeout
	> | null>(null);
	const heightAnimationFrameRef = React.useRef<number | null>(null);
	const indicatorAnimationFrameRef = React.useRef<number | null>(null);
	const [isDragging, setIsDragging] = React.useState(false);
	const [currentX, setCurrentX] = React.useState(0);
	const [indicatorBounds, setIndicatorBounds] =
		React.useState<IndicatorBounds>(HIDDEN_INDICATOR_BOUNDS);
	const [viewportHeight, setViewportHeight] = React.useState<number | null>(
		null,
	);
	const activeIndex = getClampedIndex(
		items.findIndex((item) => item.value === value),
		items.length - 1,
	);
	const activeItem = items[activeIndex] ?? null;
	const shouldMeasureViewportHeight = viewportMode === "auto-height";

	const setPanelRef = React.useCallback(
		(itemValue: TValue) => (node: HTMLElement | null) => {
			if (node) {
				panelRefs.current.set(itemValue, node);
				return;
			}

			panelRefs.current.delete(itemValue);
		},
		[],
	);

	const setDraggedOffset = React.useCallback((nextX: number) => {
		currentXRef.current = nextX;
		setCurrentX(nextX);
	}, []);

	const resetGesture = React.useCallback(() => {
		directionLockRef.current = null;
		isTouchingRef.current = false;
		currentXRef.current = 0;
		setIsDragging(false);
		setCurrentX(0);
	}, []);

	const selectIndex = React.useCallback(
		(nextIndex: number) => {
			const item = items[nextIndex];

			if (!item || item.disabled || item.value === value) {
				return;
			}

			onValueChange(item.value);
		},
		[items, onValueChange, value],
	);

	const measureActivePanelHeight = React.useCallback(() => {
		if (!shouldMeasureViewportHeight) {
			setViewportHeight((currentHeight) =>
				currentHeight === null ? currentHeight : null,
			);
			return;
		}

		const activePanel = activeItem
			? (panelRefs.current.get(activeItem.value) ?? null)
			: null;
		const nextHeight = getElementHeight(activePanel);

		setViewportHeight((currentHeight) => {
			if (nextHeight <= 0) {
				return currentHeight === null ? currentHeight : null;
			}

			return currentHeight === nextHeight ? currentHeight : nextHeight;
		});
	}, [activeItem, shouldMeasureViewportHeight]);

	const cancelScheduledMeasure = React.useCallback(() => {
		if (
			heightAnimationFrameRef.current !== null &&
			typeof cancelAnimationFrame === "function"
		) {
			cancelAnimationFrame(heightAnimationFrameRef.current);
		}

		heightAnimationFrameRef.current = null;
	}, []);

	const scheduleActivePanelMeasure = React.useCallback(() => {
		cancelScheduledMeasure();

		if (typeof requestAnimationFrame === "function") {
			heightAnimationFrameRef.current = requestAnimationFrame(() => {
				heightAnimationFrameRef.current = null;
				measureActivePanelHeight();
			});
			return;
		}

		measureActivePanelHeight();
	}, [cancelScheduledMeasure, measureActivePanelHeight]);

	const getList = React.useCallback(() => {
		const listFrame = listFramePortalTarget ?? listFrameRef.current;

		return (
			listFrame?.querySelector<HTMLElement>('[role="tablist"]') ?? null
		);
	}, [listFramePortalTarget]);

	const cancelScheduledIndicatorMeasure = React.useCallback(() => {
		if (
			indicatorAnimationFrameRef.current !== null &&
			typeof cancelAnimationFrame === "function"
		) {
			cancelAnimationFrame(indicatorAnimationFrameRef.current);
		}

		indicatorAnimationFrameRef.current = null;
	}, []);

	const measureIndicator = React.useCallback(() => {
		const list = getList();
		const activeTrigger = list
			? findActiveTrigger(list, String(value))
			: null;

		if (!list || !activeTrigger || activeTrigger.disabled) {
			setIndicatorBounds((current) =>
				current.left === HIDDEN_INDICATOR_BOUNDS.left &&
				current.width === HIDDEN_INDICATOR_BOUNDS.width
					? current
					: HIDDEN_INDICATOR_BOUNDS,
			);
			return;
		}

		const nextBounds = {
			left: activeTrigger.offsetLeft,
			width: activeTrigger.offsetWidth,
		};

		setIndicatorBounds((current) =>
			current.left === nextBounds.left &&
			current.width === nextBounds.width
				? current
				: nextBounds,
		);
	}, [getList, value]);

	const scheduleIndicatorMeasure = React.useCallback(() => {
		cancelScheduledIndicatorMeasure();

		if (typeof requestAnimationFrame === "function") {
			indicatorAnimationFrameRef.current = requestAnimationFrame(() => {
				indicatorAnimationFrameRef.current = null;
				measureIndicator();
			});
			return;
		}

		measureIndicator();
	}, [cancelScheduledIndicatorMeasure, measureIndicator]);

	React.useLayoutEffect(() => {
		cancelScheduledMeasure();

		if (!shouldMeasureViewportHeight) {
			setViewportHeight((currentHeight) =>
				currentHeight === null ? currentHeight : null,
			);
			return cancelScheduledMeasure;
		}

		measureActivePanelHeight();

		const activePanel = activeItem
			? (panelRefs.current.get(activeItem.value) ?? null)
			: null;

		if (typeof ResizeObserver !== "function" || !activePanel) {
			return cancelScheduledMeasure;
		}

		const observer = new ResizeObserver(scheduleActivePanelMeasure);
		observer.observe(activePanel);

		return () => {
			observer.disconnect();
			cancelScheduledMeasure();
		};
	}, [
		activeItem,
		cancelScheduledMeasure,
		measureActivePanelHeight,
		shouldMeasureViewportHeight,
		scheduleActivePanelMeasure,
	]);

	React.useLayoutEffect(() => {
		cancelScheduledIndicatorMeasure();
		measureIndicator();

		return cancelScheduledIndicatorMeasure;
	}, [cancelScheduledIndicatorMeasure, items, measureIndicator]);

	React.useLayoutEffect(() => {
		const list = getList();
		const activeTrigger = list
			? findActiveTrigger(list, String(value))
			: null;

		if (typeof ResizeObserver !== "function" || !list) {
			return undefined;
		}

		const observer = new ResizeObserver(() => {
			scheduleIndicatorMeasure();
		});
		observer.observe(list);

		if (activeTrigger) {
			observer.observe(activeTrigger);
		}

		return () => {
			observer.disconnect();
			cancelScheduledIndicatorMeasure();
		};
	}, [
		cancelScheduledIndicatorMeasure,
		getList,
		scheduleIndicatorMeasure,
		value,
	]);

	React.useLayoutEffect(() => {
		for (const item of items) {
			const panel = panelRefs.current.get(item.value);

			if (!panel) {
				continue;
			}

			if (item.value === activeItem?.value) {
				panel.removeAttribute("inert");
			} else {
				panel.setAttribute("inert", "");
			}
		}
	}, [activeItem?.value, items]);

	React.useEffect(() => {
		resetGesture();
	}, [resetGesture, value, items.length]);

	React.useEffect(() => {
		return () => {
			if (wheelTimerRef.current) {
				globalThis.clearTimeout(wheelTimerRef.current);
			}
			cancelScheduledMeasure();
			cancelScheduledIndicatorMeasure();
		};
	}, [cancelScheduledIndicatorMeasure, cancelScheduledMeasure]);

	const handleTouchStart = React.useCallback(
		(event: React.TouchEvent<HTMLDivElement>) => {
			if (shouldIgnoreSwipe(event.target)) {
				return;
			}

			const touch = event.touches[0];
			if (!touch) {
				return;
			}

			directionLockRef.current = null;
			isTouchingRef.current = true;
			currentXRef.current = 0;
			setIsDragging(false);
			setCurrentX(0);
			startXRef.current = touch.clientX;
			startYRef.current = touch.clientY;
			startTimeRef.current = Date.now();
		},
		[],
	);

	const handleTouchMove = React.useCallback(
		(event: React.TouchEvent<HTMLDivElement>) => {
			if (!isTouchingRef.current) {
				return;
			}

			const touch = event.touches[0];
			if (!touch) {
				return;
			}

			const diffX = touch.clientX - startXRef.current;
			const diffY = touch.clientY - startYRef.current;

			if (directionLockRef.current === null) {
				if (
					Math.abs(diffX) > HORIZONTAL_LOCK_THRESHOLD ||
					Math.abs(diffY) > HORIZONTAL_LOCK_THRESHOLD
				) {
					directionLockRef.current =
						Math.abs(diffX) > Math.abs(diffY)
							? "horizontal"
							: "vertical";

					if (directionLockRef.current === "horizontal") {
						setIsDragging(true);
					}
				}
			}

			if (directionLockRef.current !== "horizontal") {
				return;
			}

			if (event.cancelable) {
				event.preventDefault();
			}

			const isFirstTab = activeIndex === 0;
			const isLastTab = activeIndex === items.length - 1;
			const nextX =
				(isFirstTab && diffX > 0) || (isLastTab && diffX < 0)
					? diffX / EDGE_RESISTANCE
					: diffX;

			setDraggedOffset(nextX);
		},
		[activeIndex, items.length, setDraggedOffset],
	);

	const handleTouchEnd = React.useCallback(() => {
		if (!isTouchingRef.current) {
			return;
		}

		const wasHorizontal = directionLockRef.current === "horizontal";
		const dragOffset = currentXRef.current;
		const viewportWidth = getElementWidth(viewportRef.current);
		const moveDuration = Date.now() - startTimeRef.current;
		const absX = Math.abs(dragOffset);
		const shouldSwitch =
			wasHorizontal &&
			viewportWidth > 0 &&
			((moveDuration < QUICK_FLICK_MAX_MS && absX > QUICK_FLICK_MIN_PX) ||
				absX > viewportWidth * WIDE_DRAG_RATIO);

		if (shouldSwitch) {
			if (dragOffset < 0 && activeIndex < items.length - 1) {
				selectIndex(activeIndex + 1);
			} else if (dragOffset > 0 && activeIndex > 0) {
				selectIndex(activeIndex - 1);
			}
		}

		resetGesture();
	}, [activeIndex, items.length, resetGesture, selectIndex]);

	const activateWheelCooldown = React.useCallback(() => {
		wheelCooldownRef.current = true;

		if (wheelTimerRef.current) {
			globalThis.clearTimeout(wheelTimerRef.current);
		}

		wheelTimerRef.current = globalThis.setTimeout(() => {
			wheelCooldownRef.current = false;
			wheelTimerRef.current = null;
		}, WHEEL_COOLDOWN_MS);
	}, []);

	const handleWheel = React.useCallback(
		(event: React.WheelEvent<HTMLDivElement>) => {
			if (wheelCooldownRef.current || items.length < 2) {
				return;
			}

			if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) {
				return;
			}

			if (
				event.deltaX > WHEEL_THRESHOLD &&
				activeIndex < items.length - 1
			) {
				selectIndex(activeIndex + 1);
				activateWheelCooldown();
			} else if (event.deltaX < -WHEEL_THRESHOLD && activeIndex > 0) {
				selectIndex(activeIndex - 1);
				activateWheelCooldown();
			}
		},
		[activateWheelCooldown, activeIndex, items.length, selectIndex],
	);

	const tabCount = Math.max(items.length, 1);
	const baseTranslate = items.length ? -(activeIndex * 100) / tabCount : 0;
	const trackStyle: React.CSSProperties = {
		transform: `translateX(calc(${baseTranslate}% + ${currentX}px))`,
		width: `${tabCount * 100}%`,
	};
	const panelWidth = `${100 / tabCount}%`;
	const tabList = (
		<div
			aria-label={ariaLabel}
			className={cn("astra-smooth-tabs__list", listClassName)}
			role="tablist"
		>
			{items.map((item, index) => {
				const tabId = `${idBase}-${item.value}-tab`;
				const panelId = `${idBase}-${item.value}-panel`;
				const isActive = index === activeIndex;

				return (
					<button
						aria-controls={panelId}
						aria-selected={isActive}
						className={cn(
							"astra-smooth-tabs__trigger",
							triggerClassName,
						)}
						data-astra-smooth-tab-value={item.value}
						data-state={isActive ? "active" : "inactive"}
						disabled={item.disabled}
						id={tabId}
						key={item.value}
						role="tab"
						tabIndex={isActive ? 0 : -1}
						type="button"
						onClick={() => {
							selectIndex(index);
						}}
					>
						{item.icon ? (
							<UiIcon
								aria-hidden={true}
								className="astra-smooth-tabs__trigger-icon"
								icon={item.icon}
								size="sm"
							/>
						) : null}
						<span className="astra-smooth-tabs__trigger-label">
							{item.label}
						</span>
					</button>
				);
			})}
			<span
				aria-hidden={true}
				className="astra-smooth-tabs__indicator"
				data-state={indicatorBounds.width > 0 ? "visible" : "hidden"}
				style={{
					transform: `translate3d(${indicatorBounds.left}px, 0, 0) scaleX(${indicatorBounds.width})`,
				}}
			/>
		</div>
	);
	const listFrame =
		listFramePortalTarget === undefined ? (
			<div className="astra-smooth-tabs__list-frame" ref={listFrameRef}>
				{tabList}
			</div>
		) : listFramePortalTarget ? (
			createPortal(tabList, listFramePortalTarget)
		) : null;

	return (
		<div
			className={cn("astra-smooth-tabs", className)}
			data-dragging={isDragging ? "true" : "false"}
			data-viewport-mode={viewportMode}
		>
			{listFrame}
			<div
				className={cn("astra-smooth-tabs__viewport", viewportClassName)}
				ref={viewportRef}
				style={{
					height:
						viewportHeight !== null
							? `${viewportHeight}px`
							: undefined,
					userSelect: isDragging ? "none" : undefined,
				}}
				onTouchCancel={handleTouchEnd}
				onTouchEnd={handleTouchEnd}
				onTouchMove={handleTouchMove}
				onTouchStart={handleTouchStart}
				onWheel={handleWheel}
			>
				<div
					className={cn("astra-smooth-tabs__track", trackClassName)}
					style={trackStyle}
				>
					{items.map((item, index) => {
						const tabId = `${idBase}-${item.value}-tab`;
						const panelId = `${idBase}-${item.value}-panel`;
						const isActive = index === activeIndex;
						const {
							className: itemPanelClassName,
							style: itemPanelStyle,
							...itemPanelProps
						} = item.panelProps ?? {};

						return (
							<section
								{...itemPanelProps}
								aria-hidden={isActive ? undefined : true}
								aria-labelledby={tabId}
								className={cn(
									"astra-smooth-tabs__panel",
									panelClassName,
									item.panelClassName,
									itemPanelClassName,
								)}
								data-state={isActive ? "active" : "inactive"}
								id={panelId}
								key={item.value}
								ref={setPanelRef(item.value)}
								role="tabpanel"
								style={{
									...itemPanelStyle,
									width: panelWidth,
								}}
							>
								{item.content}
							</section>
						);
					})}
				</div>
			</div>
		</div>
	);
}
