import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { SwipePager } from "@/packages/features/chat-session/message-actions/SwipePager";

describe("SwipePager", () => {
	test("renders a live counter and hides the previous button for a single swipe", () => {
		render(
			<SwipePager
				currentIndex={0}
				onNext={vi.fn()}
				onPrevious={vi.fn()}
				total={1}
			/>,
		);

		expect(screen.getByText("1 / 1")).toHaveAttribute(
			"aria-live",
			"polite",
		);
		expect(
			screen.getByRole("button", { name: "Previous swipe" }),
		).toHaveAttribute("data-hidden", "true");
		expect(
			screen.getByRole("button", { name: "Next swipe" }),
		).toHaveAttribute("data-hidden", "false");
	});

	test("clamps display index and triggers previous/next callbacks", () => {
		const onPrevious = vi.fn();
		const onNext = vi.fn();

		render(
			<SwipePager
				currentIndex={8}
				onNext={onNext}
				onPrevious={onPrevious}
				total={3}
			/>,
		);

		expect(screen.getByText("3 / 3")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Previous swipe" }));
		fireEvent.click(screen.getByRole("button", { name: "Next swipe" }));

		expect(onPrevious).toHaveBeenCalledTimes(1);
		expect(onNext).toHaveBeenCalledTimes(1);
	});

	test("marks only the clicked swipe direction for transient feedback", () => {
		const onPrevious = vi.fn();
		const onNext = vi.fn();
		const { rerender } = render(
			<SwipePager
				currentIndex={1}
				onNext={onNext}
				onPrevious={onPrevious}
				total={3}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Previous swipe" }));

		expect(
			screen.getByRole("button", { name: "Previous swipe" }),
		).toHaveAttribute("data-swipe-feedback", "active");
		expect(
			screen.getByRole("button", { name: "Next swipe" }),
		).toHaveAttribute("data-swipe-feedback", "idle");

		rerender(
			<SwipePager
				currentIndex={1}
				isNativeSwipeBusy={true}
				onNext={onNext}
				onPrevious={onPrevious}
				total={3}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Previous swipe" }),
		).toHaveAttribute("data-swipe-feedback", "active");
		expect(
			screen.getByRole("button", { name: "Next swipe" }),
		).toHaveAttribute("data-swipe-feedback", "idle");
	});

	test("keeps the counter visible and disables controls while native swipe is busy", () => {
		const onPrevious = vi.fn();
		const onNext = vi.fn();

		render(
			<SwipePager
				currentIndex={1}
				isNativeSwipeBusy={true}
				onNext={onNext}
				onPrevious={onPrevious}
				total={2}
			/>,
		);

		expect(screen.getByText("2 / 2")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Previous swipe" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Next swipe" }),
		).toBeDisabled();

		fireEvent.click(screen.getByRole("button", { name: "Previous swipe" }));
		fireEvent.click(screen.getByRole("button", { name: "Next swipe" }));

		expect(onPrevious).not.toHaveBeenCalled();
		expect(onNext).not.toHaveBeenCalled();
	});

	test("renders nothing when no swipe direction is available and native swipe is idle", () => {
		const { container } = render(
			<SwipePager
				canSwipeNext={false}
				canSwipePrevious={false}
				currentIndex={0}
				onNext={vi.fn()}
				onPrevious={vi.fn()}
				total={1}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});

	test("hides unavailable swipe directions and ignores their clicks", () => {
		const onPrevious = vi.fn();
		const onNext = vi.fn();

		render(
			<SwipePager
				canSwipeNext={false}
				canSwipePrevious={true}
				currentIndex={1}
				onNext={onNext}
				onPrevious={onPrevious}
				total={2}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Previous swipe" }));
		fireEvent.click(screen.getByRole("button", { name: "Next swipe" }));

		expect(onPrevious).toHaveBeenCalledTimes(1);
		expect(onNext).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "Previous swipe" }),
		).toHaveAttribute("data-hidden", "false");
		expect(
			screen.getByRole("button", { name: "Next swipe" }),
		).toHaveAttribute("data-hidden", "true");
	});
});
