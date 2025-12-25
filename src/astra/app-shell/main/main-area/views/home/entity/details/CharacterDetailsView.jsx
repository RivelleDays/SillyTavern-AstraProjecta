import React from 'react'
import { createPortal } from 'react-dom'
import {
	PencilLine as PencilLineIcon,
	Save as SaveIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getHomePrimaryBarHost } from '../../homePrimaryBarHost.js'
import {
	buildFormFromCharacter,
	buildMergePayload,
	isFormDirty,
	normalizeAlternateGreetingsInput,
	notifyCharacterEdited,
	refreshCharactersCache,
	saveCharacterAttributes,
	showToast,
} from './characterDetailsUtils.js'
import { CharacterDetailsSections } from './characterDetailsSections.jsx'

function useDerivedForm(character) {
	return React.useMemo(() => buildFormFromCharacter(character), [character])
}

export function CharacterDetailsView({
	character,
	characterId = null,
	isEditing = false,
	onStartEdit,
	onCancelEdit,
	onSaved,
	onDirtyChange,
	onSavingChange,
	deps = {},
	onEditToggle,
}) {
	const derivedForm = useDerivedForm(character)
	const [form, setForm] = React.useState(derivedForm)
	const [isSaving, setIsSaving] = React.useState(false)
	const [error, setError] = React.useState('')
	const [activeAltGreetingId, setActiveAltGreetingId] = React.useState('')
	const [isDirty, setIsDirty] = React.useState(false)

	React.useEffect(() => {
		setForm(derivedForm)
		setError('')
		setActiveAltGreetingId('')
		setIsDirty(false)
		if (typeof onDirtyChange === 'function') {
			onDirtyChange(false)
		}
	}, [derivedForm, character, onDirtyChange])

	React.useEffect(() => {
		if (isEditing) return
		setForm(derivedForm)
		setActiveAltGreetingId('')
		setIsDirty(false)
		setError('')
		if (typeof onDirtyChange === 'function') {
			onDirtyChange(false)
		}
	}, [isEditing, derivedForm, onDirtyChange])

	React.useEffect(() => {
		if (isEditing) return
		if (!isSaving) return
		setIsSaving(false)
		if (typeof onSavingChange === 'function') {
			onSavingChange(false)
		}
	}, [isEditing, isSaving, onSavingChange])

	const applyDirtyState = React.useCallback(nextForm => {
		const dirty = isFormDirty(nextForm, derivedForm)
		setIsDirty(dirty)
		if (typeof onDirtyChange === 'function') {
			onDirtyChange(dirty)
		}
	}, [derivedForm, onDirtyChange])

	const updateForm = React.useCallback(updater => {
		setForm(prev => {
			const next = typeof updater === 'function' ? updater(prev) : updater
			applyDirtyState(next)
			return next
		})
	}, [applyDirtyState])

	const handleChange = field => event => {
		const value = event?.target?.value ?? ''
		updateForm(prev => ({ ...prev, [field]: value }))
	}

	const handleAlternateGreetingsChange = React.useCallback(nextValue => {
		updateForm(prev => ({ ...prev, alternateGreetings: normalizeAlternateGreetingsInput(nextValue) }))
	}, [updateForm])

	const handleAddAlternateGreeting = React.useCallback(() => {
		updateForm(prev => {
			const nextList = normalizeAlternateGreetingsInput(prev.alternateGreetings)
				.map(entry => (entry ?? '').toString())
			const nextId = `edit-greeting-${nextList.length}`
			setActiveAltGreetingId(nextId)
			return {
				...prev,
				alternateGreetings: [...nextList, ''],
			}
		})
	}, [updateForm])

	const handleTalkSliderChange = values => {
		const [value] = Array.isArray(values) ? values : []
		const numeric = Number(value)
		updateForm(prev => ({
			...prev,
			talkativeness: Number.isFinite(numeric) ? numeric : '',
		}))
	}

	const handleDepthValueChange = event => {
		const raw = event?.target?.value ?? ''
		updateForm(prev => ({
			...prev,
			depthPrompt: {
				...prev.depthPrompt,
				depth: raw === '' ? '' : Number(raw),
			},
		}))
	}

	const handleDepthRoleChange = value => {
		updateForm(prev => ({
			...prev,
			depthPrompt: {
				...prev.depthPrompt,
				role: value,
			},
		}))
	}

	const handleDepthPromptChange = event => {
		updateForm(prev => ({
			...prev,
			depthPrompt: { ...prev.depthPrompt, prompt: event?.target?.value ?? '' },
		}))
	}

	const handleTagsChange = nextValue => {
		updateForm(prev => ({ ...prev, tags: nextValue }))
	}

	const prevEditingRef = React.useRef(isEditing)
	React.useEffect(() => {
		if (!prevEditingRef.current && isEditing && typeof onStartEdit === 'function') {
			onStartEdit()
		}
		prevEditingRef.current = isEditing
	}, [isEditing, onStartEdit])

	const handleSave = async () => {
		if (isSaving || !isDirty) return
		setIsSaving(true)
		if (typeof onSavingChange === 'function') {
			onSavingChange(true)
		}
		setError('')

		try {
			const payload = buildMergePayload({
				character,
				characterId,
				form,
			})
			await saveCharacterAttributes(payload, deps)
			await refreshCharactersCache({
				deps,
				characterId,
				payload,
				character,
			})
			notifyCharacterEdited(deps)
			if (typeof onSaved === 'function') {
				await onSaved()
			}
			setIsDirty(false)
			if (typeof onDirtyChange === 'function') {
				onDirtyChange(false)
			}
			if (typeof onCancelEdit === 'function') {
				onCancelEdit()
			}
			showToast('success', 'Character details saved.')
		} catch (err) {
			const message = err?.message || 'Failed to save character details.'
			setError(message)
			showToast('error', message)
		} finally {
			setIsSaving(false)
			if (typeof onSavingChange === 'function') {
				onSavingChange(false)
			}
		}
	}

	const handleToggleEditMode = React.useCallback(() => {
		if (typeof onEditToggle === 'function') {
			onEditToggle(!isEditing)
		}
	}, [isEditing, onEditToggle])

	const editIcon = isEditing
		? null
		: <PencilLineIcon aria-hidden="true" className="astra-home-editToggle__icon" size={16} />
	const editLabel = isEditing ? 'Cancel' : 'Edit Mode'

	const primaryBarHost = React.useMemo(
		() => getHomePrimaryBarHost(globalThis?.document),
		[],
	)

	const actionBar = primaryBarHost
		? createPortal(
			<div
				className="astra-home-details__primaryActions"
				data-editing={isEditing ? 'true' : 'false'}
				role="toolbar"
				aria-label="Character details actions">
				<Button
					type="button"
					variant={isEditing ? 'ghost' : 'secondary'}
					size="sm"
					className="astra-home-editToggle"
					data-mode={isEditing ? 'editing' : 'preview'}
					data-busy={isSaving ? 'true' : 'false'}
					aria-pressed={isEditing ? 'true' : 'false'}
					onClick={handleToggleEditMode}
					disabled={isSaving}>
					{editIcon}
					<span className="astra-home-editToggle__label">{editLabel}</span>
				</Button>
				{isEditing ? (
					<Button
						onClick={handleSave}
						disabled={isSaving || !isDirty}
						className="astra-home-details__actionButton">
						{isSaving ? 'Saving...' : (
							<>
								<SaveIcon aria-hidden="true" size={16} />
								Save
							</>
						)}
					</Button>
				) : null}
			</div>,
			primaryBarHost,
		)
		: null

	return (
		<div className="astra-home-details" data-editing={isEditing ? 'true' : 'false'}>
			{actionBar}
			{error ? <p className="astra-home-details__error">{error}</p> : null}

			<CharacterDetailsSections
				form={form}
				isEditing={isEditing}
				deps={deps}
				activeAltGreetingId={activeAltGreetingId}
				onActiveAltGreetingChange={setActiveAltGreetingId}
				onFieldChange={handleChange}
				onAlternateGreetingsChange={handleAlternateGreetingsChange}
				onAddAlternateGreeting={handleAddAlternateGreeting}
				onDepthPromptChange={handleDepthPromptChange}
				onDepthValueChange={handleDepthValueChange}
				onDepthRoleChange={handleDepthRoleChange}
				onTalkSliderChange={handleTalkSliderChange}
				onTagsChange={handleTagsChange}
			/>
		</div>
	)
}
