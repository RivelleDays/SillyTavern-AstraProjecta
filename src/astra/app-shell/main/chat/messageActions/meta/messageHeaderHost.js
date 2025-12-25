import React from 'react'
import { createRoot } from 'react-dom/client'
import { Bookmark, EyeClosed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
	LOG_PREFIX,
	getChat,
	getChatRoot,
	getCtx,
	getEventSource,
	getEventTypes,
	initializeEnv,
	resolveMessageAvatarFromDom,
} from '../context/chatMessageContext.js'

const DEFAULT_SYNC_DELAY = 80

const headerEntries = new Map()
const headerActionRoots = new Map()
let pendingSyncTimeout = null
let observer = null
let hasInitialized = false

function getMessageId(el) {
	const raw = Number(el?.getAttribute?.('mesid'))
	return Number.isFinite(raw) ? raw : null
}

function triggerNativeBookmark(mesEl, shiftKey = false) {
	if (!mesEl) return false
	const nativeBookmark = mesEl.querySelector('.mes_bookmark')
	if (!nativeBookmark) return false

	const clickEvent = new MouseEvent('click', { bubbles: true, shiftKey: Boolean(shiftKey) })
	nativeBookmark.dispatchEvent(clickEvent)
	return true
}

function ensureHeaderNodes(mesEl) {
	if (!mesEl) return null

	let header = mesEl.querySelector(':scope > .astra-messageHeader')
	if (!header) {
		header = document.createElement('div')
		header.className = 'astra-messageHeader'
		header.setAttribute('data-astra-component', 'message-header')
	}

	let avatarHost = header.querySelector(':scope > .astra-messageHeader__avatar')
	if (!avatarHost) {
		avatarHost = document.createElement('div')
		avatarHost.className = 'astra-messageHeader__avatar'
		header.append(avatarHost)
	}

	let avatarImg = avatarHost.querySelector('img')
	if (!avatarImg) {
		avatarImg = document.createElement('img')
		avatarImg.alt = ''
		avatarHost.append(avatarImg)
	}

	let nameEl = header.querySelector(':scope > .astra-messageHeader__name')
	if (!nameEl) {
		nameEl = document.createElement('span')
		nameEl.className = 'astra-messageHeader__name'
		header.append(nameEl)
	}

	let actionsHost = header.querySelector(':scope > .astra-messageHeader__actions')
	if (!actionsHost) {
		actionsHost = document.createElement('div')
		actionsHost.className = 'astra-messageHeader__actions'
		header.append(actionsHost)
	}

	const nativeAvatar = mesEl.querySelector(':scope > .mesAvatarWrapper')
	if (header.parentElement !== mesEl || (nativeAvatar && header.nextSibling !== nativeAvatar)) {
		mesEl.insertBefore(header, nativeAvatar || mesEl.firstChild)
	}

	mesEl.dataset.astraHideAvatar = 'true'

	return { header, avatarImg, nameEl, actionsHost }
}

function setAvatar(el, src = '', avatarId = '') {
	if (!el) return
	const safeSrc = src ?? ''
	if (safeSrc) {
		el.src = safeSrc
		el.dataset.empty = 'false'
		if (avatarId) {
			el.dataset.avatarId = avatarId
		} else {
			delete el.dataset.avatarId
		}
	} else {
		el.removeAttribute('src')
		el.dataset.empty = 'true'
		delete el.dataset.avatarId
	}
}

function setName(el, value = '') {
	if (!el) return
	const safeValue = value ?? ''
	el.textContent = safeValue
	el.dataset.empty = safeValue ? 'false' : 'true'
}

