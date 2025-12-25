import React from 'react'
import { Undo } from 'lucide-react'
import { RevisionIconButton } from './RevisionIconButton.jsx'

export function RevisionUndoButton({ onClick, disabled }) {
	return (
		<RevisionIconButton
			icon={<Undo size={16} strokeWidth={1.75} aria-hidden="true" />}
			label="Revert one step"
			onClick={onClick}
			disabled={disabled}
		/>
	)
}
