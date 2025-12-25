import React from 'react'
import {
	ArrowDown as ArrowDownIcon,
	ArrowUp as ArrowUpIcon,
	ChevronDown as ChevronDownIcon,
	Check as CheckIcon,
	Plus as PlusIcon,
	Trash2 as TrashIcon,
} from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/astra/shared/ui/dropdownMenu'
import {
	TokenizedTextarea,
	TOKEN_LOADING,
	TOKEN_PLACEHOLDER,
	useTokenCount,
} from '@/components/ui/astra/TokenizedTextarea'
import { FieldHelperButton } from '@/components/ui/astra/FieldHelperButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import {
	ALT_GREETINGS_COPY,
	COMMON_COPY,
	FIELD_HELPERS,
	PLACEHOLDERS,
	TAGS_COPY,
	TALKATIVENESS_COPY,
} from './characterDetailsCopy.js'
import {
	addTagValue,
	normalizeAlternateGreetingsInput,
	normalizeDepthValue,
	resolveTalkativenessSliderValue,
	splitList,
} from './characterDetailsUtils.js'

const ROLE_OPTIONS = [
	{ value: 'system', label: 'System' },
	{ value: 'user', label: 'User' },
	{ value: 'assistant', label: 'Assistant' },
]

function DetailsTokenizedTextarea({
	className,
	textareaClassName,
	displayClassName,
	showTokens = true,
	tokensClassName,
	iconClassName,
	allowViewModeToggle = true,
	isEditing = false,
	onChange,
	...rest
}) {
	const [mode, setMode] = React.useState(() => (isEditing ? 'edit' : 'preview'))

	React.useEffect(() => {
		setMode(isEditing ? 'edit' : 'preview')
	}, [isEditing])

	const handleValueChange = React.useCallback(
		nextValue => {
			if (typeof onChange === 'function') {
				onChange({ target: { value: nextValue } })
			}
		},
		[onChange],
	)

	const canToggleMode = allowViewModeToggle || isEditing

	return (
		<TokenizedTextarea
			editable={isEditing}
			mode={mode}
			onModeChange={canToggleMode ? setMode : undefined}
			allowViewModeToggle={canToggleMode}
			showTokens={showTokens}
			className={className}
			textareaClassName={textareaClassName}
			displayClassName={displayClassName}
			tokensClassName={tokensClassName}
			iconClassName={iconClassName}
			emptyLabel={COMMON_COPY.notProvided}
			onValueChange={handleValueChange}
			{...rest}
		/>
	)
}

