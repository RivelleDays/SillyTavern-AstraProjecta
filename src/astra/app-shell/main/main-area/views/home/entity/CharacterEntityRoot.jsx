import React from 'react'
import {
	getHomeEntityState,
	refreshHomeEntity,
	setHomeEntityEditing,
	setHomeEntityDirty,
	setHomeEntitySaving,
	subscribeHomeEntityStore,
} from '../state/homeEntityStore.js'
import { CharacterDetailsView } from './details/CharacterDetailsView.jsx'

function useHomeEntityState() {
	const [state, setState] = React.useState(() => getHomeEntityState())

	React.useEffect(() => {
		return subscribeHomeEntityStore(next => setState(next))
	}, [])

	return state
}

export function CharacterEntityRoot({ deps = {} }) {
	const state = useHomeEntityState()
	const {
		status,
		entityType,
		routeView,
		error,
		data,
		displayName = '',
	} = state

	const handleStartEdit = React.useCallback(() => {
		setHomeEntityEditing(true)
	}, [])

	const handleCancelEdit = React.useCallback(() => {
		setHomeEntityDirty(false)
		setHomeEntitySaving(false)
		setHomeEntityEditing(false)
	}, [])

	const handleToggleEdit = React.useCallback(next => {
		const target = typeof next === 'boolean' ? next : !getHomeEntityState()?.isEditing
		setHomeEntityDirty(false)
		setHomeEntitySaving(false)
		setHomeEntityEditing(target)
	}, [])

	const handleSaved = React.useCallback(async () => {
		await refreshHomeEntity()
		setHomeEntityDirty(false)
		setHomeEntitySaving(false)
	}, [])

	let body = null

	if (routeView !== 'entity') {
		body = <p className="astra-home-entity__empty">Select a character to view details.</p>
	} else if (entityType === 'group') {
		body = <p className="astra-home-entity__empty">Group details are not available yet.</p>
	} else if (status === 'loading') {
		body = <p className="astra-home-entity__status">Loading character...</p>
	} else if (status === 'error') {
		body = <p className="astra-home-entity__error">{error || 'Unable to load this character.'}</p>
	} else if (status === 'ready' && data?.character) {
		body = (
			<CharacterDetailsView
				character={data.character}
				characterId={data.characterId}
				isEditing={Boolean(state.isEditing)}
				onStartEdit={handleStartEdit}
				onCancelEdit={handleCancelEdit}
				onSaved={handleSaved}
					onDirtyChange={setHomeEntityDirty}
					onSavingChange={setHomeEntitySaving}
					deps={deps}
					displayName={displayName}
					onEditToggle={handleToggleEdit}
				/>
			)
	} else {
		body = <p className="astra-home-entity__status">No character data available.</p>
	}

	return (
		<div className="astra-home-entityReact" data-status={status || 'idle'}>
			{body}
		</div>
	)
}
