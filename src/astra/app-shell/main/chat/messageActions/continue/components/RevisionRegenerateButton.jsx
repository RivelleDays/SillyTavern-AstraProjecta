import React from 'react'
import { RefreshCw } from 'lucide-react'
import { RevisionIconButton } from './RevisionIconButton.jsx'

export function RevisionRegenerateButton({ onClick, disabled, label = 'Regenerate last output' }) {
	return (
		<RevisionIconButton
			icon={<RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />}
			label={label}
			onClick={onClick}
			disabled={disabled}
		/>
	)
}
