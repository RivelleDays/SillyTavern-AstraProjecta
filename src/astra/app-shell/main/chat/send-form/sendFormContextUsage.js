import React from 'react'
import { createRoot } from 'react-dom/client'
import { DatabaseZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ensureSendFormPanel } from './sendFormPanel.js'
import { waitUntilCondition } from '../../../../../../../../../utils.js'
import { getMaxContextSize, max_context, amount_gen } from '../../../../../../../../../../script.js'
import { promptManager } from '../../../../../../../../../openai.js'

export const CHAT_CONTEXT_USAGE_UPDATED_EVENT = 'astraChatContextUsageUpdated'

const PROMPT_MANAGER_WAIT_TIMEOUT = 5_000
const RING_RADIUS = 8
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const enqueueMicrotask =
	typeof queueMicrotask === 'function' ? queueMicrotask : (cb => Promise.resolve().then(cb))
const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
const percentageFormatter = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 1,
	minimumFractionDigits: 1,
})

let latestChatContextUsageSnapshot = null
let promptManagerReadyPromise = null
let contextUsageWatcher = null

function clampPercent(value) {
	if (typeof value !== 'number' || Number.isNaN(value)) return 0
	return Math.max(0, Math.min(100, value))
}

function formatNumber(value) {
	if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return '—'
	return numberFormatter.format(Math.max(0, Math.floor(value)))
}

function formatPercentage(value) {
	if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) return '0.0%'
	return `${percentageFormatter.format(Math.max(0, value))}%`
}

export function getLatestChatContextUsageSnapshot() {
	return latestChatContextUsageSnapshot
}

function getContextDetails() {
	const ctx = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : null
	const mainApi = ctx?.mainApi

	const budget = Number(getMaxContextSize()) || 0

	let contextSize = 0
	if (mainApi === 'openai') {
		contextSize = Number(ctx?.chatCompletionSettings?.openai_max_context) || 0
	}
	if (!contextSize) {
		contextSize = Number(ctx?.maxContext) || Number(max_context) || 0
	}

	let responseLength = contextSize > 0 ? Math.max(0, contextSize - budget) : 0
	if (!responseLength) {
		if (mainApi === 'openai') {
			responseLength = Number(ctx?.chatCompletionSettings?.openai_max_tokens) || 0
		}
		if (!responseLength) {
			responseLength = Number(amount_gen) || 0
		}
		if (!contextSize && (budget || responseLength)) {
			contextSize = Math.max(0, budget) + Math.max(0, responseLength)
		}
	}

	return {
		mainApi,
		contextSize,
		responseLength,
		budget: budget > 0 ? budget : Math.max(0, contextSize - responseLength),
	}
}

async function ensurePromptManagerReady() {
	if (promptManager?.tokenHandler) return true
	if (!promptManagerReadyPromise) {
		promptManagerReadyPromise = waitUntilCondition(
			() => Boolean(promptManager?.tokenHandler),
			PROMPT_MANAGER_WAIT_TIMEOUT,
			150,
			{ rejectOnTimeout: false },
		).finally(() => {
			promptManagerReadyPromise = null
		})
	}
	await promptManagerReadyPromise
	return Boolean(promptManager?.tokenHandler)
}

async function buildContextUsageSnapshot() {
	const { budget, contextSize, responseLength, mainApi } = getContextDetails()

	let totalTokens = null
	const showPromptSection = mainApi === 'openai'
	let tokensReady = false
	let chatHistoryTokens = null
	let characterTokens = null
	let personaTokens = null
	let worldInfoTokens = null

	if (showPromptSection && (await ensurePromptManagerReady())) {
		const handler = promptManager?.tokenHandler
		const fallbackTotal = typeof handler?.getTotal === 'function' ? handler.getTotal() : null

		totalTokens = typeof promptManager?.tokenUsage === 'number' && !Number.isNaN(promptManager.tokenUsage)
			? promptManager.tokenUsage
			: fallbackTotal

		tokensReady = typeof totalTokens === 'number' && Number.isFinite(totalTokens) && Boolean(handler)

		if (tokensReady) {
			const counts = typeof handler?.getCounts === 'function' ? handler.getCounts() : null
			const readCount = (key) => {
				if (!counts || typeof counts !== 'object') return 0
				const value = counts[key]
				if (typeof value === 'number' && Number.isFinite(value)) return value
				return 0
			}
			const sumCounts = (keys) => keys.reduce((sum, key) => sum + readCount(key), 0)

			chatHistoryTokens = readCount('chatHistory')
			characterTokens = sumCounts(['charDescription', 'charPersonality', 'scenario'])
			personaTokens = readCount('personaDescription')
			worldInfoTokens = sumCounts(['worldInfoBefore', 'worldInfoAfter'])
		}
	}

	const percent = tokensReady && budget > 0
		? (totalTokens / budget) * 100
		: 0

	return {
		percent,
		budget,
		contextSize,
		responseLength,
		totalTokens,
		showPromptSection,
		tokensReady,
		chatHistoryTokens,
		characterTokens,
		personaTokens,
		worldInfoTokens,
	}
}

