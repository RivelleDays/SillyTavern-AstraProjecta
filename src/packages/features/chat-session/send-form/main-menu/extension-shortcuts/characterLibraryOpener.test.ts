import { beforeEach, describe, expect, test, vi } from "vitest";

import {
	openCharacterLibrary,
	type CharacterLibraryOpenResult,
} from "@/packages/features/chat-session/send-form/main-menu/extension-shortcuts/characterLibraryOpener";

function setSillyTavernContext(context: Record<string, unknown>) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

describe("Character Library opener", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
		Reflect.deleteProperty(globalThis, "SillyTavern");
	});

	test("clicks the installed Character Library top-bar button first", () => {
		const click = vi.fn();
		const button = document.createElement("button");
		button.id = "st-gallery-btn";
		button.addEventListener("click", click);
		document.body.append(button);

		expect(openCharacterLibrary({ documentRef: document })).toEqual({
			kind: "opened",
			method: "top-bar-button",
		} satisfies CharacterLibraryOpenResult);
		expect(click).toHaveBeenCalledTimes(1);
	});

	test("clicks the launcher dropdown library item when the top-bar button is absent", () => {
		const click = vi.fn();
		const dropdown = document.createElement("div");
		dropdown.id = "charlib-launcher-dropdown";
		const item = document.createElement("div");
		item.dataset.action = "library";
		item.addEventListener("click", click);
		dropdown.append(item);
		document.body.append(dropdown);

		expect(openCharacterLibrary({ documentRef: document })).toEqual({
			kind: "opened",
			method: "launcher-dropdown-item",
		} satisfies CharacterLibraryOpenResult);
		expect(click).toHaveBeenCalledTimes(1);
	});

	test("prefers the top-bar button over the launcher dropdown item", () => {
		const buttonClick = vi.fn();
		const button = document.createElement("button");
		button.id = "st-gallery-btn";
		button.addEventListener("click", buttonClick);
		document.body.append(button);

		const itemClick = vi.fn();
		const dropdown = document.createElement("div");
		dropdown.id = "charlib-launcher-dropdown";
		const item = document.createElement("div");
		item.dataset.action = "library";
		item.addEventListener("click", itemClick);
		dropdown.append(item);
		document.body.append(dropdown);

		expect(openCharacterLibrary({ documentRef: document })).toEqual({
			kind: "opened",
			method: "top-bar-button",
		} satisfies CharacterLibraryOpenResult);
		expect(buttonClick).toHaveBeenCalledTimes(1);
		expect(itemClick).not.toHaveBeenCalled();
	});

	test("falls back to the registered gallery slash command callback", () => {
		const galleryCallback = vi.fn();
		const executeSlashCommandsWithOptions = vi.fn();
		setSillyTavernContext({
			SlashCommandParser: {
				commands: {
					gallery: {
						callback: galleryCallback,
					},
				},
			},
			executeSlashCommandsWithOptions,
		});

		expect(openCharacterLibrary({ documentRef: document })).toEqual({
			kind: "opened",
			method: "slash-command-callback",
		} satisfies CharacterLibraryOpenResult);
		expect(galleryCallback).toHaveBeenCalledWith({}, "");
		expect(executeSlashCommandsWithOptions).not.toHaveBeenCalled();
	});

	test("uses executeSlashCommandsWithOptions only when the gallery command exists", () => {
		const executeSlashCommandsWithOptions = vi.fn();
		setSillyTavernContext({
			SlashCommandParser: {
				commands: {
					gallery: {},
				},
			},
			executeSlashCommandsWithOptions,
		});

		expect(openCharacterLibrary({ documentRef: document })).toEqual({
			kind: "opened",
			method: "execute-slash-command",
		} satisfies CharacterLibraryOpenResult);
		expect(executeSlashCommandsWithOptions).toHaveBeenCalledWith(
			"/gallery",
		);
	});

	test("reports missing when no Character Library opener is installed", () => {
		const executeSlashCommandsWithOptions = vi.fn();
		setSillyTavernContext({
			SlashCommandParser: {
				commands: {},
			},
			executeSlashCommandsWithOptions,
		});

		expect(openCharacterLibrary({ documentRef: document })).toEqual({
			kind: "missing",
		} satisfies CharacterLibraryOpenResult);
		expect(executeSlashCommandsWithOptions).not.toHaveBeenCalled();
	});
});
