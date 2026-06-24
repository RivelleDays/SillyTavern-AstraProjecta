import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

type Listener = (...args: unknown[]) => void;

const ST_MERIDIEM_TIMESTAMP = "May 4, 2025 10:20pm";
const ST_MERIDIEM_TIMESTAMP_MS = Date.parse("2025-05-04T14:20:00.000Z");
const ST_HUMANIZED_TIMESTAMP = "2025-12-23@17h22m51s057ms";
const ST_HUMANIZED_TIMESTAMP_MS = Date.parse("2025-12-23T17:22:51.057Z");

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((nextResolve, nextReject) => {
		resolve = nextResolve;
		reject = nextReject;
	});

	return {
		promise,
		reject,
		resolve,
	};
}

function createEventSourceStub() {
	const listeners = new Map<string, Set<Listener>>();

	return {
		emit(event: string, ...args: unknown[]) {
			const activeListeners = listeners.get(event);
			if (!activeListeners) {
				return;
			}

			for (const listener of activeListeners) {
				listener(...args);
			}
		},
		on(event: string, listener: Listener) {
			const activeListeners = listeners.get(event) ?? new Set<Listener>();
			activeListeners.add(listener);
			listeners.set(event, activeListeners);
		},
		removeListener(event: string, listener: Listener) {
			listeners.get(event)?.delete(listener);
		},
	};
}

function createTimestampToMomentStub() {
	return (value: unknown) => {
		let resolvedValue = Number.NaN;

		if (typeof value === "number" && Number.isFinite(value)) {
			resolvedValue = value;
		} else if (typeof value === "string") {
			const trimmed = value.trim();
			resolvedValue =
				trimmed === ST_MERIDIEM_TIMESTAMP
					? ST_MERIDIEM_TIMESTAMP_MS
					: trimmed === ST_HUMANIZED_TIMESTAMP
						? ST_HUMANIZED_TIMESTAMP_MS
						: Date.parse(trimmed);
		}

		return {
			valueOf: () => resolvedValue,
		};
	};
}

function setSillyTavernContext(context: unknown | { current: unknown }) {
	const contextRef =
		typeof context === "object" && context !== null && "current" in context
			? context
			: { current: context };

	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => contextRef.current,
	};
}

async function flushMicrotasks() {
	await Promise.resolve();
	await Promise.resolve();
}

