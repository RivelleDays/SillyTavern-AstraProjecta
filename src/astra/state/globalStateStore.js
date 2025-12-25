// @ts-check

import { createStateStore } from './store.js'
import { CFG } from './cfg.js'
import { HOME_ROUTE_DEFAULT_STATE } from '../app-shell/main/main-area/views/home/state/homeRouteStore.js'

/** @typedef {{ persist?: boolean, skipEmit?: boolean }} SetStateOptions */

/**
 * @template {Record<string, any>} State
 * @typedef {object} GlobalStateStore
 * @property {(listener: () => void) => () => void} subscribe
 * @property {() => State} getState
 * @property {() => State} getSnapshot
 * @property {(partial: Partial<State> | ((state: State) => Partial<State> | void), options?: SetStateOptions) => State} setState
 * @property {(nextState: State, options?: SetStateOptions) => State} replaceState
 * @property {() => void} persist
 * @property {() => Promise<State>} hydrate
 * @property {() => boolean} isHydrated
 * @property {() => void} destroy
 */

export const DEFAULT_STORAGE_KEY = `${CFG.storageKey}::global`
export const DEFAULT_VERSION = 1

/**
 * @template {Record<string, any>} State
 * @param {{ key?: string, initialState?: State, version?: number }} [options]
 * @returns {GlobalStateStore<State>}
 */
export function createGlobalStateStore(options = {}) {
	const {
		key = DEFAULT_STORAGE_KEY,
		initialState = /** @type {State} */ ({}),
		version = DEFAULT_VERSION,
	} = options

	if (typeof key !== 'string' || !key.length) {
		throw new Error('[AstraProjecta] createGlobalStateStore requires a non-empty storage key.')
	}

	/** @type {State} */
	let state = { ...initialState }
	/** @type {boolean} */
	let hydrated = false
	/** @type {Set<() => void>} */
	const listeners = new Set()
	let mutatedDuringHydrate = false

	const persistence = createStateStore({
		key,
		getters: {
			state: () => ({ ...state, __version: version }),
		},
		setters: {
			/** @param {Record<string, any>} value */
			state(value) {
				if (!value || typeof value !== 'object') return
				const { __version, ...rest } = value
				if (typeof __version === 'number' && __version !== version) return
				const typedRest = /** @type {Record<string, any>} */ (rest)
				state = { ...state, ...typedRest }
				mutatedDuringHydrate = true
			},
		},
	})

	function emit() {
		listeners.forEach(listener => {
			try {
				listener()
			} catch {
				// Ignore listener failures to keep store resilient.
			}
		})
	}

	/**
	 * @param {Partial<State> | ((draft: State) => Partial<State> | void)} partialOrUpdater
	 * @param {SetStateOptions} [options]
	 */
	function setState(partialOrUpdater, options = {}) {
		const { persist = true, skipEmit = false } = options
		const partial =
			typeof partialOrUpdater === 'function'
				? partialOrUpdater(state) ?? null
				: partialOrUpdater

		if (!partial || typeof partial !== 'object') return state

		const nextState = { ...state, ...partial }
		const shouldUpdate = Object.keys(nextState).some(key => nextState[key] !== state[key])
		if (!shouldUpdate) return state

		state = /** @type {State} */ (nextState)
		if (!skipEmit) emit()
		if (persist) persistence.save()
		return state
	}

	/**
	 * @param {State} nextState
	 * @param {SetStateOptions} [options]
	 */
	function replaceState(nextState, options = {}) {
		const { persist = true, skipEmit = false } = options
		state = { ...nextState }
		if (!skipEmit) emit()
		if (persist) persistence.save()
		return state
	}

	return {
		subscribe(listener) {
			if (typeof listener !== 'function') return () => {}
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		getState() {
			return state
		},
		getSnapshot() {
			return state
		},
		setState,
		replaceState,
		persist() {
			persistence.save()
		},
		async hydrate() {
			mutatedDuringHydrate = false
			await persistence.load()
			hydrated = true
			if (mutatedDuringHydrate) emit()
			return state
		},
		isHydrated() {
			return hydrated
		},
		destroy() {
			listeners.clear()
		},
	}
}

const defaultGlobalStore = createGlobalStateStore({
	initialState: {
		hydrated: false,
		theme: 'system',
		lastVisitedTab: 'chat',
		homeRoute: { ...HOME_ROUTE_DEFAULT_STATE },
		featureFlags: {},
	},
	version: DEFAULT_VERSION,
})

export function getDefaultGlobalStore() {
	return defaultGlobalStore
}

export { defaultGlobalStore }
