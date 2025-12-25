import React from 'react'
import { History } from 'lucide-react'
import { RevisionIconButton } from './RevisionIconButton.jsx'

export function RevisionHistoryButton({ onClick, disabled }) {
	return (
		<RevisionIconButton
			icon={<History size={16} strokeWidth={1.75} aria-hidden="true" />}
			label="Revision history"
			onClick={onClick}
			disabled={disabled}
			variant="compact"
			withProvider
		/>
	)
}