function renderHeaderActions(host, mesEl, { bookmarkLink = '', isGhost = false } = {}) {
	if (!host || !mesEl) return

	let entry = headerActionRoots.get(host)
	if (!entry) {
		entry = { host, root: createRoot(host) }
		headerActionRoots.set(host, entry)
	}

	const hasBookmark = Boolean(bookmarkLink)
	const showGhost = Boolean(isGhost)
	const nativeBookmark = mesEl.querySelector('.mes_bookmark')
	const rawTitle = nativeBookmark?.getAttribute?.('title')?.trim() ?? ''
	const rawTooltip = nativeBookmark?.getAttribute?.('data-tooltip')?.trim() ?? ''
	const tooltipText = rawTitle || rawTooltip || (hasBookmark ? `Checkpoint\n${bookmarkLink}` : '') || ''
	const ghostLabel = 'This message is invisible for the AI'

	const onClick = event => {
		event?.preventDefault?.()
		event?.stopPropagation?.()
		triggerNativeBookmark(mesEl, event?.shiftKey)
	}

	const renderTooltipContent = text => {
		if (!text) return null
		const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
		const titleLine = lines[0] || 'Checkpoint'
		const checkpointName = lines.find(line => line.toLowerCase().startsWith('checkpoint #')) || lines[1] || ''
		const instructions = lines.slice(1).filter(line => line && line !== checkpointName)

		return (
			<TooltipContent
				side="top"
				sideOffset={6}
				showArrow
				className="astra-tooltip astra-messageHeader__bookmarkTooltip px-2 py-1 text-xs"
			>
				<div className="astra-messageHeader__bookmarkTooltipContent">
					<div className="astra-messageHeader__bookmarkTooltipTitle">{titleLine}</div>
					{checkpointName ? (
						<div className="astra-messageHeader__bookmarkTooltipName">
							{checkpointName}
						</div>
					) : null}
					{instructions.length ? (
						<ul className="astra-messageHeader__bookmarkTooltipList">
							{instructions.map((line, idx) => (
								<li key={idx}>{line}</li>
							))}
						</ul>
					) : null}
				</div>
			</TooltipContent>
		)
	}

	const tooltipLines = tooltipText
		? tooltipText.split('\n').map(line => line.trim()).filter(Boolean)
		: []
	const ariaLabel = tooltipLines[0] || 'Open checkpoint chat'

	const ghostIndicator = showGhost ? (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="astra-messageHeader__actionBtnWrapper" tabIndex={0} aria-label={ghostLabel}>
						<Button
							size="icon"
							variant="ghost"
							className="astra-messageHeader__actionBtn"
							aria-label={ghostLabel}
							title={ghostLabel}
							disabled
						>
							<EyeClosed size={16} strokeWidth={2} aria-hidden="true" />
						</Button>
					</span>
				</TooltipTrigger>
				<TooltipContent side="top" sideOffset={6} showArrow className="astra-tooltip px-2 py-1 text-xs">
					{ghostLabel}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	) : null

	const bookmarkButton = hasBookmark ? (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						size="icon"
						variant="ghost"
						className="astra-messageHeader__actionBtn"
						aria-label={ariaLabel}
						onClick={onClick}
					>
						<Bookmark size={16} strokeWidth={2} aria-hidden="true" />
					</Button>
				</TooltipTrigger>
				{renderTooltipContent(tooltipText)}
			</Tooltip>
		</TooltipProvider>
	) : null

	if (!ghostIndicator && !bookmarkButton) {
		entry.root.render(null)
		return
	}

	entry.root.render(
		<>
			{ghostIndicator}
			{bookmarkButton}
		</>,
	)
}

function syncHeaderForElement(mesEl) {
	const mesId = getMessageId(mesEl)
	const chat = getChat()
	const message = typeof mesId === 'number' ? chat?.[mesId] : null
	const name = message?.name ?? mesEl?.getAttribute?.('ch_name') ?? ''
	const avatarInfo = resolveMessageAvatarFromDom(mesId) ?? {}
	const avatarSrc = avatarInfo?.src ?? ''
	const avatarId = avatarInfo?.avatarId ?? ''
	const bookmarkLink =
		mesEl?.getAttribute?.('bookmark_link') ||
		message?.extra?.bookmark_link ||
		message?.bookmark_link ||
		''
	const isGhost =
		String(mesEl?.getAttribute?.('is_system') ?? message?.is_system ?? '').toLowerCase() === 'true'

	const nodes = ensureHeaderNodes(mesEl)
	if (!nodes) return null

	const snapshot = {
		name: name ?? '',
		avatar: avatarSrc ?? '',
		avatarId: avatarId ?? '',
		bookmark: bookmarkLink ?? '',
		isGhost,
	}
	const prev = headerEntries.get(nodes.header)

	if (!prev || prev.name !== snapshot.name) {
		setName(nodes.nameEl, snapshot.name)
	}
	if (!prev || prev.avatar !== snapshot.avatar || prev.avatarId !== snapshot.avatarId) {
		setAvatar(nodes.avatarImg, snapshot.avatar, snapshot.avatarId)
	}
	if (!prev || prev.bookmark !== snapshot.bookmark || prev.isGhost !== snapshot.isGhost) {
		renderHeaderActions(nodes.actionsHost, mesEl, { bookmarkLink: snapshot.bookmark, isGhost: snapshot.isGhost })
	}

	headerEntries.set(nodes.header, snapshot)
	return nodes.header
}

