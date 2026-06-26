import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { RevisionBar } from "@/packages/features/chat-session/message-actions/RevisionBar";

describe("RevisionBar", () => {
	test("renders revision buttons with translated labels and calls enabled actions", () => {
		const onContinue = vi.fn();
		const onRegenerate = vi.fn();
		const onUndo = vi.fn();

		render(
			<RevisionBar
				canContinue
				canRegenerate
				canUndo
				isBusy={false}
				onContinue={onContinue}
				onRegenerate={onRegenerate}
				onUndo={onUndo}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Revert one step" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));

		expect(
			screen
				.getByRole("button", { name: "Revert one step" })
				.querySelector(".lucide-undo-dot"),
		).toBeInTheDocument();
		expect(onUndo).toHaveBeenCalledTimes(1);
		expect(onRegenerate).toHaveBeenCalledTimes(1);
		expect(onContinue).toHaveBeenCalledTimes(1);
	});

	test("hides itself when no revision actions are available", () => {
		const { container } = render(
			<RevisionBar
				canContinue={false}
				canRegenerate={false}
				canUndo={false}
				isBusy={false}
				onContinue={vi.fn()}
				onRegenerate={vi.fn()}
				onUndo={vi.fn()}
			/>,
		);

		expect(container.querySelector(".astra-revisionBar")).toBeNull();
	});

	test("renders a history button when revision history is available without other revision actions", () => {
		const onHistoryOpen = vi.fn();

		render(
			<RevisionBar
				canContinue={false}
				canRegenerate={false}
				canUndo={false}
				historyAction={{
					onClick: onHistoryOpen,
				}}
				isBusy={false}
				onContinue={vi.fn()}
				onRegenerate={vi.fn()}
				onUndo={vi.fn()}
			/>,
		);

		const historyButton = screen.getByRole("button", {
			name: "Revision history",
		});
		fireEvent.click(historyButton);

		expect(historyButton.closest(".astra-revisionBar")).toBeInTheDocument();
		expect(
			historyButton.querySelector(".lucide-history"),
		).toBeInTheDocument();
		expect(onHistoryOpen).toHaveBeenCalledTimes(1);
	});

	test("disables visible actions while revision operations are busy", () => {
		const onContinue = vi.fn();
		const onRegenerate = vi.fn();
		const onUndo = vi.fn();

		render(
			<RevisionBar
				canContinue
				canRegenerate
				canUndo
				isBusy
				onContinue={onContinue}
				onRegenerate={onRegenerate}
				onUndo={onUndo}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Revert one step" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
		fireEvent.click(screen.getByRole("button", { name: "Continue" }));

		expect(
			screen.getByRole("button", { name: "Revert one step" }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Regenerate" }),
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
		expect(onUndo).not.toHaveBeenCalled();
		expect(onRegenerate).not.toHaveBeenCalled();
		expect(onContinue).not.toHaveBeenCalled();
	});
});
