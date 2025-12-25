import React from 'react'
import { FileInput, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function ExternalImportIcon(props) {
	return (
		<svg
			aria-hidden="true"
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M19 18a3.5 3.5 0 0 0 0 -7h-1a5 4.5 0 0 0 -11 -2a4.6 4.4 0 0 0 -2.1 8.4" />
			<path d="M12 13l0 9" />
			<path d="M9 19l3 3l3 -3" />
		</svg>
	)
}

function GroupPlusIcon(props) {
	return (
		<svg
			aria-hidden="true"
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M5 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
			<path d="M3 21v-2a4 4 0 0 1 4 -4h4c.96 0 1.84 .338 2.53 .901" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			<path d="M16 19h6" />
			<path d="M19 16v6" />
		</svg>
	)
}

const ACTIONS = [
	{
		key: 'create-character',
		label: 'Create new character card',
		caption: 'Create Card',
		showCaption: true,
		icon: <UserPlus size={20} strokeWidth={1.8} aria-hidden="true" />,
	},
	{
		key: 'import-file',
		label: 'Import character from file',
		caption: 'Import File',
		icon: <FileInput size={20} strokeWidth={1.8} aria-hidden="true" />,
	},
	{
		key: 'import-url',
		label: 'Import content from URL',
		caption: 'Import URL',
		icon: <ExternalImportIcon width={20} height={20} />,
	},
	{
		key: 'create-group',
		label: 'Create new chat group',
		caption: 'Create Group',
		icon: <GroupPlusIcon width={20} height={20} />,
	},
]

function ActionButton({ action }) {
	const isPrimary = action.key === 'create-character'

	return (
		<div className="astra-home-actionsBar__item">
			<Tooltip>
				<TooltipTrigger asChild>
					{isPrimary ? (
						<Button
							type="button"
							variant="outline"
							className="astra-home-actionsBar__button"
							aria-label={action.label}
						>
							<span className="astra-home-actionsBar__icon">{action.icon}</span>
							<span className="astra-home-actionsBar__caption">{action.caption}</span>
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className={cn('astra-home-filterFavoriteToggle')}
							aria-label={action.label}
						>
							<span className="astra-home-actionsBar__icon">{action.icon}</span>
							<span className="astra-home-actionsBar__caption astra-home-actionsBar__caption--hidden">
								{action.caption}
							</span>
						</Button>
					)}
				</TooltipTrigger>
				<TooltipContent
					side="bottom"
					sideOffset={8}
					showArrow
					className="astra-tooltip dark px-2 py-1 text-xs"
				>
					{action.label}
				</TooltipContent>
			</Tooltip>
		</div>
	)
}

export function HomeQuickActions() {
	return (
		<TooltipProvider delayDuration={0}>
			<div
				className="astra-home-actionsBar"
				role="group"
				aria-label="Character cards and groups quick actions"
			>
				{ACTIONS.map(action => (
					<ActionButton key={action.key} action={action} />
				))}
			</div>
		</TooltipProvider>
	)
}