export function CharacterDetailsSections({
	form,
	isEditing,
	deps,
	activeAltGreetingId,
	onActiveAltGreetingChange,
	onFieldChange,
	onAlternateGreetingsChange,
	onAddAlternateGreeting,
	onDepthPromptChange,
	onDepthValueChange,
	onDepthRoleChange,
	onTalkSliderChange,
	onTagsChange,
}) {
	return (
		<>
			<Section title="Character Info">
				<Field
					label="Description"
					helper={FIELD_HELPERS.description}
					isEditing={isEditing}>
					{({ isEditing: editing }) => (
						<DetailsTokenizedTextarea
							value={form.description}
							onChange={editing ? onFieldChange('description') : undefined}
							placeholder={PLACEHOLDERS.description}
							isEditing={editing}
							deps={deps}
						/>
					)}
				</Field>
				<Field
					label="Greeting Message"
					helper={FIELD_HELPERS.greeting}
					isEditing={isEditing}>
					{({ isEditing: editing }) => (
						<DetailsTokenizedTextarea
							value={form.greeting}
							onChange={editing ? onFieldChange('greeting') : undefined}
							placeholder={PLACEHOLDERS.greeting}
							isEditing={editing}
							deps={deps}
						/>
					)}
				</Field>
				<Field
					label="Alternate Greetings"
					helper={FIELD_HELPERS.alternateGreetings}
					isEditing={isEditing}>
					{({ isEditing: editing }) =>
						editing ? (
							<AlternateGreetingsEditor
								value={form.alternateGreetings}
								onChange={onAlternateGreetingsChange}
								activeItem={activeAltGreetingId}
								onActiveItemChange={onActiveAltGreetingChange}
								deps={deps}
								onAddGreeting={onAddAlternateGreeting}
							/>
						) : (
							<AlternateGreetingsViewer value={form.alternateGreetings} deps={deps} />
						)
					}
				</Field>
			</Section>

			<Section title="Character Behavior">
					<Field
						label="Example Messages"
						helper={(
							<>
								<p>{FIELD_HELPERS.exampleMessages.intro}</p>
								<ul className="astra-field-helper-list">
									<li>
										{FIELD_HELPERS.exampleMessages.bullets.start.prefix}{' '}
										<code>{FIELD_HELPERS.exampleMessages.tokens.start}</code>{' '}
										{FIELD_HELPERS.exampleMessages.bullets.start.suffix}
									</li>
									<li>
										{FIELD_HELPERS.exampleMessages.bullets.labels.prefix}{' '}
										<code>{FIELD_HELPERS.exampleMessages.tokens.user}</code>
										{' and '}
										<code>{FIELD_HELPERS.exampleMessages.tokens.character}</code>{' '}
										{FIELD_HELPERS.exampleMessages.bullets.labels.suffix}
									</li>
								</ul>
							</>
						)}
						isEditing={isEditing}>
						{({ isEditing: editing }) => (
							<DetailsTokenizedTextarea
							value={form.exampleMessages}
							onChange={editing ? onFieldChange('exampleMessages') : undefined}
							placeholder={PLACEHOLDERS.exampleMessages}
							isEditing={editing}
							deps={deps}
						/>
					)}
				</Field>
				<Field
					label="Scenario"
					helper={FIELD_HELPERS.scenario}
					isEditing={isEditing}>
					{({ isEditing: editing }) => (
						<DetailsTokenizedTextarea
							value={form.scenario}
							onChange={editing ? onFieldChange('scenario') : undefined}
							placeholder={PLACEHOLDERS.scenario}
							isEditing={editing}
							deps={deps}
						/>
					)}
				</Field>
				<div className="astra-home-details__fieldRow">
					<Field
							label="Character's Note"
							helper={(
								<>
									<p>{FIELD_HELPERS.depthPrompt.intro}</p>
									<ul className="astra-field-helper-list">
										{FIELD_HELPERS.depthPrompt.bullets.map(item => (
											<li key={item.highlight}>
												<strong>{item.highlight}</strong> {item.body}
											</li>
										))}
									</ul>
								</>
							)}
							isEditing={isEditing}>
							{({ isEditing: editing }) => (
								<>
								{editing ? (
									<div className="astra-home-details__noteMeta">
										<div className="astra-home-details__noteMetaField">
											<p className="astra-home-details__noteMetaLabel">@Depth</p>
											<Input
												className="astra-home-details__input astra-home-details__input--noSpinner"
												type="number"
												inputMode="decimal"
												value={normalizeDepthValue(form.depthPrompt.depth)}
												onChange={onDepthValueChange}
												placeholder="Depth"
												min={0}
												readOnly={!editing}
												disabled={!editing}
											/>
										</div>
										<div className="astra-home-details__noteMetaField">
											<p className="astra-home-details__noteMetaLabel">Role</p>
											<DepthRoleSelect
												value={form.depthPrompt.role || 'system'}
												onChange={onDepthRoleChange}
												disabled={!editing}
											/>
										</div>
									</div>
								) : (
									<div className="astra-home-details__noteMeta">
										<div className="astra-home-details__noteMetaField">
											<p className="astra-home-details__noteMetaLabel">Depth</p>
											<p className="astra-home-details__noteMetaValue">
												{normalizeDepthValue(form.depthPrompt.depth) || '—'}
											</p>
										</div>
										<div className="astra-home-details__noteMetaField">
											<p className="astra-home-details__noteMetaLabel">Role</p>
											<p className="astra-home-details__noteMetaValue">
												{form.depthPrompt.role || 'system'}
											</p>
										</div>
									</div>
								)}
								<DetailsTokenizedTextarea
									value={form.depthPrompt.prompt}
									onChange={editing ? onDepthPromptChange : undefined}
									placeholder={PLACEHOLDERS.depthPrompt}
									isEditing={editing}
									deps={deps}
								/>
							</>
						)}
					</Field>
				</div>
				<Field
					label="Personality"
					helper={FIELD_HELPERS.personality}
					isEditing={isEditing}>
					{({ isEditing: editing }) => (
						<DetailsTokenizedTextarea
							value={form.personality}
							onChange={editing ? onFieldChange('personality') : undefined}
							placeholder={PLACEHOLDERS.personality}
							isEditing={editing}
							deps={deps}
						/>
					)}
				</Field>
				<Field
					label="Talkativeness"
					helper={FIELD_HELPERS.talkativeness}
					isEditing={isEditing}>
					{({ isEditing: editing }) => {
						const talkValue = resolveTalkativenessSliderValue(form.talkativeness)
						return (
							<div className="astra-home-details__sliderShell">
								<Slider
									value={[talkValue]}
									onValueChange={onTalkSliderChange}
									min={0}
									max={1}
									step={0.05}
									aria-label="Talkativeness"
									disabled={!editing}
								/>
								<div className="astra-home-details__sliderRefs" aria-hidden="true">
									{TALKATIVENESS_COPY.references.map(reference => (
										<span key={reference}>{reference}</span>
									))}
								</div>
							</div>
						)
					}}
				</Field>
			</Section>

			<Section title="Prompt Overrides">
				<Field
					label="Main Prompt"
					helper={FIELD_HELPERS.mainPrompt}
					isEditing={isEditing}>
					{({ isEditing: editing }) => (
						<DetailsTokenizedTextarea
							value={form.systemPrompt}
							onChange={editing ? onFieldChange('systemPrompt') : undefined}
							placeholder={PLACEHOLDERS.mainPrompt}
							isEditing={editing}
							deps={deps}
						/>
					)}
				</Field>
				<Field
					label="Post-History Instructions"
					helper={FIELD_HELPERS.postHistoryInstructions}
					isEditing={isEditing}>
					{({ isEditing: editing }) => (
						<DetailsTokenizedTextarea
							value={form.postHistoryInstructions}
							onChange={editing ? onFieldChange('postHistoryInstructions') : undefined}
							placeholder={PLACEHOLDERS.postHistoryInstructions}
							isEditing={editing}
							deps={deps}
						/>
					)}
				</Field>
			</Section>

			<Section title="Creator's Metadata">
				<div className="astra-home-details__splitFields">
					<Field
						label="Creator"
						isEditing={isEditing}>
						{({ isEditing: editing }) =>
							editing ? (
								<Input
									className="astra-home-details__input"
									value={form.creator}
									onChange={editing ? onFieldChange('creator') : undefined}
									placeholder={PLACEHOLDERS.creator}
									readOnly={!editing}
								/>
							) : (
								<ViewText value={form.creator} />
							)
						}
					</Field>
					<Field
						label="Version"
						isEditing={isEditing}>
						{({ isEditing: editing }) =>
							editing ? (
								<Input
									className="astra-home-details__input"
									value={form.characterVersion}
									onChange={editing ? onFieldChange('characterVersion') : undefined}
									placeholder={PLACEHOLDERS.characterVersion}
									readOnly={!editing}
								/>
							) : (
								<ViewText value={form.characterVersion} />
							)
						}
					</Field>
				</div>
				<Field
					label="Creator's Notes"
					helper={FIELD_HELPERS.creatorNotes}
					isEditing={isEditing}>
					{({ isEditing: editing }) => (
						<DetailsTokenizedTextarea
							value={form.creatorNotes}
							onChange={editing ? onFieldChange('creatorNotes') : undefined}
							placeholder={PLACEHOLDERS.creatorNotes}
							isEditing={editing}
							deps={deps}
							showTokens={false}
						/>
					)}
				</Field>
				<Field
					label="Tags to Embed"
					helper={FIELD_HELPERS.tags}
					isEditing={isEditing}>
					{({ isEditing: editing }) =>
						<TagsInput
							value={form.tags}
							onChange={onTagsChange}
							placeholder={PLACEHOLDERS.tags}
							disabled={!editing}
						/>
					}
				</Field>
			</Section>
		</>
	)
}

