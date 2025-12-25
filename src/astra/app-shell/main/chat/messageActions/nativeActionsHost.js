import React from 'react'
import { createRoot } from 'react-dom/client'
import {
	Bookmark,
	BookmarkCheck,
	Ellipsis,
	Clipboard,
	Eye,
	EyeClosed,
	Brush,
	Images,
	LayoutList,
	Paperclip,
	Languages,
	Split,
	SquareChartGantt,
	Volume2,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
	LOG_PREFIX,
	ensureActionContainer,
	getChat,
	getChatRoot,
	getCtx,
	getEventSource,
	getEventTypes,
	initializeEnv,
} from './context/chatMessageContext.js'

const actionRoots = new Map()
let pendingSyncTimeout = null
let chatObserver = null
let hasInitialized = false
let activeInlineContainer = null
let activeInlineListEl = null
let hasInlineDismissListener = false

function isElementVisible(el) {
	if (!el) return false
	const style = window.getComputedStyle(el)
	return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
}

function dispatchAction(mesEl, selector, eventType = 'click') {
	if (!mesEl) return false
	const target = mesEl.querySelector(selector)
	if (!target) return false
	const event =
		eventType === 'pointerup'
			? new PointerEvent('pointerup', { bubbles: true })
			: new MouseEvent(eventType, { bubbles: true })
	target.dispatchEvent(event)
	return true
}

function resolveMediaState(message, mesEl) {
	const attr = mesEl?.dataset?.mediaDisplay
	const fromMessage = message?.extra?.media_display
	const current = (attr || fromMessage || '').toLowerCase()
	const hasMedia = Array.isArray(message?.extra?.media) && message.extra.media.length > 0
	const targetDisplay = current === 'gallery' ? 'list' : 'gallery'
	const nextIcon = targetDisplay === 'list' ? <LayoutList size={16} strokeWidth={1.75} aria-hidden="true" /> : <Images size={16} strokeWidth={1.75} aria-hidden="true" />
	return { hasMedia, targetDisplay, nextIcon }
}

function buildActionsForMessage(mesEl, mesIdx) {
	const chat = getChat()
	const message = chat?.[mesIdx]
	if (!message || !mesEl) {
		return []
	}

	const isSystem = String(mesEl.getAttribute('is_system') ?? message?.is_system) === 'true'
	const promptButton = mesEl.querySelector('.mes_prompt')
	const hasPrompt = isElementVisible(promptButton)
	const bookmarkLink = mesEl.getAttribute('bookmark_link') ?? message?.bookmark_link ?? ''
	const translateButton = mesEl.querySelector('.mes_translate')
	const hasTranslate = isElementVisible(translateButton)
	const sdGenerateButton = mesEl.querySelector('.sd_message_gen')
	const hasSdGenerate = isElementVisible(sdGenerateButton)
	const narrateButton = mesEl.querySelector('.mes_narrate')
	const hasNarrate = isElementVisible(narrateButton)
	const { hasMedia, targetDisplay, nextIcon } = resolveMediaState(message, mesEl)

	const actions = [
		{
			id: 'copy',
			label: 'Copy message text',
			icon: <Clipboard size={16} strokeWidth={1.75} aria-hidden="true" />,
			disabled: false,
			onSelect: () => dispatchAction(mesEl, '.mes_copy', 'pointerup'),
		},
		{
			id: 'branch',
			label: 'Create branch',
			icon: <Split size={16} strokeWidth={1.75} aria-hidden="true" />,
			disabled: false,
			onSelect: () => dispatchAction(mesEl, '.mes_create_branch'),
		},
		{
			id: 'checkpoint',
			label: 'Create checkpoint',
			icon: bookmarkLink
				? <BookmarkCheck size={16} strokeWidth={1.75} aria-hidden="true" />
				: <Bookmark size={16} strokeWidth={1.75} aria-hidden="true" />,
			disabled: false,
			onSelect: () => dispatchAction(mesEl, '.mes_create_bookmark'),
		},
		{
			id: 'prompt',
			label: 'View prompt',
			icon: <SquareChartGantt size={16} strokeWidth={1.75} aria-hidden="true" />,
			disabled: !hasPrompt,
			onSelect: () => dispatchAction(mesEl, '.mes_prompt', 'pointerup'),
		},
		{
			id: 'visibility',
			label: isSystem ? 'Include message in prompts' : 'Exclude message from prompts',
			icon: isSystem
				? <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
				: <EyeClosed size={16} strokeWidth={1.75} aria-hidden="true" />,
			disabled: false,
			onSelect: () => dispatchAction(mesEl, isSystem ? '.mes_unhide' : '.mes_hide'),
		},
		{
			id: 'embed',
			label: 'Embed file or image',
			icon: <Paperclip size={16} strokeWidth={1.75} aria-hidden="true" />,
			disabled: false,
			onSelect: () => dispatchAction(mesEl, '.mes_embed'),
		},
		{
			id: 'translate',
			label: 'Translate message',
			icon: <Languages size={16} strokeWidth={1.75} aria-hidden="true" />,
			disabled: !hasTranslate,
			onSelect: () => dispatchAction(mesEl, '.mes_translate'),
		},
		{
			id: 'generateImage',
			label: 'Generate Image',
			icon: <Brush size={16} strokeWidth={1.75} aria-hidden="true" />,
			disabled: !hasSdGenerate,
			onSelect: () => dispatchAction(mesEl, '.sd_message_gen'),
		},
		{
			id: 'narrate',
			label: 'Narrate',
			icon: <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" />,
			disabled: !hasNarrate,
			onSelect: () => dispatchAction(mesEl, '.mes_narrate'),
		},
		{
			id: 'media',
			label: 'Toggle media display style',
			icon: nextIcon,
			disabled: !hasMedia,
			onSelect: () =>
				targetDisplay === 'list'
					? dispatchAction(mesEl, '.mes_media_gallery')
					: dispatchAction(mesEl, '.mes_media_list'),
		},
	]

	return actions
}

