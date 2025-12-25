import React from 'react'
import { PencilLine } from 'lucide-react'
import { ActionIconButton } from './ActionIconButton.jsx'

export function EditToggleButton({ onClick }) {
	return (
		<ActionIconButton
			icon={<PencilLine size={16} strokeWidth={1.75} aria-hidden="true" />}
			label="Edit this message"
			onClick={onClick}
			buttonClassName="astra-messageActions__iconButton--compact"
		/>
	)
}