function Section({ title, children }) {
	return (
		<section className="astra-home-details__section">
			<h4 className="astra-home-details__sectionTitle">{title}</h4>
			<div className="astra-home-details__sectionBody">{children}</div>
		</section>
	)
}

function Field({ label, helper, children, isEditing, actions }) {
	const renderChild = typeof children === 'function' ? children : () => children

	return (
		<div className="astra-home-details__field" data-editing={isEditing ? 'true' : 'false'}>
			<div className="astra-home-details__fieldHeader">
				<div className="astra-home-details__fieldLabelRow">
					<Label className="astra-home-details__fieldLabel">{label}</Label>
					{helper ? <FieldHelperButton label={label} helper={helper} /> : null}
				</div>
				{actions ? <div className="astra-home-details__fieldHeaderActions">{actions}</div> : null}
			</div>
			<div className="astra-home-details__controlShell">
				<div className="astra-home-details__control">
					{renderChild({ isEditing })}
				</div>
			</div>
		</div>
	)
}

function ViewText({ value, emptyLabel = COMMON_COPY.notProvided }) {
	return (
		<TokenizedTextarea
			value={value}
			showTokens={false}
			emptyLabel={emptyLabel}
			allowViewModeToggle={false}
		/>
	)
}

function TagsInput({ value, onChange, placeholder, disabled }) {
	const tags = React.useMemo(() => splitList(value), [value])
	const [draft, setDraft] = React.useState('')
	const isEditing = !disabled
	const shouldShowEmptyState = !tags.length && !isEditing

	const commitDraft = React.useCallback(() => {
		const next = addTagValue(tags, draft)
		if (next) {
			onChange(next.join('\n'))
			setDraft('')
		}
	}, [draft, onChange, tags])

	const handleKeyDown = event => {
		if (event.key === 'Enter' || event.key === ',') {
			event.preventDefault()
			commitDraft()
		} else if (event.key === 'Backspace' && !draft && tags.length) {
			const next = tags.slice(0, tags.length - 1)
			onChange(next.join('\n'))
		}
	}

	const handleRemove = tag => {
		const next = tags.filter(item => item !== tag)
		onChange(next.join('\n'))
	}

	return (
		<div className="astra-home-details__tagsShell">
			<div className="astra-home-details__tagList">
				{tags.length ? (
					tags.map(tag => (
						<span className="astra-home-details__tagChip" key={tag}>
							<span>{tag}</span>
							{disabled ? null : (
								<button
									type="button"
									className="astra-home-details__tagRemove"
									onClick={() => handleRemove(tag)}
									disabled={disabled}
									aria-label={`Remove tag ${tag}`}>
									×
								</button>
							)}
						</span>
					))
				) : shouldShowEmptyState ? (
					<ViewText value="" emptyLabel={TAGS_COPY.empty} />
				) : null}
			</div>
			{disabled ? null : (
				<div className="astra-home-details__tagInputRow">
					<Input
						value={draft}
						disabled={disabled}
						onChange={event => setDraft(event?.target?.value ?? '')}
						onKeyDown={handleKeyDown}
						onBlur={commitDraft}
						placeholder={placeholder}
						className="astra-home-details__input astra-home-details__tagInput"
						readOnly={disabled}
					/>
					<Button
						variant="secondary"
						onClick={commitDraft}
						disabled={disabled || !draft.trim()}
						className="astra-home-details__tagAddButton">
						{TAGS_COPY.addButton}
					</Button>
				</div>
			)}
		</div>
	)
}

