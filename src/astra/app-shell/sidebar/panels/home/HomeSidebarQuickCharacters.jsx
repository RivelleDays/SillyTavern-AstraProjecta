import React from 'react'
import { createRoot } from 'react-dom/client'
import { getCompositeAvatar, DEFAULT_AVATAR } from '@/astra/shared/components/getCompositeAvatar.js'
import {
	resolveContext,
	CHARACTER_REFRESH_EVENT_KEYS,
} from '@/astra/shared/characters/characterData.js'
import { createSecondaryTabs } from '@/astra/shared/components/secondaryTabs.js'
import { user_avatar as currentPersonaAvatar } from '../../../../../../../../../personas.js'
import { setHomeRouteToEntity } from '@/astra/app-shell/main/main-area/views/home/state/homeRouteStore.js'

const TAB_RECENT = 'recent'
const TAB_PERSONA = 'persona'
const MAX_RECENTS = 20
const SIGNATURE_POLL_INTERVAL = 1500

function normalizeName(rawName, index = 0) {
	if (typeof rawName === 'string' && rawName.trim()) return rawName.trim()
	return `Character ${index + 1}`
}

function normalizeGroupName(rawName, index = 0) {
	if (typeof rawName === 'string' && rawName.trim()) return rawName.trim()
	return `Group ${index + 1}`
}

function normalizeLastChat(value) {
	const numeric = Number(value)
	return Number.isFinite(numeric) ? numeric : 0
}

function resolveCharacterEntityKey(entity) {
	const numericId = Number(entity?.id)
	if (Number.isFinite(numericId)) return String(numericId)
	if (entity?.id !== undefined && entity?.id !== null) {
		return String(entity.id)
	}
	if (typeof entity?.avatar === 'string' && entity.avatar) {
		return `avatar:${entity.avatar}`
	}
	if (typeof entity?.avatar_url === 'string' && entity.avatar_url) {
		return `avatar-url:${entity.avatar_url}`
	}
	if (typeof entity?.name === 'string' && entity.name.trim()) {
		return `name:${entity.name.trim()}`
	}
	return ''
}

function resolveGroupEntityKey(group) {
	if (group?.id === undefined || group?.id === null) return ''
	const id = String(group.id)
	if (id) return id
	if (typeof group?.name === 'string' && group.name.trim()) {
		return `group-name:${group.name.trim()}`
	}
	return ''
}

function resolveEventSource(deps = {}) {
	const context = resolveContext(deps.getContext)
	return (
		deps.eventSource ??
		deps.event_source ??
		context?.eventSource ??
		(globalThis?.eventSource ?? globalThis?.SillyTavern?.eventSource ?? null)
	)
}

function resolveEventTypes(deps = {}) {
	const context = resolveContext(deps.getContext)
	return (
		deps.eventTypes ??
		deps.event_types ??
		context?.event_types ??
		(globalThis?.event_types ?? globalThis?.SillyTavern?.event_types ?? null)
	)
}

async function buildRecentCharacters(deps = {}) {
	const context = resolveContext(deps.getContext)
	const source =
		Array.isArray(context?.characters) && context.characters.length
			? context.characters
			: Array.isArray(globalThis?.characters)
				? globalThis.characters
				: []

	if (!source.length) return []

	const sorted = source
		.map((raw, index) => ({
			id: index,
			name: normalizeName(raw?.name, index),
			raw,
			lastChat: normalizeLastChat(raw?.date_last_chat),
		}))
		.sort((a, b) => b.lastChat - a.lastChat)
		.slice(0, MAX_RECENTS)

	const avatars = await Promise.all(
		sorted.map(async entry => {
			try {
				const url = await getCompositeAvatar({
					avatar: entry.raw?.avatar,
					avatar_url: entry.raw?.avatar_url,
					members: entry.raw?.members,
				})
				return url || DEFAULT_AVATAR
			} catch {
				return DEFAULT_AVATAR
			}
		}),
	)

	return sorted.map((entry, index) => ({
		id: entry.id,
		name: entry.name,
		lastChat: entry.lastChat,
		avatar: avatars[index] || DEFAULT_AVATAR,
		entity: entry.raw,
		type: 'character',
	}))
}

