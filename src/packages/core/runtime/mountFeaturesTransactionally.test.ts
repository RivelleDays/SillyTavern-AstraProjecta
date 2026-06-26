import { describe, expect, test, vi } from "vitest";

import {
	mountFeaturesTransactionally,
	unmountFeaturesSafely,
	type MountableRuntimeFeature,
} from "@/packages/core/runtime/mountFeaturesTransactionally";

function createFeature({
	name,
	events,
	mountError,
	unmountError,
}: {
	events: string[];
	mountError?: Error;
	name: string;
	unmountError?: Error;
}): MountableRuntimeFeature {
	return {
		mount() {
			events.push(`${name}.mount`);
			if (mountError) {
				throw mountError;
			}
		},
		unmount() {
			events.push(`${name}.unmount`);
			if (unmountError) {
				throw unmountError;
			}
		},
	};
}

describe("mountFeaturesTransactionally", () => {
	test("rolls back mounted features in reverse order and preserves the original mount error", () => {
		const events: string[] = [];
		const mountError = new Error("feature 4 failed");
		const cleanupError = new Error("feature 2 cleanup failed");
		const onCleanupError = vi.fn();
		const features = [
			createFeature({ events, name: "feature1" }),
			createFeature({
				events,
				name: "feature2",
				unmountError: cleanupError,
			}),
			createFeature({ events, name: "feature3" }),
			createFeature({ events, name: "feature4", mountError }),
			createFeature({ events, name: "feature5" }),
		];

		expect(() =>
			mountFeaturesTransactionally(features, { onCleanupError }),
		).toThrow(mountError);

		expect(events).toEqual([
			"feature1.mount",
			"feature2.mount",
			"feature3.mount",
			"feature4.mount",
			"feature3.unmount",
			"feature2.unmount",
			"feature1.unmount",
		]);
		expect(onCleanupError).toHaveBeenCalledTimes(1);
		expect(onCleanupError).toHaveBeenCalledWith(cleanupError, features[1]);
	});

	test("unmounts all features in reverse order even when cleanup throws", () => {
		const events: string[] = [];
		const cleanupError = new Error("feature 3 cleanup failed");
		const onCleanupError = vi.fn();
		const features = [
			createFeature({ events, name: "feature1" }),
			createFeature({ events, name: "feature2" }),
			createFeature({
				events,
				name: "feature3",
				unmountError: cleanupError,
			}),
		];

		expect(() =>
			unmountFeaturesSafely(features, { onCleanupError }),
		).not.toThrow();

		expect(events).toEqual([
			"feature3.unmount",
			"feature2.unmount",
			"feature1.unmount",
		]);
		expect(onCleanupError).toHaveBeenCalledTimes(1);
		expect(onCleanupError).toHaveBeenCalledWith(cleanupError, features[2]);
	});
});