function closeInline(targetContainer = null) {
	if (targetContainer && activeInlineContainer && targetContainer !== activeInlineContainer) return
	if (!activeInlineContainer) return
	activeInlineContainer = null
	activeInlineListEl = null
	requestSyncImmediate()
}

function openInline(container) {
	if (!container) return
	if (activeInlineContainer === container) {
		closeInline(container)
		return
	}
	activeInlineContainer = container
	requestSyncImmediate()
}

function MessageActionsMenu({ actions, container, inlineActive }) {
	const handleAction = action => {
		if (!action || action.disabled) return
		try {
			action.onSelect?.()
		} catch (error) {
			console?.warn?.(`${LOG_PREFIX} Failed to trigger message action "${action.id}"`, error)
		}
		closeInline(container)
	}

	if (inlineActive) {
		return (
			<TooltipProvider delayDuration={0}>
				<div
					className="astra-messageActions__inlineList"
					role="group"
					aria-label="More message actions"
				>
					{actions.map(action => (
						<Tooltip key={action.id}>
							<TooltipTrigger asChild>
								<button
									type="button"
									className="astra-messageActions__iconButton--compact"
									onClick={() => handleAction(action)}
									disabled={action.disabled}
									aria-label={action.label}
								>
									{action.icon}
								</button>
							</TooltipTrigger>
							<TooltipContent
								side="top"
								sideOffset={6}
								showArrow
								className="astra-tooltip px-2 py-1 text-xs"
							>
								{action.label}
							</TooltipContent>
						</Tooltip>
					))}
				</div>
			</TooltipProvider>
		)
	}

	const triggerButton = (
		<button
			type="button"
			className="astra-messageActions__iconButton--compact"
			aria-label="More message actions"
			onClick={() => openInline(container)}
		>
			<Ellipsis size={16} strokeWidth={1.75} aria-hidden="true" />
		</button>
	)

	const tooltipContent = (
		<TooltipContent side="top" sideOffset={6} showArrow className="astra-tooltip px-2 py-1 text-xs">
			More message actions
		</TooltipContent>
	)

	return (
		<TooltipProvider delayDuration={0}>
			<Tooltip>
				<TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
				{tooltipContent}
			</Tooltip>
		</TooltipProvider>
	)
}