function resolvePersonaContext(deps = {}) {
	const context = resolveContext(deps.getContext)
	const powerUser =
		deps.powerUserSettings ??
		context?.powerUserSettings ??
		(globalThis?.power_user ?? null)
	const personaIdCandidate =
		typeof deps.userAvatar === 'string' && deps.userAvatar
			? deps.userAvatar
			: typeof context?.chatMetadata?.persona === 'string' && context.chatMetadata.persona
				? context.chatMetadata.persona
				: typeof currentPersonaAvatar === 'string' && currentPersonaAvatar
					? currentPersonaAvatar
					: typeof globalThis?.user_avatar === 'string'
						? globalThis.user_avatar
						: ''
	const personaId = personaIdCandidate || ''
	const characters =
		Array.isArray(context?.characters) && context.characters.length
			? context.characters
			: Array.isArray(globalThis?.characters)
				? globalThis.characters
				: []
	const groups =
		Array.isArray(context?.groups) && context.groups.length
			? context.groups
			: Array.isArray(globalThis?.groups)
				? globalThis.groups
				: []

	return { powerUser, personaId, characters, groups }
}

function computePersonaSignature(deps = {}) {
	const { powerUser, personaId } = resolvePersonaContext(deps)
	const connections =
		powerUser?.persona_descriptions?.[personaId]?.connections ?? []
	if (!personaId) return ''
	if (!Array.isArray(connections) || !connections.length) {
		return `${personaId}::empty`
	}
	const parts = connections
		.map(connection => {
			const type = connection?.type ?? 'unknown'
			const id = connection?.id ?? ''
			return `${type}:${id}`
		})
		.join('|')
	return `${personaId}::${parts}`
}

async function buildPersonaConnections(deps = {}) {
	const { powerUser, personaId, characters, groups } = resolvePersonaContext(deps)
	if (!powerUser || !personaId) return []

	const connections =
		powerUser?.persona_descriptions?.[personaId]?.connections ?? []
	if (!Array.isArray(connections) || !connections.length) return []

	const entities = connections
		.map((connection, index) => {
			if (!connection || typeof connection !== 'object') return null
			if (connection.type === 'character') {
				const character = characters.find(c => c?.avatar === connection.id)
				if (!character) return null
				return {
					id: `character:${connection.id ?? index}`,
					name: normalizeName(character?.name, index),
					entity: character,
					type: 'character',
				}
			}
			if (connection.type === 'group') {
				const group = groups.find(g => String(g?.id) === String(connection.id))
				if (!group) return null
				return {
					id: `group:${group.id ?? index}`,
					name: normalizeGroupName(group?.name, index),
					entity: group,
					type: 'group',
				}
			}
			return null
		})
		.filter(Boolean)

	if (!entities.length) return []

	const avatars = await Promise.all(
		entities.map(async entry => {
			try {
				const url = await getCompositeAvatar(entry.entity)
				return url || DEFAULT_AVATAR
			} catch {
				return DEFAULT_AVATAR
			}
		}),
	)

	return entities.map((entry, index) => ({
		id: entry.id,
		name: entry.name,
		avatar: avatars[index] || DEFAULT_AVATAR,
		type: entry.type,
		entity: entry.entity,
	}))
}

function EntityList({ items, isLoading, loadingLabel, emptyLabel, onSelect }) {
	if (isLoading) {
		return (
			<p className="sidebar-home-quick__hint" role="status">
				{loadingLabel}
			</p>
		)
	}

	if (!items.length) {
		return (
			<p className="sidebar-home-quick__empty" role="note">
				{emptyLabel}
			</p>
		)
	}

	return (
		<div className="sidebar-home-quick__list" role="list">
			{items.map(item => (
				<button
					key={item.id}
					type="button"
					className="sidebar-home-quick__item"
					title={item.name}
					onClick={event => {
						event.preventDefault()
						if (typeof onSelect === 'function') {
							onSelect(item, event)
						}
					}}
				>
					<span
						className="sidebar-home-quick__avatar"
						style={{ backgroundImage: `url("${item.avatar}")` }}
						aria-hidden="true"
					/>
					<span className="sidebar-home-quick__name">{item.name}</span>
				</button>
			))}
		</div>
	)
}

