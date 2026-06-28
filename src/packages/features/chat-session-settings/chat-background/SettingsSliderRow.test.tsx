import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { SettingsSliderRow } from "@/packages/features/chat-session-settings/chat-background/SettingsSliderRow";

afterEach(() => {
	cleanup();
});

describe("SettingsSliderRow", () => {
	test("renders title, description, and current value", () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		render(
			<SettingsSliderRow
				defaultValue={2}
				description="Adjust the blur."
				max={5}
				min={0}
				resetLabel="Reset blur to default"
				step={1}
				title="Background Blur"
				value={3}
				onValueChange={vi.fn()}
			/>,
		);

		expect(screen.getByText("Background Blur")).toBeInTheDocument();
		expect(screen.getByText("Adjust the blur.")).toBeInTheDocument();
		expect(screen.getByRole("textbox")).toHaveValue("3");
		expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "3");
		expect(consoleError).not.toHaveBeenCalled();

		consoleError.mockRestore();
	});

	test("reset button is disabled at the default value and enabled otherwise", () => {
		const { rerender } = render(
			<SettingsSliderRow
				defaultValue={2}
				description="Adjust the blur."
				max={5}
				min={0}
				resetLabel="Reset blur to default"
				step={1}
				title="Background Blur"
				value={2}
				onValueChange={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "Reset blur to default" })).toBeDisabled();

		rerender(
			<SettingsSliderRow
				defaultValue={2}
				description="Adjust the blur."
				max={5}
				min={0}
				resetLabel="Reset blur to default"
				step={1}
				title="Background Blur"
				value={4}
				onValueChange={vi.fn()}
			/>,
		);

		expect(screen.getByRole("button", { name: "Reset blur to default" })).toBeEnabled();
	});

	test("clicking reset calls onValueChange with the default value", () => {
		const onValueChange = vi.fn();
		render(
			<SettingsSliderRow
				defaultValue={2}
				description="Adjust the blur."
				max={5}
				min={0}
				resetLabel="Reset blur to default"
				step={1}
				title="Background Blur"
				value={4}
				onValueChange={onValueChange}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Reset blur to default" }));

		expect(onValueChange).toHaveBeenCalledWith(2);
	});

	test("pressing ArrowRight on the slider calls onValueChange with value + step", () => {
		const onValueChange = vi.fn();
		render(
			<SettingsSliderRow
				defaultValue={2}
				description="Adjust the blur."
				max={5}
				min={0}
				resetLabel="Reset blur to default"
				step={1}
				title="Background Blur"
				value={2}
				onValueChange={onValueChange}
			/>,
		);
		const slider = screen.getByRole("slider");
		slider.focus();
		fireEvent.keyDown(slider, { key: "ArrowRight" });

		expect(onValueChange).toHaveBeenCalledWith(3);
	});

	test("typing and blurring the input calls onValueChange with the parsed value", () => {
		const onValueChange = vi.fn();
		render(
			<SettingsSliderRow
				defaultValue={2}
				description="Adjust the blur."
				max={5}
				min={0}
				resetLabel="Reset blur to default"
				step={1}
				title="Background Blur"
				value={2}
				onValueChange={onValueChange}
			/>,
		);
		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "5" } });
		fireEvent.blur(input);

		expect(onValueChange).toHaveBeenCalledWith(5);
	});
});
