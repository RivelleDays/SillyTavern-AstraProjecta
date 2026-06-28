import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ChatBackgroundSettingsTab } from "@/packages/features/chat-session-settings/chat-background/ChatBackgroundSettingsTab";

function setSillyTavernContext(context: Record<string, unknown>) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function createContext(overrides: Record<string, unknown> = {}) {
	return {
		extensionSettings: {},
		saveSettingsDebounced: vi.fn(),
		...overrides,
	};
}

describe("ChatBackgroundSettingsTab", () => {
	afterEach(() => {
		cleanup();
		Reflect.deleteProperty(
			globalThis as Record<string, unknown>,
			"SillyTavern",
		);
	});

	test("renders blur and opacity rows reflecting the persisted settings", () => {
		setSillyTavernContext(
			createContext({
				extensionSettings: {
					astra_projecta: {
						chatBackgroundAppearance: { blurPx: 1, opacityPercent: 60, version: 1 },
					},
				},
			}),
		);

		render(<ChatBackgroundSettingsTab />);

		const textboxes = screen.getAllByRole("textbox");
		expect(textboxes[0]).toHaveValue("1");
		expect(textboxes[1]).toHaveValue("60");
	});

	test("changing the blur slider persists through the shared settings store", () => {
		const context = createContext();
		setSillyTavernContext(context);
		render(<ChatBackgroundSettingsTab />);

		const sliders = screen.getAllByRole("slider");
		sliders[0].focus();
		fireEvent.keyDown(sliders[0], { key: "ArrowRight" });

		expect(
			(context.extensionSettings as Record<string, Record<string, unknown>>)
				.astra_projecta.chatBackgroundAppearance,
		).toEqual(expect.objectContaining({ blurPx: 3 }));
	});

	test("changing the opacity slider persists through the shared settings store", () => {
		const context = createContext();
		setSillyTavernContext(context);
		render(<ChatBackgroundSettingsTab />);

		const sliders = screen.getAllByRole("slider");
		sliders[1].focus();
		fireEvent.keyDown(sliders[1], { key: "ArrowLeft" });

		expect(
			(context.extensionSettings as Record<string, Record<string, unknown>>)
				.astra_projecta.chatBackgroundAppearance,
		).toEqual(expect.objectContaining({ opacityPercent: 75 }));
	});
});