async function updateChatContextUsage() {
	const snapshot = await buildContextUsageSnapshot()
	latestChatContextUsageSnapshot = snapshot

	if (typeof document !== 'undefined' && document) {
		document.dispatchEvent(
			new CustomEvent(CHAT_CONTEXT_USAGE_UPDATED_EVENT, { detail: snapshot }),
		)
	}

	return snapshot
}

function ensureContextUsageWatcher() {
	if (contextUsageWatcher) return contextUsageWatcher

	const ctx = typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : null
	const eventSource = ctx?.eventSource
	const eventTypes = ctx?.eventTypes || ctx?.event_types
	const eventsToListen = [
		eventTypes?.CHAT_COMPLETION_PROMPT_READY,
		eventTypes?.SETTINGS_UPDATED,
		eventTypes?.MAIN_API_CHANGED,
	].filter(Boolean)

	let isUpdating = false
	const triggerUpdate = async () => {
		if (isUpdating) return
		isUpdating = true
		try {
			await updateChatContextUsage()
		} finally {
			isUpdating = false
		}
	}

	if (eventSource && typeof eventSource.on === 'function' && eventsToListen.length) {
		const uniqueEvents = [...new Set(eventsToListen)]
		uniqueEvents.forEach(eventName => {
			eventSource.on(eventName, () => {
				void triggerUpdate()
			})
		})
	}

	contextUsageWatcher = {
		update: () => triggerUpdate(),
	}
	return contextUsageWatcher
}

function UsageRing({ percent, disabled }) {
	const safePercent = clampPercent(percent)
	const strokeDashoffset = RING_CIRCUMFERENCE - (safePercent / 100) * RING_CIRCUMFERENCE
	return (
		<svg
			className="astra-chat-context-usage-trigger__ring"
			viewBox="0 0 20 20"
			role="presentation"
			aria-hidden="true"
		>
			<circle cx="10" cy="10" r={RING_RADIUS} className="astra-chat-context-usage-trigger__ring-track" />
			<circle
				cx="10"
				cy="10"
				r={RING_RADIUS}
				className={cn('astra-chat-context-usage-trigger__ring-value', disabled && 'is-disabled')}
				strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
				strokeDashoffset={strokeDashoffset}
			/>
		</svg>
	)
}

function ChatContextUsageDataPill({ budgetDisplay, totalTokensDisplay, className }) {
	return (
		<div className={cn('astra-chat-context-usage-data', className)} aria-live="polite">
			<span className="astra-chat-context-usage-data__icon" aria-hidden="true">
				<DatabaseZap size={14} strokeWidth={2.25} />
			</span>
			<span className="astra-chat-context-usage-data__tokens">{totalTokensDisplay}</span>
			<span className="astra-chat-context-usage-data__max">
				<span className="astra-chat-context-usage-data__separator">/</span>
				<span className="astra-chat-context-usage-data__max-value">{budgetDisplay}</span>
			</span>
		</div>
	)
}

function UsageTextRow({ label, value }) {
	return (
		<div className="astra-chat-context-usage-text-row">
			<span className="astra-chat-context-usage-text-row__label">{label}</span>
			<span className="astra-chat-context-usage-text-row__value">{value}</span>
		</div>
	)
}