export function HomeSidebarQuickCharacters({ deps = {} }) {
	const [recentItems, setRecentItems] = React.useState([])
	const [personaItems, setPersonaItems] = React.useState([])
	const [isLoadingRecent, setIsLoadingRecent] = React.useState(true)
	const [isLoadingPersona, setIsLoadingPersona] = React.useState(true)
	const tabsHostRef = React.useRef(null)
	const tabsApiRef = React.useRef(null)
	const signatureRef = React.useRef('')
	const personaIdRef = React.useRef('')
	const panelElementsRef = React.useRef({ recent: null, persona: null })
	const panelRootsRef = React.useRef({ recent: null, persona: null })
	const hydratedRef = React.useRef(false)
	const recentItemsRef = React.useRef([])
	const personaItemsRef = React.useRef([])

	const handleSelectItem = React.useCallback(
		(item, sourceEvent) => {
			if (!item || typeof item !== 'object') return
			const entityType = item.type === 'group' ? 'group' : 'character'
			const entityKey =
				entityType === 'group'
					? resolveGroupEntityKey(item.entity)
					: resolveCharacterEntityKey(item.entity)
			const displayName = item.name || ''
			const avatarUrl = item.avatar || ''

			setHomeRouteToEntity({
				entityType,
				entityKey,
				displayName,
				avatarUrl,
				source: 'quick-list',
			})

			if (deps?.mainAreaNavigation?.activate) {
				void deps.mainAreaNavigation
					.activate('home')
					.catch(error => {
						console?.warn?.('[AstraProjecta] Failed to switch to home view from quick list.', error)
					})
			}

			const dispatchTarget =
				(sourceEvent?.currentTarget?.ownerDocument?.getElementById?.('leftSidebar') ??
					sourceEvent?.currentTarget ??
					globalThis?.document ??
					null)
			if (dispatchTarget?.dispatchEvent) {
				const detail = {
					tabId: 'home',
					entityType,
					entityKey,
					displayName,
					avatarUrl,
					source: 'quick-list',
				}
				const navEvent = new CustomEvent('astra:home-route:entity-open', {
					bubbles: true,
					detail,
				})
				dispatchTarget.dispatchEvent(navEvent)
			}
		},
		[deps],
	)

	React.useEffect(() => {
		let cancelled = false
		let timer = null
		let signatureTimer = null
		let attempts = 0
		const MAX_ATTEMPTS = 40
		const eventSource = resolveEventSource(deps)
		const eventTypes = resolveEventTypes(deps)

		const load = async (showLoading = false) => {
			const shouldShowLoading =
				showLoading &&
				!hydratedRef.current &&
				!recentItemsRef.current.length &&
				!personaItemsRef.current.length

			if (shouldShowLoading) {
				setIsLoadingRecent(true)
				setIsLoadingPersona(true)
			}
			try {
				const [recent, persona] = await Promise.all([
					buildRecentCharacters(deps),
					buildPersonaConnections(deps),
				])
				if (!cancelled) {
					recentItemsRef.current = recent
					personaItemsRef.current = persona
					setRecentItems(recent)
					setPersonaItems(persona)
					setIsLoadingRecent(false)
					setIsLoadingPersona(false)
					signatureRef.current = computePersonaSignature(deps)
					personaIdRef.current = resolvePersonaContext(deps).personaId
					hydratedRef.current = true
				}
				return { recent, persona }
			} catch {
				if (!cancelled) {
					setIsLoadingRecent(false)
					setIsLoadingPersona(false)
					signatureRef.current = computePersonaSignature(deps)
					personaIdRef.current = resolvePersonaContext(deps).personaId
					hydratedRef.current = hydratedRef.current || Boolean(recentItemsRef.current.length || personaItemsRef.current.length)
				}
				return { recent: [], persona: [] }
			}
		}

		const kick = async () => {
			const { recent, persona } = await load(attempts === 0)
			if (cancelled) return
			if (!recent.length && !persona.length && attempts < MAX_ATTEMPTS) {
				attempts += 1
				timer = setTimeout(kick, 250)
			}
		}

		kick()

		const handleVisibility = () => {
			if (document.hidden) return
			attempts = 0
			kick()
		}

		document.addEventListener('visibilitychange', handleVisibility, {
			passive: true,
		})

		const removeListeners = []

		const attachListener = eventName => {
			if (!eventName || typeof eventSource?.on !== 'function') return
			const handler = () => {
				attempts = 0
				kick()
			}
			eventSource.on(eventName, handler)
			removeListeners.push(() => {
				try {
					if (typeof eventSource.removeListener === 'function') {
						eventSource.removeListener(eventName, handler)
					} else if (typeof eventSource.off === 'function') {
						eventSource.off(eventName, handler)
					}
				} catch {
					// no-op
				}
			})
		}

		if (eventSource && eventTypes) {
			CHARACTER_REFRESH_EVENT_KEYS.forEach(key => {
				const eventName = eventTypes[key]
				if (!eventName) return
				attachListener(eventName)
			})

			;['GROUP_UPDATED', 'IMPERSONATE_READY'].forEach(key => {
				const eventName = eventTypes[key]
				if (!eventName) return
				attachListener(eventName)
			})
		}

		signatureTimer = setInterval(() => {
			if (cancelled) return
			const nextSignature = computePersonaSignature(deps)
			const nextPersonaId = resolvePersonaContext(deps).personaId
			if (nextSignature !== signatureRef.current) {
				signatureRef.current = nextSignature
				attempts = 0
				kick()
				return
			}
			if (nextPersonaId && nextPersonaId !== personaIdRef.current) {
				personaIdRef.current = nextPersonaId
				attempts = 0
				kick()
			}
		}, SIGNATURE_POLL_INTERVAL)

		if (signatureTimer && typeof signatureTimer.unref === 'function') {
			signatureTimer.unref()
		}

		return () => {
			cancelled = true
			if (timer) {
				clearTimeout(timer)
			}
			if (signatureTimer) {
				clearInterval(signatureTimer)
			}
			document.removeEventListener('visibilitychange', handleVisibility)
			removeListeners.forEach(fn => {
				try {
					fn()
				} catch {
					// no-op
				}
			})
		}
	}, [deps])

	React.useEffect(() => {
		if (!tabsHostRef.current || tabsApiRef.current) return

		const panelElements = panelElementsRef.current
		const panelRoots = panelRootsRef.current

		const recentPanel = document.createElement('div')
		recentPanel.className = 'sidebar-home-quick__panel'
		const personaPanel = document.createElement('div')
		personaPanel.className = 'sidebar-home-quick__panel'

		panelElements.recent = recentPanel
		panelElements.persona = personaPanel

		const tabs = createSecondaryTabs(
			[
				{ id: TAB_RECENT, title: 'Recent', content: recentPanel },
				{ id: TAB_PERSONA, title: 'Connections', content: personaPanel },
			],
			{
				idPrefix: 'sidebar-home-quick',
			},
		)

		tabsApiRef.current = tabs
		tabsHostRef.current.append(tabs.root)

		panelRoots.recent = createRoot(recentPanel)
		panelRoots.persona = createRoot(personaPanel)

		return () => {
			try {
				tabs.root?.remove()
			} catch {
				// no-op
			}
			try {
				panelRoots.recent?.unmount()
			} catch {
				// no-op
			}
			try {
				panelRoots.persona?.unmount()
			} catch {
				// no-op
			}
			panelElements.recent = null
			panelElements.persona = null
			panelRoots.recent = null
			panelRoots.persona = null
			tabsApiRef.current = null
		}
	}, [])

	React.useEffect(() => {
		const recentRoot = panelRootsRef.current.recent
		const personaRoot = panelRootsRef.current.persona
		if (recentRoot) {
			recentRoot.render(
				<EntityList
					items={recentItems}
					isLoading={isLoadingRecent}
					loadingLabel="Loading recent characters..."
					emptyLabel="No recent characters yet."
					onSelect={handleSelectItem}
				/>,
			)
		}
		if (personaRoot) {
			personaRoot.render(
				<EntityList
					items={personaItems}
					isLoading={isLoadingPersona}
					loadingLabel="Loading persona connections..."
					emptyLabel="No persona connections yet."
					onSelect={handleSelectItem}
				/>,
			)
		}
	}, [recentItems, personaItems, isLoadingRecent, isLoadingPersona, handleSelectItem])

	return (
		<div className="sidebar-home-quick">
			<div ref={tabsHostRef} className="sidebar-home-quick__tabsHost" />
		</div>
	)
}
