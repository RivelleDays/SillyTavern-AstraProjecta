import React from 'react'
import { createPortal } from 'react-dom'
import { Brain, Check, ChevronDown, ChevronUp, Copy, Trash2, X } from 'lucide-react'
import { ActionIconButton } from './ActionIconButton.jsx'

export function EditModeActions({
	onCopy,
	onReason,
	onMoveUp,
	onMoveDown,
	onDelete,
	onConfirm,
	onCancel,
	canMoveUp = true,
	canMoveDown = true,
	rightSlot,
	showReasoningButton = true,
	disableReasonButton = false,
}) {
	const leftContent = (
		<div className="astra-editActionsLeft">
			<ActionIconButton
				icon={<Copy size={16} strokeWidth={1.75} aria-hidden="true" />}
				label="Copy this message"
				onClick={onCopy}
			/>
			{showReasoningButton ? (
				<ActionIconButton
					icon={<Brain size={16} strokeWidth={1.75} aria-hidden="true" />}
					label="Add reasoning block"
					onClick={onReason}
					disabled={disableReasonButton}
				/>
			) : null}
			<ActionIconButton
				icon={<ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />}
				label="Move message up"
				onClick={onMoveUp}
				disabled={!canMoveUp}
			/>
			<ActionIconButton
				icon={<ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />}
				label="Move message down"
				onClick={onMoveDown}
				disabled={!canMoveDown}
			/>
			<ActionIconButton
				icon={<Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />}
				label="Delete this message"
				onClick={onDelete}
			/>
		</div>
	)

	const rightContent = (
		<div className="astra-editActionsRight">
			<ActionIconButton
				icon={<Check size={16} strokeWidth={1.75} aria-hidden="true" />}
				label="Confirm"
				onClick={onConfirm}
			/>
			<ActionIconButton
				icon={<X size={16} strokeWidth={1.75} aria-hidden="true" />}
				label="Cancel"
				onClick={onCancel}
			/>
		</div>
	)

	return (
		<>
			{leftContent}
			{rightSlot ? createPortal(rightContent, rightSlot) : null}
		</>
	)
}
