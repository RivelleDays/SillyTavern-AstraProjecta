import React from 'react'
import { StepForward } from 'lucide-react'
import { RevisionIconButton } from './RevisionIconButton.jsx'

export function RevisionContinueButton({ onClick, disabled }) {
	return (
		<RevisionIconButton
			icon={<StepForward size={16} strokeWidth={1.75} aria-hidden="true" />}
			label="Continue"
			onClick={onClick}
			disabled={disabled}
		/>
	)
}