function cleanupEntries(liveHeaders, liveActionHosts) {
	for (const [header] of headerEntries.entries()) {
		if (!liveHeaders.has(header) || !header.isConnected) {
			headerEntries.delete(header)
		}
	}

	for (const [host, entry] of headerActionRoots.entries()) {
		if (!liveActionHosts.has(host) || !host.isConnected) {
			entry?.root?.unmount?.()
			headerActionRoots.delete(host)
		}
	}
}

function syncMessageHeaders() {
	const headers = new Set()
	const actionHosts = new Set()
	const messageEls = document.querySelectorAll('#chat .mes[mesid]')

	messageEls.forEach(mesEl => {
		const header = syncHeaderForElement(mesEl)
		if (header) headers.add(header)
		const actionsHost = mesEl.querySelector(':scope > .astra-messageHeader .astra-messageHeader__actions')
		if (actionsHost) actionHosts.add(actionsHost)
	})

	cleanupEntries(headers, actionHosts)
}

function scheduleMessageHeaderSync(delay = DEFAULT_SYNC_DELAY) {
	if (pendingSyncTimeout) return
	pendingSyncTimeout = setTimeout(() => {
		pendingSyncTimeout = null
		syncMessageHeaders()
	}, delay)
}

function attachEvents() {
	const eventSource = getEventSource()
	const eventTypes = getEventTypes()
	if (!eventSource || !eventTypes) return

	const syncEventKeys = [
		'MESSAGE_SWIPED',
		'MESSAGE_SWIPE_DELETED',
		'MESSAGE_UPDATED',
		'MESSAGE_EDITED',
		'MESSAGE_DELETED',
		'CHAT_CHANGED',
		'USER_MESSAGE_RENDERED',
		'CHARACTER_MESSAGE_RENDERED',
		'GENERATION_STARTED',
		'GENERATION_STOPPED',
	]

	syncEventKeys.forEach(key => {
		const type = eventTypes[key]
		if (type) {
			eventSource.on(type, () => scheduleMessageHeaderSync(0))
		}
	})
}

function startObservers() {
	if (observer) return
	const chatRoot = getChatRoot()
	if (!chatRoot) return

	observer = new MutationObserver(mutations => {
		const hasChanges = mutations.some(
			mutation =>
				mutation.addedNodes?.length ||
				mutation.removedNodes?.length ||
				(mutation.type === 'attributes' &&
					['mesid', 'class', 'bookmark_link', 'is_system'].includes(mutation.attributeName)),
		)
		if (hasChanges) {
			scheduleMessageHeaderSync(0)
		}
	})

	observer.observe(chatRoot, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['mesid', 'class', 'bookmark_link', 'is_system'],
	})
}

function initializeMessageHeader({ getContext } = {}) {
	if (hasInitialized) return
	initializeEnv(getContext)
	const ctx = getCtx()
	if (!ctx?.eventSource || !ctx?.event_types) {
		console.warn(`${LOG_PREFIX} Message header skipped: missing SillyTavern context`)
		return
	}
	hasInitialized = true

	attachEvents()
	startObservers()
	scheduleMessageHeaderSync(0)
}

export {
	initializeMessageHeader,
	scheduleMessageHeaderSync,
	syncMessageHeaders,
}
