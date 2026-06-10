import * as React from "react";

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
	AUTO_LAYOUT_MODE_MEDIA_QUERY,
	getDefaultLayoutModeStore,
	resetDefaultLayoutModeStoreForTests,
	setDefaultLayoutModePreferenceReader,
} from "@/packages/core/layout-mode";
import { useIsMobile, useIsMobileLayout } from "./use-mobile";

function createMatchMediaController(initialMatches: boolean) {
	let listener: ((event: MediaQueryListEvent) => void) | null = null;
	const mediaQueryList = {
		addEventListener: vi.fn(
			(
				type: "change",
				nextListener: (event: MediaQueryListEvent) => void,
			) => {
				if (type === "change") {
					listener = nextListener;
				}
			},
		),
		matches: initialMatches,
		media: AUTO_LAYOUT_MODE_MEDIA_QUERY,
		removeEventListener: vi.fn(
			(
				type: "change",
				nextListener: (event: MediaQueryListEvent) => void,
			) => {
				if (type === "change" && listener === nextListener) {
					listener = null;
				}
			},
		),
	};
	const matchMedia = vi.fn(() => mediaQueryList);

	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: matchMedia,
		writable: true,
	});

	return {
		dispatch(nextMatches: boolean) {
			mediaQueryList.matches = nextMatches;
			listener?.({ matches: nextMatches } as MediaQueryListEvent);
		},
		matchMedia,
	};
}

function Probe() {
	const isMobile = useIsMobile();
	const isMobileLayout = useIsMobileLayout();

	return (
		<output
			data-testid="mobile-layout-probe"
			data-is-mobile={String(isMobile)}
			data-is-mobile-layout={String(isMobileLayout)}
		/>
	);
}

describe("useIsMobile", () => {
	beforeEach(() => {
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	afterEach(() => {
		cleanup();
		resetDefaultLayoutModeStoreForTests();
		setDefaultLayoutModePreferenceReader(() => "auto");
	});

	test("follows the centralized Astra mobile layout query instead of a local 768px breakpoint", async () => {
		const media = createMatchMediaController(true);

		render(<Probe />);

		const probe = screen.getByTestId("mobile-layout-probe");

		expect(probe).toHaveAttribute("data-is-mobile", "true");
		expect(probe).toHaveAttribute("data-is-mobile-layout", "true");
		expect(media.matchMedia).toHaveBeenCalledWith(
			AUTO_LAYOUT_MODE_MEDIA_QUERY,
		);
		expect(media.matchMedia).not.toHaveBeenCalledWith("(max-width: 767px)");

		act(() => {
			media.dispatch(false);
		});

		await waitFor(() => {
			expect(probe).toHaveAttribute("data-is-mobile", "false");
			expect(probe).toHaveAttribute("data-is-mobile-layout", "false");
		});
	});

	test("tracks forced mobile and forced desktop through the shared layout-mode store", async () => {
		createMatchMediaController(false);
		setDefaultLayoutModePreferenceReader(() => "force-mobile");

		render(<Probe />);

		const probe = screen.getByTestId("mobile-layout-probe");

		expect(probe).toHaveAttribute("data-is-mobile", "true");
		expect(probe).toHaveAttribute("data-is-mobile-layout", "true");

		act(() => {
			setDefaultLayoutModePreferenceReader(() => "force-desktop");
			getDefaultLayoutModeStore({ windowRef: window }).sync();
		});

		await waitFor(() => {
			expect(probe).toHaveAttribute("data-is-mobile", "false");
			expect(probe).toHaveAttribute("data-is-mobile-layout", "false");
		});
	});
});
