import * as React from "react";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/shadcn/tooltip";
import { UiIcon } from "@/components/ui/shared/icon";
import { ChevronLeft, ChevronRight } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";

export interface SwipePagerProps {
	canSwipeNext?: boolean;
	canSwipePrevious?: boolean;
	currentIndex: number;
	isNativeSwipeBusy?: boolean;
	onNext: () => void;
	onPrevious: () => void;
	total: number;
}

type SwipeDirection = "next" | "previous";

function SwipePagerButton({
	disabled,
	feedbackActive,
	hidden,
	icon,
	label,
	onClick,
}: {
	disabled: boolean;
	feedbackActive: boolean;
	hidden: boolean;
	icon: typeof ChevronLeft;
	label: string;
	onClick: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					aria-label={label}
					className="astra-swipePager__button"
					data-hidden={hidden ? "true" : "false"}
					data-swipe-feedback={feedbackActive ? "active" : "idle"}
					disabled={disabled || hidden}
					onClick={() => {
						if (!disabled && !hidden) {
							onClick();
						}
					}}
					type="button"
				>
					<UiIcon aria-hidden="true" icon={icon} size="sm" />
				</button>
			</TooltipTrigger>
			<TooltipContent side="top" sideOffset={6}>
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

export function SwipePager({
	canSwipeNext,
	canSwipePrevious,
	currentIndex,
	isNativeSwipeBusy = false,
	onNext,
	onPrevious,
	total,
}: SwipePagerProps) {
	const safeTotal = Math.max(1, Math.floor(total) || 1);
	const clampedIndex = Math.min(
		safeTotal - 1,
		Math.max(0, Math.floor(currentIndex) || 0),
	);
	const hasMultipleSwipes = safeTotal > 1;
	const canGoPrevious = canSwipePrevious ?? hasMultipleSwipes;
	const canGoNext = canSwipeNext ?? true;
	const previousLabel = translateAstra("messageActions.swipe.previous");
	const nextLabel = translateAstra("messageActions.swipe.next");
	const [feedbackDirection, setFeedbackDirection] =
		React.useState<SwipeDirection | null>(null);

	React.useEffect(() => {
		if (!isNativeSwipeBusy) {
			setFeedbackDirection(null);
		}
	}, [clampedIndex, isNativeSwipeBusy]);

	if (!canGoPrevious && !canGoNext && !isNativeSwipeBusy) {
		return null;
	}

	return (
		<TooltipProvider delayDuration={0}>
			<div className="astra-swipePager" data-hidden="false">
				<SwipePagerButton
					disabled={isNativeSwipeBusy}
					feedbackActive={feedbackDirection === "previous"}
					hidden={!canGoPrevious}
					icon={ChevronLeft}
					label={previousLabel}
					onClick={() => {
						setFeedbackDirection("previous");
						onPrevious();
					}}
				/>
				<span
					aria-atomic="true"
					aria-live="polite"
					className="astra-swipePager__counter"
				>
					{clampedIndex + 1} / {safeTotal}
				</span>
				<SwipePagerButton
					disabled={isNativeSwipeBusy}
					feedbackActive={feedbackDirection === "next"}
					hidden={!canGoNext}
					icon={ChevronRight}
					label={nextLabel}
					onClick={() => {
						setFeedbackDirection("next");
						onNext();
					}}
				/>
			</div>
		</TooltipProvider>
	);
}
