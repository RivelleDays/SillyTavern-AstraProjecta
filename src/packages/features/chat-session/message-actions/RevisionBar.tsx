import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/shadcn/tooltip";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	History,
	type LucideIcon,
	RefreshCw,
	StepForward,
	UndoDot,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";

export interface RevisionBarHistoryAction {
	disabled?: boolean;
	onClick: () => void;
}

export interface RevisionBarProps {
	canContinue: boolean;
	canRegenerate: boolean;
	canUndo: boolean;
	historyAction?: RevisionBarHistoryAction;
	isBusy: boolean;
	onContinue: () => void;
	onRegenerate: () => void;
	onUndo: () => void;
}

function RevisionBarButton({
	disabled,
	icon,
	label,
	onClick,
}: {
	disabled: boolean;
	icon: LucideIcon;
	label: string;
	onClick: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					aria-label={label}
					className="astra-revisionBar__button"
					disabled={disabled}
					onClick={() => {
						if (!disabled) {
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

export function RevisionBar({
	canContinue,
	canRegenerate,
	canUndo,
	historyAction,
	isBusy,
	onContinue,
	onRegenerate,
	onUndo,
}: RevisionBarProps) {
	if (!canContinue && !canRegenerate && !canUndo && !historyAction) {
		return null;
	}

	return (
		<TooltipProvider delayDuration={0}>
			<div className="astra-revisionBar">
				{canUndo ? (
					<RevisionBarButton
						disabled={isBusy}
						icon={UndoDot}
						label={translateAstra("messageActions.revision.undo")}
						onClick={onUndo}
					/>
				) : null}
				{canRegenerate ? (
					<RevisionBarButton
						disabled={isBusy}
						icon={RefreshCw}
						label={translateAstra(
							"messageActions.revision.regenerate",
						)}
						onClick={onRegenerate}
					/>
				) : null}
				{canContinue ? (
					<RevisionBarButton
						disabled={isBusy}
						icon={StepForward}
						label={translateAstra(
							"messageActions.revision.continue",
						)}
						onClick={onContinue}
					/>
				) : null}
				{historyAction ? (
					<RevisionBarButton
						disabled={historyAction.disabled === true}
						icon={History}
						label={translateAstra(
							"messageActions.revisionHistory.open",
						)}
						onClick={historyAction.onClick}
					/>
				) : null}
			</div>
		</TooltipProvider>
	);
}
