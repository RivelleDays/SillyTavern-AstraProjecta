// @ts-check

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createGlobalStateStore } from './globalStateStore.js'
import { HOME_ROUTE_DEFAULT_STATE } from '../app-shell/main/main-area/views/home/state/homeRouteStore.js'

/**
 * Minimal in-memory localStorage mock so the persistence layer can run.
 * @returns {{ store: Map<string, string>, getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void, clear: () => void }}
 */
function createMockStorage() {
	const store = new Map()

	return {
		store,
		getItem: vi.fn((key) => (store.has(key) ? store.get(key) ?? null : null)),
		setItem: vi.fn((key, value) => {
			store.set(key, String(value ?? ''))
		}),
		removeItem: vi.fn((key) => {
			store.delete(key)
		}),
		clear: vi.fn(() => {
			store.clear()
		}),
	}
}

/** @type {ReturnType<typeof createMockStorage> | Storage | undefined} */
let originalLocalStorage

beforeEach(() => {
	originalLocalStorage = globalThis.localStorage
	globalThis.localStorage = /** @type {any} */ (createMockStorage())
})

afterEach(() => {
	globalThis.localStorage = /** @type {Storage} */ (originalLocalStorage)
})

describe('createGlobalStateStore', () => {
	test('updates state, notifies listeners, and persists to storage', () => {
		const store = createGlobalStateStore({
			key: 'ap::test',
			initialState: { hydrated: false, theme: 'system', homeRoute: { ...HOME_ROUTE_DEFAULT_STATE } },
		})

		const updates = /** @type {ReturnType<typeof store.getState>[]} */ ([])
		const unsubscribe = store.subscribe(() => {
			updates.push(store.getState())
		})

		expect(store.getState()).toEqual({
			hydrated: false,
			theme: 'system',
			homeRoute: { ...HOME_ROUTE_DEFAULT_STATE },
		})

		store.setState({ theme: 'dark' })
		store.setState((/** @type {ReturnType<typeof store.getState>} */ state) => ({
			hydrated: !state.hydrated,
		}))

		expect(store.getState()).toEqual({
			hydrated: true,
			theme: 'dark',
			homeRoute: { ...HOME_ROUTE_DEFAULT_STATE },
		})
		expect(updates).toHaveLength(2)
		expect(globalThis.localStorage.setItem).toHaveBeenCalledTimes(2)

		unsubscribe()
	})

	test('hydrate merges stored state respecting version guard', async () => {
		const mockStorage = /** @type {ReturnType<typeof createMockStorage>} */ (
			/** @type {unknown} */ (globalThis.localStorage)
		)
		const persistedValue = {
			state: {
				hydrated: true,
				theme: 'persisted',
				lastVisitedTab: 'lore',
				homeRoute: {
					view: 'entity',
					entityType: 'character',
					entityKey: '123',
					displayName: 'Persisted',
					avatarUrl: 'avatar.png',
					source: 'test',
				},
				__version: 1,
			},
		}

		mockStorage.setItem('ap::persisted', JSON.stringify(persistedValue))

		const store = createGlobalStateStore({
			key: 'ap::persisted',
			initialState: {
				hydrated: false,
				theme: 'system',
				lastVisitedTab: 'chat',
				homeRoute: { ...HOME_ROUTE_DEFAULT_STATE },
			},
			version: 1,
		})

		expect(store.isHydrated()).toBe(false)

		const result = await store.hydrate()

		expect(result).toEqual({
			hydrated: true,
			theme: 'persisted',
			lastVisitedTab: 'lore',
			homeRoute: {
				view: 'entity',
				entityType: 'character',
				entityKey: '123',
				displayName: 'Persisted',
				avatarUrl: 'avatar.png',
				source: 'test',
			},
		})
		expect(store.isHydrated()).toBe(true)
		expect(mockStorage.getItem).toHaveBeenCalledWith('ap::persisted')
	})
})
