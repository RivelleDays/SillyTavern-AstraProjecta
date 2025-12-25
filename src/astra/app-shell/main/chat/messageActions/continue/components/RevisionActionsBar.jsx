import React from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RevisionContinueButton } from './RevisionContinueButton.jsx'
import { RevisionRegenerateButton } from './RevisionRegenerateButton.jsx'
import { RevisionUndoButton } from './RevisionUndoButton.jsx'

export function RevisionActionsBar({
	isBusy = false,
	canUndo = true,
	canRegenerate = true,
	canContinue = true,
	onUndo,
	onRegenerate,
	onContinue,
	regenerateLabel = 'Regenerate last continue',
}) {
	const hideBar = !canUndo && !canRegenerate && !canContinue

	return (
		<TooltipProvider delayDuration={0}>
			<div className="astra-revisionBar" data-disabled={hideBar ? 'true' : 'false'}>
				<RevisionUndoButton onClick={onUndo} disabled={isBusy || !canUndo} />
				<RevisionRegenerateButton
					onClick={onRegenerate}
					disabled={isBusy || !canRegenerate}
					label={regenerateLabel}
				/>
				<RevisionContinueButton onClick={onContinue} disabled={isBusy || !canContinue} />
			</div>
		</TooltipProvider>
	)
}
