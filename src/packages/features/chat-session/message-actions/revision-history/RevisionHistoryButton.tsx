import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/shadcn/tooltip";
import { UiIcon } from "@/components/ui/shared/icon";
import { History } from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";

export interface RevisionHistoryButtonProps {
	disabled?: boolean;
	onClick(): void;
}

export function RevisionHistoryButton({
	disabled = false,
	onClick,
}: RevisionHistoryButtonProps) {
	const label = translateAstra("messageActions.revisionHistory.open");

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild={true}>
					<button
						aria-label={label}
						className="astra-mesActions__iconButton--compact"
						disabled={disabled}
						type="button"
						onClick={() => {
							if (!disabled) {
								onClick();
							}
						}}
					>
						<UiIcon aria-hidden={true} icon={History} size="sm" />
					</button>
				</TooltipTrigger>
				<TooltipContent side="top" sideOffset={6}>
					{label}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
