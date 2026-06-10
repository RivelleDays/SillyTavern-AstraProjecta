import * as React from "react";

import { UiIcon } from "@/components/ui/shared/icon";
import type { LucideIcon } from "@/components/ui/shared/icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/shadcn/tabs";
import { cn } from "@/lib/utils";

export interface AstraSlidingTabItem {
	disabled?: boolean;
	icon?: LucideIcon;
	label: React.ReactNode;
	value: string;
}

export interface AstraSlidingTabsProps {
	ariaLabel: string;
	className?: string;
	items: readonly AstraSlidingTabItem[];
	listClassName?: string;
	onValueChange(value: string): void;
	triggerClassName?: string;
	value: string;
}

interface IndicatorBounds {
	left: number;
	width: number;
}

const HIDDEN_INDICATOR_BOUNDS: IndicatorBounds = {
	left: 0,
	width: 0,
};

function findActiveTrigger(
	list: HTMLElement,
	value: string,
): HTMLButtonElement | null {
	return (
		Array.from(
			list.querySelectorAll<HTMLButtonElement>(
				"[data-astra-sliding-tab-value]",
			),
		).find((trigger) => trigger.dataset.astraSlidingTabValue === value) ??
		null
	);
}

export function AstraSlidingTabs({
	ariaLabel,
	className,
	items,
	listClassName,
	onValueChange,
	triggerClassName,
	value,
}: AstraSlidingTabsProps) {
	const listFrameRef = React.useRef<HTMLDivElement | null>(null);
	const animationFrameRef = React.useRef<number | null>(null);
	const [indicatorBounds, setIndicatorBounds] =
		React.useState<IndicatorBounds>(HIDDEN_INDICATOR_BOUNDS);

	const getList = React.useCallback(() => {
		return (
			listFrameRef.current?.querySelector<HTMLElement>(
				'[role="tablist"]',
			) ?? null
		);
	}, []);

	const cancelScheduledMeasure = React.useCallback(() => {
		if (
			animationFrameRef.current !== null &&
			typeof cancelAnimationFrame === "function"
		) {
			cancelAnimationFrame(animationFrameRef.current);
		}

		animationFrameRef.current = null;
	}, []);

	const measureIndicator = React.useCallback(() => {
		const list = getList();
		const activeTrigger = list ? findActiveTrigger(list, value) : null;

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

	const scheduleMeasureIndicator = React.useCallback(() => {
		cancelScheduledMeasure();

		if (typeof requestAnimationFrame === "function") {
			animationFrameRef.current = requestAnimationFrame(() => {
				animationFrameRef.current = null;
				measureIndicator();
			});
			return;
		}

		measureIndicator();
	}, [cancelScheduledMeasure, measureIndicator]);

	React.useLayoutEffect(() => {
		cancelScheduledMeasure();
		measureIndicator();

		return cancelScheduledMeasure;
	}, [cancelScheduledMeasure, items, measureIndicator]);

	React.useLayoutEffect(() => {
		const list = getList();
		const activeTrigger = list ? findActiveTrigger(list, value) : null;

		if (typeof ResizeObserver !== "function" || !list) {
			return undefined;
		}

		const observer = new ResizeObserver(() => {
			scheduleMeasureIndicator();
		});
		observer.observe(list);

		if (activeTrigger) {
			observer.observe(activeTrigger);
		}

		return () => {
			observer.disconnect();
		};
	}, [getList, scheduleMeasureIndicator, value]);

	return (
		<Tabs
			className={cn("astra-sliding-tabs", className)}
			value={value}
			onValueChange={onValueChange}
		>
			<div className="astra-sliding-tabs__list-frame" ref={listFrameRef}>
				<TabsList
					aria-label={ariaLabel}
					className={cn("astra-sliding-tabs__list", listClassName)}
					variant="line"
				>
					{items.map((item) => (
						<TabsTrigger
							className={cn(
								"astra-sliding-tabs__trigger",
								triggerClassName,
							)}
							data-astra-sliding-tab-value={item.value}
							disabled={item.disabled}
							key={item.value}
							value={item.value}
						>
							{item.icon ? (
								<UiIcon
									aria-hidden={true}
									className="astra-sliding-tabs__trigger-icon"
									icon={item.icon}
									size="sm"
								/>
							) : null}
							<span className="astra-sliding-tabs__trigger-label">
								{item.label}
							</span>
						</TabsTrigger>
					))}
					<span
						aria-hidden={true}
						className="astra-sliding-tabs__indicator"
						data-state={
							indicatorBounds.width > 0 ? "visible" : "hidden"
						}
						style={{
							transform: `translate3d(${indicatorBounds.left}px, 0, 0) scaleX(${indicatorBounds.width})`,
						}}
					/>
				</TabsList>
			</div>
		</Tabs>
	);
}
