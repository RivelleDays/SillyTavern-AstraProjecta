import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { useSliderWithInput } from "@/hooks/use-slider-with-input";

describe("useSliderWithInput", () => {
	test("reflects the controlled value in both slider and input", () => {
		const { result } = renderHook(() =>
			useSliderWithInput({ defaultValue: 2, max: 5, min: 0, value: 3 }),
		);

		expect(result.current.sliderValue).toEqual([3]);
		expect(result.current.inputValue).toBe("3");
	});

	test("slider drag commits the clamped value immediately via onValueChange", () => {
		const onValueChange = vi.fn();
		const { result } = renderHook(() =>
			useSliderWithInput({ defaultValue: 2, max: 5, min: 0, onValueChange, value: 2 }),
		);

		act(() => {
			result.current.handleSliderChange([4]);
		});

		expect(onValueChange).toHaveBeenCalledWith(4);
	});

	test("typing in the input updates the local input string without committing yet", () => {
		const onValueChange = vi.fn();
		const { result } = renderHook(() =>
			useSliderWithInput({ defaultValue: 2, max: 5, min: 0, onValueChange, value: 2 }),
		);

		act(() => {
			result.current.handleInputChange("4");
		});

		expect(result.current.inputValue).toBe("4");
		expect(onValueChange).not.toHaveBeenCalled();
	});

	test("blurring the input commits the parsed value", () => {
		const onValueChange = vi.fn();
		const { result } = renderHook(() =>
			useSliderWithInput({ defaultValue: 2, max: 5, min: 0, onValueChange, value: 2 }),
		);

		act(() => {
			result.current.handleInputChange("4");
		});
		act(() => {
			result.current.handleInputBlur();
		});

		expect(onValueChange).toHaveBeenCalledWith(4);
	});

	test("Enter key in the input commits the value via blur", () => {
		const onValueChange = vi.fn();
		const { result } = renderHook(() =>
			useSliderWithInput({ defaultValue: 2, max: 5, min: 0, onValueChange, value: 2 }),
		);
		const blur = vi.fn();

		act(() => {
			result.current.handleInputChange("1");
		});
		act(() => {
			result.current.handleInputKeyDown({
				currentTarget: { blur },
				key: "Enter",
			});
		});

		expect(blur).toHaveBeenCalledTimes(1);
	});

	test("out-of-range input commits clamped to min/max on blur", () => {
		const onValueChange = vi.fn();
		const { result } = renderHook(() =>
			useSliderWithInput({ defaultValue: 2, max: 5, min: 0, onValueChange, value: 2 }),
		);

		act(() => {
			result.current.handleInputChange("999");
		});
		act(() => {
			result.current.handleInputBlur();
		});

		expect(onValueChange).toHaveBeenCalledWith(5);
		expect(result.current.inputValue).toBe("5");
	});

	test("non-numeric input on blur reverts to the current committed value", () => {
		const onValueChange = vi.fn();
		const { result } = renderHook(() =>
			useSliderWithInput({ defaultValue: 2, max: 5, min: 0, onValueChange, value: 3 }),
		);

		act(() => {
			result.current.handleInputChange("not-a-number");
		});
		act(() => {
			result.current.handleInputBlur();
		});

		expect(onValueChange).not.toHaveBeenCalled();
		expect(result.current.inputValue).toBe("3");
	});

	test("resetToDefault commits the default value", () => {
		const onValueChange = vi.fn();
		const { result } = renderHook(() =>
			useSliderWithInput({ defaultValue: 2, max: 5, min: 0, onValueChange, value: 5 }),
		);

		act(() => {
			result.current.resetToDefault();
		});

		expect(onValueChange).toHaveBeenCalledWith(2);
	});
});
