import * as React from "react";

export interface UseSliderWithInputOptions {
	defaultValue: number;
	max: number;
	min: number;
	onValueChange?(value: number): void;
	value: number;
}

export interface UseSliderWithInputResult {
	handleInputBlur(): void;
	handleInputChange(nextValue: string): void;
	handleInputKeyDown(event: { currentTarget: { blur(): void }; key: string }): void;
	handleSliderChange(nextValue: number[]): void;
	inputValue: string;
	resetToDefault(): void;
	sliderValue: number[];
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function useSliderWithInput({
	defaultValue,
	max,
	min,
	onValueChange,
	value,
}: UseSliderWithInputOptions): UseSliderWithInputResult {
	const [inputValue, setInputValue] = React.useState(String(value));

	React.useEffect(() => {
		setInputValue(String(value));
	}, [value]);

	function commit(nextValue: number) {
		const clamped = clamp(nextValue, min, max);
		setInputValue(String(clamped));

		if (clamped !== value) {
			onValueChange?.(clamped);
		}
	}

	return {
		handleInputBlur() {
			const parsed = Number(inputValue);
			commit(Number.isFinite(parsed) ? parsed : value);
		},
		handleInputChange(nextValue: string) {
			setInputValue(nextValue);
		},
		handleInputKeyDown(event: { currentTarget: { blur(): void }; key: string }) {
			if (event.key === "Enter") {
				event.currentTarget.blur();
			}
		},
		handleSliderChange(nextValue: number[]) {
			commit(nextValue[0] ?? value);
		},
		inputValue,
		resetToDefault() {
			commit(defaultValue);
		},
		sliderValue: [value],
	};
}
