import * as React from "react";

import { UiIcon } from "@/components/ui/shared/icon";
import { Button } from "@/components/ui/shadcn/button";
import type { SillyTavernInterfacePageMainNavigationItem } from "@/packages/features/sillytavern-interface/routes/types";

export interface SillyTavernInterfaceMainNavigationStripProps {
	activePageKey: string;
	ariaLabel: string;
	id: string;
	items: readonly SillyTavernInterfacePageMainNavigationItem[];
	onPageSelect(pageKey: string): void;
	visible: boolean;
}

interface MainNavigationSwipeState {
	endX: number;
	endY: number;
	pointerId: number;
	startX: number;
	startY: number;
}

const MAIN_NAVIGATION_SWIPE_MIN_DISTANCE_PX = 32;
const MAIN_NAVIGATION_SWIPE_HORIZONTAL_RATIO = 1.25;

function isMainNavigationItemActive({
	activePageKey,
	item,
}: {
	activePageKey: string;
	item: SillyTavernInterfacePageMainNavigationItem;
}) {
	return (
		item.pageKey === activePageKey ||
		item.activePageKeys?.includes(activePageKey) === true
	);
}

function resolveActiveMainNavigationIndex({
	activePageKey,
	items,
}: {
	activePageKey: string;
	items: readonly SillyTavernInterfacePageMainNavigationItem[];
}) {
	return items.findIndex((item) =>
		isMainNavigationItemActive({
			activePageKey,
			item,
		}),
	);
}

function releasePointerCaptureSafely(
	currentTarget: HTMLDivElement,
	pointerId: number,
) {
	if (typeof currentTarget.releasePointerCapture !== "function") {
		return;
	}

	try {
		currentTarget.releasePointerCapture(pointerId);
	} catch {
		// Ignore unsupported capture state in test and browser edge cases.
	}
}

function resolveSwipeTarget({
	activePageKey,
	endX,
	endY,
	items,
	startX,
	startY,
}: {
	activePageKey: string;
	endX: number;
	endY: number;
	items: readonly SillyTavernInterfacePageMainNavigationItem[];
	startX: number;
	startY: number;
}) {
	const deltaX = endX - startX;
	const deltaY = endY - startY;
	const absoluteDeltaX = Math.abs(deltaX);
	const absoluteDeltaY = Math.abs(deltaY);

	if (
		absoluteDeltaX < MAIN_NAVIGATION_SWIPE_MIN_DISTANCE_PX ||
		absoluteDeltaX < absoluteDeltaY * MAIN_NAVIGATION_SWIPE_HORIZONTAL_RATIO
	) {
		return null;
	}

	const activeIndex = resolveActiveMainNavigationIndex({
		activePageKey,
		items,
	});

	if (activeIndex < 0) {
		return null;
	}

	return deltaX < 0 ? items[activeIndex + 1] : items[activeIndex - 1];
}

export function SillyTavernInterfaceMainNavigationStrip({
	activePageKey,
	ariaLabel,
	id,
	items,
	onPageSelect,
	visible,
}: SillyTavernInterfaceMainNavigationStripProps) {
	const swipeStateRef = React.useRef<MainNavigationSwipeState | null>(null);
	const suppressClickRef = React.useRef(false);

	const handlePointerDown = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			suppressClickRef.current = false;

			if (!visible || event.pointerType === "mouse" || items.length < 2) {
				swipeStateRef.current = null;
				return;
			}

			swipeStateRef.current = {
				endX: event.clientX,
				endY: event.clientY,
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
			};

			if (typeof event.currentTarget.setPointerCapture === "function") {
				try {
					event.currentTarget.setPointerCapture(event.pointerId);
				} catch {
					// Ignore unsupported capture state in test and browser edge cases.
				}
			}
		},
		[items.length, visible],
	);

	const handlePointerMove = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			const swipeState = swipeStateRef.current;

			if (
				!swipeState ||
				swipeState.pointerId !== event.pointerId ||
				event.pointerType === "mouse"
			) {
				return;
			}

			const nextSwipeState = {
				...swipeState,
				endX: event.clientX,
				endY: event.clientY,
			};

			swipeStateRef.current = nextSwipeState;

			if (!visible) {
				return;
			}

			const nextItem = resolveSwipeTarget({
				activePageKey,
				endX: nextSwipeState.endX,
				endY: nextSwipeState.endY,
				items,
				startX: nextSwipeState.startX,
				startY: nextSwipeState.startY,
			});

			if (!nextItem) {
				return;
			}

			swipeStateRef.current = null;
			suppressClickRef.current = true;
			releasePointerCaptureSafely(event.currentTarget, event.pointerId);
			onPageSelect(nextItem.pageKey);
		},
		[activePageKey, items, onPageSelect, visible],
	);

	const handlePointerCancel = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			swipeStateRef.current = null;
			suppressClickRef.current = false;
			releasePointerCaptureSafely(event.currentTarget, event.pointerId);
		},
		[],
	);

	const handlePointerUp = React.useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			const swipeState = swipeStateRef.current;

			if (
				!swipeState ||
				swipeState.pointerId !== event.pointerId ||
				event.pointerType === "mouse"
			) {
				return;
			}

			swipeStateRef.current = null;
			releasePointerCaptureSafely(event.currentTarget, event.pointerId);

			if (!visible) {
				return;
			}

			const endX =
				event.clientX !== swipeState.endX
					? event.clientX
					: swipeState.endX;
			const endY =
				event.clientY !== swipeState.endY
					? event.clientY
					: swipeState.endY;
			const nextItem = resolveSwipeTarget({
				activePageKey,
				endX,
				endY,
				items,
				startX: swipeState.startX,
				startY: swipeState.startY,
			});

			if (!nextItem) {
				return;
			}

			suppressClickRef.current = true;
			onPageSelect(nextItem.pageKey);
		},
		[activePageKey, items, onPageSelect, visible],
	);

	const handleItemClickCapture = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			if (!suppressClickRef.current) {
				return;
			}

			suppressClickRef.current = false;
			event.preventDefault();
			event.stopPropagation();
		},
		[],
	);

	return (
		<nav
			aria-hidden={!visible}
			aria-label={ariaLabel}
			className="sillytavern-interface__main-nav-strip"
			data-state={visible ? "open" : "closed"}
			id={id}
		>
			<div
				className="sillytavern-interface__main-nav-list"
				onPointerCancel={handlePointerCancel}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
			>
				{items.map((item) => {
					const isActive = isMainNavigationItemActive({
						activePageKey,
						item,
					});

					return (
						<Button
							aria-current={isActive ? "page" : undefined}
							aria-label={item.label}
							className="sillytavern-interface__main-nav-item"
							data-active={isActive ? "true" : "false"}
							key={item.key}
							size="default"
							tabIndex={visible ? undefined : -1}
							type="button"
							variant="ghost"
							onClickCapture={handleItemClickCapture}
							onClick={() => {
								onPageSelect(item.pageKey);
							}}
						>
							<UiIcon
								aria-hidden={true}
								className="sillytavern-interface__main-nav-item-icon"
								icon={item.icon}
								size="sm"
							/>
						</Button>
					);
				})}
			</div>
		</nav>
	);
}
