import { waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import {
	createCurrentUserAvatarStore,
	readCurrentUserAvatarSnapshot,
} from "@/packages/core/st/currentUserAvatar";

type Listener = (...args: unknown[]) => void;

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

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("readCurrentUserAvatarSnapshot", () => {
	test("prefers the selected persona avatar and resolves current user metadata", () => {
		document.body.innerHTML = `
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
    `;

		setSillyTavernContext({
			chat: [{ is_user: true, avatar: "/recent-user.png" }],
			chatMetadata: { persona: "chat-persona" },
			getThumbnailUrl: vi.fn(() => "/thumbs/hero-persona.png"),
			name1: "Rivelle",
			powerUserSettings: {
				default_persona: "default-persona",
				persona_descriptions: {
					"hero-persona": {
						title: "Lead Pilot",
					},
				},
				personas: {
					"hero-persona": "Star Traveler",
				},
			},
		});

		expect(
			readCurrentUserAvatarSnapshot({ documentRef: document }),
		).toMatchObject({
			displayName: "Rivelle",
			personaId: "hero-persona",
			personaName: "Star Traveler",
			personaTitle: "Lead Pilot",
			source: "selected-persona",
			thumbnailUrl: "/thumbs/hero-persona.png",
		});
	});

	test("falls back to chat metadata persona without reading persona list DOM text", () => {
		document.body.innerHTML = '<div id="user_avatar_block"></div>';

		setSillyTavernContext({
			chatMetadata: { persona: "chat-persona" },
			getThumbnailUrl: vi.fn(() => "/thumbs/chat-persona.png"),
			name1: "Rivelle",
			powerUserSettings: {
				default_persona: "default-persona",
				personas: {
					"chat-persona": "Scene Walker",
				},
			},
		});

		expect(
			readCurrentUserAvatarSnapshot({ documentRef: document }),
		).toMatchObject({
			displayName: "Rivelle",
			personaId: "chat-persona",
			personaName: "Scene Walker",
			personaTitle: "",
			source: "chat-metadata-persona",
			thumbnailUrl: "/thumbs/chat-persona.png",
		});
	});

	test("keeps the current user display name when no persona can be resolved", () => {
		document.body.innerHTML = '<div id="user_avatar_block"></div>';

		setSillyTavernContext({
			chat: [],
			chatMetadata: {},
			name1: "Temporary Name",
			powerUserSettings: {},
		});

		expect(
			readCurrentUserAvatarSnapshot({ documentRef: document }),
		).toMatchObject({
			displayName: "Temporary Name",
			personaId: null,
			personaName: "",
			personaTitle: "",
			source: "none",
			thumbnailUrl: "/img/ai4.png",
		});
	});

	test("refreshes an active persona avatar when PERSONA_UPDATED keeps the same persona id", async () => {
		document.body.innerHTML = `
      <div id="user_avatar_block">
        <div class="avatar-container selected" data-avatar-id="hero-persona"></div>
      </div>
    `;

		const eventSource = createEventSourceStub();
		setSillyTavernContext({
			eventSource,
			eventTypes: {
				PERSONA_UPDATED: "persona_updated",
			},
			getThumbnailUrl: vi.fn(
				(type: string, file: string) =>
					`/thumbnail?type=${type}&file=${file}`,
			),
			name1: "Rivelle",
			powerUserSettings: {
				persona_descriptions: {},
				personas: {
					"hero-persona": "Star Traveler",
				},
			},
		});

		const store = createCurrentUserAvatarStore({ documentRef: document });
		const listener = vi.fn();
		store.subscribe(listener);

		expect(store.getSnapshot().thumbnailUrl).toBe(
			"/thumbnail?type=persona&file=hero-persona",
		);

		eventSource.emit("persona_updated", "hero-persona");

		await waitFor(() => {
			expect(listener).toHaveBeenCalledTimes(1);
		});
		expect(store.getSnapshot().thumbnailUrl).toBe(
			"/thumbnail?type=persona&file=hero-persona&astra_avatar_revision=1",
		);

		store.dispose();
	});
});
