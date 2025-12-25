import React from 'react'
import { createRoot } from 'react-dom/client'
import { ConnectionProfileSwitcher } from './ConnectionProfileSwitcher.jsx'
import { ensureSendFormPanel } from './sendFormPanel.js'
import { SlashCommandParser } from '../../../../../../../../../slash-commands/SlashCommandParser.js'
import { SlashCommandScope } from '../../../../../../../../../slash-commands/SlashCommandScope.js'
import { SlashCommandAbortController } from '../../../../../../../../../slash-commands/SlashCommandAbortController.js'
import { SlashCommandDebugController } from '../../../../../../../../../slash-commands/SlashCommandDebugController.js'

const LOG_PREFIX = '[AstraProjecta]'
const NONE_LABEL = '<None>'
const ALLOW_EMPTY_COMMANDS = ['stop-strings', 'start-reply-with']
const CC_COMMANDS = [
	'api',
	'preset',
	'api',
	'api-url',
	'model',
	'proxy',
	'stop-strings',
	'start-reply-with',
	'reasoning-template',
	'prompt-post-processing',
	'secret-id',
	'regex-preset',
]
const TC_COMMANDS = [
	'api',
	'preset',
	'api-url',
	'model',
	'sysprompt',
	'sysprompt-state',
	'instruct',
	'context',
	'instruct-state',
	'tokenizer',
	'stop-strings',
	'start-reply-with',
	'reasoning-template',
	'secret-id',
	'regex-preset',
]
const SelectCtor = typeof HTMLSelectElement === 'function' ? HTMLSelectElement : null
const enqueueMicrotask =
	typeof queueMicrotask === 'function' ? queueMicrotask : (cb => Promise.resolve().then(cb))

function isSelectElement(node) {
	return SelectCtor ? node instanceof SelectCtor : false
}

function getContext() {
	return typeof SillyTavern !== 'undefined' ? SillyTavern.getContext() : null
}

function getConnectionManagerSettings(ctx) {
	return (
		ctx?.extensionSettings?.connectionManager
		|| ctx?.extension_settings?.connectionManager
		|| globalThis?.extension_settings?.connectionManager
		|| null
	)
}

function buildNamedArguments(args = {}) {
	return {
		_scope: new SlashCommandScope(),
		_abortController: new SlashCommandAbortController(),
		_debugController: new SlashCommandDebugController(),
		_parserFlags: {},
		_hasUnnamedArgument: false,
		quiet: 'true',
		...args,
	}
}

function updateSelectValue(selectElement, value) {
	if (!isSelectElement(selectElement)) return
	selectElement.value = value ?? ''
}

