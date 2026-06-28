import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { ChatBackgroundSettingsTab } from "@/packages/features/chat-session-settings/chat-background/ChatBackgroundSettingsTab";

describe("ChatBackgroundSettingsTab", () => {
	afterEach(() => {
		cleanup();
	});

	test("renders blur and opacity rows from the controlled draft appearance", () => {
		render(
			<ChatBackgroundSettingsTab
				appearance={{ blurPx: 1, opacityPercent: 60 }}
				onAppearanceChange={vi.fn()}
			/>,
		);

		const textboxes = screen.getAllByRole("textbox");
		expect(textboxes[0]).toHaveValue("1");
		expect(textboxes[1]).toHaveValue("60");
	});

	test("changing the blur slider reports the next draft appearance without persisting", () => {
		const onAppearanceChange = vi.fn();
		render(
			<ChatBackgroundSettingsTab
				appearance={{ blurPx: 2, opacityPercent: 80 }}
				onAppearanceChange={onAppearanceChange}
			/>,
		);

		const sliders = screen.getAllByRole("slider");
		sliders[0].focus();
		fireEvent.keyDown(sliders[0], { key: "ArrowRight" });

		expect(onAppearanceChange).toHaveBeenCalledWith({
			blurPx: 3,
			opacityPercent: 80,
		});
	});

	test("changing the opacity slider reports the next draft appearance without persisting", () => {
		const onAppearanceChange = vi.fn();
		render(
			<ChatBackgroundSettingsTab
				appearance={{ blurPx: 2, opacityPercent: 80 }}
				onAppearanceChange={onAppearanceChange}
			/>,
		);

		const sliders = screen.getAllByRole("slider");
		sliders[1].focus();
		fireEvent.keyDown(sliders[1], { key: "ArrowLeft" });

		expect(onAppearanceChange).toHaveBeenCalledWith({
			blurPx: 2,
			opacityPercent: 75,
		});
	});
});
