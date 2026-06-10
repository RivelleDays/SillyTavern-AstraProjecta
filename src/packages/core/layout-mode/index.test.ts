import { describe, expect, test, vi } from "vitest";

import {
	AUTO_LAYOUT_MODE_MEDIA_QUERY,
	createLayoutModeStore,
	resolveLayoutMode,
} from "./index";

function createMediaQueryHarness(initialMatches: boolean) {
	let listener: ((event: MediaQueryListEvent) => void) | null = null;
	const mediaQuery = {
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

	return {
		dispatch(nextMatches: boolean) {
			mediaQuery.matches = nextMatches;
			listener?.({ matches: nextMatches } as MediaQueryListEvent);
		},
		mediaQuery,
	};
}

describe("layout-mode contract", () => {
	test("resolves mobile layout from auto mode only when the 1000px query matches", () => {
		expect(
			resolveLayoutMode({
				matchesAutoModeMediaQuery: true,
				preference: "auto",
			}),
		).toBe("mobile");
		expect(
			resolveLayoutMode({
				matchesAutoModeMediaQuery: false,
				preference: "auto",
			}),
		).toBe("desktop");
	});

	test("resolves forced mobile and forced desktop independently of viewport matches", () => {
		expect(
			resolveLayoutMode({
				matchesAutoModeMediaQuery: false,
				preference: "force-mobile",
			}),
		).toBe("mobile");
		expect(
			resolveLayoutMode({
				matchesAutoModeMediaQuery: true,
				preference: "force-desktop",
			}),
		).toBe("desktop");
	});

	test("ignores media-query change notifications outside auto mode", () => {
		const mediaQueryHarness = createMediaQueryHarness(false);
		let preference: "auto" | "force-mobile" | "force-desktop" =
			"force-mobile";
		const windowRef = {
			matchMedia: vi.fn(() => mediaQueryHarness.mediaQuery),
		};
		const store = createLayoutModeStore({
			getPreference: () => preference,
			windowRef,
		});
		const listener = vi.fn();

		store.subscribe(listener);

		expect(windowRef.matchMedia).toHaveBeenCalledWith(
			AUTO_LAYOUT_MODE_MEDIA_QUERY,
		);
		expect(store.getSnapshot().resolvedMode).toBe("mobile");

		mediaQueryHarness.dispatch(true);

		expect(listener).not.toHaveBeenCalled();
		expect(store.getSnapshot().resolvedMode).toBe("mobile");

		preference = "auto";
		store.sync();

		expect(listener).toHaveBeenCalledTimes(1);
		expect(store.getSnapshot()).toMatchObject({
			matchesAutoModeMediaQuery: true,
			preference: "auto",
			resolvedMode: "mobile",
		});
	});
});