function syncNativeActions() {
	if (pendingSyncTimeout) {
		clearTimeout(pendingSyncTimeout)
		pendingSyncTimeout = null
	}

	if (activeInlineContainer && !activeInlineContainer.isConnected) {
		activeInlineContainer = null
	}

	const chat = getChat()
	if (!Array.isArray(chat) || !chat.length) {
		unmountStaleActions(null)
		return
	}

	const containers = new Set()
	const messageEls = document.querySelectorAll('#chat .mes[mesid]')

	messageEls.forEach(mesEl => {
		const mesIdx = Number(mesEl.getAttribute('mesid'))
		if (!Number.isInteger(mesIdx)) return

		const slots = ensureActionContainer(mesEl)
		const host = slots?.rightNativeActionsHost ?? slots?.rightDefault ?? slots?.rightSlot ?? slots?.container
		const container = slots?.container
		if (!host) return

		const actions = buildActionsForMessage(mesEl, mesIdx)
		if (!actions.length) return
		const isEditing = container?.dataset?.astraEditing === 'true'
		if (isEditing && activeInlineContainer === container) {
			activeInlineContainer = null
		}
		const inlineActive = !isEditing && container && activeInlineContainer === container

		if (container) {
			if (inlineActive) {
				container.dataset.astraActionsInline = 'true'
			} else {
				container.removeAttribute('data-astra-actions-inline')
				if (activeInlineContainer === container) {
					activeInlineContainer = null
					activeInlineListEl = null
				}
			}
		}

		let entry = actionRoots.get(host)
		if (!entry) {
			entry = { slot: host, root: createRoot(host) }
			actionRoots.set(host, entry)
		} else if (entry.slot !== host) {
			entry.root?.unmount()
			entry.root = createRoot(host)
			entry.slot = host
		}

		entry.root.render(
			<MessageActionsMenu
				actions={actions}
				container={container}
				inlineActive={inlineActive}
			/>,
		)
		if (inlineActive) {
			activeInlineListEl =
				host.querySelector?.('.astra-messageActions__inlineList') ??
				activeInlineListEl
		}
		containers.add(host)
	})

	unmountStaleActions(containers)
}

function scheduleSync(delay = 80) {
	if (pendingSyncTimeout) return
	pendingSyncTimeout = setTimeout(() => {
		pendingSyncTimeout = null
		syncNativeActions()
	}, delay)
}

function unmountStaleActions(validContainers) {
	for (const [container, entry] of actionRoots.entries()) {
		if (!validContainers?.has?.(container)) {
			entry?.root?.unmount()
			actionRoots.delete(container)
		}
	}
}

function requestSyncImmediate() {
	if (pendingSyncTimeout) {
		clearTimeout(pendingSyncTimeout)
		pendingSyncTimeout = null
	}
	syncNativeActions()
}

function startObservers() {
	if (chatObserver) return
	const chatRoot = getChatRoot()
	if (!chatRoot) return
	chatObserver = new MutationObserver(mutations => {
		const shouldSync = mutations.some(
			mutation =>
				mutation.addedNodes?.length ||
				mutation.removedNodes?.length ||
				(mutation.type === 'attributes' &&
					['is_system', 'data-media-display', 'bookmark_link', 'mesid', 'class'].includes(mutation.attributeName)),
		)
		if (shouldSync) {
			scheduleSync(0)
		}
	})
	chatObserver.observe(chatRoot, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['is_system', 'data-media-display', 'bookmark_link', 'mesid', 'class', 'style'],
	})
}

function attachEvents() {
	const eventSource = getEventSource()
	const eventTypes = getEventTypes()
	if (!eventSource || !eventTypes) return

	const syncEventKeys = [
		'MESSAGE_UPDATED',
		'MESSAGE_EDITED',
		'MESSAGE_DELETED',
		'MESSAGE_SWIPED',
		'MESSAGE_SWIPE_DELETED',
		'MESSAGE_FILE_EMBEDDED',
		'MESSAGE_ATTACHMENT_DELETED',
		'CHAT_CHANGED',
		'USER_MESSAGE_RENDERED',
		'CHARACTER_MESSAGE_RENDERED',
	]

	syncEventKeys.forEach(key => {
		const type = eventTypes[key]
		if (type) {
			eventSource.on(type, () => scheduleSync(0))
		}
	})
}

function attachInlineDismissListener() {
	if (hasInlineDismissListener) return
	document.addEventListener(
		'pointerdown',
		event => {
			if (!activeInlineContainer) return
			if (!activeInlineContainer.isConnected) {
				closeInline()
				return
			}
			const inlineList = activeInlineListEl && activeInlineListEl.isConnected ? activeInlineListEl : null
			if (inlineList?.contains(event.target)) return
			closeInline()
		},
		true,
	)
	hasInlineDismissListener = true
}

function initializeNativeMessageActions({ getContext } = {}) {
	if (hasInitialized) return
	initializeEnv(getContext)
	const ctx = getCtx()
	if (!ctx?.eventSource || !ctx?.event_types) {
		console.warn(`${LOG_PREFIX} Native message actions skipped: missing SillyTavern context`)
		return
	}
	hasInitialized = true

	attachEvents()
	startObservers()
	attachInlineDismissListener()
	syncNativeActions()
}

export { initializeNativeMessageActions, scheduleSync, syncNativeActions }