function AlternateGreetingsViewer({ value, deps }) {
	const greetings = React.useMemo(
		() => normalizeAlternateGreetingsInput(value).filter(item => String(item ?? '').trim()),
		[value],
	)

	if (!greetings.length) {
		return <ViewText value="" emptyLabel={ALT_GREETINGS_COPY.empty} />
	}

	return (
		<div className="astra-home-details__altGreetingsViewer">
			<Accordion
				type="single"
				collapsible
				className="astra-home-details__accordionRoot">
				{greetings.map((greeting, index) => {
					const itemId = `greeting-${index}`
					return (
						<AccordionItem
							key={itemId}
							value={itemId}
							className="astra-home-details__accordionItem">
							<AccordionTrigger className="astra-home-details__accordionTrigger">
								<div className="astra-home-details__accordionTriggerRow">
									<div className="astra-home-details__accordionMeta">
										<span className="astra-home-details__accordionLabel">{ALT_GREETINGS_COPY.label(index)}</span>
										<GreetingToken value={greeting} deps={deps} />
									</div>
								</div>
							</AccordionTrigger>
							<AccordionContent className="astra-home-details__accordionContent">
								<DetailsTokenizedTextarea
									value={greeting}
									isEditing={false}
									allowViewModeToggle
									deps={deps}
								/>
							</AccordionContent>
						</AccordionItem>
					)
				})}
			</Accordion>
		</div>
	)
}