function createConnectionProfileController(selectElement) {
	let selectRef = selectElement
	let isApplying = false
	let queuedProfileId = null
	let runningPromise = null
	const subscribers = new Set()

	const notify = () => {
		const snapshot = { isApplying }
		subscribers.forEach(listener => {
			try {
				listener(snapshot)
			} catch (error) {
				console.error(LOG_PREFIX, 'Connection profile subscriber failed', error)
			}
		})
	}

	const setIsApplying = (nextValue) => {
		if (isApplying === nextValue) return
		isApplying = nextValue
		notify()
	}

	const persistSelectedProfile = async (ctx, profileId) => {
		const settings = getConnectionManagerSettings(ctx)
		if (settings) {
			settings.selectedProfile = profileId || null
		}
		const saveSettings = ctx?.saveSettingsDebounced || globalThis.saveSettingsDebounced
		if (typeof saveSettings === 'function') {
			try {
				await saveSettings()
			} catch (error) {
				console.error(LOG_PREFIX, 'Failed to save connection profile selection', error)
			}
		}
	}

	const emitLoadedEvent = async (ctx, payload) => {
		const eventSource = ctx?.eventSource
		const eventTypes = ctx?.eventTypes || ctx?.event_types
		const eventName = eventTypes?.CONNECTION_PROFILE_LOADED
		if (!eventSource || typeof eventSource.emit !== 'function' || !eventName) return
		try {
			await eventSource.emit(eventName, payload)
		} catch (error) {
			console.error(LOG_PREFIX, 'Failed to emit CONNECTION_PROFILE_LOADED', error)
		}
	}

	const resolveProfile = (ctx, profileId) => {
		if (!ctx) return null
		const profiles = getConnectionManagerSettings(ctx)?.profiles
		if (!Array.isArray(profiles)) return null
		return profiles.find(profile => profile.id === profileId) || null
	}

	const resolveCommandsForProfile = (profile, ctx) => {
		if (!profile) return []
		const mainApi = ctx?.mainApi || globalThis?.main_api || globalThis?.mainApi
		const mode = profile.mode === 'cc' || profile.mode === 'tc'
			? profile.mode
			: mainApi === 'openai'
				? 'cc'
				: 'tc'

		const baseCommands = mode === 'cc' ? CC_COMMANDS : TC_COMMANDS
		const excluded = Array.isArray(profile.exclude) ? profile.exclude : []

		return baseCommands.filter(command => !excluded.includes(command))
	}

	const applyProfileInternal = async (profileId) => {
		const ctx = getContext()
		const normalizedId = profileId != null ? String(profileId) : ''
		const profile = resolveProfile(ctx, normalizedId)
		const targetId = profile?.id || normalizedId

		// Fallback to legacy DOM dispatch if context or commands are unavailable
		if (!ctx || !SlashCommandParser?.commands) {
			updateSelectValue(selectRef, targetId)
			if (isSelectElement(selectRef)) {
				selectRef.dispatchEvent(new Event('change', { bubbles: true }))
				selectRef.dispatchEvent(new Event('input', { bubbles: true }))
			}
			return
		}

		updateSelectValue(selectRef, targetId)

		if (!profile) {
			await persistSelectedProfile(ctx, '')
			await emitLoadedEvent(ctx, NONE_LABEL)
			return
		}

		const commands = resolveCommandsForProfile(profile, ctx)

		for (const command of commands) {
			const commandEntry = SlashCommandParser?.commands?.[command]
			if (!commandEntry || typeof commandEntry.callback !== 'function') {
				console.warn(LOG_PREFIX, `Slash command not found for connection profile: ${command}`)
				continue
			}

			const argument = profile[command]
			const allowEmpty = ALLOW_EMPTY_COMMANDS.includes(command)
			if (argument === undefined || argument === null || argument === '') {
				if (!(allowEmpty && argument === '')) continue
			}

			try {
				const args = buildNamedArguments(allowEmpty ? { force: 'true' } : {})
				// eslint-disable-next-line no-await-in-loop
				await commandEntry.callback(args, argument)
			} catch (error) {
				console.error(LOG_PREFIX, `Failed to execute command: ${command} ${String(argument ?? '')}`, error)
			}
		}

		await persistSelectedProfile(ctx, profile.id)
		await emitLoadedEvent(ctx, profile.name)
	}

	const flushQueue = async () => {
		setIsApplying(true)
		try {
			while (queuedProfileId !== null) {
				const nextId = queuedProfileId
				queuedProfileId = null
				// eslint-disable-next-line no-await-in-loop
				await applyProfileInternal(nextId)
			}
		} finally {
			setIsApplying(false)
			runningPromise = null
		}
	}

	return {
		getState: () => ({ isApplying }),
		subscribe: (listener) => {
			if (typeof listener !== 'function') return () => {}
			subscribers.add(listener)
			listener({ isApplying })
			return () => subscribers.delete(listener)
		},
		applyProfile: (profileId) => {
			queuedProfileId = profileId ?? ''
			if (runningPromise) return runningPromise
			runningPromise = flushQueue()
			return runningPromise
		},
		setSelectElement: (nextSelect) => {
			selectRef = nextSelect
		},
	}
}

export function initializeSendFormConnectionProfiles({ document }) {
	if (!document) return null

	let connectionProfilesRoot = null
	let controller = null
	let isHydrating = false

	const hydrate = () => {
		isHydrating = false
		const select = document.getElementById('connection_profiles')
		if (!isSelectElement(select)) return false

		const panelBits = ensureSendFormPanel(document)
		if (!panelBits) return false

		const { leftSlot } = panelBits

		if (!connectionProfilesRoot) {
			connectionProfilesRoot = createRoot(leftSlot)
		}

		if (!controller) {
			controller = createConnectionProfileController(select)
		} else if (typeof controller.setSelectElement === 'function') {
			controller.setSelectElement(select)
		}
		connectionProfilesRoot.render(
			<ConnectionProfileSwitcher
				selectElement={select}
				controller={controller}
			/>,
		)
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
			if (connectionProfilesRoot) {
				connectionProfilesRoot.unmount()
				connectionProfilesRoot = null
			}
			controller = null
		},
	}
}