describe("current chat info", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.useRealTimers();
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("reads the active character chat info from context and past-chat metadata", async () => {
		const eventSource = createEventSourceStub();
		const fetchImpl = vi.fn().mockResolvedValue({
			json: async () => [
				{
					chat_items: 18,
					file_id: "chapter-1",
					file_name: "chapter-1.jsonl",
					file_size: "12 KB",
					last_mes: "2026-04-23T10:30:00.000Z",
				},
			],
			ok: true,
		});
		const contextRef = {
			current: {
				characterId: 0,
				characters: [
					{
						avatar: "hero.png",
						chat: "chapter-1",
						name: "Hero",
					},
				],
				chat: [
					{
						is_system: true,
						mes: "System",
					},
					{
						is_user: true,
						mes: "Hello",
					},
					{
						extra: {
							model: "openrouter/anthropic/claude-3.7-sonnet",
						},
						is_user: false,
						mes: "Reply 1",
					},
					{
						extra: {
							model: "openrouter/anthropic/claude-3.7-sonnet",
						},
						is_user: false,
						mes: "Reply 2",
					},
					{
						extra: {
							model: "openai/gpt-4.1",
						},
						is_user: false,
						mes: "Reply 3",
					},
				],
				chatId: "chapter-1",
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
				},
				getRequestHeaders: () => ({
					Authorization: "Bearer test-token",
				}),
				groupId: null,
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				dominantModel: "claude-3.7-sonnet",
				fileSize: "12 KB",
				hasActiveChat: true,
				lastUpdatedAt: Date.parse("2026-04-23T10:30:00.000Z"),
				lastMessagePreview: "Reply 3",
				messageCount: 5,
			});
		});

		expect(store.getSnapshot().modelCounts).toEqual({
			"openai/gpt-4.1": 1,
			"openrouter/anthropic/claude-3.7-sonnet": 2,
		});
		expect(fetchImpl).toHaveBeenCalledWith("/api/characters/chats", {
			body: JSON.stringify({ avatar_url: "hero.png" }),
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			},
			method: "POST",
		});

		store.dispose();
	});

	test("prefers getCurrentChatId over stale context chatId when matching remote character metadata", async () => {
		const eventSource = createEventSourceStub();
		const fetchImpl = vi.fn().mockResolvedValue({
			json: async () => [
				{
					chat_items: 3,
					file_id: "chapter-stale",
					file_name: "chapter-stale.jsonl",
					file_size: "8 KB",
					last_mes: "2026-04-22T10:30:00.000Z",
				},
				{
					chat_items: 7,
					file_id: "chapter-active",
					file_name: "chapter-active.jsonl",
					file_size: "16 KB",
					last_mes: "2026-04-23T10:30:00.000Z",
				},
			],
			ok: true,
		});
		const contextRef = {
			current: {
				characterId: 0,
				characters: [
					{
						avatar: "hero.png",
						chat: "chapter-stale",
						name: "Hero",
					},
				],
				chat: [
					{
						is_user: true,
						mes: "Hello",
					},
				],
				chatId: "chapter-stale",
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
				},
				getCurrentChatId: () => "chapter-active",
				groupId: null,
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				fileSize: "16 KB",
				hasActiveChat: true,
				lastUpdatedAt: Date.parse("2026-04-23T10:30:00.000Z"),
				metadataStatus: "ready",
			});
		});

		store.dispose();
	});

	test("returns an empty snapshot when there is no active chat", async () => {
		const fetchImpl = vi.fn();

		setSillyTavernContext({
			characterId: null,
			chat: [],
			chatId: "",
			groupId: null,
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		expect(store.getSnapshot()).toMatchObject({
			dominantModel: "",
			fileSize: "",
			hasActiveChat: false,
			lastMessagePreview: "",
			lastUpdatedAt: null,
			messageCount: null,
			modelCounts: {},
		});
		expect(fetchImpl).not.toHaveBeenCalled();

		store.dispose();
	});

	test("returns an empty lastMessagePreview when the chat only contains system messages", async () => {
		const fetchImpl = vi.fn();

		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
			],
			chat: [
				{
					is_system: true,
					mes: "System only",
				},
			],
			chatId: "chapter-1",
			groupId: null,
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		expect(store.getSnapshot()).toMatchObject({
			hasActiveChat: true,
			lastMessagePreview: "",
			messageCount: 1,
		});

		store.dispose();
	});

	test("reads the active group chat info from context and group chat metadata", async () => {
		const eventSource = createEventSourceStub();
		const fetchImpl = vi.fn().mockResolvedValue({
			json: async () => ({
				file_size: "24 KB",
				last_mes: "2026-04-22T09:00:00.000Z",
			}),
			ok: true,
		});

		setSillyTavernContext({
			chat: [
				{
					is_user: true,
					mes: "Hello squad",
				},
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply",
				},
			],
			chatId: "raid-night",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "raid-night",
					id: "group-1",
				},
			],
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });
		const history = [store.getSnapshot()];
		const unsubscribe = store.subscribe(() => {
			history.push(store.getSnapshot());
		});

		expect(store.getSnapshot()).toMatchObject({
			dominantModel: "gemini-2.5-pro",
			hasActiveChat: true,
			messageCount: 2,
		});

		await waitFor(() => {
			expect(fetchImpl).toHaveBeenCalledTimes(1);
		});

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				dominantModel: "gemini-2.5-pro",
				fileSize: "24 KB",
				hasActiveChat: true,
				lastUpdatedAt: Date.parse("2026-04-22T09:00:00.000Z"),
				lastMessagePreview: "Group reply",
				messageCount: 2,
			});
		});

		expect(fetchImpl).toHaveBeenCalledWith("/api/chats/group/info", {
			body: JSON.stringify({ id: "raid-night" }),
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			},
			method: "POST",
		});

		expect(history).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					dominantModel: "gemini-2.5-pro",
					hasActiveChat: true,
					messageCount: 2,
				}),
			]),
		);

		unsubscribe();
		store.dispose();
	});

	test("refreshes remote metadata when the active chat emits CHAT_DELETED", async () => {
		const eventSource = createEventSourceStub();
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				json: async () => [
					{
						file_id: "chapter-1",
						file_name: "chapter-1.jsonl",
						file_size: "12 KB",
						last_mes: "2026-04-23T10:30:00.000Z",
					},
				],
				ok: true,
			})
			.mockResolvedValueOnce({
				json: async () => [
					{
						file_id: "chapter-1",
						file_name: "chapter-1.jsonl",
						file_size: "18 KB",
						last_mes: "2026-04-24T10:30:00.000Z",
					},
				],
				ok: true,
			});

		setSillyTavernContext({
			characterId: 0,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-1",
					name: "Hero",
				},
			],
			chat: [
				{
					is_system: false,
					is_user: true,
					mes: "Hello",
				},
			],
			chatId: "chapter-1",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
				CHAT_DELETED: "chat_deleted",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: null,
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await waitFor(() => {
			expect(fetchImpl).toHaveBeenCalledTimes(1);
		});

		eventSource.emit("chat_deleted", "chapter-1");

		await waitFor(() => {
			expect(fetchImpl).toHaveBeenCalledTimes(2);
		});
		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				fileSize: "18 KB",
				lastUpdatedAt: Date.parse("2026-04-24T10:30:00.000Z"),
			});
		});

		store.dispose();
	});

	test("fills group last updated from remote metadata when local messages have no timestamps", async () => {
		const eventSource = createEventSourceStub();
		const fetchImpl = vi.fn().mockResolvedValue({
			json: async () => ({
				file_size: "24 KB",
				last_mes: "2026-04-22T09:00:00.000Z",
			}),
			ok: true,
		});

		setSillyTavernContext({
			chat: [
				{
					is_user: true,
					mes: "Hello squad",
				},
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply without timestamp",
				},
			],
			chatId: "raid-night",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "raid-night",
					id: "group-1",
				},
			],
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		expect(store.getSnapshot()).toMatchObject({
			dominantModel: "gemini-2.5-pro",
			hasActiveChat: true,
			lastUpdatedAt: null,
			messageCount: 2,
		});

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				fileSize: "24 KB",
				lastUpdatedAt: Date.parse("2026-04-22T09:00:00.000Z"),
			});
		});

		store.dispose();
	});

	test("parses local group message timestamps with SillyTavern timestampToMoment", async () => {
		const eventSource = createEventSourceStub();
		const fetchImpl = vi.fn();

		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply with SillyTavern timestamp",
					send_date: ST_MERIDIEM_TIMESTAMP,
				},
			],
			chatId: "上乘握壽司盛合",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "上乘握壽司盛合",
					id: "group-1",
				},
			],
			timestampToMoment: createTimestampToMomentStub(),
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		expect(store.getSnapshot()).toMatchObject({
			dominantModel: "gemini-2.5-pro",
			hasActiveChat: true,
			lastUpdatedAt: ST_MERIDIEM_TIMESTAMP_MS,
			messageCount: 1,
		});
		expect(fetchImpl).not.toHaveBeenCalled();

		store.dispose();
	});

	test("parses remote group metadata timestamps with SillyTavern timestampToMoment for unicode chat ids", async () => {
		const eventSource = createEventSourceStub();
		const fetchImpl = vi.fn().mockResolvedValue({
			json: async () => ({
				file_size: "24 KB",
				last_mes: ST_MERIDIEM_TIMESTAMP,
			}),
			ok: true,
		});

		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply without local timestamp",
				},
			],
			chatId: "上乘握壽司盛合",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "上乘握壽司盛合",
					id: "group-1",
				},
			],
			timestampToMoment: createTimestampToMomentStub(),
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				fileSize: "24 KB",
				lastUpdatedAt: ST_MERIDIEM_TIMESTAMP_MS,
				metadataReason: null,
				metadataStatus: "ready",
			});
		});

		expect(fetchImpl).toHaveBeenCalledWith("/api/chats/group/info", {
			body: JSON.stringify({ id: "上乘握壽司盛合" }),
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			},
			method: "POST",
		});

		store.dispose();
	});

	test("parses humanized SillyTavern group metadata timestamps from remote metadata", async () => {
		const eventSource = createEventSourceStub();
		const fetchImpl = vi.fn().mockResolvedValue({
			json: async () => ({
				file_size: "24 KB",
				last_mes: ST_HUMANIZED_TIMESTAMP,
			}),
			ok: true,
		});

		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply without local timestamp",
				},
			],
			chatId: "Checkpoint #9 - 2025-12-23@17h22m51s057ms",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "Checkpoint #9 - 2025-12-23@17h22m51s057ms",
					id: "group-1",
				},
			],
			timestampToMoment: createTimestampToMomentStub(),
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				fileSize: "24 KB",
				lastUpdatedAt: ST_HUMANIZED_TIMESTAMP_MS,
				metadataReason: null,
				metadataStatus: "ready",
			});
		});

		store.dispose();
	});

	test("recovers after the SillyTavern context becomes ready late", async () => {
		vi.useFakeTimers();
		const fetchImpl = vi.fn().mockResolvedValue({
			json: async () => ({
				file_size: "24 KB",
				last_mes: "2026-04-22T09:00:00.000Z",
			}),
			ok: true,
		});
		const eventSource = createEventSourceStub();
		const contextRef = {
			current: null as unknown,
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		expect(store.getSnapshot()).toMatchObject({
			hasActiveChat: false,
			lastUpdatedAt: null,
			metadataReason: "context-not-ready",
			metadataStatus: "pending",
		});
		expect(fetchImpl).not.toHaveBeenCalled();

		contextRef.current = {
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply",
				},
			],
			chatId: "raid-night",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "raid-night",
					id: "group-1",
				},
			],
		};

		await vi.advanceTimersByTimeAsync(150);
		await flushMicrotasks();
		expect(store.getSnapshot()).toMatchObject({
			dominantModel: "gemini-2.5-pro",
			hasActiveChat: true,
			metadataReason: null,
			metadataStatus: "pending",
		});

		await vi.advanceTimersByTimeAsync(150);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			fileSize: "24 KB",
			hasActiveChat: true,
			lastUpdatedAt: Date.parse("2026-04-22T09:00:00.000Z"),
			metadataReason: null,
			metadataStatus: "ready",
		});

		store.dispose();
	});

	test("marks metadata unavailable, logs once, and retries failed group metadata requests until they recover", async () => {
		vi.useFakeTimers();
		const eventSource = createEventSourceStub();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				json: async () => ({
					error: "boom",
				}),
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
			})
			.mockResolvedValueOnce({
				json: async () => ({
					file_size: "24 KB",
					last_mes: "2026-04-22T09:00:00.000Z",
				}),
				ok: true,
			});

		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply without timestamp",
				},
			],
			chatId: "raid-night",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "raid-night",
					id: "group-1",
				},
			],
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			fileSize: "",
			lastUpdatedAt: null,
			metadataReason: "http-error",
			metadataStatus: "unavailable",
		});
		expect(warnSpy).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(650);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(store.getSnapshot()).toMatchObject({
			fileSize: "24 KB",
			lastUpdatedAt: Date.parse("2026-04-22T09:00:00.000Z"),
			metadataReason: null,
			metadataStatus: "ready",
		});

		warnSpy.mockRestore();
		store.dispose();
	});

	test("keeps usable metadata as stale when a later refresh fails", async () => {
		vi.useFakeTimers();
		const eventSource = createEventSourceStub();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				json: async () => ({
					file_size: "24 KB",
					last_mes: "2026-04-22T09:00:00.000Z",
				}),
				ok: true,
			})
			.mockResolvedValueOnce({
				json: async () => ({
					error: "boom",
				}),
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
			});

		const contextRef = {
			current: {
				chat: [
					{
						extra: {
							model: "openrouter/google/gemini-2.5-pro",
						},
						is_user: false,
						mes: "Initial group reply",
						send_date: "2026-04-22T08:30:00.000Z",
					},
				],
				chatId: "raid-night",
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
				},
				getRequestHeaders: () => ({
					Authorization: "Bearer test-token",
				}),
				groupId: "group-1",
				groups: [
					{
						chat_id: "raid-night",
						id: "group-1",
					},
				],
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();

		expect(store.getSnapshot()).toMatchObject({
			fileSize: "24 KB",
			lastUpdatedAt: Date.parse("2026-04-22T09:00:00.000Z"),
			metadataReason: null,
			metadataStatus: "ready",
		});

		contextRef.current = {
			...contextRef.current,
			chat: [
				...contextRef.current.chat,
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Another group reply",
					send_date: "2026-04-22T09:15:00.000Z",
				},
			],
		};
		eventSource.emit("chat_changed");

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(store.getSnapshot()).toMatchObject({
			fileSize: "24 KB",
			lastUpdatedAt: Date.parse("2026-04-22T09:15:00.000Z"),
			metadataReason: "http-error",
			metadataStatus: "stale",
		});
		expect(warnSpy).toHaveBeenCalledTimes(1);

		warnSpy.mockRestore();
		store.dispose();
	});

	test("treats non-empty but unparsable remote group timestamps as invalid payload instead of silently becoming ready", async () => {
		vi.useFakeTimers();
		const eventSource = createEventSourceStub();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const fetchImpl = vi.fn().mockResolvedValue({
			json: async () => ({
				file_size: "24 KB",
				last_mes: "totally-not-a-real-timestamp",
			}),
			ok: true,
		});

		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply without timestamp",
				},
			],
			chatId: "raid-night",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "raid-night",
					id: "group-1",
				},
			],
			timestampToMoment: createTimestampToMomentStub(),
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();

		expect(store.getSnapshot()).toMatchObject({
			fileSize: "",
			lastUpdatedAt: null,
			metadataReason: "invalid-payload",
			metadataStatus: "unavailable",
		});
		expect(warnSpy).toHaveBeenCalledTimes(1);

		warnSpy.mockRestore();
		store.dispose();
	});

	test("deduplicates repeated warnings and bounds automatic metadata retries", async () => {
		vi.useFakeTimers();
		const eventSource = createEventSourceStub();
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const fetchImpl = vi.fn().mockResolvedValue({
			json: async () => ({
				error: "boom",
			}),
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
		});

		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply without timestamp",
				},
			],
			chatId: "raid-night",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "raid-night",
					id: "group-1",
				},
			],
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();
		await vi.advanceTimersByTimeAsync(650);
		await flushMicrotasks();
		await vi.advanceTimersByTimeAsync(1650);
		await flushMicrotasks();
		await vi.advanceTimersByTimeAsync(4050);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(4);
		expect(store.getSnapshot()).toMatchObject({
			metadataReason: "http-error",
			metadataStatus: "unavailable",
		});
		expect(warnSpy).toHaveBeenCalledTimes(1);

		warnSpy.mockRestore();
		store.dispose();
	});

	test("refresh resets retry backoff and immediately resynchronizes metadata", async () => {
		vi.useFakeTimers();
		const eventSource = createEventSourceStub();
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				json: async () => ({
					error: "boom",
				}),
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
			})
			.mockResolvedValueOnce({
				json: async () => ({
					file_size: "24 KB",
					last_mes: "2026-04-22T09:00:00.000Z",
				}),
				ok: true,
			});

		setSillyTavernContext({
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Group reply without timestamp",
				},
			],
			chatId: "raid-night",
			eventSource,
			eventTypes: {
				CHAT_CHANGED: "chat_changed",
			},
			getRequestHeaders: () => ({
				Authorization: "Bearer test-token",
			}),
			groupId: "group-1",
			groups: [
				{
					chat_id: "raid-night",
					id: "group-1",
				},
			],
		});

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();

		expect(store.getSnapshot()).toMatchObject({
			metadataReason: "http-error",
			metadataStatus: "unavailable",
		});

		store.refresh();
		await flushMicrotasks();
		await vi.advanceTimersByTimeAsync(150);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(store.getSnapshot()).toMatchObject({
			fileSize: "24 KB",
			lastUpdatedAt: Date.parse("2026-04-22T09:00:00.000Z"),
			metadataReason: null,
			metadataStatus: "ready",
		});

		store.dispose();
	});

	test("reuses cached remote metadata when switching back to the same group chat", async () => {
		vi.useFakeTimers();
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				json: async () => ({
					file_size: "24 KB",
					last_mes: "2026-04-22T09:00:00.000Z",
				}),
				ok: true,
			})
			.mockResolvedValueOnce({
				json: async () => ({
					file_size: "30 KB",
					last_mes: "2026-04-23T09:00:00.000Z",
				}),
				ok: true,
			})
			.mockImplementationOnce(
				() =>
					createDeferred<{
						json(): Promise<unknown>;
						ok: boolean;
					}>().promise,
			);
		const eventSource = createEventSourceStub();
		const contextRef = {
			current: {
				chat: [
					{
						extra: {
							model: "openrouter/google/gemini-2.5-pro",
						},
						is_user: false,
						mes: "Raid reply",
						send_date: "2026-04-22T08:30:00.000Z",
					},
				],
				chatId: "raid-night",
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
				},
				getRequestHeaders: () => ({
					Authorization: "Bearer test-token",
				}),
				groupId: "group-1",
				groups: [
					{
						chat_id: "raid-night",
						id: "group-1",
					},
					{
						chat_id: "side-quest",
						id: "group-2",
					},
				],
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			fileSize: "24 KB",
			lastUpdatedAt: Date.parse("2026-04-22T09:00:00.000Z"),
		});

		contextRef.current = {
			...contextRef.current,
			chat: [
				{
					extra: {
						model: "openrouter/anthropic/claude-3.7-sonnet",
					},
					is_user: false,
					mes: "Side quest reply",
					send_date: "2026-04-23T08:30:00.000Z",
				},
			],
			chatId: "side-quest",
			groupId: "group-2",
		};
		eventSource.emit("chat_changed");

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(store.getSnapshot()).toMatchObject({
			dominantModel: "claude-3.7-sonnet",
			fileSize: "30 KB",
			lastUpdatedAt: Date.parse("2026-04-23T09:00:00.000Z"),
		});

		contextRef.current = {
			...contextRef.current,
			chat: [
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Raid reply again",
					send_date: "2026-04-24T08:30:00.000Z",
				},
			],
			chatId: "raid-night",
			groupId: "group-1",
		};
		eventSource.emit("chat_changed");

		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(2);
		expect(store.getSnapshot()).toMatchObject({
			dominantModel: "gemini-2.5-pro",
			fileSize: "24 KB",
			lastUpdatedAt: Date.parse("2026-04-24T08:30:00.000Z"),
		});

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(3);

		store.dispose();
	});

	test("debounces remote group metadata refreshes after message events", async () => {
		vi.useFakeTimers();
		const eventSource = createEventSourceStub();
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce({
				json: async () => ({
					file_size: "24 KB",
					last_mes: "2026-04-22T09:00:00.000Z",
				}),
				ok: true,
			})
			.mockResolvedValueOnce({
				json: async () => ({
					file_size: "25 KB",
					last_mes: "2026-04-22T09:30:00.000Z",
				}),
				ok: true,
			});
		const contextRef = {
			current: {
				chat: [
					{
						extra: {
							model: "openrouter/google/gemini-2.5-pro",
						},
						is_user: false,
						mes: "Initial group reply",
						send_date: "2026-04-22T08:30:00.000Z",
					},
				],
				chatId: "raid-night",
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
					MESSAGE_DELETED: "message_deleted",
					MESSAGE_EDITED: "message_edited",
					MESSAGE_RECEIVED: "message_received",
					MESSAGE_SENT: "message_sent",
				},
				getRequestHeaders: () => ({
					Authorization: "Bearer test-token",
				}),
				groupId: "group-1",
				groups: [
					{
						chat_id: "raid-night",
						id: "group-1",
					},
				],
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();

		expect(fetchImpl).toHaveBeenCalledTimes(1);

		contextRef.current = {
			...contextRef.current,
			chat: [
				...contextRef.current.chat,
				{
					extra: {
						model: "openrouter/google/gemini-2.5-pro",
					},
					is_user: false,
					mes: "Newest group reply",
					send_date: "2026-04-22T09:15:00.000Z",
				},
			],
		};

		eventSource.emit("message_received");
		eventSource.emit("message_edited");
		eventSource.emit("message_sent");

		await flushMicrotasks();

		expect(store.getSnapshot()).toMatchObject({
			dominantModel: "gemini-2.5-pro",
			lastUpdatedAt: Date.parse("2026-04-22T09:15:00.000Z"),
			messageCount: 2,
		});
		expect(fetchImpl).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(250);
		await flushMicrotasks();
		expect(fetchImpl).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(200);
		await flushMicrotasks();
		expect(fetchImpl).toHaveBeenCalledTimes(2);

		store.dispose();
	});

	test("ignores stale remote responses after the active chat changes", async () => {
		const eventSource = createEventSourceStub();
		const firstResponse = createDeferred<{
			json(): Promise<unknown>;
			ok: boolean;
		}>();
		const secondResponse = createDeferred<{
			json(): Promise<unknown>;
			ok: boolean;
		}>();
		const fetchImpl = vi
			.fn()
			.mockImplementationOnce(() => firstResponse.promise)
			.mockImplementationOnce(() => secondResponse.promise);
		const contextRef = {
			current: {
				characterId: 0,
				characters: [
					{
						avatar: "hero.png",
						chat: "chapter-1",
					},
				],
				chat: [
					{
						extra: {
							model: "openrouter/anthropic/claude-3.7-sonnet",
						},
						is_user: false,
						mes: "First reply",
					},
				],
				chatId: "chapter-1",
				eventSource,
				eventTypes: {
					CHAT_CHANGED: "chat_changed",
				},
				getRequestHeaders: () => ({}),
				groupId: null,
			},
		};

		setSillyTavernContext(contextRef);

		const { createCurrentChatInfoStore } =
			await import("@/packages/core/st/currentChatInfo");
		const store = createCurrentChatInfoStore({ fetchImpl });

		await waitFor(() => {
			expect(fetchImpl).toHaveBeenCalledTimes(1);
		});

		contextRef.current = {
			...contextRef.current,
			characters: [
				{
					avatar: "hero.png",
					chat: "chapter-2",
				},
			],
			chat: [
				{
					extra: {
						model: "openai/gpt-4.1",
					},
					is_user: false,
					mes: "Second reply",
				},
			],
			chatId: "chapter-2",
		};

		eventSource.emit("chat_changed");

		await waitFor(() => {
			expect(fetchImpl).toHaveBeenCalledTimes(2);
		});

		secondResponse.resolve({
			json: async () => [
				{
					file_id: "chapter-2",
					file_size: "33 KB",
					last_mes: "2026-04-23T12:00:00.000Z",
				},
			],
			ok: true,
		});

		await waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				dominantModel: "gpt-4.1",
				fileSize: "33 KB",
				lastUpdatedAt: Date.parse("2026-04-23T12:00:00.000Z"),
				messageCount: 1,
			});
		});

		firstResponse.resolve({
			json: async () => [
				{
					file_id: "chapter-1",
					file_size: "12 KB",
					last_mes: "2026-04-23T10:30:00.000Z",
				},
			],
			ok: true,
		});

		await vi.waitFor(() => {
			expect(store.getSnapshot()).toMatchObject({
				dominantModel: "gpt-4.1",
				fileSize: "33 KB",
				lastUpdatedAt: Date.parse("2026-04-23T12:00:00.000Z"),
				messageCount: 1,
			});
		});

		store.dispose();
	});
});