function AlternateGreetingsEditor({ value, onChange, deps, activeItem, onActiveItemChange, onAddGreeting }) {
	const greetings = React.useMemo(() => normalizeAlternateGreetingsInput(value), [value])
	const safeActiveItem = typeof activeItem === 'string' ? activeItem : ''

	const emit = React.useCallback(nextList => {
		onChange(Array.isArray(nextList) ? nextList : [])
	}, [onChange])

	const handleEntryChange = (index, nextValue) => {
		const next = greetings.slice()
		next[index] = nextValue ?? ''
		emit(next)
	}

	const handleMove = (from, to) => {
		if (to < 0 || to >= greetings.length) return
		const next = greetings.slice()
		const [moved] = next.splice(from, 1)
		next.splice(to, 0, moved)
		emit(next)
	}

	const handleRemove = index => {
		const next = greetings.filter((_, idx) => idx !== index)
		emit(next)
	}

	const handleAdd = React.useCallback(() => {
		if (typeof onAddGreeting === 'function') {
			onAddGreeting()
		}
	}, [onAddGreeting])

	return (
		<div className="astra-home-details__altGreetingsEditor">
			{greetings.length ? (
				<Accordion
					type="single"
					collapsible
					className="astra-home-details__accordionRoot"
					value={safeActiveItem}
					onValueChange={nextValue => {
						if (typeof onActiveItemChange === 'function') {
							onActiveItemChange(nextValue || '')
						}
					}}>
					{greetings.map((greeting, index) => {
						const itemId = `edit-greeting-${index}`
						const isFirst = index === 0
						const isLast = index === greetings.length - 1
						const makeActionHandler = action => event => {
							event.preventDefault()
							event.stopPropagation()
							action()
						}
						const handleKeyActivate = action => event => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault()
								event.stopPropagation()
								action()
							}
						}

						return (
								<AccordionItem key={itemId} value={itemId} className="astra-home-details__accordionItem">
									<AccordionTrigger className="astra-home-details__accordionTrigger">
										<div className="astra-home-details__accordionTriggerRow">
											<div className="astra-home-details__accordionMeta">
												<span className="astra-home-details__accordionLabel">{ALT_GREETINGS_COPY.label(index)}</span>
												<GreetingToken value={greeting} deps={deps} />
											</div>
											<div className="astra-home-details__altGreetingActions" aria-label={`Actions for alternate greeting ${index + 1}`}>
												<span
													role="button"
													tabIndex={0}
													aria-label={ALT_GREETINGS_COPY.actions.moveUp}
													className="astra-home-details__altGreetingAction"
													onClick={makeActionHandler(() => handleMove(index, index - 1))}
													onKeyDown={handleKeyActivate(() => handleMove(index, index - 1))}
													data-disabled={isFirst ? 'true' : 'false'}>
													<ArrowUpIcon size={16} />
												</span>
												<span
													role="button"
													tabIndex={0}
													aria-label={ALT_GREETINGS_COPY.actions.moveDown}
													className="astra-home-details__altGreetingAction"
													onClick={makeActionHandler(() => handleMove(index, index + 1))}
													onKeyDown={handleKeyActivate(() => handleMove(index, index + 1))}
													data-disabled={isLast ? 'true' : 'false'}>
													<ArrowDownIcon size={16} />
												</span>
												<span
													role="button"
													tabIndex={0}
													aria-label={ALT_GREETINGS_COPY.actions.delete}
													className="astra-home-details__altGreetingAction astra-home-details__altGreetingAction--danger"
													onClick={makeActionHandler(() => handleRemove(index))}
													onKeyDown={handleKeyActivate(() => handleRemove(index))}>
													<TrashIcon size={16} />
												</span>
										</div>
									</div>
								</AccordionTrigger>
								<AccordionContent className="astra-home-details__accordionContent">
									<DetailsTokenizedTextarea
										value={greeting}
										onChange={event => handleEntryChange(index, event?.target?.value ?? '')}
										placeholder={PLACEHOLDERS.alternateGreeting}
										isEditing
										deps={deps}
									/>
								</AccordionContent>
							</AccordionItem>
						)
					})}
				</Accordion>
			) : (
				<div className="astra-home-details__accordionRoot astra-home-details__accordionRoot--empty">
					<ViewText value="" emptyLabel={ALT_GREETINGS_COPY.empty} />
				</div>
			)}
			<div className="astra-home-details__accordionActions">
				<Button
					variant="default"
					size="sm"
					onClick={handleAdd}
					className="astra-home-details__actionButton">
					<PlusIcon size={14} /> {ALT_GREETINGS_COPY.addButton}
				</Button>
			</div>
		</div>
	)
}