function ChatContextUsageDetails({ usage }) {
	const hasUsage =
		Boolean(usage?.tokensReady) &&
		Boolean(usage?.showPromptSection)
	const percent = hasUsage ? clampPercent(usage?.percent ?? 0) : 0
	const usageDisplay = hasUsage ? formatPercentage(percent) : '—'
	const budgetDisplay = formatNumber(usage?.budget)
	const totalTokensDisplay = hasUsage ? formatNumber(usage?.totalTokens) : '—'

	const chatHistoryDisplay = hasUsage ? formatNumber(usage?.chatHistoryTokens) : '—'
	const worldInfoDisplay = hasUsage ? formatNumber(usage?.worldInfoTokens) : '—'
	const characterDisplay = hasUsage ? formatNumber(usage?.characterTokens) : '—'
	const personaDisplay = hasUsage ? formatNumber(usage?.personaTokens) : '—'

	const primaryStats = [
		{ label: 'Usage', value: usageDisplay },
		{ label: 'Total Tokens', value: totalTokensDisplay },
		{ label: 'Max Context', value: budgetDisplay },
	]

	const secondaryStats = [
		{ label: 'Chat History', value: chatHistoryDisplay },
		{ label: 'World Info', value: worldInfoDisplay },
		{ label: 'Character Description', value: characterDisplay },
		{ label: 'Persona Description', value: personaDisplay },
	]

	return (
		<div className="astra-chat-context-usage-popover__body">
			<div className="astra-chat-context-usage-text-grid">
				{secondaryStats.map((stat) => (
					<UsageTextRow key={stat.label} label={stat.label} value={stat.value} />
				))}
			</div>
			<div className="astra-chat-context-usage-divider" aria-hidden="true" />
			<ChatContextUsageDataPill
				totalTokensDisplay={totalTokensDisplay}
				budgetDisplay={budgetDisplay}
				className="astra-chat-context-usage-data"
			/>
			<div className="astra-chat-context-usage-text-grid--primary">
				{primaryStats.map((stat) => (
					<UsageTextRow key={stat.label} label={stat.label} value={stat.value} />
				))}
			</div>
			{!hasUsage ? (
				<p className="astra-chat-context-usage-popover__empty">
					Context usage data becomes available after OpenAI prompt tokens are calculated.
				</p>
			) : null}
		</div>
	)
}

function ChatContextUsageShortcut() {
	const [usage, setUsage] = React.useState(() => getLatestChatContextUsageSnapshot())

	React.useEffect(() => {
		const handleUpdate = (event) => {
			setUsage(event?.detail ?? null)
		}

		if (typeof document !== 'undefined') {
			document.addEventListener(CHAT_CONTEXT_USAGE_UPDATED_EVENT, handleUpdate)
		}

		return () => {
			if (typeof document !== 'undefined') {
				document.removeEventListener(CHAT_CONTEXT_USAGE_UPDATED_EVENT, handleUpdate)
			}
		}
	}, [])

	const hasUsage =
		Boolean(usage?.tokensReady) &&
		Boolean(usage?.showPromptSection)
	const percent = hasUsage ? clampPercent(usage?.percent ?? 0) : 0
	const usageDisplay = hasUsage ? formatPercentage(percent) : '—'

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					type="button"
					className="astra-chat-context-usage-trigger"
				>
					<UsageRing percent={percent} disabled={!hasUsage} />
					<span className="astra-chat-context-usage__stat-value">{usageDisplay}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="astra-chat-context-usage-popover"
				sideOffset={8}
			>
				<ChatContextUsageDetails usage={usage} />
			</PopoverContent>
		</Popover>
	)
}

export function initializeSendFormContextUsage({ document }) {
	if (!document) return null

	let usageRoot = null
	let hostNode = null
	let isHydrating = false
	const usageUpdates = ensureContextUsageWatcher()
	void usageUpdates.update()

	const hydrate = () => {
		isHydrating = false

		const panelBits = ensureSendFormPanel(document)
		if (!panelBits?.rightSlot) return false

		const hostNeedsReplacement =
			!(hostNode instanceof HTMLElement) ||
			hostNode.parentElement !== panelBits.rightSlot ||
			!hostNode.isConnected

		if (hostNeedsReplacement) {
			if (usageRoot) {
				usageRoot.unmount()
				usageRoot = null
			}
			if (hostNode?.parentElement) {
				hostNode.remove()
			}
			hostNode = document.createElement('div')
			hostNode.className = 'astra-chat-context-usage-host'
			panelBits.rightSlot.append(hostNode)
		}

		if (!usageRoot) {
			usageRoot = createRoot(hostNode)
		}

		usageRoot.render(<ChatContextUsageShortcut />)
		return true
	}

	const observer = new MutationObserver(() => {
		if (isHydrating) return
		isHydrating = true
		enqueueMicrotask(() => hydrate())
	})

	observer.observe(document.body, { childList: true, subtree: true })
	hydrate()

	return {
		destroy: () => {
			observer.disconnect()
			if (usageRoot) {
				usageRoot.unmount()
				usageRoot = null
			}
			if (hostNode?.parentElement) {
				hostNode.remove()
			}
		},
	}
}