function GreetingToken({ value, deps }) {
	const { count, isLoading } = useTokenCount(value, { enabled: true, deps })
	const display = isLoading
		? TOKEN_LOADING
		: Number.isFinite(count)
			? `${count} tokens`
			: TOKEN_PLACEHOLDER

	return (
		<span className="astra-home-details__tokenPill" data-loading={isLoading ? 'true' : 'false'}>
			{display}
		</span>
	)
}

function DepthRoleSelect({ value, onChange, disabled }) {
	const active = ROLE_OPTIONS.find(option => option.value === value)
	const label = active?.label || 'Role'

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="outline"
					disabled={disabled}
					className="astra-home-details__selectButton">
					<span>{label}</span>
					<ChevronDownIcon size={14} className="astra-home-details__selectChevron" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="astra-dropdown-menu astra-home-details__roleDropdown"
				align="start"
				side="bottom"
				sideOffset={8}>
				{ROLE_OPTIONS.map(option => {
					const isActive = option.value === value
					return (
						<DropdownMenuItem
							key={option.value}
							className="astra-dropdown-option astra-home-details__roleOption"
							disabled={disabled}
							onSelect={() => onChange(option.value)}>
							<span className="astra-dropdown-option__label astra-home-details__roleOptionLabel">{option.label}</span>
							<span
								className="astra-dropdown-option__check astra-home-details__roleOptionCheck"
								data-selected={isActive ? 'true' : 'false'}>
								<CheckIcon size={16} aria-hidden="true" />
							</span>
						</DropdownMenuItem>
					)
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
